/**
 * socialMediaScraper.js
 *
 * Enterprise Playwright Stealth Social Scraper for Instagram & Facebook.
 * Specialised in dismissing login dialogs, expanding truncated bios,
 * inspecting hidden contact triggers, and harvesting complete business dossiers:
 *
 *  - Direct mobile & landline numbers
 *  - Official email addresses
 *  - WhatsApp direct links
 *  - Link-in-Bio hubs (Linktree, Taplink, Carrd, Bio.link)
 *  - Complete postal addresses & location hints
 *  - Audience metrics: Followers, Following, Posts count
 *  - Uncut bio & about descriptions
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { launchStealthBrowser, applyAdvancedStealth } = require('../core/browserFactory');
const { extractPhones, extractEmails, extractSocialContacts, normalizePhone } = require('../../utils/phoneUtils');

const BOT_USER_AGENT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const EXCLUDED_HOSTS = ['instagram.com', 'facebook.com', 'meta.com', 'meta.ai', 'threads.net', 'whatsapp.com', 'fb.com', 'fb.me', 'cdninstagram.com', 'muse.ai'];

function isExternalLink(url) {
  if (!url || !url.startsWith('http')) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return !EXCLUDED_HOSTS.some(ex => host === ex || host.endsWith('.' + ex));
  } catch (e) {
    return false;
  }
}

/**
 * Normalizes any Facebook or Instagram URL, ensuring proper scheme.
 */
function normalizeSocialUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

/**
 * Fast-path OpenGraph crawler fallback for Instagram & Facebook.
 */
async function crawlSocialViaOpenGraph(url, countryCode = 'IN') {
  const result = {
    name: '',
    bio: '',
    phones: [],
    emails: [],
    whatsappLink: '',
    linkInBio: '',
    followers: '',
    following: '',
    posts: '',
    address: '',
    ok: false,
    source: 'opengraph_fallback'
  };

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': BOT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 7000,
      validateStatus: s => s >= 200 && s < 400
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) return result;

    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

    result.name = ogTitle.split(/[|·•(]/)[0].trim();

    // Check script tags for embedded Polaris biography
    let scriptBio = '';
    $('script').each((_, el) => {
      const text = $(el).html() || '';
      if (!scriptBio && text.includes('"biography":')) {
        const m = text.match(/"biography"\s*:\s*"((?:\\.|[^"\\])*)"/);
        if (m) {
          try { scriptBio = JSON.parse(`"${m[1]}"`); } catch (e) { scriptBio = m[1]; }
        }
      }
    });

    result.bio = scriptBio || ogDesc;

    // Follower counts
    const countMatch = ogDesc.match(/([\d.,KkMm]+)\s*Followers,\s*([\d.,KkMm]+)\s*Following,\s*([\d.,KkMm]+)\s*Posts/i);
    if (countMatch) {
      result.followers = countMatch[1];
      result.following = countMatch[2];
      result.posts = countMatch[3];
    } else {
      const fbFollowers = ogDesc.match(/([\d.,KkMm]+)\s*followers/i);
      if (fbFollowers) result.followers = fbFollowers[1];
    }

    // Extract phones & emails from bio + description
    const fullText = `${ogTitle} ${ogDesc} ${scriptBio}`;
    const parsedPhones = extractPhones(fullText, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
    parsedPhones.forEach(p => {
      const val = p.displayPhone || p.national || p.e164;
      if (val && !result.phones.includes(val)) result.phones.push(val);
      if (p.isMobile && !result.whatsappLink) {
        result.whatsappLink = `https://wa.me/${p.digits || p.national}`;
      }
    });

    result.emails = extractEmails(fullText);

    // Extract link-in-bio if present in script or text
    const urlMatches = fullText.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    for (const u of urlMatches) {
      if (isExternalLink(u)) {
        result.linkInBio = u;
        break;
      }
    }

    result.ok = result.phones.length > 0 || Boolean(result.bio);
  } catch (err) {
    // Non-fatal fallback
  }

  return result;
}

/**
 * Scrapes a Facebook page by dismissing login modals with Playwright.
 */
