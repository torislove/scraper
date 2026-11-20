import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, Building2, Check, CheckCircle2, Download, FileSpreadsheet,
  Globe2, LogIn, Mail, MapPin, Phone, Plus, Search, ShieldCheck,
  Sparkles, Star, Zap
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import { POPULAR_COUNTRIES } from './data/countries';
import { pingHealth } from './api';
import './landingExecutive.css';

// Strictly locked to the 11 supported revenue markets — India pinned as Home
const LOCKED_11_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

const COUNTRY_DESCRIPTIONS = {
  IN: 'Home Market · Cities, towns, mandals & 619k+ villages',
  US: 'All 50 states, counties & major metro cities',
  GB: 'England, Scotland, Wales, London & regional counties',
  CA: 'All provinces, census divisions & metro cities',
  AU: 'All states, territories & commercial hubs',
  AE: 'Dubai, Abu Dhabi, Sharjah & all 7 emirates',
  SG: 'Every commercial district & planning region',
  NZ: 'Auckland, Wellington, Christchurch & all regions',
  IE: 'Dublin, Cork, Galway & all Irish counties',
  ZA: 'Johannesburg, Cape Town, Durban & all provinces',
  DE: 'Berlin, Munich, Frankfurt & all 16 Bundesländer'
};

const DEMO_SCENARIOS = [
  {
    id: 'guntur-computers',
    pill: 'Computer Shops · Guntur',
    query: 'Computer Shops in Guntur',
    country: 'IN',
    areaLabel: 'Guntur, Andhra Pradesh · 142 businesses pinned',
    count: '142 leads',
    pins: [
      { top: '24%', left: '22%' },
      { top: '54%', left: '44%' },
      { top: '32%', left: '72%' },
      { top: '68%', left: '62%' },
      { top: '42%', left: '28%' }
    ],
    leads: [
      { name: 'Apex Computers & Laptop Hub', area: 'Brodipet, Guntur', rating: '4.8', reviews: 184, phone: '+91 98480 •••12' },
      { name: 'Sri Lakshmi IT & Peripherals', area: 'Arundelpet, Guntur', rating: '4.7', reviews: 96, phone: '+91 94401 •••89' },
      { name: 'TechZone Hardware & Repair', area: 'Lakshmipuram, Guntur', rating: '4.9', reviews: 210, phone: '+91 90005 •••44' }
    ]
  },
  {
    id: 'mumbai-interiors',
    pill: 'Interior Designers · Mumbai',
    query: 'Interior Designers in Mumbai',
    country: 'IN',
    areaLabel: 'Mumbai, Maharashtra · 318 businesses pinned',
    count: '318 leads',
    pins: [
      { top: '30%', left: '30%' },
      { top: '46%', left: '54%' },
      { top: '64%', left: '36%' },
      { top: '26%', left: '68%' },
      { top: '58%', left: '72%' }
    ],
    leads: [
      { name: 'Studio Vastu & Living Spaces', area: 'Bandra West, Mumbai', rating: '4.9', reviews: 312, phone: '+91 98201 •••67' },
      { name: 'Urban Craft Modular Interiors', area: 'Andheri West, Mumbai', rating: '4.7', reviews: 145, phone: '+91 98192 •••31' },
      { name: 'Crestline Architecture & Decor', area: 'Powai, Mumbai', rating: '4.8', reviews: 198, phone: '+91 97690 •••15' }
    ]
  },
  {
    id: 'dallas-hvac',
    pill: 'HVAC Contractors · Dallas',
    query: 'HVAC Contractors in Dallas',
    country: 'US',
    areaLabel: 'Dallas, Texas · 264 businesses pinned',
    count: '264 leads',
    pins: [
      { top: '38%', left: '24%' },
      { top: '28%', left: '50%' },
      { top: '62%', left: '70%' },
      { top: '54%', left: '40%' },
      { top: '34%', left: '76%' }
    ],
    leads: [
      { name: 'Lone Star Air & Heating Co.', area: 'Uptown Dallas, TX', rating: '4.9', reviews: 420, phone: '+1 (214) •••-0192' },
      { name: 'Metroplex Climate Solutions', area: 'North Dallas, TX', rating: '4.8', reviews: 265, phone: '+1 (469) •••-4418' },
      { name: 'Bluebonnet Mechanical HVAC', area: 'Irving, Dallas County', rating: '4.7', reviews: 180, phone: '+1 (972) •••-8820' }
    ]
  },
  {
    id: 'london-dentists',
    pill: 'Dental Clinics · London',
    query: 'Dental Clinics in London',
    country: 'GB',
    areaLabel: 'Greater London, UK · 215 businesses pinned',
    count: '215 leads',
    pins: [
      { top: '46%', left: '26%' },
      { top: '28%', left: '54%' },
      { top: '64%', left: '50%' },
      { top: '36%', left: '74%' },
      { top: '56%', left: '34%' }
    ],
    leads: [
      { name: 'Kensington Smile Practice', area: 'Westminster, London', rating: '4.9', reviews: 290, phone: '+44 20 •••• 3104' },
      { name: 'Mayfair Cosmetic Dentistry', area: 'Mayfair, London', rating: '4.8', reviews: 175, phone: '+44 20 •••• 7821' },
      { name: 'Canary Wharf Dental Studio', area: 'Docklands, London', rating: '4.7', reviews: 230, phone: '+44 20 •••• 9940' }
    ]
  }
];

