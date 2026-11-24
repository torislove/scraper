import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Cpu,
  Globe,
  TrendingUp,
  Sparkles,
  Heart,
  Mail,
  MessageCircle,
  Layers,
  Award,
  Check,
  Play,
  Pause,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import EngineBrandLogo from '../components/EngineBrandLogo';
import ThreeGoldenPinLogo from '../components/three/ThreeGoldenPinLogo';
import ThreePulsingHeart3D, { Heart3DInline } from '../components/three/ThreePulsingHeart3D';

// Top Venture & Tech Hubs Marquee (Tier-1 Global & National Capitals)
const VENTURE_HUBS = [
  '🚀 HYDERABAD (HITEC CITY)',
  '⚡ BENGALURU (KORAMANGALA & INDIRANAGAR)',
  '🌐 SAN FRANCISCO (SILICON VALLEY)',
  '🏙️ NEW YORK CITY (MANHATTAN)',
  '🏛️ LONDON (MAYFAIR & CITY)',
  '💎 DUBAI (DIFC & BUSINESS BAY)',
  '🦁 SINGAPORE (MARINA BAY)',
  '🦘 SYDNEY (BARANGAROO)',
  '⚙️ MUNICH (MAXVORSTADT)',
  '🗼 TOKYO (SHIBUYA TECH)',
  '💼 MUMBAI (BKC)',
  '🏢 GURUGRAM (CYBER CITY)'
];

// Tech Moat Highlights Marquee
const TECH_HIGHLIGHTS = [
  '⚡ 22 PARALLEL ENGINES',
  '🛡️ NATIVE BROWSER EXECUTION',
  '📱 100% VERIFIED PROPRIETOR MOBILES (/^[6-9]\\d{9}$/)',
  '🌍 11 SOVEREIGN NATIONS COVERED',
  '💻 ZERO SERVER WAITING QUEUES · CLIENT RAM VIRTUALIZATION',
  '🤖 24/7 UNATTENDED AUTONOMOUS SWEEPS',
  '📊 STRUCTURED EXCEL (.XLSX) & CRM EXPORTS',
  '🔐 100% PRIVATE ZERO-KNOWLEDGE SCRAPING'
];

// 4 Interactive Presentation Stages
const STAGES = [
  { id: 'founder', label: '👨‍💻 Founder & Breakthrough', icon: Award },
  { id: 'equity', label: '💎 20% Strategic Equity Allocation ★', icon: TrendingUp },
  { id: 'engines', label: '⚡ All 22 Parallel Engines', icon: Layers },
  { id: 'moat', label: '🛡️ Architectural Moat & Sign-Off', icon: Heart }
];

