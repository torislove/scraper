import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Folder,
  FolderInput,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useExtension } from '../../context/ExtensionContext';
import {
  ALL_BUILTIN_ENGINES,
  DEVICE_REQUIREMENTS,
  EXTENSION_DOWNLOAD_URL,
  EXTENSION_STORE_URL
} from '../../utils/deviceRamEngine';

/**
 * ExtensionGatewayModal.jsx
 *
 * Unified 3D Crystal Ceramic × Emerald Hardware modal powered by ExtensionContext.
 * Supports two crisp modes:
 *   1. 'setup'     — ONLY shown when no extension is detected on the system.
 *                    Guides 1-click ZIP download + 3-step Chrome Load Unpacked
 *                    and auto-launches the pending action the instant connected.
 *   2. 'telemetry' — Opened intentionally when clicking the green status pill
 *                    while already connected; shows RAM lanes, relayed count,
 *                    device tiers, and the 22 built-in engines.
 */
export default function ExtensionGatewayModal() {
  const ctx = useExtension();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [demoToggle, setDemoToggle] = useState(true);

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
    completeProceed
  } = ctx;

  const localExtPath = 'c:\\Users\\manoj\\Desktop\\gomandap-scraper\\extension';

  const copyChromeUrl = () => {
    try {
      navigator.clipboard.writeText('chrome://extensions');
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (e) {}
  };

  const copyLocalPath = () => {
    try {
      navigator.clipboard.writeText(localExtPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    } catch (e) {}
  };

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = EXTENSION_DOWNLOAD_URL;
    link.setAttribute('download', 'scraper-co-in-ram-turbo-extension.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1800);
  };

  const showTelemetry = gatewayMode === 'telemetry' && ready;

  return (
    <div className="lx-ext-gateway-backdrop" role="dialog" aria-modal="true" aria-label="Browser Extension Gateway">
      <motion.div
        className="lx-ext-gateway-card"
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <header className="lx-ext-gateway-header">
          <div className="lx-ext-gateway-brand">
            <span className={`lx-ext-bezel-tag ${isMaster ? 'is-master' : ''}`}>
              {isMaster ? 'MASTER CONTROL · RAM TURBO HARDWARE' : 'SCRAPER.CO.IN · RAM TURBO HARDWARE'}
            </span>
            <div className="lx-ext-head-row">
              <div className="lx-ext-icon-orb">
                <Cpu size={20} color="#059669" />
              </div>
              <div>
                <h2>{showTelemetry ? 'RAM Turbo Telemetry & Engines' : 'Connect Browser Extension'}</h2>
                <p>
                  {showTelemetry
                    ? 'Connected and persistent across tabs — every search routes cleanly through your hardware.'
                    : 'Install once in 30 seconds. After that it stays connected automatically with zero server queues.'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="lx-ext-close-btn"
            onClick={closeGateway}
            aria-label="Close extension gateway"
          >
            <X size={18} />
          </button>
        </header>

        <div className={`lx-ext-status-bar ${ready ? 'is-connected' : 'is-pending'}`}>
          <div className="lx-ext-status-info">
            <span className={`cb-led ${ready ? 'is-live' : 'is-warn'}`} />
            <b>
              {ready
                ? `RAM Turbo Active · v${version || '1.2.0'} · ${connected ? 'Heartbeat Live' : 'Bridge Ready'}`
                : checking
                  ? 'Detecting Extension Bridge…'
                  : 'Extension Not Installed Yet'}
            </b>
          </div>
          {ready ? (
            <span className="lx-ext-badge-green">
              <CheckCircle2 size={13} /> Always On · {relayed || 0} relayed
            </span>
          ) : (
            <span className="lx-ext-badge-amber">One-Time Setup (30s)</span>
          )}
        </div>

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
          <div className="lx-ext-connected-view">
            <div className="lx-ext-success-banner">
              <Sparkles size={26} color="#059669" />
              <div>
                <h3>Extension Connected! Launching Workspace…</h3>
                <p>
                  Your browser extension is verified and locked in ({hardware.ramGb} GB RAM · {hardware.parallelZones} Parallel Lanes).
                  It stays permanently connected across reloads, new tabs, and browser restarts.
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
          <div className="lx-ext-setup-flow">
            <div className="lx-ext-value-prop">
              <div className="lx-ext-prop-item">
                <Zap size={14} color="#059669" />
                <span>Zero Server Waiting Queues</span>
              </div>
              <div className="lx-ext-prop-item">
                <ShieldCheck size={14} color="#059669" />
                <span>All 20+ Engines Via Your Connection</span>
              </div>
              <div className="lx-ext-prop-item">
                <Cpu size={14} color="#0e7490" />
                <span>{hardware.parallelZones}x Parallel Zones ({hardware.ramGb} GB RAM)</span>
              </div>
            </div>

            {/* Step 1: Download & Extract */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">01</div>
              <div className="lx-ext-step-content">
                <b>Download &amp; Extract the Extension Folder</b>
                <p>One lightweight ZIP package containing the complete extension folder:</p>
                <div className="lx-ext-folder-pill">
                  <Folder size={14} color="#059669" />
                  <span>Folder: <b>Scraper-RAM-Turbo-Extension</b></span>
                </div>
                <div className="lx-ext-warn-note">
                  <span>💡 <b>No .exe or setup program needed!</b> Chrome extensions load directly from this folder. Do NOT double-click <code>manifest.json</code>.</span>
                </div>
                <div className="lx-ext-step-actions">
                  {EXTENSION_STORE_URL ? (
                    <a
                      href={EXTENSION_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lx-btn lx-btn-primary lx-ext-dl-btn"
                    >
                      <Download size={15} />
                      <span>Add to Chrome (Free)</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="lx-btn lx-btn-primary lx-ext-dl-btn"
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      <Download size={15} />
                      <span>{downloading ? 'Downloading ZIP…' : 'Download Extension (.zip)'}</span>
                    </button>
                  )}
                </div>
                <div className="lx-ext-path-box">
                  <code>{localExtPath}</code>
                  <button type="button" className="lx-ext-copy-btn" onClick={copyLocalPath}>
                    {copiedPath ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedPath ? 'Copied Path!' : 'Copy Folder Path'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Open Chrome Extensions */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">02</div>
              <div className="lx-ext-step-content">
                <b>Open Chrome Extensions in a New Tab</b>
                <p>Paste this URL into Google Chrome, Microsoft Edge, or Brave:</p>
                <div className="lx-ext-url-box">
                  <code>chrome://extensions</code>
                  <button type="button" className="lx-ext-copy-btn" onClick={copyChromeUrl}>
                    {copiedUrl ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                    <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Developer Mode & Load Unpacked */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">03</div>
              <div className="lx-ext-step-content">
                <b>Turn ON &ldquo;Developer mode&rdquo; &amp; Click &ldquo;Load unpacked&rdquo;</b>
                <p>
                  1. Turn ON <b>Developer mode</b> (top-right switch on <code>chrome://extensions</code>).<br />
                  2. Click <b>Load unpacked</b> (top-left) and select the unzipped <b>Scraper-RAM-Turbo-Extension</b> folder.
                </p>
                <div className="lx-ext-interactive-demo">
                  <div className="lx-ext-demo-toggle">
                    <span>Developer mode:</span>
                    <div
                      className={`lx-ext-switch ${demoToggle ? 'is-on' : ''}`}
                      onClick={() => setDemoToggle(!demoToggle)}
                      title="Click to toggle demo"
                    >
                      <div className="lx-ext-switch-knob" />
                    </div>
                    <small>{demoToggle ? '✓ ON (Ready for Unpacked)' : 'OFF (Click to toggle)'}</small>
                  </div>
                  <div className="lx-ext-demo-load">
                    <div className="lx-ext-demo-btn">
                      <FolderInput size={13} color="#059669" />
                      <span>Load unpacked</span>
                    </div>
                    <span className="lx-ext-arrow-hint">← Pick the <b>Scraper-RAM-Turbo-Extension</b> folder</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-detect Live Radar Footer */}
            <div className="lx-ext-auto-detect-footer">
              <div className="lx-ext-radar-orb">
                <span className="lx-ext-radar-ping" />
                <RefreshCw size={14} className="lx-ext-spin" color="#059669" />
              </div>
              <div className="lx-ext-radar-text">
                <b>Silently listening for your extension…</b>
                <span>As soon as you select the folder in Chrome, this window detects it automatically and starts your search.</span>
              </div>
            </div>
          </div>
        )}

        {isMaster && !ready && (
          <footer className="lx-ext-gateway-footer">
            <button
              type="button"
              className="lx-ext-bypass-link"
              onClick={completeProceed}
            >
              <span>Continue in Master Server Mode (No Extension)</span>
              <ArrowRight size={13} />
            </button>
          </footer>
        )}
      </motion.div>
    </div>
  );
}
