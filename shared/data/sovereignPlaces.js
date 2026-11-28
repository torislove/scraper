/**
 * shared/data/sovereignPlaces.js
 * Authoritative 5-Country Place Gazetteer (IN, US, GB, AU, AE) for Client City
 * and Master District/State disambiguation and automatic country switching.
 */

export const CLIENT_CITY_GAZETTEER = [
  { name: 'Hyderabad', label: 'Hyderabad City', state: 'Telangana', district: 'Hyderabad District', country: 'IN', aliases: ['hyd', 'hyderbad', 'secunderabad', 'cyberabad'] },
  { name: 'Guntur', label: 'Guntur City', state: 'Andhra Pradesh', district: 'Guntur District', country: 'IN', aliases: ['gnt', 'guntor', 'tenali', 'mangalagiri'] },
  { name: 'Vijayawada', label: 'Vijayawada City', state: 'Andhra Pradesh', district: 'NTR District', country: 'IN', aliases: ['vijaywada', 'bezawada'] },
  { name: 'Visakhapatnam', label: 'Visakhapatnam City', state: 'Andhra Pradesh', district: 'Visakhapatnam District', country: 'IN', aliases: ['vizag', 'visakapatnam'] },
  { name: 'Tirupati', label: 'Tirupati City', state: 'Andhra Pradesh', district: 'Tirupati District', country: 'IN', aliases: ['tirupathi'] },
  { name: 'Nellore', label: 'Nellore City', state: 'Andhra Pradesh', district: 'SPSR Nellore District', country: 'IN', aliases: [] },
  { name: 'Kakinada', label: 'Kakinada City', state: 'Andhra Pradesh', district: 'Kakinada District', country: 'IN', aliases: [] },
  { name: 'Rajahmundry', label: 'Rajahmundry City', state: 'Andhra Pradesh', district: 'East Godavari District', country: 'IN', aliases: ['rajamahendravaram'] },
  { name: 'Nizamabad', label: 'Nizamabad City', state: 'Telangana', district: 'Nizamabad District', country: 'IN', aliases: [] },
  { name: 'Khammam', label: 'Khammam City', state: 'Telangana', district: 'Khammam District', country: 'IN', aliases: [] },
  { name: 'Karimnagar', label: 'Karimnagar City', state: 'Telangana', district: 'Karimnagar District', country: 'IN', aliases: [] },
  { name: 'Bengaluru', label: 'Bengaluru City', state: 'Karnataka', district: 'Bengaluru Urban District', country: 'IN', aliases: ['bangalore', 'banglore', 'bengaluru'] },
  { name: 'Mumbai', label: 'Mumbai City', state: 'Maharashtra', district: 'Mumbai Suburban District', country: 'IN', aliases: ['bombay', 'mumbai'] },
  { name: 'Pune', label: 'Pune City', state: 'Maharashtra', district: 'Pune District', country: 'IN', aliases: ['poona', 'pimpri'] },
  { name: 'Nagpur', label: 'Nagpur City', state: 'Maharashtra', district: 'Nagpur District', country: 'IN', aliases: [] },
  { name: 'Delhi', label: 'New Delhi / NCR', state: 'Delhi NCR', district: 'Central Delhi District', country: 'IN', aliases: ['new delhi', 'ncr', 'gurugram', 'noida', 'gurgaon'] },
  { name: 'Chennai', label: 'Chennai City', state: 'Tamil Nadu', district: 'Chennai District', country: 'IN', aliases: ['madras'] },
  { name: 'Coimbatore', label: 'Coimbatore City', state: 'Tamil Nadu', district: 'Coimbatore District', country: 'IN', aliases: [] },
  { name: 'Madurai', label: 'Madurai City', state: 'Tamil Nadu', district: 'Madurai District', country: 'IN', aliases: [] },
  { name: 'Kolkata', label: 'Kolkata City', state: 'West Bengal', district: 'Kolkata District', country: 'IN', aliases: ['calcutta'] },
  { name: 'Ahmedabad', label: 'Ahmedabad City', state: 'Gujarat', district: 'Ahmedabad District', country: 'IN', aliases: ['ahmadabad'] },
  { name: 'Vadodara', label: 'Vadodara City', state: 'Gujarat', district: 'Vadodara District', country: 'IN', aliases: ['baroda'] },
  { name: 'Surat', label: 'Surat City', state: 'Gujarat', district: 'Surat District', country: 'IN', aliases: [] },
  { name: 'Jaipur', label: 'Jaipur City', state: 'Rajasthan', district: 'Jaipur District', country: 'IN', aliases: [] },
  { name: 'Lucknow', label: 'Lucknow City', state: 'Uttar Pradesh', district: 'Lucknow District', country: 'IN', aliases: [] },
  { name: 'Indore', label: 'Indore City', state: 'Madhya Pradesh', district: 'Indore District', country: 'IN', aliases: [] },
  { name: 'Kochi', label: 'Kochi City', state: 'Kerala', district: 'Ernakulam District', country: 'IN', aliases: ['cochin', 'ernakulam'] },
  { name: 'Warangal', label: 'Warangal City', state: 'Telangana', district: 'Warangal District', country: 'IN', aliases: ['hanamkonda'] },

  { name: 'Dallas', label: 'Dallas City', state: 'Texas', district: 'Dallas County', country: 'US', aliases: ['dallas'] },
  { name: 'Austin', label: 'Austin City', state: 'Texas', district: 'Travis County', country: 'US', aliases: ['austin'] },
  { name: 'Houston', label: 'Houston City', state: 'Texas', district: 'Harris County', country: 'US', aliases: ['houston'] },
  { name: 'New York', label: 'New York City', state: 'New York', district: 'New York County', country: 'US', aliases: ['nyc', 'manhattan', 'brooklyn', 'queens'] },
  { name: 'Chicago', label: 'Chicago City', state: 'Illinois', district: 'Cook County', country: 'US', aliases: [] },
  { name: 'Miami', label: 'Miami City', state: 'Florida', district: 'Miami-Dade County', country: 'US', aliases: [] },
  { name: 'Los Angeles', label: 'Los Angeles City', state: 'California', district: 'Los Angeles County', country: 'US', aliases: ['los angeles', 'la'] },
  { name: 'Atlanta', label: 'Atlanta City', state: 'Georgia', district: 'Fulton County', country: 'US', aliases: [] },
  { name: 'San Francisco', label: 'San Francisco', state: 'California', district: 'San Francisco County', country: 'US', aliases: ['san francisco'] },
  { name: 'Seattle', label: 'Seattle City', state: 'Washington', district: 'King County', country: 'US', aliases: [] },
  { name: 'Boston', label: 'Boston City', state: 'Massachusetts', district: 'Suffolk County', country: 'US', aliases: [] },
  { name: 'Phoenix', label: 'Phoenix City', state: 'Arizona', district: 'Maricopa County', country: 'US', aliases: [] },
  { name: 'Orlando', label: 'Orlando City', state: 'Florida', district: 'Orange County', country: 'US', aliases: [] },
  { name: 'San Diego', label: 'San Diego City', state: 'California', district: 'San Diego County', country: 'US', aliases: [] },
  { name: 'Denver', label: 'Denver City', state: 'Colorado', district: 'Denver County', country: 'US', aliases: [] },
  { name: 'Charlotte', label: 'Charlotte City', state: 'North Carolina', district: 'Mecklenburg County', country: 'US', aliases: [] },

  { name: 'London', label: 'London', state: 'Greater London', district: 'Greater London', country: 'GB', aliases: ['lndn', 'londn', 'westminster', 'camden', 'croydon', 'hackney'] },
  { name: 'Manchester', label: 'Manchester City', state: 'Greater Manchester', district: 'Greater Manchester', country: 'GB', aliases: [] },
  { name: 'Birmingham', label: 'Birmingham City', state: 'West Midlands', district: 'West Midlands', country: 'GB', aliases: [] },
  { name: 'Leeds', label: 'Leeds City', state: 'West Yorkshire', district: 'West Yorkshire', country: 'GB', aliases: [] },
  { name: 'Edinburgh', label: 'Edinburgh City', state: 'Scotland', district: 'City of Edinburgh', country: 'GB', aliases: [] },
  { name: 'Glasgow', label: 'Glasgow City', state: 'Scotland', district: 'Glasgow City', country: 'GB', aliases: [] },
  { name: 'Bristol', label: 'Bristol City', state: 'South West England', district: 'Bristol', country: 'GB', aliases: [] },
  { name: 'Liverpool', label: 'Liverpool City', state: 'Merseyside', district: 'Merseyside', country: 'GB', aliases: [] },
  { name: 'Oxford', label: 'Oxford City', state: 'Oxfordshire', district: 'Oxfordshire', country: 'GB', aliases: [] },
  { name: 'Cambridge', label: 'Cambridge City', state: 'Cambridgeshire', district: 'Cambridgeshire', country: 'GB', aliases: [] },
  { name: 'Brighton', label: 'Brighton', state: 'East Sussex', district: 'Brighton and Hove', country: 'GB', aliases: [] },
  { name: 'Nottingham', label: 'Nottingham City', state: 'Nottinghamshire', district: 'Nottinghamshire', country: 'GB', aliases: [] },
  { name: 'Sheffield', label: 'Sheffield City', state: 'South Yorkshire', district: 'South Yorkshire', country: 'GB', aliases: [] },

  { name: 'Sydney', label: 'Sydney', state: 'New South Wales', district: 'Greater Sydney', country: 'AU', aliases: ['sydeny'] },
  { name: 'Melbourne', label: 'Melbourne', state: 'Victoria', district: 'Greater Melbourne', country: 'AU', aliases: ['melborn'] },
  { name: 'Brisbane', label: 'Brisbane', state: 'Queensland', district: 'City of Brisbane', country: 'AU', aliases: [] },
  { name: 'Perth', label: 'Perth', state: 'Western Australia', district: 'Greater Perth', country: 'AU', aliases: [] },
  { name: 'Adelaide', label: 'Adelaide', state: 'South Australia', district: 'Greater Adelaide', country: 'AU', aliases: [] },
  { name: 'Canberra', label: 'Canberra', state: 'Australian Capital Territory', district: 'ACT', country: 'AU', aliases: [] },
  { name: 'Parramatta', label: 'Parramatta', state: 'New South Wales', district: 'City of Parramatta', country: 'AU', aliases: [] },
  { name: 'Gold Coast', label: 'Gold Coast', state: 'Queensland', district: 'City of Gold Coast', country: 'AU', aliases: [] },
  { name: 'Geelong', label: 'Geelong', state: 'Victoria', district: 'City of Greater Geelong', country: 'AU', aliases: [] },
  { name: 'Hobart', label: 'Hobart', state: 'Tasmania', district: 'Greater Hobart', country: 'AU', aliases: [] },

  { name: 'Dubai', label: 'Dubai', state: 'Dubai Emirate', district: 'Dubai Emirate', country: 'AE', aliases: ['dubay', 'business bay', 'jafza', 'deira', 'jumeirah', 'marina'] },
  { name: 'Abu Dhabi', label: 'Abu Dhabi', state: 'Abu Dhabi Emirate', district: 'Abu Dhabi Region', country: 'AE', aliases: ['al ain', 'mussafah'] },
  { name: 'Sharjah', label: 'Sharjah', state: 'Sharjah Emirate', district: 'Sharjah Emirate', country: 'AE', aliases: [] },
  { name: 'Ajman', label: 'Ajman', state: 'Ajman Emirate', district: 'Ajman Emirate', country: 'AE', aliases: [] },
  { name: 'Ras Al Khaimah', label: 'Ras Al Khaimah', state: 'Ras Al Khaimah Emirate', district: 'Ras Al Khaimah Emirate', country: 'AE', aliases: ['rak'] }
];

