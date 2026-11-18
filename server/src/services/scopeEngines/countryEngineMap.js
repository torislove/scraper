/**
 * countryEngineMap.js — Country to Directory Engine Dispatch Matrix
 *
 * Maps ISO 3166-1 alpha-2 country codes to their corresponding free, keyless
 * directory engines and local search providers.
 *
 * All engines listed here use public HTML parsing, open-data APIs, or open SPARQL
 * endpoints — zero paid APIs, zero subscriptions required.
 */

const COUNTRY_ENGINE_MAP = {
  // 1. United States
  US: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yelp',
    'yellowpages-global',
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 2. United Kingdom
  GB: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // Yell UK
    'freeindex-uk',
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 3. Canada
  CA: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yelp',
    'yellowpages-global', // YP Canada
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 4. Australia
  AU: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yelp',
    'yellowpages-global', // YP Australia
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 5. United Arab Emirates
  AE: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // YP UAE
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 6. Singapore
  SG: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // YP Singapore
    'cylex',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 7. New Zealand
  NZ: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // YP New Zealand
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 8. South Africa
  ZA: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // YP South Africa
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 9. Ireland
  IE: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'goldenpages-ie',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 10. Malaysia
  MY: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'yellowpages-global', // YP Malaysia
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl',
    'trustpilot'
  ],

  // 11. India (Home Market)
  IN: [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'justdial',
    'weddingbazaar',
    'weddingwire',
    'indiamart',
    'web-discovery',
    'social'
  ]
};

// Aliases
COUNTRY_ENGINE_MAP.UK = COUNTRY_ENGINE_MAP.GB;
COUNTRY_ENGINE_MAP.USA = COUNTRY_ENGINE_MAP.US;

/**
 * Returns list of appropriate directory engines for a given country code
 * @param {string} countryCode - ISO-2 code (e.g. 'US', 'GB', 'IN')
 * @returns {string[]} List of engine IDs
 */
function getEnginesForCountry(countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  return COUNTRY_ENGINE_MAP[code] || [
    'google-places',
    'google-local-finder',
    'openstreetmap',
    'bing-places',
    'tripadvisor',
    'web-discovery',
    'wikidata-businesses',
    'social-dork-intl'
  ];
}

module.exports = {
  COUNTRY_ENGINE_MAP,
  getEnginesForCountry
};
