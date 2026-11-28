'use strict';

/**
 * src/store.js
 * In-memory vendor database with multi-key deduplication (placeId, verified mobile,
 * normalized name+city) and atomic journal persistence + compaction.
 */

const fs = require('fs');
const path = require('path');
const { isUnsafeLeadOrUrl, isValidBusinessEmail, isSharedDirectoryHost, getRegistrableDomain, sanitizeSocialUrl } = require('./taxonomy/safetyFilter');
const { haversineKm } = require('./geo/osmPolygon');
const { trustRank, tokenSetRatio, computeQualityScore, computeRelevanceScore, dedupeByCompanyDomain, applyUniversalFilters } = require('./services/goldenMerger');
const { parseAddress } = require('./services/addressParser');

const SANDBOX_SLUG = String(process.env.SANDBOX_USER_ID || '').replace(/[^a-zA-Z0-9_-]/g, '');
const DB_DIR = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT, SANDBOX_SLUG || 'default', 'db')
  : path.resolve(__dirname, '../db');
const JOURNAL_FILE = path.join(DB_DIR, 'vendors_journal.jsonl');

const leadsById = new Map();       // canonical lead.id -> lead
const dedupeIndex = new Map();     // secondary dedupe key -> canonical lead.id
const geoBuckets = new Map();      // lat/lng spatial grid -> Set of lead.id (~550m cells)
const sessionLeadsMap = new Map(); // sessionId -> Set of canonical lead.id
const changeListeners = new Set();

const GENERIC_CATEGORY_NAMES = new Set([
  'plumber', 'plumbers', 'plumbing', 'hospital', 'hospitals', 'clinic', 'clinics',
  'doctor', 'doctors', 'dentist', 'dentists', 'dental clinic', 'pharmacy', 'chemist',
  'restaurant', 'hotel', 'lawyer', 'advocate', 'electrician', 'contractor', 'salon',
  'unknown business', 'business establishment'
]);

function registerChangeListener(fn) {
  if (typeof fn === 'function') changeListeners.add(fn);
}

function notifyChange(sessionIds = []) {
  for (const fn of changeListeners) {
    try { fn(sessionIds); } catch (_) {}
  }
}

function normalizeNameStem(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(?:Opp\.?|Opposite|Near|Beside|Behind|In\s+Front\s+Of)\b[\s\S]*$/i, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 36);
}

function lastDigits(raw, minLen = 8) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length < minLen) return '';
  return d.slice(-10);
}

function geoBucketKey(lat, lng) {
  return `${Math.round(lat * 200)}_${Math.round(lng * 200)}`;
}

