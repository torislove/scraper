'use strict';

/**
 * server/src/routes/geoRoutes.js
 * REST endpoints for zero-cost OSM QLever + Nominatim Polygon zone resolution across all 11 nations.
 */

const geo = require('../geo');
const { getCachedCity } = require('../geo/dynamicZones');

const COUNTRY_CITIES = {
  IN: ['Guntur', 'Vijayawada', 'Hyderabad', 'Mumbai', 'Bengaluru', 'Delhi', 'Chennai', 'Pune'],
  US: ['Dallas', 'Houston', 'Austin', 'New York', 'Chicago', 'Miami', 'Los Angeles', 'Atlanta'],
  GB: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Edinburgh', 'Glasgow', 'Bristol'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Parramatta'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Mississauga', 'Edmonton'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Bordeaux', 'Lille'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain'],
  SG: ['Singapore'],
  NZ: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga'],
  IE: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford']
};

function registerGeoRoutes(app) {
  app.get('/api/geo/resolve', async (req, res) => {
    try {
      const city = String(req.query.city || req.query.location || '').trim();
      const country = String(req.query.country || 'IN').toUpperCase();
      const zoneMode = String(req.query.zoneMode || req.query.mode || 'smart').toLowerCase() === 'all' ? 'all' : 'smart';

      if (!city) {
        return res.status(400).json({ ok: false, error: 'City parameter required' });
      }

      const resolved = await geo.resolveZonesAsync(city, country, { zoneMode });
      res.json({
        ok: true,
        cityName: resolved.cityName,
        country: resolved.country,
        center: resolved.center,
        bounds: resolved.bounds,
        tier: resolved.tier,
        mode: resolved.mode,
        totalAllPlaces: resolved.totalAllPlaces || resolved.zones.length,
        smartCount: resolved.smartCount || resolved.zones.length,
        returnedCount: resolved.zones.length,
        zones: resolved.zones,
        resolutionMeta: resolved.resolutionMeta || {}
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/geo/countries-overview', (req, res) => {
    const overview = {};
    for (const [cc, cityList] of Object.entries(COUNTRY_CITIES)) {
      overview[cc] = cityList.map((city) => {
        const cached = getCachedCity(city, cc, 'smart');
        const sync = cached || geo.resolveZones(city, cc, 'smart');
        return {
          city,
          country: cc,
          smartCount: sync.smartCount || sync.zones?.length || 1,
          allCount: sync.totalAllPlaces || sync.zones?.length || 1,
          cachedOsm: Boolean(cached)
        };
      });
    }
    res.json({ ok: true, countries: overview });
  });

  app.get('/api/locations/stats', (req, res) => {
    res.json({ ok: true, nations: 11, knownHubs: Object.keys(geo.KNOWN_CITIES).length });
  });

  app.get('/api/locations/hierarchy', async (req, res) => {
    const city = String(req.query.city || 'Guntur');
    const country = String(req.query.country || 'IN').toUpperCase();
    const resolved = await geo.resolveZonesAsync(city, country, { zoneMode: 'smart' });
    res.json({ ok: true, ...resolved });
  });
}

module.exports = { registerGeoRoutes, COUNTRY_CITIES };
