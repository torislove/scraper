'use strict';

/**
 * server/src/folderStore.js
 * Canonical 1-Folder-Per-Search Hierarchical Index.
 * Strictly 1 Root Folder per unique (query, city, country) search.
 * Inside every 1 Folder: Sub-Categories, Wards/Zones, Contact Segments, and Sweep Runs.
 */

const fs = require('fs');
const path = require('path');
const store = require('./store');
const { normalizeCategory, normalizeLocation } = require('./services/queryNormalizer');

const SANDBOX_SLUG = String(process.env.SANDBOX_USER_ID || '').replace(/[^a-zA-Z0-9_-]/g, '');
const DB_DIR = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT, SANDBOX_SLUG || 'default', 'db')
  : path.resolve(__dirname, '../db');
const FOLDERS_FILE = path.join(DB_DIR, 'scrape_folders.json');

const foldersMap = new Map();       // canonical folderId -> folder record
const sessionToFolder = new Map();  // sessionId -> canonical folderId
const summaryCache = new Map();
let saveTimer = null;

function cleanLabel(raw, fallback = 'General') {
  return String(raw || '').replace(/\s+/g, ' ').trim() || fallback;
}

function titleCase(str) {
  return String(str || '').split(/\s+/).filter(Boolean)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
}

function slugKey(str) {
  return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
}

function makeCanonicalFolderId(query, city, country = 'IN') {
  const qNorm = normalizeCategory(query || 'leads').value || String(query || 'leads');
  const cNorm = normalizeLocation(city || 'city').value || String(city || 'city');
  const cc = String(country || 'IN').toUpperCase();
  return `fld_${slugKey(qNorm)}__${slugKey(cNorm)}__${cc.toLowerCase()}`;
}

function makeFolderTitle(query, city, country) {
  return `${titleCase(cleanLabel(query, 'Leads'))} — ${titleCase(cleanLabel(city, 'Target City'))} (${String(country || 'IN').toUpperCase()})`;
}

function flushToDisk() {
  saveTimer = null;
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    const list = Array.from(foldersMap.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    fs.writeFileSync(FOLDERS_FILE, JSON.stringify({ version: 2, folders: list }, null, 2), 'utf8');
  } catch (_) {}
}

function scheduleSave(immediate = false) {
  if (immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    flushToDisk();
    return;
  }
  if (!saveTimer) saveTimer = setTimeout(flushToDisk, 350);
}

const hasMobile = (l) => Boolean(l?.mobilePhone || l?.isMobile);
const hasWhatsapp = (l) => Boolean(l?.whatsappLink || l?.whatsappAvailable || hasMobile(l));
const hasEmail = (l) => Boolean(l?.email || (Array.isArray(l?.emails) && l.emails.length > 0));
const leadSubcatLabel = (l, fb) => titleCase(cleanLabel(l?.matchedSubcategory || l?.subcategory || l?.category || fb, cleanLabel(fb, 'General')));
const leadSublocLabel = (l, fb) => cleanLabel(l?.zone || l?.zoneName || l?.locality || l?.suburb || fb, cleanLabel(fb, 'Central Zone'));

function resolveFolder(idOrSession) {
  if (!idOrSession) return null;
  if (foldersMap.has(idOrSession)) return foldersMap.get(idOrSession);
  const mappedId = sessionToFolder.get(idOrSession);
  return mappedId ? foldersMap.get(mappedId) || null : null;
}

function attachSessionToFolder({ folderId, sessionId, query, city, country, totalZones = 1, completedZones = 0, subcategoriesPlanned = [], status = 'complete', isMaster = false, scope = '', ts = Date.now() }) {
  const existing = foldersMap.get(folderId);
  const planned = Array.isArray(subcategoriesPlanned) ? subcategoriesPlanned.filter(Boolean) : [];
  if (existing) {
    if (sessionId && !existing.sessionIds.includes(sessionId)) existing.sessionIds.push(sessionId);
    existing.subcategoriesPlanned = Array.from(new Set([...(existing.subcategoriesPlanned || []), ...planned]));
    existing.totalZones = Math.max(existing.totalZones || 1, Number(totalZones || 1));
    existing.completedZones = Math.max(existing.completedZones || 0, Number(completedZones || 0));
    if (isMaster) existing.isMaster = true;
    if (scope && !existing.scope) existing.scope = scope;
    if (status === 'running') existing.status = 'running';
    existing.updatedAt = Math.max(existing.updatedAt || 0, ts);
  } else {
    foldersMap.set(folderId, {
      id: folderId,
      title: makeFolderTitle(query, city, country),
      query: cleanLabel(normalizeCategory(query).value || query, 'Leads'),
      city: cleanLabel(normalizeLocation(city).value || city, 'City'),
      country: String(country || 'IN').toUpperCase(),
      isMaster: Boolean(isMaster),
      scope: scope || (isMaster ? 'district' : 'city'),
      sessionIds: sessionId ? [sessionId] : [],
      runsMeta: {},
      status,
      totalZones: Math.max(1, Number(totalZones || 1)),
      completedZones: Number(completedZones || 0),
      subcategoriesPlanned: planned,
      createdAt: ts,
      updatedAt: ts
    });
  }
  const f = foldersMap.get(folderId);
  if (sessionId) {
    sessionToFolder.set(sessionId, folderId);
    f.runsMeta = f.runsMeta || {};
    if (!f.runsMeta[sessionId]) {
      f.runsMeta[sessionId] = { sessionId, startedAt: ts, totalZones: Number(totalZones || 1), completedZones: Number(completedZones || 0) };
    }
  }
  summaryCache.delete(folderId);
  return f;
}

