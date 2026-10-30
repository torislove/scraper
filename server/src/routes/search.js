const express = require('express');
const router = express.Router();
const { suggest } = require('../services/searchSuggest');
const { parseUniversalQuery, PROPRIETARY_VECTORS } = require('../utils/universalQueryEngine');
const { classifyLocation } = require('../utils/universalGeoCluster');

/**
 * GET /api/search/suggest?q=plumbers%20in%20vij
 *
 * Returns resolved category + location, grouped suggestions,
 * and real-time semantic intent breakdown (HUD tokens, radius, proprietary vectors, location classification).
 */
router.get('/suggest', (req, res) => {
  try {
    const rawQ = req.query.q || '';
    const payload = suggest({
      q: rawQ,
      category: req.query.category || '',
      location: req.query.location || '',
      limit: req.query.limit
    });

    // Attach real-time universal natural language parsing contract
    const parsed = parseUniversalQuery(rawQ || `${req.query.category || ''} in ${req.query.location || ''}`);
    const locationClassification = classifyLocation(parsed.location || rawQ);
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