const JOURNEY_STEPS = [
  {
    icon: Globe2,
    step: 'Step 1',
    title: 'Choose Your Market',
    body: 'Pick India or any of the 10 supported international markets in one click.'
  },
  {
    icon: Search,
    step: 'Step 2',
    title: 'Type Any Business & Area',
    body: 'Write naturally — Computer Shops in Guntur, Dental Clinics in London, Builders in Pune.'
  },
  {
    icon: MapPin,
    step: 'Step 3',
    title: 'Watch Leads & Map Live',
    body: 'Verified businesses, phone numbers, websites, and ratings appear in real time on your map.'
  },
  {
    icon: FileSpreadsheet,
    step: 'Step 4',
    title: 'Download & Start Calling',
    body: 'Export clean Excel (.xlsx), CSV, or phone contact cards (.vcf) organized by neighborhood.'
  }
];

const LEAD_ANATOMY = [
  {
    icon: Phone,
    title: 'Direct Phone Numbers Ready to Call',
    body: 'Every available business phone is cleanly formatted so you can copy all numbers or tap to dial immediately.'
  },
  {
    icon: MapPin,
    title: 'Verified Street Address & Map Pin',
    body: 'See the exact locality, postal code, and map coordinates so your field sales team always knows where to go.'
  },
  {
    icon: Globe2,
    title: 'Official Website, Email & Business Hours',
    body: 'Know whether a prospect already has a website, check their email address, and see their real customer ratings.'
  },
  {
    icon: Download,
    title: 'Permanent Folders & Clean Excel Spreadsheets',
    body: 'Every search stays neatly saved in its own folder — automatically cleaned of duplicates and ready for Excel anytime.'
  }
];

const PROOF_STATS = [
  { value: '11', label: 'Core Countries Locked & Tuned' },
  { value: '619,287', label: 'Indian Towns & Villages Covered' },
  { value: '100+', label: 'Business Categories & Trades' },
  { value: '1-Click', label: 'Excel, CSV & Phone Export' }
];

