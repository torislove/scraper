import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
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

// 100% Free, Zero-Watermark, High-Resolution Autonomous Basemaps (No API Keys Ever Required)
const TILE_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_VOYAGER_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TILE_STREETS = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_LIGHT_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const TILE_LIGHT_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

    // Only pan if coordinate difference is genuine (> ~5km)
    if (distance > 0.045) {
      lastCenterRef.current = [targetLat, targetLng];
      const targetZoom = Math.max(map.getZoom() || 11, zoom || 11);
      try {
        if (distance > 1.5) {
          // Instantaneous jump across cities, states or continents
          map.setView(center, targetZoom, { animate: false });
        } else {
          // Snappy local pan
          map.panTo(center, { animate: true, duration: 0.3 });
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
      map.flyTo(activePoint, targetZoom, { animate: true, duration: 0.9 });
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

function InitialFit({ points, zonePoints = [], fitKey = 'default' }) {
  const map = useMap();
  const fittedKey = useRef(null);

  useEffect(() => {
    const targets = points.length ? points : zonePoints;
    if (!targets.length || fittedKey.current === fitKey) return;
    fittedKey.current = fitKey;
    if (targets.length === 1) {
      map.setView(targets[0], 12, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(targets);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: false });
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
  hoveredLeadId = null
}) {
  const mapRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [tileMode, setTileMode] = useState('streets'); // 'streets' (Esri World Street Map, Vibrant 100% Free & Zero Watermark) | 'osm' | 'satellite' | 'light' | 'dark'

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
  const computedMinHeight = compact ? 180 : (height === '100%' ? 180 : 340);

  return (
    <div
      className={cx('v2-map-shell', compact && 'is-compact', is3DMode && 'is-3d-perspective', className)}
      style={{
        height: computedHeight,
        minHeight: computedMinHeight,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: compact ? 10 : 14,
        perspective: is3DMode ? 1000 : undefined,
        background: '#0a101d',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
      }}
    >
      {/* Sleek Minimalist HUD Pill */}
      <div className="v2-map-hud-wrap" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, pointerEvents: 'none' }}>
        <div className="v2-map-hud-pill" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: 'rgba(10, 16, 26, 0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#f8fafc' }}>
            {scopeTitle.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#00f0ff', background: 'rgba(0, 240, 255, 0.1)', padding: '2px 6px', borderRadius: 6 }}>
            {Number(safeCenter[0]).toFixed(2)}°N, {Math.abs(Number(safeCenter[1])).toFixed(2)}°W
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
            <b style={{ color: '#10b981' }}>{formatNumber(validVendors.length)}</b> plotted
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
        {/* Layer 0: CartoDB Voyager — Crisp Vibrant Natural 3D (Default, Free, Zero Watermark) */}
        {tileMode === 'voyager' && (
          <TileLayer
            url={TILE_VOYAGER}
            attribution={TILE_VOYAGER_ATTRIBUTION}
            maxNativeZoom={19}
            maxZoom={20}
            subdomains={['a', 'b', 'c', 'd']}
          />
        )}

        {/* Layer 1: Pristine Executive White (Esri Canvas Light Gray + Crisp Labels) */}
        {tileMode === 'light' && (
          <>
            <TileLayer
              url={TILE_LIGHT_CANVAS}
              attribution={TILE_ATTRIBUTION}
              maxNativeZoom={16}
              maxZoom={19}
            />
            <TileLayer
              url={TILE_LIGHT_LABELS}
              attribution={TILE_ATTRIBUTION}
              maxNativeZoom={16}
              maxZoom={19}
              opacity={0.92}
            />
          </>
        )}

        {/* Layer 2: OpenStreetMap Standard (Full-Color Classic Roads) */}
        {tileMode === 'osm' && (
          <TileLayer
            url={TILE_OSM}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={19}
            maxZoom={19}
          />
        )}

        {/* Layer 3: Esri World Street Map (Detailed Topographic Street Infrastructure) */}
        {tileMode === 'streets' && (
          <TileLayer
            url={TILE_STREETS}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={18}
            maxZoom={19}
          />
        )}

        {/* Layer 4: Esri Satellite World Imagery (Photorealistic Aerial) */}
        {tileMode === 'satellite' && (
          <TileLayer
            url={TILE_SATELLITE}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={18}
            maxZoom={19}
          />
        )}

        {/* Layer 5: Night Tactical Mode (Esri Dark Canvas) */}
        {tileMode === 'dark' && (
          <TileLayer
            url={TILE_DARK_CANVAS}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={16}
            maxZoom={19}
          />
        )}

        <SmartMapController
          center={safeCenter}
          zoom={zoom}
          activePoint={activePoint}
          scanning={scanning}
        />

        {!compact && <InitialFit points={points} zonePoints={zonePoints} fitKey={fitKey} />}

        {/* Territory Regions & Active Scraping Scanning Circles */}
        {coverage.map((zone, index) => {
          const norm = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanZoneName = norm(zone.name);
          const cleanActiveName = norm(activeZoneLabel);
          const isNameMatch = cleanActiveName && (cleanActiveName === cleanZoneName || cleanZoneName.includes(cleanActiveName) || cleanActiveName.includes(cleanZoneName));
          const isCoordMatch = Boolean(activePoint && Math.abs(zone.lat - activePoint[0]) < 0.005 && Math.abs(zone.lng - activePoint[1]) < 0.005);
          const isActive = scanning && (isNameMatch || isCoordMatch);
          const tone = isActive ? '#10b981' : zone.approximate ? '#f59e0b' : '#6366f1';

          return (
            <Circle
              key={`zone-${zone.index || index}-${zone.name}`}
              center={[zone.lat, zone.lng]}
              radius={Math.max(1200, Math.min(8000, (zone.radiusKm || (zone.approximate ? 5 : 3.5)) * 1000))}
              eventHandlers={{
                click: () => onSelectZone?.(zone.name)
              }}
              pathOptions={{
                color: tone,
                weight: isActive ? 3 : 1.5,
                opacity: isActive ? 1 : zone.approximate ? 0.6 : 0.5,
                fillColor: tone,
                fillOpacity: isActive ? 0.22 : 0.06,
                dashArray: isActive ? undefined : zone.approximate ? '3 6' : '6 8'
              }}
            >
              <Tooltip direction="top" opacity={0.92}>
                <div style={{ padding: '2px 4px', fontWeight: 700, fontSize: 11 }}>
                  {isActive
                    ? `📡 ACTIVE SWARM · ${zone.name}`
                    : zone.approximate
                      ? `📍 Region · ${zone.name} (Estimated)`
                      : `🎯 Verified Zone · ${zone.name}`}
                </div>
              </Tooltip>
            </Circle>
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
                        <ExternalLink size={12} /> Open Lead
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
                        <MapPin size={12} /> Maps
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

      {/* Floating 3D Map Interactive Control Bar (Executive Light & Glass) */}
      <div
        className="v2-map-controls-floating"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.92)',
          padding: 6,
          borderRadius: 10,
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, color: '#0F172A', cursor: 'pointer' }}
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, color: '#0F172A', cursor: 'pointer' }}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          title="Center Territory"
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, color: '#0F172A', cursor: 'pointer' }}
        >
          <Compass size={15} />
        </button>
        <button
          type="button"
          onClick={() => setIs3DMode(!is3DMode)}
          title={is3DMode ? '2D Flat View' : '3D Perspective Tilt'}
          style={{
            width: 30,
            height: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: is3DMode ? '#7C3AED' : '#F1F5F9',
            border: is3DMode ? '1px solid #7C3AED' : '1px solid #E2E8F0',
            borderRadius: 6,
            color: is3DMode ? '#FFFFFF' : '#0F172A',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 900 }}>3D</span>
        </button>
        <button
          type="button"
          onClick={() => setTileMode(prev => {
            if (prev === 'light') return 'osm';
            if (prev === 'osm') return 'streets';
            if (prev === 'streets') return 'dark';
            return 'light';
          })}
          title={`Basemap Layer: ${tileMode.toUpperCase()} (Zero Watermark • Click to cycle)`}
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 6, color: '#0F172A', cursor: 'pointer' }}
        >
          <Layers size={14} />
        </button>
      </div>

      {scanning && (
        <div className="v2-map-scan" style={{ background: '#fffef8', border: '2px solid #8f8b71', color: '#232c1c', boxShadow: '0 2px 0 #8f8b71, 0 4px 0 rgba(38,48,31,0.08)' }}>
          <span className="v2-map-scan-radar"><i style={{ background: '#6f8c2c' }} /></span>
          <span className="v2-map-scan-copy">
            <b style={{ color: '#4f6619', letterSpacing: '0.08em' }}>LIVE SWARM SCAN</b>
            <small style={{ color: '#414c38', fontWeight: 700 }}>{activeZoneLabel || 'Mapping target territory…'}</small>
            {activePoint && (
              <span style={{ fontSize: 9, color: '#6e7863', fontFamily: 'monospace' }}>
                [{activePoint[0].toFixed(4)}, {activePoint[1].toFixed(4)}]
              </span>
            )}
          </span>
        </div>
      )}

      {/* Scope and Status Overlay */}
      <div className="v2-map-overlay">
        <span className="v2-map-coord" style={{ background: 'rgba(255, 255, 255, 0.94)', color: '#0F172A', border: '1px solid #E2E8F0', fontWeight: 600 }}>
          <i className={scanning || points.length ? 'is-live' : ''} />
          {scanning ? 'SCANNING TERRITORY' : `${formatNumber(validVendors.length)} LEADS IN ${scopeTitle.toUpperCase()}`}
        </span>
        <span className="v2-map-coord" style={{ background: 'rgba(255, 255, 255, 0.94)', color: '#059669', border: '1px solid #A7F3D0', fontWeight: 750 }}>
          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
          ZERO WATERMARK · 100% AUTONOMOUS 60FPS
        </span>
        {validVendors.length < vendors.filter(hasCoords).length && (
          <span className="v2-map-coord" style={{ background: 'rgba(255, 255, 255, 0.92)', color: '#64748B', border: '1px solid #E2E8F0' }}>
            TOP {MAX_MAP_PLOTTED_LEADS} PLOTTED
          </span>
        )}
      </div>
    </div>
  );
}
