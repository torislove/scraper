'use strict';

/**
 * build-geo-gazetteer.js
 * Builds server/db/geo_gazetteer.sqlite (Node 24 built-in node:sqlite + FTS5)
 * from 100% free open datasets (Open Admin Data, GeoNames CC-BY 4.0, India Post/GeoNames PINs,
 * plus curated India districts/mandals/cities). Runs offline forever once built.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const axios = require('../server/node_modules/axios');

const DB_DIR = path.join(__dirname, '../server/db');
const CACHE_DIR = path.join(DB_DIR, '.geo_cache');
const OUT_DB = path.join(DB_DIR, 'geo_gazetteer.sqlite');
const TMP_DB = path.join(DB_DIR, 'geo_gazetteer.sqlite.tmp');
const SOVEREIGN = new Set(['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE', 'FR']);

const SOURCES = {
  openAdminStates: 'https://raw.githubusercontent.com/open-admin-data/india-administrative-divisions/master/data/all-state.json',
  openAdminDistricts: 'https://raw.githubusercontent.com/open-admin-data/india-administrative-divisions/master/data/all-district.json',
  admin1: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
  admin2: 'https://download.geonames.org/export/dump/admin2Codes.txt',
  cities500Zip: 'https://download.geonames.org/export/dump/cities500.zip',
  indiaDumpZip: 'https://download.geonames.org/export/dump/IN.zip',
  indiaZipCodes: 'https://download.geonames.org/export/zip/IN.zip'
};

function asciiNorm(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s.,()-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function downloadIfMissing(url, destName) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, destName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
    return dest;
  }
  console.log(`[Gazetteer] Downloading ${url} ...`);
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90_000,
    maxContentLength: 80 * 1024 * 1024,
    headers: { 'User-Agent': 'LeadHarvestGeoBuilder/13.0' }
  });
  fs.writeFileSync(dest, Buffer.from(res.data));
  return dest;
}

function unzipFile(zipPath, targetSubDir) {
  const outDir = path.join(CACHE_DIR, targetSubDir);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync('tar', ['-xf', zipPath, '-C', outDir], { stdio: 'ignore' });
    return outDir;
  } catch {
    execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${outDir}" -Force`], { stdio: 'ignore' });
    return outDir;
  }
}

async function streamLines(filePath, onLine) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });
  for await (const line of rl) {
    if (line) onLine(line);
  }
}

async function main() {
  const startedAt = Date.now();
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const [
    statesJsonPath,
    districtsJsonPath,
    admin1Path,
    admin2Path,
    citiesZipPath,
    inDumpZipPath,
    inZipCodePath
  ] = await Promise.all([
    downloadIfMissing(SOURCES.openAdminStates, 'open_states.json').catch(() => null),
    downloadIfMissing(SOURCES.openAdminDistricts, 'open_districts.json').catch(() => null),
    downloadIfMissing(SOURCES.admin1, 'admin1CodesASCII.txt'),
    downloadIfMissing(SOURCES.admin2, 'admin2Codes.txt'),
    downloadIfMissing(SOURCES.cities500Zip, 'cities500.zip'),
    downloadIfMissing(SOURCES.indiaDumpZip, 'IN_dump.zip'),
    downloadIfMissing(SOURCES.indiaZipCodes, 'IN_postal.zip')
  ]);

  const citiesDir = unzipFile(citiesZipPath, 'cities500');
  const inDumpDir = unzipFile(inDumpZipPath, 'in_dump');
  const inPostalDir = unzipFile(inZipCodePath, 'in_postal');

  const admin1Map = new Map();
  await streamLines(admin1Path, line => {
    const [code, name, ascii] = line.split('\t');
    if (code && name) admin1Map.set(code.trim(), asciiNorm(ascii || name));
  });

  const admin2Map = new Map();
  await streamLines(admin2Path, line => {
    const [code, name, ascii] = line.split('\t');
    if (code && name) admin2Map.set(code.trim(), asciiNorm(ascii || name));
  });

  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch {}
  const db = new DatabaseSync(TMP_DB);
  db.exec(`
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;
    PRAGMA temp_store = MEMORY;
    CREATE TABLE places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT NOT NULL,
      name TEXT NOT NULL,
      ascii_name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_subdistrict TEXT DEFAULT '',
      parent_district TEXT DEFAULT '',
      parent_state TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      population INTEGER DEFAULT 0
    );
  `);

  const insertStmt = db.prepare(`
    INSERT INTO places (country, name, ascii_name, type, parent_subdistrict, parent_district, parent_state, pincode, lat, lng, population)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dedupeSet = new Set();
  let inserted = 0;
  let batch = [];

  const flushBatch = () => {
    if (!batch.length) return;
    db.exec('BEGIN');
    for (const r of batch) {
      insertStmt.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]);
    }
    db.exec('COMMIT');
    inserted += batch.length;
    batch = [];
  };

  const addPlace = (country, name, type, sub = '', dist = '', state = '', pin = '', lat = null, lng = null, pop = 0) => {
    const cleanName = String(name || '').trim();
    const asc = asciiNorm(cleanName);
    if (!cleanName || asc.length < 2) return;
    const cc = String(country || 'IN').toUpperCase().slice(0, 2);
    const nLat = Number.isFinite(Number(lat)) ? Number(Number(lat).toFixed(5)) : null;
    const nLng = Number.isFinite(Number(lng)) ? Number(Number(lng).toFixed(5)) : null;
    const dClean = asciiNorm(dist).replace(/\b(district|dist)\b/gi, '').trim();
    const sClean = asciiNorm(state);
    const subClean = asciiNorm(sub).replace(/\b(mandal|tehsil|taluk|taluka|block)\b/gi, '').trim();
    const key = `${cc}|${type}|${asc.toLowerCase()}|${subClean.toLowerCase()}|${dClean.toLowerCase()}|${sClean.toLowerCase()}|${pin || ''}`;
    if (dedupeSet.has(key)) return;
    dedupeSet.add(key);
    batch.push([cc, cleanName, asc, type, subClean, dClean, sClean, String(pin || '').trim(), nLat, nLng, Math.round(Number(pop) || 0)]);
    if (batch.length >= 12000) flushBatch();
  };

  // 1. Open Admin Data India States + Districts
  if (statesJsonPath && fs.existsSync(statesJsonPath)) {
    const states = JSON.parse(fs.readFileSync(statesJsonPath, 'utf8'));
    for (const st of (Array.isArray(states) ? states : Object.values(states))) {
      const sName = st?.name?.en || st?.name?.local;
      if (sName) addPlace('IN', sName, 'state', '', '', sName, '', st?.geo?.lat, st?.geo?.lon, 1000000);
    }
  }
  if (districtsJsonPath && fs.existsSync(districtsJsonPath)) {
    const dists = JSON.parse(fs.readFileSync(districtsJsonPath, 'utf8'));
    for (const d of (Array.isArray(dists) ? dists : Object.values(dists))) {
      const dName = d?.name?.en || d?.name?.local;
      const sName = d?.parent?.name?.en || '';
      if (dName) addPlace('IN', dName, 'district', '', dName, sName, '', d?.geo?.lat, d?.geo?.lon, 300000);
    }
  }

  // 2. Existing india_villages.json + curated coordinates
  const ivPath = path.join(DB_DIR, 'india_villages.json');
  if (fs.existsSync(ivPath)) {
    const iv = JSON.parse(fs.readFileSync(ivPath, 'utf8'));
    for (const s of (Array.isArray(iv) ? iv : [])) {
      addPlace('IN', s.state, 'state', '', '', s.state, '', null, null, 1000000);
      for (const d of (s.districts || [])) {
        addPlace('IN', d.district, 'district', '', d.district, s.state, '', null, null, 300000);
        for (const m of (d.subDistricts || [])) {
          addPlace('IN', m.subDistrict, 'mandal', m.subDistrict, d.district, s.state, '', null, null, 50000);
          for (const v of (m.villages || [])) {
            addPlace('IN', v, 'village', m.subDistrict, d.district, s.state, '', null, null, 2000);
          }
        }
      }
    }
  }

  // 3. Post-2022 Andhra Pradesh Districts & Mandals overrides
  const { KNOWN_COORDS } = (() => {
    try {
      const { ZONE_COORDINATES } = require('../server/src/utils/geo/coordinates');
      return { KNOWN_COORDS: ZONE_COORDINATES };
    } catch {
      return { KNOWN_COORDS: {} };
    }
  })();

  // 4. GeoNames admin1 & admin2 entries across all 12 countries
  for (const [code, name] of admin1Map.entries()) {
    const [cc] = code.split('.');
    if (SOVEREIGN.has(cc)) addPlace(cc, name, 'state', '', '', name, '', null, null, 500000);
  }
  for (const [code, name] of admin2Map.entries()) {
    const parts = code.split('.');
    const cc = parts[0];
    if (!SOVEREIGN.has(cc)) continue;
    const stateName = admin1Map.get(`${cc}.${parts[1]}`) || '';
    addPlace(cc, name, 'district', '', name, stateName, '', null, null, 150000);
  }

  // 5. GeoNames India Full Dump (ADM1, ADM2, ADM3 Mandals/Tehsils, PPL* Villages/Towns/Cities)
  const inTxt = path.join(inDumpDir, 'IN.txt');
  if (fs.existsSync(inTxt)) {
    await streamLines(inTxt, line => {
      const cols = line.split('\t');
      if (cols.length < 15) return;
      const name = cols[1];
      const asc = cols[2] || name;
      const lat = Number(cols[4]);
      const lng = Number(cols[5]);
      const fClass = cols[6];
      const fCode = cols[7];
      const cc = cols[8];
      const a1 = cols[10];
      const a2 = cols[11];
      const a3 = cols[12];
      const pop = Number(cols[14]) || 0;
      if (cc !== 'IN') return;

      const stateName = admin1Map.get(`IN.${a1}`) || '';
      const distName = admin2Map.get(`IN.${a1}.${a2}`) || '';
      const knownHit = KNOWN_COORDS[asc.toLowerCase()];
      const useLat = Number.isFinite(lat) ? lat : knownHit?.lat;
      const useLng = Number.isFinite(lng) ? lng : knownHit?.lng;

      if (fClass === 'A' && fCode === 'ADM1') {
        addPlace('IN', asc, 'state', '', '', asc, '', useLat, useLng, Math.max(pop, 1000000));
      } else if (fClass === 'A' && fCode === 'ADM2') {
        addPlace('IN', asc, 'district', '', asc, stateName, '', useLat, useLng, Math.max(pop, 300000));
      } else if (fClass === 'A' && (fCode === 'ADM3' || fCode === 'ADM4')) {
        addPlace('IN', asc, 'mandal', asc, distName, stateName, '', useLat, useLng, Math.max(pop, 40000));
      } else if (fClass === 'P') {
        let pType = 'village';
        if (pop >= 100000 || ['PPLA', 'PPLC', 'PPLA2'].includes(fCode)) pType = 'city';
        else if (pop >= 15000 || fCode === 'PPLA3') pType = 'town';
        else if (fCode === 'PPLX') pType = 'locality';
        addPlace('IN', asc, pType, a3 || '', distName, stateName, '', useLat, useLng, pop);
      }
    });
  }

  // 6. GeoNames Global cities500 for all 12 countries
  const citiesTxt = path.join(citiesDir, 'cities500.txt');
  if (fs.existsSync(citiesTxt)) {
    await streamLines(citiesTxt, line => {
      const cols = line.split('\t');
      if (cols.length < 15) return;
      const cc = cols[8];
      if (!SOVEREIGN.has(cc)) return;
      const name = cols[1];
      const asc = cols[2] || name;
      const lat = Number(cols[4]);
      const lng = Number(cols[5]);
      const fCode = cols[7];
      const a1 = cols[10];
      const a2 = cols[11];
      const pop = Number(cols[14]) || 0;
      const stateName = admin1Map.get(`${cc}.${a1}`) || '';
      const distName = admin2Map.get(`${cc}.${a1}.${a2}`) || '';
      const pType = fCode === 'PPLX' ? 'suburb' : (pop >= 50000 ? 'city' : 'town');
      addPlace(cc, asc, pType, '', distName, stateName, '', lat, lng, pop);
    });
  }

  // 7. GeoNames India Pincodes (~155k post offices -> unique pincodes + taluk/mandal & village enrichment)
  const inPinTxt = path.join(inPostalDir, 'IN.txt');
  const seenPins = new Set();
  if (fs.existsSync(inPinTxt)) {
    await streamLines(inPinTxt, line => {
      const cols = line.split('\t');
      if (cols.length < 11) return;
      const cc = cols[0];
      const pin = String(cols[1] || '').trim();
      const place = String(cols[2] || '').trim();
      const stateName = String(cols[3] || '').trim();
      const distName = String(cols[5] || '').trim();
      const subName = String(cols[7] || '').trim();
      const lat = Number(cols[9]);
      const lng = Number(cols[10]);
      if (cc !== 'IN' || !pin) return;

      if (subName) addPlace('IN', subName, 'mandal', subName, distName, stateName, '', lat, lng, 25000);
      if (place && place.length >= 3) addPlace('IN', place, 'locality', subName, distName, stateName, pin, lat, lng, 5000);
      if (!seenPins.has(pin)) {
        seenPins.add(pin);
        addPlace('IN', `${pin} ${place || distName}`, 'pincode', subName, distName, stateName, pin, lat, lng, 10000);
      }
    });
  }

  flushBatch();
  console.log(`[Gazetteer] Inserted ${inserted.toLocaleString()} deduplicated geo rows. Building indexes + FTS5...`);

  db.exec(`
    CREATE INDEX idx_places_country_type ON places(country, type);
    CREATE INDEX idx_places_lat_lng ON places(country, lat, lng);
    CREATE INDEX idx_places_dist ON places(country, lower(parent_district));
    CREATE INDEX idx_places_sub ON places(country, lower(parent_subdistrict));
    CREATE INDEX idx_places_pin ON places(country, pincode);
    CREATE VIRTUAL TABLE places_fts USING fts5(
      name, ascii_name, parent_subdistrict, parent_district, parent_state, pincode,
      content='places', content_rowid='id', tokenize='unicode61 remove_diacritics 1'
    );
    INSERT INTO places_fts(places_fts) VALUES('rebuild');
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
  `);

  const stats = {
    totalRows: db.prepare('SELECT COUNT(*) AS c FROM places').get().c,
    indiaStates: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country='IN' AND type='state'").get().c,
    indiaDistricts: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country='IN' AND type='district'").get().c,
    indiaMandals: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country='IN' AND type IN ('mandal','subdistrict')").get().c,
    indiaPincodes: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country='IN' AND type='pincode'").get().c,
    indiaVillages: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country='IN' AND type IN ('village','locality','town','city')").get().c,
    globalRows: db.prepare("SELECT COUNT(*) AS c FROM places WHERE country!='IN'").get().c
  };
  db.close();

  try { if (fs.existsSync(OUT_DB)) fs.unlinkSync(OUT_DB); } catch {}
  fs.renameSync(TMP_DB, OUT_DB);

  console.log(`[Gazetteer] BUILT SUCCESSFULLY in ${((Date.now() - startedAt) / 1000).toFixed(1)}s:`, stats);
}

main().catch(err => {
  console.error('[Gazetteer Build Error]', err);
  process.exit(1);
});
