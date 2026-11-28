'use strict';

/**
 * server/src/engines/osmPoi/index.js
 * Zero-Cost QLever OSM Planet Commercial POI Harvester across all 11 Nations & all 23+ sectors.
 * Queries craft, shop, office, amenity, tourism & industrial tags via SPARQL UNION in ~400-1200ms.
 */

const { normalizeLead } = require('../contract');
const { parsePhoneDetails } = require('../phoneUtils');

const QLEVER_URL = 'https://qlever.cs.uni-freiburg.de/api/osm-planet';
const USER_AGENT = 'LeadHarvestPoiEngine/2.1 (local-workspace)';

const OSM_TAG_GROUPS = [
  { re: /plumb|pipe|sanit|bath|drain|borewell|water\s*tank|geyser|sewer|plombier|klempner/i, serviceClauses: [{ key: 'craft', tags: ['"plumber"', '"hvac"', '"heating_engineer"'] }], storeClauses: [{ key: 'shop', tags: ['"bathroom_furnishing"', '"hardware"', '"trade"', '"doityourself"'] }] },
  { re: /electr|wiring|inverter|switchboard|elektro|led\s*light|cable/i, serviceClauses: [{ key: 'craft', tags: ['"electrician"', '"electronics_repair"'] }], storeClauses: [{ key: 'shop', tags: ['"electrical"', '"lighting"', '"electronics"'] }] },
  { re: /hvac|air\s*cond|aircon|cooling|heating|solar|roof|waterproof|paint|carpent|mason|weld|contractor|builder|handwerk|couvreur|dachdecker/i, serviceClauses: [{ key: 'craft', tags: ['"hvac"', '"roofer"', '"carpenter"', '"painter"', '"builder"', '"metal_construction"', '"welder"', '"tiler"', '"floorer"'] }, { key: 'office', tags: ['"construction_company"', '"architect"'] }], storeClauses: [{ key: 'shop', tags: ['"doityourself"', '"hardware"', '"paint"', '"tiles"'] }] },
  { re: /dental|dentist|orthodont|endodont|teeth|implant/i, clauses: [{ key: 'amenity', tags: ['"dentist"', '"clinic"'] }] },
  { re: /pharmac|chemist|medical\s*store|drugstore|apothek|medicine|surgical/i, clauses: [{ key: 'amenity', tags: ['"pharmacy"', '"chemist"'] }] },
  { re: /veterinar|vet\b|pet\s*clinic|pet\s*hospital|animal/i, clauses: [{ key: 'amenity', tags: ['"veterinary"'] }] },
  { re: /hospital|medical|clinic|health|cardiac|ortho|maternity|eye|ophthalm|oncology|neuro|ent|gastro|urology|trauma|pediatr|diagnostic|patholog|physio/i, clauses: [{ key: 'amenity', tags: ['"hospital"', '"clinic"', '"doctors"'] }] },
  { re: /school|college|universit|preschool|coach|academ/i, clauses: [{ key: 'amenity', tags: ['"school"', '"college"', '"university"', '"kindergarten"'] }] },
  { re: /hotel|resort|lodge|inn\b|hostel|motel|hospitality/i, clauses: [{ key: 'tourism', tags: ['"hotel"', '"guest_house"', '"motel"', '"hostel"', '"apartment"'] }] },
  { re: /restaurant|cafe|bakery|food|biryani|cater|sweet/i, clauses: [{ key: 'amenity', tags: ['"restaurant"', '"cafe"', '"fast_food"', '"bakery"'] }] },
  { re: /salon|spa|beauty|barber/i, clauses: [{ key: 'shop', tags: ['"hairdresser"', '"beauty"'] }] },
  { re: /auto|car|garage|repair|motor|tyre|tire|spare\s*part/i, serviceClauses: [{ key: 'shop', tags: ['"car_repair"'] }], storeClauses: [{ key: 'shop', tags: ['"car"', '"tyres"', '"car_parts"'] }] },
  { re: /gym|fitness|yoga|pilates|crossfit|sport/i, clauses: [{ key: 'leisure', tags: ['"fitness_centre"', '"sports_centre"'] }] },
  { re: /supermarket|retail|jewel|furniture|electronics|clothing|boutique|store|shop|mall|tile|marble|laptop|mobile\s*phone|mattress/i, clauses: [{ key: 'shop', tags: ['"supermarket"', '"department_store"', '"mall"', '"jewelry"', '"furniture"', '"electronics"', '"mobile_phone"', '"computer"', '"clothes"', '"hardware"'] }] },
  { re: /manufactur|factory|factories|industrial|wholesal|distribut|trader|steel|packaging/i, clauses: [{ key: 'shop', tags: ['"wholesale"', '"trade"'] }, { key: 'craft', tags: ['"metal_construction"'] }, { key: 'office', tags: ['"company"'] }] },
  { re: /lawyer|legal|attorney|advocate|accountant|tax|cpa|real\s*estate|property|software|it\s*service|logistics|packers|clean|pest/i, clauses: [{ key: 'office', tags: ['"lawyer"', '"accountant"', '"estate_agent"', '"it"', '"logistics"', '"company"'] }] },
  { re: /event|wedding|photo|banquet|florist/i, clauses: [{ key: 'amenity', tags: ['"events_venue"', '"conference_centre"'] }, { key: 'craft', tags: ['"photographer"', '"caterer"'] }, { key: 'shop', tags: ['"florist"'] }] }
];

