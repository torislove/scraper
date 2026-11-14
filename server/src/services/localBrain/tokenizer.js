/**
 * Text vectoriser for the local brain.
 *
 * Pure JavaScript, no native modules, no model download. Tokens are hashed into
 * a fixed number of buckets (the "hashing trick"), so the model file stays small
 * and a new category needs no vocabulary change. Indian-language tokens are kept
 * instead of being stripped, because a Telugu or Hindi alias is often the only
 * phrase a local directory uses.
 */

// 128k buckets makes hashing collisions negligible (~12 across the shipped
// vocabulary) and costs almost nothing, because only non-zero buckets are
// stored. Signed hashing cancels the few that remain.
const DIM = 131072;
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'for', 'from', 'in',
  'is', 'it', 'near', 'of', 'on', 'or', 'our', 'the', 'to', 'top', 'with',
  'we', 'you', 'your', 'me', 'my', 'us', 'all', 'any', 'new', 'no', 'not',
  'services', 'service', 'shop', 'shops', 'store', 'stores', 'centre', 'center',
  'centres', 'centers', 'company', 'companies', 'contact', 'address', 'phone'
]);

/** FNV-1a, 32-bit. Stable across Node versions, unlike String#hashCode. */
function fnv1a(token, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashToken(token) {
  return fnv1a(token, 2166136261) % DIM;
}

/**
 * Signed hashing: a second independent hash picks +1 or -1. Colliding tokens
 * then tend to cancel instead of adding up into a phantom category match.
 */
function hashSign(token) {
  return (fnv1a(token, 0x9e3779b9) & 1) === 0 ? 1 : -1;
}

function tokenize(text) {
  const clean = String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  const words = clean.split(' ').filter(word => word.length > 1 && !STOPWORDS.has(word));
  const tokens = [];
  for (let i = 0; i < words.length; i += 1) {
    tokens.push(words[i]);
    if (i + 1 < words.length) tokens.push(`${words[i]}_${words[i + 1]}`);
  }
  return tokens;
}

/**
 * Token counts -> L2-normalised sparse vector [[bucket, weight], ...].
 * `idf` is optional; model training supplies it, query-time uses the same map.
 */
function vectorize(text, idf = null) {
  return vectorizeTokens(tokenize(text), idf);
}

/** Same as vectorize() but takes an already-tokenised array. */
function vectorizeTokens(tokens, idf = null) {
  if (!tokens.length) return [];
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const buckets = new Map();
  for (const [token, count] of counts) {
    const weight = (1 + Math.log(count)) * (idf ? (idf[token] || 1) : 1) * hashSign(token);
    const bucket = hashToken(token);
    buckets.set(bucket, (buckets.get(bucket) || 0) + weight);
  }
  let norm = 0;
  for (const weight of buckets.values()) norm += weight * weight;
  norm = Math.sqrt(norm) || 1;
  return [...buckets.entries()]
    .map(([bucket, weight]) => [bucket, Math.round((weight / norm) * 10000) / 10000])
    .filter(([, weight]) => weight !== 0);
}

/** Cosine similarity between two sparse vectors. Both must be normalised. */
function cosine(a, b) {
  if (!a.length || !b.length) return 0;
  // Both stored vectors are L2-normalised, so the dot product is the cosine.
  const small = a.length <= b.length ? a : b;
  const large = a.length <= b.length ? b : a;
  const map = new Map(large);
  let dot = 0;
  for (const [bucket, weight] of small) {
    const other = map.get(bucket);
    if (other) dot += weight * other;
  }
  return Math.max(0, Math.min(1, dot));
}

module.exports = { DIM, STOPWORDS, tokenize, vectorize, vectorizeTokens, cosine, hashToken, hashSign };
