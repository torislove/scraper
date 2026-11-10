/**
 * repairVaultStatus.js
 *
 * One-off repair for folders written before the final-metadata fix. A folder
 * that completed every zone but still says "running" is finalized to
 * "completed" using its file mtime as the completion time. Genuinely partial
 * folders are left untouched so the client can offer Continue Scrape.
 *
 * Usage:
 *   node src/utils/repairVaultStatus.js --dry-run
 *   node src/utils/repairVaultStatus.js
 */

const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../config/paths');

function repairVaultStatus({ dryRun = false } = {}) {
  const repaired = [];
  const skipped = [];

  if (!fs.existsSync(SESSIONS_DIR)) {
    return { repaired, skipped, scanned: 0 };
  }

  const dirs = fs.readdirSync(SESSIONS_DIR)
    .map(name => path.join(SESSIONS_DIR, name))
    .filter(dir => {
      try { return fs.statSync(dir).isDirectory(); } catch (e) { return false; }
    });

  let scanned = 0;
  for (const dir of dirs) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter(name => name.endsWith('.json'));
    } catch (e) {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dir, file);
      scanned += 1;
      try {
        const stat = fs.statSync(filePath);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const meta = data.metadata || {};
        const totalZones = Number(meta.totalZones) || 0;
        const completedZones = Number(meta.completedZones) || 0;
        const status = String(meta.status || '').toLowerCase();

        if (status !== 'running' || totalZones <= 0 || completedZones < totalZones) {
          skipped.push(filePath);
          continue;
        }

        meta.status = 'completed';
        meta.completedAt = meta.completedAt || stat.mtime.toISOString();
        meta.repairedAt = new Date().toISOString();
        meta.repairedFrom = 'running';
        data.metadata = meta;

        if (!dryRun) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        }
        repaired.push(filePath);
      } catch (e) {
        skipped.push(filePath);
      }
    }
  }

  return { repaired, skipped, scanned };
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const result = repairVaultStatus({ dryRun });
  console.log(JSON.stringify({
    dryRun,
    scanned: result.scanned,
    repaired: result.repaired.length,
    skipped: result.skipped.length,
    files: result.repaired
  }, null, 2));
}

module.exports = { repairVaultStatus };