const MASTER_EXTRA_TOKENS = [
  { token: 'andhra pradesh', country: 'IN', label: 'Andhra Pradesh' },
  { token: 'telangana', country: 'IN', label: 'Telangana' },
  { token: 'maharashtra', country: 'IN', label: 'Maharashtra' },
  { token: 'karnataka', country: 'IN', label: 'Karnataka' },
  { token: 'tamil nadu', country: 'IN', label: 'Tamil Nadu' },
  { token: 'gujarat', country: 'IN', label: 'Gujarat' },
  { token: 'rajasthan', country: 'IN', label: 'Rajasthan' },
  { token: 'uttar pradesh', country: 'IN', label: 'Uttar Pradesh' },
  { token: 'west bengal', country: 'IN', label: 'West Bengal' },
  { token: 'kerala', country: 'IN', label: 'Kerala' },
  { token: 'ntr district', country: 'IN', label: 'NTR District, Andhra Pradesh' },
  { token: 'krishna district', country: 'IN', label: 'Krishna District, Andhra Pradesh' },
  { token: 'rangareddy', country: 'IN', label: 'Rangareddy District, Telangana' },
  { token: 'texas', country: 'US', label: 'Texas' },
  { token: 'texa', country: 'US', label: 'Texas' },
  { token: 'txas', country: 'US', label: 'Texas' },
  { token: 'california', country: 'US', label: 'California' },
  { token: 'florida', country: 'US', label: 'Florida' },
  { token: 'illinois', country: 'US', label: 'Illinois' },
  { token: 'new york', country: 'US', label: 'New York' },
  { token: 'harris county', country: 'US', label: 'Harris County, Texas' },
  { token: 'dallas county', country: 'US', label: 'Dallas County, Texas' },
  { token: 'travis county', country: 'US', label: 'Travis County, Texas' },
  { token: 'england', country: 'GB', label: 'England' },
  { token: 'scotland', country: 'GB', label: 'Scotland' },
  { token: 'greater london', country: 'GB', label: 'Greater London, England' },
  { token: 'greater manchester', country: 'GB', label: 'Greater Manchester, England' },
  { token: 'kent', country: 'GB', label: 'Kent, England' },
  { token: 'new south wales', country: 'AU', label: 'New South Wales' },
  { token: 'victoria', country: 'AU', label: 'Victoria' },
  { token: 'queensland', country: 'AU', label: 'Queensland' }
];

