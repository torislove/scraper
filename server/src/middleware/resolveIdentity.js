'use strict';

/**
 * resolveIdentity.js
 *
 * Turns a signed session token into the identity the rest of the engine already
 * understands (`x-user-id`, `x-workspace-scope`).
 *
 * The engine grew up trusting those two headers, and every route, vault path and
 * folder lookup is keyed off them. Rather than rewrite all of them at once, the
 * token is verified here and the headers are *overwritten* from the claims. A
 * forged header therefore stops mattering the moment a token is present.
 *
 * When AUTH_REQUIRED=1 the middleware also rejects anonymous API calls, except
 * for the endpoints a login screen and a health probe must reach.
 */

const { readToken } = require('../routes/auth');

const PUBLIC_PATHS = /^\/(auth\/(config|login|google|me)|health|ready|app\/info|public\/)/;

module.exports = function resolveIdentity(req, res, next) {
  const claims = readToken(req);

  if (claims) {
    req.identity = claims;
    if (claims.clientId) req.headers['x-user-id'] = String(claims.clientId);
    req.headers['x-workspace-scope'] =
      claims.role === 'master' || claims.role === 'admin' ? 'master' : 'client';
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
