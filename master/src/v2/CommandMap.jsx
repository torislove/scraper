import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, MapPin, Phone, Star } from 'lucide-react';
import { cx, formatNumber } from './ui';

const INDIA_CENTER = [22.5937, 79.9629];
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const TILE_REFERENCE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

function hasCoords(vendor) {
  const lat = Number(vendor.latitude);
  const lng = Number(vendor.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

function vendorIcon(vendor) {
  const phone = vendor?.phone || (Array.isArray(vendor?.phones) && vendor.phones.length > 0 ? vendor.phones[0] : null);
  const tone = vendor.verified ? 'verified' : phone ? 'phone' : 'cold';
  return L.divIcon({
    className: 'v2-map-pin-wrap',
    html: `
      <span class="v2-map-pin tone-${tone}">
        <span class="v2-map-pin-pulse"></span>
        <span class="v2-map-pin-core"></span>
      </span>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16]
  });
}

function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count > 200 ? 58 : count > 40 ? 50 : 42;
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

function MapReady({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(id);
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!center || !Number.isFinite(Number(center[0])) || !Number.isFinite(Number(center[1]))) return;
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);

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
    iconSize: [140, 140],
    iconAnchor: [70, 70]
  });
}

function LiveFocus({ activePoint, scanning }) {
  const map = useMap();

  useEffect(() => {
    if (!scanning || !activePoint) return;
    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo(activePoint, targetZoom, { animate: true, duration: 1.4 });
  }, [activePoint?.[0], activePoint?.[1], scanning, map]);

  return null;
}

function InitialFit({ points }) {
  const map = useMap();
  const fitted = React.useRef(false);

  useEffect(() => {
    if (fitted.current || !points.length) return;
    fitted.current = true;
    if (points.length === 1) {
      map.setView(points[0], 11, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12, animate: false });
  }, [map, points]);

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
  className = '',
  compact = false
}) {
  const points = useMemo(
    () => vendors.filter(hasCoords).map(v => [Number(v.latitude), Number(v.longitude)]),
    [vendors]
  );

  const coverage = useMemo(
    () => zones.map((zone, index) => ({
      name: zone.zoneName || zone.name || `Zone ${index + 1}`,
      lat: Number(zone.lat),
      lng: Number(zone.lng),
      index: zone.index || index + 1
    })).filter(zone => Number.isFinite(zone.lat) && Number.isFinite(zone.lng)),
    [zones]
  );

  const activePoint = useMemo(() => {
    const lat = Number(activeZone?.lat);
    const lng = Number(activeZone?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 6 || lat > 38 || lng < 68 || lng > 98) return null;
    return [lat, lng];
  }, [activeZone]);

  const safeCenter = useMemo(() => {
    const lat = Number(center?.[0]);
    const lng = Number(center?.[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : INDIA_CENTER;
  }, [center]);

  return (
    <div className={cx('v2-map-shell', compact && 'is-compact', className)} style={{ height }}>
      <MapContainer
        center={safeCenter}
        zoom={zoom}
        scrollWheelZoom
        preferCanvas
        className="v2-map"
        attributionControl={!compact}
        zoomControl={!compact}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxNativeZoom={16} maxZoom={19} />
        <TileLayer url={TILE_REFERENCE_URL} maxNativeZoom={16} maxZoom={19} opacity={0.85} />
        <MapReady center={safeCenter} zoom={zoom} />
        <LiveFocus activePoint={activePoint} scanning={scanning} />
        {!compact && <InitialFit points={points} />}

        {coverage.map((zone, index) => {
          const isActive = scanning && activeZone?.name === zone.name;
          return (
            <Circle
              key={`zone-${zone.index || index}-${zone.name}`}
              center={[zone.lat, zone.lng]}
              radius={5000}
              pathOptions={{
                color: isActive ? '#10b981' : '#06b6d4',
                weight: isActive ? 2.5 : 1.2,
                opacity: isActive ? 0.95 : 0.45,
                fillColor: isActive ? '#10b981' : '#06b6d4',
                fillOpacity: isActive ? 0.16 : 0.05,
                dashArray: isActive ? undefined : '5 7'
              }}
            >
              <Tooltip direction="top" opacity={0.9}>{isActive ? `📡 5KM SCAN · ${zone.name}` : `5km Zone · ${zone.name}`}</Tooltip>
            </Circle>
          );
        })}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={54}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          iconCreateFunction={clusterIcon}
        >
          {vendors.filter(hasCoords).map(vendor => (
            <Marker
              key={vendor.id}
              position={[Number(vendor.latitude), Number(vendor.longitude)]}
              icon={vendorIcon(vendor)}
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
                      <small>{vendor.category || 'Uncategorised'}</small>
                    </span>
                  </div>
                  <div className="v2-map-popup-meta">
                    <span><MapPin size={12} /> {vendor.city || vendor.district || vendor.state || 'Location unknown'}</span>
                    {vendor.rating != null && (
                      <span><Star size={12} /> {Number(vendor.rating).toFixed(1)} {vendor.reviewsCount ? `(${formatNumber(vendor.reviewsCount)})` : ''}</span>
                    )}
                    {(vendor.phone || (Array.isArray(vendor.phones) && vendor.phones[0])) && (
                      <span><Phone size={12} /> {vendor.phone || (typeof vendor.phones[0] === 'string' ? vendor.phones[0] : vendor.phones[0].e164)}</span>
                    )}
                  </div>
                  <div className="v2-map-popup-actions">
                    {onSelect && (
                      <button type="button" onClick={() => onSelect(vendor)}>
                        <ExternalLink size={12} /> Open profile
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
            icon={scanTargetIcon()}
            interactive={false}
            zIndexOffset={1200}
          />
        )}
      </MapContainer>

      {scanning && (
        <div className="v2-map-scan">
          <span className="v2-map-scan-radar"><i /></span>
          <span className="v2-map-scan-copy">
            <b>LIVE SCAN</b>
            <small>{activeZone?.name || 'Acquiring zone…'}</small>
          </span>
        </div>
      )}

      <div className="v2-map-overlay">
        <span className="v2-map-coord">
          <i className={scanning || points.length ? 'is-live' : ''} />
          {scanning ? 'SCANNING' : `${formatNumber(vendors.length)} PLOTTED`}
        </span>
        <span className="v2-map-coord">
          {formatNumber(points.length)} GEO-ANCHORED
        </span>
      </div>
    </div>
  );
}
