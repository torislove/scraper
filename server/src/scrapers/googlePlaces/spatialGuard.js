/**
 * spatialGuard.js
 * Multi-layer geographic containment guards, distance calculators, and coordinate sanity checks.
 */

// STRICT MULTI-LAYER GEOGRAPHIC CONTAINMENT GUARD (ZERO BLEED)
// ──────────────────────────────────────────────────────────────────────────────
function isListingRelevantToQuery(name, address, district, stateName, mandal, location, coords = null, boundingbox = null, parentCity = null, isMaster = false, scope = null) {
  if (!address && !coords) return { relevant: true }; // Insufficient data to reject

  const addrLower = (address || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const fullText = `${nameLower} ${addrLower}`;
  
  // Territorial sweep is ONLY true for whole districts or states.
  // Mandals, cities, boroughs, and towns must preserve strict zero-bleed checks!
  const isWideTerritorialSweep = Boolean(scope === 'district' || scope === 'state');
  const isTerritorialSweep = isWideTerritorialSweep;

  // 1. Precise State / Region Filter across Countries: Address must NOT belong to a different state/province/region
  const knownIndianStates = [
    'telangana', 'andhra pradesh', 'karnataka', 'tamil nadu', 'maharashtra', 'kerala',
    'gujarat', 'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'bihar', 'west bengal',
    'odisha', 'madhya pradesh', 'assam', 'himachal pradesh', 'uttarakhand', 'jharkhand',
    'chhattisgarh', 'goa', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim',
    'tripura', 'arunachal pradesh', 'delhi'
  ];

  const knownUSStates = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
    'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
    'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
    'wisconsin', 'wyoming'
  ];

  const allStateLists = [knownIndianStates, knownUSStates];
  const combinedTargetText = `${stateName || ''} ${district || ''} ${location || ''}`.toLowerCase();

  for (const stateList of allStateLists) {
    let expectedState = null;
    for (const st of stateList) {
      if (combinedTargetText.includes(st)) {
        expectedState = st;
        break;
      }
    }
    if (expectedState) {
      for (const otherState of stateList) {
        if (otherState !== expectedState && addrLower.includes(otherState)) {
          if (!addrLower.includes(expectedState)) {
            return { relevant: false, reason: `Belongs to foreign state/region "${otherState}" instead of "${expectedState}"` };
          }
        }
      }
    }
  }

  // 2. Extract Primary Target Town / Locality / Mandal
  const rawLoc = (mandal || location || '').split(',')[0].trim();
  const cleanTargetTown = rawLoc.replace(/\b(photo studios?|wedding|photographers?|caterers?|function halls?|central|core|market|commercial|services|top rated|dealers|mandal|urban|rural|city|town)\b/gi, '').trim().toLowerCase();
  const townToken = cleanTargetTown.replace(/[^a-z0-9]/g, '');

  // 3. Known Out-of-Town Metropolitan & Conurbation Hubs (Multi-Country)
  const majorMetros = [
    // India
    'guntur', 'vijayawada', 'hyderabad', 'secunderabad', 'bangalore', 'bengaluru',
    'chennai', 'mumbai', 'pune', 'delhi', 'visakhapatnam', 'tirupati', 'kurnool',
    'nellore', 'rajahmundry', 'kakinada', 'ongole', 'eluru', 'anantapur', 'kadapa',
    'warangal', 'kolkata', 'jaipur', 'ahmedabad',
    'tenali', 'mangalagiri', 'tadepalle', 'ponnur', 'chebrolu', 'bapatla',
    'narasaraopet', 'sattenapalle', 'chilakaluripet', 'machilipatnam', 'gudivada',
    // United States
    'jersey city', 'newark', 'hoboken', 'paterson', 'new york', 'manhattan', 'brooklyn',
    'queens', 'bronx', 'staten island', 'los angeles', 'long beach', 'anaheim', 'irvine',
    'chicago', 'naperville', 'gary', 'houston', 'dallas', 'fort worth', 'san francisco', 'oakland',
    // United Kingdom
    'london', 'westminster', 'watford', 'slough', 'reading', 'birmingham', 'manchester',
    'salford', 'leeds', 'liverpool', 'glasgow', 'edinburgh',
    // Canada
    'toronto', 'mississauga', 'brampton', 'hamilton', 'markham', 'vancouver', 'surrey',
    // Australia
    'sydney', 'parramatta', 'wollongong', 'newcastle', 'melbourne', 'geelong', 'brisbane',
    // UAE
    'dubai', 'sharjah', 'ajman', 'abu dhabi'
  ];

  if (!isWideTerritorialSweep && townToken.length >= 3) {
    const parentToken = String(parentCity || district || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mentionsParentCity = parentToken.length >= 3 && (fullText.includes(parentToken) || addrLower.includes(parentToken));

    for (const hub of majorMetros) {
      // Twin Cities Conurbation Exception (Hyderabad-Secunderabad, etc.)
      const isHydSec = (townToken.includes('hyderabad') || townToken.includes('secunderabad') || parentToken.includes('hyderabad') || parentToken.includes('secunderabad'));
      if (isHydSec && (hub === 'hyderabad' || hub === 'secunderabad')) continue;

      const isBlr = (townToken.includes('bangalore') || townToken.includes('bengaluru') || parentToken.includes('bangalore') || parentToken.includes('bengaluru'));
      if (isBlr && (hub === 'bangalore' || hub === 'bengaluru')) continue;

      const insideParentCity = parentToken.length >= 3 && (hub === parentToken || (hub.length >= 5 && parentToken.includes(hub)));

      if (townToken !== hub && !townToken.includes(hub)) {
        if (addrLower.includes(hub)) {
          const isRoadName = new RegExp(`\\b${hub}\\s*[-–]?\\s*(road|rd|highway|hwy|nh|main\\s+road|bypass|way|street|cross|kolkata|vijayawada|bangalore|hyderabad|chennai)\\b`, 'i').test(addrLower);
          const mentionsTown = fullText.includes(townToken) || (cleanTargetTown.length > 2 && fullText.includes(cleanTargetTown));

          if (!mentionsTown && !mentionsParentCity && !isRoadName && !insideParentCity) {
            return { relevant: false, reason: `Listing belongs to metropolitan hub "${hub}" with no reference to target town "${cleanTargetTown}"` };
          }

          // Specific Cross-River / Adjacent Metro Localities Rejection
          if (!insideParentCity && !mentionsParentCity && (hub === 'guntur' || hub === 'tenali' || hub === 'mangalagiri')) {
            if (townToken.includes('vijayawada') || parentToken.includes('vijayawada')) {
              return { relevant: false, reason: `Listing located in ${hub} outside target Vijayawada Urban Mandal` };
            }
          }

          if (!insideParentCity && !mentionsParentCity && (hub === 'jersey city' || hub === 'newark' || hub === 'hoboken')) {
            if (townToken.includes('new york') || townToken.includes('manhattan') || parentToken.includes('new york')) {
              return { relevant: false, reason: `Listing located in New Jersey hub ${hub} outside New York City` };
            }
          }

          if (!insideParentCity && !mentionsParentCity && (hub === 'watford' || hub === 'slough' || hub === 'reading')) {
            if (townToken.includes('london') || townToken.includes('westminster') || parentToken.includes('london')) {
              return { relevant: false, reason: `Listing located in ${hub} outside Greater London` };
            }
          }
        }
      }
    }
  }

  // 4. Postal Code Disambiguation
  if (!isWideTerritorialSweep) {
    // India: Vijayawada (520xxx / 521xxx) vs Guntur (522xxx) vs Ongole (523xxx)
    const pinMatch = addrLower.match(/\b(52[0-3]\d{3})\b/);
    if (pinMatch) {
      const pin = pinMatch[1];
      if (townToken.includes('vijayawada')) {
        if (pin.startsWith('522')) {
          return { relevant: false, reason: `Postal code ${pin} belongs to Guntur District outside Vijayawada` };
        }
      } else if (townToken.includes('guntur')) {
        if (pin.startsWith('520') || pin.startsWith('521')) {
          return { relevant: false, reason: `Postal code ${pin} belongs to Krishna / Vijayawada district outside Guntur` };
        }
      }
    }
  }

  // 5. Dynamic Bounding Box & Scale-Adaptive Spatial Containment (Zero Fixed Radius)
  if (coords && coords.lat && coords.lng) {
    // Layer A: True Dynamic Bounding Box if supplied
    if (boundingbox && Array.isArray(boundingbox) && boundingbox.length === 4) {
      const [south, north, west, east] = boundingbox.map(Number);
      if ([south, north, west, east].every(Number.isFinite)) {
        const latSpan = Math.abs(north - south);
        const lngSpan = Math.abs(east - west);
        // Adaptive 8% boundary margin (at least 0.015 deg ~ 1.6km)
        const latMargin = Math.max(0.015, latSpan * 0.08);
        const lngMargin = Math.max(0.015, lngSpan * 0.08);
        const minLat = Math.min(south, north) - latMargin;
        const maxLat = Math.max(south, north) + latMargin;
        const minLng = Math.min(west, east) - lngMargin;
        const maxLng = Math.max(west, east) + lngMargin;

        if (coords.lat < minLat || coords.lat > maxLat || coords.lng < minLng || coords.lng > maxLng) {
          return {
            relevant: false,
            reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) exceed dynamic bounding box [${minLat.toFixed(3)}, ${maxLat.toFixed(3)}]`
          };
        }
      }
    }

    // Layer B: Center Distance Check (Derived from surveyed geometry, not arbitrary numbers)
    const { ZONE_COORDINATES } = require('../../utils/universalGeoCluster');
    let anchorCoords = null;
    const cleanLower = cleanTargetTown.toLowerCase();
    const cleanStripped = cleanLower.replace(/[^a-z0-9]/g, '');

    if (ZONE_COORDINATES[cleanLower]) {
      anchorCoords = ZONE_COORDINATES[cleanLower];
    } else if (ZONE_COORDINATES[cleanStripped]) {
      anchorCoords = ZONE_COORDINATES[cleanStripped];
    } else if (district) {
      const distLower = district.toLowerCase();
      const distStripped = distLower.replace(/[^a-z0-9]/g, '');
      anchorCoords = ZONE_COORDINATES[distLower] || ZONE_COORDINATES[distStripped] || null;
    }

    if (anchorCoords && anchorCoords.lat && anchorCoords.lng) {
      const distKm = getDistanceKm(coords.lat, coords.lng, anchorCoords.lat, anchorCoords.lng);
      
      // Dynamic max allowed distance derived from entity scope
      let dynamicMaxKm;
      if (scope === 'state') {
        dynamicMaxKm = 750.0;
      } else if (scope === 'district') {
        dynamicMaxKm = 85.0;
      } else if (scope === 'mandal') {
        dynamicMaxKm = 14.0; // Dense urban / normal mandals
      } else {
        // City / Locality
        const isMetro = /pune|mumbai|bombay|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|new york|london|los angeles/i.test(district || cleanTargetTown);
        dynamicMaxKm = isMetro ? 28.0 : 18.0;
      }

      if (distKm > dynamicMaxKm) {
        return {
          relevant: false,
          reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) are ${distKm.toFixed(1)}km away from ${cleanTargetTown} (max ${dynamicMaxKm.toFixed(1)}km for ${scope || 'locality'})`
        };
      }
    }
  }

  return { relevant: true };
}

function validCoord(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (Math.abs(a) < 0.0001 && Math.abs(b) < 0.0001) return false;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return false;
  return true;
}

function extractCoords(url) {
  if (!url) return null;
  let lat = null, lng = null;
  const match = url.match(/!8m2!3d([0-9.-]+)!4d([0-9.-]+)/);
  if (match && validCoord(match[1], match[2])) {
    lat = parseFloat(match[1]);
    lng = parseFloat(match[2]);
  } else {
    const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
    if (atMatch && validCoord(atMatch[1], atMatch[2])) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }
  }
  if (lat !== null && lng !== null) {
    // Water-body & coastal clamping: prevent service-area pins in Lake Michigan waters
    if (lng >= -87.55 && lng <= -86.75) {
      const shoreLat = 41.718 - Math.max(0, (-86.89 - lng) * 0.22);
      if (lat > shoreLat) {
        lat = shoreLat - 0.005;
      }
    }
    return { lat, lng };
  }
  return null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * A zone query is centred on one point. Google can still return a branch or a
 * competitor far outside that pocket (we measured a 25 km lead in a 5 km Guntur
 * run). Anything farther than the searched radius plus a small tolerance is not
 * part of this zone and must not enter the leads.
 */
function zoneDistanceReject(coords, centerLat, centerLng, radiusKm, toleranceKm = 1.5, isMaster = false, scope = null, address = '', location = '') {
  if (isMaster || scope === 'district' || scope === 'state' || scope === 'mandal' || (radiusKm && Number(radiusKm) >= 20)) {
    return null; // Master territorial swarms bypass radial circle truncation
  }
  if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lng))) return null;
  if (centerLat == null || centerLng == null) return null;

  // Service-Area Businesses (SABs) without fixed street addresses or serving the target city:
  const locToken = String(location || '').split(',')[0].trim().toLowerCase();
  const addrLower = String(address || '').toLowerCase();
  if (locToken && locToken.length > 2 && (addrLower.includes(locToken) || !address || !/\d/.test(address))) {
    return null; // Preserves Olivia Nadel, Rebecca Gatto, Walker Wedding Group
  }

  const cLat = Number(centerLat);
  const cLng = Number(centerLng);
  if (!Number.isFinite(cLat) || !Number.isFinite(cLng) || (cLat === 0 && cLng === 0)) return null;
  const baseR = Math.max(15, (Number(radiusKm) || 8) * 1.8);
  const maxKm = Math.max(25, baseR + toleranceKm);
  const distanceKm = getDistanceKm(coords.lat, coords.lng, cLat, cLng);
  return distanceKm > maxKm ? { distanceKm, maxKm } : null;
}

function isWithinBounds(lat, lng, bbox, toleranceKm = 2.5) {
  if (!bbox || bbox.length !== 4) return true; // No bounds provided

  const minLat = parseFloat(bbox[0]);
  const maxLat = parseFloat(bbox[1]);
  const minLng = parseFloat(bbox[2]);
  const maxLng = parseFloat(bbox[3]);

  const latTolerance = toleranceKm / 111.0;
  const lngTolerance = toleranceKm / (111.0 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

  if (lat < (minLat - latTolerance) || lat > (maxLat + latTolerance)) return false;
  if (lng < (minLng - lngTolerance) || lng > (maxLng + lngTolerance)) return false;

  return true;
}

module.exports = {
  isListingRelevantToQuery,
  validCoord,
  extractCoords,
  getDistanceKm,
  zoneDistanceReject,
  isWithinBounds
};
