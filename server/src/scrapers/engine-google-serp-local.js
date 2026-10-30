const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const fidelity = require('../services/categoryFidelity');
const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('./browserFactory');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const { normalizePhone } = require('../utils/phoneUtils');

// Global dependencies passed from scrape router
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitVendorEvent = () => {};

function setDeps({ logger, abortSignal, emitVendorEvent: evt }) {
  if (logger) addLog = logger;
  if (abortSignal) globalAbortSignal = abortSignal;
  if (evt) emitVendorEvent = evt;
}

const { isListingRelevantToQuery, calculateLeadScore, determineTier } = require('./engine-google-places');

/**
 * Ultra-Fast Google Search Local Finder Scraper Engine
 * Targets: https://www.google.com/search?q={query}&tbm=lcl&start={N}&hl=en&gl=in
 * Extracts 20 leads per page batch directly from pre-rendered HTML without WebGL or single-card clicks!
 */
async function scrapeGoogleLocalFinder(
  query,
  category,
  location,
  sessionId = 'legacy',
  maxPages = 10,
  district = null,
  stateName = null,
  centerCoords = null,
  cityHint = null
) {
  addLog(`[Local Finder Core] ⚡ Launching ultra-fast surface harvest for: "${query}" (Target: up to ${maxPages * 20} leads)`);

  // `location` may be a synthetic zone label. Keep the real base city separately
  // for the vendor record and for Maps fallbacks.
  const vendorCity = cityHint || location || 'India';

  if (!chromium) {
    addLog('[Local Finder Core] Playwright Chromium not available on this server.');
    return [];
  }

  const browser = await getBrowser();
  if (!browser) {
    addLog('[Local Finder Core] Browser instance unavailable.');
    return [];
  }

  let context = null;
  let page = null;
  const scrapedResults = [];

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });

    page = await context.newPage();
    await applyAdvancedStealth(page);

    // Ultra-Fast page optimization: abort images, fonts, styles, tracking to drop load time to <400ms
    await optimizePageForSpeed(page);

    let consecutiveEmptyPages = 0;

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
      if (globalAbortSignal.aborted) {
        addLog(`[Local Finder Core] Abort signal received. Stopping page iteration.`);
        break;
      }

      const startIndex = pageIndex * 20;
      // Google Local Finder URL protocol with English & Indian region locks
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&start=${startIndex}&hl=en&gl=in`;

      addLog(`[Local Finder Core] Fetching Page ${pageIndex + 1}/${maxPages} (start=${startIndex})...`);

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (err) {
        addLog(`[Local Finder Core] Page navigation timed out, extracting partial DOM: ${err.message}`);
      }

      // Check for Google Search CAPTCHA / Rate-Limit challenge
      if (page.url().includes('/sorry') || page.url().includes('google.com/sorry')) {
        addLog(`[Local Finder Core] 🛡️ Google Search CAPTCHA detected. Gracefully pivoting to Google Maps Stealth Engine for "${query}"...`);
        try { await page.close().catch(() => {}); } catch (e) {}
        try { await context.close().catch(() => {}); } catch (e) {}
        const placesEngine = require('./engine-google-places');
        return await placesEngine.scrapeGooglePlaces(
          query,
          category,
          location,
          sessionId,
          centerCoords?.lat,
          centerCoords?.lng,
          null,
          'deep',
          district,
          stateName,
          null,
          cityHint
        );
      }

      // Bypass Google Consent modal if present
      try {
        const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree"), #L2AGLb, button:has-text("Reject all")');
        if (await consentBtn.count() > 0) {
          await consentBtn.first().click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(400);
        }
      } catch (e) {}

      // Wait briefly for local items container or fallback to body
      await page.waitForSelector('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"], div.rllt__details, #rso', { timeout: 3500 }).catch(() => {});

      // Batch evaluate all 20 leads in one single DOM execution pass
      const pageLeads = await page.evaluate(({ defaultCategory }) => {
        const items = [];
        // Google Local Finder cards selector candidates
        const cardElements = document.querySelectorAll('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"]');

        cardElements.forEach(card => {
          try {
            // Business Name
            const nameEl = card.querySelector('div.dbg0pd, div[role="heading"] span, .OSrXXb, span.LrzXr, h3');
            const name = nameEl ? nameEl.innerText.trim() : '';
            if (!name || name.length < 2) return;

            // Rating & Review Count
            let rating = null;
            let reviewsCount = null;
            const ratingEl = card.querySelector('span.yi40Hd, span.z3HNkc');
            if (ratingEl) {
              const rText = ratingEl.innerText.trim();
              const rMatch = rText.match(/^([0-9.]+)/);
              if (rMatch) rating = parseFloat(rMatch[1]);
            }

            const reviewsEl = card.querySelector('span.RDApEe');
            if (reviewsEl) {
              const revText = reviewsEl.innerText.trim();
              const revMatch = revText.match(/([0-9,]+)/);
              if (revMatch) reviewsCount = parseInt(revMatch[1].replace(/,/g, ''), 10);
            }

            // Category & Details snippet
            const detailsDivs = card.querySelectorAll('.rllt__details > div, .rllt__details span');
            let category = defaultCategory;
            let address = '';
            let operatingHours = '';
            let rawSnippetText = '';

            const detailsContainer = card.querySelector('.rllt__details');
            if (detailsContainer) {
              rawSnippetText = detailsContainer.innerText;
              const lines = detailsContainer.innerText.split('\n').map(l => l.trim()).filter(Boolean);
              if (lines.length > 0) {
                // First line often has: "₹200–400 · Cafe" or "4.2 (283) · Cafe"
                const line1 = lines[0];
                const parts = line1.split('·').map(p => p.trim());
                if (parts.length > 1) {
                  category = parts[parts.length - 1];
                }
              }
              if (lines.length > 1) {
                // Address is usually line 2 or 3
                address = lines[1];
              }
            }

            // Extract Phone Number directly from card
            let phone = '';
            // 1. Direct tel link
            const telLink = card.querySelector('a[href^="tel:"], a[data-phone-number]');
            if (telLink) {
              phone = telLink.getAttribute('data-phone-number') || telLink.getAttribute('href').replace('tel:', '');
            }
            // 2. Text regex fallback
            if (!phone && rawSnippetText) {
              const phoneMatch = rawSnippetText.match(/(?:\+91|0)?[ -]?[6-9]\d{4}[ -]?\d{5}|(?:\+91|0)?[ -]?\d{3,4}[ -]?\d{6,7}/);
              if (phoneMatch) {
                phone = phoneMatch[0].trim();
              }
            }

            // Extract Website URL
            let website = '';
            const webLink = card.querySelector('a.yY1duf[href^="http"], a[data-website]');
            if (webLink) {
              const href = webLink.getAttribute('href');
              if (href && !href.includes('google.com')) {
                website = href;
              }
            }

            // Extract Google CID / Coordinates from card links or attributes
            let mapsLink = '';
            let lat = null;
            let lng = null;

            const mapAnchor = card.querySelector('a[data-cid], a[href*="maps.google"], a[href*="/maps/"]');
            if (mapAnchor) {
              mapsLink = mapAnchor.getAttribute('href') || '';
              const cid = mapAnchor.getAttribute('data-cid');
              if (cid) mapsLink = `https://www.google.com/maps?cid=${cid}`;
            }

            // Parse GPS coordinates if encoded in URL or attributes
            const latAttr = card.getAttribute('data-lat');
            const lngAttr = card.getAttribute('data-lng');
            if (latAttr && lngAttr) {
              lat = parseFloat(latAttr);
              lng = parseFloat(lngAttr);
            }

            // Extract Storefront Thumbnail photo
            let photo = '';
            const imgEl = card.querySelector('img[id^="dimg_"], img');
            if (imgEl) {
              const src = imgEl.getAttribute('src');
              if (src && !src.includes('data:image/gif') && !src.includes('default_avatar')) {
                photo = src;
              }
            }

            items.push({
              name,
              category: category || defaultCategory,
              rating,
              reviewsCount,
              address: address || '',
              phone: phone || '',
              website: website || '',
              mapsLink: mapsLink || '',
              latitude: lat,
              longitude: lng,
              photo: photo || '',
              operatingHours
            });
          } catch (e) {
            // skip malformed card
          }
        });

        return items;
      }, { defaultCategory: category || 'Business' });

      addLog(`[Local Finder Core] Page ${pageIndex + 1}: Discovered ${pageLeads.length} leads in batch.`);

      if (pageLeads.length === 0) {
        if (pageIndex === 0) {
          addLog(`[Local Finder Core] 0 leads found on Google Search Page 1 for "${query}". Pivoting to Google Maps Stealth Engine...`);
          try { await page.close().catch(() => {}); } catch (e) {}
          try { await context.close().catch(() => {}); } catch (e) {}
          const placesEngine = require('./engine-google-places');
          return await placesEngine.scrapeGooglePlaces(
            query,
            category,
            location,
            sessionId,
            centerCoords?.lat,
            centerCoords?.lng,
            null,
            'deep',
            district,
            stateName,
            null,
            cityHint
          );
        }
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 2) {
          addLog(`[Local Finder Core] Reached end of Google Search Local Finder pagination.`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
      }

      // Read existing local database to prevent duplicates
      const vendors = dbAdapter.getVendors();
      let newLeadsInPage = 0;

      for (const lead of pageLeads) {
        // 0. Strict Geographic Zero-Bleed Containment Check
        const leadCoords = (lead.latitude && lead.longitude) ? { lat: lead.latitude, lng: lead.longitude } : null;
        const containment = isListingRelevantToQuery(lead.name, lead.address, district, stateName, location, location, leadCoords);
        if (!containment.relevant) {
          addLog(`[Local Finder Guard] Discarded "${lead.name}": ${containment.reason}`);
          const oobLead = {
            id: 'lead_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            name: lead.name,
            category: lead.category || category,
            city: vendorCity,
            address: lead.address || '',
            phone: lead.phone || '',
            rating: lead.rating || '',
            mapsLink: lead.mapsLink || '',
            latitude: lead.latitude || null,
            longitude: lead.longitude || null,
            source: 'Local Finder Guard (Out of Bounds)',
            outOfBoundsDistance: containment.reason,
            scrapedAt: new Date().toISOString(),
            sessionId
          };
          dbAdapter.saveOutOfBoundsVendor(oobLead);
          try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) {}
          continue;
        }

        const cleanName = lead.name.toLowerCase().trim();
        if (!fidelity.isVendorRelevant(lead, category)) {
          addLog(`[Category Guard] Discarded "${lead.name}": does not match "${category}".`);
          continue;
        }
        const parsedLeadPhone = lead.phone ? normalizePhone(lead.phone, { context: 'phone tel' }) : null;
        const leadPhone = parsedLeadPhone ? parsedLeadPhone.e164 : '';
        const cleanPhone = leadPhone ? leadPhone.replace(/\D/g, '') : '';

        // Duplicate Check: compare against already scraped in this run + local DB
        const isDuplicate = vendors.some(v => 
          (v.name && v.name.toLowerCase().trim() === cleanName) ||
          (cleanPhone && v.phone && v.phone.replace(/\D/g, '') === cleanPhone)
        ) || scrapedResults.some(s => s.name.toLowerCase().trim() === cleanName);

        if (!isDuplicate) {
          const leadScore = calculateLeadScore(lead);
          const vendorId = 'lead_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

          const formattedLead = {
            id: vendorId,
            name: lead.name,
            category: lead.category || category,
            city: vendorCity,
            mandal: district || location || '',
            district: district || location || '',
            state: stateName || 'India',
            address: lead.address || `${district || location}, India`,
            phone: leadPhone,
            rating: lead.rating || '',
            reviewsCount: lead.reviewsCount || '',
            website: lead.website || '',
            mapsLink: lead.mapsLink || `https://www.google.com/maps/search/${encodeURIComponent(lead.name + ' ' + (location || ''))}`,
            latitude: lead.latitude || centerCoords?.lat || null,
            longitude: lead.longitude || centerCoords?.lng || null,
            photo: lead.photo || '',
            logo: lead.website ? `https://www.google.com/s2/favicons?domain=${lead.website}&sz=128` : '',
            avatar: lead.photo || '',
            source: 'Google Search Local Finder (Ultra-Fast 2-Min Engine)',
            qualityScore: leadScore,
            tier: determineTier(leadScore),
            operatingHours: lead.operatingHours || '',
            whatsappLink: cleanPhone && cleanPhone.slice(-10).length === 10
              ? `https://wa.me/91${cleanPhone.slice(-10)}?text=Hi%20${encodeURIComponent(lead.name)}%2C%20I%20found%20your%20business%20and%20wanted%20to%20connect.`
              : '',
            whatsappAvailable: Boolean(cleanPhone && cleanPhone.slice(-10).length === 10),
            scrapedAt: new Date().toISOString(),
            sessionId
          };

          vendors.push(formattedLead);
          scrapedResults.push(formattedLead);
          newLeadsInPage++;

          // Emit live SSE event so radar map and vaults update instantaneously
          try {
            emitVendorEvent(formattedLead, 'inserted');
          } catch (e) {}

          // Automatically extract all emails, phones, and social links if website is available
          if (formattedLead.website && formattedLead.website.startsWith('http')) {
            fastWebsiteExtract(formattedLead.website, formattedLead.name)
              .then(webData => {
                if (webData.emails.length > 0 || webData.instagram || webData.facebook || webData.phones.length > 0 || webData.logo) {
                  const currentVendors = dbAdapter.getVendors();
                  const targetIndex = currentVendors.findIndex(v => v.id === formattedLead.id);
                  if (targetIndex !== -1) {
                    const target = currentVendors[targetIndex];
                    target.emails = webData.emails;
                    target.email = webData.emails[0] || target.email || '';
                    if (webData.instagram) target.instagram = webData.instagram;
                    if (webData.facebook) target.facebook = webData.facebook;
                    if (webData.logo) target.logo = webData.logo;
                    if ((!target.phone || target.phone.includes('Requires')) && webData.phones.length > 0) {
                      target.phone = webData.phones[0];
                    }
                    target.qualityScore = calculateLeadScore(target);
                    target.tier = determineTier(target.qualityScore);
                    currentVendors[targetIndex] = target;
                    dbAdapter.saveVendors(currentVendors);
                    try {
                      emitVendorEvent(target, 'updated');
                    } catch (e) {}
                  }
                }
              })
              .catch(() => {});
          }
        }
      }

      dbAdapter.saveVendors(vendors);
      addLog(`[Local Finder Core] Page ${pageIndex + 1}: +${newLeadsInPage} unique leads indexed (Cumulative: ${scrapedResults.length})`);

      // If page had fewer than 15 cards, Google has exhausted results for this zone
      if (pageLeads.length < 15) {
        addLog(`[Local Finder Core] Reached end of result stream for this zone.`);
        break;
      }

      // Micro-pause between pages for anti-bot stealth
      await page.waitForTimeout(300 + Math.random() * 250);
    }
  } catch (err) {
    addLog(`[Local Finder Core] Scraping exception: ${err.message}`);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }

  addLog(`[Local Finder Core] ✅ Finished harvest for "${query}". Total fresh leads: ${scrapedResults.length}`);
  return scrapedResults;
}

module.exports = {
  scrapeGoogleLocalFinder,
  setDeps
};
