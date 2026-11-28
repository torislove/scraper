/**
 * shared/cockpit/TerritoryMapPanel.jsx
 * Lightweight, Zero-API-Key Single-View Lead Map (CARTO Positron / OpenStreetMap + Leaflet Canvas).
 * Supports both Split (42% cockpit panel) and Map (100%) modes with up to 1,500+ leads rendered at 60 FPS.
 * Strictly <= 300 lines.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Plus, Minus, LocateFixed, MapPin } from 'lucide-react';
import { getCountryByCode } from '../data/countries';
import { FlagSphere } from '../ui/FlagChip';

const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const OSM_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function TerritoryMapPanel({
  vendors = [],
  plannedZones = [],
  country = 'IN',
  city = '',
  activePoint = null,
  scanning = false,
  selectedVendor = null,
  onSelectVendor
}) {
  const countryMeta = useMemo(() => getCountryByCode(country), [country]);
  const mapBoxRef = useRef(null);
  const mapRef = useRef(null);
  const canvasRendererRef = useRef(null);
  const leadLayerRef = useRef(null);
  const activeLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const autoFittedCityRef = useRef('');
  const [hoveredLead, setHoveredLead] = useState(null);

  const validLeads = useMemo(() => {
    const out = [];
    const list = Array.isArray(vendors) ? vendors : [];
    for (let i = 0; i < list.length && out.length < 1500; i += 1) {
      const v = list[i];
      const lat = Number(v.lat ?? v.latitude);
      const lng = Number(v.lng ?? v.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01)) {
        out.push({
          id: v.id || `${v.name}-${i}`,
          vendor: v,
          lat,
          lng,
          hasMobile: Boolean(v.mobilePhone || v.isMobile)
        });
      }
    }
    return out;
  }, [vendors]);

  const fallbackCenter = useMemo(() => {
    const z0 = Array.isArray(plannedZones) ? plannedZones.find((z) => Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng))) : null;
    if (z0) return [Number(z0.lat), Number(z0.lng)];
    if (activePoint?.lat && activePoint?.lng) return [Number(activePoint.lat), Number(activePoint.lng)];
    return [countryMeta.centroid.lat, countryMeta.centroid.lng];
  }, [plannedZones, activePoint, countryMeta]);

  const fitViewToData = (map) => {
    if (!map) return;
    if (validLeads.length > 0) {
      const bounds = L.latLngBounds(validLeads.slice(0, 300).map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: true });
      return;
    }
    const zCoords = (Array.isArray(plannedZones) ? plannedZones : [])
      .filter((z) => Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng)))
      .slice(0, 200)
      .map((z) => [Number(z.lat), Number(z.lng)]);
    if (zCoords.length > 1) {
      map.fitBounds(L.latLngBounds(zCoords), { padding: [24, 24], maxZoom: 13, animate: false });
    } else {
      map.setView(fallbackCenter, city ? 12 : (countryMeta.centroid.zoom || 5));
    }
  };

  // Initialize lightweight single-view Leaflet canvas map once
  useEffect(() => {
    if (!mapBoxRef.current || mapRef.current) return undefined;

    const map = L.map(mapBoxRef.current, {
      center: fallbackCenter,
      zoom: city ? 12 : (countryMeta.centroid.zoom || 5),
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    });

    let switchedToOsm = false;
    const tiles = L.tileLayer(CARTO_LIGHT, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    tiles.on('tileerror', () => {
      if (!switchedToOsm) {
        switchedToOsm = true;
        tiles.setUrl(OSM_FALLBACK);
      }
    });

    const renderer = L.canvas({ padding: 0.4 });
    const leadLayer = L.layerGroup().addTo(map);
    const activeLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tiles;
    canvasRendererRef.current = renderer;
    leadLayerRef.current = leadLayer;
    activeLayerRef.current = activeLayer;

    // Keep Split <-> Map toggles crisp without clipped or grey tiles
    const ro = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => map.invalidateSize({ animate: false }))
      : null;
    ro?.observe(mapBoxRef.current);

    return () => {
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      leadLayerRef.current = null;
      activeLayerRef.current = null;
      tileLayerRef.current = null;
      canvasRendererRef.current = null;
    };
  }, []);

  // Re-center once when city / country switches
  useEffect(() => {
    const key = `${country}::${city}::${plannedZones?.length || 0}`;
    if (!mapRef.current || autoFittedCityRef.current === key) return;
    autoFittedCityRef.current = key;
    fitViewToData(mapRef.current);
  }, [country, city, plannedZones]);

  // Render live Canvas markers cleanly whenever leads or selection change
  useEffect(() => {
    const map = mapRef.current;
    const layer = leadLayerRef.current;
    const renderer = canvasRendererRef.current;
    if (!map || !layer || !renderer) return;

    layer.clearLayers();
    for (const p of validLeads) {
      const isSelected = Boolean(selectedVendor && (selectedVendor === p.vendor || selectedVendor.id === p.vendor.id));
      const color = isSelected ? '#0284c7' : p.hasMobile ? '#059669' : '#d97706';

      const marker = L.circleMarker([p.lat, p.lng], {
        renderer,
        radius: isSelected ? 7.5 : 5,
        color: '#ffffff',
        weight: isSelected ? 2 : 1.25,
        fillColor: color,
        fillOpacity: isSelected ? 0.96 : 0.85
      });

      marker.on('mouseover', () => setHoveredLead(p));
      marker.on('mouseout', () => setHoveredLead((prev) => (prev?.id === p.id ? null : prev)));
      marker.on('click', () => {
        setHoveredLead(p);
        onSelectVendor?.(p.vendor);
      });
      marker.addTo(layer);
    }

    if (selectedVendor) {
      const sLat = Number(selectedVendor.lat ?? selectedVendor.latitude);
      const sLng = Number(selectedVendor.lng ?? selectedVendor.longitude);
      if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
        map.panTo([sLat, sLng], { animate: true });
      }
    }
  }, [validLeads, selectedVendor, onSelectVendor]);

  // Subtle active sweeping zone ring
  useEffect(() => {
    const layer = activeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!scanning || !activePoint?.lat || !activePoint?.lng) return;

    L.circleMarker([Number(activePoint.lat), Number(activePoint.lng)], {
      radius: 14,
      color: '#f59e0b',
      weight: 1.5,
      fillColor: '#f59e0b',
      fillOpacity: 0.16,
      interactive: false
    }).addTo(layer);
  }, [scanning, activePoint]);

  const activeCard = hoveredLead || (selectedVendor ? validLeads.find((p) => p.vendor === selectedVendor || p.vendor.id === selectedVendor.id) : null);

  return (
    <div
      className="lp-glass-subtle"
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 320,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(217, 119, 6, 0.24)'
      }}
    >
      {/* Compact Single Map Bar */}
      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(15, 23, 42, 0.07)', background: 'rgba(255, 255, 255, 0.92)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <FlagSphere code={country} size={20} active />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--lp-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {city || countryMeta.defaultCity} · {countryMeta.name}
            </div>
            <div className="lp-tabular" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--lp-ink-4)', fontFamily: 'var(--lp-font-mono)' }}>
              {validLeads.length.toLocaleString()} leads plotted · Free OSM/CARTO View
            </div>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button" onClick={() => mapRef.current?.zoomIn()} title="Zoom in"
            style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <Plus size={13} />
          </button>
          <button
            type="button" onClick={() => mapRef.current?.zoomOut()} title="Zoom out"
            style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <Minus size={13} />
          </button>
          <button
            type="button" onClick={() => fitViewToData(mapRef.current)} title="Fit leads"
            style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#ffffff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <LocateFixed size={13} />
          </button>
        </div>
      </div>

      {/* Single Lightweight Map Container */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={mapBoxRef} style={{ width: '100%', height: '100%', background: '#f8fafc' }} />

        {validLeads.length === 0 && !scanning && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 400, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(15,23,42,0.1)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--lp-ink-3)', pointerEvents: 'none' }}>
            <Compass size={13} color="#d97706" /> Coordinates plot here live as leads stream
          </div>
        )}

        {activeCard && (
          <div
            className="lp-glass"
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 12,
              padding: '8px 12px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              zIndex: 450
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--lp-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeCard.vendor.name || activeCard.vendor.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--lp-ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={10} color="#d97706" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                  {activeCard.vendor.zone || activeCard.vendor.locality || activeCard.vendor.address || city}
                  {(activeCard.vendor.mobilePhone || activeCard.vendor.phone) ? ` · ${activeCard.vendor.mobilePhone || activeCard.vendor.phone}` : ''}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: activeCard.hasMobile ? '#ecfdf5' : '#fffbeb', color: activeCard.hasMobile ? '#047857' : '#92400e', flexShrink: 0 }}>
              {activeCard.hasMobile ? 'MOB' : 'LISTED'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
