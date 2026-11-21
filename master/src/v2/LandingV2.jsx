import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, Check, CheckCircle2, Cpu,
  Download, ExternalLink, FileSpreadsheet, Globe2, Heart, Layers, LogIn, Mail,
  MapPin, Phone, Plus, Radar, Radio, Rocket, Search, Server, ShieldCheck, Sparkles,
  Star, Terminal, Utensils, Wrench, Zap
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import { useExtension } from './context/ExtensionContext';
import { POPULAR_COUNTRIES } from './data/countries';
import {
  COUNTRY_COUNTY_SHOWCASE, GLOBAL_11_COUNTRY_TICKER, SEARCH_EXAMPLES,
  examplesFor, placeholderFor
} from './data/searchExamples';
import {
  detectDeviceHardware, DEVICE_REQUIREMENTS, ALL_BUILTIN_ENGINES
} from './utils/deviceRamEngine';
import { pingHealth } from './api';
import './landingExecutive.css';
import './landingCloud.css';

// Strictly locked to the 11 supported sovereign revenue markets — India pinned as Home
const LOCKED_11_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

const COUNTRY_DESCRIPTIONS = {
  IN: 'Home Market · 36 States, 760+ Districts, 6k+ Mandals & 619k+ Villages',
  US: 'All 50 States, 3,143 Counties & Parishes, ZIP Zones & Metros',
  GB: 'England, Scotland, Wales, 100+ Counties & Greater Boroughs',
  CA: 'All 10 Provinces, 3 Territories & 293 Census Divisions',
  AU: 'All 8 States & Territories, 537 Local Government Areas (LGAs)',
  AE: 'Dubai, Abu Dhabi, Sharjah & all 7 Emirates & Free Zones',
  SG: '5 Planning Regions, 55 Development Areas & 81 Postal Sectors',
  NZ: '16 Regions, 67 Territorial Authorities & City Districts',
  IE: 'All 4 Provinces, 31 Local Authorities & 82 Municipal Districts',
  ZA: '9 Provinces, 52 District & Metro Municipalities & 205 Councils',
  DE: 'All 16 Bundesländer, 401 Landkreise & Kreisfreie Städte'
};

