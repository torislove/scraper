import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Laptop,
  LogIn,
  Rocket,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';
import HeroLiveDemoCard from '../components/HeroLiveDemoCard';
import {
  ADMIN_ORIGIN,
  CLIENT_ORIGIN,
  MASTER_ORIGIN,
  isMasterRuntime,
  openAdminWorkspace,
  openClientWorkspace,
  openMasterWorkspace,
  openPortalLogin
} from '../utils/editionSwitch';

export default function LandingHome() {
  const navigate = useNavigate();
  const { ensureConnected } = useExtension() || {};
  const masterActive = isMasterRuntime();

  const handlePrimaryWorkspace = () => {
    if (masterActive) openMasterWorkspace(navigate, '/command?country=IN');
    else openClientWorkspace(navigate, '/command?country=IN', ensureConnected);
  };

  return (
    <div className="lx-screen-container lx-home-shell">
      {/* 1. Above-the-Fold 2-Column Hero */}
      <section className="lx-hero-grid" aria-label="Platform Overview">
        <motion.div
          className="lx-hero-copy"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="lx-highlight-tag">
              <span className="lx-status-dot-pulse" />
              <span>
                {masterActive
                  ? 'MASTER FLEET · REAL-TIME ENGINE'
                  : 'REAL-TIME LEAD ENGINE · 11 MARKETS'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => navigate('/story')}
              className="lx-founder-pill-btn"
              title="Read Founder Story & Legal Trust Playbook"
            >
              <Sparkles size={11} />
              <span>Founder &amp; Trust</span>
            </button>
          </div>

          <h1 className="lx-kinetic-title lx-hero-title">
            {masterActive ? (
              <>
                State-Scale Lead Discovery.{' '}
                <span className="lx-gradient-text">Unified Fleet Control.</span>
              </>
            ) : (
              <>
                Verified Mobiles, Landlines &amp; Socials.{' '}
                <span className="lx-gradient-text">Extracted Live.</span>
              </>
            )}
          </h1>

          <p className="lx-kinetic-subcopy lx-hero-sub">
            {masterActive
              ? 'Orchestrate district and national territory sweeps across 11 markets, govern synonym intelligence, and supervise live multi-engine SSE pipelines from one golden glass console.'
              : 'Extract direct owner mobiles (+91 MOB), STD landlines, websites, emails, WhatsApp links, and 3D social handles across 11 countries—streamed live onto a satellite territory map with 1-click .xlsx & .vcf exports.'}
          </p>

          <div className="lx-hero-cta-row">
            <LiquidButton3D
              variant="gold"
              size="lg"
              icon={Rocket}
              pulse
              onClick={handlePrimaryWorkspace}
            >
              {masterActive ? 'Open Master Command' : 'Launch Client Workspace'}
            </LiquidButton3D>

            <LiquidButton3D
              variant="glass-gold"
              size="lg"
              icon={LogIn}
              onClick={() => navigate('/login')}
            >
              {masterActive ? 'Master Sign In' : 'Sign In / Free Trial'}
            </LiquidButton3D>

            <button
              type="button"
              onClick={() => navigate('/architecture')}
              className="lx-hero-link-pill"
            >
              <Activity size={13} color="#d97706" />
              <span>Server &amp; Portals</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </motion.div>

        <div className="lx-hero-demo-wrap">
          <HeroLiveDemoCard isMaster={masterActive} />
        </div>
      </section>

      {/* 2. Upfront Portal Explainers & Separate Sign-In Routes */}
      <section className="lx-portal-cards-section" aria-label="Workspace Portals and Sign-In Routes">
        <div className="lx-portal-section-head">
          <h2>Choose Your Portal &amp; Sign-In Route</h2>
          <span>Client, Master Fleet, and Admin share one real-time API engine with dedicated logins</span>
        </div>

        <div className="lx-portal-cards-grid">
          {/* CLIENT PORTAL CARD */}
          <motion.article
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className={`lx-golden-glass-card lx-portal-card ${!masterActive ? 'is-active-portal' : ''}`}
          >
            <div className="lx-portal-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="lx-conn-icon-badge" style={{ color: '#059669', borderColor: 'rgba(5, 150, 105, 0.35)' }}>
                  <Laptop size={16} />
                </span>
                <div>
                  <h3>Client Workspace</h3>
                  <code>{CLIENT_ORIGIN.replace(/^https?:\/\//, '')}/login</code>
                </div>
              </div>
              <span className="lx-portal-role-badge is-client">Teams &amp; Founders</span>
            </div>

            <p>
              Fast city &amp; zone lead extraction, satellite map pins, saved lead folders, live mobile/STD filters, and instant Excel / vCard exports.
            </p>

            <div className="lx-portal-card-actions">
              <button
                type="button"
                className="lx-portal-btn-primary"
                onClick={() => openPortalLogin('client', navigate, 'signin')}
              >
                <LogIn size={13} />
                <span>Client Sign In</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
                onClick={() => openPortalLogin('client', navigate, 'signup')}
              >
                <span>Free Trial</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
                onClick={() => openClientWorkspace(navigate, '/command?country=IN', ensureConnected)}
                title="Open Client Command Center"
              >
                <span>Launch</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          </motion.article>

          {/* MASTER PORTAL CARD */}
          <motion.article
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className={`lx-golden-glass-card lx-portal-card ${masterActive ? 'is-active-portal' : ''}`}
          >
            <div className="lx-portal-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="lx-conn-icon-badge" style={{ color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.42)' }}>
                  <Server size={16} />
                </span>
                <div>
                  <h3>Master Fleet</h3>
                  <code>{MASTER_ORIGIN.replace(/^https?:\/\//, '')}/login</code>
                </div>
              </div>
              <span className="lx-portal-role-badge is-master">Operators &amp; Scale</span>
            </div>

            <p>
              District, state &amp; 11-nation sweeps, multi-engine job telemetry, self-learning category synonyms, and fleet-wide lead aggregation.
            </p>

            <div className="lx-portal-card-actions">
              <button
                type="button"
                className="lx-portal-btn-primary is-amber"
                onClick={() => openPortalLogin('master', navigate)}
              >
                <LogIn size={13} />
                <span>Master Sign In</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
                onClick={() => openMasterWorkspace(navigate, '/command?country=IN')}
              >
                <span>Open Fleet</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          </motion.article>

          {/* ADMIN & SERVER CONNECTIVITY CARD */}
          <motion.article
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="lx-golden-glass-card lx-portal-card"
          >
            <div className="lx-portal-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="lx-conn-icon-badge" style={{ color: '#0284c7', borderColor: 'rgba(2, 132, 199, 0.38)' }}>
                  <Sliders size={16} />
                </span>
                <div>
                  <h3>Admin &amp; Server</h3>
                  <code>{ADMIN_ORIGIN.replace(/^https?:\/\//, '')}</code>
                </div>
              </div>
              <span className="lx-portal-role-badge is-admin">Admin &amp; Health</span>
            </div>

            <p>
              Customer onboarding, free trial &amp; quota policies, trending search analytics, and real-time backend server connectivity &amp; latency status.
            </p>

            <div className="lx-portal-card-actions">
              <button
                type="button"
                className="lx-portal-btn-primary is-blue"
                onClick={() => openAdminWorkspace(navigate, '/')}
              >
                <Sliders size={13} />
                <span>Open Admin</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
                onClick={() => navigate('/architecture')}
              >
                <Activity size={13} />
                <span>Server Health</span>
              </button>
            </div>
          </motion.article>
        </div>
      </section>

      {/* 3. Concise Capability Strip */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <CheckCircle2 size={13} color="#d97706" />
          <span>52 Tracked Lead Fields</span>
        </span>
        <span className="lx-value-chip">
          <Globe size={13} color="#b45309" />
          <span>11 Sovereign Markets</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>Mobile (MOB) + Landline (STD) Auto-Split</span>
        </span>
        <span className="lx-value-chip">
          <ShieldCheck size={13} color="#059669" />
          <span>100% Legal Open-Web Indexing</span>
        </span>
      </div>
    </div>
  );
}
