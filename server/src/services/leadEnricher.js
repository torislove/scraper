'use strict';

/**
 * server/src/services/leadEnricher.js
 * Three-Priority Zero-Timeout Contact & Mobile Rescue Engine:
 * 1. Fast Website Lane (up to 48 workers): homepage + /contact + /about crawl + TLS fallback.
 * 2. Priority Phone Rescue Lane (16 workers): rescues missing/0-prefixed mobiles via Google Place,
 *    JustDial (IN), and Bing TLS BEFORE spending cycles on social-only lookups.
 * 3. Social Enrichment Lane (8 workers): Bing ck/a-unwrapped Instagram/Facebook/LinkedIn/Email enrichment.
 */

const https = require('https');
const http = require('http');
const store = require('../store');
const sse = require('../sse');
const HardwareSafetyEngine = require('./hardwareSafety');
const { localHttpAgent, sharedHttpsAgent } = require('./concurrency');
const { extractDeepBusinessContacts } = require('../engines/contactExtractor');
const { parsePhoneDetails, extractPhonesFromText, BLACKLISTED_PHONES } = require('../engines/phoneUtils');
const { isValidBusinessEmail, namesMatchLoosely, checkDomainMx, getRegistrableDomain, sanitizeSocialUrl } = require('../taxonomy/safetyFilter');
const { extractStreetToken, parseAddress } = require('./addressParser');
const { lookupBusinessInJustdial } = require('../engines/justdial');
const { lookupPlaceInGoogleMaps } = require('../engines/gmapDirect');

function postJson(url, payload, timeoutMs = 5500) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const data = JSON.stringify(payload);
      const req = http.request({
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        agent: localHttpAgent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch (_) { resolve(null); } });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(data);
      req.end();
    } catch (_) { resolve(null); }
  });
}

function httpsGetText(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, {
        agent: sharedHttpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode !== 200) { res.resume(); return resolve(''); }
        let d = '';
        res.on('data', chunk => { d += chunk; if (d.length > 220000) { res.destroy(); resolve(d); } });
        res.on('end', () => resolve(d));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (_) { resolve(''); }
  });
}

function unwrapBingHtml(html) {
  if (!html || !html.includes('bing.com/ck/a')) return html || '';
  return html.replace(/https?:\/\/(?:www\.)?bing\.com\/ck\/a\?[^"'\s<>]+/gi, (raw) => {
    try {
      const u = new URL(raw.replace(/&amp;/gi, '&')).searchParams.get('u');
      if (u && u.startsWith('a1')) {
        const decoded = Buffer.from(u.slice(2).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
    } catch (_) {}
    return raw;
  });
}

function parseDossierHtml(rawHtml, country = 'IN') {
  if (!rawHtml) return {};
  const html = unwrapBingHtml(rawHtml);
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const result = {};
  const phoneInfo = extractPhonesFromText(cleanText, country);
  if (phoneInfo.mobilePhone) {
    result.mobilePhone = phoneInfo.mobilePhone;
    const p = parsePhoneDetails(phoneInfo.mobilePhone, country);
    result.phone = p.primary || phoneInfo.mobilePhone;
    result.isMobile = true;
    result.whatsappLink = phoneInfo.whatsappLink;
    result.whatsappAvailable = true;
  } else if (phoneInfo.landlinePhone) {
    result.landlinePhone = phoneInfo.landlinePhone;
    result.phone = phoneInfo.landlinePhone;
    result.isLandline = true;
  }

  const emailMatches = cleanText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,15}/g) || [];
  const validEmails = emailMatches.filter((e) => !/(bing\.com|duckduckgo|microsoft)/i.test(e) && isValidBusinessEmail(e));
  if (validEmails.length > 0) result.email = validEmails[0].toLowerCase();

  const ig = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/i);
  if (ig) {
    const cleanIg = sanitizeSocialUrl(`https://instagram.com/${ig[1]}`, 'instagram');
    if (cleanIg) result.instagram = cleanIg;
  }
  const fb = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9_.-]+)/i);
  if (fb) {
    const cleanFb = sanitizeSocialUrl(`https://facebook.com/${fb[1]}`, 'facebook');
    if (cleanFb) result.facebook = cleanFb;
  }
  const li = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_.-]+)/i);
  if (li) result.linkedin = `https://linkedin.com/company/${li[1]}`;
  const yt = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_.-]+)/i);
  if (yt) {
    const cleanYt = sanitizeSocialUrl(`https://youtube.com/@${yt[1]}`, 'youtube');
    if (cleanYt) result.youtube = cleanYt;
  }
  return result;
}

