const { search } = require('duck-duck-scrape');

async function testDdg() {
    try {
        console.log('Searching DuckDuckGo...');
        const results = await search('site:instagram.com photographers in guntur');
        console.log('Total results:', results.results.length);
        results.results.forEach(res => {
            console.log(res.title);
            console.log(res.url);
            console.log(res.description);
            console.log('---');
        });
    } catch(e) {
        console.error('Error:', e);
    }
}
testDdg();
