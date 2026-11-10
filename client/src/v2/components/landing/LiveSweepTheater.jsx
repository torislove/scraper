import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, MapPin, Phone, CheckCircle2,
  Sparkles, Zap, ArrowRight, ShieldCheck, Download,
  Layers, Database, Smartphone, Building2, Check
} from "lucide-react";

const SIMULATION_PRESETS = [
  {
    id: "guntur",
    city: "Guntur",
    query: "Kalyana Mandapams & AC Halls near Brodipet",
    coords: "16.3067° N, 80.4365° E",
    leadsCount: 142,
    sampleLead: {
      name: "Sri Venkateswara Royal Kalyana Mandapam",
      category: "Kalyana Mandapam & Function Hall",
      phone: "+91 94401 56782",
      phoneType: "WhatsApp Mobile",
      rating: "4.9 ★",
      reviews: "184 reviews",
      capacity: "1,200 Guests",
      features: "Fully AC · 8 Deluxe Rooms · 150 Car Parking",
      locality: "Brodipet, Guntur",
      verified: true,
      price: "₹1,20,000 / day"
    }
  },
  {
    id: "vja",
    city: "Vijayawada",
    query: "Wedding Photographers near Benz Circle",
    coords: "16.5062° N, 80.6480° E",
    leadsCount: 184,
    sampleLead: {
      name: "Sri Krishna 4K Cinematography & Drone Lab",
      category: "Wedding Photography & Video",
      phone: "+91 98480 23419",
      phoneType: "WhatsApp Mobile",
      rating: "4.9 ★",
      reviews: "216 reviews",
      capacity: "Team Size: 6",
      features: "Drone 4K HDR · 7-Day Fast Delivery · Candid Specialist",
      locality: "Benz Circle, Vijayawada",
      verified: true,
      price: "₹85,000 / event"
    }
  },
  {
    id: "hyd",
    city: "Hyderabad",
    query: "Convention Centers & Banquets in Madhapur",
    coords: "17.4483° N, 78.3915° E",
    leadsCount: 310,
    sampleLead: {
      name: "Grand Imperial Convention & Banquets",
      category: "Convention Center",
      phone: "+91 99891 76542",
      phoneType: "WhatsApp Mobile",
      rating: "4.8 ★",
      reviews: "340 reviews",
      capacity: "2,500 Guests",
      features: "Central AC · Valet Parking · In-House Veg/Non-Veg",
      locality: "Hitech City / Madhapur, Hyderabad",
      verified: true,
      price: "₹3,50,000 / day"
    }
  },
  {
    id: "warangal",
    city: "Warangal",
    query: "Event Decorators & Stage Setup in Hanamkonda",
    coords: "17.9784° N, 79.5941° E",
    leadsCount: 96,
    sampleLead: {
      name: "Shubham Royal Mandap & Floral Decorators",
      category: "Mandap & Event Decor",
      phone: "+91 98492 11094",
      phoneType: "WhatsApp Mobile",
      rating: "4.7 ★",
      reviews: "92 reviews",
      capacity: "500–3,000 Guests",
      features: "Traditional Temple Arch · Neon Gazebo · Fresh Florals",
      locality: "Hanamkonda, Warangal",
      verified: true,
      price: "Custom Packages"
    }
  }
];

const STAGES = [
  { num: 1, title: "Radar Target Lock", desc: "Geospatial mesh locks district GPS boundary" },
  { num: 2, title: "Locality Radius Mapping", desc: "5 km – 25 km territorial sweep grid drawn" },
  { num: 3, title: "9-Vector Parallel Sweep", desc: "Google Places + JustDial + OSM + Weddings engines run" },
  { num: 4, title: "Phone & WhatsApp Verification", desc: "WhatsApp +91 mobiles isolated from STD landlines" },
  { num: 5, title: "Territory Folder Vault Ready", desc: "Verified leads saved with 1-click dialer & CSV export" }
];

