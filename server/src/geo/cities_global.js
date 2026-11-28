'use strict';

/**
 * cities_global.js
 * Authoritative municipal zone clusters for other sovereign hubs (CA, DE, FR, AE, SG, NZ, IE).
 */

module.exports = {
  toronto: {
    city: 'Toronto',
    state: 'Ontario',
    country: 'CA',
    center: { lat: 43.6532, lng: -79.3832 },
    bounds: { minLat: 43.55, maxLat: 43.85, minLng: -79.65, maxLng: -79.15 },
    rejectTerms: ['vancouver', 'montreal', 'ottawa'],
    zones: [
      { name: 'Downtown Toronto', lat: 43.6532, lng: -79.3832, radiusKm: 2.0 },
      { name: 'Yorkville', lat: 43.6702, lng: -79.3900, radiusKm: 1.5 },
      { name: 'Queen West', lat: 43.6480, lng: -79.4040, radiusKm: 1.5 },
      { name: 'North York', lat: 43.7615, lng: -79.4111, radiusKm: 3.0 },
      { name: 'Scarborough', lat: 43.7764, lng: -79.2318, radiusKm: 3.5 }
    ]
  },

  vancouver: {
    city: 'Vancouver',
    state: 'British Columbia',
    country: 'CA',
    center: { lat: 49.2827, lng: -123.1207 },
    bounds: { minLat: 49.20, maxLat: 49.35, minLng: -123.28, maxLng: -123.00 },
    rejectTerms: ['toronto', 'calgary', 'seattle'],
    zones: [
      { name: 'Downtown Vancouver', lat: 49.2827, lng: -123.1207, radiusKm: 2.0 },
      { name: 'Gastown', lat: 49.2838, lng: -123.1090, radiusKm: 1.5 },
      { name: 'Kitsilano', lat: 49.2684, lng: -123.1683, radiusKm: 2.0 },
      { name: 'Yaletown', lat: 49.2750, lng: -123.1215, radiusKm: 1.5 },
      { name: 'Mount Pleasant', lat: 49.2630, lng: -123.1010, radiusKm: 1.5 }
    ]
  },

  berlin: {
    city: 'Berlin',
    state: 'Berlin',
    country: 'DE',
    center: { lat: 52.5200, lng: 13.4050 },
    bounds: { minLat: 52.35, maxLat: 52.68, minLng: 13.10, maxLng: 13.75 },
    rejectTerms: ['munich', 'hamburg', 'frankfurt'],
    zones: [
      { name: 'Mitte', lat: 52.5200, lng: 13.4050, radiusKm: 2.0 },
      { name: 'Kreuzberg', lat: 52.4986, lng: 13.4034, radiusKm: 2.0 },
      { name: 'Prenzlauer Berg', lat: 52.5400, lng: 13.4200, radiusKm: 2.0 },
      { name: 'Charlottenburg', lat: 52.5160, lng: 13.3050, radiusKm: 2.5 },
      { name: 'Friedrichshain', lat: 52.5130, lng: 13.4540, radiusKm: 2.0 }
    ]
  },

  munich: {
    city: 'Munich',
    state: 'Bavaria',
    country: 'DE',
    center: { lat: 48.1351, lng: 11.5820 },
    bounds: { minLat: 48.05, maxLat: 48.25, minLng: 11.40, maxLng: 11.72 },
    rejectTerms: ['berlin', 'hamburg', 'frankfurt'],
    zones: [
      { name: 'Altstadt Munich', lat: 48.1375, lng: 11.5755, radiusKm: 1.5 },
      { name: 'Schwabing', lat: 48.1610, lng: 11.5865, radiusKm: 2.0 },
      { name: 'Maxvorstadt', lat: 48.1500, lng: 11.5690, radiusKm: 1.5 },
      { name: 'Haidhausen', lat: 48.1330, lng: 11.5990, radiusKm: 1.5 },
      { name: 'Bogenhausen', lat: 48.1480, lng: 11.6180, radiusKm: 2.0 }
    ]
  },

  paris: {
    city: 'Paris',
    state: 'Île-de-France',
    country: 'FR',
    center: { lat: 48.8566, lng: 2.3522 },
    bounds: { minLat: 48.75, maxLat: 48.95, minLng: 2.20, maxLng: 2.48 },
    rejectTerms: ['lyon', 'marseille', 'toulouse', 'nice', 'bordeaux'],
    zones: [
      { name: 'Paris Centre (1er - 4e)', lat: 48.8566, lng: 2.3522, radiusKm: 2.0 },
      { name: 'Le Marais', lat: 48.8575, lng: 2.3622, radiusKm: 1.5 },
      { name: 'Montmartre (18e)', lat: 48.8867, lng: 2.3431, radiusKm: 2.0 },
      { name: 'Saint-Germain-des-Prés (6e)', lat: 48.8539, lng: 2.3331, radiusKm: 1.5 },
      { name: 'Champs-Élysées (8e)', lat: 48.8719, lng: 2.3025, radiusKm: 2.0 }
    ]
  },

  lyon: {
    city: 'Lyon',
    state: 'Auvergne-Rhône-Alpes',
    country: 'FR',
    center: { lat: 45.7640, lng: 4.8357 },
    bounds: { minLat: 45.68, maxLat: 45.85, minLng: 4.75, maxLng: 4.95 },
    rejectTerms: ['paris', 'marseille', 'toulouse', 'nice'],
    zones: [
      { name: 'Presqu\'île', lat: 45.7640, lng: 4.8357, radiusKm: 1.5 },
      { name: 'Vieux Lyon', lat: 45.7628, lng: 4.8270, radiusKm: 1.5 },
      { name: 'Croix-Rousse', lat: 45.7745, lng: 4.8315, radiusKm: 1.5 },
      { name: 'Part-Dieu', lat: 45.7607, lng: 4.8596, radiusKm: 2.0 }
    ]
  },

  dubai: {
    city: 'Dubai',
    state: 'Dubai',
    country: 'AE',
    center: { lat: 25.2048, lng: 55.2708 },
    bounds: { minLat: 24.95, maxLat: 25.35, minLng: 55.05, maxLng: 55.45 },
    rejectTerms: ['abu dhabi', 'sharjah'],
    zones: [
      { name: 'Downtown Dubai', lat: 25.1972, lng: 55.2744, radiusKm: 2.0 },
      { name: 'Dubai Marina', lat: 25.0805, lng: 55.1403, radiusKm: 2.5 },
      { name: 'Business Bay', lat: 25.1850, lng: 55.2630, radiusKm: 2.0 },
      { name: 'Jumeirah', lat: 25.1980, lng: 55.2340, radiusKm: 2.5 },
      { name: 'Deira', lat: 25.2697, lng: 55.3095, radiusKm: 2.5 },
      { name: 'Palm Jumeirah', lat: 25.1124, lng: 55.1390, radiusKm: 2.5 }
    ]
  },

  singapore: {
    city: 'Singapore',
    state: 'Singapore',
    country: 'SG',
    center: { lat: 1.3521, lng: 103.8198 },
    bounds: { minLat: 1.20, maxLat: 1.48, minLng: 103.60, maxLng: 104.05 },
    rejectTerms: ['malaysia', 'kuala lumpur', 'johor'],
    zones: [
      { name: 'Downtown Core', lat: 1.2870, lng: 103.8520, radiusKm: 2.0 },
      { name: 'Orchard Road', lat: 1.3048, lng: 103.8318, radiusKm: 1.5 },
      { name: 'Marina Bay', lat: 1.2840, lng: 103.8610, radiusKm: 1.5 },
      { name: 'Jurong East', lat: 1.3329, lng: 103.7436, radiusKm: 2.5 },
      { name: 'Tampines', lat: 1.3530, lng: 103.9450, radiusKm: 2.5 }
    ]
  },

  auckland: {
    city: 'Auckland',
    state: 'Auckland',
    country: 'NZ',
    center: { lat: -36.8485, lng: 174.7633 },
    bounds: { minLat: -37.05, maxLat: -36.65, minLng: 174.55, maxLng: 174.98 },
    rejectTerms: ['wellington', 'christchurch', 'sydney'],
    zones: [
      { name: 'Auckland CBD', lat: -36.8485, lng: 174.7633, radiusKm: 2.0 },
      { name: 'Ponsonby', lat: -36.8550, lng: 174.7440, radiusKm: 1.5 },
      { name: 'Parnell', lat: -36.8560, lng: 174.7780, radiusKm: 1.5 },
      { name: 'Newmarket', lat: -36.8680, lng: 174.7770, radiusKm: 1.5 },
      { name: 'Takapuna', lat: -36.7880, lng: 174.7730, radiusKm: 2.0 }
    ]
  },

  dublin: {
    city: 'Dublin',
    state: 'Leinster',
    country: 'IE',
    center: { lat: 53.3498, lng: -6.2603 },
    bounds: { minLat: 53.25, maxLat: 53.45, minLng: -6.42, maxLng: -6.10 },
    rejectTerms: ['cork', 'galway', 'belfast', 'london'],
    zones: [
      { name: 'Dublin City Centre', lat: 53.3498, lng: -6.2603, radiusKm: 2.0 },
      { name: 'Temple Bar', lat: 53.3454, lng: -6.2644, radiusKm: 1.0 },
      { name: 'Dublin Docklands', lat: 53.3480, lng: -6.2380, radiusKm: 1.5 },
      { name: 'Ballsbridge', lat: 53.3280, lng: -6.2300, radiusKm: 2.0 },
      { name: 'Ranelagh', lat: 53.3260, lng: -6.2550, radiusKm: 1.5 }
    ]
  }
};
