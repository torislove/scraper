/**
 * Country and first-level region data used by the offline brain.
 *
 * This is deliberately a curated, human-maintained list, not a download. It is
 * enough to answer two questions without a network call:
 *
 *   1. "Is this place a broad region or a single town?" (scope options)
 *   2. "Which country is this search in?" (phone parsing, currency, terminology)
 *
 * The sixteen hand-written profiles below carry real region names. Every other
 * ISO country is appended from worldCountries.js with neutral admin terms, so a
 * search in Germany, Brazil, Japan or anywhere else still resolves correctly.
 */

const { WORLD_COUNTRIES } = require('./worldCountries');
const { adminForCountry, adminPath, indiaSubdivisionTerm } = require('./adminDivisions');

const COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    aliases: ['india', 'bharat', 'hindustan'],
    currency: 'INR',
    phone: '+91',
    topTerm: 'State',
    secondTerm: 'District',
    localTerm: 'Mandal',
    subdivisionTerm: 'Mandals',
    regions: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
      'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
      'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
      'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
      'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
      'Ladakh', 'Lakshadweep', 'Puducherry'
    ]
  },
  {
    code: 'US',
    name: 'United States',
    aliases: ['us', 'usa', 'u.s.', 'u.s.a', 'united states', 'united states of america', 'america'],
    currency: 'USD',
    phone: '+1',
    topTerm: 'State',
    secondTerm: 'County',
    localTerm: 'City',
    subdivisionTerm: 'Counties',
    regions: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
      'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
      'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
      'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
      'District of Columbia'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    aliases: ['uk', 'u.k.', 'united kingdom', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland'],
    currency: 'GBP',
    phone: '+44',
    topTerm: 'Nation',
    secondTerm: 'County',
    localTerm: 'Town',
    subdivisionTerm: 'Boroughs',
    regions: [
      'England', 'Scotland', 'Wales', 'Northern Ireland', 'Greater London',
      'Greater Manchester', 'West Midlands', 'West Yorkshire', 'Merseyside', 'South Yorkshire',
      'Tyne and Wear', 'Kent', 'Essex', 'Hampshire', 'Surrey', 'Lancashire', 'Hertfordshire',
      'Cambridgeshire', 'Oxfordshire', 'Berkshire', 'Buckinghamshire', 'Devon', 'Cornwall',
      'Somerset', 'Dorset', 'Norfolk', 'Suffolk', 'Lincolnshire', 'Nottinghamshire',
      'Derbyshire', 'Staffordshire', 'Warwickshire', 'Worcestershire', 'Shropshire',
      'Cheshire', 'Cumbria', 'County Durham', 'Northumberland', 'East Sussex', 'West Sussex',
      'Gloucestershire', 'Wiltshire', 'Northamptonshire', 'Leicestershire', 'Bedfordshire'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    aliases: ['canada'],
    currency: 'CAD',
    phone: '+1',
    topTerm: 'Province',
    secondTerm: 'Census division',
    localTerm: 'City',
    subdivisionTerm: 'Census divisions',
    regions: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon']
  },
  {
    code: 'AU',
    name: 'Australia',
    aliases: ['australia', 'aus'],
    currency: 'AUD',
    phone: '+61',
    topTerm: 'State',
    secondTerm: 'Local government area',
    localTerm: 'Suburb',
    subdivisionTerm: 'LGAs',
    regions: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
      'Tasmania', 'Australian Capital Territory', 'Northern Territory']
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    aliases: ['uae', 'u.a.e.', 'united arab emirates', 'emirates', 'dubai', 'abu dhabi'],
    currency: 'AED',
    phone: '+971',
    topTerm: 'Emirate',
    secondTerm: 'Municipality',
    localTerm: 'Area',
    subdivisionTerm: 'Municipalities',
    regions: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']
  },
  {
    code: 'SG',
    name: 'Singapore',
    aliases: ['singapore'],
    currency: 'SGD',
    phone: '+65',
    topTerm: 'Region',
    secondTerm: 'Planning area',
    localTerm: 'Area',
    subdivisionTerm: 'Planning areas',
    regions: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region']
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    aliases: ['new zealand', 'nz', 'aotearoa'],
    currency: 'NZD',
    phone: '+64',
    topTerm: 'Region',
    secondTerm: 'District',
    localTerm: 'Town',
    subdivisionTerm: 'Districts',
    regions: ['Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 'Hawke\'s Bay', 'Taranaki',
      'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast',
      'Canterbury', 'Otago', 'Southland', 'Chatham Islands']
  },
  {
    code: 'ZA',
    name: 'South Africa',
    aliases: ['south africa', 'rsa'],
    currency: 'ZAR',
    phone: '+27',
    topTerm: 'Province',
    secondTerm: 'District municipality',
    localTerm: 'Town',
    subdivisionTerm: 'District municipalities',
    regions: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga',
      'Northern Cape', 'North West', 'Western Cape']
  },
  {
    code: 'IE',
    name: 'Ireland',
    aliases: ['ireland', 'eire'],
    currency: 'EUR',
    phone: '+353',
    topTerm: 'Province',
    secondTerm: 'County',
    localTerm: 'Town',
    subdivisionTerm: 'Counties',
    regions: ['Leinster', 'Munster', 'Connacht', 'Ulster', 'Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford']
  },
  {
    code: 'MY',
    name: 'Malaysia',
    aliases: ['malaysia'],
    currency: 'MYR',
    phone: '+60',
    topTerm: 'State',
    secondTerm: 'District',
    localTerm: 'Town',
    subdivisionTerm: 'Districts',
    regions: ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak',
      'Perlis', 'Penang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
      'Kuala Lumpur', 'Labuan', 'Putrajaya']
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    aliases: ['saudi arabia', 'ksa', 'saudi'],
    currency: 'SAR',
    phone: '+966',
    topTerm: 'Region',
    secondTerm: 'Governorate',
    localTerm: 'City',
    subdivisionTerm: 'Governorates',
    regions: ['Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Qassim',
      'Hail', 'Jazan', 'Najran', 'Al Bahah', 'Al Jawf', 'Northern Borders']
  },
  {
    code: 'QA',
    name: 'Qatar',
    aliases: ['qatar'],
    currency: 'QAR',
    phone: '+974',
    topTerm: 'Municipality',
    secondTerm: 'Zone',
    localTerm: 'Area',
    subdivisionTerm: 'Zones',
    regions: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Al Shamal', 'Al Daayen', 'Umm Salal', 'Al Shahaniya']
  },
  {
    code: 'KW',
    name: 'Kuwait',
    aliases: ['kuwait'],
    currency: 'KWD',
    phone: '+965',
    topTerm: 'Governorate',
    secondTerm: 'Area',
    localTerm: 'Area',
    subdivisionTerm: 'Areas',
    regions: ['Al Asimah', 'Hawalli', 'Farwaniya', 'Mubarak Al-Kabeer', 'Ahmadi', 'Jahra']
  },
  {
    code: 'BH',
    name: 'Bahrain',
    aliases: ['bahrain'],
    currency: 'BHD',
    phone: '+973',
    topTerm: 'Governorate',
    secondTerm: 'Municipality',
    localTerm: 'Area',
    subdivisionTerm: 'Municipalities',
    regions: ['Capital', 'Muharraq', 'Northern', 'Southern']
  },
  {
    code: 'OM',
    name: 'Oman',
    aliases: ['oman'],
    currency: 'OMR',
    phone: '+968',
    topTerm: 'Governorate',
    secondTerm: 'Wilayat',
    localTerm: 'Town',
    subdivisionTerm: 'Wilayats',
    regions: ['Muscat', 'Dhofar', 'Musandam', 'Al Buraymi', 'Ad Dakhiliyah', 'Al Batinah North',
      'Al Batinah South', 'Ash Sharqiyah North', 'Ash Sharqiyah South', 'Ad Dhahirah', 'Al Wusta']
  }
];

