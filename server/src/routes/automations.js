const express = require('express');
const router = express.Router();
const { addScrapeJob } = require('../utils/queue');
const { getSettings } = require('../config/settingsManager');

// Helper to log safely if needed
function addLog(msg) {
  console.log(`[Automations] ${msg}`);
}

// 1. Bulk CSV Endpoint
router.post('/bulk-csv', async (req, res) => {
  const { items } = req.body; // Array of { category, city }
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Valid items array required' });
  }

  addLog(`Received Bulk CSV queue request for ${items.length} items`);
  let queued = 0;

  for (const item of items) {
    if (!item.category || !item.city) continue;
    // Queue Google Maps Search for each row
    const searchString = `${item.category} in ${item.city}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    
    // Add job to the persistent queue. 'manual-bulk' prevents it from getting mixed up
    await addScrapeJob('scrapeGooglePlaces', [searchUrl, item.category, item.city, 'manual-bulk', null, null, 10, 'mandal']);
    queued++;
  }

  res.json({ success: true, queued, message: `Successfully queued ${queued} jobs from CSV.` });
});

// 2. Extract URLs (Deep Contact Scraper)
router.post('/extract-urls', async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'Valid urls array required' });
  }

  addLog(`Received Extract URLs request for ${urls.length} URLs`);
  let queued = 0;

  for (const url of urls) {
    if (!url) continue;
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) continue;

    // Use the deep crawlee crawler to find emails/phones on this website
    await addScrapeJob('scrapeCrawleeDeep', [cleanUrl, `URL Extract: ${cleanUrl}`, 'Direct URL', 'Unknown']);
    queued++;
  }

  res.json({ success: true, queued, message: `Successfully queued deep crawl for ${queued} URLs.` });
});

// 3. Social Media Finder (Dork Search)
router.post('/find-social', async (req, res) => {
  const { names } = req.body;
  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ error: 'Valid names array required' });
  }

  addLog(`Received Find Social request for ${names.length} businesses`);
  let queued = 0;

  for (const name of names) {
    if (!name) continue;
    
    // Queue DuckDuckGo Dork search for Instagram profiles
    await addScrapeJob('scrapeDuckDuckGoDork', ['instagram.com', name, 'Social Search', 'Unknown']);
    queued++;
  }

  res.json({ success: true, queued, message: `Successfully queued social dork search for ${queued} businesses.` });
});

module.exports = router;
