import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, Rocket, ShieldCheck, Filter, Cpu, PlayCircle } from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeSwarmCluster3D from '../components/three/ThreeSwarmCluster3D';
import CategoryFidelityAnimation from '../components/CategoryFidelityAnimation';
import RollingCounter from '../components/RollingCounter';
import ScrapeProgressionFlow from '../components/ScrapeProgressionFlow';

const ENGINE_CATEGORIES = [
  {
    id: 'geo',
    name: 'Maps & Geospatial (4 Cores)',
    tagline: 'Territory Micro-Sweeper',
    desc: 'Breaks any city or district into micro-coordinates to bypass Google Maps search caps completely.',
    color: '#10b981'
  },
  {
    id: 'dirs',
    name: 'Business Registries (7 Cores)',
    tagline: 'Official Commercial Records',
    desc: 'Cross-checks national trade databases and registrar filings for active corporate registration.',
    color: '#06b6d4'
  },
  {
    id: 'b2b',
    name: 'B2B & Wholesale (1 Core)',
    tagline: 'Agri & Industrial Stockists',
    desc: 'Discovers unlisted wholesale suppliers, commodity commission agents, and manufacturers.',
    color: '#3b82f6'
  },
  {
    id: 'hospitality',
    name: 'Hospitality & Venues (4 Cores)',
    tagline: 'Event & Hall Infrastructure',
    desc: 'Extracts banquet halls, convention centers, and wedding vendors with verified capacity.',
    color: '#f59e0b'
  },
  {
    id: 'web',
    name: 'Live Web Crawlers (3 Cores)',
    tagline: 'Direct Decision-Maker Contacts',
    desc: 'Deep-crawls company websites to extract direct owner mobile numbers and verified WhatsApp.',
    color: '#8b5cf6'
  },
  {
    id: 'clean',
    name: 'Data Cleaner & Quality (3 Cores)',
    tagline: 'Zero Duplicates · Phone Validator',
    desc: 'Removes dead landlines, tags WhatsApp numbers, eliminates duplicates, and formats for Excel.',
    color: '#ec4899'
  }
];

export default function LandingArchitecture() {
  const navigate = useNavigate();
  const [selectedCatId, setSelectedCatId] = useState('geo');
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'swarm' | 'fidelity'

  const selectedCat = ENGINE_CATEGORIES.find(c => c.id === selectedCatId) || ENGINE_CATEGORIES[0];

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge with Mode Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <span className="lx-highlight-tag">
          <Layers size={13} />
          <span>✦ HOW IT WORKS UNDER THE HOOD</span>
        </span>

        {/* 3D Tab Switcher: Parallel Pipeline vs Swarm vs Categorisation */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(241, 245, 249, 0.95)',
            border: '1px solid rgba(203, 213, 225, 0.8)',
            borderRadius: 999,
            padding: 3,
            gap: 4
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: 'none',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'pipeline' ? '#ffffff' : 'transparent',
              color: activeTab === 'pipeline' ? '#047857' : '#64748b',
              boxShadow: activeTab === 'pipeline' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.16s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <PlayCircle size={12} />
            <span>Parallel Scrape Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('swarm')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: 'none',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'swarm' ? '#ffffff' : 'transparent',
              color: activeTab === 'swarm' ? '#0891b2' : '#64748b',
              boxShadow: activeTab === 'swarm' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.16s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Cpu size={12} />
            <span>22-Engine Parallel Swarm</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fidelity')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: 'none',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'fidelity' ? '#ffffff' : 'transparent',
              color: activeTab === 'fidelity' ? '#8b5cf6' : '#64748b',
              boxShadow: activeTab === 'fidelity' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.16s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Filter size={12} />
            <span>Zero Off-Topic Filter</span>
          </button>
        </div>
      </motion.div>

      {/* 2. Headline & Simple Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          {activeTab === 'pipeline' ? (
            <>
              22 Engines Run In Parallel.{' '}
              <span className="lx-gradient-text">For Every Single Search.</span>
            </>
          ) : activeTab === 'swarm' ? (
            <>
              22 Specialized Sources.{' '}
              <span className="lx-gradient-text">Zero Search Caps.</span>
            </>
          ) : (
            <>
              Zero Off-Topic Waste.{' '}
              <span className="lx-gradient-text">100% Pure Leads.</span>
            </>
          )}
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          {activeTab === 'pipeline' ? (
            'Zero sequential waiting. Google Maps, corporate registries, official websites, Instagram, Facebook, X, and TikTok are scraped simultaneously in one lightning-fast parallel sweep.'
          ) : activeTab === 'swarm' ? (
            'Instead of searching just one website, our engine queries Maps, commercial registries, and live websites simultaneously—giving you complete local depth.'
          ) : (
            'Searching for Dentists? You will never get general clinics. Searching for B2B Cloud Agencies? You will never get phone repair shops. Our smart filters reject all off-topic noise.'
          )}
        </p>
      </div>

      {/* 3. Stage Content: Parallel Pipeline, Swarm Core, or Categorisation Funnel */}
      {activeTab === 'pipeline' ? (
        <motion.div
          key="pipeline"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{ width: '100%', maxWidth: 1040, margin: '0 auto' }}
        >
          <ScrapeProgressionFlow onLaunch={() => navigate('/command?country=IN')} />
        </motion.div>
      ) : activeTab === 'swarm' ? (
        <motion.div
          key="swarm"
          className="lx-engine-hub-stage lx-border-beam-box"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'center' }}>
            {/* Left: 3D WebGL Swarm Cluster Canvas */}
            <div style={{ height: 210, width: '100%', position: 'relative', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <ThreeSwarmCluster3D selectedEngine={selectedCatId} />
              <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
                <span>22-Core Live Topology</span>
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
      ) : (
        <motion.div
          key="fidelity"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="lx-border-beam-box"
        >
          <CategoryFidelityAnimation />
        </motion.div>
      )}

      {/* 4. Tactile 3D Liquid Gold Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command?country=IN')}
        >
          Launch 22-Engine Swarm
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
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
          <span>✓ Universal Trade Mutual Exclusion</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Zero Category Bleed Guaranteed</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ 100% Brand-Safe Extraction</span>
        </span>
      </div>
    </div>
  );
}
