'use strict';

/**
 * server/src/routes/folderRoutes.js
 * REST endpoints for Automatic Hierarchical Scraped Folders & Scoped Exports.
 */

const folderStore = require('../folderStore');
const store = require('../store');
const { startMasterSweep } = require('../master/masterOrchestrator');

function registerFolderRoutes(app, orchestrator) {
  // List all auto-saved Root Folders with live Sub-Categories & Sub-Locations trees
  app.get('/api/folders', (req, res) => {
    const folders = folderStore.listFolders();
    res.json({ ok: true, folders });
  });

  // Get leads + filtered Sub-Categories / Sub-Locations / Segments / Runs for a Root Folder
  app.get('/api/folders/:id/leads', (req, res) => {
    const detail = folderStore.getFolderDetail(req.params.id, {
      subcategory: String(req.query.subcategory || ''),
      sublocation: String(req.query.zone || req.query.sublocation || ''),
      segment: String(req.query.segment || ''),
      runSessionId: String(req.query.runSessionId || '')
    });
    if (!detail) return res.status(404).json({ ok: false, error: 'Folder not found' });
    res.json({ ok: true, ...detail });
  });

  // Scoped CSV export (whole folder OR specific sub-category / ward / segment / run)
  app.get('/api/folders/:id/export', (req, res) => {
    const subcat = String(req.query.subcategory || '');
    const subloc = String(req.query.zone || req.query.sublocation || '');
    const segment = String(req.query.segment || '');
    const runSessionId = String(req.query.runSessionId || '');
    const detail = folderStore.getFolderDetail(req.params.id, {
      subcategory: subcat,
      sublocation: subloc,
      segment,
      runSessionId
    });
    if (!detail) return res.status(404).json({ ok: false, error: 'Folder not found' });

    const csv = store.buildCsvForLeads(detail.leads);
    const parts = [detail.folder.query, detail.folder.city, subcat, subloc, segment].filter(Boolean);
    const slug = parts.map((p) => folderStore.slugKey(p)).filter(Boolean).join('_') || 'leads';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}_leads.csv"`);
    res.send('\ufeff' + csv);
  });

  // Resume a paused/stopped folder from the next remaining ward into the SAME folder
  app.post('/api/folders/:id/resume', async (req, res) => {
    try {
      const detail = folderStore.getFolderDetail(req.params.id);
      if (!detail) return res.status(404).json({ ok: false, error: 'Folder not found' });
      const f = detail.folder;
      const nextZone = Math.min(Math.max(0, f.completedZones || 0), Math.max(0, (f.totalZones || 1) - 1));
      const payload = {
        query: f.query,
        location: f.city,
        country: f.country,
        subcategories: f.subcategoriesPlanned?.length ? f.subcategoriesPlanned : undefined,
        startZoneIndex: nextZone,
        resumeSessionId: f.id
      };
      const result = f.isMaster
        ? await startMasterSweep(payload)
        : await orchestrator.startSweep(payload);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Delete a Root Folder and its stored leads
  app.delete('/api/folders/:id', (req, res) => {
    orchestrator?.activeSessions?.delete(req.params.id);
    const deleted = folderStore.deleteFolder(req.params.id);
    res.json({ ok: true, deleted });
  });

  // Compatibility endpoint for getSessionVault(sessionId)
  app.get('/api/sessions/:id', (req, res) => {
    const sid = req.params.id;
    const detail = folderStore.getFolderDetail(sid);
    if (detail) {
      return res.json({
        ok: true,
        session: {
          ...detail.folder,
          vendors: detail.leads
        }
      });
    }
    const vendors = store.getVendorsBySession(sid);
    res.json({ ok: true, session: { id: sid, vendors } });
  });
}

module.exports = { registerFolderRoutes };