function backfillFromStore() {
  let changed = false;
  for (const sid of store.getSessionIds()) {
    if (!sid || sessionToFolder.has(sid)) continue;
    const leads = store.getVendorsBySession(sid);
    if (!leads.length) continue;
    const sample = leads[0] || {};
    const query = cleanLabel(sample.query || sample.category, 'Business Leads');
    const city = cleanLabel(sample.city || sample.locality, 'Target City');
    const country = String(sample.country || 'IN').toUpperCase();
    const fid = makeCanonicalFolderId(query, city, country);
    const ts = Number(sample.createdAt || sample.timestamp || Date.now());
    const zoneCount = Math.max(1, new Set(leads.map((l) => leadSublocLabel(l, city))).size);
    attachSessionToFolder({ folderId: fid, sessionId: sid, query, city, country, totalZones: zoneCount, completedZones: zoneCount, status: 'complete', ts });
    changed = true;
  }

  // Group orphan leads missing sessionId into canonical folder
  const orphans = new Map();
  for (const l of store.getAllVendors()) {
    if (l.sessionId) continue;
    const query = cleanLabel(l.query || l.category, 'Leads');
    const city = cleanLabel(l.city || l.locality, 'Global');
    const country = String(l.country || 'IN').toUpperCase();
    const sid = `legacy_${slugKey(query)}_${slugKey(city)}_${country.toLowerCase()}`;
    l.sessionId = sid;
    if (!orphans.has(sid)) orphans.set(sid, { query, city, country });
  }
  for (const [sid, meta] of orphans.entries()) {
    const fid = makeCanonicalFolderId(meta.query, meta.city, meta.country);
    attachSessionToFolder({ folderId: fid, sessionId: sid, ...meta, status: 'complete' });
    changed = true;
  }

  // Prune empty non-running folders
  for (const [fid, f] of Array.from(foldersMap.entries())) {
    const total = store.getVendorsBySessionIds(f.sessionIds || []).length;
    if (f.status !== 'running' && total === 0) {
      foldersMap.delete(fid);
      summaryCache.delete(fid);
      changed = true;
    }
  }
  if (changed) scheduleSave(true);
}

function initFolderStore() {
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (fs.existsSync(FOLDERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FOLDERS_FILE, 'utf8'));
      const list = Array.isArray(parsed?.folders) ? parsed.folders : [];
      for (const f of list) {
        if (!f || !f.query) continue;
        const fid = makeCanonicalFolderId(f.query, f.city, f.country);
        const sids = Array.isArray(f.sessionIds) && f.sessionIds.length ? f.sessionIds : (f.id && !f.id.startsWith('fld_') ? [f.id] : []);
        const status = f.status === 'running' ? 'complete' : (f.status || 'complete');
        if (sids.length === 0) continue;
        for (const sid of sids) {
          attachSessionToFolder({
            folderId: fid, sessionId: sid, query: f.query, city: f.city, country: f.country,
            totalZones: f.totalZones, completedZones: f.completedZones,
            subcategoriesPlanned: f.subcategoriesPlanned, status, ts: f.updatedAt || f.createdAt || Date.now()
          });
        }
      }
    }
  } catch (_) {}

  backfillFromStore();
  scheduleSave(true);
  const lastInvalidated = new Map();
  store.registerChangeListener((sessionIds) => {
    const now = Date.now();
    for (const sid of sessionIds) {
      const fid = sessionToFolder.get(sid) || sid;
      if (!fid) continue;
      const folder = foldersMap.get(fid);
      const prev = lastInvalidated.get(fid) || 0;
      if (!folder || folder.status !== 'running' || (now - prev) >= 2000) {
        summaryCache.delete(fid);
        lastInvalidated.set(fid, now);
      }
    }
  });
}

