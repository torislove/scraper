/**
 * boundaryGuards.js
 * Spatial mathematics, distance calculations, municipal reach limits,
 * and dynamic bounding box containment guards for omni sweep operations.
 */

const { mandalIndex } = require('../../utils/universalGeoCluster');

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatEta(ms) {
  if (ms <= 0) return '0s';
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function zoneCoverageKind(zone) {
  if (!zone) return 'vector';
  if (zone.coverageKind) return String(zone.coverageKind).toLowerCase();
  return zone.kind === 'grid' ? 'grid' : 'vector';
}

function isGridZone(zone) {
  return zoneCoverageKind(zone) === 'grid';
}

function zoneKey(zone) {
  return String(zone?.zoneName || zone?.name || '').toLowerCase().trim();
}

function placeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Scale-adaptive reach limits derived from entity scopes.
 * Real extent span from boundingbox overrides these whenever available.
 */
const SCOPE_REACH_KM = {
  mandal: 14,
  city: 22,
  district: 85,
  state: 750
};

function sweepReachKm(scope) {
  return SCOPE_REACH_KM[scope] || SCOPE_REACH_KM.district;
}

function normalizeAdminName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(district|dist|state)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeMandalName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bmandal\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Universal dynamic boundary containment.
 * Checks boundingbox envelope, constituent subdivision centers, and district/state alignment.
 */
function isInsideDistrictBoundary(lead, boundary) {
  if (!boundary) return true;
  if (!lead) return true;

  const targetDistrict = normalizeAdminName(boundary.district);
  const leadDistrict = normalizeAdminName(lead.district);
  if (targetDistrict && leadDistrict && leadDistrict !== targetDistrict) return false;

  const targetState = normalizeAdminName(boundary.state);
  const leadState = normalizeAdminName(lead.state);
  if (targetState && leadState && leadState !== targetState) return false;

  if (!leadDistrict) {
    const mandalKey = normalizeMandalName(lead.mandal);
    if (mandalKey && mandalKey !== targetDistrict) {
      const ownMandals = new Set((boundary.centers || []).map(c => normalizeMandalName(c.name)));
      const info = mandalIndex.get(mandalKey);
      if (!ownMandals.has(mandalKey) && info && info.district
        && normalizeAdminName(info.district) !== targetDistrict) {
        return false;
      }
    }
  }

  const lat = Number(lead.latitude);
  const lng = Number(lead.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;

  // 1. Dynamic Boundingbox Envelope Check
  if (boundary.boundingbox && Array.isArray(boundary.boundingbox) && boundary.boundingbox.length === 4) {
    const [south, north, west, east] = boundary.boundingbox.map(Number);
    if ([south, north, west, east].every(Number.isFinite)) {
      const latMargin = Math.max(0.015, Math.abs(north - south) * 0.08);
      const lngMargin = Math.max(0.015, Math.abs(east - west) * 0.08);
      if (lat < south - latMargin || lat > north + latMargin || lng < west - lngMargin || lng > east + lngMargin) {
        return false;
      }
    }
  }

  // 2. Constituent Subdivision / Ward Centers Check
  if (Array.isArray(boundary.centers) && boundary.centers.length > 0) {
    for (const center of boundary.centers) {
      if (!Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) continue;
      const radius = Number(center.radiusKm) || (boundary.kind === 'mandal_boundary' ? 4.0 : 9.0);
      if (getDistanceKm(Number(center.lat), Number(center.lng), lat, lng) <= radius) return true;
    }
    // If centers were explicitly provided and lead is outside all of them
    return false;
  }

  return true;
}

function isInsideSweepArea(lead, center, scope, options = {}) {
  if (!lead || !center) return true;

  // 1. Web SERP Article Snippet Rejection
  const leadName = String(lead.name || '');
  if (/\b(how to choose|best \d+|\d+ best|top \d+|clinics and how|guide to|cost of|reviews on|directory of|teeth\.in|justdial\.com)\b/i.test(leadName)) {
    return false;
  }

  // Enforce boundary if provided for any scope (mandal, city, district)
  if (options.boundary) {
    return isInsideDistrictBoundary(lead, options.boundary);
  }

  const centerLat = Number(center.lat);
  const centerLng = Number(center.lng);
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || (Math.abs(centerLat) < 0.1 && Math.abs(centerLng) < 0.1)) {
    return true;
  }

  // Directory leads without GPS coordinates are preserved if they have text address
  if (!Number.isFinite(Number(lead.latitude)) || !Number.isFinite(Number(lead.longitude))) {
    return true;
  }

  // 2. Scale-Adaptive Centroid Distance Check
  const km = getDistanceKm(
    centerLat,
    centerLng,
    Number(lead.latitude),
    Number(lead.longitude)
  );

  const reach = Number(options.reachKm) > 0 ? Number(options.reachKm) : sweepReachKm(scope);
  if (km > reach) return false;

  // 3. Telecom Landline STD & Postal Boundary Sanity Guard (Cross-River/District Bleed Prevention)
  const phone = String(lead.phone || '').replace(/\D/g, '');
  const rawAddr = `${String(lead.address || '')} ${String(lead.pincode || '')}`;

  // Guntur Specific Guard: prevent Vijayawada (0866 / 520xxx / 521xxx) from bleeding into Guntur city
  const distToGuntur = getDistanceKm(centerLat, centerLng, 16.3067, 80.4365);
  if (distToGuntur < 10.0 && scope !== 'district' && scope !== 'state') {
    if (phone.startsWith('0866') || phone.startsWith('91866') || phone.startsWith('866')) {
      return false; // Vijayawada landline
    }
    if (/\b(520\d{3}|521\d{3})\b/.test(rawAddr)) {
      return false; // Krishna / Vijayawada pincode
    }
  }

  // Vijayawada Specific Guard: prevent Guntur (0863 / 522xxx) from bleeding into Vijayawada city/mandal
  const distToVijayawada = getDistanceKm(centerLat, centerLng, 16.5062, 80.6480);
  if (distToVijayawada < 10.0 && scope !== 'district' && scope !== 'state') {
    if (phone.startsWith('0863') || phone.startsWith('91863') || phone.startsWith('863')) {
      return false; // Guntur landline
    }
    if (/\b(522\d{3})\b/.test(rawAddr)) {
      return false; // Guntur postal code
    }
  }

  // New York City Guard: prevent New Jersey (07xxx / 201 / 973) from bleeding into NYC
  const distToNYC = getDistanceKm(centerLat, centerLng, 40.7128, -74.0060);
  if (distToNYC < 16.0 && String(options.location || '').toLowerCase().includes('new york')) {
    if (/\b07\d{3}\b/.test(rawAddr) || /\b(jersey city|newark|hoboken)\b/i.test(rawAddr)) {
      return false; // New Jersey postal code / city
    }
  }

  return true;
}

function leadBelongsToZone(lead, zone, options = {}) {
  const zoneKeyValue = placeKey(zone?.zoneName || zone?.name);
  if (!zoneKeyValue) return true;

  if (options.boundary && !isInsideDistrictBoundary(lead, options.boundary)) return false;

  const hasLeadCoords = Number.isFinite(Number(lead.latitude)) && Number.isFinite(Number(lead.longitude));
  const hasZoneCoords = Number.isFinite(Number(zone.lat)) && Number.isFinite(Number(zone.lng));
  const distance = (hasLeadCoords && hasZoneCoords)
    ? getDistanceKm(Number(zone.lat), Number(zone.lng), Number(lead.latitude), Number(lead.longitude))
    : null;

  const reach = options.reachKm || sweepReachKm(options.scope);
  const radius = Math.max(4.0, (Number(zone.radiusKm) || 2.5) + 1.2);
  if (distance != null && distance <= radius) return true;

  if (distance == null) return true;
  if (options.boundary) return true;

  if (options.center) {
    const fromCenter = getDistanceKm(
      Number(options.center.lat),
      Number(options.center.lng),
      Number(lead.latitude),
      Number(lead.longitude)
    );
    if (fromCenter > reach) return false;

    const evidence = [lead.address, lead.area, lead.village, lead.suburb, lead.locality, lead.mandal, lead.district]
      .map(placeKey)
      .filter(Boolean);
    if (evidence.some(value => value.includes(zoneKeyValue) || (value.length >= 5 && zoneKeyValue.includes(value)))) {
      return true;
    }
    return zone.isApproximate === true;
  }

  return distance <= reach;
}

function nearestBoundaryZone(lead, boundary) {
  const centers = (boundary && boundary.centers) || [];
  const lat = Number(lead?.latitude);
  const lng = Number(lead?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { zoneName: boundary?.district || 'district boundary', lat: null, lng: null };
  }
  let best = null;
  let bestKm = Infinity;
  for (const center of centers) {
    if (!Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) continue;
    const km = getDistanceKm(Number(center.lat), Number(center.lng), lat, lng);
    if (km < bestKm) { bestKm = km; best = center; }
  }
  return best
    ? { zoneName: best.name, lat: best.lat, lng: best.lng }
    : { zoneName: boundary?.district || 'district boundary', lat: null, lng: null };
}

function enforceMasterZoneContainment(leads, zones, options = {}) {
  const byName = new Map();
  const coordinateZones = [];
  for (const zone of zones || []) {
    const key = placeKey(zone.zoneName || zone.name);
    if (key && !byName.has(key)) byName.set(key, zone);
    if (Number.isFinite(Number(zone.lat)) && Number.isFinite(Number(zone.lng))) {
      coordinateZones.push(zone);
    }
  }
  const kept = [];
  const rejected = [];
  for (const lead of leads || []) {
    let zone = byName.get(placeKey(lead.zoneName))
      || byName.get(placeKey(lead.suburb))
      || byName.get(placeKey(lead.locality))
      || byName.get(placeKey(lead.village));

    if (!zone && coordinateZones.length
      && Number.isFinite(Number(lead.latitude)) && Number.isFinite(Number(lead.longitude))) {
      let best = null;
      let bestKm = Infinity;
      for (const candidate of coordinateZones) {
        const km = getDistanceKm(
          Number(candidate.lat),
          Number(candidate.lng),
          Number(lead.latitude),
          Number(lead.longitude)
        );
        if (km < bestKm) {
          bestKm = km;
          best = candidate;
        }
      }
      zone = best;
    }

    if (!zone) {
      if (options.boundary && !isInsideDistrictBoundary(lead, options.boundary)) {
        rejected.push({ lead, zone: nearestBoundaryZone(lead, options.boundary) });
        continue;
      }
      kept.push(lead);
      continue;
    }

    if (leadBelongsToZone(lead, zone, options)) {
      kept.push(lead);
    } else {
      rejected.push({ lead, zone });
    }
  }
  return { kept, rejected };
}

module.exports = {
  getDistanceKm,
  formatEta,
  zoneCoverageKind,
  isGridZone,
  zoneKey,
  placeKey,
  sweepReachKm,
  isInsideDistrictBoundary,
  isInsideSweepArea,
  leadBelongsToZone,
  nearestBoundaryZone,
  enforceMasterZoneContainment
};