function bingMatchesLeadIdentity(rawHtml, lead = {}) {
  if (!rawHtml) return false;
  const hay = rawHtml.toLowerCase();
  const phoneDigits = String(lead.phone || lead.mobilePhone || '').replace(/\D/g, '').slice(-10);
  if (phoneDigits.length >= 8 && hay.replace(/\D/g, '').includes(phoneDigits)) return true;
  const parsedAddr = parseAddress(lead.address || '', lead.country || 'IN', lead.city || '');
  const zip = String(lead.postalCode || lead.pincode || parsedAddr.postalCode || '').trim().toLowerCase();
  const street = extractStreetToken(lead.address || '');
  if (zip && street && hay.includes(zip) && hay.includes(street)) return true;
  return false;
}

async function rescuePhoneAndBasics(lead, country = 'IN') {
  if (!lead) return {};
  const name = lead.name || '';
  const locality = lead.locality || lead.zone || '';
  const city = lead.city || '';
  const placeId = lead.placeId || '';
  const cc = String(country || lead.country || 'IN').toUpperCase();

  const skipGmapLookup = (lead.source === 'gmap_direct_rpc' && Boolean(lead.phone)) || lead.source === 'deep_web_serp';
  const [gmapPlace, jdMatch] = await Promise.all([
    (!lead.mobilePhone && !skipGmapLookup && (placeId || name))
      ? lookupPlaceInGoogleMaps({ name, locality, city, lat: lead.lat, lng: lead.lng, country: cc, placeId }).catch(() => null)
      : Promise.resolve(null),
    (cc === 'IN' && !lead.mobilePhone && lead.source !== 'deep_web_serp' && name && city)
      ? lookupBusinessInJustdial(name, locality, city).catch(() => null)
      : Promise.resolve(null)
  ]);

  const res = {};
  for (const hit of [gmapPlace, jdMatch]) {
    if (!hit) continue;
    if (!placeId && hit.name && !namesMatchLoosely(name, hit.name)) continue;
    if (hit.mobilePhone && !res.mobilePhone) {
      res.mobilePhone = hit.mobilePhone;
      res.phone = hit.phone || hit.mobilePhone;
      res.isMobile = true;
      res.whatsappLink = hit.whatsappLink || `https://wa.me/${String(hit.mobilePhone).replace(/\D/g, '')}`;
      res.whatsappAvailable = true;
    }
    if (hit.landlinePhone && !res.landlinePhone) res.landlinePhone = hit.landlinePhone;
    if (hit.phone && !res.phone) res.phone = hit.phone;
    if (hit.website && !res.website) res.website = hit.website;
    if (hit.mapsLink && !res.mapsLink) res.mapsLink = hit.mapsLink;
    if (hit.placeId && !res.placeId) res.placeId = hit.placeId;
    if (hit.rating && !res.rating) res.rating = hit.rating;
    if (hit.reviewsCount && !res.reviewsCount) res.reviewsCount = hit.reviewsCount;
  }

  // Domain-locked: never query blind Bing if website exists or for Web SERP leads
  if (res.mobilePhone || lead.website || lead.source === 'deep_web_serp') return res;

  const qPhone = `"${name}" ${city} phone OR mobile OR contact`;
  const bingHtml = await httpsGetText(`https://www.bing.com/search?adlt=strict&q=${encodeURIComponent(qPhone)}`, 3800);
  if (bingHtml && bingMatchesLeadIdentity(bingHtml, lead)) {
    return { ...parseDossierHtml(bingHtml, cc), ...res };
  }
  return res;
}

