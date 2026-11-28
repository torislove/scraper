'use strict';

/**
 * cities_fr.js
 * Authoritative municipal zone clusters for France (FR).
 */

module.exports = {
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
      { name: 'Champs-Élysées (8e)', lat: 48.8719, lng: 2.3025, radiusKm: 2.0 },
      { name: 'Bastille (11e)', lat: 48.8530, lng: 2.3690, radiusKm: 1.5 },
      { name: 'Quartier Latin (5e)', lat: 48.8500, lng: 2.3440, radiusKm: 1.5 }
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
      { name: 'Presqu\'île Lyon', lat: 45.7640, lng: 4.8357, radiusKm: 1.5 },
      { name: 'Vieux Lyon', lat: 45.7628, lng: 4.8270, radiusKm: 1.5 },
      { name: 'Croix-Rousse', lat: 45.7745, lng: 4.8315, radiusKm: 1.5 },
      { name: 'Part-Dieu', lat: 45.7607, lng: 4.8596, radiusKm: 2.0 },
      { name: 'Confluence Lyon', lat: 45.7420, lng: 4.8180, radiusKm: 1.5 }
    ]
  },

  marseille: {
    city: 'Marseille',
    state: 'Provence-Alpes-Côte d\'Azur',
    country: 'FR',
    center: { lat: 43.2965, lng: 5.3698 },
    bounds: { minLat: 43.18, maxLat: 43.40, minLng: 5.25, maxLng: 5.50 },
    rejectTerms: ['paris', 'lyon', 'nice', 'toulon'],
    zones: [
      { name: 'Vieux-Port Marseille', lat: 43.2965, lng: 5.3698, radiusKm: 1.5 },
      { name: 'Le Panier', lat: 43.2990, lng: 5.3660, radiusKm: 1.0 },
      { name: 'La Plaine / Cours Julien', lat: 43.2930, lng: 5.3850, radiusKm: 1.5 },
      { name: 'Prado Marseille', lat: 43.2720, lng: 5.3820, radiusKm: 2.0 }
    ]
  },

  nice: {
    city: 'Nice',
    state: 'Provence-Alpes-Côte d\'Azur',
    country: 'FR',
    center: { lat: 43.7102, lng: 7.2620 },
    bounds: { minLat: 43.65, maxLat: 43.78, minLng: 7.15, maxLng: 7.35 },
    rejectTerms: ['cannes', 'marseille', 'paris'],
    zones: [
      { name: 'Vieux Nice', lat: 43.6970, lng: 7.2760, radiusKm: 1.0 },
      { name: 'Promenade des Anglais', lat: 43.6930, lng: 7.2550, radiusKm: 2.0 },
      { name: 'Cimiez', lat: 43.7190, lng: 7.2770, radiusKm: 1.5 },
      { name: 'Jean-Médecin', lat: 43.7020, lng: 7.2670, radiusKm: 1.0 }
    ]
  }
};
