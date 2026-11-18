/**
 * vendorStore.js
 *
 * The single owner of the live lead dataset.
 *
 * Why this exists
 * ---------------
 * The old store lived in `dbAdapter` as a debounced `fs.writeFile` with no
 * temp file, no lock and no crash log. Two processes (engine + script) could
 * interleave and leave a truncated JSON file, and a process killed mid-write
 * took every lead with it. This module fixes that with three guarantees:
 *
 *   1. ATOMIC SNAPSHOTS. `scraped_vendors.json` is written to a temp file and
 *      then `fs.renameSync`d over the old one. NTFS rename is atomic, so a
 *      reader always sees a complete array.
 *   2. AN APPEND-ONLY JOURNAL. Every upsert is appended to
 *      `vendors.journal.jsonl` before the debounced snapshot. If the process
 *      dies, the next boot replays the journal on top of the last snapshot.
 *   3. A MERGE, NEVER A REPLACE. Upserts combine the best non-empty value of
 *      every field, so a later partial row can never erase a known mobile,
 *      website or address. Deletions go through `replaceAll`.
 *
 * The store also keeps O(1) indexes by id, Google Maps link and valid mobile,
 * which is what makes dedupe cheap even with 100k leads.
 */

const fs = require('fs');
const path = require('path');

const { DATA_DIR, SESSIONS_DIR } = require('./paths');
const { normalizePhone } = require('../utils/phoneUtils');

const STORE_FILE = path.join(DATA_DIR, 'scraped_vendors.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'vendors.journal.jsonl');
const LOCK_FILE = path.join(DATA_DIR, '.store.lock');
const SNAPSHOT_DEBOUNCE_MS = 2000;
const JOURNAL_FLUSH_MS = 100;
const JOURNAL_BATCH_LIMIT = 50;

// Rolling backups. The heal path already knows how to read these files, but
// nothing used to create them, so a damaged store had no historical copy. One
// backup per hour, twelve kept, written atomically.
const BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const BACKUP_KEEP = 12;
const BACKUP_RE = /^scraped_vendors\.backup-(\d+)\.json$/;
let lastBackupAt = 0;

const EMPTY_TOKENS = new Set(['', 'unknown', 'n/a', 'na', 'none', 'null', 'undefined', 'not available']);
const BAD_PHONE = /requires|obfuscated|lookup|hidden/i;

let vendors = [];
let byId = new Map();
let byKey = new Map();
let indexedLength = 0;
let snapshotTimer = null;
let journalTimer = null;
let journalBuffer = [];
let journalLines = 0;
let booted = false;
let writeWarned = false;
// Set whenever the in-memory array changes. The snapshot writer skips the
// write when nothing changed, so an idle engine does not re-serialise the
// whole store every 2 s.
let dirty = false;

/* ------------------------------------------------------------------ */
/* Store ownership                                                     */
/*                                                                     */
/* Every process that loads this module used to schedule a snapshot,   */
/* and a snapshot truncates the journal. A harmless inspection script  */
/* running next to the live engine could therefore wipe pending writes.*/
/* Only the process named in `.store.lock` may write. Everyone else    */
/* runs read-only until the owner exits.                               */
/* ------------------------------------------------------------------ */

let foreignOwner = false;
let lockOwnerPid = 0;
// The largest row count this process has ever seen on disk or in memory. An
// empty snapshot is only allowed when the caller explicitly forces it (clear
// endpoint / last-row delete), never because a load raced or a bug lost the
// in-memory array.
let lastNonEmptyCount = 0;

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM means the process exists but belongs to another user.
    return e.code === 'EPERM';
  }
}

function readLockPid() {
  try {
    const raw = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    return Number(raw && raw.pid) || 0;
  } catch (e) {
    return 0;
  }
}

