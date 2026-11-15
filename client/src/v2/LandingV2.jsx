import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Check,
  ChevronDown, ChevronRight, CircleHelp, Command, Database, Download,
  Globe2, Layers3, MapPinned, Menu, MousePointer2, Search, ShieldCheck,
  Sparkles, Zap, X, Mail, MapPin, Phone, Building2, Workflow, Radar,
  Laptop2, SlidersHorizontal, Play, Fingerprint, ScanSearch, Radio,
  FolderOpen, Cpu, Calculator, Key, Rocket, Megaphone, CheckCircle2,
  Activity, ShieldAlert, Crosshair, Smartphone, FileSpreadsheet,
  Layers, MessageSquare
} from "lucide-react";

import BrandLogo from "./components/BrandLogo";
import RadarCanvas from "./components/landing/RadarCanvas";
import LiveSweepTheater from "./components/landing/LiveSweepTheater";
import FolderExplorer from "./components/landing/FolderExplorer";
import EnginesMatrix from "./components/landing/EnginesMatrix";
import DeepVenueFeatures from "./components/landing/DeepVenueFeatures";
import ArchitectureStorytelling from "./components/landing/ArchitectureStorytelling";
import ClaimModal from "./components/landing/ClaimModal";

import "./sc-landing.css";

// =========================================================================
// DEPLOYMENT SHORTCUT CONFIGURATION
// To hide the "Skip to Dashboard" button when deploying to production,
// simply change this value to `false`.
// =========================================================================
export const ENABLE_DEV_SKIP_BUTTON = true;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11 } } };

const DISTRICT_TICKER = [
  "Guntur · Brodipet & Arundelpet",
  "NTR Vijayawada · Benz Circle",
  "Hyderabad · Madhapur & Hitech City",
  "Warangal · Hanamkonda Hub",
  "Visakhapatnam · Beach Road",
  "Bengaluru · Koramangala & HSR",
  "Surat · Textile & Diamond Market",
  "Jaipur · Solar & Commercial Hub"
];