async function huntOnlineDossier(name, locality, city, country = 'IN', website = '', placeId = '', leadContext = {}) {
  const cc = String(country || 'IN').toUpperCase();
  const [sidecarRes, gmapPlace, jdMatch] = await Promise.all([
    website
      ? Promise.resolve(null)
      : postJson(`${(process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003').replace(/\/+$/, '')}/enrich/lead`, { name, locality, city, country: cc, website }, 6000),
    lookupPlaceInGoogleMaps({ name, locality, city, country: cc, placeId }).catch(() => null),
    cc === 'IN' ? lookupBusinessInJustdial(name, locality, city).catch(() => null) : Promise.resolve(null)
  ]);

  const res = {};
  for (const hit of [gmapPlace, jdMatch]) {
    if (!hit) continue;
    if (!placeId && hit.name && !namesMatchLoosely(name, hit.name)) continue;
    if (hit.mobilePhone && !res.mobilePhone) {
      res.mobilePhone = hit.mobilePhone;
      res.phone = hit.phone || hit.mobilePhone;
      res.isMobile = true;
      res.whatsappLink = hit.whatsappLink || `https://wa.me/${String(hit.mobilePhone).replace(/\D/g, '')}`;
      res.whatsappAvailable = true;
    }
    if (hit.landlinePhone && !res.landlinePhone) res.landlinePhone = hit.landlinePhone;
    if (hit.phone && !res.phone) res.phone = hit.phone;
    if (hit.website && !res.website) res.website = hit.website;
    if (hit.mapsLink && !res.mapsLink) res.mapsLink = hit.mapsLink;
    if (hit.rating && !res.rating) res.rating = hit.rating;
    if (hit.reviewsCount && !res.reviewsCount) res.reviewsCount = hit.reviewsCount;
  }

  if (sidecarRes?.success && sidecarRes.lead && bingMatchesLeadIdentity(JSON.stringify(sidecarRes.lead), { ...leadContext, name, city, country: cc })) {
    const l = sidecarRes.lead;
    if (l.mobilePhone && !res.mobilePhone) {
      const p = parsePhoneDetails(l.mobilePhone, cc);
      if (p.mobile) {
        res.mobilePhone = p.mobile;
        res.phone = p.primary || p.mobile;
        res.isMobile = true;
        res.whatsappLink = l.whatsappLink || p.whatsappLink;
        res.whatsappAvailable = true;
      }
    }
    if (l.landlinePhone && !res.landlinePhone) { res.landlinePhone = l.landlinePhone; res.isLandline = true; if (!res.phone) res.phone = l.landlinePhone; }
    if (l.email && isValidBusinessEmail(l.email) && !res.email) res.email = l.email;
    for (const k of ['instagram', 'facebook', 'linkedin', 'youtube']) {
      const cleanSoc = sanitizeSocialUrl(l[k] || '', k);
      if (cleanSoc && !res[k]) res[k] = cleanSoc;
    }
    for (const k of ['mapsLink', 'address', 'rating', 'reviewsCount']) {
      if (l[k] && !res[k]) res[k] = l[k];
    }
  }

  if (res.email && isValidBusinessEmail(res.email)) {
    const mxOk = await checkDomainMx(res.email);
    if (mxOk === false) res.email = '';
    else if (mxOk === true) res.emailVerified = true;
  }

  if (website || (res.mobilePhone && res.instagram && res.email)) return res;

  const queryStr = `"${name}" ${city} (instagram OR facebook OR linkedin OR phone)`;
  const bingHtml = await httpsGetText(`https://www.bing.com/search?adlt=strict&q=${encodeURIComponent(queryStr)}`, 3800);
  if (bingHtml && bingMatchesLeadIdentity(bingHtml, { ...leadContext, name, city, country: cc, phone: res.phone || leadContext.phone })) {
    return { ...parseDossierHtml(bingHtml, cc), ...res };
  }
  return res;
}