function claimStoreLock() {
  const pid = readLockPid();
  if (pid && pid !== process.pid && pidAlive(pid)) {
    foreignOwner = true;
    lockOwnerPid = pid;
    console.warn(`[vendorStore] Store is owned by live process ${pid}; running read-only to protect its journal.`);
    return;
  }
  foreignOwner = false;
  lockOwnerPid = process.pid;
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf-8');
  } catch (e) {}
}

function canWrite() {
  if (!foreignOwner) return true;
  // The owner exited while this process was running: take over cleanly.
  if (!pidAlive(lockOwnerPid)) {
    foreignOwner = false;
    lockOwnerPid = process.pid;
    try {
      fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf-8');
    } catch (e) {}
    return true;
  }
  if (!writeWarned) {
    writeWarned = true;
    console.warn('[vendorStore] Write skipped: another live process owns the store.');
  }
  return false;
}

/**
 * Claim the store as early as possible (server boot), not on first data load.
 * Otherwise a freshly started server can read a lock left by a dead process
 * while the previous engine is still alive, and both believe they own the file.
 */
function claimOwnership() {
  ensureDirs();
  claimStoreLock();
  return ownership();
}

/** Release the lock on a clean exit, but never delete another process's lock. */
function releaseOwnership() {
  try {
    if (readLockPid() === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
}

function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    return Boolean(text) && !EMPTY_TOKENS.has(text) && !BAD_PHONE.test(text);
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function mobileKey(value) {
  const text = phoneString(value);
  if (!text || BAD_PHONE.test(text)) return '';
  try {
    const parsed = normalizePhone(text, { context: 'phone mobile', trusted: true, allowInternational: true });
    if (parsed && (parsed.isMobile || parsed.country !== 'IN')) return `phone:${parsed.e164 || parsed.national}`;
  } catch (e) {}
  return '';
}

function linkKey(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) return '';

  // If it's a search URL (/maps/search/), never use a bare URL as key. Only index if it has an explicit query.
  if (text.includes('/maps/search')) {
    try {
      const u = new URL(text);
      const q = u.searchParams.get('query') || u.searchParams.get('q') || '';
      if (!q || q.length < 3) return '';
      return `link_search:${q.toLowerCase().trim()}`;
    } catch (e) {
      return '';
    }
  }

  // Place URL: Keep the path up to volatile parameters, but ensure it is not a bare /maps
  if (text.includes('/maps/place/') || text.includes('cid=') || text.includes('data=') || text.includes('maps.app.goo.gl')) {
    const base = text.split('&')[0].split('?')[0];
    if (base.endsWith('/maps') || base.endsWith('/maps/')) return '';
    return `link:${base}`;
  }

  return '';
}

function domainKey(website) {
  if (!website || typeof website !== 'string') return '';
  try {
    const clean = website.startsWith('http') ? website : `https://${website}`;
    const host = new URL(clean).hostname.toLowerCase().replace(/^www\./, '');
    if (host && host.includes('.') && !['google.com', 'justdial.com', 'facebook.com', 'instagram.com', 'youtube.com', 'twitter.com', 'x.com', 'linkedin.com'].some(d => host.includes(d))) {
      return `domain:${host}`;
    }
  } catch (e) {}
  return '';
}

function nameLocationKey(name, city) {
  const cleanName = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCity = String(city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanName && cleanName.length >= 4 && cleanCity) {
    return `name_loc:${cleanName}__${cleanCity}`;
  }
  return '';
}

function keysFor(vendor) {
  const keys = [];
  if (vendor.id) keys.push(`id:${vendor.id}`);
  const link = linkKey(vendor.mapsLink || vendor.googleMapsUrl || vendor.profileSourceUrl);
  if (link) keys.push(link);
  const phone = mobileKey(vendor.phone);
  if (phone) keys.push(phone);
  for (const extra of normalizePhoneEntries(vendor.phones)) {
    const key = mobileKey(extra);
    if (key) keys.push(key);
  }
  const dom = domainKey(vendor.website);
  if (dom) keys.push(dom);
  const nameLoc = nameLocationKey(vendor.name, vendor.city || vendor.mandal || vendor.district);
  if (nameLoc) keys.push(nameLoc);
  return keys;
}

function remember(vendor, index) {
  if (!vendor || !vendor.id) return;
  for (const key of keysFor(vendor)) byKey.set(key, index);
}

function rebuildIndex() {
  byId = new Map();
  byKey = new Map();
  vendors.forEach((vendor, index) => {
    if (!vendor || !vendor.id) return;
    byId.set(vendor.id, index);
    remember(vendor, index);
  });
  indexedLength = vendors.length;
}

/**
 * Legacy engines are handed the live array by getVendors() and some of them
 * push into it directly. That bypasses the index, which would make the next
 * saveVendor() believe the row is new and store a duplicate. Absorbing any
 * length drift here keeps those callers safe without a full rewrite.
 */
function syncExternalMutations() {
  if (vendors.length !== indexedLength) rebuildIndex();
}

function uniqueStrings(list, limit = 80) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item == null ? '' : item).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * `phones[]` has been filled by many engines over time, some with plain
 * strings and some with { e164, isMobile } objects. Storing an object through
 * String() produced "[object Object]" and silently destroyed the number.
 * Coerce every entry to one canonical e164 string.
 */
