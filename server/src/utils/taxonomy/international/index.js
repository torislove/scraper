/**
 * international/index.js
 * Aggregator for all country-specific subvector mappings.
 */

const US = require('./us');
const GB = require('./gb');
const CA = require('./ca');
const AU = require('./au');
const AE = require('./ae');
const DE = require('./de');
const FR = require('./fr');
const SG = require('./sg');
const NZ = require('./nz');
const IE = require('./ie');
const ZA = require('./za');

const INTERNATIONAL_LOCALIZED_SUBVECTORS = {
  US,
  GB,
  CA,
  AU,
  AE,
  DE,
  FR,
  SG,
  NZ,
  IE,
  ZA
};

module.exports = {
  INTERNATIONAL_LOCALIZED_SUBVECTORS,
  US,
  GB,
  CA,
  AU,
  AE,
  DE,
  FR,
  SG,
  NZ,
  IE,
  ZA
};
