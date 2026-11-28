'use strict';

/**
 * engines/gosom/index.js
 * Ultra-Fast Native Go Google Maps Scraper Engine Bridge.
 * Executes pre-compiled google_maps_scraper.exe in fast-mode with geo-coordinates.
 * Zero Chromium browser overhead, ~50MB RAM, sub-second response times.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { normalizeLead } = require('../contract');
const { parsePhoneDetails } = require('../phoneUtils');
const { gosomSemaphore } = require('../../services/concurrency');

const BINARY_PATH = process.env.GOSOM_BIN || (process.platform === 'win32'
  ? path.resolve(__dirname, '../../../bin/google_maps_scraper.exe')
  : path.resolve(__dirname, '../../../bin/google_maps_scraper'));

function extractJsonArrays(content) {
  const records = [];
  if (!content) return records;
  let inString = false;
  let escape = false;
  let depth = 0;
  let startIndex = -1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '[') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          const slice = content.slice(startIndex, i + 1);
          try {
            const parsed = JSON.parse(slice);
            if (Array.isArray(parsed)) records.push(...parsed);
          } catch (_) {}
          startIndex = -1;
        }
      }
    }
  }
  return records;
}

async function runGosomBatchInputs({
  inputLines = [],
  zone,
  countryCode = 'IN',
  radius = 4000,
  depth = 5,
  concurrency = 6,
  extractEmail = true,
  signal,
  timeoutMs = 34000,
  log = console.log
}) {
  if (signal?.aborted || !inputLines.length || !fs.existsSync(BINARY_PATH)) return [];

  const lat = Number(zone?.lat);
  const lng = Number(zone?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  return gosomSemaphore.run(() => {
    if (signal?.aborted) return [];
    const tmpDir = os.tmpdir();
    const runId = `gosom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const inputPath = path.join(tmpDir, `${runId}_in.txt`);
    const outputPath = path.join(tmpDir, `${runId}_out.json`);

    fs.writeFileSync(inputPath, inputLines.join('\n'), 'utf8');

    const crawlDepth = Math.max(3, Number(depth || 5));
    const workers = Math.max(2, Math.min(10, Number(concurrency || 6)));
    const args = [
      '-input', inputPath,
      '-results', outputPath,
      '-json',
      '-fast-mode',
      '-c', String(workers),
      '-depth', String(crawlDepth)
    ];

    if (!zone?.isCustom && (lat !== 0 || lng !== 0)) {
      args.push('-geo', `${lat},${lng}`);
      args.push('-radius', String(radius));
    }
    if (extractEmail) args.push('-email');

    return new Promise((resolve) => {
      let resolved = false;
      const proc = spawn(BINARY_PATH, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

      const cleanup = () => {
        try { fs.unlinkSync(inputPath); } catch (_) {}
        try { fs.unlinkSync(outputPath); } catch (_) {}
      };

      const killTimer = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch (_) {}
        cleanup();
        if (!resolved) { resolved = true; resolve([]); }
      }, timeoutMs);

      const onAbort = () => {
        clearTimeout(killTimer);
        try { proc.kill('SIGKILL'); } catch (_) {}
        cleanup();
        if (!resolved) { resolved = true; resolve([]); }
      };
      if (signal) signal.addEventListener('abort', onAbort, { once: true });

      let stderrOutput = '';
      proc.stderr.on('data', (d) => { stderrOutput += d.toString(); });

      proc.on('error', (err) => {
        clearTimeout(killTimer);
        if (signal) signal.removeEventListener('abort', onAbort);
        log(`[gosom] Spawn error: ${err.message}`);
        cleanup();
        if (!resolved) { resolved = true; resolve([]); }
      });

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (resolved) return;
        resolved = true;
        if (code !== 0 && !stderrOutput.includes('scrapemate exited')) {
          log(`[gosom] Exited with code ${code}: ${stderrOutput}`);
        }
        if (!fs.existsSync(outputPath)) { cleanup(); return resolve([]); }

        try {
          const rawContent = fs.readFileSync(outputPath, 'utf8').trim();
          cleanup();
          resolve(extractJsonArrays(rawContent));
        } catch (_) {
          cleanup();
          resolve([]);
        }
      });
    });
  });
}

async function runGosomSingleZone(opts) {
  const { category, zone, baseCity } = opts;
  const hasCity = zone.name.toLowerCase().includes(baseCity.toLowerCase());
  const queryStr = hasCity ? `${category} in ${zone.name}` : `${category} in ${zone.name}, ${baseCity}`;
  return runGosomBatchInputs({ ...opts, inputLines: [queryStr], concurrency: 2 });
}

async function runGosomZoneBatch({
  queries = [],
  zone,
  baseCity,
  countryCode = 'IN',
  radius = 2500,
  depth = 5,
  concurrency = 6,
  extractEmail = true,
  signal,
  log = () => {}
}) {
  const hasCity = zone.name.toLowerCase().includes(baseCity.toLowerCase());
  const lineToQuery = new Map();
  const inputLines = [];

  for (const q of queries) {
    const cleanQ = String(q || '').trim();
    if (!cleanQ) continue;
    const line = hasCity ? `${cleanQ} in ${zone.name}` : `${cleanQ} in ${zone.name}, ${baseCity}`;
    if (!lineToQuery.has(line)) {
      lineToQuery.set(line, cleanQ);
      inputLines.push(line);
    }
  }

  const rawRecords = await runGosomBatchInputs({
    inputLines,
    zone,
    countryCode,
    radius,
    depth,
    concurrency,
    extractEmail,
    signal,
    log
  });

  const normalized = [];
  for (const r of rawRecords) {
    const matchedQuery = lineToQuery.get(r.input_id) || r.category || queries[0] || '';
    const lead = normalizeGosomPlace(r, zone, baseCity, countryCode, matchedQuery);
    if (lead) {
      lead.matchedSubcategory = matchedQuery;
      normalized.push(lead);
    }
  }
  return normalized;
}

function normalizeGosomPlace(p, zone, baseCity, countryCode = 'IN', category = '') {
  if (!p || !p.title) return null;
  const cleanName = p.title.trim();
  const rawPhone = p.phone || '';
  const phoneInfo = parsePhoneDetails(rawPhone, countryCode);

  let waLink = phoneInfo.whatsappLink;
  if (!waLink && Array.isArray(p.reservations)) {
    const waItem = p.reservations.find(r => r && typeof r.link === 'string' && r.link.includes('wa.me'));
    if (waItem) waLink = waItem.link;
  }

  const emailsList = Array.isArray(p.emails) ? p.emails : [];
  const primaryEmail = emailsList.length > 0 ? emailsList[0] : '';
  const zoneName = zone?.name || '';
  const fullAddr = p.address || `${zoneName}, ${baseCity}`;
  const locality = p.complete_address?.borough || zoneName;
  const city = p.complete_address?.city || baseCity;

  return normalizeLead({
    name: cleanName,
    phone: phoneInfo.primary || rawPhone,
    mobilePhone: phoneInfo.mobile || (phoneInfo.isMobile ? phoneInfo.primary : ''),
    landlinePhone: phoneInfo.landline || (!phoneInfo.isMobile ? phoneInfo.primary : ''),
    isMobile: phoneInfo.isMobile,
    isLandline: phoneInfo.isLandline,
    whatsappAvailable: Boolean(waLink || phoneInfo.isMobile),
    whatsappLink: waLink,
    email: primaryEmail,
    emails: emailsList,
    website: p.web_site || '',
    address: fullAddr,
    locality: locality,
    city: city,
    state: p.complete_address?.state || '',
    pincode: p.complete_address?.postal_code || '',
    country: countryCode,
    lat: p.latitude || zone?.lat || null,
    lng: p.longitude || zone?.lng || null,
    category: String(p.category || '').trim(),
    matchedSubcategory: category,
    rating: p.review_rating || null,
    reviewsCount: p.review_count || null,
    placeId: String(p.place_id || p.placeId || '').trim(),
    mapsLink: p.link || (p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : ''),
    source: 'gosom_google_maps_fast',
    verified: Boolean(phoneInfo.primary)
  }, 'gosom_google_maps_fast');
}

module.exports = {
  runGosomSingleZone,
  runGosomZoneBatch,
  normalizeGosomPlace,
  parsePhoneDetails,
  extractJsonArrays
};
