'use strict';

/**
 * server/index.js
 * Clean-slate entrypoint. Delegates directly to server/server.js.
 */

const app = require('./server');
const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CleanServer] Polyglot Ultra-Low RAM Server running on http://localhost:${PORT}`);
  console.log(`[CleanServer] Memory footprint: ${Math.round(process.memoryUsage().rss / (1024 * 1024))} MB RAM`);
});

module.exports = server;