function matchWordBoundary(haystack, needle) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s,])${esc}(?:$|[\\s,])`, 'i').test(haystack);
}

export function findSovereignPlace(rawLoc = '') {
  const clean = String(rawLoc || '').trim();
  if (!clean || clean.length < 3) return null;
  const low = clean.toLowerCase();

  for (const p of CLIENT_CITY_GAZETTEER) {
    if (p.name.toLowerCase() === low || p.district.toLowerCase() === low) return p;
    if (p.aliases?.some((a) => a.length >= 4 && a === low)) return p;
  }
  for (const p of CLIENT_CITY_GAZETTEER) {
    if (matchWordBoundary(low, p.name) || matchWordBoundary(low, p.district)) return p;
    if (p.aliases?.some((a) => a.length >= 4 && matchWordBoundary(low, a))) return p;
  }
  return null;
}

export function detectCountryForText(rawText = '') {
  const clean = String(rawText || '').trim();
  if (!clean || clean.length < 3) return null;
  const hit = findSovereignPlace(clean);
  if (hit) return { country: hit.country, place: hit };

  const low = clean.toLowerCase();
  for (const m of MASTER_EXTRA_TOKENS) {
    if (matchWordBoundary(low, m.token)) {
      return { country: m.country, place: { name: m.label, label: m.label, state: m.label, district: m.label, country: m.country } };
    }
  }
  return null;
}

export function formatPlaceDisplay(rawLoc = '', country = 'IN', isMaster = false) {
  const clean = String(rawLoc || '').trim();
  if (!clean) return '';
  if (clean.includes(',')) return clean;
  const hit = findSovereignPlace(clean);
  if (!hit || (country && hit.country !== String(country).toUpperCase())) return clean;
  if (isMaster) {
    if (hit.district && hit.state && hit.district !== hit.state) return `${hit.district}, ${hit.state}`;
    return hit.district || clean;
  }
  if (hit.label && hit.state && hit.label !== hit.state) return `${hit.label}, ${hit.state}`;
  return hit.label || clean;
}
