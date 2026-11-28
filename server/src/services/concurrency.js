'use strict';

/**
 * server/src/services/concurrency.js
 * Shared Zero-Contention Concurrency Semaphores & HTTP Keep-Alive Agents.
 * Prevents Go binary CPU thrashing, Python :5003 thread storms, and socket exhaustion.
 */

const http = require('http');
const https = require('https');

function createSemaphore(maxConcurrent = 4) {
  const limit = Math.max(1, Number(maxConcurrent) || 1);
  let active = 0;
  const queue = [];

  const next = () => {
    while (active < limit && queue.length > 0) {
      const { fn, resolve, reject } = queue.shift();
      active += 1;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          active = Math.max(0, active - 1);
          next();
        });
    }
  };

  return {
    run(fn) {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
      });
    },
    stats() {
      return { active, queued: queue.length, limit };
    }
  };
}

const gosomSemaphore = createSemaphore(3);
const gmapRpcSemaphore = createSemaphore(14);
const rescueRpcSemaphore = createSemaphore(4);
const justdialSemaphore = createSemaphore(12);
const serpSemaphore = createSemaphore(8);

const localHttpAgent = new http.Agent({ keepAlive: false, maxSockets: 48 });
const sharedHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 48, maxFreeSockets: 16 });

module.exports = {
  createSemaphore,
  gosomSemaphore,
  gmapRpcSemaphore,
  rescueRpcSemaphore,
  justdialSemaphore,
  serpSemaphore,
  localHttpAgent,
  sharedHttpsAgent
};
