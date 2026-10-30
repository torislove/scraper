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

function buildVcard(lead) {
  const name = (lead.name || 'Vendor Lead').replace(/[;\r\n]/g, ' ');
  const category = (lead.category || '').replace(/[;\r\n]/g, ' ');
  const ph = lead.phone || lead.primaryPhone || '';
  const digits = String(ph).replace(/\D/g, '').slice(-10);
  const formattedPhone = digits.length === 10 ? `+91${digits}` : ph;
  const addr = (lead.address || lead.area || lead.city || '').replace(/[;\r\n]/g, ' ');
  const city = (lead.city || lead.mandal || '').replace(/[;\r\n]/g, ' ');
  const state = (lead.state || 'India').replace(/[;\r\n]/g, ' ');
  const note = `Category: ${category} | Rating: ${lead.rating || 'N/A'} | CRM: ${lead.crmStage || 'new'}`;

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `ORG:${name};${category}`,
    `TITLE:${category}`
  ];
  if (formattedPhone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${formattedPhone}`);
  }
  if (lead.email) {
    lines.push(`EMAIL;TYPE=WORK:${lead.email}`);
  }
  if (lead.website) {
    lines.push(`URL:${lead.website}`);
  }
  if (addr || city) {
    lines.push(`ADR;TYPE=WORK:;;${addr};${city};;${lead.pincode || ''};${state}`);
  }
  lines.push(`NOTE:${note}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function formatExcelPhone(ph) {
  if (!ph) return '';
  const digits = String(ph).replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  return String(ph);
}

function buildExportContent(leads, format, baseName) {
  const cleanFormat = String(format || 'csv').toLowerCase();

  if (cleanFormat === 'json') {
    return {
      contentType: 'application/json',
      filename: `${baseName}.json`,
      body: JSON.stringify(leads, null, 2)
    };
  }

  if (cleanFormat === 'vcf') {
    const vcfCards = leads.map(l => buildVcard(l)).filter(Boolean).join('\r\n\r\n');
    return {
      contentType: 'text/vcard; charset=utf-8',
      filename: `${baseName}.vcf`,
      body: vcfCards
    };
  }

  if (cleanFormat === 'txt') {
    const phones = leads
      .map(l => {
        const ph = l.phone || l.primaryPhone;
        if (!ph) return null;
        const d = String(ph).replace(/\D/g, '').slice(-10);
        return d.length === 10 ? `+91${d}` : ph;
      })
      .filter(Boolean);
    const unique = [...new Set(phones)];
    return {
      contentType: 'text/plain; charset=utf-8',
      filename: `${baseName}_mobiles.txt`,
      body: unique.join('\r\n')
    };
  }

  if (cleanFormat === 'dialer') {
    const headers = [
      'Phone Number', 'Contact Name', 'Company Name', 'Address', 'City',
      'State', 'Pincode', 'Category', 'Rating', 'Website', 'Deal Value', 'Notes'
    ];
    const escapeCsv = val => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;
    const rows = leads.map(l => {
      const ph = l.phone || l.primaryPhone || '';
      const d = String(ph).replace(/\D/g, '').slice(-10);
      const cleanPhone = d.length === 10 ? `91${d}` : ph;
      const notesStr = Array.isArray(l.crmNotes)
        ? l.crmNotes.map(n => typeof n === 'string' ? n : n.text).filter(Boolean).join(' | ')
        : (l.crmNotes || l.notes || '');
      return [
        escapeCsv(cleanPhone),
        escapeCsv(l.contactName || l.name),
        escapeCsv(l.name),
        escapeCsv(l.address || l.area),
        escapeCsv(l.city || l.village || l.mandal),
        escapeCsv(l.state || 'India'),
        escapeCsv(l.pincode),
        escapeCsv(l.category),
        escapeCsv(l.rating),
        escapeCsv(l.website),
        escapeCsv(l.dealValue || 0),
        escapeCsv(notesStr)
      ].join(',');
    });
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseName}_telephony_dialer.csv`,
      body: [headers.join(','), ...rows].join('\n')
    };
  }

  // Default: Standard Clean Spreadsheet CSV (no scientific notation)
  const headers = [
    'Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'WhatsApp Direct URL',
    'Email', 'Website', 'Instagram', 'Address', 'City / Mandal', 'District', 'State',
    'Pincode', 'Rating', 'Reviews Count', 'Deal Value (INR)', 'CRM Stage', 'Follow Up Date', 'CRM Notes'
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
      escapeCsv(lead.dealValue || 0),
      escapeCsv(lead.crmStage || lead.crmStatus || 'new'),
      escapeCsv(lead.followUpDate || ''),
      escapeCsv(notesStr)
    ].join(',');
  });

  return {
    contentType: 'text/csv; charset=utf-8',
    filename: `${baseName}.csv`,
    body: [headers.join(','), ...rows].join('\n')
  };
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
              dealValue: vendor.dealValue !== undefined ? vendor.dealValue : content.leads[leadIndex].dealValue,
              followUpDate: vendor.followUpDate !== undefined ? vendor.followUpDate : content.leads[leadIndex].followUpDate,
              callOutcome: vendor.callOutcome !== undefined ? vendor.callOutcome : content.leads[leadIndex].callOutcome,
              contactName: vendor.contactName !== undefined ? vendor.contactName : content.leads[leadIndex].contactName,
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
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
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

            const customName = data.customName || data.name || friendlyName;
            const tags = Array.isArray(data.tags) ? data.tags : (data.metadata?.tags || []);
            const color = data.color || data.metadata?.color || 'blue';
            const folderNotes = data.notes || data.metadata?.notes || '';
            const dealValueTotal = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);
            const isMaster = Boolean(data.isMasterSweep || data.metadata?.isMasterSweep || /master_/.test(data.id) || /sweep/i.test(data.location || ''));
            const masterScope = data.masterScope || data.metadata?.masterScope || (isMaster ? (/(state)/i.test(data.location || '') ? 'state' : 'district') : null);

            sessionMap.set(data.id, {
              id: data.id,
              name: customName,
              customName,
              tags,
              color,
              notes: folderNotes,
              dealValueTotal,
              isMasterSweep: isMaster,
              masterScope,
              clientId: data.userId || clientId,
              clientLabel: (data.userId || clientId) === 'master' ? '👑 Master System' : `👤 Client (${data.userId || clientId})`,
              userId: data.userId || clientId,
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
        } catch (e) {}
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

// 2. List all saved sessions (Scoped: Client sees ONLY client data; Master sees ALL)
router.get(['/list', '/list/:userId'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    const sessionMap = new Map();

    if (isMaster) {
      // Master view: Aggregates across ALL clients and master sweeps
      const dirsToScan = [];
      if (fs.existsSync(SESSIONS_DIR)) {
        const subdirs = fs.readdirSync(SESSIONS_DIR).filter(f => {
          try { return fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory(); } catch (e) { return false; }
        });
        subdirs.forEach(sd => dirsToScan.push({ dir: path.join(SESSIONS_DIR, sd), clientId: sd }));
      }

      for (const { dir, clientId } of dirsToScan) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
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

              const customName = data.customName || data.name || friendlyName;
              const tags = Array.isArray(data.tags) ? data.tags : (data.metadata?.tags || []);
              const color = data.color || data.metadata?.color || 'blue';
              const folderNotes = data.notes || data.metadata?.notes || '';
              const dealValueTotal = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);
              const isMasterSweep = Boolean(data.isMasterSweep || data.metadata?.isMasterSweep || /master_/.test(data.id) || /sweep/i.test(data.location || ''));
              const masterScope = data.masterScope || data.metadata?.masterScope || (isMasterSweep ? (/(state)/i.test(data.location || '') ? 'state' : 'district') : null);

              sessionMap.set(data.id, {
                id: data.id,
                name: customName,
                customName,
                tags,
                color,
                notes: folderNotes,
                dealValueTotal,
                isMasterSweep,
                masterScope,
                clientId: data.userId || clientId,
                clientLabel: (data.userId || clientId) === 'master' ? '👑 Master System' : `👤 Client (${data.userId || clientId})`,
                userId: data.userId || clientId,
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
          } catch (e) {}
        }
      }
    } else {
      // Client view: Restricted ONLY to this specific client's directory. No master access, no other clients!
      const userId = req.headers['x-user-id'] || req.params.userId || 'anonymous';
      const userDir = getUserDir(userId);

      if (fs.existsSync(userDir)) {
        const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(userDir, file), 'utf-8');
            const data = JSON.parse(raw);
            if (!data || !data.id) continue;

            // Never leak Master Sweeps to standard client!
            const isMasterSweep = Boolean(data.isMasterSweep || data.metadata?.isMasterSweep || /master_/.test(data.id));
            if (isMasterSweep) continue;

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

              const customName = data.customName || data.name || friendlyName;
              const tags = Array.isArray(data.tags) ? data.tags : (data.metadata?.tags || []);
              const color = data.color || data.metadata?.color || 'blue';
              const folderNotes = data.notes || data.metadata?.notes || '';
              const dealValueTotal = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);

              sessionMap.set(data.id, {
                id: data.id,
                name: customName,
                customName,
                tags,
                color,
                notes: folderNotes,
                dealValueTotal,
                isMasterSweep: false,
                userId,
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
          } catch (e) {}
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

// 3. Export a session by id alone (used by the V2 folder cards).
router.get('/export/:sessionId', (req, res) => {
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

    const leads = Array.isArray(data.leads) ? data.leads : [];
    const baseName = `${data.category || 'leads'}_${data.location || 'india'}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const exportResult = buildExportContent(leads, format, baseName);

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
    const sessionId = req.body.sessionId || req.params.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const safeSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const { name, tags, color, notes } = req.body;

    const candidateDirs = [getUserDir('anonymous')];
    if (fs.existsSync(SESSIONS_DIR)) {
      for (const entry of fs.readdirSync(SESSIONS_DIR)) {
        try {
          if (fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) {
            candidateDirs.push(path.join(SESSIONS_DIR, entry));
          }
        } catch (e) {}
      }
    }

    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${safeSessionId}.json`);
      if (fs.existsSync(filePath)) {
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
        return res.json({ success: true, session });
      }
    }

    return res.status(404).json({ error: 'Session folder not found' });
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

    const candidateDirs = [getUserDir('anonymous')];
    if (fs.existsSync(SESSIONS_DIR)) {
      for (const entry of fs.readdirSync(SESSIONS_DIR)) {
        try {
          if (fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) {
            candidateDirs.push(path.join(SESSIONS_DIR, entry));
          }
        } catch (e) {}
      }
    }

    const loadedSessions = [];
    for (const id of sessionIds) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, `${safeId}.json`);
        if (fs.existsSync(filePath)) {
          try {
            loadedSessions.push(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
            break;
          } catch (e) {}
        }
      }
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
        const ph = lead.phone || lead.primaryPhone || '';
        const digits = String(ph).replace(/\D/g, '').slice(-10);
        const dedupeKey = digits && digits.length === 10
          ? `phone_${digits}`
          : (lead.id || `name_${String(lead.name).toLowerCase()}_${String(lead.city || lead.area || '').toLowerCase()}`);

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

// 6. Batch Delete Sessions
router.post('/batch-delete', (req, res) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || !sessionIds.length) {
      return res.status(400).json({ error: 'sessionIds array is required' });
    }

    const candidateDirs = [getUserDir('anonymous')];
    if (fs.existsSync(SESSIONS_DIR)) {
      for (const entry of fs.readdirSync(SESSIONS_DIR)) {
        try {
          if (fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) {
            candidateDirs.push(path.join(SESSIONS_DIR, entry));
          }
        } catch (e) {}
      }
    }

    let deletedCount = 0;
    for (const id of sessionIds) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, `${safeId}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount++;
          break;
        }
      }
    }

    return res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error('Batch delete error:', error);
    return res.status(500).json({ error: 'Failed to batch delete sessions' });
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
      // Standard client: STRICTLY restricted to their own user directory
      candidateDirs = [getUserDir(userId)];
    }

    for (const dir of candidateDirs) {
      const filePath = path.join(dir, `${safeSessionId}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Client cannot access Master Sweeps
        if (!isMaster && (data.isMasterSweep || data.metadata?.isMasterSweep || /master_/.test(data.id))) {
          return res.status(403).json({ error: 'Access denied: Master territorial sweeps are restricted to Master Command Center.' });
        }

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
        return res.json({ success: true, session: data, isMasterAuthorized: isMaster });
      }
    }

    return res.status(404).json({ error: 'Session not found or access unauthorized' });
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
    const baseName = `${data.category || 'leads'}_${data.location || 'india'}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
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
