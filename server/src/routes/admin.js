/**
 * admin.js — Master Administrative Endpoints for the dedicated Admin Panel.
 *
 * Provides central governance over:
 *  1. Unified Fleet Telemetry (Master Scraper + Client Scrapers)
 *  2. Connected Scraped Data Hub (Cross-workspace session & lead aggregation with Macro Families & Sub-Vectors)
 *  3. 11-Country Regional Metrics & Boundary Verification
 *  4. Live Popup & Announcement Studio (Multi-Format Designer & Presets)
 *  5. Client Accounts, Plans & Licensing Management
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const paths = require('../config/paths');
const { SESSIONS_DIR } = paths;
const store = require('../services/masterStore');
const authModule = require('./auth');
const popupConfigService = require('../services/popupConfigService');
const { COUNTRY_ENGINE_MAP } = require('../services/scopeEngines/countryEngineMap');

function safeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

// Category Family Classifier
function classifyCategoryFamily(category = '', name = '') {
  const text = `${category} ${name}`.toLowerCase();
  if (/dent|tooth|teeth|oral|implant|ortho|doctor|clinic|hospital|pediatric|maternity|gynec|surgeon|eye|ophthal|cardio|medic|health|patholog|diagnos|ayurved|homeo/i.test(text)) {
    return { family: 'Healthcare & Medical', icon: '🏥' };
  }
  if (/photo|studio|wedding|video|shoot|camera|film|cinemat|media|portrait|album|framing/i.test(text)) {
    return { family: 'Photography, Studios & Media', icon: '📸' };
  }
  if (/turmeric|spice|wholesale|trader|supplier|distributor|export|import|mandi|grain|cotton|agri|farmer|seed|fertilizer/i.test(text)) {
    return { family: 'B2B Wholesale & Agriculture', icon: '🌾' };
  }
  if (/hvac|plumb|electric|contractor|roof|solar|construct|build|paint|carpenter|repair|ac service|fabricat/i.test(text)) {
    return { family: 'Home & Commercial Services', icon: '🔨' };
  }
  if (/account|tax|ca|legal|lawyer|advocate|consult|broker|finance|real estate|freight|logistics|software|transport/i.test(text)) {
    return { family: 'Corporate & Professional', icon: '💼' };
  }
  if (/hotel|restaurant|resort|cater|banquet|hall|cafe|bar|bakery|food|mandap|function hall/i.test(text)) {
    return { family: 'Hospitality & Events', icon: '🍽️' };
  }
  return { family: 'General Commercial', icon: '🏢' };
}

// Country code resolver using phone prefix or location
function inferCountry(lead, sessionData) {
  if (lead.country && String(lead.country).trim().length === 2) {
    return String(lead.country).toUpperCase();
  }
  if (sessionData?.country && String(sessionData.country).trim().length === 2) {
    return String(sessionData.country).toUpperCase();
  }
  const phone = String(lead.phone || lead.mobile || '');
  if (phone.startsWith('+91') || phone.startsWith('91') || /^(?:0)?[6-9]\d{9}$/.test(phone)) return 'IN';
  if (phone.startsWith('+1') || phone.startsWith('1')) return 'US';
  if (phone.startsWith('+44') || phone.startsWith('44')) return 'GB';
  if (phone.startsWith('+61') || phone.startsWith('61')) return 'AU';
  if (phone.startsWith('+971') || phone.startsWith('971')) return 'AE';
  if (phone.startsWith('+65') || phone.startsWith('65')) return 'SG';
  if (phone.startsWith('+64') || phone.startsWith('64')) return 'NZ';
  if (phone.startsWith('+27') || phone.startsWith('27')) return 'ZA';
  if (phone.startsWith('+353') || phone.startsWith('353')) return 'IE';
  if (phone.startsWith('+60') || phone.startsWith('60')) return 'MY';
  if (phone.startsWith('+49') || phone.startsWith('49')) return 'DE';

  const loc = `${lead.city || ''} ${lead.address || ''} ${sessionData?.location || ''}`.toLowerCase();
  if (/texas|dallas|austin|california|los angeles|new york|chicago|florida|houston/i.test(loc)) return 'US';
  if (/london|birmingham|manchester|leeds|glasgow/i.test(loc)) return 'GB';
  if (/sydney|melbourne|brisbane|perth/i.test(loc)) return 'AU';
  if (/dubai|abu dhabi|sharjah/i.test(loc)) return 'AE';
  if (/toronto|vancouver|montreal|calgary/i.test(loc)) return 'CA';
  if (/singapore/i.test(loc)) return 'SG';

  return 'IN';
}

// Check WhatsApp readiness
function isWhatsAppCapable(lead) {
  return Boolean(
    lead.whatsappAvailable ||
    lead.hasWhatsApp ||
    (lead.whatsappLink && String(lead.whatsappLink).length > 5) ||
    lead.phoneType?.includes('WhatsApp') ||
    lead.tier?.includes('WhatsApp') ||
    lead.channel?.includes('WhatsApp') ||
    lead.isMobile === true
  );
}

// Master vs Client Scraper Fleet Detection
function isMasterFleetSession(sessionData, dirName) {
  return Boolean(
    sessionData.isMasterSweep ||
    sessionData.metadata?.isMasterSweep ||
    sessionData.metadata?.coverage?.mode === 'deep' ||
    (sessionData.metadata?.totalZones && sessionData.metadata.totalZones >= 30) ||
    sessionData.metadata?.scope === 'state' ||
    sessionData.metadata?.scope === 'district' ||
    dirName === 'master' ||
    sessionData.userId === 'master'
  );
}

// Admin Security Guard
function requireAdmin(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const key = process.env.ADMIN_KEY || process.env.MASTER_KEY;
  if (key && req.headers['x-admin-key'] !== key && req.headers['x-master-key'] !== key) {
    if (process.env.AUTH_REQUIRED === '1') {
      return res.status(403).json({ error: 'Admin access key required.', code: 'admin_key_required' });
    }
  }
  return next();
}

router.use(requireAdmin);

/* ------------------------------------------------------------------ 1. Overview */

