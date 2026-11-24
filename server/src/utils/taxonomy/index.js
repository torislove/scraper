/**
 * taxonomy/index.js
 * Unified facade re-exporting all modular trade intelligence components.
 */

const { COMMODITY_ENTITIES, extractSpecificCommodity } = require('./commodities');
const { SECTORS, detectTradeSector } = require('./sectors');
const { SPECIFIC_NICHES, extractSpecificNiche } = require('./niches');
const { INTERNATIONAL_LOCALIZED_SUBVECTORS } = require('./international');
const querySpecificityClassifier = require('../querySpecificityClassifier');
const { getSubvectorsForQuery, getNegativeAvoidsForQuery } = require('./resolvers');
const { isIndustryConflict } = require('./conflictMatrix');
const { normalizeBrandToken, NAME_NOISE, coreNameTokens, nameSimilarity } = require('./brandIntel');
const { SHARED_DIRECTORY_NUMBERS, sameCity, areNearDuplicates, mergeVendorLeads } = require('./dedupLogic');

module.exports = {
  COMMODITY_ENTITIES,
  SECTORS,
  SPECIFIC_NICHES,
  INTERNATIONAL_LOCALIZED_SUBVECTORS,
  querySpecificityClassifier,
  extractSpecificNiche,
  extractSpecificCommodity,
  detectTradeSector,
  getSubvectorsForQuery,
  getNegativeAvoidsForQuery,
  isIndustryConflict,
  normalizeBrandToken,
  NAME_NOISE,
  coreNameTokens,
  nameSimilarity,
  SHARED_DIRECTORY_NUMBERS,
  sameCity,
  areNearDuplicates,
  mergeVendorLeads
};
