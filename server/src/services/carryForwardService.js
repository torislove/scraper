/**
 * carryForwardService.js
 *
 * Phase 6 — repeat-search acceleration.
 *
 * A repeat search for the same category in the same city should never make the
 * customer wait for leads the machine already found. This service reads the
 * append-only live store, keeps only rows that are provably in scope, and hands
 * them back as *clones* with provenance. It never writes to the store, so a
 * carried row can never be charged a second credit and its original session
 * IDs stay intact.
 *
 * Safety rules:
 *   - same city only (never a neighbouring town or a metro bleed)
 *   - strong positive category signal only (`hasStrongCategorySignal`)
 *   - client containment (`isListingRelevantToQuery`) and the run's final
 *     radius are both enforced
 *   - dedupe by id, Maps identity, validated mobile, and name+city
 *   - master sweeps and aborted runs are skipped entirely
 */

const dbAdapter = require('../config/dbAdapter');
const { hasStrongCategorySignal } = require('./categoryFidelity');
const { isListingRelevantToQuery } = require('../scrapers/engine-google-places');
const { normalizePhone } = require('../utils/phoneUtils');

const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_LIMIT = 250;
const REPEAT_WINDOW_HOURS = 24;
const REPEAT_MIN_MOBILE_LEADS = 3;

// A stale row from a half-finished run must never be inherited by a fresh
// search. Anything below this stored quality score is treated as noise.
const MIN_QUALITY_SCORE = 35;

function text(value) {
  return String(value == null ? '' : value).trim();
}