function indexGeoBucket(lead) {
  const lat = Number(lead?.lat);
  const lng = Number(lead?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;
  const k = geoBucketKey(lat, lng);
  if (!geoBuckets.has(k)) geoBuckets.set(k, new Set());
  geoBuckets.get(k).add(lead.id);
}

function getAllDedupeKeys(lead) {
  if (!lead) return [];
  const keys = [];
  const pid = String(lead.placeId || lead.place_id || '').trim();
  if (pid) keys.push(`place:${pid}`);

  const mob10 = lastDigits(lead.mobilePhone, 10);
  if (mob10) keys.push(`mob:${mob10}`);

  const ph10 = lastDigits(lead.phone, 8);
  const ll10 = lastDigits(lead.landlinePhone, 8);
  const nameStem = normalizeNameStem(lead.name || lead.title || '');
  if (nameStem && ph10) keys.push(`np:${nameStem}_${ph10}`);

  const allPh = new Set([mob10, ph10, ll10, ...(Array.isArray(lead.phones) ? lead.phones.map((p) => lastDigits(p, 8)) : [])].filter(Boolean));
  for (const d of allPh) keys.push(`ph:${d}`);

  // Pass 2b: Root domain dedupe ONLY for official websites (never Facebook/Justdial/Yell aggregators)
  const dom = lead.website && !isSharedDirectoryHost(lead.website) ? getRegistrableDomain(lead.website) : '';
  if (dom) keys.push(`dom:${dom}`);
  if (nameStem && dom) keys.push(`wn:${dom}_${nameStem}`);

  return keys;
}

function indexLeadKeys(lead) {
  if (!lead || !lead.id) return;
  for (const k of getAllDedupeKeys(lead)) {
    dedupeIndex.set(k, lead.id);
  }
  indexGeoBucket(lead);
  lead.qualityScore = computeQualityScore(lead);
  if (lead.query || lead.searchCategory) {
    lead.relevanceScore = computeRelevanceScore(lead);
  }
}

function findExistingLead(lead) {
  // Pass 1: Hard ID Match (placeId)
  const pid = String(lead.placeId || lead.place_id || '').trim();
  if (pid && dedupeIndex.has(`place:${pid}`)) {
    const found = leadsById.get(dedupeIndex.get(`place:${pid}`));
    if (found) return found;
  }

  // Pass 2: Strong Contact Match (E.164 Phone/STD OR non-directory Root Domain across OSM + Maps)
  const mob10 = lastDigits(lead.mobilePhone, 10) || (lead.isMobile ? lastDigits(lead.phone, 10) : '');
  if (mob10 && dedupeIndex.has(`mob:${mob10}`)) {
    const found = leadsById.get(dedupeIndex.get(`mob:${mob10}`));
    if (found) return found;
  }
  const hasCoords = Number.isFinite(Number(lead.lat)) && Number.isFinite(Number(lead.lng)) && (Number(lead.lat) !== 0 || Number(lead.lng) !== 0);
  for (const k of getAllDedupeKeys(lead)) {
    const id = dedupeIndex.get(k);
    if (id && leadsById.has(id)) {
      const cand = leadsById.get(id);
      if ((k.startsWith('dom:') || k.startsWith('ph:')) && hasCoords && Number.isFinite(Number(cand.lat)) && Number.isFinite(Number(cand.lng))) {
        const km = haversineKm(Number(lead.lat), Number(lead.lng), Number(cand.lat), Number(cand.lng));
        // Campus tolerance 0.6km merges OSM & Google Maps pins while preserving multi-mile branches
        if (km > 0.6 && tokenSetRatio(lead.name, cand.name) < 0.72) continue;
      }
      return cand;
    }
  }

  // Pass 3: Geo (<= 150m / neighboring spatial cell) + Token-Set Name Similarity >= 88%
  const lat = Number(lead.lat);
  const lng = Number(lead.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) && lead.name) {
    const gx = Math.round(lat * 200);
    const gy = Math.round(lng * 200);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = geoBuckets.get(`${gx + dx}_${gy + dy}`);
        if (!bucket) continue;
        for (const cid of bucket) {
          const cand = leadsById.get(cid);
          if (!cand || !Number.isFinite(Number(cand.lat))) continue;
          if (haversineKm(lat, lng, Number(cand.lat), Number(cand.lng)) <= 0.15 && tokenSetRatio(lead.name, cand.name) >= 0.88) {
            return cand;
          }
        }
      }
    }
  }
  return null;
}

function isGenericBusinessName(name) {
  const clean = String(name || '').trim().toLowerCase();
  return !clean || GENERIC_CATEGORY_NAMES.has(clean) || clean.length < 3;
}

