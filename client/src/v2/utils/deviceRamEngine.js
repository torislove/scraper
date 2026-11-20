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
    id: 'maps_pins',
    number: 'Engine 1',
    name: 'Satellite & Street Map Pin Engine',
    shortDesc: 'Divides any city, mandal, or county into every neighborhood pocket and captures every shop pin, address & GPS coordinate.'
  },
  {
    id: 'directory_match',
    number: 'Engine 2',
    name: 'Local Business Directory Engine',
    shortDesc: 'Cross-checks regional business directories in parallel for verified mobile numbers, categories, star ratings & review counts.'
  },
  {
    id: 'website_contact',
    number: 'Engine 3',
    name: 'Official Website & Email Finder Engine',
    shortDesc: 'Checks listed business websites & contact pages to surface direct phone lines and official business emails.'
  },
  {
    id: 'b2b_trade',
    number: 'Engine 4',
    name: 'B2B Trade & Wholesale Supplier Engine',
    shortDesc: 'Finds manufacturers, wholesalers, distributors, and commercial vendors across industrial estates and trade corridors.'
  },
  {
    id: 'open_web_social',
    number: 'Engine 5',
    name: 'Public Web & Social Business Engine',
    shortDesc: 'Captures active local businesses from open web pages, public registries, and business profiles.'
  },
  {
    id: 'dedupe_excel',
    number: 'Engine 6',
    name: 'Smart Deduplication & Area-Wise Excel Engine',
    shortDesc: 'Automatically removes duplicate numbers, verifies contact quality, and exports a clean multi-sheet Excel workbook.'
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
    return () => {};
  }

  let stopped = false;
  let worker = null;
  let blobUrl = '';
  const controller = new AbortController();
  const hardware = detectDeviceHardware();
  const base = String(apiBase || '').replace(/\/api\/?$/, '');

  const cleanup = () => {
    stopped = true;
    try { controller.abort(); } catch (e) {}
    try { worker?.terminate(); } catch (e) {}
    try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch (e) {}
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

  // Zero-Knowledge Blind Ticket Relay Loop (runs while extension is connected)
  let relayTimer = null;
  const runRelayPoll = async () => {
    if (stopped) return;
    try {
      const extInfo = await detectRamExtension(250);
      if (!extInfo.installed || stopped) return;
      const hbRes = await fetch(`${base}/api/scrape/extension-heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scraper-extension': extInfo.version || '1.0.0',
          ...headers
        },
        signal: controller.signal,
        body: JSON.stringify({
          installed: true,
          version: extInfo.version || '1.0.0',
          ramGb: hardware.ramGb,
          cpuCores: hardware.cpuCores
        })
      });
      if (!hbRes.ok || stopped) return;
      const hbData = await hbRes.json();
      const tickets = Array.isArray(hbData?.tickets) ? hbData.tickets : [];
      for (const ticket of tickets) {
        if (stopped) break;
        const result = await executeBlindTicketInExtension(ticket);
        await fetch(`${base}/api/scrape/relay-result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          signal: controller.signal,
          body: JSON.stringify({
            ticketId: ticket.ticketId,
            signature: ticket.signature,
            ...result
          })
        }).catch(() => {});
      }
    } catch (e) {}
  };
  runRelayPoll();
  relayTimer = setInterval(runRelayPoll, 2500);

  return () => {
    if (relayTimer) clearInterval(relayTimer);
    cleanup();
  };
}

export const EXTENSION_DOWNLOAD_URL = '/api/scrape/extension-download';

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

export function executeBlindTicketInExtension(ticket, timeoutMs = 15000) {
  if (typeof window === 'undefined' || !ticket?.ticketId) {
    return Promise.resolve({ ok: false, error: 'Extension bridge unavailable' });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      resolve(res);
    };
    const onMsg = (event) => {
      if (event.source !== window || !event.data) return;
      if (
        event.data.source === 'SCRAPER_RAM_EXTENSION' &&
        event.data.type === 'SCRAPER_EXT_TICKET_RESULT' &&
        event.data.ticketId === ticket.ticketId
      ) {
        finish(event.data.result || { ok: false, error: 'Empty extension result' });
      }
    };
    const timer = setTimeout(() => finish({ ok: false, ticketId: ticket.ticketId, error: 'Extension timeout' }), timeoutMs);
    window.addEventListener('message', onMsg);
    try {
      window.postMessage({ type: 'SCRAPER_EXT_EXECUTE_TICKET', ticket }, '*');
    } catch (e) {
      finish({ ok: false, ticketId: ticket.ticketId, error: e?.message || 'PostMessage failed' });
    }
  });
}
