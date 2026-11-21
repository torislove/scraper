import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket, Zap, Radio, Server, ShieldCheck, ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useExtension } from '../context/ExtensionContext';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import { StepPinpointIcon, StepSwarmIcon, StepExportIcon } from '../components/FeatureIcons';

const DEMO_SCENARIOS = [
  {
    id: 'tenali-turmeric',
    pill: '🇮🇳 Wholesale Turmeric · Tenali Mandals',
    countryName: 'India',
    query: 'Wholesale Turmeric Suppliers in Tenali Guntur',
    country: 'IN',
    areaLabel: 'Tenali Mandals & Guntur AP · 384 verified wholesale leads',
    count: '384 verified leads',
    pins: [
      { top: '28%', left: '26%' },
      { top: '48%', left: '42%' },
      { top: '34%', left: '68%' },
      { top: '64%', left: '58%' },
      { top: '40%', left: '32%' }
    ],
    leads: [
      { name: 'Minar Traders & Turmeric Millers', area: 'Gopal Reddy St, Tenali · PIN 522201', rating: '5.0', reviews: 27, phone: '+91 98856 03754', isMobile: true, hasPin: true, tag: 'Spices & Agri' },
      { name: 'Sri Balaji Turmeric Processing Co', area: 'Burripalem Rd, Tenali · PIN 522201', rating: '5.0', reviews: 14, phone: '+91 94906 42816', isMobile: true, noWebsite: true, hasPin: true, tag: 'Raw Curcumin' },
      { name: 'Kisan Bio Turmeric Cultivators Hub', area: 'Sivaji Circle, Tenali · PIN 522201', rating: '4.9', reviews: 42, phone: '+91 99494 29934', isMobile: true, hasPin: true, tag: 'Export Grade' }
    ]
  },
  {
    id: 'hyderabad-it',
    pill: '🇮🇳 Software & IT · Hyderabad',
    countryName: 'India',
    query: 'Software companies in HITEC City Hyderabad',
    country: 'IN',
    areaLabel: 'HITEC City & Gachibowli, Hyderabad · 1,194 verified leads',
    count: '1,194 leads',
    pins: [
      { top: '24%', left: '22%' },
      { top: '54%', left: '44%' },
      { top: '32%', left: '72%' },
      { top: '68%', left: '62%' },
      { top: '42%', left: '28%' }
    ],
    leads: [
      { name: 'CyberTowers Cloud Systems', area: 'HITEC City, Hyderabad · PIN 500081', rating: '4.9', reviews: 318, phone: '+91 98490 12044', isMobile: true, hasPin: true, tag: 'Cloud Architecture' },
      { name: 'Deccan Digital Solutions', area: 'Madhapur, Hyderabad · PIN 500081', rating: '4.8', reviews: 214, phone: '+91 94401 88921', isMobile: true, noWebsite: true, hasPin: true, tag: 'Enterprise Web' },
      { name: 'Jubilee Enterprise Tech', area: 'Banjara Hills, Hyderabad · PIN 500034', rating: '4.9', reviews: 276, phone: '+91 90005 44102', isMobile: true, hasPin: true, tag: 'SaaS Platform' }
    ]
  },
  {
    id: 'dallas-hvac',
    pill: '🇺🇸 HVAC & Climate · Dallas County TX',
    countryName: 'United States',
    query: 'HVAC Contractors in Dallas County TX',
    country: 'US',
    areaLabel: 'Harris & Dallas Counties, TX · 842 verified leads',
    count: '842 leads',
    pins: [
      { top: '38%', left: '24%' },
      { top: '28%', left: '50%' },
      { top: '62%', left: '70%' },
      { top: '54%', left: '40%' },
      { top: '34%', left: '76%' }
    ],
    leads: [
      { name: 'Lone Star Air & Heating Co.', area: 'Uptown Dallas, TX · ZIP 75201', rating: '4.9', reviews: 420, phone: '+1 (214) 555-0192', isMobile: true, hasPin: true, tag: 'Commercial HVAC' },
      { name: 'Metroplex Climate Solutions', area: 'Harris County, TX · ZIP 77002', rating: '4.8', reviews: 265, phone: '+1 (469) 555-4418', isMobile: true, noWebsite: true, hasPin: true, tag: 'Emergency Repair' },
      { name: 'Coastal Cooling Mechanical', area: 'Fort Worth, TX · ZIP 76102', rating: '4.7', reviews: 180, phone: '+1 (817) 555-8820', isMobile: true, hasPin: true, tag: 'Chiller Plant' }
    ]
  },
  {
    id: 'munich-cnc',
    pill: '🇩🇪 Precision Engineering · Landkreis München',
    countryName: 'Germany',
    query: 'Engineering Firms in Landkreis München',
    country: 'DE',
    areaLabel: 'Landkreis München & Oberbayern · 528 verified leads',
    count: '528 leads',
    pins: [
      { top: '40%', left: '34%' },
      { top: '52%', left: '58%' },
      { top: '28%', left: '48%' },
      { top: '66%', left: '26%' },
      { top: '36%', left: '78%' }
    ],
    leads: [
      { name: 'Bavaria Präzisionstechnik GmbH', area: 'Garching bei München · PLZ 85748', rating: '4.9', reviews: 164, phone: '+49 89 3290 210', isMobile: false, hasPin: true, tag: 'CNC & Aerospace' },
      { name: 'München Automation & Robotik', area: 'Unterföhring · PLZ 85774', rating: '4.8', reviews: 98, phone: '+49 89 3290 740', isMobile: false, noWebsite: true, hasPin: true, tag: 'Industrial Automation' },
      { name: 'Isar Werkzeugbau Fabrik', area: 'Haar bei München · PLZ 85540', rating: '4.9', reviews: 132, phone: '+49 89 3290 915', isMobile: false, hasPin: true, tag: 'Tooling & Die' }
    ]
  }
];

