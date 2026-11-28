/**
 * Lead source helpers — one place that answers "which scrape produced this
 * lead?" and exports the visible rows as a CSV spreadsheet.
 *
 * The engine stamps every row with `source` (human label) and `sourceEngine`
 * (stable key). Older rows may only carry one of them, so both are normalised
 * to the same key before anything is displayed or filtered.
 */

import { getAllDisplayPhones, resolveLeadCountry } from '../../utils/phoneClassify.js';

const SOURCE_MAP = {
  'google-places': { key: 'google', label: 'Google Maps', short: 'Google Maps', tone: 'google' },
  'google maps': { key: 'google', label: 'Google Maps', short: 'Google Maps', tone: 'google' },
  'gosom google maps fast': { key: 'google', label: 'Google Maps', short: 'Google Maps', tone: 'google' },
  'gmap direct rpc': { key: 'gmap-direct', label: 'Direct Maps RPC', short: 'Direct Maps', tone: 'google' },
  google: { key: 'google', label: 'Google Maps', short: 'Google Maps', tone: 'google' },
  'google-local-finder': { key: 'google-local-finder', label: 'Google More Places', short: 'More Places', tone: 'google' },
  'google search local finder': { key: 'google-local-finder', label: 'Google More Places', short: 'More Places', tone: 'google' },
  'google local finder': { key: 'google-local-finder', label: 'Google More Places', short: 'More Places', tone: 'google' },
  'overture-maps': { key: 'overture-maps', label: 'Overture 55M', short: 'Overture 55M', tone: 'cyan' },
  'overture maps': { key: 'overture-maps', label: 'Overture 55M', short: 'Overture 55M', tone: 'cyan' },
  overture: { key: 'overture-maps', label: 'Overture 55M', short: 'Overture 55M', tone: 'cyan' },
  'google-serp': { key: 'google-serp', label: 'Google Search', short: 'Google Web', tone: 'google' },
  'deep web serp': { key: 'web-discovery', label: 'Web Discovery', short: 'Web', tone: 'osm' },
  justdial: { key: 'justdial', label: 'JustDial', short: 'JustDial', tone: 'justdial' },
  'justdial turbo': { key: 'justdial', label: 'JustDial', short: 'JustDial', tone: 'justdial' },
  'justdial tls': { key: 'justdial', label: 'JustDial', short: 'JustDial', tone: 'justdial' },
  openstreetmap: { key: 'osm', label: 'OpenStreetMap', short: 'OSM', tone: 'osm' },
  'openstreetmap poi': { key: 'osm', label: 'OpenStreetMap', short: 'OSM', tone: 'osm' },
  osm: { key: 'osm', label: 'OpenStreetMap', short: 'OSM', tone: 'osm' },
  'web discovery': { key: 'web-discovery', label: 'Web Discovery', short: 'Web', tone: 'osm' },
  'web-discovery': { key: 'web-discovery', label: 'Web Discovery', short: 'Web', tone: 'osm' },
  'web contact': { key: 'web-contact', label: 'Official Website', short: 'Site', tone: 'osm' },
  indiamart: { key: 'indiamart', label: 'IndiaMART', short: 'IndiaMART', tone: 'indiamart' },
  sulekha: { key: 'sulekha', label: 'Sulekha', short: 'Sulekha', tone: 'sulekha' },
  practo: { key: 'practo', label: 'Practo', short: 'Practo', tone: 'practo' },
  bing: { key: 'bing', label: 'Bing', short: 'Bing', tone: 'bing' },
  brave: { key: 'brave', label: 'Brave Search', short: 'Brave', tone: 'bing' },
  instagram: { key: 'social', label: 'Social (Instagram)', short: 'Social', tone: 'social' },
  facebook: { key: 'social', label: 'Social (Facebook)', short: 'Social', tone: 'social' },
  'social dork (instagram)': { key: 'social', label: 'Social (Instagram)', short: 'Social', tone: 'social' },
  'social dork': { key: 'social', label: 'Social Search', short: 'Social', tone: 'social' },
  yelp: { key: 'yelp', label: 'Yelp', short: 'Yelp', tone: 'red' },
  'bing-places': { key: 'bing-places', label: 'Bing Places', short: 'Bing Places', tone: 'cyan' },
  'bing places': { key: 'bing-places', label: 'Bing Places', short: 'Bing Places', tone: 'cyan' },
  tripadvisor: { key: 'tripadvisor', label: 'TripAdvisor', short: 'TripAdvisor', tone: 'lime' },
  'trip advisor': { key: 'tripadvisor', label: 'TripAdvisor', short: 'TripAdvisor', tone: 'lime' },
  wikidata: { key: 'wikidata', label: 'Wikidata', short: 'Wikidata', tone: 'blue' },
  'wikidata-businesses': { key: 'wikidata', label: 'Wikidata', short: 'Wikidata', tone: 'blue' },
  yellowpages: { key: 'yellowpages', label: 'YellowPages', short: 'YellowPages', tone: 'amber' },
  'yellow pages': { key: 'yellowpages', label: 'YellowPages', short: 'YellowPages', tone: 'amber' },
  yell: { key: 'yellowpages', label: 'Yell (UK)', short: 'Yell', tone: 'amber' },
  'freeindex-uk': { key: 'freeindex', label: 'FreeIndex (UK)', short: 'FreeIndex', tone: 'blue' },
  freeindex: { key: 'freeindex', label: 'FreeIndex (UK)', short: 'FreeIndex', tone: 'blue' },
  'goldenpages-ie': { key: 'goldenpages', label: 'GoldenPages (IE)', short: 'GoldenPages', tone: 'amber' },
  goldenpages: { key: 'goldenpages', label: 'GoldenPages (IE)', short: 'GoldenPages', tone: 'amber' },
  cylex: { key: 'cylex', label: 'Cylex', short: 'Cylex', tone: 'cyan' },
  trustpilot: { key: 'trustpilot', label: 'Trustpilot', short: 'Trustpilot', tone: 'lime' },
  'social-dork-intl': { key: 'social-dork-intl', label: 'Social Dork', short: 'Social Dork', tone: 'social' },
  'social dork intl': { key: 'social-dork-intl', label: 'Social Dork', short: 'Social Dork', tone: 'social' }
};

