import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2, Search, MapPin, Building2, Phone, Database,
  Cpu, Zap, ShieldCheck, CheckCircle2, ArrowRight, ArrowUpRight,
  Sparkles, Layers, Store, Award, Star, Compass, Smartphone,
  Check, Filter, Users, Briefcase, ShoppingBag, Eye, Rocket
} from "lucide-react";

const ENGINES = [
  {
    id: "gplaces",
    badge: "Local Business Pack",
    speed: "250 contacts / min",
    name: "Google Local Places Network",
    tagline: "Direct Local Places Mesh",
    desc: "Discovers verified local business cards, clinic locations, and showroom listings with exact addresses and customer reviews.",
    target: "Owner Name, Verified Phone, GPS Coordinates, Google Reviews",
    icon: Store,
    color: "#66E6BD",
    simpleTitle: "Local Shop & Clinic Finder",
    simpleExplain: "Finds physical storefronts, clinics, showrooms, and local shops in any mandal with their owner name, Google rating, and verified phone.",
    sampleLead: {
      business: "Sri Balaji Medical & General Stores",
      owner: "R. Venkatesh (Proprietor)",
      location: "Brodipet 4th Line, Guntur",
      phone: "+91 98482 11982",
      rating: "4.8 ★ (184 reviews)"
    }
  },
  {
    id: "localfinder",
    badge: "Top Rated Search",
    speed: "400 contacts / min",
    name: "Search 3-Pack Discovery",
    tagline: "High-Ranked Local Hub",
    desc: "Connects with the highest-rated local businesses in each city before expanding into deeper suburban zones.",
    target: "Top Rated Businesses, Operating Hours, Direct Phone Lines",
    icon: Star,
    color: "#FACC15",
    simpleTitle: "5-Star & Top Rated Businesses",
    simpleExplain: "Identifies the highest-rated, most trusted service providers and businesses in each city first before scanning surrounding suburbs.",
    sampleLead: {
      business: "Krishna 4K Cine Color Labs",
      owner: "K. Mohan Rao (Managing Director)",
      location: "Benz Circle, Vijayawada",
      phone: "+91 98665 44210",
      rating: "4.9 ★ (340 reviews)"
    }
  },
  {
    id: "justdial",
    badge: "Tier-2 & Tier-3 Specialist",
    speed: "180 contacts / min",
    name: "Indian Trade Directory Network",
    tagline: "Pan-India Trade Hub",
    desc: "Specially calibrated for Tier-2 and Tier-3 Indian cities like Guntur, Tenali, Warangal, and Vijayawada where local trade thrives.",
    target: "Proprietor Mobiles, Shop Categories, Local Trade Details",
    icon: Building2,
    color: "#38BDF8",
    simpleTitle: "Tier-2 & Tier-3 Town Specialist",
    simpleExplain: "Built especially for growing Indian commercial towns (like Guntur, Tenali, Warangal, Vijayawada, Surat) where traditional shops and traders operate.",
    sampleLead: {
      business: "Sri Lakshmi Wholesale Rice & Dhal Mill",
      owner: "N. Lakshmi Narayana (Owner)",
      location: "Morrispet, Tenali",
      phone: "+91 94402 88319",
      rating: "Trade Verified · GST Active"
    }
  },
  {
    id: "weddings",
    badge: "Events & Wedding Niche",
    speed: "120 contacts / min",
    name: "Weddings & Banquets Directory",
    tagline: "Events & Hospitality Hub",
    desc: "Surfaces structured event features: guest capacity (300 to 5,000+), AC rooms, parking lots, and wedding packages.",
    target: "Banquet Halls, Mandapams, Decorators, Photographers, Catering",
    icon: Award,
    color: "#EC4899",
    simpleTitle: "Kalyana Mandapams & Banquet Halls",
    simpleExplain: "Grabs detailed hall features: guest seating capacity (300 to 5,000+), AC dining, bride suites, car parking, and in-house catering rules.",
    sampleLead: {
      business: "SVR Royal Kalyana Vedika",
      owner: "M. Someswara Rao (Secretary)",
      location: "Inner Ring Road, Guntur",
      phone: "+91 98490 55123",
      rating: "1,500 Guests · Full Central AC · 18 Rooms"
    }
  },
  {
    id: "osm",
    badge: "Territorial Geocoder",
    speed: "Instant Mesh",
    name: "Geospatial Boundary Mesh",
    tagline: "Mandal & Tehsil Mapper",
    desc: "Geospatially maps district mandals, suburban towns, and street radius grids across all 633 districts.",
    target: "Commercial Centers, Mandal Boundaries, Ward Nodes",
    icon: MapPin,
    color: "#A78BFA",
    simpleTitle: "Mandal & Locality Mapper",
    simpleExplain: "Maps every local mandal, commercial market street, and postal pin code so no shop or showroom is missed.",
    sampleLead: {
      business: "Arundelpet Commercial Center",
      owner: "Locality Node: Ward 14 & 15",
      location: "Guntur District (522002)",
      phone: "Geospatial Lock: 16.3067° N, 80.4365° E",
      rating: "25 km Territory Perimeter Active"
    }
  },
  {
    id: "webdiscovery",
    badge: "Global Open Web",
    speed: "Any country",
    name: "Open Web Business Discovery",
    tagline: "Keyless Global Discovery",
    desc: "Finds a business's own website from public search results, then reads that site for its real phone and email. This is the fallback that keeps US, UK, Canada, Australia, UAE, Singapore, Ireland, New Zealand, South Africa and Malaysia covered when a local directory blocks automation.",
    target: "Official Domain, On-Site Phone, Email, Address, Social Profiles",
    icon: Globe2,
    color: "#22D3EE",
    simpleTitle: "Any Country, No API Key",
    simpleExplain: "Searches the open web for the business itself instead of a directory. Works in the US, UK, Canada, Australia, New Zealand, UAE, Singapore, Ireland, Malaysia, Saudi Arabia, Qatar, Kuwait, Bahrain and Oman without an API key.",
    sampleLead: {
      business: "Hargrove & Sons Plumbing",
      owner: "Official website · Austin, TX",
      location: "Austin, Texas, United States",
      phone: "+1 (512) 555-0148",
      rating: "Public site · robots.txt respected"
    }
  },
  {
    id: "webcontact",
    badge: "Official Website Checker",
    speed: "80 domains / min",
    name: "Direct Website Verification",
    tagline: "Verified Company Contacts",
    desc: "Cross-checks official business websites to uncover direct owner WhatsApp links and direct decision-maker contact points.",
    target: "Verified Direct Emails, Owner Mobile Numbers, WhatsApp Links",
    icon: Globe2,
    color: "#10B981",
    simpleTitle: "Official Website & WhatsApp Checker",
    simpleExplain: "Scans company websites and landing pages to extract direct personal WhatsApp chat buttons and owner contact emails.",
    sampleLead: {
      business: "Veda Dental Care & Implant Center",
      owner: "Dr. P. Raviteja, MDS (Chief Surgeon)",
      location: "NTR Circle, Vijayawada",
      phone: "+91 98488 77665",
      rating: "WhatsApp wa.me direct button verified"
    }
  },
  {
    id: "indiamart",
    badge: "B2B Supply Chain",
    speed: "110 contacts / min",
    name: "B2B Wholesale & Supply Chain",
    tagline: "Wholesale & Stockist Network",
    desc: "Discovers verified wholesalers, hardware stockists, shamiana providers, and commercial equipment distributors.",
    target: "Wholesale Vendors, Equipment Suppliers, Sound Systems, GST Details",
    icon: Briefcase,
    color: "#F97316",
    simpleTitle: "Wholesalers, Distributors & Stockists",
    simpleExplain: "Finds bulk suppliers, machinery dealers, hardware stockists, and material distributors with verified GST details for B2B expansion.",
    sampleLead: {
      business: "Ambica Industrial Hardware & Bearings",
      owner: "K. Suresh Babu (Managing Partner)",
      location: "Auto Nagar, Guntur",
      phone: "+91 94405 32187",
      rating: "Public listing · Stockist"
    }
  },
  {
    id: "socialdork",
    badge: "Creative Portfolios",
    speed: "150 profiles / min",
    name: "Creative Portfolio Network",
    tagline: "Work Portfolio Explorer",
    desc: "Finds live work catalogs for photographers, bridal makeup artists (MUA), architects, and interior designers.",
    target: "Work Catalogs, Studio Portfolios, Recent Projects",
    icon: Eye,
    color: "#06B6D4",
    simpleTitle: "Creative Portfolios & Photographers",
    simpleExplain: "Surfaces real photo/video portfolios for wedding photographers, bridal makeup artists, architects, and interior decorators.",
    sampleLead: {
      business: "Chaya 4K Wedding Cinema",
      owner: "G. Chaitanya (Lead Cinematographer)",
      location: "Madhapur, Hyderabad",
      phone: "+91 99890 22341",
      rating: "450+ Wedding Albums · 4K Drone Certified"
    }
  },
  {
    id: "serpdork",
    badge: "Trade Associations",
    speed: "200 results / min",
    name: "Trade Association Directories",
    tagline: "Commercial Guild Directories",
    desc: "Cross-references regional trade association member rosters and industry guild directories.",
    target: "Chamber of Commerce Members, Guild Rosters, Trade Lists",
    icon: Users,
    color: "#6366F1",
    simpleTitle: "Chamber of Commerce & Guild Rosters",
    simpleExplain: "Cross-checks official business guilds, merchant associations, and trade council directories to get verified member phone books.",
    sampleLead: {
      business: "Andhra Chamber of Commerce Member #482",
      owner: "B. Ramalingam (Executive Member)",
      location: "Governorpet, Vijayawada",
      phone: "+91 98480 33411",
      rating: "Verified Merchant Guild Roster"
    }
  }
];

