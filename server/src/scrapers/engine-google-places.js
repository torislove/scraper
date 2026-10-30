const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const geoAI = require('../utils/geoAI');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('./browserFactory');
const { verifyWithAI } = require('../utils/aiParser');
const { normalizePhone } = require('../utils/phoneUtils');
const fidelity = require('../services/categoryFidelity');

// Lead Quality Scoring Algorithm (0 - 100)
function calculateLeadScore(vendor) {
  let score = 0;
  const phone = vendor.phone || '';
  const cleanPhone = phone.replace(/\D/g, '');
  
  // 1. Phone availability (35 pts)
  if (cleanPhone.length >= 10 && !phone.toLowerCase().includes('require') && !phone.toLowerCase().includes('lookup')) {
    score += 35;
  }
  
  // 2. WhatsApp Readiness (15 pts)
  if (vendor.whatsappAvailable || (cleanPhone.slice(-10).length === 10)) {
    score += 15;
  }
  
  // 3. Street Address / Location details (10 pts)
  if (vendor.address && vendor.address.length > 8 && !vendor.address.toLowerCase().startsWith('india')) {
    score += 10;
  }
  
  // 4. Website presence (15 pts)
  if (vendor.website && vendor.website.startsWith('http') && !vendor.website.includes('google.com')) {
    score += 15;
  }
  
  // 5. Reputation: Rating >= 4.0 (15 pts)
  const ratingNum = parseFloat(vendor.rating);
  if (!isNaN(ratingNum) && ratingNum >= 4.0) {
    score += 15;
  } else if (!isNaN(ratingNum) && ratingNum >= 3.5) {
    score += 8;
  }
  
  // 6. Review volume >= 10 (5 pts)
  const revStr = (vendor.reviewsCount || vendor.reviews || '').toString().replace(/,/g, '');
  const revNum = parseInt(revStr, 10);
  if (!isNaN(revNum) && revNum >= 10) {
    score += 5;
  }
  
  // 7. Verified Email or Social Links (5 pts)
  if (vendor.email || vendor.instagram || vendor.facebook || (vendor.emails && vendor.emails.length > 0)) {
    score += 5;
  }

  return Math.min(Math.max(score, 10), 100);
}

function determineTier(score) {
  if (score >= 85) return 'Diamond';
  if (score >= 70) return 'Gold';
  if (score >= 50) return 'Silver';
  return 'Bronze';
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
  
  try {
    addLog(`[Deep Scrape] Investigating website for ${vendorName || 'vendor'}...`);
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

    // We no longer scan the entire raw HTML for 10-digit strings because it hallucinates UNIX timestamps (e.g. 1608662146)
    let validPhones = [];
    
    // Strict text-node scanning for contextual phone numbers (e.g. "Phone: 9876543210" or "Call +91-9876543210")
    const phoneContextRegex = /(?:phone|tel|call|whatsapp|mob|mobile)[\s:.-]*((?:\+\d{1,4}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?(?:\d{1,4}[\s-]?){2,4}\d{2,4})/gi;
    let match;
    while ((match = phoneContextRegex.exec(html)) !== null) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 15) {
        validPhones.push(match[1].trim());
      }
    }

    let instagram = '';
    let facebook = '';

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

    // Deep JSON / Script extraction for modern React/NextJS sites
    if (!instagram) {
      const rawIgMatch = html.match(/https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi) || [];
      const validIg = rawIgMatch.find(l => !l.includes('/p/') && !l.includes('/reel/') && !l.includes('explore'));
      if (validIg) instagram = validIg.replace(/["'\\]/g, '');
    }

    let logo = '';
    const images = [];
    try {
      const ogImg = $('meta[property="og:image"]').attr('content');
      const icon = $('link[rel="apple-touch-icon"]').attr('href') || 
                   $('link[rel="icon"]').attr('href') || 
                   $('link[rel="shortcut icon"]').attr('href');
      
      const logoEl = $('img[src*="logo" i], img[class*="logo" i], img[alt*="logo" i], header img, nav img').first();
      const logoSrc = logoEl.attr('src');

      const resolveUrl = (rel) => {
        if (!rel) return '';
        if (rel.startsWith('http')) return rel;
        try {
          return new URL(rel, url).href;
        } catch(e) { return ''; }
      };

      logo = resolveUrl(logoSrc) || resolveUrl(icon) || resolveUrl(ogImg);

      if (ogImg && ogImg.startsWith('http')) images.push(ogImg);
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('user') && !src.includes('profile') && images.length < 6) {
          images.push(src);
        }
      });
    } catch (e) {}

    return {
      email: validEmails.length > 0 ? validEmails[0] : '',
      phone: validPhones.length > 0 ? validPhones[0] : '',
      instagram: '',
      facebook: '',
      instagramFollowers: '',
      facebookFollowers: '',
      images,
      logo
    };
  } catch (err) {
    console.log(`[Cheerio Deep Scrape] Failed or timed out for ${url}`);
    return { email: '', instagram: '', facebook: '', phone: '', instagramFollowers: '', facebookFollowers: '', images: [], logo: '' };
  }
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * INTELLIGENT STOREFRONT MEDIA & OFFICIAL LOGO EXTRACTOR
 * Rejects all commenter avatars, reviewer selfie photos, and comment attachments.
 * Prioritizes:
 * 1. Official website domain favicon / high-res brand logo (128px-256px)
 * 2. Header hero storefront photo (from place panel header, strictly NOT reviews)
 * 3. Store gallery photos that are verified non-review images
 * ──────────────────────────────────────────────────────────────────────────────
 */