router.get('/overview', (req, res) => {
  try {
    const clients = store.listClients();
    const allWorkspaces = store.listWorkspaces ? store.listWorkspaces() : [];

    let totalSessions = 0;
    let masterSessions = 0;
    let clientSessions = 0;
    let totalLeads = 0;
    let masterLeads = 0;
    let clientLeads = 0;
    let totalPhones = 0;
    let totalWhatsApp = 0;
    let totalWebsites = 0;

    const countryCounts = {};
    const familyCounts = {};
    const categoryCounts = {};
    const recentSessions = [];

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(fullDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !data.id) continue;

            totalSessions++;
            const isMaster = isMasterFleetSession(data, dirName);

            if (isMaster) masterSessions++; else clientSessions++;

            const leads = Array.isArray(data.leads) ? data.leads : [];
            const lCount = Number(data.leadCount) || leads.length;
            totalLeads += lCount;
            if (isMaster) masterLeads += lCount; else clientLeads += lCount;

            let sPhones = 0;
            let sWA = 0;

            for (const lead of leads) {
              const c = inferCountry(lead, data);
              countryCounts[c] = (countryCounts[c] || 0) + 1;

              const { family } = classifyCategoryFamily(lead.category || data.category || '', lead.name || '');
              familyCounts[family] = (familyCounts[family] || 0) + 1;

              const cat = (lead.category || data.category || 'General').trim();
              if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

              const phone = lead.phone || lead.mobile || '';
              if (phone && !/Obfuscated|Requires/i.test(String(phone))) {
                totalPhones++;
                sPhones++;
                if (isWhatsAppCapable(lead)) {
                  totalWhatsApp++;
                  sWA++;
                }
              }

              if (lead.website && String(lead.website).length > 6) {
                totalWebsites++;
              }
            }

            recentSessions.push({
              id: data.id,
              name: data.name || `${data.category || 'Search'} · ${data.location || ''}`.trim(),
              category: data.category || '',
              location: data.location || '',
              country: inferCountry(leads[0] || {}, data),
              leadCount: lCount,
              phoneCount: sPhones,
              whatsAppCount: sWA,
              isMaster,
              timestamp: data.timestamp || data.createdAt || null
            });
          } catch (e) {}
        }
      }
    }

    recentSessions.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const phoneRate = totalLeads > 0 ? Math.round((totalPhones / totalLeads) * 100) : 0;
    const whatsAppRate = totalPhones > 0 ? Math.round((totalWhatsApp / totalPhones) * 100) : 0;

    res.json({
      success: true,
      fleet: {
        masterScraper: {
          status: 'ready',
          role: 'Master Fleet Flagship Scraper',
          countriesSupported: 11,
          totalSweeps: masterSessions,
          leadsHarvested: masterLeads,
          parallelEngines: 22
        },
        clientScrapers: {
          status: 'ready',
          role: 'Limited Client Scrapers',
          activeWorkspaces: allWorkspaces.length,
          registeredClients: clients.length,
          totalSearches: clientSessions,
          leadsHarvested: clientLeads
        }
      },
      metrics: {
        totalLeads,
        totalSessions,
        totalPhones,
        totalWhatsApp,
        totalWebsites,
        phoneRate,
        whatsAppRate,
        countryCounts,
        familyCounts,
        topCategories: Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, count]) => ({ name, count }))
      },
      recentSessions: recentSessions.slice(0, 6),
      system: {
        uptime: Math.round(process.uptime()),
        memory: process.memoryUsage(),
        node: process.version,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build admin overview', message: err.message });
  }
});

