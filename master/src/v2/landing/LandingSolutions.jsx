import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Building2,
  Factory,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  Zap,
  ArrowRight,
  Play,
  Pause,
  Layers,
  Sparkles,
  Search,
  Filter,
  Cpu,
  PhoneCall
} from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import Country3DFlag from '../components/Country3DFlag';
import RollingCounter from '../components/RollingCounter';

const PERSONAS = [
  {
    id: 'startups',
    title: 'Startups & Solo Founders',
    role: 'Zero-Burn Customer Discovery',
    icon: Rocket,
    color: '#10b981',
    bg: '#ecfdf5',
    headline: 'Stop Burning Seed Capital on $10k/yr Database Subscriptions.',
    summary:
      'Traditional lead tools charge $5,000–$15,000/yr for locked CSV databases with credit limits. We only charge for the compute engines you run—saving you 90% on outbound acquisition.',
    simulation: {
      query: 'Solar & CleanTech Installers in Austin & Dallas TX',
      scanned: 184,
      verified: 162,
      savedMoney: '$940 saved vs. ZoomInfo',
      engineCost: '$2.14 total engine execution',
      leads: [
        { name: 'Lone Star SunWorks Co.', loc: 'Travis County TX', phone: '+1 512-555-0142', tag: 'Direct WhatsApp' },
        { name: 'Austin Commercial Solar Fab', loc: 'Williamson County TX', phone: '+1 512-555-0891', tag: 'Mobile Verified' }
      ]
    }
  },
  {
    id: 'agencies',
    title: 'Growth & Lead Gen Agencies',
    role: 'High-Margin Multi-Client Campaigns',
    icon: Building2,
    color: '#06b6d4',
    bg: '#ecfeff',
    headline: 'Unlimited Client Niches across 11 Nations. 94% Gross Margins.',
    summary:
      'Scale agency deliverables without paying per-seat SaaS tolls or worrying about cloud IP bans. Run dedicated micro-zone sweeps for unlimited clients directly from your agency workstation.',
    simulation: {
      query: 'Commercial Freight & Logistics Directors in UK Ceremonial Counties',
      scanned: 420,
      verified: 388,
      savedMoney: '£1,420 saved per client run',
      engineCost: '£3.80 total engine execution',
      leads: [
        { name: 'Thames Intermodal Freight Ltd', loc: 'City of London EC2', phone: '+44 20 7946 0841', tag: 'Managing Director' },
        { name: 'Midlands B2B Haulage Corp', loc: 'Birmingham B5', phone: '+44 121 496 0192', tag: 'Direct WhatsApp' }
      ]
    }
  },
  {
    id: 'enterprises',
    title: 'B2B & B2C Commercial Businesses',
    role: 'Pin-Point Supply Chain & Territory Penetration',
    icon: Factory,
    color: '#3b82f6',
    bg: '#eff6ff',
    headline: 'Reach Real Wholesalers & Retail Buyers in Every Village & County.',
    summary:
      'Traditional scrapers dump irrelevant consumer retail and saree shops into your wholesale search. Our Zero-Bleed Category Fidelity deflects off-topic bleed so you connect only with genuine commercial partners.',
    simulation: {
      query: 'Wholesale Turmeric & Agro Processors in Tenali Mandals AP',
      scanned: 512,
      verified: 384,
      savedMoney: '₹85,000 saved vs. Directory Ads',
      engineCost: '₹4.20 total engine execution',
      leads: [
        { name: 'Minar Traders & Turmeric Millers', loc: 'Tenali Mandals AP · PIN 522201', phone: '+91 98856 03754', tag: 'Raw Curcumin' },
        { name: 'Balaji Agro Commodities Ltd', loc: 'Guntur District AP · PIN 522003', phone: '+91 94906 42816', tag: 'Direct WhatsApp' }
      ]
    }
  }
];

