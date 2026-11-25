/**
 * resolvers.js
 * Universal zone cluster resolver and location classifier.
 */

const indiaGeoIndex = require('../indiaGeoIndex');
const querySpecificityClassifier = require('../querySpecificityClassifier');
const { AUTHORITATIVE_CLUSTERS } = require('./clusters/india');
const { INTERNATIONAL_AUTHORITATIVE_CLUSTERS } = require('./clusters/international');
const {
  districtIndex,
  mandalIndex,
  villageIndex,
  stateIndex
} = require('./villageIndexer');
const {
  zoneCoordinates,
  spreadCoords,
  ZONE_COORDINATES
} = require('./coordinates');
const {
  buildCityCoverage,
  buildCityGridZones
} = require('./gridCoverage');
const { buildCategorySubVectorZones } = require('./subvectors');
const { getUniversalCategoryVectors } = require('./universalCategoryVectors');

// ── UNIVERSAL ZONE CLUSTER RESOLVER ──
function resolveUniversalZones(location, category = '', isMaster = false, countryCode = 'IN') {
  if (!location || typeof location !== 'string') {
    return [{ zoneName: 'Central Area', queryText: 'Central Area', isSingle: true }];
  }

  const cleanLoc = location.trim();
  const lowerLoc = cleanLoc.toLowerCase().replace(/[^a-z0-9]/g, '');
  const primaryName = cleanLoc.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const strippedName = cleanLoc.replace(/\b(district|dist|mandal|mandals|tehsil|taluk|state|city|town)\b/gi, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const country = String(countryCode || 'IN').toUpperCase();
  const isInternational = country !== 'IN' || Boolean(
    INTERNATIONAL_AUTHORITATIVE_CLUSTERS[lowerLoc] ||
    INTERNATIONAL_AUTHORITATIVE_CLUSTERS[primaryName] ||
    INTERNATIONAL_AUTHORITATIVE_CLUSTERS[strippedName]
  );

  // Check International Authoritative Pre-Mapped Cities & Boroughs (New York, London, Toronto, Sydney, Dubai, etc.)
  for (const [key, zones] of Object.entries(INTERNATIONAL_AUTHORITATIVE_CLUSTERS)) {
    if (lowerLoc === key || primaryName === key || strippedName === key) {
      const cityLabel = cleanLoc.replace(/\b(city|town)\b/gi, '').replace(/\s+/g, ' ').trim() || cleanLoc;
      const cityTitle = key.replace(/\b\w/g, ch => ch.toUpperCase());
      const maxCityZones = isMaster ? 96 : 52;
      return buildCityCoverage(cityTitle, category, zones, cityLabel, maxCityZones, countryCode);
    }
  }

  // Check if query is an explicit broad sweep
  const isExplicitDistrict = /\b(district|dist)\b/i.test(cleanLoc);
  const isExplicitState = stateIndex.has(strippedName) || stateIndex.has(lowerLoc) || stateIndex.has(primaryName);

  // Wide-area sweeps (Districts, Mandals, States, Metros) are supported seamlessly across all modes.

  // 1. Authoritative Pre-Mapped Indian Cities & Metros (All 24 Mumbai Wards, All Delhi Wards, etc.)
  // Runs comprehensively across ALL localities of the city (NO arbitrary truncation)
  if (!isInternational) {
    for (const [key, zones] of Object.entries(AUTHORITATIVE_CLUSTERS)) {
      if (!isExplicitDistrict && (lowerLoc === key || primaryName === key || strippedName === key) && !lowerLoc.includes('rural')) {
        // Whole-city coverage: every named locality plus viewport grid cells that
        // fill the gaps between them. Without the grid, a city run can only ever
        // see the businesses those few phrases happen to rank.
        const cityLabel = cleanLoc.replace(/\b(city|town)\b/gi, '').replace(/\s+/g, ' ').trim() || cleanLoc;
        const cityTitle = key.replace(/\b\w/g, ch => ch.toUpperCase());
        const maxCityZones = isMaster ? 96 : 52;
        return buildCityCoverage(cityTitle, category, zones, cityLabel, maxCityZones);
      }
    }
  }

  // 2. District Headquarters / Major City Sweep (e.g. Solapur, Ujjain, Kurnool, Warangal, Bareilly, etc.)
  if (!isExplicitDistrict && (districtIndex.has(lowerLoc) || districtIndex.has(primaryName))) {
    const entry = districtIndex.get(lowerLoc) || districtIndex.get(primaryName);
    const cityName = entry.district;
    const cityLower = cityName.toLowerCase();
    const cityCenter = ZONE_COORDINATES[cityLower] || ZONE_COORDINATES[lowerLoc] || null;
    const prefix = category ? (category + ' in ') : '';

    const citySectors = [
      { name: cityName + ' Central Commercial Hub', query: prefix + cityName + ' Central' },
      { name: cityName + ' Main Market & Bazaar Area', query: prefix + 'near Main Market / Bazaar, ' + cityName },
      { name: cityName + ' Railway Station & Bus Stand', query: prefix + 'near Railway Station, ' + cityName },
      { name: cityName + ' Main Arterial / Ring Road', query: prefix + 'near Main Road, ' + cityName },
      { name: cityName + ' Industrial & Trade Zone', query: prefix + 'Industrial Estate, ' + cityName },
      { name: cityName + ' Top Rated Specialists', query: 'Best ' + (category || 'Services') + ' in ' + cityName },
      { name: cityName + ' North Sector', query: prefix + cityName + ' North' },
      { name: cityName + ' South Sector', query: prefix + cityName + ' South' }
    ];

    const sectorZones = citySectors.map((sector, idx) => {
      let sCoords = null;
      if (cityCenter && cityCenter.lat && cityCenter.lng) {
        const angle = (idx * 2 * Math.PI) / citySectors.length;
        sCoords = {
          lat: Number((cityCenter.lat + 0.016 * Math.cos(angle)).toFixed(5)),
          lng: Number((cityCenter.lng + 0.016 * Math.sin(angle)).toFixed(5))
        };
      }
      return {
        zoneName: sector.name,
        queryText: sector.query,
        district: entry.district,
        state: entry.state,
        lat: sCoords ? sCoords.lat : null,
        lng: sCoords ? sCoords.lng : null,
        radiusKm: 6.0,
        engines: ['local_finder', 'maps'],
        coverageKind: 'locality',
        precisionLevel: 'city_ward',
        isVectorQuery: true,
        isSingle: false
      };
    });

    // Fill the rest of the city with viewport grid cells so the sweep is not
    // limited to eight hand-written sectors.
    const maxDistrictCityZones = isMaster ? 72 : 42;
    const grid = buildCityGridZones(cityName, category, [], { cappedRadiusKm: 6, maxAxis: isMaster ? 5 : 4 });
    return [...sectorZones, ...grid].slice(0, maxDistrictCityZones);
  }

  // 3. Village Multi-Node Expansion Protocol
  // If user searched a village, expand to village hub + nearby contiguous villages + mandal center!
  const cleanVNorm = lowerLoc.replace(/u$/, '').replace(/a$/, '');
  const villageEntry = villageIndex.get(lowerLoc) || villageIndex.get(primaryName) || villageIndex.get(cleanVNorm);
  if (villageEntry) {
    const vName = villageEntry.village;
    const mName = villageEntry.mandal;
    const dName = villageEntry.district;
    const sName = villageEntry.state;
    const prefix = category ? `${category} in ` : '';
    const centerCoords = zoneCoordinates(mName, dName, 0, 1);

    const zones = [];
    // A. Primary Village Node
    zones.push({
      zoneName: `${vName} Village`,
      queryText: `${prefix}${vName}, ${mName} Mandal`,
      district: dName,
      state: sName,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      radiusKm: 6.0,
      precisionLevel: 'mandal_village',
      isVectorQuery: true,
      isSingle: false
    });

    // B. Contiguous Neighboring Villages in the same mandal (within 5-8km)
    const siblings = Array.isArray(villageEntry.siblings) ? villageEntry.siblings : [];
    const chosenSiblings = siblings.slice(0, 4);
    chosenSiblings.forEach((sibling, sIdx) => {
      let sCoords = zoneCoordinates(sibling, mName, sIdx + 1, chosenSiblings.length + 1);
      if ((!sCoords || !sCoords.lat) && centerCoords?.lat && centerCoords?.lng) {
        const angle = (sIdx + 1) * 2.3999632;
        const r = 0.0075 * Math.sqrt(sIdx + 1);
        sCoords = {
          lat: Number((centerCoords.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: `${sibling} (Nearby)`,
        queryText: `${prefix}${sibling}, ${mName}`,
        district: dName,
        state: sName,
        lat: sCoords?.lat || null,
        lng: sCoords?.lng || null,
        radiusKm: 6.0,
        precisionLevel: 'mandal_village',
        isVectorQuery: true,
        isSingle: false
      });
    });

    // C. Parent Mandal Commercial Center Hub
    zones.push({
      zoneName: `${mName} Mandal Center`,
      queryText: `${prefix}${mName} Central`,
      district: dName,
      state: sName,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      radiusKm: 6.0,
      precisionLevel: 'mandal_hub',
      isVectorQuery: true,
      isSingle: false
    });

    return zones;
  }

  // 3. Mandal / Tehsil Full-Coverage Sweep
  if (mandalIndex.has(lowerLoc) || mandalIndex.has(primaryName)) {
    const entry = mandalIndex.get(lowerLoc) || mandalIndex.get(primaryName);
    const townName = entry.subDistrict || cleanLoc.split(',')[0].trim();
    const townLower = townName.toLowerCase();
    const centerCoords = zoneCoordinates(townName, entry.district, 0, 1);
    const prefix = category ? `${category} in ` : '';

    const zones = [];
    // Mandal Central Hub
    zones.push({
      zoneName: `${townName} Central`,
      queryText: `${prefix}${townName} Central`,
      district: entry.district,
      state: entry.state,
      lat: centerCoords?.lat || null,
      lng: centerCoords?.lng || null,
      radiusKm: 6.0,
      precisionLevel: 'mandal_hub',
      scope: 'mandal',
      isVectorQuery: true,
      isSingle: false
    });

    // Every constituent village of the mandal, not a sample. A sub-district with
    // 140 villages used to stop at 12 (client) or 100 (Master); the tail was
    // silently unsearched.
    const villages = Array.isArray(entry.villages) ? entry.villages : [];
    const selectedVillages = villages;
    selectedVillages.forEach((village, idx) => {
      let vCoords = zoneCoordinates(village, townName, idx + 1, selectedVillages.length + 1);
      if (
        (!vCoords || !vCoords.lat || (centerCoords && Math.abs(vCoords.lat - centerCoords.lat) < 0.0002 && Math.abs(vCoords.lng - centerCoords.lng) < 0.0002))
        && centerCoords?.lat && centerCoords?.lng
      ) {
        const angle = (idx + 1) * 2.3999632;
        const r = 0.0075 * Math.sqrt(idx + 1);
        vCoords = {
          lat: Number((centerCoords.lat + r * Math.cos(angle)).toFixed(5)),
          lng: Number((centerCoords.lng + r * Math.sin(angle)).toFixed(5))
        };
      }
      zones.push({
        zoneName: village,
        queryText: `${prefix}${village}, ${townName}`,
        district: entry.district,
        state: entry.state,
        lat: vCoords?.lat || null,
        lng: vCoords?.lng || null,
        radiusKm: 6.0,
        precisionLevel: 'mandal_village',
        scope: 'mandal',
        isVectorQuery: true,
        isSingle: false
      });
    });

    return zones;
  }

    // 4. District Sweep: ONLY MASTER CAN DO DISTRICT-WIDE SWEEPS!
  if (isExplicitDistrict && isMaster) {
    const entry = districtIndex.get(strippedName) || districtIndex.get(lowerLoc) || districtIndex.get(primaryName);
    if (entry && entry.mandals && entry.mandals.length > 0) {
      // Every sub-district in the district, not the first 120.
      const selected = entry.mandals;
      return selected.map((m, index) => {
        const coords = zoneCoordinates(m, entry.district, index, selected.length);
        const prefix = category ? `${category} in ` : '';
        return {
          zoneName: m,
          queryText: `${prefix}${m}, ${entry.district}`,
          district: entry.district,
          state: entry.state,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          isApproximate: Boolean(coords?.isApproximate),
          scope: 'district',
          isVectorQuery: true,
          isSingle: false
        };
      });
    }
  }

  // 5. State Sweep: ONLY MASTER CAN DO STATE-WIDE SWEEPS!
  if (isExplicitState && isMaster) {
    const entry = stateIndex.get(strippedName) || stateIndex.get(lowerLoc) || stateIndex.get(primaryName);
    if (entry && entry.districts && entry.districts.length > 0) {
      const stateDistricts = entry.districts;
      const zones = [];
      const center = STATE_CENTERS[entry.state.toLowerCase()] || STATE_CENTERS[strippedName] || null;
      
      // Every district, and every sub-district inside it. The old loop stopped
      // at 200 zones and kept only 3 mandals per district, so a state sweep
      // covered a fraction of the state it was asked for.
      for (let di = 0; di < stateDistricts.length; di++) {
        const d = stateDistricts[di];
        const prefix = category ? `${category} in ` : '';
        const distCoords = zoneCoordinates(d, d, di, stateDistricts.length)
          || (center ? spreadCoords(center, di, stateDistricts.length, center.radius) : null);
        
        // District HQ City Zone
        zones.push({
          zoneName: d,
          queryText: `${prefix}${d}, ${entry.state}`,
          district: d,
          state: entry.state,
          lat: distCoords?.lat || null,
          lng: distCoords?.lng || null,
          isApproximate: Boolean(distCoords?.isApproximate),
          scope: 'state',
          isVectorQuery: true,
          isSingle: false
        });

        // Every commercial mandal of the district.
        const cleanD = d.toLowerCase().replace(/[^a-z0-9]/g, '');
        const distEntry = districtIndex.get(cleanD);
        if (distEntry && Array.isArray(distEntry.mandals)) {
          const subMandals = distEntry.mandals
            .filter(m => m.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanD);
          for (let mi = 0; mi < subMandals.length; mi++) {
            const sm = subMandals[mi];
            const mCoords = zoneCoordinates(sm, d, mi, subMandals.length);
            zones.push({
              zoneName: sm,
              queryText: `${prefix}${sm}, ${d}`,
              district: d,
              state: entry.state,
              lat: mCoords?.lat || null,
              lng: mCoords?.lng || null,
              isApproximate: Boolean(mCoords?.isApproximate),
              scope: 'state',
              isVectorQuery: true,
              isSingle: false
            });
          }
        }
      }
      return zones;
    }
  }

  // 6. Comprehensive City / District Headquarter Sweep for ANY Indian or International City
  // (e.g. Coimbatore, Nashik, Agra, Varanasi, Kanpur, Nellore, Tirupati, or unmapped international cities)
  const cityName = cleanLoc.split(',')[0].trim();
  const cityLower = cityName.toLowerCase();
  let cityCenter = ZONE_COORDINATES[cityLower] || ZONE_COORDINATES[lowerLoc] || null;
  if (!cityCenter || !cityCenter.lat) {
    const quick = indiaGeoIndex.resolveQuick(cleanLoc) || indiaGeoIndex.resolveQuick(cityName);
    if (quick && quick.lat && quick.lng) {
      cityCenter = { lat: quick.lat, lng: quick.lng };
    }
  }
  const prefix = category ? `${category} in ` : '';

  let citySectors = [];
  if (isInternational) {
    if (country === 'GB' || country === 'UK') {
      citySectors = [
        { name: `${cityName} High Street & City Centre`, query: `${prefix}in High Street, ${cityName}`, offset: 0 },
        { name: `${cityName} Central Railway Station & Interchange`, query: `${prefix}near Central Station, ${cityName}`, offset: 0.012 },
        { name: `${cityName} Commercial Quarter & Old Town`, query: `${prefix}in Commercial Quarter, ${cityName}`, offset: 0.022 },
        { name: `${cityName} Trading Estate & Business Park`, query: `${prefix}Trading Estate, ${cityName}`, offset: -0.022 },
        { name: `${cityName} North Sector & Riverside`, query: `${prefix}in North ${cityName}`, offset: 0.018 },
        { name: `${cityName} South Sector & Suburbs`, query: `${prefix}in South ${cityName}`, offset: -0.018 },
        { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 }
      ];
    } else if (country === 'AU') {
      citySectors = [
        { name: `${cityName} Central Business District (CBD)`, query: `${prefix}in CBD ${cityName}`, offset: 0 },
        { name: `${cityName} Coastal & Waterfront Precinct`, query: `${prefix}Waterfront, ${cityName}`, offset: 0.012 },
        { name: `${cityName} North Urban Hub`, query: `${prefix}in North ${cityName}`, offset: 0.022 },
        { name: `${cityName} South Commercial Corridor`, query: `${prefix}in South ${cityName}`, offset: -0.022 },
        { name: `${cityName} Technology & Logistics Park`, query: `${prefix}Business Park, ${cityName}`, offset: -0.018 },
        { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 }
      ];
    } else if (country === 'AE') {
      citySectors = [
        { name: `${cityName} Downtown & Financial Hub`, query: `${prefix}Downtown ${cityName}`, offset: 0 },
        { name: `${cityName} Business Bay & Marina Corridor`, query: `${prefix}Business Bay, ${cityName}`, offset: 0.012 },
        { name: `${cityName} Trade Centre & Freezone`, query: `${prefix}Freezone, ${cityName}`, offset: 0.022 },
        { name: `${cityName} Commercial Quarters`, query: `${prefix}Commercial Area, ${cityName}`, offset: -0.022 },
        { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 }
      ];
    } else {
      citySectors = [
        { name: `${cityName} Downtown & Commercial Core`, query: `${prefix}in Downtown ${cityName}`, offset: 0 },
        { name: `${cityName} Central Business District`, query: `${prefix}in Central ${cityName}`, offset: 0.012 },
        { name: `${cityName} North / Uptown Sector`, query: `${prefix}in North ${cityName}`, offset: 0.022 },
        { name: `${cityName} South / Midtown Sector`, query: `${prefix}in South ${cityName}`, offset: -0.022 },
        { name: `${cityName} Eastside Commercial District`, query: `${prefix}in East ${cityName}`, offset: 0.018 },
        { name: `${cityName} Westside Business Corridor`, query: `${prefix}in West ${cityName}`, offset: -0.018 },
        { name: `${cityName} Financial & Harbor District`, query: `${prefix}Financial District, ${cityName}`, offset: 0.010 },
        { name: `${cityName} Arts, Historic & Culture District`, query: `${prefix}Arts District, ${cityName}`, offset: -0.010 },
        { name: `${cityName} Central Metro & Transit Corridor`, query: `${prefix}near Transit Station, ${cityName}`, offset: -0.012 },
        { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 }
      ];
    }
  } else {
    // 100% Authentic Indian Terminology strictly preserved
    citySectors = [
      { name: `${cityName} Central Commercial Hub`, query: `${prefix}${cityName} Central`, offset: 0 },
      { name: `${cityName} Main Market & Bazaar Area`, query: `${prefix}near Main Market / Bazaar, ${cityName}`, offset: 0.012 },
      { name: `${cityName} Railway Station & Bus Stand`, query: `${prefix}near Railway Station, ${cityName}`, offset: -0.012 },
      { name: `${cityName} Main Arterial / Ring Road`, query: `${prefix}near Main Road, ${cityName}`, offset: 0.018 },
      { name: `${cityName} Industrial & Trade Zone`, query: `${prefix}Industrial Estate, ${cityName}`, offset: -0.018 },
      { name: `${cityName} Top Rated Specialists`, query: `Best ${category || 'Services'} in ${cityName}`, offset: 0.008 },
      { name: `${cityName} North Sector`, query: `${prefix}${cityName} North`, offset: 0.022 },
      { name: `${cityName} South Sector`, query: `${prefix}${cityName} South`, offset: -0.022 }
    ];
  }

  const sectorZones = citySectors.map((sector, idx) => {
    let sCoords = null;
    if (cityCenter?.lat && cityCenter?.lng) {
      const angle = (idx * 2 * Math.PI) / citySectors.length;
      sCoords = {
        lat: Number((cityCenter.lat + 0.016 * Math.cos(angle)).toFixed(5)),
        lng: Number((cityCenter.lng + 0.016 * Math.sin(angle)).toFixed(5))
      };
    }
    return {
      zoneName: sector.name,
      queryText: sector.query,
      lat: sCoords?.lat || null,
      lng: sCoords?.lng || null,
      radiusKm: 6.0,
      engines: ['local_finder', 'maps'],
      coverageKind: 'locality',
      precisionLevel: 'city_ward',
      isVectorQuery: true,
      isSingle: false
    };
  });

  // Any city not in the curated clusters gets comprehensive coverage:
  // named sectors + real sub-category vectors + a whole-city grid that covers the town
  // and its surrounding commercial ring. Full coverage so adaptive splitting has room to expand!
  const subVectors = buildCategorySubVectorZones(category, cityName, 32, isInternational ? (country !== 'IN' ? country : 'US') : 'IN');
  const grid = buildCityGridZones(cityName, category, [], { cappedRadiusKm: 6, center: cityCenter });
  const mustKeep = [...sectorZones, ...subVectors];
  const maxFallbackZones = isMaster ? 40 : 22;
  return [...mustKeep, ...grid].slice(0, maxFallbackZones);
}

function keyOf(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function classifyLocation(queryOrLoc) {
  if (!queryOrLoc || typeof queryOrLoc !== 'string') {
    return { type: 'unknown', name: '', zoneCount: 1, estimatedLeads: 50, badge: '📍 LOCAL', label: 'Local search' };
  }

  let text = queryOrLoc.trim();
  const prepMatch = text.match(/\s+(in|near|around|at|across|within)\s+(.+)$/i);
  let locCandidate = prepMatch ? prepMatch[2].trim() : text;
  locCandidate = locCandidate.replace(/^(the|a|an)\s+/i, '').replace(/[?,.!]+$/, '').trim();

  const explicitDistrict = /\b(district|dist|zilla|zila|jilla)\b/i.test(locCandidate);
  const explicitState = /\b(state|pradesh|territory)\b/i.test(locCandidate);
  const explicitMandal = /\b(mandal|mandals|tehsil|tehsils|taluk|taluks|taluka|talukas|tahsil|block|subdivision)\b/i.test(locCandidate);
  const explicitMunicipality = /\b(municipality|municipal|corporation|council|ulb|gmc|vmc|ghmc|bbmp|mcgm|pcmc)\b/i.test(locCandidate);
  const explicitCity = /\b(city|town|urban|corporation|municipality)\b/i.test(locCandidate);
  const stripped = locCandidate.replace(/\b(district|dist|mandal|mandals|tehsil|tahsil|taluk|taluka|state|city|town|metro|municipality|municipal|corporation|council|ulb|gmc|vmc|ghmc|bbmp|mcgm|pcmc)\b/gi, '').trim();

  const rawCandidates = [
    locCandidate,
    stripped,
    locCandidate.split(',')[0].trim(),
    stripped.split(',')[0].trim(),
    locCandidate.split(',').pop().trim()
  ].filter(Boolean);

  const MUNICIPAL_ACRONYMS = {
    'gmc': 'guntur',
    'vmc': 'vijayawada',
    'ghmc': 'hyderabad',
    'bbmp': 'bangalore',
    'mcgm': 'mumbai',
    'pmc': 'pune',
    'pcmc': 'pimpri chinchwad'
  };

  const initialClean = [...new Set(rawCandidates.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')))];
  const cleanCandidates = [...new Set([
    ...initialClean,
    ...initialClean.map(c => MUNICIPAL_ACRONYMS[c]).filter(Boolean)
  ])];

  // 1. Check state
  for (const c of cleanCandidates) {
    if (stateIndex.has(c)) {
      const stateObj = stateIndex.get(c);
      const count = stateObj.districts ? stateObj.districts.length : 30;
      return {
        type: 'state',
        name: stateObj.state,
        zoneCount: count,
        estimatedLeads: count * 80,
        badge: '🌐 STATE-WIDE',
        label: `State sweep: ${stateObj.state} (${count} districts)`
      };
    }
  }

  // 2. Check explicit district
  if (explicitDistrict) {
    for (const c of cleanCandidates) {
      if (districtIndex.has(c)) {
        const distObj = districtIndex.get(c);
        const count = distObj.mandals ? distObj.mandals.length : 25;
        return {
          type: 'district',
          name: distObj.district,
          state: distObj.state,
          zoneCount: count,
          estimatedLeads: count * 45,
          badge: '🗺️ DISTRICT-WIDE',
          label: `District sweep: ${distObj.district} (${count} mandals)`
        };
      }
    }
  }

  // 3. Check explicit mandal OR explicit municipality / corporation
  if (explicitMandal || explicitMunicipality) {
    for (const c of cleanCandidates) {
      if (mandalIndex.has(c) || AUTHORITATIVE_CLUSTERS[c]) {
        const mObj = mandalIndex.get(c) || {};
        const subName = mObj.subDistrict || (c.charAt(0).toUpperCase() + c.slice(1));
        const vCount = Array.isArray(mObj.villages) ? mObj.villages.length : 11;
        const isDual = Boolean(AUTHORITATIVE_CLUSTERS[c] || AUTHORITATIVE_CLUSTERS[keyOf(subName)]);
        const totalZ = isDual ? (AUTHORITATIVE_CLUSTERS[c]?.length || 24) + vCount + 86 : Math.max(8, vCount + 1);
        const badgeLabel = isDual
          ? (explicitMunicipality ? '🏛️ MUNICIPAL CORPORATION & DUAL-MANDAL SWARM' : '📍 DUAL-STATUS MANDAL & MUNICIPALITY')
          : (explicitMunicipality ? '🏛️ MUNICIPALITY SWARM' : '📍 MANDAL SWARM');
        return {
          type: 'mandal',
          name: subName,
          district: mObj.district || subName,
          state: mObj.state || 'Andhra Pradesh',
          zoneCount: totalZ,
          estimatedLeads: totalZ * 30,
          badge: badgeLabel,
          label: isDual
            ? `${subName} Municipal Corporation & Mandal Swarm: ${totalZ} zones (Urban Wards + Villages + GPS Grid)`
            : `${subName} ${explicitMunicipality ? 'Municipality' : 'Mandal'} sweep (${vCount} zones)`
        };
      }
    }
  }

  // 4. Check metro / city cluster (when not explicitly requested as district or mandal)
  if (!explicitDistrict && !explicitMandal) {
    for (const c of cleanCandidates) {
      if (AUTHORITATIVE_CLUSTERS[c]) {
        const zones = AUTHORITATIVE_CLUSTERS[c];
        const cityTitle = c.charAt(0).toUpperCase() + c.slice(1);
        const coverage = buildCityCoverage(cityTitle, '', zones, cityTitle, 250);
        return {
          type: 'metro',
          name: cityTitle,
          zoneCount: coverage.length,
          estimatedLeads: coverage.length * 28,
          badge: '🏙️ METRO/CITY',
          label: `Whole-city sweep: ${coverage.length} zones`
        };
      }
    }
  }

  // 5. Check district headquarters / major cities (e.g. Nellore, Nalgonda, Kurnool, Solapur, Bareilly)
  if (!explicitDistrict && !explicitMandal) {
    for (const c of cleanCandidates) {
      if (districtIndex.has(c)) {
        const distObj = districtIndex.get(c);
        return {
          type: 'city',
          name: distObj.district,
          state: distObj.state,
          zoneCount: 8 + buildCityGridZones(distObj.district, '', [], { cappedRadiusKm: 6 }).length,
          estimatedLeads: 240,
          badge: '🏙️ CITY/TOWN',
          label: `Whole-city sweep: ${distObj.district}`
        };
      }
    }
  }

  // 6. Check generic mandal match
  for (const c of cleanCandidates) {
    if (mandalIndex.has(c)) {
      const mObj = mandalIndex.get(c);
      const vCount = Array.isArray(mObj.villages) ? mObj.villages.length : 0;
      const isDual = Boolean(AUTHORITATIVE_CLUSTERS[c] || AUTHORITATIVE_CLUSTERS[keyOf(mObj.subDistrict)]);
      const totalZ = isDual ? (AUTHORITATIVE_CLUSTERS[c]?.length || 24) + vCount + 80 : Math.max(8, vCount + 1);
      return {
        type: 'mandal',
        name: mObj.subDistrict,
        district: mObj.district,
        state: mObj.state,
        zoneCount: totalZ,
        estimatedLeads: totalZ * 30,
        badge: isDual ? '📍 DUAL-STATUS MANDAL' : '📍 MANDAL SWARM',
        label: `Mandal sweep: ${mObj.subDistrict} (${mObj.district})`
      };
    }
  }

  // Check village
  for (const c of cleanCandidates) {
    const cleanNorm = c.replace(/u$/, '').replace(/a$/, '');
    if (villageIndex.has(c) || villageIndex.has(cleanNorm)) {
      const vObj = villageIndex.get(c) || villageIndex.get(cleanNorm);
      return {
        type: 'village',
        name: vObj.village,
        zoneCount: 6,
        estimatedLeads: 40,
        badge: '🏡 VILLAGE EXPANSION',
        label: `Village multi-node: ${vObj.village} + ${vObj.mandal} Mandal`
      };
    }
  }

  return {
    type: 'city',
    name: locCandidate,
    zoneCount: 8 + buildCityGridZones(locCandidate, '', [], { cappedRadiusKm: 6 }).length,
    estimatedLeads: 240,
    badge: '🏙️ CITY/TOWN',
    label: `Whole-city sweep: ${locCandidate}`
  };
}


module.exports = {
  resolveUniversalZones,
  keyOf,
  classifyLocation
};
