'use strict';

/**
 * resolveIdentity.js
 *
 * Turns a signed session token into the identity the rest of the engine already
 * understands (`x-user-id`, `x-workspace-scope`), AND verifies live tokenVersion
 * and suspension state so revoked or suspended accounts stop immediately.
 */

const { readToken, verifyLiveSession } = require('../routes/auth');

const PUBLIC_PATHS = /^\/(auth\/(config|login|register|google|forgot-password|reset-password|logout|me)|health|ready|app\/info|diagnostics\/selftest|map-tiles\/|public\/)/;

module.exports = function resolveIdentity(req, res, next) {
  const claims = readToken(req);

  if (claims) {
    const live = verifyLiveSession(claims);
    if (!live.ok) {
      if (PUBLIC_PATHS.test(req.path)) return next();
      return res.status(live.reason === 'account_suspended' ? 403 : 401).json({
        error: live.reason,
        message: live.reason === 'account_suspended'
          ? 'Your workspace is currently paused.'
          : 'Your session was signed out or expired. Please sign in again.'
      });
    }

    req.identity = { ...claims, ...live.user };
    if (live.user.clientId) req.headers['x-user-id'] = String(live.user.clientId);
    req.headers['x-workspace-scope'] =
      live.user.role === 'master' || live.user.role === 'admin' ? 'master' : 'client';
    return next();
  }

  if (process.env.AUTH_REQUIRED === '1' && !PUBLIC_PATHS.test(req.path)) {
    return res.status(401).json({
      error: 'unauthenticated',
      message: 'Sign in to continue.'
    });
  }

  return next();
};