function mergeIntoExisting(existing, incoming) {
  let enriched = false;
  if (incoming.country && existing.country && existing.country !== incoming.country && existing.city && /london|manchester|dallas|austin|sydney|dubai/i.test(existing.city)) {
    existing.country = incoming.country;
    enriched = true;
  }
  if (incoming.name && isGenericBusinessName(existing.name) && !isGenericBusinessName(incoming.name)) {
    existing.name = incoming.name;
    enriched = true;
  }
  if (!existing.placeId && incoming.placeId) { existing.placeId = incoming.placeId; enriched = true; }
  if (!existing.phone && incoming.phone) { existing.phone = incoming.phone; if (incoming.mobileVerified && existing.mobileVerified !== 'Yes') existing.mobileVerified = incoming.mobileVerified; enriched = true; }
  if (!existing.mobilePhone && incoming.mobilePhone) {
    existing.mobilePhone = incoming.mobilePhone;
    existing.isMobile = true;
    existing.mobileVerified = 'Yes';
    existing.verified = true;
    existing.whatsappAvailable = true;
    enriched = true;
  }
  if (!existing.whatsappLink && incoming.whatsappLink) {
    existing.whatsappLink = incoming.whatsappLink;
    existing.whatsappAvailable = true;
    enriched = true;
  }
  if (!existing.landlinePhone && incoming.landlinePhone) { existing.landlinePhone = incoming.landlinePhone; enriched = true; }
  if (incoming.email && (!existing.email || (!existing.emailVerified && incoming.emailVerified))) {
    existing.email = incoming.email;
    if (incoming.emailVerified) existing.emailVerified = true;
    enriched = true;
  }
  if (!existing.website && incoming.website) { existing.website = incoming.website; enriched = true; }
  if (!existing.instagram && incoming.instagram) { existing.instagram = incoming.instagram; enriched = true; }
  if (!existing.facebook && incoming.facebook) { existing.facebook = incoming.facebook; enriched = true; }
  if (!existing.linkedin && incoming.linkedin) { existing.linkedin = incoming.linkedin; enriched = true; }
  if (!existing.youtube && incoming.youtube) { existing.youtube = incoming.youtube; enriched = true; }
  if (!existing.twitter && incoming.twitter) { existing.twitter = incoming.twitter; enriched = true; }
  const existingRank = trustRank(existing.source);
  const incomingRank = trustRank(incoming.source);
  const higherTrust = incomingRank > existingRank;

  if (!existing.mapsLink && incoming.mapsLink) {
    existing.mapsLink = incoming.mapsLink;
    existing.googleMapsUrl = incoming.mapsLink;
    enriched = true;
  }
  if ((!existing.lat || higherTrust) && incoming.lat && incoming.lng) {
    existing.lat = incoming.lat; existing.lng = incoming.lng; enriched = true;
  }
  if ((!existing.rating || higherTrust) && incoming.rating) { existing.rating = incoming.rating; enriched = true; }
  if ((!existing.reviewsCount || (higherTrust && Number(incoming.reviewsCount) > Number(existing.reviewsCount || 0))) && incoming.reviewsCount) {
    existing.reviewsCount = incoming.reviewsCount; enriched = true;
  }
  if ((!existing.category || higherTrust) && incoming.category) { existing.category = incoming.category; enriched = true; }
  if ((!existing.address || higherTrust) && incoming.address && incoming.address.length > String(existing.address || '').length) {
    existing.address = incoming.address;
    if (incoming.state) existing.state = incoming.state;
    if (incoming.postalCode) { existing.postalCode = incoming.postalCode; existing.pincode = incoming.postalCode; }
    enriched = true;
  }
  if (!existing.subcategory && incoming.subcategory) { existing.subcategory = incoming.subcategory; enriched = true; }
  if (!existing.matchedSubcategory && incoming.matchedSubcategory) { existing.matchedSubcategory = incoming.matchedSubcategory; enriched = true; }
  if (Array.isArray(incoming.phones) && incoming.phones.length) {
    const mergedPhones = Array.from(new Set([...(existing.phones || []), ...incoming.phones]));
    if (mergedPhones.length > (existing.phones?.length || 0)) { existing.phones = mergedPhones; enriched = true; }
  }
  if (Array.isArray(incoming.emails) && incoming.emails.length) {
    const merged = Array.from(new Set([...(existing.emails || []), ...incoming.emails]));
    if (merged.length > (existing.emails?.length || 0)) { existing.emails = merged; enriched = true; }
  }
  if (incoming.source && !existing.sources?.includes(incoming.source)) {
    existing.sources = Array.from(new Set([...(existing.sources || [existing.source || 'polyglot']), incoming.source]));
    existing.sourceCount = existing.sources.length;
    enriched = true;
  } else if (!existing.sourceCount) {
    existing.sourceCount = Array.isArray(existing.sources) ? existing.sources.length : 1;
  }
  indexLeadKeys(existing);
  return enriched;
}

const pendingJournalLines = [];
let journalFlushTimer = null;
let isCompacting = false;

function flushPendingJournal() {
  if (journalFlushTimer) { clearTimeout(journalFlushTimer); journalFlushTimer = null; }
  if (pendingJournalLines.length === 0) return;
  const chunk = pendingJournalLines.splice(0, pendingJournalLines.length).join('');
  try {
    fs.appendFile(JOURNAL_FILE, chunk, 'utf8', () => {});
  } catch (_) {}
}

function enqueueJournalWrite(lead) {
  if (!lead) return;
  try {
    pendingJournalLines.push(JSON.stringify(lead) + '\n');
    if (pendingJournalLines.length >= 40) {
      flushPendingJournal();
    } else if (!journalFlushTimer) {
      journalFlushTimer = setTimeout(flushPendingJournal, 400);
    }
  } catch (_) {}
}

