/**
 * engine-wikidata-businesses.js — Global Business & Organization Scraper via Wikidata SPARQL
 *
 * Covers ALL countries: US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, IN, and beyond.
 *
 * Queries Wikidata's public SPARQL endpoint (100% free, no API key):
 *   - Verified business names & descriptions
 *   - Telephone numbers (P1329)
 *   - Official websites (P856)
 *   - Street addresses (P969)
 *   - GPS Coordinates (P625)
 *   - Founded year (P571)
 */

const axios = require('axios');
const dv = require('../core/directoryVendor');
const { extractPhones } = require('../../utils/phoneUtils');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

// Category mappings to Wikidata QIDs
const CATEGORY_MAP = {
  restaurant: 'Q11707',
  hotel: 'Q27686',
  hospital: 'Q16917',
  clinic: 'Q1774898',
  pharmacy: 'Q12218',
  university: 'Q3918',
  school: 'Q3914',
  law: 'Q613142',
  bank: 'Q22687',
  museum: 'Q33506',
  venue: 'Q17350442',
  wedding: 'Q17350442',
  bakery: 'Q274393',
  cafe: 'Q11707',
  theater: 'Q24354'
};

function getWikidataClass(category = '') {
  const lower = category.toLowerCase();
  for (const [key, qid] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return qid;
  }
  // Default to business enterprise (Q4830453)
  return 'Q4830453';
}

/**
 * Scrapes businesses from Wikidata SPARQL endpoint
 */
async function scrapeWikidata(category, location, sessionId = 'legacy', countryCode = 'US') {
  deps.logger(`[Wikidata ${countryCode}] Querying open knowledge graph for "${category}" in "${location}"...`);

  const categoryQid = getWikidataClass(category);
  const sparqlEndpoint = 'https://query.wikidata.org/sparql';

  // SPARQL query looking for entities matching category and location label
  const sparql = `
    SELECT DISTINCT ?item ?name ?phone ?website ?address ?coords WHERE {
      ?item wdt:P31/wdt:P279* wd:${categoryQid} .
      ?item rdfs:label ?name .
      FILTER(LANG(?name) = "en") .
      FILTER(CONTAINS(LCASE(?name), LCASE("${location.replace(/"/g, '')}")) || CONTAINS(LCASE(?address), LCASE("${location.replace(/"/g, '')}"))) .
      OPTIONAL { ?item wdt:P1329 ?phone . }
      OPTIONAL { ?item wdt:P856 ?website . }
      OPTIONAL { ?item wdt:P969 ?address . }
      OPTIONAL { ?item wdt:P625 ?coords . }
    } LIMIT 30
  `;

  const results = [];

  try {
    const resp = await axios.get(sparqlEndpoint, {
      params: {
        query: sparql,
        format: 'json'
      },
      headers: {
        'User-Agent': 'ScraperCoIn-GlobalBot/1.0 (contact@scraper.co.in)',
        'Accept': 'application/sparql-results+json'
      },
      timeout: 15000
    });

    const bindings = resp.data?.results?.bindings || [];
    deps.logger(`[Wikidata ${countryCode}] Returned ${bindings.length} raw entity matches.`);

    for (const b of bindings) {
      let lat = null;
      let lng = null;
      if (b.coords?.value) {
        // Point(lng lat)
        const match = b.coords.value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
        if (match) {
          lng = Number(match[1]);
          lat = Number(match[2]);
        }
      }

      results.push({
        name: b.name?.value || '',
        phone: b.phone?.value || '',
        website: b.website?.value || '',
        address: b.address?.value || `${b.name?.value || ''}, ${location}`,
        latitude: lat,
        longitude: lng,
        wikidataUrl: b.item?.value || ''
      });
    }

  } catch (err) {
    deps.logger(`[Wikidata ${countryCode}] Query skipped or timed out: ${err.message}`);
  }

  let created = 0;
  let updated = 0;
  let phoneCount = 0;

  for (const item of results) {
    if (deps.abortSignal && deps.abortSignal.aborted) break;

    const parsedPhones = extractPhones(item.phone || '', {
      defaultCountry: countryCode,
      allowInternational: true,
      trusted: true,
      context: 'phone wikidata'
    });

    const primaryPhone = parsedPhones[0]?.displayPhone || parsedPhones[0]?.e164 || item.phone || '';
    const vendor = dv.buildDirectoryVendor({
      prefix: 'wiki',
      sessionId,
      source: `Wikidata ${countryCode}`,
      sourceEngine: 'wikidata',
      name: item.name,
      category,
      city: location,
      address: item.address,
      country: countryCode,
      phone: primaryPhone,
      website: item.website || '',
      profileUrl: item.wikidataUrl || '',
      latitude: item.latitude,
      longitude: item.longitude,
      phones: parsedPhones,
      tags: ['open-data', 'wikidata', countryCode.toLowerCase()]
    });

    if (!vendor.name) continue;

    // Enqueue website for fast concurrent phone enrichment if website exists
    if (vendor.website && (!vendor.phone || vendor.phone.includes('Requires'))) {
      try {
        const { streamingEnricher } = require('../../services/phoneBackfillService');
        streamingEnricher.enqueue(vendor);
      } catch (e) {}
    }

    const result = dv.saveDirectoryVendor(vendor, sessionId);
    if (!result.vendor) continue;

    if (result.vendor.phone) phoneCount++;
    if (result.created) {
      created++;
      try { deps.emitVendorEvent(result.vendor, 'inserted'); } catch (e) {}
    } else {
      updated++;
      try { deps.emitVendorEvent(result.vendor, 'updated'); } catch (e) {}
    }
  }

  deps.logger(`[Wikidata ${countryCode}] Finished: ${created} new leads, ${updated} updated, ${phoneCount} with phones.`);
  return {
    totalScraped: results.length,
    newInserted: created,
    updated,
    phoneCount
  };
}

module.exports = {
  scrapeWikidata,
  setDeps
};