const EQUAL_PROMINENCE_METRICS = [
  {
    val: '650,000+',
    title: 'Global Administrative Units',
    desc: '619k+ Indian Villages & Mandals · 3,143 US Counties · 100+ UK Boroughs · 293 Canadian Divisions · 537 Australian LGAs · 401 German Landkreise · 82 Irish Districts · 67 NZ Authorities · 257 SA Municipalities · 7 UAE Emirates · 5 Singapore Regions',
    isGreen: true
  },
  {
    val: '11 Nations',
    title: 'Sovereign Markets Tuned',
    desc: 'Native territorial hierarchies with postal codes, area dialing codes, and verified local enterprise registries.',
    isGreen: false
  },
  {
    val: '100% Free',
    title: 'Zero Monthly API Bills',
    desc: 'No Google Cloud billing caps, no proxies to buy, and zero third-party subscription paywalls.',
    isGreen: false
  },
  {
    val: '<300ms',
    title: 'Instant Stop & Excel Export',
    desc: 'Hardware-governed memory sweeps deliver multi-sheet Excel (.xlsx), CSV, and smartphone vCard (.vcf) packages.',
    isGreen: true
  }
];

const THREE_STEPS = [
  {
    num: '01',
    icon: StepPinpointIcon,
    title: 'Target & Geographic Pinpoint',
    desc: 'Enter any product, commodity, or trade (e.g., "Wholesale Turmeric", "HVAC Services") and select your target territory (City, Mandal, County, or Village).'
  },
  {
    num: '02',
    icon: StepSwarmIcon,
    title: 'Hardware-Aware Parallel Swarm',
    desc: 'The engine inspects available RAM, reserves >= 4.5 GB OS headroom, and spins up synchronized discovery cores to sweep micro-zones.'
  },
  {
    num: '03',
    icon: StepExportIcon,
    title: 'Carrier-Verified CRM Export',
    desc: 'Classifies mobile vs landline with direct WhatsApp badges; 1-click export to multi-sheet Excel (.xlsx), CSV, or smartphone phonebook (.vcf).'
  }
];

