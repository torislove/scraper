'use strict';

/**
 * cities_ae.js
 * Authoritative municipal zone clusters for United Arab Emirates (AE).
 */

module.exports = {
  dubai: {
    city: 'Dubai',
    state: 'Dubai',
    country: 'AE',
    center: { lat: 25.2048, lng: 55.2708 },
    bounds: { minLat: 24.95, maxLat: 25.35, minLng: 55.05, maxLng: 55.45 },
    rejectTerms: ['abu dhabi', 'sharjah', 'ajman'],
    zones: [
      { name: 'Downtown Dubai', lat: 25.1972, lng: 55.2744, radiusKm: 2.0 },
      { name: 'Dubai Marina', lat: 25.0805, lng: 55.1403, radiusKm: 2.5 },
      { name: 'Business Bay', lat: 25.1850, lng: 55.2630, radiusKm: 2.0 },
      { name: 'Jumeirah', lat: 25.1980, lng: 55.2340, radiusKm: 2.5 },
      { name: 'Deira Dubai', lat: 25.2697, lng: 55.3095, radiusKm: 2.5 },
      { name: 'Palm Jumeirah', lat: 25.1124, lng: 55.1390, radiusKm: 2.5 },
      { name: 'Al Quoz Industrial Area', lat: 25.1450, lng: 55.2340, radiusKm: 3.0 },
      { name: 'Jumeirah Lake Towers (JLT)', lat: 25.0760, lng: 55.1500, radiusKm: 2.0 }
    ]
  },

  abudhabi: {
    city: 'Abu Dhabi',
    state: 'Abu Dhabi',
    country: 'AE',
    center: { lat: 24.4539, lng: 54.3773 },
    bounds: { minLat: 24.30, maxLat: 24.60, minLng: 54.20, maxLng: 54.65 },
    rejectTerms: ['dubai', 'sharjah', 'al ain'],
    zones: [
      { name: 'Abu Dhabi Corniche', lat: 24.4820, lng: 54.3490, radiusKm: 2.0 },
      { name: 'Al Reem Island', lat: 24.4980, lng: 54.4060, radiusKm: 2.5 },
      { name: 'Al Khalidiyah', lat: 24.4690, lng: 54.3480, radiusKm: 1.5 },
      { name: 'Yas Island', lat: 24.4850, lng: 54.6050, radiusKm: 3.0 },
      { name: 'Al Zahiyah (Tourist Club Area)', lat: 24.4930, lng: 54.3790, radiusKm: 1.5 },
      { name: 'Musaffah Industrial', lat: 24.3480, lng: 54.5120, radiusKm: 3.5 }
    ]
  }
};
