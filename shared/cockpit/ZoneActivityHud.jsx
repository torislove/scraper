import React from 'react';
import { Radio, Clock, MapPin, Play, Cpu, Download, SlidersHorizontal } from 'lucide-react';
import LiquidButton from '../ui/LiquidButton';

function formatEta(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ZoneActivityHud({
  activePoint = null,
  sweepProgress = null,
  scanning = false,
  totalLeads = 0,
  totalPhones = 0,
  telemetry = null,
  onResumeSweep,
  onInspectZones,
  onExportCsv,
  zonesCount = 0,
  zoneMode = 'smart'
}) {
  const hasZonesChip = zonesCount > 0 && typeof onInspectZones === 'function';
  if (!scanning && !activePoint && !sweepProgress?.overallCompletedMandals && !totalLeads && !hasZonesChip) return null;

  const zoneName = activePoint?.name || sweepProgress?.currentZone || '';
  const totalZones = Math.max(1, Number(activePoint?.totalZones || sweepProgress?.totalMandalsAcrossAll || zonesCount || 12));
  const completedCount = Math.min(totalZones, Math.max(0, Number(sweepProgress?.overallCompletedMandals ?? activePoint?.completedZones ?? 0)));
  const currentIdx = scanning ? Math.min(totalZones, Math.max(completedCount + 1, Number(activePoint?.zoneIndex || completedCount + 1))) : completedCount;
  const activeWorkers = Array.isArray(activePoint?.activeWorkers) ? activePoint.activeWorkers : [];
  const engineCounts = sweepProgress?.engineCounts || null;
  const enrichPending = Number(telemetry?.websiteQueue || 0) + Number(telemetry?.hunterQueue || 0) + Number(telemetry?.activeWebWorkers || 0) + Number(telemetry?.activeHuntWorkers || 0);
  const zoneEta = activePoint?.zoneEtaSec ?? sweepProgress?.zoneEtaSec ?? 4;
  const cityEta = activePoint?.cityEtaSec ?? sweepProgress?.cityEtaSec ?? Math.ceil((totalZones - completedCount) / Math.max(1, telemetry?.zoneConcurrency || 1)) * zoneEta;
  const showProgressStrip = scanning || Boolean(activePoint) || completedCount > 0;
  const canResume = !scanning && completedCount > 0 && completedCount < totalZones && typeof onResumeSweep === 'function';

  // Render up to 24 crisp visual ward segments
  const segCount = Math.min(totalZones, 24);
  const scale = totalZones / segCount;

  return (
    <div
      className="lp-glass-subtle"
      style={{
        padding: '10px 14px',
        marginBottom: 12,
        borderColor: scanning ? 'rgba(217, 119, 6, 0.36)' : 'var(--lp-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: scanning ? '#fffbeb' : '#f1f5f9',
              border: `1px solid ${scanning ? 'rgba(217, 119, 6, 0.35)' : 'rgba(15, 23, 42, 0.1)'}`,
              color: scanning ? '#d97706' : '#64748b',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Radio size={15} />
          </span>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {showProgressStrip ? (
                <>
                  <span className="lp-tabular" style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217, 119, 6, 0.28)', textTransform: 'uppercase' }}>
                    Ward {currentIdx} of {totalZones}
                  </span>
                  {zoneName && (
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--lp-ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="#d97706" />
                      {zoneName}
                    </span>
                  )}
                  {scanning && activePoint?.activeSubcategory && (
                    <span className="lp-tabular" style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f0f9ff', color: '#0369a1', border: '1px solid rgba(2, 132, 199, 0.22)' }}>
                      {activePoint.subcatTotal > 1
                        ? `Sub-cat ${activePoint.subcatIndex || 1}/${activePoint.subcatTotal}: ${activePoint.activeSubcategory}`
                        : activePoint.activeSubcategory}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--lp-ink-2)' }}>
                  Saved Mission Workspace · Ready
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {canResume && (
            <LiquidButton variant="gold" size="sm" icon={Play} onClick={onResumeSweep}>
              Resume Ward {completedCount + 1}
            </LiquidButton>
          )}

          {telemetry?.serverRamMb > 0 && (
            <span className="lp-tabular" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '4px 9px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)' }}>
              <Cpu size={11} color="#d97706" />
              <span>
                {activeWorkers.length > 1 ? `${activeWorkers.length}w · ` : ''}RAM {telemetry.serverRamMb} MB · Free {telemetry.osFreeGb}/{telemetry.osTotalGb} GB
              </span>
            </span>
          )}

          {enrichPending > 0 && (
            <span className="lp-tabular" style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '4px 9px', borderRadius: 10, border: '1px solid rgba(2,132,199,0.22)' }}>
              Enriching {enrichPending} contacts…
            </span>
          )}

          {engineCounts && Object.keys(engineCounts).length > 0 && (
            <span className="lp-tabular" style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', background: '#ffffff', padding: '4px 9px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)' }}>
              {Object.entries(engineCounts).map(([k, v]) => `${k.replace(/_/g, ' ').replace(/gosom google maps fast/i, 'Maps').replace(/gmap direct rpc/i, 'DirectRPC').replace(/justdial turbo/i, 'JD').replace(/openstreetmap poi/i, 'OSM').replace(/deep web serp/i, 'Web')}: ${v}`).join(' · ')}
            </span>
          )}

          {scanning && (
            <span className="lp-tabular" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--lp-ink-3)', background: '#f8fafc', padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)' }}>
              <Clock size={12} color="#0284c7" />
              <span>ETA ~{formatEta(cityEta)}</span>
            </span>
          )}

          {totalLeads > 0 && (
            <span className="lp-tabular" style={{ fontSize: 11.5, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(5, 150, 105, 0.24)' }}>
              {totalLeads.toLocaleString()} leads{totalPhones > 0 ? ` · ${totalPhones.toLocaleString()} phones` : ''}
            </span>
          )}

          {onInspectZones && (
            <button
              type="button"
              onClick={onInspectZones}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: '#f0f9ff', color: '#0369a1', border: '1px solid rgba(2, 132, 199, 0.24)', cursor: 'pointer'
              }}
            >
              <SlidersHorizontal size={11} /> {totalZones} Zones ({zoneMode === 'all' ? 'All' : 'Smart'})
            </button>
          )}

          {totalLeads > 0 && typeof onExportCsv === 'function' && (
            <LiquidButton variant="glass-gold" size="sm" icon={Download} onClick={onExportCsv} badge={totalLeads}>
              Export CSV
            </LiquidButton>
          )}
        </div>
      </div>

      {/* Segmented Progress Bar (Done = Emerald, Active = Pulsing Gold, Pending = Neutral) */}
      {showProgressStrip && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segCount}, minmax(0, 1fr))`, gap: 4 }} role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={totalZones}>
          {Array.from({ length: segCount }).map((_, i) => {
            const zoneStart = Math.floor(i * scale);
            const isDone = zoneStart < completedCount;
            const isActive = scanning && !isDone && zoneStart <= currentIdx - 1;
            return (
              <span
                key={i}
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: isDone ? '#10b981' : isActive ? '#f59e0b' : 'rgba(15, 23, 42, 0.08)',
                  boxShadow: isActive ? '0 0 8px rgba(245, 158, 11, 0.65)' : 'none',
                  transition: 'background 240ms cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
