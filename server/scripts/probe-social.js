/* QA probe for the social + brave dork engines.
 * Usage: node scripts/probe-social.js
 */
const { scrapeDuckDuckGoDork } = require('../src/scrapers/engine-social-dork');

(async () => {
  const started = Date.now();
  try {
    const result = await scrapeDuckDuckGoDork(
      'instagram.com',
      'banquet hall Guntur',
      'Banquet Halls',
      'Guntur, Andhra Pradesh',
      { aborted: false },
      'probe_social'
    );
    console.log('[probe-social] result:', Array.isArray(result) ? result.length : typeof result);
  } catch (err) {
    console.log('[probe-social] error:', err.message);
  }
  console.log('[probe-social] elapsed', ((Date.now() - started) / 1000).toFixed(1) + 's');
  process.exit(0);
})();
