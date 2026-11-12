/**
 * dedupe-vaults.js
 *
 * Older builds wrote every search folder twice: once under the owner's
 * workspace and once under `anonymous`. That made Master report double the
 * real leads and allowed the two copies to diverge (70 vs 73 rows in one
 * measured run).
 *
 * New writes no longer duplicate. This script repairs existing installs:
 *   • for every folder that exists under both `anonymous` and its owner,
 *     merge the rows by id into the owner's copy (never lose a lead),
 *   • move the redundant `anonymous` copy into `_deduped_backup/`,
 *   • leave genuinely anonymous folders untouched.
 *
 * Safe by default (dry run). Run with --apply to write changes.
 *
 *   node scripts/dedupe-vaults.js
 *   node scripts/dedupe-vaults.js --apply
 */

const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../src/config/paths');

const APPLY = process.argv.includes('--apply');
const BACKUP_DIR = path.join(SESSIONS_DIR, '_deduped_backup');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function mergeLeads(a, b) {
  const byKey = new Map();
  const order = [];
  for (const lead of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!lead) continue;
    const key = lead.id || `${lead.name || ''}|${lead.phone || ''}|${lead.address || ''}`;
    if (byKey.has(key)) {
      byKey.set(key, { ...byKey.get(key), ...lead });
    } else {
      byKey.set(key, lead);
      order.push(key);
    }
  }
  return order.map(key => byKey.get(key));
}

function main() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log(`No sessions directory at ${SESSIONS_DIR}`);
    return;
  }

  const anonDir = path.join(SESSIONS_DIR, 'anonymous');
  const ownerDirs = fs.readdirSync(SESSIONS_DIR)
    .filter(name => name !== 'anonymous' && name !== '_deduped_backup')
    .filter(name => {
      try {
        return fs.statSync(path.join(SESSIONS_DIR, name)).isDirectory();
      } catch (e) {
        return false;
      }
    });

  let merged = 0;
  let backups = 0;
  let skipped = 0;

  for (const owner of ownerDirs) {
    const ownerDir = path.join(SESSIONS_DIR, owner);
    for (const file of fs.readdirSync(ownerDir).filter(name => name.endsWith('.json'))) {
      const anonFile = path.join(anonDir, file);
      if (!fs.existsSync(anonFile)) continue;

      const ownerData = readJson(path.join(ownerDir, file));
      const anonData = readJson(anonFile);
      if (!ownerData || !anonData) {
        skipped += 1;
        continue;
      }

      const ownerLeads = Array.isArray(ownerData.leads) ? ownerData.leads : [];
      const anonLeads = Array.isArray(anonData.leads) ? anonData.leads : [];
      const rows = mergeLeads(ownerLeads, anonLeads);
      if (rows.length < Math.max(ownerLeads.length, anonLeads.length)) {
        skipped += 1;
        continue;
      }

      console.log(
        `${owner}/${file}: owner=${ownerLeads.length} anonymous=${anonLeads.length} -> ${rows.length}${APPLY ? '' : ' (dry run)'}`
      );
      merged += 1;

      if (APPLY) {
        const next = {
          ...ownerData,
          leads: rows,
          leadCount: rows.length,
          phoneCount: rows.filter(lead => lead && lead.phone && !String(lead.phone).includes('Requires')).length,
          verifiedCount: rows.filter(lead => lead && (lead.verified || lead.phone)).length,
          dedupedAt: new Date().toISOString()
        };
        const tmp = path.join(ownerDir, `${file}.tmp`);
        fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8');
        fs.renameSync(tmp, path.join(ownerDir, file));

        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.renameSync(anonFile, path.join(BACKUP_DIR, file));
        backups += 1;
      }
    }
  }

  console.log(`\nScanned ${ownerDirs.length} workspaces. Pairs merged: ${merged}. Backups: ${backups}. Skipped: ${skipped}.`);
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write.');
}

main();