// Full 22 Engines & Automations Roster with Colourful Original Brand Logos
const ALL_22_ENGINES = [
  {
    id: 'gmaps',
    category: 'search',
    number: '01',
    name: 'Google Maps Places Pro',
    superpower: 'Proprietary micro-grid scraper capturing owner names, exact lat/long, review velocity, and 5-star ratings.',
    tag: 'Core Search',
    status: 'Live & Active'
  },
  {
    id: 'osm',
    category: 'search',
    number: '02',
    name: 'OpenStreetMap (OSM Overpass) Zoner',
    superpower: 'Autonomous polygon boundary scanner indexing 40,000+ micro-zones, mandals, and boroughs.',
    tag: 'Geospatial',
    status: 'Live & Active'
  },
  {
    id: 'dorking',
    category: 'search',
    number: '03',
    name: 'Google Advanced Multi-Parameter Search',
    superpower: 'Advanced multi-parameter queries isolating verified proprietor contact records, corporate filings, and official directories.',
    tag: 'Multi-Parameter Search',
    status: 'Live & Active'
  },
  {
    id: 'bing',
    category: 'search',
    number: '04',
    name: 'Bing Local & Commercial Extractor',
    superpower: 'High-intent commercial directory scraper cross-validating corporate entities and addresses.',
    tag: 'Web Directory',
    status: 'Live & Active'
  },
  {
    id: 'justdial',
    category: 'wholesale',
    number: '05',
    name: 'Justdial Real-Time Mobile Extractor',
    superpower: 'Instant extraction of verified Indian proprietor mobile numbers with category taxonomy matching.',
    tag: 'B2B Mobile',
    status: 'Live & Active'
  },
  {
    id: 'indiamart',
    category: 'wholesale',
    number: '06',
    name: 'IndiaMART Wholesale & Factory Radar',
    superpower: 'Manufacturer and GSTIN-verified supplier lead extraction for industrial and bulk commerce.',
    tag: 'Wholesale Radar',
    status: 'Live & Active'
  },
  {
    id: 'tradeindia',
    category: 'wholesale',
    number: '07',
    name: 'TradeIndia Industrial Supplier Scraper',
    superpower: 'Specialized machinery, raw material suppliers, and export-ready B2B manufacturer profiles.',
    tag: 'Industrial',
    status: 'Live & Active'
  },
  {
    id: 'yellowpages',
    category: 'wholesale',
    number: '08',
    name: 'YellowPages Global Directory Engine',
    superpower: 'Unified commercial scraper covering USA, UK, Canada, and Australia commercial directories.',
    tag: 'Global Directory',
    status: 'Live & Active'
  },
  {
    id: 'yelp',
    category: 'wholesale',
    number: '09',
    name: 'Yelp Commercial Contractor Indexer',
    superpower: 'Targeted service lead discovery for commercial HVAC, roofing, dental, and legal practices.',
    tag: 'Contractor Registry',
    status: 'Live & Active'
  },
  {
    id: 'instagram',
    category: 'social',
    number: '10',
    name: 'Instagram Business & Bio Mobile Radar',
    superpower: 'Discovers verified WhatsApp numbers, booking links, and owner handles directly from public bios.',
    tag: 'Social Intelligence',
    status: 'Live & Active'
  },
  {
    id: 'facebook',
    category: 'social',
    number: '11',
    name: 'Facebook Local Business Graph',
    superpower: 'Crawls verified public Facebook page metadata, owner phone cards, and messaging endpoints.',
    tag: 'Social Graph',
    status: 'Live & Active'
  },
  {
    id: 'tiktok',
    category: 'social',
    number: '12',
    name: 'TikTok Commercial Commerce Engine',
    superpower: 'Tracks trending commercial services, storefront videos, and regional presence by geofence.',
    tag: 'Commercial Social',
    status: 'Live & Active'
  },
  {
    id: 'x',
    category: 'social',
    number: '13',
    name: 'X (Twitter) Commercial Intent Engine',
    superpower: 'Real-time keyword listening capturing active local buyer inquiries and business mentions.',
    tag: 'Live Intent',
    status: 'Live & Active'
  },
  {
    id: 'linkedin',
    category: 'social',
    number: '14',
    name: 'LinkedIn Decision-Maker & Founder Radar',
    superpower: 'Links company name to founder, partner, and managing director public profiles and domain emails.',
    tag: 'Executive Radar',
    status: 'Live & Active'
  },
  {
    id: 'trustpilot',
    category: 'trust',
    number: '15',
    name: 'Trustpilot Commercial Sentiment Engine',
    superpower: 'Scores customer sentiment and extracts competitor customer displacement target lists.',
    tag: 'Reputation Analysis',
    status: 'Live & Active'
  },
  {
    id: 'chamber',
    category: 'trust',
    number: '16',
    name: 'Chamber of Commerce & Corp Registry',
    superpower: 'Verifies official incorporation status, company registration numbers, and director rosters.',
    tag: 'Corporate Trust',
    status: 'Live & Active'
  },
  {
    id: 'panchayat',
    category: 'trust',
    number: '17',
    name: 'Panchayat & Mandal Rural Registry',
    superpower: 'Proprietary micro-tier registry covering rural mandals, tehsils, and block-level trade hubs.',
    tag: 'Micro-Zoning',
    status: 'Live & Active'
  },
  {
    id: 'whois',
    category: 'trust',
    number: '18',
    name: 'WHOIS Domain & MX Mail Validator',
    superpower: 'Checks business domain age, active MX server health, and corporate email deliverability.',
    tag: 'DNS Health',
    status: 'Live & Active'
  },
  {
    id: 'whatsapp',
    category: 'automation',
    number: '19',
    name: 'WhatsApp Direct Outreach Link Generator',
    superpower: 'Auto-constructs pre-filled, compliant direct wa.me links for 1-click sales engagement.',
    tag: 'Direct Sales',
    status: 'Live & Active'
  },
  {
    id: 'deepweb',
    category: 'automation',
    number: '20',
    name: 'Multi-Engine Federated Indexer',
    superpower: 'Synthesizes unstructured web search results across 5 commercial search engines concurrently.',
    tag: 'Federated Search',
    status: 'Live & Active'
  },
  {
    id: 'seo',
    category: 'automation',
    number: '21',
    name: 'SEO Authority & Keyword Intent Radar',
    superpower: 'Scores organic search strength to identify high-spending commercial advertisers.',
    tag: 'SEO Intelligence',
    status: 'Live & Active'
  },
  {
    id: 'scheduler',
    category: 'automation',
    number: '22',
    name: '24/7 Autonomous Territory Sweeper',
    superpower: 'Background scheduled sweeps running unattended; delivers structured Excel workbooks straight to email.',
    tag: 'Auto-Pilot',
    status: 'Live & Active'
  }
];

