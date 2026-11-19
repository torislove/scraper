const crypto = require('crypto');

/**
 * A scrape's session ID is also its folder ID, its export ID and (after the
 * Kubernetes migration) its job ID. It therefore has to be unique across every
 * concurrent run, not merely across every millisecond.
 *
 * `Date.now().toString(36)` alone collides when two people press Scrape in the
 * same tick: both runs then write leads into one folder and each user sees the
 * other's results. A 4-byte random suffix makes that impossible in practice
 * (2^32 per millisecond) while keeping the readable time prefix.
 */
function makeSessionId(prefix = 'omni') {
  const time = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${time}_${rand}`;
}

module.exports = { makeSessionId };
