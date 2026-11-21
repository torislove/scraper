import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, Check, CheckCircle2, Cpu,
  Download, FileSpreadsheet, Globe2, Heart, HeartPulse, Home, Layers, LogIn, Mail,
  MapPin, Monitor, Phone, Plus, Radar, Rocket, Search, ShieldCheck, Sparkles,
  Star, Utensils, Wrench, Zap
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import ExtensionGatewayModal from './components/modals/ExtensionGatewayModal';
import { POPULAR_COUNTRIES } from './data/countries';
import { COUNTRY_COUNTY_SHOWCASE, GLOBAL_11_COUNTRY_TICKER } from './data/searchExamples';
import {
  detectDeviceHardware, DEVICE_REQUIREMENTS, ALL_BUILTIN_ENGINES, EXTENSION_STORE_URL
} from './utils/deviceRamEngine';
import { detectExtension } from './utils/relayAgent';
import { pingHealth } from './api';
import './landingExecutive.css';
import './landingCloud.css';

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
    id: 'hyderabad-it',
    pill: 'Software & IT · Hyderabad',
    query: 'Software companies in HITEC City Hyderabad',
    country: 'IN',
    areaLabel: 'Hyderabad, Telangana · 1,194 businesses pinned',
    count: '1,194 leads',
    pins: [
      { top: '24%', left: '22%' },
      { top: '54%', left: '44%' },
      { top: '32%', left: '72%' },
      { top: '68%', left: '62%' },
      { top: '42%', left: '28%' }
    ],
    leads: [
      { name: 'CyberTowers Cloud Systems', area: 'HITEC City, Hyderabad', rating: '4.9', reviews: 318, phone: '+91 98490 •••12' },
      { name: 'Deccan Digital Solutions', area: 'Madhapur, Hyderabad', rating: '4.8', reviews: 214, phone: '+91 94401 •••89' },
      { name: 'Jubilee Enterprise Tech', area: 'Banjara Hills, Hyderabad', rating: '4.9', reviews: 276, phone: '+91 90005 •••44' }
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
    pill: 'HVAC · Orange & Dallas Counties',
    query: 'HVAC Contractors in Harris County TX',
    country: 'US',
    areaLabel: 'Harris & Dallas Counties, US · 264 businesses pinned',
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
      { name: 'Metroplex Climate Solutions', area: 'Harris County, TX', rating: '4.8', reviews: 265, phone: '+1 (469) •••-4418' },
      { name: 'Coastal Cooling Mechanical', area: 'Orange County, CA', rating: '4.7', reviews: 180, phone: '+1 (949) •••-8820' }
    ]
  },
  {
    id: 'london-dentists',
    pill: 'Dental Clinics · Westminster UK',
    query: 'Dental Clinics in Westminster London',
    country: 'GB',
    areaLabel: 'Westminster & Greater London, UK · 215 businesses pinned',
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
  { name: 'HITEC City', count: '94 leads' },
  { name: 'Madhapur', count: '88 leads' },
  { name: 'Banjara Hills', count: '76 leads' },
  { name: 'Jubilee Hills', count: '69 leads' },
  { name: 'Gachibowli', count: '84 leads' },
  { name: 'Kukatpally', count: '91 leads' },
  { name: 'Ameerpet', count: '79 leads' },
  { name: 'Begumpet', count: '64 leads' },
  { name: 'Secunderabad', count: '97 leads' }
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
  { value: '20+', label: 'Built-In Lead Discovery Engines' },
  { value: '1-Click', label: 'Live Satellite Radar & Excel Export' }
];

