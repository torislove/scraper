/**
 * taxonomyLearner.js
 *
 * Auto-learning for categories, products, suppliers and brands.
 *
 * Rule: nothing is invented. A phrase is learned only after a real run
 * returned real leads. The learner stores:
 *   • successful query phrases ("tamarind wholesaler in Guntur")
 *   • product bases and their dealer/supplier expansions
 *   • vendor categories seen in the result set
 *   • brand mentions seen in vendor names
 *
 * Learned entries are merged into live suggestions by brandIntel, so the next
 * time someone types "tamarind" the console already knows it is a wholesale
 * commodity. The dictionary grows with use instead of staying frozen.
 *
 * Storage: server/data/taxonomy/learned.json (debounced write, capped size).
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config/paths');
const brandIntel = require('./brandIntel');

const LEARNED_FILE = path.join(DATA_DIR, 'taxonomy', 'learned.json');
const WRITE_DEBOUNCE_MS = 2000;
const MAX_QUERIES = 4000;
const MAX_PRODUCTS = 1500;
const MAX_CATEGORIES = 2500;
const MAX_BRANDS = 800;
const MAX_EXPANSIONS = 12;

let store = {
  version: 1,
  updatedAt: null,
  queries: {},
  products: {},
  categories: {},
  services: {},
  brands: {}
};
let writeTimer = null;
let loaded = false;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    if (!fs.existsSync(LEARNED_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf8'));
    if (raw && typeof raw === 'object') {
      store = {
        version: 1,
        updatedAt: raw.updatedAt || null,
        queries: raw.queries || {},
        products: raw.products || {},
        categories: raw.categories || {},
        services: raw.services || {},
        brands: raw.brands || {}
      };
    }
  } catch (err) {
    store = { version: 1, updatedAt: null, queries: {}, products: {}, categories: {}, services: {}, brands: {} };
  }
}

function saveSoon() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(LEARNED_FILE), { recursive: true });
      fs.writeFileSync(LEARNED_FILE, JSON.stringify(store, null, 2));
    } catch (err) {
      /* learning must never break a run */
    }
  }, WRITE_DEBOUNCE_MS);
  if (typeof writeTimer.unref === 'function') writeTimer.unref();
}

function trimObject(object, max) {
  const keys = Object.keys(object);
  if (keys.length <= max) return;
  keys
    .sort((a, b) => String(object[a]?.lastAt || '').localeCompare(String(object[b]?.lastAt || '')))
    .slice(0, keys.length - max)
    .forEach(key => delete object[key]);
}

