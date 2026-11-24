import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket,
  Search,
  Sparkles,
  MapPin,
  MessageCircle,
  Download,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Play,
  Pause,
  Smartphone,
  Globe,
  Mail,
  Scale,
  Clock,
  Building2,
  FileSpreadsheet,
  Layers,
  Tag,
  Star,
  NotebookPen
} from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';

const STEPS = [
  {
    step: '01',
    badge: 'STEP 01 · MULTI-SOURCE DISCOVERY',
    title: '1. Search Any Category & Market',
    description:
      'Enter any industry and city, district, or postal corridor across 11 sovereign nations. 22 specialized engines execute in parallel.',
    color: '#d97706',
    borderColor: 'rgba(217, 119, 6, 0.45)',
    bg: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
    items: [
      { label: 'Any B2B Category & City / District / PIN Code', icon: Search },
      { label: 'Google Maps Places & Micro-Zone Grid', icon: MapPin },
      { label: 'OpenStreetMap Boundary Overpass Scan', icon: Globe },
      { label: 'Official Company Websites & JSON-LD Metadata', icon: Layers },
      { label: 'National Directories & Corporate Registries', icon: Building2 }
    ],
    footerIcon: Zap,
    footerText: '100% Live Parallel Indexing · 22 Active Cores'
  },
  {
    step: '02',
    badge: 'STEP 02 · LIVE FRONTEND ENRICHMENT',
    title: '2. Extract & Enrich 52 Real Fields',
    description:
      'Extracted data streams into the frontend where every business record is deduplicated, normalized, and enriched in real time.',
    color: '#0284c7',
    borderColor: '#38bdf8',
    bg: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)',
    items: [
      { label: 'Mobile Numbers, E.164 & Direct WhatsApp Links', icon: Smartphone },
      { label: 'Primary & Secondary Business Emails', icon: Mail },
      { label: 'Official Websites, Instagram, Facebook, LinkedIn & X', icon: Globe },
      { label: 'Verified GSTIN, PAN & CIN Tax Identifiers', icon: Scale },
      { label: 'Full Address, PIN Code, Plus Code & Lat/Lng', icon: MapPin },
      { label: 'Ratings, Reviews, Operating Hours & Catalogs', icon: Star }
    ],
    footerIcon: ShieldCheck,
    footerText: 'Strict Off-Topic Filtering · Zero Empty Guesswork'
  },
  {
    step: '03',
    badge: 'STEP 03 · COMMAND CENTER & EXPORT',
    title: '3. Connect & Export Clean Datasets',
    description:
      'Inspect every enriched business inside the Command Center, launch direct outreach, and export structured sheets ready for any CRM.',
    color: '#059669',
    borderColor: '#10b981',
    bg: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
    items: [
      { label: 'Zero-Duplicate Unified Vendor Profile Drawer', icon: Building2 },
      { label: '1-Click Direct WhatsApp Chat & Browser Calling', icon: MessageCircle },
      { label: 'Structured Excel (.xlsx) Multi-Sheet Workbooks', icon: FileSpreadsheet },
      { label: 'Clean CSV & Mobile Phonebook VCF Exports', icon: Download },
      { label: 'Built-In CRM Stages, Notes & Follow-Up Tasks', icon: NotebookPen }
    ],
    footerIcon: CheckCircle2,
    footerText: 'Instant Export · Excel, CSV & WhatsApp VCF'
  }
];

export default function LandingSolutions() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(true);

  useEffect(() => {
    if (!isAutoTouring) return undefined;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoTouring]);

  return (
    <div className="lx-screen-container">
      {/* 1. Top Eyebrow Badge & Auto-Tour Controller */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <span className="lx-highlight-tag">
          <Sparkles size={13} />
          <span>EXTRACTION &amp; FRONTEND ENRICHMENT WORKFLOW</span>
        </span>

        <button
          type="button"
          onClick={() => setIsAutoTouring((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: isAutoTouring ? '#fffbeb' : '#f1f5f9',
            border: isAutoTouring ? '1.5px solid #d97706' : '1.5px solid #cbd5e1',
            color: isAutoTouring ? '#92400e' : '#64748b',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.16s ease'
          }}
          title={isAutoTouring ? 'Pause Workflow Tour' : 'Resume Workflow Tour'}
        >
          {isAutoTouring ? (
            <>
              <span className="lx-chip-live-dot" />
              <span>Auto-Tour Active</span>
              <Pause size={10} style={{ marginLeft: 2 }} />
            </>
          ) : (
            <>
              <Play size={10} />
              <span>Paused · Click to Resume</span>
            </>
          )}
        </button>
      </motion.div>

      {/* 2. Headline */}
      <div style={{ maxWidth: 880, textAlign: 'center' }}>
        <h1 className="lx-kinetic-title">
          From Live Search to{' '}
          <span className="lx-gradient-text">52 Enriched Business Fields.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Zero static databases or dummy templates. Every search extracts websites, mobiles, emails, social links, corporate tax IDs, and hours directly into your live Command Center.
        </p>
      </div>

      {/* 3. Main Stage: 3 Animated Workflow Cards (Pure Capabilities, Zero Mockups) */}
      <motion.div
        className="lx-solutions-3step-stage"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div className="lx-solutions-3col-grid">
          {STEPS.map((st, idx) => {
            const isActive = activeStep === idx;
            const FooterIcon = st.footerIcon;
            return (
              <motion.div
                key={st.step}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className={`lx-step-card is-step-${idx} ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setIsAutoTouring(false);
                  setActiveStep(idx);
                }}
                style={{
                  borderColor: isActive ? st.borderColor : '#e2e8f0',
                  background: isActive ? st.bg : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: isActive ? '#fffbeb' : '#f8fafc',
                        color: st.color,
                        border: `1px solid ${st.borderColor}`,
                        letterSpacing: '0.04em'
                      }}
                    >
                      {st.badge}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: st.color }}>{st.step}</span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: 16.5, fontWeight: 850, color: '#0f172a', lineHeight: 1.25 }}>
                    {st.title}
                  </h3>
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#334155', lineHeight: 1.45 }}>
                    {st.description}
                  </p>

                  {/* Real Extracted Capability Rows with Icons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {st.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={item.label}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 9,
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: 'rgba(255, 251, 235, 0.95)',
                              border: '1px solid rgba(217, 119, 6, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <ItemIcon size={12} color={st.color} />
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b', textAlign: 'left' }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 8,
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: st.color,
                    fontWeight: 800
                  }}
                >
                  <FooterIcon size={13} />
                  <span>{st.footerText}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command')}
        >
          Launch Verified Lead Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          onClick={() => navigate('/architecture')}
        >
          Explore All 22 Engines →
        </LiquidButton3D>
      </div>

      {/* 5. Real Capabilities Strip */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <Clock size={12} color="#d97706" />
          <span>100% Real-Time Live Web Indexing</span>
        </span>
        <span className="lx-value-chip">
          <Tag size={12} color="#b45309" />
          <span>52 Tracked Business &amp; Contact Fields</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Instant Excel, CSV &amp; VCF Exports</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Active Across 11 Sovereign Markets</span>
        </span>
      </div>
    </div>
  );
}
