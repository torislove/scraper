/**
 * master/src/v2/components/MasterTerritoryExplorer.jsx
 * Hierarchical District & State Inspector Modal for Master Fleet.
 * Displays ordered execution:
 *   [1] District HQ Urban Wards -> [2] Towns & Municipalities -> [3] Mandals / Sub-Divisions
 *   and across every District when sweeping a whole State.
 */

import React, { useState } from 'react';
import { X, MapPin, Building2, CheckSquare, Play, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import LiquidButton from '@shared/ui/LiquidButton';

const STAGE_STYLE = {
  hq_wards: { bg: '#fffbeb', color: '#92400e', border: 'rgba(217,119,6,0.28)', label: '1. HQ Urban Wards' },
  towns: { bg: '#ecfdf5', color: '#047857', border: 'rgba(5,150,105,0.25)', label: '2. Towns' },
  mandals: { bg: '#f0f9ff', color: '#0369a1', border: 'rgba(2,132,199,0.24)', label: '3. Mandals / Sub-Divs' }
};

export default function MasterTerritoryExplorer({
  isOpen = false,
  onClose,
  territory,
  loading = false,
  labels,
  effectiveZones = [],
  selectedZoneNames = null,
  onToggleZone,
  onSelectAllZones,
  onSweepSelected,
  scanning = false
}) {
  const [expandedDistricts, setExpandedDistricts] = useState({});
  if (!isOpen) return null;

  const districts = territory?.districts || [];
  const selectedSet = selectedZoneNames ? new Set(selectedZoneNames) : null;
  const activeCount = selectedSet ? selectedSet.size : effectiveZones.length;

  const toggleDist = (name) => {
    setExpandedDistricts((p) => ({ ...p, [name]: p[name] === false }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="lp-glass-subtle" style={{ width: 'min(920px, 100%)', maxHeight: '86vh', background: '#ffffff', borderRadius: 20, border: '1px solid rgba(15,23,42,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217,119,6,0.28)' }}>
              <Layers size={17} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--lp-ink)' }}>
                {territory?.locationName || 'Master Territory'} · {territory?.scope === 'state' ? `${labels?.level1 || 'State'} Full Sweep` : `${labels?.level2 || 'District'} Sweep`}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--lp-ink-4)' }}>
                {territory?.counts
                  ? `${territory.counts.districts || 1} ${labels?.level2 || 'District'}(s) · ${territory.counts.hqWards || 0} HQ Wards → ${territory.counts.towns || 0} Towns → ${territory.counts.mandals || 0} ${labels?.level3 || 'Mandals'}`
                  : 'Resolving administrative territory hierarchy…'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={onSelectAllZones} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.12)', background: '#f8fafc', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckSquare size={12} /> Select All ({effectiveZones.length})
            </button>
            {onSweepSelected && !scanning && activeCount > 0 && (
              <LiquidButton variant="gold" size="sm" icon={Play} onClick={() => { onSweepSelected(selectedZoneNames || effectiveZones); onClose?.(); }}>
                Sweep {activeCount} Zones
              </LiquidButton>
            )}
            <button type="button" onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--lp-ink-4)' }}>Resolving Districts, HQ Urban Wards, Towns & {labels?.level3 || 'Mandals'}…</div>}

          {!loading && districts.map((dist, dIdx) => {
            const isOpenDist = expandedDistricts[dist.districtName] !== false;
            const grouped = { hq_wards: [], towns: [], mandals: [] };
            for (const z of dist.zones || []) {
              if (grouped[z.stage]) grouped[z.stage].push(z);
              else grouped.mandals.push(z);
            }
            return (
              <div key={dist.districtName} style={{ border: '1px solid rgba(15,23,42,0.1)', borderRadius: 14, overflow: 'hidden', background: '#fafafa' }}>
                <button
                  type="button"
                  onClick={() => toggleDist(dist.districtName)}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isOpenDist ? '1px solid rgba(15,23,42,0.06)' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isOpenDist ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <Building2 size={14} color="#d97706" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--lp-ink)' }}>
                      #{dIdx + 1} {dist.districtName}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#fffbeb', color: '#92400e' }}>
                      HQ: {dist.hqCity}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--lp-ink-4)' }}>
                    {dist.zones?.length || 0} Zones ({dist.counts?.hqWards || 0} HQ · {dist.counts?.towns || 0} Towns · {dist.counts?.mandals || 0} Sub-Divs)
                  </span>
                </button>

                {isOpenDist && (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['hq_wards', 'towns', 'mandals'].map((stKey) => {
                      const items = grouped[stKey];
                      if (!items || items.length === 0) return null;
                      const st = STAGE_STYLE[stKey];
                      return (
                        <div key={stKey}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: st.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {stKey === 'mandals' ? `3. ${labels?.level3 || 'Mandals'}` : st.label} ({items.length})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {items.map((z) => {
                              const checked = !selectedSet || selectedSet.has(z.name);
                              return (
                                <button
                                  key={z.name}
                                  type="button"
                                  onClick={() => onToggleZone?.(z.name)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                    background: checked ? st.bg : '#ffffff',
                                    color: checked ? st.color : '#94a3b8',
                                    border: `1px solid ${checked ? st.border : 'rgba(15,23,42,0.1)'}`
                                  }}
                                >
                                  <MapPin size={10} /> {z.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
