const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function lookup(label, city) {
  const params = new URLSearchParams({
    source: '77', wap: '77', version: '2.9', user: '1', search: label, city,
    deviceId: '59e8afb06077a1793194377810Fgs4xk4vux6lnhiElsq4Bu33nFnp4E4wrACo',
    dtcity: '', area: '', dlat: '', dlon: '', freetext: '1', voice: '', act: '',
    case: 'auto_search', dtarea: '', format: '1', vs: '1601'
  });
  const response = await axios.get(`https://www.justdial.com/webmain/ftxt.php?${params}`, {
    timeout: 15000, httpsAgent: agent, responseType: 'text',
    headers: { 'User-Agent': UA, 'Referer': 'https://www.justdial.com/', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json,text/javascript,*/*;q=0.01' }
  });
  const payload = JSON.parse(String(response.data).replace(/^\uFEFF/, '').trim());
  const categories = (payload.results || []).filter(item => item && item.type === 1 && (item.id || item.ncatid));
  const chosen = categories.find(item => String(item.value || item.disp || '').toLowerCase().includes(label.toLowerCase().split(' ')[0])) || categories[0];
  return chosen ? { id: Number(chosen.id || chosen.ncatid), label: chosen.value || chosen.disp || label } : null;
}

async function fetchListing(id, label, city, state) {
  const body = new URLSearchParams({
    action: 'result', ncatid: String(id), ccode: 'in', scode: state, areaname: '',
    searchcity: city, geolong: '', geolat: '', prop: '', attributeValue: '',
    Vprice: '', search_option: ''
  });
  const response = await axios.post('https://m.justdial.com/verticals/hotel/searchziva?&srating=&lat=&gbotrate=0&lng=&returnurl=1&source=2&native=&version=&hide_header=&areaname=&ccode=&scode=&frst_text=&last_text=&nh=&search_option=&travel=', body.toString(), {
    timeout: 20000, httpsAgent: agent, responseType: 'text',
    headers: {
      'User-Agent': UA, 'Accept': '*/*',
      'Referer': `https://m.justdial.com/${city}/${label.replace(/\s+/g, '-')}/nct-${id}?source=2&searchcity=${city}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  });
  return JSON.parse(response.data).getResultData;
}

(async () => {
  const cases = [
    ['Electrical Installation Services', 'Guntur'],
    ['AC Repair & Services', 'Guntur'],
    ['Plumbers', 'Vijayawada']
  ];
  for (const [label, city] of cases) {
    const category = await lookup(label, city);
    console.log('CATEGORY', label, category);
    if (!category) continue;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const data = await fetchListing(category.id, category.label, city, 'Andhra Pradesh');
      const rows = (data?.results?.data || []).filter(row => Array.isArray(row) && row[1]);
      const weird = rows.filter(row => /^(results?|sponsored|advertisement|justdial)$/i.test(String(row[1]).trim()));
      console.log(`try ${attempt}: rows ${rows.length} weird ${weird.length}`);
      for (const row of weird.slice(0, 1)) {
        console.log('---- ROW ----');
        console.log(JSON.stringify(row.map((v, i) => [i, typeof v === 'object' ? v : String(v).slice(0, 200)]), null, 1).slice(0, 9000));
      }
      if (weird.length) break;
    }
  }
})();
