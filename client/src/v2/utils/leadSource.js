/**
 * Lead source helpers — one place that answers "which scrape produced this
 * lead?" and exports the visible rows as a CSV spreadsheet.
 *
 * The engine stamps every row with `source` (human label) and `sourceEngine`
 * (stable key). Older rows may only carry one of them, so both are normalised
 * to the same key before anything is displayed or filtered.
 */

const SOURCE_MAP = {
  'google-places': { key: 'google', label: 'Google Maps', short: 'Google', tone: 'google' },
  'google maps': { key: 'google', label: 'Google Maps', short: 'Google', tone: 'google' },
  google: { key: 'google', label: 'Google Maps', short: 'Google', tone: 'google' },
  'google-serp': { key: 'google-serp', label: 'Google Search', short: 'Google Web', tone: 'google' },
  justdial: { key: 'justdial', label: 'JustDial', short: 'JustDial', tone: 'justdial' },
  openstreetmap: { key: 'osm', label: 'OpenStreetMap', short: 'OSM', tone: 'osm' },
  osm: { key: 'osm', label: 'OpenStreetMap', short: 'OSM', tone: 'osm' },
  indiamart: { key: 'indiamart', label: 'IndiaMART', short: 'IndiaMART', tone: 'indiamart' },
  sulekha: { key: 'sulekha', label: 'Sulekha', short: 'Sulekha', tone: 'sulekha' },
  practo: { key: 'practo', label: 'Practo', short: 'Practo', tone: 'practo' },
  bing: { key: 'bing', label: 'Bing', short: 'Bing', tone: 'bing' },
  brave: { key: 'brave', label: 'Brave Search', short: 'Brave', tone: 'bing' },
  instagram: { key: 'social', label: 'Social (Instagram)', short: 'Social', tone: 'social' },
  facebook: { key: 'social', label: 'Social (Facebook)', short: 'Social', tone: 'social' },
  'social dork (instagram)': { key: 'social', label: 'Social (Instagram)', short: 'Social', tone: 'social' },
  'social dork': { key: 'social', label: 'Social Search', short: 'Social', tone: 'social' }
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
 * Build a spreadsheet-ready CSV for the given leads. The Scrape Source column
 * keeps the engine visible in Excel/Sheets after export.
 */
export function buildLeadCsv(leads, { city = '' } = {}) {
  const headers = [
    'Business Name', 'Category', 'Primary Phone', 'Mobile Verified',
    'Area', 'Village', 'Mandal', 'District', 'State', 'Pincode',
    'Rating', 'Reviews', 'Website', 'Scrape Source', 'Search Folder',
    'CRM Stage', 'Google Maps Link'
  ];
  const rows = (Array.isArray(leads) ? leads : []).map(lead => {
    const source = leadSourceMeta(lead);
    const area = lead.locality || lead.suburb || lead.area || lead.zoneName || '';
    const village = lead.village || lead.city || city || '';
    return [
      lead.name || 'Unknown Business',
      lead.category || 'Unknown',
      lead.phone || lead.primaryPhone || '',
      lead.isMobile || lead.phoneType === 'mobile' ? 'Yes' : 'No',
      area,
      village,
      lead.mandal || '',
      lead.district || '',
      lead.state || '',
      lead.pincode || '',
      lead.rating != null ? lead.rating : '',
      lead.reviewsCount != null ? lead.reviewsCount : '',
      lead.website || '',
      source.label,
      lead.sessionId || '',
      lead.crmStage || 'new',
      lead.googleMapsUrl || lead.mapsLink || ''
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
