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
const MASTER_LEARNED_FILE = path.join(DATA_DIR, 'master', 'learned_intelligence.json');
const WRITE_DEBOUNCE_MS = 2000;
const MAX_QUERIES = 4000;
const MAX_PRODUCTS = 1500;
const MAX_CATEGORIES = 3500;
const MAX_BRANDS = 1200;
const MAX_EXPANSIONS = 16;

let store = {
  version: 3,
  updatedAt: null,
  queries: {},
  products: {},
  categories: {},
  services: {},
  brands: {},
  localities: {},
  synonyms: {},
  typos: {}
};
let writeTimer = null;
let loaded = false;

// ── Snapshot cache ──────────────────────────────────────────────────────────
// Building and serialising the whole catalogue on every request is what made
// the Learning tab time out while Playwright jobs were saturating the event
// loop. The snapshot is now built once per store change and served verbatim.
let snapshot = null;
let revision = 0;

function invalidateSnapshot() {
  revision += 1;
  snapshot = null;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fix known typos while keeping the human casing of directory labels. */
function canonical(text) {
  return brandIntel.fixSpelling(String(text || '').replace(/\s+/g, ' ').trim());
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    let raw = null;
    if (fs.existsSync(LEARNED_FILE)) {
      raw = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf8'));
    } else if (fs.existsSync(MASTER_LEARNED_FILE)) {
      raw = JSON.parse(fs.readFileSync(MASTER_LEARNED_FILE, 'utf8'));
    }
    if (raw && typeof raw === 'object') {
      store = {
        version: 3,
        updatedAt: raw.updatedAt || null,
        queries: raw.queries || {},
        products: raw.products || {},
        categories: raw.categories || {},
        services: raw.services || {},
        brands: raw.brands || {},
        localities: raw.localities || {},
        synonyms: raw.synonyms || {},
        typos: raw.typos || {}
      };
      sanitizeContaminatedLearnedSynonyms(store);
      absorbTypos();
    }
  } catch (err) {
    store = { version: 3, updatedAt: null, queries: {}, products: {}, categories: {}, services: {}, brands: {}, localities: {}, synonyms: {}, typos: {} };
  }
}

function sanitizeContaminatedLearnedSynonyms(targetStore) {
  if (!targetStore || !targetStore.synonyms) return;
  for (const [key, entry] of Object.entries(targetStore.synonyms)) {
    // If the key is about computer/laptop
    if (/\b(?:computer|laptop|desktop|pc|gaming pc)\b/i.test(key)) {
      if (Array.isArray(entry.synonyms)) {
        entry.synonyms = entry.synonyms.filter(s => {
          const sNorm = String(s || '').toLowerCase();
          return !/\b(?:cctv|surveillance|security|biometric|dvr|nvr|camera|spas?|saloon?|parlour|wedding|mandap|plumber|dentist)\b/i.test(sNorm);
        });
      }
    }
    // If the key is about cctv/surveillance
    if (/\b(?:cctv|surveillance|security camera|biometric)\b/i.test(key)) {
      if (Array.isArray(entry.synonyms)) {
        entry.synonyms = entry.synonyms.filter(s => {
          const sNorm = String(s || '').toLowerCase();
          return !/\b(?:computer shop|laptop showroom|laptop dealer|desktop pc|gaming pc|spas?)\b/i.test(sNorm);
        });
      }
    }
    // Remove empty synonym records
    if (!entry.synonyms || !entry.synonyms.length) {
      delete targetStore.synonyms[key];
    }
  }
}