/* ------------------------------------------------------------------ 2. 11 Countries Metrics */

const ALL_11_COUNTRIES = [
  { code: 'IN', name: 'India', dialPrefix: '91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dialPrefix: '1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialPrefix: '44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialPrefix: '1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialPrefix: '61', flag: '🇦🇺' },
  { code: 'AE', name: 'United Arab Emirates', dialPrefix: '971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', dialPrefix: '65', flag: '🇸🇬' },
  { code: 'NZ', name: 'New Zealand', dialPrefix: '64', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', dialPrefix: '27', flag: '🇿🇦' },
  { code: 'IE', name: 'Ireland', dialPrefix: '353', flag: '🇮🇪' },
  { code: 'MY', name: 'Malaysia', dialPrefix: '60', flag: '🇲🇾' },
  { code: 'DE', name: 'Germany', dialPrefix: '49', flag: '🇩🇪' }
];

router.get('/metrics/countries', (req, res) => {
  try {
    const statsByCountry = {};
    for (const c of ALL_11_COUNTRIES) {
      statsByCountry[c.code] = {
        ...c,
        leadCount: 0,
        phoneCount: 0,
        whatsAppCount: 0,
        sessionCount: 0,
        families: {},
        engines: COUNTRY_ENGINE_MAP[c.code] || ['maps', 'google-local-finder']
      };
    }

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(fullDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.leads)) continue;

            const cCode = inferCountry(data.leads[0] || {}, data);
            if (statsByCountry[cCode]) {
              statsByCountry[cCode].sessionCount++;
            }

            for (const lead of data.leads) {
              const code = inferCountry(lead, data);
              if (!statsByCountry[code]) continue;

              statsByCountry[code].leadCount++;
              const phone = lead.phone || lead.mobile || '';
              if (phone && !/Obfuscated|Requires/i.test(String(phone))) {
                statsByCountry[code].phoneCount++;
                if (isWhatsAppCapable(lead)) {
                  statsByCountry[code].whatsAppCount++;
                }
              }

              const { family } = classifyCategoryFamily(lead.category || data.category || '', lead.name || '');
              statsByCountry[code].families[family] = (statsByCountry[code].families[family] || 0) + 1;
            }
          } catch (e) {}
        }
      }
    }

    const countries = Object.values(statsByCountry).map(c => ({
      ...c,
      phoneRate: c.leadCount > 0 ? Math.round((c.phoneCount / c.leadCount) * 100) : 0,
      whatsAppRate: c.phoneCount > 0 ? Math.round((c.whatsAppCount / c.phoneCount) * 100) : 0
    }));

    res.json({ success: true, countries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile country metrics', message: err.message });
  }
});

