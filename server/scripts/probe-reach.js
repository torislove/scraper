/* Is search.brave.com reachable from this machine at all? */
const axios = require('axios');

(async () => {
  for (const url of [
    'https://search.brave.com/',
    'https://www.bing.com/search?q=test',
    'https://www.google.com/search?q=test'
  ]) {
    const started = Date.now();
    try {
      const res = await axios.get(url, {
        timeout: 20000,
        proxy: false,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        validateStatus: () => true
      });
      console.log(`[probe] ${url} -> ${res.status} ${Date.now() - started}ms bytes=${String(res.data).length}`);
    } catch (err) {
      console.log(`[probe] ${url} -> ERROR ${err.code || err.message} ${Date.now() - started}ms`);
    }
  }
  process.exit(0);
})();