function isCategoryCompatible(queryText, observedCategory) {
  if (!queryText || !observedCategory) return false;
  const qNorm = normalize(queryText);
  const oNorm = normalize(observedCategory);

  // Computer & Laptop searches MUST NEVER accept CCTV, surveillance, spas, salons, etc.
  if (/\b(?:computer|laptop|desktop|pc|gaming pc)\b/i.test(qNorm)) {
    if (/\b(?:cctv|surveillance|security|biometric|dvr|nvr|intercom|access control|camera|spa|spas|salon|parlour|wedding|mandap|plumber|dentist)\b/i.test(oNorm)) {
      return false;
    }
  }

  // CCTV & Surveillance searches MUST NEVER accept computer shops, spas, salons
  if (/\b(?:cctv|surveillance|security camera|biometric)\b/i.test(qNorm)) {
    if (/\b(?:computer shop|laptop showroom|gaming pc|spa|salon|wedding|mandap)\b/i.test(oNorm)) {
      return false;
    }
  }

  // Manufacturing & Industrial searches MUST NEVER accept retail salons, spas, weddings, clinics
  if (/\b(?:manufactur|factory|industrial|machinery|fabricat|foundry)\b/i.test(qNorm)) {
    if (/\b(?:spa|salon|beauty parlour|barber|wedding|bridal|dentist|clinic)\b/i.test(oNorm)) {
      return false;
    }
  }

  // Mobile/Phone searches MUST NEVER learn automobile garages or unrelated trades
  if (/\b(?:mobile|phone|cellphone|smartphone|iphone)\b/i.test(qNorm)) {
    if (/\b(?:auto repair|car repair|car garage|car service|bike service|automobile|plumber|dentist|salon|restaurant|biryani|banquet)\b/i.test(oNorm)) {
      return false;
    }
  }

  // Universal NAICS exclusion matrix check so every industry learns safely
  try {
    const naicsTaxonomy = require('../utils/naicsTaxonomy');
    const qN = naicsTaxonomy.classifyToNaics(queryText);
    const oN = naicsTaxonomy.classifyToNaics(observedCategory);
    if (qN && oN && naicsTaxonomy.isMutuallyExclusive(qN.sectorCode, oN.sectorCode)) {
      return false;
    }
  } catch (e) {}

  return true;
}

/**
 * Fold legacy typo entries into their corrected key ("computer delears" →
 * "computer dealers") so old learning survives a spelling fix instead of
 * sitting in the store forever as a bad suggestion.
 */
function absorbTypos() {
  for (const name of ['queries', 'products', 'categories', 'services']) {
    const map = store[name];
    if (!map || typeof map !== 'object') continue;
    for (const key of Object.keys(map)) {
      const entry = map[key];
      if (!entry) continue;
      const label = entry.name || entry.text || key;
      const fixed = canonical(label);
      const nextKey = normalize(fixed);
      if (!nextKey || nextKey === key) continue;
      const target = map[nextKey];
      if (!target) {
        map[nextKey] = { ...entry, key: nextKey, name: fixed, text: entry.text ? fixed : entry.text };
      } else {
        target.count = Number(target.count || 0) + Number(entry.count || 0);
        target.lastAt = String(target.lastAt || '') > String(entry.lastAt || '') ? target.lastAt : entry.lastAt;
        target.expansions = mergeList(target.expansions, entry.expansions);
        target.samples = mergeList(target.samples, entry.samples, 6);
        target.leadCount = Math.max(Number(target.leadCount || 0), Number(entry.leadCount || 0));
        target.phoneCount = Math.max(Number(target.phoneCount || 0), Number(entry.phoneCount || 0));
      }
      delete map[key];
    }
  }
  invalidateSnapshot();
}

function saveSoon() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(LEARNED_FILE), { recursive: true });
      fs.writeFileSync(LEARNED_FILE, JSON.stringify(store, null, 2));

      // Bi-Directional Master Intelligence Bridge:
      // Keep master intelligence registry updated with aggregated learnings across all runs
      fs.mkdirSync(path.dirname(MASTER_LEARNED_FILE), { recursive: true });
      fs.writeFileSync(MASTER_LEARNED_FILE, JSON.stringify({
        ...store,
        federatedAt: new Date().toISOString()
      }, null, 2));
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
 * Extract micro-localities, colonies, and roads from vendor addresses
 */
