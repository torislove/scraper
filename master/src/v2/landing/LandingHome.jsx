import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Zap,
  CheckCircle2,
  Database,
  Globe,
  Layers,
  Scale,
  Sparkles
} from 'lucide-react';
import { useExtension } from '../context/ExtensionContext';
import LiquidButton3D from '../components/LiquidButton3D';
import ExtractedDataShowcase3D from '../components/ExtractedDataShowcase3D';
import MasterVsClientShowcase from '../components/MasterVsClientShowcase';
import SocialEnrichmentShowcase from '../components/SocialEnrichmentShowcase';
import LegalTrustPlaybook from '../components/LegalTrustPlaybook';

export default function LandingHome() {
  const navigate = useNavigate();
  const { ensureConnected, skipAndRunLocal } = useExtension() || {};
  const [stageMode, setStageMode] = useState('fields'); // 'fields' | 'social' | 'editions' | 'legal'

  const handleLaunch = () => {
    ensureConnected(() => navigate('/command?country=IN'), { country: 'IN' });
  };

  const handleLocalLaunch = () => {
    if (skipAndRunLocal) skipAndRunLocal();
    navigate('/command?country=IN&mode=local');
  };

  const tabs = [
    { id: 'fields', label: '52 Extracted Fields', icon: Database },
    { id: 'social', label: 'Social & Web Data', icon: Sparkles },
    { id: 'editions', label: 'Master vs. Client', icon: Layers },
    { id: 'legal', label: 'Legal Playbook', icon: Scale }
  ];

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge & Context View Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <span className="lx-highlight-tag">
          <span className="lx-status-dot-pulse" />
          <span>✦ 52-FIELD BUSINESS DATA EXTRACTION &amp; FRONTEND ENRICHMENT</span>
        </span>

        {/* Stage Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(255, 251, 235, 0.85)',
            border: '1.5px solid rgba(217, 119, 6, 0.25)',
            borderRadius: 999,
            padding: 3,
            gap: 3,
            flexWrap: 'wrap',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.95), 0 2px 8px rgba(120, 53, 15, 0.06)'
          }}
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = stageMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStageMode(tab.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: isActive ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid transparent',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#92400e' : '#64748b',
                  boxShadow: isActive ? '0 2px 8px rgba(217, 119, 6, 0.14)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.16s ease'
                }}
              >
                <TabIcon size={12} color={isActive ? '#d97706' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => navigate('/story')}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid rgba(254, 243, 199, 0.75)',
              fontSize: 11,
              fontWeight: 850,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.28)',
              transition: 'all 0.16s ease'
            }}
            title="Read Founder Manoj's Journey & 20% Strategic Equity Allocation"
          >
            👨‍💻 Founder &amp; 20% Equity ★
          </button>
        </div>
      </motion.div>

      {/* 2. Headline Explaining Real Data Extraction & Live Frontend Enrichment */}
      <div style={{ maxWidth: 920 }}>
        <h1 className="lx-kinetic-title">
          All Business Data Extracted.{' '}
          <span className="lx-gradient-text">Enriched Live in Your Frontend.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '6px auto 0' }}>
          Extract official websites, verified mobile numbers, WhatsApp links, emails, social channels, addresses, GSTIN/CIN tax IDs, reviews, and operating hours across 11 nations—deduplicated and enriched in real time inside your workspace.
        </p>
      </div>

      {/* 3. Main Stage */}
      <AnimatePresence mode="wait">
        {stageMode === 'fields' && (
          <motion.div
            key="fields-stage"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            style={{ width: '100%', maxWidth: 1080, margin: '0 auto' }}
          >
            <ExtractedDataShowcase3D />
          </motion.div>
        )}

        {stageMode === 'social' && (
          <motion.div
            key="social-stage"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            style={{ width: '100%', maxWidth: 1040, margin: '0 auto' }}
          >
            <SocialEnrichmentShowcase />
          </motion.div>
        )}

        {stageMode === 'editions' && (
          <motion.div
            key="editions-stage"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            style={{ width: '100%', maxWidth: 1040, margin: '0 auto' }}
          >
            <MasterVsClientShowcase />
          </motion.div>
        )}

        {stageMode === 'legal' && (
          <motion.div
            key="legal-stage"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28 }}
            style={{ width: '100%', maxWidth: 1040, margin: '0 auto' }}
          >
            <LegalTrustPlaybook />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Tactile 3D Liquid Gold Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', margin: '4px 0' }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={handleLaunch}
        >
          Launch Client Engine Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          icon={Zap}
          onClick={handleLocalLaunch}
        >
          Open Local Compute Console
        </LiquidButton3D>
      </div>

      {/* 5. Real Capabilities Strip */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <CheckCircle2 size={13} color="#d97706" />
          <span>52 Real Tracked Business Fields Across 10 Groups</span>
        </span>
        <span className="lx-value-chip">
          <Globe size={13} color="#b45309" />
          <span>Websites, Mobiles, Emails, Socials &amp; Tax IDs</span>
        </span>
        <span className="lx-value-chip">
          <span>⚖️ 100% Legal Public Open-Web Indexing</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>⚡ Client &amp; Master Workspaces Synchronized</span>
        </span>
      </div>
    </div>
  );
}
