const axios = require('../server/node_modules/axios');
const cheerio = require('../server/node_modules/cheerio');
const { extractPhones, extractEmails, extractSocialContacts } = require('../server/src/utils/phoneUtils');

async function testInstagram(handleOrUrl) {
  let username = handleOrUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '').replace(/^@/, '').trim();
  console.log('Testing username:', username);

  // Method 1: facebookexternalhit user-agent (Bypasses Instagram client JS login wall)
  try {
    const res = await axios.get(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000,
      validateStatus: () => true
    });
    console.log('Method 1 (Bot UA) HTTP status:', res.status);
    const html = res.data;
    const $ = cheerio.load(html);
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    console.log('OG Title:', ogTitle);
    console.log('OG Description:', ogDesc);

    const contacts = extractSocialContacts(`${ogTitle} ${ogDesc}`, `https://www.instagram.com/${username}/`, 'IN');
    const phones = extractPhones(`${ogTitle} ${ogDesc}`, { defaultCountry: 'IN', trusted: false });
    console.log('Contacts from Meta:', contacts);
    console.log('Phones from Meta:', phones.map(p => p.displayPhone || p.national));
  } catch (err) {
    console.error('Method 1 error:', err.message);
  }

  // Method 2: Bing Search site:instagram.com/<username>
  try {
    const { searchBingHtml } = require('../server/src/scrapers/bingSearch');
    const { rows } = await searchBingHtml(`site:instagram.com/${username}`, { maxPages: 1 });
    console.log('\nMethod 2 (Search Engine Dork) rows found:', rows.length);
    for (const r of rows) {
      console.log('Snippet:', r.snippet);
      const phones = extractPhones(`${r.title} ${r.snippet}`, { defaultCountry: 'IN', trusted: false });
      console.log('Phones found in snippet:', phones.map(p => p.displayPhone || p.national));
    }
  } catch (err) {
    console.error('Method 2 error:', err.message);
  }
}

testInstagram('kodalistudio').catch(console.error);
