/**
 * sessionRoutes.js
 *
 * Express HTTP API endpoints for user sessions, client folders,
 * territory summaries, and batch exports.
 * Storage operations and hierarchy builders are modularized in ../services/sessionStore.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../config/paths');

const {
  getUserDir,
  safeSessionKey,
  listSessionDirs,
  resolveSessionFiles,
  isSessionRunning,
  purgeSessionLeads,
  leadIdentity,
  withOwnSessionLeads,
  buildVcard,
  leadPhoneList,
  isMobileNumber,
  sessionHeaderCache,
  haversineKm,
  cleanGroupLabel,
  resolveMandalForLead,
  buildLeadHierarchy,
  storeLeadRevision,
  readSessionHeader,
  buildExportContent,
  syncVendorToSessionVault
} = require('../services/sessionStore');

// Health / Index Route
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'User Sessions Storage Repository' });
});

// Master Clients Registry: returns all client accounts and their scraped vault metrics
router.get('/master/clients', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Master authorization required to inspect client registry' });
    }

    const clientStats = new Map();
    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });

      for (const dirName of subdirs) {
        const fullDir = path.join(SESSIONS_DIR, dirName);
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));
        let totalLeads = 0;
        let totalPhones = 0;
        let latestTimestamp = 0;

        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(fullDir, file), 'utf-8'));
            const leads = Array.isArray(data.leads) ? data.leads : [];
            totalLeads += data.leadCount || leads.length;
            totalPhones += (data.phoneCount || leads.filter(l => l.phone && !l.phone.includes('Obfuscated') && !l.phone.includes('Requires')).length);
            const ts = new Date(data.timestamp || data.createdAt || 0).getTime();
            if (ts > latestTimestamp) latestTimestamp = ts;
          } catch (e) {}
        }

        const isMasterDir = dirName === 'master' || dirName === 'master_admin';
        clientStats.set(dirName, {
          id: dirName,
          label: isMasterDir ? '👑 Master Command Center' : (dirName === 'anonymous' ? '👤 Default Client (Anonymous)' : `👤 Client (${dirName})`),
          folderCount: files.length,
          totalLeads,
          totalPhones,
          isMasterWorkspace: isMasterDir,
          lastActive: latestTimestamp ? new Date(latestTimestamp).toISOString() : new Date().toISOString()
        });
      }
    }

    const clientsList = Array.from(clientStats.values());
    clientsList.sort((a, b) => (b.isMasterWorkspace ? 1 : 0) - (a.isMasterWorkspace ? 1 : 0) || b.totalLeads - a.totalLeads);
    return res.json({ success: true, clients: clientsList });
  } catch (error) {
    console.error('Failed to list master clients:', error);
    return res.status(500).json({ error: 'Failed to inspect client registry' });
  }
});

// Master All Sessions: returns all client sessions across all workspaces
router.get('/master/all', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Master authorization required to access cross-client vaults' });
    }

    const clientFilter = req.query.client || 'all';
    const dirsToScan = [];
    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });
      for (const sd of subdirs) {
        if (clientFilter === 'all' || clientFilter === sd) {
          dirsToScan.push({ dir: path.join(SESSIONS_DIR, sd), clientId: sd });
        }
      }
    }

    const sessionMap = new Map();
    const clientsFound = new Set();

    for (const { dir, clientId } of dirsToScan) {
      if (!fs.existsSync(dir)) continue;
      clientsFound.add(clientId);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(dir, file);
        const summary = readSessionHeader(filePath, clientId);
        if (!summary || !summary.id) continue;

        if (!sessionMap.has(summary.id)) {
          sessionMap.set(summary.id, summary);
        }
      }
    }

    const sessions = Array.from(sessionMap.values());
    sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalLeads = sessions.reduce((sum, s) => sum + (s.leadCount || 0), 0);
    const totalPhones = sessions.reduce((sum, s) => sum + (s.phoneCount || 0), 0);

    return res.json({
      success: true,
      sessions,
      totalSessions: sessions.length,
      totalLeads,
      totalPhones,
      clientsCount: clientsFound.size
    });
  } catch (error) {
    console.error('Failed to list master sessions:', error);
    return res.status(500).json({ error: 'Failed to list master sessions' });
  }
});

// Recovery bin. Every removed lead is archived before the store drops it, so a
// mistaken folder delete or a bad merge can be undone from the dashboard.
router.get('/trash', (req, res) => {
  try {
    const leadArchive = require('../services/leadArchive');
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    return res.json({ success: true, ...leadArchive.stats({ limit }) });
  } catch (error) {
    console.error('Trash summary error:', error.message);
    return res.status(500).json({ error: 'Could not read the recovery archive' });
  }
});

router.post('/trash/restore', (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(String).filter(Boolean).slice(0, 2_000)
      : [];
    if (!ids.length) {
      return res.status(400).json({ error: 'Send the lead ids to restore.' });
    }
    const sessionId = String(req.body?.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const userId = String(
      req.headers['x-user-id'] || req.body?.userId || 'anonymous'
    ).replace(/[^a-zA-Z0-9_-]/g, '_');
    const leadArchive = require('../services/leadArchive');
    const result = leadArchive.restore(ids, { sessionId, userId });
    return res.json({
      success: true,
      requested: ids.length,
      restored: result.restored,
      missing: ids.length - result.restored,
      sessionId: sessionId || null,
    });
  } catch (error) {
    console.error('Trash restore error:', error.message);
    return res.status(500).json({ error: 'Could not restore those leads' });
  }
});

// 2. List all saved sessions (Admin sees ALL; Master sees ONLY master sweeps; Client sees ONLY client data)
router.get(['/list', '/list/:userId'], (req, res) => {
  try {
    const isAdmin = req.headers['x-workspace-scope'] === 'admin' || req.query.scope === 'admin' || req.headers['x-admin-key'];
    const isMaster = !isAdmin && (req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master');
    const sessionMap = new Map();

    if (isAdmin) {
      // Admin view: Aggregates across ALL clients and master sweeps
      const dirsToScan = listSessionDirs({ isAdmin: true })
        .map(dir => ({ dir, clientId: path.basename(dir) }));

      for (const { dir, clientId } of dirsToScan) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const summary = readSessionHeader(filePath, clientId);
          if (!summary || !summary.id) continue;

          if (!sessionMap.has(summary.id)) {
            sessionMap.set(summary.id, summary);
          }
        }
      }
    } else if (isMaster) {
      // Master view: STRICTLY Master's OWN sweeps (master directory or isMasterSweep === true). Master CANNOT see client!
      const dirsToScan = listSessionDirs({ isMaster: true })
        .map(dir => ({ dir, clientId: path.basename(dir) }));

      for (const { dir, clientId } of dirsToScan) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const summary = readSessionHeader(filePath, clientId);
          if (!summary || !summary.id) continue;
          if (!summary.isMasterSweep && clientId !== 'master') continue;

          if (!sessionMap.has(summary.id)) {
            sessionMap.set(summary.id, summary);
          }
        }
      }
    } else {
      // Client view: Access client session folders (own user ID, anonymous, and guest/client runs).
      // STRICT RULE: Master territorial sweeps are filtered out and inaccessible.
      const userId = req.headers['x-user-id'] || req.params.userId || 'anonymous';
      const userDirs = listSessionDirs({ isMaster: false, userId });

      for (const userDir of userDirs) {
        if (!fs.existsSync(userDir)) continue;
        const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(userDir, file);
          const summary = readSessionHeader(filePath, userId);
          if (!summary || !summary.id) continue;

          // Never leak Master Sweeps to standard client!
          if (summary.isMasterSweep || userDir.endsWith('master')) continue;

          if (!sessionMap.has(summary.id)) {
            sessionMap.set(summary.id, {
              ...summary,
              isMasterSweep: false,
              userId: summary.userId || userId
            });
          }
        }
      }
    }

    const sessions = Array.from(sessionMap.values());
    sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.json({ success: true, sessions, isMaster });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// -----------------------------------------------------------------------------
// All-India Territory & Villages SEO API (633 Districts & 619,290 Villages)
// -----------------------------------------------------------------------------
const { getTerritorySummary, searchTerritory } = require('../utils/territoryHelper');

router.get('/territory/summary', (req, res) => {
  try {
    const summary = getTerritorySummary();
    res.json({
      success: true,
      totalStates: summary.length,
      totalDistricts: summary.reduce((acc, s) => acc + s.districtCount, 0),
      totalMandals: 5920,
      totalVillages: 619290,
      states: summary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve territory summary' });
  }
});

router.get('/territory/search', (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const results = searchTerritory(q, limit);
    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: 'Territory search failed' });
  }
});

// Download sample God-Level Excel workbook directly from landing page
router.get('/export/sample-excel', async (req, res) => {
  try {
    const category = req.query.category || 'Dental Clinics';
    const city = req.query.city || 'Guntur';
    const { buildGodLevelExcelBuffer } = require('../utils/godLevelExcelGenerator');

    const sampleLeads = [
      {
        name: 'Kalyani Multispeciality Dental Clinic',
        owner: 'Dr. K. Srinivas Rao, MDS (Managing Director)',
        phone: '+91 76750 71081',
        secondaryPhone: '+91 98480 23145',
        email: 'contact@kalyanidental.com',
        address: '4th Line, Brodipet, Guntur - 522002',
        rating: 4.9,
        reviewsCount: 420,
        socialProfile: 'https://instagram.com/kalyanidental',
        waMessage: 'Hello Dr. Srinivas Rao, reaching out from Scraper.co.in regarding premium dental implants distribution in Guntur.'
      },
      {
        name: 'Happy Dental Hospital & Implant Centre',
        owner: 'Dr. P. Venkat Reddy (Chief Implantologist)',
        phone: '+91 80084 91391',
        secondaryPhone: '',
        email: 'info@happydental.in',
        address: 'Main Road, Arundelpet, Guntur - 522002',
        rating: 4.8,
        reviewsCount: 315,
        socialProfile: '',
        waMessage: 'Hi Dr. Venkat Reddy, connecting regarding dental digital imaging solutions and patient appointment CRM.'
      },
      {
        name: 'Siri Super Speciality Dental Hospital',
        owner: 'Dr. M. Chaitanya Kumar (Oral Surgeon)',
        phone: '+91 70363 51100',
        secondaryPhone: '+91 94401 55678',
        email: 'support@siridental.com',
        address: 'Opp. Hindu College, Guntur - 522003',
        rating: 4.8,
        reviewsCount: 260,
        socialProfile: 'https://facebook.com/siridental',
        waMessage: 'Hello Dr. Chaitanya, contacting you regarding specialized surgical tools and autoclave sterilization supplies.'
      },
      {
        name: 'Guntur Dental Care & Laser Centre',
        owner: 'Dr. Anusha Reddy (Owner & Cosmetologist)',
        phone: '+91 99890 12344',
        secondaryPhone: '',
        email: 'care@gunturdental.com',
        address: 'Lakshmipuram Main Road, Guntur - 522007',
        rating: 4.7,
        reviewsCount: 185,
        socialProfile: '',
        waMessage: 'Hello Dr. Anusha, reaching out regarding painless laser dentistry consumables and patient outreach.'
      },
      {
        name: 'Venkateswara Dental Orthodontic Clinic',
        owner: 'Dr. B. Prasad Rao (Consultant Orthodontist)',
        phone: '+91 98495 67890',
        secondaryPhone: '',
        email: '',
        address: 'Old Club Road, Kothapet, Guntur - 522001',
        rating: 4.8,
        reviewsCount: 220,
        socialProfile: '',
        waMessage: 'Namaste Dr. Prasad Rao, connecting regarding invisible aligners and orthodontic bracket wholesale pricing.'
      }
    ];

    const buffer = await buildGodLevelExcelBuffer(sampleLeads, { city, category });
    const cleanFilename = `God_Level_${category.replace(/[^a-zA-Z0-9]/g, '_')}_${city.replace(/[^a-zA-Z0-9]/g, '_')}_Leads.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Sample excel generation error:', err);
    res.status(500).json({ error: 'Failed to generate sample Excel' });
  }
});

// 3. Export a session by id alone (used by the V2 folder cards).
router.get('/export/:sessionId', async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const format = String(req.query.format || 'csv').toLowerCase();
    const candidateDirs = [];
    if (fs.existsSync(SESSIONS_DIR)) {
      for (const entry of fs.readdirSync(SESSIONS_DIR)) {
        try {
          if (fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) {
            candidateDirs.push(path.join(SESSIONS_DIR, entry));
          }
        } catch (e) { /* ignore */ }
      }
    }

    let data = null;
    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        break;
      }
    }
    if (!data) return res.status(404).json({ error: 'Session not found' });

    // Exactly the same rows the folder viewer shows, so the file a customer
    // downloads is the folder they opened - not a mix of other runs.
    const leads = withOwnSessionLeads(sessionId, data.leads);

    const baseName = `${data.category || 'leads'}_${data.location || 'india'}`.replace(/[^a-zA-Z0-9_-]+/g, '_');

    const exportOptions = {
      divided: req.query.divided === 'true' || req.query.mode === 'divided',
      area: req.query.area || '',
      category: data.category,
      city: data.location
    };

    // God-Level Multi-Sheet Excel Format
    if (format === 'xlsx' || format === 'excel') {
      const { buildGodLevelExcelBuffer } = require('../utils/godLevelExcelGenerator');
      const buffer = await buildGodLevelExcelBuffer(leads, exportOptions);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}_god_level.xlsx"`);
      return res.send(buffer);
    }

    const exportResult = buildExportContent(leads, format, baseName, exportOptions);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.body);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// 4. Rename and tag session folder
