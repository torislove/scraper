/**
 * Gazetteer warm-up / verification.
 *
 * This script used to call NVIDIA's Llama endpoint to generate district and
 * mandal hierarchies and cache the answers in data/resolved_hierarchies.json.
 * That is gone: the hierarchy already ships in server/db/india_villages.json and
 * resolves in milliseconds, so there is nothing to warm and nothing to invent.
 *
 * Kept as a runnable check so packaging and CI can confirm the gazetteer loads:
 *
 *   node server/warm_all_districts.js
 */

const gazetteer = require('./src/services/localBrain/gazetteer');
const brain = require('./src/services/localBrain');

function main() {
  const started = Date.now();
  gazetteer.load();
  const loadMs = Date.now() - started;
  const stats = gazetteer.stats();

  console.log('[gazetteer] loaded', JSON.stringify(stats));
  console.log(`[gazetteer] load time ${loadMs} ms`);

  // Spot-check both a state and a district so a truncated JSON is caught.
  const checks = ['Andhra Pradesh', 'Guntur', 'Telangana', 'Hyderabad', 'Karnataka', 'Bengaluru Urban'];
  for (const place of checks) {
    const hit = gazetteer.lookup(place);
    console.log(`[gazetteer] ${place.padEnd(16)} -> ${hit.level || 'miss'}${hit.district ? ` (${hit.district}, ${hit.state})` : hit.state ? ` (${hit.state})` : ''}`);
  }

  const status = brain.status();
  console.log('[brain]', JSON.stringify({
    ready: status.ready,
    modelKB: status.modelKB,
    categories: status.categories,
    families: status.families,
    network: status.network,
    apiKeys: status.apiKeys
  }));

  if (!stats.loaded || stats.subDistricts < 5000) {
    console.error('[gazetteer] FAILED: expected at least 5,000 sub-districts');
    process.exitCode = 1;
    return;
  }
  console.log('[gazetteer] OK');
}

main();
