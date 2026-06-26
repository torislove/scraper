const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const geoAI = require('../utils/geoAI');
const { getBrowser, chromium, applyAdvancedStealth } = require('./browserFactory');
const { verifyWithAI } = require('../utils/aiParser');

// Lead Quality Scoring Algorithm
function calculateLeadScore(vendor) {
  let score = 0;
  if (vendor.phone) score += 30;
  if (vendor.address) score += 10;
  if (vendor.website) score += 20;
  if (vendor.rating && parseFloat(vendor.rating) > 4.2) score += 15;
  if (vendor.reviews && parseInt(vendor.reviews.replace(/,/g, '')) > 50) score += 5;
  if (vendor.email) score += 10;
  return Math.min(score, 100);
}

function determineTier(score) {
  if (score >= 80) return 'Premium';
  if (score >= 50) return 'Standard';
  return 'Basic';
}

// Global state variables passed from index.js
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitVendorEvent = () => {};

function setDeps({ logger, abortSignal, emitVendorEvent: evt }) {
    if (logger) addLog = logger;
    if (abortSignal) globalAbortSignal = abortSignal;
    if (evt) emitVendorEvent = evt;
}

async function scrapeWebsiteForSocials(browser, url, vendorName) {
  if (!url || !url.startsWith('http')) return { email: '', instagram: '', facebook: '', phone: '', instagramFollowers: '', facebookFollowers: '' };
  
  let email = '';
  let phone = '';
  let instagram = '';
  let facebook = '';
  let images = [];

  try {
    addLog(`[Deep Scrape] Investigating website for ${vendorName || 'vendor'} via fast HTTP request...`);
    const response = await axios.get(url, { 
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    const emailMatch = html.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g) || [];
    let validEmails = [...new Set(emailMatch)].filter(e => 
      !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.jpeg') && !e.endsWith('.webp') && !e.endsWith('.gif') && !e.includes('wixpress') && !e.includes('sentry')
    );

    let validPhones = [];
    const phoneContextRegex = /(?:phone|tel|call|whatsapp|mob|mobile)[\s:.-]*((?:\+\d{1,4}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?(?:\d{1,4}[\s-]?){2,4}\d{2,4})/gi;
    let match;
    while ((match = phoneContextRegex.exec(html)) !== null) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 15) {
        validPhones.push(match[1].trim());
      }
    }

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      const lowerHref = href.toLowerCase();
      if (lowerHref.startsWith('mailto:')) {
        const mail = lowerHref.replace('mailto:', '').split('?')[0];
        if (mail && mail.includes('@')) validEmails.push(mail);
      }
      if (lowerHref.startsWith('tel:')) {
        const tel = lowerHref.replace('tel:', '').replace(/[^\d+]/g, '');
        if (tel.length >= 10) validPhones.push(tel);
      }
      
      if (lowerHref.includes('instagram.com/') && !instagram) instagram = href;
      if (lowerHref.includes('facebook.com/') && !facebook && !lowerHref.includes('sharer')) facebook = href;
    });
    
    validEmails = [...new Set(validEmails)];
    validPhones = [...new Set(validPhones)];

    if (!instagram) {
      const rawIgMatch = html.match(/https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi) || [];
      const validIg = rawIgMatch.find(l => !l.includes('/p/') && !l.includes('/reel/') && !l.includes('explore'));
      if (validIg) instagram = validIg.replace(/["'\\]/g, '');
    }

    try {
      const ogImg = $('meta[property="og:image"]').attr('content');
      if (ogImg) images.push(ogImg);
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && images.length < 5) {
          images.push(src);
        }
      });
    } catch (e) {}

    email = validEmails.length > 0 ? validEmails[0] : '';
    phone = validPhones.length > 0 ? validPhones[0] : '';
  } catch (err) {
    console.log(`[Cheerio Deep Scrape] HTTP fast fetch failed or timed out for ${url}`);
  }

  // Browser Fallback logic: If we got blocked, received blank, or missed contact/socials, visit with Playwright
  if ((!email || !instagram || !facebook) && browser) {
    addLog(`[Deep Scrape Fallback] Running headless browser lookup for ${url} (Resolving modern SPA / Cloudflare)...`);
    let page = null;
    try {
      page = await browser.newPage();
      // Block non-essential resources to make it blazing fast!
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });
      // Wait for domcontentloaded (fast) or max 10 seconds
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const content = await page.content();
      const $b = cheerio.load(content);

      if (!email) {
        const emailMatch = content.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g) || [];
        const browserEmails = [...new Set(emailMatch)].filter(e => 
          !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.jpeg') && !e.endsWith('.webp') && !e.endsWith('.gif') && !e.includes('wixpress') && !e.includes('sentry')
        );
        if (browserEmails.length > 0) email = browserEmails[0];
      }

      if (!phone) {
        const phoneContextRegex = /(?:phone|tel|call|whatsapp|mob|mobile)[\s:.-]*((?:\+\d{1,4}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?(?:\d{1,4}[\s-]?){2,4}\d{2,4})/gi;
        let match;
        while ((match = phoneContextRegex.exec(content)) !== null) {
          const digits = match[1].replace(/\D/g, '');
          if (digits.length >= 8 && digits.length <= 15) {
            phone = match[1].trim();
            break;
          }
        }
      }

      // Check all link HREFs in the browser DOM
      const links = await page.locator('a').evaluateAll(elList => elList.map(a => ({ href: a.href, text: a.innerText }))).catch(() => []);
      for (const link of links) {
        const href = link.href || '';
        const lowerHref = href.toLowerCase();
        if (lowerHref.includes('instagram.com/') && !instagram && !lowerHref.includes('/p/') && !lowerHref.includes('/reel/') && !lowerHref.includes('explore')) {
          instagram = href;
        }
        if (lowerHref.includes('facebook.com/') && !facebook && !lowerHref.includes('sharer')) {
          facebook = href;
        }
        if (lowerHref.startsWith('mailto:') && !email) {
          const mail = lowerHref.replace('mailto:', '').split('?')[0];
          if (mail && mail.includes('@')) email = mail;
        }
        if (lowerHref.startsWith('tel:') && !phone) {
          phone = lowerHref.replace('tel:', '').replace(/[^\d+]/g, '');
        }
      }

      // Images fallback
      if (images.length === 0) {
        $b('img').each((i, el) => {
          const src = $b(el).attr('src');
          if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && images.length < 5) {
            images.push(src);
          }
        });
      }
    } catch (e) {
      console.log(`[Deep Scrape Fallback] Browser fetch failed for ${url}:`, e.message);
    } finally {
      if (page) await page.close().catch(()=>{});
    }
  }

  return {
    email: email || '',
    phone: phone || '',
    instagram: instagram || '',
    facebook: facebook || '',
    instagramFollowers: '',
    facebookFollowers: '',
    images
  };
}

