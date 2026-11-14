/**
 * Builds the offline brain model: `model.json`.
 *
 * Run it when the category catalog, lexicon or regional terms change:
 *
 *   node server/src/services/localBrain/train.js
 *
 * Training is a one-off build step, not something the app does at runtime. It
 * reads only files that already ship with the app (categoryRouter, lexicon) and
 * writes a small JSON file next to this script. There is no download, no API key
 * and no network access anywhere in this file.
 *
 * What gets stored:
 *   idf       token -> inverse document frequency (weighting for rare words)
 *   families  family -> sparse L2-normalised centroid
 *   categories label -> { family, aliases, vector }
 *
 * Vectors are hashed into 8192 buckets, so a category that did not exist when
 * the app was built still classifies sensibly: its words land in the same
 * buckets as the family it belongs to.
 */

const fs = require('fs');
const path = require('path');

const { DIM, tokenize, vectorize } = require('./tokenizer');
const { FAMILY_SYNONYMS, REGIONAL_TERMS } = require('./lexicon');
const router = require('../categoryRouter');

const MODEL_PATH = path.join(__dirname, 'model.json');
const MODEL_VERSION = 1;

function documents() {
  const docs = [];

  // One document per catalog category.
  for (const entry of Object.values(router.CATEGORY_CATALOG)) {
    const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
    const family = router.FAMILY_DEFINITIONS[entry.family];
    const parts = [entry.label, ...aliases];
    if (family) parts.push(family.label, family.description);
    docs.push({
      kind: 'category',
      label: entry.label,
      family: entry.family,
      aliases,
      text: parts.join(' ')
    });
  }

  // One document per family: the family's own keywords, repeated so they carry
  // more weight than a single alias would, plus curated lexicon synonyms.
  for (const [key, family] of Object.entries(router.FAMILY_DEFINITIONS)) {
    const keywords = (router.FAMILY_KEYWORDS[key] || []).map(([term]) => term);
    const curated = FAMILY_SYNONYMS[key] || [];
    const regional = Object.entries(REGIONAL_TERMS)
      .filter(([, expansion]) => tokenize(expansion).some(t => tokenize(family.description).includes(t) || t === key))
      .map(([term]) => term);
    docs.push({
      kind: 'family',
      label: key,
      family: key,
      aliases: [],
      text: [family.label, family.description, ...keywords, ...keywords, ...curated, ...regional].join(' ')
    });
  }

  return docs;
}

function buildIdf(docs) {
  const df = new Map();
  for (const doc of docs) {
    for (const token of new Set(tokenize(doc.text))) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  const total = docs.length + 1;
  const idf = {};
  for (const [token, count] of df) {
    // Standard smoothed IDF, rounded so the file stays compact.
    idf[token] = Math.round((Math.log((total / (count + 1)) + 1) * 10000)) / 10000;
  }
  return idf;
}

function centroid(vectors) {
  const sum = new Map();
  for (const vector of vectors) {
    for (const [bucket, weight] of vector) {
      sum.set(bucket, (sum.get(bucket) || 0) + weight);
    }
  }
  let norm = 0;
  for (const weight of sum.values()) norm += weight * weight;
  norm = Math.sqrt(norm) || 1;
  return [...sum.entries()]
    .map(([bucket, weight]) => [bucket, Math.round((weight / norm) * 10000) / 10000])
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => a[0] - b[0]);
}

function train() {
  const docs = documents();
  const idf = buildIdf(docs);

  const categoryDocs = docs.filter(d => d.kind === 'category');
  const familyDocs = docs.filter(d => d.kind === 'family');

  const categories = {};
  for (const doc of categoryDocs) {
    categories[doc.label] = {
      f: doc.family,
      a: doc.aliases,
      v: vectorize(doc.text, idf)
    };
  }

  const families = {};
  for (const doc of familyDocs) {
    families[doc.label] = centroid([vectorize(doc.text, idf)]);
  }

  const model = {
    version: MODEL_VERSION,
    dim: DIM,
    builtAt: new Date().toISOString(),
    // Never claim a model size we did not measure.
    vocabulary: Object.keys(idf).length,
    categories,
    families,
    idf
  };

  fs.writeFileSync(MODEL_PATH, JSON.stringify(model));
  const bytes = fs.statSync(MODEL_PATH).size;
  console.log(`[localBrain] wrote ${MODEL_PATH}`);
  console.log(`[localBrain] ${Object.keys(categories).length} categories, ${Object.keys(families).length} families, ${model.vocabulary} tokens`);
  console.log(`[localBrain] size ${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`);
  return { path: MODEL_PATH, bytes, categories: Object.keys(categories).length, families: Object.keys(families).length };
}

if (require.main === module) {
  train();
}

module.exports = { train, buildIdf, documents, MODEL_PATH };
