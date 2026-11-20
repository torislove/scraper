/**
 * Real-world search examples and City / Mandal / County showcase metadata for
 * all 11 supported countries. Every example uses everyday business wording:
 * "<service> in <city / mandal / county>".
 */

export const SEARCH_EXAMPLES = {
  IN: {
    label: 'India',
    adminPath: 'States → Districts → Mandals & Cities',
    units: ['city', 'mandal', 'district', 'neighborhood'],
    cities: [
      'Hyderabad', 'HITEC City Hyderabad', 'Guntur', 'Tenali Mandal',
      'Vijayawada', 'Mumbai', 'Bengaluru', 'Chennai', 'Pune'
    ],
    services: [
      'software companies', 'computer shops', 'dental clinics', 'interior designers',
      'wedding photographers', 'solar dealers', 'caterers', 'pharmacies'
    ],
    prompts: [
      'Software companies in HITEC City Hyderabad',
      'Computer shops in Guntur',
      'Photo studios in Tenali Mandal',
      'Dental clinics in Banjara Hills Hyderabad',
      'Interior designers in Bengaluru',
      'Mobile repair in Vijayawada'
    ]
  },

  US: {
    label: 'United States',
    adminPath: 'States → Counties → Cities & Suburbs',
    units: ['county', 'city', 'state', 'zip code'],
    cities: [
      'Orange County CA', 'Harris County TX', 'Cook County IL', 'Miami-Dade County FL',
      'King County WA', 'Dallas TX', 'Austin TX', 'Los Angeles CA'
    ],
    services: [
      'HVAC contractors', 'dental clinics', 'med spas', 'plumbers',
      'roofing companies', 'wedding venues', 'auto repair shops', 'accountants'
    ],
    prompts: [
      'HVAC contractors in Harris County TX',
      'Dental clinics in Orange County CA',
      'Plumbers in Cook County IL',
      'Med spas in Miami-Dade County FL',
      'Roofing companies in King County WA',
      'Auto repair shops in Dallas TX'
    ]
  },

  GB: {
    label: 'United Kingdom',
    adminPath: 'Nations → Counties & Boroughs → Towns',
    units: ['county', 'borough', 'town', 'postcode'],
    cities: [
      'Westminster London', 'Greater Manchester', 'Surrey County', 'West Yorkshire',
      'Camden London', 'Birmingham', 'Leeds', 'Kent County'
    ],
    services: [
      'luxury caterers', 'photographers', 'electricians', 'plumbers',
      'dental practices', 'accountants', 'wedding venues', 'estate agents'
    ],
    prompts: [
      'Luxury caterers in Westminster London',
      'Photographers in Greater Manchester',
      'Electricians in Surrey County',
      'Wedding venues in West Yorkshire',
      'Dental practices in Camden London',
      'Accountants in Kent County'
    ]
  },

  CA: {
    label: 'Canada',
    adminPath: 'Provinces → Regional Counties / Census Divisions → Cities',
    units: ['city', 'county', 'province', 'postal code'],
    cities: [
      'Peel Region ON', 'York Region ON', 'Toronto ON', 'Mississauga ON',
      'Metro Vancouver BC', 'Calgary AB', 'Montreal QC', 'Ottawa ON'
    ],
    services: [
      'corporate caterers', 'wedding planners', 'electricians', 'dental offices',
      'auto detailing', 'renovation contractors', 'accountants', 'florists'
    ],
    prompts: [
      'Corporate caterers in Peel Region ON',
      'Dental offices in York Region ON',
      'Wedding planners in Toronto ON',
      'Electricians in Metro Vancouver BC',
      'Renovation contractors in Calgary AB',
      'Accountants in Ottawa ON'
    ]
  },

  AU: {
    label: 'Australia',
    adminPath: 'States → Shires / Councils → Suburbs',
    units: ['suburb', 'council', 'city', 'state'],
    cities: [
      'Parramatta NSW', 'Sydney CBD NSW', 'Melbourne CBD VIC', 'Gold Coast QLD',
      'Brisbane QLD', 'Perth WA', 'Adelaide SA', 'Byron Shire NSW'
    ],
    services: [
      'function centres', 'caterers', 'plumbers', 'solar installers',
      'dental clinics', 'mechanics', 'landscapers', 'wedding hire'
    ],
    prompts: [
      'Function centres in Parramatta NSW',
      'Solar installers in Gold Coast QLD',
      'Dental clinics in Melbourne CBD VIC',
      'Plumbers in Sydney CBD NSW',
      'Landscapers in Byron Shire NSW',
      'Caterers in Brisbane QLD'
    ]
  },

  AE: {
    label: 'United Arab Emirates',
    adminPath: 'Emirates → Municipalities → Business Districts',
    units: ['district', 'municipality', 'emirate'],
    cities: [
      'Business Bay Dubai', 'Deira Dubai', 'Al Quoz Dubai', 'Abu Dhabi City',
      'Al Ain Abu Dhabi', 'Sharjah Industrial', 'Ajman', 'Ras Al Khaimah'
    ],
    services: [
      'event organizers', 'luxury caterers', 'interior fit-out companies', 'corporate gifting',
      'dental clinics', 'real estate brokerages', 'car rental', 'sound hire'
    ],
    prompts: [
      'Event organizers in Business Bay Dubai',
      'Interior fit-out companies in Al Quoz Dubai',
      'Caterers in Abu Dhabi City',
      'Sound hire in Deira Dubai',
      'Real estate brokerages in Sharjah Industrial',
      'Car rental in Al Ain Abu Dhabi'
    ]
  },

  SG: {
    label: 'Singapore',
    adminPath: 'Regions → Planning Areas → Neighbourhoods',
    units: ['planning area', 'district', 'estate'],
    cities: [
      'Downtown Core Singapore', 'Orchard Singapore', 'Tampines', 'Jurong East',
      'Woodlands', 'Bedok', 'Novena', 'Paya Lebar'
    ],
    services: [
      'corporate caterers', 'event venues', 'interior designers', 'tuition centres',
      'photographers', 'gyms', 'renovation contractors', 'florists'
    ],
    prompts: [
      'Corporate caterers in Downtown Core Singapore',
      'Event venues in Orchard Singapore',
      'Photographers in Tampines',
      'Tuition centres in Jurong East',
      'Renovation contractors in Woodlands',
      'Interior designers in Paya Lebar'
    ]
  },

  NZ: {
    label: 'New Zealand',
    adminPath: 'Regions → District Councils → Towns & Suburbs',
    units: ['region', 'district', 'suburb', 'town'],
    cities: [
      'Auckland Region', 'Wellington', 'Christchurch', 'Waikato District',
      'Tauranga', 'Queenstown', 'Dunedin', 'Hamilton'
    ],
    services: [
      'wedding venues', 'event planners', 'caterers', 'electricians',
      'plumbers', 'builders', 'photographers', 'landscapers'
    ],
    prompts: [
      'Wedding venues in Auckland Region',
      'Event planners in Wellington',
      'Caterers in Christchurch',
      'Electricians in Waikato District',
      'Builders in Tauranga',
      'Photographers in Queenstown'
    ]
  },

  IE: {
    label: 'Ireland',
    adminPath: 'Provinces → Counties → Towns & Villages',
    units: ['county', 'town', 'city', 'eircode'],
    cities: [
      'County Cork', 'Dublin City Centre', 'County Galway', 'County Limerick',
      'County Kildare', 'County Meath', 'Waterford', 'Kilkenny'
    ],
    services: [
      'wedding venues', 'corporate caterers', 'photographers', 'electricians',
      'plumbers', 'accountants', 'florists', 'builders'
    ],
    prompts: [
      'Wedding venues in County Cork',
      'Corporate caterers in Dublin City Centre',
      'Photographers in County Galway',
      'Electricians in County Limerick',
      'Accountants in County Kildare',
      'Builders in County Meath'
    ]
  },

  ZA: {
    label: 'South Africa',
    adminPath: 'Provinces → District Municipalities → Suburbs',
    units: ['municipality', 'suburb', 'city', 'province'],
    cities: [
      'Sandton Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
      'Stellenbosch Municipality', 'Port Elizabeth', 'Bloemfontein', 'Midrand'
    ],
    services: [
      'conference venues', 'caterers', 'sound hire', 'photographers',
      'security companies', 'solar installers', 'electricians', 'event planners'
    ],
    prompts: [
      'Conference venues in Sandton Johannesburg',
      'Caterers in Cape Town',
      'Solar installers in Stellenbosch Municipality',
      'Sound hire in Durban',
      'Photographers in Pretoria',
      'Security companies in Midrand'
    ]
  },

  DE: {
    label: 'Germany',
    adminPath: 'States (Bundesländer) → Landkreise (Counties) → Cities',
    units: ['city', 'landkreis', 'bezirk', 'postcode'],
    cities: [
      'Berlin Mitte', 'Munich', 'Frankfurt', 'Hamburg',
      'Landkreis München', 'Cologne', 'Stuttgart', 'Düsseldorf'
    ],
    services: [
      'catering', 'event agents', 'corporate caterers', 'dental practices',
      'electricians', 'cleaning companies', 'photographers', 'solar installers'
    ],
    prompts: [
      'Catering in Berlin Mitte',
      'Event agents in Munich',
      'Solar installers in Landkreis München',
      'Corporate caterers in Frankfurt',
      'Photographers in Hamburg',
      'Cleaning companies in Stuttgart'
    ]
  }
};

