/**
 * deviceRamEngine.js
 *
 * Profiles the visitor/operator's local hardware (RAM & CPU cores) and runs
 * a multi-zone browser Web Worker directly inside their browser RAM so zone
 * planning, OpenStreetMap Overpass geospatial lookups, and deduplication run at
 * local hardware speed with zero cloud server waiting queues.
 */

export const ALL_BUILTIN_ENGINES = [
  {
    id: 'google-places',
    number: 'Engine 01',
    name: 'Google Places & Satellite Maps',
    category: 'Maps & Geospatial',
    shortDesc: 'Divides cities, mandals & counties into micro-zones, capturing every shop, pin, street address & GPS coordinate.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'google-local-finder',
    number: 'Engine 02',
    name: 'Google Local Finder & SERP 3-Pack',
    category: 'Maps & Geospatial',
    shortDesc: 'Extracts top-ranking local businesses, verified phone numbers, star ratings and operational hours from search result packs.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'bing-places',
    number: 'Engine 03',
    name: 'Bing Places & Microsoft Maps',
    category: 'Maps & Geospatial',
    shortDesc: 'Discovers verified Microsoft local business listings, alternate phone lines, and postal addresses.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'openstreetmap',
    number: 'Engine 04',
    name: 'OpenStreetMap Overpass Engine',
    category: 'Maps & Geospatial',
    shortDesc: 'Direct Overpass QL geo-queries for shops, commercial amenities, building outlines, and industrial corridors.',
    coverage: 'Global Open-Data'
  },
  {
    id: 'justdial',
    number: 'Engine 05',
    name: 'Justdial Pan-India Directory',
    category: 'National Directories',
    shortDesc: 'India’s premier local business directory covering verified mobile numbers, categories, and pincode-wise listings.',
    coverage: 'India (Home Market)'
  },
  {
    id: 'indiamart',
    number: 'Engine 06',
    name: 'IndiaMART B2B Wholesale & Manufacturers',
    category: 'B2B & Industrial',
    shortDesc: 'Finds verified manufacturers, exporters, wholesale traders, and commercial industrial suppliers across India.',
    coverage: 'India (B2B Specialized)'
  },
  {
    id: 'yelp',
    number: 'Engine 07',
    name: 'Yelp Commercial Business Engine',
    category: 'National Directories',
    shortDesc: 'Extracts verified retail, dining, professional service, and trade contractor leads across global metros.',
    coverage: 'US, UK, CA, AU'
  },
  {
    id: 'yellowpages-global',
    number: 'Engine 08',
    name: 'YellowPages Global & Yell UK',
    category: 'National Directories',
    shortDesc: 'Enterprise directories covering commercial businesses in US, UK (Yell.com), Canada, Australia, NZ, UAE, SA & MY.',
    coverage: 'US, UK, CA, AU, NZ, UAE, ZA, MY'
  },
  {
    id: 'cylex',
    number: 'Engine 09',
    name: 'Cylex International Business Directory',
    category: 'National Directories',
    shortDesc: 'Comprehensive commercial directory across Germany (Deutschland), UK, US, Australia & Canada.',
    coverage: 'DE, UK, US, AU, CA'
  },
  {
    id: 'freeindex-uk',
    number: 'Engine 10',
    name: 'FreeIndex UK Business Registry',
    category: 'National Directories',
    shortDesc: 'Dedicated UK trade contractors, independent professionals, and commercial businesses.',
    coverage: 'United Kingdom'
  },
  {
    id: 'goldenpages-ie',
    number: 'Engine 11',
    name: 'GoldenPages Ireland Business Index',
    category: 'National Directories',
    shortDesc: 'The definitive business directory for Dublin, Cork, Galway, and all 26 counties in the Republic of Ireland.',
    coverage: 'Ireland'
  },
  {
    id: 'tripadvisor',
    number: 'Engine 12',
    name: 'TripAdvisor Hospitality & Tourism',
    category: 'Hospitality & Leisure',
    shortDesc: 'Hospitality venues, resorts, restaurants, tour operators, and entertainment businesses with authentic ratings.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'trustpilot',
    number: 'Engine 13',
    name: 'Trustpilot Business Reputation Index',
    category: 'Reputation & Trust',
    shortDesc: 'Surfaces verified business domains, trust scores, customer care phone lines, and corporate headquarters.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'web-discovery',
    number: 'Engine 14',
    name: 'Public Web Deep Discovery Engine',
    category: 'Web Discovery',
    shortDesc: 'Hunts for unlisted local businesses, regional news mentions, trade registries, and chamber of commerce sites.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'web-contact',
    number: 'Engine 15',
    name: 'Website Contact & Email Crawler',
    category: 'Deep Crawling',
    shortDesc: 'Visits listed company websites in parallel to extract owner emails, direct WhatsApp numbers, and key personnel.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'social-dork-intl',
    number: 'Engine 16',
    name: 'Social Dork & Public Business Pages',
    category: 'Social Discovery',
    shortDesc: 'Pinpoints public business Facebook pages, Instagram handles, LinkedIn company profiles, and WhatsApp links.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'wikidata-businesses',
    number: 'Engine 17',
    name: 'Wikidata & Open Entity Graph Engine',
    category: 'Knowledge Graph',
    shortDesc: 'Queries structured SPARQL knowledge graphs for registered companies, institutions, landmarks, and brands.',
    coverage: 'Global · Open Data'
  },
  {
    id: 'brave-dork',
    number: 'Engine 18',
    name: 'Brave Search & Unbiased Local Index',
    category: 'Web Discovery',
    shortDesc: 'Independent search index dorking to surface hidden local service providers without advertising bias.',
    coverage: 'Global · 11 Countries'
  },
  {
    id: 'weddingbazaar',
    number: 'Engine 19',
    name: 'WeddingBazaar Event & Service Directory',
    category: 'Hospitality & Events',
    shortDesc: 'Event halls, photographers, decorators, caterers, and entertainment planners across India.',
    coverage: 'India (Events Specialized)'
  },
  {
    id: 'weddingwire',
    number: 'Engine 20',
    name: 'WeddingWire Hospitality & Venues',
    category: 'Hospitality & Events',
    shortDesc: 'Luxury venues, banquet halls, event planners, and hospitality coordinators with direct contact details.',
    coverage: 'India & Global'
  },
  {
    id: 'mandap',
    number: 'Engine 21',
    name: 'GoMandap Convention & Facility Engine',
    category: 'Hospitality & Events',
    shortDesc: 'Specialized registry of convention centers, kalyana mandapams, and community halls across South India.',
    coverage: 'India (Specialized)'
  },
  {
    id: 'dedupe_excel',
    number: 'Engine 22',
    name: 'Smart Deduplication & Mobile Validator',
    category: 'Data Quality & Export',
    shortDesc: 'Cross-engine fuzzy matching removes duplicates, tags mobile vs landline, and builds structured multi-sheet Excel workbooks.',
    coverage: 'Universal System Core'
  }
];

