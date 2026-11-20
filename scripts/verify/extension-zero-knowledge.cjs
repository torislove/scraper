'use strict';

/**
 * extension-zero-knowledge.cjs
 *
 * Guards the promise: the extension is a blind pipe. If someone ever pastes a
 * selector, a parser or a geo table into it, this fails the build.
 *
 *   node scripts/verify/extension-zero-knowledge.cjs
 */

const fs = require('fs');
const path = require('path');

const EXT_DIR = path.resolve(__dirname, '../../extension');

const JS_FILES = ['background.js', 'contentBridge.js', 'popup.js'];

// Anything that would mean the extension understands the page instead of
// relaying it. `outerHTML` is deliberately allowed: returning the raw document
// is the whole job.
const FORBIDDEN = [
  { pattern: /querySelector(All)?\s*\(/, why: 'DOM selector — parsing belongs on the server' },
  { pattern: /getElementsBy(ClassName|TagName)\s*\(/, why: 'DOM selector — parsing belongs on the server' },
  { pattern: /\.innerText\b/, why: 'reads page text instead of relaying bytes' },
  { pattern: /cheerio|jsdom|parse5/, why: 'HTML parser shipped to the client' },
  { pattern: /\bmandal\b|\bvillage\b|\bpincode\b|\bgstin\b/i, why: 'India geo vocabulary leaked into the extension' },
  { pattern: /justdial|indiamart|yellowpages|trustpilot/i, why: 'engine name leaked into extension logic' },
  { pattern: /phone\s*regex|PHONE_REGEX|validatePhone/i, why: 'phone parsing leaked into the extension' }
];

let failed = 0;

console.log('\nZero-knowledge audit of extension/\n');

for (const file of JS_FILES) {
  const full = path.join(EXT_DIR, file);
  if (!fs.existsSync(full)) {
    console.log(`  FAIL  ${file} is missing`);
    failed += 1;
    continue;
  }

  const source = fs.readFileSync(full, 'utf8');
  const lines = source.split(/\r?\n/);

  let hits = 0;
  for (const rule of FORBIDDEN) {
    lines.forEach((line, index) => {
      // Ignore comments: the file header explains what the extension does and
      // legitimately names the sites it must never parse.
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
      // Ignore permission descriptors: naming a site in an origin list is the
      // opposite of shipping an engine for it.
      if (/https?:\/\//.test(line)) return;
      if (rule.pattern.test(line)) {
        hits += 1;
        failed += 1;
        console.log(`  FAIL  ${file}:${index + 1}  ${rule.why}`);
        console.log(`        ${trimmed.slice(0, 120)}`);
      }
    });
  }

  if (!hits) console.log(`  PASS  ${file} (${lines.length} lines)`);
}

// Size ceiling: the whole point is that the JavaScript is small enough to
// audit by hand. Icons are excluded — they are pixels, not logic.
let jsBytes = 0;
for (const file of JS_FILES) {
  const full = path.join(EXT_DIR, file);
  if (fs.existsSync(full)) jsBytes += fs.statSync(full).size;
}

const KB = Math.round(jsBytes / 1024);
if (KB <= 60) {
  console.log(`  PASS  JavaScript is ${KB} KB (audit ceiling 60 KB)`);
} else {
  console.log(`  FAIL  JavaScript is ${KB} KB, above the 60 KB audit ceiling`);
  failed += 1;
}

// The manifest must not request `tabs` (it would read browsing history) and
// must not request `<all_urls>` at install time.
const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));
const perms = manifest.permissions || [];
if (perms.includes('tabs')) {
  console.log('  FAIL  manifest requests "tabs" (reads the user\'s tab list)');
  failed += 1;
} else {
  console.log('  PASS  manifest does not request "tabs"');
}

const hosts = manifest.host_permissions || [];
if (hosts.includes('<all_urls>') || hosts.includes('https://*/*')) {
  console.log('  FAIL  manifest requests all-site access at install time');
  failed += 1;
} else {
  console.log(`  PASS  manifest requests ${hosts.length} named origins, not all sites`);
}

console.log(failed ? `\n${failed} problem(s)\n` : '\nExtension is a blind pipe. All checks passed.\n');
process.exit(failed ? 1 : 0);
