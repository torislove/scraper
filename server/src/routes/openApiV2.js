'use strict';

/**
 * openApiV2.js — Public Open API v2 for Scraper Leads & Integrations.
 *
 * Endpoints:
 *   GET  /api/v2/leads          - High performance filterable query for external services
 *   GET  /api/v2/leads/stream   - Real-time Server-Sent Events stream of scraped leads
 *   POST /api/v2/scrape         - Programmatic scrape execution
 *   GET  /api/v2/leads/export   - Multi-format export (JSON, CSV, XLSX, VCF)
 *   GET  /api/v2/stats          - Global dataset analytics
 */

const express = require('express');
const router = express.Router();
const dbAdapter = require('../config/dbAdapter');
const liveStreams = require('../services/liveStreams');
const { buildGodLevelExcelBuffer } = require('../utils/godLevelExcelGenerator');
const { normalizePhone, extractPhones } = require('../utils/phoneUtils');
const { getCountryTaxonomy } = require('../utils/internationalAdminUnits');

/**
 * Filter utility for leads
 */
function filterLeads(leads, query = {}) {
  let list = Array.isArray(leads) ? leads : [];
  const {
    country,
    category,
    city,
    location,
    minRating,
    hasPhone,
    hasEmail,
    isMobile,
    search
  } = query;

  if (country) {
    const c = String(country).toUpperCase();
    list = list.filter(v => (v.country || 'IN').toUpperCase() === c);
  }

  if (category) {
    const cat = String(category).toLowerCase();
    list = list.filter(v => (v.category || '').toLowerCase().includes(cat));
  }

  const targetCity = city || location;
  if (targetCity) {
    const cit = String(targetCity).toLowerCase();
    list = list.filter(v => (v.city || v.address || '').toLowerCase().includes(cit));
  }

  if (minRating) {
    const r = parseFloat(minRating);
    if (!isNaN(r)) {
      list = list.filter(v => (parseFloat(v.rating) || 0) >= r);
    }
  }

  if (hasPhone === 'true' || hasPhone === '1') {
    list = list.filter(v => Boolean(v.phone || (v.phones && v.phones.length > 0)));
  }

  if (hasEmail === 'true' || hasEmail === '1') {
    list = list.filter(v => Boolean(v.email || (v.emails && v.emails.length > 0)));
  }

  if (isMobile === 'true' || isMobile === '1') {
    list = list.filter(v => Boolean(v.isMobile || v.whatsappLink));
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.category || '').toLowerCase().includes(q) ||
      (v.city || '').toLowerCase().includes(q) ||
      (v.address || '').toLowerCase().includes(q) ||
      (v.phone || '').includes(q)
    );
  }

  return list;
}

/**
 * GET /api/v2/leads
 * Query leads with pagination and rich filters
 */
