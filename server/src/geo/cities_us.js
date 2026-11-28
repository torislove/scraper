'use strict';

/**
 * cities_us.js
 * Authoritative municipal zone clusters for United States (US).
 */

module.exports = {
  dallas: {
    city: 'Dallas',
    state: 'Texas',
    country: 'US',
    center: { lat: 32.7767, lng: -96.7970 },
    bounds: { minLat: 32.55, maxLat: 33.05, minLng: -97.05, maxLng: -96.55 },
    rejectTerms: ['houston', 'austin', 'san antonio', 'new york', 'chicago'],
    zones: [
      { name: 'Downtown Dallas', lat: 32.7767, lng: -96.7970, radiusKm: 2.0 },
      { name: 'Uptown Dallas', lat: 32.7997, lng: -96.8044, radiusKm: 2.0 },
      { name: 'Deep Ellum', lat: 32.7831, lng: -96.7845, radiusKm: 1.5 },
      { name: 'Oak Lawn', lat: 32.8105, lng: -96.8122, radiusKm: 2.0 },
      { name: 'Preston Hollow', lat: 32.8805, lng: -96.7990, radiusKm: 3.0 },
      { name: 'Lakewood', lat: 32.8150, lng: -96.7450, radiusKm: 2.5 },
      { name: 'Bishop Arts District', lat: 32.7485, lng: -96.8285, radiusKm: 1.5 },
      { name: 'North Dallas', lat: 32.9200, lng: -96.8100, radiusKm: 3.0 }
    ]
  },

  austin: {
    city: 'Austin',
    state: 'Texas',
    country: 'US',
    center: { lat: 30.2672, lng: -97.7431 },
    bounds: { minLat: 30.10, maxLat: 30.50, minLng: -97.95, maxLng: -97.55 },
    rejectTerms: ['dallas', 'houston', 'san antonio', 'chicago'],
    zones: [
      { name: 'Downtown Austin', lat: 30.2672, lng: -97.7431, radiusKm: 2.0 },
      { name: 'South Congress (SoCo)', lat: 30.2485, lng: -97.7495, radiusKm: 2.0 },
      { name: 'The Domain', lat: 30.4020, lng: -97.7258, radiusKm: 2.5 },
      { name: 'East Austin', lat: 30.2625, lng: -97.7200, radiusKm: 2.0 },
      { name: 'Zilker', lat: 30.2580, lng: -97.7715, radiusKm: 2.0 },
      { name: 'Mueller', lat: 30.2980, lng: -97.7050, radiusKm: 2.0 },
      { name: 'Rainey Street', lat: 30.2590, lng: -97.7385, radiusKm: 1.5 },
      { name: 'Barton Hills', lat: 30.2450, lng: -97.7850, radiusKm: 2.0 }
    ]
  },

  houston: {
    city: 'Houston',
    state: 'Texas',
    country: 'US',
    center: { lat: 29.7604, lng: -95.3698 },
    bounds: { minLat: 29.55, maxLat: 30.10, minLng: -95.70, maxLng: -95.10 },
    rejectTerms: ['dallas', 'austin', 'san antonio', 'new york'],
    zones: [
      { name: 'Downtown Houston', lat: 29.7604, lng: -95.3698, radiusKm: 2.0 },
      { name: 'Galleria / Uptown', lat: 29.7485, lng: -95.4628, radiusKm: 2.5 },
      { name: 'Montrose', lat: 29.7445, lng: -95.3945, radiusKm: 2.0 },
      { name: 'Houston Heights', lat: 29.7950, lng: -95.3980, radiusKm: 2.5 },
      { name: 'Midtown', lat: 29.7420, lng: -95.3780, radiusKm: 1.5 },
      { name: 'Texas Medical Center', lat: 29.7100, lng: -95.3970, radiusKm: 2.0 },
      { name: 'River Oaks', lat: 29.7520, lng: -95.4280, radiusKm: 2.0 },
      { name: 'Memorial', lat: 29.7750, lng: -95.5350, radiusKm: 3.0 }
    ]
  },

  newyork: {
    city: 'New York',
    state: 'New York',
    country: 'US',
    center: { lat: 40.7128, lng: -74.0060 },
    bounds: { minLat: 40.50, maxLat: 40.90, minLng: -74.25, maxLng: -73.70 },
    rejectTerms: ['chicago', 'los angeles', 'dallas', 'houston'],
    zones: [
      { name: 'Midtown Manhattan', lat: 40.7549, lng: -73.9840, radiusKm: 2.0 },
      { name: 'Financial District', lat: 40.7075, lng: -74.0090, radiusKm: 1.5 },
      { name: 'Williamsburg', lat: 40.7081, lng: -73.9571, radiusKm: 2.0 },
      { name: 'Upper East Side', lat: 40.7736, lng: -73.9566, radiusKm: 2.0 },
      { name: 'Astoria', lat: 40.7644, lng: -73.9235, radiusKm: 2.5 },
      { name: 'DUMBO Brooklyn', lat: 40.7033, lng: -73.9890, radiusKm: 1.5 },
      { name: 'SoHo', lat: 40.7233, lng: -74.0030, radiusKm: 1.5 },
      { name: 'Chelsea', lat: 40.7465, lng: -74.0014, radiusKm: 1.5 }
    ]
  },

  chicago: {
    city: 'Chicago',
    state: 'Illinois',
    country: 'US',
    center: { lat: 41.8781, lng: -87.6298 },
    bounds: { minLat: 41.65, maxLat: 42.05, minLng: -87.90, maxLng: -87.50 },
    rejectTerms: ['new york', 'dallas', 'houston', 'los angeles'],
    zones: [
      { name: 'The Loop', lat: 41.8837, lng: -87.6289, radiusKm: 1.5 },
      { name: 'River North', lat: 41.8925, lng: -87.6340, radiusKm: 1.5 },
      { name: 'Lincoln Park', lat: 41.9214, lng: -87.6513, radiusKm: 2.0 },
      { name: 'West Loop', lat: 41.8825, lng: -87.6520, radiusKm: 1.5 },
      { name: 'Wicker Park', lat: 41.9088, lng: -87.6796, radiusKm: 2.0 },
      { name: 'Lakeview', lat: 41.9430, lng: -87.6580, radiusKm: 2.0 },
      { name: 'Logan Square', lat: 41.9230, lng: -87.7080, radiusKm: 2.0 },
      { name: 'Gold Coast', lat: 41.9050, lng: -87.6280, radiusKm: 1.5 }
    ]
  },

  losangeles: {
    city: 'Los Angeles',
    state: 'California',
    country: 'US',
    center: { lat: 34.0522, lng: -118.2437 },
    bounds: { minLat: 33.70, maxLat: 34.35, minLng: -118.68, maxLng: -118.15 },
    rejectTerms: ['san francisco', 'san diego', 'new york', 'chicago'],
    zones: [
      { name: 'Downtown LA', lat: 34.0407, lng: -118.2468, radiusKm: 2.5 },
      { name: 'Santa Monica', lat: 34.0195, lng: -118.4912, radiusKm: 2.5 },
      { name: 'Beverly Hills', lat: 34.0736, lng: -118.4004, radiusKm: 2.0 },
      { name: 'Hollywood', lat: 34.0928, lng: -118.3287, radiusKm: 2.0 },
      { name: 'Venice', lat: 33.9850, lng: -118.4695, radiusKm: 2.0 },
      { name: 'Pasadena', lat: 34.1478, lng: -118.1445, radiusKm: 3.0 },
      { name: 'Westwood', lat: 34.0635, lng: -118.4455, radiusKm: 2.0 },
      { name: 'Silver Lake', lat: 34.0870, lng: -118.2700, radiusKm: 2.0 }
    ]
  },

  miami: {
    city: 'Miami',
    state: 'Florida',
    country: 'US',
    center: { lat: 25.7617, lng: -80.1918 },
    bounds: { minLat: 25.65, maxLat: 25.90, minLng: -80.35, maxLng: -80.10 },
    rejectTerms: ['orlando', 'tampa', 'atlanta'],
    zones: [
      { name: 'Downtown Miami', lat: 25.7743, lng: -80.1937, radiusKm: 2.0 },
      { name: 'Brickell', lat: 25.7590, lng: -80.1925, radiusKm: 1.5 },
      { name: 'Wynwood', lat: 25.8042, lng: -80.1989, radiusKm: 1.5 },
      { name: 'South Beach', lat: 25.7826, lng: -80.1341, radiusKm: 2.0 },
      { name: 'Coral Gables', lat: 25.7215, lng: -80.2684, radiusKm: 2.5 },
      { name: 'Coconut Grove', lat: 25.7126, lng: -80.2570, radiusKm: 2.0 },
      { name: 'Miami Design District', lat: 25.8135, lng: -80.1920, radiusKm: 1.5 }
    ]
  }
};