function isListingRelevantToQuery(name, address, district, stateName, mandal, location) {
  if (!address) return true; // Can't prove it's out of bounds
  
  const addrLower = address.toLowerCase();
  
  // 1. Strict State Filter: If we have a state name, address MUST NOT explicitly mention a DIFFERENT state
  const knownStates = ['telangana', 'andhra pradesh', 'karnataka', 'tamil nadu', 'maharashtra', 'kerala', 'gujarat', 'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'bihar', 'west bengal', 'odisha', 'madhya pradesh', 'assam', 'himachal pradesh', 'uttarakhand', 'jharkhand', 'chhattisgarh', 'goa', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura', 'arunachal pradesh', 'delhi'];
  
  if (stateName) {
    const myState = stateName.toLowerCase().replace(/[^a-z]/g, '');
    for (const state of knownStates) {
      const stateClean = state.replace(/[^a-z]/g, '');
      if (stateClean !== myState && addrLower.replace(/[^a-z]/g, '').includes(stateClean)) {
        // Address explicitly mentions a different state!
        return false;
      }
    }
  }

  // 2. Strict District/City Filter: Basic heuristic - if another major city/district of the SAME state is found, and not ours, reject.
  // (We'll rely primarily on Bounding Box for strict geo-accuracy, but this prevents text anomalies)
  if (district) {
    const dName = district.toLowerCase().split(' ')[0]; // E.g., 'East' from 'East Godavari'
    if (addrLower.includes(dName)) return true;
  }
  
  if (mandal) {
    const mName = mandal.toLowerCase().split(' ')[0];
    if (addrLower.includes(mName)) return true;
  }

  return true; 
}

