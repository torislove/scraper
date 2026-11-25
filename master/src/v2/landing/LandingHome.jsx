import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Laptop,
  Layers,
  LogIn,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';
import HeroLiveDemoCard from '../components/HeroLiveDemoCard';
import {
  CLIENT_ORIGIN,
  MASTER_ORIGIN,
  isMasterRuntime,
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
                  ? 'MASTER FLEET · STATE & NATIONAL SCALE'
                  : 'CLIENT & MASTER · 11 GLOBAL MARKETS'}
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
                <span className="lx-gradient-text">Master Fleet Control.</span>
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
              ? 'Run district, state, and 11-nation lead sweeps with self-learning synonyms and multi-engine orchestration—or switch cleanly to the Client Cockpit.'
              : 'Extract direct owner mobiles (+91 MOB), STD landlines, official websites, emails, WhatsApp links, and 3D social handles across 11 markets—exported in 1 click to .xlsx & .vcf.'}
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
              <Layers size={13} color="#d97706" />
              <span>How It Works</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </motion.div>

        <div className="lx-hero-demo-wrap">
          <HeroLiveDemoCard isMaster={masterActive} />
        </div>
      </section>

      {/* 2. Upfront Client vs Master Edition Choice */}
      <section className="lx-portal-cards-section" aria-label="Choose Edition to Run">
        <div className="lx-portal-section-head">
          <h2>Choose What You Want to Run: Client or Master</h2>
          <span>Both editions share live satellite maps &amp; verified contact extraction—pick your workflow</span>
        </div>

        <div className="lx-portal-cards-grid lx-two-col">
          {/* CLIENT WORKSPACE CARD */}
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
                  <code>{CLIENT_ORIGIN.replace(/^https?:\/\//, '')}</code>
                </div>
              </div>
              <span className="lx-portal-role-badge is-client">Teams &amp; Founders</span>
            </div>

            <p>
              Ideal for fast city &amp; neighborhood lead sweeps: live satellite territory map, instant Mobile (MOB) vs. Landline (STD) filters, saved lead folders, and 1-click Excel / vCard exports.
            </p>

            <div className="lx-portal-card-actions">
              <button
                type="button"
                className="lx-portal-btn-primary"
                onClick={() => openClientWorkspace(navigate, '/command?country=IN', ensureConnected)}
              >
                <Rocket size={13} />
                <span>Run Client</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
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
                <span>7-Day Free Trial</span>
              </button>
            </div>
          </motion.article>

          {/* MASTER FLEET CARD */}
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
                  <code>{MASTER_ORIGIN.replace(/^https?:\/\//, '')}</code>
                </div>
              </div>
              <span className="lx-portal-role-badge is-master">Operators &amp; Scale</span>
            </div>

            <p>
              Built for full-district, state, and 11-nation sweeps: multi-zone parallel execution, self-learning synonym intelligence, and consolidated high-volume lead pipelines.
            </p>

            <div className="lx-portal-card-actions">
              <button
                type="button"
                className="lx-portal-btn-primary is-amber"
                onClick={() => openMasterWorkspace(navigate, '/command?country=IN')}
              >
                <Rocket size={13} />
                <span>Run Master</span>
              </button>
              <button
                type="button"
                className="lx-portal-btn-ghost"
                onClick={() => openPortalLogin('master', navigate)}
              >
                <LogIn size={13} />
                <span>Master Sign In</span>
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
