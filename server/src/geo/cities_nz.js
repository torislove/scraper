'use strict';

/**
 * cities_nz.js
 * Authoritative municipal zone clusters for New Zealand (NZ).
 */

module.exports = {
  auckland: {
    city: 'Auckland',
    state: 'Auckland',
    country: 'NZ',
    center: { lat: -36.8485, lng: 174.7633 },
    bounds: { minLat: -37.05, maxLat: -36.65, minLng: 174.55, maxLng: 174.98 },
    rejectTerms: ['wellington', 'christchurch', 'hamilton'],
    zones: [
      { name: 'Auckland CBD', lat: -36.8485, lng: 174.7633, radiusKm: 2.0 },
      { name: 'Ponsonby', lat: -36.8550, lng: 174.7440, radiusKm: 1.5 },
      { name: 'Parnell', lat: -36.8560, lng: 174.7780, radiusKm: 1.5 },
      { name: 'Newmarket Auckland', lat: -36.8680, lng: 174.7770, radiusKm: 1.5 },
      { name: 'Takapuna North Shore', lat: -36.7880, lng: 174.7730, radiusKm: 2.0 },
      { name: 'Albany Commercial', lat: -36.7280, lng: 174.7060, radiusKm: 2.5 },
      { name: 'Manukau Central', lat: -36.9930, lng: 174.8770, radiusKm: 2.5 }
    ]
  },

  wellington: {
    city: 'Wellington',
    state: 'Wellington',
    country: 'NZ',
    center: { lat: -41.2865, lng: 174.7762 },
    bounds: { minLat: -41.38, maxLat: -41.15, minLng: 174.65, maxLng: 174.95 },
    rejectTerms: ['auckland', 'christchurch'],
    zones: [
      { name: 'Wellington Central (Lambton Quay)', lat: -41.2865, lng: 174.7762, radiusKm: 1.5 },
      { name: 'Te Aro', lat: -41.2940, lng: 174.7770, radiusKm: 1.5 },
      { name: 'Thorndon', lat: -41.2750, lng: 174.7760, radiusKm: 1.5 },
      { name: 'Newtown Wellington', lat: -41.3120, lng: 174.7810, radiusKm: 1.5 }
    ]
  },

  christchurch: {
    city: 'Christchurch',
    state: 'Canterbury',
    country: 'NZ',
    center: { lat: -43.5321, lng: 172.6362 },
    bounds: { minLat: -43.65, maxLat: -43.40, minLng: 172.45, maxLng: 172.78 },
    rejectTerms: ['auckland', 'wellington', 'dunedin'],
    zones: [
      { name: 'Christchurch Central CBD', lat: -43.5321, lng: 172.6362, radiusKm: 2.0 },
      { name: 'Riccarton', lat: -43.5310, lng: 172.5950, radiusKm: 2.0 },
      { name: 'Merivale', lat: -43.5110, lng: 172.6220, radiusKm: 1.5 },
      { name: 'Sydenham', lat: -43.5480, lng: 172.6360, radiusKm: 1.5 }
    ]
  }
};