// Real localized market prices, legacy monopoly costs, and dedicated solutions for all 11 nations
const COUNTRY_MARKETS = [
  {
    code: 'IN',
    name: 'India',
    currency: '₹',
    legacyMonopolyPrice: '₹75,000–₹1,80,000 / yr',
    legacyTool: 'JustDial / IndiaMART paid clicks & stale CD lists',
    ourEngineCost: '₹0.99 per mandal / village sweep',
    savings: '98% Lower Cost',
    unitsCount: '619,287 Villages & 6k+ Mandals',
    solutionHighlight: 'Direct WhatsApp access to wholesalers & manufacturers across all 760+ Districts with zero saree/consumer retail bleed.'
  },
  {
    code: 'US',
    name: 'United States',
    currency: '$',
    legacyMonopolyPrice: '$10,000–$25,000 / yr',
    legacyTool: 'ZoomInfo / Apollo annual contracts + $0.50/credit',
    ourEngineCost: '$0.02 per county sweep',
    savings: '96% Lower Cost',
    unitsCount: '3,143 Counties & Parishes',
    solutionHighlight: 'Live web verification across all 50 states and FIPS counties. Real mobile phone & direct owner numbers without credit paywalls.'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: '£',
    legacyMonopolyPrice: '£6,000–£14,000 / yr',
    legacyTool: 'Cognism / Experian UK business credit packages',
    ourEngineCost: '£0.02 per borough sweep',
    savings: '95% Lower Cost',
    unitsCount: '100+ Ceremonial Counties & London Boroughs',
    solutionHighlight: 'Hyper-local British commercial registries indexed with Companies House matching and mobile WhatsApp confirmation.'
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'C$',
    legacyMonopolyPrice: 'C$8,000–C$18,000 / yr',
    legacyTool: "InfoCanada / Scott's Business Directories",
    ourEngineCost: 'C$0.03 per census division sweep',
    savings: '95% Lower Cost',
    unitsCount: '293 Census Divisions across 10 Provinces',
    solutionHighlight: 'Bilingual Canadian commercial trade verification with metropolitan census tract centroids.'
  },
  {
    code: 'AU',
    name: 'Australia',
    currency: 'A$',
    legacyMonopolyPrice: 'A$7,500–A$16,000 / yr',
    legacyTool: 'Kompass AU / Illion annual licensing plans',
    ourEngineCost: 'A$0.03 per LGA sweep',
    savings: '96% Lower Cost',
    unitsCount: '537 Local Government Areas & Shires',
    solutionHighlight: 'Mining, agricultural, and urban trade contractors verified with ABN validation across all 8 states & territories.'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    legacyMonopolyPrice: '12,000–28,000 AED / yr',
    legacyTool: 'Gulf Trade directories with outdated landline databases',
    ourEngineCost: '0.08 AED per free zone sweep',
    savings: '97% Lower Cost',
    unitsCount: '7 Emirates & Designated Free Zones',
    solutionHighlight: 'Dubai Mainland, Abu Dhabi, Sharjah & Free Zone trade licenses matched to verified WhatsApp business channels.'
  },
  {
    code: 'SG',
    name: 'Singapore',
    currency: 'S$',
    legacyMonopolyPrice: 'S$6,000–S$14,000 / yr',
    legacyTool: 'Times Business Directory & stale enterprise downloads',
    ourEngineCost: 'S$0.03 per sector sweep',
    savings: '95% Lower Cost',
    unitsCount: '55 Planning Sectors & 81 Postal Sectors',
    solutionHighlight: 'Full Jurong, Marina Bay CBD, and Changi supply chain indexes with UEN business entity checks.'
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZ$',
    legacyMonopolyPrice: 'NZ$5,500–NZ$12,000 / yr',
    legacyTool: 'NZ Business database CD-ROM / CSV packages',
    ourEngineCost: 'NZ$0.03 per district sweep',
    savings: '95% Lower Cost',
    unitsCount: '67 Territorial Authorities & Regional Councils',
    solutionHighlight: 'North & South Island agricultural, marine, and tech hubs indexed with NZBN cross-checks.'
  },
  {
    code: 'IE',
    name: 'Ireland',
    currency: '€',
    legacyMonopolyPrice: '€5,000–€11,000 / yr',
    legacyTool: 'Vision-net / Kompass Ireland credit packages',
    ourEngineCost: '€0.02 per municipal sweep',
    savings: '96% Lower Cost',
    unitsCount: '82 Municipal District Councils',
    solutionHighlight: 'Dublin Silicon Docks, Galway MedTech & Cork manufacturing trade hubs with direct mobile dialers.'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    currency: 'R',
    legacyMonopolyPrice: 'R35,000–R85,000 / yr',
    legacyTool: 'YellowPages SA & B2B database licenses',
    ourEngineCost: 'R0.45 per metro council sweep',
    savings: '98% Lower Cost',
    unitsCount: '257 District & Local Municipal Councils',
    solutionHighlight: 'Johannesburg mining, Cape Town maritime, and Durban logistics verified across all 9 provinces.'
  },
  {
    code: 'DE',
    name: 'Germany',
    currency: '€',
    legacyMonopolyPrice: '€6,000–€15,000 / yr',
    legacyTool: 'Bisnode / Creditreform / Wer liefert was B2B plans',
    ourEngineCost: '€0.02 per Landkreis sweep',
    savings: '96% Lower Cost',
    unitsCount: '401 Landkreise & Kreisfreie Städte',
    solutionHighlight: 'Authentic Mittelstand precision: Maschinenbau & toolmakers in Landkreis München and Frankfurt financial districts.'
  }
];

