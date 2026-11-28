'use strict';

/**
 * taxonomy/index.js
 * Master Taxonomy & Query Expansion Coordinator.
 * Resolves NAICS sectors, commodities, specialized commercial niches,
 * and localized country subvectors for the 11 sovereign nations.
 */

const { NAICS_SECTORS, resolveNaics } = require('./naics');
const { COMMODITY_ENTITIES, resolveCommodity } = require('./commodities');
const { SPECIFIC_NICHES, resolveNiche } = require('./niches');
const { classifyQuery } = require('./classifier');
const { resolveUmbrella } = require('./umbrellas');

const inTaxonomy = require('./international/in');
const usTaxonomy = require('./international/us');
const gbTaxonomy = require('./international/gb');
const auTaxonomy = require('./international/au');
const caTaxonomy = require('./international/ca');
const deTaxonomy = require('./international/de');
const frTaxonomy = require('./international/fr');
const aeTaxonomy = require('./international/ae');
const sgTaxonomy = require('./international/sg');
const nzTaxonomy = require('./international/nz');
const ieTaxonomy = require('./international/ie');

const COUNTRY_TAXONOMIES = {
  IN: inTaxonomy,
  US: usTaxonomy,
  GB: gbTaxonomy,
  AU: auTaxonomy,
  AE: aeTaxonomy
};

/**
 * Returns localized subvectors for any search query and country code.
 * Guaranteed to return rich, high-converting subvectors without breaking.
 */
function getSubvectorsForQuery(query, countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  const qClean = String(query || '').trim();
  const qLower = qClean.toLowerCase();

  // 0. Check Exhaustive Generic Umbrella (e.g. 'hospitals' -> all 15 hospital specialties, 'contractors' -> all 10 trades, etc.)
  const umbrella = resolveUmbrella(qClean, code);
  if (umbrella && Array.isArray(umbrella.subvectors) && umbrella.subvectors.length > 0) {
    return umbrella.subvectors;
  }

  // 1. Check Specific Commodity (Turmeric, Chilli, Cotton, Steel, etc.)
  const commodity = resolveCommodity(qLower);
  if (commodity && Array.isArray(commodity.subvectors) && commodity.subvectors.length > 0) {
    return commodity.subvectors;
  }

  // 2. Collect Country Sector Matches & Particular Niche Synonyms Together (never starve one with the other)
  const specificity = classifyQuery(qClean, code);
  const nicheSubs = (specificity.isParticular && Array.isArray(specificity.subvectors)) ? specificity.subvectors : [];

  const firstClause = qLower.split(/\s*[&\/,]\s*/)[0].trim() || qLower;
  const countryData = COUNTRY_TAXONOMIES[code] || COUNTRY_TAXONOMIES.IN;
  let countrySubs = [];
  if (countryData && countryData.sectors) {
    for (const [, categories] of Object.entries(countryData.sectors)) {
      if (Array.isArray(categories)) {
        for (const sub of categories) {
          if (sub.toLowerCase() === qLower || firstClause === sub.toLowerCase()) { countrySubs = categories; break; }
        }
      } else if (typeof categories === 'object') {
        const sortedEntries = Object.entries(categories).sort((a, b) => b[0].length - a[0].length);
        for (const [catKey, subvectors] of sortedEntries) {
          const catLower = catKey.toLowerCase();
          if (qLower === catLower || firstClause === catLower || qLower.startsWith(catLower)) {
            countrySubs = subvectors;
            break;
          }
        }
      }
      if (countrySubs.length) break;
    }
  }
  const combinedSubs = Array.from(new Set([...nicheSubs, ...countrySubs].filter(Boolean)));
  if (combinedSubs.length > 0) return combinedSubs;

  // 4. Check Colloquialisms
  if (countryData?.colloquials) {
    for (const [key, synonyms] of Object.entries(countryData.colloquials)) {
      if (qLower.includes(key) || synonyms.some(s => qLower.includes(s.toLowerCase()))) {
        return synonyms.map(s => `${s} in this locality`);
      }
    }
  }

  // 5. Fallback: High-Yield Domain-Aware Dynamic Subvectors (Intent-safe: never mix retail stores into services)
  if (specificity?.intentType === 'store') {
    return [qClean, `${qClean} Stores`, `${qClean} Showrooms`, `${qClean} Dealers`, `${qClean} Retail Shops`, `${qClean} Outlets`];
  }
  if (specificity?.intentType === 'b2b') {
    return [qClean, `${qClean} Manufacturers`, `${qClean} Suppliers`, `${qClean} Wholesalers`, `${qClean} Distributors`, `${qClean} Exporters`];
  }
  if (/\b(hospital|clinic|doctor|surgeon|physician|dental|ortho|cardio|neuro|oncol|dermat|gynec|pediatr|physio|health|medical|eye|ent)\b/i.test(qLower)) {
    return [qClean, `${qClean} Specialists`, `${qClean} Clinics`, `${qClean} Hospitals`, `${qClean} Doctors`, `${qClean} Centers`];
  }
  if (/\b(plumb|electr|roof|hvac|paint|carpent|pest|clean|mason|weld|repair|contractor|technician|borewell|waterproof)\b/i.test(qLower)) {
    return [qClean, `${qClean} Contractors`, `${qClean} Repair & Services`, `Emergency ${qClean}`, `Commercial ${qClean}`, `Residential ${qClean}`];
  }
  if (/\b(school|college|academy|institute|coaching|tuition|training|university)\b/i.test(qLower)) {
    return [qClean, `${qClean} Institutes`, `${qClean} Academies`, `${qClean} Centers`, `${qClean} Admissions`];
  }
  if (/\b(software|it\b|saas|digital|marketing|web|seo|cloud|agency|consult|lawyer|accountant|tax|cpa|ca\b|architect)\b/i.test(qLower)) {
    return [qClean, `${qClean} Firms`, `${qClean} Consultants`, `${qClean} Companies`, `${qClean} Agencies`, `${qClean} Services`];
  }
  return [qClean, `${qClean} Services`, `${qClean} Companies`, `${qClean} Centers`, `${qClean} Specialists`];
}

