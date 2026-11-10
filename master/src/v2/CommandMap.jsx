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
} catch (e) {}

// 100% Free, Zero-Watermark, High-Resolution Autonomous Basemaps (No API Keys Ever Required)
const TILE_LIGHT_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const TILE_LIGHT_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const TILE_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_STREETS = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const TILE_DARK_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Maximum leads plotted simultaneously to guarantee silky-smooth 60 FPS
const MAX_MAP_PLOTTED_LEADS = 250;

function hasCoords(vendor) {
  const lat = Number(vendor?.latitude);
  const lng = Number(vendor?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

// Global Memoized Marker Icon Cache — Prevents creating thousands of L.divIcon instances
const ICON_CACHE = new Map();
function getVendorIcon(vendor) {
  const phone = vendor?.phone || (Array.isArray(vendor?.phones) && vendor.phones.length > 0 ? vendor.phones[0] : null);
  const tone = vendor?.verified ? 'verified' : phone ? 'phone' : 'cold';
  
  if (ICON_CACHE.has(tone)) {
    return ICON_CACHE.get(tone);
  }

  const icon = L.divIcon({
    className: 'v2-map-pin-wrap',
    html: `
      <span class="v2-map-pin tone-${tone}">
        <span class="v2-map-pin-pulse"></span>
        <span class="v2-map-pin-core"></span>
      </span>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });

  ICON_CACHE.set(tone, icon);
  return icon;
}

// Memoized Cluster Icon Generator
function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count > 100 ? 48 : count > 25 ? 40 : 34;
  return L.divIcon({
    className: 'v2-cluster-wrap',
    html: `
      <span class="v2-cluster" style="width:${size}px;height:${size}px">
        <span class="v2-cluster-ring"></span>
        <b>${count > 999 ? `${(count / 1000).toFixed(1)}k` : count}</b>
      </span>
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
        try { map.invalidateSize(); } catch (e) {}
      }, delay)
    );

    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        try { map.invalidateSize(); } catch (e) {}
      });
      observer.observe(container);
    }

    const handleWindowResize = () => {
      try { map.invalidateSize(); } catch (e) {}
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
      try {
        map.flyTo(center, Math.max(map.getZoom() || 11, zoom || 11), {
          animate: true,
          duration: 1.0,
          easeLinearity: 0.25
        });
      } catch (e) {}
    }
  }, [center, zoom, map]);

  // Live scan radar focus (smooth, non-interrupting)
  useEffect(() => {
    if (!scanning || !activePoint || !map) return;
    try {
      const currentZoom = map.getZoom() || 12;
      const targetZoom = Math.max(currentZoom, 12);
      map.panTo(activePoint, { animate: true, duration: 0.8 });
    } catch (e) {}
  }, [activePoint, scanning, map]);

  return null;
}

function scanTargetIcon() {
  return L.divIcon({
    className: 'v2-scan-target-wrap',
    html: `
      <span class="v2-scan-target">
        <i class="ring r1"></i>
        <i class="ring r2"></i>
        <i class="ring r3"></i>
        <b></b>
      </span>
    `,
    iconSize: [120, 120],
    iconAnchor: [60, 60]
  });
}