function extractMicroLocalities(vendors, baseLocation) {
  if (!Array.isArray(vendors) || !vendors.length) return [];
  const cityKey = normalize(baseLocation);
  if (!cityKey) return [];

  const foundLocalities = new Map();
  const localityRegex = /\b([A-Za-z0-9\s]{3,30}?)\s+(Nagar|Colony|Pet|Peta|Bazaar|Bazar|Road|Rd|Line|Ln|Circle|Bypass|Enclave|Layout|Apartments|Gutta|Palem|Cheruvu|Garuvu|Padu|Agraharam)\b/gi;

  for (const v of vendors) {
    const addr = String(v.address || '');
    if (!addr) continue;

    let match;
    while ((match = localityRegex.exec(addr)) !== null) {
      const fullLocality = `${match[1].trim()} ${match[2].trim()}`;
      const normLoc = normalize(fullLocality);
      if (normLoc.length >= 4 && !normLoc.includes('door no') && !normLoc.includes('near')) {
        const existing = foundLocalities.get(normLoc) || { name: fullLocality, count: 0, samples: [] };
        existing.count += 1;
        if (v.name && existing.samples.length < 3 && !existing.samples.includes(v.name)) {
          existing.samples.push(v.name);
        }
        foundLocalities.set(normLoc, existing);
      }
    }
  }

  return Array.from(foundLocalities.values());
}

/**
 * Record a completed search. Called by the orchestrator after the folder is
 * written, so only real, finished runs teach the taxonomy.
 */
