/**
 * masterStore.js
 *
 * The master operator's own bookkeeping, kept beside the engine data:
 *
 *   <DATA_DIR>/master/clients.json         name, plan, status, note per client
 *   <DATA_DIR>/master/notifications.json   messages broadcast to clients
 *
 * A "client" is a workspace directory under db/user_sessions. The directory is
 * created by the client app from its persistent device id, so it is the only
 * stable identity we have without adding accounts. This module never rewrites
 * lead data; it only records who the workspace belongs to and what to tell them.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR, SESSIONS_DIR, ensureDir } = require('../config/paths');

const ROOT = path.join(DATA_DIR, 'master');
const CLIENTS_FILE = path.join(ROOT, 'clients.json');
const NOTIFICATIONS_FILE = path.join(ROOT, 'notifications.json');
const MAX_NOTIFICATIONS = 500;

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

function loadClients() {
  const data = readJson(CLIENTS_FILE, { clients: [] });
  return Array.isArray(data?.clients) ? data.clients : [];
}

function saveClients(clients) {
  writeJson(CLIENTS_FILE, { clients, updatedAt: new Date().toISOString() });
}

function loadNotifications() {
  const data = readJson(NOTIFICATIONS_FILE, { notifications: [] });
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

function saveNotifications(list) {
  writeJson(NOTIFICATIONS_FILE, {
    notifications: list.slice(0, MAX_NOTIFICATIONS),
    updatedAt: new Date().toISOString()
  });
}

/* --------------------------------------------------------------- workspaces */

function listWorkspaces() {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  return fs.readdirSync(SESSIONS_DIR).filter(name => {
    try {
      return fs.statSync(path.join(SESSIONS_DIR, name)).isDirectory();
    } catch (e) {
      return false;
    }
  });
}

function statsForWorkspace(id) {
  const dir = path.join(SESSIONS_DIR, safeId(id));
  const stats = {
    id,
    folders: 0,
    leads: 0,
    mobiles: 0,
    lastActive: null,
    categories: []
  };

  if (!fs.existsSync(dir)) return stats;

  let latest = 0;
  const categories = new Set();

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (!data || !data.id) continue;
      const leads = Array.isArray(data.leads) ? data.leads : [];
      stats.folders += 1;
      stats.leads += Number(data.leadCount) || leads.length;
      stats.mobiles += Number(data.phoneCount)
        || leads.filter(l => l.phone && !/Obfuscated|Requires/i.test(String(l.phone))).length;
      if (data.category) categories.add(String(data.category).slice(0, 40));
      const ts = new Date(data.timestamp || data.createdAt || data.updatedAt || 0).getTime();
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    } catch (e) {
      /* one corrupt folder must not hide the rest */
    }
  }

  stats.lastActive = latest ? new Date(latest).toISOString() : null;
  stats.categories = [...categories].slice(0, 6);
  return stats;
}

function decorateClient(record, workspaceIds) {
  const stats = statsForWorkspace(record.id);
  return {
    ...record,
    ...stats,
    workspaceExists: workspaceIds ? workspaceIds.includes(record.id) : fs.existsSync(path.join(SESSIONS_DIR, safeId(record.id)))
  };
}

/** Records + any workspace directories that have not been named yet. */
function listClients() {
  const records = loadClients();
  const byId = new Map(records.map(record => [record.id, record]));
  const workspaces = listWorkspaces();

  for (const id of workspaces) {
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: id.startsWith('usr_') ? `Unnamed client ${id.slice(-6)}` : id,
        email: '',
        plan: 'free',
        credits: 0,
        status: 'active',
        note: 'Auto-detected workspace',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoCreated: true
      });
    }
  }

  return [...byId.values()]
    .map(record => decorateClient(record, workspaces))
    .sort((a, b) => {
      const at = new Date(a.lastActive || a.updatedAt || 0).getTime() || 0;
      const bt = new Date(b.lastActive || b.updatedAt || 0).getTime() || 0;
      return bt - at;
    });
}

/** Cheap lookup for hot paths (the scrape gate) — no folder scan. */
function getClientRecord(id) {
  const wanted = safeId(id);
  return loadClients().find(record => record.id === wanted) || null;
}

function getClient(id) {
  const wanted = safeId(id);
  const found = loadClients().find(record => record.id === wanted);
  if (!found) {
    return listClients().find(record => record.id === wanted) || null;
  }
  return decorateClient(found);
}

const PLAN_CREDITS = {
  free: 1000,
  starter: 2000,
  pro: 10000,
  agency: 50000,
  custom: 100000
};

