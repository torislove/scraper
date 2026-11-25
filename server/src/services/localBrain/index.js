/**
 * localBrain — the offline "local brain".
 *
 * A small, dependency-free text model that ships with the app. It replaces:
 *   - the never-shipped 25 MB DistilBERT download in utils/aiParser.js
 *   - the Datamuse synonym HTTP call
 *   - every NVIDIA (Llama 3.3 70B) call in utils/intelligentExtractor.js
 *
 * Design rules, in order of importance:
 *   1. No network. Ever. No API key. No model download.
 *   2. Deterministic. Same input -> same output, on every machine.
 *   3. Honest. It returns a confidence, and says "unknown" when it is unsure.
 *   4. Small. model.json is ~100 KB, built from data that already ships.
 *
 * Public API:
 *   init()                                  load the model (idempotent)
 *   status()                                model + gazetteer diagnostics
 *   classify(text)                          { family, category, confidence, alternatives }
 *   synonyms(category, location)            search-term expansion (replaces getKeywordSynonyms)
 *   relevance(name, text, category, terms)  page/vendor relevance (replaces verifyWithAI)
 *   analyzeScope(place)                     broad-region vs single-town detection
 *   detectCountry(text) / countryProfile()   international helpers
 *
 * Rebuild the model after changing the catalog or lexicon:
 *   node server/src/services/localBrain/train.js
 */

const fs = require('fs');
const path = require('path');

const { DIM, tokenize, vectorize, vectorizeTokens, cosine } = require('./tokenizer');
const { REGIONAL_TERMS, FAMILY_SYNONYMS, INTENT_WORDS, BOILERPLATE } = require('./lexicon');
const countries = require('./countries');
const gazetteer = require('./gazetteer');
const router = require('../categoryRouter');

const MODEL_PATH = path.join(__dirname, 'model.json');

const state = {
  ready: false,
  failed: false,
  model: null,
  bytes: 0,
  categories: [],
  families: []
};

function init() {
  if (state.ready || state.failed) return state.ready;
  try {
    const raw = fs.readFileSync(MODEL_PATH, 'utf8');
    const model = JSON.parse(raw);
    if (model.version !== 1 || !model.families || !model.categories) {
      throw new Error(`unsupported model version ${model.version}`);
    }
    state.model = model;
    state.bytes = raw.length;
    state.categories = Object.entries(model.categories).map(([label, entry]) => ({
      label,
      family: entry.f,
      aliases: entry.a || [],
      vector: entry.v || []
    }));
    state.families = Object.entries(model.families).map(([label, vector]) => ({ label, vector }));
    state.ready = true;
  } catch (err) {
    state.failed = true;
    console.error(`[localBrain] model unavailable (${MODEL_PATH}):`, err.message);
  }
  return state.ready;
}

function status() {
  init();
  return {
    ready: state.ready,
    failed: state.failed,
    modelFile: MODEL_PATH,
    modelBytes: state.bytes,
    modelKB: Math.round((state.bytes / 1024) * 10) / 10,
    dimensions: state.ready ? state.model.dim : DIM,
    categories: state.categories.length,
    families: state.families.length,
    vocabulary: state.ready ? state.model.vocabulary : 0,
    builtAt: state.ready ? state.model.builtAt : null,
    categoriesByFamily: state.ready
      ? state.categories.reduce((acc, c) => {
          acc[c.family] = (acc[c.family] || 0) + 1;
          return acc;
        }, {})
      : {},
    gazetteer: gazetteer.stats(),
    network: 'none',
    apiKeys: 'none'
  };
}

function queryVectorFor(text) {
  const all = tokenize(expand(text));
  if (!all.length) return { vector: [], tokens: [], dropped: 0 };
  // Words that never appear in the model (town names, filler) add no category
  // signal and dilute the score, so they are dropped from the query.
  const known = all.filter(token => Object.prototype.hasOwnProperty.call(state.model.idf, token));
  const tokens = known.length ? known : all;
  return { vector: vectorizeTokens(tokens, state.model.idf), tokens, dropped: all.length - tokens.length };
}