function compactJournal() {
  if (isCompacting) return;
  isCompacting = true;
  try {
    flushPendingJournal();
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const lines = Array.from(leadsById.values()).map((l) => JSON.stringify(l)).join('\n');
    const tmp = `${JOURNAL_FILE}.tmp`;
    fs.writeFile(tmp, lines ? lines + '\n' : '', 'utf8', (err) => {
      try {
        if (!err) fs.renameSync(tmp, JOURNAL_FILE);
      } catch (_) {}
      isCompacting = false;
    });
  } catch (_) {
    isCompacting = false;
  }
}

function sanitizeStoredLead(lead) {
  if (!lead || typeof lead !== 'object') return false;
  let dirty = false;
  if (lead.email && !isValidBusinessEmail(lead.email)) {
    lead.email = '';
    dirty = true;
  }
  if (Array.isArray(lead.emails)) {
    const cleanEmails = lead.emails.filter(isValidBusinessEmail);
    if (cleanEmails.length !== lead.emails.length) {
      lead.emails = cleanEmails;
      if (!lead.email && cleanEmails[0]) lead.email = cleanEmails[0];
      dirty = true;
    }
  }
  for (const sk of ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter']) {
    if (lead[sk]) {
      const cleaned = sanitizeSocialUrl(lead[sk], sk);
      if (cleaned !== lead[sk]) { lead[sk] = cleaned; dirty = true; }
    }
  }
  if (lead.city && /\blondon\s+colony\b/i.test(lead.city)) { lead.city = 'London'; dirty = true; }
  const cc = String(lead.country || 'IN').toUpperCase();
  if (lead.address && (!lead.postalCode || !lead.pincode || !lead.state || !lead.city)) {
    const parsed = parseAddress(lead.address, cc, lead.city || '');
    if ((!lead.postalCode || !lead.pincode) && parsed.postalCode) {
      lead.postalCode = parsed.postalCode;
      lead.pincode = parsed.postalCode;
      dirty = true;
    }
    if (!lead.state && parsed.state) {
      lead.state = parsed.state;
      dirty = true;
    }
    if (!lead.city && parsed.city) {
      lead.city = parsed.city;
      dirty = true;
    }
    if (!lead.area && parsed.area) {
      lead.area = parsed.area;
      dirty = true;
    }
  }
  if (cc === 'GB') {
    if (!lead.state) {
      lead.state = /london/i.test(`${lead.city || ''} ${lead.address || ''}`) ? 'Greater London' : 'England';
      dirty = true;
    }
  }
  if (cc === 'IN') return dirty;
  const isLeakIn = (val) => {
    const compact = String(val || '').replace(/[^\d+]/g, '');
    return /^\+?91\d{8,}$/.test(compact);
  };
  if (isLeakIn(lead.mobilePhone)) {
    lead.mobilePhone = '';
    lead.isMobile = false;
    dirty = true;
  }
  if (isLeakIn(lead.phone)) {
    if (cc === 'GB' && /^\+?91800\d{7}$/.test(String(lead.phone).replace(/[^\d+]/g, ''))) {
      lead.phone = `0${String(lead.phone).replace(/\D/g, '').slice(2)}`;
      lead.landlinePhone = lead.landlinePhone || lead.phone;
    } else {
      lead.phone = lead.landlinePhone || '';
    }
    dirty = true;
  }
  if (Array.isArray(lead.phones)) {
    const nextPhones = lead.phones.filter((p) => !isLeakIn(p));
    if (nextPhones.length !== lead.phones.length) {
      lead.phones = nextPhones;
      dirty = true;
    }
  }
  if (!lead.mobilePhone && /^https?:\/\/wa\.me\/91\d+/i.test(String(lead.whatsappLink || ''))) {
    lead.whatsappLink = '';
    lead.whatsappAvailable = false;
    dirty = true;
  }
  return dirty;
}

