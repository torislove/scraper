import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, Rocket, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeSwarmCluster3D from '../components/three/ThreeSwarmCluster3D';

const ENGINE_CATEGORIES = [
  {
    id: 'geo',
    name: 'Maps & Geospatial (4 Cores)',
    tagline: 'Micro-Zone Territory Sweepers',
    desc: 'Breaks any city, mandal, or county into micro-coordinates to completely bypass Google listing caps (120+ limit).',
    color: '#10b981'
  },
  {
    id: 'dirs',
    name: 'National Directories (7 Cores)',
    tagline: 'Verified Commercial Registries',
    desc: 'Cross-checks official local business directories, MCA filings, and chamber of commerce records for corporate registration.',
    color: '#06b6d4'
  },
  {
    id: 'b2b',
    name: 'B2B & Wholesale (1 Core)',
    tagline: 'Bulk Traders & Agri-Distributors',
    desc: 'Uncovers unlisted wholesale suppliers, mandi commission agents, raw material stockists, and industrial manufacturers.',
    color: '#3b82f6'
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Venues (4 Cores)',
    tagline: 'Event & Banquet Infrastructure',
    desc: 'Scrapes banquet halls, convention centers, wedding venues, catering suppliers, and hotels with seating capacities.',
    color: '#f59e0b'
  },
  {
    id: 'web',
    name: 'Web & Direct Crawlers (3 Cores)',
    tagline: 'Direct Decision-Maker Scraping',
    desc: 'Deep-crawls company websites, "About" and "Contact" pages to harvest verified founder emails and direct mobile numbers.',
    color: '#8b5cf6'
  },
  {
    id: 'clean',
    name: 'Deduplication & Quality (3 Cores)',
    tagline: 'Carrier Validator & CRM Formatter',
    desc: 'Strips dead landlines, tags WhatsApp numbers, eliminates duplicates across engines, and formats directly for Excel (.xlsx).',
    color: '#ec4899'
  }
];

export default function LandingArchitecture() {
  const navigate = useNavigate();
  const [selectedCatId, setSelectedCatId] = useState('geo');

  const selectedCat = ENGINE_CATEGORIES.find(c => c.id === selectedCatId) || ENGINE_CATEGORIES[0];

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="lx-highlight-tag">
          <Layers size={13} />
          <span>PARALLEL SWARM TECHNOLOGY · 22 SPECIALIZED EXTRACTION CORES</span>
        </span>
      </motion.div>

      {/* 2. Headline & Simple Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          22 Engines Querying Together{' '}
          <span className="lx-gradient-text">in Real-Time.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Instead of searching one single website, our swarm queries 22 specialized sources simultaneously —
          Maps, B2B wholesale hubs, public directories, and company websites — removing search caps completely.
        </p>
      </div>

      {/* 3. Interactive 3D WebGL Swarm Stage */}
      <motion.div
        className="lx-engine-hub-stage"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'center' }}>
          {/* Left: 3D WebGL Swarm Cluster Canvas */}
          <div style={{ height: 210, width: '100%', position: 'relative', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <ThreeSwarmCluster3D selectedEngine={selectedCatId} />
            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
              <span>🖱️ Drag to rotate 3D Swarm Core</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>22 Cores Synchronized</span>
            </div>
          </div>

          {/* Right: Selected Category Explainer Card */}
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '4px 0' }}>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 850, textTransform: 'uppercase', color: selectedCat.color, letterSpacing: '0.04em' }}>
                Active Cluster Focus
              </span>
              <h3 style={{ margin: '4px 0 6px', fontSize: 17, fontWeight: 850, color: '#0f172a' }}>
                {selectedCat.name}
              </h3>
              <div style={{ fontSize: 12, fontWeight: 750, color: '#047857', marginBottom: 8 }}>
                ⚡ {selectedCat.tagline}
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#475569' }}>
                {selectedCat.desc}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginTop: 12 }}>
              <ShieldCheck size={13} color="#10b981" />
              <span>Zero IP bans · Hardware-governed rate limit protection</span>
            </div>
          </div>
        </div>

        {/* 6 Category Selection Pills */}
        <div className="lx-engine-categories-grid">
          {ENGINE_CATEGORIES.map(cat => {
            const isSelected = cat.id === selectedCatId;
            return (
              <button
                key={cat.id}
                type="button"
                className={`lx-engine-pod-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, marginTop: 4, flex: 'none' }} />
                <div>
                  <strong style={{ fontSize: 11.5, color: isSelected ? '#047857' : '#0f172a', display: 'block' }}>{cat.name}</strong>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>{cat.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 4. Tactile 3D Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="emerald"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command?country=IN')}
        >
          Launch 22-Engine Swarm
        </LiquidButton3D>

        <LiquidButton3D
          variant="ghost"
          size="lg"
          onClick={() => navigate('/global-coverage')}
        >
          Explore 11 Sovereign Markets →
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ 22 Autonomous Scraping Engines</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ 0 Cloud Scraping Queue Waiting</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Micro-Zone Radius Sweeping</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ 100% Brand-Safe Extraction</span>
        </span>
      </div>
    </div>
  );
}