export const COUNTRY_COUNTY_SHOWCASE = Object.entries(SEARCH_EXAMPLES).map(([code, data]) => ({
  code,
  name: data.label,
  adminPath: data.adminPath,
  units: data.units,
  examples: data.prompts.slice(0, 4),
  areas: data.cities.slice(0, 5)
}));

export const GLOBAL_11_COUNTRY_TICKER = [
  { code: 'IN', country: 'India', query: 'Software companies in HITEC City Hyderabad' },
  { code: 'US', country: 'USA', query: 'HVAC contractors in Harris County TX' },
  { code: 'GB', country: 'UK', query: 'Luxury caterers in Westminster London' },
  { code: 'CA', country: 'Canada', query: 'Corporate caterers in Peel Region ON' },
  { code: 'AU', country: 'Australia', query: 'Solar installers in Gold Coast QLD' },
  { code: 'AE', country: 'UAE', query: 'Event organizers in Business Bay Dubai' },
  { code: 'SG', country: 'Singapore', query: 'Corporate caterers in Downtown Core Singapore' },
  { code: 'NZ', country: 'New Zealand', query: 'Wedding venues in Auckland Region' },
  { code: 'IE', country: 'Ireland', query: 'Wedding venues in County Cork' },
  { code: 'ZA', country: 'South Africa', query: 'Conference venues in Sandton Johannesburg' },
  { code: 'DE', country: 'Germany', query: 'Catering in Berlin Mitte' },
  { code: 'IN', country: 'India', query: 'Photo studios in Tenali Mandal' }
];

