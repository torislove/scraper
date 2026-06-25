const axios = require('axios');
const cheerio = require('cheerio');

async function testBingHtml() {
    try {
        console.log('Searching Bing HTML...');
        const url = `https://www.bing.com/search?q=${encodeURIComponent('site:instagram.com photographers in guntur')}`;
        
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const $ = cheerio.load(res.data);
        const results = [];
        $('.b_algo').each((i, el) => {
            const title = $(el).find('h2 a').text().trim();
            const link = $(el).find('h2 a').attr('href');
            const snippet = $(el).find('.b_caption p').text().trim();
            if (title && link) {
                results.push({ title, url: link, snippet });
            }
        });

        const fs = require('fs');
        fs.writeFileSync('debug_bing_page.html', res.data);
        console.log(`Found ${results.length} results.`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
testBingHtml();