export default function LandingHome() {
  const navigate = useNavigate();
  const { ensureConnected, skipAndRunLocal } = useExtension();
  const [activeDemoIdx, setActiveDemoIdx] = useState(0);
  const hardware = React.useMemo(() => detectDeviceHardware(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDemoIdx(prev => (prev + 1) % DEMO_SCENARIOS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const activeDemo = DEMO_SCENARIOS[activeDemoIdx];

  const handleLaunch = () => {
    ensureConnected(() => navigate('/command?country=IN'), { country: 'IN' });
  };

  const handleLocalLaunch = () => {
    if (skipAndRunLocal) skipAndRunLocal();
    navigate('/command?country=IN&mode=local');
  };

  return (
    <div className="lx-home-page">
      {/* 1. GRAND BREATHABLE KINETIC HERO (NO BULKY SEARCH BAR) */}
      <section className="lx-hero-clean">
        <div className="lx-wrap" style={{ maxWidth: 1080, textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Floating Eyebrow Pill */}
            <div className="lx-eyebrow-capsule">
              <span className="lx-status-dot" style={{ width: 8, height: 8 }} />
              <span>⚡ THE NEXT-ERA OF COMMERCIAL B2B INTEL · 0 API BILLS EVER</span>
            </div>

            {/* Kinetic Typography Headline */}
            <h1 className="lx-kinetic-h1">
              The Next-Era of Commercial B2B Lead Intelligence{' '}
              <span className="lx-h1-gradient">starts here.</span>
            </h1>

            {/* Sub-headline */}
            <p className="lx-hero-subtitle">
              A unified enterprise intelligence platform that indexes verified local businesses,
              active mobile contacts, and public corporate registries directly on your hardware with
              zero monthly API bills. Equal precision across 619,287 Indian villages and all 3,143 US counties.
            </p>

            {/* Bold Primary Command Center Launch CTA */}
            <div className="lx-hero-cta-box">
              <button
                type="button"
                className="lx-btn-grand-launch"
                onClick={handleLaunch}
              >
                <Rocket size={18} />
                <span>Launch Command Center</span>
              </button>

              <button
                type="button"
                className="lx-btn-subtle-local"
                onClick={handleLocalLaunch}
              >
                <Zap size={14} />
                <span>⚡ Or run on Local Server Engine (Skip Extension)</span>
              </button>

              {/* Micro Trust Points */}
              <div className="lx-hero-trust-strip">
                <span>✓ Zero Credit Card Required</span>
                <span className="lx-dot-sep">·</span>
                <span>✓ 619k+ Indian Villages &amp; 3,143 US Counties</span>
                <span className="lx-dot-sep">·</span>
                <span>✓ 100% Keyless</span>
              </div>
            </div>
          </motion.div>

          {/* 2. STRICT PURE WHITE COCKPIT RADAR PREVIEW */}
          <motion.div
            className="lx-nex-cockpit-wrap"
            id="cockpit"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Titlebar with Traffic Light Dots */}
            <div className="lx-nex-cockpit-bar">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="lx-nex-cockpit-dots">
                  <span className="lx-nex-cockpit-dot red" />
                  <span className="lx-nex-cockpit-dot yellow" />
                  <span className="lx-nex-cockpit-dot green" />
                </div>
                <div className="lx-nex-cockpit-title">
                  <Radio size={16} color="#007aff" />
                  <span>Command Radar Cockpit · Satellite HUD v2.4</span>
                </div>
              </div>

              <div className="lx-nex-cockpit-badges">
                <span className="lx-nex-hud-badge is-live">
                  <span className="lx-status-dot" style={{ width: 7, height: 7 }} /> 22 Engines Synchronized
                </span>
                <span className="lx-nex-hud-badge">
                  <Server size={12} color="#007aff" /> {hardware.ramGb}GB RAM · {hardware.parallelZones} Parallel Lanes
                </span>
                <span className="lx-nex-hud-badge">
                  <ShieldCheck size={12} color="#10b981" /> 100% Brand-Safe Cores
                </span>
              </div>
            </div>

            {/* Scenario Switcher Tabs */}
            <div
              style={{
                display: 'flex', gap: 8, padding: '10px 22px',
                background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                overflowX: 'auto'
              }}
            >
              {DEMO_SCENARIOS.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  style={{
                    padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 750,
                    background: idx === activeDemoIdx ? '#ffffff' : 'transparent',
                    border: idx === activeDemoIdx ? '1.5px solid #007aff' : '1px solid #e2e8f0',
                    color: idx === activeDemoIdx ? '#007aff' : '#64748b',
                    boxShadow: idx === activeDemoIdx ? '0 2px 8px rgba(0, 122, 255, 0.15)' : 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.16s ease'
                  }}
                  onClick={() => setActiveDemoIdx(idx)}
                >
                  {sc.pill}
                </button>
              ))}
            </div>

            {/* Pure White Cockpit Body */}
            <div className="lx-nex-cockpit-body">
              {/* Left Radar Sweep Stage on White Canvas */}
              <div className="lx-nex-radar-stage">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ textAlign: 'left' }}>
                    <b style={{ fontSize: 14.5, color: '#0f172a' }}>{activeDemo.areaLabel}</b>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Query: &ldquo;{activeDemo.query}&rdquo;</div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px', borderRadius: 50, background: '#ecfdf5',
                      border: '1px solid #a7f3d0', color: '#047857', fontSize: 11.5, fontWeight: 800
                    }}
                  >
                    {activeDemo.count}
                  </span>
                </div>

                <div className="lx-nex-radar-visual">
                  <div className="lx-nex-radar-ring" style={{ width: 140, height: 140 }} />
                  <div className="lx-nex-radar-ring" style={{ width: 220, height: 220 }} />
                  <div className="lx-nex-radar-ring" style={{ width: 300, height: 300 }} />
                  <div className="lx-nex-radar-sweep-beam" />

                  {activeDemo.pins.map((p, idx) => (
                    <div
                      key={idx}
                      className="lx-nex-beacon-pin"
                      style={{ top: p.top, left: p.left }}
                      title={`Micro-zone coordinate verified · Target 0${idx + 1}`}
                    />
                  ))}
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>● Active Sweep:</span> Micro-zones streaming into memory
                  </div>
                  <button
                    type="button"
                    className="lx-btn lx-btn-primary"
                    style={{ height: 36, padding: '0 16px', fontSize: 12, borderRadius: 50 }}
                    onClick={handleLaunch}
                  >
                    Launch in Command Center <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Right Streaming Leads Stage on White */}
              <div className="lx-nex-leads-stage">
                <div style={{ fontSize: 11, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 2, textAlign: 'left' }}>
                  Live Verified Business Telemetry (Top Verified Matches)
                </div>

                {activeDemo.leads.map((ld, idx) => (
                  <motion.div
                    key={ld.name + idx}
                    className="lx-nex-lead-item"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <div className="lx-nex-lead-avatar">{ld.name.charAt(0)}</div>
                    <div className="lx-nex-lead-info">
                      <div className="lx-nex-lead-title">{ld.name}</div>
                      <div className="lx-nex-lead-meta">
                        <span>{ld.area}</span>
                        <span style={{ color: '#d97706', fontWeight: 750 }}>★ {ld.rating} ({ld.reviews})</span>
                        {ld.noWebsite && (
                          <span style={{ color: '#dc2626', fontSize: 10.5, fontWeight: 750 }}>
                            No Website · High Intent
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="lx-nex-lead-phone">{ld.phone}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 3. EQUAL PROMINENCE STATS GRID */}
          <div className="lx-nex-stats-grid" style={{ marginTop: 48 }}>
            {EQUAL_PROMINENCE_METRICS.map(m => (
              <div key={m.title} className="lx-nex-stat-card">
                <div className={`lx-nex-stat-val ${m.isGreen ? 'is-green' : ''}`}>{m.val}</div>
                <div className="lx-nex-stat-title">{m.title}</div>
                <div className="lx-nex-stat-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 3-STEP STREAMLINED WORKFLOW WITH MARCHING GRADIENT CONNECTOR */}
      <section className="lx-section lx-section-alt" id="steps">
        <div className="lx-wrap">
          <div className="lx-sec-head">
            <span className="lx-kicker"><CheckCircle2 size={13} /> Streamlined Workflow</span>
            <h2>Lead Intelligence in 3 Simple Steps</h2>
            <p>
              From exact commodity pinpointing to hardware-accelerated memory swarms and clean CRM exports.
            </p>
          </div>

          <div className="lx-steps-wrap">
            <div className="lx-steps-connector-bar" />
            <div className="lx-steps-grid">
              {THREE_STEPS.map(st => {
                const IconComponent = st.icon;
                return (
                  <div key={st.num} className="lx-step-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span className="lx-step-badge">{st.num}</span>
                      <IconComponent size={40} />
                    </div>
                    <h3>{st.title}</h3>
                    <p>{st.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick link to explore architecture */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              type="button"
              className="lx-btn lx-btn-ghost"
              style={{ borderRadius: 50, padding: '10px 24px', fontSize: 13.5, fontWeight: 750 }}
              onClick={() => navigate('/architecture')}
            >
              Explore 22 Autonomous Extraction Engines &amp; Architecture <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* 5. EXECUTIVE WHITE CTA BANNER */}
      <section className="lx-section">
        <div className="lx-wrap">
          <div className="lx-cta-card">
            <div>
              <h2>Ready to build your next high-intent lead list?</h2>
              <p>
                Launch directly into the Command Center or run locally on your workstation server.
                Zero credit card required to explore live leads.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="lx-btn-local-engine"
                style={{ height: 50, padding: '0 24px' }}
                onClick={handleLocalLaunch}
              >
                <Zap size={16} /> Run on Local Server
              </button>
              <button
                type="button"
                className="lx-btn lx-btn-primary lx-btn-lg"
                onClick={handleLaunch}
              >
                <Rocket size={17} /> Launch Command Center
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