async function scrapeFacebookPage(rawUrl, countryCode = 'IN') {
  const url = normalizeSocialUrl(rawUrl);
  if (!url || !url.includes('facebook.com')) return { ok: false };

  const result = {
    name: '',
    bio: '',
    phones: [],
    emails: [],
    whatsappLink: '',
    address: '',
    followers: '',
    following: '',
    ok: false,
    source: 'playwright_facebook'
  };

  let handle;
  let context;
  try {
    handle = await launchStealthBrowser(false, null, true);
    context = await handle.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: handle.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    if (applyAdvancedStealth) await applyAdvancedStealth(page);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Dismiss Facebook login popup/dialog
    const fbCloseSelectors = [
      'div[aria-label="Close"]',
      'div[aria-label="close"]',
      'div[role="button"][aria-label="Close"]',
      'svg[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("Not Now")'
    ];

    for (const sel of fbCloseSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await el.click().catch(() => {});
          await page.waitForTimeout(600);
          break;
        }
      } catch (e) {}
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const title = await page.title();
    result.name = title.replace(/\s*[|·•]\s*(Facebook|Home).*$/i, '').trim();

    const pageText = await page.evaluate(() => document.body.innerText || '');

    // Extract phones
    const extractedPhones = extractPhones(pageText, {
      defaultCountry: countryCode,
      allowInternational: countryCode !== 'IN'
    });
    extractedPhones.forEach(p => {
      const val = p.displayPhone || p.national || p.e164;
      if (val && !result.phones.includes(val)) result.phones.push(val);
      if (p.isMobile && !result.whatsappLink) {
        result.whatsappLink = `https://wa.me/${p.digits || p.national}`;
      }
    });

    // Extract emails
    result.emails = extractEmails(pageText);

    // Extract followers
    const followMatch = pageText.match(/([\d.,KkMm]+)\s*followers/i);
    if (followMatch) result.followers = followMatch[1];
    const followIngMatch = pageText.match(/([\d.,KkMm]+)\s*following/i);
    if (followIngMatch) result.following = followIngMatch[1];

    // Extract address & intro
    const addressMatch = pageText.match(/(?:Intro\s+)?([^\n]+(?:India|Andhra Pradesh|Telangana|Street|Road|Mandal|District|City|State)[^\n]*)/i);
    if (addressMatch) {
      result.address = addressMatch[1].trim();
    }

    // Extract intro bio
    const introIdx = pageText.indexOf('Intro\n');
    if (introIdx !== -1) {
      result.bio = pageText.slice(introIdx + 6, introIdx + 400).split('\n\n')[0].replace(/\s+/g, ' ').trim();
    }

    result.ok = result.phones.length > 0 || Boolean(result.bio);
  } catch (err) {
    // If Playwright encountered an issue, fallback to fast OpenGraph crawler
    const ogFallback = await crawlSocialViaOpenGraph(url, countryCode);
    if (ogFallback.ok) return ogFallback;
  } finally {
    if (context) await context.close().catch(() => {});
    if (handle?.browser) await handle.browser.close().catch(() => {});
  }

  return result;
}

/**
 * Scrapes an Instagram profile by dismissing login modals & expanding bio with Playwright.
 */