export default function EnginesMatrix() {
  const [selectedEngine, setSelectedEngine] = useState(ENGINES[0]);
  const [autoRotate, setAutoRotate] = useState(true);

  // Auto-rotate selected network every 4.5 seconds for animated showcase
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setSelectedEngine((prev) => {
        const nextIndex = (ENGINES.findIndex((e) => e.id === prev.id) + 1) % ENGINES.length;
        return ENGINES[nextIndex];
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [autoRotate]);

  return (
    <div className="engines-matrix-section" style={{ padding: "80px 0" }}>
      
      {/* Intro Header */}
      <div className="engines-intro" style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 40px" }}>
        <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <Sparkles size={14} className="text-mint" /> 9 KEYLESS ENGINES · 245 COUNTRIES
        </span>
        <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          How Scraper.co.in Searches The Open Web, Maps<br />
          <span className="gradient-text">And Directories For Real Business Owners.</span>
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
          India is the home market and keeps its own directories. Every other country runs the keyless global stack: OpenStreetMap, Google Maps, Google Local Finder, Web Discovery and official business websites. All 245 countries are selectable. Any source that blocks automation is shown as blocked, never faked — the sites set their own rate limits, and we answer by running independent sources in parallel instead of pretending the limits do not exist.
        </p>
      </div>

      {/* ANIMATED INTERACTIVE LIVE INSPECTOR SHOWCASE */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(16, 24, 38, 0.95), rgba(9, 14, 22, 0.98))",
          border: `1px solid ${selectedEngine.color}40`,
          borderRadius: "20px",
          padding: "24px 30px",
          marginBottom: "36px",
          boxShadow: `0 20px 60px ${selectedEngine.color}15`,
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(165,184,204,0.1)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: `${selectedEngine.color}18`,
                color: selectedEngine.color
              }}
            >
              <selectedEngine.icon size={22} />
            </span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: selectedEngine.color }}>
                NETWORK {ENGINES.findIndex(e => e.id === selectedEngine.id) + 1} OF {ENGINES.length} · LIVE SIMULATION
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", margin: "2px 0 0" }}>
                {selectedEngine.name} <span style={{ color: "#94A3B8", fontWeight: 400, fontSize: "15px" }}>({selectedEngine.simpleTitle})</span>
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", background: "rgba(102,230,189,0.1)", color: "#66E6BD", padding: "5px 12px", borderRadius: "999px", fontWeight: 700, border: "1px solid rgba(102,230,189,0.25)" }}>
              ⚡ Speed: {selectedEngine.speed}
            </span>
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(165,184,204,0.15)",
                color: "#CBD5E1",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: "pointer"
              }}
            >
              {autoRotate ? "Auto-Showcase: ON" : "Auto-Showcase: PAUSED"}
            </button>
          </div>
        </div>

        {/* Dynamic Details Box */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "6px" }}>
              SIMPLE EXPLANATION IN PLAIN ENGLISH:
            </div>
            <p style={{ fontSize: "15px", color: "#F1F5F9", lineHeight: 1.6, margin: "0 0 14px" }}>
              {selectedEngine.simpleExplain}
            </p>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(165,184,204,0.1)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", display: "block", marginBottom: "4px" }}>
                VERIFIED ATTRIBUTES EXTRACTED:
              </span>
              <span style={{ fontSize: "13px", color: "#66E6BD", fontWeight: 600 }}>
                {selectedEngine.target}
              </span>
            </div>
          </div>

          {/* Sample Verified Result Card */}
          <div style={{ background: "rgba(8, 14, 22, 0.9)", border: `1px solid ${selectedEngine.color}40`, borderRadius: "14px", padding: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: selectedEngine.color, letterSpacing: "0.08em" }}>
                SAMPLE RECORD CAPTURED
              </span>
              <span style={{ fontSize: "9px", background: "rgba(16,185,129,0.15)", color: "#34D399", padding: "2px 8px", borderRadius: "4px", fontWeight: 800 }}>
                ✓ ZERO GATEKEEPER
              </span>
            </div>

            <b style={{ fontSize: "15px", color: "#FFFFFF", display: "block", marginBottom: "2px" }}>
              {selectedEngine.sampleLead.business}
            </b>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "10px" }}>
              {selectedEngine.sampleLead.owner} · {selectedEngine.sampleLead.location}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(165,184,204,0.1)" }}>
              <span style={{ fontSize: "12px", fontWeight: 750, color: "#66E6BD", display: "flex", alignItems: "center", gap: "6px" }}>
                <Smartphone size={14} /> {selectedEngine.sampleLead.phone}
              </span>
              <span style={{ fontSize: "11px", color: "#E2E8F0" }}>
                {selectedEngine.sampleLead.rating}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 9 Cards Grid */}
      <div className="engines-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {ENGINES.map((engine, idx) => {
          const isSelected = engine.id === selectedEngine.id;
          return (
            <motion.div
              key={engine.id}
              className={`engine-card ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setSelectedEngine(engine);
                setAutoRotate(false);
              }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                background: isSelected ? "linear-gradient(145deg, #162436, #0e1724)" : "linear-gradient(145deg, #101925, #0a111a)",
                border: isSelected ? `1px solid ${engine.color}` : "1px solid rgba(165, 184, 204, 0.12)",
                borderRadius: "14px",
                padding: "22px",
                cursor: "pointer",
                position: "relative",
                boxShadow: isSelected ? `0 10px 25px ${engine.color}20` : "none"
              }}
            >
              <div className="eng-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span
                  className="eng-tag"
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: engine.color,
                    background: `${engine.color}15`,
                    padding: "4px 9px",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <engine.icon size={12} /> {engine.badge}
                </span>
                <span className="eng-speed" style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>
                  {engine.speed}
                </span>
              </div>

              <h3 className="eng-name" style={{ fontSize: "16px", fontWeight: 750, color: "#FFFFFF", margin: "0 0 4px" }}>
                {engine.name}
              </h3>
              
              <div style={{ fontSize: "12px", fontWeight: 700, color: engine.color, marginBottom: "8px" }}>
                {engine.tagline}
              </div>

              <p className="eng-desc" style={{ fontSize: "12.5px", color: "#94A3B8", lineHeight: 1.6, margin: "0 0 14px" }}>
                {engine.desc}
              </p>

              <div className="eng-target-box" style={{ background: "rgba(0, 0, 0, 0.35)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(165,184,204,0.08)" }}>
                <span className="eng-target-label" style={{ display: "block", color: "#64748B", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em", marginBottom: "3px" }}>
                  VERIFIED DATA:
                </span>
                <span className="eng-target-val" style={{ color: "#E2E8F0", fontSize: "11.5px", lineHeight: 1.4, display: "block" }}>
                  {engine.target}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Built Exclusively Banner */}
      <div
        className="engines-banner"
        style={{
          marginTop: "40px",
          background: "radial-gradient(ellipse at 50% 50%, rgba(30, 95, 80, 0.2), transparent 70%), #0d1722",
          border: "1px solid rgba(102, 230, 189, 0.3)",
          borderRadius: "16px",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div className="eb-content" style={{ display: "flex", alignItems: "center", gap: "18px", maxWidth: "700px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(102,230,189,0.15)", display: "grid", placeItems: "center", color: "#66E6BD", flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div>
            <b style={{ display: "block", fontSize: "16px", fontWeight: 800, color: "#FFFFFF", marginBottom: "4px" }}>
              Built For India First — Now Every Country
            </b>
            <p style={{ fontSize: "13.5px", color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
              Direct mobile lines where the country uses them, verified business names, and complete shop locations across all 245 countries. Blocked directories stay listed as blocked instead of being counted as coverage. Site rate limits are respected; speed comes from caching, dedupe and parallel keyless sources.
            </p>
          </div>
        </div>

        <div
          className="eb-badge"
          style={{
            background: "rgba(102, 230, 189, 0.12)",
            border: "1px solid rgba(102, 230, 189, 0.35)",
            color: "#66E6BD",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <CheckCircle2 size={16} /> REAL CONTACTS · NO GATEKEEPERS · HONEST COVERAGE
        </div>
      </div>

    </div>
  );
}
