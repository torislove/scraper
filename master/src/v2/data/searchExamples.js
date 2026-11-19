/**
 * Search examples for the command-center console.
 *
 * One entry per market we ship (11). Each entry carries:
 *   - label:    the market name shown in the strip heading
 *   - units:    what this country actually calls its places, biggest-last:
 *               India = city / mandal / district / state,
 *               US = city / county / state / ZIP.
 *               The console prints these so a user knows they can type any of
 *               them, not just a city.
 *   - cities:   real, recognisable cities a user would type
 *   - services: trades and business types that actually exist in that market
 *   - prompts:  six ready-to-run queries, mixing service + place + local unit
 *
 * The prompts are written the way a person speaks, not the way a database
 * stores things: "wedding photographers in Guntur", not
 * "category=photographers; location=Guntur". They are examples, not filters —
 * typing any of them must run exactly as shown.
 */

export const SEARCH_EXAMPLES = {
  IN: {
    label: 'India',
    units: ['city', 'mandal', 'district', 'state'],
    cities: [
      'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
      'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Vijayawada', 'Guntur',
      'Amaravati', 'Visakhapatnam', 'Kochi', 'Tenali'
    ],
    services: [
      'wedding photographers', 'interior designers', 'AC repair',
      'packers and movers', 'car detailing', 'caterers', 'dental clinics',
      'plumbers', 'steel fabrication', 'event planners'
    ],
    prompts: [
      'Wedding photographers in Guntur with phone',
      'Interior designers in Mumbai',
      'AC repair in Krishna district',
      'Caterers in Amaravati',
      'Dental clinics in Delhi',
      'Car detailing in Hyderabad',
      'Packers and movers in Vijayawada',
      'Plumbers in Tenali mandal'
    ]
  },

  US: {
    label: 'United States',
    units: ['city', 'county', 'state', 'ZIP'],
    cities: [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Dallas', 'Austin',
      'Miami', 'Seattle', 'Denver', 'Atlanta', 'Boston', 'Phoenix'
    ],
    counties: [
      'Orange County CA', 'Los Angeles County', 'Cook County IL',
      'Harris County TX', 'King County WA', 'Miami-Dade County'
    ],
    services: [
      'HVAC contractors', 'plumbers', 'roofers', 'wedding venues',
      'electricians', 'landscapers', 'dentists', 'auto repair'
    ],
    prompts: [
      'HVAC contractors in Dallas TX with phone',
      'Wedding venues in Orange County',
      'Plumbers in Harris County TX',
      'Roofers in Cook County IL',
      'Electricians in Seattle',
      'Dentists in Miami-Dade County',
      'Landscapers in Austin under 10 miles'
    ]
  },

  GB: {
    label: 'United Kingdom',
    units: ['town', 'county', 'region', 'postcode'],
    cities: [
      'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool',
      'Bristol', 'Edinburgh', 'Sheffield', 'Nottingham'
    ],
    services: [
      'caterers', 'wedding venues', 'photographers', 'plumbers',
      'electricians', 'accountants', 'florists', 'builders'
    ],
    prompts: [
      'Luxury caterers in Westminster London',
      'Wedding venues in Leeds with capacity for 200',
      'Photographers in Manchester',
      'Plumbers in Bristol with phone',
      'Electricians in Sheffield',
      'Accountants in Birmingham for small business'
    ]
  },

  CA: {
    label: 'Canada',
    units: ['city', 'region', 'province', 'postal code'],
    cities: [
      'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton',
      'Mississauga', 'Winnipeg', 'Halifax', 'Victoria'
    ],
    services: [
      'corporate caterers', 'wedding planners', 'electricians', 'HVAC',
      'plumbers', 'movers', 'photographers', 'dentists'
    ],
    prompts: [
      'Corporate caterers in Mississauga ON',
      'Wedding planners in Toronto',
      'Electricians in Vancouver with phone',
      'HVAC repair in Calgary',
      'Movers in Ottawa',
      'Dentists in Halifax accepting new patients'
    ]
  },

  AU: {
    label: 'Australia',
    units: ['suburb', 'city', 'state', 'postcode'],
    cities: [
      'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast',
      'Canberra', 'Newcastle', 'Parramatta', 'Hobart'
    ],
    services: [
      'function centres', 'wedding hire', 'caterers', 'electricians',
      'plumbers', 'landscapers', 'photographers', 'removalists'
    ],
    prompts: [
      'Function centres in Parramatta',
      'Wedding hire in Melbourne CBD',
      'Caterers in Sydney with phone',
      'Electricians in Brisbane',
      'Landscapers in Perth',
      'Removalists in Adelaide'
    ]
  },

  AE: {
    label: 'United Arab Emirates',
    units: ['area', 'city', 'emirate'],
    cities: [
      'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain', 'Ras Al Khaimah'
    ],
    services: [
      'event organizers', 'caterers', 'sound hire', 'photographers',
      'car detailing', 'AC repair', 'interior designers', 'cleaning services'
    ],
    prompts: [
      'Luxury event organizers in Business Bay Dubai',
      'Caterers in Abu Dhabi with phone',
      'Sound hire in Deira Dubai',
      'Photographers in Sharjah',
      'Car detailing in Al Quoz Dubai',
      'AC repair in Ajman'
    ]
  },

  SG: {
    label: 'Singapore',
    units: ['area', 'district', 'town'],
    cities: [
      'Downtown Core', 'Orchard', 'Tampines', 'Jurong', 'Woodlands',
      'Bedok', 'Novena', 'Changi'
    ],
    services: [
      'corporate caterers', 'event venues', 'photographers', 'tuition centres',
      'gyms', 'renovation contractors', 'florists', 'cleaning services'
    ],
    prompts: [
      'Corporate caterers in Downtown Core Singapore',
      'Event venues in Orchard',
      'Photographers in Tampines',
      'Tuition centres in Jurong East',
      'Renovation contractors in Woodlands',
      'Florists in Bedok'
    ]
  },

  NZ: {
    label: 'New Zealand',
    units: ['suburb', 'city', 'region'],
    cities: [
      'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
      'Dunedin', 'Napier', 'Queenstown'
    ],
    services: [
      'wedding venues', 'event planners', 'caterers', 'electricians',
      'plumbers', 'builders', 'photographers', 'landscapers'
    ],
    prompts: [
      'Wedding venues in Auckland',
      'Event planners in Wellington',
      'Caterers in Christchurch',
      'Electricians in Hamilton',
      'Builders in Tauranga',
      'Photographers in Queenstown'
    ]
  },

  ZA: {
    label: 'South Africa',
    units: ['suburb', 'city', 'province'],
    cities: [
      'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth',
      'Bloemfontein', 'Sandton', 'Stellenbosch'
    ],
    services: [
      'conference venues', 'caterers', 'sound hire', 'photographers',
      'security companies', 'plumbers', 'electricians', 'event planners'
    ],
    prompts: [
      'Conference venues in Sandton Johannesburg',
      'Caterers in Cape Town',
      'Sound hire in Durban',
      'Photographers in Pretoria',
      'Security companies in Port Elizabeth',
      'Plumbers in Bloemfontein'
    ]
  },

  IE: {
    label: 'Ireland',
    units: ['town', 'county', 'province'],
    cities: [
      'Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kilkenny',
      'Sligo', 'Drogheda'
    ],
    services: [
      'corporate caterers', 'wedding venues', 'photographers', 'electricians',
      'plumbers', 'accountants', 'florists', 'builders'
    ],
    prompts: [
      'Corporate caterers in Dublin City Centre',
      'Wedding venues in County Cork',
      'Photographers in Galway',
      'Electricians in Limerick',
      'Accountants in Waterford',
      'Florists in Kilkenny'
    ]
  },

  DE: {
    label: 'Germany',
    units: ['city', 'district', 'state', 'postcode'],
    cities: [
      'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart',
      'Düsseldorf', 'Leipzig', 'Dresden'
    ],
    services: [
      'catering', 'event agents', 'corporate caterers', 'photographers',
      'electricians', 'plumbers', 'cleaning companies', 'florists'
    ],
    prompts: [
      'Catering in Berlin Mitte',
      'Event agents in Munich',
      'Corporate caterers in Frankfurt',
      'Photographers in Hamburg',
      'Electricians in Cologne',
      'Cleaning companies in Stuttgart'
    ]
  }
};

/** The examples for a market, falling back to India. */
export function examplesFor(countryCode) {
  const code = String(countryCode || 'IN').toUpperCase();
  return SEARCH_EXAMPLES[code] || SEARCH_EXAMPLES.IN;
}

/**
 * The placeholder. It names the market's own place vocabulary so a user in
 * Texas is told they can type a county, and a user in Andhra is told they can
 * type a mandal.
 */
export function placeholderFor(countryCode) {
  const market = examplesFor(countryCode);
  const units = market.units.join(' · ');
  return `Search any service and place — ${units} — e.g. "${market.prompts[0]}"`;
}

/** Short vocabulary line for the examples strip. */
export function scopeHintFor(countryCode) {
  return examplesFor(countryCode).units.join(' · ');
}
