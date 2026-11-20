'use strict';

/**
 * runContext.js
 *
 * A tiny AsyncLocalStorage carrier so any engine, however deep in the call
 * stack, can ask "which user and which run am I doing this for?" without
 * every function growing a context parameter.
 *
 * Why this exists
 * ---------------
 * The zero-knowledge relay needs to know whose extension should fetch a page.
 * Threading `userId` through 23 engines and ~90 helper functions would be a
 * large, risky diff. AsyncLocalStorage gives the same answer for free: the
 * queue enters a context once per job and every awaited call inside it can
 * read it.
 *
 * Safety: if there is no context (a CLI script, a cron job, a test), the
 * getters return safe defaults instead of throwing.
 */

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithContext(context, fn) {
  const store = {
    userId: String(context?.userId || 'anonymous'),
    sessionId: context?.sessionId ? String(context.sessionId) : null,
    isMaster: Boolean(context?.isMaster),
    country: context?.country ? String(context.country).toUpperCase() : null,
    startedAt: context?.startedAt || Date.now()
  };
  return storage.run(store, fn);
}

function getRunContext() {
  return storage.getStore() || null;
}

function currentUserId() {
  return getRunContext()?.userId || 'anonymous';
}

function currentSessionId() {
  return getRunContext()?.sessionId || null;
}

function currentCountry() {
  return getRunContext()?.country || null;
}

function isMasterRun() {
  return Boolean(getRunContext()?.isMaster);
}

module.exports = {
  runWithContext,
  getRunContext,
  currentUserId,
  currentSessionId,
  currentCountry,
  isMasterRun
};
