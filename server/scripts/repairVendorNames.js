/**
 * One-off maintenance: repair generic vendor names in the live store.
 *
 * Deep enrichment used to accept a Google Maps page title such as "Results" as
 * the business name. Where the record still holds a real name in
 * `normalizedName`, restore it. Records with no recoverable name are removed.
 *
 * Usage: node server/scripts/repairVendorNames.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'scraped_vendors.json');
const GENERIC = /^(?:results?|search results?|top results?|sponsored(?: listing| by)?|advertisement|ad\b|featured(?: listing)?|listing(?: results?)?|view all|load more|show more|justdial|indiamart|weddingbazaar|mandap\.com|sulekha)$/i;

function titleCase(value) {
  return String(value || '')
    .replace(/[^a-z0-9\s&'.-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeGeneric(value) {
  return String(value || '')
    .replace(/[\uE000-\uF8FF\u200B-\u200F\uFE0F]/g, '')
    .replace(/[\s?.!:,;·—–-]+$/g, '')
    .trim();
}

function main() {
  if (!fs.existsSync(file)) {
    console.log('No vendor store found.');
    return;
  }
  const vendors = JSON.parse(fs.readFileSync(file, 'utf8'));
  let renamed = 0;
  let dropped = 0;
  const kept = [];

  for (const vendor of vendors) {
    if (!vendor) continue;
    if (!GENERIC.test(normalizeGeneric(vendor.name))) {
      kept.push(vendor);
      continue;
    }
    const fallback = titleCase(vendor.normalizedName || '');
    if (fallback && fallback.length > 2) {
      vendor.name = fallback;
      renamed += 1;
      kept.push(vendor);
    } else {
      dropped += 1;
    }
  }

  if (renamed || dropped) {
    fs.writeFileSync(file, JSON.stringify(kept, null, 2));
  }
  console.log(`Vendors: ${vendors.length} → ${kept.length} (renamed ${renamed}, dropped ${dropped})`);
}

main();
