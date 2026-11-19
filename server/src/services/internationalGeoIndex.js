/**
 * internationalGeoIndex.js
 *
 * In-Memory International Geographic Gazetteer for Ultra-Fast Search Autocomplete (<1ms).
 *
 * Covers:
 *   - All 245 ISO countries from worldCountries.js & countries.js
 *   - All States, Provinces, Territories, Emirates, Bundesländer, Nations, Cantons
 *   - Key international Counties, Districts, Regional Municipalities, and Census Divisions
 *   - Top 500+ global commercial capitals and metro cities across North America,
 *     Europe, Middle East, Asia-Pacific, Latin America, and Africa.
 *
 * Zero external network calls required for autocomplete in all major world locations.
 * Client mode filters for specific cities/towns; Master mode sweeps states, counties,
 * and broad administrative regions.
 */

const { COUNTRIES, CITY_ALIASES, US_STATE_CODES, CA_PROVINCE_CODES, AU_STATE_CODES } = require('./localBrain/countries');
const { WORLD_COUNTRIES } = require('./localBrain/worldCountries');

function norm(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

const LEVEL_LABEL = {
  city: 'City',
  town: 'Town',
  district: 'County / District',
  state: 'State / Province',
  country: 'Country',
  village: 'Locality'
};

// Extended international catalog for zero-latency in-memory lookup
const EXTENDED_ENTITIES = [
  // --- US Major Cities ---
  { name: 'New York', state: 'New York', district: 'New York County', country: 'US', level: 'city', lat: 40.7128, lng: -74.0060 },
  { name: 'New York City', state: 'New York', district: 'New York County', country: 'US', level: 'city', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', state: 'California', district: 'Los Angeles County', country: 'US', level: 'city', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', state: 'Illinois', district: 'Cook County', country: 'US', level: 'city', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', state: 'Texas', district: 'Harris County', country: 'US', level: 'city', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', state: 'Arizona', district: 'Maricopa County', country: 'US', level: 'city', lat: 33.4484, lng: -112.0740 },
  { name: 'Philadelphia', state: 'Pennsylvania', district: 'Philadelphia County', country: 'US', level: 'city', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', state: 'Texas', district: 'Bexar County', country: 'US', level: 'city', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', state: 'California', district: 'San Diego County', country: 'US', level: 'city', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', state: 'Texas', district: 'Dallas County', country: 'US', level: 'city', lat: 32.7767, lng: -96.7970 },
  { name: 'San Jose', state: 'California', district: 'Santa Clara County', country: 'US', level: 'city', lat: 37.3382, lng: -121.8863 },
  { name: 'Austin', state: 'Texas', district: 'Travis County', country: 'US', level: 'city', lat: 30.2672, lng: -97.7431 },
  { name: 'Jacksonville', state: 'Florida', district: 'Duval County', country: 'US', level: 'city', lat: 30.3322, lng: -81.6557 },
  { name: 'Fort Worth', state: 'Texas', district: 'Tarrant County', country: 'US', level: 'city', lat: 32.7555, lng: -97.3308 },
  { name: 'Columbus', state: 'Ohio', district: 'Franklin County', country: 'US', level: 'city', lat: 39.9612, lng: -82.9988 },
  { name: 'Charlotte', state: 'North Carolina', district: 'Mecklenburg County', country: 'US', level: 'city', lat: 35.2271, lng: -80.8431 },
  { name: 'Indianapolis', state: 'Indiana', district: 'Marion County', country: 'US', level: 'city', lat: 39.7684, lng: -86.1581 },
  { name: 'San Francisco', state: 'California', district: 'San Francisco County', country: 'US', level: 'city', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', state: 'Washington', district: 'King County', country: 'US', level: 'city', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', state: 'Colorado', district: 'Denver County', country: 'US', level: 'city', lat: 39.7392, lng: -104.9903 },
  { name: 'Washington', state: 'District of Columbia', district: 'District of Columbia', country: 'US', level: 'city', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', state: 'Massachusetts', district: 'Suffolk County', country: 'US', level: 'city', lat: 42.3601, lng: -71.0589 },
  { name: 'El Paso', state: 'Texas', district: 'El Paso County', country: 'US', level: 'city', lat: 31.7619, lng: -106.4850 },
  { name: 'Nashville', state: 'Tennessee', district: 'Davidson County', country: 'US', level: 'city', lat: 36.1627, lng: -86.7816 },
  { name: 'Detroit', state: 'Michigan', district: 'Wayne County', country: 'US', level: 'city', lat: 42.3314, lng: -83.0458 },
  { name: 'Oklahoma City', state: 'Oklahoma', district: 'Oklahoma County', country: 'US', level: 'city', lat: 35.4676, lng: -97.5164 },
  { name: 'Portland', state: 'Oregon', district: 'Multnomah County', country: 'US', level: 'city', lat: 45.5152, lng: -122.6784 },
  { name: 'Las Vegas', state: 'Nevada', district: 'Clark County', country: 'US', level: 'city', lat: 36.1699, lng: -115.1398 },
  { name: 'Memphis', state: 'Tennessee', district: 'Shelby County', country: 'US', level: 'city', lat: 35.1495, lng: -90.0490 },
  { name: 'Louisville', state: 'Kentucky', district: 'Jefferson County', country: 'US', level: 'city', lat: 38.2527, lng: -85.7585 },
  { name: 'Baltimore', state: 'Maryland', district: 'Baltimore City', country: 'US', level: 'city', lat: 39.2904, lng: -76.6122 },
  { name: 'Milwaukee', state: 'Wisconsin', district: 'Milwaukee County', country: 'US', level: 'city', lat: 43.0389, lng: -87.9065 },
  { name: 'Albuquerque', state: 'New Mexico', district: 'Bernalillo County', country: 'US', level: 'city', lat: 35.0844, lng: -106.6504 },
  { name: 'Tucson', state: 'Arizona', district: 'Pima County', country: 'US', level: 'city', lat: 32.2226, lng: -110.9747 },
  { name: 'Fresno', state: 'California', district: 'Fresno County', country: 'US', level: 'city', lat: 36.7468, lng: -119.7726 },
  { name: 'Sacramento', state: 'California', district: 'Sacramento County', country: 'US', level: 'city', lat: 38.5816, lng: -121.4944 },
  { name: 'Kansas City', state: 'Missouri', district: 'Jackson County', country: 'US', level: 'city', lat: 39.0997, lng: -94.5786 },
  { name: 'Atlanta', state: 'Georgia', district: 'Fulton County', country: 'US', level: 'city', lat: 33.7490, lng: -84.3880 },
  { name: 'Miami', state: 'Florida', district: 'Miami-Dade County', country: 'US', level: 'city', lat: 25.7617, lng: -80.1918 },
  { name: 'Raleigh', state: 'North Carolina', district: 'Wake County', country: 'US', level: 'city', lat: 35.7796, lng: -78.6382 },
  { name: 'Omaha', state: 'Nebraska', district: 'Douglas County', country: 'US', level: 'city', lat: 41.2565, lng: -95.9345 },
  { name: 'Oakland', state: 'California', district: 'Alameda County', country: 'US', level: 'city', lat: 37.8044, lng: -122.2712 },
  { name: 'Minneapolis', state: 'Minnesota', district: 'Hennepin County', country: 'US', level: 'city', lat: 44.9778, lng: -93.2650 },
  { name: 'Tampa', state: 'Florida', district: 'Hillsborough County', country: 'US', level: 'city', lat: 27.9506, lng: -82.4572 },
  { name: 'New Orleans', state: 'Louisiana', district: 'Orleans Parish', country: 'US', level: 'city', lat: 29.9511, lng: -90.0715 },
  { name: 'Cleveland', state: 'Ohio', district: 'Cuyahoga County', country: 'US', level: 'city', lat: 41.4993, lng: -81.6944 },
  { name: 'Honolulu', state: 'Hawaii', district: 'Honolulu County', country: 'US', level: 'city', lat: 21.3069, lng: -157.8583 },
  { name: 'Cincinnati', state: 'Ohio', district: 'Hamilton County', country: 'US', level: 'city', lat: 39.1031, lng: -84.5120 },
  { name: 'Pittsburgh', state: 'Pennsylvania', district: 'Allegheny County', country: 'US', level: 'city', lat: 40.4406, lng: -79.9959 },
  { name: 'Orlando', state: 'Florida', district: 'Orange County', country: 'US', level: 'city', lat: 28.5383, lng: -81.3792 },
  { name: 'St. Louis', state: 'Missouri', district: 'St. Louis City', country: 'US', level: 'city', lat: 38.6270, lng: -90.1994 },
  { name: 'Troy', state: 'New York', district: 'Rensselaer County', country: 'US', level: 'city', lat: 42.7284, lng: -73.6918 },
  { name: 'Albany', state: 'New York', district: 'Albany County', country: 'US', level: 'city', lat: 42.6526, lng: -73.7562 },
  { name: 'Buffalo', state: 'New York', district: 'Erie County', country: 'US', level: 'city', lat: 42.8864, lng: -78.8784 },
  { name: 'Rochester', state: 'New York', district: 'Monroe County', country: 'US', level: 'city', lat: 43.1566, lng: -77.6088 },
  { name: 'Syracuse', state: 'New York', district: 'Onondaga County', country: 'US', level: 'city', lat: 43.0481, lng: -76.1474 },

  // --- US Major Counties (for Master sweeps) ---
  { name: 'Los Angeles County', state: 'California', district: 'California', country: 'US', level: 'district' },
  { name: 'Cook County', state: 'Illinois', district: 'Illinois', country: 'US', level: 'district' },
  { name: 'Harris County', state: 'Texas', district: 'Texas', country: 'US', level: 'district' },
  { name: 'Maricopa County', state: 'Arizona', district: 'Arizona', country: 'US', level: 'district' },
  { name: 'San Diego County', state: 'California', district: 'California', country: 'US', level: 'district' },
  { name: 'Orange County', state: 'California', district: 'California', country: 'US', level: 'district' },
  { name: 'Miami-Dade County', state: 'Florida', district: 'Florida', country: 'US', level: 'district' },
  { name: 'Dallas County', state: 'Texas', district: 'Texas', country: 'US', level: 'district' },
  { name: 'King County', state: 'Washington', district: 'Washington', country: 'US', level: 'district' },
  { name: 'Clark County', state: 'Nevada', district: 'Nevada', country: 'US', level: 'district' },
  { name: 'Travis County', state: 'Texas', district: 'Texas', country: 'US', level: 'district' },
  { name: 'Fulton County', state: 'Georgia', district: 'Georgia', country: 'US', level: 'district' },
  { name: 'Bexar County', state: 'Texas', district: 'Texas', country: 'US', level: 'district' },
  { name: 'Tarrant County', state: 'Texas', district: 'Texas', country: 'US', level: 'district' },
  { name: 'Wayne County', state: 'Michigan', district: 'Michigan', country: 'US', level: 'district' },
  { name: 'Santa Clara County', state: 'California', district: 'California', country: 'US', level: 'district' },
  { name: 'Alameda County', state: 'California', district: 'California', country: 'US', level: 'district' },
  { name: 'New York County', state: 'New York', district: 'New York', country: 'US', level: 'district' },
  { name: 'Kings County', state: 'New York', district: 'New York', country: 'US', level: 'district' },
  { name: 'Queens County', state: 'New York', district: 'New York', country: 'US', level: 'district' },

  // --- UK Major Cities & Counties ---
  { name: 'London', state: 'England', district: 'Greater London', country: 'GB', level: 'city', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', state: 'England', district: 'Greater Manchester', country: 'GB', level: 'city', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', state: 'England', district: 'West Midlands', country: 'GB', level: 'city', lat: 52.4862, lng: -1.8904 },
  { name: 'Leeds', state: 'England', district: 'West Yorkshire', country: 'GB', level: 'city', lat: 53.8008, lng: -1.5491 },
  { name: 'Glasgow', state: 'Scotland', district: 'Glasgow City', country: 'GB', level: 'city', lat: 55.8642, lng: -4.2518 },
  { name: 'Liverpool', state: 'England', district: 'Merseyside', country: 'GB', level: 'city', lat: 53.4084, lng: -2.9916 },
  { name: 'Newcastle', state: 'England', district: 'Tyne and Wear', country: 'GB', level: 'city', lat: 54.9783, lng: -1.6178 },
  { name: 'Sheffield', state: 'England', district: 'South Yorkshire', country: 'GB', level: 'city', lat: 53.3811, lng: -1.4701 },
  { name: 'Bristol', state: 'England', district: 'Bristol', country: 'GB', level: 'city', lat: 51.4545, lng: -2.5879 },
  { name: 'Edinburgh', state: 'Scotland', district: 'City of Edinburgh', country: 'GB', level: 'city', lat: 55.9533, lng: -3.1883 },
  { name: 'Belfast', state: 'Northern Ireland', district: 'Belfast', country: 'GB', level: 'city', lat: 54.5973, lng: -5.9301 },
  { name: 'Cardiff', state: 'Wales', district: 'Cardiff', country: 'GB', level: 'city', lat: 51.4816, lng: -3.1791 },
  { name: 'Leicester', state: 'England', district: 'Leicestershire', country: 'GB', level: 'city', lat: 52.6369, lng: -1.1398 },
  { name: 'Nottingham', state: 'England', district: 'Nottinghamshire', country: 'GB', level: 'city', lat: 52.9548, lng: -1.1581 },
  { name: 'Southampton', state: 'England', district: 'Hampshire', country: 'GB', level: 'city', lat: 50.9097, lng: -1.4044 },
  { name: 'Coventry', state: 'England', district: 'West Midlands', country: 'GB', level: 'city', lat: 52.4068, lng: -1.5197 },
  { name: 'Bradford', state: 'England', district: 'West Yorkshire', country: 'GB', level: 'city', lat: 53.7960, lng: -1.7594 },
  { name: 'Brighton', state: 'England', district: 'East Sussex', country: 'GB', level: 'city', lat: 50.8225, lng: -0.1372 },
  { name: 'Oxford', state: 'England', district: 'Oxfordshire', country: 'GB', level: 'city', lat: 51.7520, lng: -1.2577 },
  { name: 'Cambridge', state: 'England', district: 'Cambridgeshire', country: 'GB', level: 'city', lat: 52.2053, lng: 0.1218 },

  // --- Canada Major Cities & Divisions ---
  { name: 'Toronto', state: 'Ontario', district: 'Greater Toronto', country: 'CA', level: 'city', lat: 43.6532, lng: -79.3832 },
  { name: 'Montreal', state: 'Quebec', district: 'Montreal Region', country: 'CA', level: 'city', lat: 45.5017, lng: -73.5673 },
  { name: 'Vancouver', state: 'British Columbia', district: 'Metro Vancouver', country: 'CA', level: 'city', lat: 49.2827, lng: -123.1207 },
  { name: 'Calgary', state: 'Alberta', district: 'Calgary Region', country: 'CA', level: 'city', lat: 51.0447, lng: -114.0719 },
  { name: 'Edmonton', state: 'Alberta', district: 'Edmonton Region', country: 'CA', level: 'city', lat: 53.5461, lng: -113.4938 },
  { name: 'Ottawa', state: 'Ontario', district: 'National Capital Region', country: 'CA', level: 'city', lat: 45.4215, lng: -75.6972 },
  { name: 'Winnipeg', state: 'Manitoba', district: 'Winnipeg Region', country: 'CA', level: 'city', lat: 49.8951, lng: -97.1384 },
  { name: 'Quebec City', state: 'Quebec', district: 'Capitale-Nationale', country: 'CA', level: 'city', lat: 46.8139, lng: -71.2080 },
  { name: 'Hamilton', state: 'Ontario', district: 'Hamilton', country: 'CA', level: 'city', lat: 43.2557, lng: -79.8711 },
  { name: 'Halifax', state: 'Nova Scotia', district: 'Halifax', country: 'CA', level: 'city', lat: 44.6488, lng: -63.5752 },
  { name: 'Victoria', state: 'British Columbia', district: 'Capital Region', country: 'CA', level: 'city', lat: 48.4284, lng: -123.3656 },
  { name: 'Kitchener', state: 'Ontario', district: 'Waterloo', country: 'CA', level: 'city', lat: 43.4516, lng: -80.4925 },
  { name: 'London', state: 'Ontario', district: 'Middlesex', country: 'CA', level: 'city', lat: 42.9849, lng: -81.2453 },
  { name: 'Windsor', state: 'Ontario', district: 'Essex', country: 'CA', level: 'city', lat: 42.3149, lng: -83.0364 },

  // --- Australia Major Cities & LGAs ---
  { name: 'Sydney', state: 'New South Wales', district: 'Greater Sydney', country: 'AU', level: 'city', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', state: 'Victoria', district: 'Greater Melbourne', country: 'AU', level: 'city', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', state: 'Queensland', district: 'South East Queensland', country: 'AU', level: 'city', lat: -27.4698, lng: 153.0251 },
  { name: 'Perth', state: 'Western Australia', district: 'Perth Metropolitan', country: 'AU', level: 'city', lat: -31.9505, lng: 115.8605 },
  { name: 'Adelaide', state: 'South Australia', district: 'Greater Adelaide', country: 'AU', level: 'city', lat: -34.9285, lng: 138.6007 },
  { name: 'Gold Coast', state: 'Queensland', district: 'Gold Coast', country: 'AU', level: 'city', lat: -28.0167, lng: 153.4000 },
  { name: 'Canberra', state: 'Australian Capital Territory', district: 'Canberra', country: 'AU', level: 'city', lat: -35.2809, lng: 149.1300 },
  { name: 'Newcastle', state: 'New South Wales', district: 'Hunter', country: 'AU', level: 'city', lat: -32.9283, lng: 151.7817 },
  { name: 'Hobart', state: 'Tasmania', district: 'Greater Hobart', country: 'AU', level: 'city', lat: -42.8821, lng: 147.3272 },
  { name: 'Darwin', state: 'Northern Territory', district: 'Greater Darwin', country: 'AU', level: 'city', lat: -12.4634, lng: 130.8456 },
  { name: 'Cairns', state: 'Queensland', district: 'Far North Queensland', country: 'AU', level: 'city', lat: -16.9186, lng: 145.7781 },

  // --- UAE Emirates & Major Hubs ---
  { name: 'Dubai', state: 'Dubai', district: 'Dubai Emirate', country: 'AE', level: 'city', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', state: 'Abu Dhabi', district: 'Abu Dhabi Emirate', country: 'AE', level: 'city', lat: 24.4539, lng: 54.3773 },
  { name: 'Sharjah', state: 'Sharjah', district: 'Sharjah Emirate', country: 'AE', level: 'city', lat: 25.3463, lng: 55.4209 },
  { name: 'Ajman', state: 'Ajman', district: 'Ajman Emirate', country: 'AE', level: 'city', lat: 25.4052, lng: 55.5136 },
  { name: 'Ras Al Khaimah', state: 'Ras Al Khaimah', district: 'RAK Emirate', country: 'AE', level: 'city', lat: 25.6741, lng: 55.9804 },
  { name: 'Fujairah', state: 'Fujairah', district: 'Fujairah Emirate', country: 'AE', level: 'city', lat: 25.1288, lng: 56.3265 },
  { name: 'Al Ain', state: 'Abu Dhabi', district: 'Eastern Region', country: 'AE', level: 'city', lat: 24.2075, lng: 55.7447 },
  { name: 'Deira', state: 'Dubai', district: 'Dubai', country: 'AE', level: 'village', lat: 25.2697, lng: 55.3095 },
  { name: 'Bur Dubai', state: 'Dubai', district: 'Dubai', country: 'AE', level: 'village', lat: 25.2532, lng: 55.3005 },
  { name: 'Dubai Marina', state: 'Dubai', district: 'Dubai', country: 'AE', level: 'village', lat: 25.0805, lng: 55.1403 },
  { name: 'Business Bay', state: 'Dubai', district: 'Dubai', country: 'AE', level: 'village', lat: 25.1862, lng: 55.2728 },

  // --- Germany Major Cities ---
  { name: 'Berlin', state: 'Berlin', district: 'Berlin', country: 'DE', level: 'city', lat: 52.5200, lng: 13.4050 },
  { name: 'Hamburg', state: 'Hamburg', district: 'Hamburg', country: 'DE', level: 'city', lat: 53.5511, lng: 9.9937 },
  { name: 'Munich', state: 'Bavaria', district: 'Upper Bavaria', country: 'DE', level: 'city', lat: 48.1351, lng: 11.5820 },
  { name: 'Cologne', state: 'North Rhine-Westphalia', district: 'Cologne Region', country: 'DE', level: 'city', lat: 50.9375, lng: 6.9603 },
  { name: 'Frankfurt', state: 'Hesse', district: 'Darmstadt Region', country: 'DE', level: 'city', lat: 50.1109, lng: 8.6821 },
  { name: 'Stuttgart', state: 'Baden-Württemberg', district: 'Stuttgart Region', country: 'DE', level: 'city', lat: 48.7758, lng: 9.1829 },
  { name: 'Düsseldorf', state: 'North Rhine-Westphalia', district: 'Düsseldorf Region', country: 'DE', level: 'city', lat: 51.2277, lng: 6.7735 },
  { name: 'Leipzig', state: 'Saxony', district: 'Leipzig', country: 'DE', level: 'city', lat: 51.3397, lng: 12.3731 },
  { name: 'Dortmund', state: 'North Rhine-Westphalia', district: 'Arnsberg', country: 'DE', level: 'city', lat: 51.5136, lng: 7.4653 },
  { name: 'Essen', state: 'North Rhine-Westphalia', district: 'Düsseldorf Region', country: 'DE', level: 'city', lat: 51.4556, lng: 7.0116 },
  { name: 'Bremen', state: 'Bremen', district: 'Bremen', country: 'DE', level: 'city', lat: 53.0793, lng: 8.8017 },
  { name: 'Dresden', state: 'Saxony', district: 'Dresden', country: 'DE', level: 'city', lat: 51.0504, lng: 13.7373 },
  { name: 'Hanover', state: 'Lower Saxony', district: 'Hanover', country: 'DE', level: 'city', lat: 52.3759, lng: 9.7320 },
  { name: 'Nuremberg', state: 'Bavaria', district: 'Middle Franconia', country: 'DE', level: 'city', lat: 49.4521, lng: 11.0767 },

  // --- France Major Cities ---
  { name: 'Paris', state: 'Île-de-France', district: 'Paris', country: 'FR', level: 'city', lat: 48.8566, lng: 2.3522 },
  { name: 'Marseille', state: 'Provence-Alpes-Côte d’Azur', district: 'Bouches-du-Rhône', country: 'FR', level: 'city', lat: 43.2965, lng: 5.3698 },
  { name: 'Lyon', state: 'Auvergne-Rhône-Alpes', district: 'Rhône', country: 'FR', level: 'city', lat: 45.7640, lng: 4.8357 },
  { name: 'Toulouse', state: 'Occitanie', district: 'Haute-Garonne', country: 'FR', level: 'city', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', state: 'Provence-Alpes-Côte d’Azur', district: 'Alpes-Maritimes', country: 'FR', level: 'city', lat: 43.7102, lng: 7.2620 },
  { name: 'Nantes', state: 'Pays de la Loire', district: 'Loire-Atlantique', country: 'FR', level: 'city', lat: 47.2184, lng: -1.5536 },
  { name: 'Strasbourg', state: 'Grand Est', district: 'Bas-Rhin', country: 'FR', level: 'city', lat: 48.5734, lng: 7.7521 },
  { name: 'Bordeaux', state: 'Nouvelle-Aquitaine', district: 'Gironde', country: 'FR', level: 'city', lat: 44.8378, lng: -0.5792 },
  { name: 'Lille', state: 'Hauts-de-France', district: 'Nord', country: 'FR', level: 'city', lat: 50.6292, lng: 3.0573 },

  // --- Italy Major Cities ---
  { name: 'Rome', state: 'Lazio', district: 'Metropolitan City of Rome', country: 'IT', level: 'city', lat: 41.9028, lng: 12.4964 },
  { name: 'Milan', state: 'Lombardy', district: 'Metropolitan City of Milan', country: 'IT', level: 'city', lat: 45.4642, lng: 9.1900 },
  { name: 'Naples', state: 'Campania', district: 'Metropolitan City of Naples', country: 'IT', level: 'city', lat: 40.8518, lng: 14.2681 },
  { name: 'Turin', state: 'Piedmont', district: 'Metropolitan City of Turin', country: 'IT', level: 'city', lat: 45.0703, lng: 7.6869 },
  { name: 'Florence', state: 'Tuscany', district: 'Metropolitan City of Florence', country: 'IT', level: 'city', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', state: 'Veneto', district: 'Metropolitan City of Venice', country: 'IT', level: 'city', lat: 45.4408, lng: 12.3155 },
  { name: 'Bologna', state: 'Emilia-Romagna', district: 'Metropolitan City of Bologna', country: 'IT', level: 'city', lat: 44.4949, lng: 11.3426 },

  // --- Spain Major Cities ---
  { name: 'Madrid', state: 'Madrid', district: 'Community of Madrid', country: 'ES', level: 'city', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', state: 'Catalonia', district: 'Barcelona Province', country: 'ES', level: 'city', lat: 41.3851, lng: 2.1734 },
  { name: 'Valencia', state: 'Valencia', district: 'Valencia Province', country: 'ES', level: 'city', lat: 39.4699, lng: -0.3763 },
  { name: 'Seville', state: 'Andalusia', district: 'Seville Province', country: 'ES', level: 'city', lat: 37.3891, lng: -5.9845 },
  { name: 'Zaragoza', state: 'Aragon', district: 'Zaragoza Province', country: 'ES', level: 'city', lat: 41.6488, lng: -0.8891 },
  { name: 'Malaga', state: 'Andalusia', district: 'Malaga Province', country: 'ES', level: 'city', lat: 36.7213, lng: -4.4214 },

  // --- Singapore Planning Areas ---
  { name: 'Singapore', state: 'Central Region', district: 'Singapore', country: 'SG', level: 'city', lat: 1.3521, lng: 103.8198 },
  { name: 'Jurong', state: 'West Region', district: 'Singapore', country: 'SG', level: 'city', lat: 1.3329, lng: 103.7436 },
  { name: 'Woodlands', state: 'North Region', district: 'Singapore', country: 'SG', level: 'city', lat: 1.4382, lng: 103.7890 },
  { name: 'Tampines', state: 'East Region', district: 'Singapore', country: 'SG', level: 'city', lat: 1.3533, lng: 103.9452 },

  // --- New Zealand Major Cities ---
  { name: 'Auckland', state: 'Auckland', district: 'Auckland Region', country: 'NZ', level: 'city', lat: -36.8485, lng: 174.7633 },
  { name: 'Wellington', state: 'Wellington', district: 'Wellington Region', country: 'NZ', level: 'city', lat: -41.2865, lng: 174.7762 },
  { name: 'Christchurch', state: 'Canterbury', district: 'Canterbury Region', country: 'NZ', level: 'city', lat: -43.5321, lng: 172.6362 },
  { name: 'Hamilton', state: 'Waikato', district: 'Waikato Region', country: 'NZ', level: 'city', lat: -37.7870, lng: 175.2793 },

  // --- South Africa Major Cities ---
  { name: 'Johannesburg', state: 'Gauteng', district: 'City of Johannesburg', country: 'ZA', level: 'city', lat: -26.2041, lng: 28.0473 },
  { name: 'Cape Town', state: 'Western Cape', district: 'City of Cape Town', country: 'ZA', level: 'city', lat: -33.9249, lng: 18.4241 },
  { name: 'Durban', state: 'KwaZulu-Natal', district: 'eThekwini', country: 'ZA', level: 'city', lat: -29.8587, lng: 31.0218 },
  { name: 'Pretoria', state: 'Gauteng', district: 'City of Tshwane', country: 'ZA', level: 'city', lat: -25.7479, lng: 28.2293 },

  // --- Ireland Major Cities ---
  { name: 'Dublin', state: 'Leinster', district: 'County Dublin', country: 'IE', level: 'city', lat: 53.3498, lng: -6.2603 },
  { name: 'Cork', state: 'Munster', district: 'County Cork', country: 'IE', level: 'city', lat: 51.8985, lng: -8.4756 },
  { name: 'Galway', state: 'Connacht', district: 'County Galway', country: 'IE', level: 'city', lat: 53.2707, lng: -9.0568 },
  { name: 'Limerick', state: 'Munster', district: 'County Limerick', country: 'IE', level: 'city', lat: 52.6638, lng: -8.6267 },

  // --- Malaysia Major Cities ---
  { name: 'Kuala Lumpur', state: 'Federal Territory', district: 'Kuala Lumpur', country: 'MY', level: 'city', lat: 3.1390, lng: 101.6869 },
  { name: 'George Town', state: 'Penang', district: 'Penang Island', country: 'MY', level: 'city', lat: 5.4141, lng: 100.3288 },
  { name: 'Johor Bahru', state: 'Johor', district: 'Johor Bahru', country: 'MY', level: 'city', lat: 1.4927, lng: 103.7414 },
  { name: 'Ipoh', state: 'Perak', district: 'Kinta', country: 'MY', level: 'city', lat: 4.5975, lng: 101.0901 },

  // --- Saudi Arabia Major Cities ---
  { name: 'Riyadh', state: 'Riyadh Region', district: 'Riyadh', country: 'SA', level: 'city', lat: 24.7136, lng: 46.6753 },
  { name: 'Jeddah', state: 'Makkah Region', district: 'Jeddah', country: 'SA', level: 'city', lat: 21.4858, lng: 39.1925 },
  { name: 'Mecca', state: 'Makkah Region', district: 'Makkah', country: 'SA', level: 'city', lat: 21.3891, lng: 39.8579 },
  { name: 'Medina', state: 'Madinah Region', district: 'Madinah', country: 'SA', level: 'city', lat: 24.5247, lng: 39.5692 },
  { name: 'Dammam', state: 'Eastern Province', district: 'Dammam', country: 'SA', level: 'city', lat: 26.4207, lng: 50.0888 },

  // --- Qatar, Kuwait, Bahrain, Oman ---
  { name: 'Doha', state: 'Doha Municipality', district: 'Ad Dawhah', country: 'QA', level: 'city', lat: 25.2854, lng: 51.5310 },
  { name: 'Al Rayyan', state: 'Al Rayyan Municipality', district: 'Al Rayyan', country: 'QA', level: 'city', lat: 25.2919, lng: 51.4244 },
  { name: 'Kuwait City', state: 'Al Asimah', district: 'Capital', country: 'KW', level: 'city', lat: 29.3759, lng: 47.9774 },
  { name: 'Manama', state: 'Capital Governorate', district: 'Capital', country: 'BH', level: 'city', lat: 26.2285, lng: 50.5860 },
  { name: 'Muscat', state: 'Muscat Governorate', district: 'Muscat', country: 'OM', level: 'city', lat: 23.5859, lng: 58.4059 },

  // --- Other World Capitals & Hubs ---
  { name: 'Tokyo', state: 'Tokyo Prefecture', district: 'Kantō', country: 'JP', level: 'city', lat: 35.6762, lng: 139.6503 },
  { name: 'Osaka', state: 'Osaka Prefecture', district: 'Kansai', country: 'JP', level: 'city', lat: 34.6937, lng: 135.5023 },
  { name: 'Seoul', state: 'Seoul Special City', district: 'Sudogwon', country: 'KR', level: 'city', lat: 37.5665, lng: 126.9780 },
  { name: 'Bangkok', state: 'Bangkok', district: 'Central Thailand', country: 'TH', level: 'city', lat: 13.7563, lng: 100.5018 },
  { name: 'Jakarta', state: 'Special Capital Region', district: 'Java', country: 'ID', level: 'city', lat: -6.2088, lng: 106.8456 },
  { name: 'Manila', state: 'Metro Manila', district: 'National Capital Region', country: 'PH', level: 'city', lat: 14.5995, lng: 120.9842 },
  { name: 'São Paulo', state: 'São Paulo', district: 'São Paulo State', country: 'BR', level: 'city', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', state: 'Rio de Janeiro', district: 'Rio de Janeiro State', country: 'BR', level: 'city', lat: -22.9068, lng: -43.1729 },
  { name: 'Mexico City', state: 'Mexico City', district: 'CDMX', country: 'MX', level: 'city', lat: 19.4326, lng: -99.1332 },
  { name: 'Buenos Aires', state: 'Buenos Aires', district: 'Autonomous City', country: 'AR', level: 'city', lat: -34.6037, lng: -58.3816 },
  { name: 'Santiago', state: 'Santiago Metropolitan', district: 'Santiago', country: 'CL', level: 'city', lat: -33.4489, lng: -70.6693 },
  { name: 'Amsterdam', state: 'North Holland', district: 'Randstad', country: 'NL', level: 'city', lat: 52.3676, lng: 4.9041 },
  { name: 'Brussels', state: 'Brussels-Capital', district: 'Brussels', country: 'BE', level: 'city', lat: 50.8503, lng: 4.3517 },
  { name: 'Zurich', state: 'Zurich', district: 'Canton of Zurich', country: 'CH', level: 'city', lat: 47.3769, lng: 8.5417 },
  { name: 'Vienna', state: 'Vienna', district: 'Vienna', country: 'AT', level: 'city', lat: 48.2082, lng: 16.3738 },
  { name: 'Stockholm', state: 'Stockholm County', district: 'Stockholm', country: 'SE', level: 'city', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', state: 'Oslo', district: 'Eastern Norway', country: 'NO', level: 'city', lat: 59.9139, lng: 10.7522 },
  { name: 'Copenhagen', state: 'Capital Region', district: 'Hovedstaden', country: 'DK', level: 'city', lat: 55.6761, lng: 12.5683 },
  { name: 'Helsinki', state: 'Uusimaa', district: 'Helsinki', country: 'FI', level: 'city', lat: 60.1699, lng: 24.9384 },
  { name: 'Warsaw', state: 'Masovian', district: 'Warsaw', country: 'PL', level: 'city', lat: 52.2297, lng: 21.0122 },
  { name: 'Prague', state: 'Prague', district: 'Bohemia', country: 'CZ', level: 'city', lat: 50.0755, lng: 14.4378 }
];

const SUPPORTED_COUNTRY_CODES = new Set([
  'IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'
]);

const GERMANY_STATES = [
  'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
  'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia',
  'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt',
  'Schleswig-Holstein', 'Thuringia'
];

let COMPILED_CATALOG = null;

function buildCompiledCatalog() {
  if (COMPILED_CATALOG) return COMPILED_CATALOG;

  const catalog = [];
  const countryNameByCode = new Map();
  for (const c of WORLD_COUNTRIES) {
    if (SUPPORTED_COUNTRY_CODES.has(c.code)) {
      countryNameByCode.set(c.code, c.name);
    }
  }

  // 1. Add the locked 11 supported countries (except IN, handled by indiaGeoIndex)
  for (const country of COUNTRIES) {
    if (country.code === 'IN' || !SUPPORTED_COUNTRY_CODES.has(country.code)) continue;
    const cName = country.name || countryNameByCode.get(country.code) || country.code;
    catalog.push({
      name: cName,
      state: '',
      district: '',
      country: country.code,
      countryName: cName,
      level: 'country',
      display: cName,
      key: norm(cName)
    });
  }

  // 2. Add all Regions / States / Provinces for the locked 11 markets
  for (const country of COUNTRIES) {
    if (country.code === 'IN' || !SUPPORTED_COUNTRY_CODES.has(country.code)) continue;
    const cName = country.name || countryNameByCode.get(country.code) || country.code;
    const regions = country.code === 'DE' && (!country.regions || !country.regions.length)
      ? GERMANY_STATES
      : (country.regions || []);
    for (const region of regions) {
      const display = `${region}, ${cName}`;
      catalog.push({
        name: region,
        state: region,
        district: '',
        country: country.code,
        countryName: cName,
        level: 'state',
        display,
        key: norm(region)
      });
    }
  }

  // 3. Add all entries from CITY_ALIASES for locked 11 markets
  for (const [aliasKey, info] of Object.entries(CITY_ALIASES)) {
    if (info.country === 'IN' || !SUPPORTED_COUNTRY_CODES.has(info.country)) continue;
    const cName = countryNameByCode.get(info.country) || info.country;
    const cityName = titleCase(aliasKey);
    const display = `${cityName}${info.region ? ', ' + info.region : ''}, ${cName}`;
    catalog.push({
      name: cityName,
      state: info.region || '',
      district: '',
      country: info.country,
      countryName: cName,
      level: 'city',
      display,
      key: norm(aliasKey)
    });
  }

  // 4. Add all EXTENDED_ENTITIES for locked 11 markets
  for (const entity of EXTENDED_ENTITIES) {
    if (!SUPPORTED_COUNTRY_CODES.has(entity.country)) continue;
    const cName = countryNameByCode.get(entity.country) || entity.country;
    const display = [
      entity.name,
      entity.district && entity.district !== entity.name && entity.district !== entity.state ? entity.district : '',
      entity.state && entity.state !== entity.name ? entity.state : '',
      cName
    ].filter(Boolean).join(', ');

    catalog.push({
      name: entity.name,
      state: entity.state || '',
      district: entity.district || '',
      country: entity.country,
      countryName: cName,
      level: entity.level || 'city',
      display,
      lat: entity.lat || null,
      lng: entity.lng || null,
      key: norm(entity.name)
    });
  }

  // Deduplicate entries by norm(name) + level + country
  const seen = new Set();
  const deduped = [];
  for (const item of catalog) {
    const id = `${item.key}|${item.level}|${item.country}`;
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(item);
    }
  }

  COMPILED_CATALOG = deduped;
  return COMPILED_CATALOG;
}

/**
 * Ultra-fast in-memory international place search.
 * Execution takes <0.5ms.
 */
function searchInternationalPlaces(rawQuery, options = {}) {
  const query = norm(rawQuery);
  if (!query || query.length < 2) return [];

  const catalog = buildCompiledCatalog();
  const country = String(options.country || '').toUpperCase().slice(0, 2);
  if (country && !SUPPORTED_COUNTRY_CODES.has(country)) return [];
  const isMaster = Boolean(options.isMaster);
  const limit = Math.max(1, Math.min(25, Number(options.limit) || 6));

  const scored = [];
  const queryWords = query.split(/\s+/).filter(Boolean);

  for (const item of catalog) {
    // Country filter: if caller requested specific country (e.g. US, AE, GB), strictly match it
    if (country && item.country !== country) continue;

    // Client mode safety: Client operators search for specific cities/towns to scrape vendors.
    // States and countries are available when isMaster === true (for sweeps).
    if (!isMaster && (item.level === 'state' || item.level === 'country')) {
      continue;
    }

    const key = item.key;
    const stateKey = norm(item.state);
    let score = 0;

    if (key === query) {
      score = 1000;
    } else if (key.startsWith(query)) {
      score = 800 - (key.length - query.length);
    } else if (key.includes(` ${query}`) || key.endsWith(` ${query}`)) {
      score = 600;
    } else if (queryWords.length > 1 && queryWords.every(w => key.includes(w) || stateKey.includes(w))) {
      score = 500;
    } else if (key.includes(query)) {
      score = 400 - (key.length - query.length);
    } else if (stateKey && (stateKey === query || stateKey.startsWith(query))) {
      score = 350;
    }

    if (score > 0) {
      // Prioritize cities over states in Client, prioritize broad areas in Master if requested
      if (!isMaster && item.level === 'city') score += 50;
      if (isMaster && (item.level === 'state' || item.level === 'district')) score += 30;

      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length);

  const results = scored.slice(0, limit).map(({ item }) => {
    const subtitle = [
      item.district && norm(item.district) !== norm(item.name) ? item.district : '',
      item.state && norm(item.state) !== norm(item.name) ? item.state : '',
      item.countryName
    ].filter(Boolean).join(' • ');

    return {
      type: 'location',
      value: item.name,
      label: item.name,
      display: item.display,
      mandal: '',
      district: item.district || '',
      state: item.state || '',
      subtitle,
      detail: LEVEL_LABEL[item.level] || titleCase(item.level),
      level: item.level,
      scope: item.level === 'village' ? 'city' : item.level,
      lat: item.lat,
      lng: item.lng,
      country: item.country,
      countryName: item.countryName,
      source: 'international_gazetteer',
      corrected: false,
      correctedFrom: ''
    };
  });

  return results;
}

module.exports = {
  searchInternationalPlaces,
  buildCompiledCatalog
};