function phoneString(value) {
  if (value == null || value === '' || value === 0 || value === false) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') {
    const text = String(value);
    return text.length >= 7 ? text : '';
  }
  if (typeof value === 'object') {
    return String(value.e164 || value.number || value.raw || value.national || value.value || '').trim();
  }
  return '';
}

function normalizePhoneEntries(list, limit = 60) {
  const cleaned = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = phoneString(item);
    if (!text) continue;
    if (/^\[object /i.test(text)) continue;
    if (BAD_PHONE.test(text)) continue;
    cleaned.push(text);
  }
  return uniqueStrings(cleaned, limit);
}

/**
 * Merge two versions of the same lead. Incoming non-empty values win, but an
 * empty / "Unknown" / "Requires lookup" value NEVER erases a known value.
 */
/**
 * Promote the first validated mobile in `phones[]` to the primary phone.
 * Engines sometimes store the good mobile in the array while the primary field
 * holds a landline or is blank; the user should still see the mobile.
 */
function promoteBestMobile(vendor) {
  if (!vendor || !vendor.id) return vendor;
  if (Array.isArray(vendor.phones)) vendor.phones = normalizePhoneEntries(vendor.phones);
  const list = Array.isArray(vendor.phones) ? vendor.phones : [];
  if (mobileKey(vendor.phone)) return vendor;
  const found = list.find(candidate => mobileKey(candidate));
  if (!found) return vendor;
  vendor.phone = found;
  vendor.whatsappAvailable = true;
  if (!vendor.whatsappLink) {
    const key = mobileKey(found).replace('phone:', '');
    const digits = key.replace(/\D/g, '');
    vendor.whatsappLink = digits ? `https://wa.me/${digits}` : '';
  }
  return vendor;
}

