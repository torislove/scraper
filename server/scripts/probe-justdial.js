/**
 * probe-justdial.js — the one JustDial probe that decides KEEP or RETIRE.
 *
 * It tests the two upstream calls separately and prints the evidence the plan
 * requires: HTTP status, content-type, and the first bytes of the body.
 *
 *   1. Autosuggest  GET  https://www.justdial.com/webmain/ftxt.php
 *      -> resolves a category label to a JustDial `ncatid`
 *   2. Results      POST https://m.justdial.com/verticals/hotel/searchziva
 *      -> returns JSON with `getResultData.results`
 *
 * If (1) works but (2) does not, the probe tries the non-`hotel` mobile routes
 * and the mobile HTML search page, because the literal `hotel` in the path may
 * be silently scoping results.
 *
 * Usage:
 *   node server/scripts/probe-justdial.js
 *   node server/scripts/probe-justdial.js "Dentists" "Guntur"
 *
 * Exit code 0 if a live results payload was obtained, 1 otherwise.
 */

'use strict';

const axios = require('axios');

const SUGGEST_URL = 'https://www.justdial.com/webmain/ftxt.php';
const RESULT_ROUTES = [
  'https://m.justdial.com/verticals/hotel/searchziva?&srating=&lat=&gbotrate=0&lng=&returnurl=1&source=2&native=&version=&hide_header=&areaname=&ccode=&scode=&frst_text=&last_text=&nh=&search_option=&travel=',
  'https://m.justdial.com/searchziva?&returnurl=1&source=2&hide_header=&native=',
  'https://m.justdial.com/verticals/searchziva?&returnurl=1&source=2&hide_header=&native='
];

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const category = process.argv[2] || 'Photographers';
const city = process.argv[3] || 'Hyderabad';

function preview(text, n = 240) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, n);
}

async function probeAutosuggest() {
  const params = new URLSearchParams({
    action: 'getcategory',
    term: category,
    city,
    catid: '',
    iscity: '1',
    src: '1',
    scity: city
  });
  const url = `${SUGGEST_URL}?${params.toString()}`;
  console.log('\n[1] Autosuggest');
  console.log('    URL:', url);
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-IN,en;q=0.9',
        Referer: 'https://m.justdial.com/',
        'X-Requested-With': 'XMLHttpRequest'
      },
      validateStatus: () => true
    });
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log('    status:', res.status, '| type:', res.headers['content-type']);
    console.log('    body  :', preview(body));
    let parsed = null;
    try { parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data; } catch (e) { }
    const list = Array.isArray(parsed) ? parsed : (parsed?.results || parsed?.data || []);
    const hit = (Array.isArray(list) ? list : []).find(item => item && (item.id || item.ncatid));
    if (hit) {
      console.log('    => ncatid:', hit.id || hit.ncatid, '| label:', hit.name || hit.label || category);
      return Number(hit.id || hit.ncatid);
    }
    console.log('    => no ncatid resolved');
    return null;
  } catch (err) {
    console.log('    ERROR:', err.message);
    return null;
  }
}

async function probeResults(route, ncatid) {
  const body = new URLSearchParams({
    action: 'result',
    ncatid: String(ncatid),
    ccode: 'in',
    scode: '',
    areaname: '',
    searchcity: city,
    geolong: '',
    geolat: '',
    prop: '',
    attributeValue: '',
    Vprice: '',
    search_option: ''
  }).toString();

  console.log('\n[2] Results POST');
  console.log('    URL:', route);
  try {
    const res = await axios.post(route, body, {
      timeout: 15000,
      responseType: 'text',
      validateStatus: () => true,
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Accept-Language': 'en-IN,en;q=0.9',
        Referer: `https://m.justdial.com/${city}/${category}/nct-${ncatid}?source=2&searchcity=${encodeURIComponent(city)}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });
    const text = String(res.data || '');
    console.log('    status:', res.status, '| type:', res.headers['content-type'], '| bytes:', text.length);
    console.log('    body  :', preview(text));
    if (text.trim().startsWith('{')) {
      try {
        const payload = JSON.parse(text);
        const rows = payload?.getResultData?.results;
        if (Array.isArray(rows)) {
          console.log('    => getResultData.results:', rows.length, 'rows');
          if (rows[0]) console.log('    => first row keys:', Object.keys(rows[0]).slice(0, 12).join(','));
          return true;
        }
        console.log('    => JSON but no getResultData.results');
      } catch (e) {
        console.log('    => JSON parse failed:', e.message);
      }
    }
    return false;
  } catch (err) {
    console.log('    ERROR:', err.message);
    return false;
  }
}

(async () => {
  console.log('='.repeat(64));
  console.log(` JustDial probe — "${category}" in "${city}"`);
  console.log('='.repeat(64));

  const ncatid = await probeAutosuggest();
  if (!ncatid) {
    console.log('\nVERDICT: FAIL — autosuggest did not resolve an ncatid.');
    process.exit(1);
  }

  for (const route of RESULT_ROUTES) {
    const ok = await probeResults(route, ncatid);
    if (ok) {
      console.log('\nVERDICT: PASS — results payload received from', route.split('?')[0]);
      console.log('Action: set RESULTS_URL to this route in engine-justdial.js if it differs.');
      process.exit(0);
    }
  }

  console.log('\nVERDICT: FAIL — no results route returned getResultData.');
  console.log('Action: retire JustDial and record this output in docs/blocked-sources.md.');
  process.exit(1);
})();
