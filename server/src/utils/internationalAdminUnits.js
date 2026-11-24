'use strict';

/**
 * internationalAdminUnits.js
 *
 * Authoritative Geo-Administrative Taxonomies & Scope Boundaries for:
 *   - India (IN)
 *   - United States (US)
 *   - United Kingdom (GB)
 *   - Canada (CA)
 *   - Australia (AU)
 *   - United Arab Emirates (AE)
 *
 * Distinguishes Master territory sweeps (States, Provinces, Counties, Districts, Emirates)
 * from Client localized scrapes (Mandals, Towns, Cities, Suburbs, Postcodes, Communities).
 */

const COUNTRY_TAXONOMY = {
  IN: {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    currency: 'INR',
    phonePlaceholder: '+91 98765 43210',
    phoneRegex: /^(?:\+91|0)?[6-9]\d{9}$/,
    levels: {
      master: [
        { level: 1, name: 'State / Union Territory', key: 'state' },
        { level: 2, name: 'District', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Mandal / Tehsil / Taluk', key: 'mandal' },
        { level: 4, name: 'Town / Locality / Ward', key: 'locality' }
      ]
    },
    terms: {
      stateLabel: 'State / UT',
      districtLabel: 'District',
      subdistrictLabel: 'Mandal / Tehsil / Taluk',
      localityLabel: 'Town / Ward / Locality'
    },
    sampleMasterSweeps: [
      { state: 'Andhra Pradesh', district: 'NTR District / Krishna', sampleQuery: 'Banquet halls in NTR District' },
      { state: 'Maharashtra', district: 'Pune District', sampleQuery: 'Catering in Pune District' },
      { state: 'Karnataka', district: 'Bengaluru Urban', sampleQuery: 'Event planners in Bengaluru Urban' },
      { state: 'Tamil Nadu', district: 'Chennai', sampleQuery: 'Wedding decorators in Chennai' },
      { state: 'Telangana', district: 'Hyderabad', sampleQuery: 'Photographers in Hyderabad' }
    ],
    sampleClientScrapes: [
      { location: 'Benz Circle, Vijayawada', context: 'Town / Locality' },
      { location: 'Indiranagar, Bengaluru', context: 'Urban Ward' },
      { location: 'Andheri West, Mumbai', context: 'Suburb / Locality' },
      { location: 'Banjara Hills, Hyderabad', context: 'Commercial Locality' }
    ]
  },

  US: {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    currency: 'USD',
    phonePlaceholder: '+1 (555) 123-4567',
    phoneRegex: /^(?:\+1\s*\(?|1\s*\(?)?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}$/,
    levels: {
      master: [
        { level: 1, name: 'State', key: 'state' },
        { level: 2, name: 'County / Parish / Borough', key: 'county' }
      ],
      client: [
        { level: 3, name: 'City / Town / Township', key: 'city' },
        { level: 4, name: 'Neighborhood / ZIP Code', key: 'neighborhood' }
      ]
    },
    terms: {
      stateLabel: 'State',
      districtLabel: 'County',
      subdistrictLabel: 'City / Township',
      localityLabel: 'Neighborhood / ZIP Code'
    },
    sampleMasterSweeps: [
      { state: 'New York', county: 'Rensselaer County', sampleQuery: 'Event venues in Rensselaer County, NY' },
      { state: 'New York', county: 'Albany County', sampleQuery: 'Corporate caterers in Albany County, NY' },
      { state: 'California', county: 'Orange County', sampleQuery: 'Wedding planners in Orange County, CA' },
      { state: 'Texas', county: 'Travis County', sampleQuery: 'Party equipment rental in Travis County, TX' },
      { state: 'Florida', county: 'Miami-Dade County', sampleQuery: 'Lighting & sound in Miami-Dade, FL' }
    ],
    sampleClientScrapes: [
      { location: 'Troy, NY', context: 'City / Town (12180)' },
      { location: 'Albany, NY', context: 'State Capital' },
      { location: 'Irvine, CA', context: 'Commercial Hub' },
      { location: 'Downtown Austin, TX', context: 'Neighborhood (78701)' }
    ],
    subdivisions: {
      'Rensselaer County, NY': ['Troy', 'Rensselaer', 'East Greenbush', 'Castleton-on-Hudson', 'Hoosick Falls', 'Schodack'],
      'Albany County, NY': ['Albany', 'Colonie', 'Bethlehem', 'Guilderland', 'Cohoes', 'Watervliet'],
      'Orange County, CA': ['Irvine', 'Anaheim', 'Santa Ana', 'Huntington Beach', 'Newport Beach', 'Fullerton'],
      'Travis County, TX': ['Austin', 'Pflugerville', 'Lakeway', 'Bee Cave', 'Manor']
    }
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    currency: 'GBP',
    phonePlaceholder: '+44 7911 123456',
    phoneRegex: /^(?:\+44\s*|0)(?:[1-9]\d{8,9})$/,
    levels: {
      master: [
        { level: 1, name: 'Country / Region', key: 'region' },
        { level: 2, name: 'Ceremonial County / Metropolitan Borough', key: 'borough' }
      ],
      client: [
        { level: 3, name: 'Postal Town / London Borough', key: 'town' },
        { level: 4, name: 'District / Ward / Postcode Area', key: 'postcode' }
      ]
    },
    terms: {
      stateLabel: 'Country / Region',
      districtLabel: 'County / Metropolitan Borough',
      subdistrictLabel: 'Postal Town / Borough',
      localityLabel: 'Ward / Postcode Area'
    },
    sampleMasterSweeps: [
      { region: 'Greater London', borough: 'City of Westminster', sampleQuery: 'Luxury wedding venues in Westminster' },
      { region: 'Greater Manchester', borough: 'Manchester Metropolitan Borough', sampleQuery: 'Catering in Manchester' },
      { region: 'West Midlands', borough: 'City of Birmingham', sampleQuery: 'Event planners in Birmingham' },
      { region: 'West Yorkshire', borough: 'City of Leeds', sampleQuery: 'Photographers in Leeds' }
    ],
    sampleClientScrapes: [
      { location: 'Soho, London', context: 'Central Ward (W1)' },
      { location: 'Camden Town, London', context: 'Borough Locality (NW1)' },
      { location: 'Salford, Manchester', context: 'Urban District' },
      { location: 'Solihull, Birmingham', context: 'Postal Town (B91)' }
    ],
    subdivisions: {
      'Greater London': ['City of Westminster', 'Camden', 'Islington', 'Kensington and Chelsea', 'Croydon', 'Greenwich', 'Southwark', 'Tower Hamlets'],
      'Greater Manchester': ['Manchester City', 'Salford', 'Bolton', 'Bury', 'Oldham', 'Rochdale', 'Stockport', 'Trafford', 'Wigan'],
      'West Midlands': ['Birmingham', 'Coventry', 'Wolverhampton', 'Dudley', 'Sandwell', 'Solihull', 'Walsall']
    }
  },

  CA: {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    currency: 'CAD',
    phonePlaceholder: '+1 (416) 123-4567',
    phoneRegex: /^(?:\+1\s*\(?|1\s*\(?)?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}$/,
    levels: {
      master: [
        { level: 1, name: 'Province / Territory', key: 'province' },
        { level: 2, name: 'Regional Municipality / County / Census Division', key: 'census_division' }
      ],
      client: [
        { level: 3, name: 'City / Municipality', key: 'city' },
        { level: 4, name: 'Forward Sortation Area (FSA) / Ward', key: 'fsa' }
      ]
    },
    terms: {
      stateLabel: 'Province / Territory',
      districtLabel: 'Regional Municipality / County',
      subdistrictLabel: 'City / Municipality',
      localityLabel: 'FSA / Neighborhood'
    },
    sampleMasterSweeps: [
      { province: 'Ontario', census_division: 'Regional Municipality of Peel', sampleQuery: 'Banquet halls in Peel Region' },
      { province: 'Ontario', census_division: 'Toronto Division', sampleQuery: 'Corporate caterers in Toronto' },
      { province: 'British Columbia', census_division: 'Metro Vancouver', sampleQuery: 'Wedding decorators in Vancouver' },
      { province: 'Alberta', census_division: 'Calgary Metropolitan Region', sampleQuery: 'Event planners in Calgary' }
    ],
    sampleClientScrapes: [
      { location: 'Mississauga, ON', context: 'City Centre (L5B)' },
      { location: 'Brampton, ON', context: 'Commercial Core (L6W)' },
      { location: 'Downtown Vancouver, BC', context: 'Commercial Hub (V6B)' },
      { location: 'Markham, ON', context: 'York Region Hub (L3R)' }
    ],
    subdivisions: {
      'Regional Municipality of Peel': ['Mississauga', 'Brampton', 'Caledon'],
      'Toronto Division': ['Downtown Toronto', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York'],
      'Metro Vancouver': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam', 'Delta']
    }
  },

  AU: {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    currency: 'AUD',
    phonePlaceholder: '+61 412 345 678',
    phoneRegex: /^(?:\+61\s*|0)(?:[2-478]\d{8})$/,
    levels: {
      master: [
        { level: 1, name: 'State / Territory', key: 'state' },
        { level: 2, name: 'Local Government Area (LGA) / Region', key: 'lga' }
      ],
      client: [
        { level: 3, name: 'Suburb / Postal Town', key: 'suburb' },
        { level: 4, name: 'Postcode / Urban Ward', key: 'postcode' }
      ]
    },
    terms: {
      stateLabel: 'State / Territory',
      districtLabel: 'Local Government Area (LGA)',
      subdistrictLabel: 'Suburb / Town',
      localityLabel: 'Postcode / Ward'
    },
    sampleMasterSweeps: [
      { state: 'New South Wales', lga: 'City of Parramatta', sampleQuery: 'Function centres in City of Parramatta' },
      { state: 'New South Wales', lga: 'City of Sydney', sampleQuery: 'Corporate caterers in City of Sydney' },
      { state: 'Victoria', lga: 'City of Melbourne', sampleQuery: 'Wedding hire in City of Melbourne' },
      { state: 'Queensland', lga: 'City of Brisbane', sampleQuery: 'Event production in Brisbane' }
    ],
    sampleClientScrapes: [
      { location: 'Parramatta, NSW', context: 'CBD (2150)' },
      { location: 'Surry Hills, Sydney', context: 'Urban Suburb (2010)' },
      { location: 'Southbank, Melbourne', context: 'Arts Precinct (3006)' },
      { location: 'Fortitude Valley, Brisbane', context: 'Entertainment Precinct (4006)' }
    ],
    subdivisions: {
      'City of Parramatta': ['Parramatta CBD', 'Westmead', 'Northmead', 'Rosehill', 'Ermington', 'Rydalmere', 'Dundas'],
      'City of Sydney': ['Sydney CBD', 'Surry Hills', 'Darlinghurst', 'Paddington', 'Pyrmont', 'Ultimo', 'Haymarket'],
      'City of Melbourne': ['Melbourne CBD', 'Carlton', 'Docklands', 'Southbank', 'Parkville', 'East Melbourne']
    }
  },

  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    currency: 'AED',
    phonePlaceholder: '+971 50 123 4567',
    phoneRegex: /^(?:\+971\s*|0)(?:[2-9]\d{7,8})$/,
    levels: {
      master: [
        { level: 1, name: 'Emirate', key: 'emirate' },
        { level: 2, name: 'Municipal Sector / Region', key: 'sector' }
      ],
      client: [
        { level: 3, name: 'Community / District', key: 'community' },
        { level: 4, name: 'Sub-community / Cluster / Street', key: 'cluster' }
      ]
    },
    terms: {
      stateLabel: 'Emirate',
      districtLabel: 'Municipal Sector',
      subdistrictLabel: 'Community / District',
      localityLabel: 'Cluster / Street'
    },
    sampleMasterSweeps: [
      { emirate: 'Dubai', sector: 'Sector 3 (Bur Dubai & Downtown)', sampleQuery: 'Luxury event organizers in Dubai' },
      { emirate: 'Dubai', sector: 'Sector 1 (Deira & Northern Dubai)', sampleQuery: 'Sound and light hire in Deira Dubai' },
      { emirate: 'Abu Dhabi', sector: 'Abu Dhabi Central Island', sampleQuery: 'Corporate caterers in Abu Dhabi' },
      { emirate: 'Sharjah', sector: 'Sharjah City', sampleQuery: 'Wedding decorators in Sharjah' }
    ],
    sampleClientScrapes: [
      { location: 'Business Bay, Dubai', context: 'Commercial Hub' },
      { location: 'Dubai Marina, Dubai', context: 'Waterfront Community' },
      { location: 'Downtown Dubai', context: 'Burj Khalifa District' },
      { location: 'Al Barsha, Dubai', context: 'Commercial District' }
    ],
    subdivisions: {
      'Dubai': ['Business Bay', 'Downtown Dubai', 'Dubai Marina', 'Jumeirah', 'Deira', 'Bur Dubai', 'Al Barsha', 'JLT'],
      'Abu Dhabi': ['Abu Dhabi Island', 'Al Maryah Island', 'Yas Island', 'Al Reem Island', 'Khalidiya', 'Al Zahiyah'],
      'Sharjah': ['Al Majaz', 'Al Nahda', 'Al Qasimia', 'Muwaileh', 'Al Taawun']
    }
  },

  SG: {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    currency: 'SGD',
    phonePlaceholder: '+65 6123 4567 / +65 9123 4567',
    phoneRegex: /^(?:\+65\s*)?[3689]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Region', key: 'region' },
        { level: 2, name: 'Planning Area', key: 'planning_area' }
      ],
      client: [
        { level: 3, name: 'Subzone / Town', key: 'subzone' },
        { level: 4, name: 'Postal Sector / Estate', key: 'estate' }
      ]
    },
    terms: {
      stateLabel: 'Region',
      districtLabel: 'Planning Area',
      subdistrictLabel: 'Subzone / Town',
      localityLabel: 'Postal Sector / Estate'
    },
    sampleMasterSweeps: [
      { region: 'Central Region', planning_area: 'Downtown Core', sampleQuery: 'Corporate caterers in Downtown Core, Singapore' },
      { region: 'East Region', planning_area: 'Tampines Planning Area', sampleQuery: 'Wedding decorators in Tampines' },
      { region: 'West Region', planning_area: 'Jurong East', sampleQuery: 'Event spaces in Jurong East' }
    ],
    sampleClientScrapes: [
      { location: 'Orchard, Singapore', context: 'Retail Core (238801)' },
      { location: 'Marina Bay, Singapore', context: 'CBD Financial Hub (018989)' },
      { location: 'Tampines Central, Singapore', context: 'Regional Centre (529538)' },
      { location: 'Jurong Gateway, Singapore', context: 'Commercial Hub (608532)' }
    ],
    subdivisions: {
      'Central Region': ['Downtown Core', 'Marina South', 'Orchard', 'River Valley', 'Rochor', 'Newton', 'Outram', 'Bukit Merah', 'Queenstown'],
      'East Region': ['Bedok', 'Pasir Ris', 'Tampines', 'Changi', 'Paya Lebar'],
      'North-East Region': ['Ang Mo Kio', 'Hougang', 'Punggol', 'Sengkang', 'Serangoon'],
      'West Region': ['Jurong East', 'Jurong West', 'Clementi', 'Bukit Batok', 'Choa Chu Kang']
    }
  },

  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    currency: 'NZD',
    phonePlaceholder: '+64 21 123 4567',
    phoneRegex: /^(?:\+64\s*|0)(?:[278]\d{7,9}|[349]\d{7})$/,
    levels: {
      master: [
        { level: 1, name: 'Region', key: 'region' },
        { level: 2, name: 'Territorial Authority / District', key: 'district' }
      ],
      client: [
        { level: 3, name: 'City / Ward / Town', key: 'city' },
        { level: 4, name: 'Suburb / Postcode Area', key: 'suburb' }
      ]
    },
    terms: {
      stateLabel: 'Region',
      districtLabel: 'Territorial Authority / District',
      subdistrictLabel: 'City / Ward',
      localityLabel: 'Suburb / Postcode'
    },
    sampleMasterSweeps: [
      { region: 'Auckland Region', district: 'Auckland Council', sampleQuery: 'Wedding venues in Auckland Region' },
      { region: 'Canterbury', district: 'Christchurch City', sampleQuery: 'Catering in Christchurch City' },
      { region: 'Wellington Region', district: 'Wellington City', sampleQuery: 'Corporate event planners in Wellington' }
    ],
    sampleClientScrapes: [
      { location: 'Auckland CBD', context: 'Commercial Core (1010)' },
      { location: 'Ponsonby, Auckland', context: 'Urban Suburb (1011)' },
      { location: 'Riccarton, Christchurch', context: 'Commercial District (8041)' },
      { location: 'Te Aro, Wellington', context: 'Entertainment Precinct (6011)' }
    ],
    subdivisions: {
      'Auckland Region': ['Auckland CBD', 'Ponsonby', 'Newmarket', 'Takapuna', 'Manukau Central', 'Albany', 'Henderson'],
      'Canterbury Region': ['Christchurch Central', 'Riccarton', 'Papanui', 'Addington', 'Fendalton'],
      'Wellington Region': ['Wellington Central', 'Te Aro', 'Newtown', 'Lower Hutt', 'Porirua']
    }
  },

  ZA: {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    currency: 'ZAR',
    phonePlaceholder: '+27 82 123 4567',
    phoneRegex: /^(?:\+27\s*|0)(?:[1-8]\d{8})$/,
    levels: {
      master: [
        { level: 1, name: 'Province', key: 'province' },
        { level: 2, name: 'District / Metropolitan Municipality', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Local Municipality / Main Place', key: 'town' },
        { level: 4, name: 'Suburb / Postcode', key: 'suburb' }
      ]
    },
    terms: {
      stateLabel: 'Province',
      districtLabel: 'Metropolitan / District Municipality',
      subdistrictLabel: 'Main Place / Town',
      localityLabel: 'Suburb / Postcode'
    },
    sampleMasterSweeps: [
      { province: 'Gauteng', district: 'City of Johannesburg', sampleQuery: 'Conference venues in City of Johannesburg' },
      { province: 'Western Cape', district: 'City of Cape Town', sampleQuery: 'Luxury wedding catering in Cape Town' },
      { province: 'KwaZulu-Natal', district: 'eThekwini Metropolitan', sampleQuery: 'Sound and stage hire in Durban' }
    ],
    sampleClientScrapes: [
      { location: 'Sandton, Johannesburg', context: 'Financial Hub (2196)' },
      { location: 'Rosebank, Johannesburg', context: 'Commercial Suburb (2196)' },
      { location: 'Sea Point, Cape Town', context: 'Atlantic Seaboard (8005)' },
      { location: 'Umhlanga, Durban', context: 'Commercial Precinct (4319)' }
    ],
    subdivisions: {
      'City of Johannesburg': ['Sandton', 'Rosebank', 'Randburg', 'Roodepoort', 'Soweto', 'Johannesburg CBD', 'Midrand'],
      'City of Cape Town': ['Cape Town CBD', 'Sea Point', 'Camps Bay', 'Bellville', 'Claremont', 'Century City'],
      'eThekwini (Durban)': ['Durban Central', 'Umhlanga', 'Durban North', 'Pinetown', 'Westville', 'Berea']
    }
  },

  IE: {
    code: 'IE',
    name: 'Ireland',
    dialCode: '+353',
    currency: 'EUR',
    phonePlaceholder: '+353 87 123 4567',
    phoneRegex: /^(?:\+353\s*|0)(?:[1-9]\d{7,8})$/,
    levels: {
      master: [
        { level: 1, name: 'Province', key: 'province' },
        { level: 2, name: 'County / City Authority', key: 'county' }
      ],
      client: [
        { level: 3, name: 'Town / Municipal District', key: 'town' },
        { level: 4, name: 'Eircode Routing Key / Neighborhood', key: 'eircode' }
      ]
    },
    terms: {
      stateLabel: 'Province',
      districtLabel: 'County',
      subdistrictLabel: 'Town / District',
      localityLabel: 'Eircode / Neighborhood'
    },
    sampleMasterSweeps: [
      { province: 'Leinster', county: 'County Dublin', sampleQuery: 'Corporate caterers in County Dublin' },
      { province: 'Munster', county: 'County Cork', sampleQuery: 'Wedding venues in County Cork' },
      { province: 'Connacht', county: 'County Galway', sampleQuery: 'Photographers in County Galway' }
    ],
    sampleClientScrapes: [
      { location: 'Dublin City Centre', context: 'Capital Core (D01/D02)' },
      { location: 'Ballsbridge, Dublin', context: 'Embassy Belt (D04)' },
      { location: 'Cork City Centre', context: 'Commercial Hub (T12)' },
      { location: 'Salthill, Galway', context: 'Coastal District (H91)' }
    ],
    subdivisions: {
      'County Dublin': ['Dublin City Centre', 'Ballsbridge', 'Rathmines', 'Dún Laoghaire', 'Tallaght', 'Swords', 'Blackrock', 'Sandyford'],
      'County Cork': ['Cork City Centre', 'Ballincollig', 'Douglas', 'Midleton', 'Cobh', 'Mallow'],
      'County Galway': ['Galway City Centre', 'Salthill', 'Tuam', 'Oranmore']
    }
  },

  MY: {
    code: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    currency: 'MYR',
    phonePlaceholder: '+60 12-345 6789',
    phoneRegex: /^(?:\+60\s*|0)(?:1\d{8,9}|[3-9]\d{7})$/,
    levels: {
      master: [
        { level: 1, name: 'State / Federal Territory (Negeri / WP)', key: 'state' },
        { level: 2, name: 'District (Daerah)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Mukim / Town (Bandar / Pekan)', key: 'mukim' },
        { level: 4, name: 'Precinct / Neighborhood / Postcode', key: 'precinct' }
      ]
    },
    terms: {
      stateLabel: 'State / WP',
      districtLabel: 'District (Daerah)',
      subdistrictLabel: 'Mukim / Town',
      localityLabel: 'Precinct / Postcode'
    },
    sampleMasterSweeps: [
      { state: 'Wilayah Persekutuan', district: 'Kuala Lumpur', sampleQuery: 'Event organizers in Kuala Lumpur' },
      { state: 'Selangor', district: 'Petaling District', sampleQuery: 'Catering services in Petaling Jaya' },
      { state: 'Johor', district: 'Johor Bahru District', sampleQuery: 'Wedding decorators in Johor Bahru' }
    ],
    sampleClientScrapes: [
      { location: 'KLCC, Kuala Lumpur', context: 'Commercial Centre (50088)' },
      { location: 'Mont Kiara, Kuala Lumpur', context: 'Expat Suburb (50480)' },
      { location: 'Bandar Sunway, Subang Jaya', context: 'Commercial Hub (47500)' },
      { location: 'Iskandar Puteri, Johor', context: 'Special Economic Zone (79100)' }
    ],
    subdivisions: {
      'Kuala Lumpur': ['Bukit Bintang', 'KLCC', 'Bangsar', 'Mont Kiara', 'Cheras', 'Setapak', 'Kepong', 'Mid Valley'],
      'Petaling District (Selangor)': ['Petaling Jaya', 'Subang Jaya', 'Shah Alam', 'Damansara', 'Puchong', 'Bandar Sunway'],
      'Johor Bahru District': ['Johor Bahru CBD', 'Tebrau', 'Skudai', 'Iskandar Puteri', 'Pasir Gudang']
    }
  },

  DE: {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    currency: 'EUR',
    phonePlaceholder: '+49 170 1234567',
    phoneRegex: /^(?:\+49\s*|0)(?:[1-9]\d{9,11})$/,
    levels: {
      master: [
        { level: 1, name: 'Bundesland (Federal State)', key: 'state' },
        { level: 2, name: 'Landkreis / Kreisfreie Stadt (District)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Stadt / Gemeinde (Municipality)', key: 'municipality' },
        { level: 4, name: 'Stadtteil / Postleitzahl (PLZ / Quarter)', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Bundesland',
      districtLabel: 'Landkreis / Kreisfreie Stadt',
      subdistrictLabel: 'Stadt / Gemeinde',
      localityLabel: 'Stadtteil / PLZ'
    },
    sampleMasterSweeps: [
      { state: 'Berlin', district: 'Kreisfreie Stadt Berlin', sampleQuery: 'Catering in Berlin' },
      { state: 'Bayern (Bavaria)', district: 'Kreisfreie Stadt München', sampleQuery: 'Event agents in Munich' },
      { state: 'Hessen', district: 'Kreisfreie Stadt Frankfurt am Main', sampleQuery: 'Corporate caterers in Frankfurt' }
    ],
    sampleClientScrapes: [
      { location: 'Mitte, Berlin', context: 'Central Quarter (10115)' },
      { location: 'Schwabing, München', context: 'Urban District (80802)' },
      { location: 'Westend, Frankfurt', context: 'Financial District (60325)' },
      { location: 'Altona, Hamburg', context: 'Urban Quarter (22765)' }
    ],
    subdivisions: {
      'Berlin': ['Mitte', 'Charlottenburg', 'Kreuzberg', 'Prenzlauer Berg', 'Friedrichshain', 'Neukölln', 'Spandau', 'Schöneberg'],
      'Munich (München)': ['Altstadt-Lehel', 'Maxvorstadt', 'Schwabing', 'Bogenhausen', 'Sendling', 'Neuhausen'],
      'Frankfurt am Main': ['Innenstadt', 'Westend', 'Sachsenhausen', 'Nordend', 'Bornheim', 'Gallus'],
      'Hamburg': ['Hamburg-Mitte', 'Altona', 'Eimsbüttel', 'Hamburg-Nord', 'Wandsbek', 'Hafencity']
    }
  },

  FR: {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    currency: 'EUR',
    phonePlaceholder: '+33 6 12 34 56 78',
    phoneRegex: /^(?:\+33\s*|0)[1-9](?:[\s.-]?\d{2}){4}$/,
    levels: {
      master: [
        { level: 1, name: 'Région', key: 'region' },
        { level: 2, name: 'Département', key: 'department' }
      ],
      client: [
        { level: 3, name: 'Arrondissement / Commune', key: 'commune' },
        { level: 4, name: 'Quartier / Code Postal', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Région',
      districtLabel: 'Département',
      subdistrictLabel: 'Commune / Arrondissement',
      localityLabel: 'Quartier / Code Postal'
    }
  },

  IT: {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    currency: 'EUR',
    phonePlaceholder: '+39 340 123 4567',
    phoneRegex: /^(?:\+39\s*)?3\d{2}[\s.-]?\d{6,7}$/,
    levels: {
      master: [
        { level: 1, name: 'Regione', key: 'region' },
        { level: 2, name: 'Provincia / Città Metropolitana', key: 'province' }
      ],
      client: [
        { level: 3, name: 'Comune', key: 'comune' },
        { level: 4, name: 'Frazione / CAP', key: 'frazione' }
      ]
    },
    terms: {
      stateLabel: 'Regione',
      districtLabel: 'Provincia',
      subdistrictLabel: 'Comune',
      localityLabel: 'Frazione / CAP'
    }
  },

  ES: {
    code: 'ES',
    name: 'Spain',
    dialCode: '+34',
    currency: 'EUR',
    phonePlaceholder: '+34 612 34 56 78',
    phoneRegex: /^(?:\+34\s*)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}$/,
    levels: {
      master: [
        { level: 1, name: 'Comunidad Autónoma', key: 'community' },
        { level: 2, name: 'Provincia', key: 'province' }
      ],
      client: [
        { level: 3, name: 'Municipio / Comarca', key: 'municipality' },
        { level: 4, name: 'Barrio / Distrito', key: 'barrio' }
      ]
    },
    terms: {
      stateLabel: 'Comunidad Autónoma',
      districtLabel: 'Provincia',
      subdistrictLabel: 'Municipio',
      localityLabel: 'Barrio / Código Postal'
    }
  },

  NL: {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    currency: 'EUR',
    phonePlaceholder: '+31 6 12345678',
    phoneRegex: /^(?:\+31\s*|0)6[\s.-]?\d{8}$/,
    levels: {
      master: [
        { level: 1, name: 'Provincie', key: 'province' },
        { level: 2, name: 'Gemeente', key: 'municipality' }
      ],
      client: [
        { level: 3, name: 'Stad / Wijk', key: 'city' },
        { level: 4, name: 'Buurt / Postcode', key: 'buurt' }
      ]
    },
    terms: {
      stateLabel: 'Provincie',
      districtLabel: 'Gemeente',
      subdistrictLabel: 'Stad / Wijk',
      localityLabel: 'Buurt / Postcode'
    }
  },

  BR: {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    currency: 'BRL',
    phonePlaceholder: '+55 11 98765-4321',
    phoneRegex: /^(?:\+55\s*)?(?:\([1-9]{2}\)|[1-9]{2})[\s.-]?9?[6-9]\d{3}[\s.-]?\d{4}$/,
    levels: {
      master: [
        { level: 1, name: 'Estado', key: 'state' },
        { level: 2, name: 'Município / Microrregião', key: 'municipality' }
      ],
      client: [
        { level: 3, name: 'Cidade / Distrito', key: 'city' },
        { level: 4, name: 'Bairro / CEP', key: 'bairro' }
      ]
    },
    terms: {
      stateLabel: 'Estado',
      districtLabel: 'Município',
      subdistrictLabel: 'Cidade',
      localityLabel: 'Bairro / CEP'
    }
  },

  MX: {
    code: 'MX',
    name: 'Mexico',
    dialCode: '+52',
    currency: 'MXN',
    phonePlaceholder: '+52 55 1234 5678',
    phoneRegex: /^(?:\+52\s*)?[1-9]\d{9}$/,
    levels: {
      master: [
        { level: 1, name: 'Estado', key: 'state' },
        { level: 2, name: 'Municipio / Alcaldía', key: 'municipality' }
      ],
      client: [
        { level: 3, name: 'Ciudad / Localidad', key: 'city' },
        { level: 4, name: 'Colonia / Código Postal', key: 'colonia' }
      ]
    },
    terms: {
      stateLabel: 'Estado',
      districtLabel: 'Municipio / Alcaldía',
      subdistrictLabel: 'Ciudad',
      localityLabel: 'Colonia / CP'
    }
  },

  JP: {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    currency: 'JPY',
    phonePlaceholder: '+81 90 1234 5678',
    phoneRegex: /^(?:\+81\s*|0)[789]0[\s.-]?\d{4}[\s.-]?\d{4}$/,
    levels: {
      master: [
        { level: 1, name: 'Todōfuken (Prefecture / 都道府県)', key: 'prefecture' },
        { level: 2, name: 'Shi / Ku / Gun (City / Special Ward / 市区)', key: 'city' }
      ],
      client: [
        { level: 3, name: 'Machi / Mura (Town / Village / 町村)', key: 'town' },
        { level: 4, name: 'Chōme / Banchi (丁目 / 街区)', key: 'chome' }
      ]
    },
    terms: {
      stateLabel: 'Prefecture (都道府県)',
      districtLabel: 'City / Ward (市区)',
      subdistrictLabel: 'Town (町村)',
      localityLabel: 'Chome (丁目)'
    }
  },

  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    currency: 'SAR',
    phonePlaceholder: '+966 50 123 4567',
    phoneRegex: /^(?:\+966\s*|0)?5\d{8}$/,
    levels: {
      master: [
        { level: 1, name: 'Mintaqah (Region / Province)', key: 'region' },
        { level: 2, name: 'Muhafazah (Governorate)', key: 'governorate' }
      ],
      client: [
        { level: 3, name: 'Madinah (City)', key: 'city' },
        { level: 4, name: 'Hayy (District / Neighborhood)', key: 'district' }
      ]
    },
    terms: {
      stateLabel: 'Region / Province',
      districtLabel: 'Governorate',
      subdistrictLabel: 'City',
      localityLabel: 'Hayy / Neighborhood'
    }
  },

  QA: {
    code: 'QA',
    name: 'Qatar',
    dialCode: '+974',
    currency: 'QAR',
    phonePlaceholder: '+974 3312 3456',
    phoneRegex: /^(?:\+974\s*)?[3567]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Baladiyah (Municipality)', key: 'municipality' },
        { level: 2, name: 'Zone', key: 'zone' }
      ],
      client: [
        { level: 3, name: 'City / District', key: 'district' },
        { level: 4, name: 'Street / Block', key: 'block' }
      ]
    },
    terms: {
      stateLabel: 'Municipality',
      districtLabel: 'Zone',
      subdistrictLabel: 'District',
      localityLabel: 'Street / Block'
    }
  },

  KW: {
    code: 'KW',
    name: 'Kuwait',
    dialCode: '+965',
    currency: 'KWD',
    phonePlaceholder: '+965 9123 4567',
    phoneRegex: /^(?:\+965\s*)?[569]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Muhafazah (Governorate)', key: 'governorate' },
        { level: 2, name: 'Area / Zone', key: 'area' }
      ],
      client: [
        { level: 3, name: 'City / District', key: 'district' },
        { level: 4, name: 'Block / Street', key: 'block' }
      ]
    },
    terms: {
      stateLabel: 'Governorate',
      districtLabel: 'Area / Zone',
      subdistrictLabel: 'District',
      localityLabel: 'Block'
    }
  },

  MY: {
    code: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    currency: 'MYR',
    phonePlaceholder: '+60 12-345 6789',
    phoneRegex: /^(?:\+60\s*|0)1[0-9]-?\d{7,8}$/,
    levels: {
      master: [
        { level: 1, name: 'Negeri (State)', key: 'state' },
        { level: 2, name: 'Daerah (District)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Bandar / Mukim (Town / Sub-district)', key: 'town' },
        { level: 4, name: 'Seksyen / Taman (Locality / Estate)', key: 'locality' }
      ]
    },
    terms: {
      stateLabel: 'Negeri (State)',
      districtLabel: 'Daerah (District)',
      subdistrictLabel: 'Bandar / Mukim',
      localityLabel: 'Seksyen / Taman'
    }
  },

  ID: {
    code: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    currency: 'IDR',
    phonePlaceholder: '+62 812-3456-7890',
    phoneRegex: /^(?:\+62\s*|0)8[1-9]\d{7,10}$/,
    levels: {
      master: [
        { level: 1, name: 'Provinsi (Province)', key: 'province' },
        { level: 2, name: 'Kabupaten / Kota (Regency / City)', key: 'regency' }
      ],
      client: [
        { level: 3, name: 'Kecamatan (District)', key: 'district' },
        { level: 4, name: 'Kelurahan / Desa (Village / Locality)', key: 'village' }
      ]
    },
    terms: {
      stateLabel: 'Provinsi',
      districtLabel: 'Kabupaten / Kota',
      subdistrictLabel: 'Kecamatan',
      localityLabel: 'Kelurahan / Desa'
    }
  },

  TH: {
    code: 'TH',
    name: 'Thailand',
    dialCode: '+66',
    currency: 'THB',
    phonePlaceholder: '+66 81 234 5678',
    phoneRegex: /^(?:\+66\s*|0)[689]\d{8}$/,
    levels: {
      master: [
        { level: 1, name: 'Changwat (Province)', key: 'province' },
        { level: 2, name: 'Amphoe (District)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Tambon (Sub-district)', key: 'subdistrict' },
        { level: 4, name: 'Muban / Chumchon (Village / Community)', key: 'village' }
      ]
    },
    terms: {
      stateLabel: 'Changwat (Province)',
      districtLabel: 'Amphoe (District)',
      subdistrictLabel: 'Tambon',
      localityLabel: 'Muban / Community'
    }
  },

  PH: {
    code: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    currency: 'PHP',
    phonePlaceholder: '+63 912 345 6789',
    phoneRegex: /^(?:\+63\s*|0)9\d{9}$/,
    levels: {
      master: [
        { level: 1, name: 'Region', key: 'region' },
        { level: 2, name: 'Province / HUC', key: 'province' }
      ],
      client: [
        { level: 3, name: 'City / Municipality', key: 'city' },
        { level: 4, name: 'Barangay', key: 'barangay' }
      ]
    },
    terms: {
      stateLabel: 'Region',
      districtLabel: 'Province',
      subdistrictLabel: 'City / Municipality',
      localityLabel: 'Barangay'
    }
  },

  KR: {
    code: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    currency: 'KRW',
    phonePlaceholder: '+82 10-1234-5678',
    phoneRegex: /^(?:\+82\s*|0)10[\s.-]?\d{4}[\s.-]?\d{4}$/,
    levels: {
      master: [
        { level: 1, name: 'Teukbyeolsi / Do (Special City / Province)', key: 'province' },
        { level: 2, name: 'Si / Gun / Gu (City / District)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Eup / Myeon / Dong (Town / Neighborhood)', key: 'town' },
        { level: 4, name: 'Ri / Gil (Village / Street)', key: 'village' }
      ]
    },
    terms: {
      stateLabel: 'Province / Special City',
      districtLabel: 'City / District (Si/Gun/Gu)',
      subdistrictLabel: 'Dong / Town',
      localityLabel: 'Gil / Village'
    }
  },

  TR: {
    code: 'TR',
    name: 'Turkey',
    dialCode: '+90',
    currency: 'TRY',
    phonePlaceholder: '+90 512 345 6789',
    phoneRegex: /^(?:\+90\s*|0)?5\d{9}$/,
    levels: {
      master: [
        { level: 1, name: 'İl (Province)', key: 'province' },
        { level: 2, name: 'İlçe (District)', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Şehir / Belde (Town)', key: 'town' },
        { level: 4, name: 'Mahalle / Posta Kodu', key: 'mahalle' }
      ]
    },
    terms: {
      stateLabel: 'İl (Province)',
      districtLabel: 'İlçe (District)',
      subdistrictLabel: 'Şehir / Belde',
      localityLabel: 'Mahalle / Posta Kodu'
    }
  },

  IE: {
    code: 'IE',
    name: 'Ireland',
    dialCode: '+353',
    currency: 'EUR',
    phonePlaceholder: '+353 87 123 4567',
    phoneRegex: /^(?:\+353\s*|0)8[3-9]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Province', key: 'province' },
        { level: 2, name: 'County', key: 'county' }
      ],
      client: [
        { level: 3, name: 'Postal Town / City', key: 'town' },
        { level: 4, name: 'Electoral Division / Eircode', key: 'eircode' }
      ]
    },
    terms: {
      stateLabel: 'Province',
      districtLabel: 'County',
      subdistrictLabel: 'Town / City',
      localityLabel: 'Eircode / Ward'
    }
  },

  PL: {
    code: 'PL',
    name: 'Poland',
    dialCode: '+48',
    currency: 'PLN',
    phonePlaceholder: '+48 512 345 678',
    phoneRegex: /^(?:\+48\s*)?[4-9]\d{8}$/,
    levels: {
      master: [
        { level: 1, name: 'Województwo (Voivodeship)', key: 'voivodeship' },
        { level: 2, name: 'Powiat (County)', key: 'county' }
      ],
      client: [
        { level: 3, name: 'Miasto / Gmina (Municipality)', key: 'municipality' },
        { level: 4, name: 'Dzielnica / Kod Pocztowy', key: 'district' }
      ]
    },
    terms: {
      stateLabel: 'Województwo',
      districtLabel: 'Powiat',
      subdistrictLabel: 'Miasto / Gmina',
      localityLabel: 'Dzielnica / Kod'
    }
  },

  SE: {
    code: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    currency: 'SEK',
    phonePlaceholder: '+46 70 123 45 67',
    phoneRegex: /^(?:\+46\s*|0)7[02369]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Län (County)', key: 'county' },
        { level: 2, name: 'Kommun (Municipality)', key: 'municipality' }
      ],
      client: [
        { level: 3, name: 'Tätort (Town / Urban Area)', key: 'town' },
        { level: 4, name: 'Stadsdel / Postnummer', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Län (County)',
      districtLabel: 'Kommun',
      subdistrictLabel: 'Tätort (Town)',
      localityLabel: 'Stadsdel / Postnummer'
    }
  },

  CH: {
    code: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    currency: 'CHF',
    phonePlaceholder: '+41 79 123 45 67',
    phoneRegex: /^(?:\+41\s*|0)7[5-9]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Canton', key: 'canton' },
        { level: 2, name: 'District / Bezirk', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Commune / Gemeinde', key: 'municipality' },
        { level: 4, name: 'Quartier / PLZ', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Canton',
      districtLabel: 'District / Bezirk',
      subdistrictLabel: 'Commune / Gemeinde',
      localityLabel: 'Quartier / PLZ'
    }
  },

  AT: {
    code: 'AT',
    name: 'Austria',
    dialCode: '+43',
    currency: 'EUR',
    phonePlaceholder: '+43 664 1234567',
    phoneRegex: /^(?:\+43\s*|0)6\d{8,11}$/,
    levels: {
      master: [
        { level: 1, name: 'Bundesland', key: 'state' },
        { level: 2, name: 'Bezirk / Statutarstadt', key: 'district' }
      ],
      client: [
        { level: 3, name: 'Stadt / Gemeinde', key: 'municipality' },
        { level: 4, name: 'Stadtteil / PLZ', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Bundesland',
      districtLabel: 'Bezirk',
      subdistrictLabel: 'Stadt / Gemeinde',
      localityLabel: 'Stadtteil / PLZ'
    }
  },

  BE: {
    code: 'BE',
    name: 'Belgium',
    dialCode: '+32',
    currency: 'EUR',
    phonePlaceholder: '+32 470 12 34 56',
    phoneRegex: /^(?:\+32\s*|0)4[5-9]\d{7}$/,
    levels: {
      master: [
        { level: 1, name: 'Région / Gewest', key: 'region' },
        { level: 2, name: 'Province / Provincie', key: 'province' }
      ],
      client: [
        { level: 3, name: 'Ville / Gemeente', key: 'municipality' },
        { level: 4, name: 'Quartier / Wijk', key: 'quarter' }
      ]
    },
    terms: {
      stateLabel: 'Région / Gewest',
      districtLabel: 'Province / Provincie',
      subdistrictLabel: 'Ville / Gemeente',
      localityLabel: 'Quartier / Wijk'
    }
  }
};

let cachedWorldCountries = null;
function getWorldCountries() {
  if (!cachedWorldCountries) {
    try {
      const { WORLD_COUNTRIES } = require('../services/localBrain/worldCountries');
      cachedWorldCountries = WORLD_COUNTRIES;
    } catch (e) {
      cachedWorldCountries = [];
    }
  }
  return cachedWorldCountries;
}

/**
 * Returns taxonomy details for a specific country or all supported countries.
 * Universally supports all 245 countries in worldCountries.js with their native
 * topTerm, secondTerm, localTerm and subdivisionTerm!
 */
function getCountryTaxonomy(countryCode) {
  if (!countryCode) return COUNTRY_TAXONOMY;
  const c = String(countryCode).toUpperCase();
  if (COUNTRY_TAXONOMY[c]) return COUNTRY_TAXONOMY[c];

  // Dynamic universal fallback for any of the 245 ISO countries
  const list = getWorldCountries();
  const found = list.find(w => w.code === c);
  if (found) {
    const topTerm = found.topTerm || 'Region / State';
    const secondTerm = found.secondTerm || 'District / County';
    const localTerm = found.localTerm || 'City / Town';
    const subdivTerm = found.subdivisionTerm || 'Districts';
    return {
      code: found.code,
      name: found.name,
      dialCode: found.phone || '',
      currency: found.currency || '',
      phonePlaceholder: `${found.phone || '+1'} ...`,
      phoneRegex: /^\+?[0-9\s\-()]{7,16}$/,
      levels: {
        master: [
          { level: 1, name: topTerm, key: 'state' },
          { level: 2, name: secondTerm, key: 'district' }
        ],
        client: [
          { level: 3, name: localTerm, key: 'city' },
          { level: 4, name: 'Neighborhood / Locality', key: 'locality' }
        ]
      },
      terms: {
        stateLabel: topTerm,
        districtLabel: secondTerm,
        subdistrictLabel: localTerm,
        localityLabel: 'Neighborhood / Locality'
      }
    };
  }

  return null;
}

/**
 * Resolves child administrative subdivisions for territory sweeps.
 */
function resolveSubdivisions(countryCode, territoryName) {
  const meta = getCountryTaxonomy(countryCode);
  if (!meta || !meta.subdivisions) return [];
  const clean = String(territoryName || '').trim();
  for (const [key, subs] of Object.entries(meta.subdivisions)) {
    if (key.toLowerCase().includes(clean.toLowerCase()) || clean.toLowerCase().includes(key.toLowerCase())) {
      return subs;
    }
  }
  return [];
}

module.exports = {
  COUNTRY_TAXONOMY,
  getCountryTaxonomy,
  resolveSubdivisions
};