router.patch(['/rename', '/:sessionId/rename', '/:userId/:sessionId/rename'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    const sessionId = req.body.sessionId || req.params.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const { name, tags, color, notes } = req.body;

    const files = resolveSessionFiles(sessionId, { isMaster });
    if (!files.length) {
      return res.status(404).json({ error: 'Session folder not found' });
    }

    let updated = null;
    for (const filePath of files) {
      const session = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (name !== undefined) {
        session.name = String(name).trim();
        session.customName = String(name).trim();
      }
      if (tags !== undefined) session.tags = Array.isArray(tags) ? tags : [];
      if (color !== undefined) session.color = String(color).trim();
      if (notes !== undefined) session.notes = String(notes).trim();
      session.updatedAt = new Date().toISOString();

      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
      sessionHeaderCache.delete(filePath);
      if (!updated) updated = session;
    }

    return res.json({ success: true, session: updated, filesUpdated: files.length });
  } catch (error) {
    console.error('Rename error:', error);
    return res.status(500).json({ error: 'Failed to rename folder' });
  }
});

// 5. Merge Multiple Folders & Deduplicate Leads
router.post('/merge', (req, res) => {
  try {
    const { sessionIds, newName, tags, color } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 sessionIds are required for merging' });
    }

    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';

    const loadedSessions = [];
    for (const id of sessionIds) {
      const files = resolveSessionFiles(id, { isMaster });
      if (!files.length) continue;
      try {
        loadedSessions.push(JSON.parse(fs.readFileSync(files[0], 'utf-8')));
      } catch (e) {}
    }

    if (loadedSessions.length < 2) {
      return res.status(400).json({ error: 'Could not load enough valid sessions to merge' });
    }

    // Merge & Deduplicate
    const leadMap = new Map();
    let initialCount = 0;

    for (const session of loadedSessions) {
      const leads = Array.isArray(session.leads) ? session.leads : [];
      initialCount += leads.length;

      for (const lead of leads) {
        // Identity is a validated phone (mobile or landline with STD code),
        // never "the last 10 digits" - that can merge two different businesses
        // that share a landline. Fall back to the stable row id.
        const parsed = normalizePhone(lead.phone || lead.primaryPhone || '');
        const dedupeKey = parsed && parsed.isValid
          ? `e164_${parsed.e164}`
          : (lead.id
            ? `id_${lead.id}`
            : `name_${String(lead.name || '').toLowerCase()}_${String(lead.city || lead.area || '').toLowerCase()}`);

        if (!leadMap.has(dedupeKey)) {
          leadMap.set(dedupeKey, { ...lead });
        } else {
          const existing = leadMap.get(dedupeKey);
          leadMap.set(dedupeKey, {
            ...existing,
            ...lead,
            phone: existing.phone || lead.phone,
            website: existing.website || lead.website,
            email: existing.email || lead.email,
            rating: Math.max(Number(existing.rating) || 0, Number(lead.rating) || 0) || existing.rating || lead.rating,
            reviewsCount: Math.max(Number(existing.reviewsCount) || 0, Number(lead.reviewsCount) || 0) || existing.reviewsCount || lead.reviewsCount,
            dealValue: Math.max(Number(existing.dealValue) || 0, Number(lead.dealValue) || 0) || existing.dealValue || lead.dealValue,
            crmStage: (existing.crmStage && existing.crmStage !== 'new') ? existing.crmStage : (lead.crmStage || 'new'),
            crmNotes: [...(Array.isArray(existing.crmNotes) ? existing.crmNotes : []), ...(Array.isArray(lead.crmNotes) ? lead.crmNotes : [])]
          });
        }
      }
    }

    const mergedLeads = Array.from(leadMap.values());
    const mergedId = `cmd_merged_${Date.now()}`;
    const categories = [...new Set(loadedSessions.map(s => s.category).filter(Boolean))].join(', ');
    const locations = [...new Set(loadedSessions.map(s => s.location).filter(Boolean))].join(', ');
    const mergedName = newName || `Merged Vault (${loadedSessions.length} folders) • ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const mergedSession = {
      id: mergedId,
      name: mergedName,
      customName: mergedName,
      userId: 'anonymous',
      category: categories || 'Multiple Categories',
      location: locations || 'Multiple Locations',
      tags: tags || ['Merged Vault', 'Deduplicated'],
      color: color || 'purple',
      timestamp: new Date().toISOString(),
      leadCount: mergedLeads.length,
      phoneCount: mergedLeads.filter(l => Boolean(l.phone)).length,
      verifiedCount: mergedLeads.filter(l => Boolean(l.verified || l.phone)).length,
      metadata: {
        mergedFrom: sessionIds,
        mergedAt: new Date().toISOString(),
        duplicatesRemoved: initialCount - mergedLeads.length
      },
      leads: mergedLeads
    };

    const outDir = getUserDir('anonymous');
    fs.writeFileSync(path.join(outDir, `${mergedId}.json`), JSON.stringify(mergedSession, null, 2), 'utf-8');

    return res.json({
      success: true,
      session: mergedSession,
      stats: {
        totalInitial: initialCount,
        totalMerged: mergedLeads.length,
        duplicatesRemoved: initialCount - mergedLeads.length
      }
    });
  } catch (error) {
    console.error('Merge error:', error);
    return res.status(500).json({ error: 'Failed to merge session folders' });
  }
});

// 5.5 Master Backup and Restore Endpoints
router.get('/backup/all', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Permission Denied: Vault backup download is restricted to Master Admin.' });
    }
    const bundle = {
      exportedAt: new Date().toISOString(),
      vaultType: 'complete_master_archive',
      sessions: []
    };
    const dirs = listSessionDirs({ isMaster: true });
    const seenSessions = new Set();
    const dbAdapter = require('../config/dbAdapter');
    const allVendors = dbAdapter.getVendors() || [];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const filePath = path.join(dir, entry);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const sId = content.id || content.sessionId || path.basename(entry, '.json');
          if (seenSessions.has(sId)) continue;
          seenSessions.add(sId);
          if (Array.isArray(content.leads)) {
            content.leads = content.leads.map(l => {
              const fresh = allVendors.find(v => v.id === l.id);
              return fresh || l;
            });
          }
          bundle.sessions.push(content);
        } catch (err) {}
      }
    }
    bundle.totalSessions = bundle.sessions.length;
    bundle.totalLeads = bundle.sessions.reduce((sum, s) => sum + (Array.isArray(s.leads) ? s.leads.length : 0), 0);

    const filename = `master_vault_complete_backup_${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(bundle, null, 2));
  } catch (e) {
    return res.status(500).json({ error: `Bulk backup failed: ${e.message}` });
  }
});

