const axios = require('axios');
const cheerio = require('cheerio');

async function testDdgHtml() {
    try {
        console.log('Searching DDG HTML...');
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:instagram.com photographers in guntur')}`;
        
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        const $ = cheerio.load(res.data);
        const results = [];
        $('.result').each((i, el) => {
            const title = $(el).find('.result__title a').text().trim();
            const link = $(el).find('.result__url').attr('href');
            let realUrl = link;
            if (link && link.startsWith('//duckduckgo.com/l/?')) {
                const urlParams = new URLSearchParams(link.split('?')[1]);
                realUrl = decodeURIComponent(urlParams.get('uddg'));
            }
            const snippet = $(el).find('.result__snippet').text().trim();
            if (title && realUrl) {
                results.push({ title, url: realUrl, snippet });
            }
        });

        console.log(`Found ${results.length} results.`);
        console.log(`Response length: ${res.data.length}`);
        console.log(`Preview: ${res.data.substring(0, 500)}`);
        results.forEach(r => console.log(r));

    } catch (e) {
        console.error('Error:', e.message);
    }
}
testDdgHtml();
