/**
 * clientGate.js
 *
 * Stops a paused workspace from starting new searches. Saved folders, exports
 * and notes stay readable; only the scrape routes are gated.
 */

const store = require('../services/masterStore');

module.exports = function clientGate() {
  return (req, res, next) => {
    if (req.headers['x-workspace-scope'] === 'master') return next();

    const clientId = String(
      req.headers['x-user-id'] || req.body?.userId || req.query?.userId || ''
    ).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (!clientId) return next();

    const client = store.getClientRecord(clientId);
    if (client && client.status === 'suspended') {
      return res.status(403).json({
        error: 'account_suspended',
        message: `${client.name} is paused by the master account. Your saved folders are still available.`,
        client: { id: client.id, name: client.name, plan: client.plan, status: client.status }
      });
    }

    return next();
  };
};
