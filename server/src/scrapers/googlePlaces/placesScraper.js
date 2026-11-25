const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const dbAdapter = require('../../config/dbAdapter');
const geoAI = require('../../utils/geoAI');
const { fastWebsiteExtract } = require('../../utils/fastWebsiteExtractor');
const { getBrowser, chromium, applyAdvancedStealth, optimizePageForSpeed } = require('../browserFactory');
const { verifyWithAI } = require('../../utils/aiParser');
const { normalizePhone, extractPhones } = require('../../utils/phoneUtils');
const fidelity = require('../../services/categoryFidelity');
const { isSessionAborted } = require('../../utils/queue');


const {
  warmZoneContextPool,
  acquireZoneContext,
  releaseZoneContext,
  closeZoneContextPool
} = require('./contextPool');

const {
  calculateLeadScore,
  determineTier
} = require('./scoring');

const {
  scrapeWebsiteForSocials,
  extractStorefrontMediaAndLogo,
  setEnricherLogger
} = require('./siteEnricher');

const {
  isListingRelevantToQuery,
  validCoord,
  extractCoords,
  getDistanceKm,
  zoneDistanceReject,
  isWithinBounds
} = require('./spatialGuard');

// Global state variables passed from index.js
let globalAbortSignal = { aborted: false };
let addLog = console.log;
let emitVendorEvent = () => { };

