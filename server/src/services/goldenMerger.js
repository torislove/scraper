'use strict';

/**
 * server/src/services/goldenMerger.js
 * Cross-Engine GoldenRecord Deduplication (3-Pass Cascade),
 * Token-Set Similarity (>= 88%), Source Trust Hierarchy, & Quality Scoring (0-100).
 */

const { isSharedDirectoryHost, getRegistrableDomain } = require('../taxonomy/safetyFilter');

const SOURCE_TRUST_RANK = {
  gmap_direct_rpc: 5,
  gosom_google_maps_fast: 5,
  bing_local: 4,
  openstreetmap_poi: 3,
  justdial_turbo: 3,
  justdial_tls: 3,
  sulekha_directory: 3,
  yellowpages_tls: 3,
  yell_directory: 3,
  yp_au_directory: 3,
  uae_directory: 3,
  extension_offline_tab: 2,
  directory: 2,
  deep_web_serp: 1,
  social_instagram: 1,
  social_facebook: 1,
  social_linkedin: 1,
  polyglot: 1
};

function trustRank(source = '') {
  return SOURCE_TRUST_RANK[String(source || '').toLowerCase()] || 1;
}

const TOKEN_IGNORE = new Set(['the', 'and', 'of', 'in', 'at', 'by', 'ltd', 'inc', 'llc', 'pvt', 'limited', 'corp', 'co']);
function normalizeTokens(name = '') {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(?:opp\.?|opposite|near|beside|behind|in\s+front\s+of)\b[\s\S]*$/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !TOKEN_IGNORE.has(w));
}

function tokenSetRatio(a, b) {
  const ta = new Set(normalizeTokens(a));
  const tb = new Set(normalizeTokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter++;
  }
  const union = new Set([...ta, ...tb]).size;
  const maxSet = Math.max(ta.size, tb.size);
  const dice = (2 * inter) / (ta.size + tb.size);
  const subset = inter / Math.min(ta.size, tb.size);
  if (inter === Math.min(ta.size, tb.size) && Math.min(ta.size, tb.size) >= 2 && maxSet <= 4) {
    return 0.90;
  }
  return Math.max(dice, inter / union, subset >= 1.0 && ta.size === tb.size ? 1.0 : 0);
}

