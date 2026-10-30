/**
 * notifications.js — what the client app is allowed to see from the master.
 *
 * A client only ever receives messages addressed to it (or to everyone) plus
 * the operator's current name/plan/status for that workspace. It cannot read
 * other clients, and it cannot write anything except "I read this".
 */

const express = require('express');
const router = express.Router();
const store = require('../services/masterStore');

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function clientIdFrom(req) {
  return String(req.headers['x-user-id'] || req.query.clientId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

router.get('/', (req, res) => {
  const clientId = clientIdFrom(req);
  if (!clientId) return res.json({ notifications: [], unread: 0 });
  const notifications = store.notificationsFor(clientId);
  res.json({
    notifications,
    unread: notifications.filter(item => !item.read).length
  });
});

router.get('/status', (req, res) => {
  const clientId = clientIdFrom(req);
  const record = clientId ? store.getClientRecord(clientId) : null;
  const client = record;
  res.json({
    client: client
      ? {
          id: client.id,
          name: client.name,
          plan: client.plan,
          status: client.status,
          credits: client.credits,
          note: client.note
        }
      : { id: clientId, name: 'Local workspace', plan: 'free', status: 'active', credits: 0, note: '' }
  });
});

router.post('/:id/read', (req, res) => {
  const clientId = clientIdFrom(req);
  if (!clientId) return res.status(400).json({ error: 'Client id required' });
  res.json(store.markRead(req.params.id, clientId));
});

module.exports = router;
