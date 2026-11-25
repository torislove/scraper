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
  {
    id: 'social-profiles',
    label: 'Social Profiles & Directories',
    engine: 'social',
    homepage: 'https://www.bing.com',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Public social & directory profiles (Instagram, Facebook, LinkedIn) with normalized universal phone and contact extraction.'
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
    label: 'WeddingWire',
    engine: 'weddingwire',
    homepage: 'https://www.weddingwire.com',
    countries: C('IN', 'US', 'CA', 'GB', 'AU'),
    access: 'public-html',
    enabled: true,
    note: 'Global wedding marketplace (India, US, CA, UK, AU).'
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
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.com',
    countries: C('US'),
    access: 'public-html',
    enabled: true,
    note: 'US YellowPages public business listings.'
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
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.ca',
    countries: C('CA'),
    access: 'public-html',
    enabled: true,
    note: 'Canada YellowPages public business listings.'
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
    label: 'Yell (UK)',
    engine: 'yellowpages',
    homepage: 'https://www.yell.com',
    countries: C('GB'),
    access: 'public-html',
    enabled: true,
    note: 'UK Yell public business listings.'
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
    label: 'Cylex Global Directory',
    engine: 'cylex',
    homepage: 'https://www.cylex-uk.co.uk',
    countries: C('GB', 'DE', 'AU', 'CA', 'AE', 'SG', 'US'),
    access: 'public-html',
    enabled: true,
    note: 'Cylex public local business directory across UK, Germany, US, Canada, Australia, UAE & Singapore.'
  },
  {
    id: 'freeindex-uk',
    label: 'FreeIndex UK',
    engine: 'freeindex-uk',
    homepage: 'https://www.freeindex.co.uk',
    countries: C('GB'),
    access: 'public-html',
    enabled: true,
    note: 'UK verified local businesses and direct phone numbers.'
  },
  {
    id: 'yelp',
    label: 'Yelp',
    engine: 'yelp',
    homepage: 'https://www.yelp.com',
    countries: C('US', 'CA', 'AU'),
    access: 'public-html',
    enabled: true,
    note: 'Major business reviews & contact directory for US, Canada, and Australia.'
  },
  {
    id: 'bing-places',
    label: 'Bing Places & Maps',
    engine: 'bing-places',
    homepage: 'https://www.bing.com/maps',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Global local business cards with direct telecom, coordinates, and operating hours.'
  },
  {
    id: 'tripadvisor',
    label: 'TripAdvisor Global',
    engine: 'tripadvisor',
    homepage: 'https://www.tripadvisor.com',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Global hospitality, venue, restaurant, tour, and event listings with schema.org metadata.'
  },
  {
    id: 'wikidata-businesses',
    label: 'Wikidata Knowledge Graph',
    engine: 'wikidata-businesses',
    homepage: 'https://query.wikidata.org',
    countries: '*',
    access: 'open-api',
    enabled: true,
    note: 'Open SPARQL endpoint for global verified institutions, companies, clinics, and venues.'
  },
  {
    id: 'social-dork-intl',
    label: 'Social & Web Contact Dorking',
    engine: 'social-dork-intl',
    homepage: 'https://duckduckgo.com',
    countries: '*',
    access: 'public-html',
    enabled: true,
    note: 'Keyless global contact dorking for direct mobile numbers, emails, and company profiles.'
  },
  {
    id: 'trustpilot',
    label: 'Trustpilot Verified',
    engine: 'trustpilot',
    homepage: 'https://www.trustpilot.com',
    countries: C('US', 'GB', 'CA', 'AU', 'IE', 'NZ', 'SG', 'ZA'),
    access: 'blocked',
    enabled: false,
    note: 'Removed from bundle: Trustpilot answers both search API and website with HTTP 403 to non-browser clients.'
  },

  /* ── Australia / New Zealand ─────────────────────────────────────────── */
  {
    id: 'yellowpages-au',
    label: 'Yellow Pages Australia',
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.com.au',
    countries: C('AU'),
    access: 'public-html',
    enabled: true,
    note: 'Australia YellowPages public business listings.'
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
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.co.nz',
    countries: C('NZ'),
    access: 'public-html',
    enabled: true,
    note: 'New Zealand Yellow Pages public business listings.'
  },

  /* ── Middle East ─────────────────────────────────────────────────────── */
  {
    id: 'yellowpages-ae',
    label: 'Yellow Pages UAE',
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.ae',
    countries: C('AE'),
    access: 'public-html',
    enabled: true,
    note: 'UAE Yellow Pages public business directory.'
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
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.com.sg',
    countries: C('SG'),
    access: 'public-html',
    enabled: true,
    note: 'Singapore Yellow Pages business listings.'
  },
  {
    id: 'yellowpages-my',
    label: 'Yellow Pages Malaysia',
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.my',
    countries: C('MY'),
    access: 'public-html',
    enabled: true,
    note: 'Malaysia Yellow Pages business listings.'
  },

  /* ── Africa / Ireland ───────────────────────────────────────────────── */
  {
    id: 'yellowpages-za',
    label: 'Yellow Pages South Africa',
    engine: 'yellowpages',
    homepage: 'https://www.yellowpages.co.za',
    countries: C('ZA'),
    access: 'public-html',
    enabled: true,
    note: 'South Africa Yellow Pages business listings.'
  },
  {
    id: 'goldenpages-ie',
    label: 'Golden Pages Ireland',
    engine: 'goldenpages-ie',
    homepage: 'https://www.goldenpages.ie',
    countries: C('IE'),
    access: 'public-html',
    enabled: true,
    note: 'Ireland official GoldenPages business directory.'
  }
];

const INDIA_ONLY_ENGINES = new Set(['justdial', 'indiamart', 'weddingbazaar', 'mandap']);

