/**
 * enrichmentRoutes.js
 * Deep website enrichment, social extraction, and on-demand lead enrichment routes.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const shared = require('./scrapeShared');
const {
  activeSessions,
  batchProgress,
  sessionAbortSignals,
  isSessionAborted,
  isSessionActive,
  updateSessionTargetState,
  safeExecute,
  requestedCountry,
  getDistanceKm,
  formatEta,
  addLog,
  emitVendorEvent,
  emitGridEvent,
  emitDispatchEvent,
  emitProgressEvent,
  emitActivePointEvent,
  globalAbortSignal
} = shared;


const dbAdapter = require('../../config/dbAdapter');
const { fastWebsiteExtract } = require('../../utils/fastWebsiteExtractor');
const geoAI = require('../../utils/geoAI');
const browserBudget = require('../../utils/browserBudget');
const { addScrapeJob } = require('../../utils/queue');


router.post('/deep-enrich', async (req, res) => {
  try {
    const { leadIds, sessionId } = req.body;
    const allVendors = dbAdapter.getVendors();

    let targets = [];
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targets = allVendors.filter(v => leadIds.includes(v.id));
    } else if (sessionId) {
      targets = allVendors.filter(v => v.sessionId === sessionId);
    } else {
      // Default: all leads with a website that haven't been deep-extracted yet
      targets = allVendors.filter(v => v.website && v.website.startsWith('http') && (!v.emails || v.emails.length === 0));
    }

    if (targets.length === 0) {
      return res.json({ success: true, message: 'No eligible leads found for deep enrichment', targetCount: 0 });
    }

    addLog(`[Deep Enrich] âš¡ Customer triggered deep contact enrichment for ${targets.length} leads...`);
    res.json({ success: true, message: `Deep enrichment initiated for ${targets.length} leads in background`, targetCount: targets.length });

    // Background asynchronous enrichment with parallel workers (concurrency 6)
    (async () => {
      let enrichedCount = 0;
      let currentIndex = 0;
      const workerConcurrency = 6;

      const worker = async () => {
        while (currentIndex < targets.length) {
          if (globalAbortSignal.aborted) break;
          const lead = targets[currentIndex++];
          if (!lead || !lead.website || !lead.website.startsWith('http')) continue;

          try {
            const leadCountry = (require('../../services/localBrain/countries').detectCountry(
              [lead.country, lead.city, lead.district, lead.state].filter(Boolean).join(', ')
            ) || { code: 'IN' }).code;
            const webData = await fastWebsiteExtract(lead.website, lead.name, { defaultCountry: leadCountry, allowInternational: leadCountry !== 'IN' });
            if (webData && (webData.emails?.length > 0 || webData.instagram || webData.facebook || webData.phones?.length > 0 || webData.logo)) {
              const currentVendors = dbAdapter.getVendors();
              const targetIdx = currentVendors.findIndex(v => v.id === lead.id);
              if (targetIdx !== -1) {
                const item = currentVendors[targetIdx];
                item.emails = webData.emails || item.emails || [];
                item.email = webData.emails?.[0] || item.email || '';
                if (webData.instagram) item.instagram = webData.instagram;
                if (webData.facebook) item.facebook = webData.facebook;
                if (webData.linkedin) item.linkedin = webData.linkedin;
                if (webData.logo) item.logo = webData.logo;
                if (webData.gstin && !item.gstin) item.gstin = webData.gstin;
                if (webData.contactPerson && !item.contactPerson) item.contactPerson = webData.contactPerson;
                if (webData.pincode && !item.pincode) item.pincode = webData.pincode;
                if (webData.whatsappLink && !item.whatsappLink) {
                  item.whatsappLink = webData.whatsappLink;
                  item.whatsappAvailable = true;
                }
                if ((!item.phone || item.phone.includes('Requires')) && webData.phones?.length > 0) {
                  item.phone = webData.phones[0];
                }

                // Recalculate CRM quality score
                let score = 20;
                if (item.phone && !item.phone.includes('Requires')) score += 35;
                if (item.website && item.website.startsWith('http')) score += 20;
                if (item.emails && item.emails.length > 0) score += 15;
                if (item.rating && parseFloat(item.rating) >= 4.0) score += 10;
                item.qualityScore = Math.min(score, 100);
                item.tier = item.qualityScore >= 80 ? 'Premium' : (item.qualityScore >= 55 ? 'Standard' : 'Basic');

                currentVendors[targetIdx] = item;
                dbAdapter.saveVendor(item.userId || 'admin_1', item);

                try {
                  emitVendorEvent(item, 'updated');
                } catch (e) { }

                enrichedCount++;
              }
            }
          } catch (e) {
            // Continue to next lead
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(workerConcurrency, targets.length) }, worker));
      addLog(`[Deep Enrich] âœ… Completed deep enrichment: +${enrichedCount} leads enriched with verified owner contacts in parallel.`);
    })();
  } catch (err) {
    addLog(`[Deep Enrich Error] ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// Unified Parallel Batch Scrape (accepts either bulk tasks or queries)

router.post('/enrich-now', async (req, res) => {
  const { sessionId, leadIds } = req.body || {};
  const phoneBackfillService = require('../../services/phoneBackfillService');
  const allVendors = dbAdapter.getVendors();
  let targetLeads = allVendors;

  if (Array.isArray(leadIds) && leadIds.length > 0) {
    const idSet = new Set(leadIds);
    targetLeads = allVendors.filter(v => idSet.has(v.id));
  } else if (sessionId) {
    targetLeads = dbAdapter.getVendorsBySession(sessionId);
  }

  // Every lead without a mobile is a candidate. Name-search URLs are verified
  // against the place panel inside backfillPhones(), so they are safe to use.
  const missingMobile = targetLeads.filter(lead => !phoneBackfillService.hasValidMobile(lead.phone));

  if (!missingMobile.length) {
    return res.json({
      success: true,
      message: 'All selected leads already have verified mobile contacts.',
      filled: 0,
      candidates: 0
    });
  }

  addLog(`[On-Demand Enrich] Starting instant enrichment for ${missingMobile.length} leads...`);

  phoneBackfillService.backfillPhones({
    leads: missingMobile,
    sessionId: sessionId || 'manual_enrich',
    budgetMs: Math.min(300_000, Math.max(60_000, missingMobile.length * 2_000)),
    concurrency: 8,
    emit: (vendor, type) => { try { emitVendorEvent(vendor, type); } catch (e) { } },
    log: addLog
  }).then(summary => {
    addLog(`[On-Demand Enrich] Finished: ${summary.filled} contacts enriched (${summary.mobilesFound} mobile, ${summary.landlinesFound} landline).`);
  }).catch(err => {
    addLog(`[On-Demand Enrich] Error: ${err.message}`);
  });

  return res.json({
    success: true,
    message: `Enrichment started for ${missingMobile.length} leads. Contacts will stream to the table in real time.`,
    candidateCount: missingMobile.length
  });
});

// Fast Zone Plan endpoint (<10ms) for User-RAM Browser Web Workers

module.exports = router;
