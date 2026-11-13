#!/usr/bin/env node
/**
 * Verify the folder CSV export rule against the live engine.
 *
 * Rule: Primary Phone is a parser-validated mobile only. Extra mobiles and
 * landlines belong in Secondary Phone; the WhatsApp URL is present only when a
 * mobile exists. A folder containing landline-only businesses is the useful
 * test, because that is where the old code put a landline in the dialer column.
 *
 * Run: node scripts/verify/csv-export-rule.cjs [sessionId]
 */
const http = require('http');

const SESSION = process.argv[2] || 'master_sweep_mwczy875';
const HOST = '127.0.0.1';
const PORT = 5002;

function get(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: HOST, port: PORT, path, timeout: 60000,
      headers: { 'x-user-id': 'master', 'x-workspace-scope': 'master' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (error) => resolve({ status: 0, error: error.message, body: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout', body: '' }); });
  });
}

/** RFC4180-ish parser: quoted cells, escaped quotes, embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = (rows.shift() || []).map((h) => h.trim());
  return { header, rows: rows.filter((r) => r.some((v) => v.trim() !== '')).map((r) => {
    const obj = {};
    header.forEach((key, index) => { obj[key] = r[index] ?? ''; });
    return obj;
  }) };
}

const isIndianMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

(async () => {
  let failures = 0;
  const fail = (message) => { failures += 1; console.log(`FAIL ${message}`); };

  const res = await get(`/api/sessions/export/${encodeURIComponent(SESSION)}?format=csv`);
  console.log(`export ${SESSION}: HTTP ${res.status} (${res.body.length} bytes)`);
  if (res.status !== 200) { fail(`export failed: ${res.error || res.body.slice(0, 200)}`); process.exit(1); }

  const { header, rows } = parseCsv(res.body);
  console.log(`columns: ${header.length} | rows: ${rows.length}`);
  console.log(`headers: ${header.join(' | ')}`);

  if (!header.includes('Primary Phone')) fail('missing Primary Phone column');
  if (!header.includes('Secondary Phone')) fail('missing Secondary Phone column');

  let mobilePrimary = 0;
  let emptyPrimary = 0;
  let landlineInPrimary = 0;
  let mobileWithoutWhatsapp = 0;
  let whatsappWithoutMobile = 0;
  let secondaryWithNumber = 0;
  const landlineSamples = [];

  for (const row of rows) {
    const primary = String(row['Primary Phone'] || '').trim();
    const secondary = String(row['Secondary Phone'] || '').trim();
    const whatsapp = String(row['WhatsApp Direct URL'] || '').trim();
    const type = String(row['Phone Type'] || '').trim();

    if (primary) {
      if (isIndianMobile(primary)) mobilePrimary += 1;
      else {
        landlineInPrimary += 1;
        landlineSamples.push({ name: row['Business Name'], primary, type });
      }
    } else {
      emptyPrimary += 1;
    }

    if (primary && !whatsapp) mobileWithoutWhatsapp += 1;
    if (!primary && whatsapp) whatsappWithoutMobile += 1;
    if (secondary && secondary.replace(/\D/g, '').length >= 6) secondaryWithNumber += 1;
  }

  console.log('\nrule checks');
  console.log(`  rows with mobile in Primary Phone : ${mobilePrimary}`);
  console.log(`  rows with empty Primary Phone     : ${emptyPrimary}`);
  console.log(`  rows with Secondary Phone numbers : ${secondaryWithNumber}`);
  console.log(`  landline in Primary Phone         : ${landlineInPrimary}`);
  console.log(`  mobile without WhatsApp URL       : ${mobileWithoutWhatsapp}`);
  console.log(`  WhatsApp URL without mobile       : ${whatsappWithoutMobile}`);

  if (landlineInPrimary > 0) {
    fail(`${landlineInPrimary} landline(s) in Primary Phone`);
    for (const sample of landlineSamples.slice(0, 8)) console.log('   ', JSON.stringify(sample));
  }
  if (mobileWithoutWhatsapp > 0) fail(`${mobileWithoutWhatsapp} mobile rows lost their WhatsApp URL`);
  if (whatsappWithoutMobile > 0) fail(`${whatsappWithoutMobile} rows carry a WhatsApp URL without a mobile`);
  if (rows.length === 0) fail('export contained no rows');
  if (mobilePrimary + emptyPrimary !== rows.length) fail('primary phone cell is neither mobile nor empty');

  // The landline-only business that used to leak into Primary Phone.
  const landlineRows = rows.filter((row) => /landline/i.test(String(row['Phone Type'] || '')));
  if (landlineRows.length) {
    console.log(`\nlandline-only rows: ${landlineRows.length}`);
    for (const row of landlineRows.slice(0, 5)) {
      console.log('   ', JSON.stringify({
        name: row['Business Name'],
        primary: row['Primary Phone'],
        secondary: row['Secondary Phone'],
        type: row['Phone Type'],
        whatsapp: row['WhatsApp Direct URL']
      }));
      if (String(row['Primary Phone'] || '').trim() !== '') fail(`landline row ${row['Business Name']} still has a primary phone`);
    }
  }

  // The other formats must still answer.
  for (const format of ['json', 'txt', 'vcf']) {
    const other = await get(`/api/sessions/export/${encodeURIComponent(SESSION)}?format=${format}`);
    const ok = other.status === 200 && other.body.length > 0;
    console.log(`format ${format}: ${other.status} (${other.body.length} bytes)`);
    if (!ok) fail(`format ${format} export failed`);
  }

  console.log(failures === 0 ? '\nPASS' : `\nFAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
