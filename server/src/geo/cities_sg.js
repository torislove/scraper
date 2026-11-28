'use strict';

/**
 * cities_sg.js
 * Authoritative municipal zone clusters for Singapore (SG).
 */

module.exports = {
  singapore: {
    city: 'Singapore',
    state: 'Singapore',
    country: 'SG',
    center: { lat: 1.3521, lng: 103.8198 },
    bounds: { minLat: 1.20, maxLat: 1.48, minLng: 103.60, maxLng: 104.05 },
    rejectTerms: ['malaysia', 'kuala lumpur', 'johor bahru', 'batam'],
    zones: [
      { name: 'Downtown Core Singapore', lat: 1.2870, lng: 103.8520, radiusKm: 2.0 },
      { name: 'Orchard Road', lat: 1.3048, lng: 103.8318, radiusKm: 1.5 },
      { name: 'Marina Bay Singapore', lat: 1.2840, lng: 103.8610, radiusKm: 1.5 },
      { name: 'Jurong East Industrial', lat: 1.3329, lng: 103.7436, radiusKm: 2.5 },
      { name: 'Tampines Hub', lat: 1.3530, lng: 103.9450, radiusKm: 2.5 },
      { name: 'Woodlands Commercial', lat: 1.4380, lng: 103.7890, radiusKm: 2.5 },
      { name: 'Bugis & Kampong Glam', lat: 1.3000, lng: 103.8580, radiusKm: 1.5 },
      { name: 'Tanjong Pagar', lat: 1.2760, lng: 103.8430, radiusKm: 1.5 }
    ]
  }
};
