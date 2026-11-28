/**
 * shared/cockpit/CityZonesExplorer.jsx
 * Live Multi-Country Zones Inspector:
 *  - Shows exact resolved zone count for ANY city across all 11 nations
 *  - Switches cleanly between Smart Coverage (0.8 km for mega cities) and All OSM Places
 *  - Opens a full searchable drawer to inspect, filter, or toggle individual zones
 */

import React, { useState, useMemo } from 'react';
import { MapPin, Layers, Search, X, Check, SlidersHorizontal, Compass } from 'lucide-react';
import { FlagSphere } from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';

export default function CityZonesExplorer({
  city = '',
  country = 'IN',
  zoneData = null,
  loading = false,
  zoneMode = 'smart',
  onChangeMode,
  effectiveZones = [],
  selectedZoneNames = null,
  onToggleZone,
  onSelectAllZones,
  onSetZoneSubset,
  onSweepSelected,
  scanning = false,
  showInlineBar = true,
  externalModalOpen = false,
  onCloseExternalModal
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isModalOpen = modalOpen || externalModalOpen;
  const closeModal = () => { setModalOpen(false); onCloseExternalModal?.(); };
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  const allResolved = zoneData?.zones || [];
  const totalAll = zoneData?.totalAllPlaces || allResolved.length;
  const smartCount = zoneData?.smartCount || allResolved.length;
  const areaKm2 = zoneData?.resolutionMeta?.areaKm2;
  const boundaryLabel = zoneData?.resolutionMeta?.boundarySource || 'Municipal Zones';

  const filteredZones = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allResolved.filter((z) => {
      if (tagFilter === 'major' && !['suburb', 'borough', 'ward', 'quarter'].includes(z.placeTag)) {
        return false;
      }
      if (q && !z.name.toLowerCase().includes(q) && !(z.placeTag || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allResolved, searchTerm, tagFilter]);

  if (!city?.trim()) return null;

  return (
    <>
      {showInlineBar && (
      <div
        className="lp-glass-subtle"
        style={{
          padding: '8px 12px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          borderColor: 'rgba(2, 132, 199, 0.22)'
        }}
      >
        {/* Left: Live Resolved Zone Count + Preview Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: '1 1 320px' }}>
          <span
            className="lp-tabular"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 10,
              background: '#f0f9ff',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              color: '#0369a1',
              fontSize: 11.5,
              fontWeight: 800
            }}
          >
            <FlagSphere code={country} size={14} />
            {loading ? (
              <span>Resolving {city} zones…</span>
            ) : (
              <span>
                {effectiveZones.length.toLocaleString()} {effectiveZones.length === 1 ? 'Zone' : 'Zones'} in {zoneData?.cityName || city}
                {zoneMode === 'smart' && totalAll > smartCount ? ` (${totalAll.toLocaleString()} OSM places)` : ''}
              </span>
            )}
          </span>

          {!loading && areaKm2 > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-3)' }}>
              {boundaryLabel} · {areaKm2.toLocaleString()} km²
            </span>
          )}

          {!loading && allResolved.slice(0, 6).map((z) => (
            <span
              key={z.name}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                color: 'var(--lp-ink-2)'
              }}
            >
              {z.name}
            </span>
          ))}

          {!loading && allResolved.length > 6 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-4)' }}>
              +{allResolved.length - 6} more
            </span>
          )}
        </div>

        {/* Right: Mode Switch + Browse All Modal Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {totalAll > smartCount && (
            <div style={{ display: 'inline-flex', padding: 2, borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)' }}>
              <button
                type="button"
                disabled={scanning || loading}
                onClick={() => onChangeMode?.('smart')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: zoneMode === 'smart' ? '#fffbeb' : 'transparent',
                  color: zoneMode === 'smart' ? '#92400e' : '#64748b'
                }}
              >
                Smart ({smartCount})
              </button>
              <button
                type="button"
                disabled={scanning || loading}
                onClick={() => onChangeMode?.('all')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: zoneMode === 'all' ? '#0284c7' : 'transparent',
                  color: zoneMode === 'all' ? '#ffffff' : '#64748b'
                }}
              >
                All Places ({totalAll})
              </button>
            </div>
          )}

          {allResolved.length > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                borderRadius: 10,
                fontSize: 11.5,
                fontWeight: 800,
                background: '#fffbeb',
                color: '#92400e',
                border: '1px solid rgba(217, 119, 6, 0.34)',
                cursor: 'pointer'
              }}
            >
              <SlidersHorizontal size={12} /> View All {allResolved.length} Zones
            </button>
          )}
        </div>
      </div>
      )}

      {/* Full Searchable Multi-Zone Inspector & Custom Selector Modal */}
      {isModalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15, 23, 42, 0.38)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            className="lp-glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 880,
              maxHeight: '86vh',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: 'var(--lp-shadow-3)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FlagSphere code={country} size={28} active />
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>
                    {zoneData?.cityName || city} ({country}) — {allResolved.length.toLocaleString()} Municipal Zones
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--lp-ink-3)' }}>
                    {boundaryLabel} · Inspect or toggle wards before launching your sweep
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close Zone Explorer"
                style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: '#f8fafc', color: '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.12)' }}>
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Filter ${allResolved.length} zones in ${zoneData?.cityName || city}…`}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }}
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setTagFilter((p) => (p === 'all' ? 'major' : 'all'))}
                style={{
                  padding: '7px 11px',
                  borderRadius: 10,
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: tagFilter === 'major' ? '#0284c7' : '#ffffff',
                  color: tagFilter === 'major' ? '#ffffff' : 'var(--lp-ink-2)',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  cursor: 'pointer'
                }}
              >
                <Layers size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {tagFilter === 'major' ? 'Major Suburbs Only' : 'All Place Types'}
              </button>

              {totalAll > smartCount && (
                <button
                  type="button"
                  onClick={() => onChangeMode?.(zoneMode === 'all' ? 'smart' : 'all')}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 10,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: zoneMode === 'all' ? '#fffbeb' : '#ffffff',
                    color: '#92400e',
                    border: '1px solid rgba(217, 119, 6, 0.34)',
                    cursor: 'pointer'
                  }}
                >
                  {zoneMode === 'all' ? `Switch to Smart (${smartCount})` : `Load All ${totalAll} Places`}
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectAllZones?.()}
                style={{ padding: '7px 11px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15, 23, 42, 0.1)', cursor: 'pointer' }}
              >
                Select All
              </button>

              {searchTerm.trim() && filteredZones.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSetZoneSubset?.(filteredZones.map((z) => z.name))}
                  style={{ padding: '7px 11px', borderRadius: 10, fontSize: 11.5, fontWeight: 700, background: '#ecfdf5', color: '#047857', border: '1px solid rgba(5, 150, 105, 0.25)', cursor: 'pointer' }}
                >
                  Only These {filteredZones.length}
                </button>
              )}
            </div>

            {/* Scrollable Zones Grid */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 8, padding: '2px 0' }}>
              {filteredZones.map((z, idx) => {
                const checked = !selectedZoneNames || selectedZoneNames.has(z.name);
                return (
                  <button
                    key={`${z.name}-${idx}`}
                    type="button"
                    onClick={() => onToggleZone?.(z.name)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: checked ? '#ffffff' : '#f8fafc',
                      border: `1.5px solid ${checked ? 'rgba(217, 119, 6, 0.38)' : 'rgba(15, 23, 42, 0.08)'}`,
                      opacity: checked ? 1 : 0.55,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--lp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {z.name}
                      </span>
                      <span style={{ width: 16, height: 16, borderRadius: 5, background: checked ? '#d97706' : '#e2e8f0', color: '#ffffff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {checked && <Check size={11} />}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--lp-ink-4)', fontFamily: 'var(--lp-font-mono)' }}>
                      <span><MapPin size={9} style={{ verticalAlign: 'middle' }} /> {z.placeTag || 'ward'}</span>
                      <span>{Number(z.lat).toFixed(3)}, {Number(z.lng).toFixed(3)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(15, 23, 42, 0.08)', flexWrap: 'wrap', gap: 10 }}>
              <span className="lp-tabular" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--lp-ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Compass size={14} color="#d97706" />
                Active for Sweep: <b>{effectiveZones.length.toLocaleString()}</b> of {allResolved.length.toLocaleString()} zones
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <LiquidButton variant="glass-gold" size="sm" onClick={closeModal}>
                  Done
                </LiquidButton>
                {onSweepSelected && !scanning && (
                  <LiquidButton
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      closeModal();
                      onSweepSelected(selectedZoneNames ? effectiveZones : undefined);
                    }}
                  >
                    Sweep {effectiveZones.length.toLocaleString()} Zones
                  </LiquidButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
