import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, Check, CheckCircle2, Cpu,
  Download, FileSpreadsheet, Globe2, Heart, HeartPulse, Home, LogIn, Mail,
  MapPin, Monitor, Phone, Plus, Radar, Rocket, Search, ShieldCheck, Sparkles,
  Star, Utensils, Wrench, Zap
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

const STORY_ZONES = [
  { name: 'Brodipet', count: '68 leads' },
  { name: 'Arundelpet', count: '74 leads' },
  { name: 'Kothapet', count: '52 leads' },
  { name: 'Lakshmipuram', count: '61 leads' },
  { name: 'Pattabhipuram', count: '44 leads' },
  { name: 'Nallapadu', count: '39 leads' },
  { name: 'Koritepadu', count: '48 leads' },
  { name: 'Gorantla', count: '55 leads' },
  { name: 'Mangalagiri', count: '93 leads' }
];

const JOURNEY_STEPS = [
  {
    icon: Globe2,
    tone: 'tone-atomic',
    step: 'Step 1',
    title: 'Pick 1 of 11 Flags',
    body: 'Choose India (complete town, mandal & village hierarchy) or any of the 10 global markets in one tap.'
  },
  {
    icon: Search,
    tone: 'tone-teal',
    step: 'Step 2',
    title: 'Type Any Business & City',
    body: 'Our smart auto-learning search understands natural queries, heals typos, and suggests local categories instantly.'
  },
  {
    icon: MapPin,
    tone: 'tone-kiwi',
    step: 'Step 3',
    title: 'All Engines Sweep Automatically',
    body: 'Every neighborhood pocket is scanned automatically — direct phones, addresses, websites, and pins stream live.'
  },
  {
    icon: FileSpreadsheet,
    tone: 'tone-dandelion',
    step: 'Step 4',
    title: 'Download Clean Excel',
    body: 'Duplicates are automatically merged out so you get a clean Excel (.xlsx), CSV, or phone (.vcf) file in 1 click.'
  }
];

const PLAYBOOKS = [
  {
    icon: Rocket,
    tone: 'tone-kiwi',
    badge: 'FOR STARTUPS & FOUNDERS',
    title: 'Launch city outreach in 60 seconds — without a data team',
    body: 'Enter a new city or launch a B2B product immediately. Pull 1,000+ direct decision-maker phone numbers without spending weeks hiring freelancers or buying stale databases.',
    cta: 'Try a Startup Search'
  },
  {
    icon: Briefcase,
    tone: 'tone-atomic',
    badge: 'FOR WEB, SEO & AD AGENCIES',
    title: 'Spot businesses with "No Website" & win ready clients',
    body: 'Filter leads to reveal high-rated local shops and clinics that still have no official website — giving your agency warm prospects who genuinely need digital growth today.',
    cta: 'Find Agency Prospects'
  },
  {
    icon: Building2,
    tone: 'tone-teal',
    badge: 'FOR DISTRIBUTORS & SALES TEAMS',
    title: 'Area-sorted Excel sheets with street pins for every rep',
    body: 'Give each field representative a clean neighborhood spreadsheet organized by pincode, mandal, or locality with direct map directions and verified phone contacts.',
    cta: 'Build Territory List'
  }
];