const UNKNOWN = { key: 'unknown', label: 'Unknown source', short: 'Unknown', tone: 'other' };

function normalise(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s*\((.*?)\)\s*/g, ' $1 ')
    .trim();
}

export function leadSourceKey(lead) {
  if (!lead) return UNKNOWN.key;
  const candidates = [
    lead.sourceEngine,
    lead.engine,
    lead.provider,
    lead.source,
    Array.isArray(lead.sources) ? lead.sources[0] : '',
    Array.isArray(lead.sourceProvenance) ? lead.sourceProvenance[0]?.engine : ''
  ];
  for (const raw of candidates) {
    const key = normalise(raw);
    if (!key) continue;
    if (SOURCE_MAP[key]) return SOURCE_MAP[key].key;
    // Tolerate "social dork (instagram)" & other variants.
    for (const [needle, meta] of Object.entries(SOURCE_MAP)) {
      if (key.includes(needle)) return meta.key;
    }
  }
  return UNKNOWN.key;
}

export function leadSourceMeta(leadOrKey) {
  const key = typeof leadOrKey === 'string' && leadOrKey
    ? leadOrKey
    : leadSourceKey(leadOrKey);
  if (SOURCE_MAP[key]) return SOURCE_MAP[key];
  for (const meta of Object.values(SOURCE_MAP)) {
    if (meta.key === key) return meta;
  }
  return UNKNOWN;
}