function upsertClient(input = {}) {
  const clients = loadClients();
  const id = safeId(input.id) || `usr_master_${Date.now().toString(36)}`;
  let record = clients.find(item => item.id === id);

  if (!record) {
    record = {
      id,
      name: input.name || id,
      email: '',
      plan: 'free',
      credits: PLAN_CREDITS.free,
      status: 'active',
      note: '',
      createdAt: new Date().toISOString()
    };
    clients.push(record);
  }

  const fields = ['name', 'email', 'plan', 'status', 'note'];
  for (const field of fields) {
    if (input[field] !== undefined) record[field] = String(input[field]).slice(0, 160);
  }

  if (input.credits !== undefined) {
    const credits = Number(input.credits);
    if (Number.isFinite(credits)) record.credits = Math.max(0, Math.round(credits));
  } else if (input.plan !== undefined && input.plan !== record.plan) {
    // A plan change without an explicit credit count uses that plan's allowance.
    record.credits = PLAN_CREDITS[String(input.plan).toLowerCase()] ?? record.credits;
  }

  if (!['active', 'suspended'].includes(record.status)) record.status = 'active';
  record.updatedAt = new Date().toISOString();

  saveClients(clients);
  return decorateClient(record);
}

function deleteClient(id) {
  const wanted = safeId(id);
  const clients = loadClients().filter(item => item.id !== wanted);
  saveClients(clients);
  return { ok: true };
}

/* ------------------------------------------------------------- notifications */

function listNotifications({ audience = null, includeRead = true } = {}) {
  return loadNotifications().filter(item => {
    if (!audience) return true;
    return item.audience === 'all' || item.audience === safeId(audience);
  }).filter(item => includeRead || !item.readBy?.length || true);
}

function notificationsFor(clientId) {
  const id = safeId(clientId);
  return loadNotifications()
    .filter(item => item.audience === 'all' || item.audience === id)
    .map(item => ({
      ...item,
      read: Array.isArray(item.readBy) && item.readBy.includes(id)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addNotification(input = {}) {
  const title = String(input.title || '').trim().slice(0, 160);
  const body = String(input.body || '').trim().slice(0, 2000);
  if (!title || !body) {
    const error = new Error('Title and message are required.');
    error.code = 'invalid_notification';
    throw error;
  }

  const audience = input.audience && input.audience !== 'all' ? safeId(input.audience) : 'all';
  const notifications = loadNotifications();
  const item = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    audience,
    audienceLabel: audience === 'all' ? 'All clients' : audience,
    title,
    body,
    kind: ['info', 'success', 'warning'].includes(input.kind) ? input.kind : 'info',
    readBy: [],
    createdAt: new Date().toISOString()
  };

  notifications.unshift(item);
  saveNotifications(notifications);
  return item;
}

function markRead(notificationId, clientId) {
  const id = safeId(clientId);
  const notifications = loadNotifications();
  const item = notifications.find(entry => entry.id === notificationId);
  if (!item) return { ok: false, error: 'Notification not found' };
  if (item.audience !== 'all' && item.audience !== id) return { ok: false, error: 'Not yours' };
  item.readBy = Array.isArray(item.readBy) ? item.readBy : [];
  if (!item.readBy.includes(id)) item.readBy.push(id);
  saveNotifications(notifications);
  return { ok: true, id: notificationId };
}

function deleteNotification(notificationId) {
  const before = loadNotifications();
  const after = before.filter(item => item.id !== notificationId);
  saveNotifications(after);
  return { ok: after.length !== before.length };
}

/* ------------------------------------------------------------------- import */

function readSession(clientId, sessionId) {
  const dir = path.join(SESSIONS_DIR, safeId(clientId));
  const direct = path.join(dir, `${safeId(sessionId)}.json`);
  if (fs.existsSync(direct)) {
    return { file: direct, data: JSON.parse(fs.readFileSync(direct, 'utf-8')) };
  }

  // Session ids and file names normally match, but fall back to a scan.
  if (!fs.existsSync(dir)) return null;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (data && data.id === sessionId) return { file: path.join(dir, file), data };
    } catch (e) {
      /* skip */
    }
  }
  return null;
}

function leadKey(lead) {
  if (!lead) return '';
  return String(lead.id || lead.vendorId || lead.placeId || '')
    || `${String(lead.name || '').toLowerCase()}|${String(lead.phone || '').replace(/\D/g, '').slice(-10)}`;
}

function writeMasterSession(fileName, data) {
  const dir = path.join(SESSIONS_DIR, 'master');
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(data, null, 2), 'utf-8');
}