const INDUSTRIES = [
  {
    icon: Monitor,
    tone: 'tone-kiwi',
    title: 'Electronics, IT & Retail Shops',
    body: 'Computer shops, laptop dealers, mobile repair, CCTV installers, appliance showrooms & book stores.',
    query: 'Computer shops in Guntur',
    country: 'IN'
  },
  {
    icon: HeartPulse,
    tone: 'tone-atomic',
    title: 'Healthcare, Pharmacies & Clinics',
    body: 'Dental clinics, medical stores, diagnostic labs, eye hospitals, physiotherapy & veterinary care.',
    query: 'Dental clinics in Hyderabad',
    country: 'IN'
  },
  {
    icon: Home,
    tone: 'tone-teal',
    title: 'Real Estate, Interiors & Architecture',
    body: 'Interior designers, modular kitchens, builders, architects, paint dealers & furniture showrooms.',
    query: 'Interior designers in Mumbai',
    country: 'IN'
  },
  {
    icon: Wrench,
    tone: 'tone-dandelion',
    title: 'Contractors, Solar & Auto Services',
    body: 'HVAC contractors, solar installers, tyre & battery shops, plumbers, electricians & workshops.',
    query: 'HVAC contractors in Dallas',
    country: 'US'
  },
  {
    icon: Utensils,
    tone: 'tone-atomic',
    title: 'Food, Bakeries, Events & Venues',
    body: 'Sweet shops, bakeries, flower shops, photographers, caterers, wedding venues & boutiques.',
    query: 'Flower shops in Chennai',
    country: 'IN'
  },
  {
    icon: Building2,
    tone: 'tone-kiwi',
    title: 'B2B Suppliers, Distributors & Agencies',
    body: 'Wholesale suppliers, hardware merchants, logistics firms, chartered accountants & B2B agencies.',
    query: 'Printing & Packaging Suppliers in Bengaluru',
    country: 'IN'
  }
];

const LEAD_ANATOMY = [
  {
    icon: Phone,
    title: 'Direct Phone Numbers Ready to Call',
    body: 'Mobile and office lines are clearly labeled so your team can copy or call in one tap.'
  },
  {
    icon: MapPin,
    title: 'Verified Street Address & Map Pin',
    body: 'Exact neighborhood, city, state, postal code, and GPS pin so your sales reps never get lost.'
  },
  {
    icon: Globe2,
    title: 'Website, Email & Real Customer Ratings',
    body: 'See customer star ratings, review counts, official websites, and business emails at a glance.'
  },
  {
    icon: Download,
    title: 'Zero-Duplicate Permanent Folders',
    body: 'Every search saves neatly into a clean folder — ready for multi-sheet Excel downloads anytime.'
  }
];

const PROOF_STATS = [
  { value: '11', label: 'Core Countries Locked & Tuned' },
  { value: '619,287', label: 'Indian Towns & Villages Covered' },
  { value: '0', label: 'API Keys or Extra Scrapers Needed' },
  { value: '1-Click', label: 'Excel, CSV & Phone Export' }
];

const FAQ = [
  {
    q: 'Why can’t I just copy businesses from Google Maps manually?',
    a: 'Google Maps caps a single manual search at around 120 listings ("You’ve reached the end of the list") and hides hundreds of shops located in inner neighborhoods and nearby suburbs. Plus copying names and phone numbers one-by-one takes hours. Scraper.co.in automatically divides the city into every neighborhood zone, sweeps all of them simultaneously, and exports a clean spreadsheet in minutes.'
  },
  {
    q: 'Do I need to buy separate scrapers, proxies, or API keys?',
    a: 'No! Everything is built right in and works automatically. When you click Find Leads, our built-in local map, business directory, and website verification engines run together behind the scenes with zero extra subscriptions, extensions, or technical setup.'
  },
  {
    q: 'How does this help startups and marketing agencies?',
    a: 'Startups can launch outreach in a new city in 60 seconds instead of paying thousands for outdated databases. Web, SEO, and marketing agencies can instantly filter for local businesses that have great ratings but "No Website" — giving them high-intent clients ready to pitch.'
  },
  {
    q: 'Which 11 countries are supported?',
    a: 'India (our Home market — 36 States & UTs, 760+ Districts, 6,000+ Mandals & 619,287 Villages), United States, United Kingdom, Canada, Australia, United Arab Emirates, Singapore, New Zealand, Ireland, South Africa, and Germany.'
  },
  {
    q: 'How do I take my leads into Excel or my phone?',
    a: 'Every search saves automatically into a permanent folder. Click one button to copy all phone numbers, download a clean Excel (.xlsx) or CSV spreadsheet, or save contacts directly to your phone (.vcf).'
  }
];

