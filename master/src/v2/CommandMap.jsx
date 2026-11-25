import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Marker art is bundled by Vite instead of fetched from a CDN: the desktop app
// must render its map with no network access at all.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { ExternalLink, MapPin, Phone, Star, Plus, Minus, Compass, Minimize2 } from 'lucide-react';
import { cx, formatNumber } from './ui';
import { API_URL } from '../apiConfig';

const INDIA_CENTER = [22.5937, 79.9629];

// Fix Leaflet asset paths so the default pin never 404s offline.
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
} catch (e) { }

// 100% Free Watermark-Free HD Satellite Imagery + Boundaries (Zero API Keys)
const SATELLITE_SOURCES = [
  {
    imagery: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
  },
  {
    imagery: `${API_URL}/map-tiles/satellite/{z}/{x}/{y}.png`,
    labels: `${API_URL}/map-tiles/labels/{z}/{x}/{y}.png`
  }
];
const SATELLITE_ATTRIBUTION = '&copy; Esri World Imagery';

// Maximum leads plotted simultaneously to guarantee silky-smooth 60 FPS
const MAX_MAP_PLOTTED_LEADS = 300;

function clampVendorCoords(lat, lng) {
  let numLat = Number(lat);
  let numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return [numLat, numLng];
  // Lake Michigan water boundary protection: water lies north of 41.718 near Michigan City (lng -87.55 to -86.75)
  if (numLat > 41.718 && numLng >= -87.55 && numLng <= -86.75) {
    numLat = 41.712; // clamped safely south onto municipal land
  }
  return [numLat, numLng];
}

