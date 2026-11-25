import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Cpu,
  Database,
  Globe2,
  Laptop,
  Layers,
  LogIn,
  Rocket,
  Server,
  ShieldCheck
} from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import ScrapeProgressionFlow from '../components/ScrapeProgressionFlow';
import {
  isMasterRuntime,
  openClientWorkspace,
  openMasterWorkspace,
  openPortalLogin
} from '../utils/editionSwitch';

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'City & Zone Grid Split',
    desc: 'Decomposes metro cities, districts & mandals into non-overlapping geo sectors to capture every listing.',
    icon: Globe2,
    color: '#059669'
  },
  {
    step: '02',
    title: 'Parallel Multi-Engine Run',
    desc: 'Queries Maps, commercial directories & official websites concurrently with smart rate governance.',
    icon: Cpu,
    color: '#d97706'
  },
  {
    step: '03',
    title: 'MOB / STD & 3D Social Enrich',
    desc: 'Separates direct mobile numbers from landlines, enriches WhatsApp/IG/FB/LI & validates domains.',
    icon: Layers,
    color: '#0284c7'
  },
  {
    step: '04',
    title: 'Live Workspace & Export',
    desc: 'Streams verified pins onto your satellite map and saves organized folders ready for .xlsx & .vcf export.',
    icon: Database,
    color: '#92400e'
  }
];

export default function LandingArchitecture() {
  const navigate = useNavigate();
  const masterActive = isMasterRuntime();

  return (
    <div className="lx-screen-container lx-arch-shell">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="lx-highlight-tag">
          <Layers size={13} color="#d97706" />
          <span>HOW CLIENT &amp; MASTER WORK</span>
        </span>
      </motion.div>

      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          One Autonomous Pipeline.{' '}
          <span className="lx-gradient-text">Run as Client or Master.</span>
        </h1>
        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Choose Client for nimble city campaigns or Master for full-district and 11-country territory sweeps—both powered by the exact same 4-stage live extraction flow.
        </p>
      </div>

      {/* Animated Scrape Progression Showcase */}
      <div style={{ width: '100%', maxWidth: 1080 }}>
        <ScrapeProgressionFlow
          onLaunch={() =>
            masterActive
              ? openMasterWorkspace(navigate, '/command?country=IN')
              : openClientWorkspace(navigate, '/command?country=IN')
          }
        />
      </div>

      {/* Clean 4-Stage Pipeline Strip */}
      <div className="lx-arch-steps-grid">
        {PIPELINE_STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="lx-golden-glass-card lx-arch-step-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="lx-arch-step-num">{item.step}</span>
                <Icon size={15} color={item.color} />
              </div>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Edition Quick Launch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Laptop}
          pulse
          onClick={() => openClientWorkspace(navigate, '/command?country=IN')}
        >
          Run Client Workspace
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          icon={Server}
          onClick={() => openMasterWorkspace(navigate, '/command?country=IN')}
        >
          Run Master Fleet
        </LiquidButton3D>

        <button
          type="button"
          className="lx-hero-link-pill"
          onClick={() => openPortalLogin(masterActive ? 'master' : 'client', navigate)}
        >
          <LogIn size={13} color="#d97706" />
          <span>{masterActive ? 'Master Sign In' : 'Client Sign In'}</span>
        </button>
      </div>

      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <CheckCircle2 size={13} color="#059669" />
          <span>Client: City &amp; Zone Precision</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <Rocket size={13} color="#d97706" />
          <span>Master: District &amp; State Sweeps</span>
        </span>
        <span className="lx-value-chip">
          <ShieldCheck size={13} color="#059669" />
          <span>Zero API Keys Required</span>
        </span>
      </div>
    </div>
  );
}