/**
 * Serializes all categories and subcategories for a given country.
 */
function getAllCategoriesForCountry(countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  const taxonomy = COUNTRY_TAXONOMIES[code] || COUNTRY_TAXONOMIES.IN;
  const result = [];

  if (taxonomy.sectors) {
    for (const [sectorName, categories] of Object.entries(taxonomy.sectors)) {
      const catList = [];
      if (Array.isArray(categories)) {
        catList.push({ category: sectorName, subcategories: categories });
      } else {
        for (const [catName, subvectors] of Object.entries(categories)) {
          catList.push({ category: catName, subcategories: subvectors });
        }
      }
      result.push({ sector: sectorName, categories: catList });
    }
  }

  return {
    countryCode: code,
    countryName: taxonomy.name || code,
    sectors: result,
    colloquials: taxonomy.colloquials || {}
  };
}

/**
 * Exports full taxonomy manifest covering all 11 supported sovereign countries.
 */
function exportFullTaxonomyManifest() {
  const manifest = {};
  for (const [code, data] of Object.entries(COUNTRY_TAXONOMIES)) {
    manifest[code] = {
      countryCode: code,
      name: data.name || code,
      totalSectors: Object.keys(data.sectors || {}).length,
      sampleSectors: Object.keys(data.sectors || {})
    };
  }
  return {
    supportedCountries: Object.keys(COUNTRY_TAXONOMIES),
    manifest
  };
}

module.exports = {
  COUNTRY_TAXONOMIES,
  NAICS_SECTORS,
  resolveNaics,
  resolveCommodity,
  resolveNiche,
  getSubvectorsForQuery,
  getAllCategoriesForCountry,
  exportFullTaxonomyManifest
};