function initStore() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (!fs.existsSync(JOURNAL_FILE)) return;
    const rawLines = fs.readFileSync(JOURNAL_FILE, 'utf8').split('\n');
    let parsedCount = 0;
    let scrubbedAny = false;
    for (const line of rawLines) {
      if (!line.trim()) continue;
      try {
        const lead = JSON.parse(line);
        if (isUnsafeLeadOrUrl(lead)) { scrubbedAny = true; continue; }
        parsedCount++;
        if (sanitizeStoredLead(lead)) scrubbedAny = true;
        if (!lead.id) lead.id = `vnd_${Math.random().toString(36).slice(2, 10)}`;
        const dupTarget = findExistingLead(lead);
        const byId = leadsById.get(lead.id);
        const existing = byId || dupTarget;
        let target = existing || lead;
        if (existing) {
          mergeIntoExisting(existing, lead);
          if (byId && dupTarget && dupTarget.id !== byId.id) {
            mergeIntoExisting(dupTarget, byId);
            leadsById.delete(byId.id);
            for (const sSet of sessionLeadsMap.values()) {
              if (sSet.delete(byId.id)) sSet.add(dupTarget.id);
            }
            dupTarget.sessionIds = Array.from(new Set([...(dupTarget.sessionIds || []), ...(byId.sessionIds || [])]));
            target = dupTarget;
          }
          if (sanitizeStoredLead(target)) scrubbedAny = true;
        } else {
          leadsById.set(lead.id, lead);
          indexLeadKeys(lead);
        }
        const sids = Array.from(new Set([
          ...(Array.isArray(target.sessionIds) ? target.sessionIds : []),
          ...(Array.isArray(lead.sessionIds) ? lead.sessionIds : []),
          ...(target.sessionId ? [target.sessionId] : []),
          ...(lead.sessionId ? [lead.sessionId] : [])
        ].filter(Boolean)));
        if (sids.length) target.sessionIds = sids;
        for (const sid of sids) {
          if (!sessionLeadsMap.has(sid)) sessionLeadsMap.set(sid, new Set());
          sessionLeadsMap.get(sid).add(target.id);
        }
      } catch (_) {}
    }
    if (scrubbedAny || parsedCount > leadsById.size * 1.2) {
      compactJournal();
    }
  } catch (_) {}
}

initStore();

function saveVendor(arg1, arg2, arg3) {
  let lead = arg1;
  let sessionId = arg2;
  if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
    lead = arg2;
    sessionId = arg3;
  }
  if (!lead || (!lead.name && !lead.title) || isUnsafeLeadOrUrl(lead)) return null;
  sanitizeStoredLead(lead);

  if (lead.query || lead.searchCategory) {
    const relScore = computeRelevanceScore(lead);
    lead.relevanceScore = relScore;
    if (relScore < 20) return null;
  }

  if (sessionId) lead.sessionId = sessionId;
  if (!lead.id) lead.id = `vnd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const existing = leadsById.get(lead.id) || findExistingLead(lead);
  if (existing) {
    const enriched = mergeIntoExisting(existing, lead);
    let isNewForSession = false;
    if (sessionId) {
      if (!sessionLeadsMap.has(sessionId)) sessionLeadsMap.set(sessionId, new Set());
      const sessSet = sessionLeadsMap.get(sessionId);
      if (!sessSet.has(existing.id)) {
        sessSet.add(existing.id);
        isNewForSession = true;
      }
      existing.sessionIds = Array.from(new Set([...(existing.sessionIds || []), sessionId]));
    }
    if (enriched || isNewForSession) {
      notifyChange([sessionId, ...(existing.sessionIds || [])]);
      persistVendorUpdate(existing);
    }
    return { isNew: false, isNewForSession, lead: existing, enriched };
  }

  leadsById.set(lead.id, lead);
  indexLeadKeys(lead);
  if (lead.sessionId) {
    if (!sessionLeadsMap.has(lead.sessionId)) sessionLeadsMap.set(lead.sessionId, new Set());
    sessionLeadsMap.get(lead.sessionId).add(lead.id);
    lead.sessionIds = [lead.sessionId];
  }
  notifyChange([lead.sessionId]);
  enqueueJournalWrite(lead);

  return { isNew: true, isNewForSession: true, lead };
}

function getVendorsBySession(sessionId) {
  if (!sessionId) return Array.from(leadsById.values());
  const ids = sessionLeadsMap.get(sessionId);
  if (!ids) return [];
  const results = [];
  for (const id of ids) {
    const lead = leadsById.get(id);
    if (lead) results.push(lead);
  }
  return results;
}

function getVendorsBySessionIds(sessionIds = []) {
  const list = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : [];
  if (list.length === 0) return [];
  const uniqueIds = new Set();
  const results = [];
  for (const sid of list) {
    const ids = sessionLeadsMap.get(sid);
    if (!ids) continue;
    for (const id of ids) {
      if (uniqueIds.has(id)) continue;
      uniqueIds.add(id);
      const lead = leadsById.get(id);
      if (lead) results.push(lead);
    }
  }
  return results;
}

function getVendorById(id) {
  if (!id) return null;
  const idStr = String(id);
  if (leadsById.has(idStr)) return leadsById.get(idStr);
  const byPlace = dedupeIndex.get(`place:${idStr}`);
  if (byPlace && leadsById.has(byPlace)) return leadsById.get(byPlace);
  return null;
}

function getAllVendors(filters = {}) {
  const sid = filters.sessionId || filters.session;
  const base = sid ? getVendorsBySession(sid) : Array.from(leadsById.values());
  return applyUniversalFilters(base, filters);
}

function buildCsvForLeads(leads = []) {
  const headers = [
    'Name', 'Category', 'Subcategory', 'Ward', 'Phone', 'Mobile', 'Mobile Verified', 'WhatsApp', 'Email', 'Email Verified', 'Website',
    'Address', 'Area', 'City', 'State', 'Postal Code', 'Country',
    'Rating', 'ReviewsCount', 'Quality Score', 'Relevance Score', 'Source Count', 'Sources Found',
    'Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'MapsLink', 'Source'
  ];
  const rows = [headers.join(',')];
  for (const l of leads) {
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const sourcesList = Array.isArray(l.sources) && l.sources.length ? l.sources : [l.source || 'polyglot'];
    rows.push([
      escape(l.name),
      escape(l.category),
      escape(l.matchedSubcategory || l.subcategory || l.category),
      escape(l.searchZone || l.zone || l.zoneName || ''),
      escape(l.phone),
      escape(l.mobilePhone),
      escape(l.mobileVerified || (l.isMobile ? 'Yes' : 'No')),
      escape(l.whatsappLink),
      escape(l.email),
      escape(l.emailVerified ? 'Yes' : 'No'),
      escape(l.website),
      escape(l.address),
      escape(l.area || l.locality),
      escape(l.city),
      escape(l.state),
      escape(l.postalCode || l.pincode),
      escape(l.country),
      escape(l.rating),
      escape(l.reviewsCount),
      escape(l.qualityScore ?? computeQualityScore(l)),
      escape(l.relevanceScore ?? computeRelevanceScore(l)),
      escape(l.sourceCount || sourcesList.length),
      escape(sourcesList.join(', ')),
      escape(l.instagram),
      escape(l.facebook),
      escape(l.linkedin),
      escape(l.youtube),
      escape(l.mapsLink || l.googleMapsUrl || (l.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${l.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.name, l.locality || l.zone, l.city].filter(Boolean).join(', '))}`)),
      escape(sourcesList.join(' | '))
    ].join(','));
  }
  return rows.join('\r\n');
}