router.post('/restore-backup', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Permission Denied: Vault restoration is restricted to Master Admin.' });
    }
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Valid JSON payload is required' });
    }

    const sessionsToRestore = [];
    if (Array.isArray(payload.sessions)) {
      sessionsToRestore.push(...payload.sessions);
    } else if (payload.id || payload.sessionId) {
      sessionsToRestore.push(payload);
    } else {
      return res.status(400).json({ error: 'Unrecognized backup structure. Expected session object or bundle.' });
    }

    const dbAdapter = require('../config/dbAdapter');
    let restoredSessionsCount = 0;
    let restoredLeadsCount = 0;
    const targetDir = path.join(SESSIONS_DIR, 'anonymous');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    for (const session of sessionsToRestore) {
      const sId = session.id || session.sessionId;
      if (!sId) continue;
      const safeId = safeSessionKey(sId);
      const filePath = path.join(targetDir, `${safeId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
      sessionHeaderCache.delete(filePath);
      restoredSessionsCount++;

      if (Array.isArray(session.leads)) {
        for (const lead of session.leads) {
          if (!lead || !lead.id) continue;
          try {
            dbAdapter.saveVendor(lead.userId || 'admin_1', lead);
            restoredLeadsCount++;
          } catch (err) {}
        }
      }
    }

    return res.json({
      success: true,
      message: `Restored ${restoredSessionsCount} folder(s) with ${restoredLeadsCount} lead(s).`,
      restoredSessionsCount,
      restoredLeadsCount
    });
  } catch (e) {
    return res.status(500).json({ error: `Restore failed: ${e.message}` });
  }
});

// 6. Batch Delete Sessions (Master Only)
router.post('/batch-delete', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({
        ok: false,
        error: 'Permission Denied: Client accounts cannot delete folders. Folder deletion is strictly restricted to Master Admin.'
      });
    }
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || !sessionIds.length) {
      return res.status(400).json({ error: 'sessionIds array is required' });
    }

    const ids = [...new Set(sessionIds.map(String).filter(Boolean))];
    const blocked = ids.filter(id => isSessionRunning(id));
    if (blocked.length) {
      return res.status(409).json({
        error: 'Some folders are still being written. Stop the swarm before deleting them.',
        blocked
      });
    }

    const deleted = [];
    const missing = [];
    let filesRemoved = 0;
    let leadsRemoved = 0;
    let engagedKept = 0;
    let sharedKept = 0;

    for (const id of ids) {
      const files = resolveSessionFiles(id, { isMaster });
      if (!files.length) {
        missing.push(id);
        continue;
      }
      for (const filePath of files) {
        try {
          fs.unlinkSync(filePath);
          sessionHeaderCache.delete(filePath);
          filesRemoved += 1;
        } catch (e) {
          // Ignore files locked by another reader.
        }
      }
      const purge = purgeSessionLeads(id);
      leadsRemoved += purge.leadsRemoved;
      engagedKept += purge.engagedKept;
      sharedKept += purge.sharedKept;
      deleted.push(id);
    }

    return res.json({
      success: true,
      count: deleted.length,
      deleted,
      missing,
      filesRemoved,
      leadsRemoved,
      engagedKept,
      sharedKept
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    return res.status(500).json({ error: 'Failed to batch delete sessions' });
  }
});

// API: Aggressively enrich all leads in a session that lack mobile numbers
router.post('/:id/aggressive-enrich', async (req, res) => {
  try {
    const { enrichSessionAggressive } = require('../services/aggressivePhoneEnricher');
    const sessionId = req.params.id;
    const result = await enrichSessionAggressive(sessionId, req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('[Session Aggressive Enrich Error]', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// 3.5 Single Session Backup (Master Only)
router.get(['/:sessionId/backup', '/:userId/:sessionId/backup'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({ error: 'Permission Denied: Vault backup download is restricted to Master Admin.' });
    }
    const sessionId = req.params.sessionId;
    const files = resolveSessionFiles(sessionId, { isMaster: true });
    if (!files.length) {
      return res.status(404).json({ error: 'Session file not found' });
    }
    const filePath = files[0];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const dbAdapter = require('../config/dbAdapter');
    const allVendors = dbAdapter.getVendors() || [];
    if (Array.isArray(data.leads)) {
      data.leads = data.leads.map(l => {
        const fresh = allVendors.find(v => v.id === l.id);
        return fresh || l;
      });
    }
    data.backupGeneratedAt = new Date().toISOString();

    const filename = `vault_backup_${sessionId}_${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    return res.status(500).json({ error: `Backup failed: ${e.message}` });
  }
});

