import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../../apiConfig';
import { SignalOrb } from '../ui';
import { ChevronDown, ChevronUp, Zap, MapPin, Globe2, Layers, Cpu } from 'lucide-react';
import './instrument.css';

/**
 * InstrumentPanel — sleek, high-precision flight instruments HUD.
 * Compact, perfectly aligned, and color-matched to the dashboard.
 */

const ZONE_ROW_H = 28;
const ZONE_WINDOW = 6;
const POLL_MS = 2000;

function statusOf(map, zone) {
  const key = String(zone?.zoneName || zone?.name || '').toLowerCase().trim();
  return map[key] || 'queued';
}

function engineLabel(zone) {
  const value = zone?.engines;
  if (Array.isArray(value)) return value.length ? String(value[0]) : 'maps';
  return String(value || 'maps').split(' ')[0];
}

function ZoneBoard({ zones, statusMap }) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = zones.length;
  const start = Math.max(0, Math.floor(scrollTop / ZONE_ROW_H) - 1);
  const visible = zones.slice(start, start + ZONE_WINDOW + 3);
  const padTop = start * ZONE_ROW_H;

  if (!total) {
    return <div className="v2-inst-empty">Waiting for the engine to publish this run's zone plan…</div>;
  }

  return (
    <div className="v2-inst-board" onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div style={{ height: total * ZONE_ROW_H, position: 'relative' }}>
        <div style={{ transform: `translateY(${padTop}px)` }}>
          {visible.map(zone => {
            const status = statusOf(statusMap, zone);
            const pass = zone.coverageKind === 'grid' || zone.kind === 'grid' ? 'grid' : 'named';
            return (
              <div className="v2-inst-row" key={zone.zoneName || zone.name} style={{ height: ZONE_ROW_H }}>
                <span className={`v2-inst-dot is-${status}`} aria-hidden="true" />
                <span className="v2-inst-row-name" title={zone.queryText || zone.zoneName}>{zone.zoneName || zone.name}</span>
                <span className={`v2-inst-pass is-${pass}`}>{pass === 'grid' ? 'GRID' : 'NAMED'}</span>
                <span className="v2-inst-row-engine">{engineLabel(zone)}</span>
                <span className={`v2-inst-row-status is-${status}`}>{status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function InstrumentPanel({ running, leadCount = 0, progress = null, compact = false }) {
  const [active, setActive] = useState(null);
  const [queue, setQueue] = useState(null);
  const [tick, forceTick] = useState(0);
  const [showZones, setShowZones] = useState(false);
  const samplesRef = useRef([]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => forceTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) {
      setActive(null);
      setQueue(null);
      samplesRef.current = [];
      return undefined;
    }
    let alive = true;
    let ctrl = null;
    const tick = async () => {
      try {
        ctrl = new AbortController();
        const [activeRes, statusRes] = await Promise.all([
          fetch(`${API_URL}/scrape/active`, { signal: ctrl.signal }).then(r => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`${API_URL}/scrape/engines/status`, { signal: ctrl.signal }).then(r => (r.ok ? r.json() : null)).catch(() => null)
        ]);
        if (!alive) return;
        if (activeRes?.session) setActive(activeRes.session);
        if (statusRes?.queue) setQueue(statusRes.queue);
      } catch (e) { /* transient */ }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
      if (ctrl) ctrl.abort();
    };
  }, [running]);

  const perMinute = useMemo(() => {
    if (!running) return 0;
    const now = Date.now();
    const samples = samplesRef.current;
    samples.push({ t: now, leads: Number(leadCount) || 0 });
    while (samples.length > 2 && now - samples[0].t > 10000) samples.shift();
    const first = samples[0];
    const newest = samples[samples.length - 1];
    const span = Math.max(1, newest.t - first.t);
    const rate = ((newest.leads - first.leads) / span) * 60000;
    return Math.max(0, Math.round(rate));
  }, [running, leadCount, tick]);

  if (!running) return null;

  const statusMap = active?.completedTargetsMap || {};
  const zones = Array.isArray(active?.zones) ? active.zones : [];
  const coverageMode = String(active?.coverageMode || progress?.coverageMode || 'fast').toLowerCase();
  const done = Number(active?.completedMandals ?? progress?.completedMandals ?? progress?.overallCompletedMandals) || 0;
  const total = Number(active?.totalMandals ?? active?.overallTotalMandals ?? progress?.totalMandals ?? progress?.totalMandalsAcrossAll) || zones.length;
  const eta = progress?.eta || progress?.etaText || active?.eta || '—';
  const budget = queue?.browserBudget || {};
  const browserActive = Number(queue?.browserActive ?? budget.discoveryActive) || 0;
  const browserSlots = Number(queue?.browserSlots ?? budget.discoveryLimit ?? budget.totalSlots) || 0;
  const httpActive = Number(queue?.httpActive) || 0;
  const pending = Number(queue?.pendingJobs) || 0;
  const percentDone = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <section className="v2-inst-compact-hud" aria-label="Flight Instruments">
      {/* Sleek, Single-Tier High-Precision Telemetry Bar */}
      <div className="v2-inst-bar-inner">
        {/* Left: Indicator & Mode */}
        <div className="v2-inst-left-group">
          <SignalOrb size={18} live tone="#059669" title="Live flight telemetry active" />
          <span className="v2-inst-hud-title">FLIGHT INSTRUMENTS</span>
          <span className={`v2-inst-hud-mode ${coverageMode === 'deep' ? 'is-deep' : 'is-fast'}`}>
            {coverageMode === 'deep' ? 'DEEP COVERAGE' : 'FAST COVERAGE'}
          </span>
        </div>

        {/* Center: High-Density Live Telemetry Pods */}
        <div className="v2-inst-telemetry-row">
          {/* Speed Pod */}
          <div className="v2-inst-pod" title="Rolling 10-second throughput rate">
            <Zap size={12} className="v2-pod-icon text-mint" />
            <span className="v2-pod-val"><b>{perMinute}</b> <small>leads/min</small></span>
          </div>

          <div className="v2-inst-divider" />

          {/* Zones Pod with Progress Bar */}
          <div className="v2-inst-pod" title={`${done} of ${total} zones complete`}>
            <MapPin size={12} className="v2-pod-icon text-cyan" />
            <div className="v2-pod-prog-wrap">
              <span className="v2-pod-val">
                <b>{done}/{total || '—'}</b> <small>zones ({percentDone}%)</small>
              </span>
              <div className="v2-mini-track">
                <div className="v2-mini-bar" style={{ width: `${percentDone}%` }} />
              </div>
            </div>
          </div>

          <div className="v2-inst-divider" />

          {/* Engine Pod */}
          <div className="v2-inst-pod" title="Active worker slots and crawler allocation">
            <Cpu size={12} className="v2-pod-icon text-violet" />
            <span className="v2-pod-val">
              <b>{browserActive}/{browserSlots || 5}</b> <small>browsers</small>
              {httpActive > 0 && <span> · <b>{httpActive}</b> HTTP</span>}
            </span>
          </div>

          <div className="v2-inst-divider" />

          {/* ETA */}
          <div className="v2-inst-pod v2-inst-eta-pod">
            <span className="v2-pod-val"><small>ETA</small> <b>{eta}</b></span>
          </div>
        </div>

        {/* Right: Zones Inspector Toggle */}
        <div className="v2-inst-actions">
          {zones.length > 0 && (
            <button
              type="button"
              className={`v2-inst-inspect-btn ${showZones ? 'is-active' : ''}`}
              onClick={() => setShowZones(prev => !prev)}
              title="Inspect individual zone sweep progress"
            >
              <span>Zones ({zones.length})</span>
              {showZones ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Zones Drawer (Only renders when requested) */}
      {showZones && (
        <div className="v2-inst-expanded-drawer">
          <div className="v2-inst-drawer-head">
            <span>LIVE ZONE STATUS MESH ({zones.length} AREAS)</span>
            <span className="v2-inst-hint">Real-time signal status across municipal mandals</span>
          </div>
          <ZoneBoard zones={zones} statusMap={statusMap} />
        </div>
      )}
    </section>
  );
}