function mergeVendor(existing, incoming) {
  if (!existing) return { ...incoming };
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming || {})) {
    if (key === 'id') continue;

    if (key === 'sessionIds') {
      merged.sessionIds = uniqueStrings([...(existing.sessionIds || []), ...(value || [])], 100);
      continue;
    }
    if (key === 'phones') {
      if (Array.isArray(value) && value.length) {
        merged.phones = normalizePhoneEntries([...(Array.isArray(existing.phones) ? existing.phones : []), ...value], 60);
      }
      continue;
    }
    if (key === 'emails' || key === 'images' || key === 'tags') {
      if (Array.isArray(value) && value.length) {
        merged[key] = uniqueStrings([...(Array.isArray(existing[key]) ? existing[key] : []), ...value], 60);
      }
      continue;
    }
    if (key === 'phone') {
      // Valid mobile always wins. A landline only fills a blank. Never downgrade.
      if (!hasValue(value)) continue;
      const incomingMobile = mobileKey(value);
      const existingMobile = mobileKey(existing.phone);
      if (incomingMobile) merged.phone = value;
      else if (!existingMobile && !hasValue(existing.phone)) merged.phone = value;
      continue;
    }
    if (key === 'whatsappAvailable') {
      merged.whatsappAvailable = Boolean(existing.whatsappAvailable || value);
      continue;
    }
    if (key === 'verified' || key === 'aiVerified') {
      merged[key] = Boolean(existing[key] || value);
      continue;
    }
    if (key === 'rating' || key === 'reviewsCount' || key === 'reviewCount') {
      const incomingNumber = Number(value);
      if (Number.isFinite(incomingNumber) && (incomingNumber > 0 || !existing[key])) merged[key] = value;
      continue;
    }
    if (key === 'scrapedAt' || key === 'lastScrapedAt') {
      const incomingTime = new Date(value).getTime();
      const existingTime = new Date(existing[key] || 0).getTime();
      if (Number.isFinite(incomingTime) && (!Number.isFinite(existingTime) || incomingTime >= existingTime)) {
        merged[key] = value;
      }
      continue;
    }
    if (key === 'crmStage' || key === 'crmNotes' || key === 'crmTasks' || key === 'assignedTo' || key === 'isEngaged') {
      // CRM state belongs to the user, never to a scraper. Only fill when the
      // stored row has nothing at all.
      if (!hasValue(existing[key])) merged[key] = value;
      continue;
    }
    if (!hasValue(value)) continue;

    // Arrays of objects (coordinates, socials, profileQuality) merge shallowly.
    if (value && typeof value === 'object' && !Array.isArray(value) && existing[key] && typeof existing[key] === 'object') {
      merged[key] = { ...existing[key], ...value };
      continue;
    }
    merged[key] = value;
  }

  if (incoming.sessionId) {
    merged.sessionIds = uniqueStrings([...(merged.sessionIds || []), incoming.sessionId], 100);
    merged.sessionId = incoming.sessionId;
    merged.lastSessionId = incoming.sessionId;
  }
  return promoteBestMobile(merged);
}

/**
 * Journal writes are batched. Every upsert used to pay one synchronous
 * appendFileSync, so a burst of 5 zones × 20 cards meant 100 blocking writes
 * in a few hundred milliseconds. Entries now collect for at most 100 ms (or
 * 50 entries) and are appended in a single call.
 *
 * Crash safety: the window is 100 ms. Anything older is already on disk, and
 * anything still buffered is also in memory, so the worst case is losing the
 * last 100 ms of leads, exactly as if the process died mid-request.
 */
function flushJournal() {
  if (journalTimer) {
    clearTimeout(journalTimer);
    journalTimer = null;
  }
  if (!journalBuffer.length) return;
  const chunk = journalBuffer;
  journalBuffer = [];
  if (!canWrite()) return;
  try {
    const payload = chunk.map(entry => JSON.stringify(entry)).join('\n');
    fs.appendFileSync(JOURNAL_FILE, `${payload}\n`, 'utf-8');
    journalLines += chunk.length;
  } catch (e) {
    if (!writeWarned) {
      writeWarned = true;
      console.warn('[vendorStore] Journal write failed:', e.message);
    }
  }
}

