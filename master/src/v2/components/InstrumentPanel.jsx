import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '../../apiConfig';
import { SignalOrb, Hint } from '../ui';
import './instrument.css';

/**
 * InstrumentPanel — the live flight deck for a running search.
 *
 * Every number is read from the engine, never invented:
 *   • leads/min  = rolling 10-second delta of leads saved to this session
 *   • zones      = /api/scrape/active completedTargetsMap (one truth)
 *   • engines    = /api/scrape/engines/status live browser/HTTP budget
 *   • ETA        = the server's model (remaining × measured per-zone ÷ slots)
 *
 * It only renders while a run is live. When the run ends the normal folder
 * view takes over, so there is no stale "instrument" pretending to work.
 */

const ZONE_ROW_H = 34;
const ZONE_WINDOW = 9;
const POLL_MS = 2000;

function statusOf(map, zone) {
  const key = String(zone?.zoneName || zone?.name || '').toLowerCase().trim();
  return map[key] || 'queued';
}

// `engines` arrives as a string from some plans and an array from others.
// Rendering must never assume one shape - a .split() on an array took the whole
// dashboard down through the error boundary.
function engineLabel(zone) {
  const value = zone?.engines;
  if (Array.isArray(value)) return value.length ? String(value[0]) : 'maps';
  return String(value || 'maps').split(' ')[0];
}

