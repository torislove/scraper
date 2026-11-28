'use strict';

/**
 * cities_ca.js
 * Authoritative municipal zone clusters for Canada (CA).
 */

module.exports = {
  toronto: {
    city: 'Toronto',
    state: 'Ontario',
    country: 'CA',
    center: { lat: 43.6532, lng: -79.3832 },
    bounds: { minLat: 43.55, maxLat: 43.85, minLng: -79.65, maxLng: -79.15 },
    rejectTerms: ['vancouver', 'montreal', 'calgary', 'ottawa'],
    zones: [
      { name: 'Downtown Toronto', lat: 43.6532, lng: -79.3832, radiusKm: 2.0 },
      { name: 'Yorkville', lat: 43.6702, lng: -79.3900, radiusKm: 1.5 },
      { name: 'Queen West', lat: 43.6480, lng: -79.4040, radiusKm: 1.5 },
      { name: 'North York', lat: 43.7615, lng: -79.4111, radiusKm: 3.0 },
      { name: 'Scarborough', lat: 43.7764, lng: -79.2318, radiusKm: 3.5 },
      { name: 'Etobicoke', lat: 43.6205, lng: -79.5132, radiusKm: 3.0 },
      { name: 'The Beaches', lat: 43.6700, lng: -79.2990, radiusKm: 2.0 },
      { name: 'Liberty Village', lat: 43.6375, lng: -79.4210, radiusKm: 1.5 }
    ]
  },

  montreal: {
    city: 'Montreal',
    state: 'Quebec',
    country: 'CA',
    center: { lat: 45.5017, lng: -73.5673 },
    bounds: { minLat: 45.40, maxLat: 45.70, minLng: -73.95, maxLng: -73.45 },
    rejectTerms: ['toronto', 'vancouver', 'calgary', 'quebec city'],
    zones: [
      { name: 'Downtown Montreal (Centre-Ville)', lat: 45.5017, lng: -73.5673, radiusKm: 2.0 },
      { name: 'Plateau-Mont-Royal', lat: 45.5225, lng: -73.5780, radiusKm: 2.0 },
      { name: 'Old Montreal (Vieux-Montréal)', lat: 45.5074, lng: -73.5540, radiusKm: 1.5 },
      { name: 'Mile End', lat: 45.5280, lng: -73.6000, radiusKm: 1.5 },
      { name: 'Griffintown', lat: 45.4920, lng: -73.5610, radiusKm: 1.5 },
      { name: 'Westmount', lat: 45.4850, lng: -73.5970, radiusKm: 2.0 }
    ]
  },

  vancouver: {
    city: 'Vancouver',
    state: 'British Columbia',
    country: 'CA',
    center: { lat: 49.2827, lng: -123.1207 },
    bounds: { minLat: 49.20, maxLat: 49.35, minLng: -123.28, maxLng: -123.00 },
    rejectTerms: ['toronto', 'montreal', 'calgary', 'seattle'],
    zones: [
      { name: 'Downtown Vancouver', lat: 49.2827, lng: -123.1207, radiusKm: 2.0 },
      { name: 'Gastown', lat: 49.2838, lng: -123.1090, radiusKm: 1.5 },
      { name: 'Kitsilano', lat: 49.2684, lng: -123.1683, radiusKm: 2.0 },
      { name: 'Yaletown', lat: 49.2750, lng: -123.1215, radiusKm: 1.5 },
      { name: 'Mount Pleasant', lat: 49.2630, lng: -123.1010, radiusKm: 1.5 },
      { name: 'West End Vancouver', lat: 49.2860, lng: -123.1340, radiusKm: 1.5 }
    ]
  },

  calgary: {
    city: 'Calgary',
    state: 'Alberta',
    country: 'CA',
    center: { lat: 51.0447, lng: -114.0719 },
    bounds: { minLat: 50.85, maxLat: 51.25, minLng: -114.35, maxLng: -113.85 },
    rejectTerms: ['edmonton', 'toronto', 'vancouver'],
    zones: [
      { name: 'Downtown Calgary', lat: 51.0447, lng: -114.0719, radiusKm: 2.0 },
      { name: 'Beltline', lat: 51.0390, lng: -114.0740, radiusKm: 1.5 },
      { name: 'Kensington', lat: 51.0530, lng: -114.0860, radiusKm: 1.5 },
      { name: 'Inglewood Calgary', lat: 51.0410, lng: -114.0320, radiusKm: 2.0 },
      { name: 'Mount Royal', lat: 51.0310, lng: -114.0880, radiusKm: 2.0 }
    ]
  }
};