function hasCoords(vendor) {
  const lat = Number(vendor?.latitude ?? vendor?.lat);
  const lng = Number(vendor?.longitude ?? vendor?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}

// Global Memoized Marker Icon Cache — Prevents creating thousands of L.divIcon instances
const ICON_CACHE = new Map();
function getVendorIcon(vendor, isHovered = false) {
  const phone = vendor?.phone || (Array.isArray(vendor?.phones) && vendor.phones.length > 0 ? vendor.phones[0] : null);
  const rating = Number(vendor?.rating || 0);
  const tone = vendor?.verified ? 'verified' : rating >= 4.5 ? 'prime' : phone ? 'phone' : 'cold';
  const cacheKey = `${tone}-${isHovered ? 'hover' : 'normal'}`;

  if (ICON_CACHE.has(cacheKey)) {
    return ICON_CACHE.get(cacheKey);
  }

  const icon = L.divIcon({
    className: `v2-map-pin-wrap ${isHovered ? 'is-pin-hovered' : ''}`,
    html: `
      <div class="v2-map-pin tone-${tone} ${isHovered ? 'is-active-pulse' : ''}">
        <span class="v2-map-pin-pulse ${isHovered ? 'is-super-pulse' : ''}"></span>
        <div class="v2-map-pin-gem">
          <span class="v2-map-pin-highlight"></span>
          <span class="v2-map-pin-symbol">${isHovered ? '🎯' : tone === 'verified' ? '✓' : tone === 'prime' ? '★' : '●'}</span>
        </div>
        <span class="v2-map-pin-ground-shadow"></span>
      </div>
    `,
    iconSize: isHovered ? [38, 48] : [32, 40],
    iconAnchor: isHovered ? [19, 44] : [16, 36],
    popupAnchor: [0, -36]
  });

  ICON_CACHE.set(cacheKey, icon);
  return icon;
}

// Memoized 3D Cluster Icon Generator
function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count > 100 ? 50 : count > 25 ? 42 : 36;
  return L.divIcon({
    className: 'v2-cluster-wrap',
    html: `
      <div class="v2-cluster-3d" style="width:${size}px;height:${size}px">
        <span class="v2-cluster-halo"></span>
        <span class="v2-cluster-glass-sphere"></span>
        <b>${count > 999 ? `${(count / 1000).toFixed(1)}k` : count}</b>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

/**
 * Intelligent View Synchronizer:
 * ONLY pans the map when target location actually shifts significantly (> 0.05 deg),
 * preventing aggressive overrides of user zoom and pan gestures.
 */
function SmartMapController({ center, zoom, activePoint, scanning }) {
  const map = useMap();
  const lastCenterRef = useRef(null);
  const lastActiveRef = useRef(null);
  const lastFlyTimeRef = useRef(0);

  // Multi-stage mount & continuous layout observer to guarantee Leaflet NEVER collapses to 0
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    // Multi-stage invalidateSize to catch any CSS transition or layout reflows
    const timers = [40, 120, 280, 600, 1200].map(delay =>
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) { }
      }, delay)
    );

    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        try { map.invalidateSize(); } catch (e) { }
      });
      observer.observe(container);
    }

    const handleWindowResize = () => {
      try { map.invalidateSize(); } catch (e) { }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      timers.forEach(t => clearTimeout(t));
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map]);

  // Gentle center tracking: only moves when user explicitly selects a different city/zone
  useEffect(() => {
    if (!center || !Number.isFinite(Number(center[0])) || !Number.isFinite(Number(center[1]))) return;
    const [targetLat, targetLng] = center;

    if (!lastCenterRef.current) {
      lastCenterRef.current = [targetLat, targetLng];
      map.setView(center, zoom, { animate: false });
      return;
    }

    const [lastLat, lastLng] = lastCenterRef.current;
    const distance = Math.hypot(targetLat - lastLat, targetLng - lastLng);

    // Smooth animated transition whenever city/zone genuinely changes
    if (distance > 0.045) {
      lastCenterRef.current = [targetLat, targetLng];
      const targetZoom = Math.max(map.getZoom() || 11, zoom || 11);
      try {
        if (distance > 1.5) {
          map.flyTo(center, targetZoom, { animate: true, duration: 0.72, easeLinearity: 0.22 });
        } else {
          map.panTo(center, { animate: true, duration: 0.32 });
        }
      } catch (e) { }
    }
  }, [center, zoom, map]);

  // Governed live scan radar focus (smooth, non-interrupting camera track with 700ms throttle)
  useEffect(() => {
    if (!scanning || !activePoint || !map) return;
    const [lat, lng] = activePoint;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const now = Date.now();
    if (now - lastFlyTimeRef.current < 700) return;
    if (lastActiveRef.current) {
      const [lastLat, lastLng] = lastActiveRef.current;
      const dist = Math.hypot(lat - lastLat, lng - lastLng);
      if (dist < 0.008) return;
    }
    lastActiveRef.current = [lat, lng];
    lastFlyTimeRef.current = now;
    try {
      const currentZoom = map.getZoom() || 12;
      const targetZoom = Math.max(currentZoom, 13);
      map.flyTo(activePoint, targetZoom, { animate: true, duration: 0.7, easeLinearity: 0.25 });
    } catch (e) { }
  }, [activePoint, scanning, map]);

  return null;
}

function scanTargetIcon() {
  return L.divIcon({
    className: 'v2-scan-target-wrap',
    html: `
      <div class="v2-scan-target" style="width:76px;height:76px;">
        <span class="v2-radar-sweep-beam"></span>
        <i class="ring r1"></i>
        <i class="ring r2"></i>
        <b></b>
      </div>
    `,
    iconSize: [76, 76],
    iconAnchor: [38, 38]
  });
}

function tacticalZoneIcon(zoneName = '', cellState = 'queued', leadsCount = 0, isCompact = false) {
  const safeName = String(zoneName || '').replace(/[<>&"]/g, '').slice(0, 20);
  const countTag = leadsCount > 0 ? ` · ${leadsCount}` : '';

  if (isCompact && cellState === 'queued') {
    return L.divIcon({
      className: 'v2-tactical-dot-wrap',
      html: `<div class="v2-tactical-radar-dot" title="${safeName}"><i></i></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }

  const isDone = cellState === 'done' || cellState === 'saturated';
  const stateClass = isDone ? 'is-done' : cellState === 'dry' ? 'is-dry' : 'is-queued';
  const iconGlyph = isDone ? '✓' : '🛰️';
  const displayLabel = isDone ? (leadsCount > 0 ? `${leadsCount} leads` : safeName) : safeName;

  return L.divIcon({
    className: 'v2-zone-beacon-wrap',
    html: `<div class="v2-zone-beacon-pill ${stateClass}" title="${safeName}${countTag}"><i></i><span>${iconGlyph} ${displayLabel}</span></div>`,
    iconSize: [isDone ? 96 : 120, 22],
    iconAnchor: [isDone ? 48 : 60, 11]
  });
}

function zoneBeaconIcon(zoneName = '', cellState = 'queued', leadsCount = 0) {
  return tacticalZoneIcon(zoneName, cellState, leadsCount, false);
}

function InitialFit({ points, zonePoints = [], fitKey = 'default' }) {
  const map = useMap();
  const fittedKey = useRef(null);

  useEffect(() => {
    const targets = points.length ? points : zonePoints;
    if (!targets.length || fittedKey.current === fitKey) return;
    fittedKey.current = fitKey;
    if (targets.length === 1) {
      map.flyTo(targets[0], 12, { animate: true, duration: 0.55 });
      return;
    }
    const bounds = L.latLngBounds(targets);
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 13, animate: true, duration: 0.55 });
  }, [map, points, zonePoints, fitKey]);

  return null;
}