export const THREE_BUILTIN_ENGINES = ALL_BUILTIN_ENGINES.slice(0, 3);

export const DEVICE_REQUIREMENTS = [
  {
    tier: 'eco',
    badge: 'MINIMUM',
    ram: '4 GB RAM',
    cpu: '2–4 CPU Cores',
    parallelZones: 3,
    speed: '~55–85 leads/min',
    note: 'Eco Local RAM Mode · Smooth on everyday laptops & Chromebooks.'
  },
  {
    tier: 'turbo',
    badge: 'RECOMMENDED',
    ram: '8 GB RAM',
    cpu: '4–8 CPU Cores',
    parallelZones: 5,
    speed: '~120–170 leads/min',
    note: 'Turbo Hardware Mode · Ideal for agencies & fast city sweeps.'
  },
  {
    tier: 'ultra',
    badge: 'ULTRA SWARM',
    ram: '16 GB+ RAM',
    cpu: '8+ CPU Cores',
    parallelZones: 8,
    speed: '~240–320+ leads/min',
    note: 'Blazing Swarm Mode · Runs 8 zones simultaneously in your hardware RAM.'
  }
];

export function detectDeviceHardware() {
  if (typeof navigator === 'undefined') {
    return {
      ramGb: 8,
      cpuCores: 6,
      isEstimatedRam: true,
      tier: 'turbo',
      tierLabel: 'Turbo Hardware Mode (5 Parallel Zones)',
      parallelZones: 5,
      expectedSpeed: '~120–170 leads/min'
    };
  }

  const hasDeviceMem = 'deviceMemory' in navigator && Number(navigator.deviceMemory) > 0;
  const ramGb = hasDeviceMem ? Number(navigator.deviceMemory) : 8;
  const cpuCores = Number(navigator.hardwareConcurrency) > 0 ? Number(navigator.hardwareConcurrency) : 6;

  let tier = 'eco';
  let parallelZones = 3;
  let tierLabel = 'Eco Hardware Mode (3 Parallel Zones)';
  let expectedSpeed = '~55–85 leads/min';

  if (ramGb >= 12 || cpuCores >= 8) {
    tier = 'ultra';
    parallelZones = 8;
    tierLabel = 'Ultra Hardware Swarm (8 Parallel Zones)';
    expectedSpeed = '~240–320 leads/min';
  } else if (ramGb >= 6 || cpuCores >= 4) {
    tier = 'turbo';
    parallelZones = 5;
    tierLabel = 'Turbo Hardware Mode (5 Parallel Zones)';
    expectedSpeed = '~120–170 leads/min';
  }

  return {
    ramGb,
    cpuCores,
    isEstimatedRam: !hasDeviceMem,
    tier,
    tierLabel,
    parallelZones,
    expectedSpeed
  };
}