/** Every distinct scrape source present in a list, with live counts. */
export function listLeadSources(leads) {
  const counts = new Map();
  for (const lead of Array.isArray(leads) ? leads : []) {
    const meta = leadSourceMeta(lead);
    const entry = counts.get(meta.key) || { ...meta, count: 0 };
    entry.count += 1;
    counts.set(meta.key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Split a lead's numbers into the export rule:
 *   Primary Phone   = the first parser-validated mobile (never a landline)
 *   Secondary Phone = every other number (extra mobiles + landlines)
 *
 * A lead whose only number is a landline therefore exports with an empty
 * Primary Phone and the landline in Secondary Phone — the dialer column never
 * silently mixes in a number that cannot receive WhatsApp.
 */
export function exportPhones(lead) {
  const ccHint = resolveLeadCountry(lead, 'IN');
  const dual = getAllDisplayPhones(lead, ccHint);
  if (dual.primary || dual.all.length > 0) {
    const mobile = dual.mobile;
    const rest = dual.all.filter(n => n !== mobile);
    const waUrl = mobile
      ? (mobile.whatsappUrl || `https://wa.me/${(mobile.e164 || mobile.digits || '').replace(/\D/g, '')}`)
      : '';
    return {
      primary: mobile ? mobile.display || mobile.raw : '',
      secondary: rest.map(n => n.display || n.raw).filter(Boolean).join(', '),
      whatsapp: waUrl,
      isMobile: Boolean(mobile)
    };
  }
  return { primary: '', secondary: '', whatsapp: '', isMobile: false };
}

/**
 * Build a spreadsheet-ready CSV containing every extracted contact, social,
 * geo, and provenance column for Excel/Sheets/CRM import.
 */
const IGNORE_FB_SEG = new Set(['2008', 'profile.php', 'people', 'p', 'sharer.php', 'sharer', 'share.php', 'share', 'wordpresscom', 'tr', 'plugins', 'dialog', 'groups', 'events', 'help', 'pages', 'login', 'recover', 'watch', 'pg']);
const IGNORE_IG_SEG = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'about', 'legal', 'o1']);

function cleanSocialCell(val, kind = '') {
  const s = String(val || '').trim();
  if (!s || /bing\.com\/ck\/a|xnxx|xvideos|xhamster|pornhub|eporner|rat\.xxx/i.test(s)) return '';
  if (kind === 'fb') {
    const m = s.match(/facebook\.com\/([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3 || IGNORE_FB_SEG.has(h.toLowerCase())) return '';
  } else if (kind === 'ig') {
    const m = s.match(/instagram\.com\/([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3 || IGNORE_IG_SEG.has(h.toLowerCase())) return '';
  } else if (kind === 'yt') {
    const m = s.match(/youtube\.com\/(?:@|channel\/|c\/)?([^/?#]+)/i);
    const h = m ? m[1] : '';
    if (!h || h.length < 3) return '';
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(h)) return `https://youtube.com/channel/${h}`;
  }
  return s;
}

export function buildLeadCsv(leads, { city = '' } = {}) {
  const headers = [
    'Business Name', 'Business Intent', 'Subcategory', 'Category', 'Primary Mobile', 'Mobile Verified',
    'WhatsApp Link', 'Secondary / STD Phone', 'Email', 'All Emails', 'Website',
    'Instagram', 'Facebook', 'LinkedIn', 'YouTube',
    'Zone / Ward', 'Area', 'Address', 'City', 'State', 'Pincode', 'Country',
    'Rating', 'Reviews', 'Google Maps Link', 'Scrape Source', 'Search Folder', 'CRM Stage'
  ];
  const seenExport = new Set();
  const deduped = [];
  for (const lead of (Array.isArray(leads) ? leads : [])) {
    if (!lead) continue;
    const phones = exportPhones(lead);
    const mob10 = (phones.primary || '').replace(/\D/g, '').slice(-10);
    const sec8 = (phones.secondary || '').split(',')[0].replace(/\D/g, '').slice(-8);
    const pid = String(lead.placeId || lead.place_id || '').trim();
    if ((pid && seenExport.has(`p:${pid}`)) || (mob10.length === 10 && seenExport.has(`m:${mob10}`)) || (sec8.length >= 8 && seenExport.has(`s:${sec8}`))) continue;
    if (pid) seenExport.add(`p:${pid}`);
    if (mob10.length === 10) seenExport.add(`m:${mob10}`);
    if (sec8.length >= 8) seenExport.add(`s:${sec8}`);
    deduped.push({ lead, phones });
  }
  const rows = deduped.map(({ lead, phones }) => {
    const source = leadSourceMeta(lead);
    const zoneName = lead.searchZone || lead.zone || lead.zoneName || lead.locality || '';
    const area = lead.area || lead.locality || lead.suburb || zoneName;
    const rawCity = String(lead.city || lead.village || city || '').trim();
    const cityVal = /\blondon\s+colony\b/i.test(rawCity) ? 'London' : rawCity;
    const addr = String(lead.address || '');
    const cc = String(lead.country || '').toUpperCase();
    let pinVal = String(lead.postalCode || lead.pincode || '').trim();
    if (!pinVal && addr) {
      if (cc === 'GB') {
        const m = addr.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
        if (m) {
          const c = m[1].toUpperCase().replace(/\s+/g, '');
          pinVal = c.length > 4 ? `${c.slice(0, -3)} ${c.slice(-3)}` : c;
        }
      } else if (cc === 'US' || cc === 'CA') {
        const m = addr.match(/\b(\d{5})(?:-\d{4})?\b/) || addr.match(/\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i);
        if (m) pinVal = m[1].toUpperCase();
      } else if (cc === 'IN') {
        const m = addr.match(/\b([1-8]\d{5})\b/);
        if (m) pinVal = m[1];
      } else if (cc === 'AU') {
        const m = addr.match(/\b(\d{4})\b/);
        if (m) pinVal = m[1];
      }
    }
    let stateVal = String(lead.state || '').trim();
    if (!stateVal && addr) {
      if (cc === 'GB') {
        stateVal = /london/i.test(`${cityVal} ${addr}`) ? 'Greater London' : 'England';
      } else if (cc === 'US') {
        const m = addr.match(/\b([A-Z]{2})\s+\d{5}\b/);
        if (m) stateVal = m[1];
      } else if (cc === 'AU') {
        const m = addr.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
        if (m) stateVal = m[1].toUpperCase();
      } else if (cc === 'AE') {
        const m = addr.match(/\b(Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah|Fujairah|Umm Al Quwain)\b/i);
        if (m) stateVal = m[1];
      }
    }
    const allEmails = Array.isArray(lead.emails) && lead.emails.length
      ? lead.emails.join('; ')
      : (lead.email || '');
    return [
      lead.name || 'Unknown Business',
      lead.businessModel || lead.intentType || 'Service',
      lead.matchedSubcategory || lead.subcategory || lead.query || '',
      lead.category || 'Unknown',
      phones.primary,
      phones.isMobile ? 'Yes' : 'No',
      phones.whatsapp,
      phones.secondary,
      lead.email || '',
      allEmails,
      cleanSocialCell(lead.website),
      cleanSocialCell(lead.instagram, 'ig'),
      cleanSocialCell(lead.facebook, 'fb'),
      cleanSocialCell(lead.linkedin),
      cleanSocialCell(lead.youtube, 'yt'),
      zoneName,
      area,
      addr,
      cityVal,
      stateVal,
      pinVal,
      lead.country || '',
      lead.rating != null ? lead.rating : '',
      lead.reviewsCount != null ? lead.reviewsCount : '',
      lead.googleMapsUrl || lead.mapsLink || (lead.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${lead.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lead.name, area, cityVal].filter(Boolean).join(', '))}`),
      source.label,
      lead.sessionId || '',
      lead.crmStage || 'new'
    ].map(csvCell).join(',');
  });
  return [headers.map(csvCell).join(','), ...rows].join('\r\n');
}

/** Trigger a browser download of the CSV built above. */
export function downloadLeadCsv(leads, filename = `leads_${Date.now()}.csv`, options = {}) {
  const list = Array.isArray(leads) ? leads : [];
  if (!list.length) return false;
  const csv = buildLeadCsv(list, options);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}
