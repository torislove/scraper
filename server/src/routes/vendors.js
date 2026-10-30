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
    const { userId, since } = req.query;
    let data = dbAdapter.getVendors() || [];
    
    if (since && Number(since) > 0) {
      const sinceTime = new Date(Number(since)).getTime();
      data = data.filter(v => v.scrapedAt && new Date(v.scrapedAt).getTime() > sinceTime);
    }
    
    // Sort descending by scrapedAt
    data.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));

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
      dbAdapter.saveVendors(filtered);
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
    dbAdapter.saveVendors(verifiedOnly);
    res.json({ success: true, message: 'Unverified vendors cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API: Clear all leads completely
router.post('/clear-all', (req, res) => {
  try {
    dbAdapter.saveVendors([]);
    dbAdapter.saveOutOfBounds([]);
    if (typeof dbAdapter.flushSync === 'function') {
      dbAdapter.flushSync();
    }
    res.json({ success: true, message: 'All leads cleared completely', count: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  try {
    dbAdapter.saveVendors([]);
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
    const { crmStatus, crmStage, stage, notes, note, tasks, clearNotes, clearTasks } = req.body || {};
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = vendors[idx];
    const nextStage = normaliseCrmStage(stage || crmStage || crmStatus, vendor.crmStage || 'new');
    vendor.crmStage = nextStage;
    vendor.crmStatus = nextStage;
    vendor.crmLastUpdated = new Date().toISOString();
    vendor.isEngaged = nextStage !== 'new';

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

    dbAdapter.saveVendors(vendors);
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

// API: Clear all vendors (scraped data)
router.post('/clear-all', (req, res) => {
  try {
    dbAdapter.saveVendors([]);
    res.json({ success: true, message: 'All scraped vendors cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

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

    // Indian mobile phone regex
    const phoneRegex = /(?:\+91|0)?[ -]?[6789]\d{9}\b|(?:\d{3,5}[ -]\d{6,8})\b/g;
    const matches = bodyText.match(phoneRegex) || [];
    
    // Clean and filter duplicates
    const cleanPhones = [...new Set(matches.map(p => p.replace(/\s+/g, '').replace(/-/g, '')))]
      .filter(p => p.replace(/\D/g, '').length >= 10);
      
    return cleanPhones;
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
    if (phones && phones.length > 0) {
      const foundPhone = phones[0];
      let formattedPhone = foundPhone;
      if (foundPhone.length === 10) {
        formattedPhone = `+91 ${foundPhone}`;
      } else if (foundPhone.startsWith('0') && foundPhone.length === 11) {
        formattedPhone = `+91 ${foundPhone.substring(1)}`;
      }
      
      vendor.phone = formattedPhone;
      
      if (vendor.qualityScore) {
        vendor.qualityScore = Math.min(100, vendor.qualityScore + 30);
      }
      
      vendors[idx] = vendor;
      dbAdapter.saveVendors(vendors);
      
      return res.json({ success: true, phone: formattedPhone, vendor });
    } else {
      return res.status(404).json({ error: 'No phone numbers resolved via web search.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
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
