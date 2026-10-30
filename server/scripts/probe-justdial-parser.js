const axios = require('axios');
const https = require('https');
const { extractPhones, pickBestPhone } = require('../src/utils/phoneUtils');

const agent = new https.Agent({ rejectUnauthorized: false });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function lookupCategoryId(category, city) {
  const params = new URLSearchParams({
    source: '77', wap: '77', version: '2.9', user: '1', search: category, city,
    deviceId: '59e8afb06077a1793194377810Fgs4xk4vux6lnhiElsq4Bu33nFnp4E4wrACo',
    dtcity: '', area: '', dlat: '', dlon: '', freetext: '1', voice: '', act: '',
    case: 'auto_search', dtarea: '', format: '1', vs: '1601'
  });
  const res = await axios.get(`https://www.justdial.com/webmain/ftxt.php?${params}`, {
    timeout: 20000, httpsAgent: agent, responseType: 'text',
    headers: {
      'User-Agent': UA, 'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-IN,en;q=0.9', 'Referer': 'https://www.justdial.com/',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  const text = String(res.data).replace(/^\uFEFF/, '').trim();
  const json = JSON.parse(text);
  const results = Array.isArray(json.results) ? json.results : [];
  const pick = results.find(r => r.type === 1 && (r.id || r.ncatid)) || results[0];
  return pick ? { id: Number(pick.id || pick.ncatid), label: pick.value || pick.disp || category, total: pick.outlet_count } : null;
}

async function fetchListing(ncatid, category, city, state) {
  const params = new URLSearchParams({
    action: 'result', ncatid: String(ncatid), ccode: 'in', scode: state || '',
    areaname: '', searchcity: city, geolong: '', geolat: '', prop: '',
    attributeValue: '', Vprice: '', search_option: ''
  });
  const url = 'https://m.justdial.com/verticals/hotel/searchziva?&srating=&lat=&gbotrate=0&lng=&returnurl=1&source=2&native=&version=&hide_header=&areaname=&ccode=&scode=&frst_text=&last_text=&nh=&search_option=&travel=';
  const res = await axios.post(url, params.toString(), {
    timeout: 25000, httpsAgent: agent, responseType: 'text',
    headers: {
      'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-IN,en;q=0.9',
      'Referer': `https://m.justdial.com/${city}/${category}/nct-${ncatid}?source=2&searchcity=${city}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  });
  const json = JSON.parse(res.data);
  return json.getResultData || null;
}

function phoneStrings(row) {
  const out = [];
  const push = value => { if (typeof value === 'string' && value.trim()) out.push(value); };
  push(row[15]);
  if (row[23] && typeof row[23] === 'object') { push(row[23].l); push(row[23].m); }
  if (row[51] && typeof row[51] === 'object') {
    push(row[51].contactdisplay); push(row[51].contactdial); push(row[51].contactpopup);
  }
  for (const bucket of [row[26], row[29]]) {
    if (!bucket || typeof bucket !== 'object') continue;
    const lists = bucket.other?.actionurl || bucket.actionurl || [];
    for (const item of Array.isArray(lists) ? lists : []) {
      push(item.button_url);
      if (Array.isArray(item.val)) item.val.forEach(push);
    }
  }
  return out;
}

function parseRow(row, ctx) {
  if (!Array.isArray(row) || !row[1]) return null;
  const name = String(row[1]).replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const candidates = phoneStrings(row);
  const byNumber = new Map();
  for (const candidate of candidates) {
    for (const phone of extractPhones(candidate, { context: 'contact call mobile tel' })) {
      if (phone && phone.e164) byNumber.set(phone.e164, phone);
    }
  }
  const phones = [...byNumber.values()].sort((a, b) => Number(b.isMobile) - Number(a.isMobile));
  const hours = row[11] && typeof row[11] === 'object' ? [row[11].status, row[11].timing].filter(Boolean).join(' · ') : '';
  return {
    name,
    docId: row[0],
    address: [row[3], row[12]].filter(Boolean).join(', '),
    area: row[12] || '',
    lat: Number(row[4]) || null,
    lng: Number(row[5]) || null,
    rating: Number(row[7]) || '',
    reviews: Number(row[16]) || '',
    category: row[14] || ctx.category,
    hours,
    phones,
    mobile: phones.filter(p => p.isMobile).map(p => p.e164),
    landline: phones.filter(p => !p.isMobile).map(p => p.e164),
    images: [...new Set([row[19], row[31], row[34], ...(Array.isArray(row[47]) ? row[47] : [])].filter(v => typeof v === 'string' && /^https?:\/\//.test(v)))].slice(0, 8),
    profile: (String(row[32] || '').match(/https:\/\/www\.justdial\.com\/[^\s]+/) || [])[0] || '',
    verified: JSON.stringify(row[22] || '').includes('JdVerified'),
    distance: row[50] || ''
  };
}

(async () => {
  const cases = [
    ['Plumbers', 'Vijayawada', 'Andhra Pradesh'],
    ['Plumbing Services', 'Vijayawada', 'Andhra Pradesh'],
    ['Plumber Contractors', 'Vijayawada', 'Andhra Pradesh'],
    ['Electricians', 'Guntur', 'Andhra Pradesh'],
    ['Banquet Halls', 'Hyderabad', 'Telangana'],
    ['Dental Clinics', 'Bangalore', 'Karnataka'],
    ['Car Showrooms', 'Guntur', 'Andhra Pradesh']
  ];
  for (const [category, city, state] of cases) {
    try {
      const cat = await lookupCategoryId(category, city);
      if (!cat) { console.log('\nNO CAT', category, city); continue; }
      const data = await fetchListing(cat.id, cat.label.replace(/\s+/g, '-'), city, state);
      const rows = (data?.results?.data || []).map(r => parseRow(r, { category })).filter(Boolean);
      const mobiles = rows.reduce((n, r) => n + r.mobile.length, 0);
      console.log(`\n${category} @ ${city} -> nct ${cat.id} total ${data?.totalNumberofResults} rows ${rows.length} mobiles ${mobiles}`);
      for (const r of rows.slice(0, 4)) {
        console.log(`  · ${r.name} | ${r.area} | ${r.mobile.join(', ') || r.landline.join(', ') || 'NO PHONE'} | ⭐ ${r.rating} (${r.reviews}) | ${r.lat},${r.lng}`);
      }
    } catch (e) {
      console.log('\nERR', category, city, e.message);
    }
  }
})();