function mergeList(existing, incoming, max = MAX_EXPANSIONS) {
  const out = [];
  for (const value of [...(existing || []), ...(incoming || [])]) {
    const text = String(value || '').trim();
    if (!text) continue;
    const key = normalize(text);
    if (!key || out.some(item => normalize(item) === key)) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function bump(map, key, payload = {}) {
  if (!key) return null;
  const existing = map[key] || {};
  const next = {
    ...existing,
    ...payload,
    key,
    count: Number(existing.count || 0) + 1,
    lastAt: new Date().toISOString()
  };
  map[key] = next;
  return next;
}

function vendorCategory(vendor) {
  if (!vendor || typeof vendor !== 'object') return '';
  const direct = vendor.category || vendor.businessType || vendor.vendorType || '';
  if (direct) return String(direct).trim();
  if (Array.isArray(vendor.services) && vendor.services.length) return String(vendor.services[0]).trim();
  if (typeof vendor.services === 'string' && vendor.services.trim()) {
    return vendor.services.split(/[,/|]/)[0].trim();
  }
  return '';
}

/**
 * Record a completed search. Called by the orchestrator after the folder is
 * written, so only real, finished runs teach the taxonomy.
 */
function recordRun({ query = '', location = '', leadCount = 0, phoneCount = 0, vendors = [] } = {}) {
  load();
  const text = String(query || '').trim();
  const norm = normalize(text);
  if (!norm) return null;

  const intent = brandIntel.detect(text);
  const queryEntry = bump(store.queries, norm, {
    text,
    kind: intent.intentKind,
    brand: intent.brand?.brand || '',
    product: intent.product || intent.genericProduct || '',
    lastLocation: String(location || '').slice(0, 160),
    leadCount: Number(leadCount) || 0,
    phoneCount: Number(phoneCount) || 0
  });

  // Learn a product only when the run actually produced leads. Zero-result
  // queries are remembered as attempts but never promoted into the dictionary.
  if (Number(leadCount) > 0) {
    const productName = intent.product || intent.genericProduct;
    if (productName && !intent.repair) {
      const entry = bump(store.products, normalize(productName), {
        name: productName,
        expansions: [],
        categories: []
      });
      const learnedExpansions = mergeList(entry.expansions, [
        ...(intent.expansions || []),
        ...brandIntel.genericExpansions(productName, 4)
      ]);
      entry.expansions = learnedExpansions;
      entry.categories = mergeList(entry.categories, learnedExpansions, 8);
    }

    // Services are learned the same way products are. The directory page is
    // the teacher: whatever labels it returned ("TV Repair Service",
    // "Lawyers", "AC Service Centre") become suggestions on the next query.
    // This is why repair and local-service runs must not be excluded.
    const serviceMode = intent.repair || brandIntel.isServiceQuery(text);
    const categoryName = vendorCategory(vendors[0]) || text;
    if (categoryName) {
      if (serviceMode) {
        const service = bump(store.services, normalize(categoryName), {
          name: categoryName,
          query: text
        });
        service.samples = mergeList(service.samples, vendors.slice(0, 3).map(v => v && v.name).filter(Boolean), 5);
      } else {
        bump(store.categories, normalize(categoryName), {
          name: categoryName,
          product: productName || ''
        });
      }
    }

    // Vendor-set categories are the strongest signal: they are exactly what
    // the directories returned for this phrase.
    for (const vendor of (Array.isArray(vendors) ? vendors.slice(0, 40) : [])) {
      const category = vendorCategory(vendor);
      if (!category) continue;
      if (serviceMode) {
        const serviceEntry = bump(store.services, normalize(category), { name: category, query: text });
        serviceEntry.samples = mergeList(serviceEntry.samples, [vendor.name], 5);
        continue;
      }
      const categoryEntry = bump(store.categories, normalize(category), { name: category, product: productName || '' });
      categoryEntry.samples = mergeList(categoryEntry.samples, [vendor.name], 5);
    }

    // Brand mentions: only known brands, or a brand-like first token that
    // repeats across vendors (never a one-off guess).
    const brandSeen = {};
    for (const vendor of (Array.isArray(vendors) ? vendors.slice(0, 120) : [])) {
      const name = String(vendor?.name || '').trim();
      if (!name) continue;
      const detected = brandIntel.detectBrand(name);
      if (detected) {
        brandSeen[detected.brand] = (brandSeen[detected.brand] || 0) + 1;
      }
    }
    for (const [brand, hits] of Object.entries(brandSeen)) {
      if (hits < 2) continue;
      bump(store.brands, normalize(brand), { name: brand, hits });
    }
  }

  store.updatedAt = new Date().toISOString();
  trimObject(store.queries, MAX_QUERIES);
  trimObject(store.products, MAX_PRODUCTS);
  trimObject(store.categories, MAX_CATEGORIES);
  trimObject(store.services, MAX_CATEGORIES);
  trimObject(store.brands, MAX_BRANDS);
  saveSoon();
  return queryEntry;
}

function matchEntries(map, text, max = 3) {
  const norm = normalize(text);
  if (!norm || norm.length < 2) return [];
  const matches = [];
  for (const [key, entry] of Object.entries(map)) {
    if (key === norm) {
      matches.push({ entry, score: 100 });
      continue;
    }
    if (norm.includes(key) || key.includes(norm)) {
      matches.push({ entry, score: 40 + Math.min(20, key.length) });
    }
  }
  return matches
    .sort((a, b) => (b.score - a.score) || (Number(b.entry.count || 0) - Number(a.entry.count || 0)))
    .slice(0, max)
    .map(match => match.entry);
}

/**
 * Learned dealer/supplier phrases for a free-text product. Used by
 * brandIntel.suggest() so the console improves after each real run.
 */
function expansionsFor(text) {
  load();
  const intent = brandIntel.detect(text);
  const candidates = [intent.product, intent.genericProduct, text].map(normalize).filter(Boolean);
  for (const candidate of candidates) {
    const product = store.products[candidate];
    if (product && Array.isArray(product.expansions) && product.expansions.length) {
      return { expansions: product.expansions.slice(0, MAX_EXPANSIONS), runs: product.count || 0, source: 'product' };
    }
  }
  const query = matchEntries(store.queries, text, 2)
    .find(entry => entry.product && Array.isArray(entry.expansions) && entry.expansions.length);
  if (query) {
    return { expansions: query.expansions.slice(0, MAX_EXPANSIONS), runs: query.count || 0, source: 'query' };
  }
  return { expansions: [], runs: 0, source: '' };
}

function matchServiceEntries(text, max = 2) {
  const tokens = new Set(normalize(text).split(' ').filter(token => token.length >= 3));
  if (!tokens.size) return [];
  const scored = [];
  for (const entry of Object.values(store.services)) {
    const haystack = new Set(`${entry.name || ''} ${entry.query || ''}`
      .split(' ')
      .map(token => token.trim())
      .filter(token => token.length >= 3));
    let overlap = 0;
    for (const token of tokens) if (haystack.has(token)) overlap += 1;
    if (overlap) scored.push({ entry, overlap, count: Number(entry.count || 0) });
  }
  return scored
    .sort((a, b) => (b.overlap - a.overlap) || (b.count - a.count))
    .slice(0, max)
    .map(item => item.entry);
}

/**
 * Suggestion rows from learned data. Same shape as brandIntel rows.
 */
function suggest(text, limit = 2) {
  load();
  const raw = String(text || '').trim();
  if (raw.length < 2) return [];

  const rows = [];
  // Services first: a repair/local-service query should surface the labels the
  // directories actually returned, not guessed product phrases.
  const services = matchServiceEntries(raw, 2);
  for (const service of services) {
    rows.push({
      type: 'category',
      group: 'service',
      value: service.name,
      label: service.name,
      subtitle: `Learned from ${service.count || 1} browser run${Number(service.count || 1) === 1 ? '' : 's'} · ${(service.samples || []).slice(0, 2).join(', ') || 'directory listings'}`,
      detail: 'LEARNED',
      family: 'home-services',
      familyLabel: 'Learned services',
      learned: true,
      runs: service.count || 0,
      intentKind: 'local_service'
    });
    if (rows.length >= limit) return rows;
  }

  const products = matchEntries(store.products, raw, 2);
  for (const product of products) {
    for (const expansion of (product.expansions || []).slice(0, Math.max(1, limit - rows.length))) {
      rows.push({
        type: 'category',
        group: 'product',
        value: expansion,
        label: expansion,
        subtitle: `Learned from ${product.count || 1} successful run${Number(product.count || 1) === 1 ? '' : 's'} · “${product.name}”`,
        detail: 'LEARNED',
        family: 'generic',
        familyLabel: 'Learned suppliers',
        learned: true,
        runs: product.count || 0,
        intentKind: 'product'
      });
      if (rows.length >= limit) break;
    }
    if (rows.length >= limit) break;
  }

  if (!rows.length) {
    const queries = matchEntries(store.queries, raw, 1);
    for (const entry of queries) {
      if (!entry.product) continue;
      rows.push({
        type: 'category',
        group: 'product',
        value: entry.text,
        label: entry.text,
        subtitle: `Remembered from ${entry.count || 1} run${Number(entry.count || 1) === 1 ? '' : 's'} · ${entry.leadCount || 0} leads`,
        detail: 'LEARNED',
        family: 'generic',
        familyLabel: 'Learned searches',
        learned: true,
        runs: entry.count || 0,
        intentKind: entry.kind || 'product'
      });
    }
  }

  return rows;
}

function getSummary() {
  load();
  return {
    updatedAt: store.updatedAt,
    queries: Object.keys(store.queries).length,
    products: Object.keys(store.products).length,
    categories: Object.keys(store.categories).length,
    services: Object.keys(store.services).length,
    brands: Object.keys(store.brands).length,
    topServices: Object.values(store.services)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 8)
      .map(item => ({ name: item.name, runs: item.count || 0 })),
    topProducts: Object.values(store.products)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 10)
      .map(item => ({ name: item.name, runs: item.count || 0, expansions: (item.expansions || []).slice(0, 3) }))
  };
}

