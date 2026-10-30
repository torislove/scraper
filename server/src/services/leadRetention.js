/**
 * leadRetention.js
 *
 * Fresh-data policy for the command center.
 *
 * Every new scrape run purges leads from previous sessions so the UI always
 * shows the current run, never a pile of yesterday's vendors. Two things are
 * deliberately preserved:
 *   1. Leads that are engaged in the CRM (stage changed, notes, tasks,
 *      assignment) — deleting a real sales conversation would be destructive.
 *   2. Leads explicitly passed in `keepIds` (used by tests and resumable runs).
 *
 * Search folders (session vaults) are also preserved by default. The live
 * vendor store stays fresh, while every completed search remains available as
 * its own dated folder under db/user_sessions/<user>/<session>.json.
 */

const fs = require('fs');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const fidelity = require('./categoryFidelity');

const {
  DATA_DIR,
  DEEP_PROFILES_DIR: DEEP_DIR,
  SESSIONS_DIR
} = require('../config/paths');

function safeId(id) {
  return String(id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function sessionMatches(vendor, sessionId) {
  if (!vendor || !sessionId) return false;
  if (vendor.sessionId === sessionId || vendor.lastSessionId === sessionId) return true;
  return Array.isArray(vendor.sessionIds) && vendor.sessionIds.includes(sessionId);
}

function isEngaged(vendor) {
  if (!vendor) return false;
  if (vendor.isEngaged === true) return true;
  const stage = String(vendor.crmStage || '').toLowerCase();
  if (stage && stage !== 'new') return true;
  if (Array.isArray(vendor.crmNotes) && vendor.crmNotes.length) return true;
  if (Array.isArray(vendor.crmTasks) && vendor.crmTasks.length) return true;
  if (vendor.assignedTo) return true;
  return false;
}

function removeDeepProfile(vendorId) {
  const file = path.join(DEEP_DIR, `${safeId(vendorId)}.json`);
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return true;
    }
  } catch (e) {
    // A locked file must never break a scrape run.
  }
  return false;
}

/**
 * Delete leads from previous sessions.
 * @param {object} options
 * @param {string} options.keepSessionId current run session
 * @param {string[]} [options.keepIds] extra vendor ids to keep
 * @param {number} [options.maxAgeHours] only remove leads older than this; 0 = all old sessions
 * @param {boolean} [options.keepEngaged=true] preserve CRM-engaged leads
 */
function purgeStaleLeads(options = {}) {
  const keepSessionId = options.keepSessionId || '';
  const keepIds = new Set(Array.isArray(options.keepIds) ? options.keepIds : []);
  const maxAgeHours = Math.max(0, Number(options.maxAgeHours) || 0);
  const keepEngaged = options.keepEngaged !== false;
  const requestedCategory = String(options.requestedCategory || '').trim();
  const threshold = maxAgeHours > 0 ? Date.now() - maxAgeHours * 3600_000 : 0;

  const all = dbAdapter.getVendors();
  if (!Array.isArray(all) || !all.length) {
    return { removed: 0, kept: 0, profilesRemoved: 0, engagedKept: 0 };
  }

  const kept = [];
  const removed = [];
  let engagedKept = 0;

  for (const vendor of all) {
    if (!vendor || !vendor.id) {
      kept.push(vendor);
      continue;
    }
    if (sessionMatches(vendor, keepSessionId) || keepIds.has(vendor.id)) {
      kept.push(vendor);
      continue;
    }
    if (keepEngaged && isEngaged(vendor)) {
      // Keep the conversation, but not if it belongs to a completely
      // different search. A plumber must not appear in a photographer run
      // just because it was moved in the CRM; the old folder still has it.
      if (!requestedCategory || fidelity.isVendorRelevant(vendor, requestedCategory)) {
        kept.push(vendor);
        engagedKept++;
        continue;
      }
    }
    if (threshold) {
      const scraped = new Date(vendor.lastScrapedAt || vendor.scrapedAt || vendor.createdAt || 0).getTime();
      if (Number.isFinite(scraped) && scraped >= threshold) {
        kept.push(vendor);
        continue;
      }
    }
    removed.push(vendor);
  }

  if (!removed.length) {
    return { removed: 0, kept: kept.length, profilesRemoved: 0, engagedKept };
  }

  dbAdapter.saveVendors(kept);
  if (typeof dbAdapter.flushSync === 'function') dbAdapter.flushSync();

  let profilesRemoved = 0;
  for (const vendor of removed) {
    if (removeDeepProfile(vendor.id)) profilesRemoved++;
  }

  return {
    removed: removed.length,
    kept: kept.length,
    profilesRemoved,
    engagedKept,
    removedSessions: [...new Set(removed.map(v => v.sessionId).filter(Boolean))]
  };
}

/**
 * Remove session vault files for all sessions except the current run.
 * These vaults are snapshots; the live vendor store is the source of truth.
 */
function purgeSessionVaults(options = {}) {
  const keep = new Set((Array.isArray(options.keepSessionIds) ? options.keepSessionIds : [])
    .filter(Boolean)
    .map(safeId));
  if (!keep.size && !options.force) return { removed: 0 };

  let removed = 0;
  if (!fs.existsSync(SESSIONS_DIR)) return { removed };

  const dirs = fs.readdirSync(SESSIONS_DIR)
    .map(name => path.join(SESSIONS_DIR, name))
    .filter(dir => {
      try { return fs.statSync(dir).isDirectory(); } catch (e) { return false; }
    });

  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(name => name.endsWith('.json')); } catch (e) { continue; }
    for (const file of files) {
      const sessionKey = safeId(file.replace(/\.json$/i, ''));
      if (keep.has(sessionKey)) continue;
      try {
        fs.unlinkSync(path.join(dir, file));
        removed++;
      } catch (e) {
        // Ignore files locked by another reader.
      }
    }
  }

  return { removed };
}

/**
 * One call used by the auto/manual run routes.
 *
 * Session vaults are the user's search folders, so they are NOT deleted on a
 * fresh run. Pass `purgeVaults: true` only for an explicit hard reset.
 */
function prepareFreshRun(options = {}) {
  const leads = purgeStaleLeads(options);
  const vaults = options.purgeVaults === true
    ? purgeSessionVaults({
      keepSessionIds: options.keepSessionId ? [options.keepSessionId] : [],
      force: true
    })
    : { removed: 0 };
  return { ...leads, vaultsRemoved: vaults.removed };
}

module.exports = {
  purgeStaleLeads,
  purgeSessionVaults,
  prepareFreshRun,
  isEngaged
};
