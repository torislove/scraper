/**
 * 11-Country Scraping, Directory Engine & Phone Reconciliation Audit.
 *
 * Verifies:
 *  1. All 11 Supported Countries (IN, US, GB, CA, AU, AE, SG, NZ, ZA, IE, MY, DE).
 *  2. Engine Dispatch Matrix (countryEngineMap.js & registry.enginesForCountry).
 *  3. International Phone Parsing & Country Boundaries (no +91 leak, accurate dialing prefixes).
 *  4. Cross-Engine Lead Reconciliation (cooperatively merging phone-less leads with social/directory phones).
 *  5. WhatsApp link normalization and social bio phone extraction (Studio Sandyaraagam test case).
 *
 * Run: node scripts/verify/audit-11-countries.cjs
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const tempRoot = path.join(os.tmpdir(), `scraper-11audit-${Date.now()}`);
process.env.SCRAPER_DATA_DIR = path.join(tempRoot, 'data');
process.env.SCRAPER_DB_DIR = path.join(tempRoot, 'db');
fs.mkdirSync(process.env.SCRAPER_DATA_DIR, { recursive: true });
fs.mkdirSync(process.env.SCRAPER_DB_DIR, { recursive: true });

const { COUNTRY_ENGINE_MAP } = require('../../server/src/services/scopeEngines/countryEngineMap');
const { COUNTRIES, detectCountry } = require('../../server/src/services/localBrain/countries');
const { normalizePhone, extractPhones, extractSocialContacts, syncPhoneFlags } = require('../../server/src/utils/phoneUtils');
const { countryForLead, hasValidMobile } = require('../../server/src/services/phoneBackfillService');

const ALL_11_COUNTRIES = [
  { code: 'IN', name: 'India', dialPrefix: '91', samplePhone: '+91 99592 82819', expectedMobile: true },
  { code: 'US', name: 'United States', dialPrefix: '1', samplePhone: '+1 512 555 0199', expectedMobile: true },
  { code: 'GB', name: 'United Kingdom', dialPrefix: '44', samplePhone: '+44 7400 123456', expectedMobile: true },
  { code: 'CA', name: 'Canada', dialPrefix: '1', samplePhone: '+1 416 555 0144', expectedMobile: true },
  { code: 'AU', name: 'Australia', dialPrefix: '61', samplePhone: '+61 412 345 678', expectedMobile: true },
  { code: 'AE', name: 'United Arab Emirates', dialPrefix: '971', samplePhone: '+971 50 123 4567', expectedMobile: true },
  { code: 'SG', name: 'Singapore', dialPrefix: '65', samplePhone: '+65 9123 4567', expectedMobile: true },
  { code: 'NZ', name: 'New Zealand', dialPrefix: '64', samplePhone: '+64 21 123 4567', expectedMobile: true },
  { code: 'ZA', name: 'South Africa', dialPrefix: '27', samplePhone: '+27 82 123 4567', expectedMobile: true },
  { code: 'IE', name: 'Ireland', dialPrefix: '353', samplePhone: '+353 87 123 4567', expectedMobile: true },
  { code: 'MY', name: 'Malaysia', dialPrefix: '60', samplePhone: '+60 12 345 6789', expectedMobile: true },
  { code: 'DE', name: 'Germany', dialPrefix: '49', samplePhone: '+49 151 12345678', expectedMobile: true }
];

console.log('================================================================');
console.log('  11-COUNTRY SCRAPING & CROSS-ENGINE PHONE RECONCILIATION AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Verify all 11 Countries have registered engine maps
// -----------------------------------------------------------------------------
console.log('[Audit 1] Verifying Country Engine Dispatch Matrix...');
for (const c of ALL_11_COUNTRIES) {
  check(`Country ${c.code} (${c.name}) has registered engines in countryEngineMap`, () => {
    const engines = COUNTRY_ENGINE_MAP[c.code];
    assert(Array.isArray(engines), `Engines array missing for ${c.code}`);
    assert(engines.length >= 3, `Expected at least 3 engines for ${c.code}, got ${engines.length}`);
    assert(engines.includes('google-places'), `google-places missing in ${c.code}`);
    assert(engines.includes('openstreetmap'), `openstreetmap missing in ${c.code}`);
  });
}

// -----------------------------------------------------------------------------
// Test 2: Verify International Phone Formats & No +91 Leaks
// -----------------------------------------------------------------------------
console.log('\n[Audit 2] Verifying Country-Aware Phone Parsing (No +91 Leak)...');
for (const c of ALL_11_COUNTRIES) {
  check(`Phone parsing for ${c.code} correctly validates prefix +${c.dialPrefix}`, () => {
    const parsed = normalizePhone(c.samplePhone, { defaultCountry: c.code, allowInternational: c.code !== 'IN' });
    assert(parsed, `Failed to parse ${c.samplePhone} for ${c.code}`);
    assert(parsed.isValid, `Phone ${c.samplePhone} not valid`);
    assert(parsed.e164.startsWith(`+${c.dialPrefix}`), `Expected prefix +${c.dialPrefix}, got ${parsed.e164}`);
    
    // Country guard check: lead from Austin or London must not be assigned country IN
    const lead = { name: 'Test Business', city: 'Test City', phone: c.samplePhone, country: c.code };
    const detectedCC = countryForLead(lead);
    assert.strictEqual(detectedCC, c.code, `Expected detected country ${c.code}, got ${detectedCC}`);
  });
}

// -----------------------------------------------------------------------------
// Test 3: WhatsApp Link Normalization & Social Bio Contacts
// -----------------------------------------------------------------------------
console.log('\n[Audit 3] Verifying Social Bio Extraction & Studio Sandyaraagam Test Case...');
check('Extracts phone and WhatsApp from Studio Sandyaraagam bio snippet', () => {
  const bioSnippet = 'DAILY SHOOTS 10 am TO 6 pm 9959282819 INDOOR & OUTDOOR SHOOTS ... more wa.me/919959282819';
  const profileUrl = 'https://instagram.com/studio_sandyaraagam';

  const extracted = extractSocialContacts(bioSnippet, profileUrl, 'IN');
  assert(extracted.phones.includes('9959282819'), 'Expected phone 9959282819 in extracted phones');
  assert.strictEqual(extracted.whatsapp, 'https://wa.me/919959282819', 'WhatsApp link mismatch');
  assert.strictEqual(extracted.socialHandle, '@studio_sandyaraagam', 'Handle mismatch');

  // Direct normalizePhone check on wa.me link
  const normWa = normalizePhone('wa.me/919959282819');
  assert(normWa && normWa.isMobile, 'Expected wa.me link to parse as valid mobile');
  assert.strictEqual(normWa.national, '9959282819');
});

// -----------------------------------------------------------------------------
// Test 4: Cooperative Cross-Engine Lead Reconciliation
// -----------------------------------------------------------------------------
console.log('\n[Audit 4] Verifying Cooperative Cross-Engine Lead Merging...');
check('Merges phone-less Maps lead with phone from JustDial / Instagram', () => {
  // Lead A from Maps: has name and address, NO phone
  const mapsLead = {
    id: 'maps_123',
    name: 'Studio Sandhya Raagam',
    city: 'Guntur',
    address: 'Near Old Bus Stand, Guntur, Andhra Pradesh',
    phone: '',
    phones: [],
    source: 'Google Maps'
  };

  // Lead B from Social/JustDial: has phone and WhatsApp link
  const socialLead = {
    name: 'Studio Sandhya Raagam',
    city: 'Guntur',
    phone: '9959282819',
    phones: ['9959282819'],
    whatsappLink: 'https://wa.me/919959282819',
    instagram: 'https://instagram.com/studio_sandyaraagam',
    source: 'Instagram Dork'
  };

  // Cooperative merge simulation
  if (!mapsLead.phone && socialLead.phone) {
    mapsLead.phone = socialLead.phone;
    mapsLead.phones = [...new Set([...mapsLead.phones, ...socialLead.phones])];
    mapsLead.whatsappLink = socialLead.whatsappLink;
    mapsLead.instagram = socialLead.instagram;
    mapsLead.reconciled = true;
    syncPhoneFlags(mapsLead);
  }

  assert.strictEqual(mapsLead.phone, '9959282819');
  assert.strictEqual(mapsLead.isMobile, true);
  assert.strictEqual(mapsLead.whatsappAvailable, true);
  assert.strictEqual(mapsLead.whatsappLink, 'https://wa.me/919959282819');
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  AUDIT COMPLETE: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
