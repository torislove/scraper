const fs = require('fs');
const path = require('path');

const meta = require('../../server/node_modules/libphonenumber-js/metadata.max.json');
const display = new Intl.DisplayNames(['en'], { type: 'region' });

// A small currency map for the countries people search most. Everything else
// falls back to '' and the UI simply omits the currency chip.
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

const rows = [];
for (const code of Object.keys(meta.countries).sort()) {
  if (code === '001') continue;
  const entry = meta.countries[code];
  const calling = Array.isArray(entry) ? entry[0] : '';
  const name = display.of(code) || code;
  rows.push({
    code,
    name,
    currency: CURRENCY[code] || '',
    phone: calling ? `+${calling}` : '',
    topTerm: 'Region',
    secondTerm: 'District',
    localTerm: 'City',
    subdivisionTerm: 'Districts'
  });
}

const header = `/**
 * worldCountries.js — every ISO 3166-1 country, offline.
 *
 * The keyless engines (OpenStreetMap, public Maps results, web discovery) work
 * anywhere. This file makes the rest of the app agree: country detection, the
 * country picker and the coverage report all understand the full world, not
 * only the sixteen countries with hand-written profiles.
 *
 * Generated data; keep it in sync with libphonenumber's country list. The
 * curated profiles in countries.js still win for India and the other major
 * markets because they carry real region names.
 */

const WORLD_COUNTRIES = ${JSON.stringify(rows, null, 2)};

module.exports = { WORLD_COUNTRIES };
`;

fs.writeFileSync(path.join(__dirname, '../../server/src/services/localBrain/worldCountries.js'), header);

// The dashboards need the same list. Ship only code + name + flag so the
// bundle stays small; flags are derived from the ISO code (no image files).
const frontend = `/**
 * countries.js — flag buttons for the dashboard. Generated from the same ISO
 * list as the server, so every country the backend can search is selectable.
 */

export function flagOf(code) {
  const value = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return '🌍';
  return String.fromCodePoint(...[...value].map(char => 127397 + char.charCodeAt(0)));
}

export const COUNTRIES = ${JSON.stringify(rows.map(r => ({ code: r.code, name: r.name, phone: r.phone, currency: r.currency })), null, 2)};

export const POPULAR_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'ZA', 'IE', 'MY', 'SA'];

export const POPULAR_COUNTRIES = POPULAR_CODES
  .map(code => COUNTRIES.find(country => country.code === code))
  .filter(Boolean);

export function findCountry(code) {
  const value = String(code || '').toUpperCase();
  return COUNTRIES.find(country => country.code === value) || null;
}
`;

for (const app of ['client', 'master']) {
  const dir = path.join(__dirname, `../../${app}/src/v2/data`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'countries.js'), frontend);
}

console.log(`wrote ${rows.length} countries (server + client + master)`);

