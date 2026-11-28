import fs from 'node:fs';
import path from 'node:path';

const UI_ROOTS = ['shared', 'client/src', 'master/src'];
const INDIGO_RE = /\b(?:indigo|violet)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const indigoHits = [];
for (const root of UI_ROOTS) {
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (INDIGO_RE.test(line)) {
        indigoHits.push(`${file.replace(/\\/g, '/')}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
}

const requiredShared = [
  'shared/design/tokens.css',
  'shared/data/countries.js',
  'shared/ui/GlassPanel.jsx',
  'shared/ui/LiquidButton.jsx',
  'shared/ui/FlagChip.jsx',
  'shared/ui/StatTile.jsx'
];
const missingShared = requiredShared.filter((p) => !fs.existsSync(p));

if (missingShared.length > 0 || indigoHits.length > 0) {
  if (missingShared.length > 0) {
    console.error(`[check-parity] Missing shared modules:\n  ${missingShared.join('\n  ')}`);
  }
  if (indigoHits.length > 0) {
    console.error(`[check-parity] Retired indigo/violet classes found (${indigoHits.length}):`);
    indigoHits.slice(0, 25).forEach((h) => console.error(`  - ${h}`));
  }
  process.exit(1);
}

console.log('[check-parity] OK — @shared modules present and zero indigo/violet classes in JS/JSX.');
