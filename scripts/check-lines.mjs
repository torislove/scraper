import fs from 'node:fs';
import path from 'node:path';

const MAX_LINES = 500;
const ROOTS = ['shared', 'client/src', 'master/src'];
const EXTENSIONS = new Set(['.js', '.jsx']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
let checked = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    checked += 1;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
    if (lines > MAX_LINES) {
      violations.push({ file: file.replace(/\\/g, '/'), lines });
    }
  }
}

if (violations.length > 0) {
  console.error(`[check-lines] FAILED — ${violations.length} file(s) exceed ${MAX_LINES} lines:`);
  for (const v of violations.sort((a, b) => b.lines - a.lines)) {
    console.error(`  - ${v.file}: ${v.lines} lines`);
  }
  process.exit(1);
}

console.log(`[check-lines] OK — ${checked} JS/JSX files verified <= ${MAX_LINES} lines.`);
