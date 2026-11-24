const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../../config/dbAdapter');
const fidelity = require('../../services/categoryFidelity');
const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('../core/browserFactory');
const { fastWebsiteExtract } = require('../../utils/fastWebsiteExtractor');
const { normalizePhone } = require('../../utils/phoneUtils');
const { fetchGoogleLocalHttp } = require('../../utils/fastGoogleHttp');
const serpBreaker = require('../../services/serpBreaker');

// Global dependencies passed from scrape router
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitVendorEvent = () => {};

function setDeps({ logger, abortSignal, emitVendorEvent: evt }) {
  if (logger) addLog = logger;
  if (abortSignal) globalAbortSignal = abortSignal;
  if (evt) emitVendorEvent = evt;
}

const { isListingRelevantToQuery, calculateLeadScore, determineTier } = require('../engine-google-places');

/**
 * Scrapes a single page of Google Local Finder in an isolated, ultra-fast tab.
 */
async function fetchSingleLocalPage(context, query, pageIndex, defaultCategory, countryCode = 'IN') {
  const startIndex = pageIndex * 20;
  const gl = String(countryCode || 'IN').toLowerCase();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&start=${startIndex}&hl=en&gl=${gl}`;

  let tab = null;
  try {
    tab = await context.newPage();
    await applyAdvancedStealth(tab);
    await optimizePageForSpeed(tab);

    try {
      await tab.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 14000 });
    } catch (e) {
      // Allow partial DOM evaluation on timeout
    }

    if (tab.url().includes('/sorry') || tab.url().includes('google.com/sorry')) {
      return { leads: [], captcha: true, pageIndex };
    }

    // Bypass consent if present
    try {
      const consentBtn = tab.locator('button:has-text("Accept all"), button:has-text("I agree"), #L2AGLb, button:has-text("Reject all")');
      if (await consentBtn.count() > 0) {
        await consentBtn.first().click({ timeout: 1500 }).catch(() => {});
      }
    } catch (e) {}

    await tab.waitForSelector('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"], div.rllt__details, #rso', { timeout: 3000 }).catch(() => {});

    const pageLeads = await tab.evaluate(({ categoryFallback, countryCode }) => {
      const items = [];
      // India uses its strict mobile/STD pattern. Other countries use a broad
      // candidate pattern here and are validated by libphonenumber in Node.
      const PHONE_RE = countryCode === 'IN'
        ? /(?:(?:\+91|0091)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b0[6-9]\d{4}[\s-]?\d{5}\b|\b0[1-9]\d{1,4}[\s-]?\d{5,8}\b/
        : /\+?\d[\d\s().-]{5,20}\d/;
      const cardElements = document.querySelectorAll('div.VkpGBb, div.rl_item, div[jscontroller="e6hkjf"]');

      cardElements.forEach(card => {
        try {
          const nameEl = card.querySelector('div.dbg0pd, div[role="heading"] span, .OSrXXb, span.LrzXr, h3');
          const name = nameEl ? nameEl.innerText.trim() : '';
          if (!name || name.length < 2) return;

          let rating = null;
          let reviewsCount = null;
          const ratingEl = card.querySelector('span.yi40Hd, span.z3HNkc');
          if (ratingEl) {
            const rMatch = ratingEl.innerText.trim().match(/^([0-9.]+)/);
            if (rMatch) rating = parseFloat(rMatch[1]);
          }

          const reviewsEl = card.querySelector('span.RDApEe');
          if (reviewsEl) {
            const revMatch = reviewsEl.innerText.trim().match(/([0-9,]+)/);
            if (revMatch) reviewsCount = parseInt(revMatch[1].replace(/,/g, ''), 10);
          }

          let category = categoryFallback;
          let address = '';
          let operatingHours = '';
          const detailsContainer = card.querySelector('.rllt__details');
          if (detailsContainer) {
            const lines = detailsContainer.innerText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length > 0) {
              const parts = lines[0].split('·').map(p => p.trim());
              if (parts.length > 1) category = parts[parts.length - 1];
            }
            if (lines.length > 1) address = lines[1];
          }

          let phone = '';
          const telLink = card.querySelector('a[href^="tel:"], a[data-phone-number], [data-item-id*="phone"]');
          if (telLink) {
            phone = telLink.getAttribute('data-phone-number') || telLink.getAttribute('href')?.replace('tel:', '') || '';
          }
          if (!phone) {
            const callEl = card.querySelector('[aria-label*="Call" i], button[aria-label*="Call" i]');
            if (callEl) {
              const label = callEl.getAttribute('aria-label') || '';
              const m = label.match(PHONE_RE);
              if (m) phone = m[0].trim();
            }
          }
          if (!phone) {
            const cardText = (card.innerText || '') + ' ' + (card.getAttribute('aria-label') || '');
            const phoneMatch = cardText.match(PHONE_RE);
            if (phoneMatch) phone = phoneMatch[0].trim();
          }

          let email = '';
          const mailto = card.querySelector('a[href^="mailto:"]');
          if (mailto) {
            email = (mailto.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
          }
          if (!email) {
            const cardText = card.innerText || '';
            const em = cardText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (em && !/google|sentry|wixpress|example/i.test(em[0])) {
              email = em[0].trim();
            }
          }

          let website = '';
          const webLink = card.querySelector('a.yY1duf[href^="http"], a[data-website]');
          if (webLink) {
            const href = webLink.getAttribute('href');
            if (href && !href.includes('google.com')) website = href;
          }

          let mapsLink = '';
          let lat = null;
          let lng = null;
          const mapAnchor = card.querySelector('a[data-cid], a[href*="maps.google"], a[href*="/maps/"]');
          if (mapAnchor) {
            mapsLink = mapAnchor.getAttribute('href') || '';
            const cid = mapAnchor.getAttribute('data-cid');
            if (cid) mapsLink = `https://www.google.com/maps?cid=${cid}`;
          }

          const latAttr = card.getAttribute('data-lat');
          const lngAttr = card.getAttribute('data-lng');
          if (latAttr && lngAttr) {
            lat = parseFloat(latAttr);
            lng = parseFloat(lngAttr);
          }

          // Build direct high-accuracy Google Maps pin link
          if (!mapsLink && name) {
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + (address || ''))}`;
          }

          let photo = '';
          const imgEl = card.querySelector('img[id^="dimg_"], img');
          if (imgEl) {
            const src = imgEl.getAttribute('src');
            if (src && !src.includes('data:image/gif') && !src.includes('default_avatar')) photo = src;
          }

          items.push({
            name,
            category,
            rating,
            reviewsCount,
            address: address || '',
            phone: phone || '',
            email: email || '',
            website: website || '',
            mapsLink: mapsLink || '',
            latitude: lat,
            longitude: lng,
            photo: photo || '',
            operatingHours
          });
        } catch (e) {}
      });

      // Google Knowledge Graph / Direct Place Panel (e.g. 'Terrace Grill', individual queries)
      try {
        const kgTitle = document.querySelector('[data-attrid="title"], h2[data-attrid="title"], div.SPZz6b h2, div.SPZz6b');
        if (kgTitle && kgTitle.innerText.trim().length > 1) {
          const kgName = kgTitle.innerText.trim();
          if (!items.some(it => it.name && it.name.toLowerCase() === kgName.toLowerCase())) {
            let kgPhone = '';
            const phoneContainer = document.querySelector('[data-attrid*="phone"], [data-item-id*="phone"], a[href^="tel:"]');
            if (phoneContainer) {
              const pText = phoneContainer.innerText || phoneContainer.getAttribute('aria-label') || phoneContainer.getAttribute('href') || '';
              const pm = pText.match(PHONE_RE);
              if (pm) kgPhone = pm[0].trim();
            }
            if (!kgPhone) {
              const fullKgText = document.querySelector('div.kp-wholepage, div.xpdopen, #rhs, #rso')?.innerText || '';
              const pm = fullKgText.match(/(?:Phone|Mobile|Tel)[:\s]*([0-9\s+-]+)/i) || fullKgText.match(/\b0[6-9]\d{4}[\s-]?\d{5}\b/);
              if (pm) kgPhone = (pm[1] || pm[0]).trim();
            }

            let kgAddress = '';
            const addrContainer = document.querySelector('[data-attrid*="address"], span.LrzXr');
            if (addrContainer) {
              kgAddress = addrContainer.innerText.trim().replace(/^Address[:\s]*/i, '');
            }

            let kgRating = null;
            let kgReviews = null;
            const ratingEl = document.querySelector('span.Aq14fc, [data-attrid*="review"] span[aria-label*="stars"]');
            if (ratingEl) {
              const rm = ratingEl.innerText.trim().match(/^([0-9.]+)/);
              if (rm) kgRating = parseFloat(rm[1]);
            }
            const revEl = document.querySelector('a[data-attrid*="review"] span, span[aria-label*="reviews"]');
            if (revEl) {
              const revm = revEl.innerText.trim().match(/([0-9,]+)/);
              if (revm) kgReviews = parseInt(revm[1].replace(/,/g, ''), 10);
            }

            let kgWebsite = '';
            const webEl = document.querySelector('a[data-attrid="visit_website"], a.ab_button[href^="http"]:not([href*="google.com"])');
            if (webEl) kgWebsite = webEl.getAttribute('href') || '';

            let kgEmail = '';
            const kgMailto = document.querySelector('a[href^="mailto:"]');
            if (kgMailto) {
              kgEmail = (kgMailto.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
            }
            if (!kgEmail) {
              const fullKgText = document.querySelector('div.kp-wholepage, div.xpdopen, #rhs, #rso')?.innerText || '';
              const em = fullKgText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
              if (em && !/google|sentry|wixpress|example/i.test(em[0])) {
                kgEmail = em[0].trim();
              }
            }

            let kgCategory = categoryFallback;
            const catEl = document.querySelector('span[data-attrid="subtitle"], div.wwUB2c');
            if (catEl) kgCategory = catEl.innerText.trim();

            const reservations = [];
            document.querySelectorAll('a[href*="swiggy.com"], a[href*="zomato.com"], a[href*="district.in"]').forEach(rLink => {
              reservations.push({
                provider: rLink.innerText.trim() || 'Reserve',
                url: rLink.href
              });
            });

            const serviceEl = document.querySelector('[data-attrid*="service_options"], [data-attrid*="dine_in"], div.E5qFLb');
            const serviceOptions = serviceEl ? serviceEl.innerText.trim().replace(/^Service options[:\s]*/i, '') : '';

            const directMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kgName + ', ' + (kgAddress || ''))}`;

            items.push({
              name: kgName,
              category: kgCategory,
              rating: kgRating,
              reviewsCount: kgReviews,
              address: kgAddress,
              phone: kgPhone,
              email: kgEmail,
              website: kgWebsite,
              mapsLink: directMapsLink,
              reservations,
              serviceOptions,
              operatingHours: '',
              isKnowledgeGraph: true
            });
          }
        }
      } catch (kgErr) {}

      return items;
    }, { categoryFallback: defaultCategory, countryCode });

    return { leads: pageLeads, captcha: false, pageIndex };
  } catch (err) {
    return { leads: [], captcha: false, pageIndex, error: err.message };
  } finally {
    if (tab) await tab.close().catch(() => {});
  }
}