function applyHuntedToLead(lead, hunted) {
  let changed = false;
  if (!hunted) return false;
  const cc = String(lead.country || 'IN').toUpperCase();
  if (hunted.phone && !lead.phone) {
    const p = parsePhoneDetails(hunted.phone, cc);
    if (p.isMobile || p.isLandline) {
      lead.phone = p.primary || hunted.phone;
      if (p.isMobile && !lead.mobilePhone) {
        lead.mobilePhone = p.mobile;
        lead.isMobile = true;
        lead.verified = true;
        lead.whatsappAvailable = true;
        lead.whatsappLink = p.whatsappLink || `https://wa.me/${p.mobile.replace(/\D/g, '')}`;
      } else if (p.isLandline && !lead.landlinePhone) {
        lead.landlinePhone = p.landline || p.primary;
        lead.isLandline = true;
      }
      changed = true;
    }
  }
  if (hunted.mobilePhone && !lead.mobilePhone) {
    const p = parsePhoneDetails(hunted.mobilePhone, cc);
    if (p.mobile) {
      const d10 = p.mobile.replace(/\D/g, '').slice(-10);
      if (!BLACKLISTED_PHONES.has(d10)) {
        lead.mobilePhone = p.mobile;
        if (!lead.phone) lead.phone = p.primary || p.mobile;
        lead.isMobile = true;
        lead.verified = true;
        lead.whatsappAvailable = true;
        lead.whatsappLink = hunted.whatsappLink || p.whatsappLink || `https://wa.me/${p.mobile.replace(/\D/g, '')}`;
        changed = true;
      }
    }
  }
  if (hunted.landlinePhone && !lead.landlinePhone) {
    const p = parsePhoneDetails(hunted.landlinePhone, cc);
    if (p.isLandline || p.landline) {
      lead.landlinePhone = p.landline || p.primary;
      if (!lead.phone) lead.phone = lead.landlinePhone;
      lead.isLandline = true;
      changed = true;
    }
  }
  if (Array.isArray(hunted.phones) && hunted.phones.length > 0) {
    const existingSet = new Set(Array.isArray(lead.phones) ? lead.phones : []);
    for (const rawP of hunted.phones) {
      const p = parsePhoneDetails(rawP, cc);
      if ((p.isMobile || p.isLandline) && p.primary && !existingSet.has(p.primary)) {
        existingSet.add(p.primary);
        changed = true;
      }
    }
    lead.phones = Array.from(existingSet);
  }
  if (hunted.website && !lead.website) { lead.website = hunted.website; changed = true; }
  if (hunted.placeId && !lead.placeId) { lead.placeId = hunted.placeId; changed = true; }
  if (hunted.email && isValidBusinessEmail(hunted.email) && (!lead.email || !isValidBusinessEmail(lead.email))) {
    lead.email = hunted.email.toLowerCase();
    lead.emails = Array.from(new Set([...(lead.emails || []).filter(isValidBusinessEmail), lead.email]));
    changed = true;
  }
  for (const k of ['instagram', 'facebook', 'linkedin', 'youtube', 'mapsLink']) {
    if (hunted[k] && !lead[k]) { lead[k] = hunted[k]; changed = true; }
  }
  if (hunted.mapsLink && !lead.googleMapsUrl) { lead.googleMapsUrl = hunted.mapsLink; changed = true; }
  if (hunted.rating && !lead.rating) { lead.rating = hunted.rating; changed = true; }
  if (hunted.reviewsCount && !lead.reviewsCount) { lead.reviewsCount = hunted.reviewsCount; changed = true; }
  if (hunted.address && (!lead.address || lead.address === lead.city)) { lead.address = hunted.address; changed = true; }
  return changed;
}

const _lastEnrichEmit = new Map();
function finalizeEnrichedLead(lead, sessionId) {
  const socials = [lead.instagram, lead.facebook, lead.linkedin, lead.twitter, lead.youtube].filter(Boolean);
  lead.socialMediaCount = socials.length;
  lead._socialCount = socials.length;
  store.saveVendor(lead, sessionId);
  const sid = sessionId || lead.sessionId || null;
  sse.broadcastVendor(lead, sid);
  if (sid) {
    const now = Date.now();
    if (now - (_lastEnrichEmit.get(sid) || 0) >= 180) {
      _lastEnrichEmit.set(sid, now);
      const sessLeads = store.getVendorsBySession(sid);
      let phonesFound = 0, mobilesFound = 0, landlinesFound = 0, emailsFound = 0;
      for (const l of sessLeads) {
        if (l.mobilePhone || l.isMobile) { mobilesFound++; phonesFound++; }
        else if (l.phone || l.landlinePhone) { landlinesFound++; phonesFound++; }
        if (l.email || (Array.isArray(l.emails) && l.emails.length > 0)) emailsFound++;
      }
      sse.broadcastProgress({ sessionId: sid, status: 'running', vendorsFound: sessLeads.length, phonesFound, mobilesFound, landlinesFound, emailsFound }, sid);
    }
  }
}

async function enrichVendor(vendorId) {
  const lead = store.getVendorById(vendorId);
  if (!lead) return { ok: false, message: 'Vendor not found in active store' };
  const country = lead.country || 'IN';
  if (lead.website) { try { await extractDeepBusinessContacts(lead, country); } catch (_) {} }
  if (!lead.phone || !lead.mobilePhone || !lead.instagram || !lead.facebook || !lead.email) {
    try {
      const hunted = await huntOnlineDossier(lead.name, lead.locality, lead.city, country, lead.website, lead.placeId);
      applyHuntedToLead(lead, hunted);
    } catch (_) {}
  }
  finalizeEnrichedLead(lead, lead.sessionId);
  return { ok: true, success: true, vendor: lead };
}

