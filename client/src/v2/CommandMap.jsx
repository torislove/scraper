import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Marker art is bundled by Vite instead of fetched from a CDN: the desktop app
// must render its map with no network access at all.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { ExternalLink, MapPin, Phone, Star, Plus, Minus, Compass, Layers, CheckCircle2, Zap } from 'lucide-react';
import { cx, formatNumber } from './ui';

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

// 100% Same-Origin Disk-Cached & Procedural Offline-Capable Basemaps (Zero API Keys Required)
const TILE_VOYAGER = '/api/map-tiles/voyager/{z}/{x}/{y}.png';
const TILE_VOYAGER_ATTRIBUTION = '&copy; CARTO &copy; OpenStreetMap &copy; Local Offline Vector';
const TILE_STREETS = '/api/map-tiles/streets/{z}/{x}/{y}.png';
const TILE_SATELLITE = '/api/map-tiles/satellite/{z}/{x}/{y}.png';
const TILE_SATELLITE_LABELS = '/api/map-tiles/labels/{z}/{x}/{y}.png';
const TILE_LIGHT_CANVAS = '/api/map-tiles/light/{z}/{x}/{y}.png';
const TILE_OSM = '/api/map-tiles/osm/{z}/{x}/{y}.png';
const TILE_DARK_CANVAS = '/api/map-tiles/dark/{z}/{x}/{y}.png';
const TILE_OFFLINE = '/api/map-tiles/offline/{z}/{x}/{y}.svg';
const TILE_ATTRIBUTION = '&copy; Esri Satellite &copy; OpenStreetMap &copy; Local Cache';

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

  // Live scan radar focus (smooth, non-interrupting camera track)
  useEffect(() => {
    if (!scanning || !activePoint || !map) return;
    try {
      const currentZoom = map.getZoom() || 12;
      const targetZoom = Math.max(currentZoom, 13);
      map.flyTo(activePoint, targetZoom, { animate: true, duration: 0.7, easeLinearity: 0.25 });
    } catch (e) { }
  }, [activePoint, scanning, map]);

  return null;
}