/**
 * Ultra-Fast Google Search Local Finder Scraper Engine (Parallel Multi-Page Harvester)
 * Extracts multiple Google Local Finder pages in parallel batches, cutting pagination time to <8s!
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
  cityHint = null,
  mapsBackup = false,
  isMaster = false,
  scope = null,
  countryHint = null
) {
  addLog(`[Local Finder Core] ⚡ Launching ultra-fast parallel surface harvest for: "${query}" (Target: up to ${maxPages * 20} leads)`);

  const vendorCity = cityHint || location || 'India';
  // Country bias for Google results and phone parsing. Prioritize explicit countryHint,
  // then detectCountry from location tokens, fallback to 'IN'.
  const detected = require('../../services/localBrain/countries').detectCountry(location || cityHint || '');
  const countryCode = (countryHint && String(countryHint).trim())
    ? String(countryHint).toUpperCase()
    : (detected ? detected.code : 'IN');

  if (!chromium) {
    addLog('[Local Finder Core] Playwright Chromium not available on this server.');
    return [];
  }

  const fallbackToMaps = async reason => {
    addLog(`[Local Finder Core] ${reason} Sending "${query}" straight to the Google Maps engine.`);
    try {
      return await require('../engine-google-places').scrapeGooglePlaces(
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
        cityHint,
        isMaster,
        scope
      );
    } catch (error) {
      addLog(`[Local Finder Core] Maps fallback failed: ${error.message}`);
      return [];
    }
  };

  if (serpBreaker.isBlocked()) {
    if (mapsBackup) {
      addLog(`[Auto Router] ⚡ Search surface resting — zone "${location || query}" handled directly by Google Maps.`);
      return [];
    }
    return await fallbackToMaps('Local Finder is in a cooldown window.');
  }

  const browser = await getBrowser();
  if (!browser) {
    addLog('[Local Finder Core] Browser instance unavailable.');
    return [];
  }

  let context = null;
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

    const seenNames = new Set();
    const seenPhones = new Set();

    const processPageResult = (res) => {
      if (!res) return 0;
      const { leads: pageLeads, captcha, pageIndex } = res;

      if (captcha) {
        serpBreaker.recordCaptcha();
        addLog(`[Local Finder Core] 🛡️ Google Search CAPTCHA detected on Page ${pageIndex + 1}.`);
        return -1;
      }

      if (!pageLeads || pageLeads.length === 0) return 0;

      serpBreaker.recordSuccess();
      let newLeadsInPage = 0;

      for (const lead of pageLeads) {
        const leadCoords = (lead.latitude && lead.longitude) ? { lat: lead.latitude, lng: lead.longitude } : null;
        const containment = isListingRelevantToQuery(lead.name, lead.address, district, stateName, location, location, leadCoords, null, cityHint, isMaster, scope);
        if (!containment.relevant) continue;

        const cleanName = lead.name.toLowerCase().trim();
        if (!fidelity.isVendorRelevant(lead, category)) {
          try {
            const { archiveDivergentLead } = require('../../services/divergentLeadService');
            archiveDivergentLead(lead, category);
          } catch (e) {}
          continue;
        }

        const parsedLeadPhone = lead.phone ? normalizePhone(lead.phone, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true }) : null;
        const isLandline = Boolean(parsedLeadPhone && parsedLeadPhone.isLandline);
        const isMobile = Boolean(parsedLeadPhone && parsedLeadPhone.isMobile);
        const displayPhone = parsedLeadPhone ? parsedLeadPhone.displayPhone : (lead.phone || '');
        const cleanPhone = parsedLeadPhone ? parsedLeadPhone.digits : (lead.phone ? lead.phone.replace(/\D/g, '') : '');

        // O(1) Instant Deduplication against RAM index & current batch
        const isDuplicate = dbAdapter.isDuplicate(lead) ||
          seenNames.has(cleanName) ||
          (cleanPhone && seenPhones.has(cleanPhone));

        if (!isDuplicate) {
          seenNames.add(cleanName);
          if (cleanPhone) seenPhones.add(cleanPhone);
          const leadScore = calculateLeadScore(lead);
          const vendorId = 'lead_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

          // Extract locality/neighborhood from address (e.g. AS Rao Nagar, HITEC City, etc.)
          let leadLocality = lead.locality || '';
          if (!leadLocality && lead.address) {
            const segs = lead.address.split(',').map(s => s.trim()).filter(Boolean);
            const cleanSegs = segs.filter(s => !/^\d{6}$/.test(s) && !/^(Telangana|Andhra Pradesh|Karnataka|Maharashtra|Tamil Nadu|India)$/i.test(s));
            if (cleanSegs.length >= 2) {
              const cand = cleanSegs[cleanSegs.length - 2];
              if (cand && cand.length >= 3 && cand.length <= 45 && !/^(near|opp|behind|plot|door|flat|shop|floor|no\.)/i.test(cand)) {
                leadLocality = cand;
              }
            }
            if (!leadLocality && cleanSegs.length >= 1) {
              const cand = cleanSegs[cleanSegs.length - 1];
              if (cand.toLowerCase() !== vendorCity.toLowerCase()) {
                leadLocality = cand;
              }
            }
          }

          const formattedLead = {
            id: vendorId,
            name: lead.name,
            category: lead.category || category,
            city: vendorCity,
            locality: leadLocality,
            suburb: leadLocality,
            mandal: district || location || '',
            district: district || location || '',
            state: stateName || (countryCode === 'IN' ? 'India' : ''),
            address: lead.address || [district || location, countryCode === 'IN' ? 'India' : ''].filter(Boolean).join(', '),
            phone: displayPhone,
            phoneType: isMobile ? 'mobile' : (isLandline ? 'landline' : 'unknown'),
            isMobile,
            isLandline,
            callUrl: parsedLeadPhone ? parsedLeadPhone.callUrl : (displayPhone ? `tel:${displayPhone.replace(/\s+/g, '')}` : ''),
            email: lead.email || '',
            emails: lead.emails || (lead.email ? [lead.email] : []),
            rating: lead.rating || '',
            reviewsCount: lead.reviewsCount || '',
            website: lead.website || '',
            mapsLink: lead.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ', ' + (lead.address || location || ''))}`,
            latitude: lead.latitude || centerCoords?.lat || null,
            longitude: lead.longitude || centerCoords?.lng || null,
            photo: lead.photo || '',
            logo: lead.website ? `https://www.google.com/s2/favicons?domain=${lead.website}&sz=128` : '',
            avatar: lead.photo || '',
            source: 'Google Search Local Finder (Ultra-Fast Parallel Engine)',
            qualityScore: leadScore,
            tier: determineTier(leadScore),
            operatingHours: lead.operatingHours || '',
            reservations: lead.reservations || [],
            serviceOptions: lead.serviceOptions || '',
            whatsappLink: isMobile && parsedLeadPhone
              ? `https://wa.me/${parsedLeadPhone.digits}?text=Hi%20${encodeURIComponent(lead.name)}%2C%20I%20found%20your%20business%20and%20wanted%20to%20connect.`
              : '',
            whatsappAvailable: isMobile,
            zoneName: location || district || cityHint || '',
            scrapedAt: new Date().toISOString(),
            sessionId
          };

          dbAdapter.saveVendor('admin_1', formattedLead);
          scrapedResults.push(formattedLead);
          newLeadsInPage++;

          try { emitVendorEvent(formattedLead, 'inserted'); } catch (e) {}

          try {
            const { streamingEnricher } = require('../../services/phoneBackfillService');
            streamingEnricher.enqueue(formattedLead);
          } catch (e) {}

          // Immediate parallel website enrichment (<600ms multi-page crawler)
          if (formattedLead.website && formattedLead.website.startsWith('http')) {
            fastWebsiteExtract(formattedLead.website, formattedLead.name, { defaultCountry: countryCode, allowInternational: true })
              .then(webData => {
                if (webData.emails.length > 0 || webData.instagram || webData.facebook || webData.phones.length > 0 || webData.mobiles.length > 0 || webData.logo) {
                  formattedLead.emails = webData.emails;
                  formattedLead.email = webData.emails[0] || formattedLead.email || '';
                  if (webData.instagram) formattedLead.instagram = webData.instagram;
                  if (webData.facebook) formattedLead.facebook = webData.facebook;
                  if (webData.logo) formattedLead.logo = webData.logo;
                  if (webData.gstin && !formattedLead.gstin) formattedLead.gstin = webData.gstin;
                  if (webData.contactPerson && !formattedLead.contactPerson) formattedLead.contactPerson = webData.contactPerson;
                  if (webData.pincode && !formattedLead.pincode) formattedLead.pincode = webData.pincode;

                  const currentMobile = normalizePhone(formattedLead.phone, { context: 'phone mobile', defaultCountry: countryCode, allowInternational: true })?.isMobile;
                  const webMobile = webData.mobiles.length
                    ? normalizePhone(webData.mobiles[0], { context: 'phone mobile', defaultCountry: countryCode, allowInternational: true, trusted: true })
                    : null;
                  if (webMobile?.isMobile && !currentMobile) {
                    formattedLead.phone = webMobile.displayPhone || webMobile.e164;
                    formattedLead.whatsappLink = `https://wa.me/${webMobile.digits}`;
                    formattedLead.whatsappAvailable = true;
                  } else if (webData.whatsappLink && !formattedLead.whatsappLink) {
                    formattedLead.whatsappLink = webData.whatsappLink;
                    formattedLead.whatsappAvailable = true;
                  }

                  formattedLead.qualityScore = calculateLeadScore(formattedLead);
                  formattedLead.tier = determineTier(formattedLead.qualityScore);
                  dbAdapter.saveVendor(formattedLead.userId || 'admin_1', formattedLead);
                  try { emitVendorEvent(formattedLead, 'updated'); } catch (e) {}
                }
              })
              .catch(() => {});
          }
        }
      }

      addLog(`[Local Finder Core] ⚡ Page ${pageIndex + 1}: +${newLeadsInPage} unique leads indexed (Total: ${scrapedResults.length})`);
      return newLeadsInPage;
    };

    // Step 0: Tier-1 Direct Stealth HTTP harvest (~400ms, 0MB Playwright RAM)
    let p0Count = 0;
    try {
      const httpRes = await fetchGoogleLocalHttp(query, 0, category || 'Business');
      if (httpRes && Array.isArray(httpRes.leads) && httpRes.leads.length >= 6) {
        addLog(`[Local Finder Core] ⚡ Tier-1 direct HTTP pre-flight retrieved ${httpRes.leads.length} leads in <400ms!`);
        p0Count = processPageResult({ leads: httpRes.leads, captcha: false, pageIndex: 0 });
      }
    } catch (httpErr) {}

    // Step 1: If HTTP yielded < 6 leads, harvest Page 0 via stealth Playwright tab
    let page0Yield = p0Count;
    if (page0Yield < 6) {
      addLog(`[Local Finder Core] 🚀 Fetching Page 1 via stealth tab for full surface coverage...`);
      const page0Result = await fetchSingleLocalPage(context, query, 0, category || 'Business', countryCode);

      if (page0Result.captcha) {
        const tripped = serpBreaker.recordCaptcha();
        addLog(`[Auto Router] ⚡ Search surface resting — routed zone "${location || query}" directly to Google Maps engine.`);
        if (mapsBackup || tripped) return scrapedResults;
        return await fallbackToMaps('CAPTCHA pivot.');
      }

      if (!page0Result.leads || page0Result.leads.length === 0) {
        if (scrapedResults.length === 0) {
          if (mapsBackup) return scrapedResults;
          addLog(`[Local Finder Core] 0 leads on Page 1 for "${query}". Pivoting to Google Maps...`);
          return await fallbackToMaps('Empty Local Finder page.');
        }
      } else {
        page0Yield = processPageResult(page0Result);
      }
    }

    // Step 2: If Page 0 had valid yield, stream subsequent pages in parallel batches up to maxPages (up to 10 pages)
    const totalPagesToScrape = Math.min(10, Math.max(1, maxPages));
    if (page0Yield >= 2 && totalPagesToScrape > 1 && !globalAbortSignal.aborted) {
      const BATCH_SIZE = 2;
      for (let batchStart = 1; batchStart < totalPagesToScrape; batchStart += BATCH_SIZE) {
        if (globalAbortSignal.aborted || serpBreaker.isBlocked()) break;
        const currentBatch = [];
        for (let p = batchStart; p < Math.min(batchStart + BATCH_SIZE, totalPagesToScrape); p++) {
          currentBatch.push(p);
        }
        if (!currentBatch.length) break;

        addLog(`[Local Finder Core] ⚡ Streaming Pages ${currentBatch.map(p => p + 1).join(', ')} in parallel for deep yield...`);
        const batchPromises = currentBatch.map(pageIdx =>
          fetchSingleLocalPage(context, query, pageIdx, category || 'Business', countryCode)
            .then(res => {
              if (res && !res.captcha && res.leads && res.leads.length) {
                return processPageResult(res);
              }
              return 0;
            })
            .catch(() => 0)
        );

        const results = await Promise.allSettled(batchPromises);
        const batchYield = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? Number(r.value) || 0 : 0), 0);
        // If the entire batch yielded zero new listings, we have reached the end of Google's local-pack results
        if (batchYield === 0) {
          addLog(`[Local Finder Core] Reached end of local listings feed at page ${currentBatch[currentBatch.length - 1] + 1}.`);
          break;
        }
      }
    }
  } catch (err) {
    addLog(`[Local Finder Core] Scraping exception: ${err.message}`);
  } finally {
    if (context) await context.close().catch(() => {});
  }

  addLog(`[Local Finder Core] ✅ Finished parallel harvest for "${query}". Total fresh leads: ${scrapedResults.length}`);
  return scrapedResults;
}

module.exports = {
  scrapeGoogleLocalFinder,
  setDeps
};