/**
 * Interleaved "Search Anywhere" examples starting with the active country's top
 * examples and rotating across all 11 supported countries' cities, mandals & counties.
 */
export function omniExamplesFor(countryCode) {
  const code = String(countryCode || 'IN').toUpperCase();
  const active = examplesFor(code).prompts || [];
  const rotatedGlobal = GLOBAL_11_COUNTRY_TICKER
    .filter(item => item.code !== code || !active.includes(item.query))
    .map(item => `${item.query} (${item.country})`);
  const out = [];
  const maxLen = Math.max(active.length, rotatedGlobal.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (active[i]) out.push(active[i]);
    if (rotatedGlobal[i]) out.push(rotatedGlobal[i]);
  }
  return out;
}

/** The examples for a market, falling back to India. */
export function examplesFor(countryCode) {
  const code = String(countryCode || 'IN').toUpperCase();
  return SEARCH_EXAMPLES[code] || SEARCH_EXAMPLES.IN;
}

/**
 * The placeholder. It names the market's own place vocabulary so a user in
 * Texas is told they can type a county, and a user in Andhra/Telangana is told
 * they can type a mandal.
 */
export function placeholderFor(countryCode) {
  const market = examplesFor(countryCode);
  return `Type service in place — e.g. ${market.prompts[0]}`;
}

/** Short vocabulary line for the examples strip. */
export function scopeHintFor(countryCode) {
  return examplesFor(countryCode).units.join(' · ');
}