function Gauge({ perMinute }) {
  const max = perMinute <= 30 ? 30 : perMinute <= 60 ? 60 : perMinute <= 120 ? 120 : Math.ceil(perMinute / 60) * 60;
  const fraction = Math.max(0, Math.min(1, perMinute / max));
  const rad = (-90 + fraction * 180) * (Math.PI / 180);
  const needleX = 100 + 66 * Math.sin(rad);
  const needleY = 100 - 66 * Math.cos(rad);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="v2-inst-gauge" viewBox="0 0 200 118" role="img" aria-label={`${perMinute} leads per minute`}>
      <defs>
        <linearGradient id="v2-inst-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="60%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#d8b25e" />
        </linearGradient>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="url(#v2-inst-arc)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${fraction * 251.3} 251.3`}
      />
      {ticks.map(t => {
        const a = (-90 + t * 180) * (Math.PI / 180);
        const x1 = 100 + 70 * Math.sin(a);
        const y1 = 100 - 70 * Math.cos(a);
        const x2 = 100 + 76 * Math.sin(a);
        const y2 = 100 - 76 * Math.cos(a);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(226,232,240,0.4)" strokeWidth="1.5" />;
      })}
      <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="#e8c987" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill="#e8c987" />
      <text x="100" y="86" textAnchor="middle" className="v2-inst-gauge-value">{perMinute}</text>
      <text x="100" y="112" textAnchor="middle" className="v2-inst-gauge-unit">LEADS / MIN</text>
    </svg>
  );
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
  const samplesRef = useRef([]);

  // 500 ms gauge refresh (the data poll is 2 s; the needle still moves).
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => forceTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [running]);

  // Poll the two honest surfaces. The SSE stream is for leads; this is for
  // zone state and the live browser/HTTP budget, which SSE does not carry.
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

  // Rolling 10 s window of lead totals → leads per minute. The window is
  // sampled on every 500 ms tick so a stalled run visibly decays to zero.
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
  const named = zones.filter(z => !(z.coverageKind === 'grid' || z.kind === 'grid'));
  const grid = zones.filter(z => z.coverageKind === 'grid' || z.kind === 'grid');
  const deferred = Array.isArray(active?.deferredZones) ? active.deferredZones.length : grid.filter(z => statusOf(statusMap, z) === 'deferred').length;
  const coverageMode = String(active?.coverageMode || progress?.coverageMode || 'fast').toLowerCase();
  const done = Number(active?.completedMandals ?? progress?.completedMandals ?? progress?.overallCompletedMandals) || 0;
  const total = Number(active?.totalMandals ?? active?.overallTotalMandals ?? progress?.totalMandals ?? progress?.totalMandalsAcrossAll) || zones.length;
  const eta = progress?.eta || progress?.etaText || active?.eta || '—';
  const budget = queue?.browserBudget || {};
  const browserActive = Number(queue?.browserActive ?? budget.discoveryActive) || 0;
  const browserSlots = Number(queue?.browserSlots ?? budget.discoveryLimit ?? budget.totalSlots) || 0;
  const httpActive = Number(queue?.httpActive) || 0;
  const httpSlots = Number(queue?.httpSlots) || 0;
  const pending = Number(queue?.pendingJobs) || 0;

  return (
    <section className={`v2-instruments${compact ? ' is-compact' : ''}`} aria-label="Live search instruments">
      <header className="v2-inst-head">
        <SignalOrb size={22} live tone="#5eead4" title="Live engine" />
        <span className="v2-inst-title">FLIGHT INSTRUMENTS</span>
        <span className="v2-inst-mode">{coverageMode === 'deep' ? 'DEEP COVERAGE' : 'FAST COVERAGE'}</span>
        <span className="v2-inst-eta">ETA <b>{eta}</b></span>
      </header>

      <div className="v2-inst-grid">
        <article className="v2-inst-card">
          <div className="v2-inst-card-head">
            <span>Throughput</span>
            <SignalOrb size={14} live tone="#e8c987" />
          </div>
          <Gauge perMinute={perMinute} />
          <Hint>Rolling 10-second average of leads saved to this search.</Hint>
        </article>

        <article className="v2-inst-card">
          <div className="v2-inst-card-head"><span>Two-pass coverage</span></div>
          <div className="v2-inst-pass-row">
            <div className="v2-inst-pass-block">
              <b>{named.length}</b>
              <span>Named areas</span>
            </div>
            <div className="v2-inst-pass-block">
              <b>{grid.length}</b>
              <span>Grid cells</span>
            </div>
            <div className="v2-inst-pass-block is-deferred">
              <b>{deferred}</b>
              <span>Deferred</span>
            </div>
          </div>
          <div className="v2-inst-progress-track">
            <span style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }} />
          </div>
          <div className="v2-inst-progress-label">{done}/{total || '—'} active zones complete</div>
          <Hint>Named areas run first; grid cells are the visible second pass, never a silent skip.</Hint>
        </article>

        <article className="v2-inst-card">
          <div className="v2-inst-card-head"><span>Engine split</span></div>
          <div className="v2-inst-split-row">
            <span>Browsers</span>
            <b>{browserActive}/{browserSlots || '—'}</b>
            <div className="v2-inst-bar"><span style={{ width: `${browserSlots ? Math.min(100, (browserActive / browserSlots) * 100) : 0}%` }} /></div>
          </div>
          <div className="v2-inst-split-row">
            <span>HTTP workers</span>
            <b>{httpActive}/{httpSlots || '—'}</b>
            <div className="v2-inst-bar is-http"><span style={{ width: `${httpSlots ? Math.min(100, (httpActive / httpSlots) * 100) : 0}%` }} /></div>
          </div>
          <div className="v2-inst-split-foot">
            <span>Queued jobs <b>{pending}</b></span>
            <span>Enriching <b>{budget.enrichmentActive || 0}</b></span>
          </div>
          <Hint>Five browser slots is the measured optimum for this machine. HTTP workers handle directory APIs.</Hint>
        </article>
      </div>

      <article className="v2-inst-card v2-inst-card--board">
        <div className="v2-inst-card-head">
          <span>Zone board</span>
          <span className="v2-inst-board-count">{zones.length} zones</span>
        </div>
        <ZoneBoard zones={zones} statusMap={statusMap} />
        <Hint>One row per zone, with live status. Scroll to inspect any part of the sweep.</Hint>
      </article>
    </section>
  );
}
