const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { SESSIONS_DIR } = require('../config/paths');

// Ensure base sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function getUserDir(userId) {
  const safeUserId = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userDir = path.join(SESSIONS_DIR, safeUserId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

function formatExcelPhone(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    const d = digits.slice(2);
    return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  } else if (str.startsWith('+')) {
    return str;
  }
  return digits ? `'+91 ${digits}` : str;
}

function syncVendorToSessionVault(vendor) {
  if (!vendor || !vendor.id) return false;
  try {
    if (!fs.existsSync(SESSIONS_DIR)) return false;
    const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
      try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
    });
    const candidateDirs = [getUserDir('anonymous'), ...subdirs.map(sd => path.join(SESSIONS_DIR, sd))];

    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!content || !Array.isArray(content.leads)) continue;
          const leadIndex = content.leads.findIndex(l => l.id === vendor.id);
          if (leadIndex !== -1) {
            content.leads[leadIndex] = {
              ...content.leads[leadIndex],
              ...vendor,
              crmStage: vendor.crmStage || content.leads[leadIndex].crmStage,
              crmStatus: vendor.crmStatus || content.leads[leadIndex].crmStatus,
              crmNotes: vendor.crmNotes || content.leads[leadIndex].crmNotes,
              crmTasks: vendor.crmTasks || content.leads[leadIndex].crmTasks,
              phone: vendor.phone || content.leads[leadIndex].phone
            };
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
          }
        } catch (e) {}
      }
    }
    return true;
  } catch (err) {
    console.error('[Session Sync Error]', err.message);
    return false;
  }
}

// Health / Index Route
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'User Sessions Storage Repository' });
});

// 1. Save or Update Search Session
router.post('/save', (req, res) => {
  try {
    const { userId, sessionId, category, location, timestamp, leads, metadata } = req.body;
    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'Missing userId or sessionId' });
    }

    const userDir = getUserDir(userId);
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(userDir, `${safeSessionId}.json`);

    const sessionData = {
      id: safeSessionId,
      name: req.body.name || `${category || 'Business'} in ${location || 'India'}`,
      userId,
      category: category || 'General Business',
      location: location || 'All India',
      timestamp: timestamp || new Date().toISOString(),
      leadCount: Array.isArray(leads) ? leads.length : 0,
      metadata: metadata || {},
      leads: leads || []
    };

    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    return res.json({ success: true, sessionId: safeSessionId, leadCount: sessionData.leadCount });
  } catch (error) {
    console.error('Failed to save search session:', error);
    return res.status(500).json({ error: 'Failed to save session' });
  }
});

// 2. List all saved sessions for a specific user (aggregates user + anonymous)
router.get(['/list', '/list/:userId'], (req, res) => {
  try {
    const userId = req.params.userId || 'anonymous';
    const dirsToScan = new Set();
    dirsToScan.add(getUserDir(userId));
    dirsToScan.add(getUserDir('anonymous'));

    // Also scan all subdirectories if needed so no scrape is ever missed
    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });
      subdirs.forEach(sd => dirsToScan.add(path.join(SESSIONS_DIR, sd)));
    }

    const sessionMap = new Map();

    for (const userDir of dirsToScan) {
      if (!fs.existsSync(userDir)) continue;
      const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(userDir, file), 'utf-8');
          const data = JSON.parse(raw);
          if (!data || !data.id) continue;

          if (!sessionMap.has(data.id)) {
            const leads = Array.isArray(data.leads) ? data.leads : [];
            const phoneCount = data.phoneCount || 
              data.metadata?.phoneCount || 
              data.metadata?.verifiedPhones || 
              leads.filter(l => l.phone && !l.phone.includes('Obfuscated') && !l.phone.includes('Requires')).length;
            const verifiedCount = data.verifiedCount ||
              data.metadata?.verifiedCount ||
              leads.filter(l => l && (l.verified || (l.phone && /^[6-9]\d{9}$/.test(String(l.phone).replace(/\D/g, '').slice(-10))))).length;

            const cleanCat = (data.category || 'Business Search').replace(/[^\w\s&,-]/g, '').trim();
            const cleanLoc = (data.location || 'India').replace(/[^\w\s&,-]/g, '').trim();

            const dateObj = new Date(data.timestamp || data.createdAt || Date.now());
            const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            const dateTimeSuffix = (dateStr && timeStr) ? ` • ${dateStr}, ${timeStr}` : '';
            const friendlyName = (data.name && data.name.includes('•'))
              ? data.name
              : (cleanCat && cleanLoc ? `${cleanCat} in ${cleanLoc}${dateTimeSuffix}` : (data.name || data.category || 'Lead Vault'));

            sessionMap.set(data.id, {
              id: data.id,
              name: friendlyName,
              userId: data.userId || userId,
              category: cleanCat,
              location: cleanLoc,
              timestamp: data.timestamp || new Date().toISOString(),
              createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
              leadCount: data.leadCount || leads.length,
              phoneCount,
              verifiedCount,
              status: data.metadata?.status || 'completed',
              metadata: data.metadata || {}
            });
          }
        } catch (e) {
          console.error('Error reading session file:', file, e.message);
        }
      }
    }

    const sessions = Array.from(sessionMap.values());
    // Sort descending by timestamp
    sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// 3. Export a session by id alone (used by the V2 folder cards).
