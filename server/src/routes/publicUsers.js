const express = require('express');
const router = express.Router();
const dbAdapter = require('../config/dbAdapter');
const { v4: uuidv4 } = require('uuid');

// 1. Auth (Login/Signup)
// Simple implementation for demo purposes: Creates or returns a user by email
router.post('/auth', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const users = dbAdapter.getPublicUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create new user with 20 free credits
      user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        credits: 20,
        subscriptionTier: 'Free', // Free, Pro, Enterprise
        subscriptionExpiry: null,
        unlockedLeads: [],
        deepExtractorEnabled: false,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      dbAdapter.savePublicUsers(users);
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Reveal Lead
router.post('/reveal', (req, res) => {
  try {
    const { userId, vendorId } = req.body;
    if (!userId || !vendorId) return res.status(400).json({ error: 'Missing userId or vendorId' });

    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];

    // Check if already unlocked
    if (user.unlockedLeads.includes(vendorId)) {
      return fetchAndReturnRealVendor(vendorId, res);
    }

    // Check credits
    if (user.credits <= 0) {
      return res.status(403).json({ error: 'Out of credits' });
    }

    // Deduct credit & record unlock
    user.credits -= 1;
    user.unlockedLeads.push(vendorId);
    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);

    return fetchAndReturnRealVendor(vendorId, res);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Subscription Checkout (Dummy Workflow)
router.post('/checkout/dummy', (req, res) => {
  try {
    const { userId, tier } = req.body;
    if (!userId || !tier) return res.status(400).json({ error: 'Missing userId or tier' });

    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    user.subscriptionTier = tier;
    
    // Assign credits and expiry based on tier
    if (tier === 'Weekly Pro') {
      user.credits += 500;
      user.subscriptionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      user.deepExtractorEnabled = true;
    } else if (tier === 'Monthly Enterprise') {
      user.credits += 3000;
      user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      user.deepExtractorEnabled = true;
    }

    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);

    res.json({ success: true, message: `Successfully upgraded to ${tier}`, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Admin: Get all public users
router.get('/admin/list', (req, res) => {
  try {
    const users = dbAdapter.getPublicUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. Admin: Update credits
router.post('/admin/credits', (req, res) => {
  try {
    const { userId, credits } = req.body;
    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].credits = parseInt(credits);
      dbAdapter.savePublicUsers(users);
      res.json({ success: true, user: users[userIndex] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Admin: Update Deep Extractor Permission
router.post('/admin/permissions', (req, res) => {
  try {
    const { userId, deepExtractorEnabled } = req.body;
    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].deepExtractorEnabled = !!deepExtractorEnabled;
      dbAdapter.savePublicUsers(users);
      res.json({ success: true, user: users[userIndex] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const cheerio = require('cheerio');

// 6. Public: Deep Phone Extractor Endpoint
router.post('/deep-extract', async (req, res) => {
  try {
    const { target, isAnonymous, userId } = req.body;
    if (!target) return res.status(400).json({ error: 'Missing target business or url' });

    // Enforce permissions for non-anonymous requests
    if (!isAnonymous && userId) {
      const users = dbAdapter.getPublicUsers();
      const user = users.find(u => u.id === userId);
      if (!user || !user.deepExtractorEnabled) {
        return res.status(403).json({ error: 'Access denied. You need a Premium Data License to use the Deep Extractor API.' });
      }
    }

    // Execute Deep Dork Extraction
    const query = `"${target}" contact number phone`;
    const searchRes = await require('axios').get(`https://html.duckduckgo.com/html/`, {
      params: { q: query },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });

    const html = searchRes.data;
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    const phoneRegex = /(?:\+91|0)?[ -]?[6789]\d{9}\b|(?:\d{3,5}[ -]\d{6,8})\b/g;
    const matches = bodyText.match(phoneRegex) || [];
    
    const cleanPhones = [...new Set(matches.map(p => p.replace(/\s+/g, '').replace(/-/g, '')))]
      .filter(p => p.replace(/\D/g, '').length >= 10);

    if (cleanPhones.length > 0) {
      return res.json({ success: true, extractedPhones: cleanPhones });
    } else {
      return res.status(404).json({ error: 'No phone numbers found in raw HTML payload.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Extraction failed: ' + error.message });
  }
});

// 7. Public: Trigger a Demo Scrape
router.post('/demo-scrape', async (req, res) => {
  try {
    const { category, location, radius, density, strategy } = req.body;
    if (!category || !location) return res.status(400).json({ error: 'Missing category or location' });

    const { addScrapeJob } = require('../utils/queue');
    const searchString = `${category} in ${location}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchString)}`;
    const sessionId = `demo_${Date.now()}`;
    
    console.log(`[Public Demo] Starting live AI scrape for: ${searchString} | Strategy: ${strategy || 'mandal'} | Radius: ${radius || 15}km`);
    
    // addScrapeJob signature: async (type, args)
    // For 'scrapeGooglePlaces': [url, category, location, sessionId, centerLat, centerLng, radius, strategy]
    // The scraper internally uses grid density inside the worker if strategy is broad/strict.
    // For now we pass radius and strategy.
    await addScrapeJob('scrapeGooglePlaces', [searchUrl, category, location, sessionId, null, null, radius || 15, strategy || 'mandal']);
    
    res.json({ success: true, message: 'Demo scrape started successfully!', sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Demo failed: ' + error.message });
  }
});

// Helper to fetch and return real vendor info
function fetchAndReturnRealVendor(vendorId, res) {
  const vendors = dbAdapter.getVendors();
  const vendor = vendors.find(v => v.id === vendorId);
  
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  // Return unmasked details
  return res.json({ 
    success: true, 
    contact: {
      phone: vendor.phone,
      email: vendor.email
    } 
  });
}

// 8. Public: Get My Unlocked Leads
router.get('/my-leads', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const users = dbAdapter.getPublicUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const vendors = dbAdapter.getVendors();
    const myLeads = vendors.filter(v => user.unlockedLeads.includes(v.id));

    res.json({ success: true, leads: myLeads });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 9. Public: Buy Credits (Simulated)
router.post('/buy-credits', (req, res) => {
  try {
    const { userId, creditsToAdd, amount } = req.body;
    if (!userId || !creditsToAdd) return res.status(400).json({ error: 'Missing userId or credits' });

    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = users[userIndex];
    user.credits += parseInt(creditsToAdd);
    
    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);

    res.json({ success: true, message: `Successfully purchased ${creditsToAdd} credits!`, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 10. Public: Reveal/Unlock a Lead
router.post('/reveal', (req, res) => {
  try {
    const { userId, vendorId } = req.body;
    if (!userId || !vendorId) return res.status(400).json({ error: 'Missing userId or vendorId' });

    const users = dbAdapter.getPublicUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = users[userIndex];
    
    // Check if already unlocked
    if (user.unlockedLeads.includes(vendorId)) {
      return res.json({ success: true, message: 'Already unlocked' });
    }

    if (user.credits < 1) {
      return res.status(403).json({ error: 'Out of credits' });
    }

    user.credits -= 1;
    user.unlockedLeads.push(vendorId);
    
    users[userIndex] = user;
    dbAdapter.savePublicUsers(users);

    res.json({ success: true, message: 'Unlocked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