// Every other ISO country is appended once, after the curated profiles, so
// India stays first and the hand-written markets keep their real regions.
const curatedCodes = new Set(COUNTRIES.map(country => country.code));
for (const country of WORLD_COUNTRIES) {
  if (curatedCodes.has(country.code)) continue;
  COUNTRIES.push({
    ...country,
    aliases: [country.name.toLowerCase()],
    regions: []
  });
}

// The administrative vocabulary is owned by adminDivisions.js. Curated terms in
// this file are only the seed; this loop makes every country agree with the
// single table and attaches the full `admin` block the API returns.
for (const country of COUNTRIES) {
  const admin = adminForCountry(country.code);
  country.topTerm = admin.top;
  country.secondTerm = admin.second;
  country.localTerm = admin.local;
  country.subdivisionTerm = admin.subdivision;
  country.admin = admin;
  country.adminPath = admin.levels.join(' → ');
}

// Major cities that users type instead of their parent region. Without this,
// "London" would look like an unknown small town and lose the broad-scope menu.
const CITY_ALIASES = {
  london: { country: 'GB', region: 'Greater London' },
  manchester: { country: 'GB', region: 'Greater Manchester' },
  birmingham: { country: 'GB', region: 'West Midlands' },
  leeds: { country: 'GB', region: 'West Yorkshire' },
  liverpool: { country: 'GB', region: 'Merseyside' },
  'new york': { country: 'US', region: 'New York' },
  nyc: { country: 'US', region: 'New York' },
  'new york city': { country: 'US', region: 'New York' },
  'los angeles': { country: 'US', region: 'California' },
  la: { country: 'US', region: 'California' },
  'san francisco': { country: 'US', region: 'California' },
  'san diego': { country: 'US', region: 'California' },
  chicago: { country: 'US', region: 'Illinois' },
  houston: { country: 'US', region: 'Texas' },
  dallas: { country: 'US', region: 'Texas' },
  austin: { country: 'US', region: 'Texas' },
  miami: { country: 'US', region: 'Florida' },
  orlando: { country: 'US', region: 'Florida' },
  seattle: { country: 'US', region: 'Washington' },
  boston: { country: 'US', region: 'Massachusetts' },
  atlanta: { country: 'US', region: 'Georgia' },
  denver: { country: 'US', region: 'Colorado' },
  phoenix: { country: 'US', region: 'Arizona' },
  philadelphia: { country: 'US', region: 'Pennsylvania' },
  toronto: { country: 'CA', region: 'Ontario' },
  vancouver: { country: 'CA', region: 'British Columbia' },
  montreal: { country: 'CA', region: 'Quebec' },
  calgary: { country: 'CA', region: 'Alberta' },
  sydney: { country: 'AU', region: 'New South Wales' },
  melbourne: { country: 'AU', region: 'Victoria' },
  brisbane: { country: 'AU', region: 'Queensland' },
  perth: { country: 'AU', region: 'Western Australia' },
  adelaide: { country: 'AU', region: 'South Australia' },
  auckland: { country: 'NZ', region: 'Auckland' },
  wellington: { country: 'NZ', region: 'Wellington' },
  dubai: { country: 'AE', region: 'Dubai' },
  'abu dhabi': { country: 'AE', region: 'Abu Dhabi' },
  sharjah: { country: 'AE', region: 'Sharjah' },
  riyadh: { country: 'SA', region: 'Riyadh' },
  jeddah: { country: 'SA', region: 'Makkah' },
  doha: { country: 'QA', region: 'Doha' },
  'kuwait city': { country: 'KW', region: 'Al Asimah' },
  manama: { country: 'BH', region: 'Capital' },
  muscat: { country: 'OM', region: 'Muscat' },
  'kuala lumpur': { country: 'MY', region: 'Kuala Lumpur' },
  johannesburg: { country: 'ZA', region: 'Gauteng' },
  'cape town': { country: 'ZA', region: 'Western Cape' },
  durban: { country: 'ZA', region: 'KwaZulu-Natal' },
  dublin: { country: 'IE', region: 'Dublin' },
  cork: { country: 'IE', region: 'Cork' },
  // Other major world cities. Without these, a search in Berlin or São Paulo
  // would fall back to India and wrongly enable India-only directories.
  berlin: { country: 'DE', region: 'Berlin' },
  munich: { country: 'DE', region: 'Bavaria' },
  hamburg: { country: 'DE', region: 'Hamburg' },
  frankfurt: { country: 'DE', region: 'Hesse' },
  cologne: { country: 'DE', region: 'North Rhine-Westphalia' },
  paris: { country: 'FR', region: 'Île-de-France' },
  marseille: { country: 'FR', region: 'Provence-Alpes-Côte d’Azur' },
  lyon: { country: 'FR', region: 'Auvergne-Rhône-Alpes' },
  toulouse: { country: 'FR', region: 'Occitanie' },
  madrid: { country: 'ES', region: 'Madrid' },
  barcelona: { country: 'ES', region: 'Catalonia' },
  valencia: { country: 'ES', region: 'Valencia' },
  seville: { country: 'ES', region: 'Andalusia' },
  rome: { country: 'IT', region: 'Lazio' },
  milan: { country: 'IT', region: 'Lombardy' },
  naples: { country: 'IT', region: 'Campania' },
  turin: { country: 'IT', region: 'Piedmont' },
  amsterdam: { country: 'NL', region: 'North Holland' },
  rotterdam: { country: 'NL', region: 'South Holland' },
  brussels: { country: 'BE', region: 'Brussels' },
  antwerp: { country: 'BE', region: 'Flanders' },
  zurich: { country: 'CH', region: 'Zurich' },
  geneva: { country: 'CH', region: 'Geneva' },
  vienna: { country: 'AT', region: 'Vienna' },
  stockholm: { country: 'SE', region: 'Stockholm' },
  gothenburg: { country: 'SE', region: 'Västra Götaland' },
  oslo: { country: 'NO', region: 'Oslo' },
  copenhagen: { country: 'DK', region: 'Capital Region' },
  helsinki: { country: 'FI', region: 'Uusimaa' },
  warsaw: { country: 'PL', region: 'Masovia' },
  krakow: { country: 'PL', region: 'Lesser Poland' },
  prague: { country: 'CZ', region: 'Prague' },
  athens: { country: 'GR', region: 'Attica' },
  istanbul: { country: 'TR', region: 'Istanbul' },
  ankara: { country: 'TR', region: 'Ankara' },
  moscow: { country: 'RU', region: 'Moscow' },
  'saint petersburg': { country: 'RU', region: 'Saint Petersburg' },
  kyiv: { country: 'UA', region: 'Kyiv' },
  tokyo: { country: 'JP', region: 'Tokyo' },
  osaka: { country: 'JP', region: 'Osaka' },
  kyoto: { country: 'JP', region: 'Kyoto' },
  nagoya: { country: 'JP', region: 'Aichi' },
  yokohama: { country: 'JP', region: 'Kanagawa' },
  beijing: { country: 'CN', region: 'Beijing' },
  shanghai: { country: 'CN', region: 'Shanghai' },
  guangzhou: { country: 'CN', region: 'Guangdong' },
  shenzhen: { country: 'CN', region: 'Guangdong' },
  seoul: { country: 'KR', region: 'Seoul' },
  busan: { country: 'KR', region: 'Busan' },
  'hong kong': { country: 'HK', region: 'Hong Kong' },
  taipei: { country: 'TW', region: 'Taipei' },
  bangkok: { country: 'TH', region: 'Bangkok' },
  phuket: { country: 'TH', region: 'Phuket' },
  hanoi: { country: 'VN', region: 'Hanoi' },
  'ho chi minh city': { country: 'VN', region: 'Ho Chi Minh City' },
  jakarta: { country: 'ID', region: 'Jakarta' },
  bali: { country: 'ID', region: 'Bali' },
  surabaya: { country: 'ID', region: 'East Java' },
  manila: { country: 'PH', region: 'Metro Manila' },
  cebu: { country: 'PH', region: 'Cebu' },
  dhaka: { country: 'BD', region: 'Dhaka' },
  chittagong: { country: 'BD', region: 'Chittagong' },
  karachi: { country: 'PK', region: 'Sindh' },
  lahore: { country: 'PK', region: 'Punjab' },
  islamabad: { country: 'PK', region: 'Islamabad' },
  colombo: { country: 'LK', region: 'Western Province' },
  kathmandu: { country: 'NP', region: 'Bagmati' },
  'sao paulo': { country: 'BR', region: 'São Paulo' },
  'rio de janeiro': { country: 'BR', region: 'Rio de Janeiro' },
  brasilia: { country: 'BR', region: 'Distrito Federal' },
  salvador: { country: 'BR', region: 'Bahia' },
  'mexico city': { country: 'MX', region: 'Mexico City' },
  guadalajara: { country: 'MX', region: 'Jalisco' },
  monterrey: { country: 'MX', region: 'Nuevo León' },
  'buenos aires': { country: 'AR', region: 'Buenos Aires' },
  cordoba: { country: 'AR', region: 'Córdoba' },
  santiago: { country: 'CL', region: 'Santiago Metropolitan' },
  bogota: { country: 'CO', region: 'Bogotá' },
  medellin: { country: 'CO', region: 'Antioquia' },
  lima: { country: 'PE', region: 'Lima' },
  lagos: { country: 'NG', region: 'Lagos' },
  abuja: { country: 'NG', region: 'Federal Capital Territory' },
  nairobi: { country: 'KE', region: 'Nairobi' },
  accra: { country: 'GH', region: 'Greater Accra' },
  cairo: { country: 'EG', region: 'Cairo' },
  alexandria: { country: 'EG', region: 'Alexandria' },
  casablanca: { country: 'MA', region: 'Casablanca-Settat' },
  marrakech: { country: 'MA', region: 'Marrakesh-Safi' },
  rabat: { country: 'MA', region: 'Rabat-Salé-Kénitra' },
  'tel aviv': { country: 'IL', region: 'Tel Aviv' },
  jerusalem: { country: 'IL', region: 'Jerusalem' },
  amman: { country: 'JO', region: 'Amman' },
  beirut: { country: 'LB', region: 'Beirut' },
  nicosia: { country: 'CY', region: 'Nicosia' },
  valletta: { country: 'MT', region: 'Valletta' },
  reykjavik: { country: 'IS', region: 'Reykjavík' },
  budapest: { country: 'HU', region: 'Budapest' },
  bucharest: { country: 'RO', region: 'Bucharest' },
  sofia: { country: 'BG', region: 'Sofia' },
  zagreb: { country: 'HR', region: 'Zagreb' },
  belgrade: { country: 'RS', region: 'Belgrade' },
  // India: the home market. These keep detection explicit instead of relying
  // on the IN fallback, so scope, phone rules and the dashboard agree even when
  // the user types only a city name.
  mumbai: { country: 'IN', region: 'Maharashtra' },
  bombay: { country: 'IN', region: 'Maharashtra' },
  pune: { country: 'IN', region: 'Maharashtra' },
  nagpur: { country: 'IN', region: 'Maharashtra' },
  delhi: { country: 'IN', region: 'Delhi' },
  'new delhi': { country: 'IN', region: 'Delhi' },
  noida: { country: 'IN', region: 'Uttar Pradesh' },
  gurugram: { country: 'IN', region: 'Haryana' },
  gurgaon: { country: 'IN', region: 'Haryana' },
  bengaluru: { country: 'IN', region: 'Karnataka' },
  bangalore: { country: 'IN', region: 'Karnataka' },
  mysuru: { country: 'IN', region: 'Karnataka' },
  mysore: { country: 'IN', region: 'Karnataka' },
  hyderabad: { country: 'IN', region: 'Telangana' },
  warangal: { country: 'IN', region: 'Telangana' },
  vijayawada: { country: 'IN', region: 'Andhra Pradesh' },
  visakhapatnam: { country: 'IN', region: 'Andhra Pradesh' },
  vizag: { country: 'IN', region: 'Andhra Pradesh' },
  guntur: { country: 'IN', region: 'Andhra Pradesh' },
  tenali: { country: 'IN', region: 'Andhra Pradesh' },
  tirupati: { country: 'IN', region: 'Andhra Pradesh' },
  chennai: { country: 'IN', region: 'Tamil Nadu' },
  madras: { country: 'IN', region: 'Tamil Nadu' },
  coimbatore: { country: 'IN', region: 'Tamil Nadu' },
  madurai: { country: 'IN', region: 'Tamil Nadu' },
  kolkata: { country: 'IN', region: 'West Bengal' },
  calcutta: { country: 'IN', region: 'West Bengal' },
  ahmedabad: { country: 'IN', region: 'Gujarat' },
  surat: { country: 'IN', region: 'Gujarat' },
  jaipur: { country: 'IN', region: 'Rajasthan' },
  lucknow: { country: 'IN', region: 'Uttar Pradesh' },
  kanpur: { country: 'IN', region: 'Uttar Pradesh' },
  indore: { country: 'IN', region: 'Madhya Pradesh' },
  bhopal: { country: 'IN', region: 'Madhya Pradesh' },
  patna: { country: 'IN', region: 'Bihar' },
  kochi: { country: 'IN', region: 'Kerala' },
  cochin: { country: 'IN', region: 'Kerala' },
  thiruvananthapuram: { country: 'IN', region: 'Kerala' },
  chandigarh: { country: 'IN', region: 'Chandigarh' },
  guwahati: { country: 'IN', region: 'Assam' },
  bhubaneswar: { country: 'IN', region: 'Odisha' },
  raipur: { country: 'IN', region: 'Chhattisgarh' },
  ranchi: { country: 'IN', region: 'Jharkhand' },
  goa: { country: 'IN', region: 'Goa' },
  panaji: { country: 'IN', region: 'Goa' }
};

