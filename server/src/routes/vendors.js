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

    // Client Lead Isolation & Multi-tenant filtering
    if (userId && !userId.startsWith('admin')) {
      const users = dbAdapter.getPublicUsers();
      const user = users.find(u => u.id === userId);
      const unlockedLeads = user ? user.unlockedLeads : [];

      // Only show leads they scraped OR leads they unlocked from the marketplace
      data = data.filter(v => v.userId === userId || unlockedLeads.includes(v.id));

      data = data.map(v => {
        // If the lead belongs to this user (scraped it) or is unlocked, show full contact details
        if (v.userId === userId || unlockedLeads.includes(v.id)) {
          return { ...v, isLocked: false };
        }
        return {
          ...v,
          phone: v.phone ? 'Requires 1 Credit' : null,
          email: v.email ? 'Requires 1 Credit' : null,
          Camera: v.Camera ? 'Masked' : null,
          isLocked: true
        };
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
    const { since, userId } = req.query;
    let data = dbAdapter.getOutOfBounds() || [];
    if (since && Number(since) > 0) {
      const sinceTime = new Date(Number(since)).getTime();
      data = data.filter(v => v.scrapedAt && new Date(v.scrapedAt).getTime() > sinceTime);
    }
    if (userId && !userId.startsWith('admin')) {
      data = data.filter(v => v.userId === userId);
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

// API: Update CRM Status (used by employees)
router.put('/:id/crm', (req, res) => {
  try {
    const { crmStatus, notes } = req.body;
    const vendors = dbAdapter.getVendors();
    const idx = vendors.findIndex(v => v.id === req.params.id);
    
    if (idx !== -1) {
      vendors[idx].crmStatus = crmStatus;
      vendors[idx].crmNotes = notes;
      vendors[idx].crmLastUpdated = new Date().toISOString();
      dbAdapter.saveVendors(vendors);
      res.json({ success: true, vendor: vendors[idx] });
    } else {
      res.status(404).json({ error: 'Vendor not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
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
