'use strict';

/**
 * server/src/services/addressParser.js
 * Multi-Country Structured Address Parser across IN, US, GB, AU, AE.
 * Extracts streetToken, area/locality, city, state/emirate/county, postalCode, and country
 * without stamping Search Zone metadata into city or locality.
 */

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);
const US_STATE_NAMES = {
  texas: 'TX', california: 'CA', florida: 'FL', 'new york': 'NY', illinois: 'IL', georgia: 'GA',
  washington: 'WA', arizona: 'AZ', colorado: 'CO', massachusetts: 'MA', oklahoma: 'OK', louisiana: 'LA',
  'new mexico': 'NM', arkansas: 'AR'
};

const IN_STATES = [
  'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat',
  'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Madhya Pradesh', 'Punjab', 'Haryana',
  'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Goa', 'Chandigarh'
];

const AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);
const AU_STATE_NAMES = {
  nsw: 'NSW', 'new south wales': 'NSW',
  vic: 'VIC', victoria: 'VIC',
  qld: 'QLD', queensland: 'QLD',
  wa: 'WA', 'western australia': 'WA',
  sa: 'SA', 'south australia': 'SA',
  tas: 'TAS', tasmania: 'TAS',
  act: 'ACT', 'australian capital territory': 'ACT',
  nt: 'NT', 'northern territory': 'NT'
};
const AE_EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

function extractStreetToken(rawAddress = '') {
  const m = String(rawAddress || '').match(/\b(\d{1,6})\s+([a-z0-9]{3,})/i);
  return m ? `${m[1]} ${m[2].toLowerCase()}` : '';
}