function normalise(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\u0C00-\u0C7F\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasMatches(value, alias) {
  const key = normalise(alias);
  if (!key) return false;
  if (value === key) return true;
  // Whole-word / whole-phrase match. This stops "Indiana" matching "India"
  // and "Niger" matching "Nigeria".
  return new RegExp(`(^|\\s)${escapeRegExp(key)}(\\s|$)`).test(value);
}

function detectCountry(text) {
  const value = normalise(text);
  if (!value) return null;
  const cityAlias = CITY_ALIASES[value];
  if (cityAlias) {
    const country = COUNTRIES.find(item => item.code === cityAlias.country);
    if (country) return country;
  }
  for (const country of COUNTRIES) {
    if (value === country.code.toLowerCase()) return country;
    if (country.aliases.some(alias => aliasMatches(value, alias))) return country;
  }
  return null;
}

/** Match a place against a country's first-level regions. */
function findRegion(text) {
  const value = normalise(text);
  if (!value) return null;
  for (const country of COUNTRIES) {
    for (const region of country.regions) {
      const key = normalise(region);
      if (value === key || value.startsWith(`${key} `) || value.endsWith(` ${key}`)) {
        return { country, region, level: 'region' };
      }
    }
  }
  return null;
}

/** India is resolved by the gazetteer, so this only covers other countries. */
function scopeOptions(place) {
  const alias = CITY_ALIASES[normalise(place)];
  if (alias) {
    const country = COUNTRIES.find(c => c.code === alias.country);
    if (country) {
      const admin = adminForCountry(country.code, { state: alias.region });
      return {
        type: 'broad',
        country: country.code,
        level: 'city',
        label: alias.region,
        city: place,
        admin,
        options: [
          `Search Entire ${admin.top} (${alias.region})`,
          `Search Only ${place}`,
          `Search All ${admin.subdivision}`
        ]
      };
    }
  }
  const match = findRegion(place) || (detectCountry(place) ? { country: detectCountry(place), region: null, level: 'country' } : null);
  if (!match) return null;
  const { country, region } = match;
  const admin = adminForCountry(country.code, { state: region });
  const label = region || country.name;
  const options = region
    ? [
        `Search Entire ${admin.top} (${label})`,
        `Search Only ${label}`,
        `Search All ${admin.subdivision}`
      ]
    : [
        `Search Entire Country (${country.name})`,
        `Search Only ${country.name}`,
        `Search All ${admin.top}s`
      ];
  return { type: 'broad', country: country.code, level: match.level, label, admin, options };
}

module.exports = {
  COUNTRIES,
  CITY_ALIASES,
  detectCountry,
  findRegion,
  scopeOptions,
  normalise,
  adminForCountry,
  adminPath,
  indiaSubdivisionTerm
};