const websiteQueue = [];
const zeroPhoneRescueQueue = [];
const phoneRescueQueue = [];
const socialEnrichQueue = [];
const stoppedSessions = new Set();
let activeWebWorkers = 0;
let activeRescueWorkers = 0;
let activeSocialWorkers = 0;

function abortSessionEnrichment(sessionId) {
  if (!sessionId) return;
  stoppedSessions.add(sessionId);
  if (stoppedSessions.size > 40) {
    const first = stoppedSessions.values().next().value;
    stoppedSessions.delete(first);
  }
  const keep = (item) => item && item.sessionId !== sessionId;
  for (const q of [websiteQueue, zeroPhoneRescueQueue, phoneRescueQueue, socialEnrichQueue]) {
    const filtered = q.filter(keep);
    q.length = 0;
    q.push(...filtered);
  }
}

function getWorkerLimits() {
  const prof = HardwareSafetyEngine.getProfile();
  return {
    maxWeb: Math.max(16, Math.min(48, Number(prof.webEnrichWorkers || 32))),
    maxRescue: Math.max(8, Math.min(20, Number(prof.huntWorkers || 16))),
    maxSocial: 8
  };
}

function getEnricherStats() {
  return {
    activeWebWorkers,
    activeHuntWorkers: activeRescueWorkers + activeSocialWorkers,
    websiteQueue: websiteQueue.length,
    hunterQueue: zeroPhoneRescueQueue.length + phoneRescueQueue.length + socialEnrichQueue.length
  };
}

function enqueuePhoneRescue(item, lead) {
  if (!item || !lead) return;
  const hasAnyPhone = Boolean(lead.phone || lead.mobilePhone || lead.landlinePhone);
  if (!hasAnyPhone) {
    if (zeroPhoneRescueQueue.length < 18000) {
      zeroPhoneRescueQueue.push(item);
      pumpPhoneRescueQueue();
    }
    return;
  }
  if (!lead.mobilePhone && phoneRescueQueue.length < 6000) {
    phoneRescueQueue.push(item);
    pumpPhoneRescueQueue();
  }
}

function pumpWebsiteQueue() {
  const { maxWeb } = getWorkerLimits();
  while (activeWebWorkers < maxWeb && websiteQueue.length > 0) {
    const item = websiteQueue.shift();
    if (!item || stoppedSessions.has(item.sessionId)) continue;
    activeWebWorkers++;
    (async () => {
      try {
        const { lead, sessionId, country } = item;
        const changed = await extractDeepBusinessContacts(lead, country);
        if (stoppedSessions.has(sessionId)) return;
        if (changed) finalizeEnrichedLead(lead, sessionId);
        if (!lead.mobilePhone) {
          enqueuePhoneRescue(item, lead);
        } else if ((!lead.email || !lead.instagram) && socialEnrichQueue.length < 2500) {
          socialEnrichQueue.push(item);
          pumpSocialQueue();
        }
      } catch (_) {} finally {
        activeWebWorkers--;
        pumpWebsiteQueue();
      }
    })();
  }
}

function pumpPhoneRescueQueue() {
  const { maxRescue } = getWorkerLimits();
  while (activeRescueWorkers < maxRescue && (zeroPhoneRescueQueue.length > 0 || phoneRescueQueue.length > 0)) {
    // Priority Tier 1: Leads with zero phone (!phone && !mobilePhone && !landlinePhone) ALWAYS drain first
    const item = zeroPhoneRescueQueue.length > 0 ? zeroPhoneRescueQueue.shift() : phoneRescueQueue.shift();
    if (!item || stoppedSessions.has(item.sessionId)) continue;
    activeRescueWorkers++;
    (async () => {
      try {
        const { lead, sessionId, country } = item;
        if (!lead.mobilePhone && !stoppedSessions.has(sessionId)) {
          const rescued = await rescuePhoneAndBasics(lead, country);
          if (!stoppedSessions.has(sessionId) && applyHuntedToLead(lead, rescued)) {
            finalizeEnrichedLead(lead, sessionId);
          }
        }
      } catch (_) {} finally {
        activeRescueWorkers--;
        pumpPhoneRescueQueue();
        if (zeroPhoneRescueQueue.length === 0 && phoneRescueQueue.length < 150) pumpSocialQueue();
      }
    })();
  }
}

