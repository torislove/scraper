const fs = require('fs');
const path = require('path');

const meta = require('../../server/node_modules/libphonenumber-js/metadata.max.json');
const display = new Intl.DisplayNames(['en'], { type: 'region' });

const CURRENCY = {
  IN: 'INR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', AE: 'AED', SG: 'SGD',
  NZ: 'NZD', ZA: 'ZAR', IE: 'EUR', MY: 'MYR', SA: 'SAR', QA: 'QAR', KW: 'KWD',
  BH: 'BHD', OM: 'OMR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  PT: 'EUR', BE: 'EUR', AT: 'EUR', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK',
  FI: 'EUR', PL: 'PLN', CZ: 'CZK', GR: 'EUR', TR: 'TRY', RU: 'RUB', UA: 'UAH',
  JP: 'JPY', CN: 'CNY', KR: 'KRW', HK: 'HKD', TW: 'TWD', TH: 'THB', VN: 'VND',
  ID: 'IDR', PH: 'PHP', BD: 'BDT', PK: 'PKR', LK: 'LKR', NP: 'NPR', BR: 'BRL',
  MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', NG: 'NGN', KE: 'KES',
  GH: 'GHS', EG: 'EGP', MA: 'MAD', IL: 'ILS', JO: 'JOD', LB: 'LBP', CY: 'EUR',
  MT: 'EUR', IS: 'ISK', HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR', RS: 'RSD',
  SK: 'EUR', SI: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR'
};

const CENTROIDS = {
  IN: { lat: 20.5937, lng: 78.9629 }, US: { lat: 37.0902, lng: -95.7129 },
  GB: { lat: 55.3781, lng: -3.4360 }, AU: { lat: -25.2744, lng: 133.7751 },
  AE: { lat: 23.4241, lng: 53.8478 }, CA: { lat: 56.1304, lng: -106.3468 },
  DE: { lat: 51.1657, lng: 10.4515 }, FR: { lat: 46.2276, lng: 2.2137 },
  SG: { lat: 1.3521, lng: 103.8198 }, NZ: { lat: -40.9006, lng: 174.8860 },
  IE: { lat: 53.1424, lng: -7.6921 }, ZA: { lat: -30.5595, lng: 22.9375 },
  MY: { lat: 4.2105, lng: 101.9758 }, SA: { lat: 23.8859, lng: 45.0792 },
  JP: { lat: 36.2048, lng: 138.2529 }, BR: { lat: -14.2350, lng: -51.9253 },
  IT: { lat: 41.8719, lng: 12.5674 }, ES: { lat: 40.4637, lng: -3.7492 },
  NL: { lat: 52.1326, lng: 5.2913 }, MX: { lat: 23.6345, lng: -102.5528 }
};

const rows = [];
const countriesMap = {};
const centroidsMap = {};

for (const code of Object.keys(meta.countries).sort()) {
  if (code === '001') continue;
  const entry = meta.countries[code];
  const calling = Array.isArray(entry) ? entry[0] : '';
  const name = display.of(code) || code;
  const centroid = CENTROIDS[code] || { lat: 0, lng: 0 };
  const currency = CURRENCY[code] || 'USD';
  const callingCode = calling ? String(calling) : '';

  const item = {
    code,
    name,
    nativeName: name,
    centroid,
    defaultLang: ['FR'].includes(code) ? 'fr' : ['DE'].includes(code) ? 'de' : ['ES'].includes(code) ? 'es' : ['IT'].includes(code) ? 'it' : ['AE', 'SA', 'EG'].includes(code) ? 'ar' : 'en',
    callingCode,
    currency
  };

  rows.push(item);
  countriesMap[code] = item;
  centroidsMap[code] = centroid;
}

const geoDir = path.join(__dirname, '../../server/src/geo');
fs.mkdirSync(geoDir, { recursive: true });

const serverFile = `'use strict';

/**
 * worldCountries.js — authoritative 195+ ISO 3166-1 country registry.
 */

const WORLD_COUNTRIES = ${JSON.stringify(countriesMap, null, 2)};

const ALL_COUNTRY_CODES = Object.keys(WORLD_COUNTRIES);
const COUNTRY_CENTROIDS = ${JSON.stringify(centroidsMap, null, 2)};

function getCountry(code) {
  return WORLD_COUNTRIES[String(code || '').toUpperCase()] || null;
}

module.exports = {
  WORLD_COUNTRIES,
  ALL_COUNTRY_CODES,
  COUNTRY_CENTROIDS,
  getCountry
};
`;

fs.writeFileSync(path.join(geoDir, 'worldCountries.js'), serverFile, 'utf8');
console.log(`Generated server/src/geo/worldCountries.js with ${rows.length} countries.`);