function parseAddress(rawAddress = '', countryCode = 'IN', fallbackCity = '') {
  const addr = String(rawAddress || '').replace(/\s+/g, ' ').trim();
  const cc = String(countryCode || 'IN').toUpperCase();
  const out = {
    area: '',
    city: '',
    state: '',
    postalCode: '',
    country: cc,
    streetToken: extractStreetToken(addr)
  };
  if (!addr) {
    out.city = String(fallbackCity || '').trim();
    return out;
  }

  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);

  if (cc === 'US' || cc === 'CA') {
    const zipMatch = addr.match(/\b(\d{5})(?:-\d{4})?\b/) || addr.match(/\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i);
    if (zipMatch) out.postalCode = zipMatch[1].toUpperCase();
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i].replace(/\b\d{5}(?:-\d{4})?\b/g, '').trim();
      if (/^(?:usa|united states|us|canada|ca)$/i.test(seg)) continue;
      const stCode = seg.toUpperCase();
      if (US_STATES.has(stCode)) { out.state = stCode; continue; }
      const stFull = US_STATE_NAMES[seg.toLowerCase()];
      if (stFull) { out.state = stFull; continue; }
      const combo = seg.match(/^(.+?)\s+([A-Z]{2})$/);
      if (combo && US_STATES.has(combo[2])) {
        out.state = combo[2];
        if (!out.city) out.city = combo[1].trim();
        continue;
      }
      if (!out.city && seg && !/^\d/.test(seg) && seg.length <= 40) {
        out.city = seg;
      } else if (out.city && !out.area && i > 0 && !/^\d/.test(seg) && seg.length <= 40) {
        out.area = seg;
      }
    }
    if (!out.city && fallbackCity) out.city = fallbackCity;
    return out;
  }

  if (cc === 'IN') {
    const pin = addr.match(/\b([1-8]\d{5})\b/);
    if (pin) out.postalCode = pin[1];
    for (const st of IN_STATES) {
      if (new RegExp(`\\b${st}\\b`, 'i').test(addr)) { out.state = st; break; }
    }
    const cleanParts = parts
      .map((p) => p.replace(/\b[1-8]\d{5}\b/g, '').replace(/\bIndia\b/gi, '').trim())
      .filter((p) => p && !IN_STATES.some((s) => s.toLowerCase() === p.toLowerCase()));
    if (cleanParts.length >= 2) {
      out.city = cleanParts[cleanParts.length - 1];
      out.area = cleanParts[cleanParts.length - 2];
    } else if (cleanParts.length === 1) {
      out.city = cleanParts[0];
    }
    if (!out.city && fallbackCity) out.city = fallbackCity;
    return out;
  }

  if (cc === 'GB') {
    const ukPost = addr.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
    if (ukPost) {
      const compact = ukPost[1].toUpperCase().replace(/\s+/g, '');
      out.postalCode = compact.length > 4 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
    }
    const cleanParts = parts
      .map((p) => p.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, '').replace(/\b(?:UK|United Kingdom|England|Scotland|Wales)\b/gi, '').replace(/\blondon\s+colony\b/gi, 'London').trim())
      .filter(Boolean);
    if (cleanParts.length >= 2) {
      out.city = cleanParts[cleanParts.length - 1];
      out.area = cleanParts[cleanParts.length - 2];
    } else if (cleanParts.length === 1) {
      out.city = cleanParts[0];
    }
    if (/\b(?:london\s+colony|greater\s+london)\b/i.test(out.city)) out.city = 'London';
    if (!out.city && /\blondon\b/i.test(addr)) out.city = 'London';
    if (!out.city && fallbackCity) out.city = /\blondon\s+colony\b/i.test(fallbackCity) ? 'London' : fallbackCity;
    if (/\bscotland\b/i.test(addr)) out.state = 'Scotland';
    else if (/\bwales\b/i.test(addr)) out.state = 'Wales';
    else if (/\blondon\b/i.test(addr) || /^london$/i.test(out.city)) out.state = 'Greater London';
    else out.state = 'England';
    return out;
  }

  if (cc === 'AU') {
    const m = addr.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})\b/i);
    if (m) {
      out.state = m[1].toUpperCase();
      out.postalCode = m[2];
    } else {
      const pc = addr.match(/\b(\d{4})\b/);
      if (pc) out.postalCode = pc[1];
    }
    const cleanParts = parts
      .map((p) => p.replace(/\b(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/gi, '').replace(/\b\d{4}\b/g, '').replace(/\bAustralia\b/gi, '').trim())
      .filter(Boolean);
    if (cleanParts.length >= 2) {
      out.city = cleanParts[cleanParts.length - 1];
      out.area = cleanParts[cleanParts.length - 2];
    } else if (cleanParts.length === 1) {
      out.city = cleanParts[0];
    }
    if (!out.city && fallbackCity) out.city = fallbackCity;
    return out;
  }

  if (cc === 'AE') {
    for (const em of AE_EMIRATES) {
      if (new RegExp(`\\b${em}\\b`, 'i').test(addr)) { out.state = em; break; }
    }
    const cleanParts = parts
      .map((p) => p.replace(/\b(?:UAE|United Arab Emirates)\b/gi, '').trim())
      .filter(Boolean);
    if (cleanParts.length >= 2) {
      out.city = out.state || cleanParts[cleanParts.length - 1];
      out.area = cleanParts[cleanParts.length - 2];
    } else if (cleanParts.length === 1) {
      out.city = out.state || cleanParts[0];
    }
    if (!out.city && fallbackCity) out.city = fallbackCity;
    return out;
  }

  // Generic postal code & city extraction for any of the 195+ countries
  if (!out.postalCode) {
    const pcMatch = addr.match(/\b([A-Z\d]{2,4}[-\s]?[A-Z\d]{2,4})\b/i) || addr.match(/\b(\d{4,6})\b/);
    if (pcMatch) out.postalCode = pcMatch[1];
  }
  if (!out.city && parts.length >= 2) {
    out.city = parts[parts.length - 1].replace(/^[,\s-]+|[,\s-]+$/g, '');
    out.area = parts[parts.length - 2].replace(/^[,\s-]+|[,\s-]+$/g, '');
  }

  if (!out.city && fallbackCity) out.city = fallbackCity;
  return out;
}

module.exports = {
  US_STATES,
  US_STATE_NAMES,
  AU_STATES,
  AU_STATE_NAMES,
  extractStreetToken,
  parseAddress
};
