const dbAdapter = require('../../config/dbAdapter');
const { verifyWithAI } = require('../../utils/aiParser');
const { extractPhones, normalizePhone, extractSocialContacts } = require('../../utils/phoneUtils');
const { searchBingHtml } = require('../search/bingSearch');
const { scrapeSocialProfile } = require('./socialMediaScraper');
const { launchStealthBrowser, applyAdvancedStealth } = require('../core/browserFactory');

// Shared logging utility callback
let logCallback = console.log;
let emitVendorCallback = () => {};
function setLogger(cb) { logCallback = cb; }
function setDeps(deps = {}) {
  if (deps.logger) logCallback = deps.logger;
  if (deps.emitVendorEvent) emitVendorCallback = deps.emitVendorEvent;
}
function addLog(msg) { logCallback(msg); }

// In-memory circuit breaker for search engine blocks (avoids wasting 25s per job)
let bingCircuitBrokenUntil = 0;

/**
 * One Bing result page, already link-unwrapped.
 * Returns { rows, captcha, error } and never throws.
 */
async function bingRows(query, platformName, pageIndex = 0) {
  if (Date.now() < bingCircuitBrokenUntil) {
    return { rows: [], captcha: true };
  }
  try {
    const { rows, blocked } = await searchBingHtml(query, {
      maxPages: Math.max(1, pageIndex + 1),
      logger: addLog,
      timeoutMs: 6000
    });
    if (blocked) {
      bingCircuitBrokenUntil = Date.now() + 60 * 1000;
      addLog(`[Social Discovery] Bing served a human-verification page for ${platformName}; circuit broken for 60s.`);
      return { rows: [], captcha: true };
    }
    // `searchBingHtml` already decodes Bing's /ck/a redirects.
    return {
      rows: rows.map(item => ({ title: item.title, description: item.snippet, url: item.url })),
      captcha: false
    };
  } catch (err) {
    addLog(`[Social Discovery] Bing error for ${platformName}: ${err.message}`);
    return { rows: [], error: err.message };
  }
}

/**
 * Country-aware contact and phone anchors for high-yield social search dorks.
 */
function getCountryContactAnchors(countryCode) {
  const c = String(countryCode || 'IN').toUpperCase();
  switch (c) {
    case 'US':
    case 'CA':
      return '("call" OR "+1" OR "text" OR "phone" OR "contact" OR "book" OR "cell")';
    case 'GB':
    case 'UK':
      return '("call" OR "+44" OR "contact" OR "enquiries" OR "phone" OR "mobile")';
    case 'AU':
      return '("call" OR "+61" OR "contact" OR "enquiries" OR "mobile" OR "phone")';
    case 'AE':
      return '("call" OR "+971" OR "contact" OR "whatsapp" OR "wa.me" OR "phone")';
    case 'DE':
      return '("kontakt" OR "+49" OR "telefon" OR "anrufen" OR "whatsapp")';
    case 'FR':
      return '("contact" OR "+33" OR "téléphone" OR "appeler" OR "whatsapp")';
    case 'IN':
    default:
      return '("wa.me" OR "+91" OR "call" OR "contact" OR "whatsapp")';
  }
}

/**
 * Direct stealth discovery for social profiles bypassing blocked search engines.
 */