/* ------------------------------------------------------------------ 2.1 Customer Scraper Activity */

router.get('/customers/activity', (req, res) => {
  try {
    const clients = store.listClients();
    const users = authModule.getUsers ? authModule.getUsers() : [];
    const clientMap = new Map();
    clients.forEach(c => clientMap.set(c.id, c));
    users.forEach(u => {
      if (u && u.clientId && !clientMap.has(u.clientId)) {
        clientMap.set(u.clientId, { id: u.clientId, name: u.name || u.email, email: u.email, plan: u.plan });
      }
    });

    const userActivity = {};
    const recentQueries = [];

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

        const clientInfo = clientMap.get(dirName) || {};
        const displayName = clientInfo.name || (dirName === 'anonymous' ? 'Guest Demo Visitor' : (dirName === 'master' ? 'Master Fleet Operator' : `Client User (${dirName.slice(0, 10)})`));

        if (!userActivity[dirName]) {
          userActivity[dirName] = {
            id: dirName,
            name: displayName,
            email: clientInfo.email || (dirName === 'usr_l1k6elo_mwrwxi8i' ? 'enterprise@scraper.co.in' : null),
            plan: clientInfo.plan || (dirName === 'master' ? 'unlimited' : (dirName === 'usr_l1k6elo_mwrwxi8i' ? 'enterprise' : 'starter')),
            role: dirName === 'master' ? 'Master Heavy Sweeper' : (dirName === 'anonymous' ? 'Demo Visitor' : 'Customer Client'),
            totalSessions: 0,
            totalLeads: 0,
            countries: new Set(),
            topQueries: {},
            lastActive: null,
            recentSearches: []
          };
        }

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(fullDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !data.id) continue;

            const lCount = Number(data.leadCount) || (Array.isArray(data.leads) ? data.leads.length : 0);
            const query = data.query || data.category || data.keyword || 'General Discovery';
            const location = data.city || data.location || (data.metadata?.city) || 'Multiple Localities';
            const country = inferCountry(data.leads?.[0] || {}, data);
            const timestamp = data.createdAt || data.timestamp || null;

            userActivity[dirName].totalSessions++;
            userActivity[dirName].totalLeads += lCount;
            userActivity[dirName].countries.add(country);
            userActivity[dirName].topQueries[query] = (userActivity[dirName].topQueries[query] || 0) + 1;

            if (timestamp) {
              if (!userActivity[dirName].lastActive || timestamp > userActivity[dirName].lastActive) {
                userActivity[dirName].lastActive = timestamp;
              }
            }

            const searchItem = {
              id: data.id,
              userId: dirName,
              userName: displayName,
              query,
              location,
              country,
              leads: lCount,
              timestamp,
              isMaster: isMasterFleetSession(data, dirName)
            };

            userActivity[dirName].recentSearches.push(searchItem);
            recentQueries.push(searchItem);
          } catch (e) {}
        }
      }
    }

    recentQueries.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const customersList = Object.values(userActivity).map(u => ({
      ...u,
      countries: Array.from(u.countries),
      topQueries: Object.entries(u.topQueries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([q, count]) => ({ query: q, count })),
      recentSearches: u.recentSearches.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 6)
    })).sort((a, b) => b.totalLeads - a.totalLeads);

    res.json({
      success: true,
      totalCustomers: customersList.length,
      customers: customersList,
      recentQueries: recentQueries.slice(0, 15)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile customer activity', message: err.message });
  }
});

