const fs = require('fs');
const path = require('path');

const { DATA_DIR: dataDir } = require('./paths');
const credits = require('../services/credits');
const vendorsFile = path.join(dataDir, 'scraped_vendors.json');
const outOfBoundsFile = path.join(dataDir, 'out_of_bounds.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure files exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(vendorsFile)) fs.writeFileSync(vendorsFile, JSON.stringify([]));
if (!fs.existsSync(outOfBoundsFile)) fs.writeFileSync(outOfBoundsFile, JSON.stringify([]));
if (!fs.existsSync(usersFile)) {
  // Never ship a known password. Operators can set ADMIN_PASSWORD; otherwise a
  // random one is generated and printed once on first boot.
  const crypto = require('crypto');
  const generated = !process.env.ADMIN_PASSWORD;
  const defaultUsers = [{
    id: 'admin_1',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url'),
    role: 'admin',
    subscription: 'Enterprise'
  }];
  fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
  if (generated) {
    console.log('[Auth] Generated admin password (set ADMIN_PASSWORD to control it):', defaultUsers[0].password);
  }
}

// --- USERS ---
function getUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8')); } catch (e) { return []; }
}
function saveUsers(data) { fs.writeFileSync(usersFile, JSON.stringify(data, null, 2)); }

// --- MEMORY BUFFERED I/O FOR BLAZING FAST SCRAPING ---
// The live lead dataset is owned by vendorStore (atomic snapshots + journal).
// dbAdapter remains the public facade used by every route and engine.
const vendorStore = require('./vendorStore');

let cachedOutOfBounds = null;
let oobWriteTimeout = null;
let isWritingOob = false;
let pendingOobFlush = false;
let currentOobRun = null;

function flushSync() {
  vendorStore.flushNow();
}

