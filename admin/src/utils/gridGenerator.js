// ─────────────────────────────────────────────────────────────────────────────
// Grid Generator (Frontend Port)
// Ported verbatim from server/src/routes/scrape.js
// Uses NASA Phyllotaxis Golden Angle algorithm — same math as sunflower seeds.
// Golden Angle ≈ 137.5077° ensures ZERO clustering and ZERO blind spots.
// ─────────────────────────────────────────────────────────────────────────────

const GOLDEN_ANGLE_DEG = 137.50776405003785; // 360° / φ²

/**
 * Generates a grid of lat/lng coordinates using the Phyllotaxis spiral algorithm.
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @param {number} pointCount - Number of grid points (default 20)
 * @param {Array} boundingbox - Optional [south, north, west, east] from Nominatim
 * @returns {Array} Array of {lat, lng, distanceFromCenter, ring, angle} objects
 */
export function generateGridCoordinates(centerLat, centerLng, radiusKm, pointCount = 20, boundingbox = null) {
  const coords = [];

  let minLat, maxLat, minLng, maxLng;
  let useBoundary = false;

  if (boundingbox && boundingbox.length === 4 && radiusKm >= 100) {
    [minLat, maxLat, minLng, maxLng] = boundingbox;
    useBoundary = true;
  }

  // Point 0: always the search center
  coords.push({
    lat: parseFloat(centerLat.toFixed(6)),
    lng: parseFloat(centerLng.toFixed(6)),
    distanceFromCenter: 0,
    ring: 0,
    angle: 0
  });

  const totalOuterPoints = Math.max(pointCount - 1, 1);

  for (let i = 1; i <= totalOuterPoints; i++) {
    const t = i / totalOuterPoints;
    const distKm = Math.sqrt(t) * radiusKm; // √t gives inner-dense, outer-sparse
    const angleDeg = i * GOLDEN_ANGLE_DEG;
    const angleRad = (angleDeg % 360) * Math.PI / 180;

    // Convert polar → geographic lat/lng
    const ptLat = centerLat + (distKm * Math.cos(angleRad)) / 111.0;
    const ptLng = centerLng + (distKm * Math.sin(angleRad)) / (111.0 * Math.cos(centerLat * Math.PI / 180));

    // If bounding box: skip points outside the district
    if (useBoundary) {
      if (ptLat < minLat || ptLat > maxLat || ptLng < minLng || ptLng > maxLng) continue;
    }

    const ring = t < 0.34 ? 1 : t < 0.67 ? 2 : 3;

    coords.push({
      lat: parseFloat(ptLat.toFixed(6)),
      lng: parseFloat(ptLng.toFixed(6)),
      distanceFromCenter: parseFloat(distKm.toFixed(2)),
      ring,
      angle: parseFloat((angleDeg % 360).toFixed(1))
    });
  }

  return coords;
}

/**
 * Calculates distance between two lat/lng points in kilometers.
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