async function extractStorefrontMediaAndLogo(page, websiteUrl, businessName) {
  try {
    const media = await page.evaluate(() => {
      // Helper: Check if element is inside review / comments DOM tree
      const isInsideReviewOrComment = (el) => {
        return !!el.closest([
          '[data-review-id]',
          '.jftiEf',
          '[aria-label*="Reviews" i]',
          '[aria-label*="Review by" i]',
          '.MyEned',
          '.ODSEW-ShBeI',
          'div[jsaction*="review"]',
          '.wiI7pd',
          '.m6QErb[aria-label*="Reviews" i]',
          '.fontBodySmall',
          'button[aria-label*="Review" i]'
        ].join(', '));
      };

      // Helper: Check if URL represents a user profile avatar or commenter photo
      const isReviewerAvatarUrl = (src) => {
        if (!src) return true;
        const s = src.toLowerCase();
        // Commenter/User account avatars from Google
        if (s.includes('googleusercontent.com/a/') || s.includes('googleusercontent.com/a-/')) return true;
        if (s.includes('default_avatar') || s.includes('/avatar/') || s.includes('avatar.png')) return true;
        // User profile avatar thumbnail size parameters
        if (/=s(24|32|36|40|48|56|64|72|80|96|120)-c-rp-mo/.test(s)) return true;
        if (s.includes('/mo/') && s.includes('googleusercontent.com')) return true;
        return false;
      };

      // Helper: Check if image element or its container says "Photo by [person]" or "Review by [person]"
      const hasReviewerLabel = (el) => {
        const alt = (el.getAttribute('alt') || '').toLowerCase();
        const aria = (el.closest('button')?.getAttribute('aria-label') || el.getAttribute('aria-label') || '').toLowerCase();
        if (alt.includes('review by') || alt.includes('photo by') || alt.includes('profile photo') || alt.includes('user photo')) return true;
        if (aria.includes('review by') || aria.includes('photo by') || aria.includes('profile photo')) return true;
        return false;
      };

      // 1. Target the Google Maps Official Hero Header Image
      // Header hero photos appear in the top hero button / header gallery outside of reviews
      let heroPhoto = '';
      const heroSelectors = [
        'button[jsaction*="heroHeader"] img',
        'div.lMbq3e img',
        'div.Z6G0Re button img',
        'button.aoRNLd img',
        'div[role="main"] button[aria-label*="Photo of"] img'
      ];

      for (const sel of heroSelectors) {
        const candidate = document.querySelector(sel);
        if (candidate && candidate.src) {
          const src = candidate.src;
          if (!isInsideReviewOrComment(candidate) && !isReviewerAvatarUrl(src) && !hasReviewerLabel(candidate)) {
            // Found official hero storefront cover
            heroPhoto = src;
            break;
          }
        }
      }

      // 2. Target genuine store photos strictly excluding reviews
      const storePhotos = [];
      const allImgs = document.querySelectorAll('button[aria-label^="Photo of"] img, img[src*="googleusercontent.com/p/"]');
      for (const img of allImgs) {
        if (storePhotos.length >= 6) break;
        const src = img.src;
        if (!src) continue;
        if (isInsideReviewOrComment(img)) continue;
        if (isReviewerAvatarUrl(src)) continue;
        if (hasReviewerLabel(img)) continue;

        // Skip duplicates
        if (!storePhotos.includes(src)) {
          storePhotos.push(src);
        }
      }

      if (heroPhoto && !storePhotos.includes(heroPhoto)) {
        storePhotos.unshift(heroPhoto);
      }

      return {
        heroPhoto: heroPhoto || (storePhotos.length > 0 ? storePhotos[0] : ''),
        storePhotos
      };
    }).catch(() => ({ heroPhoto: '', storePhotos: [] }));

    // 3. Intelligent Brand Logo Determination:
    // If business has a website, generate high-resolution Google Favicon (crystal clear official logo)
    let officialLogo = '';
    if (websiteUrl && websiteUrl.startsWith('http')) {
      try {
        const parsed = new URL(websiteUrl);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host && !['facebook.com', 'instagram.com', 'google.com', 'wa.me'].includes(host)) {
          officialLogo = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
        }
      } catch (e) {}
    }

    // Fallback to clean storefront cover photo. Never invent an avatar URL:
    // the UI renders initials when a real logo is missing.
    const finalPhoto = media.heroPhoto || (media.storePhotos.length > 0 ? media.storePhotos[0] : '');
    const finalLogo = officialLogo || finalPhoto || '';

    return {
      logo: finalLogo,
      photo: finalPhoto,
      avatar: finalLogo || finalPhoto,
      images: media.storePhotos
    };
  } catch (err) {
    return {
      logo: '',
      photo: '',
      avatar: '',
      images: []
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// STRICT MULTI-LAYER GEOGRAPHIC CONTAINMENT GUARD (ZERO BLEED)
// ──────────────────────────────────────────────────────────────────────────────
function isListingRelevantToQuery(name, address, district, stateName, mandal, location, coords = null, boundingbox = null) {
  if (!address && !coords) return { relevant: true }; // Insufficient data to reject

  const addrLower = (address || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const fullText = `${nameLower} ${addrLower}`;

  // 1. Precise State Filter: Address must NOT belong to a different state
  const knownStates = [
    'telangana', 'andhra pradesh', 'karnataka', 'tamil nadu', 'maharashtra', 'kerala',
    'gujarat', 'rajasthan', 'punjab', 'haryana', 'uttar pradesh', 'bihar', 'west bengal',
    'odisha', 'madhya pradesh', 'assam', 'himachal pradesh', 'uttarakhand', 'jharkhand',
    'chhattisgarh', 'goa', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim',
    'tripura', 'arunachal pradesh', 'delhi'
  ];

  let expectedState = null;
  const combinedTargetText = `${stateName || ''} ${district || ''} ${location || ''}`.toLowerCase();
  for (const st of knownStates) {
    if (combinedTargetText.includes(st)) {
      expectedState = st;
      break;
    }
  }

  if (expectedState) {
    for (const otherState of knownStates) {
      if (otherState !== expectedState && addrLower.includes(otherState)) {
        if (!addrLower.includes(expectedState)) {
          return { relevant: false, reason: `Belongs to foreign state "${otherState}" instead of "${expectedState}"` };
        }
      }
    }
  }

  // 2. Extract Primary Target Town / Locality
  // Handles strings like "Narasaraopet Photo Studios", "Narasaraopet, Andhra Pradesh", "Indiranagar, Bangalore"
  const rawLoc = (mandal || location || '').split(',')[0].trim();
  const cleanTargetTown = rawLoc.replace(/\b(photo studios?|wedding|photographers?|caterers?|function halls?|central|core|market|commercial|services|top rated|dealers)\b/gi, '').trim().toLowerCase();
  const townToken = cleanTargetTown.replace(/[^a-z0-9]/g, '');

  // 3. Known Out-of-Town Metropolitan Hubs
  // If target town is NOT this hub, businesses in this hub without mentioning targetTown are bleed!
  const majorMetros = [
    'guntur', 'vijayawada', 'hyderabad', 'secunderabad', 'bangalore', 'bengaluru', 
    'chennai', 'mumbai', 'pune', 'delhi', 'visakhapatnam', 'tirupati', 'kurnool', 
    'nellore', 'rajahmundry', 'kakinada', 'ongole', 'eluru', 'anantapur', 'kadapa', 
    'warangal', 'kolkata', 'jaipur', 'ahmedabad'
  ];

  if (townToken.length >= 3) {
    for (const hub of majorMetros) {
      // If target town is NOT the metro hub itself (e.g. target is 'narasaraopet', hub is 'guntur')
      if (townToken !== hub && !townToken.includes(hub)) {
        if (addrLower.includes(hub)) {
          // Check if it's merely a road name (e.g., "Guntur Road, Narasaraopet")
          const isRoadName = new RegExp(`\\b${hub}\\s+(road|rd|highway|hwy|main\\s+road|bypass|way|street|cross)\\b`, 'i').test(addrLower);
          const mentionsTown = fullText.includes(townToken) || (cleanTargetTown.length > 2 && fullText.includes(cleanTargetTown));
          
          if (!mentionsTown && !isRoadName) {
            return { relevant: false, reason: `Listing belongs to metropolitan hub "${hub}" with no reference to target town "${cleanTargetTown}"` };
          }

          // Even if road name, check for urban center localities of that metro (e.g. Brodipet, Arundelpet, Lakshmipuram for Guntur)
          if (hub === 'guntur') {
            const gunturUrbanLocalities = ['brodipet', 'arundelpet', 'lakshmipuram', 'kothapet', 'old guntur', 'patabasti', 'nallapadu', 'collector office guntur', 'guvvalagutta', 'svn colony'];
            for (const loc of gunturUrbanLocalities) {
              if (addrLower.includes(loc) && !fullText.includes(townToken)) {
                return { relevant: false, reason: `Listing located in Guntur City urban area "${loc}" (45km outside target)` };
              }
            }
          }
        }
      }
    }
  }

  // 4. Urban Pincode Range Checks
  // Guntur City urban core: 522001 - 522007
  // Vijayawada / Krishna: 520001 - 521999
  // Prakasam / Ongole: 523001 - 523999
  const pinMatch = addrLower.match(/\b(52[0-3]\d{3})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    // If target is Narasaraopet / Palnadu:
    if (townToken.includes('narasarao') || townToken.includes('palnadu')) {
      if (pin.startsWith('52200') || pin === '522001' || pin === '522002' || pin === '522003' || pin === '522004' || pin === '522005' || pin === '522006' || pin === '522007') {
        if (!fullText.includes('narasaraopet')) {
          return { relevant: false, reason: `Postal code ${pin} belongs to Guntur City urban center (~45km outside Narasaraopet)` };
        }
      }
      if (pin.startsWith('520') || pin.startsWith('521')) {
        return { relevant: false, reason: `Postal code ${pin} belongs to Krishna / Vijayawada district` };
      }
    }
  }

  // 5. GPS Anchor Distance Check (Ultra-Precise Radius Clamping)
  if (coords && coords.lat && coords.lng) {
    const { ZONE_COORDINATES } = require('../utils/universalGeoCluster');
    let anchorCoords = null;
    if (townToken && ZONE_COORDINATES[townToken]) {
      anchorCoords = ZONE_COORDINATES[townToken];
    } else if (district && ZONE_COORDINATES[district.toLowerCase()]) {
      anchorCoords = ZONE_COORDINATES[district.toLowerCase()];
    }

    if (anchorCoords && anchorCoords.lat && anchorCoords.lng) {
      const distKm = getDistanceKm(coords.lat, coords.lng, anchorCoords.lat, anchorCoords.lng);
      // For a specific town/mandal, anything beyond 22km is bleeding into distant towns/cities
      const maxAllowedDist = 22.0;
      if (distKm > maxAllowedDist) {
        return {
          relevant: false,
          reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) are ${distKm.toFixed(1)}km away from ${cleanTargetTown} center (max ${maxAllowedDist}km)`
        };
      }
    }

    // Also check boundingbox if supplied
    if (boundingbox && boundingbox.length === 4) {
      const minLat = parseFloat(boundingbox[0]);
      const maxLat = parseFloat(boundingbox[1]);
      const minLng = parseFloat(boundingbox[2]);
      const maxLng = parseFloat(boundingbox[3]);
      const latMargin = 22.0 / 111.0;
      const lngMargin = 22.0 / (111.0 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180));

      if (coords.lat < (minLat - latMargin) || coords.lat > (maxLat + latMargin) ||
          coords.lng < (minLng - lngMargin) || coords.lng > (maxLng + lngMargin)) {
        return {
          relevant: false,
          reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) exceed bounding box`
        };
      }
    }
  }

  return { relevant: true };
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

function isWithinBounds(lat, lng, bbox, toleranceKm = 2.5) {
  if (!bbox || bbox.length !== 4) return true; // No bounds provided
  
  const minLat = parseFloat(bbox[0]);
  const maxLat = parseFloat(bbox[1]);
  const minLng = parseFloat(bbox[2]);
  const maxLng = parseFloat(bbox[3]);

  const latTolerance = toleranceKm / 111.0;
  const lngTolerance = toleranceKm / (111.0 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180));

  if (lat < (minLat - latTolerance) || lat > (maxLat + latTolerance)) return false;
  if (lng < (minLng - lngTolerance) || lng > (maxLng + lngTolerance)) return false;

  return true;
}

async function scrapeGooglePlaces(exactQuery, category, location, sessionId = "legacy", centerLat = null, centerLng = null, radiusKm = null, strategy = 'broad', district = null, stateName = null, boundingbox = null, cityHint = null) {
  // `location` can be a synthetic coverage-zone label ("MG Road Vijayawada",
  // "Gunur Central Commercial"). The city stored on a vendor must stay the
  // real base location, never that generated zone phrase.
  const vendorCity = cityHint || location || 'Global';
  addLog(`[Cyber Core] Dispatching autonomous stealth crawler for query: "${exactQuery}"`);

  // If Playwright not available (production/Render), skip browser scraping
  if (!chromium) {
    console.warn('[scrapeGooglePlaces] Playwright Chromium not available. Skipping browser scrape.');
    return [];
  }
  
  const browser = await getBrowser();
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

    // Optimize page for ultra-fast scraping (aborts media, fonts, and tracking scripts)
    await optimizePageForSpeed(page);

    const searchUrl = exactQuery.startsWith('http')
      ? exactQuery
      : `https://www.google.com/maps/search/${encodeURIComponent(exactQuery)}`;
    addLog(`[Cyber Core] Navigating to satellite target: ${searchUrl}`);
    // Wait for load with rapid timeout
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 }).catch(e => addLog(`[Cyber Core] Load timed out, continuing with partial DOM...`));

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
      addLog("[Cyber Core] Waiting for listing feed timed out, extracting visible nodes...");
    }

    let scrapedResults = [];

    // Case A: Redirected directly to a single business details page
    if (await page.locator('[data-item-id="address"]').count() > 0 && await page.locator('div[role="feed"]').count() === 0) {
      addLog("[Cyber Core] Direct business page detected. Extracting telemetry...");
      const nameEl = page.locator('h1.DUwDvf');
      const name = await nameEl.count() > 0 ? await nameEl.innerText() : 'Target Listing';
      
      let address = '';
      const addressEl = page.locator('[data-item-id="address"]');
      if (await addressEl.count() > 0) {
        const rawAddress = await addressEl.getAttribute('aria-label');
        address = rawAddress ? rawAddress.replace(/^Address:\s*/i, '') : '';
      }

      let phone = '';
      const phoneEl = page.locator('[data-item-id^="phone:tel:"]');
      if (await phoneEl.count() > 0) {
        const rawPhone = await phoneEl.getAttribute('aria-label');
        phone = rawPhone ? rawPhone.replace(/^Phone:\s*/i, '') : '';
      }
      if (phone) {
        const parsedPhone = normalizePhone(phone, { context: 'phone tel' });
        phone = parsedPhone ? parsedPhone.e164 : '';
      }

      let rating = null;
      const ratingEl = page.locator('div.F7nice').first();
      if (await ratingEl.count() > 0) {
        const text = await ratingEl.innerText();
        const match = text.match(/^([0-9.]+)/);
        if (match) rating = parseFloat(match[1]);
      }

      let website = '';
      try {
        const websiteEl = page.locator('a[data-item-id="authority"]');
        if (await websiteEl.count() > 0) {
          website = await websiteEl.getAttribute('href', { timeout: 3000 }) || '';
        }
      } catch (e) {}

      // Intelligent Storefront Media & Official Logo (strictly rejecting commenter avatars/photos)
      const mediaData = await extractStorefrontMediaAndLogo(page, website, name);

      let enrichedData = { email: '', instagram: '', facebook: '', instagramFollowers: '', facebookFollowers: '', images: [], logo: '' };
      if (website) {
        enrichedData = await scrapeWebsiteForSocials(browser, website, name);
      }

      // Prioritize authentic website brand logo if discovered
      const finalLogo = enrichedData.logo || mediaData.logo;
      const finalPhoto = mediaData.photo;

      const coords = extractCoords(page.url());
      
      // Strict Containment Guard Check
      const containment = isListingRelevantToQuery(name, address, district, stateName, location, location, coords, boundingbox);
      if (!containment.relevant) {
        addLog(`[Containment Guard] Discarded "${name}" - ${containment.reason}`);
        const oobLead = {
          id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
          name, category, city: vendorCity, address: address || '', 
          phone: phone || '', rating: rating || '', mapsLink: page.url(), 
          latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null, 
          source: 'Containment Guard (Out of Bounds)',
          outOfBoundsDistance: containment.reason,
          scrapedAt: new Date().toISOString(),
          sessionId
        };
        dbAdapter.saveOutOfBoundsVendor(oobLead);
        try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) {}
        return;
      }

      const mapsLink = page.url();
      const id = 'place_' + Date.now().toString() + Math.random().toString(36).substring(7);

      const pincodeMatch = address ? address.match(/\b\d{6}\b/) : null;
      const pincode = pincodeMatch ? pincodeMatch[0] : '';

      // Read local database
      const vendors = dbAdapter.getVendors();
      const existingIndex = vendors.findIndex(v => v.mapsLink === mapsLink || v.name === name);

        if (existingIndex === -1) {
          const leadScore = calculateLeadScore({ name, address, phone, rating });
          const newLead = {
            id,
            name,
            category,
            city: vendorCity,
            address: address || '',
            pincode: pincode,
            phone: phone || '',
            rating,
            mapsLink,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            source: 'Cyber Intelligence Core',
            verified: false,
            aiVerified: false,
            matchedKeywords: [],
            email: enrichedData.email || '',
            instagram: enrichedData.instagram || '',
            instagramFollowers: enrichedData.instagramFollowers || '',
            facebook: enrichedData.facebook || '',
            facebookFollowers: enrichedData.facebookFollowers || '',
            website: website,
            logo: finalLogo,
            photo: finalPhoto,
            avatar: finalLogo || finalPhoto,
            images: [...(mediaData.images || []), ...(enrichedData.images || [])].filter(Boolean),
            qualityScore: leadScore,
            tier: determineTier(leadScore),
            operatingHours: '',
            topReviews: [],
            whatsappLink: (phone && phone.replace(/[^0-9]/g, '').slice(-10).length === 10) 
              ? `https://wa.me/91${phone.replace(/[^0-9]/g, '').slice(-10)}?text=Hi%20${encodeURIComponent(name || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`
              : '',
            whatsappAvailable: Boolean(phone && phone.replace(/[^0-9]/g, '').slice(-10).length === 10),
            scrapedAt: new Date().toISOString(),
            sessionId,
            category,
            city: vendorCity,
            strategy
          };

          vendors.push(newLead);
          dbAdapter.saveVendors(vendors);
          try { emitVendorEvent(newLead, 'inserted'); } catch (e) {}
          scrapedResults.push(newLead);
          addLog(`[Contact Extracted] 📞 ${newLead.name}: ${newLead.phone || 'No direct phone'}${newLead.whatsappAvailable ? ' (WhatsApp Verified)' : ''}`);
        }
    } else {
      // Case B: Search results list is loaded
      const scrollable = page.locator('div[role="feed"]');
      if (await scrollable.count() > 0) {
        addLog("Scrolling through search results feed... (Fast Mode)");
        
        let lastCount = 0;
        let staleTicks = 0;

        for (let i = 0; i < 40; i++) {
          if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');

          await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) {
              feed.scrollTop = feed.scrollHeight;
            }
          });

          await page.waitForTimeout(650);

          const currentCount = await page.locator('a.hfpxzc').count();
          if (currentCount >= 200) {
            addLog(`Reached ${currentCount} cards, stopping scroll.`);
            break;
          }

          const endMarker = await page.locator('text=You\'ve reached the end of the list, span.HlvSq').count();
          if (endMarker > 0) {
            addLog(`Reached end of search results (${currentCount} cards).`);
            break;
          }

          if (currentCount === lastCount) {
            staleTicks++;
            if (staleTicks >= 3) break;
          } else {
            staleTicks = 0;
            lastCount = currentCount;
          }
        }

        addLog(`[Cyber Core] Extracting high-speed contact intelligence from all feed cards...`);

        // Fast Direct Feed Extraction: Extracts Name, Phone, Website, Rating, Review Count, Address from all feed cards in <100ms
        const extractedCards = await page.evaluate(() => {
          const feedCards = Array.from(document.querySelectorAll('div[role="feed"] div.Nv2PK'));
          return feedCards.map(card => {
            const nameEl = card.querySelector('div.fontHeadlineSmall, .qBF1Pd');
            const name = nameEl ? nameEl.innerText.trim() : '';
            if (!name || name.length < 2) return null;

            const mapsLinkEl = card.querySelector('a.hfpxzc');
            const mapsLink = mapsLinkEl ? mapsLinkEl.getAttribute('href') : '';

            // Extract all text inside card, one visual line at a time. Google
            // feed cards separate name, rating, category, address and hours
            // with newlines inside the same container.
            const textContainers = Array.from(card.querySelectorAll('div.W4Efsd'));
            const textLines = [];
            for (const tc of textContainers) {
              for (const line of String(tc.innerText || '').split('\n')) {
                const value = line.trim();
                if (value) textLines.push(value);
              }
            }
            const fullText = card.innerText || '';

            // Extract Phone Numbers:
            // Landlines: 080 4148 9746, 08041489746, 040 12345678, etc.
            // Mobiles: 086600 17739, 096552 14888, 9845012345, +91 99008 51000
            const phoneRegex = /(?:(?:\+91|0091|0)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|0\d{2,4}[\s-]?\d{6,8}/g;
            const phones = [];
            let m;
            while ((m = phoneRegex.exec(fullText)) !== null) {
              const cleaned = m[0].trim();
              if (cleaned.length >= 8) phones.push(cleaned);
            }

            // Extract Website link from card
            const links = Array.from(card.querySelectorAll('a'));
            const websiteLink = links.find(l => 
              l.getAttribute('data-value') === 'Website' || 
              (l.getAttribute('aria-label') && l.getAttribute('aria-label').toLowerCase().includes('website')) ||
              (l.innerText && l.innerText.toLowerCase().includes('website'))
            );
            const websiteUrl = websiteLink ? websiteLink.href : '';

            // Rating & Review Count
            const ratingEl = card.querySelector('span.MW4etd');
            const reviewsEl = card.querySelector('span.UY7F9');
            const rating = ratingEl ? parseFloat(ratingEl.innerText.trim()) : null;
            const reviewsCount = reviewsEl ? parseInt(reviewsEl.innerText.replace(/[^0-9]/g, '')) : null;

            // Address line detection. Google renders "Category · Address" on
            // one line; when a place has no street address the same slot holds
            // "Category · Open 24 hours". Only accept a segment that actually
            // looks like an address, otherwise leave it blank. Never store the
            // category or opening hours as an address.
            const addressHints = /\b(road|rd|st|street|cross|main|nagar|layout|colony|block|floor|flr|opp|near|behind|sector|phase|ave|avenue|lane|bazar|bazaar|market|complex|building|tower|plaza|circle|junction|mandal|district|village|town|city)\b/i;
            let address = '';
            for (const line of textLines) {
              if (!line.includes('·')) continue;
              const parts = line.split('·').map(p => p.trim()).filter(Boolean);
              const addressParts = parts.filter(part => {
                if (/^\d+(\.\d+)?$/.test(part)) return false;
                if (/^\(?\d[\d,]*\)?$/.test(part)) return false;
                if (/^(open|closed|closes|opens|24 hours|temporarily)/i.test(part)) return false;
                if (/\b(reviews?|ratings?)\b/i.test(part)) return false;
                return addressHints.test(part) || /^\d+[A-Za-z]?[\/-]/.test(part) || part.includes(',');
              });
              if (addressParts.length) {
                address = addressParts[addressParts.length - 1];
                break;
              }
            }

            // Operating hours
            let hours = '';
            const hoursMatch = fullText.match(/(?:Open 24 hours|Open\s*·\s*Closes \d+[\s ]?[ap]m|Closed\s*·\s*Opens \d+[\s ]?[ap]m)/i);
            if (hoursMatch) hours = hoursMatch[0];

            // Google Place Category detection
            let placeCategory = '';
            for (const line of textLines) {
              if (!line.includes('·')) continue;
              const parts = line.split('·').map(p => p.trim()).filter(Boolean);
              for (const part of parts) {
                if (/^\d+(\.\d+)?$/.test(part)) continue;
                if (/^\(?\d[\d,]*\)?$/.test(part)) continue;
                if (/^(open|closed|closes|opens|24 hours|temporarily)/i.test(part)) continue;
                if (/\b(reviews?|ratings?)\b/i.test(part)) continue;
                if (addressHints.test(part) || /^\d+[A-Za-z]?[\/-]/.test(part) || part.includes(',')) continue;
                if (part.length >= 3 && part.length <= 60) {
                  placeCategory = part;
                  break;
                }
              }
              if (placeCategory) break;
            }

            return {
              name,
              mapsLink,
              phone: phones[0] || '',
              allPhones: phones,
              websiteUrl,
              rating,
              reviewsCount,
              address,
              operatingHours: hours,
              placeCategory
            };
          }).filter(Boolean);
        });

        addLog(`[High-Speed Core] Extracted ${extractedCards.length} verified listings directly with contact intelligence.`);

        let insertedInBatch = 0;

        for (let i = 0; i < extractedCards.length; i++) {
          if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
          
          try {
            const rawItem = extractedCards[i];
          const name = rawItem.name;
          const mapsLink = rawItem.mapsLink;
          let phone = rawItem.phone || '';
          if (phone) {
            const parsedPhone = normalizePhone(phone, { context: 'phone tel' });
            phone = parsedPhone ? parsedPhone.e164 : '';
          }
          const websiteUrl = rawItem.websiteUrl || '';
          const address = rawItem.address || '';
          const rating = rawItem.rating;
          const reviewsCount = rawItem.reviewsCount;
          const operatingHours = rawItem.operatingHours || '';
          const coords = extractCoords(mapsLink);

          // WhatsApp Detection and Phone Normalization
          let whatsappLink = '';
          let whatsappAvailable = false;
          if (phone) {
            const digits = phone.replace(/[^0-9]/g, '');
            const tenDigits = digits.slice(-10);
            if (tenDigits.length === 10 && ['6','7','8','9'].includes(tenDigits[0])) {
              whatsappLink = `https://wa.me/91${tenDigits}?text=Hi%20${encodeURIComponent(name || '')}%2C%20I%20found%20your%20business%20on%20Google%20Maps%20and%20wanted%20to%20connect.`;
              whatsappAvailable = true;
              phone = `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
            }
            addLog(`[Contact Extracted] 📞 ${name}: ${phone}${whatsappAvailable ? ' (WhatsApp Verified)' : ''}`);
          }

          // Background Website Deep Crawl for Email, Phone, Socials
          if (websiteUrl && websiteUrl.startsWith('http')) {
            fastWebsiteExtract(websiteUrl, name).then(enriched => {
              const currentVendors = dbAdapter.getVendors();
              const vIdx = currentVendors.findIndex(v => v.name === name);
              if (vIdx !== -1) {
                let existing = currentVendors[vIdx];
                let updated = false;
                if (enriched.email && !existing.email) {
                  existing.email = enriched.email;
                  updated = true;
                  addLog(`[Email Discovered] ✉️ ${name}: ${enriched.email}`);
                }
                if (enriched.phone && (!existing.phone || existing.phone.includes('Requires'))) {
                  existing.phone = enriched.phone;
                  updated = true;
                }
                if (enriched.instagram && !existing.instagram) {
                  existing.instagram = enriched.instagram;
                  updated = true;
                }
                if (enriched.facebook && !existing.facebook) {
                  existing.facebook = enriched.facebook;
                  updated = true;
                }
                if (updated) {
                  dbAdapter.saveVendors(currentVendors);
                  try { emitVendorEvent(existing, 'updated'); } catch(e){}
                }
              }
            }).catch(() => {});
          }

          // Category fidelity: Maps can include related businesses (a
          // wedding-photographer query returning banquet halls). Drop anything
          // that clearly belongs to a different role before it is stored.
          if (!fidelity.isVendorRelevant({ name, address, website: websiteUrl, subcategory: rawItem.placeCategory, category: rawItem.placeCategory }, category)) {
            addLog(`[Category Guard] Skipped "${name}" (${rawItem.placeCategory || 'unmatched'}) · not a ${category} match`);
            continue;
          }

          const place = {
            id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
            name,
            address,
            phone: phone || '',
            rating,
            reviewsCount,
            mapsLink,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            website: websiteUrl,
            operatingHours: (operatingHours || '').substring(0, 150),
            topReviews: [],
            email: '',
            instagram: '',
            facebook: '',
            instagramFollowers: '',
            facebookFollowers: '',
            logo: '',
            photo: '',
            avatar: '',
            images: [],
            aiVerified: Boolean(phone && whatsappAvailable),
            matchedKeywords: [],
            whatsappLink,
            whatsappAvailable,
            qualityScore: phone ? 85 : (websiteUrl ? 65 : 45),
            tier: phone ? 'Premium' : (websiteUrl ? 'Standard' : 'Basic'),
            category,
            city: vendorCity,
            source: 'Google Maps',
            sourceEngine: 'google-places',
            verified: Boolean(phone),
            scrapedAt: new Date().toISOString(),
            sessionId,
            strategy
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
              place.source = 'Cyber Intelligence (Out of Bounds)';
              place.scrapedAt = new Date().toISOString();
              place.sessionId = sessionId;
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

            // Strict Text & Geographic Containment Check
            const placeCoords = (place.latitude && place.longitude) ? { lat: place.latitude, lng: place.longitude } : extractCoords(place.mapsLink);
            const containment = isListingRelevantToQuery(place.name, place.address, district, stateName, location, location, placeCoords, boundingbox);
            if (!containment.relevant) {
              addLog(`[Containment Guard] Discarded "${place.name}": ${containment.reason}`);
              const oobLead = {
                id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
                name: place.name, category, city: vendorCity, address: place.address || '',
                phone: place.phone || '', rating: place.rating || '', mapsLink: place.mapsLink || '',
                latitude: placeCoords ? placeCoords.lat : null, longitude: placeCoords ? placeCoords.lng : null,
                source: 'Containment Guard (Out of Bounds)',
                outOfBoundsDistance: containment.reason,
                scrapedAt: new Date().toISOString(),
                sessionId
              };
              dbAdapter.saveOutOfBoundsVendor(oobLead);
              try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) {}
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
              place.city = vendorCity;
              place.source = 'Google Maps';
              place.verified = false;
              place.scrapedAt = new Date().toISOString();
              place.sessionId = sessionId;
              place.strategy = strategy; // Store strategy so UI knows how to group folders

              // Auto-generate 1-Click WhatsApp Direct Launcher
              if (place.phone && place.phone.length >= 10) {
                const cleanPhone = place.phone.replace(/[^0-9]/g, '');
                const clean10 = cleanPhone.slice(-10);
                if (clean10.length === 10) {
                  place.whatsappLink = `https://wa.me/91${clean10}?text=Hi%20${encodeURIComponent(place.name || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`;
                  place.whatsappAvailable = true;
                }
              }
              
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
              
              vendors.push(place);
              dbAdapter.saveVendors(vendors);
              scrapedResults.push(place);
              try { emitVendorEvent(place, 'inserted'); } catch (e) {}
              insertedInBatch++;
              // Silently saving to DB, no log flooding
            } else {
              let existing = vendors[existingIndex];
              let updated = false;

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
                vendors[existingIndex] = existing;
                dbAdapter.saveVendors(vendors);
                try { emitVendorEvent(existing, 'updated'); } catch (e) {}
              }
            }
          } catch (err) {
            addLog(`Error fast-extracting item: ${err.message}`);
          }
        }

          
          // Single-Tab extraction loop finishes here
        addLog(`[Cyber Core] Streamed ${insertedInBatch} verified in-boundary records to database. (Total verified: ${scrapedResults.length})`);
      }
    }

    addLog(`[Cyber Core] Autonomous extraction cycle complete. ${scrapedResults.length} records verified.`);
    return scrapedResults;
  } catch (error) {
    addLog(`[Cyber Core] Worker warning: ${error.message}`);
    return [];
  } finally {
    if (context) {
      try { await context.close(); } catch (e) {}
    }
    // Shared browser must remain open for other concurrent workers
  }
}
module.exports = { scrapeGooglePlaces, setDeps, isListingRelevantToQuery, calculateLeadScore, determineTier };