function buildWorkerSource() {
  return `
    self.onmessage = async (event) => {
      const payload = event.data || {};
      if (payload.type !== 'START') return;

      const {
        zones = [],
        category = 'Businesses',
        location = '',
        country = 'IN',
        concurrency = 4
      } = payload;

      const seen = new Set();
      let completedZones = 0;

      const normPhone = (val) => String(val || '').replace(/[^0-9+]/g, '');

      const queryNominatim = async (zone) => {
        const qText = zone.queryText || (category + ' in ' + (zone.zoneName || location));
        const params = new URLSearchParams({
          q: qText,
          format: 'jsonv2',
          addressdetails: '1',
          extratags: '1',
          limit: '25'
        });
        if (country && /^[A-Z]{2}$/i.test(country)) {
          params.set('countrycodes', country.toLowerCase());
        }
        const res = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        const items = await res.json();
        if (!Array.isArray(items)) return [];

        const leads = [];
        for (const item of items) {
          const tags = item.extratags || {};
          const rawName = (tags.name || (item.display_name || '').split(',')[0] || '').trim();
          if (!rawName || rawName.length < 2) continue;
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          const phone = normPhone(tags['contact:phone'] || tags.phone || tags['contact:mobile'] || '');
          const website = String(tags['contact:website'] || tags.website || '').trim();
          const email = String(tags['contact:email'] || tags.email || '').trim();
          const key = rawName.toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (Number.isFinite(lat) ? lat.toFixed(3) : '');
          if (seen.has(key)) continue;
          seen.add(key);

          leads.push({
            id: 'ram_' + (item.place_id || Math.random().toString(36).slice(2, 9)),
            name: rawName,
            category: tags.amenity || tags.shop || tags.office || category,
            city: zone.zoneName || location,
            location: item.display_name || zone.zoneName || location,
            address: item.display_name || '',
            country,
            phone,
            website,
            email,
            latitude: Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lng) ? lng : null,
            source: 'Client RAM Geo Worker'
          });
        }
        return leads;
      };

      const targetZones = zones.slice(0, Math.min(zones.length, 16));
      let cursor = 0;

      const workerLane = async () => {
        while (cursor < targetZones.length) {
          const idx = cursor++;
          const zone = targetZones[idx];
          try {
            const batch = await queryNominatim(zone);
            if (batch.length) {
              self.postMessage({ type: 'LEADS', leads: batch, zoneName: zone.zoneName || '' });
            }
          } catch (err) {
            // Silent resilience per zone in browser RAM
          }
          completedZones += 1;
          self.postMessage({
            type: 'PROGRESS',
            completedZones,
            totalZones: targetZones.length,
            dedupedInRam: seen.size
          });
          await new Promise(r => setTimeout(r, 350));
        }
      };

      const poolSize = Math.max(1, Math.min(Number(concurrency) || 4, targetZones.length || 1));
      await Promise.all(Array.from({ length: poolSize }, () => workerLane()));
      self.postMessage({ type: 'DONE', completedZones, dedupedInRam: seen.size });
    };
  `;
}

