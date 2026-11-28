'use strict';

/**
 * cities_de.js
 * Authoritative municipal zone clusters for Germany (DE).
 */

module.exports = {
  berlin: {
    city: 'Berlin',
    state: 'Berlin',
    country: 'DE',
    center: { lat: 52.5200, lng: 13.4050 },
    bounds: { minLat: 52.35, maxLat: 52.68, minLng: 13.10, maxLng: 13.75 },
    rejectTerms: ['munich', 'hamburg', 'frankfurt', 'koln'],
    zones: [
      { name: 'Mitte Berlin', lat: 52.5200, lng: 13.4050, radiusKm: 2.0 },
      { name: 'Kreuzberg', lat: 52.4986, lng: 13.4034, radiusKm: 2.0 },
      { name: 'Prenzlauer Berg', lat: 52.5400, lng: 13.4200, radiusKm: 2.0 },
      { name: 'Charlottenburg', lat: 52.5160, lng: 13.3050, radiusKm: 2.5 },
      { name: 'Friedrichshain', lat: 52.5130, lng: 13.4540, radiusKm: 2.0 },
      { name: 'Schöneberg', lat: 52.4830, lng: 13.3550, radiusKm: 2.0 },
      { name: 'Neukölln', lat: 52.4810, lng: 13.4350, radiusKm: 2.0 }
    ]
  },

  munich: {
    city: 'Munich',
    state: 'Bavaria',
    country: 'DE',
    center: { lat: 48.1351, lng: 11.5820 },
    bounds: { minLat: 48.05, maxLat: 48.25, minLng: 11.40, maxLng: 11.72 },
    rejectTerms: ['berlin', 'hamburg', 'frankfurt', 'stuttgart'],
    zones: [
      { name: 'Altstadt Munich', lat: 48.1375, lng: 11.5755, radiusKm: 1.5 },
      { name: 'Schwabing', lat: 48.1610, lng: 11.5865, radiusKm: 2.0 },
      { name: 'Maxvorstadt', lat: 48.1500, lng: 11.5690, radiusKm: 1.5 },
      { name: 'Haidhausen', lat: 48.1330, lng: 11.5990, radiusKm: 1.5 },
      { name: 'Bogenhausen', lat: 48.1480, lng: 11.6180, radiusKm: 2.0 },
      { name: 'Glockenbachviertel', lat: 48.1300, lng: 11.5720, radiusKm: 1.5 }
    ]
  },

  hamburg: {
    city: 'Hamburg',
    state: 'Hamburg',
    country: 'DE',
    center: { lat: 53.5511, lng: 9.9937 },
    bounds: { minLat: 53.40, maxLat: 53.70, minLng: 9.70, maxLng: 10.25 },
    rejectTerms: ['berlin', 'munich', 'bremen'],
    zones: [
      { name: 'Hamburg Altstadt', lat: 53.5500, lng: 10.0000, radiusKm: 1.5 },
      { name: 'St. Pauli', lat: 53.5550, lng: 9.9600, radiusKm: 1.5 },
      { name: 'Altona', lat: 53.5530, lng: 9.9350, radiusKm: 2.0 },
      { name: 'HafenCity', lat: 53.5410, lng: 10.0030, radiusKm: 1.5 },
      { name: 'Eppendorf', lat: 53.5930, lng: 9.9880, radiusKm: 2.0 }
    ]
  },

  frankfurt: {
    city: 'Frankfurt',
    state: 'Hesse',
    country: 'DE',
    center: { lat: 50.1109, lng: 8.6821 },
    bounds: { minLat: 50.00, maxLat: 50.25, minLng: 8.50, maxLng: 8.85 },
    rejectTerms: ['berlin', 'munich', 'cologne'],
    zones: [
      { name: 'Frankfurt Innenstadt', lat: 50.1130, lng: 8.6810, radiusKm: 1.5 },
      { name: 'Sachsenhausen', lat: 50.1000, lng: 8.6850, radiusKm: 2.0 },
      { name: 'Westend Frankfurt', lat: 50.1220, lng: 8.6650, radiusKm: 1.5 },
      { name: 'Bornheim', lat: 50.1280, lng: 8.7090, radiusKm: 1.5 },
      { name: 'Nordend', lat: 50.1260, lng: 8.6910, radiusKm: 1.5 }
    ]
  }
};