function normaliseText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Exact alias matches are stronger evidence than vector similarity. */
function aliasBoost(text, aliases) {
  const value = normaliseText(text);
  if (!value) return 0;
  let best = 0;
  for (const alias of aliases) {
    const key = normaliseText(alias);
    if (!key) continue;
    if (value === key) best = Math.max(best, 0.3);
    else if (key.length > 3 && (` ${value} `).includes(` ${key} `)) best = Math.max(best, 0.18);
  }
  return best;
}

function clean(text, max = 4000) {
  return String(text == null ? '' : text).slice(0, max);
}

/** Regional/colloquial word -> expanded English text. Used before vectorising. */
function expand(text) {
  const lower = String(text || '').toLowerCase();
  const additions = [];
  for (const [term, expansion] of Object.entries(REGIONAL_TERMS)) {
    if (lower.includes(term)) additions.push(expansion);
  }
  return additions.length ? `${text} ${additions.join(' ')}` : String(text || '');
}

/**
 * Classify free text into a family and, when confident, a catalog category.
 * Confidence is the blended cosine score, which is a real similarity in [0, 1]
 * rather than the fake 0.99 values that LLM wrappers tend to emit.
 */
function classify(text) {
  if (!init()) return { family: 'generic', familyLabel: 'General vendors', category: null, confidence: 0, alternatives: [], tokens: [], ready: false };

  const query = clean(text, 400);
  const { vector, tokens } = queryVectorFor(query);
  if (!tokens.length) {
    return { family: 'generic', familyLabel: 'General vendors', category: null, confidence: 0, alternatives: [], tokens: [], ready: true };
  }

  const familyScores = state.families
    .map(f => ({ family: f.label, score: cosine(vector, f.vector) }))
    .sort((a, b) => b.score - a.score);

  const weddingWords = /\b(wedding|marriage|shaadi|shadi|vivah|pelli|muhurtham|engagement|reception|sangeet|mehendi)\b/.test(normaliseText(query));
  const categoryScores = state.categories
    .map(c => {
      const contextual = weddingWords && c.family === 'wedding' ? 0.14 : 0;
      return {
        label: c.label,
        family: c.family,
        score: Math.min(1, cosine(vector, c.vector) + aliasBoost(query, [c.label, ...c.aliases]) + contextual)
      };
    })
    .sort((a, b) => b.score - a.score);

  const bestFamily = familyScores[0] || { family: 'generic', score: 0 };
  const bestCategory = categoryScores[0] || null;

  // Blend: a known category is strong evidence; the family centroid keeps
  // unseen wordings (e.g. "mandapam booking") from falling into "generic".
  const categoryScore = bestCategory ? bestCategory.score : 0;
  const blended = Math.max(bestFamily.score, categoryScore * 0.85 + bestFamily.score * 0.15);
  const confidence = Math.round(blended * 1000) / 1000;

  let category = bestCategory && bestCategory.score >= 0.2 ? bestCategory.label : null;
  let family = category ? bestCategory.family : bestFamily.family;

  // Guard: if the category and family disagree strongly, trust the family.
  if (category && bestCategory.family !== bestFamily.family && bestFamily.score > bestCategory.score + 0.08) {
    category = null;
    family = bestFamily.family;
  }

  const familyEntry = router.FAMILY_DEFINITIONS[family];
  const alternatives = categoryScores.slice(0, 5).map(c => ({
    category: c.label,
    family: c.family,
    score: Math.round(c.score * 1000) / 1000
  }));

  return {
    family,
    familyLabel: familyEntry ? familyEntry.label : 'General vendors',
    category,
    confidence,
    alternatives,
    tokens,
    ready: true
  };
}

function locationProfile(location = '') {
  const value = String(location || '').toLowerCase();
  const inIndia = !countries.detectCountry(value) || countries.detectCountry(value).code === 'IN';
  const south = /andhra|telangana|hyderabad|guntur|vijayawada|visakhapatnam|chennai|tamil nadu|kerala|karnataka|bangalore|bengaluru|mysore|coimbatore|madurai|tirupati|warangal|nellore|kurnool|rajahmundry|kakinada|tiruchirappalli|mangalore|udupi|kochi/.test(value);
  const north = /delhi|mumbai|punjab|haryana|uttar pradesh|rajasthan|gujarat|bihar|jharkhand|west bengal|odisha|madhya pradesh|chhattisgarh|uttarakhand|himachal|jammu|lucknow|kanpur|jaipur|ahmedabad|surat|patna|bhopal|chandigarh|dehradun|varanasi|agra|noida|gurgaon|gurugram/.test(value);
  return { inIndia, south, north };
}

