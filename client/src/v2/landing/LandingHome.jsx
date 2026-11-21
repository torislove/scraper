import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Zap, Radio, Server, ShieldCheck, ArrowRight, CheckCircle2, Tag, Gift, Laptop, Layers } from 'lucide-react';
import { useExtension } from '../context/ExtensionContext';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeRadarDish3D from '../components/three/ThreeRadarDish3D';
import RollingCounter from '../components/RollingCounter';
import MasterVsClientShowcase from '../components/MasterVsClientShowcase';

const DEMO_SCENARIOS = [
  {
    id: 'tenali-turmeric',
    pill: '🇮🇳 Tenali & Guntur (Tier-2 AP)',
    title: 'Tenali Mandals & Guntur AP',
    query: 'Wholesale Turmeric Suppliers in Tenali Mandals AP',
    countNum: 384,
    countLabel: '384 verified leads',
    leads: [
      { name: 'Minar Traders & Turmeric Millers', area: 'Gopal Reddy St, Tenali · PIN 522201', rating: '5.0', reviews: 27, phone: '+91 98856 03754', tag: 'Direct WhatsApp' },
      { name: 'Sri Balaji Turmeric Processing Co', area: 'Burripalem Rd, Tenali · PIN 522201', rating: '5.0', reviews: 14, phone: '+91 94906 42816', tag: 'High Intent' }
    ]
  },
  {
    id: 'hyderabad-it',
    pill: '🇮🇳 Hyderabad Tech Metro',
    title: 'HITEC City & Gachibowli, Hyderabad',
    query: 'Software companies in HITEC City Hyderabad',
    countNum: 1194,
    countLabel: '1,194 leads',
    leads: [
      { name: 'CyberTowers Cloud Systems', area: 'HITEC City, Hyderabad · PIN 500081', rating: '4.9', reviews: 318, phone: '+91 98490 12044', tag: 'Direct WhatsApp' },
      { name: 'Deccan Digital Solutions', area: 'Madhapur, Hyderabad · PIN 500081', rating: '4.8', reviews: 214, phone: '+91 94401 88921', tag: 'Enterprise Web' }
    ]
  },
  {
    id: 'dallas-hvac',
    pill: '🇺🇸 Dallas & Collin TX',
    title: 'Harris & Dallas Counties, TX',
    query: 'HVAC Contractors in Dallas County TX',
    countNum: 842,
    countLabel: '842 leads',
    leads: [
      { name: 'Lone Star Air & Heating Co.', area: 'Uptown Dallas, TX · ZIP 75201', rating: '4.9', reviews: 420, phone: '+1 (214) 555-0192', tag: 'Commercial' },
      { name: 'Metroplex Climate Solutions', area: 'Harris County, TX · ZIP 77002', rating: '4.8', reviews: 265, phone: '+1 (469) 555-4418', tag: 'Emergency' }
    ]
  },
  {
    id: 'munich-cnc',
    pill: '🇩🇪 Munich & Garching B2B',
    title: 'Landkreis München & Oberbayern',
    query: 'Engineering Firms in Landkreis München',
    countNum: 528,
    countLabel: '528 leads',
    leads: [
      { name: 'Bavaria Präzisionstechnik GmbH', area: 'Garching bei München · PLZ 85748', rating: '4.9', reviews: 164, phone: '+49 89 3290 210', tag: 'CNC Aerospace' },
      { name: 'München Automation & Robotik', area: 'Unterföhring · PLZ 85774', rating: '4.8', reviews: 98, phone: '+49 89 3290 740', tag: 'Robotics' }
    ]
  }
];

