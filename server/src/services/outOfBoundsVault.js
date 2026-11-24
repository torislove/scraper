/**
 * outOfBoundsVault.js — the visible home for rejected leads.
 *
 * A containment guard rejects a business when it belongs to a neighbouring
 * district, a different state, or sits outside the surveyed district boundary.
 * Dropping those rows silently is wrong: the operator needs to see what was
 * rejected and why. This service keeps one Master folder per district,
 * `master_oob_<district>`, with every rejected vendor categorised by the rule
 * that removed it.
 *
 * Nothing here creates data. A row is stored exactly as the engine returned it,
 * with three audit fields added (`oob`, `oobReason`, `oobCategory`).
 */

const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../config/paths');

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(district|dist|state)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'unassigned';
}

function folderIdFor(district) {
  return `master_oob_${slug(district)}`;
}

function folderPathFor(district) {
  const dir = path.join(SESSIONS_DIR, 'master');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${folderIdFor(district)}.json`);
}

function readFolder(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function writeFolder(file, payload) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

function phoneKey(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function rowKey(row) {
  if (!row) return '';
  if (row.id) return `id:${row.id}`;
  const phone = phoneKey(row.phone);
  if (phone) return `phone:${phone}`;
  return `name:${String(row.name || '').toLowerCase().trim()}|${String(row.address || '').toLowerCase().trim()}`;
}

/**
 * Turn the rejection evidence into a stable, human-readable category so the
 * folder can be filtered by "neighbouring district" or "outside boundary".
 */
function categoryFor(row, targetDistrict, targetState) {
  const district = String(row?.district || '').replace(/\b(district|dist)\b/gi, '').trim();
  const state = String(row?.state || '').trim();
  const target = String(targetDistrict || '').replace(/\b(district|dist)\b/gi, '').trim();

  if (targetState && state && state.toLowerCase() !== String(targetState).toLowerCase()) {
    return `Outside ${targetState}`;
  }
  if (target && district && district.toLowerCase() !== target.toLowerCase()) {
    return `Neighbouring district: ${district}`;
  }
  return `Outside ${target || 'target'} boundary`;
}

/**
 * Append rejected rows to the district's Out-of-Bound folder.
 *
 * @param {object} options
 * @param {string} options.district  District the sweep was supposed to cover.
 * @param {string} [options.state]   State that district belongs to.
 * @param {string} [options.category] Original search category.
 * @param {string} [options.sessionId] Sweep that produced the rows.
 * @param {Array}  options.rows      Rejected leads (or `{ lead, reason }`).
 * @param {string} [options.reason]  Fallback reason for plain leads.
 * @returns {{ id: string, added: number, total: number, file: string|null, categories: Array }}
 */
function recordRejections({ district, state = '', category = 'Rejected leads', sessionId = '', rows = [], reason = '' } = {}) {
  const entries = (Array.isArray(rows) ? rows : [])
    .map(item => (item && item.lead ? item : { lead: item, reason }))
    .filter(item => item.lead && (item.lead.id || item.lead.name));

  if (!entries.length) {
    return { id: folderIdFor(district), added: 0, total: 0, file: null, categories: [] };
  }

  const id = folderIdFor(district);
  const file = folderPathFor(district);
  const current = readFolder(file);

  const existing = Array.isArray(current?.leads) ? current.leads : [];
  const seen = new Set(existing.map(rowKey));
  const now = new Date().toISOString();
  const added = [];

  for (const entry of entries) {
    const key = rowKey(entry.lead);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const oobCategory = categoryFor(entry.lead, district, state);
    added.push({
      ...entry.lead,
      oob: true,
      oobReason: String(entry.reason || 'outside district boundary').slice(0, 160),
      oobCategory,
      oobTargetDistrict: district || 'Unassigned',
      oobSessionId: sessionId || entry.lead.sessionId || '',
      oobRejectedAt: now
    });
  }

  if (!added.length) {
    return {
      id,
      added: 0,
      total: existing.length,
      file,
      categories: countCategories(existing)
    };
  }

  const leads = [...added, ...existing];
  const categories = countCategories(leads);
  const startedAt = current?.metadata?.startedAt || now;

  const payload = {
    id,
    name: `Out of Bound · ${district || 'Unassigned'} · ${category || 'Rejected leads'}`,
    userId: 'master',
    category: category || 'Rejected leads',
    location: district ? `${district} (rejected)` : 'Unassigned (rejected)',
    isMasterSweep: true,
    masterScope: 'out-of-bound',
    isOutOfBound: true,
    createdAt: current?.createdAt || now,
    timestamp: now,
    leadCount: leads.length,
    phoneCount: leads.filter(lead => phoneKey(lead.phone).length === 10).length,
    verifiedCount: leads.filter(lead => lead.verified || lead.phone).length,
    subFolders: categories.map(item => ({ area: item.category, count: item.count })),
    leads,
    metadata: {
      ...(current?.metadata || {}),
      isMasterSweep: true,
      masterScope: 'out-of-bound',
      isOutOfBound: true,
      oobDistrict: district || null,
      oobState: state || null,
      status: 'completed',
      coverageMode: 'audit',
      startedAt,
      completedAt: now,
      sourceSessions: [...new Set([
        ...(current?.metadata?.sourceSessions || []),
        ...(sessionId ? [sessionId] : [])
      ])],
      oobCategories: categories,
      rule: 'Leads rejected by district containment are kept here for review; they never enter a client folder.'
    }
  };

  writeFolder(file, payload);

  return { id, added: added.length, total: leads.length, file, categories };
}

function countCategories(leads) {
  const counts = new Map();
  for (const lead of leads || []) {
    const key = lead.oobCategory || 'Outside target boundary';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function listOobFolders() {
  const dir = path.join(SESSIONS_DIR, 'master');
  if (!fs.existsSync(dir)) return [];
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith('master_oob_') && f.endsWith('.json'));
    return files.map(f => {
      const full = path.join(dir, f);
      const data = readFolder(full);
      if (!data) return null;
      return {
        id: data.id,
        name: data.name,
        district: data.metadata?.oobDistrict || '',
        leadCount: data.leadCount || (Array.isArray(data.leads) ? data.leads.length : 0),
        phoneCount: data.phoneCount || 0,
        categories: data.metadata?.oobCategories || countCategories(data.leads || []),
        updatedAt: data.timestamp || data.createdAt
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

module.exports = {
  folderIdFor,
  folderPathFor,
  recordRejections,
  categoryFor,
  listOobFolders
};