function setDeps({ logger, abortSignal, emitVendorEvent: evt }) {
  if (logger) addLog = logger;
  if (abortSignal) globalAbortSignal = abortSignal;
  if (evt) emitVendorEvent = evt;
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
  const detected = require('../../services/localBrain/countries').detectCountry(
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
        await consentBtn.first().click({ timeout: 3000 }).catch(() => { });
        markZone('consent');
      }
    } catch (e) { }

    try {
      await Promise.race([
        page.waitForSelector('div[role="feed"]', { timeout: 1200 }),
        page.waitForSelector('[data-item-id="address"]', { timeout: 1200 }),
        page.waitForSelector('div.Nv2PK', { timeout: 1200 })
      ]);
    } catch (e) {
      // Quiet/sparse zone or instant load: proceed directly to extract visible nodes without idle waiting
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
      } catch (e) { }

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

      // Category Fidelity Check in Case A (Direct Navigation)
      if (!fidelity.isVendorRelevant({ name, address, website, subcategory: '', category }, category)) {
        addLog(`[Category Guard] Skipped direct place "${name}" · not a ${category} match`);
        try {
          const { archiveDivergentLead } = require('../../services/divergentLeadService');
          archiveDivergentLead({
            name, address, phone, website, mapsLink: page.url(),
            latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null,
            rating, source: 'Google Maps Direct'
          }, category);
        } catch (e) { }
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
        try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) { }
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
        try { emitVendorEvent(newLead, 'inserted'); } catch (e) { }
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
            try { emitVendorEvent(existing, 'updated'); } catch (e) { }
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
            const firstMobObj = exposedNumbers.find(n => n.isMobile) || null;
            const firstLandObj = exposedNumbers.find(n => n.isLandline) || null;
            const primaryNumber = firstMobObj || firstLandObj || exposedNumbers[0] || null;
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
              // Silently preserve valid business details into proper category folder in database
              try {
                const { archiveDivergentLead } = require('../../services/divergentLeadService');
                archiveDivergentLead({
                  name, address, phone, website: websiteUrl, mapsLink,
                  latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null,
                  rating, subcategory: rawItem.placeCategory, source: 'Google Maps Live'
                }, category);
              } catch (e) { }
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
              try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) { }
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
              mobilePhone: firstMobObj ? (firstMobObj.displayPhone || firstMobObj.e164) : '',
              landlinePhone: firstLandObj ? (firstLandObj.displayPhone || firstLandObj.e164) : '',
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
              try { emitVendorEvent(place, 'inserted'); } catch (e) { }
              try {
                const { streamingEnricher } = require('../../services/phoneBackfillService');
                streamingEnricher.enqueue(place);
              } catch (e) { }
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
                  try { emitVendorEvent(existing, hadSession ? 'updated' : 'inserted'); } catch (e) { }
                }
                if (!existing.phone || !existing.website) {
                  try {
                    const { streamingEnricher } = require('../../services/phoneBackfillService');
                    streamingEnricher.enqueue(existing);
                  } catch (e) { }
                }
                scrapedResults.push(existing);
              }
            }
            return place;
          } catch (err) {
            addLog(`[Live Card Warning] ${rawItem?.name || 'unknown'}: ${err.message}`);
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
                const parts = line.includes('·')
                  ? line.split('·').map(p => p.trim()).filter(Boolean)
                  : [line.trim()];
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

        // Fast-Path Early DOM Bailout:
        // If Google Maps displays "No results", terminal marker, or <=2 cards, exit in <150ms!
        const initialStatus = await page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText : '';
          const noResults = bodyText.includes("Google Maps can't find") ||
            bodyText.includes("No results found") ||
            bodyText.includes("did not match any locations");
          const endReached = Boolean(document.querySelector('span.HlvSq')) ||
            bodyText.includes("You've reached the end of the list") ||
            bodyText.includes("No more results");
          const feedCount = document.querySelectorAll('div[role="feed"] div.Nv2PK').length;
          return { noResults, endReached, feedCount };
        }).catch(() => ({ noResults: false, endReached: false, feedCount: 1 }));

        const isTerminalInitial = initialStatus.noResults ||
          (initialStatus.endReached && initialStatus.feedCount <= 3) ||
          (accumulatedCards.size === 0 && initialStatus.feedCount === 0);

        if (isTerminalInitial) {
          addLog(`[Cyber Core] Early fast bailout: sparse/terminal zone feed (${accumulatedCards.size} cards). Zero idle wait.`);
        } else {
          // Continuous Fast Scroll Harvester: Relentlessly scroll the feed to extract ALL listings in the zone
          let staleTicks = 0;
          for (let i = 0; i < 90; i++) {
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
                  try { cards[cards.length - 1].scrollIntoView({ block: 'end', behavior: 'instant' }); } catch { }
                }
                feed.scrollTop = feed.scrollHeight + 1200;
                feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 2800, bubbles: true }));
              }
            });

            // Fast network settle check (400ms instead of 650ms)
            await page.waitForFunction((before) => {
              const feed = document.querySelector('div[role="feed"]');
              if (!feed) return false;
              return feed.querySelectorAll('div.Nv2PK').length > before.cards
                || feed.scrollHeight > before.height + 10;
            }, beforeScroll, { timeout: 400, polling: 40 }).catch(() => { });

            const added = mergeCards(await collectVisibleCards());

            if (accumulatedCards.size >= 400) {
              addLog(`[Cyber Core] Reached maximum density target (${accumulatedCards.size} cards).`);
              break;
            }

            const endMarker = await page.evaluate(() => {
              return Boolean(
                document.querySelector('span.HlvSq') ||
                (document.body.innerText && (
                  document.body.innerText.includes("You've reached the end of the list") ||
                  document.body.innerText.includes("No more results")
                ))
              );
            });
            if (endMarker) {
              addLog(`[Cyber Core] Reached end of search results (${accumulatedCards.size} unique cards).`);
              break;
            }

            if (added === 0) {
              staleTicks++;
              if (staleTicks >= 2) {
                // Rapid PageDown bounce confirmation before cleanly bailing
                await page.keyboard.press('PageDown').catch(() => {});
                await page.waitForTimeout(180);
                const recoveryAdded = mergeCards(await collectVisibleCards());
                if (recoveryAdded === 0) {
                  addLog(`[Cyber Core] Zone feed completed (${accumulatedCards.size} cards). Drained cleanly.`);
                  break;
                }
                staleTicks = 0;
              } else {
                // Quick nudge to trigger virtualized feed scroll
                await page.evaluate(() => {
                  const feed = document.querySelector('div[role="feed"]');
                  if (feed) {
                    feed.scrollTop = Math.max(0, feed.scrollTop - 200);
                  }
                }).catch(() => { });
                await page.waitForTimeout(50);
                await page.evaluate(() => {
                  const feed = document.querySelector('div[role="feed"]');
                  if (feed) {
                    feed.scrollTop = feed.scrollHeight;
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 2800, bubbles: true }));
                  }
                }).catch(() => { });
                await page.keyboard.press('PageDown').catch(() => { });
              }
            } else {
              staleTicks = 0;
            }
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
                try { emitVendorEvent(liveVendor, 'updated'); } catch (e) { }
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
            const firstMobObj = exposedNumbers.find(n => n.isMobile) || null;
            const firstLandObj = exposedNumbers.find(n => n.isLandline) || null;
            const primaryNumber = firstMobObj || firstLandObj || exposedNumbers[0] || null;
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

            // Category fidelity: Maps can include related businesses (a
            // wedding-photographer query returning banquet halls). Drop anything
            // that clearly belongs to a different role before it is stored.
            if (!fidelity.isVendorRelevant({ name, address, website: websiteUrl, subcategory: rawItem.placeCategory, category: rawItem.placeCategory }, category)) {
              addLog(`[Category Guard] Skipped "${name}" (${rawItem.placeCategory || 'unmatched'}) · not a ${category} match`);
              try {
                const { archiveDivergentLead } = require('../../services/divergentLeadService');
                archiveDivergentLead({
                  name, address, phone, website: websiteUrl, mapsLink,
                  latitude: coords ? coords.lat : null, longitude: coords ? coords.lng : null,
                  rating, subcategory: rawItem.placeCategory, source: 'Google Maps Harvester'
                }, category);
              } catch (e) { }
              continue;
            }

            const place = {
              id: 'place_' + Date.now().toString() + Math.random().toString(36).substring(7),
              name,
              address,
              phone: phone || '',
              mobilePhone: firstMobObj ? (firstMobObj.displayPhone || firstMobObj.e164) : '',
              landlinePhone: firstLandObj ? (firstLandObj.displayPhone || firstLandObj.e164) : '',
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
              try { emitVendorEvent(place, 'out-of-bounds'); } catch (e) { }
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
              try { emitVendorEvent(oobLead, 'out-of-bounds'); } catch (e) { }
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
                } catch (e) { }
              }

              dbAdapter.saveVendor(sessionOwner, place);
              scrapedResults.push(place);
              try { emitVendorEvent(place, 'inserted'); } catch (e) { }
              try {
                const { streamingEnricher } = require('../../services/phoneBackfillService');
                streamingEnricher.enqueue(place);
              } catch (e) { }
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
                  try { emitVendorEvent(existing, hadSession ? 'updated' : 'inserted'); } catch (e) { }
                  if (!existing.phone || existing.phone.includes('Requires') || !existing.website) {
                    try {
                      const { streamingEnricher } = require('../../services/phoneBackfillService');
                      streamingEnricher.enqueue(existing);
                    } catch (e) { }
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
      try { await page.close(); } catch (e) { }
    }
    if (zoneSlot) {
      await releaseZoneContext(zoneSlot, { recycle: zoneFailed });
    }
    // Shared browser must remain open for other concurrent workers
  }
}

module.exports = {
  scrapeGooglePlaces,
  setDeps
};