function startFolder({ sessionId, query, city, country, totalZones = 1, completedZones = 0, subcategoriesPlanned = [], isMaster = false, scope = '' }) {
  if (!sessionId) return null;
  const fid = makeCanonicalFolderId(query, city, country);
  const folder = attachSessionToFolder({
    folderId: fid, sessionId, query, city, country, totalZones, completedZones, subcategoriesPlanned, isMaster, scope, status: 'running', ts: Date.now()
  });
  scheduleSave(true);
  return folder;
}

function updateFolderProgress(sessionIdOrFolderId, { completedZones, status, totalZones } = {}) {
  const folder = resolveFolder(sessionIdOrFolderId);
  if (!folder) return null;
  const leads = store.getVendorsBySessionIds(folder.sessionIds || []);
  if (status === 'stopped' && leads.length === 0) {
    foldersMap.delete(folder.id);
    sessionToFolder.delete(sessionIdOrFolderId);
    summaryCache.delete(folder.id);
    scheduleSave(true);
    return null;
  }
  if (folder.runsMeta?.[sessionIdOrFolderId] && Number.isFinite(completedZones)) {
    folder.runsMeta[sessionIdOrFolderId].completedZones = Number(completedZones);
  }
  if (Number.isFinite(completedZones)) folder.completedZones = Math.max(folder.completedZones || 0, Number(completedZones));
  if (Number.isFinite(totalZones)) folder.totalZones = Math.max(folder.totalZones || 1, Number(totalZones));
  if (status) folder.status = status;
  folder.updatedAt = Date.now();
  summaryCache.delete(folder.id);
  scheduleSave(status === 'complete' || status === 'stopped' || status === 'error');
  return folder;
}

function matchesSegment(l, segment) {
  if (!segment || segment === 'all') return true;
  if (segment === 'mobile') return hasMobile(l);
  if (segment === 'whatsapp') return hasWhatsapp(l);
  if (segment === 'email') return hasEmail(l);
  if (segment === 'website') return Boolean(l?.website);
  if (segment === 'no_website') return !l?.website;
  return true;
}

function buildTreeBuckets(folder, leads, { subcategory = '', sublocation = '', segment = '', runSessionId = '' } = {}) {
  const subcatFilter = slugKey(subcategory);
  const sublocFilter = slugKey(sublocation);

  let filtered = leads;
  if (subcategory) filtered = filtered.filter((l) => slugKey(leadSubcatLabel(l, folder.query)) === subcatFilter);
  if (sublocation) filtered = filtered.filter((l) => slugKey(leadSublocLabel(l, folder.city)) === sublocFilter);
  if (segment) filtered = filtered.filter((l) => matchesSegment(l, segment));
  if (runSessionId) filtered = filtered.filter((l) => l.sessionId === runSessionId || (Array.isArray(l.sessionIds) && l.sessionIds.includes(runSessionId)));

  const subcats = new Map();
  for (const planned of folder.subcategoriesPlanned || []) {
    const label = titleCase(cleanLabel(planned, ''));
    const k = slugKey(label);
    if (label && !subcats.has(k)) subcats.set(k, { key: k, name: label, leadCount: 0, mobileCount: 0, whatsappCount: 0, emailCount: 0 });
  }
  for (const l of (sublocation ? leads.filter((x) => slugKey(leadSublocLabel(x, folder.city)) === sublocFilter) : leads)) {
    const label = leadSubcatLabel(l, folder.query);
    const k = slugKey(label);
    const b = subcats.get(k) || { key: k, name: label, leadCount: 0, mobileCount: 0, whatsappCount: 0, emailCount: 0 };
    b.leadCount += 1;
    if (hasMobile(l)) b.mobileCount += 1;
    if (hasWhatsapp(l)) b.whatsappCount += 1;
    if (hasEmail(l)) b.emailCount += 1;
    subcats.set(k, b);
  }

  const sublocs = new Map();
  for (const l of (subcategory ? leads.filter((x) => slugKey(leadSubcatLabel(x, folder.query)) === subcatFilter) : leads)) {
    const label = leadSublocLabel(l, folder.city);
    const k = slugKey(label);
    const b = sublocs.get(k) || { key: k, name: label, leadCount: 0, mobileCount: 0, whatsappCount: 0, emailCount: 0 };
    b.leadCount += 1;
    if (hasMobile(l)) b.mobileCount += 1;
    if (hasWhatsapp(l)) b.whatsappCount += 1;
    if (hasEmail(l)) b.emailCount += 1;
    sublocs.set(k, b);
  }

  const segments = [
    { key: 'mobile', name: 'Direct Mobiles', leadCount: leads.filter((l) => hasMobile(l)).length },
    { key: 'whatsapp', name: 'WhatsApp Ready', leadCount: leads.filter((l) => hasWhatsapp(l)).length },
    { key: 'email', name: 'Verified Emails', leadCount: leads.filter((l) => hasEmail(l)).length },
    { key: 'website', name: 'Official Websites', leadCount: leads.filter((l) => Boolean(l?.website)).length },
    { key: 'no_website', name: 'No Website (Prospects)', leadCount: leads.filter((l) => !l?.website).length }
  ];

  const runs = (folder.sessionIds || []).map((sid, idx) => {
    const runLeads = store.getVendorsBySession(sid);
    const meta = folder.runsMeta?.[sid] || {};
    return {
      key: sid,
      name: `Sweep Run #${idx + 1}`,
      sessionId: sid,
      startedAt: meta.startedAt || folder.createdAt,
      leadCount: runLeads.length,
      mobileCount: runLeads.filter((l) => hasMobile(l)).length,
      whatsappCount: runLeads.filter((l) => hasWhatsapp(l)).length
    };
  }).filter((r) => r.leadCount > 0 || folder.status === 'running').reverse();

  const sortBuckets = (m) => Array.from(m.values()).sort((a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name));
  return { filteredLeads: filtered, subcategories: sortBuckets(subcats), sublocations: sortBuckets(sublocs), segments, runs };
}

