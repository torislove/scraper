'use strict';

const { resolveZones, resolveCityKey } = require('./server/src/geo');
const { getSubvectorsForQuery } = require('./server/src/taxonomy');
const { scrapeSovereignSingleZone } = require('./server/src/engines/directories');
const { scrapeJustdialSingleZone, lookupNcatId } = require('./server/src/engines/justdial');
const { huntOnlineDossier, enrichVendor } = require('./server/src/services/leadEnricher');
const store = require('./server/src/store');

const TEST_COUNTRIES = [
  { code: 'IN', city: 'Guntur', sublocality: 'Krishna Nagar', expectedZonesMin: 10 },
  { code: 'US', city: 'Dallas', sublocality: 'Downtown', expectedZonesMin: 5 },
  { code: 'GB', city: 'London', sublocality: 'Westminster', expectedZonesMin: 5 },
  { code: 'AU', city: 'Sydney', sublocality: 'CBD', expectedZonesMin: 5 },
  { code: 'CA', city: 'Toronto', sublocality: 'Downtown', expectedZonesMin: 5 },
  { code: 'DE', city: 'Berlin', sublocality: 'Mitte', expectedZonesMin: 5 },
  { code: 'FR', city: 'Paris', sublocality: '1st Arrondissement', expectedZonesMin: 5 },
  { code: 'AE', city: 'Dubai', sublocality: 'Downtown Dubai', expectedZonesMin: 4 },
  { code: 'SG', city: 'Singapore', sublocality: 'Downtown Core', expectedZonesMin: 4 },
  { code: 'NZ', city: 'Auckland', sublocality: 'Auckland CBD', expectedZonesMin: 4 },
  { code: 'IE', city: 'Dublin', sublocality: 'Dublin 2', expectedZonesMin: 4 }
];

async function runAudit() {
  console.log('================================================================');
  console.log('AUDITING ALL 11 SOVEREIGN NATIONS & ENGINES WITH REAL EXAMPLES');
  console.log('================================================================\n');

  let passedGeo = 0;
  let passedTaxonomy = 0;

  for (const c of TEST_COUNTRIES) {
    // 1. Test Geo Resolver
    const geo = resolveZones(c.city, c.code);
    const subGeo = resolveZones(c.sublocality, c.code);
    const hasZones = geo.zones && geo.zones.length >= c.expectedZonesMin;
    console.log(`[GEO] [${c.code}] ${c.city} -> City: ${geo.cityName} | Zones: ${geo.zones.length} | First: ${geo.zones[0]?.name}`);
    console.log(`      Sub-locality test: "${c.sublocality}" -> Resolved City: ${subGeo.cityName} | Zone 0: ${subGeo.zones[0]?.name}`);
    if (hasZones && subGeo.zones.length > 0) passedGeo++;

    // 2. Test Taxonomy & Subvectors
    const subvecs = getSubvectorsForQuery('schools', c.code);
    const hasSubvecs = Array.isArray(subvecs) && subvecs.length > 0;
    console.log(`[TAXONOMY] [${c.code}] Subvectors for "schools": [${subvecs.slice(0, 3).join(', ')}] (Total: ${subvecs.length})`);
    if (hasSubvecs) passedTaxonomy++;
  }

  console.log(`\nGEO PASS: ${passedGeo}/${TEST_COUNTRIES.length}`);
  console.log(`TAXONOMY PASS: ${passedTaxonomy}/${TEST_COUNTRIES.length}\n`);

  // 3. Test JustDial Engine & Multi-Page Pagination
  console.log('--- TESTING JUSTDIAL TURBO MULTI-PAGE SQUEEZE (IN) ---');
  const ncatid = await lookupNcatId('hospitals', 'Guntur');
  console.log(`JustDial NCAT ID for "hospitals in Guntur": ${ncatid || 'NOT FOUND'}`);

  let jdCount = 0;
  const jdLeads = await scrapeJustdialSingleZone({
    category: 'dentists',
    city: 'Guntur',
    zoneName: 'Krishna Nagar',
    onLead: (lead) => {
      jdCount++;
    }
  });
  console.log(`JustDial Multi-Page Squeeze for "Krishna Nagar, Guntur": ${jdLeads.length} leads extracted (Callback received: ${jdCount})`);
  if (jdLeads.length > 0) {
    console.log(`Example JustDial Lead: ${jdLeads[0].name} | Phone: ${jdLeads[0].phone || jdLeads[0].mobilePhone || 'N/A'}`);
  }

  // 4. Test Missing Mobile & Social Media Hunter (DuckDuckGo / SERP dork)
  console.log('\n--- TESTING ONLINE DOSSIER CONTACT & SOCIAL HUNTER ---');
  const testHunt = await huntOnlineDossier('Dental Hospital', 'Krishna Nagar', 'Guntur', 'IN');
  console.log(`Hunted Dossier for Dental Hospital:`, JSON.stringify(testHunt, null, 2));

  // 5. Test Deep Enrich API logic on store vendor
  console.log('\n--- TESTING VENDOR STORE & DEEP ENRICH PIPELINE ---');
  const dummyLead = {
    name: 'Apollo Dental Clinic',
    locality: 'Krishna Nagar',
    city: 'Guntur',
    country: 'IN',
    category: 'Dental Clinic',
    source: 'test'
  };
  const saved = store.saveVendor(dummyLead, 'test_session');
  console.log(`Saved Vendor ID: ${saved.lead.id}`);
  const enrichResult = await enrichVendor(saved.lead.id);
  console.log(`Enrich Result OK: ${enrichResult.ok} | Vendor Name: ${enrichResult.vendor?.name} | Phone: ${enrichResult.vendor?.phone || 'Hunted/Checked'}`);

  console.log('\n================================================================');
  console.log('AUDIT COMPLETE: ALL CHECKS EXECUTED');
  console.log('================================================================');
}

runAudit().catch(console.error);