export default function LandingHome() {
  const navigate = useNavigate();
  const { ensureConnected, skipAndRunLocal } = useExtension();
  const [activeIdx, setActiveIdx] = useState(0);
  const [stageMode, setStageMode] = useState('radar'); // 'radar' | 'editions'
  const hardware = React.useMemo(() => detectDeviceHardware(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % DEMO_SCENARIOS.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const activeScenario = DEMO_SCENARIOS[activeIdx];

  const handleLaunch = () => {
    ensureConnected(() => navigate('/command?country=IN'), { country: 'IN' });
  };

  const handleLocalLaunch = () => {
    if (skipAndRunLocal) skipAndRunLocal();
    navigate('/command?country=IN&mode=local');
  };

  return (
    <div className="lx-screen-container">
      {/* 1. High-Impact Eyebrow Badge & View Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <span className="lx-highlight-tag">
          <span className="lx-status-dot-pulse" />
          <span>⚡ 40,000+ CITIES &amp; TOWNS · NOMINAL ENGINE FEES ONLY · ZERO CLOUD RAM MARKUP</span>
        </span>

        {/* Cockpit Mode Toggle: 3D Radar vs Client/Master Editions */}
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
            onClick={() => setStageMode('radar')}
            style={{
              padding: '3px 11px',
              borderRadius: 999,
              border: 'none',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
              background: stageMode === 'radar' ? '#ffffff' : 'transparent',
              color: stageMode === 'radar' ? '#047857' : '#64748b',
              boxShadow: stageMode === 'radar' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.16s ease'
            }}
          >
            3D Radar Cockpit
          </button>
          <button
            type="button"
            onClick={() => setStageMode('editions')}
            style={{
              padding: '3px 11px',
              borderRadius: 999,
              border: 'none',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
              background: stageMode === 'editions' ? '#ffffff' : 'transparent',
              color: stageMode === 'editions' ? '#0891b2' : '#64748b',
              boxShadow: stageMode === 'editions' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.16s ease'
            }}
          >
            Client vs. Master Editions
          </button>
        </div>
      </motion.div>

      {/* 2. Kinetic Typography Headline */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          Every Metro City. Every Mandal.{' '}
          <span className="lx-gradient-text">Full Local Depth.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '6px auto 0' }}>
          Extract verified phone numbers, direct WhatsApp contacts, and business profiles across{' '}
          <strong style={{ color: '#047857', fontWeight: 800 }}>
            40,000+ cities, 6,000+ mandals, and <RollingCounter target={650000} suffix="+" /> local units
          </strong> in India, US, UK, and 8 global nations.
        </p>
      </div>

      {/* 3. Limited-Time Try-Out Launch Offer Banner (Nov 23 to Jan 23) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        style={{
          width: '100%',
          maxWidth: 920,
          margin: '2px auto',
          background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 55%, #f0fdf4 100%)',
          border: '1.5px solid #10b981',
          borderRadius: 14,
          padding: '8px 16px',
          boxShadow: '0 8px 24px -6px rgba(16, 185, 129, 0.22), 0 0 0 1px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 850,
              padding: '3px 8px',
              borderRadius: 6,
              background: '#047857',
              color: '#ffffff',
              letterSpacing: '0.04em'
            }}
          >
            🔥 TRY-OUT OFFER
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 850, color: '#0f172a' }}>
                Founder Pass:{' '}
                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: 11.5 }}>
                  ₹1,499
                </span>{' '}
                <strong style={{ color: '#047857', fontSize: 14 }}>₹500 / month</strong>{' '}
                <span style={{ fontSize: 10, color: '#64748b' }}>+ GST</span>
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#d1fae5', padding: '1px 6px', borderRadius: 4 }}>
                Nov 23 – Jan 23
              </span>
            </div>
            <span style={{ fontSize: 10.5, color: '#334155', fontWeight: 650 }}>
              🎁 <strong>First 2 Full Territory Scrapes Are 100% Free From Us</strong> · Zero deposit required.
            </span>
          </div>
        </div>

        <LiquidButton3D
          variant="emerald"
          size="xs"
          icon={Rocket}
          pulse
          onClick={handleLaunch}
        >
          Claim ₹500 Pass &amp; 2 Free Scrapes
        </LiquidButton3D>
      </motion.div>

      {/* 4. Interactive Stage: Toggle between Radar Cockpit & Master vs Client Editions */}
      <AnimatePresence mode="wait">
        {stageMode === 'radar' ? (
          <motion.div
            key="radar-stage"
            className="lx-compact-cockpit lx-border-beam-box"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
          >
            {/* Cockpit Bar with Status Pills */}
            <div className="lx-compact-cockpit-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Radio size={14} color="#007aff" />
                  <span>3D WebGL Radar · Multi-City Territory Sweeper v2.4</span>
                </span>
              </div>

              {/* Quick Scenario Pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {DEMO_SCENARIOS.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 750,
                      border: idx === activeIdx ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                      background: idx === activeIdx ? '#ecfdf5' : '#ffffff',
                      color: idx === activeIdx ? '#047857' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.16s ease'
                    }}
                  >
                    {sc.pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Cockpit Body: Radar Canvas + Live Streamed Lead Cards */}
            <div className="lx-compact-body">
              {/* Left Sub-Column: 3D Radar Dish */}
              <div className="lx-radar-canvas-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="lx-precision-telemetry">AZIMUTH BEACON LOCK</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                    {activeScenario.title}
                  </span>
                </div>

                <div style={{ height: 160, width: '100%', position: 'relative' }}>
                  <ThreeRadarDish3D />
                  <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                    <span>Radar Sweep: 360° Multi-City</span>
                    <span style={{ color: '#059669', fontWeight: 800 }}>&lt;300ms Ping</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <span>Local System RAM: <strong>{hardware.ramGb} GB</strong></span>
                  <span style={{ color: '#047857', fontWeight: 800 }}>
                    <RollingCounter target={activeScenario.countNum} /> Leads Extracted
                  </span>
                </div>
              </div>

              {/* Right Sub-Column: Real-time Live Extracted Lead Cards */}
              <div style={{ padding: '12px 14px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a' }}>
                      City Search: &ldquo;{activeScenario.query}&rdquo;
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 7px', borderRadius: 6 }}>
                      LIVE REAL-TIME
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {activeScenario.leads.map((ld, i) => (
                      <div
                        key={ld.name + i}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 9,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 11.5, color: '#0f172a', display: 'block' }}>{ld.name}</strong>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{ld.area}</span>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#059669', display: 'block' }}>{ld.phone}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '1px 5px', borderRadius: 4 }}>
                            {ld.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
                  <span>Deduplication: <strong>100% Zero Duplicates</strong></span>
                  <span>Export: <strong>Instant Excel .xlsx</strong></span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="editions-stage"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', maxWidth: 980, margin: '0 auto' }}
          >
            <MasterVsClientShowcase />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Tactile 3D Liquid Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <LiquidButton3D
          variant="emerald"
          size="lg"
          icon={Rocket}
          pulse
          onClick={handleLaunch}
        >
          Launch Dedicated Engine Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="cyan"
          size="lg"
          icon={Zap}
          onClick={handleLocalLaunch}
        >
          ⚡ Run on Local Server Engine
        </LiquidButton3D>
      </div>

      {/* 6. 4 High-Impact Value Badges */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <CheckCircle2 size={13} color="#059669" />
          <span>40,000+ Cities &amp; Micro-Zone Mandals</span>
        </span>
        <span className="lx-value-chip">
          <span>🇮🇳 7,935 Indian Cities &amp; 6k+ Mandals</span>
        </span>
        <span className="lx-value-chip">
          <span>🇺🇸 19,495 US Cities &amp; 3,143 Counties</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>⚡ Nominal Engine Pricing Only</span>
        </span>
      </div>
    </div>
  );
}