// The country band is the landing page's proof that the app is not India-only.
// Each market shows its real administrative chain, not a generic "district".
const WORLD_MARKETS = [
  { code: "IN", flag: "🇮🇳", name: "India", home: true, path: "State → District → Mandal / Taluka / Tehsil", example: "Guntur, Vijayawada, Tenali" },
  { code: "US", flag: "🇺🇸", name: "United States", path: "State → County → City", example: "Austin, Los Angeles, New York" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", path: "Nation → County → Town", example: "London, Manchester, Leeds" },
  { code: "CA", flag: "🇨🇦", name: "Canada", path: "Province → Census division → City", example: "Toronto, Vancouver, Calgary" },
  { code: "AU", flag: "🇦🇺", name: "Australia", path: "State → Local government area → Suburb", example: "Sydney, Melbourne, Brisbane" },
  { code: "AE", flag: "🇦🇪", name: "United Arab Emirates", path: "Emirate → Municipality → Area", example: "Dubai, Abu Dhabi, Sharjah" }
];

const faqs = [
  [
    "Does this work outside India?",
    "Yes. All 245 countries are selectable. India is the home market and runs 9 engines (including JustDial, WeddingBazaar, WeddingWire and Mandap). Every other country runs the keyless global stack: OpenStreetMap, Google Maps, Google Local Finder, Web Discovery and official business websites. Phone numbers are parsed in the local format (+1, +44, +49, +91) and the admin labels follow the country — Province in Canada, Prefecture in Japan, Emirate in the UAE, State → District → Mandal / Taluka / Tehsil in India."
  ],
  [
    "Why is Scraper.co.in better than buying old Excel sheets or JustDial?",
    "Data brokers sell outdated lists where 65% of numbers are dead landlines, switchboards, or disconnected lines. JustDial sells the exact same inquiry to 10 of your competitors at once. With Scraper.co.in, every search is performed live on-demand, exclusive to you, and delivers verified personal WhatsApp mobile numbers with zero gatekeepers."
  ],
  [
    "How does the Territory Folders system work?",
    "Every search or district sweep is automatically saved into a structured Territory Folder (e.g. 'Kalyana Mandapams — Guntur'). Folders organize leads by city, category, and local areas, calculate pipeline value, classify phone numbers, and remain accessible and exportable forever with zero subscription fees."
  ],
  [
    "What is the distinction between the Client App and the Master Platform?",
    "This landing page is dedicated to the Client App, which focuses on your chosen city and all surrounding mandals (e.g. Brodipet Guntur, Benz Circle Vijayawada, Tenali, Koramangala Bengaluru). The Master Platform is an enterprise suite that unlocks concurrent sweeps across all 660+ districts in parallel. If you want the Master Platform, please contact our team."
  ],
  [
    "How does phone number classification work for India?",
    "Every contact number is strictly classified into either: (1) Verified 10-digit Indian Mobile lines (+91 prefix with 1-click WhatsApp direct chat), or (2) Normal STD Landlines (preserved leading 0, e.g., 0863 for Guntur, marked as Call-Only with WhatsApp buttons disabled)."
  ],
  [
    "Are normal office landlines also available?",
    "Yes! Our system classifies phone numbers intelligently. While the proprietor's direct 10-digit mobile is prioritized for 1-click personal WhatsApp dialogue, normal office landlines (with STD codes like 0863-, 040-, 080-) are also preserved and marked as Call-Only lines so your telecalling team can dial them whenever needed."
  ],
  [
    "Can I export leads to CSV or Excel?",
    "Yes. You can export any folder to clean CSV or Excel at any time with one click. Exports are completely free and work with full formatting."
  ],
  [
    "Can I test the platform before paying anything?",
    "Yes. You can launch the dashboard immediately and access verified decision-maker contacts with zero credit card required. No lock, no hidden fees."
  ]
];

function SectionHeading({ eyebrow, title, copy, center = true }) {
  return (
    <motion.div className={`section-heading ${center ? "center" : ""}`} variants={fadeUp}>
      <span className="eyebrow">
        <span className="eyebrow-dot" /> {eyebrow}
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </motion.div>
  );
}

export default function LandingV2() {
  const navigate = useNavigate();

  // Enforce document scrolling when mounting
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.height = 'auto';
    return () => {
      document.documentElement.style.overflowY = '';
      document.documentElement.style.overflowX = '';
      document.body.style.overflowY = '';
      document.body.style.overflowX = '';
      document.body.style.height = '';
    };
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [activePersona, setActivePersona] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % DISTRICT_TICKER.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const goWorkspace = () => navigate('/command');

  const nav = [
    ["Countries", "#countries"],
    ["2D Radar", "#radar"],
    ["Live Discovery", "#theater"],
    ["Territory Folders", "#folders"],
    ["Client vs Master", "#architecture"],
    ["Who It's For", "#audiences"],
    ["9 Networks", "#harvesters"],
    ["Coverage", "#coverage"],
    ["FAQ", "#faq"]
  ];

  return (
    <div className="app" id="home" style={{ overflowY: 'visible', overflowX: 'clip', minHeight: '100vh', background: '#080b12' }}>
      
      {/* Top Notification Announcement */}
      <div className="announcement">
        <span className="announce-spark"><Sparkles size={13} /></span>
        <b>Scraper.co.in Live:</b> 245 countries · India HOME · personal mobiles first · no API keys · no accounts
        <button
          type="button"
          onClick={goWorkspace}
          style={{ background: 'transparent', border: 'none', color: '#66e6bd', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          Open Dashboard <ArrowRight size={13} />
        </button>
      </div>

      {/* Main Navbar */}
      <header className="navbar">
        <div className="nav-inner">
          <BrandLogo
            size={34}
            theme="dark"
            onClick={goWorkspace}
            style={{ cursor: 'pointer' }}
          />

          <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
            {nav.map(([n, h]) => (
              <a key={n} href={h} onClick={() => setMenuOpen(false)}>
                {n}
              </a>
            ))}
          </nav>

          <div className="nav-actions">
            {/* DEV SHORTCUT: Skip straight to dashboard */}
            {ENABLE_DEV_SKIP_BUTTON && (
              <button
                type="button"
                className="button button-secondary"
                onClick={goWorkspace}
                title="Skip landing page and jump straight into dashboard (Dev Shortcut)"
                style={{
                  background: 'rgba(102, 230, 189, 0.12)',
                  borderColor: 'rgba(102, 230, 189, 0.4)',
                  color: '#66e6bd',
                  padding: '9px 15px',
                  fontSize: '12px'
                }}
              >
                <Zap size={14} />
                <span>Skip to Dashboard →</span>
              </button>
            )}

            <button
              type="button"
              className="button button-primary nav-cta"
              onClick={goWorkspace}
            >
              Launch Dashboard <ArrowUpRight size={15} />
            </button>
          </div>

          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        {/* HERO SECTION WITH ANIMATED BACKGROUND & BENTO GRID */}
        <section className="hero">
          {/* Animated Cyber Grid Mesh & Horizon Scan Line */}
          <div className="hero-animated-bg">
            <div className="cyber-grid-mesh" />
            <div className="ambient-glow-orb orb-primary" />
            <div className="ambient-glow-orb orb-secondary" />
            <div className="ambient-glow-orb orb-accent" />
            <div className="radar-scan-line" />
          </div>

          <div className="hero-content">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div className="hero-pill" variants={fadeUp}>
                <span className="pill-pulse" /> 🇮🇳 INDIA FIRST · 245 COUNTRIES · NO API KEYS · NO ACCOUNTS
              </motion.div>

              <motion.h1 variants={fadeUp}>
                Stop Calling Receptionists.<br />
                <span className="gradient-text">WhatsApp The Real Business Owner — In 245 Countries.</span>
              </motion.h1>

              <motion.p className="hero-copy" variants={fadeUp}>
                Scraper.co.in searches the open web for verified business owner leads — whether you are a <b>Startup</b>, an established <b>Business</b>, or launching <b>New Products</b>. Search any city, county, province, prefecture or mandal. India stays home with State → District → Mandal / Taluka / Tehsil; Canada uses Province → Census division → City; the UK uses Nation → County → Town. Every number is parsed in the country's own format, and blocked directories are shown as blocked — never faked.
              </motion.p>

              {/* Action Buttons */}
              <motion.div className="hero-actions" variants={fadeUp} style={{ marginBottom: "16px" }}>
                <button
                  className="button button-primary"
                  onClick={goWorkspace}
                >
                  Launch Dashboard Now <ArrowUpRight size={16} />
                </button>

                {ENABLE_DEV_SKIP_BUTTON && (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{
                      background: 'rgba(102, 230, 189, 0.12)',
                      borderColor: 'rgba(102, 230, 189, 0.4)',
                      color: '#66e6bd'
                    }}
                    onClick={goWorkspace}
                    title="Direct shortcut for testing during development"
                  >
                    <Zap size={15} />
                    <span>⚡ Skip to Dashboard</span>
                  </button>
                )}

                <a href="#radar" className="text-link">
                  <span className="play-icon"><FolderOpen size={13} /></span>
                  Explore 2D Radar
                </a>
              </motion.div>

              {/* GOD-LEVEL ANIMATED BENTO GRID */}
              <motion.div variants={fadeUp} className="bento-grid-wrapper">
                
                {/* Bento Card 1: Receptionist & Landline Classification */}
                <div className="bento-tile bento-tile-col-8">
                  <div>
                    <span className="bento-tag bento-tag-mint">
                      <ShieldAlert size={12} /> AUTOMATIC RECEPTION FILTER
                    </span>
                    <h3 className="bento-headline">Front-Desk &amp; STD Landline Classifier</h3>
                    <p className="bento-desc">
                      Automatically scans STD prefixes (0863-, 040-, 080-, 022-). Normal office landlines remain fully available for your telecalling team, while the direct 10-digit mobile carried in the proprietor’s pocket is isolated for 1-click personal WhatsApp dialogue.
                    </p>

                    <div className="bento-simulator">
                      <div className="sim-row strike">
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "2px" }}>STD OFFICE LANDLINE:</span>
                          <span className="sim-num-landline">0863-2234120</span>
                        </div>
                        <span className="sim-badge-blue">AVAILABLE: CALL-ONLY</span>
                      </div>
                      <div className="sim-row">
                        <div>
                          <span style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "2px" }}>DIRECT POCKET MOBILE:</span>
                          <span className="sim-num-good">
                            <Smartphone size={14} className="text-mint" /> +91 98481 24789
                          </span>
                        </div>
                        <span className="sim-badge-green">VERIFIED PROPRIETOR</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(165,184,204,0.1)", fontSize: "11px", color: "#94A3B8" }}>
                    <span><b>Proprietor:</b> K. Venkat Rao (Sri Krishna Digital Studios)</span>
                    <span style={{ color: "#66E6BD", fontWeight: 700 }}>100% Direct WhatsApp &amp; Landlines Available</span>
                  </div>
                </div>

                {/* Bento Card 2: 2D Radar Target Lock Mini Widget */}
                <div className="bento-tile bento-tile-col-4">
                  <div>
                    <span className="bento-tag bento-tag-blue">
                      <Crosshair size={12} /> 2D TARGET LOCK
                    </span>
                    <h3 className="bento-headline">Live Radar Pulse</h3>
                    <p className="bento-desc">
                      Locks district GPS coordinates and maps 25 km territory boundaries in real-time.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(8, 14, 22, 0.85)", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.12)" }}>
                    <div className="mini-radar-disc">
                      <div className="mini-radar-sweep" />
                      <Crosshair size={18} className="text-mint" style={{ position: "relative", zIndex: 2 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: "#64748B", display: "block" }}>CURRENT LOCK</span>
                      <b style={{ fontSize: "13px", color: "#F8FAFC", display: "block" }}>16.3067° N, 80.4365° E</b>
                      <small style={{ color: "#66E6BD", fontWeight: 700 }}>Guntur · Brodipet</small>
                    </div>
                  </div>
                </div>

                {/* Bento Card 3: Pan-India 660+ Districts Live Ticker */}
                <div className="bento-tile bento-tile-col-4">
                  <div>
                    <span className="bento-tag bento-tag-purple">
                      <Globe2 size={12} /> 660+ DISTRICTS ACTIVE
                    </span>
                    <h3 className="bento-headline">Pan-India Sweeps</h3>
                    <p className="bento-desc">
                      Indexed across all 28 states, 5,900+ mandals, and 600,000+ commercial centers.
                    </p>
                  </div>

                  <div style={{ background: "rgba(8, 14, 22, 0.85)", border: "1px solid rgba(165,184,204,0.12)", borderRadius: "12px", padding: "12px 14px" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", display: "block" }}>LIVE SCAN TERRITORY:</span>
                    <div style={{ fontSize: "13px", fontWeight: 750, color: "#A68CFF", marginTop: "3px", minHeight: "20px" }}>
                      {DISTRICT_TICKER[tickerIndex]}
                    </div>
                  </div>
                </div>

                {/* Bento Card 4: 1-Click WhatsApp Direct Chat */}
                <div className="bento-tile bento-tile-col-4">
                  <div>
                    <span className="bento-tag bento-tag-mint">
                      <MessageSquare size={12} /> 1-CLICK OUTREACH
                    </span>
                    <h3 className="bento-headline">Personalized WhatsApp</h3>
                    <p className="bento-desc">
                      Click once to launch WhatsApp with respectful, pre-formatted greetings addressed to the owner.
                    </p>
                  </div>

                  <div style={{ background: "rgba(8, 14, 22, 0.85)", border: "1px solid rgba(165,184,204,0.12)", borderRadius: "12px", padding: "12px 14px", fontSize: "11px", color: "#CBD5E1" }}>
                    <span style={{ color: "#66E6BD", fontWeight: 750 }}>&quot;Hello Venkat Rao garu, saw your studio work in Vijayawada...&quot;</span>
                  </div>
                </div>

                {/* Bento Card 5: Pre-Formatted Excel Workbooks & Client Scope */}
                <div className="bento-tile bento-tile-col-4">
                  <div>
                    <span className="bento-tag bento-tag-blue">
                      <FileSpreadsheet size={12} /> EXECUTIVE EXCEL
                    </span>
                    <h3 className="bento-headline">Ready-to-Call Files</h3>
                    <p className="bento-desc">
                      Auto-sorted into Platinum (95%+), Gold, and Silver tiers with freeze panes and clickable links.
                    </p>
                  </div>

                  <div style={{ background: "rgba(8, 14, 22, 0.85)", border: "1px solid rgba(165,184,204,0.12)", borderRadius: "12px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>Platinum Workbooks</span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#66E6BD", background: "rgba(102,230,189,0.12)", padding: "3px 8px", borderRadius: "6px" }}>98% ACCURACY</span>
                  </div>
                </div>

              </motion.div>

              {/* ALL-INTERNET LEADS BANNER FOR STARTUPS, BUSINESSES & NEW PRODUCTS */}
              <motion.div
                variants={fadeUp}
                style={{
                  marginTop: "24px",
                  background: "linear-gradient(135deg, rgba(16, 24, 38, 0.95), rgba(10, 16, 26, 0.98))",
                  border: "1px solid rgba(102, 230, 189, 0.3)",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "18px",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", maxWidth: "820px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(102, 230, 189, 0.14)", color: "#66E6BD", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Globe2 size={22} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#66E6BD", letterSpacing: "0.08em" }}>
                        CLIENT APP · SEARCH YOUR CITY &amp; ALL MANDALS ONLY
                      </span>
                      <span style={{ fontSize: "10px", color: "#CBD5E1", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                        Searches All Over The Internet
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8", lineHeight: 1.55 }}>
                      <b style={{ color: "#FFFFFF" }}>Scraper.co.in searches the whole web for leads for you:</b> Whether you need leads for a brand-new <b style={{ color: "#66E6BD" }}>Startup</b>, expanding an existing <b style={{ color: "#38BDF8" }}>Business</b>, or pushing <b style={{ color: "#FACC15" }}>New Products</b> into retail shops — we sweep all mandals and commercial streets across your chosen city with zero gatekeepers.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={goWorkspace}
                  style={{ padding: "10px 18px", fontSize: "12.5px", whiteSpace: "nowrap" }}
                >
                  <span>Launch City Search</span>
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            </motion.div>
          </div>

          <div className="hero-bottom" style={{ marginTop: "40px" }}>
            <span>TARGET LOCK</span>
            <span className="hero-bottom-line" />
            <span>SWEEP DISTRICT</span>
            <span className="hero-bottom-line" />
            <span>ORGANIZED FOLDERS</span>
            <span className="hero-bottom-line" />
            <span>1-CLICK WHATSAPP</span>
          </div>
        </section>

        {/* COUNTRY BAND: 245 countries, each with its real hierarchy */}
        <section className="country-band" id="countries">
          <div className="country-band-inner">
            <div className="country-band-head">
              <span className="eyebrow"><Globe2 size={13} /> 245 COUNTRIES · ONE KEYLESS ENGINE</span>
              <h2>India first. Then wherever your customers are.</h2>
              <p>
                Every country runs the keyless global stack — OpenStreetMap, Google Maps,
                Google Local Finder, Web Discovery and official business websites. India
                adds its own directories. The scope words change with the country, so you
                type the place the way locals actually name it.
              </p>
            </div>

            <div className="country-band-grid">
              {WORLD_MARKETS.map(market => (
                <button
                  key={market.code}
                  type="button"
                  className={`country-market${market.home ? " is-home" : ""}`}
                  onClick={goWorkspace}
                >
                  <span className="country-market-flag" aria-hidden="true">{market.flag}</span>
                  <span className="country-market-body">
                    <b>
                      {market.name}
                      {market.home && <em className="country-market-home">HOME</em>}
                    </b>
                    <small className="country-market-path">{market.path}</small>
                    <small className="country-market-example">{market.example}</small>
                  </span>
                  <ArrowUpRight size={14} className="country-market-arrow" />
                </button>
              ))}
            </div>

            <div className="country-band-foot">
              <span><ShieldCheck size={13} /> No keys, no logins, no credit card</span>
              <span><Globe2 size={13} /> {WORLD_MARKETS.length} featured · 245 selectable</span>
              <span><Database size={13} /> Phones parsed as +1, +44, +49, +91…</span>
            </div>
          </div>
        </section>

        {/* SECTION 1: 2D GEOSPATIAL RADAR STATION */}
        <section className="section" id="radar">
          <div className="container">
            <SectionHeading
              eyebrow="2D GEOSPATIAL RADAR STATION"
              title={<>Live territory radar.<br /><span className="muted-gradient">Coordinate locking across AP &amp; Telangana.</span></>}
              copy="A 2D geospatial scanning mesh with real-time target acquisition across Indian business districts and local mandals."
            />
            <RadarCanvas />
          </div>
        </section>

        {/* SECTION 2: LIVE DISCOVERY THEATER */}
        <section className="section" id="theater" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="container">
            <SectionHeading
              eyebrow="AUTOMATED DISCOVERY PIPELINE"
              title={<>From GPS target lock<br /><span className="gradient-text">to CRM-ready WhatsApp leads.</span></>}
              copy="Watch 9 independent discovery vectors sweep a 25 km territory radius, strip dead landlines, isolate mobiles, and load records into your local vault."
            />
            <LiveSweepTheater onClaimClick={goWorkspace} />
          </div>
        </section>

        {/* SECTION 3: TERRITORY FOLDERS & VAULT */}
        <section className="section" id="folders">
          <div className="container">
            <SectionHeading
              eyebrow="TERRITORY FOLDERS &amp; VAULT"
              title={<>Organize by city, category &amp; locality.<br /><span className="gradient-text">One-click WhatsApp CRM &amp; CSV export.</span></>}
              copy="The single biggest feature requested by sales teams: saved territory folders with live pipeline tracking, locality filters, and unlimited free exports."
            />
            <FolderExplorer onClaimClick={goWorkspace} />
          </div>
        </section>

        {/* SECTION 4: CLIENT APP VS MASTER PLATFORM (ANIMATED STORYTELLING) */}
        <section className="section" id="architecture" style={{ background: "rgba(102,230,189,0.02)", borderTop: "1px solid rgba(165,184,204,0.12)", borderBottom: "1px solid rgba(165,184,204,0.12)" }}>
          <div className="container">
            <SectionHeading
              eyebrow="DUAL ARCHITECTURE EDITIONS"
              title={<>Client App vs. Master Platform.<br /><span className="gradient-text">Local precision vs. Pan-India state sweeps.</span></>}
              copy="Whether you need fast hyper-local discovery in a single town, or state-wide sweeps across all 660+ districts in parallel."
            />
            <ArchitectureStorytelling onLaunchClient={goWorkspace} />
          </div>
        </section>

        {/* SECTION 5: BUILT FOR HOW INDIA DOES BUSINESS (Startups, Agencies, Wholesalers) */}
        <section className="section" id="audiences" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="container">
            <SectionHeading
              eyebrow="BUILT FOR HOW INDIA DOES BUSINESS"
              title={<>Quality Leads Tailored For<br /><span className="gradient-text">Startups, Agencies &amp; Growing Businesses.</span></>}
              copy="Whether you are selling high-ticket B2B software, running marketing retainers for clients, or expanding your wholesale distribution network across India."
            />

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "32px 0 24px", flexWrap: "wrap" }}>
              {[
                { label: "For Startups & New Product Launches", icon: Rocket },
                { label: "For Marketing & Lead Gen Agencies", icon: Megaphone },
                { label: "For Manufacturers & Wholesalers", icon: Building2 }
              ].map((tab, idx) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActivePersona(idx)}
                  className={`button ${activePersona === idx ? "button-primary" : "button-secondary"}`}
                  style={{ borderRadius: "999px", padding: "10px 22px", fontSize: "13px" }}
                >
                  <tab.icon size={15} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div style={{ background: "#101722", border: "1px solid rgba(165,184,204,0.13)", borderRadius: "16px", padding: "36px" }}>
              {activePersona === 0 && (
                <div>
                  <span className="hero-pill" style={{ marginBottom: "12px" }}>
                    <span className="pill-pulse" /> FOR STARTUPS &amp; NEW PRODUCT LAUNCHES
                  </span>
                  <h3 style={{ fontSize: "26px", fontWeight: 700, color: "#FFFFFF", marginBottom: "12px" }}>
                    Close Your First 100 Paying Clients &amp; Put New Products In Stores Without Burning Ad Budget.
                  </h3>
                  <p style={{ color: "#98a4b4", lineHeight: 1.7, marginBottom: "24px" }}>
                    Stop burning scarce capital on ads that bring students and fake inquiries. Whether you are launching a B2B SaaS tool, agency service, or a new physical FMCG/hardware product, Scraper.co.in sweeps all mandals in your launch city so you can WhatsApp verified store owners, stockists, and proprietors directly.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>Reach The Real Decision-Maker</b>
                      <small style={{ color: "#8795a5" }}>Talk directly to the clinic director, shop owner, or managing partner who actually signs cheques.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>Launch New Products Faster</b>
                      <small style={{ color: "#8795a5" }}>Share your product catalog or wholesale rate sheet directly to 50 local retail owners in an afternoon.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>Validate With ₹0 Ad Spend</b>
                      <small style={{ color: "#8795a5" }}>Pitch 50 prospective business partners in an afternoon and sign pilot users immediately.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>98% WhatsApp Open Rate</b>
                      <small style={{ color: "#8795a5" }}>Nobody reads cold emails in India. WhatsApp messages get opened and replied to within 5 minutes.</small>
                    </div>
                  </div>
                </div>
              )}

              {activePersona === 1 && (
                <div>
                  <span className="hero-pill" style={{ marginBottom: "12px" }}>
                    <span className="pill-pulse" /> FOR MARKETING &amp; LEAD GEN AGENCIES
                  </span>
                  <h3 style={{ fontSize: "26px", fontWeight: 700, color: "#FFFFFF", marginBottom: "12px" }}>
                    Deliver High-Quality, Exclusive Leads That Keep Clients Paying Retainers.
                  </h3>
                  <p style={{ color: "#98a4b4", lineHeight: 1.7, marginBottom: "24px" }}>
                    Stop selling the same overused lists from JustDial. Give your clients (interior designers, dental clinics, real estate builders, jewelry showrooms) fresh, exclusive contacts across any city or district.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#7e9cff", display: "block", marginBottom: "6px" }}>10-Minute City Audits</b>
                      <small style={{ color: "#8795a5" }}>Map every competitor, rating count, and review volume across any district in minutes.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#7e9cff", display: "block", marginBottom: "6px" }}>High-Ticket Closes</b>
                      <small style={{ color: "#8795a5" }}>Show business owners exact market gaps to close ₹50,000 to ₹1,50,000 monthly marketing retainers.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#7e9cff", display: "block", marginBottom: "6px" }}>Zero Gatekeepers</b>
                      <small style={{ color: "#8795a5" }}>Your calling team talks directly to proprietors, not front-desk receptionists who refuse to connect.</small>
                    </div>
                  </div>
                </div>
              )}

              {activePersona === 2 && (
                <div>
                  <span className="hero-pill" style={{ marginBottom: "12px" }}>
                    <span className="pill-pulse" /> FOR MANUFACTURERS &amp; WHOLESALERS
                  </span>
                  <h3 style={{ fontSize: "26px", fontWeight: 700, color: "#FFFFFF", marginBottom: "12px" }}>
                    Expand Your Retail &amp; Dealer Network Across 660+ Districts.
                  </h3>
                  <p style={{ color: "#98a4b4", lineHeight: 1.7, marginBottom: "24px" }}>
                    Looking to find genuine hardware stockists, textile dealers, medical distributors, or retail shop owners in tier-1, tier-2, or rural Indian markets? Connect directly on WhatsApp with your product catalog.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>Pan-Indian Reach</b>
                      <small style={{ color: "#8795a5" }}>Find authorized dealers and retail shop owners from metro cities to rural mandals.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>1-Click Catalog Sharing</b>
                      <small style={{ color: "#8795a5" }}>Send your product photos and wholesale pricing brochure directly to their personal WhatsApp.</small>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(165,184,204,0.1)" }}>
                      <b style={{ color: "#66e6bd", display: "block", marginBottom: "6px" }}>Pre-Formatted Excel</b>
                      <small style={{ color: "#8795a5" }}>Hand off pre-sorted calling workbooks directly to telecallers with zero manual cleanup needed.</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: DEEP VENUE & BUSINESS SPECIFICATIONS */}
        <section className="section" id="deep-features" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="container">
            <DeepVenueFeatures />
          </div>
        </section>

        {/* SECTION 7: 9 BUSINESS DISCOVERY NETWORKS MATRIX */}
        <section className="section" id="harvesters">
          <div className="container">
            <EnginesMatrix />
          </div>
        </section>

        {/* SECTION 8: AP & TELANGANA COVERAGE */}
        <section className="coverage-section" id="coverage">
          <div className="container coverage-grid">
            <div className="coverage-copy">
              <SectionHeading
                center={false}
                eyebrow="BUILT FOR ANDHRA PRADESH, TELANGANA &amp; ALL INDIA"
                title={<>Deep district &amp; mandal hierarchy.<br /><span className="gradient-text">From metros to rural towns.</span></>}
                copy="Indian business discovery requires local geographic intelligence. Scraper.co.in supports state, district, mandal, and street-level sweeps without missing regional hubs."
              />
              <div className="coverage-points">
                <div>
                  <span><Check size={15} /></span>
                  <div>
                    <b>Andhra Pradesh Coverage</b>
                    <small>Guntur, Vijayawada, Visakhapatnam, Tirupati, Nellore, Kakinada, Rajahmundry, Palnadu, Tenali, Narasaraopet, Ongole.</small>
                  </div>
                </div>
                <div>
                  <span><Check size={15} /></span>
                  <div>
                    <b>Telangana Coverage</b>
                    <small>Hyderabad (Madhapur, Hitech City, Kukatpally, Gachibowli), Warangal, Hanamkonda, Karimnagar, Nizamabad, Khammam.</small>
                  </div>
                </div>
                <div>
                  <span><Check size={15} /></span>
                  <div>
                    <b>All-India Metro &amp; Tier-2/3 Support</b>
                    <small>Bengaluru, Chennai, Mumbai, Pune, Delhi NCR, and 660+ commercial districts.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="india-card">
              <div className="india-card-head">
                <span><Globe2 size={15} /> SCRAPER.CO.IN GEOSPATIAL MESH</span>
                <span className="map-live"><i /> LIVE RADAR ACTIVE</span>
              </div>
              <div className="india-graphic">
                <div className="india-halo halo-1" />
                <div className="india-halo halo-2" />
                <div className="india-outline">
                  <svg viewBox="0 0 300 330" role="img" aria-label="India map outline">
                    <path
                      d="M91 18 L127 29 151 24 174 42 193 48 204 72 226 83 218 105 239 119 227 145 213 158 208 184 190 204 184 227 165 244 156 274 141 309 126 292 113 266 99 244 89 222 72 204 69 182 51 167 59 144 44 126 55 102 49 79 67 61 68 39 Z"
                      fill="rgba(83,220,180,.07)"
                      stroke="#53dcb4"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="geo-point gp1"><i />ANDHRA PRADESH (GUNTUR / VJA)</div>
                <div className="geo-point gp2"><i />TELANGANA (HYDERABAD)</div>
                <div className="geo-point gp3"><i />DELHI NCR</div>
                <div className="geo-point gp4"><i />TAMIL NADU</div>
                <div className="geo-center">
                  <ScanSearch size={25} />
                  <span>SWEEP<br />INDIA</span>
                </div>
              </div>
              <div className="geo-legend">
                <span><i className="legend-dot dot-green" /> 100% Direct Public Directory Adapters</span>
                <span><i className="legend-dot dot-blue" /> Machine-Anchored Folders</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: FAQ */}
        <section className="faq-section" id="faq">
          <div className="container faq-layout">
            <div>
              <SectionHeading
                center={false}
                eyebrow="FREQUENTLY ASKED QUESTIONS"
                title={<>Clear answers.<br /><span className="muted-gradient">Built for business owners &amp; agencies.</span></>}
                copy="Everything you need to know about Scraper.co.in contact discovery, phone verification, and offline folder security."
              />
            </div>
            <div className="faq-list">
              {faqs.map(([q, a], i) => (
                <div className={`faq-item ${openFaq === i ? "faq-open" : ""}`} key={q}>
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                    <span>{q}</span>
                    <ChevronDown size={18} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        className="faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p>{a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 10: BOTTOM CTA */}
        <section className="cta-section" id="get-started">
          <div className="cta-glow" />
          <div className="container cta-content">
            <span className="eyebrow"><span className="eyebrow-dot" /> DIRECT DECISION-MAKER INTELLIGENCE</span>
            <h2>Stop searching the hard way.<br /><span className="gradient-text">Sweep entire districts into folders.</span></h2>
            <p>Personal mobiles first. 0 Dead Landlines. 1-Click WhatsApp Direct Chat.</p>
            <div className="cta-buttons">
              <button
                className="button button-primary"
                onClick={goWorkspace}
              >
                Launch Dashboard Now <ArrowUpRight size={16} />
              </button>
              {ENABLE_DEV_SKIP_BUTTON && (
                <button
                  type="button"
                  className="button button-secondary"
                  style={{
                    background: 'rgba(102, 230, 189, 0.12)',
                    borderColor: 'rgba(102, 230, 189, 0.4)',
                    color: '#66e6bd'
                  }}
                  onClick={goWorkspace}
                  title="Direct shortcut for testing during development"
                >
                  <Zap size={15} />
                  <span>⚡ Skip to Dashboard</span>
                </button>
              )}
            </div>
            <small>Deduplicated local database · Safe and keyless</small>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <BrandLogo size={32} theme="dark" onClick={goWorkspace} />
              <p style={{ marginTop: "14px" }}>
                Keyless commercial lead intelligence &amp; territory folder system.<br />
                Built for Andhra Pradesh, Telangana &amp; Indian local businesses.
              </p>
            </div>
            <div className="footer-links">
              <div>
                <b>EXPLORE</b>
                <a href="#radar">2D Geospatial Radar</a>
                <a href="#theater">Live Discovery Theater</a>
                <a href="#folders">Territory Folders</a>
                <a href="#harvesters">9 Discovery Networks</a>
              </div>
              <div>
                <b>SOLUTIONS</b>
                <a href="#deep-features">Kalyana Mandapams</a>
                <a href="#deep-features">Wedding Photographers</a>
                <a href="#deep-features">Banquet &amp; Function Halls</a>
                <a href="#architecture">Client vs Master</a>
              </div>
              <div>
                <b>RESPONSIBILITY</b>
                <a href="#faq">Phone Classification</a>
                <a href="#faq">Zero API Keys</a>
                <a href="#faq">Responsible Outreach</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Scraper.co.in. All rights reserved.</span>
            <span>Machine-anchored local intelligence platform.</span>
          </div>
          <p className="legal-note">
            Scraper.co.in operates as an automated public directory aggregator using open web protocols. All business names and trademarks are property of their respective owners. Users must adhere to applicable telecom regulations and responsible marketing practices.
          </p>
        </div>
      </footer>

      {/* Interactive Claim Modal */}
      <ClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />
    </div>
  );
}
