/**
 * internationalGeoIndexer.js
 * Lazy-loading in-memory index for international country geo JSON files.
 *
 * Architecture:
 *   server/db/geo/index.json             → country metadata registry
 *   server/db/geo/international/{CC}/*.json → per-country metro/suburb data
 *
 * Usage:
 *   const { getCountryMetros, searchInternationalMetro } = require('./internationalGeoIndexer');
 *   const metros = getCountryMetros('US');   // ['New York Metro', 'Los Angeles Metro', ...]
 *   const zones  = searchInternationalMetro('London', 'GB');  // ['City of London', 'Westminster', ...]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const candidateGeoDirs = [
  path.join(__dirname, '../../../db/geo'),
  path.join(__dirname, '../../db/geo'),
  path.join(process.cwd(), 'server/db/geo'),
  path.join(process.cwd(), 'db/geo')
];
const GEO_DIR = candidateGeoDirs.find(d => {
  try { return require('fs').existsSync(d); } catch { return false; }
}) || candidateGeoDirs[0];
const INDEX_PATH = path.join(GEO_DIR, 'index.json');

// ── In-memory caches (populated lazily per country) ──
const _countryCache   = new Map();   // CC -> loaded data object
const _metroFlat      = new Map();   // lowerName -> [zone strings]
let   _geoIndex       = null;        // the full index.json

function loadGeoIndex() {
  if (_geoIndex) return _geoIndex;
  try {
    if (fs.existsSync(INDEX_PATH)) {
      _geoIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    } else {
      _geoIndex = { countries: {} };
    }
  } catch (e) {
    _geoIndex = { countries: {} };
  }
  return _geoIndex;
}

function loadCountry(cc) {
  if (!cc) return null;
  const upper = String(cc).toUpperCase();
  if (_countryCache.has(upper)) return _countryCache.get(upper);

  const idx = loadGeoIndex();
  const entry = idx.countries && idx.countries[upper];
  if (!entry || !Array.isArray(entry.files)) {
    _countryCache.set(upper, null);
    return null;
  }

  let merged = {};
  for (const relPath of entry.files) {
    const absPath = path.join(GEO_DIR, relPath);
    try {
      if (fs.existsSync(absPath)) {
        const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        Object.assign(merged, data);
      }
    } catch (e) { /* skip corrupt file */ }
  }

  _countryCache.set(upper, merged);

  // Index all metro/cluster names for fast lookup
  _buildMetroIndex(upper, merged, entry.primaryKey);

  return merged;
}

function _buildMetroIndex(cc, data, primaryKey) {
  if (!data || !primaryKey) return;
  const root = data[primaryKey];
  if (!root) return;

  if (Array.isArray(root)) {
    // flat list of metro names
    root.forEach(name => {
      _metroFlat.set(`${cc}:${String(name).toLowerCase().replace(/[^a-z0-9]/g, '')}`, [name]);
    });
  } else if (typeof root === 'object') {
    // keyed object { 'New York Metro': [...] } or { 'Central Region': [...] }
    for (const [metroName, zones] of Object.entries(root)) {
      const key = `${cc}:${String(metroName).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (Array.isArray(zones)) {
        _metroFlat.set(key, zones);
      } else if (zones && typeof zones === 'object') {
        // nested like AU: { inner: [...], east: [...] }
        const flat = Object.values(zones).flat().filter(x => typeof x === 'string');
        _metroFlat.set(key, flat);
      }
    }
  }
}

/**
 * Returns array of top-level metro/cluster names for a country.
 * @param {string} cc ISO country code (e.g. 'US', 'GB')
 * @returns {string[]}
 */
function getCountryMetros(cc) {
  if (!cc) return [];
  const upper = String(cc).toUpperCase();
  const data  = loadCountry(upper);
  if (!data) return [];

  const idx    = loadGeoIndex();
  const entry  = idx.countries && idx.countries[upper];
  const pk     = entry && entry.primaryKey;
  const root   = pk && data[pk];

  if (!root) return [];
  if (Array.isArray(root)) return root.slice();
  return Object.keys(root);
}

/**
 * Searches for a city/suburb name across all loaded country data.
 * Returns the ward/suburb list if found, or null.
 *
 * @param {string} location   e.g. 'London', 'Sydney CBD', 'Toronto'
 * @param {string} countryCode e.g. 'GB', 'AU', 'CA'
 * @returns {string[] | null}
 */
function searchInternationalMetro(location, countryCode) {
  if (!location) return null;
  const upper = String(countryCode || '').toUpperCase();
  if (upper) loadCountry(upper);

  const cleanLoc = String(location).toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix   = `${upper}:`;

  // Exact key match
  const exactKey = `${upper}:${cleanLoc}`;
  if (_metroFlat.has(exactKey)) return _metroFlat.get(exactKey);

  // Partial prefix match
  for (const [key, zones] of _metroFlat.entries()) {
    if (!upper || key.startsWith(prefix)) {
      const keyPart = key.slice(prefix.length);
      if (keyPart.startsWith(cleanLoc) || cleanLoc.startsWith(keyPart)) {
        return zones;
      }
    }
  }

  return null;
}

/**
 * Returns the flat suburb/ward list for a known metro key.
 * Handles nested sub-objects (e.g. AU inner/east/west) automatically.
 *
 * @param {string} countryCode
 * @param {string} metroName
 * @returns {string[]}
 */
function getMetroWards(countryCode, metroName) {
  if (!countryCode || !metroName) return [];
  const upper    = String(countryCode).toUpperCase();
  const data     = loadCountry(upper);
  if (!data) return [];

  const idx   = loadGeoIndex();
  const entry = idx.countries && idx.countries[upper];
  const pk    = entry && entry.primaryKey;
  const root  = pk && data[pk];
  if (!root || typeof root !== 'object') return [];

  const target = root[metroName];
  if (!target) return [];
  if (Array.isArray(target)) return target;
  if (typeof target === 'object') {
    return Object.values(target).flat().filter(x => typeof x === 'string');
  }
  return [];
}

/**
 * Lists all supported country codes.
 * @returns {string[]}
 */
function getSupportedCountries() {
  const idx = loadGeoIndex();
  return Object.keys(idx.countries || {});
}

// Pre-warm the index (but not individual country files) on startup
loadGeoIndex();
console.log('[InternationalGeoIndexer] Loaded geo index:', Object.keys(_geoIndex.countries || {}).join(', '));

module.exports = {
  loadCountry,
  getCountryMetros,
  searchInternationalMetro,
  getMetroWards,
  getSupportedCountries
};