function _flushOutOfBounds() {
  if (!cachedOutOfBounds) return;
  if (isWritingOob) {
    pendingOobFlush = true;
    return;
  }
  isWritingOob = true;
  pendingOobFlush = false;

  const dataStr = JSON.stringify(cachedOutOfBounds);
  const tmpFile = `${outOfBoundsFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;

  fs.writeFile(tmpFile, dataStr, (err) => {
    if (err) {
      isWritingOob = false;
      fs.writeFile(outOfBoundsFile, dataStr, () => {});
      return;
    }
    fs.rename(tmpFile, outOfBoundsFile, (renameErr) => {
      isWritingOob = false;
      if (renameErr) {
        fs.writeFile(outOfBoundsFile, dataStr, () => {
          try { fs.unlinkSync(tmpFile); } catch (e) {}
        });
      }
      if (pendingOobFlush) {
        setImmediate(_flushOutOfBounds);
      }
    });
  });
}

// --- MULTI-TENANT VENDORS ---
function getVendors(userId) {
  return vendorStore.all(userId);
}

function getVendorsBySession(sessionId) {
  return vendorStore.bySession(sessionId);
}

/* ------------------------------------------------------------------ */
/* Credit admission                                                    */
/*                                                                     */
/* Every lead that enters the database costs one credit, exactly once.  */
/* The known-id set is rebuilt from disk on boot, so existing leads are */
/* never charged retroactively and a re-scrape never double-charges.    */
/* ------------------------------------------------------------------ */

let knownLeadIds = null;

function knownLeads() {
  if (!knownLeadIds) {
    try {
      knownLeadIds = new Set(getVendors().map(vendor => vendor && vendor.id).filter(Boolean));
    } catch (e) {
      knownLeadIds = new Set();
    }
  }
  return knownLeadIds;
}

function admitLeads(list) {
  if (!credits.ENFORCED) return list;

  const known = knownLeads();
  const admitted = [];
  let dropped = 0;

  for (const vendor of list) {
    if (!vendor || !vendor.id) {
      admitted.push(vendor);
      continue;
    }

    // Update / merge of a lead we already hold is free.
    if (known.has(vendor.id) || vendorStore.isKnown(vendor)) {
      admitted.push(vendor);
      continue;
    }

    if (credits.spend(1).charged >= 1) {
      known.add(vendor.id);
      admitted.push(vendor);
    } else {
      dropped += 1;
    }
  }

  if (dropped) {
    console.warn(`[credits] run out â€” ${dropped} new lead(s) not stored. Balance: ${credits.status().left}`);
  }

  return admitted;
}

// Track active sessionId -> requesting userId so scrapers that pass 'admin_1'
// still attribute leads to the Client or Master user who started the search.
const SESSION_OWNER_MAX = 500;
const sessionOwners = new Map();

function registerSessionOwner(sessionId, userId) {
  if (!sessionId || !userId || userId === 'admin_1' || userId === 'anonymous') return;
  if (sessionOwners.has(sessionId)) sessionOwners.delete(sessionId);
  sessionOwners.set(sessionId, String(userId));
  while (sessionOwners.size > SESSION_OWNER_MAX) {
    const oldest = sessionOwners.keys().next().value;
    sessionOwners.delete(oldest);
  }
}

function getSessionOwner(sessionId) {
  if (!sessionId) return '';
  return sessionOwners.get(sessionId) || '';
}

// Audience registry: who may SEE a run's live events. Unlike sessionOwners this
// also records anonymous users and Master runs, because the live stream must
// route every event to exactly the workspace that started it.
const sessionScopes = new Map();

function registerSessionScope(sessionId, scope = {}) {
  if (!sessionId) return;
  const entry = {
    userId: String(scope.userId || 'anonymous'),
    isMaster: scope.isMaster === true
  };
  if (sessionScopes.has(sessionId)) sessionScopes.delete(sessionId);
  sessionScopes.set(sessionId, entry);
  while (sessionScopes.size > SESSION_OWNER_MAX) {
    sessionScopes.delete(sessionScopes.keys().next().value);
  }
}

function getSessionScope(sessionId) {
  if (!sessionId) return null;
  return sessionScopes.get(sessionId) || null;
}

/**
 * Store one lead. New leads cost one credit (desktop build), updates are free.
 * Returns false only when the ledger refused a brand-new lead, so callers can
 * surface an honest "credits exhausted" state instead of silently losing rows.
 */
function saveVendor(userId, vendor) {
  if (!vendor || !vendor.id) return false;
  let contextUser = '';
  try { contextUser = require('../services/runContext').currentUserId(); } catch (e) {}
  const explicitUser = (userId && userId !== 'admin_1' && userId !== 'anonymous') ? userId : '';
  const sessionOwner = getSessionOwner(vendor.lastSessionId || vendor.sessionId)
    || getSessionOwner(vendor.sessionId)
    || (contextUser && contextUser !== 'anonymous' && contextUser !== 'admin_1' ? contextUser : '');
  const existingUser = (vendor.userId && vendor.userId !== 'admin_1' && vendor.userId !== 'anonymous') ? vendor.userId : '';
  const effectiveOwner = explicitUser || sessionOwner || existingUser || userId || vendor.userId || 'admin_1';
  vendor.userId = effectiveOwner;
  vendor.userIds = Array.from(new Set([
    ...(Array.isArray(vendor.userIds) ? vendor.userIds : []),
    effectiveOwner,
    explicitUser,
    sessionOwner,
    vendor.clientId
  ].filter(u => u && u !== 'anonymous'))).slice(0, 60);
  // One parse decides every phone flag. See syncPhoneFlags().
  try { require('../utils/phoneUtils').syncPhoneFlags(vendor); } catch (e) {}

  // Credit is charged only when this row creates a NEW lead. A row that merges
  // by Maps link or mobile into an existing lead is an update, not a new lead.
  const isNew = !vendorStore.isKnown(vendor);
  if (isNew && credits.ENFORCED && !knownLeads().has(vendor.id)) {
    if (credits.spend(1).charged < 1) {
      console.warn('[credits] out of credits â€” lead not stored:', vendor.id);
      return false;
    }
    knownLeads().add(vendor.id);
  }

  vendorStore.upsert(vendor);
  return true;
}

function deleteVendor(userId, vendorId) {
  const vendor = vendorStore.findById(vendorId);
  if (!vendor) return false;
  if (userId && vendor.userId !== userId) return false;
  // A single delete is still a delete: keep a restorable copy first.
  try {
    require('../services/leadArchive').archive([vendor], {
      reason: 'lead_delete',
      sessionId: vendor.sessionId || '',
    });
  } catch (e) {}
  return vendorStore.removeById(vendorId);
}

function updateVendorsBatch(userId, updatedList) {
  const { syncPhoneFlags } = require('../utils/phoneUtils');
  const rows = (Array.isArray(updatedList) ? updatedList : [])
    .map(v => syncPhoneFlags({ ...v, userId: userId || v.userId }));
  vendorStore.upsertMany(rows);
}

/**
 * Merge rows into the store. This is the safe default: an engine that saves the
 * rows from its own run can never wipe every previous folder, and a partial row
 * can never erase a known mobile. Pass `replaceVendors` for real deletions.
 */
function saveVendors(data) {
  const incoming = Array.isArray(data) ? data.filter(Boolean) : [];
  if (!incoming.length) return;
  const { syncPhoneFlags } = require('../utils/phoneUtils');
  vendorStore.upsertMany(admitLeads(incoming.map(vendor => syncPhoneFlags(vendor))));
}

/**
 * Overwrite the whole store. Only for explicit delete / clear / prune paths.
 *
 * Every row that disappears is archived first, whichever route triggered the
 * replace (folder delete, clear-all, prune). `meta.reason` labels the entry so
 * the recovery bin stays understandable.
 */
function replaceVendors(data, meta = {}) {
  const { syncPhoneFlags } = require('../utils/phoneUtils');
  const rows = admitLeads(Array.isArray(data) ? data.filter(Boolean).map(vendor => syncPhoneFlags(vendor)) : []);
  const nextIds = new Set(rows.map(vendor => vendor && vendor.id).filter(Boolean));
  try {
    const removed = vendorStore.all().filter(vendor => vendor && vendor.id && !nextIds.has(vendor.id));
    if (removed.length) {
      require('../services/leadArchive').archive(removed, {
        reason: meta.reason || 'bulk_replace',
        sessionId: meta.sessionId || '',
      });
    }
  } catch (e) {
    /* archiving must never block the requested change */
  }
  knownLeadIds = nextIds;
  vendorStore.replaceAll(rows);
}

function findMatch(candidate) {
  if (!candidate) return null;
  return vendorStore.findMatch(candidate);
}

function isKnown(vendor) {
  if (!vendor) return false;
  return vendorStore.isKnown(vendor);
}

function isDuplicate(candidate) {
  if (!candidate) return false;
  return vendorStore.isKnown(candidate);
}

// --- OUT OF BOUNDS ---
// Rejected rows are kept as evidence ("we found it, it is outside the area"),
// but never in the live lead table. The panel is per-run and capped so it can
// not grow forever like the old 1,320-row file.
const OOB_MAX_ROWS = 500;

function getOutOfBounds() {
  if (!cachedOutOfBounds) {
    try { cachedOutOfBounds = JSON.parse(fs.readFileSync(outOfBoundsFile, 'utf-8')); }
    catch (e) { cachedOutOfBounds = []; }
  }
  if (!Array.isArray(cachedOutOfBounds)) cachedOutOfBounds = [];
  if (currentOobRun) return cachedOutOfBounds.filter(v => v && v.runId === currentOobRun);
  return cachedOutOfBounds;
}

/**
 * Start a fresh out-of-bounds ledger for one run. Called at the start of every
 * search so the panel answers "what did THIS run reject", not 1,300 rows from
 * an engine that no longer exists.
 */
function resetOutOfBounds(runId) {
  currentOobRun = runId || `run_${Date.now().toString(36)}`;
  cachedOutOfBounds = [];
  clearTimeout(oobWriteTimeout);
  oobWriteTimeout = setTimeout(_flushOutOfBounds, 200);
  return currentOobRun;
}

function saveOutOfBounds(data) {
  cachedOutOfBounds = Array.isArray(data) ? data.slice(-OOB_MAX_ROWS) : [];
  clearTimeout(oobWriteTimeout);
  oobWriteTimeout = setTimeout(_flushOutOfBounds, 400);
}

function saveOutOfBoundsVendor(vendor, runId) {
  if (!vendor) return;
  // Mutate the real ledger, NOT getOutOfBounds(): during a run that returns a
  // filtered copy, and pushing into a copy silently discarded every rejection.
  if (!Array.isArray(cachedOutOfBounds)) cachedOutOfBounds = [];
  const all = cachedOutOfBounds;
  const targetRun = runId || currentOobRun || vendor.runId || null;
  vendor.runId = targetRun;

  const idx = all.findIndex(v =>
    v.id === vendor.id ||
    (v.mapsLink && vendor.mapsLink && v.mapsLink === vendor.mapsLink) ||
    (v.name && vendor.name && v.name === vendor.name)
  );

  if (idx !== -1) {
    vendor.id = all[idx].id;
    all[idx] = { ...all[idx], ...vendor };
  } else {
    all.push(vendor);
  }

  // Hard cap: keep the newest rows, never an unbounded historical dump.
  if (all.length > OOB_MAX_ROWS) {
    cachedOutOfBounds = all.slice(all.length - OOB_MAX_ROWS);
  }

  clearTimeout(oobWriteTimeout);
  oobWriteTimeout = setTimeout(_flushOutOfBounds, 1000);
}

// --- EMPLOYEES (Legacy Support) ---
const employeesFile = path.join(dataDir, 'employees.json');
if (!fs.existsSync(employeesFile)) fs.writeFileSync(employeesFile, JSON.stringify([]));

function getEmployees() {
  try { return JSON.parse(fs.readFileSync(employeesFile, 'utf-8')); } catch (e) { return []; }
}
function saveEmployees(data) { fs.writeFileSync(employeesFile, JSON.stringify(data, null, 2)); }

// --- PUBLIC USERS ---
const publicUsersFile = path.join(dataDir, 'public_users.json');
if (!fs.existsSync(publicUsersFile)) fs.writeFileSync(publicUsersFile, JSON.stringify([]));

function getPublicUsers() {
  try { return JSON.parse(fs.readFileSync(publicUsersFile, 'utf-8')); } catch (e) { return []; }
}
function savePublicUsers(data) { fs.writeFileSync(publicUsersFile, JSON.stringify(data, null, 2)); }

module.exports = {
  getUsers,
  saveUsers,
  getVendors,
  getVendorsBySession,
  saveVendors,
  replaceVendors,
  saveVendor,
  deleteVendor,
  dropFromSession: vendorStore.dropFromSession,
  updateVendorsBatch,
  registerSessionOwner,
  getSessionOwner,
  registerSessionScope,
  getSessionScope,
  getEmployees,
  saveEmployees,
  getPublicUsers,
  savePublicUsers,
  getOutOfBounds,
  resetOutOfBounds,
  saveOutOfBounds,
  saveOutOfBoundsVendor,
  isKnown,
  findMatch,
  isDuplicate,
  flushSync
};