/* ------------------------------------------------------------------ 2.2 Trending Categories & Taxonomy */

router.get('/trends/categories', (req, res) => {
  try {
    const categoryCounts = {};
    const cityCounts = {};
    const familyTree = {};

    let totalLeadsScraped = 0;

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(fullDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !data.id) continue;

            const leads = Array.isArray(data.leads) ? data.leads : [];
            const lCount = Number(data.leadCount) || leads.length;
            totalLeadsScraped += lCount;

            const sessionCat = data.category || data.query || 'General Commercial';
            const sessionCity = data.city || data.location || (leads[0]?.city) || 'Multiple Regions';
            const country = inferCountry(leads[0] || {}, data);

            // Tally city stats
            if (!cityCounts[sessionCity]) {
              cityCounts[sessionCity] = { city: sessionCity, country, leads: 0, searches: 0, topCategory: sessionCat };
            }
            cityCounts[sessionCity].leads += lCount;
            cityCounts[sessionCity].searches++;

            for (const lead of leads) {
              const cat = lead.category || sessionCat;
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

              const { family, icon } = classifyCategoryFamily(cat, lead.name || '');
              if (!familyTree[family]) {
                familyTree[family] = {
                  family,
                  icon,
                  totalLeads: 0,
                  subCategories: {}
                };
              }
              familyTree[family].totalLeads++;
              familyTree[family].subCategories[cat] = (familyTree[family].subCategories[cat] || 0) + 1;
            }
          } catch (e) {}
        }
      }
    }

    const rankedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], index) => {
        const { family, icon } = classifyCategoryFamily(name, '');
        const percentage = totalLeadsScraped > 0 ? Math.round((count / totalLeadsScraped) * 100) : 0;
        return {
          rank: index + 1,
          name,
          category: name,
          categoryFamily: family,
          icon,
          leads: count,
          percentage
        };
      });

    const hotCities = Object.values(cityCounts)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8);

    const taxonomy = Object.values(familyTree)
      .sort((a, b) => b.totalLeads - a.totalLeads)
      .map(fam => ({
        ...fam,
        subCategories: Object.entries(fam.subCategories)
          .sort((a, b) => b[1] - a[1])
          .map(([sub, count]) => ({ name: sub, count }))
      }));

    res.json({
      success: true,
      totalLeadsScraped,
      rankedCategories: rankedCategories.slice(0, 15),
      hotCities,
      taxonomy
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile trending categories', message: err.message });
  }
});

/* ------------------------------------------------------------------ 3. Scraped Data Explorer */

