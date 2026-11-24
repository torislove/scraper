/**
 * sessionStore.js
 *
 * Core Session Persistence, Directory Isolation, Lead Hierarchy Grouping,
 * VCF/CSV/Excel Exporters, and User Folder Storage Service.
 */

const fs = require('fs');
const path = require('path');

const { SESSIONS_DIR } = require('../config/paths');
const { normalizePhone } = require('../utils/phoneUtils');
const { calculateLeadQuality } = require('../utils/leadScoring');

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

function safeSessionKey(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * The single source of truth for "which folders can this caller see?".
 * List, get, rename, merge and delete all use it, so a folder can never be
 * visible but undeletable (or deletable but invisible).
 */
function listSessionDirs({ isMaster = false, isAdmin = false, userId = null } = {}) {
  const dirs = [];
  if (!fs.existsSync(SESSIONS_DIR)) return dirs;

  if (isAdmin) {
    // Admin sees ALL session directories across both Master and all Clients
    for (const entry of fs.readdirSync(SESSIONS_DIR)) {
      if (!entry || entry.startsWith('_') || entry.startsWith('.')) continue;
      try {
        if (!fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) continue;
      } catch (e) {
        continue;
      }
      dirs.push(path.join(SESSIONS_DIR, entry));
    }
  } else if (isMaster) {
    // Master is STRICTLY isolated to the master directory. Master CANNOT see client sessions!
    const masterDir = path.join(SESSIONS_DIR, 'master');
    if (fs.existsSync(masterDir)) {
      dirs.push(masterDir);
    }
  } else {
    // Client view: ONLY scan the client's own directory (plus anonymous if unauthenticated)
    const rawUser = userId ? String(userId).trim() : 'anonymous';
    const safeUser = rawUser.replace(/[^a-zA-Z0-9_-]/g, '_');
    const userDir = path.join(SESSIONS_DIR, safeUser);
    if (fs.existsSync(userDir)) {
      dirs.push(userDir);
    }
    // Also include anonymous vault if caller is anonymous or has no userDir yet
    if (safeUser === 'anonymous' || !dirs.length) {
      const anonDir = path.join(SESSIONS_DIR, 'anonymous');
      if (fs.existsSync(anonDir) && !dirs.includes(anonDir)) {
        dirs.push(anonDir);
      }
    }
  }

  dirs.sort((a, b) => {
    const an = path.basename(a);
    const bn = path.basename(b);
    if (an === 'anonymous') return -1;
    if (bn === 'anonymous') return 1;
    return an.localeCompare(bn);
  });
  return dirs;
}

/** Every on-disk copy of one folder, in the directories the caller may see. */
function resolveSessionFiles(sessionId, { isMaster = false, isAdmin = false, userId = null } = {}) {
  const safeId = safeSessionKey(sessionId);
  const files = [];
  for (const dir of listSessionDirs({ isMaster, isAdmin, userId })) {
    const filePath = path.join(dir, `${safeId}.json`);
    if (fs.existsSync(filePath)) files.push(filePath);
  }
  return files;
}

function isSessionRunning(sessionId) {
  try {
    const { isSessionActive } = require('../routes/scrape/scrapeShared');
    return isSessionActive(sessionId);
  } catch (e) {
    return false;
  }
}

/**
 * Remove a deleted folder's rows from the live store.
 *
 * A row is only removed when the deleted folder was its *only* source. Search
 * results are shared: a repeat search appends the new session id to a row that
 * already belonged to earlier runs. Deleting the newest folder must therefore
 * forget that folder, not destroy a lead another folder still owns. CRM-engaged
 * leads are kept on purpose even when the folder was their only source.
 */
function purgeSessionLeads(sessionId) {
  const dbAdapter = require('../config/dbAdapter');
  const { isEngaged, removeDeepProfile } = require('../services/leadRetention');
  const all = dbAdapter.getVendors() || [];
  const keep = [];
  const removed = [];
  let engagedKept = 0;
  let sharedKept = 0;
  let changed = false;

  for (const vendor of all) {
    if (!vendor || !vendor.id) {
      keep.push(vendor);
      continue;
    }

    const history = new Set(
      [
        ...(Array.isArray(vendor.sessionIds) ? vendor.sessionIds : []),
        vendor.sessionId,
        vendor.lastSessionId,
      ].filter(Boolean)
    );

    if (!history.has(sessionId)) {
      keep.push(vendor);
      continue;
    }

    const remaining = Array.from(history).filter((id) => id !== sessionId);

    // The row has another owner. Forget this folder and keep the lead.
    if (remaining.length > 0) {
      const pointer = remaining[remaining.length - 1];
      vendor.sessionIds = remaining;
      if (vendor.sessionId === sessionId) vendor.sessionId = pointer;
      if (vendor.lastSessionId === sessionId) vendor.lastSessionId = pointer;
      keep.push(vendor);
      sharedKept += 1;
      changed = true;
      continue;
    }

    if (isEngaged(vendor)) {
      // Keep the conversation, but stop pointing at a folder that no longer exists.
      vendor.sessionIds = [];
      if (vendor.sessionId === sessionId) vendor.sessionId = '';
      if (vendor.lastSessionId === sessionId) vendor.lastSessionId = '';
      keep.push(vendor);
      engagedKept += 1;
      changed = true;
      continue;
    }

    removed.push(vendor);
    changed = true;
  }

  if (changed) {
    // Two independent recovery points before the row leaves the live store:
    // the replace archives each removed row (per-lead restore), and a
    // pre-change full backup allows a whole-store rollback.
    if (removed.length) {
      try {
        require('../config/vendorStore').backupNow(`pre-delete:${sessionId}`);
      } catch (e) {}
    }
    dbAdapter.replaceVendors(keep, { reason: 'folder_delete', sessionId });
    try { dbAdapter.flushSync(); } catch (e) {}
    for (const vendor of removed) {
      try { removeDeepProfile(vendor.id); } catch (e) {}
    }
    try {
      require('../services/deepProfileService')
        .stopJobsForVendorIds(removed.map(vendor => vendor.id));
    } catch (e) {}
  }

  return { leadsRemoved: removed.length, engagedKept, sharedKept };
}

/**
 * A folder is the set of leads its own run produced. The live store is shared
 * by every run, and `bySession()` also matches rows that merely list a session
 * in their history, so reading it naively mixed leads from other folders into
 * this one (a 405-lead folder exported 829 rows, 424 of them from other runs).
 *
 * This helper is the single definition of folder membership used by the
 * sidebar header, the folder viewer and every export format:
 *   1. the rows saved in the folder file,
 *   2. refreshed in place with their freshest store version,
 *   3. plus store rows the run itself owns (`sessionId`/`lastSessionId`),
 *      which covers late stragglers a crashed run never wrote to disk.
 * Rows that only reference the session in `sessionIds` stay in their own folder.
 */
function leadIdentity(lead) {
  if (!lead) return '';
  if (lead.id) return `id:${lead.id}`;
  const name = String(lead.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const phone = String(lead.phone || lead.primaryPhone || '').replace(/\D/g, '').slice(-10);
  const city = String(lead.city || lead.area || '').toLowerCase().trim();
  return `name:${name}|${phone}|${city}`;
}

function withOwnSessionLeads(sessionId, folderLeads) {
  const base = Array.isArray(folderLeads) ? folderLeads.slice() : [];
  if (!sessionId) return base;
  try {
    const dbAdapter = require('../config/dbAdapter');
    const live = dbAdapter.getVendorsBySession(sessionId);
    if (!Array.isArray(live) || !live.length) return base;

    // An empty folder is a recovery case: any row that references it is better
    // than showing nothing. A populated folder only accepts its own rows.
    const recovery = base.length === 0;
    const index = new Map();
    for (const lead of base) {
      if (!lead) continue;
      index.set(leadIdentity(lead), lead);
    }

    for (const row of live) {
      if (!row) continue;
      const owns = row.sessionId === sessionId || row.lastSessionId === sessionId;
      if (!owns && !recovery) continue;

      const key = leadIdentity(row);
      const existing = index.get(key) || (row.id ? index.get(`id:${row.id}`) : null);
      if (existing) {
        Object.assign(existing, row);
      } else {
        base.push(row);
        index.set(key, row);
      }
    }
    return base;
  } catch (e) {
    return base;
  }
}

function buildVcard(lead) {
  const name = (lead.name || 'Vendor Lead').replace(/[;\r\n]/g, ' ');
  const category = (lead.category || '').replace(/[;\r\n]/g, ' ');
  const phones = leadPhoneList(lead);
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
  if (phones.length) {
    for (const phone of phones) {
      const digits = String(phone).replace(/\D/g, '').slice(-10);
      const formatted = digits.length === 10 ? `+91${digits}` : phone;
      lines.push(`TEL;TYPE=${isMobileNumber(phone) ? 'CELL,VOICE' : 'WORK,VOICE'}:${formatted}`);
    }
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

/**
 * Every usable number for a lead, in one deduped list. The store keeps extra
 * phones in `phones[]`; exports used to look only at `phone`, so a business
 * whose only number is a landline shipped with an empty phone column.
 */
function leadPhoneList(lead) {
  const out = [];
  const push = (value) => {
    if (value == null) return;
    let text = '';
    if (typeof value === 'string') text = value;
    else if (typeof value === 'number') text = String(value);
    else if (typeof value === 'object') text = String(value.e164 || value.number || value.raw || value.national || '');
    text = text.trim();
    if (!text || /^\[object /i.test(text)) return;
    const digits = text.replace(/\D/g, '').slice(-10);
    const key = digits.length === 10 ? digits : text.toLowerCase();
    if (out.some(entry => entry.key === key)) return;
    out.push({ key, text });
  };
  push(lead.phone);
  push(lead.primaryPhone);
  push(lead.secondaryPhone);
  for (const extra of Array.isArray(lead.phones) ? lead.phones : []) push(extra);
  return out.map(entry => entry.text);
}

function isMobileNumber(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return false;
  try {
    const parsed = normalizePhone(text, { context: 'phone mobile', trusted: true });
    return Boolean(parsed && parsed.isMobile);
  } catch (e) {
    return false;
  }
}

// ── In-Memory Metadata Header Cache (Ultra-Fast 0ms File Handling) ──────────
const sessionHeaderCache = new Map(); // filePath -> { mtimeMs, summary }

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(Number(b.lat) - Number(a.lat));
  const dLng = rad(Number(b.lng) - Number(a.lng));
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(Number(a.lat))) * Math.cos(rad(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function cleanGroupLabel(value) {
  return String(value || '')
    .replace(/\b(revenue|village|mandal|tehsil|taluk|block|district)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every lead must appear in the left folder tree, even when Google never filled
 * its `mandal` field. The district boundary stored with a master sweep carries
 * surveyed sub-district centres, so a coordinate is enough to place the row.
 */
function resolveMandalForLead(lead, boundary) {
  const explicit = cleanGroupLabel(lead.mandal);
  if (explicit) return explicit;
  const lat = Number(lead.latitude);
  const lng = Number(lead.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !boundary || !Array.isArray(boundary.centers)) {
    return '';
  }
  let best = null;
  let bestKm = Infinity;
  for (const center of boundary.centers) {
    if (!Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) continue;
    const km = haversineKm({ lat: Number(center.lat), lng: Number(center.lng) }, { lat, lng });
    if (km < bestKm) { bestKm = km; best = center; }
  }
  return best ? cleanGroupLabel(best.name) : '';
}

/**
 * District → mandal → village tree for the folder sidebar. All leads appear in
 * exactly one mandal and one village group; unmatched rows land in a visible
 * "Unassigned" node instead of silently disappearing.
 */
function buildLeadHierarchy(leads, { boundary = null, fallbackDistrict = '' } = {}) {
  const list = Array.isArray(leads) ? leads : [];
  const districtCounts = new Map();
  const mandalMap = new Map();

  for (const lead of list) {
    const district = cleanGroupLabel(lead.district) || cleanGroupLabel(fallbackDistrict) || 'Unassigned district';
    const mandal = resolveMandalForLead(lead, boundary) || 'Unassigned mandal';
    const village = cleanGroupLabel(lead.village)
      || cleanGroupLabel(lead.locality)
      || cleanGroupLabel(lead.suburb)
      || cleanGroupLabel(lead.zoneName)
      || 'All areas';

    districtCounts.set(district, (districtCounts.get(district) || 0) + 1);

    const mandalKey = mandal.toLowerCase();
    if (!mandalMap.has(mandalKey)) {
      mandalMap.set(mandalKey, { name: mandal, count: 0, villages: new Map() });
    }
    const node = mandalMap.get(mandalKey);
    node.count += 1;
    const villageKey = village.toLowerCase();
    node.villages.set(villageKey, {
      name: village,
      count: (node.villages.get(villageKey)?.count || 0) + 1
    });
  }

  const mandals = [...mandalMap.values()]
    .map(node => ({
      name: node.name,
      count: node.count,
      villages: [...node.villages.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const districts = [...districtCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    total: list.length,
    district: districts[0]?.name || cleanGroupLabel(fallbackDistrict) || '',
    districts,
    mandals
  };
}

function storeLeadRevision() {
  try {
    const rows = require('../config/dbAdapter').getVendors();
    return Array.isArray(rows) ? rows.length : 0;
  } catch (e) {
    return 0;
  }
}

function readSessionHeader(filePath, fallbackClientId) {
  try {
    const stat = fs.statSync(filePath);
    const revision = storeLeadRevision();
    const cached = sessionHeaderCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.revision === revision) {
      return cached.summary;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || !data.id) return null;

    // The folder header must count exactly what the folder viewer and the
    // exports will return: the saved rows plus this run's own late stragglers.
    const leads = withOwnSessionLeads(data.id, data.leads);

    // The file is the source of truth. `leadCount` used to be a stale header
    // field (the sidebar showed 151 while the folder held 114), so it is always
    // derived from the rows that are actually present.
    const phoneCount = leads.filter(l => isMobileNumber(l.phone)).length;
    const verifiedCount = leads.filter(l => l && (l.verified || isMobileNumber(l.phone))).length;
    const leadCount = leads.length;

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

    // Extract top neighborhood sub-folders for instant tree display in sidebar
    let subFolders = [];
    try {
      const areaCounts = {};
      for (const lead of leads) {
        const area = cleanGroupLabel(lead.village) || cleanGroupLabel(lead.locality)
          || cleanGroupLabel(lead.suburb) || cleanGroupLabel(lead.mandal) || cleanGroupLabel(lead.zoneName);
        if (area) areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
      subFolders = Object.entries(areaCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
    } catch (e) {
      subFolders = [];
    }

    const hierarchy = buildLeadHierarchy(leads, {
      boundary: data.metadata?.boundary || null,
      fallbackDistrict: cleanLoc
    });

    const summary = {
      id: data.id,
      name: customName,
      customName,
      tags,
      color,
      notes: folderNotes,
      dealValueTotal,
      isMasterSweep,
      masterScope,
      subFolders,
      hierarchy,
      mandalCount: (hierarchy?.mandals || []).length,
      villageCount: (hierarchy?.mandals || []).reduce((acc, m) => acc + (m.villages?.length || 0), 0),
      isOutOfBound: Boolean(data.isOutOfBound || data.metadata?.isOutOfBound),
      oobDistrict: data.metadata?.oobDistrict || null,
      clientId: data.userId || fallbackClientId,
      clientLabel: (data.userId || fallbackClientId) === 'master' ? '👑 Master System' : `👤 Client (${data.userId || fallbackClientId})`,
      userId: data.userId || fallbackClientId,
      category: cleanCat,
      location: cleanLoc,
      timestamp: data.timestamp || new Date().toISOString(),
      createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
      leadCount,
      phoneCount,
      verifiedCount,
      status: data.metadata?.status || 'completed',
      metadata: data.metadata || {}
    };

    sessionHeaderCache.set(filePath, { mtimeMs: stat.mtimeMs, revision, summary });
    return summary;
  } catch (e) {
    return null;
  }
}


function buildExportContent(leads, format, baseName, options = {}) {
  const cleanFormat = String(format || 'csv').toLowerCase();
  const { extractLeadArea } = require('../utils/godLevelExcelGenerator');
  const { normalizePhone } = require('../utils/phoneUtils');
  let exportLeads = Array.isArray(leads) ? [...leads] : [];

  if (options.area && options.area !== 'all') {
    exportLeads = exportLeads.filter(l => extractLeadArea(l, options.city || '') === options.area);
    baseName = `${baseName}_${String(options.area).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  if (cleanFormat === 'json') {
    return {
      contentType: 'application/json',
      filename: `${baseName}.json`,
      body: JSON.stringify(exportLeads, null, 2)
    };
  }

  if (cleanFormat === 'vcf') {
    const vcfCards = exportLeads.map(l => buildVcard(l)).filter(Boolean).join('\r\n\r\n');
    return {
      contentType: 'text/vcard; charset=utf-8',
      filename: `${baseName}.vcf`,
      body: vcfCards
    };
  }

  if (cleanFormat === 'txt') {
    const phones = exportLeads
      .flatMap(l => leadPhoneList(l))
      .map(ph => {
        const parsed = normalizePhone(ph);
        if (parsed?.isLandline) return parsed.displayPhone || ('0' + parsed.national);
        const d = String(ph).replace(/\D/g, '').slice(-10);
        return d.length === 10 ? `+91${d}` : ph;
      })
      .filter(Boolean);
    const unique = [...new Set(phones)];
    return {
      contentType: 'text/plain; charset=utf-8',
      filename: `${baseName}_phones.txt`,
      body: unique.join('\r\n')
    };
  }

  const escapeCsv = val => `"${String(val == null ? '' : val).replace(/"/g, '""')}"`;
  const headers = [
    'Business Name', 'Category', 'Area / Locality', 'Primary Phone', 'Phone Type',
    'Secondary Phone', 'Total Lines',
    'WhatsApp Direct URL', 'Direct Call Link', 'Email Address', 'Website',
    'Complete Address', 'City', 'District', 'State', 'Pincode', 'Rating', 'Reviews Count',
    'Profile Quality (%)', 'Quality Tier',
    'Google Maps URL', 'CRM Stage', 'CRM Notes'
  ];

  /**
   * Export rule: Primary Phone is a parser-validated mobile and nothing else.
   * Extra mobiles and every landline go to Secondary Phone, so the dialer
   * column never mixes in a number that cannot receive WhatsApp. A lead whose
   * only number is a landline exports with an empty Primary Phone on purpose.
   */
  const buildCsvRow = (lead) => {
    const numbers = [];
    const seenDigits = new Set();
    for (const value of leadPhoneList(lead)) {
      const parsed = normalizePhone(value, { context: 'phone mobile', trusted: true });
      if (parsed) {
        if (seenDigits.has(parsed.national)) continue;
        seenDigits.add(parsed.national);
        numbers.push({
          display: parsed.isMobile
            ? (parsed.displayPhone || `+91 ${parsed.national.slice(0, 5)} ${parsed.national.slice(5)}`)
            : (parsed.displayPhone || ('0' + parsed.national)),
          national: parsed.national,
          isMobile: Boolean(parsed.isMobile),
          isLandline: Boolean(parsed.isLandline),
          callUrl: parsed.callUrl || ''
        });
        continue;
      }
      // Keep a number the parser could not classify instead of dropping it.
      const text = String(value).trim();
      if (!text) continue;
      const digits = text.replace(/\D/g, '').slice(-10);
      const key = digits.length === 10 ? digits : text.toLowerCase();
      if (seenDigits.has(key)) continue;
      seenDigits.add(key);
      numbers.push({ display: text, national: '', isMobile: false, isLandline: false, callUrl: '' });
    }

    const primary = numbers.find(n => n.isMobile) || null;
    const secondary = numbers.filter(n => n !== primary);
    const displayPhone = primary ? primary.display : '';
    const phoneType = primary
      ? 'Mobile'
      : (secondary.some(n => n.isLandline) ? 'STD Landline' : (secondary.length ? 'Contact' : 'Unlisted'));
    const leadCountry = String(lead.country || 'IN').toUpperCase();
    const whatsappUrl = lead.whatsappLink || (primary ? (leadCountry === 'IN' ? `https://wa.me/91${primary.national}` : `https://wa.me/${primary.digits || primary.national}`) : '');
    const callUrl = (primary && primary.callUrl) || (secondary[0] && secondary[0].callUrl) || '';
    const alternateStr = secondary.map(n => n.display).join(', ');
    const totalLinesCount = numbers.length;

    const area = extractLeadArea(lead, options.city || lead.city);
    const notesStr = Array.isArray(lead.crmNotes)
      ? lead.crmNotes.map(n => typeof n === 'string' ? n : n.text).filter(Boolean).join(' | ')
      : (lead.crmNotes || lead.notes || '');

    const mapsLink = lead.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((lead.name || '') + ' ' + (lead.address || ''))}`;

    const qualityObj = lead.profileQuality?.score != null
      ? { score: Number(lead.profileQuality.score), tier: lead.tier || 'Gold' }
      : calculateLeadQuality(lead);

    return [
      escapeCsv(lead.name),
      escapeCsv(lead.category),
      escapeCsv(area),
      escapeCsv(displayPhone),
      escapeCsv(phoneType),
      // Leading tab keeps a landline's leading 0 alive in Excel.
      escapeCsv(alternateStr ? `\t${alternateStr}` : ''),
      escapeCsv(totalLinesCount),
      escapeCsv(whatsappUrl),
      escapeCsv(callUrl),
      escapeCsv(lead.email || (Array.isArray(lead.emails) ? lead.emails[0] : '') || ''),
      escapeCsv(lead.website || ''),
      escapeCsv(lead.address || ''),
      escapeCsv(lead.city || lead.village || lead.mandal || ''),
      escapeCsv(lead.district || ''),
      escapeCsv(lead.state || 'India'),
      escapeCsv(lead.pincode || ''),
      escapeCsv(lead.rating || ''),
      escapeCsv(lead.reviewsCount || lead.reviewCount || ''),
      escapeCsv(`${qualityObj.score}%`),
      escapeCsv(qualityObj.tier),
      escapeCsv(mapsLink),
      escapeCsv(lead.crmStage || lead.crmStatus || 'new'),
      escapeCsv(notesStr)
    ].join(',');
  };

  // If Area-Divided CSV is requested
  if (options.divided) {
    const areaMap = new Map();
    exportLeads.forEach(lead => {
      const area = extractLeadArea(lead, options.city || lead.city);
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area).push(lead);
    });

    const csvSections = [];
    csvSections.push(`# Scraper.co.in Area-Divided Export · Total Leads: ${exportLeads.length}\n`);

    for (const [areaName, areaLeads] of areaMap.entries()) {
      csvSections.push(`\n=== AREA: ${areaName.toUpperCase()} (${areaLeads.length} LEADS) ===`);
      csvSections.push(headers.join(','));
      areaLeads.forEach(lead => {
        csvSections.push(buildCsvRow(lead));
      });
    }

    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseName}_area_divided.csv`,
      body: csvSections.join('\n').trim()
    };
  }

  // Standard Flat CSV
  const rows = exportLeads.map(lead => buildCsvRow(lead));
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
              contactPerson: vendor.contactPerson || content.leads[leadIndex].contactPerson,
              gstin: vendor.gstin || content.leads[leadIndex].gstin,
              pincode: vendor.pincode || content.leads[leadIndex].pincode,
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

module.exports = {
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
};
