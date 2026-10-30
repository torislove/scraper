const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');


const { getAllLocalities } = require('../utils/intelligentExtractor');

const CATEGORIES = [
  "Banquet Halls", "Kalyana Mandapams", "Open Lawns & Farmhouses", 
  "Resorts & Destination Venues", "5-Star Hotels", "Party & Mini Halls", 
  "Temples & Ashrams", "Wedding Photographers", "Candid Photographers", "Photography", "Photographers", 
  "Pre-Wedding Shoots", "Cinematographers", "Drone Specialists", 
  "Instant Photo Booths", "Decorators", "Caterers", "Makeup Artists", 
  "Mehndi Designers", "Wedding Clothes / Boutiques", "Jewelry Shops", 
  "Wedding Cards & Invites", "Cars & Buses (Travel)", "Astrologers / Pundits", 
  "Honeymoon Packages", "Event Planners", "All Workers", "All Vendors", "All Leads"
];

const getFlatLocations = () => {
  return getAllLocalities();
};

// Native Server Intelligence filtering instead of bloated minisearch
const searchLocationsNatively = (query) => {
  const q = query.toLowerCase();
  return getFlatLocations().filter(loc => 
    loc.name.toLowerCase().includes(q) || 
    (loc.district && loc.district.toLowerCase().includes(q))
  );
};

router.get('/regions', (req, res) => {
  res.json({ message: "Regions API is deprecated. Use /knowledge instead." });
});

router.get('/suggest', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const response = await require('axios').get(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    // Response format: [ "query", ["sugg1", "sugg2"] ]
    res.json(response.data[1] || []);
  } catch (error) {
    res.json([]);
  }
});

router.get('/knowledge', (req, res) => {
  res.json({
    categories: CATEGORIES,
    locations: getFlatLocations()
  });
});

router.get('/location/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    // 1. INSTANT LOCAL SEARCH (0ms) via Native Intelligence
    const localResults = searchLocationsNatively(query);
    let formattedLocal = [];
    if (localResults && localResults.length > 0) {
      formattedLocal = localResults.slice(0, 5).map(item => ({
        name: item.name,
        display: `${item.name}${item.district && item.district !== item.name ? ', ' + item.district : ''} (AP)`,
        type: item.type
      }));
    }

    // 2. FALLBACK TO OSM NOMINATIM (Network Delay)
    let parsedLocations = [];
    try {
      const response = await require('axios').get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: query, format: 'json', addressdetails: 1, limit: 5, countrycodes: 'in' },
        headers: {
          'User-Agent': 'GomandapScraper/1.0 (contact@gomandap.com)',
        },
        timeout: 5000 
      });

      parsedLocations = response.data.map(item => ({
        name: item.name,
        display: item.display_name,
        type: item.type,
        lat: item.lat,
        lon: item.lon
      })).filter(loc => loc.name);
    } catch (osmError) {
      console.error('Nominatim Proxy Error:', osmError.message);
    }

    // Merge and deduplicate
    const combined = [...formattedLocal, ...parsedLocations];
    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    res.json(unique);
  } catch (error) {
    res.json([]);
  }
});

// Logs are passed from app state into this router
let getLogs = () => [];
router.get('/logs', (req, res) => res.json(getLogs()));

module.exports = {
  apiRouter: router,
  CATEGORIES,
  getFlatLocations,
  setLogGetter: (fn) => getLogs = fn
};