router.get('/export/:sessionId', (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const format = String(req.query.format || 'csv').toLowerCase() === 'json' ? 'json' : 'csv';
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

    const leads = Array.isArray(data.leads) ? data.leads : [];
    const baseName = `${data.category || 'leads'}_${data.location || 'india'}`.replace(/[^a-zA-Z0-9_-]+/g, '_');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.json"`);
      return res.send(JSON.stringify(leads, null, 2));
    }

    const headers = [
      'Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'WhatsApp Direct URL',
      'Email', 'Website', 'Instagram', 'Address', 'City / Mandal', 'District', 'State',
      'Pincode', 'Rating', 'Reviews Count', 'CRM Stage', 'CRM Notes'
    ];
    const escapeCsv = val => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;
    const rows = leads.map(lead => {
      const ph = lead.phone || lead.primaryPhone;
      const cleanDigits = ph ? String(ph).replace(/\D/g, '').slice(-10) : '';
      const notesStr = Array.isArray(lead.crmNotes)
        ? lead.crmNotes.map(n => typeof n === 'string' ? n : n.text).filter(Boolean).join(' | ')
        : (lead.crmNotes || lead.notes || '');
      return [
        escapeCsv(lead.name),
        escapeCsv(lead.category),
        escapeCsv(formatExcelPhone(ph)),
        escapeCsv(formatExcelPhone(lead.secondaryPhone)),
        escapeCsv(lead.whatsappLink || (cleanDigits ? `https://wa.me/91${cleanDigits}` : '')),
        escapeCsv(lead.email),
        escapeCsv(lead.website),
        escapeCsv(lead.instagram),
        escapeCsv(lead.address),
        escapeCsv(lead.city || lead.village || lead.mandal),
        escapeCsv(lead.district),
        escapeCsv(lead.state),
        escapeCsv(lead.pincode),
        escapeCsv(lead.rating),
        escapeCsv(lead.reviewsCount || lead.reviewCount),
        escapeCsv(lead.crmStage || lead.crmStatus || 'new'),
        escapeCsv(notesStr)
      ].join(',');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
    return res.send([headers.join(','), ...rows].join('\n'));
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// 4. Get single session with complete leads (checks userDir, anonymous, and all dirs)
router.get(['/:sessionId', '/:userId/:sessionId'], (req, res) => {
  try {
    const userId = req.params.userId || 'anonymous';
    const sessionId = req.params.sessionId || req.params.userId;
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const candidateDirs = [
      getUserDir(userId),
      getUserDir('anonymous')
    ];

    if (fs.existsSync(SESSIONS_DIR)) {
      const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
        try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
      });
      subdirs.forEach(sd => candidateDirs.push(path.join(SESSIONS_DIR, sd)));
    }

    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${safeSessionId}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // Merge with current live dbAdapter vendors for freshest CRM stages, notes, and contacts!
        try {
          const dbAdapter = require('../config/dbAdapter');
          const liveVendors = dbAdapter.getVendors() || [];
          const liveMap = new Map(liveVendors.map(v => [v.id, v]));

          if (Array.isArray(data.leads)) {
            data.leads = data.leads.map(lead => {
              const live = liveMap.get(lead.id);
              if (!live) return lead;
              return {
                ...lead,
                ...live,
                phone: live.phone || lead.phone,
                crmStage: live.crmStage || lead.crmStage || 'new',
                crmStatus: live.crmStatus || lead.crmStatus || 'new',
                crmNotes: live.crmNotes || lead.crmNotes,
                crmTasks: live.crmTasks || lead.crmTasks
              };
            });
          }
        } catch (e) { /* ignore merge error */ }
        return res.json({ success: true, session: data });
      }
    }

    return res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// 4. Delete session
router.delete(['/:sessionId', '/:userId/:sessionId'], (req, res) => {
  try {
    const userId = req.params.userId || 'anonymous';
    const sessionId = req.params.sessionId || req.params.userId;
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const candidateDirs = [
      getUserDir(userId),
      getUserDir('anonymous')
    ];

    let deleted = false;
    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${safeSessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }
    }

    return res.json({ success: true, message: deleted ? 'Session deleted' : 'Session not found' });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// 5. Export session directly
router.get('/export/:userId/:sessionId', (req, res) => {
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
    const leads = data.leads || [];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${data.category}_${data.location}_leads.json"`);
      return res.send(JSON.stringify(leads, null, 2));
    }

    // CSV format
    const headers = [
      'Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'WhatsApp Direct URL',
      'Email', 'Website', 'Instagram', 'Address', 'City / Mandal', 'District', 'State',
      'Pincode', 'Rating', 'Reviews Count', 'CRM Stage', 'CRM Notes'
    ];
    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = leads.map(l => {
      const ph = l.phone || l.primaryPhone;
      const cleanDigits = ph ? String(ph).replace(/\D/g, '').slice(-10) : '';
      const notesStr = Array.isArray(l.crmNotes)
        ? l.crmNotes.map(n => typeof n === 'string' ? n : n.text).filter(Boolean).join(' | ')
        : (l.crmNotes || l.notes || '');
      return [
        escapeCsv(l.name),
        escapeCsv(l.category),
        escapeCsv(formatExcelPhone(ph)),
        escapeCsv(formatExcelPhone(l.secondaryPhone)),
        escapeCsv(l.whatsappLink || (cleanDigits ? `https://wa.me/91${cleanDigits}` : '')),
        escapeCsv(l.email),
        escapeCsv(l.website),
        escapeCsv(l.instagram),
        escapeCsv(l.address),
        escapeCsv(l.city || l.mandal || l.village),
        escapeCsv(l.district),
        escapeCsv(l.state),
        escapeCsv(l.pincode),
        escapeCsv(l.rating),
        escapeCsv(l.reviewCount || l.reviewsCount),
        escapeCsv(l.crmStage || l.crmStatus || 'new'),
        escapeCsv(notesStr)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${data.category}_${data.location}_leads.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

router.syncVendorToSessionVault = syncVendorToSessionVault;
module.exports = router;
