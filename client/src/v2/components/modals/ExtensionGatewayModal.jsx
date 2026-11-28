import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  Folder,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useExtension } from '../../context/ExtensionContext';
import {
  ALL_BUILTIN_ENGINES,
  DEVICE_REQUIREMENTS
} from '../../utils/deviceRamEngine';

/**
 * ExtensionGatewayModal.jsx
 * ==============================================================================
 * High-Retention Store Onboarding & Auto Browser Detection Gateway
 *
 * Core Principles:
 *   1. Auto Browser Detection: Tailors official store badges & links for Edge,
 *      Chrome, and Firefox.
 *   2. Never a Hard Wall (Customer Retention): Features a prominent 1-click
 *      "Continue on Web Server Engine" button so no user is ever blocked.
 *   3. 3D Crystal Ceramic Alignment: High contrast typography, emerald glass
 *      benefit cards, and smooth animations.
 *   4. Zero Developer Clutter: Hides raw local file paths inside an optional
 *      developer accordion.
 * ==============================================================================
 */

export default function ExtensionGatewayModal() {
  const ctx = useExtension();
  const [copiedPath, setCopiedPath] = useState(false);
  const [ramMode, setRamMode] = useState('auto');
  const [serverStats, setServerStats] = useState(null);

  React.useEffect(() => {
    if (!ctx?.gatewayOpen) return;
    let active = true;
    fetch('/api/scrape/hardware')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!active || !d?.ok) return;
        if (d.ramMode) setRamMode(d.ramMode);
        setServerStats(d);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [ctx?.gatewayOpen]);

  const applyRamMode = async (mode) => {
    setRamMode(mode);
    try {
      const res = await fetch('/api/scrape/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const d = await res.json();
      if (d?.ok) setServerStats(d);
    } catch {}
  };

  if (!ctx || !ctx.gatewayOpen) return null;

  const {
    ready,
    connected,
    checking,
    version,
    relayed,
    lastError,
    hardware,
    isMaster,
    gatewayMode,
    closeGateway,
    completeProceed,
    userBrowser
  } = ctx;

  const browserInfo = userBrowser || {
    name: 'Microsoft Edge',
    slug: 'edge',
    storeName: 'Microsoft Edge Add-ons',
    storeUrl: 'https://microsoftedge.microsoft.com/addons/detail/gcmknikiliglejekhghkdplkjgkjjkdm',
    hasDirectStore: true,
    badge: 'Edge'
  };

  const localExtPath = 'C:\\Users\\manoj\\Desktop\\scraper\\extension';

  const copyLocalPath = () => {
    try {
      navigator.clipboard.writeText(localExtPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    } catch (e) {}
  };

  const showTelemetry = gatewayMode === 'telemetry' && ready;

  const handleContinueOnWeb = () => {
    if (ctx.skipAndRunLocal) {
      ctx.skipAndRunLocal();
    } else {
      completeProceed();
    }
  };

  return (
    <div
      className="lx-ext-gateway-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Browser Extension Gateway"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeGateway();
      }}
    >
      <motion.div
        className="lx-ext-gateway-card"
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {/* Top Header */}
        <header className="lx-ext-gateway-header">
          <div className="lx-ext-gateway-brand">
            <span className={`lx-ext-bezel-tag ${isMaster ? 'is-master' : ''}`}>
              🛡️ {browserInfo.name.toUpperCase()} CERTIFIED COMPANION
            </span>
            <div className="lx-ext-head-row">
              <div className="lx-ext-icon-orb">
                <Cpu size={22} color="#059669" />
              </div>
              <div>
                <h2>{showTelemetry ? 'RAM Turbo Telemetry & Engines' : 'Accelerate Your Search with RAM Turbo'}</h2>
                <p>
                  {showTelemetry
                    ? 'Connected and persistent — every search routes cleanly through your local hardware.'
                    : `Official extension for ${browserInfo.name}. Run unlimited searches across 11 sovereign countries with zero cloud waiting queues.`}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="lx-ext-close-btn"
            onClick={closeGateway}
            aria-label="Close extension modal"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Live Status Bar */}
        <div className={`lx-ext-status-bar ${ready ? 'is-connected' : 'is-pending'}`}>
          <div className="lx-ext-status-info">
            <span className={`cb-led ${ready ? 'is-live' : 'is-warn'}`} />
            <b>
              {ready
                ? `RAM Turbo Active · v${version || '1.3.0'} · ${connected ? 'Heartbeat Live' : 'Bridge Ready'}`
                : checking
                  ? 'Detecting Extension Bridge…'
                  : 'Official Store Companion Available'}
            </b>
          </div>
          {ready ? (
            <span className="lx-ext-badge-green">
              <CheckCircle2 size={13} /> Always On · {relayed || 0} relayed
            </span>
          ) : (
            <span className="lx-ext-badge-green">100% Free · One-Click Install</span>
          )}
        </div>

        {/* Case 1: Telemetry View (when opened intentionally while connected) */}
        {showTelemetry ? (
          <div className="lx-ext-telemetry-view">
            <div className="lx-ext-hw-grid">
              <div className="lx-ext-hw-tile is-best">
                <span>DETECTED RAM</span>
                <b>{hardware.ramGb} GB RAM</b>
                <small>{hardware.tierLabel}</small>
              </div>
              <div className="lx-ext-hw-tile">
                <span>CPU LANES</span>
                <b>{hardware.cpuCores} Cores</b>
                <small>{hardware.parallelZones}x Parallel Zones</small>
              </div>
              <div className="lx-ext-hw-tile">
                <span>PAGES RELAYED</span>
                <b>{relayed || 0}</b>
                <small>20+ Engines Auto-Dispatched</small>
              </div>
            </div>

            <div className="lx-ext-tiers-row">
              {DEVICE_REQUIREMENTS.map((req) => (
                <div key={req.tier} className={`lx-ext-tier-pill ${req.tier === hardware.tier ? 'is-current' : ''}`}>
                  <b>{req.badge} ({req.ram})</b>
                  <span>{req.parallelZones} Zones · {req.speed}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, margin: '8px 0 4px', padding: '8px 10px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                RAM Mode{serverStats?.swap?.compressedRows || serverStats?.swap?.coldRows ? ` · Zstd ${serverStats.swap.compressionRatio || 1}x` : ''}:
              </span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'eco8', label: '8 GB Safe' },
                  { id: 'balanced16', label: '16 GB Fast' },
                  { id: 'turbo32', label: '32 GB Ultra' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyRamMode(opt.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: ramMode === opt.id ? '1.5px solid #059669' : '1px solid #cbd5e1',
                      background: ramMode === opt.id ? '#ecfdf5' : '#ffffff',
                      color: ramMode === opt.id ? '#065f46' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lx-ext-engines-box">
              <div className="lx-ext-engines-head">
                <Layers size={13} color="#059669" />
                <b>{ALL_BUILTIN_ENGINES.length} Built-In Lead Engines (Auto-Orchestrated)</b>
              </div>
              <div className="lx-ext-engines-scroll">
                {ALL_BUILTIN_ENGINES.map((eng) => (
                  <div key={eng.id} className="lx-ext-engine-item">
                    <b>{eng.number} · {eng.name}</b>
                    <span>AUTO ON</span>
                  </div>
                ))}
              </div>
            </div>

            {lastError && (
              <div className="lx-ext-note is-error">Last status note: {lastError}</div>
            )}

            <button
              type="button"
              className="lx-btn lx-btn-primary lx-ext-proceed-btn"
              onClick={closeGateway}
            >
              <Activity size={15} />
              <span>Done · Keep Sweeping</span>
            </button>
          </div>
        ) : ready ? (
          /* Case 2: Already connected */
          <div className="lx-ext-connected-view">
            <div className="lx-ext-success-banner">
              <Sparkles size={28} color="#059669" />
              <div>
                <h3>Extension Connected! Launching Sweep…</h3>
                <p>
                  Your browser extension is active ({hardware.ramGb} GB RAM · {hardware.parallelZones} Parallel Lanes).
                  Your sweep will run with residential IP bypass and zero server queues.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="lx-btn lx-btn-primary lx-ext-proceed-btn"
              onClick={completeProceed}
            >
              <span className="lx-gbc-keycap is-a">A</span>
              <span>Proceed Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Case 3: High-Retention Store Onboarding View */
          <div className="lx-ext-setup-flow">
            {/* 3 High-Impact Value Cards */}
            <div className="lx-ext-benefit-grid">
              <div className="lx-ext-benefit-card">
                <div className="lx-ext-benefit-icon">
                  <Zap size={18} color="#059669" />
                </div>
                <b>Zero Server Queues</b>
                <p>Runs on your local PC RAM across {hardware.parallelZones}x parallel lanes for instant execution.</p>
              </div>

              <div className="lx-ext-benefit-card">
                <div className="lx-ext-benefit-icon">
                  <ShieldCheck size={18} color="#059669" />
                </div>
                <b>Residential IP Bypass</b>
                <p>Discovers direct WhatsApp numbers and owner profiles with zero Cloudflare or rate-limit blocks.</p>
              </div>

              <div className="lx-ext-benefit-card">
                <div className="lx-ext-benefit-icon">
                  <Lock size={18} color="#0284c7" />
                </div>
                <b>100% Zero-Knowledge</b>
                <p>Strictly private. No passwords, no browsing history, and zero personal data stored.</p>
              </div>
            </div>

            {/* Dual Action Cluster for Maximum Retention */}
            <div className="lx-ext-actions-cluster">
              {/* Primary 1-Click Store Action */}
              <a
                href={browserInfo.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="lx-ext-store-primary-btn"
                onClick={() => {
                  // Listen for return from store
                }}
              >
                <div className="lx-ext-btn-inner">
                  <ExternalLink size={18} />
                  <span>Add to {browserInfo.name}</span>
                </div>
                <small>Free · Official {browserInfo.storeName}</small>
              </a>

              {/* Secondary Instant Web Bypass Action (Customer Retention Protection) */}
              <button
                type="button"
                className="lx-ext-web-fallback-btn"
                onClick={handleContinueOnWeb}
                title="Run search directly on the web server without installing the extension"
              >
                <Zap size={15} color="#047857" />
                <span>⚡ Continue on Web Server Engine (Instant Preview · No Install)</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Auto-Detection Live Radar Indicator */}
            <div className="lx-ext-auto-detect-footer">
              <div className="lx-ext-radar-orb">
                <span className="lx-ext-radar-ping" />
                <RefreshCw size={13} className="lx-ext-spin" color="#059669" />
              </div>
              <div className="lx-ext-radar-text">
                <span>Listening for {browserInfo.name} extension in real-time…</span>
                <small>As soon as you add it, this window automatically connects and starts your search.</small>
              </div>
            </div>

            {/* Collapsible Local Developer Accordion (Discreetly kept for devs) */}
            <details className="lx-ext-dev-accordion">
              <summary>🛠️ Local Developer? Click to view unpacked folder path</summary>
              <div className="lx-ext-dev-body">
                <p>For local developer testing, you can load unpacked directly from:</p>
                <div className="lx-ext-path-box">
                  <code>{localExtPath}</code>
                  <button type="button" className="lx-ext-copy-btn" onClick={copyLocalPath}>
                    {copiedPath ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedPath ? 'Copied!' : 'Copy Path'}</span>
                  </button>
                </div>
              </div>
            </details>
          </div>
        )}
      </motion.div>
    </div>
  );
}