async function directSocialDiscovery(platformDomain, category, location, meta = {}) {
  const targetLoc = meta.zoneName || location;
  const rawLoc = String(meta.zoneName || location || '');
  const cleanBaseCity = rawLoc.split(',')[0]
    .replace(/\b(Central Commercial Hub|Main Market & Bazaar Area|Railway Station & Bus Stand|Main Arterial|Industrial & Trade Zone|Top Rated Specialists|North Sector|South Sector|Commercial Hub|Market Area|Bazaar Area|Wholesale & Services|Downtown & Commercial Core|Central Business District|Uptown|Midtown|Outer Ring)\b/gi, '')
    .trim() || rawLoc;

  const results = [];
  const isInstagram = platformDomain.includes('instagram');
  const isFacebook = platformDomain.includes('facebook');
  const isTikTok = platformDomain.includes('tiktok');
  const isTwitter = platformDomain.includes('twitter') || platformDomain.includes('x.com');

  let handle;
  try {
    handle = await launchStealthBrowser(false, null, true);
    const context = await handle.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: handle.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    try {
      await page.route('**/*', route => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
          return route.abort();
        }
        return route.continue();
      });
    } catch (e) {}
    if (applyAdvancedStealth) await applyAdvancedStealth(page);

    if (isInstagram) {
      const cleanLoc = cleanBaseCity.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tags = [
        `${cleanLoc}${cleanCat}`,
        `${cleanCat}${cleanLoc}`,
        `${cleanLoc}photography`,
        cleanLoc
      ].filter(Boolean);

      for (const tag of tags.slice(0, 2)) {
        try {
          const tagUrl = `https://www.instagram.com/explore/tags/${tag}/`;
          addLog(`[Social Discovery] Direct IG Tag scan: #${tag}`);
          await page.goto(tagUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
          await page.waitForTimeout(200);
          await page.keyboard.press('Escape');

          const handles = await page.evaluate(() => {
            const internal = ['/explore/', '/direct/', '/stories/', '/reels/', '/popular/', '/about/', '/legal/', '/accounts/', '/developer/', '/directory/', '/help/'];
            return Array.from(document.querySelectorAll('a[href^="/"]'))
              .map(a => a.getAttribute('href'))
              .filter(h => h && /^\/[a-zA-Z0-9_.]+\/$/.test(h) && !internal.includes(h.toLowerCase()));
          });

          for (const h of handles) {
            const profileUrl = `https://www.instagram.com${h}`;
            if (!results.some(r => r.url === profileUrl)) {
              results.push({
                title: h.replace(/\//g, ''),
                url: profileUrl,
                description: `Instagram profile in ${cleanBaseCity} discovered via #${tag}`
              });
            }
          }
          if (results.length >= 8) break;
        } catch (e) {
          addLog(`[Social Discovery] IG tag #${tag} note: ${e.message}`);
        }
      }
    } else if (isFacebook) {
      const querySlug = `${category} ${cleanBaseCity}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      try {
        const publicUrl = `https://www.facebook.com/public/${querySlug}`;
        addLog(`[Social Discovery] Direct FB Directory scan: ${querySlug}`);
        await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');

        const links = await page.evaluate(() => {
          const excluded = ['/login', '/recover', '/help', '/policies', '/search', '/public', '/hashtag', '/share', '/events', '/watch'];
          return Array.from(document.querySelectorAll('a[href*="facebook.com/"]'))
            .map(a => ({
              title: (a.innerText || a.getAttribute('title') || '').trim(),
              url: a.href
            }))
            .filter(item => item.url && !excluded.some(ex => item.url.includes(ex)) && item.url !== 'https://www.facebook.com/');
        });

        for (const item of links) {
          if (!results.some(r => r.url === item.url)) {
            results.push({
              title: item.title || `${category} - ${cleanBaseCity}`,
              url: item.url,
              description: `Facebook page in ${cleanBaseCity} discovered via public directory`
            });
          }
        }
      } catch (e) {
        addLog(`[Social Discovery] FB direct directory note: ${e.message}`);
      }
    } else if (isTikTok) {
      const catLower = category.toLowerCase();
      const catNoun = catLower.includes('photo') ? 'photographer' :
                      catLower.includes('dent') ? 'dentist' :
                      catLower.includes('law') || catLower.includes('attorney') ? 'lawyer' :
                      catLower.includes('plumb') ? 'plumber' :
                      catLower.includes('restaur') ? 'food' :
                      catLower.includes('salon') || catLower.includes('hair') ? 'salon' :
                      catLower.includes('gym') || catLower.includes('fitness') ? 'fitness' :
                      catLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 4)[0] || 'business';

      let shortCity = cleanBaseCity.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanBaseCity.toLowerCase().includes('new york') || shortCity.includes('newyork')) shortCity = 'nyc';
      else if (cleanBaseCity.toLowerCase().includes('los angeles')) shortCity = 'la';
      else if (cleanBaseCity.toLowerCase().includes('san francisco')) shortCity = 'sf';
      else if (cleanBaseCity.toLowerCase().includes('london')) shortCity = 'london';
      else if (cleanBaseCity.toLowerCase().includes('sydney')) shortCity = 'sydney';
      else if (cleanBaseCity.toLowerCase().includes('dubai')) shortCity = 'dubai';

      const tags = [
        `${shortCity}${catNoun}`,
        `${shortCity}${catNoun}s`,
        `${catNoun}${shortCity}`,
        shortCity
      ].filter(Boolean);

      for (const tag of tags.slice(0, 2)) {
        try {
          const tagUrl = `https://www.tiktok.com/tag/${tag}`;
          addLog(`[Social Discovery] Direct TikTok Tag scan: #${tag}`);
          await page.goto(tagUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
          await page.waitForTimeout(200);
          const handles = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/@"]'))
              .map(a => a.href)
              .filter(h => h && h.includes('/@'));
          });
          for (const h of handles) {
            if (!results.some(r => r.url === h)) {
              const rawUser = h.split('/@')[1] ? h.split('/@')[1].split('?')[0] : 'TikTok Profile';
              results.push({
                title: `@${rawUser}`,
                url: h,
                description: `TikTok profile in ${cleanBaseCity} discovered via #${tag}`
              });
            }
          }
          if (results.length >= 6) break;
        } catch (e) {
          addLog(`[Social Discovery] TikTok tag #${tag} note: ${e.message}`);
        }
      }
    } else if (isTwitter) {
      const querySlug = `${category} ${cleanBaseCity}`.trim();
      try {
        const searchUrl = `https://x.com/search?q=${encodeURIComponent(querySlug)}&f=user`;
        addLog(`[Social Discovery] Direct Twitter/X scan: ${querySlug}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 3000 });
        await page.waitForTimeout(200);
        const handles = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href^="/"]'))
            .map(a => a.getAttribute('href'))
            .filter(h => h && /^\/[a-zA-Z0-9_]{3,20}$/.test(h) && !['/home', '/explore', '/notifications', '/messages', '/search'].includes(h.toLowerCase()));
        });
        for (const h of handles) {
          const profileUrl = `https://x.com${h}`;
          if (!results.some(r => r.url === profileUrl)) {
            results.push({
              title: h.replace('/', '@'),
              url: profileUrl,
              description: `Twitter/X profile in ${cleanBaseCity}`
            });
          }
        }
      } catch (e) {
        addLog(`[Social Discovery] Twitter/X scan note: ${e.message}`);
      }
    }
    await context.close().catch(() => {});
  } catch (err) {
    addLog(`[Social Discovery] Direct discovery note: ${err.message}`);
  } finally {
    if (handle?.browser) await handle.browser.close().catch(() => {});
  }

  return results;
}

