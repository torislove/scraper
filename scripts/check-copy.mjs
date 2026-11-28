import fs from 'node:fs';
import path from 'node:path';

/**
 * check-copy.mjs
 * Enforces the No Testimonials & No Promises copy policy across user-facing surfaces:
 * shared/, landing/, SeoLandingPage, DirectoryPage, CommandCenter, OmniSearchBar, Folders, Login.
 */
const SCAN_DIRS = [
  'shared',
  'client/src/pages',
  'client/src/v2/landing',
  'client/src/v2/components',
  'master/src/pages',
  'master/src/v2/landing',
  'master/src/v2/components'
];

const BANNED_PATTERNS = [
  { label: 'testimonial', re: /\btestimonials?\b/i },
  { label: '#1 claim', re: /(?:^|[\s"'>])#1\b/i },
  { label: 'world-class', re: /\bworld[- ]class\b/i },
  { label: 'guarantee', re: /\bguarante(?:e|ed|es|ing)\b/i },
  { label: 'never misses', re: /\bnever\s+miss(?:es)?\b/i },
  { label: 'without missing a single', re: /\bwithout\s+missing\s+a\s+single\b/i },
  { label: '100% legal / 100% accurate', re: /\b100%\s+(?:legal|accurate|verified|guaranteed|complete\s+coverage)\b/i },
  { label: 'leads/min promise', re: /\b\d+\+?\s*leads\s*\/\s*min\b/i }
];

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

const hits = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const rule of BANNED_PATTERNS) {
        if (rule.re.test(line)) {
          hits.push(`${file.replace(/\\/g, '/')}:${idx + 1} [${rule.label}]: ${trimmed}`);
        }
      }
    });
  }
}

if (hits.length > 0) {
  console.error(`[check-copy] FAILED — ${hits.length} banned promise/superlative/testimonial string(s):`);
  hits.slice(0, 30).forEach((h) => console.error(`  - ${h}`));
  process.exit(1);
}

console.log('[check-copy] OK — zero testimonials, fake promises, or banned superlatives found.');
