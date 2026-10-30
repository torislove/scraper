const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Safe imports of models
let Vendor;
let CrmActivity;
try {
  Vendor = require('../models/Vendor');
  CrmActivity = require('../models/CrmActivity');
} catch (e) {
  console.warn('[CRM Router] Models could not be loaded directly:', e.message);
}

const dbAdapter = require('../config/dbAdapter');

/**
 * PATCH /api/crm/leads/:vendorId/stage
 * Updates CRM stage for a lead and logs activity
 */
router.patch('/leads/:vendorId/stage', async (req, res) => {
  const { vendorId } = req.params;
  const { stage, note } = req.body;

  const validStages = ['new', 'pitch_sent', 'in_discussion', 'qualified', 'won', 'lost', 'archived'];
  if (!stage || !validStages.includes(stage)) {
    return res.status(400).json({ error: 'Invalid CRM stage' });
  }

  try {
    let updatedLead = null;

    if (mongoose.connection.readyState === 1 && Vendor) {
      const existing = await Vendor.findOne({ id: vendorId });
      const oldStage = existing?.crmStage || 'new';

      updatedLead = await Vendor.findOneAndUpdate(
        { id: vendorId },
        { 
          $set: { crmStage: stage, updatedAt: new Date() },
          $push: note ? { crmNotes: { text: note, date: new Date(), author: 'Admin' } } : {}
        },
        { new: true, upsert: false }
      );

      // Log activity
      if (CrmActivity) {
        await CrmActivity.create({
          vendorId,
          action: 'stage_change',
          fromStage: oldStage,
          toStage: stage,
          note: note || `Moved lead to ${stage}`
        }).catch(() => {});
      }
    }

    // Also update local dbAdapter if available
    try {
      const allVendors = dbAdapter.getVendors() || [];
      const vIdx = allVendors.findIndex(v => (v.id || v._id) === vendorId);
      if (vIdx !== -1) {
        allVendors[vIdx].crmStage = stage;
        dbAdapter.saveVendors(allVendors);
        try {
          const sessionRoutes = require('./sessionRoutes');
          if (typeof sessionRoutes.syncVendorToSessionVault === 'function') {
            sessionRoutes.syncVendorToSessionVault(allVendors[vIdx]);
          }
        } catch (syncErr) {}
      }
    } catch (e) {}

    return res.json({ success: true, vendorId, stage, lead: updatedLead });
  } catch (error) {
    console.error('[CRM API Error]', error);
    return res.status(500).json({ error: 'Failed to update lead stage', details: error.message });
  }
});

/**
 * POST /api/crm/leads/:vendorId/notes
 * Adds an activity note to a lead
 */
router.post('/leads/:vendorId/notes', async (req, res) => {
  const { vendorId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Note text is required' });
  }

  try {
    const noteObj = {
      text: text.trim(),
      author: 'Admin',
      date: new Date()
    };

    if (mongoose.connection.readyState === 1 && Vendor) {
      await Vendor.updateOne(
        { id: vendorId },
        { $push: { crmNotes: noteObj } }
      );

      if (CrmActivity) {
        await CrmActivity.create({
          vendorId,
          action: 'note_added',
          note: text.trim()
        }).catch(() => {});
      }
    }

    // Also update local dbAdapter if available
    try {
      const allVendors = dbAdapter.getVendors() || [];
      const vIdx = allVendors.findIndex(v => (v.id || v._id) === vendorId);
      if (vIdx !== -1) {
        if (!Array.isArray(allVendors[vIdx].crmNotes)) {
          allVendors[vIdx].crmNotes = [];
        }
        allVendors[vIdx].crmNotes.unshift(noteObj);
        dbAdapter.saveVendors(allVendors);
        try {
          const sessionRoutes = require('./sessionRoutes');
          if (typeof sessionRoutes.syncVendorToSessionVault === 'function') {
            sessionRoutes.syncVendorToSessionVault(allVendors[vIdx]);
          }
        } catch (syncErr) {}
      }
    } catch (e) {}

    return res.json({ success: true, vendorId, note: noteObj });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add note', details: error.message });
  }
});

/**
 * GET /api/crm/leads/:vendorId/timeline
 * Gets activity history for a specific lead
 */
router.get('/leads/:vendorId/timeline', async (req, res) => {
  const { vendorId } = req.params;

  try {
    if (mongoose.connection.readyState === 1 && CrmActivity) {
      const activities = await CrmActivity.find({ vendorId }).sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, activities });
    }

    return res.json({ success: true, activities: [] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch timeline', details: error.message });
  }
});

/**
 * POST /api/crm/bulk-stage
 * Bulk updates multiple leads to a given stage
 */
router.post('/bulk-stage', async (req, res) => {
  const { vendorIds, stage } = req.body;

  if (!Array.isArray(vendorIds) || !stage) {
    return res.status(400).json({ error: 'vendorIds array and target stage required' });
  }

  try {
    if (mongoose.connection.readyState === 1 && Vendor) {
      await Vendor.updateMany(
        { id: { $in: vendorIds } },
        { $set: { crmStage: stage, updatedAt: new Date() } }
      );
    }

    return res.json({ success: true, count: vendorIds.length, stage });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to bulk update stages' });
  }
});

/**
 * GET /api/crm/pipeline
 * Returns all pipeline leads grouped by stage
 */
router.get('/pipeline', async (req, res) => {
  const { folderId } = req.query;

  try {
    let leads = [];

    if (mongoose.connection.readyState === 1 && Vendor) {
      const query = folderId && folderId !== 'ALL' ? { folderId } : {};
      leads = await Vendor.find(query).sort({ updatedAt: -1 }).limit(500);
    } else {
      leads = dbAdapter.getVendors() || [];
    }

    const pipeline = {
      new: [],
      pitch_sent: [],
      in_discussion: [],
      qualified: [],
      won: [],
      lost: [],
      archived: []
    };

    leads.forEach(lead => {
      const stage = lead.crmStage || 'new';
      if (pipeline[stage]) {
        pipeline[stage].push(lead);
      } else {
        pipeline.new.push(lead);
      }
    });

    return res.json({ success: true, pipeline, total: leads.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch pipeline', details: error.message });
  }
});

/**
 * GET /api/crm/analytics
 * Aggregated analytics metrics
 */
router.get('/analytics', async (req, res) => {
  try {
    let totalLeads = 0;
    const stageCounts = {
      new: 0,
      pitch_sent: 0,
      in_discussion: 0,
      qualified: 0,
      won: 0,
      archived: 0
    };

    if (mongoose.connection.readyState === 1 && Vendor) {
      totalLeads = await Vendor.countDocuments();
      const grouped = await Vendor.aggregate([
        { $group: { _id: '$crmStage', count: { $sum: 1 } } }
      ]);
      grouped.forEach(g => {
        if (g._id && stageCounts[g._id] !== undefined) {
          stageCounts[g._id] = g.count;
        }
      });
    } else {
      const all = dbAdapter.getVendors() || [];
      totalLeads = all.length;
      all.forEach(v => {
        const s = v.crmStage || 'new';
        if (stageCounts[s] !== undefined) stageCounts[s]++;
        else stageCounts.new++;
      });
    }

    return res.json({
      success: true,
      totalLeads,
      stageCounts
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

module.exports = router;
