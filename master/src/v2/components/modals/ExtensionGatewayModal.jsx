import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Zap,
  ShieldCheck,
  Sparkles,
  X,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { detectExtension } from '../../utils/relayAgent';
import { EXTENSION_DOWNLOAD_URL, EXTENSION_STORE_URL } from '../../utils/deviceRamEngine';

/**
 * ExtensionGatewayModal.jsx
 *
 * Automated, user-friendly Browser Extension installation & connection gateway.
 *
 * Explains in simple English why the browser extension is needed:
 *   - Runs searches through the user's browser connection (RAM Turbo)
 *   - Zero cloud queues, zero IP bans, 10x faster scraping
 *
 * Provides a 1-click ZIP download, visual 3-step setup guide, and
 * real-time auto-detection so that as soon as the user loads unpacked in Chrome,
 * it turns green and automatically launches the target search.
 */
export default function ExtensionGatewayModal({
  isOpen,
  onClose,
  onConnected,
  targetQuery = '',
  targetCountry = 'IN',
  allowBypass = true
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [extVersion, setExtVersion] = useState('');
  const [checking, setChecking] = useState(true);
  const [autoProceedCountdown, setAutoProceedCountdown] = useState(null);
  const autoProceedRef = useRef(null);

  // Poll for extension connection while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const check = async () => {
      try {
        const res = await detectExtension(300);
        if (!active) return;
        if (res?.installed) {
          setConnected(true);
          setExtVersion(res.version || '1.1.0');
          setChecking(false);
        } else {
          setConnected(false);
          setChecking(false);
        }
      } catch (e) {
        if (active) setChecking(false);
      }
    };

    check();
    const interval = setInterval(check, 1200);

    // Also listen for immediate postMessage from contentBridge
    const onMessage = (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.source === 'SCRAPER_RAM_EXTENSION' && event.data.type === 'SCRAPER_EXT_PONG') {
        if (active) {
          setConnected(true);
          setExtVersion(event.data.version || '1.1.0');
          setChecking(false);
        }
      }
    };
    window.addEventListener('message', onMessage);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('message', onMessage);
    };
  }, [isOpen]);

  // When connection turns true, trigger countdown to auto-proceed
  useEffect(() => {
    if (connected && autoProceedCountdown === null) {
      setAutoProceedCountdown(1.5);
      autoProceedRef.current = setTimeout(() => {
        onConnected?.();
      }, 1500);
    }
    return () => {
      if (autoProceedRef.current) clearTimeout(autoProceedRef.current);
    };
  }, [connected, autoProceedCountdown, onConnected]);

  const copyChromeUrl = () => {
    try {
      navigator.clipboard.writeText('chrome://extensions');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  const handleDownload = () => {
    setDownloading(true);
    // Direct download trigger from server package
    const link = document.createElement('a');
    link.href = EXTENSION_DOWNLOAD_URL;
    link.setAttribute('download', 'scraper-co-in-ram-turbo-extension.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="lx-ext-gateway-backdrop" role="dialog" aria-modal="true">
      <motion.div
        className="lx-ext-gateway-card"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {/* Top Header */}
        <header className="lx-ext-gateway-header">
          <div className="lx-ext-gateway-brand">
            <span className="lx-ext-bezel-tag">SCRAPER.CO.IN · RAM TURBO ACCELERATOR</span>
            <div className="lx-ext-head-row">
              <div className="lx-ext-icon-orb">
                <Cpu size={20} color="#7c3aed" />
              </div>
              <div>
                <h2>Connect Browser Extension</h2>
                <p>Run instant, zero-queue searches powered by your local browser connection.</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="lx-ext-close-btn"
            onClick={onClose}
            aria-label="Close extension prompt"
          >
            <X size={18} />
          </button>
        </header>

        {/* Live Status Pill */}
        <div className={`lx-ext-status-bar ${connected ? 'is-connected' : 'is-pending'}`}>
          <div className="lx-ext-status-info">
            <span className={`lx-ext-led ${connected ? 'is-green' : 'is-pulsing'}`} />
            <b>
              {connected
                ? `RAM Turbo Connected! (v${extVersion} Ready)`
                : checking
                ? 'Detecting Extension Bridge…'
                : 'Extension Not Detected Yet'}
            </b>
          </div>
          {connected ? (
            <span className="lx-ext-badge-green">
              <CheckCircle2 size={13} /> Active &amp; Ready
            </span>
          ) : (
            <span className="lx-ext-badge-amber">Setup Required (30 Seconds)</span>
          )}
        </div>

        {connected ? (
          /* Celebratory Connected State */
          <div className="lx-ext-connected-view">
            <div className="lx-ext-success-banner">
              <Sparkles size={28} color="#059669" />
              <div>
                <h3>You're All Set!</h3>
                <p>
                  RAM Turbo extension is verified and communicating with the scraper.
                  Your local browser connection will now handle high-speed lead extraction.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="lx-btn lx-btn-primary lx-ext-proceed-btn"
              onClick={() => onConnected?.()}
            >
              <span>Launch Workspace Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Guided 3-Step Setup Flow */
          <div className="lx-ext-setup-flow">
            <div className="lx-ext-value-prop">
              <div className="lx-ext-prop-item">
                <Zap size={14} color="#059669" />
                <span>Zero Cloud Waiting Queues</span>
              </div>
              <div className="lx-ext-prop-item">
                <ShieldCheck size={14} color="#059669" />
                <span>Zero IP Bans (Uses Your Direct Connection)</span>
              </div>
              <div className="lx-ext-prop-item">
                <Cpu size={14} color="#7c3aed" />
                <span>Multi-Core Parallel Zone Sweeps</span>
              </div>
            </div>

            {/* Step 1: Download ZIP */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">1</div>
              <div className="lx-ext-step-content">
                <b>Download the Extension Package</b>
                <p>Click below to download the lightweight, pre-configured zip file (11 KB).</p>
                <button
                  type="button"
                  className="lx-btn lx-btn-primary lx-ext-dl-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download size={15} />
                  <span>{downloading ? 'Downloading…' : 'Download Extension (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Open chrome://extensions */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">2</div>
              <div className="lx-ext-step-content">
                <b>Extract &amp; Open Extensions Page</b>
                <p>Unzip the downloaded file. Next, open this URL in a new browser tab:</p>
                <div className="lx-ext-url-box">
                  <code>chrome://extensions</code>
                  <button type="button" className="lx-ext-copy-btn" onClick={copyChromeUrl}>
                    {copied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
                <small className="lx-ext-note">
                  (Works in Chrome, Edge, Brave, Opera, or any Chromium browser)
                </small>
              </div>
            </div>

            {/* Step 3: Load Unpacked */}
            <div className="lx-ext-step-card">
              <div className="lx-ext-step-number">3</div>
              <div className="lx-ext-step-content">
                <b>Toggle 'Developer mode' &amp; Click 'Load unpacked'</b>
                <p>
                  1. Turn ON <b>Developer mode</b> (toggle switch in the top-right corner of <code>chrome://extensions</code>).<br />
                  2. Click the <b>"Load unpacked"</b> button (top-left).<br />
                  3. Select the extracted <code>extension</code> folder.
                </p>
              </div>
            </div>

            {/* Real-time Listening Footer */}
            <div className="lx-ext-auto-detect-footer">
              <RefreshCw size={14} className="lx-ext-spin" />
              <span>
                Listening for extension bridge… As soon as you load the folder, this screen automatically connects.
              </span>
            </div>
          </div>
        )}

        {/* Bottom Fallback Options */}
        <footer className="lx-ext-gateway-footer">
          {allowBypass && !connected && (
            <button
              type="button"
              className="lx-ext-bypass-link"
              onClick={() => onConnected?.()}
            >
              <span>Continue in Cloud Server Mode (Queues may apply)</span>
              <ArrowRight size={13} />
            </button>
          )}
        </footer>
      </motion.div>
    </div>
  );
}
