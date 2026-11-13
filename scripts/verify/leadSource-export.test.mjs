/**
 * Export rule checks for both apps' leadSource helper.
 *
 * The rule: Primary Phone is only ever a parser-validated mobile. Extra
 * numbers and landlines go to Secondary Phone, and the WhatsApp/`wa.me` link
 * applies to mobiles only. A lead whose only number is a landline must export
 * with an empty Primary Phone — never a silently mixed dialer column.
 *
 * Run: node scripts/verify/leadSource-export.test.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(process.cwd());

const apps = ['client', 'master'];

const leads = [
  // Only a landline.
  { name: 'Landline Only', phone: '0863 223 4567', phoneType: 'landline', isLandline: true, isMobile: false,
    phones: ['0863 223 4567'], district: 'Guntur', source: 'Google Maps' },
  // A landline stored first, a mobile second: the mobile must win.
  { name: 'Mixed Numbers', phone: '0863 223 4567', phones: ['0863 223 4567', '+91 99661 16711'],
    phoneType: 'landline', isMobile: false, isLandline: true, sourceEngine: 'justdial' },
  // A clean mobile, two spellings of the same number.
  { name: 'Mobile Only', phone: '+91 97012 34567', phones: ['+919701234567', '9701234567'],
    phoneType: 'mobile', isMobile: true, source: 'openstreetmap' },
  // No phone at all.
  { name: 'No Phone', source: 'unknown-engine' }
];

function parseCsv(csv) {
  const lines = csv.split('\r\n');
  const header = lines[0].split('","').map(cell => cell.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
        else if (ch === '"') quoted = false;
        else current += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(current); current = ''; }
      else current += ch;
    }
    cells.push(current);
    const row = {};
    header.forEach((key, index) => { row[key] = cells[index] ?? ''; });
    return row;
  });
  return { header, rows };
}

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label}: ${error.message}`);
  }
}

for (const app of apps) {
  const file = path.join(root, app, 'src', 'v2', 'utils', 'leadSource.js');
  const mod = await import(pathToFileURL(file).href);
  const { buildLeadCsv, exportPhones, listLeadSources, leadSourceMeta } = mod;

  console.log(`\n${app}: ${path.relative(root, file)}`);
  check('exports exportPhones / buildLeadCsv', () => {
    assert.equal(typeof exportPhones, 'function');
    assert.equal(typeof buildLeadCsv, 'function');
  });

  check('landline is never the primary phone', () => {
    const phones = exportPhones(leads[0]);
    assert.equal(phones.primary, '');
    assert.match(phones.secondary, /0863/);
    assert.equal(phones.isMobile, false);
  });

  check('a mobile in the same lead beats the landline', () => {
    const phones = exportPhones(leads[1]);
    assert.match(phones.primary, /99661\s?16711/);
    assert.match(phones.secondary, /0863/);
    assert.equal(phones.isMobile, true);
  });

  check('duplicate spellings collapse to one number', () => {
    const phones = exportPhones(leads[2]);
    assert.match(phones.primary, /97012\s?34567/);
    assert.equal(phones.secondary, '');
    assert.equal(phones.isMobile, true);
  });

  const csv = buildLeadCsv(leads, { city: 'Guntur' });
  const { header, rows } = parseCsv(csv);
  check('csv has a Secondary Phone column', () => {
    assert.ok(header.includes('Primary Phone'));
    assert.ok(header.includes('Secondary Phone'));
  });

  check('csv rows match the rule', () => {
    const [landline, mixed, mobile, none] = rows;
    assert.equal(landline['Primary Phone'], '');
    assert.match(landline['Secondary Phone'], /0863/);
    assert.equal(landline['Mobile Verified'], 'No');
    assert.match(mixed['Primary Phone'], /99661\s?16711/);
    assert.match(mixed['Secondary Phone'], /0863/);
    assert.equal(mixed['Mobile Verified'], 'Yes');
    assert.match(mobile['Primary Phone'], /97012\s?34567/);
    assert.equal(mobile['Secondary Phone'], '');
    assert.equal(none['Primary Phone'], '');
    assert.equal(none['Secondary Phone'], '');
    assert.equal(none['Mobile Verified'], 'No');
  });

  check('no row ever puts a landline in Primary Phone', () => {
    for (const row of rows) {
      const primary = row['Primary Phone'];
      if (!primary) continue;
      const digits = primary.replace(/\D/g, '').slice(-10);
      assert.match(digits, /^[6-9]\d{9}$/, `landline in primary: ${primary}`);
    }
  });

  check('source labels survive export', () => {
    assert.equal(leadSourceMeta('justdial').label, 'JustDial');
    assert.equal(leadSourceMeta('openstreetmap').label, 'OpenStreetMap');
    assert.equal(leadSourceMeta('unknown-engine').label, 'Unknown source');
    const counts = listLeadSources(leads);
    assert.equal(counts.reduce((sum, entry) => sum + entry.count, 0), leads.length);
  });

  check('csv quoting round-trips a comma in the name', () => {
    const tricky = buildLeadCsv([{ name: 'A, B "C"', phone: '+919966116711' }]);
    const parsed = parseCsv(tricky);
    assert.equal(parsed.rows[0]['Business Name'], 'A, B "C"');
  });
}

console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
