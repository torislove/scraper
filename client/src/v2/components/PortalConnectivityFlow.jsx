import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Laptop,
  LogIn,
  RefreshCw,
  Server,
  ShieldCheck,
  Sliders,
  Zap
} from 'lucide-react';
import { API_URL } from '../../apiConfig';
import {
  ADMIN_ORIGIN,
  API_ORIGIN,
  CLIENT_ORIGIN,
  MASTER_ORIGIN,
  isMasterRuntime,
  openAdminWorkspace,
  openClientWorkspace,
  openMasterWorkspace,
  openPortalLogin
} from '../utils/editionSwitch';

const PORTALS = [
  {
    id: 'client',
    name: 'Client Workspace',
    host: CLIENT_ORIGIN.replace(/^https?:\/\//, ''),
    role: 'For Teams & Founders',
    desc: 'City searches, live territory map pins, saved lead folders & .xlsx/.vcf export.',
    route: '/login → /command',
    icon: Laptop,
    accent: '#059669'
  },
  {
    id: 'master',
    name: 'Master Fleet',
    host: MASTER_ORIGIN.replace(/^https?:\/\//, ''),
    role: 'For Full-Territory Operators',
    desc: 'District & national sweeps across 11 countries, synonym brain & fleet telemetry.',
    route: `${MASTER_ORIGIN.replace(/^https?:\/\//, '')}/login`,
    icon: Server,
    accent: '#d97706'
  },
  {
    id: 'admin',
    name: 'Admin Console',
    host: ADMIN_ORIGIN.replace(/^https?:\/\//, ''),
    role: 'For Platform Admins',
    desc: 'Manage customer access, trial days, data vault & API quota monitoring.',
    route: ADMIN_ORIGIN.replace(/^https?:\/\//, ''),
    icon: Sliders,
    accent: '#0284c7'
  }
];

export default function PortalConnectivityFlow() {
  const navigate = useNavigate();
  const masterActive = isMasterRuntime();
  const [health, setHealth] = useState({
    status: 'checking',
    latencyMs: null,
    uptime: null
  });

  const pingServer = useCallback(async () => {
    const cleanApi = (API_URL || '/api').replace(/\/$/, '');
    const t0 = performance.now();
    setHealth((prev) => ({ ...prev, status: 'checking' }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(`${cleanApi}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (res.ok) {
        setHealth({
          status: 'online',
          latencyMs,
          uptime: payload?.uptime ? `${Math.round(payload.uptime)}s` : 'Active'
        });
      } else {
        setHealth({ status: 'degraded', latencyMs, uptime: `HTTP ${res.status}` });
      }
    } catch {
      setHealth({ status: 'offline', latencyMs: null, uptime: 'Standby' });
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    pingServer();
  }, [pingServer]);

  const handleOpenPortal = (id) => {
    if (id === 'client') openClientWorkspace(navigate, '/command?country=IN');
    else if (id === 'master') openMasterWorkspace(navigate, '/command?country=IN');
    else openAdminWorkspace(navigate, '/');
  };

  const handleLoginPortal = (id) => {
    openPortalLogin(id, navigate);
  };

  const statusColor =
    health.status === 'online'
      ? '#059669'
      : health.status === 'checking'
        ? '#d97706'
        : '#e11d48';

  const statusLabel =
    health.status === 'online'
      ? `Engine Online · ${health.latencyMs}ms`
      : health.status === 'checking'
        ? 'Checking /api/health...'
        : 'Server Reconnecting';

  return (
    <motion.div
      className="lx-golden-glass-card lx-connectivity-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="lx-connectivity-grid">
        {/* Left: 3 Distinct Portals */}
        <div className="lx-connectivity-portals">
          {PORTALS.map((p, idx) => {
            const Icon = p.icon;
            const isCurrent =
              (p.id === 'master' && masterActive) || (p.id === 'client' && !masterActive);
            return (
              <div
                key={p.id}
                className={`lx-conn-portal-node ${isCurrent ? 'is-current' : ''}`}
              >
                <div className="lx-conn-portal-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span
                      className="lx-conn-icon-badge"
                      style={{ borderColor: `${p.accent}45`, color: p.accent }}
                    >
                      <Icon size={15} />
                    </span>
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 12.5, color: '#0f172a' }}>{p.name}</strong>
                        {isCurrent && <span className="lx-current-tag">CURRENT</span>}
                      </div>
                      <span className="lx-mono-host">{p.host}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="lx-mini-portal-btn"
                      onClick={() => handleLoginPortal(p.id)}
                      title={`Sign in to ${p.name}`}
                    >
                      <LogIn size={11} />
                      <span>{p.id === 'admin' ? 'Admin' : 'Sign In'}</span>
                    </button>
                    <button
                      type="button"
                      className="lx-mini-portal-btn is-gold"
                      onClick={() => handleOpenPortal(p.id)}
                      title={`Open ${p.name}`}
                    >
                      <span>Open</span>
                      <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>
                <p className="lx-conn-portal-desc">{p.desc}</p>
                <div className="lx-conn-portal-route">
                  <span>{p.role}</span>
                  <code>{p.route}</code>
                </div>
                {idx < PORTALS.length && null}
              </div>
            );
          })}
        </div>

        {/* Center: Animated SVG Data-Packet Connectivity Mesh */}
        <div className="lx-connectivity-svg-wrap" aria-hidden="true">
          <svg viewBox="0 0 180 260" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lxGoldLink" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Paths from Client (y=42), Master (y=130), Admin (y=218) -> Server Hub (x=176, y=130) */}
            <path id="connPath1" d="M 4 42 C 78 42, 95 130, 176 130" stroke="url(#lxGoldLink)" strokeWidth="2" fill="none" strokeDasharray="5 5" className="lx-svg-dash-flow" />
            <path id="connPath2" d="M 4 130 L 176 130" stroke="url(#lxGoldLink)" strokeWidth="2.4" fill="none" strokeDasharray="5 5" className="lx-svg-dash-flow" />
            <path id="connPath3" d="M 4 218 C 78 218, 95 130, 176 130" stroke="url(#lxGoldLink)" strokeWidth="2" fill="none" strokeDasharray="5 5" className="lx-svg-dash-flow" />

            {/* Travelling golden packets */}
            <circle r="4.5" fill="#f59e0b">
              <animateMotion dur="2.1s" repeatCount="indefinite" path="M 4 42 C 78 42, 95 130, 176 130" />
            </circle>
            <circle r="4.5" fill="#059669">
              <animateMotion dur="1.7s" repeatCount="indefinite" begin="0.35s" path="M 4 130 L 176 130" />
            </circle>
            <circle r="4.5" fill="#0284c7">
              <animateMotion dur="2.3s" repeatCount="indefinite" begin="0.7s" path="M 4 218 C 78 218, 95 130, 176 130" />
            </circle>
          </svg>
          <span className="lx-protocol-chip">HTTPS REST + LIVE SSE</span>
        </div>

        {/* Right: Core API & Scraper Engine Server */}
        <div className="lx-conn-server-node">
          <div className="lx-conn-server-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="lx-conn-server-icon">
                <Activity size={17} color="#b45309" />
              </span>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
                  Core API Engine Server
                </strong>
                <span className="lx-mono-host">
                  {API_ORIGIN.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={pingServer}
              className="lx-mini-portal-btn"
              title="Re-check server latency"
            >
              <RefreshCw size={11} className={health.status === 'checking' ? 'spin-icon' : ''} />
              <span>Ping</span>
            </button>
          </div>

          <div
            className="lx-server-health-pill"
            style={{
              borderColor: `${statusColor}45`,
              background: `${statusColor}12`,
              color: statusColor
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`
              }}
            />
            <span>{statusLabel}</span>
          </div>

          <div className="lx-server-specs">
            <div>
              <Zap size={13} color="#d97706" />
              <span><b>Shared SSE Stream</b> — pushes every live pin &amp; phone instantly to Client &amp; Master</span>
            </div>
            <div>
              <ShieldCheck size={13} color="#059669" />
              <span><b>Role-Scoped Auth</b> — separate sessions for Client, Master Fleet &amp; Admin Vault</span>
            </div>
            <div>
              <Server size={13} color="#0284c7" />
              <span><b>Zero API Key Scraping</b> — parallel Maps + Website + Social enrichment cores</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