function exportCsv(sessionId = null, filters = {}) {
  const base = sessionId ? getVendorsBySession(sessionId) : Array.from(leadsById.values());
  const effectiveFilters = { filterRelevance: true, ...filters };
  const filtered = Object.keys(effectiveFilters || {}).length ? applyUniversalFilters(base, effectiveFilters) : base;
  return buildCsvForLeads(filtered);
}

function deleteSession(sessionId) {
  if (!sessionId) return false;
  const ids = sessionLeadsMap.get(sessionId);
  if (ids) {
    for (const id of ids) {
      const lead = leadsById.get(id);
      if (!lead) continue;
      if (Array.isArray(lead.sessionIds) && lead.sessionIds.length > 1) {
        lead.sessionIds = lead.sessionIds.filter((s) => s !== sessionId);
        if (lead.sessionId === sessionId) lead.sessionId = lead.sessionIds[0] || '';
      } else {
        leadsById.delete(id);
      }
    }
    sessionLeadsMap.delete(sessionId);
  }
  compactJournal();
  return true;
}

function resetLeads() {
  leadsById.clear();
  dedupeIndex.clear();
  sessionLeadsMap.clear();
  try {
    if (fs.existsSync(JOURNAL_FILE)) fs.unlinkSync(JOURNAL_FILE);
  } catch (_) {}
  return true;
}

function persistVendorUpdate(lead) {
  if (!lead) return;
  indexLeadKeys(lead);
  enqueueJournalWrite(lead);
}

module.exports = {
  saveVendor,
  upsertVendor: saveVendor,
  persistVendorUpdate,
  compactJournal,
  getVendorById,
  getVendorsBySession,
  getVendorsBySessionIds,
  getSessionIds: () => Array.from(sessionLeadsMap.keys()),
  getAllVendors,
  buildCsvForLeads,
  exportCsv,
  deleteSession,
  resetLeads,
  registerChangeListener,
  mergeIntoExisting,
  flushSync: compactJournal
};