function resolveOsmTagFilter(category, intentType = 'service') {
  const clean = String(category || '').toLowerCase();
  for (const grp of OSM_TAG_GROUPS) {
    if (grp.re.test(clean)) {
      if (grp.serviceClauses || grp.storeClauses) {
        return intentType === 'store'
          ? (grp.storeClauses || grp.serviceClauses)
          : (grp.serviceClauses || grp.storeClauses);
      }
      return grp.clauses;
    }
  }
  return intentType === 'store'
    ? [{ key: 'shop', tags: ['"supermarket"', '"department_store"', '"hardware"', '"electronics"', '"furniture"', '"trade"'] }]
    : [{ key: 'craft', tags: ['"plumber"', '"electrician"', '"hvac"'] }, { key: 'office', tags: ['"company"'] }];
}

function parseWktPoint(wkt) {
  const m = String(wkt || '').match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
}

async function scrapeOsmCommercialPois({
  category,
  city,
  country = 'IN',
  intentType = 'service',
  bounds,
  zone = null,
  onLead,
  signal
}) {
  if (signal?.aborted) return [];
  const clauses = resolveOsmTagFilter(category, intentType);
  const box = bounds || (zone ? {
    minLat: zone.lat - 0.035,
    maxLat: zone.lat + 0.035,
    minLng: zone.lng - 0.035,
    maxLng: zone.lng + 0.035
  } : null);
  if (!clauses?.length || !box) return [];

  const { minLat: s, minLng: w, maxLat: n, maxLng: e } = box;
  const unionBlock = clauses.map((c) => `{ ?osm osmkey:${c.key} ?tagVal . VALUES ?tagVal { ${c.tags.join(' ')} } }`).join(' UNION ');
  const sparql = `PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT DISTINCT ?name ?tagVal ?phone ?cphone ?cmobile ?website ?cwebsite ?email ?cemail ?street ?geom WHERE {
  ${unionBlock}
  ?osm osmkey:name ?name .
  ?osm geo:hasGeometry/geo:asWKT ?geom .
  OPTIONAL { ?osm osmkey:phone ?phone . }
  OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:contact:phone> ?cphone . }
  OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:contact:mobile> ?cmobile . }
  OPTIONAL { ?osm osmkey:website ?website . }
  OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:contact:website> ?cwebsite . }
  OPTIONAL { ?osm osmkey:email ?email . }
  OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:contact:email> ?cemail . }
  OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:addr:street> ?street . }
  FILTER(geof:sfIntersects(?geom, "POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))"^^geo:wktLiteral))
} LIMIT 1200`;

  try {
    const res = await fetch(`${QLEVER_URL}?query=${encodeURIComponent(sparql)}`, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.results?.bindings || [];

    const leads = [];
    for (const row of rows) {
      if (signal?.aborted) break;
      const name = String(row.name?.value || '').trim();
      const pt = parseWktPoint(row.geom?.value);
      if (!name || !pt) continue;

      const rawPhone = String(row.cmobile?.value || row.phone?.value || row.cphone?.value || '').trim();
      const phoneInfo = parsePhoneDetails(rawPhone, country);
      const street = String(row.street?.value || '').trim();
      const website = String(row.website?.value || row.cwebsite?.value || '').trim();
      const email = String(row.email?.value || row.cemail?.value || '').trim().toLowerCase();
      const tagVal = String(row.tagVal?.value || '').replace(/_/g, ' ').trim();

      const lead = normalizeLead({
        name,
        phone: phoneInfo.primary || rawPhone,
        mobilePhone: phoneInfo.mobile,
        landlinePhone: phoneInfo.landline,
        isMobile: phoneInfo.isMobile,
        isLandline: phoneInfo.isLandline,
        whatsappAvailable: Boolean(phoneInfo.whatsappLink),
        whatsappLink: phoneInfo.whatsappLink,
        email,
        emails: email ? [email] : [],
        website,
        address: street ? `${street}, ${city}` : `${zone?.name || city}, ${city}`,
        locality: zone?.name || city,
        city,
        country,
        lat: pt.lat,
        lng: pt.lng,
        category: tagVal,
        matchedSubcategory: String(category || '').trim(),
        source: 'openstreetmap_poi',
        verified: Boolean(phoneInfo.primary || website)
      }, 'openstreetmap_poi');

      leads.push(lead);
      if (typeof onLead === 'function') onLead(lead);
    }
    return leads;
  } catch (_) {
    return [];
  }
}

module.exports = { scrapeOsmCommercialPois, resolveOsmTagFilter };