const FAQ = [
  {
    q: 'What is this platform built to help me do?',
    a: 'It helps business owners, sales teams, agencies, and distributors find real, verified business contacts in any city — complete with phone numbers, street addresses, ratings, websites, and an interactive map — in seconds instead of hours.'
  },
  {
    q: 'Can I search for any industry or shop type?',
    a: 'Yes! Search for computer shops, mobile repair centers, dental clinics, builders, interior designers, restaurants, wholesale suppliers, gyms, schools, salons, or any specialized local trade.'
  },
  {
    q: 'Which 11 countries are supported?',
    a: 'India (our Home market with full city, town, mandal & village coverage), United States, United Kingdom, Canada, Australia, United Arab Emirates, Singapore, New Zealand, Ireland, South Africa, and Germany.'
  },
  {
    q: 'Is there any technical setup required?',
    a: 'Zero setup. Just open the workspace, pick your country, type the business and city you want, and press Find Leads. Everything runs automatically in the background while your leads stream straight to your table and map.'
  },
  {
    q: 'How do I take my leads into Excel or my phone?',
    a: 'Every search saves into a neat folder automatically. Click one button to copy all phone numbers, export a ready-to-use Excel (.xlsx) or CSV sheet, or save contacts directly to your phone (.vcf).'
  }
];

