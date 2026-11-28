'use strict';

/**
 * publicApi.js
 * Factual live server telemetry and rate-limited 10-lead real preview endpoint.
 * Zero invented numbers, zero hardcoded fake leads.
 */

const geo = require('../geo');
const taxonomy = require('../taxonomy');
const { classifyQuery } = require('../taxonomy/classifier');
const { getPaymentProviderForCountry, PAYMENT_PROVIDERS_BY_COUNTRY } = require('../services/paymentConfig');
const { scrapeSovereignSingleZone } = require('../engines/directories');
const { scrapeDeepWebSerp } = require('../engines/serp');
const { normalizeLead } = require('../engines/contract');
const store = require('../store');

const previewRateMap = new Map();
const PREVIEW_WINDOW_MS = 60 * 1000;
const PREVIEW_MAX_PER_MIN = 8;

function allowPreviewIp(ip) {
  const now = Date.now();
  const key = String(ip || 'local');
  const entry = previewRateMap.get(key) || { count: 0, resetAt: now + PREVIEW_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + PREVIEW_WINDOW_MS;
  }
  entry.count += 1;
  previewRateMap.set(key, entry);
  return entry.count <= PREVIEW_MAX_PER_MIN;
}

function registerPublicRoutes(app, orchestrator) {
  // 1. Live Factual Telemetry (only real counts computed from runtime & geo tables)
  app.get('/api/public/stats', (req, res) => {
    const activeSet = new Set(geo.ACTIVE_MARKETS || ['IN', 'US', 'GB', 'AU', 'AE']);
    const cityEntries = Object.values(geo.KNOWN_CITIES || {}).filter((c) => activeSet.has(String(c.country || '').toUpperCase()));
    const indexedCities = cityEntries.length;
    const indexedZones = cityEntries.reduce(
      (sum, c) => sum + (Array.isArray(c.zones) && c.zones.length > 0 ? c.zones.length : 1),
      0
    );
    const marketsOnline = activeSet.size;
    const allLeads = store.getAllVendors();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayMs = startOfDay.getTime();

    let harvestedToday = 0;
    for (const l of allLeads) {
      const ts = l.updatedAt || l.createdAt || l.harvestedAt || 0;
      const ms = typeof ts === 'number' ? ts : Date.parse(ts) || 0;
      if (ms >= dayMs) harvestedToday += 1;
    }
    for (const sess of orchestrator.activeSessions.values()) {
      if ((sess.startTime || 0) >= dayMs) {
        harvestedToday = Math.max(harvestedToday, Number(sess.leadsHarvested || 0));
      }
    }

    const mem = process.memoryUsage();
    res.json({
      ok: true,
      marketsOnline,
      indexedCities,
      indexedZones,
      leadsInVault: allLeads.length,
      leadsHarvestedToday: harvestedToday,
      ramMb: Math.round(mem.rss / (1024 * 1024)),
      freeTrialDays: 7,
      timestamp: Date.now()
    });
  });

  // 2. Enhanced Taxonomy Expansion with Umbrella vs Strict Niche Metadata
  app.get('/api/public/taxonomy-check', (req, res) => {
    const q = String(req.query.q || '').trim();
    const country = String(req.query.country || 'IN').toUpperCase();
    if (!q) return res.json({ ok: true, query: '', country, isParticular: false, subvectors: [] });
    const specificity = classifyQuery(q, country);
    const subvectors = taxonomy.getSubvectorsForQuery(q, country).slice(0, 8);
    res.json({
      ok: true,
      query: q,
      country,
      isParticular: Boolean(specificity.isParticular),
      mode: specificity.isParticular ? 'niche' : 'umbrella',
      subvectors
    });
  });

  // 2b. Unified Frontend <-> Backend Search Classification Contract
  app.all('/api/search/classify', (req, res) => {
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const { normalizeScrapeIntent, expandCompoundSearchPhrases } = require('../services/queryNormalizer');
    const intent = normalizeScrapeIntent({ query: src.query || src.q || '', location: src.city || src.location || '', country: src.country || 'IN' });
    const spec = classifyQuery(intent.query, intent.country);
    const subvectors = spec.subvectors?.length ? spec.subvectors : taxonomy.getSubvectorsForQuery(intent.query, intent.country);
    const phrases = expandCompoundSearchPhrases(intent.query);
    res.json({
      ok: true,
      normalized: intent,
      phrases,
      classification: {
        key: spec.key,
        mode: spec.isGeneric ? 'umbrella' : 'particular',
        intentType: spec.intentType || 'service',
        businessModelLabel: spec.businessModelLabel || 'Service',
        isProductQuery: Boolean(spec.isProductQuery),
        isGeneric: Boolean(spec.isGeneric),
        isParticular: Boolean(spec.isParticular),
        label: spec.label,
        categoryFamily: spec.categoryFamily,
        subcategories: subvectors
      }
    });
  });

  // 2c. Live Differentiated Category & Sub-Category Catalog (Services vs Product Stores vs Venues vs B2B across 5 Active Countries)
  app.get('/api/search/taxonomy', (req, res) => {
    const cc = String(req.query.country || 'IN').toUpperCase();
    const { UMBRELLA_REGISTRY } = require('../taxonomy/umbrellas');
    const { PRODUCT_TO_STORE_REGISTRY, resolveIntentForUmbrellaKey } = require('../taxonomy/intentDifferentiator');
    const { PARTICULAR_NICHE_REGISTRY } = require('../taxonomy/classifier');
    const pickSubs = (map = {}) => map[cc] || map.default || [];
    const seenKeys = new Set();
    const items = [];
    const pushItem = (item) => {
      if (!item || !item.key || seenKeys.has(item.key)) return;
      seenKeys.add(item.key);
      items.push(item);
    };

    for (const u of UMBRELLA_REGISTRY) {
      pushItem({
        key: u.key,
        label: u.label,
        intentType: resolveIntentForUmbrellaKey(u.key),
        query: u.key.replace(/_/g, ' '),
        subcategories: pickSubs(u.subcategoriesByCountry)
      });
    }
    for (const p of PRODUCT_TO_STORE_REGISTRY) {
      pushItem({
        key: p.key,
        label: p.label,
        intentType: 'store',
        isProductStore: true,
        query: p.label.split(',')[0].split('&')[0].trim(),
        subcategories: pickSubs(p.byCountry)
      });
    }
    const tradeKeys = ['plumbing_trades', 'electrical_trades', 'hvac_trades', 'roofing_trades', 'pest_control', 'cleaning_services', 'solar_energy', 'borewell_pump_repair', 'geyser_appliance_repair', 'business_formation_pro'];
    for (const n of PARTICULAR_NICHE_REGISTRY.filter((x) => tradeKeys.includes(x.key))) {
      pushItem({
        key: n.key,
        label: n.label,
        intentType: 'service',
        query: n.label.split('&')[0].trim(),
        subcategories: pickSubs(n.synonyms)
      });
    }
    res.json({ ok: true, country: cc, activeMarkets: geo.ACTIVE_MARKETS, totalCategories: items.length, categories: items });
  });

  // 2d. 5-Country Payment Gateway Config (Pricing tiers configured separately)
  app.get('/api/billing/providers', (req, res) => {
    const cc = String(req.query.country || '').toUpperCase();
    if (cc) {
      return res.json({ ok: true, provider: getPaymentProviderForCountry(cc) });
    }
    res.json({ ok: true, activeMarkets: geo.ACTIVE_MARKETS, providers: PAYMENT_PROVIDERS_BY_COUNTRY });
  });

  // 3. Rate-Limited 10-Lead Real Preview
  app.get('/api/public/preview', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'local';
    if (!allowPreviewIp(ip)) {
      return res.status(429).json({
        ok: false,
        rateLimited: true,
        message: 'Preview rate limit reached. Wait a moment or open the workspace.'
      });
    }

    const query = String(req.query.q || req.query.query || '').trim();
    const country = String(req.query.country || 'IN').toUpperCase();
    const geoData = geo.resolveZones(req.query.city || '', country);
    const city = String(req.query.city || geoData.cityName || '').trim();

    if (!query) {
      return res.status(400).json({ ok: false, message: 'Enter a business category to preview.' });
    }

    const specificity = classifyQuery(query, country);
    const matchesPurity = (lead) => {
      if (!lead || !lead.name) return false;
      const text = `${lead.name} ${lead.category || ''} ${lead.subcategory || ''} ${lead.query || ''}`.toLowerCase();
      if (specificity.rejectRe && specificity.rejectRe.test(text)) return false;
      if (specificity.strictFilterRe) return specificity.strictFilterRe.test(text);
      const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
      return tokens.length === 0 || tokens.some((t) => text.includes(t));
    };

    // Check real leads already in vault for this country & city
    const vaultMatches = store
      .getAllVendors({ country })
      .filter((l) => (!city || geo.isWithinCityBounds(l, city)) && matchesPurity(l))
      .slice(0, 10);

    if (vaultMatches.length >= 5) {
      return res.json({
        ok: true,
        source: 'vault',
        query,
        city: city || geoData.cityName,
        country,
        mode: specificity.isParticular ? 'niche' : 'umbrella',
        leads: vaultMatches
      });
    }

    // Otherwise run a fast, capped live single-zone directory + SERP query (4.5s budget)
    const firstZone = geoData.zones?.[0] || { name: city, lat: geoData.center.lat, lng: geoData.center.lng };
    const collected = [...vaultMatches];
    const seen = new Set(collected.map((l) => String(l.name || '').toLowerCase()));

    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 4500));
      const livePromise = Promise.allSettled([
        typeof scrapeSovereignSingleZone === 'function'
          ? scrapeSovereignSingleZone({ query, city: city || geoData.cityName, zone: firstZone.name, country, maxPages: 1 })
          : Promise.resolve([]),
        typeof scrapeDeepWebSerp === 'function'
          ? scrapeDeepWebSerp({ query, location: `${firstZone.name}, ${city || geoData.cityName}`, country, maxPages: 1 })
          : Promise.resolve([])
      ]).then((results) => results.flatMap((r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])));

      const rawItems = await Promise.race([livePromise, timeoutPromise]);
      for (const raw of rawItems) {
        if (collected.length >= 10) break;
        const norm = normalizeLead({ ...raw, country, city: raw.city || city || geoData.cityName, query }, raw.source || 'directory');
        const key = String(norm.name || '').toLowerCase();
        if (!key || seen.has(key) || !matchesPurity(norm)) continue;
        seen.add(key);
        store.upsertVendor(norm);
        collected.push(norm);
      }
    } catch (_) {}

    return res.json({
      ok: true,
      source: 'live',
      query,
      city: city || geoData.cityName,
      country,
      mode: specificity.isParticular ? 'niche' : 'umbrella',
      leads: collected.slice(0, 10)
    });
  });
}

module.exports = { registerPublicRoutes };