/**
 * Alias table for engine keys. The UI sends labels ("Google Maps", "local-finder"),
 * the queue uses task names, and older saved sessions may hold shorthand. Every
 * spelling resolves to the canonical bundle key so a country bundle can never be
 * bypassed by using a different name for the same engine.
 */
const ENGINE_ALIASES = {
  openstreetmap: ['openstreetmap', 'osm', 'openmap', 'nominatim', 'overpass'],
  maps: ['maps', 'googlemaps', 'google-maps', 'places', 'googleplaces', 'google-places', 'geospatialmesh', 'directtelecom'],
  'google-local-finder': ['googlelocalfinder', 'local-finder', 'localfinder', 'google-local', 'localfinder', 'deepserp', 'googlelocal'],
  'web-discovery': ['webdiscovery', 'web-discovery', 'websearch', 'websites', 'web-discovery-engine'],
  'web-contact': ['webcontact', 'web-contact', 'officialwebsites', 'website-contact', 'websitecontact'],
  justdial: ['justdial', 'jd'],
  indiamart: ['indiamart', 'mart'],
  weddingbazaar: ['weddingbazaar', 'bazaar'],
  weddingwire: ['weddingwire', 'wedding-wire'],
  mandap: ['mandap'],
  social: ['social', 'dork', 'duckduckgo', 'ddg', 'instagram', 'facebook', 'footprint'],
  yellowpages: ['yellowpages', 'yp', 'yell', 'yellowpages-us', 'yellowpages-ca', 'yell-uk', 'yellowpages-au', 'yellowpages-nz', 'yellowpages-ae', 'yellowpages-sg', 'yellowpages-my', 'yellowpages-za'],
  yelp: ['yelp', 'yelp-us', 'yelp-ca', 'yelp-au'],
  'bing-places': ['bing-places', 'bingplaces', 'bingmaps', 'bing'],
  tripadvisor: ['tripadvisor', 'ta', 'trip-advisor'],
  'wikidata-businesses': ['wikidata-businesses', 'wikidata', 'sparql', 'knowledge-graph'],
  'social-dork-intl': ['social-dork-intl', 'social-dork', 'dork-intl'],
  'freeindex-uk': ['freeindex-uk', 'freeindex'],
  'goldenpages-ie': ['goldenpages-ie', 'goldenpages', 'golden-pages'],
  cylex: ['cylex', 'cylex-uk', 'cylex-au', 'cylex-ca', 'cylex-ae', 'cylex-sg'],
  trustpilot: ['trustpilot', 'tp', 'trust-pilot'],
  'google-serp': ['googleserp', 'google-serp', 'serp', 'organic', 'webpage'],
  brave: ['brave', 'brave-search']
};

const ALIAS_LOOKUP = (() => {
  const map = new Map();
  for (const [canonical, aliases] of Object.entries(ENGINE_ALIASES)) {
    map.set(canonical.replace(/[^a-z0-9]/g, ''), canonical);
    for (const alias of aliases) map.set(alias.replace(/[^a-z0-9]/g, ''), canonical);
  }
  return map;
})();

/** Resolve any engine spelling to its canonical bundle key (or null). */
function canonicalEngine(engine) {
  const key = String(engine || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key) return null;
  return ALIAS_LOOKUP.get(key) || null;
}


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
  'bing-places',
  'wikidata-businesses',
  'web-discovery',
  'web-contact',
  'social',
  'justdial',
  'weddingbazaar',
  'weddingwire',
  'mandap'
];

const INTERNATIONAL_ENGINES = [
  'openstreetmap',
  'maps',
  'google-local-finder',
  'weddingwire',
  'web-discovery',
  'web-contact',
  'yellowpages',
  'yelp',
  'bing-places',
  'tripadvisor',
  'wikidata-businesses',
  'social-dork-intl',
  'cylex',
  'freeindex-uk',
  'goldenpages-ie'
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
  //
  // A bundle entry is only kept when at least one *enabled* source that
  // implements it actually serves this country. Several engines share one
  // implementation (yellowpages, cylex) and each national site is a separate
  // registry row, so "any usable source" is the correct test — matching the
  // first row only used to drop YellowPages.ca because YellowPages.com was
  // listed first.
  for (const engine of bundleForCountry(country)) {
    if (country !== 'IN' && INDIA_ONLY_ENGINES.has(engine)) continue;
    const canonical = canonicalEngine(engine) || engine;
    const usable = SOURCES.some(source => {
      if (source.engine !== engine && source.engine !== canonical) return false;
      if (!source.enabled) return false;
      if (source.access === 'blocked' || source.access === 'untested') return false;
      return source.countries === '*' || source.countries.includes(country);
    });
    if (!usable) continue;
    engines.add(canonical);
  }

  return [...engines];
}

function engineSupportedInCountry(engine, code) {
  const country = normaliseCountry(code) || 'IN';
  if (!engine) return false;
  let canonical = canonicalEngine(engine) || String(engine).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (country !== 'IN' && canonical === 'social') canonical = 'social-dork-intl';
  if (country !== 'IN' && INDIA_ONLY_ENGINES.has(canonical)) return false;

  // Outside India the country bundle is the whole truth: an engine that is not
  // part of it (Google SERP, JustDial aliases) must be refused, not silently allowed.
  if (country !== 'IN') {
    const bundle = bundleForCountry(country).map(key => canonicalEngine(key) || key);
    return bundle.includes(canonical);
  }

  const source = SOURCES.find(s => s.engine === canonical || s.engine === engine);
  if (!source) return true; // unknown India-only alias handled by engineMatch
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
  canonicalEngine,
  bundleForCountry,
  coverageReport,
  sourceCountries
};