// 4. Get single session with complete leads (Client sees ONLY own; Master can access ANY client)
router.get(['/:sessionId', '/:userId/:sessionId'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    const userId = req.headers['x-user-id'] || req.params.userId || 'anonymous';
    const sessionId = req.params.sessionId || req.params.userId;
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');

    let candidateDirs = [];
    if (isMaster) {
      // Master can access ANY client folder across the entire system
      if (fs.existsSync(SESSIONS_DIR)) {
        const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
          try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
        });
        subdirs.forEach(sd => candidateDirs.push(path.join(SESSIONS_DIR, sd)));
      }
    } else {
      // Standard client: Checks own directory, anonymous directory, and client subdirectories.
      // Master sweeps are strictly blocked below if detected.
      candidateDirs = [getUserDir(userId)];
      if (userId !== 'anonymous') {
        candidateDirs.push(getUserDir('anonymous'));
      }
      if (fs.existsSync(SESSIONS_DIR)) {
        const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
          try { return f !== 'master' && fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
        });
        subdirs.forEach(sd => {
          const dir = path.join(SESSIONS_DIR, sd);
          if (!candidateDirs.includes(dir)) candidateDirs.push(dir);
        });
      }
    }

    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${safeSessionId}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Client cannot access Master Sweeps
        if (!isMaster && (data.isMasterSweep || data.metadata?.isMasterSweep || /master_/.test(data.id))) {
          return res.status(403).json({ error: 'Access denied: Master territorial sweeps are restricted to Master Command Center.' });
        }

        // Same definition of folder membership as the sidebar and the exports:
        // saved rows, refreshed in place, plus this run's own late stragglers.
        // A lead that only lists this session in its history stays in the
        // folder it was first scraped into.
        data.leads = withOwnSessionLeads(safeSessionId, data.leads);

        // Always derive the counts and the district → mandal → village tree from
        // the rows actually returned, so the folder header and the sidebar agree.
        data.leadCount = Array.isArray(data.leads) ? data.leads.length : 0;
        data.phoneCount = (data.leads || []).filter(l => isMobileNumber(l.phone)).length;
        data.verifiedCount = (data.leads || []).filter(l => l && (l.verified || isMobileNumber(l.phone))).length;
        data.hierarchy = buildLeadHierarchy(data.leads || [], {
          boundary: data.metadata?.boundary || null,
          fallbackDistrict: data.location || ''
        });
        data.mandalCount = (data.hierarchy.mandals || []).length;
        data.villageCount = (data.hierarchy.mandals || []).reduce((acc, m) => acc + (m.villages?.length || 0), 0);

        if (!Array.isArray(data.subFolders) || data.subFolders.length === 0) {
          data.subFolders = (data.hierarchy.mandals || []).map(m => ({ area: m.name, count: m.count }));
        }

        return res.json({ success: true, session: data, isMasterAuthorized: isMaster });
      }
    }

    return res.status(404).json({ error: 'Session not found or access unauthorized' });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// 4. Delete session (Master Only)