router.get('/leads', (req, res) => {
  try {
    const all = dbAdapter.getVendors() || [];
    const filtered = filterLeads(all, req.query);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const data = filtered.slice(offset, offset + limit);
    const totalPages = Math.ceil(filtered.length / limit) || 1;

    return res.json({
      success: true,
      total: filtered.length,
      page,
      limit,
      totalPages,
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v2/leads/stream
 * Server-Sent Events stream for external systems
 */
router.get('/leads/stream', (req, res) => {
  try {
    // liveStreams.attachLog handles all headers, heartbeats, and client lifecycle
    liveStreams.attachLog(req, res);
  } catch (err) {
    console.error('[Open API v2] Stream error:', err.message);
    try { res.end(); } catch (e) {}
  }
});

/**
 * POST /api/v2/scrape
 * Programmatic trigger for lead scraping
 */
router.post('/scrape', async (req, res) => {
  try {
    const {
      category,
      location,
      country = 'IN',
      strategy = 'omni',
      engines,
      userId = 'api_client',
      webhookUrl
    } = req.body;

    if (!category || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: category and location'
      });
    }

    const sessionId = `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Delegate to scrape endpoint via internal fetch or queue
    const { addScrapeJob } = require('../utils/queue');
    const { parseUniversalQuery } = require('../utils/universalQueryEngine');
    const sources = require('../services/sources/registry');

    const runCountry = sources.normaliseCountry(country) || 'IN';
    const activeEngines = (Array.isArray(engines) && engines.length)
      ? engines
      : sources.enginesForCountry(runCountry);

    // Schedule orchestrator job
    await addScrapeJob(
      'scrapeOmniOrchestrator',
      [
        category,
        location,
        strategy,
        15, // radius
        'medium', // gridDensity
        activeEngines,
        sessionId,
        userId,
        {}, // filters
        null, // plan
        Boolean(req.body.isMaster || req.body.mode === 'master_sweep'), // isMaster
        runCountry
      ],
      15,
      { category, location, sessionId, country: runCountry, webhookUrl }
    );

    return res.json({
      success: true,
      sessionId,
      status: 'started',
      country: runCountry,
      engines: activeEngines,
      message: `Scrape started for "${category}" in "${location}" (${runCountry}). Monitor at /api/v2/leads/stream or /api/sessions/${sessionId}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v2/leads/export
 * Multi-format export (JSON, CSV, XLSX, VCF)
 */
router.get('/leads/export', async (req, res) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const all = dbAdapter.getVendors() || [];
    const filtered = filterLeads(all, req.query);
    const baseName = `leads_export_${Date.now().toString(36)}`;

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildGodLevelExcelBuffer(filtered, {
        category: req.query.category || 'All Categories',
        city: req.query.city || req.query.location || 'Global'
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.json"`);
      return res.send(JSON.stringify(filtered, null, 2));
    }

    if (format === 'vcf') {
      const vcards = filtered.map(v => {
        const name = v.name || 'Vendor';
        const phone = v.phone || '';
        const email = v.email || '';
        const city = v.city || '';
        const country = v.country || '';
        const org = v.category || '';
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${name}`,
          org ? `ORG:${org}` : '',
          phone ? `TEL;TYPE=WORK,VOICE:${phone}` : '',
          email ? `EMAIL;TYPE=PREF,INTERNET:${email}` : '',
          city || country ? `ADR;TYPE=WORK:;;${city};;;;${country}` : '',
          'END:VCARD'
        ].filter(Boolean).join('\r\n');
      }).join('\r\n\r\n');

      res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.vcf"`);
      return res.send(vcards);
    }

    // Default: CSV
    const escapeCsv = val => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;
    const headers = [
      'ID', 'Name', 'Category', 'Phone', 'Is Mobile', 'Email', 'Website',
      'Address', 'City', 'Country', 'Rating', 'Reviews Count', 'Source', 'Instagram', 'Facebook'
    ];
    const rows = [headers.join(',')];

    for (const v of filtered) {
      rows.push([
        escapeCsv(v.id || ''),
        escapeCsv(v.name || ''),
        escapeCsv(v.category || ''),
        escapeCsv(v.phone || ''),
        escapeCsv(v.isMobile ? 'Yes' : 'No'),
        escapeCsv(v.email || ''),
        escapeCsv(v.website || ''),
        escapeCsv(v.address || ''),
        escapeCsv(v.city || ''),
        escapeCsv(v.country || 'IN'),
        escapeCsv(v.rating || ''),
        escapeCsv(v.reviewsCount || v.reviewCount || ''),
        escapeCsv(v.source || ''),
        escapeCsv(v.instagram || ''),
        escapeCsv(v.facebook || '')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
    return res.send(rows.join('\r\n'));
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v2/stats
 * Overview analytics
 */
router.get('/stats', (req, res) => {
  try {
    const all = dbAdapter.getVendors() || [];
    const countries = {};
    const categories = {};
    let withPhone = 0;
    let withMobile = 0;
    let withEmail = 0;
    let withWebsite = 0;

    for (const v of all) {
      const c = (v.country || 'IN').toUpperCase();
      countries[c] = (countries[c] || 0) + 1;

      const cat = v.category || 'Other';
      categories[cat] = (categories[cat] || 0) + 1;

      if (v.phone) withPhone++;
      if (v.isMobile || v.whatsappLink) withMobile++;
      if (v.email) withEmail++;
      if (v.website) withWebsite++;
    }

    return res.json({
      success: true,
      totalLeads: all.length,
      metrics: {
        withPhone,
        withMobile,
        withEmail,
        withWebsite
      },
      countries,
      topCategories: Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v2/taxonomy
 * Administrative geo-hierarchy for India + key global countries
 */
router.get('/taxonomy', (req, res) => {
  try {
    const country = req.query.country ? String(req.query.country).toUpperCase() : null;
    const data = getCountryTaxonomy(country);
    if (!data) {
      return res.status(404).json({ success: false, error: `Taxonomy not found for country: ${country}` });
    }
    return res.json({ success: true, taxonomy: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