export default function LiveSweepTheater({ onClaimClick }) {
  const [activePreset, setActivePreset] = useState(SIMULATION_PRESETS[0]);
  const [stage, setStage] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentLeadsCount, setCurrentLeadsCount] = useState(12);

  // Auto-play stage cycle
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStage((prev) => {
        if (prev >= 5) return 1;
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Lead count sync
  useEffect(() => {
    const fractions = [0.15, 0.38, 0.65, 0.88, 1];
    const target = Math.round(activePreset.leadsCount * fractions[stage - 1]);
    setCurrentLeadsCount(target);
  }, [stage, activePreset]);

  return (
    <div className="sweep-theater-wrapper">
      {/* Top Controller Bar */}
      <div className="theater-topbar">
        <div className="theater-title-group">
          <span className="live-pulse-badge">
            <span className="live-dot" /> LIVE 2D DISCOVERY THEATER
          </span>
          <h3>Watch Scraper.co.in locate verified owners across an entire district</h3>
        </div>

        <div className="theater-controls">
          <div className="preset-tabs">
            {SIMULATION_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-tab ${activePreset.id === p.id ? "active" : ""}`}
                onClick={() => {
                  setActivePreset(p);
                  setStage(1);
                }}
              >
                <MapPin size={12} />
                <span>{p.city}</span>
              </button>
            ))}
          </div>

          <button
            className="theater-btn play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause simulation" : "Play simulation"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            className="theater-btn reset"
            onClick={() => setStage(1)}
            title="Reset sweep"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main Stage Timeline */}
      <div className="theater-stage-pipeline">
        {STAGES.map((s) => {
          const isActive = s.num === stage;
          const isDone = s.num < stage;
          return (
            <div
              key={s.num}
              className={`pipeline-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
              onClick={() => {
                setStage(s.num);
                setIsPlaying(false);
              }}
            >
              <div className="step-badge">
                {isDone ? <Check size={12} strokeWidth={3} /> : `0${s.num}`}
              </div>
              <div className="step-info">
                <span className="step-title">{s.title}</span>
                <small className="step-desc">{s.desc}</small>
              </div>
              {isActive && <motion.div layoutId="pipelineActiveGlow" className="active-glow-pill" />}
            </div>
          );
        })}
      </div>

      {/* Live Simulation Display */}
      <div className="theater-display-grid">
        {/* Left: Terminal Telemetry & Engine Sweep */}
        <div className="theater-terminal">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <span className="terminal-title">scraper.co.in://live-discovery-stream</span>
            <span className="terminal-status">RUNNING (ZERO KEYS)</span>
          </div>

          <div className="terminal-logs">
            <div className="log-line">
              <span className="log-time">00:01</span>
              <span className="log-tag tag-geo">GEO-MESH</span>
              <span>Locking bounding box: {activePreset.coords} [{activePreset.city}]</span>
            </div>
            <div className="log-line">
              <span className="log-time">00:02</span>
              <span className="log-tag tag-engine">DISPATCH</span>
              <span>Engines fired: Google Places, JustDial, OSM Overpass, Weddings</span>
            </div>
            <div className="log-line">
              <span className="log-time">00:03</span>
              <span className="log-tag tag-stream">DISCOVERY</span>
              <span>Stream: query="<b>{activePreset.query}</b>"</span>
            </div>
            <div className="log-line">
              <span className="log-time">00:04</span>
              <span className="log-tag tag-phone">TELECOM</span>
              <span>Classifying numbers: Isolated 10-digit Indian mobiles (+91 WhatsApp ready)</span>
            </div>
            <div className="log-line success">
              <span className="log-time">00:05</span>
              <span className="log-tag tag-success">FOLDER-VAULT</span>
              <span>Saved <b>{currentLeadsCount} leads</b> into Territory Folder: <b>[{activePreset.city} Sweeps]</b></span>
            </div>

            {/* Live Progress Bar */}
            <div className="terminal-progress-wrap">
              <div className="prog-header">
                <span>SWEEP PROGRESS: {Math.round((stage / 5) * 100)}%</span>
                <span>{currentLeadsCount} / {activePreset.leadsCount} VERIFIED LEADS</span>
              </div>
              <div className="prog-track">
                <motion.div
                  className="prog-bar"
                  animate={{ width: `${(stage / 5) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          <div className="terminal-engine-badges">
            <span className="eng-badge"><span className="e-dot" /> Google Places</span>
            <span className="eng-badge"><span className="e-dot" /> JustDial</span>
            <span className="eng-badge"><span className="e-dot" /> OpenStreetMap</span>
            <span className="eng-badge"><span className="e-dot" /> Weddings Marketplace</span>
            <span className="eng-badge"><span className="e-dot" /> Web Contact Crawler</span>
          </div>
        </div>

        {/* Right: Live Extracted Lead Card Preview */}
        <div className="theater-card-stream">
          <div className="stream-header">
            <span className="stream-eyebrow">
              <Database size={13} className="text-mint" />
              <span>LIVE VERIFIED RECORD IN WORKSPACE</span>
            </span>
            <span className="stream-counter-badge">
              <b>{currentLeadsCount}</b> LEADS RECORDED
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePreset.id}-${stage}`}
              className="lead-preview-card"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35 }}
            >
              <div className="l-card-top">
                <div className="l-avatar">
                  <Building2 size={20} />
                </div>
                <div className="l-title-box">
                  <h4>{activePreset.sampleLead.name}</h4>
                  <span className="l-category">{activePreset.sampleLead.category}</span>
                </div>
                <span className="l-rating">{activePreset.sampleLead.rating}</span>
              </div>

              <div className="l-badges-row">
                <span className="l-badge loc">
                  <MapPin size={11} /> {activePreset.sampleLead.locality}
                </span>
                <span className="l-badge cap">
                  <Sparkles size={11} /> {activePreset.sampleLead.capacity}
                </span>
                <span className="l-badge price">
                  {activePreset.sampleLead.price}
                </span>
              </div>

              <div className="l-features-box">
                <small className="f-title">DEEP WEDDING SPECIFICATIONS</small>
                <p>{activePreset.sampleLead.features}</p>
              </div>

              <div className="l-contact-box">
                <div className="phone-line">
                  <Smartphone size={15} className="text-mint" />
                  <span className="phone-num">{activePreset.sampleLead.phone}</span>
                  <span className="wa-verified-pill">
                    <CheckCircle2 size={11} /> WhatsApp Mobile
                  </span>
                </div>

                <div className="lead-actions-row">
                  <a
                    href={`https://wa.me/${activePreset.sampleLead.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wa-chat-btn"
                  >
                    Open WhatsApp Chat <ArrowRight size={13} />
                  </a>
                  <button
                    className="lead-folder-save-btn"
                    onClick={onClaimClick}
                  >
                    <Layers size={13} /> Saved in Folder
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="theater-action-bar">
            <div>
              <small className="theater-hint">
                <ShieldCheck size={12} className="text-mint" />
                1 credit charged only when a brand-new verified lead is written to your folder.
              </small>
            </div>
            <button className="theater-cta-btn" onClick={onClaimClick}>
              Start District Sweep (1,000 Free Credits) <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