router.delete(['/:sessionId', '/:userId/:sessionId'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    if (!isMaster) {
      return res.status(403).json({
        ok: false,
        error: 'Permission Denied: Client accounts cannot delete folders. Folder deletion is strictly restricted to Master Admin.'
      });
    }
    const sessionId = req.params.sessionId || req.params.userId;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (isSessionRunning(sessionId)) {
      return res.status(409).json({
        error: 'This folder is still being written. Stop the swarm before deleting it.',
        sessionId
      });
    }

    const files = resolveSessionFiles(sessionId, { isMaster });
    if (!files.length) {
      return res.status(404).json({
        error: 'Session folder not found',
        deleted: [],
        missing: [sessionId]
      });
    }

    for (const filePath of files) {
      fs.unlinkSync(filePath);
      sessionHeaderCache.delete(filePath);
    }

    const purge = purgeSessionLeads(sessionId);
    return res.json({
      success: true,
      message: 'Session deleted',
      deleted: [sessionId],
      missing: [],
      filesRemoved: files.length,
      ...purge
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// 5. Export session directly
router.get('/export/:userId/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const { format = 'csv' } = req.query;
    const userDir = getUserDir(userId);
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(userDir, `${safeSessionId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const leads = withOwnSessionLeads(safeSessionId, data.leads);
    const baseName = `${data.category || 'leads'}_${data.location || 'india'}`.replace(/[^a-zA-Z0-9_-]+/g, '_');

    // God-Level Excel Format
    if (format === 'xlsx' || format === 'excel') {
      const { buildGodLevelExcelBuffer } = require('../utils/godLevelExcelGenerator');
      const buffer = await buildGodLevelExcelBuffer(leads, { city: data.location, category: data.category });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}_god_level.xlsx"`);
      return res.send(buffer);
    }

    const exportResult = buildExportContent(leads, format, baseName);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.body);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});


router.syncVendorToSessionVault = syncVendorToSessionVault;
module.exports = router;