router.get('/data/leads', (req, res) => {
  try {
    const {
      source = 'all', // 'all' | 'master' | 'client'
      country = 'ALL',
      family = 'ALL',
      category,
      q,
      hasPhone,
      hasWhatsApp,
      hasWebsite,
      limit = 100,
      page = 1
    } = req.query;

    const maxLimit = Math.min(Number(limit) || 100, 500);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * maxLimit;

    const queryLower = q ? String(q).toLowerCase() : null;
    const catLower = category ? String(category).toLowerCase() : null;
    const countryUpper = country && country !== 'ALL' ? String(country).toUpperCase() : null;
    const familyFilter = family && family !== 'ALL' ? String(family) : null;
    const requirePhone = String(hasPhone) === 'true' || hasPhone === '1';
    const requireWA = String(hasWhatsApp) === 'true' || hasWhatsApp === '1';
    const requireWeb = String(hasWebsite) === 'true' || hasWebsite === '1';

    const leads = [];
    const seen = new Set();
    const availableFamilies = {};

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(fullDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !Array.isArray(data.leads)) continue;

            const isMaster = isMasterFleetSession(data, dirName);

            if (source === 'master' && !isMaster) continue;
            if (source === 'client' && isMaster) continue;

            for (const lead of data.leads) {
              if (!lead || !lead.name) continue;

              const phone = lead.phone || lead.mobile || '';
              const phoneValid = phone && !/Obfuscated|Requires/i.test(String(phone));
              if (requirePhone && !phoneValid) continue;

              const isWA = isWhatsAppCapable(lead);
              if (requireWA && !isWA) continue;

              const hasWeb = Boolean(lead.website && String(lead.website).length > 6);
              if (requireWeb && !hasWeb) continue;

              const leadCountry = inferCountry(lead, data);
              if (countryUpper && leadCountry !== countryUpper) continue;

              const leadCat = lead.category || data.category || '';
              if (catLower && !String(leadCat).toLowerCase().includes(catLower)) continue;

              const { family: leadFamily, icon: familyIcon } = classifyCategoryFamily(leadCat, lead.name);
              availableFamilies[leadFamily] = (availableFamilies[leadFamily] || 0) + 1;

              if (familyFilter && leadFamily !== familyFilter) continue;

              if (queryLower) {
                const combined = `${lead.name} ${lead.city || ''} ${lead.location || ''} ${lead.address || ''} ${phone} ${leadCat}`.toLowerCase();
                if (!combined.includes(queryLower)) continue;
              }

              const dedupeKey = `${lead.name}_${phone}_${lead.city || ''}`.toLowerCase();
              if (seen.has(dedupeKey)) continue;
              seen.add(dedupeKey);

              // Generate direct click-to-chat WhatsApp link
              const cleanDigits = phone.replace(/[^0-9]/g, '');
              const waLink = cleanDigits.length >= 10
                ? (leadCountry === 'IN' && cleanDigits.length === 10 ? `https://wa.me/91${cleanDigits}` : `https://wa.me/${cleanDigits}`)
                : (lead.whatsappLink || null);

              leads.push({
                id: lead.id,
                name: lead.name,
                category: leadCat,
                family: leadFamily,
                familyIcon,
                city: lead.city || data.location || '',
                subVector: lead.city || lead.address || data.location || 'Local Grid',
                address: lead.address || '',
                country: leadCountry,
                phone: phoneValid ? phone : '',
                isMobile: Boolean(lead.isMobile || phoneValid),
                hasWhatsApp: isWA,
                whatsappLink: waLink,
                website: lead.website || null,
                email: lead.email || null,
                qualityScore: lead.qualityScore || (phoneValid ? 92 : 60),
                scraperSource: isMaster ? 'master' : 'client',
                fleetSource: isMaster ? 'master' : 'client',
                workspaceId: dirName,
                sessionId: data.id,
                scrapedAt: lead.scrapedAt || data.timestamp || null
              });
            }
          } catch (e) {}
        }
      }
    }

    const totalMatching = leads.length;
    const paginatedLeads = leads.slice(skip, skip + maxLimit);

    res.json({
      success: true,
      total: totalMatching,
      page: pageNum,
      limit: maxLimit,
      totalPages: Math.ceil(totalMatching / maxLimit),
      availableFamilies,
      leads: paginatedLeads
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search leads', message: err.message });
  }
});