async function scrapeInstagramProfile(rawUrlOrHandle, countryCode = 'IN') {
  let cleanHandle = String(rawUrlOrHandle || '').trim();
  if (cleanHandle.includes('instagram.com/')) {
    const m = cleanHandle.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (m) cleanHandle = m[1];
  }
  cleanHandle = cleanHandle.replace(/^@/, '').replace(/\/$/, '');
  if (!cleanHandle || ['p', 'reel', 'reels', 'explore', 'stories'].includes(cleanHandle.toLowerCase())) {
    return { ok: false };
  }

  const url = `https://www.instagram.com/${cleanHandle}/`;

  const result = {
    handle: cleanHandle,
    profileUrl: url,
    name: '',
    bio: '',
    phones: [],
    emails: [],
    whatsappLink: '',
    linkInBio: '',
    followers: '',
    following: '',
    posts: '',
    ok: false,
    source: 'playwright_instagram'
  };

  let handle;
  let context;
  try {
    handle = await launchStealthBrowser(false, null, true);
    context = await handle.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: handle.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    if (applyAdvancedStealth) await applyAdvancedStealth(page);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Dismiss login modals
    const igCloseSelectors = [
      'svg[aria-label="Close"]',
      'button:has-text("Close")',
      'button:has-text("Not Now")',
      'button:has-text("Cancel")',
      '[role="dialog"] button',
      'div[role="button"][tabindex="0"]',
      'div[aria-label="Close"]'
    ];

    for (const sel of igCloseSelectors) {
      try {
        const els = await page.$$(sel);
        for (const el of els) {
          if (await el.isVisible()) {
            await el.click().catch(() => {});
            await page.waitForTimeout(500);
            break;
          }
        }
      } catch (e) {}
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Expand truncated bio ("... more")
    try {
      const moreBtn = await page.$('span:has-text("... more"), button:has-text("more"), div:has-text("... more")');
      if (moreBtn && await moreBtn.isVisible()) {
        await moreBtn.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    } catch (e) {}

    // Click contact button if present
    try {
      const contactBtn = await page.$('button:has-text("Contact"), a:has-text("Contact"), div[role="button"]:has-text("Contact")');
      if (contactBtn && await contactBtn.isVisible()) {
        await contactBtn.click().catch(() => {});
        await page.waitForTimeout(600);
      }
    } catch (e) {}

    const title = await page.title();
    result.name = title.split('(@')[0].trim();

    // Read header / main text
    const headerText = await page.evaluate(() => {
      const h = document.querySelector('header') || document.querySelector('main') || document.body;
      return h ? h.innerText : '';
    });

    result.bio = headerText.replace(/\s+/g, ' ').slice(0, 500);

    // Extract follower metrics
    const metrics = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:description"]');
      return meta ? meta.getAttribute('content') : '';
    });
    if (metrics) {
      const m = metrics.match(/([\d.,KkMm]+)\s*Followers,\s*([\d.,KkMm]+)\s*Following,\s*([\d.,KkMm]+)\s*Posts/i);
      if (m) {
        result.followers = m[1];
        result.following = m[2];
        result.posts = m[3];
      }
    }

    // Extract phones & emails
    const extractedPhones = extractPhones(headerText, {
      defaultCountry: countryCode,
      allowInternational: countryCode !== 'IN'
    });
    extractedPhones.forEach(p => {
      const val = p.displayPhone || p.national || p.e164;
      if (val && !result.phones.includes(val)) result.phones.push(val);
      if (p.isMobile && !result.whatsappLink) {
        result.whatsappLink = `https://wa.me/${p.digits || p.national}`;
      }
    });

    result.emails = extractEmails(headerText);

    // Extract external links in bio
    const externalLinks = await page.evaluate(() => {
      const EXCLUDES = ['instagram.', 'facebook.', 'meta.', 'threads.', 'whatsapp.', 'fb.me', 'cdninstagram.'];
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(h => h.startsWith('http') && !EXCLUDES.some(ex => h.includes(ex)));
    });
    if (externalLinks.length > 0) {
      result.linkInBio = externalLinks[0];
    }

    result.ok = result.phones.length > 0 || Boolean(result.bio);
  } catch (err) {
    // Fallback to fast OpenGraph crawler
    const ogFallback = await crawlSocialViaOpenGraph(url, countryCode);
    if (ogFallback.ok) return ogFallback;
  } finally {
    if (context) await context.close().catch(() => {});
    if (handle?.browser) await handle.browser.close().catch(() => {});
  }

  return result;
}

/**
 * Fast-path OpenGraph crawler for TikTok profiles (US, UK, AU, etc.).
 * Strictly banned and bypassed in India.
 */
