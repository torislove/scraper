/**
 * Source registry: every lead source the app knows about, with an honest access
 * status per country.
 *
 * Why a registry instead of a pile of `if (country === ...)` branches:
 *   - The UI can show exactly which sources run for the selected country.
 *   - A blocked source is reported as blocked instead of silently returning 0.
 *   - Adding a country is data, not a code change.
 *
 * Access values:
 *   open-api        Free, keyless, public API. Runs by default.
 *   public-html     Public pages whose robots.txt does not forbid the path.
 *                   Fetched politely (serialised, crawl-delay respected).
 *   blocked         The site actively blocks non-browser clients (403/challenge)
 *                   or its terms forbid automated collection. We do NOT bypass
 *                   this. The source is listed so users know it is unavailable.
 *   untested        Not verified from this build. Never runs until verified.
 *
 * There are no key-based sources. Nothing here needs an account or a credit
 * card, and nothing stops working when a key expires.
 */

const { COUNTRIES, adminForCountry } = require('../localBrain/countries');

const C = (...codes) => codes;

const SOURCES = [
  /* ── Global, keyless ─────────────────────────────────────────────────── */
  {
    id: 'openstreetmap',
    label: 'OpenStreetMap',
    engine: 'openstreetmap',
    homepage: 'https://www.openstreetmap.org',
    countries: '*',
    access: 'open-api',
    enabled: true,
    licence: 'ODbL',
    note: 'Public Overpass/Nominatim APIs. Polite rate limits, one-day cache. Works in every country.'
  },
  {
    id: 'google-maps',
    label: 'Google Maps',
    engine: 'maps',
    homepage: 'https://www.google.com/maps',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Browser session against public Maps results. Respects the in-app ban guard; no CAPTCHA solving.'
  },
  {
    id: 'google-local-finder',
    label: 'Google Local Finder',
    engine: 'google-local-finder',
    homepage: 'https://www.google.com',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Local-pack listings. Consent walls are surfaced, never circumvented.'
  },
  {
    id: 'google-serp',
    label: 'Google SERP',
    engine: 'google-serp',
    homepage: 'https://www.google.com',
    countries: '*',
    access: 'blocked',
    enabled: false,
    note: 'Paused: consent/robot wall. Kept visible so the UI does not promise it.'
  },
  {
    id: 'brave-search',
    label: 'Brave Search',
    engine: 'brave',
    homepage: 'https://search.brave.com',
    countries: '*',
    access: 'public-html',
    enabled: false,
    note: 'Only runs when explicitly selected; currently rate-limited (HTTP 429). No retry storms.'
  },
  {
    id: 'web-discovery',
    label: 'Web Discovery',
    engine: 'web-discovery',
    homepage: '',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Public search results -> independent business websites -> robots-aware contact extraction. Keyless and global.'
  },
  {
    id: 'web-contact',
    label: 'Official websites',
    engine: 'web-contact',
    homepage: '',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Deep-reads a vendor\'s own site for phone, email and address.'
  },

  /* ── India ───────────────────────────────────────────────────────────── */
  {
    id: 'justdial',
    label: 'JustDial',
    engine: 'justdial',
    homepage: 'https://www.justdial.com',
    countries: C('IN'),
    access: 'public-html',
    enabled: true,
    note: 'India-only directory. Paced through the ban guard.'
  },
  {
    id: 'indiamart',
    label: 'IndiaMART',
    engine: 'indiamart',
    homepage: 'https://www.indiamart.com',
    countries: C('IN'),
    access: 'blocked',
    enabled: false,
    note: 'Paused: bot/consent wall. Supplier searches rely on OSM and Maps instead.'
  },
  {
    id: 'weddingbazaar',
    label: 'WeddingBazaar',
    engine: 'weddingbazaar',
    homepage: 'https://www.weddingbazaar.com',
    countries: C('IN'),
    access: 'public-html',
    enabled: true,
    note: 'India wedding vendors.'
  },
  {
    id: 'weddingwire',
    label: 'WeddingWire India',
    engine: 'weddingwire',
    homepage: 'https://www.weddingwire.in',
    countries: C('IN'),
    access: 'public-html',
    enabled: true,
    note: 'India wedding vendors.'
  },
  {
    id: 'mandap',
    label: 'Mandap',
    engine: 'mandap',
    homepage: 'https://www.mandap.com',
    countries: C('IN'),
    access: 'public-html',
    enabled: true,
    note: 'India wedding venues and mandapams.'
  },

  /* ── United States ───────────────────────────────────────────────────── */
  {
    id: 'yellowpages-us',
    label: 'YellowPages (US)',
    engine: null,
    homepage: 'https://www.yellowpages.com',
    countries: C('US'),
    access: 'blocked',
    enabled: false,
    note: 'Robots/edge returns HTTP 403 to non-browser clients and their terms forbid automated collection. Not bypassed.'
  },
  {
    id: 'bbb-us',
    label: 'Better Business Bureau',
    engine: null,
    homepage: 'https://www.bbb.org',
    countries: C('US', 'CA'),
    access: 'blocked',
    enabled: false,
    note: 'Bot-protected and terms-restricted. Not bypassed.'
  },
  {
    id: 'manta-us',
    label: 'Manta',
    engine: null,
    homepage: 'https://www.manta.com',
    countries: C('US'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── Canada ──────────────────────────────────────────────────────────── */
  {
    id: 'yellowpages-ca',
    label: 'YellowPages.ca',
    engine: null,
    homepage: 'https://www.yellowpages.ca',
    countries: C('CA'),
    access: 'untested',
    enabled: false,
    note: 'Robots.txt allows most listing pages but blocks many search variants. Needs a verified path before enabling.'
  },
  {
    id: 'canada411',
    label: 'Canada411',
    engine: null,
    homepage: 'https://www.canada411.ca',
    countries: C('CA'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── United Kingdom ──────────────────────────────────────────────────── */
  {
    id: 'yell-uk',
    label: 'Yell',
    engine: null,
    homepage: 'https://www.yell.com',
    countries: C('GB'),
    access: 'blocked',
    enabled: false,
    note: 'Edge returns HTTP 403 to non-browser clients. Not bypassed.'
  },
  {
    id: 'thomson-local-uk',
    label: 'Thomson Local',
    engine: null,
    homepage: 'https://www.thomsonlocal.com',
    countries: C('GB'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'cylex-uk',
    label: 'Cylex UK',
    engine: null,
    homepage: 'https://www.cylex-uk.co.uk',
    countries: C('GB'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── Australia / New Zealand ─────────────────────────────────────────── */
  {
    id: 'yellowpages-au',
    label: 'Yellow Pages Australia',
    engine: null,
    homepage: 'https://www.yellowpages.com.au',
    countries: C('AU'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'truelocal-au',
    label: 'TrueLocal',
    engine: null,
    homepage: 'https://www.truelocal.com.au',
    countries: C('AU'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'yellowpages-nz',
    label: 'Yellow Pages NZ',
    engine: null,
    homepage: 'https://www.yellowpages.co.nz',
    countries: C('NZ'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── Middle East ─────────────────────────────────────────────────────── */
  {
    id: 'yellowpages-ae',
    label: 'Yellow Pages UAE',
    engine: null,
    homepage: 'https://www.yellowpages-uae.com',
    countries: C('AE'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'yellowpages-sa',
    label: 'Yellow Pages Saudi Arabia',
    engine: null,
    homepage: 'https://www.yellowpages.com.sa',
    countries: C('SA'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── Asia-Pacific ───────────────────────────────────────────────────── */
  {
    id: 'yellowpages-sg',
    label: 'Yellow Pages Singapore',
    engine: null,
    homepage: 'https://www.yellowpages.com.sg',
    countries: C('SG'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'yellowpages-my',
    label: 'Yellow Pages Malaysia',
    engine: null,
    homepage: 'https://www.yellowpages.my',
    countries: C('MY'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },

  /* ── Africa / Ireland ───────────────────────────────────────────────── */
  {
    id: 'yellowpages-za',
    label: 'Yellow Pages South Africa',
    engine: null,
    homepage: 'https://www.yellowpages.co.za',
    countries: C('ZA'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  },
  {
    id: 'goldenpages-ie',
    label: 'Golden Pages Ireland',
    engine: null,
    homepage: 'https://www.goldenpages.ie',
    countries: C('IE'),
    access: 'untested',
    enabled: false,
    note: 'Not verified in this build.'
  }
];

const INDIA_ONLY_ENGINES = new Set(['justdial', 'indiamart', 'weddingbazaar', 'weddingwire', 'mandap']);

/**
 * Explicit engine bundles. India keeps its directory engines; every other
 * country gets the keyless global stack. This is deliberately a data table so a
 * new country cannot accidentally inherit JustDial, and India cannot lose its
 * specialised directories when international engines are added.
 */
const INDIA_ENGINES = [
  'openstreetmap',
  'maps',
  'google-local-finder',
  'web-discovery',
  'web-contact',
  'justdial',
  'weddingbazaar',
  'weddingwire',
  'mandap'
];

const INTERNATIONAL_ENGINES = [
  'openstreetmap',
  'maps',
  'google-local-finder',
  'web-discovery',
  'web-contact'
];

const COUNTRY_ENGINES = {
  IN: INDIA_ENGINES,
  DEFAULT: INTERNATIONAL_ENGINES
};

function bundleForCountry(code) {
  const country = normaliseCountry(code) || 'IN';
  return (COUNTRY_ENGINES[country] || COUNTRY_ENGINES.DEFAULT).slice();
}

function normaliseCountry(code) {
  const value = String(code || '').trim().toUpperCase();
  if (!value) return null;
  if (value === 'UK') return 'GB';
  return COUNTRIES.some(c => c.code === value) ? value : null;
}

function sourceCountries(source) {
  return source.countries === '*' ? COUNTRIES.map(c => c.code) : source.countries;
}

function sourcesForCountry(code) {
  const country = normaliseCountry(code) || 'IN';
  return SOURCES.filter(source => source.countries === '*' || source.countries.includes(country));
}

/** Engine keys that may run in this country. Blocked/untested sources excluded. */
function enginesForCountry(code) {
  const country = normaliseCountry(code) || 'IN';
  const engines = new Set();

  // The explicit country bundle (India vs rest of world). Every entry is a
  // keyless engine, so a run can never depend on a key being present.
  for (const engine of bundleForCountry(country)) {
    if (country !== 'IN' && INDIA_ONLY_ENGINES.has(engine)) continue;
    const source = SOURCES.find(s => s.engine === engine);
    if (!source || !source.enabled) continue;
    if (source.access === 'blocked' || source.access === 'untested') continue;
    engines.add(engine);
  }

  return [...engines];
}

function engineSupportedInCountry(engine, code) {
  const country = normaliseCountry(code) || 'IN';
  if (!engine) return false;
  if (country !== 'IN' && INDIA_ONLY_ENGINES.has(engine)) return false;
  const source = SOURCES.find(s => s.engine === engine);
  if (!source) return true; // alias (google-serp-local etc.) handled by engineMatch
  if (source.access === 'blocked' || source.access === 'untested') return false;
  return source.countries === '*' || source.countries.includes(country);
}

function coverageReport() {
  return COUNTRIES.map(country => {
    const list = sourcesForCountry(country.code);
    const count = status => list.filter(s => s.access === status).length;
    const admin = adminForCountry(country.code);
    return {
      code: country.code,
      name: country.name,
      currency: country.currency,
      phoneCode: country.phone,
      admin,
      adminPath: admin.levels.join(' → '),
      runningEngines: enginesForCountry(country.code),
      sources: list.map(s => ({
        id: s.id,
        label: s.label,
        access: s.access,
        enabled: Boolean(s.enabled),
        countries: s.countries,
        note: s.note
      })),
      totals: {
        running: list.filter(s => s.enabled && s.access !== 'blocked' && s.access !== 'untested').length,
        blocked: count('blocked'),
        untested: count('untested')
      }
    };
  });
}

module.exports = {
  SOURCES,
  INDIA_ONLY_ENGINES,
  INDIA_ENGINES,
  INTERNATIONAL_ENGINES,
  COUNTRY_ENGINES,
  SOURCE_COUNTRIES: COUNTRIES.map(c => c.code),
  normaliseCountry,
  sourcesForCountry,
  enginesForCountry,
  engineSupportedInCountry,
  bundleForCountry,
  coverageReport,
  sourceCountries
};
