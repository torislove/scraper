const fs = require('fs');
const path = require('path');
const { normalizePhone } = require('../utils/phoneUtils');
const { SESSIONS_DIR } = require('../config/paths');

const TERMINAL_STATUSES = new Set(['completed', 'aborted', 'failed', 'interrupted']);

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(String(status || '').toLowerCase());
}

/**
 * Merge folder metadata without ever downgrading a finished run back to
 * "running". A live snapshot can arrive after the terminal write (deep
 * enrichment, a late flush), and that must not make a completed folder look
 * paused again.
 */
function mergeTerminalMetadata(previousMeta, incomingMeta) {
  const prev = previousMeta || {};
  const next = incomingMeta || {};
  const merged = { ...prev, ...next };
  if (isTerminalStatus(next.status)) {
    merged.status = String(next.status).toLowerCase();
  } else if (isTerminalStatus(prev.status)) {
    merged.status = prev.status;
    merged.completedAt = prev.completedAt;
    merged.abortedAt = prev.abortedAt;
    merged.error = prev.error;
  }
  return merged;
}

/**
 * Write a search folder. Every run owns one JSON file under
 * db/user_sessions/<user>/<sessionId>.json. The live vendor store is purged
 * between runs, but these folders are the durable history the user can reopen.
 */
function buildSubFolders(leads, location) {
  let subFolders = [];
  try {
    const { extractLeadArea } = require('../utils/godLevelExcelGenerator');
    const areaCounts = {};
    (Array.isArray(leads) ? leads : []).forEach(l => {
      const a = extractLeadArea(l, location);
      if (a && a !== 'General') areaCounts[a] = (areaCounts[a] || 0) + 1;
    });
    subFolders = Object.entries(areaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    subFolders = [];
  }
  return subFolders;
}

/**
 * Union two lead lists without losing a row. Fresh rows win on shared ids so
 * their normalised phone, CRM snapshot and carry-forward provenance survive,
 * while rows that only exist in the previous snapshot are kept.
 */
function mergeLeadLists(previousLeads, freshLeads) {
  const byKey = new Map();
  const order = [];
  const push = (lead) => {
    if (!lead) return;
    const key = lead.id
      ? `id:${lead.id}`
      : `row:${String(lead.name || '')}|${String(lead.phone || '')}|${String(lead.address || '')}`;
    if (byKey.has(key)) {
      byKey.set(key, { ...byKey.get(key), ...lead });
      return;
    }
    byKey.set(key, lead);
    order.push(key);
  };
  for (const lead of Array.isArray(previousLeads) ? previousLeads : []) push(lead);
  for (const lead of Array.isArray(freshLeads) ? freshLeads : []) push(lead);
  return order.map(key => byKey.get(key));
}

function persistSessionVault({ sessionId, userId, category, location, leads, metadata, final = false }) {
  const safeSessionId = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDirs = [path.join(SESSIONS_DIR, 'anonymous')];
  if (userId && userId !== 'anonymous') {
    targetDirs.push(path.join(SESSIONS_DIR, String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')));
  }

  const rawLeads = Array.isArray(leads) ? leads : [];
  // Retain ALL leads (mobiles, landlines, and general listings)
  // STD Landlines starting with 0: strictly preserve leading 0, never add +91, whatsapp=false, callUrl set
  // Normal Mobiles (6-9): formatted as +91, whatsapp=true
  const safeLeads = rawLeads.map(lead => {
    if (!lead) return null;
    const l = { ...lead };
    for (const raw of [l.phone, l.primaryPhone, ...(Array.isArray(l.phones) ? l.phones : [])]) {
      const val = typeof raw === 'object' && raw ? (raw.displayPhone || raw.e164 || raw.national || raw.number || '') : (raw || '');
      if (!val) continue;
      const parsed = normalizePhone(val);
      if (parsed && (parsed.isMobile || parsed.isLandline)) {
        if (parsed.isMobile) {
          l.phone = parsed.displayPhone;
          l.phoneType = 'mobile';
          l.whatsappAvailable = true;
          l.whatsappLink = `https://wa.me/91${parsed.national}`;
          l.callUrl = parsed.callUrl;
        } else {
          // STD Landline starting with 0: strictly NO +91
          l.phone = parsed.displayPhone;
          l.phoneType = 'landline';
          l.whatsappAvailable = false;
          l.whatsappLink = '';
          l.callUrl = parsed.callUrl;
        }
        break;
      }
    }
    return l;
  }).filter(Boolean);

  // ALL LEADS PRESERVED: Priority sorting — Mobiles first (3), Landlines second (2), other/no-phone third (1/0)
  safeLeads.sort((a, b) => {
    const scoreA = a.phoneType === 'mobile' ? 3 : (a.phoneType === 'landline' ? 2 : (a.phone ? 1 : 0));
    const scoreB = b.phoneType === 'mobile' ? 3 : (b.phoneType === 'landline' ? 2 : (b.phone ? 1 : 0));
    return scoreB - scoreA;
  });

  const phoneCount = safeLeads.filter(lead => lead && lead.phone && !String(lead.phone).includes('Requires')).length;
  const verifiedCount = safeLeads.filter(lead => lead && (lead.verified || lead.phone)).length;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const cleanCat = String(category || 'Business').replace(/[^\w\s&,-]/g, '').trim();
  const cleanLoc = String(location || 'India').replace(/[^\w\s&,-]/g, '').trim();
  const friendlyName = `${cleanCat} in ${cleanLoc} • ${dateStr}, ${timeStr}`;

  // Area-wise sub-folder breakdown for instant tree navigation
  const subFolders = buildSubFolders(safeLeads, cleanLoc);

  const sessionVaultData = {
    id: safeSessionId,
    name: friendlyName,
    userId: userId || 'anonymous',
    category: cleanCat,
    location: cleanLoc,
    timestamp: now.toISOString(),
    createdAt: metadata?.startedAt || now.toISOString(),
    leadCount: safeLeads.length,
    phoneCount,
    verifiedCount,
    subFolders,
    metadata: {
      ...(metadata || {}),
      phoneCount,
      verifiedCount,
      totalZones: metadata?.totalZones || (metadata?.zones ? metadata.zones.length : 0),
      completedZones: metadata?.completedZones || (metadata?.completedZoneIndices ? metadata.completedZoneIndices.length : 0),
      completedZoneIndices: metadata?.completedZoneIndices || [],
      completedZoneNames: metadata?.completedZoneNames || [],
      zones: metadata?.zones || [],
      status: metadata?.status || 'completed'
    },
    leads: safeLeads
  };

  const written = [];
  let lastLeadCount = safeLeads.length;
  let lastPhoneCount = phoneCount;
  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const vaultPath = path.join(dir, `${safeSessionId}.json`);

      let previous = null;
      try {
        if (fs.existsSync(vaultPath)) {
          previous = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
        }
      } catch (guardError) {
        // A corrupt folder is replaced by the current snapshot.
      }

      // Never shrink a folder. A stop, a fresh run or a deep-profile pass can
      // hand us a partial list for a session that already has a full snapshot;
      // overwriting it would silently delete leads the user can still see.
      const previousCount = Number(previous?.leadCount)
        || (Array.isArray(previous?.leads) ? previous.leads.length : 0);
      const guardTrips = previous && previousCount > safeLeads.length && previousCount > 0;

      if (guardTrips && !final) {
        written.push(vaultPath);
        continue;
      }

      // A final write must still land even when dedupe removed a lead. Union
      // the previous snapshot with the final list instead of keeping only the
      // larger one: that preserves the guard (no row is ever lost) while still
      // admitting carry-forward rows that were not in the live snapshot.
      if (guardTrips && final) {
        const mergedLeads = mergeLeadLists(previous?.leads, safeLeads);
        const mergedPhoneCount = mergedLeads.filter(l => l && l.phone && !String(l.phone).includes('Requires')).length;
        const mergedVerifiedCount = mergedLeads.filter(l => l && (l.verified || l.phone)).length;
        const upgraded = {
          ...previous,
          ...sessionVaultData,
          leadCount: mergedLeads.length,
          phoneCount: mergedPhoneCount,
          verifiedCount: mergedVerifiedCount,
          subFolders: buildSubFolders(mergedLeads, cleanLoc),
          leads: mergedLeads,
          metadata: mergeTerminalMetadata(previous?.metadata, {
            ...(metadata || {}),
            phoneCount: mergedPhoneCount,
            verifiedCount: mergedVerifiedCount
          })
        };
        fs.writeFileSync(vaultPath, JSON.stringify(upgraded, null, 2), 'utf-8');
        written.push(vaultPath);
        lastLeadCount = mergedLeads.length;
        lastPhoneCount = mergedPhoneCount;
        continue;
      }

      const nextData = {
        ...sessionVaultData,
        metadata: mergeTerminalMetadata(previous?.metadata, sessionVaultData.metadata)
      };
      fs.writeFileSync(vaultPath, JSON.stringify(nextData, null, 2), 'utf-8');
      written.push(vaultPath);
      lastLeadCount = safeLeads.length;
      lastPhoneCount = phoneCount;
    } catch (error) {
      // A folder write must never break a live scrape.
    }
  }
  return { file: written[0] || '', phoneCount: lastPhoneCount, leadCount: lastLeadCount };
}

function matchesMasterFilters(lead, filters = {}) {
  if (!lead) return false;
  if (Number(filters.minRating) > 0 && Number(lead.rating) < Number(filters.minRating)) return false;
  if (filters.hasWebsite && !lead.website) return false;
  if (filters.verifiedOnly && !(lead.verified || Number(lead.profileQuality?.score) >= 70)) return false;
  if (filters.mobileOnly) {
    try {
      if (!normalizePhone(lead.phone || lead.whatsapp || '', { context: 'phone mobile', trusted: true })?.isMobile) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

module.exports = {
  persistSessionVault,
  matchesMasterFilters
};