async function crawlTikTokViaOpenGraph(url, countryCode = 'US') {
  const result = {
    name: '',
    bio: '',
    phones: [],
    emails: [],
    whatsappLink: '',
    linkInBio: '',
    followers: '',
    likes: '',
    tiktok: '',
    ok: false,
    source: 'tiktok_opengraph'
  };

  // Policy Guard: TikTok is strictly banned in India
  if (String(countryCode || '').toUpperCase() === 'IN') {
    return { ...result, error: 'TikTok is banned in India' };
  }

  if (!url || typeof url !== 'string' || !url.includes('tiktok.com')) return result;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 3500,
      validateStatus: s => s >= 200 && s < 400
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) return result;

    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

    result.name = ogTitle.split(/[@(·|]/)[0].trim();
    result.bio = ogDesc;
    result.tiktok = url;

    // Follower and like metrics (e.g. "12.5K Followers, 150 Following, 240.2K Likes")
    const countMatch = ogDesc.match(/([\d.,KkMm]+)\s*Followers/i);
    if (countMatch) result.followers = countMatch[1];
    const likesMatch = ogDesc.match(/([\d.,KkMm]+)\s*Likes/i);
    if (likesMatch) result.likes = likesMatch[1];

    // Fallback: parse embedded JSON rehydration script tags if OpenGraph metadata was truncated
    if (!result.bio || !result.followers) {
      $('script').each((_, el) => {
        const text = $(el).html() || '';
        if (text.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__') || text.includes('webapp.user-detail')) {
          try {
            const data = JSON.parse(text);
            const userDetail = data['__DEFAULT_SCOPE__']?.['webapp.user-detail']?.userInfo;
            if (userDetail) {
              if (!result.name) result.name = userDetail.user?.nickname || userDetail.user?.uniqueId || '';
              if (!result.bio) result.bio = userDetail.user?.signature || '';
              if (!result.followers && userDetail.stats?.followerCount) result.followers = String(userDetail.stats.followerCount);
              if (!result.likes && userDetail.stats?.heartCount) result.likes = String(userDetail.stats.heartCount);
            }
          } catch (e) {}
        } else if (text.includes('SIGI_STATE') || text.includes('UserModule')) {
          const mFollowers = text.match(/"followerCount"\s*:\s*(\d+)/);
          if (mFollowers && !result.followers) result.followers = mFollowers[1];
          const mSignature = text.match(/"signature"\s*:\s*"((?:\\.|[^"\\])*)"/);
          if (mSignature && !result.bio) {
            try { result.bio = JSON.parse(`"${mSignature[1]}"`); } catch (e) { result.bio = mSignature[1]; }
          }
        }
      });
    }

    const fullText = `${ogTitle} ${ogDesc} ${result.bio}`;
    const parsedPhones = extractPhones(fullText, { defaultCountry: countryCode, allowInternational: true });
    parsedPhones.forEach(p => {
      const val = p.displayPhone || p.national || p.e164;
      if (val && !result.phones.includes(val)) result.phones.push(val);
      if (p.isMobile && !result.whatsappLink) {
        result.whatsappLink = `https://wa.me/${p.digits || p.national}`;
      }
    });

    result.emails = extractEmails(fullText);
    result.ok = result.phones.length > 0 || Boolean(result.bio) || Boolean(result.followers);
  } catch (err) {
    // Non-fatal fallback
  }

  return result;
}

/**
 * Fast-path OpenGraph crawler for Twitter / X profiles.
 */
async function crawlTwitterOrXViaOpenGraph(url, countryCode = 'US') {
  const result = {
    name: '',
    bio: '',
    phones: [],
    emails: [],
    whatsappLink: '',
    linkInBio: '',
    followers: '',
    twitter: '',
    ok: false,
    source: 'twitter_opengraph'
  };

  if (!url || typeof url !== 'string' || (!url.includes('twitter.com') && !url.includes('x.com'))) return result;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': BOT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 4500,
      validateStatus: s => s >= 200 && s < 400
    });

    const html = typeof res.data === 'string' ? res.data : '';
    if (!html) return result;

    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

    result.name = ogTitle.split(/[@(·|/]/)[0].trim();
    result.bio = ogDesc;
    result.twitter = url;

    // Extract follower counts
    const countMatch = ogDesc.match(/([\d.,KkMm]+)\s*Followers/i);
    if (countMatch) result.followers = countMatch[1];

    const fullText = `${ogTitle} ${ogDesc}`;
    const parsedPhones = extractPhones(fullText, { defaultCountry: countryCode, allowInternational: countryCode !== 'IN' });
    parsedPhones.forEach(p => {
      const val = p.displayPhone || p.national || p.e164;
      if (val && !result.phones.includes(val)) result.phones.push(val);
      if (p.isMobile && !result.whatsappLink) {
        result.whatsappLink = `https://wa.me/${p.digits || p.national}`;
      }
    });

    result.emails = extractEmails(fullText);
    result.ok = result.phones.length > 0 || Boolean(result.bio) || Boolean(result.followers);
  } catch (err) {
    // Non-fatal fallback
  }

  return result;
}

/**
 * Universal social profile intelligence harvester.
 */
async function scrapeSocialProfile(url, countryCode = 'IN') {
  if (!url || typeof url !== 'string') return { ok: false };
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) {
    return await crawlTikTokViaOpenGraph(url, countryCode);
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return await crawlTwitterOrXViaOpenGraph(url, countryCode);
  }
  if (lower.includes('facebook.com')) {
    return await scrapeFacebookPage(url, countryCode);
  }
  if (lower.includes('instagram.com')) {
    return await scrapeInstagramProfile(url, countryCode);
  }
  return { ok: false };
}

module.exports = {
  scrapeFacebookPage,
  scrapeInstagramProfile,
  scrapeSocialProfile,
  crawlSocialViaOpenGraph,
  crawlTikTokViaOpenGraph,
  crawlTwitterOrXViaOpenGraph,
  normalizeSocialUrl
};
