/**
 * googlePlaces/index.js
 * Unified facade re-exporting the modular Google Maps scraping engine.
 */

const {
  warmZoneContextPool,
  acquireZoneContext,
  releaseZoneContext,
  closeZoneContextPool
} = require('./contextPool');

const {
  calculateLeadScore,
  determineTier
} = require('./scoring');

const {
  scrapeWebsiteForSocials,
  extractStorefrontMediaAndLogo,
  setEnricherLogger
} = require('./siteEnricher');

const {
  isListingRelevantToQuery,
  validCoord,
  extractCoords,
  getDistanceKm,
  zoneDistanceReject,
  isWithinBounds
} = require('./spatialGuard');

const {
  scrapeGooglePlaces,
  setDeps
} = require('./placesScraper');

module.exports = {
  scrapeGooglePlaces,
  warmZoneContextPool,
  closeZoneContextPool,
  setDeps,
  isListingRelevantToQuery,
  calculateLeadScore,
  determineTier
};