function reset() {
  load();
  store = { version: 1, updatedAt: new Date().toISOString(), queries: {}, products: {}, categories: {}, services: {}, brands: {} };
  saveSoon();
}

/**
 * Full learned catalogue for the master GUI. Everything here came from real
 * finished runs — it is a transcript of what the scraper learned, not a
 * hand-written list.
 */
function catalog(map, limit) {
  return Object.values(map)
    .sort((a, b) => (Number(b.count || 0) - Number(a.count || 0))
      || String(b.lastAt || '').localeCompare(String(a.lastAt || '')))
    .slice(0, limit)
    .map(entry => ({
      key: entry.key,
      name: entry.name || entry.text || entry.key,
      runs: Number(entry.count || 0),
      lastAt: entry.lastAt || null,
      query: entry.query || '',
      product: entry.product || '',
      expansions: (entry.expansions || []).slice(0, 6),
      samples: (entry.samples || []).slice(0, 4),
      leadCount: Number(entry.leadCount || 0),
      phoneCount: Number(entry.phoneCount || 0),
      lastLocation: entry.lastLocation || ''
    }));
}

function getCatalog(limit = 150) {
  load();
  return {
    updatedAt: store.updatedAt,
    totals: {
      queries: Object.keys(store.queries).length,
      products: Object.keys(store.products).length,
      categories: Object.keys(store.categories).length,
      services: Object.keys(store.services).length,
      brands: Object.keys(store.brands).length
    },
    queries: catalog(store.queries, limit),
    products: catalog(store.products, limit),
    categories: catalog(store.categories, limit),
    services: catalog(store.services, limit),
    brands: catalog(store.brands, limit)
  };
}

module.exports = {
  recordRun,
  suggest,
  expansionsFor,
  getSummary,
  getCatalog,
  reset,
  learnedFile: LEARNED_FILE
};
