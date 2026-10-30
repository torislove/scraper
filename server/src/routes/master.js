/**
 * master.js — operator endpoints for the Master Command Center.
 *
 * Everything here is scoped to the master workspace. The client app never calls
 * these; it only reads its own notifications from /api/notifications.
 *
 * Local-first trust model: the master UI and the engine run on the same machine,
 * so the workspace-scope header is the boundary. If MASTER_KEY is set, callers
 * must also send it as x-master-key.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { SESSIONS_DIR } = require('../config/paths');
const store = require('../services/masterStore');

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function requireMaster(req, res, next) {
  const scoped = req.headers['x-workspace-scope'] === 'master';
  if (!scoped) {
    return res.status(403).json({ error: 'Master authorization required.' });
  }
  const key = process.env.MASTER_KEY;
  if (key && req.headers['x-master-key'] !== key) {
    return res.status(403).json({ error: 'Master key required.', code: 'master_key_required' });
  }
  return next();
}

// Operator data changes on every action; never let a browser serve a 304 and
// hide a client's newly imported folders.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(requireMaster);

router.get('/overview', (req, res) => {
  res.json(store.overview());
});

/* ------------------------------------------------------------------ clients */

router.get('/clients', (req, res) => {
  res.json({ clients: store.listClients(), plans: store.PLAN_CREDITS });
});

router.post('/clients', (req, res) => {
  try {
    const client = store.upsertClient(req.body || {});
    res.json({ ok: true, client });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/clients/:id', (req, res) => {
  const existing = store.getClient(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  try {
    const client = store.upsertClient({ ...req.body, id: existing.id });
    res.json({ ok: true, client });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/clients/:id', (req, res) => {
  store.deleteClient(req.params.id);
  res.json({ ok: true });
});

router.get('/clients/:id/sessions', (req, res) => {
  const clientId = safeId(req.params.id);
  const dir = path.join(SESSIONS_DIR, clientId);
  if (!fs.existsSync(dir)) return res.json({ sessions: [] });

  const sessions = [];
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (!data || !data.id) continue;
      const leads = Array.isArray(data.leads) ? data.leads : [];
      sessions.push({
        id: data.id,
        name: data.name || `${data.category || 'Search'} · ${data.location || ''}`.trim(),
        category: data.category || '',
        location: data.location || '',
        leadCount: Number(data.leadCount) || leads.length,
        phoneCount: Number(data.phoneCount)
          || leads.filter(l => l.phone && !/Obfuscated|Requires/i.test(String(l.phone))).length,
        status: data.status || 'completed',
        timestamp: data.timestamp || data.createdAt || null,
        isMasterSweep: Boolean(data.isMasterSweep || data.metadata?.isMasterSweep)
      });
    } catch (e) {
      /* skip a corrupt folder */
    }
  }

  sessions.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  res.json({ sessions });
});

router.post('/clients/:id/import', (req, res) => {
  try {
    const result = store.importSessions(
      req.params.id,
      req.body?.sessionIds,
      req.body?.mode === 'consolidate' ? 'consolidate' : 'separate'
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message, code: error.code });
  }
});

/* ------------------------------------------------------------ notifications */

router.get('/notifications', (req, res) => {
  res.json({ notifications: store.listNotifications() });
});

router.post('/notifications', (req, res) => {
  try {
    const notification = store.addNotification(req.body || {});
    res.json({ ok: true, notification });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/notifications/:id', (req, res) => {
  res.json(store.deleteNotification(req.params.id));
});

module.exports = router;
