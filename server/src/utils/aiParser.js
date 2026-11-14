/**
 * aiParser — now a thin wrapper over the offline local brain.
 *
 * History: this file used to lazily load a 25 MB DistilBERT zero-shot model
 * through @xenova/transformers (a package that was never installed, and a model
 * that was never bundled, so it silently fell back to keyword matching), and it
 * called api.datamuse.com for synonyms on every search. Both are gone.
 *
 * Everything below runs on files that ship with the app:
 *   - server/src/services/localBrain/model.json      (~100 KB classifier)
 *   - server/src/services/localBrain/lexicon.js      (regional + family terms)
 *   - server/db/india_villages.json                  (administrative gazetteer)
 *
 * No network, no API key, no download, no native module.
 *
 * Exports are unchanged so callers do not need edits:
 *   loadAIModel()                       load the model (idempotent)
 *   getKeywordSynonyms(category, loc)   search-term expansion
 *   verifyWithAI(name, html, cat, kws)  page/vendor relevance
 */

const brain = require('../services/localBrain');

/** Kept async for compatibility with the old transformer loader. */
async function loadAIModel() {
  const ready = brain.init();
  if (!ready) {
    console.error('[AI Model] local brain model.json missing — run: node server/src/services/localBrain/train.js');
    return null;
  }
  const status = brain.status();
  console.log(`[AI Model] local brain ready: ${status.categories} categories, ${status.families} families, ${status.modelKB} KB, offline`);
  return status;
}

// Load at boot so the first search is not the one paying for it.
loadAIModel();

async function getKeywordSynonyms(category, location = '') {
  return brain.synonyms(category, location);
}

async function verifyWithAI(vendorName, htmlContent, expectedCategory, aiKeywords = []) {
  return brain.relevance(vendorName, htmlContent, expectedCategory, aiKeywords);
}

module.exports = {
  loadAIModel,
  getKeywordSynonyms,
  verifyWithAI
};