/**
 * Starts a client-side Web Worker that pulls a lightweight zone plan from the server,
 * discovers public OpenStreetMap/Nominatim business records inside the user's browser RAM,
 * deduplicates in memory, and streams batches back via /api/scrape/client-ingest.
 * Returns a stop() function.
 */
export function startBrowserRamAssist({
  sessionId,
  category,
  location,
  country = 'IN',
  apiBase = '',
  headers = {},
  onLeads,
  onStats
}) {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return () => { };
  }

  let stopped = false;
  let worker = null;
  let blobUrl = '';
  const controller = new AbortController();
  const hardware = detectDeviceHardware();
  const base = String(apiBase || '').replace(/\/api\/?$/, '');

  const cleanup = () => {
    stopped = true;
    try { controller.abort(); } catch (e) { }
    try { worker?.terminate(); } catch (e) { }
    try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch (e) { }
    worker = null;
    blobUrl = '';
  };

  (async () => {
    try {
      const params = new URLSearchParams({
        category: category || 'Businesses',
        location: location || 'Hyderabad',
        country: country || 'IN'
      });
      const planRes = await fetch(`${base}/api/scrape/zone-plan?${params.toString()}`, {
        headers: { ...headers },
        signal: controller.signal
      });
      if (!planRes.ok || stopped) return;
      const planData = await planRes.json();
      const zones = Array.isArray(planData?.zones) ? planData.zones : [];
      if (!zones.length || stopped) return;

      const blob = new Blob([buildWorkerSource()], { type: 'application/javascript' });
      blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);

      worker.onmessage = async (event) => {
        if (stopped) return;
        const msg = event.data || {};
        if (msg.type === 'PROGRESS' || msg.type === 'DONE') {
          onStats?.({
            hardware,
            completedZones: msg.completedZones || 0,
            totalZones: msg.totalZones || zones.length,
            dedupedInRam: msg.dedupedInRam || 0,
            done: msg.type === 'DONE'
          });
          if (msg.type === 'DONE') cleanup();
        } else if (msg.type === 'LEADS' && Array.isArray(msg.leads) && msg.leads.length) {
          try {
            const ingestRes = await fetch(`${base}/api/scrape/client-ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              signal: controller.signal,
              body: JSON.stringify({
                sessionId,
                category,
                location,
                country,
                leads: msg.leads,
                deviceSpec: hardware
              })
            });
            if (ingestRes.ok && !stopped) {
              const data = await ingestRes.json();
              if (Array.isArray(data?.leads) && data.leads.length) {
                onLeads?.(data.leads);
              }
            }
          } catch (e) {
            // Ignore network abort on stop
          }
        }
      };

      worker.postMessage({
        type: 'START',
        zones,
        category: category || 'Businesses',
        location: location || '',
        country,
        concurrency: hardware.parallelZones
      });
    } catch (e) {
      cleanup();
    }
  })();

  return cleanup;
}

export const EXTENSION_DOWNLOAD_URL = '/api/scrape/extension-download';

// Set VITE_EXTENSION_STORE_URL once the Chrome Web Store listing is approved.
// Until then the UI falls back to a clearly-labelled developer build.
export const EXTENSION_STORE_URL = String(import.meta.env.VITE_EXTENSION_STORE_URL || '').trim();

export function detectRamExtension(timeoutMs = 500) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve({ installed: false, version: '' });
  }
  const datasetVer = document.documentElement?.dataset?.scraperExtension;
  if (datasetVer) {
    return Promise.resolve({ installed: true, version: String(datasetVer) });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(val);
    };
    const onMsg = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.source === 'SCRAPER_RAM_EXTENSION' && event.data.type === 'SCRAPER_EXT_PONG') {
        finish({ installed: true, version: String(event.data.version || '1.0.0') });
      }
    };
    const timer = setTimeout(() => {
      const retryVer = document.documentElement?.dataset?.scraperExtension;
      finish(retryVer ? { installed: true, version: String(retryVer) } : { installed: false, version: '' });
    }, timeoutMs);
    window.addEventListener('message', onMsg);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_PING' }, '*');
    } catch (e) {
      finish({ installed: false, version: '' });
    }
  });
}
