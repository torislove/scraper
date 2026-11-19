const express = require('express');
const router = express.Router();
const { suggest, suggestForCountry } = require('../services/searchSuggest');
const { parseUniversalQuery, PROPRIETARY_VECTORS } = require('../utils/universalQueryEngine');
const { classifyLocation } = require('../utils/universalGeoCluster');

/**
 * GET /api/search/suggest?q=plumbers%20in%20vij&country=US
 *
 * Returns resolved category + location, grouped suggestions,
 * and real-time semantic intent breakdown (HUD tokens, radius, proprietary vectors, location classification).
 *
 * `country` makes the place resolver country-aware: India is answered from the
 * local gazetteer, every other country from the keyless OSM services.
 */
router.get('/suggest', async (req, res) => {
  try {
    const rawQ = req.query.q || '';
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.isMaster === 'true';
    const country = String(req.query.country || '').toUpperCase().slice(0, 2);
    const payload = await suggestForCountry({
      q: rawQ,
      category: req.query.category || '',
      location: req.query.location || '',
      limit: req.query.limit,
      isMaster,
      country
    });

    // Attach real-time universal natural language parsing contract
    const parsed = parseUniversalQuery(rawQ || `${req.query.category || ''} in ${req.query.location || ''}`, country);
    const locationClassification = parsed.location ? classifyLocation(parsed.location) : null;
    parsed.locationClassification = locationClassification;
    payload.parsed = parsed;
    payload.locationClassification = locationClassification;

    res.json(payload);
  } catch (error) {
    console.error('[Search Suggest Error]', error.message);
    res.json({
      ok: false,
      query: '',
      ready: false,
      category: null,
      location: null,
      suggestions: [],
      error: error.message
    });
  }
});

/**
 * POST /api/search/feedback
 *
 * Self-learning live feedback loop: teaches taxonomyLearner whenever a user
 * runs a search, selects an autocomplete suggestion, or accepts a correction.
 */
router.post('/feedback', (req, res) => {
  try {
    const taxonomyLearner = require('../services/taxonomyLearner');
    const searchSuggest = require('../services/searchSuggest');
    const { rawQuery, selectedCategory, selectedLocation, country, correctedFrom } = req.body || {};
    const result = taxonomyLearner.recordFeedback({
      rawQuery,
      selectedCategory,
      selectedLocation,
      country,
      correctedFrom
    });
    searchSuggest.clearSuggestCache();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/learned
 *
 * Full auto-learning catalogue for the master "What the engine learned" view.
 * Everything is derived from finished runs that returned leads.
 */
router.get('/learned', (req, res) => {
  try {
    const taxonomyLearner = require('../services/taxonomyLearner');
    const limit = Math.max(20, Math.min(500, Number(req.query.limit) || 150));
    const catalog = taxonomyLearner.getCatalog(limit);
    const tag = `W/"learned-${catalog.revision || 0}-${catalog.totals.queries}-${catalog.totals.products}-${catalog.totals.services}-${limit}"`;
    res.set('ETag', tag);
    res.set('Cache-Control', 'private, max-age=5');
    if (req.headers['if-none-match'] === tag) return res.status(304).end();
    return res.json({ ok: true, ...catalog });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/taxonomy
 *
 * Auto-learning summary: how many products, categories and brands the engine
 * has learned from successful runs. Shown in the master engine board.
 */
router.get('/taxonomy', (req, res) => {
  try {
    const taxonomyLearner = require('../services/taxonomyLearner');
    const summary = taxonomyLearner.getSummary();
    const tag = `W/"taxonomy-${summary.updatedAt || 'new'}-${summary.products}-${summary.services}"`;
    res.set('ETag', tag);
    res.set('Cache-Control', 'private, max-age=5');
    if (req.headers['if-none-match'] === tag) return res.status(304).end();
    return res.json({ ok: true, ...summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/localities
 *
 * Micro-localities learned from vendor addresses by city.
 */
router.get('/localities', (req, res) => {
  try {
    const taxonomyLearner = require('../services/taxonomyLearner');
    const city = req.query.city || '';
    const localities = taxonomyLearner.getLocalities(city);
    return res.json({ ok: true, city, localities });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/search/taxonomy/seed
 * Seeds the autonomous learning store with high-yield universal Indian services.
 */
router.post('/taxonomy/seed', (req, res) => {
  try {
    const taxonomyLearner = require('../services/taxonomyLearner');
    const result = taxonomyLearner.seedUniversal();
    res.json({ ok: true, message: `Successfully seeded ${result.seeded} universal service categories.`, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/classify?q=...
 *
 * Dedicated standalone location classification endpoint for instant HUD badges.
 */
router.get('/classify', (req, res) => {
  try {
    const rawQ = req.query.q || '';
    const classification = classifyLocation(rawQ);
    res.json({ ok: true, classification });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/parse?q=...
 *
 * Dedicated standalone universal parser endpoint.
 */
router.get('/parse', (req, res) => {
  try {
    const rawQ = req.query.q || '';
    const parsed = parseUniversalQuery(rawQ);
    res.json({ ok: true, ...parsed });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/search/vectors
 *
 * Returns the proprietary multi-vector crawler catalog.
 */
router.get('/vectors', (req, res) => {
  res.json({
    ok: true,
    vectors: Object.values(PROPRIETARY_VECTORS)
  });
});

module.exports = router;
