const express = require('express');
const router = express.Router();
const dbAdapter = require('../config/dbAdapter');
const indiaGeoIndex = require('../utils/indiaGeoIndex');
const deepProfileService = require('../services/deepProfileService');
const { estimateRun, estimateDeepJob } = require('../services/runEstimator');
const { parseSearchQuery } = require('../services/categoryRouter');

function parseEngines(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

// GET /api/deep-profile/estimate?query=plumbers+in+Vijayawada&strategy=broad&engines=auto
// Accepts either one free-text query or explicit category + location fields.
router.get('/estimate', (req, res) => {
  try {
    const parsed = parseSearchQuery({
      query: req.query.query,
      category: req.query.category,
      location: req.query.location
    });
    const estimate = estimateRun({
      category: parsed.category || req.query.category || req.query.query,
      location: parsed.location || req.query.location,
      strategy: req.query.strategy,
      enabledEngines: parseEngines(req.query.engines || req.query.enabledEngines),
      targetLeads: req.query.targetLeads,
      deep: req.query.deep === 'true' || req.query.deep === '1',
      website: req.query.website === 'true' || req.query.website === '1'
    });
    res.json(estimate);
  } catch (err) {
    console.error('[DeepProfile Estimate]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/deep-profile/estimate/deep?vendorCount=250
router.get('/estimate/deep', (req, res) => {
  try {
    const vendors = dbAdapter.getVendors() || [];
    const vendorCount = req.query.vendorCount != null
      ? Number(req.query.vendorCount)
      : vendors.filter(v => !v.deepExtractedAt).length;
    res.json(estimateDeepJob({ vendorCount, concurrency: req.query.concurrency }));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/deep-profile/health
router.get('/health', (req, res) => {
  try {
    let playwright = false;
    try {
      playwright = Boolean(require('../scrapers/browserFactory').chromium);
    } catch (e) {
      playwright = false;
    }

    indiaGeoIndex.load();
    const geo = indiaGeoIndex.getStats();
    const health = deepProfileService.getHealth();

    res.json({
      ok: true,
      ...health,
      engines: {
        playwright,
        googleMaps: playwright,
        website: true,
        villageIndex: true
      },
      geo: {
        states: geo.states,
        districts: geo.districts,
        subDistricts: geo.subDistricts,
        villages: geo.villages,
        villageIndexReady: geo.villageIndexReady
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/deep-profile/fields — field contract for clients
router.get('/fields', (req, res) => {
  res.json({
    ok: true,
    version: deepProfileService.VERSION,
    groups: deepProfileService.FIELD_GROUPS,
    trackedFields: deepProfileService.FIELD_DEFS.length
  });
});

// POST /api/deep-profile/vendor/:id — run one vendor (async by default)
router.post('/vendor/:id', async (req, res) => {
  try {
    const vendor = (dbAdapter.getVendors() || []).find(v => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ ok: false, error: 'Vendor not found' });

    const options = {
      force: req.body.force !== false,
      includeWebsite: req.body.includeWebsite !== false,
      includeGoogle: req.body.includeGoogle !== false,
      websiteUrl: req.body.websiteUrl,
      maxWebsitePages: req.body.maxWebsitePages,
      googleTimeoutMs: req.body.googleTimeoutMs
    };

    if (req.body.wait === true) {
      const result = await deepProfileService.deepExtractVendor(vendor.id, options);
      return res.json({ ok: Boolean(result.ok), result, profile: deepProfileService.getVendorProfile(vendor.id) });
    }

    const job = deepProfileService.startJob({
      vendorIds: [vendor.id],
      force: true,
      includeWebsite: options.includeWebsite,
      includeGoogle: options.includeGoogle,
      websiteUrl: options.websiteUrl,
      limit: 1
    });

    res.status(202).json({ ok: true, jobId: job.id, job, vendorId: vendor.id });
  } catch (err) {
    console.error('[DeepProfile Vendor]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/deep-profile/vendor/:id — full grouped profile
router.get('/vendor/:id', (req, res) => {
  try {
    const profile = deepProfileService.getVendorProfile(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'Vendor not found' });
    res.json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/deep-profile/run — batch deep extraction job
router.post('/run', (req, res) => {
  try {
    const body = req.body || {};
    const vendors = dbAdapter.getVendors() || [];
    const vendorIds = Array.isArray(body.vendorIds) && body.vendorIds.length
      ? body.vendorIds
      : vendors.map(v => v.id);

    if (!vendorIds.length) {
      return res.status(400).json({ ok: false, error: 'No vendors available to deep-extract.' });
    }

    const job = deepProfileService.startJob({
      vendorIds,
      force: body.force === true,
      includeWebsite: body.includeWebsite !== false,
      includeGoogle: body.includeGoogle !== false,
      onlyWithWebsite: body.onlyWithWebsite === true,
      limit: body.limit,
      concurrency: body.concurrency
    });

    const estimate = estimateDeepJob({
      vendorCount: job.total,
      concurrency: body.concurrency || 2
    });

    res.status(202).json({ ok: true, jobId: job.id, job, estimate });
  } catch (err) {
    console.error('[DeepProfile Run]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/deep-profile/jobs — recent jobs
router.get('/jobs', (req, res) => {
  res.json({ ok: true, jobs: deepProfileService.listJobs() });
});

// GET /api/deep-profile/jobs/:id
router.get('/jobs/:id', (req, res) => {
  const job = deepProfileService.getJob(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job });
});

// POST /api/deep-profile/jobs/:id/stop
router.post('/jobs/:id/stop', (req, res) => {
  const job = deepProfileService.stopJob(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job });
});

module.exports = router;