const DEMO_SCENARIOS = [
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
      { name: 'CyberTowers Cloud Systems', area: 'HITEC City, Hyderabad · PIN 500081', rating: '4.9', reviews: 318, phone: '+91 98490 •••12', hasPin: true, tag: 'Cloud Architecture' },
      { name: 'Deccan Digital Solutions', area: 'Madhapur, Hyderabad · PIN 500081', rating: '4.8', reviews: 214, phone: '+91 94401 •••89', noWebsite: true, hasPin: true, tag: 'Enterprise Web' },
      { name: 'Jubilee Enterprise Tech', area: 'Banjara Hills, Hyderabad · PIN 500034', rating: '4.9', reviews: 276, phone: '+91 90005 •••44', hasPin: true, tag: 'SaaS Platform' }
    ]
  },
  {
    id: 'dallas-hvac',
    pill: '🇺🇸 HVAC & Climate · Dallas County TX',
    countryName: 'United States',
    query: 'HVAC Contractors in Harris County TX',
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
      { name: 'Lone Star Air & Heating Co.', area: 'Uptown Dallas, TX · ZIP 75201', rating: '4.9', reviews: 420, phone: '+1 (214) •••-0192', hasPin: true, tag: 'Commercial HVAC' },
      { name: 'Metroplex Climate Solutions', area: 'Harris County, TX · ZIP 77002', rating: '4.8', reviews: 265, phone: '+1 (469) •••-4418', noWebsite: true, hasPin: true, tag: 'Emergency Repair' },
      { name: 'Coastal Cooling Mechanical', area: 'Fort Worth, TX · ZIP 76102', rating: '4.7', reviews: 180, phone: '+1 (817) •••-8820', hasPin: true, tag: 'Chiller Plant' }
    ]
  },
  {
    id: 'london-dentists',
    pill: '🇬🇧 Cosmetic Clinics · Westminster London',
    countryName: 'United Kingdom',
    query: 'Dental Clinics in Westminster London',
    country: 'GB',
    areaLabel: 'Westminster & Greater London Boroughs · 412 verified leads',
    count: '412 leads',
    pins: [
      { top: '46%', left: '26%' },
      { top: '28%', left: '54%' },
      { top: '64%', left: '50%' },
      { top: '36%', left: '74%' },
      { top: '56%', left: '34%' }
    ],
    leads: [
      { name: 'Kensington Smile Practice', area: 'Westminster, London · W1B 3HH', rating: '4.9', reviews: 290, phone: '+44 20 •••• 3104', hasPin: true, tag: 'Orthodontics' },
      { name: 'Mayfair Cosmetic Dental Studio', area: 'Mayfair, London · W1K 7AA', rating: '4.8', reviews: 175, phone: '+44 20 •••• 7821', noWebsite: true, hasPin: true, tag: 'Aesthetic' },
      { name: 'Canary Wharf Wellness Hub', area: 'Docklands, London · E14 5HP', rating: '4.7', reviews: 230, phone: '+44 20 •••• 9940', hasPin: true, tag: 'Private Care' }
    ]
  },
  {
    id: 'sydney-solar',
    pill: '🇦🇺 Commercial Solar · City of Sydney LGA',
    countryName: 'Australia',
    query: 'Solar Installers in Parramatta LGA NSW',
    country: 'AU',
    areaLabel: 'Sydney Metro & Parramatta LGA, NSW · 319 verified leads',
    count: '319 leads',
    pins: [
      { top: '32%', left: '30%' },
      { top: '60%', left: '48%' },
      { top: '44%', left: '68%' },
      { top: '68%', left: '32%' },
      { top: '22%', left: '56%' }
    ],
    leads: [
      { name: 'Pacific Rim Solar & Battery', area: 'Parramatta, Sydney NSW · Postcode 2150', rating: '4.9', reviews: 215, phone: '+61 2 •••• 5590', hasPin: true, tag: 'Commercial Solar' },
      { name: 'Harbour Clean Energy Systems', area: 'North Sydney NSW · Postcode 2060', rating: '4.8', reviews: 142, phone: '+61 2 •••• 1120', noWebsite: true, hasPin: true, tag: 'Industrial Grid' },
      { name: 'Botany Bay Renewables', area: 'Mascot, Sydney NSW · Postcode 2020', rating: '4.9', reviews: 188, phone: '+61 2 •••• 7731', hasPin: true, tag: 'Micro-Grid' }
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
      { name: 'Bavaria Präzisionstechnik GmbH', area: 'Garching bei München · PLZ 85748', rating: '4.9', reviews: 164, phone: '+49 89 ••••• 210', hasPin: true, tag: 'CNC & Aerospace' },
      { name: 'München Automation & Robotik', area: 'Unterföhring · PLZ 85774', rating: '4.8', reviews: 98, phone: '+49 89 ••••• 740', noWebsite: true, hasPin: true, tag: 'Industrial Automation' },
      { name: 'Isar Werkzeugbau Fabrik', area: 'Haar bei München · PLZ 85540', rating: '4.9', reviews: 132, phone: '+49 89 ••••• 915', hasPin: true, tag: 'Tooling & Die' }
    ]
  },
  {
    id: 'toronto-supply',
    pill: '🇨🇦 Freight & Logistics · Peel Region ON',
    countryName: 'Canada',
    query: 'Logistics Companies in Peel Region ON',
    country: 'CA',
    areaLabel: 'Peel & York Census Divisions, ON · 460 verified leads',
    count: '460 leads',
    pins: [
      { top: '35%', left: '25%' },
      { top: '48%', left: '60%' },
      { top: '65%', left: '42%' },
      { top: '22%', left: '70%' },
      { top: '58%', left: '75%' }
    ],
    leads: [
      { name: 'Great Lakes Cold Storage & Freight', area: 'Mississauga, Peel ON · L5T 2B2', rating: '4.9', reviews: 310, phone: '+1 (905) •••-4488', hasPin: true, tag: '3PL & Cold Chain' },
      { name: 'Trans-Canada Cargo Dispatch', area: 'Brampton, Peel ON · L6T 4X2', rating: '4.8', reviews: 195, phone: '+1 (905) •••-9120', noWebsite: true, hasPin: true, tag: 'Fleet Haulage' },
      { name: 'Metro Toronto Distribution Core', area: 'Vaughan, York ON · L4K 3P8', rating: '4.7', reviews: 140, phone: '+1 (905) •••-3310', hasPin: true, tag: 'Cross-Docking' }
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

const BENTO_ADVANTAGES = [
  {
    icon: Radar,
    tone: 'tone-cyan',
    span: 'col-7',
    badge: 'PARALLEL SWARM ARCHITECTURE',
    title: '22-Engine Autonomous Intelligence Swarm',
    body: 'Sweeps across satellite geospatial nodes, verified commercial directories, B2B wholesale portals, open knowledge graphs, and corporate websites simultaneously. Eliminates the 120-listing search cap by decomposing entire territories into fine-grained micro-zones.'
  },
  {
    icon: Cpu,
    tone: 'tone-emerald',
    span: 'col-5',
    badge: 'NATIVE MEMORY ENGINE',
    title: 'Runs on Your Workstation RAM with Safety Headroom',
    body: 'Hardware tier detection automatically spins up 2, 4, or 8 parallel workers inside your browser memory with ≥ 4.5 GB guaranteed OS headroom. Zero cloud server waiting lines or shared datacenter throttle queues.'
  },
  {
    icon: Phone,
    tone: 'tone-emerald',
    span: 'col-5',
    badge: 'CARRIER REGEX VALIDATOR',
    title: 'Deep Telecom & WhatsApp Verification',
    body: 'Classifies every phone line as verified mobile, direct WhatsApp, or corporate landline before writing to Excel. Strips dead switchboards so your outbound team reaches real decision-makers immediately.'
  },
  {
    icon: Globe2,
    tone: 'tone-purple',
    span: 'col-7',
    badge: 'EQUAL SOVEREIGN COVERAGE',
    title: 'Equal Prominence Across All 11 Global Markets',
    body: 'Every single US county, UK borough, Canadian census division, Australian LGA, German Landkreis, and Indian mandal is treated with identical administrative granularity. No market is treated as second-class.'
  }
];

const FAQ_ITEMS = [
  {
    q: 'Why can’t I just copy businesses from manual map searches?',
    a: 'Manual search engines cap a single search at around 120 listings ("You’ve reached the end of the list") and systematically obscure hundreds of active shops located in inner streets, mandals, and neighboring suburbs. Furthermore, copying phone numbers one by one wastes 5–6 hours per district. Scraper.co.in automatically divides any Indian town, US county, UK borough, Australian LGA, or European city into micro-zones, sweeps them live with a 22-engine swarm, and exports clean Excel files in seconds.'
  },
  {
    q: 'Can I run the Command Center locally without installing a browser extension?',
    a: 'Yes! Simply click "Run on Local Server" in the hero search box or select "⚡ Skip Extension · Run on Local Server Engine" in the workspace. The scraping engine will run directly on your workstation’s local Node.js server and memory, completely bypassing extension requirements while maintaining ultra-blazing extraction speeds.'
  },
  {
    q: 'Do I get all 22 specialized lead discovery engines automatically?',
    a: 'Yes. Every search coordinates 22 specialized discovery cores including Global Geospatial Mapping Cores, High-Intent Local Registries, B2B Wholesale Networks, Hospitality & Event Registries, Corporate Web Scouts, and Smart Deduplication Matrices. Zero extra API keys or proxy subscriptions are ever required.'
  },
  {
    q: 'How does the Local RAM Engine protect my workstation from crashing?',
    a: 'Our device profiler inspects your available system memory and CPU core count. On a 16 GB RAM machine, it safely allocates 8 parallel extraction lanes while strictly maintaining ≥ 4.5 GB of reserved headroom for your operating system, background applications, and browser tabs. If memory pressure rises, lane concurrency throttles gracefully.'
  },
  {
    q: 'Which 11 global sovereign markets are supported?',
    a: 'India (Home Market — 36 States/UTs, 760+ Districts, 6k+ Mandals & 619,287 Villages), United States (50 States, 3,143 Counties), United Kingdom (4 Home Nations, 100+ Counties/Boroughs), Canada (10 Provinces, 293 Census Divisions), Australia (8 States, 537 LGAs), Germany (16 Bundesländer, 401 Landkreise), United Arab Emirates (7 Emirates), Singapore (5 Regions), New Zealand (16 Regions, 67 Territorial Authorities), Ireland (4 Provinces, 31 Local Authorities), and South Africa (9 Provinces, 52 District/Metro Municipalities).'
  },
  {
    q: 'How do I take my leads into Excel or my phone?',
    a: 'Every search saves automatically into permanent folders. Click one button to download clean multi-sheet Excel (.xlsx), CSV, or save phone numbers directly into your smartphone contacts (.vcf) with mobile vs. landline classification.'
  }
];

export default function LandingV2() {
  const navigate = useNavigate();
  const {
    ready: extReady, skippedExtension, skipAndRunLocal, ensureConnected, openTelemetry, openSetup
  } = useExtension();

  const [online, setOnline] = useState(true);
  const [activeDemoIdx, setActiveDemoIdx] = useState(0);
  const [selectedMarketCode, setSelectedMarketCode] = useState('IN');
  const [heroSearchInput, setHeroSearchInput] = useState('');
  const [engineCategoryFilter, setEngineCategoryFilter] = useState('All');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDemoIdx(prev => (prev + 1) % DEMO_SCENARIOS.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const activeDemo = DEMO_SCENARIOS[activeDemoIdx];
  const marketExamples = examplesFor(selectedMarketCode);
  const activeDefaultPrompt = marketExamples.prompts?.[0] || 'Software companies in HITEC City Hyderabad';

  const openWorkspace = (countryCode = 'IN', query = '', preset = '') => {
    const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
    const presetParam = preset ? `&preset=${encodeURIComponent(preset)}` : '';
    const targetUrl = `/command?country=${encodeURIComponent(countryCode)}${qParam}${presetParam}`;
    ensureConnected(() => navigate(targetUrl), { country: countryCode, query, preset });
  };

  const runLocalMode = (countryCode = 'IN', query = '') => {
    if (skipAndRunLocal) skipAndRunLocal();
    const effectiveQuery = query || activeDefaultPrompt;
    const qParam = effectiveQuery ? `&q=${encodeURIComponent(effectiveQuery)}` : '';
    navigate(`/command?country=${encodeURIComponent(countryCode)}${qParam}&mode=local`);
  };

  const lockedMarkets = useMemo(() => {
    return POPULAR_COUNTRIES
      .filter(c => LOCKED_11_CODES.includes(c.code))
      .sort((a, b) => LOCKED_11_CODES.indexOf(a.code) - LOCKED_11_CODES.indexOf(b.code));
  }, []);

  const activeCountryObj = lockedMarkets.find(c => c.code === selectedMarketCode) || lockedMarkets[0];

  return (
    <div className="lx-landing is-nexera">
      <a href="#main-content" className="lx-skip-link">Skip to main content</a>

      {/* Floating Obsidian Glass Navbar */}
      <header className="lx-nav">
        <div className="lx-wrap lx-nav-inner">
          <button
            type="button"
            className="lx-brand-btn"
            onClick={() => openWorkspace('IN')}
            aria-label="Open Workspace"
          >
            <BrandLogo size={34} theme="dark" />
          </button>

          <nav className="lx-nav-links" aria-label="Primary Navigation">
            <a href="#cockpit">Cockpit Radar</a>
            <a href="#bento">Architecture</a>
            <a href="#engines">22 Engines</a>
            <a href="#markets">Global Alignment</a>
            <a href="#hardware">Hardware RAM</a>
            <button type="button" onClick={() => navigate('/pricing')}>Pricing</button>
          </nav>

          <div className="lx-nav-actions">
            <span className={`lx-status-pill ${online ? '' : 'is-off'}`}>
              <span className="lx-status-dot" />
              {online ? 'Systems Operational' : 'Connecting'}
            </span>

            {skippedExtension ? (
              <span
                className="lx-nav-ext-pill is-connected"
                title="Running on Local Server Engine (Extension Skipped)"
                style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: '#22d3ee' }}
              >
                <Server size={13} />
                <span>Local Server Mode</span>
              </span>
            ) : (
              <button
                type="button"
                className={`lx-nav-ext-pill ${extReady ? 'is-connected' : ''}`}
                onClick={() => (extReady ? openTelemetry() : openSetup({ country: selectedMarketCode }))}
                title={extReady ? 'Browser Extension Active' : 'Extension Setup'}
              >
                <Cpu size={13} />
                <span>{extReady ? 'RAM Turbo Active' : 'Setup Extension'}</span>
              </button>
            )}

            <button type="button" className="lx-btn lx-btn-ghost" onClick={() => navigate('/login')}>
              <LogIn size={15} /> Sign In
            </button>

            <button
              type="button"
              className="lx-btn lx-btn-primary"
              onClick={() => openWorkspace(selectedMarketCode, heroSearchInput || activeDefaultPrompt)}
            >
              <Rocket size={15} /> Launch Command Center
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} style={{ position: 'relative', zIndex: 1 }}>
        {/* HERO SECTION — Inspired by Nexera.health */}
        <section className="lx-hero">
          <div className="lx-wrap" style={{ maxWidth: 1180 }}>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <span className="lx-eyebrow">
                  <Sparkles size={13} />
                  THE NEXT-ERA OF COMMERCIAL B2B INTEL · 0 API KEYS
                </span>
                {skippedExtension && (
                  <span
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.35)',
                      color: '#22d3ee', fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
                    }}
                  >
                    ⚡ Local Mode Ready
                  </span>
                )}
              </div>

              <h1 className="lx-h1">
                The Next-Era of Commercial B2B Lead Intelligence <span className="lx-h1-serif">starts here.</span>
              </h1>

              <p className="lx-lead-copy">
                A unified geospatial intelligence platform that indexes verified local businesses,
                active mobile numbers, and enterprise registries directly on your hardware with
                zero monthly API bills. Equal precision across 619,287 Indian villages and all 3,143 US counties.
              </p>

              {/* Interactive Hero Search Console */}
              <div className="lx-nex-searchbox">
                <div className="lx-nex-search-main">
                  {/* Country Flag Dropdown Trigger */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="lx-nex-country-select-btn"
                      onClick={() => setCountryPickerOpen(prev => !prev)}
                      title="Select Sovereign Revenue Market"
                    >
                      <Country3DFlag code={selectedMarketCode} size={20} isHome={selectedMarketCode === 'IN'} />
                      <span>{selectedMarketCode} · {activeCountryObj?.name || 'India'}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>▼</span>
                    </button>

                    {countryPickerOpen && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, marginTop: 8,
                          background: 'rgba(11, 17, 30, 0.96)', backdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 16,
                          padding: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))',
                          gap: 6, zIndex: 100, boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
                        }}
                      >
                        {lockedMarkets.map(country => (
                          <button
                            key={country.code}
                            type="button"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                              borderRadius: 10, background: country.code === selectedMarketCode ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                              border: country.code === selectedMarketCode ? '1px solid #10b981' : '1px solid transparent',
                              color: country.code === selectedMarketCode ? '#34d399' : '#cbd5e1',
                              fontSize: 12, fontWeight: 750, cursor: 'pointer', textAlign: 'left'
                            }}
                            onClick={() => {
                              setSelectedMarketCode(country.code);
                              setCountryPickerOpen(false);
                            }}
                          >
                            <Country3DFlag code={country.code} size={16} isHome={country.code === 'IN'} />
                            <span>{country.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search Input Box */}
                  <div className="lx-nex-input-wrap">
                    <Search size={17} color="#38bdf8" />
                    <input
                      type="text"
                      className="lx-nex-input"
                      value={heroSearchInput}
                      onChange={e => setHeroSearchInput(e.target.value)}
                      placeholder={placeholderFor(selectedMarketCode)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          openWorkspace(selectedMarketCode, heroSearchInput || activeDefaultPrompt);
                        }
                      }}
                    />
                  </div>

                  {/* Dual Action Launch CTAs */}
                  <div className="lx-nex-action-group">
                    <button
                      type="button"
                      className="lx-btn-local-engine"
                      onClick={() => runLocalMode(selectedMarketCode, heroSearchInput || activeDefaultPrompt)}
                      title="Run on Local Server Engine (Bypasses Extension)"
                    >
                      <Zap size={15} /> Run on Local Server
                    </button>

                    <button
                      type="button"
                      className="lx-btn lx-btn-primary"
                      style={{ height: 48, padding: '0 20px', borderRadius: 14 }}
                      onClick={() => openWorkspace(selectedMarketCode, heroSearchInput || activeDefaultPrompt)}
                      title="Launch Command Center"
                    >
                      <Rocket size={15} /> Launch Command Center
                    </button>
                  </div>
                </div>

                {/* Instant Search Chips */}
                <div className="lx-nex-chips-strip">
                  <span className="lx-nex-chips-label">Instant Presets:</span>
                  {(marketExamples.prompts || []).slice(0, 4).map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      className="lx-nex-chip"
                      onClick={() => {
                        setHeroSearchInput(prompt);
                        openWorkspace(selectedMarketCode, prompt);
                      }}
                    >
                      <Sparkles size={11} color="#34d399" />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Equal Prominence Global Units Stats Bar */}
              <div className="lx-nex-stats-grid">
                {EQUAL_PROMINENCE_METRICS.map(m => (
                  <div key={m.title} className="lx-nex-stat-card">
                    <div className={`lx-nex-stat-val ${m.isGreen ? 'is-green' : ''}`}>{m.val}</div>
                    <div className="lx-nex-stat-title">{m.title}</div>
                    <div className="lx-nex-stat-desc">{m.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* LIVE PRODUCT SIMULATION / 3D COCKPIT RADAR PREVIEW */}
            <div className="lx-nex-cockpit-wrap" id="cockpit">
              <div className="lx-nex-cockpit-bar">
                <div className="lx-nex-cockpit-title">
                  <Radio size={16} color="#38bdf8" />
                  <span>Command Radar Cockpit · Satellite HUD v2.4</span>
                </div>
                <div className="lx-nex-cockpit-badges">
                  <span className="lx-nex-hud-badge is-live">
                    <span className="lx-status-dot" /> 22 Engines Synchronized
                  </span>
                  <span className="lx-nex-hud-badge">
                    <Server size={12} color="#38bdf8" /> {hardware.ramGb}GB RAM · {hardware.parallelZones} Parallel Lanes
                  </span>
                  <span className="lx-nex-hud-badge">
                    <ShieldCheck size={12} color="#34d399" /> 100% Brand-Safe Cores
                  </span>
                </div>
              </div>

              {/* Scenario Switcher Tabs */}
              <div
                style={{
                  display: 'flex', gap: 8, padding: '10px 20px',
                  background: 'rgba(2, 6, 23, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  overflowX: 'auto'
                }}
              >
                {DEMO_SCENARIOS.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    style={{
                      padding: '6px 13px', borderRadius: 999, fontSize: 11.5, fontWeight: 750,
                      background: idx === activeDemoIdx ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                      border: idx === activeDemoIdx ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: idx === activeDemoIdx ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.16s ease'
                    }}
                    onClick={() => setActiveDemoIdx(idx)}
                  >
                    {sc.pill}
                  </button>
                ))}
              </div>

              <div className="lx-nex-cockpit-body">
                {/* Left Radar Sweep Stage */}
                <div className="lx-nex-radar-stage">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <b style={{ fontSize: 14, color: '#f1f5f9' }}>{activeDemo.areaLabel}</b>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>Query: &ldquo;{activeDemo.query}&rdquo;</div>
                    </div>
                    <span
                      style={{
                        padding: '3px 9px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: 11, fontWeight: 800
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
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>● Active Sweep:</span> Micro-zones streaming into memory
                    </div>
                    <button
                      type="button"
                      className="lx-btn lx-btn-primary"
                      style={{ height: 34, padding: '0 14px', fontSize: 12, borderRadius: 10 }}
                      onClick={() => openWorkspace(activeDemo.country, activeDemo.query)}
                    >
                      Launch in Command Center <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Right Streaming Leads Stage */}
                <div className="lx-nex-leads-stage">
                  <div style={{ fontSize: 11, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 2 }}>
                    Live Verified Business Telemetry (Top Matches)
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
                          <span style={{ color: '#fbbf24' }}>★ {ld.rating} ({ld.reviews})</span>
                          {ld.noWebsite && (
                            <span style={{ color: '#f43f5e', fontSize: 10.5, fontWeight: 750 }}>
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
            </div>
          </div>
        </section>

        {/* BENTO GRID: THE 4 NEXT-ERA PILLARS */}
        <section className="lx-section" id="bento">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Layers size={13} /> Enterprise Core Architecture</span>
              <h2>Engineered for extreme yield, zero API bills, and safety.</h2>
              <p>
                Every component is decoupled and optimized for native machine performance.
                Run locally or with the RAM extension — you retain complete control over your hardware.
              </p>
            </div>

            <div className="lx-nex-bento-grid">
              {BENTO_ADVANTAGES.map(b => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className={`lx-nex-bento-card ${b.span}`}>
                    <div className={`lx-nex-bento-icon ${b.tone}`}>
                      <Icon size={22} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.06em', color: '#38bdf8', textTransform: 'uppercase', marginBottom: 6 }}>
                      {b.badge}
                    </span>
                    <h3>{b.title}</h3>
                    <p>{b.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BRAND-SAFE 22-ENGINE INTERACTIVE SHOWCASE */}
        <section className="lx-section" id="engines">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Cpu size={13} /> 22 Specialized Extraction Engines</span>
              <h2>Synchronized Multi-Engine Sweep Fleet</h2>
              <p>
                All proprietary third-party names have been abstracted into enterprise generic architectures
                to prevent trademark liabilities while delivering full deep-web discovery depth across 11 sovereign nations.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[
                { id: 'All', label: 'All Engines (22)' },
                { id: 'Maps & Geospatial', label: 'Maps & Geospatial (4)' },
                { id: 'National Directories', label: 'National Commercial Directories (7)' },
                { id: 'B2B & Industrial', label: 'B2B & Wholesale (1)' },
                { id: 'Hospitality', label: 'Hospitality & Venues (4)' },
                { id: 'Web Discovery', label: 'Web Discovery & Crawling (3)' },
                { id: 'Social Discovery', label: 'Social & Knowledge (2)' },
                { id: 'Data Quality & Export', label: 'Deduplication & Quality (1)' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 750,
                    background: engineCategoryFilter === cat.id ? 'linear-gradient(135deg, #059669, #06b6d4)' : 'rgba(255, 255, 255, 0.05)',
                    border: engineCategoryFilter === cat.id ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.09)',
                    color: engineCategoryFilter === cat.id ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer', transition: 'all 0.16s ease'
                  }}
                  onClick={() => setEngineCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 22 Engines Grid */}
            <div className="lx-engines-6-grid">
              {ALL_BUILTIN_ENGINES
                .filter(eng => engineCategoryFilter === 'All' || eng.category.includes(engineCategoryFilter) || (engineCategoryFilter === 'Hospitality' && eng.category.includes('Hospitality')))
                .map((eng, idx) => (
                  <motion.div
                    key={eng.id}
                    className="lx-engine-cart-card"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={{ y: -3 }}
                  >
                    <div className="lx-engine-cart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span
                        style={{
                          width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                          background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399'
                        }}
                      >
                        <Zap size={14} />
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, fontWeight: 850, color: '#34d399', letterSpacing: '0.04em' }}>LIVE · {eng.number.toUpperCase()}</span>
                        <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 750 }}>{eng.coverage}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 850, textTransform: 'uppercase', color: '#10b981', marginBottom: 3 }}>
                      {eng.category}
                    </div>
                    <b>{eng.name}</b>
                    <small>{eng.shortDesc}</small>
                  </motion.div>
                ))}
            </div>
          </div>
        </section>

        {/* HARDWARE RAM TIER MATRIX & HEADROOM SAFETY */}
        <section className="lx-section" id="hardware">
          <div className="lx-wrap">
            <div className="lx-ram-banner">
              <div className="lx-ram-banner-head">
                <div>
                  <b style={{ fontSize: 16 }}>Hardware-Governed RAM Extraction Lanes</b>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    Parallel concurrency auto-calibrates to your physical hardware with strict OS headroom protection:
                  </div>
                </div>
                <span
                  style={{
                    padding: '6px 14px', borderRadius: 999,
                    background: 'rgba(6, 182, 212, 0.14)', border: '1px solid rgba(6, 182, 212, 0.35)',
                    color: '#22d3ee', fontSize: 12, fontWeight: 850
                  }}
                >
                  💻 Your Device: {hardware.ramGb} GB RAM · {hardware.cpuCores} Cores · {hardware.parallelZones}x Parallel Lanes · Reserved Headroom: {hardware.reservedHeadroomGb} GB
                </span>
              </div>

              <div className="lx-req-grid">
                {DEVICE_REQUIREMENTS.map(req => (
                  <div key={req.tier} className={`lx-req-card ${req.tier === hardware.tier ? 'is-matched' : ''}`}>
                    <span className="lx-req-badge">{req.badge}{req.tier === hardware.tier ? ' · DETECTED MATCH' : ''}</span>
                    <b>{req.ram} · {req.cpu}</b>
                    <small style={{ color: '#34d399', fontWeight: 850 }}>{req.parallelZones} Parallel Zones · {req.speed}</small>
                    <p>{req.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* EQUAL PROMINENCE 11-MARKET GEOGRAPHIC ALIGNMENT */}
        <section className="lx-section" id="markets">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Globe2 size={13} /> 11 Sovereign Nations · Equal Precision</span>
              <h2>Equal Administrative Depth Across Global Markets</h2>
              <p>
                From 619,287 Indian villages and mandals to 3,143 US counties, 100+ UK boroughs, and 401 German Landkreise —
                each country is equipped with native administrative boundaries.
              </p>
            </div>

            {/* 11 Country Flag Buttons */}
            <div className="lx-country-grid" style={{ marginBottom: 28 }}>
              {lockedMarkets.map((country, idx) => {
                const isHome = country.code === 'IN';
                const isSelected = selectedMarketCode === country.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    aria-pressed={isSelected}
                    className={`lx-country-btn ${isHome ? 'is-home' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedMarketCode(country.code)}
                  >
                    <Country3DFlag code={country.code} size={28} isHome={isHome} />
                    <div>
                      <b>{country.name} {country.phone ? `(${country.phone})` : ''}</b>
                      <small>{COUNTRY_DESCRIPTIONS[country.code] || `${country.name} local businesses`}</small>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 11-Market Terminology Reference Table */}
            <div className="lx-terminology-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850 }}>
                    Administrative Alignment Matrix Across All 11 Supported Nations
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Micro-zones cover mandals, suburbs, and neighborhoods. Full territories deliver entire counties, districts, and states.
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 12px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: 11, fontWeight: 800
                  }}
                >
                  650,000+ TOTAL UNITS INDEXED
                </span>
              </div>

              <div className="lx-terminology-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="lx-terminology-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Sovereign Nation</th>
                      <th style={{ padding: '10px 14px' }}>Top-Level Division (State / Province)</th>
                      <th style={{ padding: '10px 14px' }}>Regional Unit (District / County / LGA)</th>
                      <th style={{ padding: '10px 14px' }}>Local Micro-Zone (Mandal / Village / Ward)</th>
                      <th style={{ padding: '10px 14px' }}>Dedicated Engines</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#34d399' }}>🇮🇳 India (Home)</td>
                      <td style={{ padding: '11px 14px' }}>State / Union Territory (36)</td>
                      <td style={{ padding: '11px 14px' }}>District (760+)</td>
                      <td style={{ padding: '11px 14px' }}>Revenue Mandal / Taluka / 619k+ Villages</td>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#34d399' }}>11 Engines (Full Depth)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇺🇸 United States</td>
                      <td style={{ padding: '11px 14px' }}>State (50 States)</td>
                      <td style={{ padding: '11px 14px' }}>County / Parish (3,143)</td>
                      <td style={{ padding: '11px 14px' }}>City / Township / ZIP Code / Neighborhood</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>12 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇬🇧 United Kingdom</td>
                      <td style={{ padding: '11px 14px' }}>Country / Region (England, Scotland…)</td>
                      <td style={{ padding: '11px 14px' }}>County / Greater Borough (100+)</td>
                      <td style={{ padding: '11px 14px' }}>City / Town / Postcode District / Ward</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>12 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇨🇦 Canada</td>
                      <td style={{ padding: '11px 14px' }}>Province / Territory (13)</td>
                      <td style={{ padding: '11px 14px' }}>Census Division / Regional County (293)</td>
                      <td style={{ padding: '11px 14px' }}>Municipality / City / FSA Postal Zone</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>12 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇦🇺 Australia</td>
                      <td style={{ padding: '11px 14px' }}>State / Territory (8)</td>
                      <td style={{ padding: '11px 14px' }}>Local Government Area (LGA) / Shire (537)</td>
                      <td style={{ padding: '11px 14px' }}>Suburb / Town / Postcode Area</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>12 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇩🇪 Germany</td>
                      <td style={{ padding: '11px 14px' }}>Bundesland (Federal State — 16)</td>
                      <td style={{ padding: '11px 14px' }}>Landkreis / Kreisfreie Stadt (401)</td>
                      <td style={{ padding: '11px 14px' }}>Gemeinde / Stadt / Stadtteil / Ortsteil</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>10 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇦🇪 UAE</td>
                      <td style={{ padding: '11px 14px' }}>Emirate (7 Emirates)</td>
                      <td style={{ padding: '11px 14px' }}>Municipality / Commercial Sector</td>
                      <td style={{ padding: '11px 14px' }}>Community / Commercial District / Free Zone</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>11 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇸🇬 Singapore</td>
                      <td style={{ padding: '11px 14px' }}>National Island</td>
                      <td style={{ padding: '11px 14px' }}>Planning Region (5 Regions)</td>
                      <td style={{ padding: '11px 14px' }}>Planning Area / Subzone / Postal Sector (55)</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>11 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇳🇿 New Zealand</td>
                      <td style={{ padding: '11px 14px' }}>Region (16 Regions)</td>
                      <td style={{ padding: '11px 14px' }}>Territorial Authority (City / District — 67)</td>
                      <td style={{ padding: '11px 14px' }}>Ward / Suburb / Local Postcode Area</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>10 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇮🇪 Ireland</td>
                      <td style={{ padding: '11px 14px' }}>Province (4 Provinces)</td>
                      <td style={{ padding: '11px 14px' }}>County / City Council (31 Authorities)</td>
                      <td style={{ padding: '11px 14px' }}>Municipal District (82) / Electoral Area / Eircode</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>10 Engines</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '11px 14px', fontWeight: 800, color: '#f1f5f9' }}>🇿🇦 South Africa</td>
                      <td style={{ padding: '11px 14px' }}>Province (9 Provinces)</td>
                      <td style={{ padding: '11px 14px' }}>District / Metropolitan Municipality (52)</td>
                      <td style={{ padding: '11px 14px' }}>Local Municipality / Ward / Suburb (205)</td>
                      <td style={{ padding: '11px 14px', color: '#94a3b8' }}>10 Engines</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* DUAL-CARTRIDGE ARCHITECTURE: CLIENT WORKSPACE VS MASTER TERRITORY INTELLIGENCE */}
        <section className="lx-section">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><Layers size={13} /> Dual Operating Modes</span>
              <h2>Client Workspace &amp; Master Territory Intelligence</h2>
              <p>
                Self-serve immediate micro-zone searches in your browser, or let our Master Intelligence Desk
                deliver entire nationwide datasets.
              </p>
            </div>

            <div className="lx-dual-cartridge-grid">
              {/* Cartridge 01: Client Workspace Edition */}
              <article className="lx-cartridge-panel is-client">
                <span className="lx-cartridge-tag is-client">CARTRIDGE 01 · CLIENT WORKSPACE EDITION</span>
                <h3>Instant City, Town, Mandal &amp; County Leads</h3>
                <p>
                  Built for startups, sales reps, and growth agencies. Select any of the 11 global markets,
                  type a query, and stream verified phone numbers straight into Excel. Works locally on your
                  machine with zero setup.
                </p>
                <ul className="lx-story-bullets">
                  <li><CheckCircle2 size={15} color="#34d399" /> All 22 Discovery Engines running in parallel</li>
                  <li><CheckCircle2 size={15} color="#34d399" /> 100% HD Satellite Live Zone Radar across 11 nations</li>
                  <li><CheckCircle2 size={15} color="#34d399" /> Clean, deduplicated Excel (.xlsx), CSV &amp; Phone (.vcf) exports</li>
                </ul>
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="lx-btn lx-btn-primary"
                    onClick={() => openWorkspace('IN', 'Software companies in HITEC City Hyderabad')}
                  >
                    <Rocket size={15} /> Launch Client Workspace
                  </button>
                  <button
                    type="button"
                    className="lx-btn-local-engine"
                    onClick={() => runLocalMode('IN', 'Software companies in HITEC City Hyderabad')}
                  >
                    <Zap size={14} /> Run on Local Server
                  </button>
                </div>
              </article>

              {/* Cartridge 02: Master Territory Intelligence Edition */}
              <article className="lx-cartridge-panel is-master">
                <span className="lx-cartridge-tag is-master">CARTRIDGE 02 · MASTER TERRITORY INTELLIGENCE</span>
                <h3>Entire Districts, Full States &amp; Complete Web Rollouts</h3>
                <p>
                  Need every business across an entire District, County, State, or Nationwide territory?
                  Our Master Edition gathers verified datasets from every public website, trade catalog, and
                  corporate registry across the internet and delivers clean master workbooks.
                </p>
                <div className="lx-contact-slots" style={{ marginTop: 'auto' }}>
                  <div className="lx-contact-slot" style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Phone size={18} color="#34d399" />
                    <div>
                      <small style={{ color: '#64748b' }}>DIRECT MOBILE &amp; WHATSAPP DESK</small>
                      <b style={{ color: '#f1f5f9' }}>Priority Access Desk</b>
                    </div>
                  </div>
                  <div className="lx-contact-slot" style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Mail size={18} color="#38bdf8" />
                    <div>
                      <small style={{ color: '#64748b' }}>ENTERPRISE DISPATCH EMAIL</small>
                      <b style={{ color: '#f1f5f9' }}>support@scraper.co.in</b>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="lx-section lx-section-alt" id="faq">
          <div className="lx-wrap">
            <div className="lx-sec-head">
              <span className="lx-kicker"><ShieldCheck size={13} /> Transparent Answers</span>
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about keyless operation, local server mode, and 11-country depth.</p>
            </div>

            <div className="lx-faq-list">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={item.q} className="lx-faq-item" open={idx === 0}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={16} color="#34d399" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER */}
        <section className="lx-section">
          <div className="lx-wrap">
            <div
              className="lx-cta-card"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(7, 11, 20, 0.95))',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 30px 70px -20px rgba(0, 0, 0, 0.8), 0 0 50px rgba(16, 185, 129, 0.15)'
              }}
            >
              <div>
                <h2 style={{ color: '#ffffff' }}>Ready to build your next high-intent lead list?</h2>
                <p style={{ color: '#94a3b8' }}>
                  Jump straight into the Command Center or run directly on your workstation server.
                  Zero credit card required to explore live leads.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="lx-btn-local-engine"
                  style={{ height: 50, padding: '0 22px' }}
                  onClick={() => runLocalMode('IN')}
                >
                  <Zap size={16} /> Run on Local Server
                </button>
                <button
                  type="button"
                  className="lx-btn lx-btn-primary lx-btn-lg"
                  onClick={() => openWorkspace('IN')}
                >
                  <Rocket size={17} /> Launch Command Center
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* EXECUTIVE DARK FOOTER WITH LEGAL TRADEMARK DISCLAIMER */}
      <footer className="lx-footer">
        <div className="lx-wrap">
          <div className="lx-footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <BrandLogo size={28} theme="dark" />
              <span>© {new Date().getFullYear()} Scraper.co.in · Engineered in India · 11 Sovereign Revenue Markets</span>
            </span>
            <div style={{ display: 'flex', gap: 20 }}>
              <button type="button" onClick={() => navigate('/pricing')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 650, cursor: 'pointer' }}>Pricing</button>
              <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 650, cursor: 'pointer' }}>Sign In</button>
              <button type="button" onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 650, cursor: 'pointer' }}>Terms</button>
              <button type="button" onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 650, cursor: 'pointer' }}>Privacy</button>
            </div>
          </div>

          {/* Legal Brand Protection / Trademark Compliance Disclaimer */}
          <div className="lx-nex-legal-disclaimer">
            <strong>Legal &amp; Trademark Compliance Notice:</strong> Scraper.co.in is an independent software application and search index designed for discovering publicly accessible commercial business records, open mapping points of interest (POI), and public corporate contact registries. All brand names, trade names, service marks, and logos referenced across public documentation are the intellectual property of their respective owners and are used purely for nominative and identification purposes. Scraper.co.in is not affiliated with, endorsed by, or sponsored by any third-party directory, search engine, or mapping provider. All data extraction operations are executed solely against publicly available data in compliance with automated rate-limiting protocols and local fair-use standards.
          </div>
        </div>
      </footer>
    </div>
  );
}