function extractCoords(url) {
  if (!url) return null;
  const match = url.match(/!8m2!3d([0-9.-]+)!4d([0-9.-]+)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  return null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bounding box format from Nominatim: [minLat, maxLat, minLng, maxLng] (strings)
function isWithinBounds(lat, lng, bbox, toleranceKm = 30) {
  if (!bbox || bbox.length !== 4) return true; // No bounds provided
  
  const minLat = parseFloat(bbox[0]);
  const maxLat = parseFloat(bbox[1]);
  const minLng = parseFloat(bbox[2]);
  const maxLng = parseFloat(bbox[3]);

  // Rough approximation: 1 degree latitude ~ 111 km, 1 degree longitude ~ 111 km at equator
  const latTolerance = toleranceKm / 111.0;
  const lngTolerance = toleranceKm / (111.0 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

  if (lat < (minLat - latTolerance) || lat > (maxLat + latTolerance)) return false;
  if (lng < (minLng - lngTolerance) || lng > (maxLng + lngTolerance)) return false;

  return true;
}

async function scrapeGooglePlaces(exactQuery, category, location, sessionId = "legacy", centerLat = null, centerLng = null, radiusKm = null, strategy = 'broad', district = null, stateName = null, boundingbox = null, isClient = false, userId = null) {
  addLog(`Starting Google Maps browser scrape for exact match: "${exactQuery}" (Client Scrape: ${isClient})`);

  // If Playwright not available (production/Render), skip browser scraping
  if (!chromium) {
    console.warn('[scrapeGooglePlaces] Playwright Chromium not available. Skipping browser scrape.');
    return [];
  }
  
  const browser = await getBrowser(isClient);
  if (!browser) {
    console.warn('[scrapeGooglePlaces] Browser not available. Skipping.');
    return [];
  }

  let context = null;
  let page = null;

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    page = await context.newPage();
    await applyAdvancedStealth(page);

    // Abort image, font, and media for maximum speed, but allow stylesheets/other so Google Maps JS renders the feed correctly.
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const searchUrl = exactQuery.startsWith('http')
      ? exactQuery
      : `https://www.google.com/maps/search/${encodeURIComponent(exactQuery)}`;
    addLog(`[System] Navigating to Google Maps search: ${searchUrl}`);
    // Wait for networkidle instead of domcontentloaded for faster extraction
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 }).catch(e => addLog(`[Google Maps] Note: Search load timed out but continuing...`));

    const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree"), button:has-text("Agree")');
    try {
      if (await consentBtn.count() > 0) {
        await consentBtn.first().click({ timeout: 5000 }).catch(()=>{});
        await page.waitForTimeout(1000);
      }
    } catch(e) {}

    try {
      await Promise.race([
        page.waitForSelector('div[role="feed"]', { timeout: 10000 }),
        page.waitForSelector('[data-item-id="address"]', { timeout: 10000 })
      ]);
    } catch (e) {
      addLog("Could not find feed or place details within timeout");
    }

    let scrapedResults = [];

    // Case A: Redirected directly to a single business details page
    if (await page.locator('[data-item-id="address"]').count() > 0 && await page.locator('div[role="feed"]').count() === 0) {
      addLog("Redirected directly to a single business page.");
      const nameEl = page.locator('h1.DUwDvf');
      const name = await nameEl.count() > 0 ? await nameEl.innerText() : 'Google Maps Listing';
      
      const extractedData = await page.evaluate(() => {
        let extPhone = '';
        let extAddress = '';
        let extWebsite = '';
        let extRating = null;
        let extImages = [];

        // Address
        const addrEl = document.querySelector('[data-item-id="address"]');
        if (addrEl) {
          const rawAddr = addrEl.getAttribute('aria-label');
          extAddress = rawAddr ? rawAddr.replace(/^Address:\s*/i, '').trim() : '';
        }
        if (!extAddress) {
          const addrFallback = document.querySelector('button[aria-label^="Address:"]');
          if (addrFallback) extAddress = addrFallback.getAttribute('aria-label').replace(/^Address:\s*/i, '').trim();
        }

        // Phone
        const phoneEls = document.querySelectorAll('button[data-item-id^="phone:tel:"], button[data-tooltip*="phone"], button[aria-label^="Phone:"], button[aria-label^="phone:"]');
        for (const el of phoneEls) {
          const dataId = el.getAttribute('data-item-id');
          if (dataId && dataId.startsWith('phone:tel:')) {
            extPhone = dataId.replace('phone:tel:', '').trim();
            break;
          }
          const ariaLabel = el.getAttribute('aria-label');
          if (!extPhone && ariaLabel) {
            extPhone = ariaLabel.replace(/^Phone:\s*/i, '').trim();
          }
          if (!extPhone) {
            const text = el.innerText;
            if (text && text.match(/[\d\s\-\+()]{8,15}/)) {
              extPhone = text.trim();
            }
          }
        }

        // Rating
        const ratingEl = document.querySelector('div.F7nice');
        if (ratingEl) {
          const match = ratingEl.innerText.match(/^([0-9.]+)/);
          if (match) extRating = parseFloat(match[1]);
        }

        // Website
        const websiteEls = document.querySelectorAll('a[data-item-id="authority"], a[aria-label^="Website"], a[href^="http"]');
        for (const el of websiteEls) {
          const href = el.getAttribute('href');
          if (href && !href.includes('google.com') && !href.includes('gstatic.com')) {
            extWebsite = href;
            break;
          }
        }

        // Images
        const nodes = document.querySelectorAll('button[aria-label^="Photo of"] img, img[src*="googleusercontent.com/p/"]');
        nodes.forEach(n => {
          let src = n.getAttribute('src');
          if (src && !src.includes('Olteoc')) {
            src = src.replace(/=[ws]\d+-h\d+-k-no/i, '=s1024');
            extImages.push(src);
          }
        });
        extImages = [...new Set(extImages)].slice(0, 15);

        return { extPhone, extAddress, extWebsite, extRating, extImages };
      });

      let address = extractedData.extAddress;
      let phone = extractedData.extPhone;
      let rating = extractedData.extRating;
      let website = extractedData.extWebsite;
      let allImages = extractedData.extImages;
      const avatar = allImages.length > 0 ? allImages[0] : '';

      let enrichedData = { email: '', instagram: '', facebook: '', instagramFollowers: '', facebookFollowers: '', images: [] };
      if (website) {
        enrichedData = await scrapeWebsiteForSocials(browser, website, name);
      }

      const combinedText = `${name} ${address}`;
      
      const coords = extractCoords(page.url());
      let outOfBoundsDistance = null;
      let isOob = false;

      if (coords) {
        if (boundingbox && boundingbox.length === 4) {
          if (!isWithinBounds(coords.lat, coords.lng, boundingbox, 30)) {
            isOob = true;
            outOfBoundsDistance = centerLat ? getDistanceKm(centerLat, centerLng, coords.lat, coords.lng) : 'OOB';
          }
        } else if (centerLat !== null && centerLng !== null && radiusKm !== null) {
          const distance = getDistanceKm(centerLat, centerLng, coords.lat, coords.lng);
          if (distance > radiusKm) {
            isOob = true;
            outOfBoundsDistance = distance.toFixed(1);
          }
        }
      }

      if (isOob) {
        addLog(`[Boundary Filter] Saving '${name}' to Out of Bounds Folder (Location is strictly out of bounds)`);
        const leadScore = calculateLeadScore({ name, address, phone: phone || null, rating: null });
        const oobLead = {
          id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
          name, category, city: location || 'Global', address: address || '', 
          phone: phone || '', rating: '', mapsLink: page.url(), 
          latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null, source: 'Google Maps (Out of Bounds)',
          outOfBoundsDistance: outOfBoundsDistance,
          scrapedAt: new Date().toISOString(),
          sessionId,
          userId
        };
        dbAdapter.saveOutOfBoundsVendor(oobLead);
        try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) {}
        return;
      }

      const mapsLink = page.url();
        const id = 'place_' + Date.now().toString() + Math.random().toString(36).substring(7);

        const pincodeMatch = address ? address.match(/\b\d{6}\b/) : null;
        const pincode = pincodeMatch ? pincodeMatch[0] : '';
        
        // Strict Text Boundary Check
        // Pass mandal extraction from 'location' string if needed (subLoc was passed as location)
        const isRelevant = isListingRelevantToQuery(name, address, district, stateName, location, location);
        if (!isRelevant) {
          addLog(`[Out of Bounds] Skipping ${name} - Address explicitly outside target boundary.`);
          return;
        }

        // Read local database
        const vendors = dbAdapter.getVendors();
        const existingIndex = vendors.findIndex(v => v.mapsLink === mapsLink || v.name === name);

        if (existingIndex === -1) {
          const leadScore = calculateLeadScore({ name, address, phone, rating });
          const newLead = {
            id,
            name,
            category,
            city: location || 'Global',
            address: address || '',
            pincode: pincode,
            phone: phone || 'Requires Manual Lookup',
            rating,
            mapsLink,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            source: 'Google Maps Engine',
            verified: false,
            aiVerified: false,
            matchedKeywords: [],
            email: enrichedData.email || '',
            instagram: enrichedData.instagram || '',
            instagramFollowers: enrichedData.instagramFollowers || '',
            facebook: enrichedData.facebook || '',
            facebookFollowers: enrichedData.facebookFollowers || '',
            website: website,
            images: [...allImages, ...(enrichedData.images || [])].filter(Boolean),
            avatar: avatar,
            qualityScore: leadScore,
            tier: determineTier(leadScore),
            operatingHours: '',
            topReviews: [],
            scrapedAt: new Date().toISOString(),
            userId
          };

          dbAdapter.saveVendor(userId, newLead);
          try { emitVendorEvent(newLead, 'inserted'); } catch (e) {}
          scrapedResults.push(newLead);
        } else {
          let existing = vendors[existingIndex];
          let updated = false;

          if (userId && existing.userId !== userId) {
            existing.userId = userId;
            updated = true;
          }
          if (!existing.pincode && pincode) { existing.pincode = pincode; updated = true; }
          if (!existing.rating && rating) { existing.rating = rating; updated = true; }
          if ((!existing.phone || existing.phone.includes('Requires')) && phone) {
            existing.phone = phone; updated = true;
          }
          if (!existing.website && website) { existing.website = website; updated = true; }
          if (existing.sessionId !== sessionId) { existing.sessionId = sessionId; updated = true; }
          
          existing.scrapedAt = new Date().toISOString();
          updated = true;

          if (updated) {
            dbAdapter.saveVendor(userId || existing.userId, existing);
            try { emitVendorEvent(existing, 'updated'); } catch (e) {}
          }
          scrapedResults.push(existing);
        }
    } else {
      // Case B: Search results list is loaded
      const scrollable = page.locator('div[role="feed"]');
      if (await scrollable.count() > 0) {
        addLog("Scrolling through search results feed... (Fast Mode)");
        
        // Dynamic Fast Scroll - absolute minimum delays
        const maxScrollCards = isClient ? 12 : 200;
        for(let i=0; i<100; i++) {
          if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
          await scrollable.evaluate(node => node.scrollBy(0, 10000));
          await page.waitForTimeout(120); // Ultra-fast hardware scroll speed
          const currentCount = await page.locator('a.hfpxzc').count();
          if (currentCount >= maxScrollCards) {
            addLog(`Reached ${currentCount} cards, stopping scroll for client speed.`);
            break;
          }
        }

        const cards = page.locator('a.hfpxzc');
        const count = await cards.count();
        addLog(`Found ${count} total business cards. Extracting URLs...`);

        // Phase 1: Rapid Extraction of HREFs
        const vendorLinks = [];
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          const name = await card.getAttribute('aria-label');
          const mapsLink = await card.getAttribute('href');
          if (name && mapsLink) {
            vendorLinks.push({ name, mapsLink });
          }
        }

        addLog(`Extracted ${vendorLinks.length} raw links. Beginning Single-Tab Fast Extraction (God Mode)...`);

        // Phase 2: Single-Tab Fast Extraction
        // Instead of opening 60 new tabs, we click each card directly on the main page.
        // This takes ~0.5 seconds per vendor instead of 3-5 seconds!
        const allCards = await page.locator('a.hfpxzc').all();
        
        let insertedInBatch = 0;
        const limitCount = Math.min(allCards.length, isClient ? 10 : 200);

        for (let i = 0; i < limitCount; i++) {
          if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
          
          const card = allCards[i];
          const name = await card.getAttribute('aria-label').catch(()=>null);
          const mapsLink = await card.getAttribute('href').catch(()=>null);
          if (!name || !mapsLink) continue;

          addLog(`[Fast Extract] Processing ${i+1}/${allCards.length}: ${name}`);

          let address = '';
          let phone = '';
          let rating = null;
          let websiteUrl = '';
          let operatingHours = '';
          let topReviews = [];
          let coverImage = '';
          let aiVerified = false;
          let matchedKeywords = [];

          try {
            await card.click();
            
            // Wait for side panel details to appear. The title usually appears as an h1
            await page.waitForSelector(`h1`, { timeout: 1500 }).catch(()=>{});
            
            // Ultra-fast phone detection without arbitrary waits
            await page.waitForSelector('button[data-item-id^="phone:tel:"], button[data-tooltip="Copy phone number"]', { timeout: 1000 }).catch(()=>{});

            // Use evaluate for highly robust data extraction
            const extractedData = await page.evaluate(() => {
              let extPhone = '';
              let extAddress = '';
              let extWebsite = '';
              let extRating = null;

              // Address Extraction
              const addrEl = document.querySelector('[data-item-id="address"]');
              if (addrEl) {
                const rawAddr = addrEl.getAttribute('aria-label');
                extAddress = rawAddr ? rawAddr.replace(/^Address:\s*/i, '').trim() : '';
              }
              if (!extAddress) {
                const addrFallback = document.querySelector('button[aria-label^="Address:"]');
                if (addrFallback) extAddress = addrFallback.getAttribute('aria-label').replace(/^Address:\s*/i, '').trim();
              }

              // Phone Extraction
              const phoneEls = document.querySelectorAll('button[data-item-id^="phone:tel:"], button[data-tooltip*="phone"], button[aria-label^="Phone:"], button[aria-label^="phone:"]');
              for (const el of phoneEls) {
                const dataId = el.getAttribute('data-item-id');
                if (dataId && dataId.startsWith('phone:tel:')) {
                  extPhone = dataId.replace('phone:tel:', '').trim();
                  break;
                }
                const ariaLabel = el.getAttribute('aria-label');
                if (!extPhone && ariaLabel) {
                  extPhone = ariaLabel.replace(/^Phone:\s*/i, '').trim();
                }
                if (!extPhone) {
                  const text = el.innerText;
                  if (text && text.match(/[\d\s\-\+()]{8,15}/)) {
                    extPhone = text.trim();
                  }
                }
              }

              // Rating Extraction
              const ratingEl = document.querySelector('div.F7nice');
              if (ratingEl) {
                const match = ratingEl.innerText.match(/^([0-9.]+)/);
                if (match) extRating = parseFloat(match[1]);
              }

              // Website Extraction
              const websiteEls = document.querySelectorAll('a[data-item-id="authority"], a[aria-label^="Website"], a[href^="http"]');
              for (const el of websiteEls) {
                const href = el.getAttribute('href');
                if (href && !href.includes('google.com') && !href.includes('gstatic.com')) {
                  extWebsite = href;
                  break;
                }
              }

              return { extPhone, extAddress, extWebsite, extRating };
            });

            address = extractedData.extAddress;
            phone = extractedData.extPhone;
            rating = extractedData.extRating;
            websiteUrl = extractedData.extWebsite;

            if (phone) addLog(`[Extracted] Phone for ${name}: ${phone}`);

            const hoursEl = page.locator('[aria-label*="hours"]').first();
            try {
              if (await hoursEl.count() > 0) {
                operatingHours = await hoursEl.getAttribute('aria-label', { timeout: 1000 }) || await hoursEl.innerText({ timeout: 1000 });
              }
            } catch (err) {}

            // Extract high quality images robustly
            let allImages = await page.evaluate(() => {
              const imgs = [];
              const nodes = document.querySelectorAll('button[aria-label^="Photo of"] img, img[src*="googleusercontent.com/p/"]');
              nodes.forEach(n => {
                let src = n.getAttribute('src');
                if (src && !src.includes('Olteoc')) {
                  // Upgrade resolution to 1024px for hacker-like ultra details
                  src = src.replace(/=[ws]\d+-h\d+-k-no/i, '=s1024');
                  imgs.push(src);
                }
              });
              // Filter out duplicate or low quality placeholders
              return [...new Set(imgs)].slice(0, 15);
            }).catch(() => []);

            const avatar = allImages.length > 0 ? allImages[0] : '';

            // Fire-and-Forget Background Enrichment (No Blocking!)
            let enrichedData = { email: '', instagram: '', facebook: '', phone: '', instagramFollowers: '', facebookFollowers: '', images: [] };
             if (websiteUrl) {
                // We run this in the background so the map extraction never pauses
                scrapeWebsiteForSocials(browser, websiteUrl, name).then(async data => {
                   // NLP Deep Enrichment using Python Script
                   const { exec } = require('child_process');
                   const path = require('path');
                   const scriptPath = path.join(__dirname, 'deep_enrichment.py');
                   
                   await new Promise((resolve) => {
                       exec(`python3 "${scriptPath}" --url "${websiteUrl}"`, (err, stdout) => {
                           if (!err && stdout) {
                               try {
                                   const lines = stdout.split('\\n');
                                   for (const line of lines) {
                                       if (line.includes('"type": "enrichment_result"')) {
                                           const parsed = JSON.parse(line).data;
                                           if (parsed.emails && parsed.emails.length > 0) data.email = parsed.emails[0];
                                           if (parsed.phones && parsed.phones.length > 0) data.phone = parsed.phones[0];
                                       }
                                   }
                               } catch (e) {}
                           }
                           resolve();
                       });
                   });

                   const currentVendors = dbAdapter.getVendors();
                   const vIdx = currentVendors.findIndex(v => v.name === name);
                   if (vIdx !== -1) {
                      let existing = currentVendors[vIdx];
                      let updated = false;
                      if (data.email && !existing.email) { existing.email = data.email; updated = true; }
                      if (data.phone && (!existing.phone || existing.phone.includes('Requires'))) { existing.phone = data.phone; updated = true; }
                      if (data.instagram && !existing.instagram) { existing.instagram = data.instagram; updated = true; }
                      if (data.facebook && !existing.facebook) { existing.facebook = data.facebook; updated = true; }
                      if (data.images && data.images.length > 0) {
                        existing.images = [...new Set([...(existing.images || []), ...data.images])];
                        updated = true;
                      }

                      // STRICT EMPTY FILTER: Delete if no phone AND no email
                      const hasPhone = existing.phone && !existing.phone.includes('Requires');
                      const hasEmail = existing.email && existing.email.trim() !== '';
                      if (!hasPhone && !hasEmail) {
                          addLog(`[Strict Filter] Dropping '${existing.name}' after enrichment due to no contact info.`);
                          dbAdapter.deleteVendor(userId || existing.userId, existing.id);
                          try { emitVendorEvent(existing, 'deleted'); } catch(e){}
                      } else if (updated) {
                        dbAdapter.saveVendor(userId || existing.userId, existing);
                        try { emitVendorEvent(existing, 'updated'); } catch(e){}
                      }
                   }
                }).catch(()=>{});
             } else {
                // If NO website, we must still apply the strict filter!
                setTimeout(() => {
                   const currentVendors = dbAdapter.getVendors();
                   const vIdx = currentVendors.findIndex(v => v.name === name);
                   if (vIdx !== -1) {
                      let existing = currentVendors[vIdx];
                      const hasPhone = existing.phone && !existing.phone.includes('Requires');
                      const hasEmail = existing.email && existing.email.trim() !== '';
                      if (!hasPhone && !hasEmail) {
                          addLog(`[Strict Filter] Dropping '${existing.name}' because it has no website and no contact info.`);
                          dbAdapter.deleteVendor(userId || existing.userId, existing.id);
                          try { emitVendorEvent(existing, 'deleted'); } catch(e){}
                      }
                   }
                }, 2000);
             }

            const coords = extractCoords(mapsLink);
            const finalPhone = (phone && !phone.includes('Requires')) ? phone : phone;

            const place = {
              name,
              address,
              phone: finalPhone,
              rating,
              mapsLink,
              latitude: coords ? coords.lat : null,
              longitude: coords ? coords.lng : null,
              website: websiteUrl,
              operatingHours: (operatingHours||'').substring(0, 150),
              topReviews,
              email: '',
              instagram: '',
              facebook: '',
              instagramFollowers: '',
              facebookFollowers: '',
              images: [...allImages, ...(enrichedData.images || [])].filter(Boolean),
              avatar: avatar,
              aiVerified,
              matchedKeywords,
              id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7)
            };

            // STREAMING INSERTION TO DB
            const combinedText = `${place.name} ${place.address} ${place.operatingHours}`;

            // Apply strict bounding box filter if available, fallback to radius
            let outOfBoundsDistance = null;
            let isOob = false;

            if (place.latitude && place.longitude) {
              if (boundingbox && boundingbox.length === 4) {
                if (!isWithinBounds(place.latitude, place.longitude, boundingbox, 30)) {
                  isOob = true;
                  outOfBoundsDistance = centerLat ? getDistanceKm(centerLat, centerLng, place.latitude, place.longitude) : 'OOB';
                }
              } else if (centerLat !== null && centerLng !== null && radiusKm !== null) {
                const distance = getDistanceKm(centerLat, centerLng, place.latitude, place.longitude);
                if (distance > radiusKm) {
                  isOob = true;
                  outOfBoundsDistance = distance.toFixed(1);
                }
              }
            }

            if (isOob) {
              addLog(`[Boundary Filter] Saving '${place.name}' to Out of Bounds Folder (Location is strictly out of bounds)`);
              place.outOfBoundsDistance = outOfBoundsDistance;
              place.source = 'Google Maps (Out of Bounds)';
              place.scrapedAt = new Date().toISOString();
              place.sessionId = sessionId;
              place.userId = userId;
              dbAdapter.saveOutOfBoundsVendor(place);
              try { emitVendorEvent(place, 'out-of-bounds'); } catch (e) {}
              continue;
            }

            // Strict Address Text Filter (Bypass if Broad Strategy)
            if (strategy === 'strict') {
              const cleanCityName = location ? location.split(' (@')[0].trim().toLowerCase() : '';
              if (place.address && cleanCityName) {
                const addrLower = place.address.toLowerCase();
                if (!addrLower.includes(cleanCityName)) {
                  addLog(`[Strict Filter] Discarding '${place.name}' - Address does not contain '${cleanCityName}'`);
                  continue;
                }
              }
            }

            const pincodeMatch = place.address ? place.address.match(/\b\d{6}\b/) : null;
            const pincode = pincodeMatch ? pincodeMatch[0] : '';

            let parsedRating = null;
            if (place.rating && place.rating !== '-') {
              parsedRating = parseFloat(place.rating);
              if (isNaN(parsedRating)) parsedRating = null;
            }

            // Strict Text Boundary Check
            const isRelevant = isListingRelevantToQuery(place.name, place.address, district, stateName, location, location);
            if (!isRelevant) {
              addLog(`[Out of Bounds] Skipping ${place.name} - Address explicitly outside target boundary.`);
              continue;
            }

            // Read local database
            const vendors = dbAdapter.getVendors();
            const existingIndex = vendors.findIndex(v => v.mapsLink === place.mapsLink || v.name === place.name);

            if (existingIndex === -1) {
              const leadScore = calculateLeadScore(place);
              place.pincode = pincode;
              place.qualityScore = leadScore;
              place.tier = determineTier(leadScore);
              place.category = category;
              place.city = location || 'Global';
              place.source = 'Google Maps Engine';
              place.verified = false;
              place.scrapedAt = new Date().toISOString();
              place.sessionId = sessionId;
              place.userId = userId;
              place.strategy = strategy; // Store strategy so UI knows how to group folders
              
              // Apply GeoAI reverse geocoding for deep location folders
              if (place.latitude && place.longitude) {
                try {
                  const locationInfo = await geoAI.reverseGeocode(place.latitude, place.longitude);
                  if (locationInfo) {
                    place.village = locationInfo.village;
                    place.mandal = locationInfo.mandal;
                    place.district = locationInfo.district;
                    place.state = locationInfo.state;
                  }
                } catch(e) { }
              }
              
              dbAdapter.saveVendor(userId, place);
              scrapedResults.push(place);
              try { emitVendorEvent(place, 'inserted'); } catch (e) {}
              insertedInBatch++;
            } else {
              let existing = vendors[existingIndex];
              let updated = false;

              if (userId && existing.userId !== userId) {
                existing.userId = userId;
                updated = true;
              }
              if (!existing.pincode && place.address) {
                const pMatch = place.address.match(/\b\d{6}\b/);
                if (pMatch) { existing.pincode = pMatch[0]; updated = true; }
              }
              if (!existing.rating && parsedRating) { existing.rating = parsedRating; updated = true; }
              if ((!existing.phone || existing.phone.includes('Obfuscated') || existing.phone.includes('Requires')) && place.phone) {
                existing.phone = place.phone; updated = true;
              }
              
              existing.sessionId = sessionId;
              existing.scrapedAt = new Date().toISOString();
              updated = true;

              if (updated) {
                dbAdapter.saveVendor(userId || existing.userId, existing);
                try { emitVendorEvent(existing, 'updated'); } catch (e) {}
              }
            }
          } catch (err) {
            addLog(`Error fast-extracting ${name}: ${err.message}`);
          }
        }

          
          // Single-Tab extraction loop finishes here
        addLog(`Streamed ${insertedInBatch} new vendors to DB. (Total extracted so far: ${scrapedResults.length})`);
      }
    }

    addLog(`Google Maps Scraping complete. Found ${scrapedResults.length} vendors total.`);
  } catch (error) {
    addLog(`Google Maps Scraper error: ${error.message}`);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}
module.exports = { scrapeGooglePlaces, setDeps };
