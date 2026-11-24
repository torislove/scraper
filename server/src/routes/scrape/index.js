/**
 * scrape/index.js
 * Unified facade mounting all modular scrape sub-routers.
 */

const express = require('express');
const router = express.Router();
const scrapeShared = require('./scrapeShared');

const jobControlRoutes = require('./jobControlRoutes');
const searchRoutes = require('./searchRoutes');
const masterSweepRoutes = require('./masterSweepRoutes');
const enrichmentRoutes = require('./enrichmentRoutes');
const extensionRoutes = require('./extensionRoutes');

router.use(jobControlRoutes);
router.use(searchRoutes);
router.use(masterSweepRoutes);
router.use(enrichmentRoutes);
router.use(extensionRoutes);

module.exports = {
  scrapeRouter: router,
  setDeps: scrapeShared.setDeps,
  isSessionActive: scrapeShared.isSessionActive
};