function InteractiveShowcase({ demo, activeDemo, setActiveDemo }) {
  const [typedText, setTypedText] = useState(demo.query);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [6, -6]), { stiffness: 180, damping: 24 });
  const rotateY = useSpring(useTransform(mouseX, [-240, 240], [-7, 7]), { stiffness: 180, damping: 24 });

  // Live realistic typewriter effect whenever demo changes
  useEffect(() => {
    let idx = 0;
    setTypedText('');
    const timer = setInterval(() => {
      idx += 1;
      setTypedText(demo.query.slice(0, idx));
      if (idx >= demo.query.length) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [demo.query]);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1200, position: 'relative' }}>
      {/* Floating Animated Outcome Badges */}
      <motion.div
        className="lx-float-badge is-top"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CheckCircle2 size={15} color="#059669" />
        <span>Verified Phones Streaming Live</span>
      </motion.div>

      <motion.div
        className="lx-float-badge is-bottom"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <FileSpreadsheet size={15} color="#2563eb" />
        <span>1-Click Excel &amp; CSV Ready</span>
      </motion.div>

      <motion.div
        className="lx-showcase"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lx-showcase-pills">
          {DEMO_SCENARIOS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`lx-demo-pill ${activeDemo === idx ? 'is-active' : ''}`}
              onClick={() => setActiveDemo(idx)}
            >
              {item.pill}
            </button>
          ))}
        </div>

        <div className="lx-showcase-bar">
          <Search size={17} color="#059669" />
          <span className="lx-showcase-query">
            {typedText}
            <span className="lx-typing-caret" />
          </span>
          <motion.span
            key={demo.count}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="lx-showcase-badge"
          >
            {demo.count}
          </motion.span>
        </div>

        {/* Live Sweeping Conic Radar Map */}
        <div className="lx-mini-map">
          <div className="lx-radar-sweep" />
          <div className="lx-map-ring" />
          {demo.pins.map((pos, i) => (
            <motion.div
              key={`${demo.id}-pin-${i}`}
              className="lx-map-pin"
              style={{ top: pos.top, left: pos.left }}
              initial={{ scale: 0, opacity: 0, y: -12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + 0.08 * i, type: 'spring', stiffness: 420, damping: 20 }}
            >
              <MapPin size={12} />
            </motion.div>
          ))}
          <span className="lx-map-label">📍 {demo.areaLabel}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={demo.id}
            className="lx-demo-leads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {demo.leads.map((lead, idx) => (
              <motion.div
                key={lead.name}
                className="lx-demo-row"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * idx, type: 'spring', stiffness: 320, damping: 26 }}
              >
                <div className="lx-demo-row-left">
                  <span className="lx-demo-avatar">{lead.name.charAt(0)}</span>
                  <div style={{ minWidth: 0 }}>
                    <b>{lead.name}</b>
                    <small>{lead.area} · ★ {lead.rating} ({lead.reviews})</small>
                  </div>
                </div>
                <span className="lx-demo-phone">{lead.phone}</span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="lx-showcase-foot">
          <span>Every business verified with location &amp; contact</span>
          <strong>Instant Excel &amp; Map View →</strong>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingV2() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [activeDemo, setActiveDemo] = useState(0);
  const [weeklySearches, setWeeklySearches] = useState(12);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const check = async () => {
      const ok = await pingHealth();
      if (cancelled) return;
      setOnline(Boolean(ok));
      timer = setTimeout(check, ok ? 25000 : 8000);
    };
    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveDemo(prev => (prev + 1) % DEMO_SCENARIOS.length);
    }, 6500);
    return () => clearInterval(id);
  }, []);

  const demo = DEMO_SCENARIOS[activeDemo];
  const openWorkspace = (countryCode = 'IN') => {
    navigate(`/command?country=${encodeURIComponent(countryCode)}`);
  };

  // Strictly the 11 locked markets
  const lockedMarkets = useMemo(() => {
    return POPULAR_COUNTRIES
      .filter(c => LOCKED_11_CODES.includes(c.code))
      .sort((a, b) => LOCKED_11_CODES.indexOf(a.code) - LOCKED_11_CODES.indexOf(b.code));
  }, []);

  const monthlyLeads = weeklySearches * 4 * 165;
  const hoursSaved = weeklySearches * 4 * 6;

  return (
    <div className="lx-landing" style={{ position: 'relative' }}>
      {/* Ambient Breathing Aurora Mesh */}
      <div className="lx-aurora-wrap" aria-hidden="true">
        <div className="lx-orb lx-orb-1" />
        <div className="lx-orb lx-orb-2" />
        <div className="lx-orb lx-orb-3" />
      </div>

      {/* Sticky Glass Header */}
      <header className="lx-nav">
        <div className="lx-wrap lx-nav-inner">
          <button type="button" className="lx-brand-btn" onClick={() => openWorkspace('IN')} aria-label="Open Workspace">
            <BrandLogo size={34} theme="light" />
          </button>

          <nav className="lx-nav-links" aria-label="Primary">
            <a href="#how">How it works</a>
            <a href="#lead-anatomy">What you get</a>
            <a href="#markets">11 Markets</a>
            <button type="button" onClick={() => navigate('/pricing')}>Pricing</button>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lx-nav-actions">
            <span className={`lx-status-pill ${online ? '' : 'is-off'}`}>
              <span className="lx-status-dot" />
              {online ? 'Ready' : 'Connecting'}
            </span>
            <button type="button" className="lx-btn lx-btn-ghost" onClick={() => navigate('/login')}>
              <LogIn size={15} /> Sign in
            </button>
            <button type="button" className="lx-btn lx-btn-primary" onClick={() => openWorkspace('IN')}>
              Find Leads Now <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <section className="lx-hero">
          <div className="lx-wrap lx-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="lx-eyebrow">
                <Sparkles size={13} />
                India First · 11 Core Markets Ready
              </span>

              <h1 className="lx-h1">
                Turn any search into{' '}
                <span className="lx-h1-accent">verified business leads</span>{' '}
                in seconds.
              </h1>

              <p className="lx-lead-copy">
                Simply pick one of 11 countries, type the business and city you want, and watch
                real business names, phone numbers, websites, ratings, and map locations appear
                live — organized into clean folders ready for 1-click Excel export.
              </p>

              <div className="lx-hero-actions">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="lx-btn lx-btn-primary lx-btn-lg"
                  onClick={() => openWorkspace('IN')}
                >
                  Open Lead Workspace <ArrowRight size={17} />
                </motion.button>
                <a href="#markets" className="lx-btn lx-btn-ghost lx-btn-lg">
                  Explore All 11 Countries
                </a>
              </div>

              <div className="lx-trust-row">
                <span><Check size={14} /> Any Business or Industry</span>
                <span><Check size={14} /> Live Map + Direct Phones</span>
                <span><Check size={14} /> Zero Technical Setup</span>
              </div>
            </motion.div>

            <InteractiveShowcase
              demo={demo}
              activeDemo={activeDemo}
              setActiveDemo={setActiveDemo}
            />
          </div>
        </section>

        {/* Animated Flowing Journey Beam */}
        <section className="lx-section lx-section-alt" id="how">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Zap size={13} /> How It Works</span>
              <h2>From plain search to ready-to-call Excel sheet.</h2>
              <p>No complicated settings, no jargon, no manual copy-pasting. Everything works automatically in four effortless steps.</p>
            </div>

            <div className="lx-flow-track">
              <div className="lx-flow-line" aria-hidden="true">
                <div className="lx-flow-beam" />
              </div>

              {JOURNEY_STEPS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    className="lx-flow-node"
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: idx * 0.1, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="lx-flow-step-orb"><Icon size={22} /></div>
                    <small style={{ fontSize: 11, fontWeight: 800, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {item.step}
                    </small>
                    <h3 style={{ margin: '6px 0 8px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#475569' }}>{item.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Anatomy of Every Lead */}
        <section className="lx-section" id="lead-anatomy">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Star size={13} /> Inside Every Lead</span>
              <h2>Clean, complete business profiles — ready to use.</h2>
              <p>Here is exactly what you see when you click any business in your workspace.</p>
            </div>

            <div className="lx-anatomy-grid">
              <motion.div
                className="lx-anatomy-card"
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      background: 'linear-gradient(135deg, #ecfdf5, #dbeafe)',
                      color: '#059669',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 850,
                      fontSize: 20
                    }}
                  >
                    A
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 800 }}>
                        COMPUTER SHOPS
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 750, color: '#d97706' }}>★ 4.8 (184 reviews)</span>
                    </div>
                    <h3 style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 850, color: '#0f172a' }}>
                      Apex Computers &amp; Laptop Hub
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontWeight: 750, fontSize: 14 }}>
                    <Phone size={15} /> +91 98480 12345 <span style={{ marginLeft: 'auto', fontSize: 11, background: '#ffffff', padding: '2px 8px', borderRadius: 999 }}>Verified Phone</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13.5, fontWeight: 600 }}>
                    <MapPin size={15} color="#2563eb" /> 4th Lane, Brodipet, Guntur, Andhra Pradesh 522002
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                      <Globe2 size={14} color="#059669" /> apexcomputers.in
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                      <Mail size={14} color="#2563eb" /> sales@apex…
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="lx-anatomy-list">
                {LEAD_ANATOMY.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      className="lx-anatomy-item"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: idx * 0.08, duration: 0.36 }}
                    >
                      <div className="lx-card-icon" style={{ margin: 0, width: 42, height: 42, flexShrink: 0 }}>
                        <Icon size={19} />
                      </div>
                      <div>
                        <b style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{item.title}</b>
                        <span style={{ fontSize: 13.5, lineHeight: 1.55, color: '#475569' }}>{item.body}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Locked 11 Supported Markets */}
        <section className="lx-section lx-section-alt" id="markets">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Globe2 size={13} /> 11 Supported Markets</span>
              <h2>Focused, accurate coverage across 11 countries.</h2>
              <p>Click any market below to open the workspace pre-configured for that country's cities, states, and phone formats.</p>
            </div>

            <div className="lx-country-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {lockedMarkets.map((country, idx) => {
                const isHome = country.code === 'IN';
                return (
                  <motion.button
                    key={country.code}
                    type="button"
                    className={`lx-country-btn ${isHome ? 'is-home' : ''}`}
                    onClick={() => openWorkspace(country.code)}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ y: -3 }}
                  >
                    <Country3DFlag code={country.code} size={30} isHome={isHome} />
                    <div>
                      <b>{country.name} {country.phone ? `(${country.phone})` : ''}</b>
                      <small>{COUNTRY_DESCRIPTIONS[country.code] || `${country.name} local businesses`}</small>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Proof & Time-Saved Estimator */}
        <section className="lx-section" id="proof">
          <div className="lx-wrap">
            <div className="lx-stats-grid">
              {PROOF_STATS.map(stat => (
                <motion.div
                  key={stat.label}
                  className="lx-stat-box"
                  whileHover={{ y: -3 }}
                >
                  <b>{stat.value}</b>
                  <span>{stat.label}</span>
                </motion.div>
              ))}
            </div>

            <div className="lx-roi-box">
              <div>
                <h3>See how many hours your team saves every month</h3>
                <p>
                  Instead of spending days manually gathering shop phone numbers and addresses into
                  spreadsheets, slide to match your weekly searches:
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                  <span>Searches per week</span>
                  <span style={{ color: '#34d399' }}>{weeklySearches} searches / week</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={50}
                  value={weeklySearches}
                  onChange={e => setWeeklySearches(Number(e.target.value))}
                  className="lx-roi-slider"
                />
              </div>

              <div className="lx-roi-metrics">
                <div className="lx-roi-metric">
                  <small>Estimated monthly leads</small>
                  <b>{monthlyLeads.toLocaleString('en-IN')}+</b>
                </div>
                <div className="lx-roi-metric">
                  <small>Manual research saved</small>
                  <b>{hoursSaved.toLocaleString('en-IN')} hrs/mo</b>
                </div>
              </div>
            </div>

            <div className="lx-ext-shield-card" style={{ marginTop: 28 }}>
              <div className="lx-ext-shield-head">
                <div>
                  <span className="lx-kicker" style={{ marginBottom: 8 }}><ShieldCheck size={13} /> Zero-Knowledge Extension-Only Architecture</span>
                  <h3>All 6 Engines Protected on Server. Customer Extension Powers User-RAM Speed.</h3>
                  <p>
                    Proprietary parsers and geo-databases remain 100% server-side; the blind Chrome/Edge extension relays signed fetch tickets using each client&apos;s own RAM &amp; IP.
                  </p>
                </div>
                <div className="lx-ext-cta-group">
                  <a
                    href="/api/scrape/extension-download"
                    download="scraper-co-in-ram-turbo-extension.zip"
                    className="lx-btn lx-btn-primary"
                  >
                    <Download size={15} /> Download RAM Extension (.zip)
                  </a>
                </div>
              </div>
              <div className="lx-ext-3grid">
                <div className="lx-ext-pillar">
                  <span className="lx-ext-badge is-cloud">01 · SERVER-ONLY BRAIN</span>
                  <b>6 Proprietary Engines Never Leave Server</b>
                  <small>Zero CSS selectors, regexes, or category logic inside client/extension bundles—Zero reverse-engineering risk.</small>
                </div>
                <div className="lx-ext-pillar">
                  <span className="lx-ext-badge is-ram">02 · BLIND EXTENSION RELAY</span>
                  <b>User RAM &amp; Residential IP Execution</b>
                  <small>Runs parallel fetch tickets directly in customer browser memory (3x / 5x / 8x) with zero server Chromium load.</small>
                </div>
                <div className="lx-ext-pillar">
                  <span className="lx-ext-badge is-safe">03 · EXTENSION-ONLY DEPLOY</span>
                  <b>95% Lower Cloud Infra Cost</b>
                  <small>Lightweight Express pods stay lean (`SCRAPER_EXTENSION_ONLY=true`) while streaming full Excel &amp; Satellite Map leads.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lx-section lx-section-alt" id="faq">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><ShieldCheck size={13} /> Clear Answers</span>
              <h2>Frequently asked questions</h2>
              <p>Everything explained simply — no jargon.</p>
            </div>

            <div className="lx-faq-list">
              {FAQ.map((item, idx) => (
                <details key={item.q} className="lx-faq-item" open={idx === 0}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={16} color="#059669" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lx-section">
          <div className="lx-wrap">
            <div className="lx-cta-card">
              <div>
                <h2>Ready to build your next lead list in seconds?</h2>
                <p>Open the workspace, pick any of our 11 markets, and start discovering verified businesses live.</p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="lx-btn lx-btn-primary lx-btn-lg"
                onClick={() => openWorkspace('IN')}
              >
                Open Lead Workspace <ArrowRight size={17} />
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lx-footer">
        <div className="lx-wrap lx-footer-inner">
          <span>© {new Date().getFullYear()} Scraper.co.in · Instant Business Lead Discovery across 11 Markets</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button type="button" onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Pricing</button>
            <button type="button" onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Terms</button>
            <button type="button" onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Privacy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