function pumpSocialQueue() {
  if (zeroPhoneRescueQueue.length > 0 || phoneRescueQueue.length > 150) return;
  const { maxSocial } = getWorkerLimits();
  const limit = phoneRescueQueue.length > 25 ? Math.min(4, maxSocial) : maxSocial;
  while (activeSocialWorkers < limit && socialEnrichQueue.length > 0) {
    const item = socialEnrichQueue.shift();
    if (!item || stoppedSessions.has(item.sessionId)) continue;
    activeSocialWorkers++;
    (async () => {
      try {
        const { lead, sessionId, country } = item;
        if (lead.website) return;
        const missingSocialOrEmail = !lead.email || !lead.instagram || !lead.facebook;
        if (missingSocialOrEmail && !stoppedSessions.has(sessionId)) {
          const hunted = await postJson(`${(process.env.TLS_SIDECAR_URL || 'http://127.0.0.1:5003').replace(/\/+$/, '')}/enrich/lead`, {
            name: lead.name, locality: lead.locality, city: lead.city, country, website: ''
          }, 5500);
          if (!stoppedSessions.has(sessionId) && hunted?.success && hunted.lead && bingMatchesLeadIdentity(JSON.stringify(hunted.lead), lead) && applyHuntedToLead(lead, hunted.lead)) {
            finalizeEnrichedLead(lead, sessionId);
          }
        }
      } catch (_) {} finally {
        activeSocialWorkers--;
        pumpSocialQueue();
      }
    })();
  }
}

function queueLeadEnrichment(lead, sessionId, country = 'IN') {
  if (!lead || stoppedSessions.has(sessionId)) return;
  const needsWeb = lead.website && (!lead.email || !lead.mobilePhone || !lead.instagram || !lead.facebook || !lead.linkedin || !lead.whatsappLink);
  if (needsWeb) {
    websiteQueue.push({ lead, sessionId, country });
    pumpWebsiteQueue();
    return;
  }
  if (!lead.mobilePhone || (!lead.phone && !lead.landlinePhone)) {
    enqueuePhoneRescue({ lead, sessionId, country }, lead);
    return;
  }
  if ((!lead.email || !lead.instagram || !lead.facebook) && socialEnrichQueue.length < 3000) {
    socialEnrichQueue.push({ lead, sessionId, country });
    pumpSocialQueue();
  }
}

async function drainPhoneRescue(sessionId, timeoutMs = 18000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hasZero = zeroPhoneRescueQueue.some((i) => i.sessionId === sessionId);
    const hasUpgrade = phoneRescueQueue.some((i) => i.sessionId === sessionId);
    if (!hasZero && !hasUpgrade && activeRescueWorkers === 0) break;
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function enrichBatchLeads(ids = [], sessionId = null) {
  const idList = Array.isArray(ids) ? ids.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 250) : [];
  let queuedWeb = 0;
  let queuedHunt = 0;
  for (const id of idList) {
    const lead = store.getVendorById(id) || store.vendors?.get?.(id);
    if (!lead) continue;
    const country = lead.country || 'IN';
    const sid = lead.sessionId || sessionId || null;
    if (lead.website) {
      websiteQueue.push({ lead, sessionId: sid, country });
      queuedWeb++;
    } else if (!lead.mobilePhone) {
      phoneRescueQueue.push({ lead, sessionId: sid, country });
      queuedHunt++;
    } else if (socialEnrichQueue.length < 3000) {
      socialEnrichQueue.push({ lead, sessionId: sid, country });
      queuedHunt++;
    }
  }
  if (queuedWeb > 0) pumpWebsiteQueue();
  if (queuedHunt > 0) { pumpPhoneRescueQueue(); pumpSocialQueue(); }
  return { ok: true, queued: queuedWeb + queuedHunt, queuedWeb, queuedHunt, stats: getEnricherStats() };
}

module.exports = {
  enrichVendor,
  huntOnlineDossier,
  rescuePhoneAndBasics,
  queueLeadEnrichment,
  drainPhoneRescue,
  abortSessionEnrichment,
  enrichBatchLeads,
  getEnricherStats
};