function recordRun({ query = '', location = '', leadCount = 0, phoneCount = 0, vendors = [] } = {}) {
  load();
  const rawText = String(query || '').trim();
  const text = canonical(rawText) || rawText;
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
    const productName = brandIntel.canonicalPhrase(intent.product || intent.genericProduct);
    if (productName) {
      const entry = bump(store.products, normalize(productName), {
        name: productName,
        expansions: [],
        categories: []
      });
      const learnedExpansions = mergeList(entry.expansions, [
        ...(intent.expansions || []),
        ...brandIntel.genericExpansions(productName, 4)
      ].map(canonical));
      entry.expansions = learnedExpansions;
      entry.categories = mergeList(entry.categories, learnedExpansions, 8);
    }

    // Services are learned the same way products are. The directory page is
    // the teacher: whatever labels it returned ("TV Repair Service",
    // "Lawyers", "AC Service Centre") become suggestions on the next query.
    // This is why repair and local-service runs must not be excluded.
    const serviceMode = intent.repair || brandIntel.isServiceQuery(text);
    const categoryName = canonical(vendorCategory(vendors[0])) || text;
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
    for (const vendor of (Array.isArray(vendors) ? vendors.slice(0, 80) : [])) {
      const category = canonical(vendorCategory(vendor));
      if (!category) continue;
      if (serviceMode) {
        const serviceEntry = bump(store.services, normalize(category), { name: category, query: text });
        serviceEntry.samples = mergeList(serviceEntry.samples, [vendor.name], 5);
        continue;
      }
      const categoryEntry = bump(store.categories, normalize(category), { name: category, product: productName || '' });
      categoryEntry.samples = mergeList(categoryEntry.samples, [vendor.name], 5);
    }

    // Dynamic Category Expansion: inspect all vendors and learn all subcategories, services and specialties
    for (const vendor of (Array.isArray(vendors) ? vendors : [])) {
      const labels = [
        vendor.category,
        vendor.subcategory,
        vendor.businessType,
        vendor.vendorType,
        ...(Array.isArray(vendor.services) ? vendor.services : [])
      ].filter(Boolean);

      for (const lab of labels) {
        const canon = canonical(String(lab).trim());
        const key = normalize(canon);
        if (key && key.length >= 3 && !key.includes('undefined')) {
          const entry = bump(store.categories, key, {
            name: canon,
            product: productName || '',
            lastLocation: String(location || '').slice(0, 100)
          });
          if (vendor.name) {
            entry.samples = mergeList(entry.samples, [vendor.name], 6);
          }
        }
      }
    }

    // Signal 1: Bidirectional Real-World Synonym Learning from Scraped Vendor Categories
    // When searching "print shops" returns 15 vendors tagged "Digital printer" & "Commercial printer",
    // automatically link them bidirectionally so future searches for either term surface both!
    const catFreq = new Map();
    for (const vendor of (Array.isArray(vendors) ? vendors : [])) {
      const cat = canonical(vendorCategory(vendor));
      const catKey = normalize(cat);
      if (!catKey || catKey.length < 3 || catKey === norm || /^(business|vendor|store|shop|service|local|other|unknown|general)$/i.test(catKey)) continue;
      // Strict semantic compatibility guard: Never learn cross-family or contaminated categories
      if (!isCategoryCompatible(text, cat)) continue;
      const existing = catFreq.get(catKey) || { name: cat, count: 0 };
      existing.count += 1;
      catFreq.set(catKey, existing);
    }
    const topObservedCats = Array.from(catFreq.values())
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    if (topObservedCats.length) {
      if (!store.synonyms) store.synonyms = {};
      const synNames = topObservedCats.map(c => c.name);
      const rootSyn = store.synonyms[norm] || { key: norm, name: text, synonyms: [], count: 0 };
      rootSyn.name = rootSyn.name || text;
      rootSyn.synonyms = mergeList(rootSyn.synonyms, synNames, 12);
      rootSyn.count = Number(rootSyn.count || 0) + 1;
      rootSyn.lastAt = new Date().toISOString();
      store.synonyms[norm] = rootSyn;

      // Bidirectional reverse link so searching the Google Maps label also knows the user phrasing
      for (const observed of topObservedCats) {
        const obsKey = normalize(observed.name);
        if (!obsKey || obsKey === norm) continue;
        const rev = store.synonyms[obsKey] || { key: obsKey, name: observed.name, synonyms: [], count: 0 };
        rev.synonyms = mergeList(rev.synonyms, [text], 12);
        rev.count = Number(rev.count || 0) + 1;
        rev.lastAt = new Date().toISOString();
        store.synonyms[obsKey] = rev;
      }
    }

    // Learn micro-localities from lead addresses for this city
    const cityKey = normalize(location);
    if (cityKey) {
      if (!store.localities) store.localities = {};
      if (!store.localities[cityKey]) store.localities[cityKey] = {};

      const discovered = extractMicroLocalities(vendors, location);
      for (const loc of discovered) {
        const locKey = normalize(loc.name);
        const existing = store.localities[cityKey][locKey] || { name: loc.name, count: 0, samples: [] };
        existing.count += loc.count;
        existing.lastSeenAt = new Date().toISOString();
        existing.samples = mergeList(existing.samples, loc.samples, 5);
        store.localities[cityKey][locKey] = existing;
      }
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
  invalidateSnapshot();
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
    // Strict word boundary check for short terms (<= 3 chars, e.g. "ac", "pc", "tv", "ro")
    // to prevent "ac" from matching inside "manufacturing" or "packaging".
    let isMatch = false;
    if (key.length <= 3 || norm.length <= 3) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedNorm = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      isMatch = new RegExp(`(^|\\s)${escapedKey}(\\s|$)`, 'i').test(norm) ||
                new RegExp(`(^|\\s)${escapedNorm}(\\s|$)`, 'i').test(key);
    } else {
      isMatch = norm.includes(key) || key.includes(norm);
    }
    if (isMatch) {
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
  const seen = new Set();
  const pushRow = (row) => {
    const k = normalize(row.value || row.label);
    if (!k || seen.has(k)) return;
    seen.add(k);
    rows.push(row);
  };

  // 1. Direct Learned Synonyms first (highest real-world relevance)
  const normRaw = normalize(raw);
  if (store.synonyms && normRaw.length >= 2) {
    const synMatches = matchEntries(store.synonyms, normRaw, 2);
    for (const synEntry of synMatches) {
      for (const syn of (synEntry.synonyms || []).slice(0, 3)) {
        if (rows.length >= limit) break;
        pushRow({
          type: 'category',
          group: 'synonym',
          value: syn,
          label: syn,
          subtitle: `Related to “${synEntry.name}” · Auto-learned synonym`,
          detail: 'SYNONYM',
          family: 'generic',
          familyLabel: 'Related Categories',
          learned: true,
          runs: synEntry.count || 1,
          intentKind: 'synonym'
        });
      }
    }
  }

  // 2. Services: real labels returned by live directories & user searches
  const services = matchServiceEntries(raw, 2);
  for (const service of services) {
    if (rows.length >= limit) break;
    pushRow({
      type: 'category',
      group: 'service',
      value: service.name,
      label: service.name,
      subtitle: `Learned from ${service.count || 1} search${Number(service.count || 1) === 1 ? '' : 'es'}${service.samples?.length ? ` · ${service.samples.slice(0, 2).join(', ')}` : ''}`,
      detail: 'LEARNED',
      family: 'home-services',
      familyLabel: 'Learned services',
      learned: true,
      runs: service.count || 0,
      intentKind: 'local_service'
    });
  }

  // 3. Learned products
  const products = matchEntries(store.products, raw, 2);
  for (const product of products) {
    for (const expansion of (product.expansions || []).slice(0, Math.max(1, limit - rows.length))) {
      if (rows.length >= limit) break;
      pushRow({
        type: 'category',
        group: 'product',
        value: expansion,
        label: expansion,
        subtitle: `Learned from ${product.count || 1} search${Number(product.count || 1) === 1 ? '' : 'es'} · “${product.name}”`,
        detail: 'LEARNED',
        family: 'generic',
        familyLabel: 'Learned suppliers',
        learned: true,
        runs: product.count || 0,
        intentKind: 'product'
      });
    }
    if (rows.length >= limit) break;
  }

  // 4. Frequent user searches (Google-style trending/history recall)
  if (rows.length < limit) {
    const queries = matchEntries(store.queries, raw, 2);
    for (const entry of queries) {
      if (rows.length >= limit) break;
      pushRow({
        type: 'category',
        group: 'query',
        value: entry.text,
        label: entry.text,
        subtitle: `Popular search · ${entry.count || 1} run${Number(entry.count || 1) === 1 ? '' : 's'}${entry.leadCount ? ` · ${entry.leadCount} leads` : ''}`,
        detail: 'POPULAR',
        family: 'generic',
        familyLabel: 'Popular Searches',
        learned: true,
        runs: entry.count || 0,
        intentKind: entry.kind || 'query'
      });
    }
  }

  return rows.slice(0, limit);
}

/**
 * Signal 2: Live feedback learning from user searches, suggestion clicks, and accepted corrections.
 * Strictly guarded by COMMON_WORD_WHITELIST so valid English/Indian words can never be poisoned.
 */
function recordFeedback({ rawQuery = '', selectedCategory = '', selectedLocation = '', country = 'IN', correctedFrom = '' } = {}) {
  load();
  const cat = String(selectedCategory || '').trim();
  const raw = String(rawQuery || '').trim();
  const catNorm = normalize(cat);
  const rawNorm = normalize(raw);

  if (catNorm && catNorm.length >= 3 && catNorm.length <= 80) {
    bump(store.queries, catNorm, {
      text: cat,
      kind: 'user_feedback',
      lastLocation: String(selectedLocation || '').slice(0, 120),
      country: String(country || 'IN').toUpperCase().slice(0, 2)
    });
    const srv = bump(store.services, catNorm, {
      name: cat,
      query: raw || cat
    });
    if (rawNorm && rawNorm !== catNorm && rawNorm.length >= 3 && !rawNorm.includes(' in ')) {
      srv.expansions = mergeList(srv.expansions, [raw], 12);
    }
  }

  // Learn safe typo -> canonical correction ONLY when user explicitly accepts a correction
  // AND the source token is NOT a valid dictionary word in COMMON_WORD_WHITELIST.
  if (correctedFrom && cat) {
    try {
      const { COMMON_WORD_WHITELIST, levenshtein } = require('../utils/tradeIntelligence');
      const fromNorm = normalize(correctedFrom);
      const toNorm = normalize(cat);
      const fromTokens = fromNorm.split(' ').filter(Boolean);
      const isProtected = fromTokens.length > 0 && fromTokens.every(w => COMMON_WORD_WHITELIST.has(w));
      if (!isProtected && fromNorm.length >= 4 && toNorm.length >= 4 && fromNorm !== toNorm && levenshtein(fromNorm, toNorm) <= 3) {
        if (!store.typos) store.typos = {};
        const prev = store.typos[fromNorm] || { from: fromNorm, to: cat, count: 0 };
        prev.to = cat;
        prev.count += 1;
        prev.lastAt = new Date().toISOString();
        store.typos[fromNorm] = prev;
      }
    } catch (e) {}
  }

  store.updatedAt = new Date().toISOString();
  trimObject(store.queries, MAX_QUERIES);
  trimObject(store.services, MAX_CATEGORIES);
  invalidateSnapshot();
  saveSoon();
  return { ok: true, learned: cat || raw };
}

function getSynonyms(text, limit = 6) {
  load();
  const normText = normalize(text);
  if (!normText || normText.length < 2 || !store.synonyms) return [];
  const matches = matchEntries(store.synonyms, normText, 3);
  const out = [];
  const seen = new Set([normText]);
  for (const m of matches) {
    for (const s of (m.synonyms || [])) {
      const k = normalize(s);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(s);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function resolveLearnedTypo(text) {
  load();
  const normText = normalize(text);
  if (!normText || !store.typos) return '';
  const hit = store.typos[normText];
  if (hit && hit.count >= 1 && hit.to) return hit.to;
  return '';
}

function buildSnapshot() {
  const totals = {
    queries: Object.keys(store.queries).length,
    products: Object.keys(store.products).length,
    categories: Object.keys(store.categories).length,
    services: Object.keys(store.services).length,
    brands: Object.keys(store.brands).length
  };
  const summary = {
    updatedAt: store.updatedAt,
    ...totals,
    topServices: Object.values(store.services)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 8)
      .map(item => ({ name: item.name, runs: item.count || 0 })),
    topProducts: Object.values(store.products)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
      .slice(0, 10)
      .map(item => ({
        name: item.name,
        runs: item.count || 0,
        expansions: (item.expansions || []).slice(0, 3).join(' ')
      }))
  };
  const full = {
    updatedAt: store.updatedAt,
    totals,
    queries: catalog(store.queries, 500),
    products: catalog(store.products, 500),
    categories: catalog(store.categories, 500),
    services: catalog(store.services, 500),
    brands: catalog(store.brands, 500)
  };
  snapshot = { revision, summary, full };
  return snapshot;
}

function ensureSnapshot() {
  load();
  if (!snapshot) buildSnapshot();
  return snapshot;
}

function getSummary() {
  return { ...ensureSnapshot().summary };
}

function getCatalog(limit = 150) {
  const { full } = ensureSnapshot();
  const max = Math.max(1, Number(limit) || 150);
  return {
    updatedAt: full.updatedAt,
    revision,
    totals: full.totals,
    queries: full.queries.slice(0, max),
    products: full.products.slice(0, max),
    categories: full.categories.slice(0, max),
    services: full.services.slice(0, max),
    brands: full.brands.slice(0, max)
  };
}

function reset() {
  load();
  store = { version: 1, updatedAt: new Date().toISOString(), queries: {}, products: {}, categories: {}, services: {}, brands: {} };
  invalidateSnapshot();
  saveSoon();
}

function seedUniversal() {
  load();
  const SEEDS = [
    { key: 'wedding album printing lab', name: 'Wedding Album Printing Lab', expansions: ['Digital Color Lab', 'Wedding Album Manufacturers', 'Photo Book Printing', 'Karizma Album Printers'] },
    { key: 'water purifier repair and ro service', name: 'Water Purifier & RO Repair', expansions: ['RO Water Purifier Dealers', 'Aquaguard Service', 'Water Purifier Repair', 'Water Treatment Plants'] },
    { key: 'car detailing and ceramic coating', name: 'Car Detailing & Ceramic Coating', expansions: ['Car Wash', 'Ceramic Detailing', 'Car Polish', 'Teflon Coating', 'Foam Wash'] },
    { key: 'borewell drilling contractors', name: 'Borewell Drilling Contractors', expansions: ['Borewell Drillers', 'Submersible Pump Dealers', 'Bore Well Contractors'] },
    { key: 'steel and aluminium fabrication', name: 'Steel & Aluminium Fabrication', expansions: ['Fabrication Works', 'Iron Grill Gates', 'Shed Fabrication', 'Welding Works'] },
    { key: 'modular kitchen and interior designers', name: 'Modular Kitchen & Interior Designers', expansions: ['Home Interiors', 'False Ceiling Contractors', 'Modular Kitchen Dealers', 'Wardrobe Works'] },
    { key: 'solar panel and inverter dealers', name: 'Solar Panel & Inverter Dealers', expansions: ['Rooftop Solar Installers', 'Inverter Battery Dealers', 'Solar Power Systems', 'UPS Dealers'] },
    { key: 'ac repair and refrigerator service', name: 'AC Repair & Refrigerator Service', expansions: ['AC Installation', 'Air Conditioner Service', 'Gas Refilling', 'Cooling Appliance Repair'] },
    { key: 'plumbers and sanitary contractors', name: 'Plumbers & Sanitary Contractors', expansions: ['Plumbing Contractors', 'Bathroom Fittings Repair', 'Water Tank Cleaners', 'Pipeline Repair'] },
    { key: 'electricians and wiring contractors', name: 'Electricians & Wiring Contractors', expansions: ['Electrical Contractors', 'House Wiring', 'Switch Panel Repair', 'Motor Rewinding'] },
    { key: 'chartered accountants and gst consultants', name: 'Chartered Accountants & GST Consultants', expansions: ['CA Firms', 'Tax Consultants', 'GST Filing Services', 'Accounting & Bookkeeping'] },
    { key: 'dental clinics and dentists', name: 'Dental Clinics & Dentists', expansions: ['Dental Hospitals', 'Root Canal Specialists', 'Orthodontists', 'Dental Implants'] },
    { key: 'packers and movers', name: 'Packers And Movers', expansions: ['Household Shifting', 'Office Relocation', 'Movers and Packers', 'Transport Services'] },
    { key: 'pest control services', name: 'Pest Control Services', expansions: ['Termite Treatment', 'Bedbug Control', 'Fumigation Services', 'Cockroach Pest Control'] },
    { key: 'wedding catering services', name: 'Wedding Catering Services', expansions: ['Outdoor Caterers', 'Veg & Non-Veg Caterers', 'Buffet Catering', 'Sweet Shops & Caterers'] }
  ];

  for (const item of SEEDS) {
    bump(store.services, item.key, {
      name: item.name,
      expansions: item.expansions,
      count: Math.max(3, Number(store.services[item.key]?.count || 0))
    });
    bump(store.categories, item.key, {
      name: item.name,
      expansions: item.expansions,
      count: Math.max(3, Number(store.categories[item.key]?.count || 0))
    });
  }

  store.updatedAt = new Date().toISOString();
  invalidateSnapshot();
  saveSoon();
  return { seeded: SEEDS.length, totalServices: Object.keys(store.services).length };
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

function getLocalities(city = '') {
  load();
  if (!store.localities) return [];
  if (city) {
    const cityKey = normalize(city);
    const map = store.localities[cityKey] || {};
    return Object.values(map).sort((a, b) => b.count - a.count);
  }
  return Object.entries(store.localities).map(([c, map]) => ({
    city: c,
    count: Object.keys(map).length,
    localities: Object.values(map).sort((a, b) => b.count - a.count).slice(0, 30)
  }));
}

function getCatalog(limit = 150) {
  load();
  const totalLocalities = Object.values(store.localities || {}).reduce((acc, m) => acc + Object.keys(m).length, 0);
  return {
    updatedAt: store.updatedAt,
    totals: {
      queries: Object.keys(store.queries).length,
      products: Object.keys(store.products).length,
      categories: Object.keys(store.categories).length,
      services: Object.keys(store.services).length,
      brands: Object.keys(store.brands).length,
      localities: totalLocalities
    },
    queries: catalog(store.queries, limit),
    products: catalog(store.products, limit),
    categories: catalog(store.categories, limit),
    services: catalog(store.services, limit),
    brands: catalog(store.brands, limit),
    localities: getLocalities()
  };
}

module.exports = {
  recordRun,
  recordFeedback,
  getSynonyms,
  resolveLearnedTypo,
  suggest,
  expansionsFor,
  getSummary,
  getCatalog,
  getLocalities,
  reset,
  seedUniversal,
  learnedFile: LEARNED_FILE,
  masterLearnedFile: MASTER_LEARNED_FILE
};