function journalAppend(entry) {
  if (!canWrite()) return;
  journalBuffer.push(entry);
  dirty = true;
  if (journalBuffer.length >= JOURNAL_BATCH_LIMIT) {
    flushJournal();
    return;
  }
  if (!journalTimer) {
    journalTimer = setTimeout(() => {
      journalTimer = null;
      flushJournal();
    }, JOURNAL_FLUSH_MS);
    if (typeof journalTimer.unref === 'function') journalTimer.unref();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Rolling backups
   Every write path funnels through snapshotNow, so the only safe place to keep
   history is next to it. A backup holds the in-memory truth *before* a risky
   change, which is why callers can also ask for one explicitly.
   ──────────────────────────────────────────────────────────────────────────── */

function listBackups() {
  try {
    return fs.readdirSync(DATA_DIR)
      .map(name => {
        const match = BACKUP_RE.exec(name);
        return match ? { name, ts: Number(match[1]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.ts - a.ts);
  } catch (e) {
    return [];
  }
}

function pruneBackups(keep = BACKUP_KEEP) {
  const backups = listBackups();
  for (const backup of backups.slice(keep)) {
    try { fs.unlinkSync(path.join(DATA_DIR, backup.name)); } catch (e) {}
  }
}

function newestBackupAt() {
  const backups = listBackups();
  return backups.length ? backups[0].ts : 0;
}

/**
 * Write a full copy of the current store to `scraped_vendors.backup-<ts>.json`.
 * `reason` is only used in the log. Returns the filename, or null when this
 * process does not own the store.
 */
function backupNow(reason = 'manual') {
  if (!booted || !canWrite()) return null;
  const now = Date.now();
  const file = path.join(DATA_DIR, `scraped_vendors.backup-${now}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(vendors), 'utf-8');
    lastBackupAt = now;
    pruneBackups();
    console.log(`[vendorStore] Backup written (${reason}): ${vendors.length} leads → ${path.basename(file)}`);
    return file;
  } catch (error) {
    console.error('[vendorStore] Backup failed:', error.message);
    return null;
  }
}

/** Hourly safety copy, driven by normal snapshots. */
function maybeBackup() {
  const now = Date.now();
  if (now - lastBackupAt < BACKUP_INTERVAL_MS) return;
  if (now - newestBackupAt() < BACKUP_INTERVAL_MS) {
    lastBackupAt = now;
    return;
  }
  backupNow('hourly');
}

function snapshotNow(force = false) {
  ensureDirs();
  // Never write from an unloaded store. `/omni` flushes "to be safe" before it
  // has read anything; in a fresh process that used to snapshot an empty array
  // over the real dataset.
  if (!booted) return false;
  if (!canWrite()) return false;
  // Nothing changed since the last snapshot: skip the whole serialise + rename.
  if (!force && !dirty) return false;
  if (!force && vendors.length === 0 && lastNonEmptyCount > 0) {
    console.error(`[vendorStore] BLOCKED empty snapshot: ${lastNonEmptyCount} leads were loaded but memory is empty. Keeping the previous file.`);
    return false;
  }
  const payload = JSON.stringify(vendors);
  const tmp = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, payload, 'utf-8');
    fs.renameSync(tmp, STORE_FILE);
    // The snapshot already contains every buffered journal entry, so the
    // buffer can be discarded together with the journal.
    if (journalTimer) {
      clearTimeout(journalTimer);
      journalTimer = null;
    }
    journalBuffer = [];
    try { fs.truncateSync(JOURNAL_FILE, 0); } catch (e) {}
    journalLines = 0;
    dirty = false;
    try {
      fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf-8');
    } catch (e) {}
    if (vendors.length > lastNonEmptyCount) lastNonEmptyCount = vendors.length;
    maybeBackup();
    return true;
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch (e) {}
    console.error('[vendorStore] Snapshot failed:', error.message);
    return false;
  }
}

function scheduleSnapshot() {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    snapshotNow();
  }, SNAPSHOT_DEBOUNCE_MS);
  if (typeof snapshotTimer.unref === 'function') snapshotTimer.unref();
}

function readJsonArray(file) {
  try {
    if (!fs.existsSync(file)) return [];
    let content = fs.readFileSync(file, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    content = content.trim();
    if (!content) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (e) {
    return null;
  }
}

function healFromSessions() {
  const recovered = [];
  const seenFiles = new Set();

  // A search folder is `{ id, name, metadata, leads: [...] }`, not a bare
  // array. The old reader only understood arrays, so every folder was skipped
  // and a damaged store could only be rebuilt from three stale backups.
  const readRows = (file) => {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
      content = content.trim();
      if (!content) return [];
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && Array.isArray(parsed.leads)) return parsed.leads.filter(Boolean);
      if (parsed && parsed.metadata && Array.isArray(parsed.metadata.leads)) return parsed.metadata.leads.filter(Boolean);
      return [];
    } catch (e) {
      return [];
    }
  };

  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, depth + 1); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.json') || seenFiles.has(full)) continue;
      seenFiles.add(full);
      recovered.push(...readRows(full));
    }
  };
  walk(SESSIONS_DIR, 0);

  // Backups are the last-resort copy if the folders were also cleaned.
  try {
    const backups = fs.readdirSync(DATA_DIR)
      .filter(name => /^scraped_vendors\.backup-\d+\.json$/.test(name))
      .map(name => ({ name, time: fs.statSync(path.join(DATA_DIR, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    for (const backup of backups.slice(0, 3)) {
      recovered.push(...readRows(path.join(DATA_DIR, backup.name)));
    }
  } catch (e) {}

  return recovered;
}

/**
 * Merge many recovered rows in a single pass. The per-row upsert path rebuilds
 * the index whenever the array length drifts, which turns a 20k-row recovery
 * into O(n^2). Same dedupe rules (id, Maps link, mobile), linear cost.
 */
function bulkRestore(rows) {
  const out = [];
  const idIndex = new Map();
  const keyIndex = new Map();

  const indexInto = (vendor, idx) => {
    idIndex.set(vendor.id, idx);
    for (const key of keysFor(vendor)) {
      if (key.startsWith('id:')) continue;
      if (!keyIndex.has(key)) keyIndex.set(key, idx);
    }
  };

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.id) continue;
    let idx = idIndex.get(row.id);
    if (idx === undefined) {
      for (const key of keysFor(row)) {
        if (key.startsWith('id:')) continue;
        const hit = keyIndex.get(key);
        if (hit !== undefined) { idx = hit; break; }
      }
    }
    if (idx === undefined) {
      const stored = promoteBestMobile({ ...row });
      stored.sessionIds = uniqueStrings([...(stored.sessionIds || []), stored.sessionId].filter(Boolean), 100);
      out.push(stored);
      indexInto(stored, out.length - 1);
    } else {
      const merged = mergeVendor(out[idx], row);
      out[idx] = merged;
      indexInto(merged, idx);
    }
  }

  vendors = out;
  rebuildIndex();
  return out.length;
}

function load() {
  if (booted) return;
  booted = true;
  ensureDirs();
  claimStoreLock();

  let mutated = false;
  const primary = readJsonArray(STORE_FILE);
  if (primary === null) {
    // Corrupt JSON: keep a copy for forensics, then heal from folders.
    try {
      const corrupt = path.join(DATA_DIR, `scraped_vendors.corrupt-${Date.now()}.json`);
      fs.copyFileSync(STORE_FILE, corrupt);
      console.warn(`[vendorStore] Store was corrupt, preserved at ${path.basename(corrupt)}.`);
    } catch (e) {}
  }
  vendors = Array.isArray(primary) ? primary.slice() : [];
  if (vendors.length > 0) lastNonEmptyCount = vendors.length;

  // Replay the journal on top of the last snapshot. Idempotent because upserts
  // merge by id.
  if (fs.existsSync(JOURNAL_FILE)) {
    try {
      const lines = fs.readFileSync(JOURNAL_FILE, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line);
        if (entry && entry.op === 'upsert' && entry.vendor && entry.vendor.id) {
          const idx = vendors.findIndex(v => v && v.id === entry.vendor.id);
          if (idx === -1) vendors.push(entry.vendor);
          else vendors[idx] = mergeVendor(vendors[idx], entry.vendor);
          mutated = true;
        }
      }
    } catch (e) {
      console.warn('[vendorStore] Journal replay skipped:', e.message);
    }
  }

  if (!vendors.length) {
    const recovered = healFromSessions();
    if (recovered.length) {
      console.warn(`[vendorStore] Live store was empty. Rebuilding from search folders (${recovered.length} rows)...`);
      bulkRestore(recovered);
      mutated = true;
    }
  }

  // Promote an existing mobile from phones[] when the primary field is blank
  // or a landline. This recovers numbers earlier runs already scraped, and
  // upgrades legacy object / "[object Object]" phone entries to clean strings.
  vendors.forEach(vendor => {
    if (!vendor) return;
    const beforePhone = vendor.phone || '';
    const beforePhones = JSON.stringify(vendor.phones || null);
    promoteBestMobile(vendor);
    if (beforePhone !== (vendor.phone || '') || beforePhones !== JSON.stringify(vendor.phones || null)) {
      mutated = true;
    }
  });

  rebuildIndex();
  if (vendors.length) {
    console.log(`[vendorStore] Loaded ${vendors.length} leads (${countMobiles()} with a valid mobile).`);
  }
  // Seed the hourly backup clock from disk. If the newest copy is stale, take
  // one now: the first destructive action must never be the thing that proves
  // there was no recovery point.
  lastBackupAt = newestBackupAt();
  if (vendors.length && Date.now() - lastBackupAt > BACKUP_INTERVAL_MS) {
    backupNow('boot');
  }
  // A pure read must never rewrite the snapshot or truncate the journal.
  if (mutated) {
    dirty = true;
    scheduleSnapshot();
  }
}

function countMobiles() {
  let count = 0;
  for (const vendor of vendors) if (mobileKey(vendor && vendor.phone)) count++;
  return count;
}

function findIndexFor(incoming) {
  if (!incoming) return -1;
  if (incoming.id && byId.has(incoming.id)) {
    return byId.get(incoming.id);
  }
  for (const key of keysFor(incoming)) {
    if (key.startsWith('id:')) continue;
    const existingIndex = byKey.get(key);
    if (existingIndex !== undefined && vendors[existingIndex]) {
      return existingIndex;
    }
  }
  return -1;
}

function upsertInternal(incoming, options = {}) {
  if (!incoming || !incoming.id) return null;
  load();
  syncExternalMutations();
  const idx = findIndexFor(incoming);
  let stored;
  if (idx === -1) {
    stored = promoteBestMobile({ ...incoming });
    stored.sessionIds = uniqueStrings([...(stored.sessionIds || []), stored.sessionId].filter(Boolean), 100);
    vendors.push(stored);
    byId.set(stored.id, vendors.length - 1);
  } else {
    stored = mergeVendor(vendors[idx], incoming);
    vendors[idx] = stored;
    byId.set(stored.id, idx);
  }
  remember(stored, idx === -1 ? vendors.length - 1 : idx);
  dirty = true;
  if (options.journal !== false) {
    journalAppend({ op: 'upsert', id: stored.id, vendor: stored, at: new Date().toISOString() });
  }
  if (!options.silent) scheduleSnapshot();
  return stored;
}

function upsert(incoming) {
  return upsertInternal(incoming);
}

function upsertMany(list) {
  load();
  // Some engines mutate the array returned by getVendors() and then call
  // saveVendors(). Re-index once so those rows are merged, not duplicated.
  syncExternalMutations();
  let changed = 0;
  for (const vendor of Array.isArray(list) ? list : []) {
    if (!vendor || !vendor.id) continue;
    const before = findIndexFor(vendor);
    const beforeStamp = before === -1 ? null : vendors[before].scrapedAt;
    const stored = upsertInternal(vendor, { silent: true });
    if (stored && (before === -1 || stored.scrapedAt !== beforeStamp)) changed++;
  }
  if (changed) scheduleSnapshot();
  return changed;
}

function replaceAll(list) {
  load();
  vendors = (Array.isArray(list) ? list : []).filter(Boolean).slice();
  rebuildIndex();
  journalLines = 0;
  try { fs.truncateSync(JOURNAL_FILE, 0); } catch (e) {}
  // A real clear is the one case where an empty file is correct.
  if (vendors.length === 0) lastNonEmptyCount = 0;
  snapshotNow(true);
  return vendors.length;
}

function removeById(id) {
  load();
  const idx = vendors.findIndex(vendor => vendor && vendor.id === id);
  if (idx === -1) return false;
  const [removed] = vendors.splice(idx, 1);
  if (removed) byId.delete(removed.id);
  // Keys are cheap to rebuild and this path is rare (deletes / containment).
  rebuildIndex();
  dirty = true;
  if (vendors.length === 0) {
    // Deleting the last row is explicit, so an empty file is intended here.
    lastNonEmptyCount = 0;
    snapshotNow(true);
  } else {
    scheduleSnapshot();
  }
  return true;
}

/**
 * Remove the current session tag from a lead that was rejected by containment.
 * Only delete the row when this run is the only run that ever saw it; an older
 * valid copy from another session is preserved.
 */
function dropFromSession(id, sessionId) {
  load();
  const index = byId.get(id);
  if (index === undefined) return false;
  const vendor = vendors[index];
  if (!vendor) return false;
  const sessions = Array.isArray(vendor.sessionIds) ? vendor.sessionIds : [];
  const otherSessions = sessions.filter(session => session && session !== sessionId);
  if (otherSessions.length === 0) return removeById(id);
  vendor.sessionIds = otherSessions;
  if (vendor.sessionId === sessionId) vendor.sessionId = otherSessions[otherSessions.length - 1];
  if (vendor.lastSessionId === sessionId) vendor.lastSessionId = otherSessions[otherSessions.length - 1];
  dirty = true;
  scheduleSnapshot();
  return true;
}

function all(userId) {
  load();
  if (!userId) return vendors;
  return vendors.filter(vendor => vendor && vendor.userId === userId);
}

function bySession(sessionId) {
  load();
  if (!sessionId) return [];
  return vendors.filter(vendor => {
    if (!vendor) return false;
    if (vendor.sessionId === sessionId || vendor.lastSessionId === sessionId) return true;
    return Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(sessionId);
  });
}

function findById(id) {
  load();
  const index = byId.get(id);
  return index === undefined ? null : vendors[index] || null;
}

/**
 * True when this row would merge into an existing lead (same id, Maps link or
 * mobile) instead of creating a new one. Credit admission must use this so a
 * duplicate can never cost a credit.
 */
function isKnown(vendor) {
  if (!vendor) return false;
  load();
  if (vendors.length !== indexedLength) syncExternalMutations();
  return findIndexFor(vendor) !== -1;
}

function findMatch(incoming) {
  if (!incoming) return null;
  load();
  if (vendors.length !== indexedLength) syncExternalMutations();
  const idx = findIndexFor(incoming);
  return idx !== -1 ? vendors[idx] : null;
}

function flushNow() {
  if (!booted) return false;
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  const wrote = snapshotNow();
  // If there was nothing dirty (or the snapshot could not be written), make
  // sure buffered journal entries still reach the disk.
  if (!wrote) flushJournal();
  return wrote;
}

function stats() {
  load();
  return { total: vendors.length, mobiles: countMobiles() };
}

// Cheap, non-loading view of who may write. Used by /api/health so a second
// engine can be spotted immediately instead of silently running read-only.
function ownership() {
  return {
    readOnly: Boolean(foreignOwner && pidAlive(lockOwnerPid)),
    ownerPid: Number(lockOwnerPid) || 0,
    thisPid: process.pid
  };
}

module.exports = {
  all,
  bySession,
  findById,
  findMatch,
  isKnown,
  upsert,
  upsertMany,
  replaceAll,
  removeById,
  dropFromSession,
  flushNow,
  flushJournal,
  backupNow,
  listBackups,
  stats,
  ownership,
  claimOwnership,
  releaseOwnership,
  mergeVendor,
  // exported for tests
  _internal: { mobileKey, keysFor, phoneString, normalizePhoneEntries, STORE_FILE, JOURNAL_FILE }
};