export default function LandingFounderStory() {
  const [activeStage, setActiveStage] = useState('founder');
  const [isAutoTouring, setIsAutoTouring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeEngineFilter, setActiveEngineFilter] = useState('all');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Auto-Tour loop cycling through the 4 stages every 7.5 seconds
  useEffect(() => {
    if (!isAutoTouring) {
      setProgress(0);
      return undefined;
    }

    const intervalMs = 100;
    const durationMs = 7500;
    const step = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          const currentIndex = STAGES.findIndex(s => s.id === activeStage);
          const nextIndex = (currentIndex + 1) % STAGES.length;
          setActiveStage(STAGES[nextIndex].id);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoTouring, activeStage]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('manoj@scraper.co.in');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const filteredEngines = activeEngineFilter === 'all'
    ? ALL_22_ENGINES
    : ALL_22_ENGINES.filter(e => e.category === activeEngineFilter);

  return (
    <div className="lx-story-scroll-viewport">
      <div className="lx-stage-deck-container">
        {/* 1. Top 3D Liquid Glass White Marquee Ticker */}
        <div className="lx-story-ticker-wrap">
          <div className="lx-story-ticker">
            {[...VENTURE_HUBS, ...VENTURE_HUBS].map((hub, idx) => (
              <span key={idx} className="lx-story-ticker-item">{hub}</span>
            ))}
          </div>
        </div>

        {/* 2. Top Interactive Stage Switcher Bar with 3D Golden Pin Logo & Autoplay */}
        <div className="lx-stage-pills-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThreeGoldenPinLogo size={24} />
            <span style={{ fontSize: 12, fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Scraper</span>
              <span style={{ background: 'linear-gradient(135deg, #d97706, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                .co.in
              </span>
            </span>
          </div>

          {/* Center 4 Stage Navigation Pills */}
          <div className="lx-stage-pills-group">
            {STAGES.map((stg) => {
              const isActive = activeStage === stg.id;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    setIsAutoTouring(false);
                    setActiveStage(stg.id);
                  }}
                  className={`lx-stage-pill-btn ${isActive ? 'is-active' : ''}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="founderActiveStageBg"
                      className="lx-stage-pill-active-bg"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{stg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Autoplay Toggle Controller (Liquid 3D Gold) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsAutoTouring(p => !p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 11px',
                borderRadius: 999,
                background: isAutoTouring ? '#fffbeb' : '#ffffff',
                border: isAutoTouring ? '1.5px solid #d97706' : '1px solid rgba(217, 119, 6, 0.28)',
                color: isAutoTouring ? '#92400e' : '#475569',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isAutoTouring ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.16s ease'
              }}
              title="Toggle Auto-Tour presentation"
            >
              {isAutoTouring ? <Pause size={12} color="#b45309" /> : <Play size={12} color="#92400e" />}
              <span>{isAutoTouring ? 'Pause Tour' : 'Auto Tour'}</span>
              {isAutoTouring && (
                <div style={{ width: 14, height: 14, position: 'relative', display: 'grid', placeItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#fde68a"
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="4"
                      strokeDasharray={`${progress}, 100`}
                    />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 3. Dynamic 3D Liquid Glass Stage Content Presentation */}
        <AnimatePresence mode="wait">
          {/* ================= STAGE 1: FOUNDER STORY & BREAKTHROUGH ================= */}
          {activeStage === 'founder' && (
            <motion.div
              key="stage-founder"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lx-stage-card-glass"
            >
              <div className="lx-founder-hero-inner">
                {/* Left: Manoj's Portrait in Natural 3D Ceramic Frame */}
                <div className="lx-founder-portrait-col">
                  <div className="lx-founder-frame">
                    <img
                      src="/manoj.jpg"
                      alt="Manoj — Solo Founder & Principal Architect"
                      className="lx-founder-photo"
                    />
                    <div className="lx-founder-live-pulse">
                      <span className="lx-pulse-dot" />
                      <span>BUILDING IN PUBLIC</span>
                    </div>
                  </div>

                  <div className="lx-founder-badges">
                    <span className="lx-founder-badge-pill">
                      <Award size={13} color="#059669" />
                      <span>Manoj · Solo Architect</span>
                    </span>
                    <span className="lx-founder-badge-pill">
                      <Globe size={13} color="#0284c7" />
                      <span>Hyderabad &amp; Global Tech Hubs</span>
                    </span>
                  </div>
                </div>

                {/* Right: Authentic Human Founder Narrative (No AI Fluff) */}
                <div className="lx-founder-story-col">
                  <div className="lx-founder-quote-tag">
                    <span>"YOU JUST SEARCH · ALL 22 ENGINES WORK AUTOMATICALLY IN PARALLEL"</span>
                  </div>

                  <h1 className="lx-founder-title">
                    I spent 6 relentless months building an autonomous multi-engine lead platform.
                  </h1>

                  <p className="lx-founder-p">
                    Every startup founder and sales team I met across <b>Hyderabad, Bengaluru, San Francisco, London, and Dubai</b> had the same frustration: tools like Apollo and ZoomInfo force you to configure 50 complex knobs, buy expensive proxy pools, and wait in endless cloud queues—only to deliver dead switchboards and outdated emails.
                  </p>

                  <p className="lx-founder-p">
                    I locked myself in for <b>6 grueling months</b> to engineer a real deep-tech paradigm shift: <b>Client-Side RAM Virtualization</b>. Instead of paying thousands of dollars for cloud scrapers that get IP-banned, Scraper.co.in uses your PC's native residential connection and offscreen RAM lanes.
                  </p>

                  <div className="lx-founder-highlight-box">
                    <Sparkles size={20} color="#059669" style={{ flexShrink: 0 }} />
                    <div>
                      <b>The "You Just Search" Philosophy:</b>
                      <span> You enter a single search query (e.g. <i>"Cloud IT Solutions in HITEC City Hyderabad"</i> or <i>"Commercial Roofing in Melbourne"</i>). <b>Zero proxy setup. Zero manual knobs. All 22+ engines work automatically behind the scenes in parallel</b>, isolating verified proprietor mobile numbers (<code>/^[6-9]\d{9}$/</code>) with 1 click.</span>
                    </div>
                  </div>

                  {/* 4 Bold Glanceable Metric Tiles */}
                  <div className="lx-founder-stats-grid">
                    <div className="lx-founder-stat">
                      <b>6 Months</b>
                      <span>Solo Deep Tech R&amp;D</span>
                    </div>
                    <div className="lx-founder-stat">
                      <b>22 Engines</b>
                      <span>Auto-Orchestrated</span>
                    </div>
                    <div className="lx-founder-stat">
                      <b>11 Nations</b>
                      <span>Sovereign Geofence</span>
                    </div>
                    <div className="lx-founder-stat">
                      <b>$0 Server Cost</b>
                      <span>Runs on Local RAM</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 2: 20% STRATEGIC EQUITY ALLOCATION & PORTFOLIO ROI ================= */}
          {activeStage === 'equity' && (
            <motion.div
              key="stage-equity"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lx-stage-card-glass"
              style={{ border: '2px solid #38bdf8' }}
            >
              <div className="lx-investor-head">
                <div className="lx-investor-tag-row">
                  <span className="lx-equity-tag">💎 20% STRATEGIC EQUITY ALLOCATION</span>
                  <span className="lx-syndicate-tag">INSTITUTIONAL ANGELS &amp; VENTURE FUNDS WELCOMED</span>
                </div>
                <h2>The Unfair Advantage for Your Startup Portfolio</h2>
                <p>
                  If you are an institutional angel investor, venture capital partner, or growth fund backing high-growth startups in <b>Hyderabad, Bengaluru, San Francisco, New York, London, or Dubai</b> — here is why a strategic equity alliance with Scraper.co.in accelerates your portfolio returns:
                </p>
              </div>

              <div className="lx-investor-benefits-grid">
                <div className="lx-investor-benefit-tile">
                  <div className="lx-benefit-icon-orb is-emerald">
                    <TrendingUp size={20} color="#059669" />
                  </div>
                  <b>Slashes CAC to Near Zero for Every Portfolio Startup</b>
                  <p>
                    Portfolio teams rely on expensive legacy lead databases and manual proxy setups. With Scraper.co.in, teams extract fresh verified leads and direct proprietor WhatsApp contacts natively.
                  </p>
                </div>

                <div className="lx-investor-benefit-tile">
                  <div className="lx-benefit-icon-orb is-blue">
                    <Cpu size={20} color="#0284c7" />
                  </div>
                  <b>Lean Zero-Server Compute Architecture</b>
                  <p>
                    Cloud scrapers require heavy remote server clusters and rotating proxy pools. Scraper.co.in shifts browser execution onto local hardware across 8x to 16x parallel lanes, dramatically lowering server overhead.
                  </p>
                </div>

                <div className="lx-investor-benefit-tile">
                  <div className="lx-benefit-icon-orb is-gold">
                    <Globe size={20} color="#d97706" />
                  </div>
                  <b>11-Nation Sovereign Market Dominance</b>
                  <p>
                    From India's 633 districts and 5,900+ mandals to the United States, UK, UAE, Germany, Australia, and Singapore — the engine is battle-tested, pre-indexed, and 100% compliant with public open-web indexing laws.
                  </p>
                </div>
              </div>

              {/* Direct Investor Connection Action Strip */}
              <div className="lx-investor-cta-bar">
                <div className="lx-investor-cta-info">
                  <b>Discuss the 20% Strategic Equity Allocation Directly with Manoj</b>
                  <span>Confidential, direct dialogue. No intermediaries, no broker decks.</span>
                </div>

                <div className="lx-investor-btn-group">
                  <a
                    href="https://wa.me/919885603754?text=Hi%20Manoj%2C%20I%20am%20an%20investor%20interested%20in%20the%2020%25%20equity%20opportunity%20for%20Scraper.co.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lx-investor-wa-btn"
                    title="Direct WhatsApp with Founder Manoj"
                  >
                    <MessageCircle size={16} />
                    <span>Direct WhatsApp with Manoj (+91 9885603754)</span>
                  </a>

                  <button
                    type="button"
                    className="lx-investor-email-btn"
                    onClick={handleCopyEmail}
                    title="Copy Manoj's email"
                  >
                    {copiedEmail ? <Check size={16} color="#059669" /> : <Mail size={16} />}
                    <span>{copiedEmail ? 'Email Copied (manoj@scraper.co.in)!' : 'Email: manoj@scraper.co.in'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 3: ALL 22 PARALLEL ENGINES ================= */}
          {activeStage === 'engines' && (
            <motion.div
              key="stage-engines"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lx-stage-card-glass"
            >
              <div className="lx-engines-catalog-head">
                <div>
                  <span className="lx-highlight-tag">
                    <Layers size={13} color="#059669" />
                    <span>THE 22 PROPRIETARY SCRAPING ENGINES</span>
                  </span>
                  <h3>Every Engine Working Behind Your Single Search</h3>
                  <p>
                    All 22 engines activate concurrently in the background with zero manual proxy configuration:
                  </p>
                </div>

                {/* Category Filter Pills */}
                <div className="lx-filter-pill-group">
                  {[
                    { id: 'all', label: 'All 22 Engines' },
                    { id: 'search', label: 'Search & Maps (4)' },
                    { id: 'wholesale', label: 'Wholesale B2B (5)' },
                    { id: 'social', label: 'Social Intel (5)' },
                    { id: 'trust', label: 'Trust & Registries (4)' },
                    { id: 'automation', label: '24/7 Automations (4)' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`lx-filter-btn ${activeEngineFilter === f.id ? 'is-active' : ''}`}
                      onClick={() => setActiveEngineFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 22 Engines Bento Grid with Colourful Original Brand Logos */}
              <div className="lx-engines-bento-grid">
                {filteredEngines.map((engine) => (
                  <div key={engine.id} className="lx-engine-bento-card">
                    <div className="lx-engine-bento-top">
                      <div className="lx-engine-logo-wrap">
                        <EngineBrandLogo engineId={engine.id} size={30} />
                        <span className="lx-engine-num">{engine.number}</span>
                      </div>
                      <span className="lx-engine-status-chip">
                        <span className="lx-status-dot-green" />
                        <span>{engine.status}</span>
                      </span>
                    </div>
                    <h4 className="lx-engine-name">{engine.name}</h4>
                    <p className="lx-engine-desc">{engine.superpower}</p>
                    <div className="lx-engine-footer">
                      <span className="lx-engine-tag">{engine.tag}</span>
                      <span className="lx-engine-auto-tag">⚡ AUTO DISPATCH</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 4: ARCHITECTURAL MOAT & SIGN-OFF ================= */}
          {activeStage === 'moat' && (
            <motion.div
              key="stage-moat"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="lx-stage-card-glass"
              style={{ border: '2px solid #10b981' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div style={{ padding: '16px 18px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', marginBottom: 6 }}>
                    <ShieldCheck size={20} />
                    <b style={{ fontSize: 14 }}>Native Client Network Execution</b>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    Executes directly through the operator&apos;s local browser session with hardware-governed pacing and zero shared datacenter IP congestion.
                  </p>
                </div>

                <div style={{ padding: '16px 18px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', marginBottom: 6 }}>
                    <Cpu size={20} />
                    <b style={{ fontSize: 14 }}>Multi-Threaded RAM Virtualization</b>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    Spins up 8x to 16x offscreen Chromium lanes directly inside the browser extension. Zero wait times and zero server queue bottlenecks.
                  </p>
                </div>

                <div style={{ padding: '16px 18px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', marginBottom: 6 }}>
                    <Terminal size={20} />
                    <b style={{ fontSize: 14 }}>100% Proprietor Mobile Regex</b>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    Strict regex filtering (<code>/^[6-9]\d{9}$/</code>) discards toll-free 1800 numbers, receptionist desks, and dead landlines, ensuring only personal WhatsApp numbers reach your sales desk.
                  </p>
                </div>
              </div>

              {/* Heartfelt Personal Closing Signature with Real-Time 3D Pulsing Love Symbol */}
              <div className="lx-founder-signature-card" style={{ margin: 0 }}>
                <ThreePulsingHeart3D size={64} />
                <div className="lx-signature-body">
                  <p className="lx-signature-quote">
                    "Every single regex, scraper engine, and offscreen RAM lane was engineered late into the night with zero shortcuts. Whether you are an enterprise growth leader, an institutional investor partnering on equity, or an engineering team scaling B2B outreach — thank you for believing in independent, hard-won deep technology."
                  </p>
                  <div className="lx-signature-author">
                    <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>— With love, Manoj</span>
                      <Heart3DInline size={20} />
                    </b>
                    <span>Solo Founder &amp; Principal Architect · Scraper.co.in</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Bottom 3D Liquid Glass White Marquee Ticker */}
        <div className="lx-story-ticker-wrap is-bottom">
          <div className="lx-story-ticker is-reverse">
            {[...TECH_HIGHLIGHTS, ...TECH_HIGHLIGHTS].map((t, idx) => (
              <span key={idx} className="lx-story-ticker-item">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}