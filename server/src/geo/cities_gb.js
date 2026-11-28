'use strict';

/**
 * cities_gb.js
 * Authoritative municipal zone clusters for United Kingdom (GB).
 */

module.exports = {
  london: {
    city: 'London',
    state: 'England',
    country: 'GB',
    center: { lat: 51.5074, lng: -0.1278 },
    bounds: { minLat: 51.28, maxLat: 51.69, minLng: -0.51, maxLng: 0.33 },
    rejectTerms: ['manchester', 'birmingham', 'edinburgh', 'liverpool', 'glasgow', 'leeds'],
    zones: [
      { name: 'City of London', lat: 51.5123, lng: -0.0911, radiusKm: 2.0 },
      { name: 'Westminster', lat: 51.4975, lng: -0.1357, radiusKm: 2.0 },
      { name: 'Camden', lat: 51.5455, lng: -0.1415, radiusKm: 2.5 },
      { name: 'Islington', lat: 51.5416, lng: -0.1022, radiusKm: 2.0 },
      { name: 'Kensington & Chelsea', lat: 51.5014, lng: -0.1919, radiusKm: 2.0 },
      { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235, radiusKm: 2.0 },
      { name: 'Shoreditch', lat: 51.5260, lng: -0.0780, radiusKm: 1.5 },
      { name: 'Greenwich', lat: 51.4826, lng: -0.0077, radiusKm: 2.5 },
      { name: 'Richmond', lat: 51.4613, lng: -0.3037, radiusKm: 3.0 },
      { name: 'Clapham', lat: 51.4624, lng: -0.1382, radiusKm: 2.0 }
    ]
  },

  manchester: {
    city: 'Manchester',
    state: 'England',
    country: 'GB',
    center: { lat: 53.4808, lng: -2.2426 },
    bounds: { minLat: 53.35, maxLat: 53.60, minLng: -2.40, maxLng: -2.10 },
    rejectTerms: ['london', 'birmingham', 'liverpool', 'leeds'],
    zones: [
      { name: 'Manchester City Centre', lat: 53.4808, lng: -2.2426, radiusKm: 1.5 },
      { name: 'Northern Quarter', lat: 53.4835, lng: -2.2355, radiusKm: 1.5 },
      { name: 'Salford Quays', lat: 53.4720, lng: -2.2860, radiusKm: 2.0 },
      { name: 'Didsbury', lat: 53.4170, lng: -2.2310, radiusKm: 2.5 },
      { name: 'Castlefield', lat: 53.4750, lng: -2.2530, radiusKm: 1.5 },
      { name: 'Ancoats', lat: 53.4840, lng: -2.2270, radiusKm: 1.5 },
      { name: 'Chorlton', lat: 53.4420, lng: -2.2750, radiusKm: 2.0 },
      { name: 'Deansgate', lat: 53.4780, lng: -2.2490, radiusKm: 1.5 }
    ]
  },

  birmingham: {
    city: 'Birmingham',
    state: 'England',
    country: 'GB',
    center: { lat: 52.4862, lng: -1.8904 },
    bounds: { minLat: 52.38, maxLat: 52.60, minLng: -2.05, maxLng: -1.75 },
    rejectTerms: ['london', 'manchester', 'leeds'],
    zones: [
      { name: 'Birmingham City Centre', lat: 52.4862, lng: -1.8904, radiusKm: 2.0 },
      { name: 'Digbeth', lat: 52.4750, lng: -1.8840, radiusKm: 1.5 },
      { name: 'Edgbaston', lat: 52.4630, lng: -1.9210, radiusKm: 2.5 },
      { name: 'Jewellery Quarter', lat: 52.4880, lng: -1.9120, radiusKm: 1.5 },
      { name: 'Solihull', lat: 52.4128, lng: -1.7782, radiusKm: 3.5 },
      { name: 'Moseley', lat: 52.4480, lng: -1.8870, radiusKm: 2.0 },
      { name: 'Harborne', lat: 52.4600, lng: -1.9560, radiusKm: 2.0 }
    ]
  },

  edinburgh: {
    city: 'Edinburgh',
    state: 'Scotland',
    country: 'GB',
    center: { lat: 55.9533, lng: -3.1883 },
    bounds: { minLat: 55.85, maxLat: 56.02, minLng: -3.35, maxLng: -3.05 },
    rejectTerms: ['glasgow', 'aberdeen', 'london'],
    zones: [
      { name: 'Old Town Edinburgh', lat: 55.9486, lng: -3.1909, radiusKm: 1.5 },
      { name: 'New Town Edinburgh', lat: 55.9554, lng: -3.1999, radiusKm: 1.5 },
      { name: 'Leith', lat: 55.9754, lng: -3.1714, radiusKm: 2.0 },
      { name: 'Stockbridge', lat: 55.9585, lng: -3.2085, radiusKm: 1.5 },
      { name: 'Haymarket', lat: 55.9458, lng: -3.2185, radiusKm: 1.5 },
      { name: 'Morningside', lat: 55.9268, lng: -3.2095, radiusKm: 2.0 }
    ]
  },

  glasgow: {
    city: 'Glasgow',
    state: 'Scotland',
    country: 'GB',
    center: { lat: 55.8642, lng: -4.2518 },
    bounds: { minLat: 55.78, maxLat: 55.95, minLng: -4.42, maxLng: -4.10 },
    rejectTerms: ['edinburgh', 'aberdeen', 'london'],
    zones: [
      { name: 'Glasgow City Centre', lat: 55.8642, lng: -4.2518, radiusKm: 2.0 },
      { name: 'West End Glasgow', lat: 55.8735, lng: -4.2935, radiusKm: 2.5 },
      { name: 'Merchant City', lat: 55.8585, lng: -4.2465, radiusKm: 1.5 },
      { name: 'Southside Glasgow', lat: 55.8340, lng: -4.2680, radiusKm: 2.5 },
      { name: 'Shawlands', lat: 55.8285, lng: -4.2820, radiusKm: 2.0 },
      { name: 'Finnieston', lat: 55.8640, lng: -4.2840, radiusKm: 1.5 }
    ]
  },

  leeds: {
    city: 'Leeds',
    state: 'England',
    country: 'GB',
    center: { lat: 53.8008, lng: -1.5491 },
    bounds: { minLat: 53.72, maxLat: 53.90, minLng: -1.70, maxLng: -1.40 },
    rejectTerms: ['manchester', 'sheffield', 'london'],
    zones: [
      { name: 'Leeds City Centre', lat: 53.8008, lng: -1.5491, radiusKm: 2.0 },
      { name: 'Headingley', lat: 53.8215, lng: -1.5795, radiusKm: 2.0 },
      { name: 'Chapel Allerton', lat: 53.8320, lng: -1.5370, radiusKm: 2.0 },
      { name: 'Roundhay', lat: 53.8370, lng: -1.4980, radiusKm: 2.5 },
      { name: 'Horsforth', lat: 53.8415, lng: -1.6420, radiusKm: 2.5 },
      { name: 'Holbeck', lat: 53.7885, lng: -1.5540, radiusKm: 1.5 }
    ]
  }
};