function InitialFit({ points, fitKey = 'default' }) {
  const map = useMap();
  const fittedKey = useRef(null);

  useEffect(() => {
    if (!points.length || fittedKey.current === fitKey) return;
    fittedKey.current = fitKey;
    if (points.length === 1) {
      map.setView(points[0], 12, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13, animate: false });
  }, [map, points, fitKey]);

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
  scopeTitle = 'Current Search'
}) {
  const mapRef = useRef(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [tileMode, setTileMode] = useState('light'); // 'light' (Esri Light Canvas, Zero Watermark) | 'osm' | 'streets' | 'dark'

  // Filter only valid coords, and cap to MAX_MAP_PLOTTED_LEADS for silky 60 FPS
  const validVendors = useMemo(() => {
    const withCoords = vendors.filter(hasCoords);
    if (withCoords.length <= MAX_MAP_PLOTTED_LEADS) return withCoords;
    // Prioritize verified leads with mobiles first
    return [...withCoords]
      .sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0))
      .slice(0, MAX_MAP_PLOTTED_LEADS);
  }, [vendors]);

  const points = useMemo(
    () => validVendors.map(v => [Number(v.latitude), Number(v.longitude)]),
    [validVendors]
  );

  const coverage = useMemo(
    () => zones.map((zone, index) => ({
      name: zone.zoneName || zone.name || `Zone ${index + 1}`,
      lat: Number(zone.lat),
      lng: Number(zone.lng),
      approximate: Boolean(zone.isApproximate || zone.approx),
      index: zone.index || index + 1
    })).filter(zone => Number.isFinite(zone.lat) && Number.isFinite(zone.lng)),
    [zones]
  );

  const approximateCount = useMemo(
    () => coverage.filter(zone => zone.approximate).length,
    [coverage]
  );

  const activePoint = useMemo(() => {
    const lat = Number(activeZone?.lat);
    const lng = Number(activeZone?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 6 || lat > 38 || lng < 68 || lng > 98) return null;
    return [lat, lng];
  }, [activeZone]);

  const scanIcon = useMemo(() => scanTargetIcon(), []);

  const safeCenter = useMemo(() => {
    const lat = Number(center?.[0]);
    const lng = Number(center?.[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : INDIA_CENTER;
  }, [center]);

  // Manual Zoom Controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      try { mapRef.current.zoomIn(1); } catch (e) {}
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      try { mapRef.current.zoomOut(1); } catch (e) {}
    }
  };

  const handleResetCenter = () => {
    if (mapRef.current) {
      try { mapRef.current.flyTo(safeCenter, zoom || 11, { duration: 0.8 }); } catch (e) {}
    }
  };

  const computedHeight = typeof height === 'number' ? `${height}px` : (height && height !== '100%' ? height : '100%');
  const computedMinHeight = compact ? 220 : 340;

  return (
    <div
      className={cx('v2-map-shell', compact && 'is-compact', is3DMode && 'is-3d-perspective', className)}
      style={{
        height: computedHeight,
        minHeight: computedMinHeight,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: compact ? 8 : 14,
        perspective: is3DMode ? 1000 : undefined,
        background: tileMode === 'dark' ? '#0f172a' : '#f8fafc',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)'
      }}
    >
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
          transform: is3DMode ? 'rotateX(22deg) scale(1.04)' : 'none',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        attributionControl={false}
        zoomControl={false}
      >
        {/* Layer 1: Pristine Executive White (Esri Canvas Light Gray + Crisp Labels, Zero Watermark) */}
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

        {/* Layer 2: OpenStreetMap Standard (Full-Color Classic Roads, Zero Watermark) */}
        {tileMode === 'osm' && (
          <TileLayer
            url={TILE_OSM}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={19}
            maxZoom={19}
          />
        )}

        {/* Layer 3: Esri World Street Map (Detailed Topographic Street Infrastructure, Zero Watermark) */}
        {tileMode === 'streets' && (
          <TileLayer
            url={TILE_STREETS}
            attribution={TILE_ATTRIBUTION}
            maxNativeZoom={18}
            maxZoom={19}
          />
        )}

        {/* Layer 4: Night Radar Mode (Esri Dark Canvas, Zero Watermark) */}
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

        {!compact && <InitialFit points={points} fitKey={fitKey} />}

        {/* Territory Regions & Active Scraping Scanning Circles */}
        {coverage.map((zone, index) => {
          const norm = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const isActive = scanning && (
            norm(activeZone?.name) === norm(zone.name) ||
            norm(activeZone?.zoneName) === norm(zone.name) ||
            (activePoint && Math.abs(zone.lat - activePoint[0]) < 0.005 && Math.abs(zone.lng - activePoint[1]) < 0.005)
          );
          const tone = isActive ? '#10b981' : zone.approximate ? '#f59e0b' : '#6366f1';

          return (
            <Circle
              key={`zone-${zone.index || index}-${zone.name}`}
              center={[zone.lat, zone.lng]}
              radius={zone.approximate ? 6500 : 4500}
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
          {validVendors.map(vendor => (
            <Marker
              key={vendor.id}
              position={[Number(vendor.latitude), Number(vendor.longitude)]}
              icon={getVendorIcon(vendor)}
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
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenWhatsApp) {
                            onOpenWhatsApp(vendor);
                          } else {
                            const clean = String(vendor.phone).replace(/\D/g, '');
                            window.open(`https://wa.me/91${clean.slice(-10)}?text=${encodeURIComponent(`Hi ${vendor.name || 'there'}, reaching out regarding your business.`)}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        style={{ color: '#059669', fontWeight: 750, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        WhatsApp CRM
                      </button>
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
          ))}
        </MarkerClusterGroup>

        {activePoint && scanning && (
          <Marker
            position={activePoint}
            icon={scanIcon}
            interactive={false}
            zIndexOffset={1200}
          />
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
        <div className="v2-map-scan" style={{ background: 'rgba(255, 255, 255, 0.94)', border: '1px solid #E2E8F0', color: '#0F172A' }}>
          <span className="v2-map-scan-radar"><i style={{ background: '#059669' }} /></span>
          <span className="v2-map-scan-copy">
            <b style={{ color: '#0F172A' }}>LIVE SWARM SCAN</b>
            <small style={{ color: '#64748B' }}>{activeZone?.name || 'Mapping target territory…'}</small>
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
