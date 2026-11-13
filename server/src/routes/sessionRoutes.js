const express = require('express');
const router = express.Router();
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
function listSessionDirs({ isMaster = false } = {}) {
  const dirs = [];
  if (!fs.existsSync(SESSIONS_DIR)) return dirs;
  for (const entry of fs.readdirSync(SESSIONS_DIR)) {
    // Internal folders (recovery bins, guard backups, migration output) are not
    // user vaults. Listing them made the sidebar show a backup's 151 rows while
    // the real folder held 114, and could shadow the real folder entirely.
    if (!entry || entry.startsWith('_') || entry.startsWith('.')) continue;
    try {
      if (!fs.statSync(path.join(SESSIONS_DIR, entry)).isDirectory()) continue;
    } catch (e) {
      continue;
    }
    if (!isMaster && entry === 'master') continue;
    dirs.push(path.join(SESSIONS_DIR, entry));
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
function resolveSessionFiles(sessionId, { isMaster = false } = {}) {
  const safeId = safeSessionKey(sessionId);
  const files = [];
  for (const dir of listSessionDirs({ isMaster })) {
    const filePath = path.join(dir, `${safeId}.json`);
    if (fs.existsSync(filePath)) files.push(filePath);
  }
  return files;
}

function isSessionRunning(sessionId) {
  try {
    const { isSessionActive } = require('./scrape');
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
 * Folders are snapshots. Deep enrichment and late stragglers keep improving the
 * live store after a run finishes, so an export must read the freshest version
 * of every lead or the customer silently loses a phone number they paid for.
 *
 * With master filters in play we only refresh rows the folder already contains;
 * we never re-introduce a lead that was filtered out on purpose.
 */
function freshenLeadsFromStore(sessionId, folderLeads, metadata) {
  const base = Array.isArray(folderLeads) ? folderLeads : [];
  if (!sessionId) return base;
  try {
    const dbAdapter = require('../config/dbAdapter');
    const live = dbAdapter.getVendorsBySession(sessionId);
    if (!Array.isArray(live) || !live.length) return base;

    const filters = metadata && metadata.filters;
    const allowAdd = !(filters && Object.keys(filters).length);
    const byId = new Map(base.filter(Boolean).map(lead => [lead.id, lead]));

    for (const row of live) {
      if (!row || !row.id) continue;
      if (byId.has(row.id)) byId.set(row.id, row);
      else if (allowAdd) byId.set(row.id, row);
    }
    return Array.from(byId.values());
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

function formatExcelPhone(ph) {
  if (!ph) return '';
  const { normalizePhone } = require('../utils/phoneUtils');
  const parsed = normalizePhone(ph);
  if (parsed) {
    if (parsed.isLandline) {
      // STD Landline starting with 0: strictly NO +91
      return parsed.displayPhone || ('0' + parsed.national);
    }
    if (parsed.isMobile) {
      return `+91 ${parsed.national.slice(0, 5)} ${parsed.national.slice(5)}`;
    }
  }
  if (String(ph).trim().startsWith('0')) {
    return String(ph).trim();
  }
  return String(ph);
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

function readSessionHeader(filePath, fallbackClientId) {
  try {
    const stat = fs.statSync(filePath);
    const cached = sessionHeaderCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.summary;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!data || !data.id) return null;

    let leads = Array.isArray(data.leads) ? data.leads : [];
    // Instant Database Auto-Backfill: If vault file has 0 leads but DB has harvested leads, recover immediately!
    if (leads.length === 0) {
      try {
        const dbAdapter = require('../config/dbAdapter');
        const dbLeads = (dbAdapter.getVendors() || []).filter(v =>
          v.sessionId === data.id ||
          v.lastSessionId === data.id ||
          (Array.isArray(v.sessionIds) && v.sessionIds.includes(data.id))
        );
        if (dbLeads.length > 0) {
          leads = dbLeads;
          data.leads = dbLeads;
          // Read paths never write. The old code persisted this backfill here,
          // which mutated a folder merely because the sidebar listed it.
          data.leadCount = dbLeads.length;
          data.phoneCount = dbLeads.filter(l => isMobileNumber(l.phone)).length;
          data.verifiedCount = dbLeads.filter(l => l.verified || l.phone).length;
        }
      } catch (e) {}
    }

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

    sessionHeaderCache.set(filePath, { mtimeMs: stat.mtimeMs, summary });
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
    'Alternate Numbers', 'Total Lines',
    'WhatsApp Direct URL', 'Direct Call Link', 'Email Address', 'Website',
    'Complete Address', 'City', 'District', 'State', 'Pincode', 'Rating', 'Reviews Count',
    'Profile Quality (%)', 'Quality Tier',
    'Google Maps URL', 'CRM Stage', 'CRM Notes'
  ];

  const buildCsvRow = (lead) => {
    const rawPhone = lead.phone || lead.primaryPhone || '';
    const parsed = rawPhone ? normalizePhone(rawPhone) : null;
    let displayPhone = '';
    let phoneType = 'Unlisted';
    let whatsappUrl = '';
    let callUrl = '';

    if (parsed) {
      if (parsed.isMobile) {
        displayPhone = parsed.displayPhone || `+91 ${parsed.national.slice(0, 5)} ${parsed.national.slice(5)}`;
        phoneType = 'Mobile';
        whatsappUrl = `https://wa.me/91${parsed.national}`;
        callUrl = parsed.callUrl || `tel:+91${parsed.national}`;
      } else if (parsed.isLandline) {
        // Strictly preserve leading 0, no +91! Prepend tab so Excel keeps 0
        displayPhone = parsed.displayPhone || ('0' + parsed.national);
        phoneType = 'STD Landline';
        whatsappUrl = '';
        callUrl = parsed.callUrl || `tel:0${parsed.national}`;
      } else {
        displayPhone = rawPhone;
        phoneType = 'Other';
        callUrl = `tel:${rawPhone.replace(/\D/g, '')}`;
      }
    } else if (rawPhone) {
      displayPhone = rawPhone;
      phoneType = rawPhone.trim().startsWith('0') ? 'STD Landline' : 'Contact';
      callUrl = `tel:${rawPhone.replace(/\D/g, '')}`;
    }

    const allPhones = Array.isArray(lead.phones) ? lead.phones : [];
    const primaryDigits = parsed ? parsed.national : String(rawPhone).replace(/\D/g, '').slice(-10);
    const seenAltDigits = new Set([primaryDigits]);
    const alternatePhones = [];
    for (const p of allPhones) {
      const parsedAlt = normalizePhone(p);
      const altDigits = parsedAlt ? parsedAlt.national : String(p).replace(/\D/g, '').slice(-10);
      if (altDigits && altDigits.length >= 7 && !seenAltDigits.has(altDigits)) {
        seenAltDigits.add(altDigits);
        alternatePhones.push(parsedAlt ? parsedAlt.displayPhone : p);
      }
    }
    const alternateStr = alternatePhones.join(', ');
    const totalLinesCount = Math.max(1, (displayPhone ? 1 : 0) + alternatePhones.length);

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
      escapeCsv(displayPhone ? `\t${displayPhone}` : ''), // Leading tab preserves 0 in Excel
      escapeCsv(phoneType),
      escapeCsv(alternateStr ? `\t${alternateStr}` : '—'),
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

// 2. List all saved sessions (Scoped: Client sees ONLY client data; Master sees ALL)
router.get(['/list', '/list/:userId'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
    const sessionMap = new Map();

    if (isMaster) {
      // Master view: Aggregates across ALL clients and master sweeps
      const dirsToScan = listSessionDirs({ isMaster: true })
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
    } else {
      // Client view: Access client session folders (own user ID, anonymous, and guest/client runs).
      // STRICT RULE: Master territorial sweeps are filtered out and inaccessible.
      const userId = req.headers['x-user-id'] || req.params.userId || 'anonymous';
      const userDirs = listSessionDirs({ isMaster: false });

      for (const userDir of userDirs) {
        if (!fs.existsSync(userDir)) continue;
        const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(userDir, file);
          const summary = readSessionHeader(filePath, userId);
          if (!summary || !summary.id) continue;

          // Never leak Master Sweeps to standard client!
          if (summary.isMasterSweep) continue;

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

    let leads = freshenLeadsFromStore(sessionId, data.leads, data.metadata);
    // Instant DB auto-backfill if vault file was empty
    if (!Array.isArray(leads) || leads.length === 0) {
      try {
        const dbAdapter = require('../config/dbAdapter');
        leads = (dbAdapter.getVendors() || []).filter(v =>
          v.sessionId === sessionId ||
          v.lastSessionId === sessionId ||
          (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionId))
        );
      } catch (e) {}
    }

    try {
      const { isVendorRelevant } = require('../services/categoryFidelity');
      if (data.category && Array.isArray(leads)) {
        leads = leads.filter(l => isVendorRelevant(l, data.category));
      }
    } catch (e) {}
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

// 6. Batch Delete Sessions
router.post('/batch-delete', (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
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

        // A folder is returned exactly as it was saved. Category fidelity and
        // dedupe already ran before the save; repeating them here silently
        // removed rows (114 → 104) and made two views of the same folder
        // disagree. Any clean-up must be an explicit, archived audit instead.

        // Merge with current live dbAdapter vendors for freshest CRM stages, notes, and contacts!
        try {
          const dbAdapter = require('../config/dbAdapter');
          const liveVendors = dbAdapter.getVendors() || [];
          const liveMap = new Map(liveVendors.map(v => [v.id, v]));

          const dbSessionLeads = liveVendors.filter(v =>
            v.sessionId === safeSessionId ||
            v.lastSessionId === safeSessionId ||
            (Array.isArray(v.sessionIds) && v.sessionIds.includes(safeSessionId))
          );

          if ((!Array.isArray(data.leads) || data.leads.length === 0) && dbSessionLeads.length > 0) {
            data.leads = dbSessionLeads;
            data.leadCount = dbSessionLeads.length;
            data.phoneCount = dbSessionLeads.filter(l => isMobileNumber(l.phone)).length;
            data.verifiedCount = dbSessionLeads.filter(l => l.verified || l.phone).length;
            // In-memory recovery only; the folder file is never rewritten here.
          } else if (Array.isArray(data.leads)) {
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

        // Always derive the counts and the district → mandal → village tree from
        // the rows actually returned, so the folder header and the sidebar agree.
        data.leadCount = Array.isArray(data.leads) ? data.leads.length : 0;
        data.phoneCount = (data.leads || []).filter(l => isMobileNumber(l.phone)).length;
        data.verifiedCount = (data.leads || []).filter(l => l && (l.verified || isMobileNumber(l.phone))).length;
        data.hierarchy = buildLeadHierarchy(data.leads || [], {
          boundary: data.metadata?.boundary || null,
          fallbackDistrict: data.location || ''
        });

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

// 4. Delete session
router.delete(['/:sessionId', '/:userId/:sessionId'], (req, res) => {
  try {
    const isMaster = req.headers['x-workspace-scope'] === 'master' || req.query.scope === 'master';
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
    let leads = freshenLeadsFromStore(safeSessionId, data.leads, data.metadata);
    try {
      const { isVendorRelevant } = require('../services/categoryFidelity');
      if (data.category && Array.isArray(leads)) {
        leads = leads.filter(l => isVendorRelevant(l, data.category));
      }
    } catch (e) {}
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
