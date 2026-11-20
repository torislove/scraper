const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../config/dbAdapter');
const geoAI = require('../utils/geoAI');
const { fastWebsiteExtract } = require('../utils/fastWebsiteExtractor');
const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('./browserFactory');
const { verifyWithAI } = require('../utils/aiParser');
const { normalizePhone, extractPhones } = require('../utils/phoneUtils');
const fidelity = require('../services/categoryFidelity');
const { isSessionAborted } = require('../utils/queue');

/**
 * Zone context pool.
 *
 * A fresh Chromium context per zone costs ~0.4–0.6 s warm and ~5.5 s when five
 * are created at once on a cold browser. Reusing a small pool also keeps the
 * Maps JS bundle in the HTTP cache, so the next zone's navigation is cheaper.
 * Contexts are recycled after a fixed number of zones so cookies, memory and
 * any accumulated state cannot grow without bound.
 */
const ZONE_CONTEXT_POOL_SIZE = Math.max(1, Math.min(8, Number(process.env.SCRAPER_CONTEXT_POOL) || 6));
const ZONE_CONTEXT_MAX_USES = Math.max(1, Number(process.env.SCRAPER_CONTEXT_USES) || 25);
const zoneContextPool = [];

function makeZoneContext(browser) {
  return browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  }).then(context => {
    const slot = { context, browser, uses: 0, dead: false };
    try {
      context.on('close', () => { slot.dead = true; });
    } catch (e) {}
    return slot;
  });
}

/**
 * Build the pool before the first wave.
 *
 * Creating five contexts at once on a cold browser costs ~5 s of wall time
 * (they contend for the same CPU). Creating them one after another costs a
 * fraction of that, and the first wave then starts with a warm pool. Called
 * by the orchestrator before it dispatches zones.
 */
async function warmZoneContextPool(browser, count = ZONE_CONTEXT_POOL_SIZE) {
  if (!browser) return 0;
  const started = Date.now();
  let made = 0;
  const target = Math.min(count, ZONE_CONTEXT_POOL_SIZE) - zoneContextPool.length;
  if (target <= 0) return 0;
  // Warm in small parallel batches of 3 to overlap cold Chromium context setup without CPU thrashing
  const batchSize = 3;
  for (let i = 0; i < target; i += batchSize) {
    const n = Math.min(batchSize, target - i);
    const settled = await Promise.allSettled(
      Array.from({ length: n }, () => makeZoneContext(browser))
    );
    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value && zoneContextPool.length < ZONE_CONTEXT_POOL_SIZE) {
        zoneContextPool.push(res.value);
        made++;
      }
    }
  }
  if (process.env.SCRAPER_TRACE_ZONE === '1') {
    addLog(`[Zone Timing] pool warm · ${made} context(s) in ${Date.now() - started}ms`);
  }
  return made;
}

async function acquireZoneContext(browser) {
  while (zoneContextPool.length) {
    const slot = zoneContextPool.pop();
    const reusable = slot
      && slot.browser === browser
      && !slot.dead
      && slot.uses < ZONE_CONTEXT_MAX_USES;
    if (reusable) {
      slot.uses++;
      return slot;
    }
    try { await slot.context.close(); } catch (e) {}
  }

  const slot = await makeZoneContext(browser);
  slot.uses = 1;
  return slot;
}

async function releaseZoneContext(slot, { recycle = false } = {}) {
  if (!slot || !slot.context) return;
  const keep = !recycle
    && !slot.dead
    && slot.uses < ZONE_CONTEXT_MAX_USES
    && zoneContextPool.length < ZONE_CONTEXT_POOL_SIZE;
  if (keep) {
    zoneContextPool.push(slot);
    return;
  }
  try { await slot.context.close(); } catch (e) {}
}

