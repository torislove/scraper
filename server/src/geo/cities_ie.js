'use strict';

/**
 * cities_ie.js
 * Authoritative municipal zone clusters for Ireland (IE).
 */

module.exports = {
  dublin: {
    city: 'Dublin',
    state: 'Leinster',
    country: 'IE',
    center: { lat: 53.3498, lng: -6.2603 },
    bounds: { minLat: 53.25, maxLat: 53.45, minLng: -6.42, maxLng: -6.10 },
    rejectTerms: ['cork', 'galway', 'belfast', 'limerick', 'london'],
    zones: [
      { name: 'Dublin City Centre', lat: 53.3498, lng: -6.2603, radiusKm: 2.0 },
      { name: 'Temple Bar', lat: 53.3454, lng: -6.2644, radiusKm: 1.0 },
      { name: 'Dublin Docklands (Silicon Docks)', lat: 53.3480, lng: -6.2380, radiusKm: 1.5 },
      { name: 'Ballsbridge', lat: 53.3280, lng: -6.2300, radiusKm: 2.0 },
      { name: 'Ranelagh', lat: 53.3260, lng: -6.2550, radiusKm: 1.5 },
      { name: 'Sandyford Business Park', lat: 53.2750, lng: -6.2160, radiusKm: 2.0 },
      { name: 'Rathmines', lat: 53.3210, lng: -6.2650, radiusKm: 1.5 }
    ]
  },

  cork: {
    city: 'Cork',
    state: 'Munster',
    country: 'IE',
    center: { lat: 51.8985, lng: -8.4756 },
    bounds: { minLat: 51.80, maxLat: 51.98, minLng: -8.60, maxLng: -8.35 },
    rejectTerms: ['dublin', 'galway', 'limerick'],
    zones: [
      { name: 'Cork City Centre', lat: 51.8985, lng: -8.4756, radiusKm: 1.5 },
      { name: 'Victorian Quarter Cork', lat: 51.9010, lng: -8.4680, radiusKm: 1.0 },
      { name: 'Douglas Cork', lat: 51.8740, lng: -8.4380, radiusKm: 2.0 },
      { name: 'Ballincollig Commercial', lat: 51.8880, lng: -8.5870, radiusKm: 2.5 }
    ]
  },

  galway: {
    city: 'Galway',
    state: 'Connacht',
    country: 'IE',
    center: { lat: 53.2707, lng: -9.0568 },
    bounds: { minLat: 53.22, maxLat: 53.33, minLng: -9.15, maxLng: -8.95 },
    rejectTerms: ['dublin', 'cork', 'limerick'],
    zones: [
      { name: 'Galway Latin Quarter', lat: 53.2707, lng: -9.0568, radiusKm: 1.2 },
      { name: 'Salthill', lat: 53.2590, lng: -9.0820, radiusKm: 1.5 },
      { name: 'Ballybrit Tech Park', lat: 53.2890, lng: -8.9980, radiusKm: 2.0 }
    ]
  }
};