const FAQ = [
  {
    q: 'Why can’t I just copy businesses from Google Maps manually?',
    a: 'Google Maps caps a single manual search at around 120 listings ("You’ve reached the end of the list") and hides hundreds of shops located in inner neighborhoods and nearby suburbs. Plus copying names and phone numbers one-by-one takes hours. Scraper.co.in automatically divides Hyderabad, any Indian town/mandal, or global county into every neighborhood zone, sweeps all of them in parallel on a live Satellite Radar map, and exports a clean Excel spreadsheet in minutes.'
  },
  {
    q: 'Do I get all 20+ built-in lead discovery engines automatically?',
    a: 'Yes! Our platform orchestrates 20+ specialized lead extraction engines across satellite maps, local business directories, B2B wholesale portals, official websites, and social indices. For India, 11 dedicated engines run simultaneously (including Justdial, IndiaMART, Google Places, OpenStreetMap, WeddingBazaar & GoMandap). For our 10 international markets, 11–12 localized commercial directories (Yelp, YellowPages Global, Cylex, FreeIndex UK, GoldenPages Ireland) run in parallel — with zero extra API keys or proxy bills.'
  },
  {
    q: 'What if I want leads from an entire District, State, or every website across the internet?',
    a: 'Use our Client Workspace for any single city, town, mandal, or county right from your browser. When your business needs complete territory lists covering entire districts, full states, or nationwide rollouts gathered across every public website, map, and directory on the internet, reach our Master Territory Intelligence Desk below.'
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

function InteractiveShowcase({ demo, activeDemo, setActiveDemo, totalDemos = 4, onLaunch }) {
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

  const prevDemo = () => setActiveDemo(prev => (prev - 1 + totalDemos) % totalDemos);
  const nextDemo = () => setActiveDemo(prev => (prev + 1) % totalDemos);

  return (
    <div style={{ perspective: 1200, position: 'relative' }}>
      <motion.div
        className="lx-float-badge is-top"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CheckCircle2 size={15} color="#059669" />
        <span>20+ Engines Sweeping Live</span>
      </motion.div>

      <motion.div
        className="lx-float-badge is-bottom"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <FileSpreadsheet size={15} color="#7c3aed" />
        <span>Satellite Radar · 1-Click Excel</span>
      </motion.div>

      <motion.div
        className="lx-showcase lx-gba-console"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top GBA-Color Cartridge Slot Bar */}
        <div className="lx-gba-cartridge-slot">
          <span>◄ CARTRIDGE: SCRAPER.CO.IN · 11-COUNTRY LIVE SATELLITE EDITION ►</span>
          <span className="lx-gba-power-led">
            <i /> POWER
          </span>
        </div>

        {/* Illuminated GBA IPS Console Screen Bezel */}
        <div className="lx-gba-screen-bezel">
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

          <div className="lx-mini-map is-satellite">
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
            <span className="lx-gba-sat-beacon" style={{ top: '16%', right: '14%' }}>⚡ LIVE ZONE</span>
            <span className="lx-map-label">🛰️ {demo.areaLabel}</span>
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
        </div>

        {/* Bottom Physical GBA-Color Console Controls Deck */}
        <div className="lx-gba-controls-deck">
          <div className="lx-gba-dpad-wrap">
            <div className="lx-gba-dpad" role="group" aria-label="Cycle country cartridge demos">
              <button type="button" className="lx-gba-dpad-btn is-up" onClick={prevDemo} aria-label="Previous demo">▲</button>
              <button type="button" className="lx-gba-dpad-btn is-left" onClick={prevDemo} aria-label="Previous country">◀</button>
              <span className="lx-gba-dpad-center" aria-hidden="true" />
              <button type="button" className="lx-gba-dpad-btn is-right" onClick={nextDemo} aria-label="Next country">▶</button>
              <button type="button" className="lx-gba-dpad-btn is-down" onClick={nextDemo} aria-label="Next demo">▼</button>
            </div>
            <div className="lx-gba-brand-plate">
              <b>SCRAPER.CO.IN</b>
              <small>GBA-COLOR 3D</small>
            </div>
          </div>

          <div className="lx-gba-center-pills">
            <button type="button" className="lx-gba-pill-btn" onClick={nextDemo} title="Switch Demo Cartridge">SELECT</button>
            <button type="button" className="lx-gba-pill-btn is-start" onClick={onLaunch} title="Launch Active Search in Workspace">START</button>
          </div>

          <div className="lx-gba-ab-cluster">
            <a href="#engines" className="lx-gba-round-btn is-b" title="Inspect All 20+ Engines">
              <span>B</span>
              <small>ENGINES</small>
            </a>
            <button type="button" className="lx-gba-round-btn is-a" onClick={onLaunch} title="Launch Live Search">
              <span>A</span>
              <small>LAUNCH</small>
            </button>
          </div>
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
  const [selectedMarketCode, setSelectedMarketCode] = useState('IN');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extConnected, setExtConnected] = useState(false);
  const [pendingLaunch, setPendingLaunch] = useState(null);
  const [engineCategoryFilter, setEngineCategoryFilter] = useState('All');
  const hardware = useMemo(() => detectDeviceHardware(), []);

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

  // Probe extension presence and listen for bridge pongs
  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const res = await detectExtension(250);
        if (active && res?.installed) setExtConnected(true);
      } catch (e) {}
    };
    probe();
    const handleMsg = (ev) => {
      if (ev.data?.source === 'SCRAPER_RAM_EXTENSION' && ev.data?.type === 'SCRAPER_EXT_PONG') {
        if (active) setExtConnected(true);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => {
      active = false;
      window.removeEventListener('message', handleMsg);
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
    return () => {
      clearInterval(zTimer);
    };
  }, []);

  const demo = DEMO_SCENARIOS[activeDemo];
  const openWorkspace = async (countryCode = 'IN', query = '') => {
    try {
      const res = await detectExtension(250);
      if (res?.installed) {
        setExtConnected(true);
        const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
        navigate(`/command?country=${encodeURIComponent(countryCode)}${qParam}`);
        return;
      }
    } catch (e) {}
    setPendingLaunch({ countryCode, query });
    setShowExtensionModal(true);
  };

  const handleExtensionConnected = () => {
    setExtConnected(true);
    setShowExtensionModal(false);
    const target = pendingLaunch || { countryCode: 'IN', query: '' };
    const qParam = target.query ? `&q=${encodeURIComponent(target.query)}` : '';
    navigate(`/command?country=${encodeURIComponent(target.countryCode || 'IN')}${qParam}`);
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
      <a href="#main-content" className="lx-skip-link">Skip to main content</a>
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
            <a href="#engines">20+ Engines &amp; RAM</a>
            <a href="#playbooks">For Teams</a>
            <a href="#markets">11 Countries</a>
            <a href="#master-concierge">Master Service</a>
            <button type="button" onClick={() => navigate('/pricing')}>Pricing</button>
          </nav>

          <div className="lx-nav-actions">
            <span className={`lx-status-pill ${online ? '' : 'is-off'}`}>
              <span className="lx-status-dot" />
              {online ? 'Ready' : 'Connecting'}
            </span>
            <button
              type="button"
              className={`lx-nav-ext-pill ${extConnected ? 'is-connected' : ''}`}
              onClick={() => setShowExtensionModal(true)}
              title={extConnected ? 'Browser Extension Connected (RAM Turbo Active)' : 'Connect Browser Extension'}
            >
              <Cpu size={13} />
              <span>{extConnected ? 'Extension Active' : 'Connect Extension'}</span>
            </button>
            <button type="button" className="lx-btn lx-btn-ghost" onClick={() => navigate('/login')}>
              <LogIn size={15} /> Sign in
            </button>
            <button type="button" className="lx-btn lx-btn-primary" onClick={() => openWorkspace('IN')}>
              <span className="lx-gbc-keycap-landing is-a" aria-hidden="true">A</span>
              Open Command Center <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <section className="lx-hero">
          <div className="lx-wrap lx-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="lx-eyebrow">
                <Sparkles size={13} />
                INDIA FIRST · 11 COUNTRIES · NO API KEYS · NO SETUP
              </span>

              <h1 className="lx-h1">
                Search all the leads <span className="lx-h1-accent">in your area.</span>
              </h1>

              <p className="lx-lead-copy">
                Type a business and a place. 20+ specialized engines sweep every street, mandal, district and
                state on a live map — and give you verified mobile numbers, emails and websites in
                one clean Excel file.
              </p>

              <div className="lx-hero-actions">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="lx-btn lx-btn-primary lx-btn-lg"
                  onClick={() => openWorkspace('IN')}
                >
                  <span className="lx-gbc-keycap-landing is-start" aria-hidden="true">A</span>
                  Open Command Center <ArrowRight size={17} />
                </motion.button>
                <a href="#cloud-extension" className="lx-btn lx-btn-ghost lx-btn-lg">
                  How it works
                </a>
              </div>

              <div className="lx-market-flags" aria-label="11 supported markets">
                {lockedMarkets.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    className={c.code === selectedMarketCode ? 'lx-market-flag is-on' : 'lx-market-flag'}
                    onClick={() => setSelectedMarketCode(c.code)}
                    title={c.name}
                  >
                    <Country3DFlag code={c.code} size={18} isHome={c.code === 'IN'} />
                    <span>{c.code}</span>
                  </button>
                ))}
              </div>

              <div className="lx-hero-cloud-strip" aria-label="How the cloud and the extension work together">
                <div className="lx-hcs-item">
                  <span className="lx-hcs-icon"><Cpu size={16} /></span>
                  <div>
                    <b>20+ engines on our cloud</b>
                    <small>Search brain, geo data, phone checks</small>
                  </div>
                </div>
                <span className="lx-hcs-arrow" aria-hidden="true">+</span>
                <div className="lx-hcs-item">
                  <span className="lx-hcs-icon"><Zap size={16} /></span>
                  <div>
                    <b>Your extension adds speed</b>
                    <small>Skips the queue using your connection</small>
                  </div>
                </div>
                <span className="lx-hcs-arrow" aria-hidden="true">=</span>
                <div className="lx-hcs-item">
                  <span className="lx-hcs-icon"><FileSpreadsheet size={16} /></span>
                  <div>
                    <b>One clean lead file</b>
                    <small>Verified mobiles, emails, websites</small>
                  </div>
                </div>
              </div>
            </motion.div>

            <InteractiveShowcase
              demo={demo}
              activeDemo={activeDemo}
              setActiveDemo={setActiveDemo}
              totalDemos={DEMO_SCENARIOS.length}
              onLaunch={() => openWorkspace(demo.country, demo.query)}
            />
          </div>
        </section>

        {/* Cloud engines + extension speed — the one idea the whole product rests on */}
        <section className="lx-section lx-cloud-split" id="cloud-extension">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><ShieldCheck size={13} /> How Scraper.co.in is built</span>
              <h2>Our 20+ engines stay on our secure cloud. Our extension powers your speed.</h2>
              <p>
                Nothing heavy runs on your computer. The search brain, geo data and phone
                validation live on our servers. A tiny extension borrows your connection — and
                your spare RAM — so sweeps run in parallel instead of waiting in a queue.
              </p>
            </div>

            <div className="lx-cloud-3">
              <article className="lx-cloud-card">
                <span className="lx-cloud-num">01</span>
                <div className="lx-cloud-icon"><Cpu size={20} /></div>
                <h3>20+ engines on our secure cloud</h3>
                <p>
                  Maps, local directories, official websites, B2B suppliers, public registries
                  and a smart dedupe engine all run server-side. For India, 11 dedicated engines
                  run live; for global markets, 11–12 localized directories run in parallel.
                </p>
                <ul>
                  <li><Check size={14} /> Always current, always patched</li>
                  <li><Check size={14} /> 619k+ Indian towns and mandals mapped</li>
                  <li><Check size={14} /> Phone and email validation built in</li>
                </ul>
              </article>

              <article className="lx-cloud-card is-accent">
                <span className="lx-cloud-num">02</span>
                <div className="lx-cloud-icon"><Zap size={20} /></div>
                <h3>Your extension powers the speed</h3>
                <p>
                  Add our ultra-lightweight RAM Turbo extension in 30 seconds. It lets the cloud engines
                  read pages through your connection, so your searches skip the shared queue.
                </p>
                <ul>
                  <li><Check size={14} /> 4 GB = 3 lanes · 8 GB = 5 lanes · 16 GB+ = 8 lanes</li>
                  <li><Check size={14} /> Connects itself after install</li>
                  <li><Check size={14} /> Never reads your tabs, history or passwords</li>
                </ul>
                <div className="lx-cloud-cta">
                  <button
                    type="button"
                    className="lx-btn lx-btn-primary"
                    onClick={() => setShowExtensionModal(true)}
                  >
                    <Download size={15} /> Install Extension (1-Click)
                  </button>
                </div>
              </article>

              <article className="lx-cloud-card">
                <span className="lx-cloud-num">03</span>
                <div className="lx-cloud-icon"><FileSpreadsheet size={20} /></div>
                <h3>You get one clean lead file</h3>
                <p>
                  Every source feeds one de-duplicated list. Verified mobiles, websites and
                  emails, sorted by district and mandal, ready for Excel or your CRM.
                </p>
                <ul>
                  <li><Check size={14} /> Duplicates removed automatically</li>
                  <li><Check size={14} /> Mobile vs landline classified</li>
                  <li><Check size={14} /> One-click Excel (.xlsx) export</li>
                </ul>
              </article>
            </div>
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

        {/* ANIMATED STORY 2: ALL 20+ BUILT-IN LEAD ENGINES SWEEPING LIVE TOGETHER */}
        <section className="lx-section" id="engines">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Cpu size={13} /> 20+ Lead Extraction Engines Included Automatically</span>
              <h2>20+ specialized discovery engines sweep every zone live together.</h2>
              <p>
                Zero browser extensions to configure manually, zero external API keys, and zero spreadsheets to clean by hand.
                For India, 11 dedicated engines (Justdial, IndiaMART, Google Places, OpenStreetMap, WeddingBazaar, GoMandap...) sweep simultaneously.
                For our 10 international markets, 11–12 localized commercial directories (Yelp, YellowPages Global, Cylex, FreeIndex UK, GoldenPages Ireland...) run in parallel.
              </p>
            </div>

            <motion.div
              className="lx-engine-story lx-gbc-cartridge-card"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
            >
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'All', label: 'All Engines (22)' },
                  { id: 'Maps & Geospatial', label: 'Maps & Geospatial (4)' },
                  { id: 'National Directories', label: 'National Directories (7)' },
                  { id: 'B2B & Industrial', label: 'B2B & Wholesale (1)' },
                  { id: 'Hospitality', label: 'Hospitality & Events (4)' },
                  { id: 'Web Discovery', label: 'Web & Deep Crawling (3)' },
                  { id: 'Social Discovery', label: 'Social & Knowledge (2)' },
                  { id: 'Data Quality & Export', label: 'Deduplication & Quality (1)' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`lx-demo-pill ${engineCategoryFilter === cat.id ? 'is-active' : ''}`}
                    onClick={() => setEngineCategoryFilter(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="lx-engines-6-grid">
                {ALL_BUILTIN_ENGINES
                  .filter(eng => engineCategoryFilter === 'All' || eng.category.includes(engineCategoryFilter) || (engineCategoryFilter === 'Hospitality' && eng.category.includes('Hospitality')))
                  .map((eng, idx) => (
                  <motion.div
                    key={eng.id}
                    className="lx-engine-cart-card"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="lx-engine-cart-head">
                      <span className="lx-flow-step-orb tone-atomic" style={{ margin: 0, width: 34, height: 34, borderRadius: 10, flexShrink: 0 }}>
                        <Zap size={15} />
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span className="lx-engine-live-dot">LIVE · {eng.number.toUpperCase()}</span>
                        <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 800 }}>{eng.coverage}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 850, textTransform: 'uppercase', color: '#059669', marginBottom: 2 }}>
                      {eng.category}
                    </div>
                    <b>{eng.name}</b>
                    <small>{eng.shortDesc}</small>
                  </motion.div>
                ))}
              </div>

              <div className="lx-engine-live-bar">
                <div className="lx-engine-live-badge">
                  <Sparkles size={18} color="#34d399" />
                  <b>20+ ENGINES → SMART DEDUPLICATION → 1-CLICK EXCEL</b>
                </div>
                <span>Every zone streams live onto the 3D Satellite Map with verified mobile numbers, websites &amp; emails.</span>
              </div>

              <div className="lx-ram-banner">
                <div className="lx-ram-banner-head">
                  <div>
                    <b style={{ fontSize: 15, color: '#0f172a' }}>Hardware-Accelerated Parallel Zones</b>
                    <div style={{ fontSize: 12.5, color: '#475569' }}>Runs smoothly on any Windows, Mac, or Linux machine — parallel sweep speed scales automatically:</div>
                  </div>
                  <span className="lx-precision-pill is-service">💻 Your Device: {hardware.ramGb} GB RAM · {hardware.cpuCores} Cores · {hardware.parallelZones}x Parallel Zones</span>
                </div>
                <div className="lx-req-grid">
                  {DEVICE_REQUIREMENTS.map(req => (
                    <div key={req.tier} className={`lx-req-card ${req.tier === hardware.tier ? 'is-matched' : ''}`}>
                      <span className="lx-req-badge">{req.badge}{req.tier === hardware.tier ? ' · DETECTED' : ''}</span>
                      <b>{req.ram} · {req.cpu}</b>
                      <small style={{ color: '#047857', fontWeight: 800 }}>{req.parallelZones} Parallel Zones · {req.speed}</small>
                      <p>{req.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lx-ext-shield-card">
                <div className="lx-ext-shield-head">
                  <div>
                    <span className="lx-kicker" style={{ marginBottom: 8 }}><ShieldCheck size={13} /> Cloud-Protected Engines · Extension-Only Speed</span>
                    <h3>Our 20+ Engines Stay on Our Secure Cloud. Our Extension Powers Your Speed.</h3>
                    <p>
                      Install our ultra-lightweight Chrome / Edge extension in 30 seconds to unlock instant parallel sweeps with zero waiting queues.
                    </p>
                  </div>
                  <div className="lx-ext-cta-group">
                    <button
                      type="button"
                      className="lx-btn lx-btn-primary"
                      onClick={() => setShowExtensionModal(true)}
                    >
                      <Download size={15} /> Install Extension (1-Click)
                    </button>
                    <button type="button" className="lx-btn lx-btn-ghost" onClick={() => openWorkspace('IN')}>
                      Open Command Center <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="lx-ext-3grid">
                  <div className="lx-ext-pillar">
                    <span className="lx-ext-badge is-cloud">01 · SERVER CLOUD BRAIN</span>
                    <b>100% Proprietary 20+ Engine Intelligence</b>
                    <small>
                      All smart search routing, 619,287 Indian town/village mapping, Store vs. Service AI, phone validation, and Excel cleaning run safely on our cloud servers—never exposed or stale.
                    </small>
                  </div>
                  <div className="lx-ext-pillar">
                    <span className="lx-ext-badge is-ram">02 · USER RAM EXTENSION</span>
                    <b>Zero-Queue Parallel Zones on Your Hardware</b>
                    <small>
                      The lightweight browser bridge uses your idle RAM (4GB = 3 zones, 8GB = 5 zones, 16GB+ = 8 zones simultaneously) and home connection—no crowded server queues or shared datacenter blocks.
                    </small>
                  </div>
                  <div className="lx-ext-pillar">
                    <span className="lx-ext-badge is-safe">03 · ONE-CLICK PRIVATE SETUP</span>
                    <b>Runs Only When You Click Search</b>
                    <small>
                      Add it from the Chrome Web Store, reload the page, and it connects itself.
                      It never reads your other tabs, history or passwords — only the page the
                      server asks for. Works in all 11 countries.
                    </small>
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
                const isSelected = selectedMarketCode === country.code;
                return (
                  <motion.button
                    key={country.code}
                    type="button"
                    aria-pressed={isSelected}
                    className={`lx-country-btn ${isHome ? 'is-home' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedMarketCode(country.code)}
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

            {(() => {
              const activeCountry = COUNTRY_COUNTY_SHOWCASE.find(c => c.code === selectedMarketCode) || COUNTRY_COUNTY_SHOWCASE[0];
              return (
                <motion.div
                  key={activeCountry.code}
                  className="lx-market-explorer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="lx-market-explorer-head">
                    <div>
                      <span className="lx-precision-pill is-place" style={{ marginBottom: 6 }}>
                        {activeCountry.name} · {activeCountry.adminPath}
                      </span>
                      <h3>Try a real {activeCountry.name} search by city, mandal, or county:</h3>
                    </div>
                    <button
                      type="button"
                      className="lx-btn lx-btn-primary"
                      onClick={() => openWorkspace(activeCountry.code, activeCountry.examples[0])}
                    >
                      Open {activeCountry.name} Workspace <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="lx-example-chips-row">
                    {activeCountry.examples.map(ex => (
                      <button
                        key={ex}
                        type="button"
                        className="lx-example-chip"
                        onClick={() => openWorkspace(activeCountry.code, ex)}
                      >
                        <Sparkles size={12} color="#7c3aed" />
                        <span>{ex}</span>
                        <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </section>

        {/* DUAL-CARTRIDGE ARCHITECTURE: CLIENT WORKSPACE VS MASTER TERRITORY INTELLIGENCE */}
        <section className="lx-section" id="master-concierge">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Layers size={13} /> Client Edition &amp; Master Territory Intelligence</span>
              <h2>Two tailored editions built for single cities or full states.</h2>
              <p>Run instant self-serve searches across any neighborhood or county in the Client Workspace, or let our Master Team deliver entire Districts, States, and nationwide data.</p>
            </div>

            <div className="lx-dual-cartridge-grid">
              {/* Cartridge 01: Client Workspace Edition */}
              <motion.article
                className="lx-cartridge-panel is-client lx-gbc-cartridge-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <span className="lx-cartridge-tag is-client">CARTRIDGE 01 · CLIENT WORKSPACE EDITION</span>
                <h3>Instant City, Town, Mandal &amp; County Leads</h3>
                <p>
                  Built for startups, agencies, and local sales teams. Pick any of the 11 countries,
                  type a service and neighborhood/mandal/county, watch our 20+ built-in engines illuminate the live 3D Satellite Radar Map, and download clean Excel in seconds.
                </p>
                <ul className="lx-story-bullets">
                  <li><CheckCircle2 size={15} color="#059669" /> All 20+ Built-In Lead Engines running automatically</li>
                  <li><CheckCircle2 size={15} color="#059669" /> 100% HD Satellite Live Zone Radar across 11 countries</li>
                  <li><CheckCircle2 size={15} color="#059669" /> Clean, deduplicated Excel (.xlsx), CSV &amp; Phone (.vcf) exports</li>
                </ul>
                <button type="button" className="lx-btn lx-btn-primary" style={{ marginTop: 'auto' }} onClick={() => openWorkspace('IN', 'Software companies in HITEC City Hyderabad')}>
                  <span className="lx-gbc-keycap-landing is-start" aria-hidden="true">START</span>
                  Launch Client Workspace <ArrowRight size={15} />
                </button>
              </motion.article>

              {/* Cartridge 02: Master Territory Intelligence Edition */}
              <motion.article
                className="lx-cartridge-panel is-master lx-gbc-cartridge-card"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.08 }}
              >
                <span className="lx-cartridge-tag is-master">CARTRIDGE 02 · MASTER TERRITORY INTELLIGENCE EDITION</span>
                <h3>Entire Districts, Full States &amp; Complete Web Coverage</h3>
                <p>
                  Need every business across an entire District, County, State, or Nationwide rollout?
                  Our Master Edition gathers verified datasets from every public website, business directory, map, and online registry across the entire internet and delivers organized Excel workbooks.
                </p>
                <div className="lx-contact-slots" style={{ marginTop: 'auto' }}>
                  {/* TODO: Replace "Adding Soon" with live mobile number when ready */}
                  <div className="lx-contact-slot">
                    <Phone size={18} color="#059669" />
                    <div>
                      <small>DIRECT MOBILE &amp; WHATSAPP DESK</small>
                      <b>Adding Soon</b>
                    </div>
                  </div>
                  {/* TODO: Replace "Adding Soon" with live support email when ready */}
                  <div className="lx-contact-slot">
                    <Mail size={18} color="#7c3aed" />
                    <div>
                      <small>PRIORITY SUPPORT EMAIL</small>
                      <b>Adding Soon</b>
                    </div>
                  </div>
                </div>
              </motion.article>

              {/* 11-COUNTRY ADMINISTRATIVE TERMINOLOGY REFERENCE */}
              <motion.div
                className="lx-terminology-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                style={{
                  gridColumn: '1 / -1',
                  marginTop: 24,
                  padding: '24px 28px',
                  borderRadius: 18,
                  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 10px 28px -10px rgba(15, 23, 42, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                  <div>
                    <span className="lx-kicker" style={{ marginBottom: 4 }}><Globe2 size={13} /> 11-Market Geographic Alignment</span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      Administrative Terminology Across All 11 Supported Countries
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                      Client Edition sweeps local Mandals, Neighborhoods &amp; Suburbs. Master Edition delivers entire Districts, Counties &amp; States.
                    </p>
                  </div>
                  <span className="lx-precision-pill is-service">
                    11 NATIONS · 100% SATELLITE RADAR
                  </span>
                </div>

                <div className="lx-terminology-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="lx-terminology-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 14px', borderRadius: '8px 0 0 0' }}>Country &amp; Flag</th>
                        <th style={{ padding: '10px 14px' }}>Top-Level (State / Province)</th>
                        <th style={{ padding: '10px 14px' }}>Regional (District / County)</th>
                        <th style={{ padding: '10px 14px' }}>Local Zone (Mandal / Town / Suburb)</th>
                        <th style={{ padding: '10px 14px', borderRadius: '0 8px 0 0' }}>Assigned Engines</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: 'rgba(236, 253, 245, 0.4)' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#047857' }}>🇮🇳 India (Home)</td>
                        <td style={{ padding: '11px 14px' }}>State / Union Territory (36)</td>
                        <td style={{ padding: '11px 14px' }}>District (760+)</td>
                        <td style={{ padding: '11px 14px' }}>Revenue Mandal / Taluka / 619k Villages</td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: '#059669' }}>11 Engines (Full Depth)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇺🇸 United States</td>
                        <td style={{ padding: '11px 14px' }}>State (50 States)</td>
                        <td style={{ padding: '11px 14px' }}>County / Parish</td>
                        <td style={{ padding: '11px 14px' }}>City / Township / ZIP Code / Neighborhood</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>12 Engines (High Yield)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇬🇧 United Kingdom</td>
                        <td style={{ padding: '11px 14px' }}>Country / Region (England, Scotland…)</td>
                        <td style={{ padding: '11px 14px' }}>County / Greater Borough</td>
                        <td style={{ padding: '11px 14px' }}>City / Town / Postcode District / Ward</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>12 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇨🇦 Canada</td>
                        <td style={{ padding: '11px 14px' }}>Province / Territory</td>
                        <td style={{ padding: '11px 14px' }}>Census Division / County / Regional Municipality</td>
                        <td style={{ padding: '11px 14px' }}>Municipality / City / FSA Postal Zone</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>12 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇦🇺 Australia</td>
                        <td style={{ padding: '11px 14px' }}>State / Territory (NSW, VIC, QLD…)</td>
                        <td style={{ padding: '11px 14px' }}>Local Government Area (LGA) / Shire</td>
                        <td style={{ padding: '11px 14px' }}>Suburb / Town / Postcode Area</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>12 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇩🇪 Germany</td>
                        <td style={{ padding: '11px 14px' }}>Bundesland (Federal State)</td>
                        <td style={{ padding: '11px 14px' }}>Landkreis / Kreisfreie Stadt</td>
                        <td style={{ padding: '11px 14px' }}>Gemeinde / Stadt / Stadtteil / Ortsteil</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>10 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇦🇪 UAE</td>
                        <td style={{ padding: '11px 14px' }}>Emirate (Dubai, Abu Dhabi…)</td>
                        <td style={{ padding: '11px 14px' }}>Municipality / Sector</td>
                        <td style={{ padding: '11px 14px' }}>Community / Commercial District</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>11 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇸🇬 Singapore</td>
                        <td style={{ padding: '11px 14px' }}>National Island</td>
                        <td style={{ padding: '11px 14px' }}>Region (Central, East, West…)</td>
                        <td style={{ padding: '11px 14px' }}>Planning Area / Subzone / Postal Sector</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>11 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇳🇿 New Zealand</td>
                        <td style={{ padding: '11px 14px' }}>Region (Auckland, Canterbury…)</td>
                        <td style={{ padding: '11px 14px' }}>Territorial Authority (City / District)</td>
                        <td style={{ padding: '11px 14px' }}>Ward / Suburb / Local Postcode Area</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>10 Engines</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇮🇪 Ireland</td>
                        <td style={{ padding: '11px 14px' }}>Province (Leinster, Munster…)</td>
                        <td style={{ padding: '11px 14px' }}>County / City Council</td>
                        <td style={{ padding: '11px 14px' }}>Municipal District / Electoral Area / Eircode</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>10 Engines</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '11px 14px', fontWeight: 750, color: '#0f172a' }}>🇿🇦 South Africa</td>
                        <td style={{ padding: '11px 14px' }}>Province (Gauteng, Western Cape…)</td>
                        <td style={{ padding: '11px 14px' }}>District / Metropolitan Municipality</td>
                        <td style={{ padding: '11px 14px' }}>Local Municipality / Ward / Suburb</td>
                        <td style={{ padding: '11px 14px', fontWeight: 650, color: '#475569' }}>10 Engines</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
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

      <ExtensionGatewayModal
        isOpen={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        onConnected={handleExtensionConnected}
        targetQuery={pendingLaunch?.query || ''}
        targetCountry={pendingLaunch?.countryCode || 'IN'}
        allowBypass={true}
      />
    </div>
  );
}
