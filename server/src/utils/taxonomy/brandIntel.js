/**
 * brandIntel.js
 * Vendor name normalization, noise token filtering, and token similarity.
 */

/**
 * Normalizes vendor name to a clean brand core token for deduplication.
 */
function normalizeBrandToken(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(photo|photography|photographer|photographers|studio|studios|digital|digital studio|colour lab|color lab|creations|clickz|clicks|works|enterprises|enterprise|services|service|solutions|group|hub|center|centre|in|the|best|top|near|me|guntur|tenali|vijayawada|hyderabad|visakhapatnam|andhra|pradesh)\b/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
}

const NAME_NOISE = new Set([
  'the', 'and', 'by', 'of', 'for', 'pvt', 'ltd', 'limited', 'private', 'llp',
  'inc', 'co', 'company', 'best', 'top', 'new', 'near', 'sri', 'shri', 'sai',
  'catering', 'catterings', 'caterers', 'caterer', 'restaurant', 'restaurants',
  'family', 'arabian', 'mandi', 'hotel', 'hotels', 'foods', 'food', 'events',
  'event', 'services', 'service', 'solutions', 'group', 'grand', 'royal',
  'centre', 'center', 'hub', 'works', 'enterprises', 'enterprise'
]);

function coreNameTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3 && !NAME_NOISE.has(token));
}

function nameSimilarity(nameA, nameB) {
  const a = new Set(coreNameTokens(nameA));
  const b = new Set(coreNameTokens(nameB));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / Math.min(a.size, b.size);
}

module.exports = {
  normalizeBrandToken,
  NAME_NOISE,
  coreNameTokens,
  nameSimilarity
};
