const express = require('express');
const router = express.Router();
const dbAdapter = require('../config/dbAdapter');

// Helper to save a single modified vendor
const saveUpdatedVendor = (vendors, updated) => {
  const idx = vendors.findIndex(v => v.id === updated.id);
  if (idx !== -1) {
    vendors[idx] = updated;
  } else {
    vendors.push(updated);
  }
  dbAdapter.saveVendors(vendors);

  // Sync CRM updates back to parent session vault on disk
  try {
    const sessionRoutes = require('./sessionRoutes');
    if (typeof sessionRoutes.syncVendorToSessionVault === 'function') {
      sessionRoutes.syncVendorToSessionVault(updated);
    }
  } catch (e) {}
};

// API: Get all staging leads (vendors)
router.get('/', (req, res) => {
  try {
    const { userId, since, sessionId } = req.query;
    const isAdmin = req.headers['x-workspace-scope'] === 'admin' || req.query.scope === 'admin' || req.headers['x-admin-key'];
    const isMaster = !isAdmin && (req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master');
    const requestingUserId = req.headers['x-user-id'] || userId;
    let data = (dbAdapter.getVendors() || []).slice();

    // Session-scoped view. The live store is append-only, so the panel asks for
    // exactly the run it is showing instead of inferring from a timestamp.
    if (sessionId) {
      data = data.filter(v =>
        v.sessionId === sessionId
        || v.lastSessionId === sessionId
        || (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId))
      );
    } else if (isAdmin) {
      // Admin sees ALL leads across both Master and Client
    } else if (isMaster) {
      // Master is STRICTLY a heavy scraper and CANNOT see client leads.
      // Master only sees Master's territorial sweeps.
      data = data.filter(v =>
        v.isMasterSweep === true || v.userId === 'master' || v.clientId === 'master' || (v.sessionId && v.sessionId.startsWith('master_'))
      );
    } else if (requestingUserId && requestingUserId !== 'anonymous') {
      // Multi-tenant protection: client callers only see their own leads (non-master)
      data = data.filter(v =>
        !v.isMasterSweep && (
          v.userId === requestingUserId
          || v.clientId === requestingUserId
          || (Array.isArray(v.userIds) && v.userIds.includes(requestingUserId))
        )
      );
    } else {
      // Anonymous client callers only see anonymous non-master leads
      data = data.filter(v => !v.isMasterSweep && (!v.userId || v.userId === 'anonymous'));
    }

    if (since && Number(since) > 0) {
      const sinceTime = new Date(Number(since)).getTime();
      data = data.filter(v => v.scrapedAt && new Date(v.scrapedAt).getTime() > sinceTime);
    }
    
    // Sort descending by scrapedAt
    data.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

    // Category fidelity filtering if category query parameter is supplied
    if (req.query.category) {
      try {
        const { isVendorRelevant } = require('../services/categoryFidelity');
        data = data.filter(v => isVendorRelevant(v, req.query.category));
      } catch (e) {}
    }

    // SaaS Data Partitioning / Masking
    if (userId && userId !== 'admin' && userId !== 'admin_1' && userId !== 'anonymous' && req.query.maskContacts === 'true') {
      const users = dbAdapter.getPublicUsers();
      const user = users.find(u => u.id === userId);
      const unlockedLeads = user ? user.unlockedLeads : [];

      data = data.map(v => {
        // If user hasn't unlocked this lead, mask contact info
        if (!unlockedLeads.includes(v.id)) {
          return {
            ...v,
            phone: v.phone ? 'Requires 1 Credit' : null,
            email: v.email ? 'Requires 1 Credit' : null,
            Camera: v.Camera ? 'Masked' : null,
            isLocked: true
          };
        }
        return { ...v, isLocked: false };
      });
    }

    if (req.query.limit && Number(req.query.limit) > 0) {
      data = data.slice(0, Number(req.query.limit));
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Get all out-of-bounds leads
router.get('/out-of-bounds', (req, res) => {
  try {
    const { since } = req.query;
    let data = dbAdapter.getOutOfBounds() || [];
    if (since && Number(since) > 0) {
      const sinceTime = new Date(Number(since)).getTime();
      data = data.filter(v => v.scrapedAt && new Date(v.scrapedAt).getTime() > sinceTime);
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Update a vendor (verify/edit)
router.put('/:id', (req, res) => {
  try {
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    
    if (idx !== -1) {
      const updated = { ...vendors[idx], ...req.body, verified: true };
      vendors[idx] = updated;
      dbAdapter.saveVendors(vendors);
      res.json({ success: true, vendor: updated });
    } else {
      res.status(404).json({ error: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Delete a vendor (reject)
router.delete('/:id', (req, res) => {
  try {
    const vendors = dbAdapter.getVendors();
    const filtered = vendors.filter(v => v.id !== req.params.id);
    
    if (filtered.length !== vendors.length) {
      dbAdapter.replaceVendors(filtered);
      res.json({ success: true, message: 'Deleted' });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Bulk delete unverified vendors
router.post('/clear-unverified', (req, res) => {
  try {
    const vendors = dbAdapter.getVendors();
    const verifiedOnly = vendors.filter(v => v.verified === true);
    dbAdapter.replaceVendors(verifiedOnly);
    res.json({ success: true, message: 'Unverified vendors cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Clear all leads completely
router.post('/clear-all', (req, res) => {
  try {
    dbAdapter.replaceVendors([]);
    dbAdapter.saveOutOfBounds([]);
    if (typeof dbAdapter.flushSync === 'function') {
      dbAdapter.flushSync();
    }
    // Also clean session folders and stale backups so healFromSessions doesn't resurrect deleted leads
    try {
      const { DATA_DIR, SESSIONS_DIR } = require('../config/paths');
      if (fs.existsSync(SESSIONS_DIR)) {
        fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      }
      fs.readdirSync(DATA_DIR).forEach(file => {
        if (/^scraped_vendors\.backup-.*\.json$/.test(file)) {
          try { fs.unlinkSync(path.join(DATA_DIR, file)); } catch (e) {}
        }
      });
    } catch (e) {}

    res.json({ success: true, message: 'All leads cleared completely', count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  try {
    dbAdapter.replaceVendors([]);
    dbAdapter.saveOutOfBounds([]);
    if (typeof dbAdapter.flushSync === 'function') {
      dbAdapter.flushSync();
    }
    res.json({ success: true, message: 'All leads deleted', count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Assign leads to an employee
router.post('/assign', (req, res) => {
  try {
    const { vendorIds, employeeId } = req.body;
    if (!vendorIds || !employeeId) return res.status(400).json({ error: 'Missing data' });
    
    const vendors = dbAdapter.getVendors();
    vendorIds.forEach(vid => {
      const v = vendors.find(x => x.id === vid);
      if (v) {
        v.assignedTo = employeeId;
        v.assignedAt = new Date().toISOString();
      }
    });
    dbAdapter.saveVendors(vendors);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Assignment failed' });
  }
});

const CRM_STAGES = ['new', 'pitch_sent', 'in_discussion', 'qualified', 'won', 'lost', 'archived'];
const LEGACY_STAGE_MAP = {
  NEW: 'new',
  CONTACTED: 'pitch_sent',
  PITCH_SENT: 'pitch_sent',
  IN_DISCUSSION: 'in_discussion',
  INTERESTED: 'in_discussion',
  PROPOSAL: 'qualified',
  QUALIFIED: 'qualified',
  WON: 'won',
  CLOSED_WON: 'won',
  LOST: 'lost',
  ARCHIVED: 'archived'
};

function normaliseCrmStage(value, fallback = 'new') {
  if (!value) return fallback;
  const raw = String(value).trim();
  const mapped = LEGACY_STAGE_MAP[raw.toUpperCase()] || raw.toLowerCase().replace(/[\s-]+/g, '_');
  return CRM_STAGES.includes(mapped) ? mapped : fallback;
}

function asNoteArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string'
        ? { text: item.trim(), author: 'You', date: new Date().toISOString() }
        : item && item.text
          ? { ...item, text: String(item.text).trim() }
          : null))
      .filter(item => item && item.text);
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ text: value.trim(), author: 'You', date: new Date().toISOString() }];
  }
  return [];
}

// API: Update CRM status, stage, notes and tasks from the command center.
router.put('/:id/crm', (req, res) => {
  try {
    const {
      crmStatus, crmStage, stage, notes, note, tasks, clearNotes, clearTasks,
      dealValue, followUpDate, callOutcome, contactName
    } = req.body || {};
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = vendors[idx];
    const nextStage = normaliseCrmStage(stage || crmStage || crmStatus, vendor.crmStage || 'new');
    vendor.crmStage = nextStage;
    vendor.crmStatus = nextStage;
    vendor.crmLastUpdated = new Date().toISOString();
    vendor.isEngaged = nextStage !== 'new';

    if (dealValue !== undefined) {
      vendor.dealValue = Math.max(0, Number(dealValue) || 0);
    }
    if (followUpDate !== undefined) {
      vendor.followUpDate = followUpDate ? String(followUpDate).trim() : '';
    }
    if (callOutcome !== undefined) {
      vendor.callOutcome = String(callOutcome).trim();
    }
    if (contactName !== undefined) {
      vendor.contactName = String(contactName).trim();
    }

    const existingNotes = asNoteArray(vendor.crmNotes);
    const incoming = asNoteArray(note || notes);
    if (clearNotes === true) {
      vendor.crmNotes = incoming;
    } else if (incoming.length) {
      const seen = new Set(existingNotes.map(item => `${item.text}|${item.date}`));
      vendor.crmNotes = [...incoming.filter(item => !seen.has(`${item.text}|${item.date}`)), ...existingNotes].slice(0, 200);
    } else {
      vendor.crmNotes = existingNotes;
    }

    if (clearTasks === true) {
      vendor.crmTasks = Array.isArray(tasks) ? tasks : [];
    } else if (Array.isArray(tasks)) {
      vendor.crmTasks = tasks.filter(task => task && (task.text || task.title)).slice(0, 100);
    } else if (!Array.isArray(vendor.crmTasks)) {
      vendor.crmTasks = [];
    }

    saveUpdatedVendor(vendors, vendor);
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Append a CRM note without changing the stage.
router.post('/:id/crm/notes', (req, res) => {
  try {
    const text = String(req.body?.text || req.body?.note || '').trim();
    if (!text) return res.status(400).json({ error: 'Note text is required' });
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = vendors[idx];
    const notes = asNoteArray(vendor.crmNotes);
    const entry = { text, author: req.body?.author || 'You', date: new Date().toISOString() };
    vendor.crmNotes = [entry, ...notes].slice(0, 200);
    vendor.crmLastUpdated = entry.date;
    vendor.isEngaged = true;
    dbAdapter.saveVendors(vendors);
    res.json({ success: true, vendor, note: entry });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// API: Replace the CRM task list.
router.post('/:id/crm/tasks', (req, res) => {
  try {
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = vendors[idx];
    vendor.crmTasks = tasks
      .filter(task => task && (task.text || task.title))
      .map(task => ({
        text: String(task.text || task.title).trim(),
        done: Boolean(task.done),
        due: task.due || '',
        createdAt: task.createdAt || new Date().toISOString()
      }))
      .slice(0, 100);
    vendor.crmLastUpdated = new Date().toISOString();
    dbAdapter.saveVendors(vendors);
    res.json({ success: true, vendor, tasks: vendor.crmTasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save tasks' });
  }
});

// API: Read the CRM timeline for one vendor.
router.get('/:id/crm', (req, res) => {
  try {
    const vendor = dbAdapter.getVendors().find(v => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({
      success: true,
      stage: vendor.crmStage || 'new',
      notes: asNoteArray(vendor.crmNotes),
      tasks: Array.isArray(vendor.crmTasks) ? vendor.crmTasks : [],
      updatedAt: vendor.crmLastUpdated || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read CRM state' });
  }
});

// API: Mark Verified Leads as Pushed locally
router.post('/push', (req, res) => {
  try {
    const vendors = dbAdapter.getVendors();
    let pushedCount = 0;
    
    vendors.forEach(v => {
      if (v.verified === true && v.pushed !== true) {
        v.pushed = true;
        v.pushedAt = new Date().toISOString();
        pushedCount++;
      }
    });
    
    if (pushedCount === 0) {
      return res.status(400).json({ error: 'No verified unpushed vendors found.' });
    }

    dbAdapter.saveVendors(vendors);
    res.json({ success: true, pushed: pushedCount, message: "Leads successfully marked as pushed in standalone database." });
  } catch (error) {
    res.status(500).json({ error: 'Push failed: ' + error.message });
  }
});

// NOTE: `/clear-all` is defined once, near the top of this router. A second
// copy used to live here; Express always ran the first one, so this duplicate
// was dead code that skipped the out-of-bounds clear and the disk flush.

const cheerio = require('cheerio');

// Deep dork helper function to fetch phone numbers
async function dorkPhoneNumbers(vendorName, city) {
  const query = `"${vendorName}" ${city} contact number phone`;
  try {
    const res = await require('axios').get(`https://html.duckduckgo.com/html/`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    const html = res.data;
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // Phone classification is owned by the parser. A bare [6-9]\d{9} regex
    // used to promote order ids, landlines and other businesses' numbers into
    // the primary-phone slot; extractPhones validates every candidate and
    // sorts mobiles first.
    const { extractPhones } = require('../utils/phoneUtils');
    const parsed = extractPhones(bodyText);
    const seen = new Set();
    return parsed.filter((phone) => {
      if (!phone || !phone.isMobile) return false;
      const key = phone.e164;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (error) {
    console.error(`[Deep Phone Dork] Failed for ${vendorName}:`, error.message);
    return [];
  }
}

// API: Trigger Deep Phone Lookup for a single lead
router.post('/:id/deep-lookup', async (req, res) => {
  try {
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    
    if (idx === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendors[idx];
    console.log(`[Deep Phone Lookup] Triggered for vendor: ${vendor.name} in ${vendor.city}`);
    
    const phones = await dorkPhoneNumbers(vendor.name, vendor.city || '');
    const mobile = phones.find(phone => phone && phone.isMobile);
    if (mobile) {
      const existingPhones = Array.isArray(vendor.phones)
        ? vendor.phones
        : (vendor.phone ? [vendor.phone] : []);
      const digits = String(mobile.e164 || '').replace(/\D/g, '');

      vendor.phone = mobile.displayPhone || mobile.national || mobile.e164;
      vendor.phones = Array.from(new Set([vendor.phone, ...existingPhones])).filter(Boolean);
      vendor.phoneType = 'mobile';
      vendor.isMobile = true;
      vendor.isLandline = false;
      vendor.callUrl = `tel:+${digits}`;
      // Only a parser-validated mobile may ever produce a WhatsApp link.
      vendor.whatsappLink = `https://wa.me/${digits}`;
      vendor.whatsappAvailable = true;

      if (vendor.qualityScore) {
        vendor.qualityScore = Math.min(100, vendor.qualityScore + 30);
      }

      vendors[idx] = vendor;
      dbAdapter.saveVendors(vendors);

      return res.json({ success: true, phone: vendor.phone, vendor });
    }
    return res.status(404).json({ error: 'No validated mobile number resolved via web search.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// API: Aggressive Multi-Vector Mobile & Details Enrichment
router.post('/:id/deep-enrich', async (req, res) => {
  try {
    const { enrichSingleVendorAggressive } = require('../services/aggressivePhoneEnricher');
    const vendors = dbAdapter.getVendors();
    const vendor = vendors.find(v => v.id === req.params.id);
    if (!vendor) return res.status(404).json({ ok: false, error: 'Vendor not found' });

    const result = await enrichSingleVendorAggressive(vendor, req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('[Aggressive Enrich Error]', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// API: Public Marketplace (Masked & Limited)
router.get('/public', (req, res) => {
  try {
    const { q, category, location, limit = 30 } = req.query;
    let vendors = dbAdapter.getVendors() || [];
    
    // Filter by category/location if provided
    if (category) {
      vendors = vendors.filter(v => v.category?.toLowerCase().includes(category.toLowerCase()));
    }
    if (location) {
      vendors = vendors.filter(v => v.city?.toLowerCase().includes(location.toLowerCase()));
    }
    
    // Sort descending by scrapedAt
    vendors.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
    
    // Limit to 30 for Freemium
    const limitedVendors = vendors.slice(0, parseInt(limit));
    
    // Mask contact details
    const maskedVendors = limitedVendors.map(v => {
      let maskedPhone = v.phone;
      if (maskedPhone && maskedPhone.length > 5) {
        maskedPhone = maskedPhone.substring(0, 6) + '*** ****';
      } else {
        maskedPhone = 'Phone hidden';
      }
      
      let maskedEmail = v.email;
      if (maskedEmail && maskedEmail.includes('@')) {
        const [user, domain] = maskedEmail.split('@');
        maskedEmail = user.substring(0, 3) + '***@' + domain;
      }

      return {
        ...v,
        phone: maskedPhone,
        email: maskedEmail,
        website: 'Premium Only'
      };
    });

    res.json({ totalFound: vendors.length, results: maskedVendors });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Submit Public Lead
router.post('/lead', (req, res) => {
  try {
    const { vendorId, userName, userPhone, userEmail, message } = req.body;
    // Real implementation would save this lead to the DB
    console.log(`[New Lead] For vendor ${vendorId}: ${userName} (${userPhone})`);
    res.json({ success: true, message: 'Lead submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