router.post('/data/reset-leads', (req, res) => {
  try {
    const archiveDir = path.join(paths.DB_DIR, 'archive_previous_runs_' + Date.now());
    fs.mkdirSync(archiveDir, { recursive: true });

    let filesArchived = 0;
    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        if (dirName.startsWith('_')) continue;
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const destUserDir = path.join(archiveDir, dirName);
        fs.mkdirSync(destUserDir, { recursive: true });

        const files = fs.readdirSync(fullDir);
        for (const file of files) {
          try {
            fs.copyFileSync(path.join(fullDir, file), path.join(destUserDir, file));
            fs.unlinkSync(path.join(fullDir, file));
            filesArchived++;
          } catch (e) {}
        }
      }
    }

    const vendorsFile = path.join(paths.DATA_DIR, 'scraped_vendors.json');
    if (fs.existsSync(vendorsFile)) {
      fs.copyFileSync(vendorsFile, path.join(archiveDir, 'scraped_vendors.json'));
      fs.writeFileSync(vendorsFile, '{}', 'utf-8');
    }

    const journalFile = path.join(paths.DATA_DIR, 'vendors.journal.jsonl');
    if (fs.existsSync(journalFile)) {
      fs.writeFileSync(journalFile, '', 'utf-8');
    }

    res.json({
      success: true,
      message: 'All previous sessions and leads have been archived and wiped clean. Database is 100% fresh.',
      archiveDir,
      filesArchived
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset leads', message: err.message });
  }
});

/* ------------------------------------------------------------------ 4. Popup & Announcement Studio */

router.get('/popups', (req, res) => {
  try {
    const popups = popupConfigService.getPopups();
    res.json({ success: true, popups });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load popups configuration', message: err.message });
  }
});

const handleUpdatePopups = (req, res) => {
  try {
    const updated = popupConfigService.updatePopups(req.body || {});
    res.json({ success: true, popups: updated });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update popups configuration', message: err.message });
  }
};

router.put('/popups', handleUpdatePopups);
router.post('/popups', handleUpdatePopups);
router.post('/popups/config', handleUpdatePopups);

router.post('/popups/custom', (req, res) => {
  try {
    const updated = popupConfigService.addCustomPopup(req.body || {});
    res.json({ success: true, popups: updated });
  } catch (err) {
    res.status(400).json({ error: 'Failed to add custom popup', message: err.message });
  }
});

router.delete('/popups/custom/:id', (req, res) => {
  try {
    const updated = popupConfigService.deleteCustomPopup(req.params.id);
    res.json({ success: true, popups: updated });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete custom popup', message: err.message });
  }
});

router.post('/popups/reset', (req, res) => {
  try {
    const defaults = popupConfigService.resetToDefaults();
    res.json({ success: true, popups: defaults });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset popups configuration', message: err.message });
  }
});

/* ------------------------------------------------------------------ 5. Clients & Licenses */

router.get('/clients', (req, res) => {
  try {
    const users = authModule.getUsers();
    const byClientId = new Map();
    users.forEach(u => {
      if (u && u.clientId) byClientId.set(u.clientId, u);
    });
    const clients = store.listClients().map(c => {
      const u = byClientId.get(c.id);
      return {
        ...c,
        hasLogin: Boolean(u && (u.passwordHash || u.googleSub)),
        loginEmail: u?.email || c.email || '',
        lastLoginAt: u?.lastLoginAt || null
      };
    });
    res.json({ success: true, clients, plans: store.PLAN_CREDITS });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list clients', message: err.message });
  }
});

router.post('/clients', (req, res) => {
  try {
    const client = store.upsertClient(req.body || {});
    res.json({ success: true, client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/clients/:id', (req, res) => {
  const existing = store.getClient(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  try {
    const client = store.upsertClient({ ...req.body, id: existing.id });
    res.json({ success: true, client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/clients/:id', (req, res) => {
  store.deleteClient(req.params.id);
  res.json({ success: true });
});

router.post('/clients/:id/credentials', (req, res) => {
  const existing = store.getClient(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  try {
    const email = req.body?.email || existing.email;
    const password = req.body?.password;
    const user = authModule.provisionClientUser({
      clientId: existing.id,
      email,
      name: req.body?.name || existing.name,
      password,
      plan: existing.plan || 'starter'
    });
    if (email && email !== existing.email) {
      store.upsertClient({ id: existing.id, email });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/clients/:id/reset-code', (req, res) => {
  const existing = store.getClient(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Client not found' });
  try {
    const result = authModule.createResetCodeForClient(existing.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
