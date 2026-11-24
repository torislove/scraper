const { scrapeYellowPagesGlobal } = require('../src/scrapers/engine-yellowpages-global');
const { scrapeYelp } = require('../src/scrapers/engine-yelp');
const { scrapeCylex } = require('../src/scrapers/engine-cylex');
const { scrapeFreeIndexUK } = require('../src/scrapers/engine-freeindex-uk');
const { scrapeGoldenPagesIE } = require('../src/scrapers/engine-goldenpages-ie');
const { scrapeBingPlaces } = require('../src/scrapers/engine-bing-places');
const { scrapeWikidata } = require('../src/scrapers/engine-wikidata-businesses');
const { scrapeOpenStreetMap } = require('../src/scrapers/engine-openstreetmap');

async function probe() {
  console.log('====================================================');
  console.log('   PROBING INTERNATIONAL DIRECTORY ENGINES');
  console.log('====================================================\n');

  const results = [];

  const runTest = async (name, country, category, city, fn) => {
    const t0 = Date.now();
    try {
      console.log(`[Testing] ${name} (${country}): "${category}" in "${city}"...`);
      const res = await fn();
      const leads = Array.isArray(res?.leads) ? res.leads : (Array.isArray(res) ? res : []);
      const count = leads.length || res?.count || res?.totalScraped || 0;
      const sample = leads[0];
      const hasPhone = leads.filter(l => l.phone).length;
      const hasWeb = leads.filter(l => l.website).length;
      const ms = Date.now() - t0;
      console.log(`  -> RESULT: ${count} leads in ${(ms / 1000).toFixed(1)}s (Phones: ${hasPhone}, Websites: ${hasWeb})`);
      if (sample) {
        console.log(`  -> Sample: "${sample.name}" | Phone: "${sample.phone || 'none'}" | Addr: "${(sample.address || '').slice(0, 40)}"`);
      }
      results.push({ engine: name, country, count, hasPhone, hasWeb, ms, ok: count > 0 });
    } catch (e) {
      const ms = Date.now() - t0;
      console.log(`  -> FAILED: ${e.message} in ${(ms / 1000).toFixed(1)}s`);
      results.push({ engine: name, country, count: 0, hasPhone: 0, hasWeb: 0, ms, ok: false, error: e.message });
    }
    console.log('');
  };

  // 1. OpenStreetMap (Global)
  await runTest('OpenStreetMap', 'US', 'dentist', 'Dallas', () => scrapeOpenStreetMap('dentist', 'Dallas', 'test_us', 32.7767, -96.7970, 10, 'US'));
  await runTest('OpenStreetMap', 'GB', 'restaurant', 'London', () => scrapeOpenStreetMap('restaurant', 'London', 'test_gb', 51.5074, -0.1278, 10, 'GB'));
  await runTest('OpenStreetMap', 'AE', 'hotel', 'Dubai', () => scrapeOpenStreetMap('hotel', 'Dubai', 'test_ae', 25.2048, 55.2708, 10, 'AE'));

  // 2. YellowPages Global (US, CA, AU, GB)
  await runTest('YellowPages', 'US', 'Dentists', 'Dallas, TX', () => scrapeYellowPagesGlobal('Dentists', 'Dallas, TX', 'test_yp_us', { countryCode: 'US' }));
  await runTest('YellowPages', 'CA', 'Dentists', 'Toronto', () => scrapeYellowPagesGlobal('Dentists', 'Toronto', 'test_yp_ca', { countryCode: 'CA' }));
  await runTest('YellowPages', 'AU', 'Dentists', 'Sydney', () => scrapeYellowPagesGlobal('Dentists', 'Sydney', 'test_yp_au', { countryCode: 'AU' }));

  // 3. FreeIndex UK (GB)
  await runTest('FreeIndex UK', 'GB', 'Plumbers', 'London', () => scrapeFreeIndexUK('Plumbers', 'London', 'test_fi_gb'));

  // 4. GoldenPages IE (IE)
  await runTest('GoldenPages IE', 'IE', 'Dentists', 'Dublin', () => scrapeGoldenPagesIE('Dentists', 'Dublin', 'test_gp_ie'));

  // 5. Cylex (DE & GB)
  await runTest('Cylex', 'DE', 'Zahnarzt', 'Berlin', () => scrapeCylex('Zahnarzt', 'Berlin', 'test_cy_de', { countryCode: 'DE' }));

  // 6. Wikidata Businesses (Global)
  await runTest('Wikidata', 'US', 'hospital', 'New York', () => scrapeWikidata('hospital', 'New York', 'test_wk_us', 'US'));

  // 7. Bing Places (US)
  await runTest('Bing Places', 'US', 'Dentists', 'Dallas', () => scrapeBingPlaces('Dentists', 'Dallas', 'test_bp_us', { countryCode: 'US' }));

  // 8. Yelp (US)
  await runTest('Yelp', 'US', 'Dentists', 'Dallas', () => scrapeYelp('Dentists', 'Dallas', 'test_yelp_us', { countryCode: 'US' }));

  console.log('\n====================================================');
  console.log('   INTERNATIONAL PROBE SUMMARY TABLE');
  console.log('====================================================');
  console.table(results);
}

probe().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