function mergeLeads(existing, incoming) {
  const seen = new Set((existing || []).map(leadKey));
  const merged = [...(existing || [])];
  let added = 0;
  for (const lead of incoming || []) {
    const key = leadKey(lead);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(lead);
    added += 1;
  }
  return { merged, added };
}

/**
 * Copies sessions into the master workspace.
 *   mode=separate    -> one master folder per source folder
 *   mode=consolidate -> one folder per client, deduped by lead id
 */
function importSessions(clientId, sessionIds = [], mode = 'separate') {
  const client = getClient(clientId);
  if (!client) {
    const error = new Error('Unknown client');
    error.code = 'unknown_client';
    throw error;
  }

  const ids = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : [];
  if (!ids.length) {
    const error = new Error('Choose at least one folder to import.');
    error.code = 'no_sessions';
    throw error;
  }

  const imported = [];
  const now = new Date();
  let consolidated = null;

  if (mode === 'consolidate') {
    const fileName = `master_import_${safeId(client.id)}.json`;
    const file = path.join(SESSIONS_DIR, 'master', fileName);
    consolidated = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf-8'))
      : {
          id: `master_import_${safeId(client.id)}`,
          userId: 'master',
          category: 'All categories',
          location: client.name,
          name: `Master consolidation · ${client.name}`,
          timestamp: now.toISOString(),
          createdAt: now.toISOString(),
          status: 'completed',
          leads: [],
          leadCount: 0,
          phoneCount: 0,
          metadata: { importedFrom: [], isMasterWorkspace: true }
        };
    consolidated.leads = Array.isArray(consolidated.leads) ? consolidated.leads : [];
    consolidated.metadata = consolidated.metadata || {};
    consolidated.metadata.importedFrom = consolidated.metadata.importedFrom || [];
  }

  for (const sessionId of ids) {
    const source = readSession(client.id, sessionId);
    if (!source) continue;
    const data = source.data || {};
    const leads = Array.isArray(data.leads) ? data.leads : [];

    if (consolidated) {
      const { merged, added } = mergeLeads(consolidated.leads, leads);
      consolidated.leads = merged;
      consolidated.leadCount = merged.length;
      consolidated.phoneCount = merged.filter(l => l.phone && !/Obfuscated|Requires/i.test(String(l.phone))).length;
      consolidated.metadata.importedFrom.push({
        sessionId,
        name: data.name,
        leads: leads.length,
        added,
        at: now.toISOString()
      });
      imported.push({ sessionId, added, total: leads.length });
      continue;
    }

    const newId = `master_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const copy = {
      ...data,
      id: newId,
      userId: 'master',
      name: `${data.name || 'Lead folder'} · from ${client.name}`,
      timestamp: now.toISOString(),
      createdAt: now.toISOString(),
      metadata: {
        ...(data.metadata || {}),
        isMasterWorkspace: true,
        importedFrom: { clientId: client.id, clientName: client.name, sessionId },
        importedAt: now.toISOString()
      }
    };
    writeMasterSession(`${newId}.json`, copy);
    imported.push({ sessionId, newId, added: leads.length, total: leads.length });
  }

  if (consolidated) {
    consolidated.timestamp = now.toISOString();
    writeMasterSession(`${consolidated.id}.json`, consolidated);
  }

  return {
    ok: true,
    client: { id: client.id, name: client.name },
    mode,
    imported,
    importedFolders: imported.length,
    importedLeads: imported.reduce((sum, item) => sum + (item.added || 0), 0)
  };
}

/* ----------------------------------------------------------------- overview */

function overview() {
  const all = listClients();
  // Empty auto-detected workspaces are still listed (hidden by default in the
  // UI), but they must not inflate the operator's headline numbers.
  const clients = all.filter(item => !item.autoCreated || item.folders > 0 || item.email);
  const notifications = loadNotifications();
  return {
    clients: clients.length,
    workspaces: all.length,
    suspended: clients.filter(c => c.status === 'suspended').length,
    leads: clients.reduce((sum, c) => sum + (c.leads || 0), 0),
    folders: clients.reduce((sum, c) => sum + (c.folders || 0), 0),
    notifications: notifications.length,
    unread: notifications.filter(item => !item.readBy?.length).length
  };
}

module.exports = {
  PLAN_CREDITS,
  listClients,
  getClient,
  getClientRecord,
  upsertClient,
  deleteClient,
  listWorkspaces,
  statsForWorkspace,
  listNotifications,
  notificationsFor,
  addNotification,
  markRead,
  deleteNotification,
  importSessions,
  overview
};