function norm(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function zoneKey(value) {
  return text(value).toLowerCase();
}

function rowTimestamp(row) {
  const raw = row.lastScrapedAt || row.scrapedAt || row.createdAt || row.addedAt;
  const ts = new Date(raw || 0).getTime();
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}

function mobileNational(lead) {
  if (!lead) return '';
  const candidates = [lead.phone, lead.primaryPhone, ...(Array.isArray(lead.phones) ? lead.phones : [])];
  for (const raw of candidates) {
    const value = typeof raw === 'object' && raw
      ? (raw.displayPhone || raw.e164 || raw.national || raw.number || '')
      : (raw || '');
    if (!value) continue;
    try {
      const parsed = normalizePhone(value);
      if (parsed && parsed.isMobile && parsed.national) return parsed.national;
    } catch (e) {}
  }
  return '';
}

/**
 * Carry-forward quality guard.
 *
 * `hasStrongCategorySignal` proves the row belongs to the category, but a row
 * can still be useless: an abandoned run can leave a name with no phone, no
 * website, no email and no address, and a low stored quality score means the
 * quality engine already judged it thin. Reusing those made a brand-new search
 * look like it had results when it had nothing callable.
 *
 * @returns {{ ok: boolean, reason: string }}
 */
function carryForwardQuality(row) {
  const stored = Number(row?.profileQuality?.score ?? row?.qualityScore);
  if (Number.isFinite(stored) && stored > 0 && stored < MIN_QUALITY_SCORE) {
    return { ok: false, reason: 'low-score' };
  }

  const phone = mobileNational(row)
    || text(row.phone)
    || text(row.primaryPhone)
    || (Array.isArray(row.phones) && row.phones.length > 0 ? 'phone' : '');
  const website = text(row.website) || text(row.websiteUrl) || text(row.domain);
  const email = text(row.email)
    || (Array.isArray(row.emails) && row.emails.length > 0 ? 'email' : '');
  const address = text(row.address) || text(row.formattedAddress) || text(row.street);

  if (!phone && !website && !email && !address) {
    return { ok: false, reason: 'no-contact' };
  }
  return { ok: true, reason: '' };
}

function mapsIdentity(lead) {
  const raw = text(lead.mapsLink || lead.googleMapsUrl || lead.profileSourceUrl);
  if (!raw) return '';
  if (!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(raw)) return '';
  const cid = raw.match(/[?&]cid=(\d+)/);
  if (cid) return `cid:${cid[1]}`;
  const place = raw.match(/!1s([^!&]+)/);
  if (place) return `place:${place[1]}`;
  return `link:${raw.split('&')[0].split('?')[0]}`;
}

function nameCityKey(lead, location) {
  const name = norm(lead.name);
  const city = norm(lead.city || location);
  if (name.length < 4 || !city) return '';
  return `name_loc:${name}__${city}`;
}

function sameCity(row, location) {
  const target = norm(location);
  if (!target) return false;
  const candidates = [row.city, row.locationName, row.mandal, row.district];
  for (const candidate of candidates) {
    const value = norm(candidate);
    if (!value) continue;
    if (value === target) return true;
    if (value.length >= 4 && (value.includes(target) || target.includes(value))) return true;
  }
  return false;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dedupeKeys(lead, location) {
  const keys = [];
  if (lead.id) keys.push(`id:${lead.id}`);
  const maps = mapsIdentity(lead);
  if (maps) keys.push(maps);
  const mobile = mobileNational(lead);
  if (mobile) keys.push(`phone:${mobile}`);
  const named = nameCityKey(lead, location);
  if (named) keys.push(named);
  return keys;
}

/**
 * Collect previously discovered leads that are safe to reuse in this run.
 *
 * @returns {{ leads: object[], fromSessions: string[], scanned: number }}
 */
function collectCarryForward(options = {}) {
  const {
    category,
    location,
    existingLeads = [],
    sessionId = '',
    finalAnchor = null,
    finalMaxKm = 0,
    isMaster = false,
    aborted = false,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
    limit = DEFAULT_LIMIT
  } = options;

  if (isMaster || aborted || !category || !location) {
    return { leads: [], fromSessions: [], scanned: 0 };
  }

  let store = [];
  try {
    store = dbAdapter.getVendors() || [];
  } catch (e) {
    return { leads: [], fromSessions: [], scanned: 0 };
  }

  const cutoff = Date.now() - Math.max(1, Number(lookbackDays) || DEFAULT_LOOKBACK_DAYS) * 86400000;
  const seen = new Set();
  for (const lead of existingLeads) {
    for (const key of dedupeKeys(lead, location)) seen.add(key);
  }

  const candidates = [];
  let skippedQuality = 0;
  for (const row of store) {
    if (!row || !row.id) continue;
    if (row.sessionId === sessionId || row.lastSessionId === sessionId) continue;
    if (Array.isArray(row.sessionIds) && row.sessionIds.includes(sessionId)) continue;

    const ts = rowTimestamp(row);
    if (ts && ts < cutoff) continue;

    if (!sameCity(row, location)) continue;
    if (!hasStrongCategorySignal(row, category)) continue;

    // Quality guard: never inherit a row that is thin or unreachable.
    if (!carryForwardQuality(row).ok) {
      skippedQuality += 1;
      continue;
    }

    const coords = (row.latitude && row.longitude)
      ? { lat: Number(row.latitude), lng: Number(row.longitude) }
      : null;

    // The same city guard the client run uses at completion.
    const containment = isListingRelevantToQuery(
      row.name,
      row.address,
      row.district,
      row.state,
      location,
      location,
      coords,
      null,
      location,
      false,
      'city'
    );
    if (!containment.relevant) continue;

    if (coords && finalAnchor && Number(finalMaxKm) > 0) {
      const km = distanceKm(
        Number(finalAnchor.lat),
        Number(finalAnchor.lng),
        coords.lat,
        coords.lng
      );
      if (km > Number(finalMaxKm)) continue;
    }

    const keys = dedupeKeys(row, location);
    if (keys.some(key => seen.has(key))) continue;
    for (const key of keys) seen.add(key);

    candidates.push(row);
    if (candidates.length >= Math.max(1, Number(limit) || DEFAULT_LIMIT)) break;
  }

  // Best rows first: validated mobile, then rating/reviews, then freshest.
  candidates.sort((a, b) => {
    const mobileA = mobileNational(a) ? 1 : 0;
    const mobileB = mobileNational(b) ? 1 : 0;
    if (mobileA !== mobileB) return mobileB - mobileA;
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    if (ratingA !== ratingB) return ratingB - ratingA;
    const reviewsA = Number(a.reviewsCount) || 0;
    const reviewsB = Number(b.reviewsCount) || 0;
    if (reviewsA !== reviewsB) return reviewsB - reviewsA;
    return rowTimestamp(b) - rowTimestamp(a);
  });

  const addedAt = new Date().toISOString();
  const fromSessions = new Set();
  const leads = candidates.map(row => {
    const sourceSession = row.sessionId || row.lastSessionId || '';
    if (sourceSession) fromSessions.add(sourceSession);
    return {
      ...row,
      phones: Array.isArray(row.phones) ? row.phones.slice() : row.phones,
      emails: Array.isArray(row.emails) ? row.emails.slice() : row.emails,
      sessionIds: Array.isArray(row.sessionIds) ? row.sessionIds.slice() : row.sessionIds,
      carriedForward: true,
      carriedFrom: {
        sessionId: sourceSession,
        sessionIds: Array.isArray(row.sessionIds) ? row.sessionIds.slice(0, 20) : [],
        scrapedAt: row.lastScrapedAt || row.scrapedAt || null,
        addedAt,
        reason: 'repeat-search'
      }
    };
  });

  return { leads, fromSessions: [...fromSessions], scanned: store.length, skippedQuality };
}

/**
 * Named zones that already produced at least three validated-mobile leads for
 * this exact category in the last 24 hours. The orchestrator queues these last
 * so a repeat search spends its first browser slots on fresh ground while still
 * covering every zone.
 *
 * @returns {Set<string>} zone keys in the orchestrator's `zoneKey()` shape
 */
function findRepeatCoveredZones(options = {}) {
  const {
    category,
    location,
    windowHours = REPEAT_WINDOW_HOURS,
    minMobileLeads = REPEAT_MIN_MOBILE_LEADS
  } = options;

  const covered = new Set();
  if (!category || !location) return covered;

  let store = [];
  try {
    store = dbAdapter.getVendors() || [];
  } catch (e) {
    return covered;
  }

  const cutoff = Date.now() - Math.max(1, Number(windowHours) || REPEAT_WINDOW_HOURS) * 3600000;
  const counts = new Map();

  for (const row of store) {
    if (!row || !row.zoneName) continue;
    const ts = rowTimestamp(row);
    if (!ts || ts < cutoff) continue;
    if (!sameCity(row, location)) continue;
    if (!mobileNational(row)) continue;
    if (!hasStrongCategorySignal(row, category)) continue;
    const key = zoneKey(row.zoneName);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const [key, count] of counts) {
    if (count >= Math.max(1, Number(minMobileLeads) || REPEAT_MIN_MOBILE_LEADS)) {
      covered.add(key);
    }
  }
  return covered;
}

module.exports = {
  collectCarryForward,
  findRepeatCoveredZones,
  // exported for tests
  _internals: { sameCity, mobileNational, mapsIdentity, zoneKey, carryForwardQuality }
};