function InteractiveShowcase({ demo, activeDemo, setActiveDemo }) {
  const [typedText, setTypedText] = useState(demo.query);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [5.5, -5.5]), { stiffness: 220, damping: 24 });
  const rotateY = useSpring(useTransform(mouseX, [-240, 240], [-6.5, 6.5]), { stiffness: 220, damping: 24 });

  useEffect(() => {
    let idx = 0;
    setTypedText('');
    const timer = setInterval(() => {
      idx += 1;
      setTypedText(demo.query.slice(0, idx));
      if (idx >= demo.query.length) clearInterval(timer);
    }, 24);
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
      <motion.div
        className="lx-float-badge is-top"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CheckCircle2 size={15} color="#059669" />
        <span>All Engines Working Automatically</span>
      </motion.div>

      <motion.div
        className="lx-float-badge is-bottom"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <FileSpreadsheet size={15} color="#7c3aed" />
        <span>1-Click Excel &amp; CSV Ready</span>
      </motion.div>

      <motion.div
        className="lx-showcase"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lx-showcase-top">
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
          <div className="lx-gbc-hardware-bar" aria-hidden="true">
            <span className="lx-gbc-jewel is-kiwi" />
            <span className="lx-gbc-jewel is-atomic" />
            <span className="lx-gbc-jewel is-berry" />
          </div>
        </div>

        <div className="lx-showcase-bar">
          <Search size={17} color="#7c3aed" />
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

        <div className="lx-mini-map">
          <div className="lx-radar-sweep" />
          <div className="lx-map-ring" />
          {demo.pins.map((pos, i) => (
            <motion.div
              key={`${demo.id}-pin-${i}`}
              className="lx-map-pin"
              style={{ top: pos.top, left: pos.left }}
              initial={{ scale: 0, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, type: 'spring', stiffness: 460, damping: 20 }}
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {demo.leads.map((lead, idx) => (
              <motion.div
                key={lead.name}
                className="lx-demo-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 380, damping: 26 }}
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
          <span>Verified phones, addresses &amp; GPS pins · No scrapers needed</span>
          <strong>Instant Excel &amp; Map →</strong>
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
  const [activePulseZone, setActivePulseZone] = useState(0);

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
    }, 6200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const zTimer = setInterval(() => {
      setActivePulseZone(prev => (prev + 1) % STORY_ZONES.length);
    }, 900);
    return () => clearInterval(zTimer);
  }, []);

  const demo = DEMO_SCENARIOS[activeDemo];
  const openWorkspace = (countryCode = 'IN', query = '') => {
    const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
    navigate(`/command?country=${encodeURIComponent(countryCode)}${qParam}`);
  };

  const lockedMarkets = useMemo(() => {
    return POPULAR_COUNTRIES
      .filter(c => LOCKED_11_CODES.includes(c.code))
      .sort((a, b) => LOCKED_11_CODES.indexOf(a.code) - LOCKED_11_CODES.indexOf(b.code));
  }, []);

  const monthlyLeads = weeklySearches * 4 * 165;
  const hoursSaved = weeklySearches * 4 * 6;

  return (
    <div className="lx-landing">
      <div className="lx-aurora-wrap" aria-hidden="true">
        <div className="lx-orb lx-orb-1" />
        <div className="lx-orb lx-orb-2" />
        <div className="lx-orb lx-orb-3" />
      </div>

      {/* Sticky 3D Liquid Glass Navbar */}
      <header className="lx-nav">
        <div className="lx-wrap lx-nav-inner">
          <button type="button" className="lx-brand-btn" onClick={() => openWorkspace('IN')} aria-label="Open Workspace">
            <BrandLogo size={34} theme="light" />
          </button>

          <nav className="lx-nav-links" aria-label="Primary">
            <a href="#story">Why It Works</a>
            <a href="#engines">Zero Setup</a>
            <a href="#playbooks">For Teams</a>
            <a href="#industries">Industries</a>
            <a href="#markets">11 Markets</a>
            <button type="button" onClick={() => navigate('/pricing')}>Pricing</button>
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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="lx-hero-badges">
                <span className="lx-eyebrow">
                  <Sparkles size={13} />
                  No Scrapers · No API Keys · All Engines Auto
                </span>
                <span className="lx-india-pill">
                  <Country3DFlag code="IN" size={18} isHome />
                  Made with <Heart size={12} fill="#e11d48" color="#e11d48" /> in India
                </span>
              </div>

              <h1 className="lx-h1">
                Stop fighting Google Maps limits. Get{' '}
                <span className="lx-h1-accent">every verified lead</span>{' '}
                in seconds.
              </h1>

              <p className="lx-lead-copy">
                You don&apos;t need to buy separate scrapers, proxies, or technical tools. Just pick
                one of 11 country flags, type what you&apos;re looking for, and watch our built-in
                engines automatically find every local business, phone number, and website into a
                clean Excel sheet.
              </p>

              <div className="lx-hero-actions">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="lx-btn lx-btn-primary lx-btn-lg"
                  onClick={() => openWorkspace('IN')}
                >
                  Open Lead Workspace <ArrowRight size={17} />
                </motion.button>
                <button
                  type="button"
                  className="lx-btn lx-btn-atomic lx-btn-lg"
                  onClick={() => navigate('/signup')}
                >
                  Create Free Account
                </button>
              </div>

              <div className="lx-trust-row">
                <span className="lx-trust-pill"><Check size={14} /> Beats 120-Result Map Cap</span>
                <span className="lx-trust-pill"><Check size={14} /> Auto-Learning Smart Search</span>
                <span className="lx-trust-pill"><Check size={14} /> Live Map + Excel Export</span>
              </div>
            </motion.div>

            <InteractiveShowcase
              demo={demo}
              activeDemo={activeDemo}
              setActiveDemo={setActiveDemo}
            />
          </div>
        </section>

        {/* ANIMATED STORY 1: THE GOOGLE MAPS PROBLEM VS AUTOMATIC ZONE SWEEPS */}
        <section className="lx-section lx-section-alt" id="story">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Radar size={13} /> The Real Problem Solved</span>
              <h2>Why normal map searches miss 80% of local businesses.</h2>
              <p>If your startup or agency tries finding leads manually on a map, you quickly hit a wall. Here is what changes when you run one search here:</p>
            </div>

            <div className="lx-story-compare">
              {/* Left Card: The Manual Trap */}
              <motion.article
                className="lx-story-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4 }}
              >
                <span className="lx-story-badge is-trap">
                  <AlertTriangle size={12} /> THE GOOGLE MAPS TRAP
                </span>
                <h3>Stops at ~120 listings and hides inner streets</h3>
                <p>
                  Searching a city manually only returns the first batch near the center before hitting
                  &ldquo;You&apos;ve reached the end of the list&rdquo; — skipping hundreds of active buyers in nearby neighborhoods.
                </p>

                <div className="lx-trap-stage">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 750, color: '#9f1239' }}>
                    <span>Manual search coverage in a busy city</span>
                    <span className="lx-mono">~120 / 600+ shops</span>
                  </div>
                  <div className="lx-trap-bar">
                    <motion.div
                      className="lx-trap-fill"
                      initial={{ width: '0%' }}
                      whileInView={{ width: '22%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="lx-trap-wall">
                    <span>⚠️ &ldquo;You&apos;ve reached the end of the list.&rdquo;</span>
                    <span>80% MISSED</span>
                  </div>
                </div>

                <ul className="lx-story-bullets">
                  <li><AlertTriangle size={15} color="#e11d48" /> Clicking listings one by one wastes 5–6 hours per city</li>
                  <li><AlertTriangle size={15} color="#e11d48" /> Hard to tell which leads actually have a website or mobile</li>
                  <li><AlertTriangle size={15} color="#e11d48" /> Copy-pasting into Excel introduces dozens of duplicates</li>
                </ul>
              </motion.article>

              {/* Right Card: The Automatic Neighborhood Sweep */}
              <motion.article
                className="lx-story-card is-winner"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4 }}
              >
                <span className="lx-story-badge is-win">
                  <Zap size={12} /> AUTOMATIC MULTI-ZONE SWEEP
                </span>
                <h3>Breaks every city into neighborhoods &amp; captures them all</h3>
                <p>
                  One plain-English search automatically divides the city into every commercial pocket, pincode,
                  and suburb — scanning them live together with zero effort from you.
                </p>

                <div className="lx-zone-grid-anim">
                  {STORY_ZONES.map((z, idx) => {
                    const isHot = idx === activePulseZone;
                    return (
                      <motion.div
                        key={z.name}
                        className="lx-zone-cell"
                        animate={isHot ? { scale: 1.04, borderColor: '#7c3aed', backgroundColor: '#f5f3ff' } : { scale: 1 }}
                        transition={{ duration: 0.18 }}
                      >
                        <span>{z.name}</span>
                        <b>{z.count}</b>
                      </motion.div>
                    );
                  })}
                </div>

                <ul className="lx-story-bullets">
                  <li><CheckCircle2 size={15} color="#059669" /> Covers every neighborhood, suburb &amp; surrounding town automatically</li>
                  <li><CheckCircle2 size={15} color="#059669" /> Direct phone numbers, websites &amp; coordinates verified live</li>
                  <li><CheckCircle2 size={15} color="#059669" /> Auto-removes duplicates before exporting your clean Excel file</li>
                </ul>
              </motion.article>
            </div>
          </div>
        </section>

        {/* ANIMATED STORY 2: NO SCRAPERS TO BUY — ALL ENGINES AUTOMATIC */}
        <section className="lx-section" id="engines">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Cpu size={13} /> Zero Extra Tools Required</span>
              <h2>You don&apos;t need to buy any scrapers. Every engine runs automatically.</h2>
              <p>No browser extensions to break, no proxy bills, and no technical jargon. Type what you want — the entire pipeline connects itself live.</p>
            </div>

            <motion.div
              className="lx-engine-story"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
            >
              <div className="lx-engine-flow">
                <div className="lx-engine-inputs">
                  {[
                    { title: 'Local Map & Pin Discovery', desc: 'Finds every shop across neighborhoods, streets & pincodes automatically.' },
                    { title: 'Business Directory Matching', desc: 'Cross-checks categories, customer ratings, reviews & operating details.' },
                    { title: 'Official Website & Contact Finder', desc: 'Visits listed websites to surface missing phones and official emails.' }
                  ].map((item, idx) => (
                    <motion.div
                      key={item.title}
                      className="lx-engine-node"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: idx * 0.35 }}
                    >
                      <span className="lx-flow-step-orb tone-atomic" style={{ margin: 0, width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}>
                        <Zap size={17} />
                      </span>
                      <div>
                        <b style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{item.title}</b>
                        <small style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.45, display: 'block' }}>{item.desc}</small>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="lx-engine-core"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={26} color="#34d399" />
                  <b style={{ fontSize: 15, fontWeight: 850, letterSpacing: '0.02em' }}>AUTO-PILOT ENGINE</b>
                  <span style={{ fontSize: 12.5, color: '#cbd5e1', maxWidth: 200, lineHeight: 1.5 }}>
                    Cleanly merges all sources, deletes duplicates &amp; streams leads live
                  </span>
                </motion.div>

                <div className="lx-engine-output">
                  <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.07em', color: '#047857' }}>WHAT YOU ACTUALLY DO</span>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Click 1 button. Start calling prospects.</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>
                    No coding, no scraper scripts, no Google API billing, and zero spreadsheets to clean by hand.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <span className="lx-trust-pill"><Check size={13} /> Verified Mobiles</span>
                    <span className="lx-trust-pill"><Check size={13} /> Zero Duplicates</span>
                    <span className="lx-trust-pill"><Check size={13} /> Ready Excel (.xlsx)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ANIMATED STORY 3: FOR STARTUPS, AGENCIES & SALES TEAMS */}
        <section className="lx-section lx-section-alt" id="playbooks">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Briefcase size={13} /> Built for Real Growth</span>
              <h2>Why Startups, Agencies &amp; Sales Teams rely on Scraper.co.in.</h2>
              <p>Whether you are launching day-one outbound sales or pitching local businesses as an agency, every workflow is ready right out of the box.</p>
            </div>

            <div className="lx-playbook-grid">
              {PLAYBOOKS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    className="lx-playbook-card"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: idx * 0.08 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className={`lx-flow-step-orb ${item.tone}`} style={{ margin: 0, width: 46, height: 46, borderRadius: 13 }}>
                      <Icon size={21} />
                    </div>
                    <span className="lx-mono" style={{ fontSize: 10.5, fontWeight: 800, color: '#7c3aed', letterSpacing: '0.06em' }}>
                      {item.badge}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.6, flex: 1 }}>{item.body}</p>
                    <button
                      type="button"
                      className="lx-btn lx-btn-ghost"
                      style={{ alignSelf: 'flex-start', height: 36, fontSize: 12.5, padding: '0 14px' }}
                      onClick={() => openWorkspace('IN')}
                    >
                      {item.cta} <ArrowRight size={13} />
                    </button>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="lx-section" id="how">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Zap size={13} /> How It Works</span>
              <h2>From plain search to ready-to-call Excel sheet.</h2>
              <p>Everything stays cleanly arranged on one screen — flag dock, smart search bar, live leads table, and animated territory map.</p>
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
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: idx * 0.07, duration: 0.36 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className={`lx-flow-step-orb ${item.tone}`}><Icon size={22} /></div>
                    <small style={{ fontSize: 11, fontWeight: 850, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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

        {/* Built for Every Industry */}
        <section className="lx-section lx-section-alt" id="industries">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Sparkles size={13} /> Universal Coverage</span>
              <h2>Every industry &amp; shop type understood out of the box.</h2>
              <p>Click any industry card below to launch the workspace pre-loaded with a live query.</p>
            </div>

            <div className="lx-industry-grid">
              {INDUSTRIES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.title}
                    type="button"
                    className="lx-industry-card"
                    onClick={() => openWorkspace(item.country, item.query)}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className={`lx-flow-step-orb ${item.tone}`} style={{ margin: 0, width: 44, height: 44, borderRadius: 13 }}>
                      <Icon size={20} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    <span className="lx-industry-query">
                      Try: &ldquo;{item.query}&rdquo; <ArrowRight size={12} />
                    </span>
                  </motion.button>
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
              <h2>Clean, complete business profiles — ready to dial.</h2>
              <p>Every discovered business streams straight into your Live Leads table and interactive map.</p>
            </div>

            <div className="lx-anatomy-grid">
              <motion.div
                className="lx-anatomy-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: 'linear-gradient(135deg, #059669, #06b6d4)', color: '#ffffff',
                      display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: 20,
                      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 0 #047857'
                    }}
                  >
                    A
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 999, background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9', fontSize: 11, fontWeight: 850 }}>
                        COMPUTER SHOPS
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 750, color: '#d97706' }}>★ 4.8 (184 reviews)</span>
                    </div>
                    <h3 style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      Apex Computers &amp; Laptop Hub
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 13, background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', fontWeight: 750, fontSize: 14 }}>
                    <Phone size={15} /> <span className="lx-mono">+91 98480 12345</span> <span style={{ marginLeft: 'auto', fontSize: 11, background: '#ffffff', padding: '2px 8px', borderRadius: 999 }}>Verified Mobile</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 13, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13.5, fontWeight: 600 }}>
                    <MapPin size={15} color="#06b6d4" /> 4th Lane, Brodipet, Guntur, Andhra Pradesh 522002
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 13, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                      <Globe2 size={14} color="#059669" /> apexcomputers.in
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 13, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', color: '#334155', fontSize: 13, fontWeight: 600 }}>
                      <Mail size={14} color="#7c3aed" /> sales@apex…
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
                      initial={{ opacity: 0, x: 18 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: idx * 0.06, duration: 0.34 }}
                    >
                      <div className="lx-card-icon" style={{ margin: 0, flexShrink: 0 }}>
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

        {/* Made in India + Locked 11 Supported Markets */}
        <section className="lx-section lx-section-alt" id="markets">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Globe2 size={13} /> Made with ❤️ in India · 11 Locked Markets</span>
              <h2>Engineered in India. Built for 11 major markets worldwide.</h2>
              <p>Click any flag below to launch the workspace pre-tuned for that country&apos;s cities, states, and phone formats.</p>
            </div>

            <div className="lx-india-heritage">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Country3DFlag code="IN" size={38} isHome />
                <div>
                  <b style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: '#0f172a' }}>
                    Proudly Made with <Heart size={14} fill="#e11d48" color="#e11d48" style={{ verticalAlign: -2 }} /> in India — Unmatched Indian Depth
                  </b>
                  <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 600 }}>
                    Every State, District, Revenue Mandal / Taluka, Metro &amp; 619,287 Villages indexed locally right inside the platform.
                  </span>
                </div>
              </div>
              <button type="button" className="lx-btn lx-btn-primary" onClick={() => openWorkspace('IN')}>
                Search India Now <ArrowRight size={14} />
              </button>
            </div>

            <div className="lx-country-grid">
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
                    transition={{ delay: idx * 0.025 }}
                    whileHover={{ y: -3 }}
                  >
                    <Country3DFlag code={country.code} size={28} isHome={isHome} />
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
                <motion.div key={stat.label} className="lx-stat-box" whileHover={{ y: -3 }}>
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
                  <span className="lx-mono" style={{ color: '#34d399' }}>{weeklySearches} searches / week</span>
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
          </div>
        </section>

        {/* FAQ */}
        <section className="lx-section lx-section-alt" id="faq">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><ShieldCheck size={13} /> Clear Answers</span>
              <h2>Frequently asked questions</h2>
              <p>Everything explained clearly — zero technical jargon.</p>
            </div>

            <div className="lx-faq-list">
              {FAQ.map((item, idx) => (
                <details key={item.q} className="lx-faq-item" open={idx === 0}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={16} color="#7c3aed" />
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
                <p>Create your account or jump straight into the 3D Liquid Glass workspace and watch leads stream live.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="lx-btn lx-btn-ghost lx-btn-lg" onClick={() => navigate('/pricing')}>
                  View Pricing
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="lx-btn lx-btn-primary lx-btn-lg"
                  onClick={() => openWorkspace('IN')}
                >
                  Open Lead Workspace <ArrowRight size={17} />
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lx-footer">
        <div className="lx-wrap lx-footer-inner">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            © {new Date().getFullYear()} Scraper.co.in · Made with <Heart size={13} fill="#e11d48" color="#e11d48" /> in India · 11 Locked Markets
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button type="button" onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 650, cursor: 'pointer' }}>Pricing</button>
            <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 650, cursor: 'pointer' }}>Sign In</button>
            <button type="button" onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 650, cursor: 'pointer' }}>Terms</button>
            <button type="button" onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: 650, cursor: 'pointer' }}>Privacy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