function summarizeFolder(folder) {
  if (!folder) return null;
  if (summaryCache.has(folder.id)) return summaryCache.get(folder.id);

  const leads = store.getVendorsBySessionIds(folder.sessionIds || []);
  const tree = buildTreeBuckets(folder, leads);
  let mobileCount = 0; let whatsappCount = 0; let emailCount = 0;
  for (const l of leads) {
    if (hasMobile(l)) mobileCount += 1;
    if (hasWhatsapp(l)) whatsappCount += 1;
    if (hasEmail(l)) emailCount += 1;
  }

  const summary = {
    ...folder,
    totalLeads: leads.length,
    mobileCount,
    whatsappCount,
    emailCount,
    subcategoriesCount: tree.subcategories.length,
    sublocationsCount: tree.sublocations.length,
    runsCount: tree.runs.length,
    subcategories: tree.subcategories,
    sublocations: tree.sublocations,
    segments: tree.segments,
    runs: tree.runs
  };
  summaryCache.set(folder.id, summary);
  return summary;
}

function listFolders() {
  backfillFromStore();
  return Array.from(foldersMap.values())
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .map(summarizeFolder)
    .filter((f) => f && (f.totalLeads > 0 || f.status === 'running'));
}

function getFolderDetail(idOrSession, filters = {}) {
  const folder = resolveFolder(idOrSession);
  if (!folder) return null;
  const leads = store.getVendorsBySessionIds(folder.sessionIds || []);
  const tree = buildTreeBuckets(folder, leads, filters);
  return {
    folder: summarizeFolder(folder),
    activeFilter: {
      subcategory: filters.subcategory || null,
      sublocation: filters.sublocation || null,
      segment: filters.segment || null,
      runSessionId: filters.runSessionId || null
    },
    subcategories: tree.subcategories,
    sublocations: tree.sublocations,
    segments: tree.segments,
    runs: tree.runs,
    leads: tree.filteredLeads
  };
}

function deleteFolder(idOrSession) {
  const folder = resolveFolder(idOrSession);
  if (!folder) return false;
  for (const sid of folder.sessionIds || []) {
    sessionToFolder.delete(sid);
    store.deleteSession(sid);
  }
  foldersMap.delete(folder.id);
  summaryCache.delete(folder.id);
  scheduleSave(true);
  return true;
}

function resetAllFolders() {
  foldersMap.clear();
  sessionToFolder.clear();
  summaryCache.clear();
  try { if (fs.existsSync(FOLDERS_FILE)) fs.unlinkSync(FOLDERS_FILE); } catch (_) {}
}

initFolderStore();

module.exports = {
  startFolder,
  updateFolderProgress,
  listFolders,
  getFolderDetail,
  deleteFolder,
  resetAllFolders,
  makeCanonicalFolderId,
  slugKey
};
