const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/?q=wedding+photographers+in+guntur+instagram', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const $ = cheerio.load(res.data);
    console.log($('body').text().substring(0, 500));
  } catch(e) { console.error(e.message); }
}
test();
