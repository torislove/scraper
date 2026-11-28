'use strict';

/**
 * cities_au.js
 * Authoritative municipal zone clusters for Australia (AU).
 */

module.exports = {
  sydney: {
    city: 'Sydney',
    state: 'New South Wales',
    country: 'AU',
    center: { lat: -33.8688, lng: 151.2093 },
    bounds: { minLat: -34.15, maxLat: -33.55, minLng: 150.80, maxLng: 151.40 },
    rejectTerms: ['melbourne', 'brisbane', 'perth', 'adelaide'],
    zones: [
      { name: 'Sydney CBD', lat: -33.8688, lng: 151.2093, radiusKm: 2.0 },
      { name: 'Surry Hills', lat: -33.8860, lng: 151.2110, radiusKm: 1.5 },
      { name: 'Parramatta', lat: -33.8150, lng: 151.0011, radiusKm: 3.0 },
      { name: 'Bondi Junction', lat: -33.8920, lng: 151.2480, radiusKm: 2.0 },
      { name: 'North Sydney', lat: -33.8385, lng: 151.2070, radiusKm: 2.0 },
      { name: 'Newtown', lat: -33.8980, lng: 151.1790, radiusKm: 1.5 },
      { name: 'Chatswood', lat: -33.7960, lng: 151.1780, radiusKm: 2.5 },
      { name: 'Manly', lat: -33.7970, lng: 151.2880, radiusKm: 2.5 },
      { name: 'Darlinghurst', lat: -33.8790, lng: 151.2180, radiusKm: 1.5 },
      { name: 'Alexandria', lat: -33.9090, lng: 151.1980, radiusKm: 2.0 }
    ]
  },

  melbourne: {
    city: 'Melbourne',
    state: 'Victoria',
    country: 'AU',
    center: { lat: -37.8136, lng: 144.9631 },
    bounds: { minLat: -38.15, maxLat: -37.55, minLng: 144.60, maxLng: 145.35 },
    rejectTerms: ['sydney', 'brisbane', 'perth', 'adelaide'],
    zones: [
      { name: 'Melbourne CBD', lat: -37.8136, lng: 144.9631, radiusKm: 2.0 },
      { name: 'Richmond', lat: -37.8230, lng: 144.9980, radiusKm: 2.0 },
      { name: 'South Yarra', lat: -37.8390, lng: 144.9920, radiusKm: 2.0 },
      { name: 'St Kilda', lat: -37.8640, lng: 144.9820, radiusKm: 2.0 },
      { name: 'Carlton', lat: -37.8010, lng: 144.9670, radiusKm: 1.5 },
      { name: 'Fitzroy', lat: -37.7980, lng: 144.9780, radiusKm: 1.5 },
      { name: 'Brunswick', lat: -37.7680, lng: 144.9610, radiusKm: 2.0 },
      { name: 'Docklands', lat: -37.8180, lng: 144.9430, radiusKm: 1.5 },
      { name: 'Southbank', lat: -37.8250, lng: 144.9630, radiusKm: 1.5 },
      { name: 'Prahran', lat: -37.8510, lng: 144.9970, radiusKm: 1.5 }
    ]
  },

  brisbane: {
    city: 'Brisbane',
    state: 'Queensland',
    country: 'AU',
    center: { lat: -27.4698, lng: 153.0251 },
    bounds: { minLat: -27.70, maxLat: -27.25, minLng: 152.80, maxLng: 153.25 },
    rejectTerms: ['sydney', 'melbourne', 'gold coast', 'perth'],
    zones: [
      { name: 'Brisbane CBD', lat: -27.4698, lng: 153.0251, radiusKm: 2.0 },
      { name: 'Fortitude Valley', lat: -27.4560, lng: 153.0360, radiusKm: 1.5 },
      { name: 'South Brisbane', lat: -27.4810, lng: 153.0180, radiusKm: 1.5 },
      { name: 'West End', lat: -27.4850, lng: 153.0080, radiusKm: 1.5 },
      { name: 'New Farm', lat: -27.4680, lng: 153.0510, radiusKm: 1.5 },
      { name: 'Paddington', lat: -27.4610, lng: 152.9990, radiusKm: 1.5 },
      { name: 'Teneriffe', lat: -27.4530, lng: 153.0490, radiusKm: 1.5 },
      { name: 'Kangaroo Point', lat: -27.4770, lng: 153.0360, radiusKm: 1.5 }
    ]
  },

  perth: {
    city: 'Perth',
    state: 'Western Australia',
    country: 'AU',
    center: { lat: -31.9505, lng: 115.8605 },
    bounds: { minLat: -32.20, maxLat: -31.70, minLng: 115.65, maxLng: 116.10 },
    rejectTerms: ['sydney', 'melbourne', 'brisbane'],
    zones: [
      { name: 'Perth CBD', lat: -31.9505, lng: 115.8605, radiusKm: 2.0 },
      { name: 'Fremantle', lat: -32.0569, lng: 115.7439, radiusKm: 3.0 },
      { name: 'Subiaco', lat: -31.9470, lng: 115.8250, radiusKm: 1.5 },
      { name: 'Northbridge', lat: -31.9460, lng: 115.8580, radiusKm: 1.5 },
      { name: 'Cottesloe', lat: -31.9950, lng: 115.7590, radiusKm: 2.0 },
      { name: 'Victoria Park', lat: -31.9750, lng: 115.8970, radiusKm: 2.0 }
    ]
  },

  adelaide: {
    city: 'Adelaide',
    state: 'South Australia',
    country: 'AU',
    center: { lat: -34.9285, lng: 138.6007 },
    bounds: { minLat: -35.15, maxLat: -34.70, minLng: 138.45, maxLng: 138.75 },
    rejectTerms: ['sydney', 'melbourne', 'brisbane'],
    zones: [
      { name: 'Adelaide CBD', lat: -34.9285, lng: 138.6007, radiusKm: 2.0 },
      { name: 'North Adelaide', lat: -34.9080, lng: 138.5980, radiusKm: 1.5 },
      { name: 'Norwood', lat: -34.9210, lng: 138.6350, radiusKm: 2.0 },
      { name: 'Glenelg', lat: -34.9815, lng: 138.5160, radiusKm: 2.5 },
      { name: 'Unley', lat: -34.9510, lng: 138.6080, radiusKm: 1.5 }
    ]
  }
};