function scanTargetIcon(label = '') {
  const safeLabel = String(label || '').replace(/[<>&"]/g, '');
  return L.divIcon({
    className: 'v2-scan-target-wrap',
    html: `
      <div class="v2-scan-target">
        <span class="v2-radar-sweep-beam"></span>
        <i class="ring r1"></i>
        <i class="ring r2"></i>
        <i class="ring r3"></i>
        <b></b>
        ${safeLabel ? `<div class="v2-scan-target-badge"><span class="v2-scan-badge-dot"></span><span class="v2-scan-badge-text">📡 SCANNING: ${safeLabel}</span></div>` : ''}
      </div>
    `,
    iconSize: [160, 160],
    iconAnchor: [80, 80]
  });
}

function zoneBeaconIcon(zoneName = '', cellState = 'queued', leadsCount = 0) {
  const safeName = String(zoneName || '').replace(/[<>&"]/g, '').slice(0, 24);
  const countTag = leadsCount > 0 ? ` · ${leadsCount}` : '';
  const stateClass = cellState === 'scanning'
    ? 'is-scanning'
    : (cellState === 'done' || cellState === 'saturated')
      ? 'is-done'
      : 'is-queued';
  const iconGlyph = cellState === 'scanning' ? '⚡' : (cellState === 'done' || cellState === 'saturated') ? '✅' : '🛰️';
  return L.divIcon({
    className: 'v2-zone-beacon-wrap',
    html: `<div class="v2-zone-beacon-pill ${stateClass}"><i></i><span>${iconGlyph} ${safeName}${countTag}</span></div>`,
    iconSize: [144, 24],
    iconAnchor: [72, 12]
  });
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

export default function CommandMap({
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
  cellStates = {}
}) {
  const mapRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [tileMode, setTileMode] = useState('satellite'); // Locked 100% HD Satellite Live Zone Radar
  const tileErrorTrackerRef = useRef({ count: 0, since: 0 });
  const TILE_FAILOVER_ORDER = ['satellite'];
  const handleTileError = useMemo(() => () => {}, []);

  const safeCenter = useMemo(() => {
    const lat = Number(center?.[0]);
    const lng = Number(center?.[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : INDIA_CENTER;
  }, [center]);

  const coverage = useMemo(
    () => zones.map((zone, index) => ({
      name: zone.zoneName || zone.name || `Zone ${index + 1}`,
      lat: Number(zone.lat ?? zone.latitude),
      lng: Number(zone.lng ?? zone.longitude),
      radiusKm: Number(zone.radiusKm) || 3.5,
      approximate: Boolean(zone.isApproximate || zone.approx),
      index: zone.index || index + 1
    })).filter(zone => Number.isFinite(zone.lat) && Number.isFinite(zone.lng)),
    [zones]
  );

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

  const scanIcon = useMemo(() => scanTargetIcon(activeZoneLabel), [activeZoneLabel]);

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
      className={cx('v2-map-shell', compact && 'is-compact', is3DMode && 'is-3d-perspective', className)}
      style={{
        height: computedHeight,
        minHeight: computedMinHeight,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: compact ? 12 : 14,
        perspective: is3DMode ? 1000 : undefined,
        background: '#eef4fb',
        boxShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.06)'
      }}
    >
      {/* Pure White 3D Liquid Glass HUD Pill */}
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
            background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9))',
            backdropFilter: 'blur(18px) saturate(190%)',
            border: '1.5px solid #ffffff',
            boxShadow: 'inset 0 1.5px 0 #ffffff, 0 10px 24px -8px rgba(15, 23, 42, 0.18)'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #6ee7b7, #10b981)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', color: '#0f172a' }}>
            {scopeTitle.toUpperCase()}
          </span>
          <span style={{ fontSize: 10.5, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '2px 7px', borderRadius: 999 }}>
            {Math.abs(Number(safeCenter[0])).toFixed(2)}°{Number(safeCenter[0]) >= 0 ? 'N' : 'S'}, {Math.abs(Number(safeCenter[1])).toFixed(2)}°{Number(safeCenter[1]) >= 0 ? 'E' : 'W'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
            <b style={{ color: '#059669' }}>{formatNumber(validVendors.length)}</b> pinned
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 850, letterSpacing: '0.04em', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 7px', borderRadius: 999 }}>
            KEYLESS · 0 API KEYS
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
          width: '100%',
          transform: is3DMode ? 'rotateX(24deg) scale(1.03)' : 'none',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        attributionControl={false}
        zoomControl={false}
      >
        {/* Locked 100% HD Satellite World Imagery + Crisp Place/Road Boundaries */}
        <TileLayer
          url={TILE_SATELLITE}
          attribution={TILE_ATTRIBUTION}
          maxNativeZoom={18}
          maxZoom={19}
        />
        <TileLayer
          url={TILE_SATELLITE_LABELS}
          attribution={TILE_ATTRIBUTION}
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

        {/* Always-On Live Hub-and-Spoke Vector Network over Satellite Terrain */}
        {coverage.length > 1 && Number.isFinite(safeCenter[0]) && Number.isFinite(safeCenter[1]) && coverage.map((zone, idx) => (
          <Polyline
            key={`spoke-${zone.index || idx}`}
            positions={[safeCenter, [zone.lat, zone.lng]]}
            pathOptions={{
              color: '#38bdf8',
              weight: scanning ? 2.0 : 1.5,
              opacity: scanning ? 0.65 : 0.45,
              dashArray: '5 7'
            }}
          />
        ))}

        {/* Territory Regions, Glowing Coverage Radar Rings & Animated Live Zone Beacons */}
        {coverage.map((zone, index) => {
          const norm = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanZoneName = norm(zone.name);
          const cleanActiveName = norm(activeZoneLabel);
          const isNameMatch = cleanActiveName && (cleanActiveName === cleanZoneName || cleanZoneName.includes(cleanActiveName) || cleanActiveName.includes(cleanZoneName));
          const isCoordMatch = Boolean(activePoint && Math.abs(zone.lat - activePoint[0]) < 0.005 && Math.abs(zone.lng - activePoint[1]) < 0.005);
          const isActive = scanning && (isNameMatch || isCoordMatch);
          const cellInfo = cellStates?.[zone.name] || null;
          const cellState = isActive ? 'scanning' : (cellInfo?.state || (zone.approximate ? 'approx' : 'queued'));
          const tone = cellState === 'scanning'
            ? '#06b6d4'
            : (cellState === 'saturated' || cellInfo?.splitDepth > 0)
              ? '#c084fc'
              : cellState === 'done'
                ? '#34d399'
                : (cellState === 'dry' || cellState === 'approx')
                  ? '#fbbf24'
                  : cellState === 'resting'
                    ? '#fb7185'
                    : '#38bdf8';

          return (
            <React.Fragment key={`zone-${zone.index || index}-${zone.name}`}>
              <Circle
                center={[zone.lat, zone.lng]}
                radius={Math.max(850, Math.min(8000, (zone.radiusKm || (zone.approximate ? 5 : 2.5)) * 1000))}
                eventHandlers={{
                  click: () => onSelectZone?.(zone.name)
                }}
                pathOptions={{
                  color: tone,
                  weight: cellState === 'scanning' ? 3.2 : cellState === 'saturated' || cellState === 'done' ? 2.4 : 1.7,
                  opacity: cellState === 'scanning' ? 1 : cellState === 'done' || cellState === 'saturated' ? 0.92 : 0.65,
                  fillColor: tone,
                  fillOpacity: cellState === 'scanning' ? 0.28 : cellState === 'saturated' ? 0.18 : cellState === 'done' ? 0.14 : 0.08,
                  dashArray: cellState === 'scanning' || cellState === 'done' ? undefined : '5 7'
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div style={{ padding: '2px 4px', fontWeight: 700, fontSize: 11 }}>
                    {cellState === 'scanning'
                      ? `⚡ SCANNING · ${zone.name}`
                      : cellState === 'saturated'
                        ? `🟣 SPLIT ↗ · ${zone.name} (${cellInfo?.leads || 0} leads)`
                        : cellState === 'done'
                          ? `✅ DONE · ${zone.name} (${cellInfo?.leads || 0} leads)`
                          : cellState === 'dry'
                            ? `🟡 LOW DENSITY · ${zone.name}`
                            : zone.approximate
                              ? `Area · ${zone.name}`
                              : `Covered Area · ${zone.name}`}
                  </div>
                </Tooltip>
              </Circle>
              {(!compact && index < 28 && !isActive) && (
                <Marker
                  position={[zone.lat, zone.lng]}
                  icon={zoneBeaconIcon(zone.name, cellState, cellInfo?.leads || 0)}
                  zIndexOffset={cellState === 'scanning' ? 950 : 250}
                  eventHandlers={{
                    click: () => onSelectZone?.(zone.name)
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

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

        {activePoint && scanning && (
          <>
            <Circle
              center={activePoint}
              radius={Math.max(1400, Math.min(6000, ((Number(activeZone?.radiusKm) || 3.5) * 1000)))}
              pathOptions={{
                color: '#38bdf8',
                fillColor: '#38bdf8',
                fillOpacity: 0.22,
                weight: 3,
                dashArray: '8, 8'
              }}
            />
            <Marker
              position={activePoint}
              icon={scanIcon}
              interactive={false}
              zIndexOffset={1200}
            />
          </>
        )}
      </MapContainer>

      {/* Floating White 3D Liquid Glass Map Control Bar */}
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
          background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.88))',
          padding: 6,
          borderRadius: 14,
          border: '1.5px solid #ffffff',
          boxShadow: 'inset 0 1.5px 0 #ffffff, 0 10px 26px -8px rgba(15, 23, 42, 0.2)',
          backdropFilter: 'blur(18px)'
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 2px 0 rgba(15,23,42,0.08)', borderRadius: 9, color: '#0F172A', cursor: 'pointer' }}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 2px 0 rgba(15,23,42,0.08)', borderRadius: 9, color: '#0F172A', cursor: 'pointer' }}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          title="Center Territory"
          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 2px 0 rgba(15,23,42,0.08)', borderRadius: 9, color: '#059669', cursor: 'pointer' }}
        >
          <Compass size={15} />
        </button>
        <button
          type="button"
          onClick={() => setIs3DMode(!is3DMode)}
          title={is3DMode ? '2D Flat View' : '3D Perspective Tilt'}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: is3DMode ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : '#ffffff',
            border: is3DMode ? '1px solid #4c1d95' : '1px solid rgba(15,23,42,0.1)',
            boxShadow: is3DMode ? '0 2px 0 #4c1d95' : '0 2px 0 rgba(15,23,42,0.08)',
            borderRadius: 9,
            color: is3DMode ? '#FFFFFF' : '#6d28d9',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 900 }}>3D</span>
        </button>
      </div>

      {/* Live Satellite Zone Radar Telemetry Pill */}
      <div className="lx-map-mode-bar">
        <span className="lx-map-mode-pill is-active">
          🛰️ HD SATELLITE LIVE RADAR · {formatNumber(coverage.length || 1)} ZONES
        </span>
      </div>

      {scanning && (
        <div className="v2-map-scan" style={{ background: '#ffffff', border: '1px solid #d1fae5', color: '#0f172a', boxShadow: '0 8px 24px rgba(15,23,42,0.1)' }}>
          <span className="v2-map-scan-radar"><i style={{ background: '#059669' }} /></span>
          <span className="v2-map-scan-copy">
            <b style={{ color: '#047857', letterSpacing: '0.06em' }}>SEARCHING AREA</b>
            <small style={{ color: '#475569', fontWeight: 600 }}>{activeZoneLabel || 'Finding nearby businesses…'}</small>
          </span>
        </div>
      )}

      {/* Scope and Status Overlay */}
      <div className="v2-map-overlay">
        <span className="v2-map-coord" style={{ background: 'rgba(255, 255, 255, 0.94)', color: '#0F172A', border: '1px solid #E2E8F0', fontWeight: 600 }}>
          <i className={scanning || points.length ? 'is-live' : ''} />
          {scanning ? 'SEARCHING AREA' : `${formatNumber(validVendors.length)} BUSINESSES IN ${scopeTitle.toUpperCase()}`}
        </span>
        {validVendors.length < vendors.filter(hasCoords).length && (
          <span className="v2-map-coord" style={{ background: 'rgba(255, 255, 255, 0.92)', color: '#64748B', border: '1px solid #E2E8F0' }}>
            TOP {MAX_MAP_PLOTTED_LEADS} SHOWN
          </span>
        )}
      </div>
    </div>
  );
}
