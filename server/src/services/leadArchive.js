/**
 * leadArchive.js
 *
 * Append-only safety net for destructive lead operations.
 *
 * Deleting a folder, clearing a search, or pruning a session used to be
 * irreversible: the row left `scraped_vendors.json` and only a rolling backup
 * could bring it back. The archive records every removed row first, with the
 * reason and the folder it belonged to, so a mistake is always recoverable.
 *
 * Format: one JSON object per line, `{ at, reason, sessionId, vendor }`.
 * Rotation keeps the current file plus one previous file, so the log can never
 * grow without bound.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config/paths');

const ARCHIVE_FILE = path.join(DATA_DIR, 'deleted_leads.jsonl');
const ROTATED_FILE = path.join(DATA_DIR, 'deleted_leads.1.jsonl');
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_RESTORE = 2_000;

function rotateIfNeeded() {
  try {
    if (!fs.existsSync(ARCHIVE_FILE)) return;
    if (fs.statSync(ARCHIVE_FILE).size < MAX_BYTES) return;
    try { fs.unlinkSync(ROTATED_FILE); } catch (e) {}
    fs.renameSync(ARCHIVE_FILE, ROTATED_FILE);
  } catch (e) {
    /* rotation must never block a delete */
  }
}

/**
 * Persist removed rows before they are dropped from the live store.
 * Returns `{ archived }`. Never throws: archiving is best-effort, but the
 * caller still keeps its own rolling backup.
 */
function archive(rows, meta = {}) {
  const list = Array.isArray(rows) ? rows.filter(row => row && row.id) : [];
  if (!list.length) return { archived: 0 };

  rotateIfNeeded();
  const at = new Date().toISOString();
  const reason = String(meta.reason || 'delete').slice(0, 80);
  const sessionId = String(meta.sessionId || '').slice(0, 120);

  try {
    const body = list
      .map(vendor => JSON.stringify({ at, reason, sessionId, vendor }))
      .join('\n') + '\n';
    fs.appendFileSync(ARCHIVE_FILE, body, 'utf-8');
    return { archived: list.length, file: path.basename(ARCHIVE_FILE) };
  } catch (error) {
    console.error('[leadArchive] Could not archive removed leads:', error.message);
    return { archived: 0, error: error.message };
  }
}

function readLines(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

/** Summary for the dashboard: counts, last removal, and the newest entries. */
function stats({ limit = 50 } = {}) {
  const lines = [...readLines(ROTATED_FILE), ...readLines(ARCHIVE_FILE)];
  const ids = new Set();
  let lastAt = null;
  let lastReason = '';

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry && entry.vendor && entry.vendor.id) ids.add(entry.vendor.id);
      if (entry && entry.at && (!lastAt || entry.at > lastAt)) {
        lastAt = entry.at;
        lastReason = entry.reason || '';
      }
    } catch (e) {
      /* a torn line is skipped, not fatal */
    }
  }

  const recent = [];
  for (let i = lines.length - 1; i >= 0 && recent.length < limit; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (!entry || !entry.vendor) continue;
      recent.push({
        at: entry.at || null,
        reason: entry.reason || '',
        sessionId: entry.sessionId || '',
        id: entry.vendor.id,
        name: entry.vendor.name || 'Unknown',
        phone: entry.vendor.phone || '',
        city: entry.vendor.city || '',
        category: entry.vendor.category || '',
      });
    } catch (e) {
      /* skip */
    }
  }

  let bytes = 0;
  try { bytes = fs.statSync(ARCHIVE_FILE).size; } catch (e) {}

  return {
    totalArchived: ids.size,
    lastAt,
    lastReason,
    bytes,
    recent,
  };
}

/**
 * Put archived rows back into the live store. When `sessionId` is supplied the
 * row is re-attached to that folder; otherwise it returns as an unowned lead
 * that still shows in the live dataset.
 */
function restore(ids, { sessionId = '', userId = '' } = {}) {
  const wanted = new Set(
    (Array.isArray(ids) ? ids : []).map(String).filter(Boolean).slice(0, MAX_RESTORE)
  );
  if (!wanted.size) return { restored: 0, rows: [] };

  const dbAdapter = require('../config/dbAdapter');
  const latest = new Map();

  for (const line of [...readLines(ROTATED_FILE), ...readLines(ARCHIVE_FILE)]) {
    try {
      const entry = JSON.parse(line);
      const vendor = entry && entry.vendor;
      if (!vendor || !vendor.id || !wanted.has(vendor.id)) continue;
      latest.set(vendor.id, vendor);
    } catch (e) {
      /* skip */
    }
  }

  const rows = [];
  for (const vendor of latest.values()) {
    const copy = { ...vendor };
    if (sessionId) {
      // Attach exactly one live folder. Copying old session pointers back would
      // resurrect ids that no longer exist and could block a future delete.
      copy.sessionId = sessionId;
      copy.lastSessionId = sessionId;
      copy.sessionIds = [sessionId];
    } else {
      copy.sessionIds = [];
    }
    if (!copy.userId && userId) copy.userId = userId;
    rows.push(copy);
  }

  if (rows.length) {
    dbAdapter.saveVendors(rows);
    try { dbAdapter.flushSync(); } catch (e) {}
  }

  return { restored: rows.length, rows };
}

module.exports = {
  archive,
  stats,
  restore,
  ARCHIVE_FILE,
  ROTATED_FILE,
};