function CommandMap({
  vendors = [],
  zones = [],
  activeZone = null,
  scanning = false,
  center = INDIA_CENTER,
  zoom = 5,
  height = 520,
  onSelect,
  onSelectZone,
  onOpenWhatsApp,
  className = '',
  compact = false,
  fitKey = 'default',
  scopeTitle = 'Current Search',
  hoveredLeadId = null,
  cellStates = {},
  jumpTrail = null,
  onMinimize = null
}) {
  const mapRef = useRef(null);
  const [tileFailoverIdx, setTileFailoverIdx] = useState(0);
  const tileErrorTrackerRef = useRef({ count: 0, since: 0 });
  const activeSat = SATELLITE_SOURCES[Math.min(tileFailoverIdx, SATELLITE_SOURCES.length - 1)];

  const handleTileError = useMemo(() => () => {
    const now = Date.now();
    const tracker = tileErrorTrackerRef.current;
    if (now - tracker.since > 4000) {
      tracker.count = 1;
      tracker.since = now;
    } else {
      tracker.count += 1;
    }
    if (tracker.count >= 2) {
      tracker.count = 0;
      tracker.since = now;
      setTileFailoverIdx(prev => (prev + 1 < SATELLITE_SOURCES.length ? prev + 1 : prev));
    }
  }, []);

  const coverage = useMemo(
    () => zones.map((zone, index) => ({
      name: zone.zoneName || zone.name || `Zone ${index + 1}`,
      lat: Number(zone.lat ?? zone.latitude),
      lng: Number(zone.lng ?? zone.longitude),
      radiusKm: Number(zone.radiusKm) || 6.0,
      approximate: Boolean(zone.isApproximate || zone.approx),
      index: zone.index || index + 1
    })).filter(zone => Number.isFinite(zone.lat) && Number.isFinite(zone.lng)),
    [zones]
  );

  const safeCenter = useMemo(() => {
    let lat = Number(center?.[0]);
    let lng = Number(center?.[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 1 || Math.abs(lng) > 1)) {
      return [lat, lng];
    }
    if (coverage.length > 0 && Number.isFinite(coverage[0].lat) && Number.isFinite(coverage[0].lng) && (Math.abs(coverage[0].lat) > 1 || Math.abs(coverage[0].lng) > 1)) {
      return [coverage[0].lat, coverage[0].lng];
    }
    return INDIA_CENTER;
  }, [center, coverage]);

  const zonePoints = useMemo(
    () => coverage.map(z => [z.lat, z.lng]),
    [coverage]
  );

  const approximateCount = useMemo(
    () => coverage.filter(zone => zone.approximate).length,
    [coverage]
  );

  const activeZoneLabel = useMemo(() => {
    if (typeof activeZone === 'string') return activeZone;
    return activeZone?.name || activeZone?.zoneName || '';
  }, [activeZone]);

  const activePoint = useMemo(() => {
    let lat = Number(activeZone?.lat ?? activeZone?.latitude);
    let lng = Number(activeZone?.lng ?? activeZone?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (activeZoneLabel) {
        const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const clean = norm(activeZoneLabel);
        const match = coverage.find(c => norm(c.name) === clean) || zones.find(z => norm(z.zoneName || z.name) === clean);
        if (match) {
          lat = Number(match.lat ?? match.latitude);
          lng = Number(match.lng ?? match.longitude);
        }
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null;
    return [lat, lng];
  }, [activeZone, activeZoneLabel, coverage, zones]);

  // Filter only valid coords, clamp water coords to land, and cap to MAX_MAP_PLOTTED_LEADS for silky 60 FPS
  const validVendors = useMemo(() => {
    const withCoords = vendors.filter(hasCoords).map(v => {
      const [cLat, cLng] = clampVendorCoords(v.latitude ?? v.lat, v.longitude ?? v.lng);
      return {
        ...v,
        latitude: cLat,
        longitude: cLng
      };
    });

    // If coverage zones are anchored, only plot vendors belonging to this geographic region (within ~150km)
    const targetFiltered = (coverage.length > 0 && Number.isFinite(safeCenter[0]) && Number.isFinite(safeCenter[1]))
      ? withCoords.filter(v => {
        const dLat = Math.abs(v.latitude - safeCenter[0]);
        const dLng = Math.abs(v.longitude - safeCenter[1]);
        return dLat < 1.8 && dLng < 1.8;
      })
      : withCoords;

    if (targetFiltered.length <= MAX_MAP_PLOTTED_LEADS) return targetFiltered;
    // Prioritize verified leads with mobiles first
    return [...targetFiltered]
      .sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0))
      .slice(0, MAX_MAP_PLOTTED_LEADS);
  }, [vendors, coverage, safeCenter]);

  const points = useMemo(
    () => validVendors.map(v => [Number(v.latitude), Number(v.longitude)]),
    [validVendors]
  );

  // Resolve strictly AT MOST ONE active zone index so generic city names never highlight 45 circles
  const activeZonePoint = useMemo(() => {
    if (!scanning) return null;
    if (activePoint) return activePoint;
    if (!coverage.length || !activeZoneLabel) return null;
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanAct = norm(activeZoneLabel);
    if (!cleanAct) return null;
    const exact = coverage.find(z => norm(z.name) === cleanAct);
    if (exact) return [exact.lat, exact.lng];
    return null;
  }, [scanning, activePoint, coverage, activeZoneLabel]);

  const scanIcon = useMemo(() => scanTargetIcon(), []);

  // Manual Zoom Controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      try { mapRef.current.zoomIn(1); } catch (e) { }
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      try { mapRef.current.zoomOut(1); } catch (e) { }
    }
  };

  const handleResetCenter = () => {
    if (mapRef.current) {
      try {
        const targets = points.length ? points : zonePoints;
        if (targets.length > 1) {
          const bounds = L.latLngBounds(targets);
          mapRef.current.fitBounds(bounds, { padding: [36, 36], maxZoom: 14, animate: true });
        } else {
          mapRef.current.flyTo(safeCenter, zoom || 11, { duration: 0.8 });
        }
      } catch (e) { }
    }
  };

  const computedHeight = typeof height === 'number' ? `${height}px` : (height && height !== '100%' ? height : '100%');
  const computedMinHeight = compact ? 260 : 480;

  return (
    <div
      className={cx('v2-map-shell', compact && 'is-compact', className)}
      style={{
        height: computedHeight,
        minHeight: computedMinHeight,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: compact ? 12 : 14,
        background: '#0f172a',
        boxShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.14)'
      }}
    >
      {/* Minimal Golden-Bordered Liquid Glass Telemetry Pill */}
      <div className="v2-map-hud-wrap" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, pointerEvents: 'none' }}>
        <div
          className="v2-map-hud-pill"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 13px',
            borderRadius: 999,
            background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.94), rgba(255, 251, 235, 0.88))',
            backdropFilter: 'blur(18px) saturate(180%)',
            border: '1.5px solid rgba(217, 119, 6, 0.42)',
            boxShadow: 'inset 0 1.5px 0 #ffffff, 0 10px 24px -8px rgba(180, 83, 9, 0.22)'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: scanning ? 'radial-gradient(circle at 35% 35%, #fcd34d, #d97706)' : 'radial-gradient(circle at 35% 35%, #6ee7b7, #059669)', boxShadow: scanning ? '0 0 8px rgba(217, 119, 6, 0.85)' : '0 0 8px rgba(16, 185, 129, 0.8)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', color: '#0f172a' }}>
            {scopeTitle.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
            <b>{formatNumber(validVendors.length)}</b> pinned
          </span>
        </div>
      </div>
      <MapContainer
        ref={mapRef}
        center={safeCenter}
        zoom={zoom}
        scrollWheelZoom
        zoomSnap={0.5}
        wheelDebounceTime={40}
        preferCanvas
        className="v2-map"
        style={{
          height: '100%',
          minHeight: computedMinHeight,
          width: '100%'
        }}
        attributionControl={false}
        zoomControl={false}
      >
        {/* Free Watermark-Free HD Satellite Imagery + Street/Place Boundaries */}
        <TileLayer
          key={`sat-${tileFailoverIdx}`}
          url={activeSat.imagery}
          attribution={SATELLITE_ATTRIBUTION}
          maxNativeZoom={18}
          maxZoom={19}
          keepBuffer={3}
          updateWhenZooming={false}
          eventHandlers={{
            tileerror: handleTileError
          }}
        />
        <TileLayer
          key={`sat-labels-${tileFailoverIdx}`}
          url={activeSat.labels}
          attribution={SATELLITE_ATTRIBUTION}
          maxNativeZoom={18}
          maxZoom={19}
          opacity={0.92}
        />

        <SmartMapController
          center={safeCenter}
          zoom={zoom}
          activePoint={activePoint}
          scanning={scanning}
        />

        {!compact && <InitialFit points={points} zonePoints={zonePoints} fitKey={fitKey} />}

        {/* Subtle Zone Hop Trail */}
        {jumpTrail && jumpTrail.from && jumpTrail.to && (
          <Polyline
            positions={[jumpTrail.from, jumpTrail.to]}
            pathOptions={{
              color: '#f59e0b',
              weight: 2.5,
              opacity: 0.85,
              dashArray: '6 8',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* Cluster Group with high-performance Canvas rendering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={44}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          iconCreateFunction={clusterIcon}
        >
          {validVendors.map(vendor => {
            const vKey = vendor.id || `${vendor.name}-${vendor.phone}`;
            const isHovered = Boolean(hoveredLeadId && (hoveredLeadId === vendor.id || hoveredLeadId === vKey));
            return (
              <Marker
                key={vendor.id}
                position={[Number(vendor.latitude), Number(vendor.longitude)]}
                icon={getVendorIcon(vendor, isHovered)}
                zIndexOffset={isHovered ? 9999 : 10}
                eventHandlers={{
                  click: () => onSelect?.(vendor)
                }}
              >
                <Popup className="v2-map-popup">
                  <div className="v2-map-popup-card">
                    <div className="v2-map-popup-head">
                      <span className="v2-map-popup-avatar">
                        {(vendor.logo && !/ui-avatars/i.test(vendor.logo))
                          ? <img src={vendor.logo} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />
                          : <b>{(vendor.name || '?').slice(0, 1).toUpperCase()}</b>}
                      </span>
                      <span>
                        <b>{vendor.name || 'Unknown vendor'}</b>
                        <small>{vendor.category || 'Business Lead'}</small>
                      </span>
                    </div>
                    <div className="v2-map-popup-meta">
                      <span><MapPin size={12} /> {vendor.city || vendor.district || vendor.state || 'Location known'}</span>
                      {vendor.rating != null && (
                        <span><Star size={12} fill="#fbbf24" stroke="#fbbf24" /> {Number(vendor.rating).toFixed(1)} {vendor.reviewsCount ? `(${formatNumber(vendor.reviewsCount)})` : ''}</span>
                      )}
                      {(vendor.phone || (Array.isArray(vendor.phones) && vendor.phones[0])) && (
                        <span style={{ color: '#059669', fontWeight: 750 }}>
                          <Phone size={12} /> {vendor.phone || (typeof vendor.phones[0] === 'string' ? vendor.phones[0] : vendor.phones[0].e164)}
                        </span>
                      )}
                    </div>
                    <div className="v2-map-popup-actions">
                      {onSelect && (
                        <button type="button" onClick={() => onSelect(vendor)}>
                          <ExternalLink size={12} /> View Details
                        </button>
                      )}
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          style={{ color: '#059669', fontWeight: 750, textDecoration: 'none' }}
                        >
                          <Phone size={12} /> Call
                        </a>
                      )}
                      {vendor.mapsLink && (
                        <a href={vendor.mapsLink} target="_blank" rel="noreferrer">
                          <MapPin size={12} /> Directions
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* Single Hollow Pinpoint Radar Pulse When Scanning (Zero Filled Green Circles) */}
        {activeZonePoint && scanning && (
          <>
            <Circle
              center={activeZonePoint}
              radius={950}
              interactive={false}
              pathOptions={{
                color: '#f59e0b',
                fillOpacity: 0,
                weight: 2.2,
                opacity: 0.9,
                dashArray: '6 6'
              }}
            />
            <Marker
              position={activeZonePoint}
              icon={scanIcon}
              interactive={false}
              zIndexOffset={3000}
            />
          </>
        )}
      </MapContainer>

      {/* Clean Golden-Bordered 3D Liquid Glass Zoom/Recenter Controls */}
      <div
        className="v2-map-controls-floating"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.94), rgba(255, 251, 235, 0.86))',
          padding: 6,
          borderRadius: 14,
          border: '1.5px solid rgba(217, 119, 6, 0.42)',
          boxShadow: 'inset 0 1.5px 0 #ffffff, 0 10px 26px -8px rgba(180, 83, 9, 0.24)',
          backdropFilter: 'blur(18px)'
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(217,119,6,0.28)', boxShadow: '0 2px 0 rgba(180,83,9,0.1)', borderRadius: 9, color: '#0F172A', cursor: 'pointer' }}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(217,119,6,0.28)', boxShadow: '0 2px 0 rgba(180,83,9,0.1)', borderRadius: 9, color: '#0F172A', cursor: 'pointer' }}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          title="Center Territory"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(217,119,6,0.28)', boxShadow: '0 2px 0 rgba(180,83,9,0.1)', borderRadius: 9, color: '#b45309', cursor: 'pointer' }}
        >
          <Compass size={15} />
        </button>
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize Map"
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffbeb', border: '1px solid rgba(217,119,6,0.45)', boxShadow: '0 2px 0 rgba(180,83,9,0.12)', borderRadius: 9, color: '#92400e', cursor: 'pointer' }}
          >
            <Minimize2 size={15} />
          </button>
        )}
      </div>

      {scanning && (
        <div
          className="v2-map-scan"
          style={{
            background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 251, 235, 0.9))',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(217, 119, 6, 0.55)',
            color: '#0f172a',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 12px 28px -8px rgba(180, 83, 9, 0.28)'
          }}
        >
          <span className="v2-map-scan-radar"><i style={{ background: '#d97706' }} /></span>
          <span className="v2-map-scan-copy">
            <b style={{ color: '#b45309', letterSpacing: '0.06em' }}>SCANNING SATELLITE ZONE</b>
            <small style={{ color: '#0f172a', fontWeight: 800 }}>{activeZoneLabel || 'Mapping target territory…'}</small>
          </span>
        </div>
      )}
    </div>
  );
}

export default React.memo(CommandMap);