export default function LandingSolutions() {
  const navigate = useNavigate();
  const [selectedPersonaIdx, setSelectedPersonaIdx] = useState(0);
  const [selectedCountryIdx, setSelectedCountryIdx] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(true);
  const [tourCycle, setTourCycle] = useState(0);

  // 3.5-Second Continuous Auto-Tour Loop
  useEffect(() => {
    if (!isAutoTouring) return;
    const timer = setInterval(() => {
      setSelectedPersonaIdx(prev => (prev + 1) % PERSONAS.length);
      setSelectedCountryIdx(prev => (prev + 1) % COUNTRY_MARKETS.length);
      setTourCycle(k => k + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, [isAutoTouring]);

  const persona = PERSONAS[selectedPersonaIdx];
  const country = COUNTRY_MARKETS[selectedCountryIdx];
  const PersonaIcon = persona.icon;

  const handlePersonaClick = (idx) => {
    setSelectedPersonaIdx(idx);
    setTourCycle(k => k + 1);
  };

  const handleCountryClick = (idx) => {
    setSelectedCountryIdx(idx);
    setTourCycle(k => k + 1);
  };

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge with Auto-Tour Controller */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <span className="lx-highlight-tag">
          <Sparkles size={13} />
          <span>WHO IT&apos;S FOR · WHY WE EXIST · REAL COUNTRY ECONOMICS</span>
        </span>

        {/* Auto-Tour Play/Pause Button */}
        <button
          type="button"
          onClick={() => setIsAutoTouring(prev => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 12px',
            borderRadius: 999,
            background: isAutoTouring ? '#ecfdf5' : '#f1f5f9',
            border: isAutoTouring ? '1.5px solid #a7f3d0' : '1.5px solid #cbd5e1',
            color: isAutoTouring ? '#047857' : '#64748b',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.16s ease'
          }}
          title={isAutoTouring ? 'Click to Pause Showcase' : 'Click to Resume Showcase'}
        >
          {isAutoTouring ? (
            <>
              <span className="lx-chip-live-dot" />
              <span>Auto-Cycling Solutions (3.5s)</span>
              <Pause size={10} style={{ marginLeft: 2 }} />
            </>
          ) : (
            <>
              <Play size={10} />
              <span>Showcase Paused · Click to Play</span>
            </>
          )}
        </button>
      </motion.div>

      {/* 2. Headline & Radical Value Proposition */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          We Only Charge for the Engines.{' '}
          <span className="lx-gradient-text">Your Local System Slashes Server Costs.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Legacy monopolies charge $10,000/yr for stale CSVs because they mark up cloud RAM servers.
          Our Cloud Brain coordinates the engines, while your machine runs the browser locally—slashing customer costs by{' '}
          <strong style={{ color: '#047857' }}>90% to 98% across 11 sovereign nations</strong>.
        </p>
      </div>

      {/* 3. Main Stage: 3 Persona Tabs + Real Market Economics Split Screen */}
      <motion.div
        className="lx-sovereign-stage lx-border-beam-box"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        {/* Continuous Auto-Tour Progress Laser Bar */}
        <div className="lx-tour-progress-track">
          <motion.div
            key={tourCycle}
            initial={{ width: '0%' }}
            animate={{ width: isAutoTouring ? '100%' : '0%' }}
            transition={{ duration: 3.5, ease: 'linear' }}
            className="lx-tour-progress-bar"
          />
        </div>

        {/* Persona Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PERSONAS.map((p, idx) => {
            const isSelected = idx === selectedPersonaIdx;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePersonaClick(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: isSelected ? '#ffffff' : 'rgba(248, 250, 252, 0.75)',
                  border: isSelected ? `2px solid ${p.color}` : '1.5px solid #e2e8f0',
                  boxShadow: isSelected ? `0 4px 14px ${p.color}25` : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: p.bg,
                    color: p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none'
                  }}
                >
                  <Icon size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 12, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.title}
                  </strong>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{p.role}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Two-Column Cockpit: (Col 1: Active Persona Live Simulation | Col 2: Country-Specific Real Market Economics) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 14, alignItems: 'stretch' }}>
          {/* Column 1: Active Persona Narrative & Live Lead Simulation */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left'
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: persona.bg,
                      color: persona.color,
                      letterSpacing: '0.04em'
                    }}
                  >
                    CORE MISSION
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    {persona.role}
                  </span>
                </div>

                <h3 style={{ margin: '4px 0', fontSize: 15, fontWeight: 850, color: '#0f172a', lineHeight: 1.25 }}>
                  {persona.headline}
                </h3>

                <p style={{ margin: '4px 0 10px', fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  {persona.summary}
                </p>

                {/* Simulated Real-Time Lead Generator Pipeline Ticker */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 10px',
                    marginBottom: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className="lx-chip-live-dot" />
                      <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, color: '#047857' }}>
                        LIVE PIPELINE SIMULATION
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 4 }}>
                      {persona.simulation.savedMoney}
                    </span>
                  </div>

                  <div style={{ fontSize: 10.5, color: '#334155', marginBottom: 6 }}>
                    <strong>Query:</strong> &ldquo;{persona.simulation.query}&rdquo;
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {persona.simulation.leads.map((ld, i) => (
                      <div
                        key={ld.name + i}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 7,
                          padding: '5px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: 11, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ld.name}
                          </strong>
                          <span style={{ fontSize: 9.5, color: '#64748b' }}>{ld.loc}</span>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669', display: 'block' }}>{ld.phone}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#0284c7' }}>{ld.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                    <span>Compute: <strong>320MB System RAM</strong></span>
                    <span style={{ color: '#047857', fontWeight: 800 }}>{persona.simulation.engineCost}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div>
              <LiquidButton3D
                variant="emerald"
                size="sm"
                icon={Rocket}
                onClick={() => navigate('/command')}
              >
                Launch Dedicated Engine Sweep
              </LiquidButton3D>
            </div>
          </div>

          {/* Column 2: Country-Specific Real Market Economics & Solutions */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left'
            }}
          >
            <div>
              {/* Header: Selected Country Flag & Market Pricing Comparison */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Country3DFlag code={country.code} size={26} active isHome={country.code === 'IN'} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 850, color: '#0f172a' }}>
                      {country.name} Market Economics
                    </h4>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>
                      {country.unitsCount}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0'
                  }}
                >
                  {country.savings}
                </span>
              </div>

              {/* Real Local Pricing Breakdown Comparison Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={country.code}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.24 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
                >
                  {/* Legacy Monopoly Toll */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fee2e2',
                      borderRadius: 9,
                      padding: '8px 10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>
                        ✕ LEGACY DATABASE MONOPOLY
                      </span>
                      <strong style={{ fontSize: 12, color: '#991b1b' }}>
                        {country.legacyMonopolyPrice}
                      </strong>
                    </div>
                    <span style={{ fontSize: 9.5, color: '#64748b', display: 'block', marginTop: 2 }}>
                      {country.legacyTool}
                    </span>
                  </div>

                  {/* Our Engine Model */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 9,
                      padding: '8px 10px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#047857' }}>
                        ✓ OUR LOCAL ENGINE MODEL
                      </span>
                      <strong style={{ fontSize: 12, color: '#047857' }}>
                        {country.ourEngineCost}
                      </strong>
                    </div>
                    <span style={{ fontSize: 9.5, color: '#475569', display: 'block', marginTop: 2 }}>
                      Zero server markups · Real-time web extraction via user RAM
                    </span>
                  </div>

                  {/* Localized Territory Solution Highlight */}
                  <div
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 9,
                      padding: '7px 9px',
                      fontSize: 10.5,
                      color: '#334155',
                      lineHeight: 1.4
                    }}
                  >
                    <strong style={{ color: '#0f172a' }}>{country.name} Solution: </strong>
                    {country.solutionHighlight}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Country Quick-Select Strip with 3D Flags */}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 4 }}>
                SELECT SOVEREIGN MARKET PRICING:
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: 5,
                  overflowX: 'auto',
                  paddingBottom: 2,
                  scrollbarWidth: 'none'
                }}
              >
                {COUNTRY_MARKETS.map((c, idx) => {
                  const isSelected = idx === selectedCountryIdx;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountryClick(idx)}
                      style={{
                        flex: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: isSelected ? '#ecfdf5' : '#ffffff',
                        border: isSelected ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 800,
                        color: isSelected ? '#047857' : '#475569'
                      }}
                    >
                      <Country3DFlag code={c.code} size={15} active={isSelected} isHome={c.code === 'IN'} />
                      <span>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="emerald"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command')}
        >
          Activate Precision Extraction Engines
        </LiquidButton3D>

        <LiquidButton3D
          variant="ghost"
          size="lg"
          onClick={() => navigate('/architecture')}
        >
          Inspect 22 Extraction Engines →
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ Nominal Engine Execution Fees Only</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Zero Cloud Server RAM Markup</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ 100% Real-Time Live Extraction</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Zero-Bleed Category Fidelity</span>
        </span>
      </div>
    </div>
  );
}