function computeQualityScore(lead = {}) {
  let score = 0;
  if (lead.category || lead.matchedSubcategory) score += 20;
  const sc = Number(lead.sourceCount || (Array.isArray(lead.sources) ? lead.sources.length : 1));
  score += sc >= 3 ? 20 : sc === 2 ? 14 : 6;
  if (lead.mobilePhone || lead.isMobile) score += 20;
  else if (lead.phone || lead.landlinePhone) score += 12;
  if (lead.emailVerified) score += 15;
  else if (lead.email) score += 8;
  if (lead.website && !isSharedDirectoryHost(lead.website)) score += 10;
  const socials = [lead.instagram, lead.facebook, lead.linkedin, lead.youtube, lead.twitter].filter(Boolean).length;
  score += Math.min(5, socials * 2);
  const reviews = Number(lead.reviewsCount || 0);
  if (reviews >= 20) score += 10;
  else if (reviews >= 3) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const UNIVERSAL_MISMATCH_RE = /\b(?:book\s*store|stationery|computer\s*(?:store|shop|repair)|electronics\s*store|cell\s*phone\s*store|sporting\s*goods|saw\s*mill|timber|seed\s*store|fertilizer\s*shop|shoe\s*store|clothing\s*store|apparel|supermarket|bakery|beauty\s*salon)\b/i;
const STOP_QUERY_WORDS = new Set(['stores', 'store', 'shops', 'shop', 'dealers', 'dealer', 'suppliers', 'supplier', 'services', 'service', 'contractors', 'contractor', 'center', 'centre', 'companies', 'company', 'agency', 'agencies', 'in', 'at', 'near', 'around', 'the', 'and', 'for', 'best', 'top', 'all']);

function computeRelevanceScore(lead = {}, queryContext = {}) {
  const query = String(queryContext.query || lead.query || lead.searchCategory || '').trim().toLowerCase();
  const targetCity = String(queryContext.city || lead.searchCity || lead.targetCity || '').trim().toLowerCase();
  if (!query) return 100;

  let score = 0;
  const leadCat = String(lead.category || lead.matchedSubcategory || lead.subcategory || '').toLowerCase();
  const leadName = String(lead.name || lead.title || '').toLowerCase();
  const leadCity = String(lead.city || lead.locality || lead.address || '').toLowerCase();

  const queryTokens = query
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_QUERY_WORDS.has(t));

  const isNoiseCat = UNIVERSAL_MISMATCH_RE.test(leadCat);
  const queryWantsNoise = UNIVERSAL_MISMATCH_RE.test(query);

  let hasMismatchedCat = false;
  if (isNoiseCat && !queryWantsNoise) {
    hasMismatchedCat = true;
  } else if (queryContext.rejectRe && queryContext.rejectRe instanceof RegExp && queryContext.rejectRe.test(leadCat)) {
    hasMismatchedCat = true;
  }

  // 1. Category alignment (+45 or -50)
  if (hasMismatchedCat) {
    score -= 50;
  } else if (leadCat) {
    const catMatchesQuery = queryTokens.some((tok) => leadCat.includes(tok) || (tok.length >= 4 && leadCat.includes(tok.slice(0, 4))));
    if (catMatchesQuery) {
      score += 45;
    } else if (lead.matchedSubcategory) {
      score += 35;
    } else {
      score += 15;
    }
  }

  // 2. Core query keyword in business name (+35)
  const nameMatchesQuery = queryTokens.some((tok) => leadName.includes(tok) || (tok.length >= 4 && leadName.includes(tok.slice(0, 4))));
  if (nameMatchesQuery) {
    score += 35;
  }

  // 3. Within target city/geo boundary (+20)
  if (targetCity) {
    if (leadCity.includes(targetCity)) {
      score += 20;
    } else if (lead.lat && lead.lng) {
      score += 15;
    }
  } else if (lead.city || (lead.lat && lead.lng)) {
    score += 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function dedupeByCompanyDomain(leads = []) {
  const out = [];
  const byDom = new Map();
  for (const lead of leads) {
    const dom = lead.website && !isSharedDirectoryHost(lead.website) ? getRegistrableDomain(lead.website) : '';
    const key = dom ? `dom:${dom}` : `brand:${normalizeTokens(lead.name).join('_')}_${String(lead.country || '').toLowerCase()}`;
    const prev = byDom.get(key);
    if (!prev) {
      byDom.set(key, lead);
      out.push(lead);
    } else if (computeQualityScore(lead) > computeQualityScore(prev)) {
      const idx = out.indexOf(prev);
      if (idx !== -1) out[idx] = lead;
      byDom.set(key, lead);
    }
  }
  return out;
}

const truthy = (v) => v === true || v === 'true' || v === '1' || v === 1;
const toArr = (v) => (Array.isArray(v) ? v : (v ? String(v).split(',') : [])).map((x) => String(x).trim().toLowerCase()).filter(Boolean);

function applyUniversalFilters(leads = [], filters = {}) {
  let list = Array.isArray(leads) ? leads : [];
  const f = filters || {};

  if (f.country) {
    const c = String(f.country).toUpperCase();
    list = list.filter((l) => l.country && l.country.toUpperCase() === c);
  }
  if (f.state) {
    const st = String(f.state).toLowerCase();
    list = list.filter((l) => String(l.state || '').toLowerCase() === st || String(l.address || '').toLowerCase().includes(st));
  }
  if (f.city) {
    const c = String(f.city).toLowerCase();
    list = list.filter((l) => l.city && l.city.toLowerCase().includes(c));
  }
  if (f.area) {
    const ar = String(f.area).toLowerCase();
    list = list.filter((l) => `${l.area || ''} ${l.locality || ''} ${l.address || ''}`.toLowerCase().includes(ar));
  }
  const pc = f.postalCode || f.postal_code || f.pincode;
  if (pc) {
    const cleanPc = String(pc).replace(/\s+/g, '').toUpperCase();
    list = list.filter((l) => String(l.postalCode || l.pincode || '').replace(/\s+/g, '').toUpperCase() === cleanPc);
  }
  if (f.search) {
    const q = String(f.search).toLowerCase();
    list = list.filter((l) => (l.name && l.name.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)));
  }

  const bs = String(f.businessStatus || f.business_status || '').toUpperCase();
  if (bs) {
    list = list.filter((l) => String(l.businessStatus || 'OPERATIONAL').toUpperCase() === bs);
  } else {
    list = list.filter((l) => String(l.businessStatus || 'OPERATIONAL').toUpperCase() !== 'CLOSED_PERMANENTLY');
  }

  const incCats = toArr(f.googleCategoryInclude || f.google_category_include);
  if (incCats.length) list = list.filter((l) => incCats.some((c) => `${l.category || ''} ${l.matchedSubcategory || ''}`.toLowerCase().includes(c)));
  const excCats = toArr(f.googleCategoryExclude || f.google_category_exclude);
  if (excCats.length) list = list.filter((l) => !excCats.some((c) => String(l.category || '').toLowerCase().includes(c)));

  if (truthy(f.hasMobile || f.has_mobile)) list = list.filter((l) => Boolean(l.mobilePhone || l.isMobile));
  if (truthy(f.hasWhatsApp || f.has_whatsapp)) list = list.filter((l) => Boolean(l.whatsappLink || l.whatsappAvailable));
  if (truthy(f.hasLandline || f.has_landline)) list = list.filter((l) => Boolean(l.landlinePhone || l.isLandline));
  if (truthy(f.hasEmail || f.has_email)) list = list.filter((l) => Boolean(l.email));
  if (truthy(f.hasVerifiedEmail || f.has_verified_email)) list = list.filter((l) => Boolean(l.emailVerified && l.email));
  if (truthy(f.hasWebsite || f.has_website)) list = list.filter((l) => Boolean(l.website));
  if (truthy(f.hasInstagram || f.has_instagram)) list = list.filter((l) => Boolean(l.instagram));
  if (truthy(f.hasFacebook || f.has_facebook)) list = list.filter((l) => Boolean(l.facebook));
  if (truthy(f.hasLinkedin || f.has_linkedin)) list = list.filter((l) => Boolean(l.linkedin));
  if (truthy(f.hasYoutube || f.has_youtube)) list = list.filter((l) => Boolean(l.youtube));

  const minR = Number(f.minRating ?? f.min_rating);
  if (Number.isFinite(minR) && minR > 0) list = list.filter((l) => Number(l.rating || 0) >= minR);
  const maxR = Number(f.maxRating ?? f.max_rating);
  if (Number.isFinite(maxR) && maxR > 0) list = list.filter((l) => Number(l.rating || 0) <= maxR);
  const minRev = Number(f.minReviews ?? f.min_reviews);
  if (Number.isFinite(minRev) && minRev > 0) list = list.filter((l) => Number(l.reviewsCount || 0) >= minRev);
  const maxRev = Number(f.maxReviews ?? f.max_reviews);
  if (Number.isFinite(maxRev) && maxRev > 0) list = list.filter((l) => Number(l.reviewsCount || 0) <= maxRev);
  const minQ = Number(f.minQualityScore ?? f.min_quality_score);
  if (Number.isFinite(minQ) && minQ > 0) list = list.filter((l) => computeQualityScore(l) >= minQ);
  const minRel = Number(f.minRelevanceScore ?? f.min_relevance_score);
  if (Number.isFinite(minRel) && minRel > 0) {
    list = list.filter((l) => computeRelevanceScore(l, f) >= minRel);
  } else if (f.filterRelevance !== false && (f.query || f.searchCategory)) {
    list = list.filter((l) => computeRelevanceScore(l, f) >= 40);
  }
  const minS = Number(f.minSourcesCount ?? f.min_sources_count);
  if (Number.isFinite(minS) && minS > 1) list = list.filter((l) => Number(l.sourceCount || (Array.isArray(l.sources) ? l.sources.length : 1)) >= minS);

  const dedupMode = String(f.dedupMode || f.dedup_mode || 'strict_branch').toLowerCase();
  if (dedupMode === 'strict_company') {
    list = dedupeByCompanyDomain(list);
  }
  return list;
}

module.exports = {
  SOURCE_TRUST_RANK,
  trustRank,
  tokenSetRatio,
  computeQualityScore,
  computeRelevanceScore,
  dedupeByCompanyDomain,
  applyUniversalFilters
};
