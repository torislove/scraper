const engines = {
  mandap: () => require('../src/scrapers/engine-mandap').scrapeMandap,
  weddingbazaar: () => require('../src/scrapers/engine-weddingbazaar').scrapeWeddingBazaar,
  weddingwire: () => require('../src/scrapers/engine-weddingwire').scrapeWeddingWire,
  indiamart: () => require('../src/scrapers/engine-puppeteer-indiamart').scrapePuppeteerIndiaMart,
  justdial: () => require('../src/scrapers/engine-justdial').scrapeJustDial
};

const name = process.argv[2];
const category = process.argv[3] || 'Banquet Halls';
const location = process.argv[4] || 'Vijayawada, Andhra Pradesh';
const sessionId = process.argv[5] || `selftest_${name}_${Date.now().toString(36)}`;

if (!engines[name]) {
  console.error('Unknown engine', name);
  process.exit(1);
}

(async () => {
  const started = Date.now();
  console.log(`[TEST] ${name} | ${category} | ${location} | session=${sessionId}`);
  let result;
  try {
    result = await engines[name]()(category, location, sessionId);
  } catch (error) {
    console.error('[TEST] engine threw:', error.stack);
    process.exit(1);
  }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log('[TEST] result:', JSON.stringify(result));
  console.log(`[TEST] elapsed ${elapsed}s`);

  const dbAdapter = require('../src/config/dbAdapter');
  const vendors = dbAdapter.getVendors().filter(v => (v.sessionIds || [v.sessionId]).includes(sessionId));
  console.log(`[TEST] vendors linked to session: ${vendors.length}`);
  const withPhone = vendors.filter(v => v.phone && !/Requires/.test(String(v.phone)));
  console.log(`[TEST] with validated phone: ${withPhone.length}`);
  for (const vendor of vendors.slice(0, 4)) {
    console.log(JSON.stringify({
      name: vendor.name,
      category: vendor.category,
      city: vendor.city,
      locality: vendor.locality,
      address: vendor.address,
      pincode: vendor.pincode,
      phone: vendor.phone,
      rating: vendor.rating,
      reviewCount: vendor.reviewCount,
      priceRange: vendor.priceRange,
      capacity: vendor.capacity,
      amenities: (vendor.amenities || []).slice(0, 8),
      payments: (vendor.payments || []).slice(0, 6),
      services: (vendor.services || []).slice(0, 5),
      descriptionLength: (vendor.description || '').length,
      images: (vendor.images || []).length,
      profileSourceUrl: vendor.profileSourceUrl,
      source: vendor.source
    }, null, 1));
  }
  // Commit the debounced store synchronously so results survive process exit.
  dbAdapter.flushSync();
  process.exit(0);
})();