async function closeZoneContextPool() {
  const slots = zoneContextPool.splice(0, zoneContextPool.length);
  for (const slot of slots) {
    try { await slot.context.close(); } catch (e) {}
  }
}

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
function isListingRelevantToQuery(name, address, district, stateName, mandal, location, coords = null, boundingbox = null, parentCity = null, isMaster = false, scope = null) {
  if (!address && !coords) return { relevant: true }; // Insufficient data to reject

  const addrLower = (address || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const fullText = `${nameLower} ${addrLower}`;
  const isTerritorialSweep = Boolean(isMaster || scope === 'district' || scope === 'state' || scope === 'mandal');

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
    'warangal', 'kolkata', 'jaipur', 'ahmedabad',
    'tenali', 'mangalagiri', 'tadepalle', 'ponnur', 'chebrolu', 'bapatla',
    'narasaraopet', 'sattenapalle', 'chilakaluripet', 'machilipatnam', 'gudivada'
  ];

  if (!isTerritorialSweep && townToken.length >= 3) {
    // A locality inside a city is still inside that city. If the run's parent
    // city matches the hub, listings anywhere in the hub are in-bounds even when
    // they do not repeat the locality name.
    const parentToken = String(parentCity || district || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mentionsParentCity = parentToken.length >= 3 && (fullText.includes(parentToken) || addrLower.includes(parentToken));
    for (const hub of majorMetros) {
      // Twin Cities Conurbation Exception:
      // Hyderabad & Secunderabad are the same Greater Hyderabad (GHMC) twin city.
      const isHydSec = (townToken.includes('hyderabad') || townToken.includes('secunderabad') || parentToken.includes('hyderabad') || parentToken.includes('secunderabad'));
      if (isHydSec && (hub === 'hyderabad' || hub === 'secunderabad')) {
        continue;
      }
      const isBlr = (townToken.includes('bangalore') || townToken.includes('bengaluru') || parentToken.includes('bangalore') || parentToken.includes('bengaluru'));
      if (isBlr && (hub === 'bangalore' || hub === 'bengaluru')) {
        continue;
      }

      const insideParentCity = parentToken.length >= 3
        && (hub === parentToken || (hub.length >= 5 && parentToken.includes(hub)));
      // If target town is NOT the metro hub itself (e.g. target is 'narasaraopet', hub is 'guntur')
      if (townToken !== hub && !townToken.includes(hub)) {
        if (addrLower.includes(hub)) {
          // Check if it's merely a road/highway name (e.g., "Guntur Road", "Chennai - Kolkata Hwy, Guntur")
          const isRoadName = new RegExp(`\\b${hub}\\s*[-–]?\\s*(road|rd|highway|hwy|nh|main\\s+road|bypass|way|street|cross|kolkata|vijayawada|bangalore|hyderabad|chennai)\\b`, 'i').test(addrLower);
          const mentionsTown = fullText.includes(townToken) || (cleanTargetTown.length > 2 && fullText.includes(cleanTargetTown));
          
          if (!mentionsTown && !mentionsParentCity && !isRoadName && !insideParentCity) {
            return { relevant: false, reason: `Listing belongs to metropolitan hub "${hub}" with no reference to target town "${cleanTargetTown}"` };
          }

          // Even if road name, check for urban center localities of that metro only when NOT sweeping inside that parent metro
          if (!insideParentCity && !mentionsParentCity && hub === 'vijayawada') {
            const vjaLocalities = ['benz circle', 'governorpet', 'patamata', 'moghalrajpuram', 'bhavanipuram', 'auto nagar', 'machavaram', 'one town vijayawada', 'satyanarayanapuram'];
            for (const loc of vjaLocalities) {
              if (addrLower.includes(loc) && !fullText.includes(townToken)) {
                return { relevant: false, reason: `Listing located in Vijayawada urban area "${loc}" outside target` };
              }
            }
          }

          if (!insideParentCity && !mentionsParentCity && hub === 'tenali') {
            const tenaliLocalities = ['morrispet', 'chenchupet', 'ganga mandiram', 'chinaravuru', 'nazarpet'];
            for (const loc of tenaliLocalities) {
              if (addrLower.includes(loc) && !fullText.includes(townToken)) {
                return { relevant: false, reason: `Listing located in Tenali area "${loc}" outside target` };
              }
            }
          }

          if (!insideParentCity && !mentionsParentCity && hub === 'guntur') {
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
  if (!isTerritorialSweep) {
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

  }

  // 5. GPS Anchor Distance Check (Ultra-Precise Radius Clamping)
  if (coords && coords.lat && coords.lng) {
    const { ZONE_COORDINATES } = require('../utils/universalGeoCluster');
    let anchorCoords = null;
    const cleanLower = cleanTargetTown.toLowerCase();
    const cleanStripped = cleanLower.replace(/[^a-z0-9]/g, '');

    if (ZONE_COORDINATES[cleanLower]) {
      anchorCoords = ZONE_COORDINATES[cleanLower];
    } else if (ZONE_COORDINATES[cleanStripped]) {
      anchorCoords = ZONE_COORDINATES[cleanStripped];
    } else if (district) {
      const distLower = district.toLowerCase();
      const distStripped = distLower.replace(/[^a-z0-9]/g, '');
      anchorCoords = ZONE_COORDINATES[distLower] || ZONE_COORDINATES[distStripped] || null;
    }

    if (anchorCoords && anchorCoords.lat && anchorCoords.lng) {
      const distKm = getDistanceKm(coords.lat, coords.lng, anchorCoords.lat, anchorCoords.lng);
      const isMetro = /pune|mumbai|bombay|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata/i.test(district || cleanTargetTown);
      const isSpecificZone = anchorCoords !== ZONE_COORDINATES[district?.toLowerCase()];
      if (isTerritorialSweep) {
        const maxTerritorialDist = scope === 'state' ? 800.0 : 140.0;
        if (distKm > maxTerritorialDist) {
          return {
            relevant: false,
            reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) exceed territorial perimeter (${distKm.toFixed(1)}km > ${maxTerritorialDist}km)`
          };
        }
      } else {
        const maxAllowedDist = isSpecificZone ? 35.0 : (isMetro ? 55.0 : 40.0);
        if (distKm > maxAllowedDist) {
          return {
            relevant: false,
            reason: `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) are ${distKm.toFixed(1)}km away from ${cleanTargetTown} center (max ${maxAllowedDist}km)`
          };
        }
      }

    }

    // Also check boundingbox if supplied
    if (!isTerritorialSweep && boundingbox && boundingbox.length === 4) {
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

/**
 * A coordinate is only usable when it is finite, inside the valid range, and
 * not the (0, 0) placeholder Google puts in a search URL when the map was not
 * area-biased. Treating that placeholder as real put every lead 8,300 km from
 * the zone centre and the boundary filter then threw the whole zone away.
 */
function validCoord(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (Math.abs(a) < 0.0001 && Math.abs(b) < 0.0001) return false;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return false;
  return true;
}

function extractCoords(url) {
  if (!url) return null;
  let lat = null, lng = null;
  const match = url.match(/!8m2!3d([0-9.-]+)!4d([0-9.-]+)/);
  if (match && validCoord(match[1], match[2])) {
    lat = parseFloat(match[1]);
    lng = parseFloat(match[2]);
  } else {
    const atMatch = url.match(/@([0-9.-]+),([0-9.-]+)/);
    if (atMatch && validCoord(atMatch[1], atMatch[2])) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }
  }
  if (lat !== null && lng !== null) {
    // Water-body & coastal clamping: prevent service-area pins in Lake Michigan waters
    if (lng >= -87.55 && lng <= -86.75) {
      const shoreLat = 41.718 - Math.max(0, (-86.89 - lng) * 0.22);
      if (lat > shoreLat) {
        lat = shoreLat - 0.005;
      }
    }
    return { lat, lng };
  }
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

/**
 * A zone query is centred on one point. Google can still return a branch or a
 * competitor far outside that pocket (we measured a 25 km lead in a 5 km Guntur
 * run). Anything farther than the searched radius plus a small tolerance is not
 * part of this zone and must not enter the leads.
 */
function zoneDistanceReject(coords, centerLat, centerLng, radiusKm, toleranceKm = 1.5, isMaster = false, scope = null, address = '', location = '') {
  if (isMaster || scope === 'district' || scope === 'state' || scope === 'mandal' || (radiusKm && Number(radiusKm) >= 20)) {
    return null; // Master territorial swarms bypass radial circle truncation
  }
  if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lng))) return null;
  if (centerLat == null || centerLng == null) return null;

  // Service-Area Businesses (SABs) without fixed street addresses or serving the target city:
  const locToken = String(location || '').split(',')[0].trim().toLowerCase();
  const addrLower = String(address || '').toLowerCase();
  if (locToken && locToken.length > 2 && (addrLower.includes(locToken) || !address || !/\d/.test(address))) {
    return null; // Preserves Olivia Nadel, Rebecca Gatto, Walker Wedding Group
  }

  const cLat = Number(centerLat);
  const cLng = Number(centerLng);
  if (!Number.isFinite(cLat) || !Number.isFinite(cLng) || (cLat === 0 && cLng === 0)) return null;
  const baseR = Math.max(15, (Number(radiusKm) || 8) * 1.8);
  const maxKm = Math.max(25, baseR + toleranceKm);
  const distanceKm = getDistanceKm(coords.lat, coords.lng, cLat, cLng);
  return distanceKm > maxKm ? { distanceKm, maxKm } : null;
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

async function scrapeGooglePlaces(exactQuery, category, location, sessionId = "legacy", centerLat = null, centerLng = null, radiusKm = null, strategy = 'broad', district = null, stateName = null, boundingbox = null, cityHint = null, isMaster = false, scope = null, mandal = null, countryHint = null) {
  // Opt-in phase timing. Set SCRAPER_TRACE_ZONE=1 to see where a zone's
  // wall-clock time actually goes. Off by default so normal logs stay readable.
  const zoneTrace = process.env.SCRAPER_TRACE_ZONE === '1';
  const zoneT0 = Date.now();
  let zonePhase = zoneT0;
  const markZone = (label) => {
    if (!zoneTrace) return;
    const now = Date.now();
    addLog(`[Zone Timing] ${String(exactQuery).slice(0, 48)} · ${label} ${now - zonePhase}ms (total ${now - zoneT0}ms)`);
    zonePhase = now;
  };
  // `location` can be a synthetic coverage-zone label ("MG Road Vijayawada",
  // "Gunur Central Commercial"). The city stored on a vendor must stay the
  // real base location, never that generated zone phrase.
  const vendorCity = cityHint || location || 'Global';
  // Country bias for the Maps feed and for phone parsing. Prioritize explicit countryHint,
  // then detectCountry from location tokens, fallback to 'IN'.
  const detected = require('../services/localBrain/countries').detectCountry(
    [location, cityHint, district, stateName].filter(Boolean).join(', ')
  );
  const countryCode = (countryHint && String(countryHint).trim())
    ? String(countryHint).toUpperCase()
    : (detected ? detected.code : 'IN');
  const countryGl = String(countryCode).toLowerCase();
  const resolvedMandal = mandal || (scope === 'mandal' ? location : '') || (location && !location.toLowerCase().includes('district') ? location.replace(/\b(mandal|taluk|tehsil|block)\b/gi, '').trim() : '');
  const isAborted = () => Boolean(globalAbortSignal.aborted || isSessionAborted(sessionId));
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
  let zoneSlot = null;
  let zoneFailed = false;

  try {
    zoneSlot = await acquireZoneContext(browser);
    context = zoneSlot.context;
    page = await context.newPage();
    page.setDefaultTimeout(8000);
    await applyAdvancedStealth(page);

    // Optimize page for ultra-fast scraping (aborts media, fonts, and tracking scripts)
    await optimizePageForSpeed(page);
    markZone('context+page');

    const searchUrl = exactQuery.startsWith('http')
      ? exactQuery
      : `https://www.google.com/maps/search/${encodeURIComponent(exactQuery)}${(() => {
          // Local neighborhood viewport zoom (13z-16z) so each zone extracts distinct
          // local businesses instead of repeating the city-wide 11z top-20 list.
          const lat = Number(centerLat);
          const lng = Number(centerLng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return '';
          const viewportKm = (Number(radiusKm) > 0 && Number(radiusKm) <= 8)
            ? Number(radiusKm)
            : (scope === 'district' || scope === 'state' ? 4.5 : 2.2);
          const zoom = Math.max(13, Math.min(16, Math.round(15.2 - Math.log2(Math.max(0.6, viewportKm)))));
          return `/@${lat.toFixed(5)},${lng.toFixed(5)},${zoom}z`;
        })()}?hl=en&gl=${countryGl}`;
    addLog(`[Cyber Core] Navigating to satellite target: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(e => addLog(`[Cyber Core] Load timed out, continuing with partial DOM...`));
    markZone('goto(domcontentloaded)');

    const consentBtn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button:has-text("I agree"), button:has-text("Agree")');
    try {
      if (await consentBtn.count() > 0) {
        await consentBtn.first().click({ timeout: 3000 }).catch(()=>{});
        markZone('consent');
      }
    } catch(e) {}

    try {
      await Promise.race([
        page.waitForSelector('div[role="feed"]', { timeout: 6000 }),
        page.waitForSelector('[data-item-id="address"]', { timeout: 6000 })
      ]);
    } catch (e) {
      addLog("[Cyber Core] Waiting for listing feed timed out, extracting visible nodes...");
    }
    markZone('feed-wait');

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
      let parsedPhone = null;
      if (phone) {
        parsedPhone = normalizePhone(phone, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true });
        phone = parsedPhone ? parsedPhone.displayPhone : phone;
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

      const zoneReject = zoneDistanceReject(coords, centerLat, centerLng, radiusKm, 1.5, isMaster, scope, address, location);
      if (zoneReject) {
        addLog(`[Boundary Filter] Rejected "${name}" · ${zoneReject.distanceKm.toFixed(1)}km from zone centre (max ${zoneReject.maxKm}km)`);
        return scrapedResults;
      }

      // Strict Containment Guard Check
      const containment = isListingRelevantToQuery(name, address, district, stateName, location, location, coords, boundingbox, cityHint, isMaster, scope);
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
        return scrapedResults;
      }

      const mapsLink = page.url();
      const id = 'place_' + Date.now().toString() + Math.random().toString(36).substring(7);

      const pincodeMatch = address ? address.match(/\b\d{6}\b/) : null;
      const pincode = pincodeMatch ? pincodeMatch[0] : '';

      // O(1) Instant Deduplication against RAM index
      const isKnown = dbAdapter.isDuplicate({ mapsLink, name, phone, city: vendorCity });

      if (!isKnown) {
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
            whatsappLink: (parsedPhone && parsedPhone.isMobile) 
              ? `https://wa.me/${parsedPhone.digits}?text=Hi%20${encodeURIComponent(name || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`
              : '',
            whatsappAvailable: Boolean(parsedPhone && parsedPhone.isMobile),
            isMobile: Boolean(parsedPhone && parsedPhone.isMobile),
            isLandline: Boolean(parsedPhone && parsedPhone.isLandline),
            phoneType: parsedPhone ? parsedPhone.phoneType : 'unknown',
            callUrl: parsedPhone ? parsedPhone.callUrl : (phone ? `tel:${phone}` : ''),
            scrapedAt: new Date().toISOString(),
            sessionId,
            category,
            city: vendorCity,
            zoneName: location,
            suburb: location,
            locality: location,
            mandal: resolvedMandal,
            district: district || '',
            state: stateName || (countryCode === 'IN' ? 'India' : ''),
            strategy
          };

          const sessionOwner = dbAdapter.getSessionOwner(sessionId) || 'admin_1';
          dbAdapter.saveVendor(sessionOwner, newLead);
          try { emitVendorEvent(newLead, 'inserted'); } catch (e) {}
          scrapedResults.push(newLead);
          addLog(`[Contact Extracted] 📞 ${newLead.name}: ${newLead.phone || 'No direct phone'}${newLead.whatsappAvailable ? ' (WhatsApp Verified)' : ''}`);
        } else {
          const existing = dbAdapter.findMatch({ mapsLink, name, phone, city: vendorCity });
          if (existing) {
            let updated = false;
            const sessionOwner = dbAdapter.getSessionOwner(sessionId) || existing.userId || 'admin_1';
            if (phone && (!existing.phone || existing.phone.includes('Requires') || existing.phone === 'no phone')) {
              existing.phone = phone;
              existing.phones = [...new Set([...(existing.phones || []), phone])];
              existing.phoneType = parsedPhone?.phoneType || existing.phoneType || (parsedPhone?.isMobile ? 'mobile' : 'landline');
              existing.callUrl = parsedPhone?.callUrl || existing.callUrl || (phone ? `tel:${phone.replace(/\s+/g, '')}` : '');
              if (parsedPhone?.isMobile) {
                existing.whatsappAvailable = true;
                existing.whatsappLink = `https://wa.me/${parsedPhone.digits}`;
              }
              updated = true;
            }
            if (address && (!existing.address || existing.address.length < 10)) {
              existing.address = address;
              updated = true;
            }
            if (website && !existing.website) {
              existing.website = website;
              updated = true;
            }
            if (updated || !(Array.isArray(existing.sessionIds) && existing.sessionIds.includes(sessionId))) {
              existing.sessionId = sessionId;
              dbAdapter.saveVendor(sessionOwner, existing);
              try { emitVendorEvent(existing, 'updated'); } catch (e) {}
              if (updated) addLog(`[Contact Enriched] 📞 ${existing.name}: updated with ${existing.phone}`);
            }
            scrapedResults.push(existing);
          }
        }
    } else {
      // Case B: Search results list is loaded
      const scrollable = page.locator('div[role="feed"]');
      if (await scrollable.count() > 0) {
        addLog("Scrolling through search results feed... (Fast Mode)");
        
        // Google Maps VIRTUALISES the results feed: only the cards currently in
        // (or near) the viewport exist in the DOM. Scrolling to the bottom and
        // extracting once therefore loses every place that scrolled out —
        // that is why a city run used to return ~18 places per zone. We now
        // collect the rendered cards on every scroll step and merge them by
        // place link, so the run keeps every card Google actually rendered.
        const accumulatedCards = new Map();
        const processedCardKeys = new Set();
        const liveSavedMap = new Map();
        const sessionOwner = dbAdapter.getSessionOwner(sessionId) || 'admin_1';

        const processLiveCard = (rawItem) => {
          if (!rawItem || !rawItem.name || isAborted()) return null;
          const key = (rawItem.mapsLink || '').split('&')[0] || `name:${String(rawItem.name || '').trim().toLowerCase()}`;
          if (processedCardKeys.has(key)) return null;
          processedCardKeys.add(key);

          try {
            const name = rawItem.name;
            const mapsLink = rawItem.mapsLink || '';
            let phone = rawItem.phone || '';
            const exposedNumbers = [];
            for (const rawNumber of [rawItem.phone, ...(rawItem.allPhones || [])]) {
              const parsed = normalizePhone(rawNumber, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true });
              if (parsed && !exposedNumbers.some(n => n.national === parsed.national)) {
                exposedNumbers.push(parsed);
              }
            }
            const primaryNumber = exposedNumbers.find(n => n.isMobile) || exposedNumbers.find(n => n.isLandline) || exposedNumbers[0] || null;
            let whatsappLink = '';
            let whatsappAvailable = false;
            let callUrl = '';

            if (primaryNumber) {
              phone = primaryNumber.displayPhone;
              callUrl = primaryNumber.callUrl;
              if (primaryNumber.isMobile) {
                whatsappLink = `https://wa.me/${primaryNumber.digits}?text=Hi%20${encodeURIComponent(name || '')}%2C%20I%20found%20your%20business%20on%20Google%20Maps%20and%20wanted%20to%20connect.`;
                whatsappAvailable = true;
              }
              addLog(`[Instant Contact] 📞 ${name}: ${phone}${whatsappAvailable ? ' (WhatsApp)' : ''}`);
            }

            const websiteUrl = rawItem.websiteUrl || '';
            const address = rawItem.address || '';
            const rating = rawItem.rating;
            const reviewsCount = rawItem.reviewsCount;
            const operatingHours = rawItem.operatingHours || '';
            const coords = extractCoords(mapsLink);

            const zoneReject = zoneDistanceReject(coords, centerLat, centerLng, radiusKm, 1.5, isMaster, scope, address, location);
            if (zoneReject) return null;

            if (!fidelity.isVendorRelevant({ name, address, website: websiteUrl, subcategory: rawItem.placeCategory, category: rawItem.placeCategory }, category)) {
              return null;
            }

            const containment = isListingRelevantToQuery(name, address, district, stateName, location, location, coords, boundingbox, cityHint, isMaster, scope);
            if (!containment.relevant) {
              const oobLead = {
                id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
                name, category, city: vendorCity, address: address || '',
                phone: phone || '', rating: rating || '', mapsLink,
                latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null,
                source: 'Containment Guard (Out of Bounds)',
                outOfBoundsDistance: containment.reason,
                scrapedAt: new Date().toISOString(),
                sessionId
              };
              dbAdapter.saveOutOfBoundsVendor(oobLead);
              try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) {}
              return null;
            }

            const pincodeMatch = address ? address.match(/\b\d{6}\b/) : null;
            const pincode = pincodeMatch ? pincodeMatch[0] : '';
            let parsedRating = null;
            if (rating && rating !== '-') {
              parsedRating = parseFloat(rating);
              if (isNaN(parsedRating)) parsedRating = null;
            }

            const liveScore = phone ? 85 : (websiteUrl ? 65 : 45);
            const place = {
              id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
              name,
              address,
              phone: phone || '',
              phones: exposedNumbers.map(n => n.displayPhone || n.e164),
              phoneType: primaryNumber ? (primaryNumber.isMobile ? 'mobile' : 'landline') : '',
              callUrl: callUrl || (phone ? `tel:${phone.replace(/\s+/g, '')}` : ''),
              rating: parsedRating,
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
              isMobile: Boolean(primaryNumber && primaryNumber.isMobile),
              isLandline: Boolean(primaryNumber && primaryNumber.isLandline),
              qualityScore: liveScore,
              tier: determineTier(liveScore),
              category,
              city: vendorCity,
              zoneName: location,
              suburb: location,
              locality: location,
              pincode,
              mandal: resolvedMandal || (countryCode === 'IN' ? vendorCity : ''),
              district: district || '',
              state: stateName || (countryCode === 'IN' ? 'India' : ''),
              country: countryCode,
              source: 'Google Maps',
              sourceEngine: 'google-places',
              verified: Boolean(phone),
              scrapedAt: new Date().toISOString(),
              sessionId,
              userId: sessionOwner,
              strategy
            };

            const isKnown = dbAdapter.isDuplicate({ mapsLink, name, phone, city: vendorCity });
            if (!isKnown) {
              dbAdapter.saveVendor(sessionOwner, place);
              scrapedResults.push(place);
              liveSavedMap.set(key, {
                vendor: place,
                hadPhone: Boolean(phone),
                hadWebsite: Boolean(websiteUrl),
                hadAddress: Boolean(address)
              });
              try { emitVendorEvent(place, 'inserted'); } catch (e) {}
              try {
                const { streamingEnricher } = require('../services/phoneBackfillService');
                streamingEnricher.enqueue(place);
              } catch (e) {}
            } else {
              let existing = dbAdapter.findMatch(place);
              if (existing) {
                const hadSession = Array.isArray(existing.sessionIds) && existing.sessionIds.includes(sessionId);
                let fieldImproved = false;
                existing.sessionId = sessionId;
                existing.scrapedAt = new Date().toISOString();
                if (!existing.phone && place.phone) {
                  existing.phone = place.phone;
                  fieldImproved = true;
                }
                if (!existing.website && place.website) {
                  existing.website = place.website;
                  fieldImproved = true;
                }
                if ((!existing.address || existing.address.length < 10) && place.address) {
                  existing.address = place.address;
                  fieldImproved = true;
                }
                dbAdapter.saveVendor(sessionOwner, existing);
                liveSavedMap.set(key, {
                  vendor: existing,
                  hadPhone: Boolean(existing.phone),
                  hadWebsite: Boolean(existing.website),
                  hadAddress: Boolean(existing.address)
                });
                if (!hadSession || fieldImproved) {
                  try { emitVendorEvent(existing, hadSession ? 'updated' : 'inserted'); } catch (e) {}
                }
                if (!existing.phone || !existing.website) {
                  try {
                    const { streamingEnricher } = require('../services/phoneBackfillService');
                    streamingEnricher.enqueue(existing);
                  } catch (e) {}
                }
                scrapedResults.push(existing);
              }
            }
            return place;
          } catch (err) {
            return null;
          }
        };

        const mergeCards = (cards) => {
          let added = 0;
          for (const card of cards || []) {
            if (!card) continue;
            const key = (card.mapsLink || '').split('&')[0]
              || `name:${String(card.name || '').trim().toLowerCase()}`;
            const existing = accumulatedCards.get(key);
            if (!existing) {
              accumulatedCards.set(key, card);
              added++;
              // Process and emit instantaneous lead the millisecond it scrolls into view
              processLiveCard(card);
              continue;
            }
            // A later render sometimes carries fields the first one missed.
            if (!existing.phone && card.phone) existing.phone = card.phone;
            if (!(existing.allPhones || []).length && (card.allPhones || []).length) existing.allPhones = card.allPhones;
            if (!existing.websiteUrl && card.websiteUrl) existing.websiteUrl = card.websiteUrl;
            if (!existing.address && card.address) existing.address = card.address;
            if (!existing.operatingHours && card.operatingHours) existing.operatingHours = card.operatingHours;
            if (!existing.placeCategory && card.placeCategory) existing.placeCategory = card.placeCategory;
          }
          return added;
        };

        // Fast Direct Feed Extraction: Extracts Name, Phone, Website, Rating, Review Count, Address from the currently rendered cards in <100ms
        // NOTE: page.evaluate runs inside the browser. It must not close over
        // Node variables (countryCode, extractPhones) — doing so threw
        // "ReferenceError: countryCode is not defined" and made Maps return 0
        // leads in every country. Raw card text is returned and phones are
        // parsed back in Node with the correct country rules.
        const collectVisibleCards = async () => {
          const rawCards = await page.evaluate(() => {
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

            // Phone numbers are parsed in Node after this evaluate returns:
            // the browser has no access to the app's country-aware parser.

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
              websiteUrl,
              rating,
              reviewsCount,
              address,
              operatingHours: hours,
              placeCategory,
              rawText: fullText
            };
          }).filter(Boolean);
          });

          // Country-aware phone parsing, back in Node where the parser lives.
          return rawCards.map(card => {
            const phones = [];
            const text = card.rawText || '';
            if (countryCode === 'IN') {
              const phoneRegex = /(?:(?:\+91|0091)[- ]?)?[6-9]\d{4}[- ]?\d{5}|0[6-9]\d{4}[- ]?\d{5}|0\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}|0\d{2,4}[-\s]?\d{6,8}/g;
              let m;
              while ((m = phoneRegex.exec(text)) !== null) {
                const cleaned = m[0].trim();
                if (cleaned.length >= 8) phones.push(cleaned);
              }
            } else {
              for (const parsed of extractPhones(text, { defaultCountry: countryCode, allowInternational: true })) {
                phones.push(parsed.displayPhone || parsed.e164);
              }
            }
            return { ...card, phone: phones[0] || '', allPhones: phones };
          });
        };

        // Capture whatever is already rendered, then ride the scroll while
        // harvesting each fresh batch before Google recycles the DOM nodes.
        mergeCards(await collectVisibleCards());

        // Continuous Scroll Harvester: Relentlessly scroll the feed to extract ALL listings in the zone
        let staleTicks = 0;
        for (let i = 0; i < 120; i++) {
          if (isAborted()) throw new Error('Master Stop Aborted');

          const beforeScroll = await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            return {
              cards: feed ? feed.querySelectorAll('div.Nv2PK').length : 0,
              height: feed ? feed.scrollHeight : 0
            };
          });

          await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) {
              const cards = feed.querySelectorAll('div.Nv2PK');
              if (cards.length > 0) {
                try { cards[cards.length - 1].scrollIntoView({ block: 'end', behavior: 'instant' }); } catch {}
              }
              feed.scrollTop = feed.scrollHeight + 1200;
              feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 2800, bubbles: true }));
            }
          });

          // Wait until the feed actually grows or fast timeout
          await page.waitForFunction((before) => {
            const feed = document.querySelector('div[role="feed"]');
            if (!feed) return false;
            return feed.querySelectorAll('div.Nv2PK').length > before.cards
              || feed.scrollHeight > before.height + 10;
          }, beforeScroll, { timeout: 340, polling: 50 }).catch(() => {});

          const added = mergeCards(await collectVisibleCards());

          if (accumulatedCards.size >= 400) {
            addLog(`[Cyber Core] Reached maximum density target (${accumulatedCards.size} cards).`);
            break;
          }

          const endMarker = await page.locator('text=You\'ve reached the end of the list, span.HlvSq').count();
          if (endMarker > 0) {
            addLog(`[Cyber Core] Reached end of search results (${accumulatedCards.size} unique cards).`);
            break;
          }

          if (added === 0) {
            staleTicks++;
            // Recovery Nudge: snappy bounce to trigger virtualized feed pagination
            if (staleTicks <= 2) {
              await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) {
                  feed.scrollTop = Math.max(0, feed.scrollTop - 350);
                }
              }).catch(() => {});
              await page.waitForTimeout(70);
              await page.evaluate(() => {
                const feed = document.querySelector('div[role="feed"]');
                if (feed) {
                  feed.scrollTop = feed.scrollHeight;
                  feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 3500, bubbles: true }));
                }
              }).catch(() => {});
              await page.keyboard.press('PageDown').catch(() => {});
            } else if (staleTicks >= 3) {
              break;
            }
          } else {
            staleTicks = 0;
          }
        }

        const extractedCards = Array.from(accumulatedCards.values());

        addLog(`[High-Speed Core] Extracted ${extractedCards.length} verified listings directly with contact intelligence.`);
        markZone('card-extract');

        let insertedInBatch = 0;

        for (let i = 0; i < extractedCards.length; i++) {
          if (isAborted()) throw new Error('Master Stop Aborted');
          
          try {
            const rawItem = extractedCards[i];
            const cardKey = (rawItem.mapsLink || '').split('&')[0]
              || `name:${String(rawItem.name || '').trim().toLowerCase()}`;
            if (processedCardKeys.has(cardKey)) {
              const liveState = liveSavedMap.get(cardKey);
              if (!liveState || !liveState.vendor) continue;
              // Only emit an update if a later scroll frame revealed new contact fields.
              const liveVendor = liveState.vendor;
              let enrichedLate = false;
              if (!liveState.hadPhone && rawItem.phone) {
                const parsedLate = normalizePhone(rawItem.phone, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true });
                if (parsedLate) {
                  liveVendor.phone = parsedLate.displayPhone || parsedLate.e164;
                  liveVendor.phones = [...new Set([...(liveVendor.phones || []), liveVendor.phone])];
                  liveVendor.phoneType = parsedLate.isMobile ? 'mobile' : 'landline';
                  liveVendor.callUrl = parsedLate.callUrl || `tel:${parsedLate.digits}`;
                  if (parsedLate.isMobile) {
                    liveVendor.whatsappAvailable = true;
                    liveVendor.whatsappLink = `https://wa.me/${parsedLate.digits}?text=Hi%20${encodeURIComponent(liveVendor.name || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`;
                  }
                  enrichedLate = true;
                }
              }
              if (!liveState.hadWebsite && rawItem.websiteUrl && !liveVendor.website) {
                liveVendor.website = rawItem.websiteUrl;
                enrichedLate = true;
              }
              if (!liveState.hadAddress && rawItem.address && (!liveVendor.address || liveVendor.address.length < 10)) {
                liveVendor.address = rawItem.address;
                enrichedLate = true;
              }
              if (enrichedLate) {
                dbAdapter.saveVendor(sessionOwner, liveVendor);
                try { emitVendorEvent(liveVendor, 'updated'); } catch (e) {}
              }
              continue;
            }
          const name = rawItem.name;
          const mapsLink = rawItem.mapsLink;
          let phone = rawItem.phone || '';
          // Keep every number the card exposed. Feed cards usually omit the
          // phone entirely, but when they do show one we must not throw the
          // rest away (Google often lists a landline plus a mobile).
          const exposedNumbers = [];
          for (const rawNumber of [rawItem.phone, ...(rawItem.allPhones || [])]) {
            const parsed = normalizePhone(rawNumber, { context: 'phone tel', defaultCountry: countryCode, allowInternational: true });
            if (parsed && !exposedNumbers.some(n => n.national === parsed.national)) {
              exposedNumbers.push(parsed);
            }
          }
          const primaryNumber = exposedNumbers.find(n => n.isMobile) || exposedNumbers.find(n => n.isLandline) || exposedNumbers[0] || null;
          let whatsappLink = '';
          let whatsappAvailable = false;
          let callUrl = '';

          if (primaryNumber) {
            phone = primaryNumber.displayPhone;
            callUrl = primaryNumber.callUrl;
            if (primaryNumber.isMobile) {
              whatsappLink = `https://wa.me/${primaryNumber.digits}?text=Hi%20${encodeURIComponent(name || '')}%2C%20I%20found%20your%20business%20on%20Google%20Maps%20and%20wanted%20to%20connect.`;
              whatsappAvailable = true;
            } else {
              whatsappLink = '';
              whatsappAvailable = false;
            }
            addLog(`[Contact Extracted] 📞 ${name}: ${phone}${whatsappAvailable ? ' (WhatsApp Verified)' : ' (STD Landline)'}`);
          } else {
            phone = '';
          }
          const websiteUrl = rawItem.websiteUrl || '';
          const address = rawItem.address || '';
          const rating = rawItem.rating;
          const reviewsCount = rawItem.reviewsCount;
          const operatingHours = rawItem.operatingHours || '';
          const coords = extractCoords(mapsLink);

          const zoneReject = zoneDistanceReject(coords, centerLat, centerLng, radiusKm, 1.5, isMaster, scope, address, location);
          if (zoneReject) {
            addLog(`[Boundary Filter] Rejected "${name}" · ${zoneReject.distanceKm.toFixed(1)}km from zone centre (max ${zoneReject.maxKm}km)`);
            continue;
          }

          // Managed background website enrichment: only when contact details are missing
          if (websiteUrl && websiteUrl.startsWith('http') && (!phone || phone.includes('Requires') || !rawItem.email)) {
            try {
              const { streamingEnricher } = require('../services/phoneBackfillService');
              streamingEnricher.enqueue({ name, website: websiteUrl, country: countryCode, city: location });
            } catch (e) {}
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
            phones: exposedNumbers.map(n => n.displayPhone || n.e164),
            phoneType: primaryNumber ? (primaryNumber.isMobile ? 'mobile' : 'landline') : '',
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
            isMobile: Boolean(primaryNumber && primaryNumber.isMobile),
            isLandline: Boolean(primaryNumber && primaryNumber.isLandline),
            phoneType: primaryNumber ? primaryNumber.phoneType : 'unknown',
            callUrl: callUrl || (phone ? `tel:${phone.replace(/\s+/g, '')}` : ''),
            qualityScore: phone ? 85 : (websiteUrl ? 65 : 45),
            tier: phone ? 'Premium' : (websiteUrl ? 'Standard' : 'Basic'),
            category,
            city: vendorCity,
            zoneName: location,
            suburb: location,
            locality: location,
            mandal: resolvedMandal,
            district: district || '',
            state: stateName || (countryCode === 'IN' ? 'India' : ''),
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
              if (isMaster || scope === 'district' || scope === 'state' || scope === 'mandal') {
                isOob = false;
              } else if (boundingbox && boundingbox.length === 4) {
                if (!isWithinBounds(place.latitude, place.longitude, boundingbox, 30)) {
                  isOob = true;
                  outOfBoundsDistance = centerLat ? getDistanceKm(centerLat, centerLng, place.latitude, place.longitude) : 'OOB';
                }
              } else if (centerLat !== null && centerLng !== null && radiusKm !== null) {
                const locToken = String(location || '').split(',')[0].trim().toLowerCase();
                const addrLower = String(place.address || '').toLowerCase();
                const isSAB = !place.address || !/\d/.test(place.address) || (locToken && locToken.length > 2 && addrLower.includes(locToken));
                if (!isSAB) {
                  const distance = getDistanceKm(centerLat, centerLng, place.latitude, place.longitude);
                  const allowedRadius = Math.max(25, (Number(radiusKm) || 10) * 2.5);
                  if (distance > allowedRadius) {
                    isOob = true;
                    outOfBoundsDistance = distance.toFixed(1);
                  }
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
            const containment = isListingRelevantToQuery(place.name, place.address, district, stateName, location, location, placeCoords, boundingbox, cityHint, isMaster, scope);
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

            // O(1) Instant Deduplication against RAM index
            const isKnown = dbAdapter.isDuplicate(place);

            // Ensure deterministic ID for database storage
            place.id = place.id || place.placeId || ('lead_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));

            if (!isKnown) {
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

              // Auto-generate 1-Click WhatsApp Direct Launcher.
              // Only mobiles get WhatsApp, and the parser already validated the
              // number against the search country, so no hardcoded +91 prefix.
              const waPhone = primaryNumber?.isMobile
                ? primaryNumber
                : normalizePhone(place.phone, { context: 'phone mobile', defaultCountry: countryCode, allowInternational: true });
              if (waPhone?.isMobile) {
                place.whatsappLink = `https://wa.me/${waPhone.digits}?text=Hi%20${encodeURIComponent(place.name || '')}%2C%20I%20found%20your%20business%20on%20Scraper.co.in%20and%20wanted%20to%20connect.`;
                place.whatsappAvailable = true;
              }
              
              // Apply GeoAI reverse geocoding for deep location folders
              if (place.latitude && place.longitude) {
                try {
                  const locationInfo = await geoAI.reverseGeocode(place.latitude, place.longitude, { district, stateName, city: vendorCity, address: place.address });
                  if (locationInfo) {
                    place.village = locationInfo.village;
                    place.mandal = locationInfo.mandal;
                    place.district = locationInfo.district;
                    place.state = locationInfo.state;
                  }
                } catch(e) { }
              }
              
              dbAdapter.saveVendor(sessionOwner, place);
              scrapedResults.push(place);
              try { emitVendorEvent(place, 'inserted'); } catch (e) {}
              try {
                const { streamingEnricher } = require('../services/phoneBackfillService');
                streamingEnricher.enqueue(place);
              } catch (e) {}
              insertedInBatch++;
              // Silently saving to DB, no log flooding
            } else {
              let existing = dbAdapter.findMatch(place);
              if (existing) {
                const hadSession = Array.isArray(existing.sessionIds) && existing.sessionIds.includes(sessionId);
                let updated = false;

                if (!existing.pincode && place.address) {
                  const pMatch = place.address.match(/\b\d{6}\b/);
                  if (pMatch) { existing.pincode = pMatch[0]; updated = true; }
                }
                if (!existing.rating && parsedRating) { existing.rating = parsedRating; updated = true; }
                if ((!existing.phone || existing.phone.includes('Obfuscated') || existing.phone.includes('Requires')) && place.phone) {
                  existing.phone = place.phone; updated = true;
                }
                if (Array.isArray(place.phones) && place.phones.length) {
                  const merged = [...new Set([...(Array.isArray(existing.phones) ? existing.phones : []), ...place.phones])];
                  if (merged.length !== (existing.phones || []).length) {
                    existing.phones = merged;
                    updated = true;
                  }
                }
                
                existing.sessionId = sessionId;
                existing.scrapedAt = new Date().toISOString();

                if (updated || !hadSession) {
                  dbAdapter.saveVendor(sessionOwner, existing);
                  try { emitVendorEvent(existing, hadSession ? 'updated' : 'inserted'); } catch (e) {}
                  if (!existing.phone || existing.phone.includes('Requires') || !existing.website) {
                    try {
                      const { streamingEnricher } = require('../services/phoneBackfillService');
                      streamingEnricher.enqueue(existing);
                    } catch (e) {}
                  }
                }
                // Always include existing updated lead in batch results
                scrapedResults.push(existing);
                insertedInBatch++;
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
    markZone('persist');
    return scrapedResults;
  } catch (error) {
    zoneFailed = true;
    addLog(`[Cyber Core] Worker warning: ${error.message}`);
    return [];
  } finally {
    if (page) {
      try { await page.close(); } catch (e) {}
    }
    if (zoneSlot) {
      await releaseZoneContext(zoneSlot, { recycle: zoneFailed });
    }
    // Shared browser must remain open for other concurrent workers
  }
}
module.exports = { scrapeGooglePlaces, warmZoneContextPool, closeZoneContextPool, setDeps, isListingRelevantToQuery, calculateLeadScore, determineTier };
