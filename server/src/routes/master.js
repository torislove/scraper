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
  // If an explicit MASTER_KEY is enforced in environment, verify header
  const key = process.env.MASTER_KEY;
  if (key && req.headers['x-master-key'] !== key) {
    return res.status(403).json({ error: 'Master key required.', code: 'master_key_required' });
  }

  // Verify master scope or role
  const isMaster = req.headers['x-workspace-scope'] === 'master' || 
                   req.identity?.role === 'master' || 
                   req.identity?.role === 'admin';
  if (!isMaster && process.env.AUTH_REQUIRED === '1') {
    return res.status(403).json({ error: 'Forbidden: Master administrative privileges required.', code: 'master_required' });
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

/* ------------------------------------------------------------ master lead bank */

router.get('/leads', (req, res) => {
  try {
    const { client = 'all', country, state, district, category, q, hasPhone, limit = 100, page = 1 } = req.query;
    const maxLimit = Math.min(Number(limit) || 100, 500);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * maxLimit;

    const dirsToScan = [];
    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });
      for (const sd of subdirs) {
        if (client === 'all' || client === sd) {
          dirsToScan.push({ dir: path.join(SESSIONS_DIR, sd), clientId: sd });
        }
      }
    }

    const leadDedupeMap = new Map();
    const queryLower = q ? String(q).toLowerCase() : null;
    const catLower = category ? String(category).toLowerCase() : null;
    const countryUpper = country ? String(country).toUpperCase() : null;
    const stateLower = state ? String(state).toLowerCase() : null;
    const distLower = district ? String(district).toLowerCase() : null;
    const requirePhone = String(hasPhone) === 'true' || hasPhone === '1';

    for (const { dir, clientId } of dirsToScan) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const sessionData = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          if (!sessionData || !Array.isArray(sessionData.leads)) continue;

          for (const lead of sessionData.leads) {
            if (!lead || !lead.name) continue;

            const phone = lead.phone || lead.mobile || '';
            const phoneValid = phone && !/Obfuscated|Requires/i.test(String(phone));
            if (requirePhone && !phoneValid) continue;

            if (countryUpper && lead.country && String(lead.country).toUpperCase() !== countryUpper) continue;
            if (catLower && lead.category && !String(lead.category).toLowerCase().includes(catLower)) continue;
            if (stateLower && lead.state && !String(lead.state).toLowerCase().includes(stateLower)) continue;
            if (distLower && lead.district && !String(lead.district).toLowerCase().includes(distLower)) continue;

            if (queryLower) {
              const match = (lead.name && lead.name.toLowerCase().includes(queryLower)) ||
                            (phone && phone.includes(queryLower)) ||
                            (lead.city && lead.city.toLowerCase().includes(queryLower)) ||
                            (lead.address && lead.address.toLowerCase().includes(queryLower));
              if (!match) continue;
            }

            // Deduplicate by normalized phone or name + city
            const normPhone = phone.replace(/[^0-9]/g, '');
            const dedupeKey = normPhone && normPhone.length >= 8
              ? `phone_${normPhone}`
              : `name_${String(lead.name).toLowerCase().trim()}_${String(lead.city || '').toLowerCase().trim()}`;

            if (!leadDedupeMap.has(dedupeKey)) {
              leadDedupeMap.set(dedupeKey, {
                ...lead,
                clientId,
                sessionId: sessionData.id,
                discoveredAt: sessionData.timestamp || sessionData.createdAt || null
              });
            }
          }
        } catch (e) {
          // Skip corrupt file
        }
      }
    }

    const allLeads = Array.from(leadDedupeMap.values());
    const totalCount = allLeads.length;
    const paginatedLeads = allLeads.slice(skip, skip + maxLimit);

    res.json({
      success: true,
      leads: paginatedLeads,
      totalCount,
      page: pageNum,
      limit: maxLimit,
      totalPages: Math.ceil(totalCount / maxLimit)
    });
  } catch (error) {
    console.error('[Master] Failed to query leads:', error);
    res.status(500).json({ error: 'Failed to query master lead bank' });
  }
});

router.delete('/notifications/:id', (req, res) => {
  res.json(store.deleteNotification(req.params.id));
});

module.exports = router;