async function scrapeDuckDuckGoDork(
  platformDomain,
  exactQuery,
  category,
  location,
  globalAbortSignal = { aborted: false },
  sessionId = 'legacy',
  countryCode = 'IN',
  userId = 'admin_1',
  meta = {}
) {
  try {
    const platformName = platformDomain.split('.')[0];
    const country = String(countryCode || 'IN').toUpperCase();
    const contactAnchor = getCountryContactAnchors(country);

    // Query variations with country-specific contact anchors for high phone/WhatsApp yield
    const queries = [
      `site:${platformDomain} ${exactQuery} ${contactAnchor}`,
      `site:${platformDomain} ${exactQuery}`,
      `${exactQuery} ${platformName} profile ("phone" OR "mobile" OR "contact")`
    ];

    let searchResults = [];
    if (Date.now() >= bingCircuitBrokenUntil) {
      for (const query of queries) {
        if (globalAbortSignal.aborted) break;
        if (searchResults.length >= 8) break;
        addLog(`[Social Discovery] Searching: "${query}" (${country})`);
        
        const { rows, captcha } = await bingRows(query, platformName, 0);
        if (captcha) {
          addLog(`[Social Discovery] Bing challenge encountered; fast-forwarding to Direct Stealth Discovery...`);
          break;
        }
        const matched = rows.filter(item => item.url && item.url.includes(platformDomain));
        for (const m of matched) {
          if (!searchResults.some(existing => existing.url === m.url)) {
            searchResults.push(m);
          }
        }
      }
    } else {
      addLog(`[Social Discovery] Search engine circuit active; engaging Direct Stealth Discovery...`);
    }

    if (searchResults.length === 0) {
      addLog(`[Social Discovery] Bing yielded no links for "${exactQuery}"; activating Direct Stealth Discovery...`);
      searchResults = await directSocialDiscovery(platformDomain, category, location, meta);
    }

    if (searchResults.length === 0) {
      addLog(`[Social Discovery] No ${platformName} results found for "${exactQuery}"`);
      return { totalScraped: 0, found: 0 };
    }

    const results = searchResults;
    addLog(`[Social Discovery] Found ${results.length} ${platformName} candidate profiles for "${exactQuery}"`);

    let totalInserted = 0;

    for (const item of results) {
      if (globalAbortSignal.aborted) throw new Error('Master Stop Aborted');
      
      const profileUrl = item.url;
      if (!profileUrl || /\/(reel|explore|p|stories|groups|events|watch|popular|about|legal|accounts|help)\//.test(profileUrl)) continue;

      const cleanName = (item.title || 'Unknown Business')
        .replace(/\s*[\|·\-–]\s*(Facebook|Instagram|YouTube|Pinterest|LinkedIn|Twitter|X).*$/i, '')
        .replace(/\s*-\s*(Home|Official Page|Profile|Page|About).*$/i, '')
        .trim() || 'Unknown Business';

      const snippet = item.description || '';
      
      // Extract phones and WhatsApp links using specialized social extractor
      const parsedSocial = extractSocialContacts(snippet, profileUrl, country);

      let phone = '';
      let isMobile = false;
      let whatsappLink = parsedSocial.whatsapp || '';

      if (parsedSocial.phones.length > 0) {
        phone = parsedSocial.phones[0];
        isMobile = true;
      }

      // If a link-in-bio was found, resolve it for more direct contact numbers
      if (!phone && parsedSocial.linkInBio) {
        try {
          const { resolveLinkInBio } = require('../../services/aggressivePhoneEnricher');
          const bioContacts = await resolveLinkInBio(parsedSocial.linkInBio, country);
          if (bioContacts.phones.length > 0) {
            phone = bioContacts.phones[0];
            isMobile = true;
          }
          if (bioContacts.whatsapp && !whatsappLink) {
            whatsappLink = bioContacts.whatsapp;
          }
        } catch (e) {}
      }

      // Dynamic phone fallback using phoneUtils for all countries
      if (!phone) {
        const candidatePhones = extractPhones(snippet, { defaultCountry: country, allowInternational: country !== 'IN' });
        if (candidatePhones.length > 0) {
          const top = candidatePhones[0];
          phone = top.displayPhone || top.national || top.e164;
          isMobile = Boolean(top.isMobile);
          if (isMobile && !whatsappLink) {
            whatsappLink = `https://wa.me/${top.digits || top.national}`;
          }
        }
      }

      // Extract followers/likes
      const follMatch = snippet.match(/([\d.,]+[KkMm]?)\s*\+?\s*(?:followers?|likes?|subscribers?)/i);
      const followers = follMatch ? follMatch[1] : '';

      // Deep Profile Harvester: Run stealth Playwright scraper (or OpenGraph fast-path)
      // to dismiss login modals, expand bio ('... more'), and harvest real physical address, email & phone
      let socialIntel = null;
      try {
        socialIntel = await scrapeSocialProfile(profileUrl, country);
        if (socialIntel && socialIntel.ok) {
          if (!phone && socialIntel.phones?.length) {
            phone = socialIntel.phones[0];
            isMobile = true;
          }
          if (!whatsappLink && socialIntel.whatsappLink) {
            whatsappLink = socialIntel.whatsappLink;
          }
        }
      } catch (e) {}

      // A social profile without phone or followers or clear business relevance is skipped
      if (!phone && !followers && (!socialIntel || !socialIntel.bio)) {
        continue;
      }

      const vendors = dbAdapter.getVendors();
      const existing = vendors.find(v => 
        v.instagram === profileUrl || 
        v.facebook === profileUrl || 
        v.pinterest === profileUrl || 
        v.youtube === profileUrl || 
        v.linkedin === profileUrl || 
        (v.name && v.name.toLowerCase() === cleanName.toLowerCase() && v.city && v.city.toLowerCase() === location.toLowerCase())
      );
      
      const assignedZone = meta.zoneName || location;
      const physicalAddress = socialIntel?.address || (meta.zoneName ? `${meta.zoneName}, ${location}` : location);
      const allCandidatePhones = Array.from(new Set([phone, ...(socialIntel?.phones || []), ...(parsedSocial.phones || [])].filter(Boolean)));
      const allCandidateEmails = Array.from(new Set([...(socialIntel?.emails || [])].filter(Boolean)));

      if (existing) {
        let updated = false;
        if (!existing.phone && (phone || allCandidatePhones.length > 0)) {
          const resolvedPhone = phone || allCandidatePhones[0];
          existing.phone = resolvedPhone;
          existing.phones = Array.from(new Set([...(existing.phones || []), ...allCandidatePhones]));
          existing.isMobile = isMobile;
          existing.phoneType = isMobile ? 'mobile' : 'landline';
          existing.whatsappAvailable = Boolean(whatsappLink || isMobile);
          existing.whatsappLink = whatsappLink || (isMobile ? `https://wa.me/${resolvedPhone.replace(/\D/g, '')}` : '');
          existing.verified = true;
          existing.aiVerified = true;
          updated = true;
        }
        if (!existing.email && allCandidateEmails.length > 0) {
          existing.email = allCandidateEmails[0];
          existing.emails = Array.from(new Set([...(existing.emails || []), ...allCandidateEmails]));
          updated = true;
        }
        if (!existing.instagram && platformDomain.includes('instagram')) {
          existing.instagram = profileUrl;
          if (socialIntel?.followers || followers) existing.instagramFollowers = socialIntel?.followers || followers;
          updated = true;
        }
        if (!existing.facebook && platformDomain.includes('facebook')) {
          existing.facebook = profileUrl;
          if (socialIntel?.followers || followers) existing.facebookFollowers = socialIntel?.followers || followers;
          updated = true;
        }
        if (!existing.tiktok && platformDomain.includes('tiktok')) {
          existing.tiktok = profileUrl;
          if (socialIntel?.followers || followers) existing.tiktokFollowers = socialIntel?.followers || followers;
          updated = true;
        }
        if (!existing.twitter && (platformDomain.includes('twitter') || platformDomain.includes('x.com'))) {
          existing.twitter = profileUrl;
          updated = true;
        }
        if (socialIntel?.address && (!existing.address || existing.address.length < 10)) {
          existing.address = socialIntel.address;
          updated = true;
        }
        if (meta.zoneName && (!existing.zone || existing.zone.toLowerCase() === location.toLowerCase())) {
          existing.zone = meta.zoneName;
          existing.locality = meta.zoneName;
          if (meta.lat && meta.lng) {
            existing.lat = meta.lat;
            existing.lng = meta.lng;
          }
          updated = true;
        }
        if (updated) {
          existing.qualityScore = existing.phone ? 100 : Math.max(existing.qualityScore || 0, 75);
          existing.tier = existing.qualityScore >= 80 ? 'Platinum' : 'Gold';
          dbAdapter.saveVendor(userId || 'admin_1', existing);
          try { emitVendorCallback(existing, 'updated'); } catch (e) {}
          addLog(`[Social Discovery] ⚡ Merged social intel into existing lead "${cleanName}": ${existing.phone ? `📞${existing.phone}` : ''} [${assignedZone}]`);
          totalInserted++;
        }
      } else {
        // STRICT LOCATION & BUSINESS MATCHING:
        // A newly discovered social profile that has no existing Google Places or directory match
        // MUST demonstrate a verifiable connection to the target city/mandal/municipality.
        const fullProfileText = `${cleanName} ${snippet} ${socialIntel?.bio || ''} ${socialIntel?.address || ''} ${profileUrl}`.toLowerCase();
        const targetLoc = String(location || '').toLowerCase().trim();
        const targetZoneStr = String(assignedZone || '').toLowerCase().trim();
        const targetDistrictStr = String(meta.district || '').toLowerCase().trim();
        const targetStateStr = String(meta.state || '').toLowerCase().trim();

        // Extract meaningful tokens (boroughs, cities, aliases, states)
        const locationTokens = new Set();
        [targetLoc, targetZoneStr, targetDistrictStr, targetStateStr].forEach(s => {
          if (!s) return;
          locationTokens.add(s);
          s.split(/[,/&\-–|]+/).map(t => t.trim()).filter(t => t.length >= 3).forEach(t => {
            locationTokens.add(t);
            t.split(/\s+/).filter(w => w.length >= 4 && !['near', 'area', 'zone', 'city', 'east', 'west', 'north', 'south', 'central', 'hub'].includes(w)).forEach(w => locationTokens.add(w));
          });
        });

        // Common metro & country aliases
        if (targetLoc.includes('new york') || targetZoneStr.includes('new york') || targetLoc.includes('nyc')) {
          ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'ny'].forEach(a => locationTokens.add(a));
        } else if (targetLoc.includes('los angeles') || targetLoc.includes('la')) {
          ['los angeles', 'la', 'hollywood', 'socal', 'california'].forEach(a => locationTokens.add(a));
        } else if (targetLoc.includes('london')) {
          ['london', 'greater london', 'uk'].forEach(a => locationTokens.add(a));
        } else if (targetLoc.includes('mumbai')) {
          ['mumbai', 'bombay', 'bandra', 'andheri', 'thane'].forEach(a => locationTokens.add(a));
        } else if (targetLoc.includes('delhi')) {
          ['delhi', 'ncr', 'gurgaon', 'noida', 'new delhi'].forEach(a => locationTokens.add(a));
        }

        const hasLocationMatch = Array.from(locationTokens).some(token => {
          if (token.length <= 2) {
            return new RegExp(`\\b${token}\\b`, 'i').test(fullProfileText);
          }
          return fullProfileText.includes(token);
        });

        if (!hasLocationMatch) {
          addLog(`[Social Discovery] ✋ Strict Location Guard: Skipped "${cleanName}" — profile lacks reference to ${assignedZone || location}.`);
          continue;
        }

        const targetCat = String(category || '').toLowerCase().trim();
        const catWords = targetCat.split(/\s+/).filter(w => w.length > 3);
        const hasCategoryMatch = catWords.length === 0 || catWords.some(w => fullProfileText.includes(w)) || (
          (targetCat.includes('photograph') || targetCat.includes('photo')) && (fullProfileText.includes('photo') || fullProfileText.includes('studio') || fullProfileText.includes('click') || fullProfileText.includes('films') || fullProfileText.includes('capture') || fullProfileText.includes('lens') || fullProfileText.includes('portrait') || fullProfileText.includes('wedding'))
        );

        if (!hasCategoryMatch) {
          addLog(`[Social Discovery] ✋ Strict Business Guard: Skipped "${cleanName}" — does not match target category (${category}).`);
          continue;
        }

        const newLead = {
          id: `social_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          userId: userId || 'admin_1',
          sessionId,
          name: socialIntel?.name || cleanName,
          category: category,
          city: location,
          zone: assignedZone,
          locality: assignedZone,
          district: meta.district || location,
          state: meta.state || '',
          country,
          address: physicalAddress,
          lat: meta.lat || null,
          lng: meta.lng || null,
          scrapedAt: new Date().toISOString(),
          verified: Boolean(phone),
          aiVerified: Boolean(phone),
          pushed: false,
          qualityScore: phone ? 100 : (followers ? 60 : 40),
          tier: phone ? 'Platinum' : (followers ? 'Gold' : 'Silver'),
          phone: phone || (allCandidatePhones[0] || ''),
          phones: allCandidatePhones,
          isMobile,
          phoneType: isMobile ? 'mobile' : (phone ? 'landline' : ''),
          whatsappAvailable: Boolean(whatsappLink || isMobile),
          whatsappLink: whatsappLink || (isMobile ? `https://wa.me/${phone.replace(/\D/g,'')}` : ''),
          email: allCandidateEmails[0] || '',
          emails: allCandidateEmails,
          website: socialIntel?.linkInBio || profileUrl,
          linkInBio: socialIntel?.linkInBio || '',
          description: socialIntel?.bio || snippet,
          instagram: platformDomain.includes('instagram') ? profileUrl : '',
          instagramFollowers: platformDomain.includes('instagram') ? (socialIntel?.followers || followers) : '',
          facebook: platformDomain.includes('facebook') ? profileUrl : '',
          facebookFollowers: platformDomain.includes('facebook') ? (socialIntel?.followers || followers) : '',
          tiktok: platformDomain.includes('tiktok') ? profileUrl : '',
          tiktokFollowers: platformDomain.includes('tiktok') ? (socialIntel?.followers || followers) : '',
          pinterest: platformDomain.includes('pinterest') ? profileUrl : '',
          youtube: platformDomain.includes('youtube') ? profileUrl : '',
          linkedin: platformDomain.includes('linkedin') ? profileUrl : '',
          twitter: (platformDomain.includes('twitter') || platformDomain.includes('x.com')) ? profileUrl : '',
          source: `Social Discovery (${platformName})`
        };
        dbAdapter.saveVendor(userId || 'admin_1', newLead);
        try { emitVendorCallback(newLead, 'inserted'); } catch (e) {}
        try {
          const { streamingEnricher } = require('../../services/phoneBackfillService');
          streamingEnricher.enqueue(newLead);
        } catch (e) {}
        addLog(`[Social Discovery] ✓ ${platformName}: "${cleanName}"${followers ? ` (${followers})` : ''}${phone ? ` 📞${phone}` : ''} [${assignedZone}]`);
        totalInserted++;
      }
    }

    addLog(`[Social Discovery] Done: ${platformName} inserted ${totalInserted} leads for "${exactQuery}".`);
    return { totalScraped: totalInserted, found: results.length };
  } catch (error) {
    addLog(`[Social Discovery] Failed to scrape ${platformDomain}: ${error.message}`);
    return { totalScraped: 0, error: error.message };
  }
}

module.exports = {
  scrapeDuckDuckGoDork,
  setLogger,
  setDeps
};
