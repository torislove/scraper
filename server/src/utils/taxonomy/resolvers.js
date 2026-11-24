/**
 * resolvers.js
 * Dynamic subvectors and negative avoid keywords resolver.
 */

const querySpecificityClassifier = require('../querySpecificityClassifier');
const { INTERNATIONAL_LOCALIZED_SUBVECTORS } = require('./international');
const { extractSpecificCommodity } = require('./commodities');
const { extractSpecificNiche } = require('./niches');
const { detectTradeSector } = require('./sectors');

/**
 * Returns dynamic subvectors for a given query, preserving the exact substantive entity
 */
function getSubvectorsForQuery(query, countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  const qLower = String(query || '').toLowerCase().trim();

  // 0. Deterministic Specificity Classifier (Laser Domain Purity First)
  const specificity = querySpecificityClassifier.classifyQuerySpecificity(query, code);
  if (specificity.isParticular && Array.isArray(specificity.microSynonyms) && specificity.microSynonyms.length > 0) {
    return specificity.microSynonyms;
  }

  // 1. International localized taxonomy check
  if (code !== 'IN') {
    const intlMap = INTERNATIONAL_LOCALIZED_SUBVECTORS[code] || INTERNATIONAL_LOCALIZED_SUBVECTORS.US;
    if (intlMap) {
      for (const [key, vectors] of Object.entries(intlMap)) {
        if (qLower.includes(key)) {
          return vectors;
        }
      }
    }
    // Fallback to US if regional map didn't have this key
    if (code !== 'US' && INTERNATIONAL_LOCALIZED_SUBVECTORS.US) {
      for (const [key, vectors] of Object.entries(INTERNATIONAL_LOCALIZED_SUBVECTORS.US)) {
        if (qLower.includes(key)) {
          return vectors;
        }
      }
    }
  }

  const commodity = extractSpecificCommodity(query);
  if (commodity && Array.isArray(commodity.subvectors) && commodity.subvectors.length) {
    return commodity.subvectors;
  }

  const niche = extractSpecificNiche(query);
  if (niche && Array.isArray(niche.subvectors) && niche.subvectors.length) {
    return niche.subvectors;
  }

  const sector = detectTradeSector(query);
  if (sector && Array.isArray(sector.subvectors) && sector.subvectors.length) {
    return sector.subvectors;
  }

  // Universal dynamic subvector generation for all trade categories
  const cleanQ = String(query || '').replace(/\s+/g, ' ').trim();
  if (cleanQ && cleanQ.length >= 2) {
    return [
      `Top Rated ${cleanQ}`,
      `Best ${cleanQ}`,
      `Professional ${cleanQ} Services`,
      `Authorized ${cleanQ} Dealers`,
      `Wholesale & Retail ${cleanQ}`,
      `Commercial ${cleanQ} Specialists`,
      `Leading ${cleanQ} Center`,
      `Emergency 24 Hours ${cleanQ}`
    ];
  }
  return [];
}

/**
 * Returns negative avoid keywords for a query
 */
function getNegativeAvoidsForQuery(query, countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  const specificity = querySpecificityClassifier.classifyQuerySpecificity(query, code);
  if (specificity.isParticular && Array.isArray(specificity.avoids) && specificity.avoids.length > 0) {
    return specificity.avoids;
  }

  const niche = extractSpecificNiche(query);
  if (niche && Array.isArray(niche.avoids) && niche.avoids.length) {
    return niche.avoids;
  }
  const sector = detectTradeSector(query);
  if (sector && Array.isArray(sector.avoids)) {
    return sector.avoids;
  }
  return [];
}

module.exports = {
  getSubvectorsForQuery,
  getNegativeAvoidsForQuery
};