function filterDecor(terms, category) {
  if (!/decor/i.test(category)) return terms;
  const banned = /interior|house|painter|painting|car|furniture|paperhanger|curtain|mattress/i;
  return terms.filter(t => !banned.test(t));
}

/**
 * Search-term expansion. Replaces the old Datamuse call and the hard-coded
 * wedding/decor blocks: the catalog already knows synonyms, the lexicon adds
 * regional vocabulary, and similarity keeps irrelevant family terms out.
 */
function synonyms(category, location = '') {
  const text = String(category || '').trim();
  if (!text) return [];
  if (!init()) return [text];

  const result = classify(text);
  const queryVector = vectorize(expand(text), state.model.idf);
  const seen = new Set();
  const out = [];
  const push = (term, bucket) => {
    const value = String(term || '').trim();
    if (!value || value.length < 2) return;
    const lower = value.toLowerCase();
    if (seen.has(lower)) return;
    if (INTENT_WORDS.has(lower)) return;
    seen.add(lower);
    out.push({ term: value, bucket });
  };

  push(text, 'query');

  // 1. Known aliases for the matched catalog category.
  const entry = result.category ? state.model.categories[result.category] : null;
  if (entry) {
    for (const alias of (entry.a || []).slice(0, 10)) push(alias, 'alias');
  }

  // 1b. Self-learned synonyms verified from previous live runs.
  try {
    const learnedSyns = require('../taxonomyLearner').getSynonyms(text, 4) || [];
    for (const syn of learnedSyns) push(syn, 'learned');
  } catch (e) {}

  // 2. Curated related categories (kalyana mandapam -> banquet hall...).
  let related = [];
  try {
    related = router.getCategorySubvectors(result.category || text) || [];
  } catch (err) {
    related = [];
  }
  const scoredRelated = related
    .map(term => ({ term, score: cosine(vectorize(term, state.model.idf), queryVector) }))
    .filter(x => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  for (const item of scoredRelated) push(item.term, 'related');

  // 3. Family synonyms, similarity-filtered so "plumber" does not pull in
  //    "solar install" just because both are home services.
  const familyTerms = FAMILY_SYNONYMS[result.family] || [];
  const scoredFamily = familyTerms
    .map(term => ({ term, score: cosine(vectorize(term, state.model.idf), queryVector) }))
    .filter(x => x.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  for (const item of scoredFamily) push(item.term, 'family');

  // 4. Regional vocabulary, only where it genuinely belongs.
  const profile = locationProfile(location);
  const regionalAllowed = (term) => {
    if (profile.inIndia && (profile.south || profile.north)) {
      const southTerms = new Set(['kalyana mandapam', 'kalyanamandapam', 'mandapamu', 'pelli', 'muhurtham', 'bhavan', 'choultry']);
      const northTerms = new Set(['shadi mahal', 'shadi', 'vivah', 'bhavan', 'choultry']);
      if (profile.south && southTerms.has(term)) return true;
      if (profile.north && northTerms.has(term)) return true;
      if (!southTerms.has(term) && !northTerms.has(term)) return true;
      return false;
    }
    return true;
  };
  for (const [term, expansion] of Object.entries(REGIONAL_TERMS)) {
    if (!regionalAllowed(term)) continue;
    if (cosine(vectorize(expansion, state.model.idf), queryVector) < 0.08) continue;
    push(term, 'regional');
  }
  for (const term of related) {
    if (/mandap|pelli|shadi|bhavan|choultry/i.test(term)) push(term, 'regional');
  }

  if (/decor/i.test(text)) {
    for (const term of [
      'event decoration', 'wedding decor', 'flower decoration',
      'stage decor', 'mandap decoration', 'party decor',
      'balloon decoration', 'marriage decorators'
    ]) push(term, 'decor');
  }

  return filterDecor(out.map(o => o.term), text).slice(0, 26);
}

function stripHtml(html) {
  return clean(String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase(), 20000);
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Is this page/vendor actually about the requested category?
 *
 * Keeps the old substring + fuzzy keyword match (cheap and precise) and then
 * falls back to the local classifier instead of a transformer download.
 */
function relevance(vendorName, htmlContent, expectedCategory, aiKeywords = []) {
  const text = stripHtml(htmlContent);
  if (text.length < 50) return false;

  for (const boilerplate of BOILERPLATE) {
    // Boilerplate is allowed to exist, it just must not be the only signal.
    if (text === boilerplate) return false;
  }

  const keywords = (Array.isArray(aiKeywords) ? aiKeywords : []).map(k => String(k || '').trim()).filter(Boolean);
  for (const keyword of keywords) {
    if (keyword && text.includes(keyword.toLowerCase())) return true;
  }

  const htmlWords = [...new Set(text.split(/[^a-z0-9]+/))].filter(w => w.length > 3);
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    if (kw.length <= 3 || kw.includes(' ')) continue;
    for (const word of htmlWords) {
      if (Math.abs(word.length - kw.length) <= 1 && levenshtein(word, kw) <= 1) return true;
    }
  }

  const expected = classify(expectedCategory);
  if (!expected.confidence) return false;

  const page = classify(text.slice(0, 3000));
  if (page.family === expected.family && page.confidence >= 0.12) return true;
  if (page.category && expected.category && page.category === expected.category) return true;

  const categoryVector = expected.category && state.model
    ? state.model.categories[expected.category].v
    : state.families.find(f => f.label === expected.family)?.vector;
  if (!categoryVector) return false;
  return cosine(vectorize(text.slice(0, 3000), state.model.idf), categoryVector) >= 0.18;
}

/**
 * Broad region or single town?
 * India is answered from the local gazetteer; other countries from countries.js.
 * Always synchronous — this used to be a 45 s LLM round trip.
 */
function analyzeScope(place) {
  const value = String(place || '').trim();
  if (!value) return { type: 'specific' };

  const candidates = [value, ...value.split(',').map(p => p.trim()).filter(Boolean)];
  for (const candidate of candidates) {
    const india = gazetteer.lookup(candidate);
    if (india.level === 'state') {
      return {
        type: 'broad',
        country: 'IN',
        level: 'state',
        label: india.state,
        term: 'State',
        options: ['Search Entire State', 'Search Only Major Districts', 'Search All Mandals']
      };
    }
    if (india.level === 'district') {
      return {
        type: 'broad',
        country: 'IN',
        level: 'district',
        label: india.district,
        term: 'District',
        state: india.state,
        options: ['Search Entire District', `Search Only ${india.district} City`, 'Search All Mandals']
      };
    }
    if (india.level === 'mandal') {
      return { type: 'specific', country: 'IN', level: 'mandal', label: india.mandal, district: india.district, state: india.state };
    }
  }

  const abroad = countries.scopeOptions(value);
  if (abroad) return abroad;

  return { type: 'specific' };
}

function detectCountry(text) {
  const india = gazetteer.lookup(String(text || '').split(',')[0].trim());
  if (india.level) return countries.COUNTRIES[0];
  const direct = countries.detectCountry(text);
  if (direct) return direct;
  const region = countries.findRegion(text);
  return region ? region.country : null;
}

function countryProfile(text) {
  const country = detectCountry(text);
  if (!country) return null;
  const region = countries.findRegion(text);
  const state = region && region.country.code === country.code ? region.region : null;
  const admin = countries.adminForCountry(country.code, { state });
  return {
    code: country.code,
    name: country.name,
    currency: country.currency,
    phoneCode: country.phone,
    topTerm: admin.top,
    secondTerm: admin.second,
    localTerm: admin.local,
    subdivisionTerm: admin.subdivision,
    admin,
    adminPath: admin.levels.join(' → ')
  };
}

module.exports = {
  init,
  status,
  classify,
  synonyms,
  relevance,
  analyzeScope,
  detectCountry,
  countryProfile,
  expand,
  // Internals exposed for tests and the trainer, not for app code.
  _state: state,
  _countries: countries,
  _gazetteer: gazetteer
};
