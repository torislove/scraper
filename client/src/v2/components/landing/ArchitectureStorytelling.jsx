import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Globe2, Radio, CheckCircle2, ArrowRight, ArrowUpRight,
  Sparkles, Layers, Zap, Building2, Smartphone, ShieldCheck,
  Compass, Crosshair, Users, Activity, FileSpreadsheet, Play, Pause,
  Phone, MessageSquare
} from "lucide-react";

export default function ArchitectureStorytelling({ onLaunchClient }) {
  const [activeStory, setActiveStory] = useState("client"); // "client" | "master"
  const [step, setStep] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance narrative steps every 3.8 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 3800);
    return () => clearInterval(interval);
  }, [isAutoPlaying, activeStory]);

  const CLIENT_STEPS = [
    {
      num: 1,
      title: "Focus on Your City & Sweep All Mandals",
      subtitle: "Dedicated single city & locality focus",
      desc: "In the Client App, discovery is strictly calibrated for your chosen city and all surrounding mandals (e.g. Brodipet Guntur, Benz Circle Vijayawada, or Koramangala Bengaluru). It maps every commercial market street, ward node, and trade cluster.",
      badge: "STEP 01: CITY & ALL MANDALS FOCUS",
      stats: "Single City & Mandal Grid · Instant Browser Access"
    },
    {
      num: 2,
      title: "Searches All Over The Internet For Leads For You",
      subtitle: "For all startups, businesses & new products",
      desc: "Whether you are a new tech startup hunting your first 100 paying clients, an established business looking for new buyers, or launching a brand-new product needing retail stockists, our system scours websites, trade directories, and registries across the open web.",
      badge: "STEP 02: ALL-INTERNET LEAD GATHERING",
      stats: "Startups · New Products · Wholesalers · Agencies"
    },
    {
      num: 3,
      title: "Normal Landlines Saved + 1-Click WhatsApp for Mobiles",
      subtitle: "Smart phone classification for your calling team",
      desc: "Automatically detects STD area prefixes (0863-, 040-, 080-). Normal office landlines remain fully available for your telecallers to dial, while the proprietor's direct 10-digit pocket mobile unlocks 1-click personal WhatsApp dialogue.",
      badge: "STEP 03: SMART PHONE CLASSIFIER",
      stats: "Landlines for Calling · Mobiles for WhatsApp"
    }
  ];

  const MASTER_STEPS = [
    {
      num: 1,
      title: "Select Multi-State & 633 District Scope",
      subtitle: "State-wide enterprise infrastructure",
      desc: "Choose entire states (Andhra Pradesh + Telangana + Karnataka) or launch all 633 Indian districts simultaneously. Ideal for enterprise distributors, SaaS startups, and national marketing agencies.",
      badge: "PHASE 01: STATE-WIDE SCOPE",
      stats: "633 Districts · 5,900+ Mandals · 28 States"
    },
    {
      num: 2,
      title: "Parallel Multi-District Sweeps",
      subtitle: "High-velocity parallel execution",
      desc: "Dozens of regional engines execute in parallel without bottlenecking. Concurrently verifies wedding halls, clinics, wholesalers, and retail chains across thousands of mandals at once.",
      badge: "PHASE 02: PARALLEL DISCOVERY",
      stats: "Concurrent Districts · Zero Quota Limits"
    },
    {
      num: 3,
      title: "Centralized Vault & Multi-Agent Distribution",
      subtitle: "Enterprise calling workbooks",
      desc: "Aggregates hundreds of thousands of records into styled Platinum workbooks. Partition leads by district, assign territory folders to telecalling teams, and manage national pipeline.",
      badge: "PHASE 03: ENTERPRISE CRM VAULT",
      stats: "Auto-Tiered Platinum Sheets · Multi-User CRM"
    }
  ];

  const currentSteps = activeStory === "client" ? CLIENT_STEPS : MASTER_STEPS;
  const currentStepData = currentSteps[step - 1];

  const handleContactMaster = () => {
    window.open(
      "https://wa.me/919848124789?text=Hello%20Scraper.co.in%2C%20I%20am%20interested%20in%20accessing%20the%20Master%20Pan-India%20633%20Districts%20Platform.",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="arch-story-wrapper" style={{ marginTop: "32px" }}>
      
      {/* Top Storyteller Mode Switcher (Zero Port Names) */}
      <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap", marginBottom: "32px" }}>
        <button
          type="button"
          onClick={() => {
            setActiveStory("client");
            setStep(1);
          }}
          className={`button ${activeStory === "client" ? "button-primary" : "button-secondary"}`}
          style={{
            borderRadius: "30px",
            padding: "12px 24px",
            fontSize: "13px",
            boxShadow: activeStory === "client" ? "0 0 25px rgba(102, 230, 189, 0.3)" : "none"
          }}
        >
          <MapPin size={15} />
          <span>Story 01: Client App (Your City &amp; All Mandals)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveStory("master");
            setStep(1);
          }}
          className={`button ${activeStory === "master" ? "button-primary" : "button-secondary"}`}
          style={{
            borderRadius: "30px",
            padding: "12px 24px",
            fontSize: "13px",
            background: activeStory === "master" ? "linear-gradient(135deg, #7C3AED, #4F46E5)" : "rgba(255,255,255,0.035)",
            borderColor: activeStory === "master" ? "#A855F7" : "rgba(165,184,204,0.13)",
            boxShadow: activeStory === "master" ? "0 0 25px rgba(168, 85, 247, 0.3)" : "none"
          }}
        >
          <Globe2 size={15} />
          <span>Story 02: Master Enterprise Edition (Pan-India 633 Districts)</span>
        </button>
      </div>

      {/* Main Interactive Storyboard Canvas */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(14, 22, 34, 0.95), rgba(9, 14, 22, 0.98))",
          border: activeStory === "client" ? "1px solid rgba(102, 230, 189, 0.3)" : "1px solid rgba(168, 85, 247, 0.35)",
          borderRadius: "24px",
          padding: "36px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            filter: "blur(90px)",
            top: "-60px",
            right: "-60px",
            background: activeStory === "client" ? "rgba(102, 230, 189, 0.15)" : "rgba(168, 85, 247, 0.15)",
            pointerEvents: "none"
          }}
        />

        {/* Storyboard Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", paddingBottom: "24px", borderBottom: "1px solid rgba(165,184,204,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: activeStory === "client" ? "rgba(102,230,189,0.12)" : "rgba(168,85,247,0.14)",
                color: activeStory === "client" ? "#66E6BD" : "#C084FC"
              }}
            >
              {activeStory === "client" ? <Crosshair size={20} /> : <Globe2 size={20} />}
            </span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.14em", color: activeStory === "client" ? "#66E6BD" : "#C084FC" }}>
                {activeStory === "client" ? "CLIENT APP: LOCAL OPERATIONAL STORY" : "MASTER PLATFORM: ENTERPRISE STATE SWEEPS"}
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#FFFFFF", margin: "2px 0 0" }}>
                {activeStory === "client" ? "How Any Startup or Business Searches The Web Across Their City & All Mandals" : "How an Enterprise Agency Sweeps Entire States Simultaneously"}
              </h3>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(165,184,204,0.15)",
                color: "#CBD5E1",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isAutoPlaying ? "Auto-Play: ON" : "Auto-Play: OFF"}</span>
            </button>
            <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>
              STEP {step} OF 3
            </span>
          </div>
        </div>

        {/* Narrative Interactive Progress Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", margin: "24px 0 32px" }}>
          {currentSteps.map((s) => {
            const isActive = s.num === step;
            return (
              <div
                key={s.num}
                onClick={() => {
                  setStep(s.num);
                  setIsAutoPlaying(false);
                }}
                style={{
                  background: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                  border: isActive
                    ? (activeStory === "client" ? "1px solid #66E6BD" : "1px solid #C084FC")
                    : "1px solid rgba(165,184,204,0.1)",
                  borderRadius: "14px",
                  padding: "14px",
                  cursor: "pointer",
                  transition: "0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: isActive ? (activeStory === "client" ? "#66E6BD" : "#C084FC") : "#64748B" }}>
                    0{s.num}. {s.badge}
                  </span>
                  {isActive && <span className="pill-pulse" style={{ background: activeStory === "client" ? "#66E6BD" : "#C084FC" }} />}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: isActive ? "#FFFFFF" : "#94A3B8" }}>
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Story Scene Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeStory}-${step}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "32px", alignItems: "center" }}
          >
            {/* Left: Narrative Script */}
            <div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: activeStory === "client" ? "#66E6BD" : "#C084FC",
                  background: activeStory === "client" ? "rgba(102,230,189,0.1)" : "rgba(168,85,247,0.12)",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  marginBottom: "12px"
                }}
              >
                {currentStepData.badge}
              </span>
              <h4 style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                {currentStepData.title}
              </h4>
              <p style={{ fontSize: "14.5px", color: "#94A3B8", lineHeight: 1.7, margin: "0 0 20px" }}>
                {currentStepData.desc}
              </p>

              <div style={{ background: "rgba(8, 14, 22, 0.8)", border: "1px solid rgba(165,184,204,0.12)", borderRadius: "12px", padding: "12px 18px", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#CBD5E1" }}>
                <Sparkles size={14} className={activeStory === "client" ? "text-mint" : "text-violet"} />
                <span><b>Operational Benchmark:</b> {currentStepData.stats}</span>
              </div>
            </div>

            {/* Right: Interactive Graphic Simulation Scene */}
            <div
              style={{
                background: "rgba(8, 14, 22, 0.9)",
                border: "1px solid rgba(165,184,204,0.15)",
                borderRadius: "18px",
                padding: "24px",
                minHeight: "260px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative"
              }}
            >
              {activeStory === "client" ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#66E6BD", letterSpacing: "0.1em" }}>
                      CLIENT APP LOCAL RADAR
                    </span>
                    <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>LOCK: GUNTUR (522002)</span>
                  </div>

                  {step === 1 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(102,230,189,0.2)" }}>
                        <Crosshair size={28} className="text-mint" />
                        <div>
                          <b style={{ color: "#FFF", fontSize: "14px", display: "block" }}>Brodipet &amp; Arundelpet Mandal Grid</b>
                          <small style={{ color: "#94A3B8" }}>5 km radius circle drawn · 142 business cards acquired</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#66E6BD", fontWeight: 700, marginBottom: "2px" }}>
                        🌐 All-Internet Lead Sweep (Startups &amp; New Products)
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(59,130,246,0.1)", borderRadius: "10px", border: "1px solid rgba(59,130,246,0.25)" }}>
                        <span style={{ color: "#93C5FD", fontFamily: "monospace" }}>0863-2234120 (Office Landline)</span>
                        <span style={{ color: "#60A5FA", fontSize: "10px", fontWeight: 800 }}>AVAILABLE: CALL-ONLY</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.3)" }}>
                        <span style={{ color: "#34D399", fontWeight: 750, fontFamily: "monospace" }}>+91 98481 24789 (Pocket Mobile)</span>
                        <span style={{ color: "#34D399", fontSize: "10px", fontWeight: 800 }}>VERIFIED PROPRIETOR</span>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(102,230,189,0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        <Smartphone size={20} className="text-mint" />
                        <b style={{ color: "#FFF", fontSize: "14px" }}>1-Click WhatsApp Direct Chat</b>
                      </div>
                      <p style={{ fontSize: "12px", color: "#66E6BD", margin: "0 0 12px", fontFamily: "sans-serif" }}>
                        &quot;Hello Venkat Rao garu, saw your photo studio work in Vijayawada...&quot;
                      </p>
                      <button
                        type="button"
                        onClick={onLaunchClient}
                        className="button button-primary"
                        style={{ padding: "8px 16px", fontSize: "12px" }}
                      >
                        Launch Client App <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#C084FC", letterSpacing: "0.1em" }}>
                      MASTER PAN-INDIA ENTERPRISE SUITE
                    </span>
                    <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>633 DISTRICTS MESH</span>
                  </div>

                  {step === 1 && (
                    <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(168,85,247,0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <Globe2 size={24} color="#C084FC" />
                        <b style={{ color: "#FFF", fontSize: "14px" }}>28 States &amp; 633 Districts Active</b>
                      </div>
                      <small style={{ color: "#94A3B8", display: "block" }}>Andhra Pradesh · Telangana · Karnataka · Maharashtra · Gujarat · All-India concurrent swarms</small>
                    </div>
                  )}

                  {step === 2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {["Andhra Pradesh: 26 Districts Swarming", "Telangana: 33 Districts Swarming", "Karnataka: 31 Districts Swarming"].map((st, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(168,85,247,0.08)", borderRadius: "8px", fontSize: "12px", color: "#CBD5E1" }}>
                          <span>{st}</span>
                          <span style={{ color: "#C084FC", fontWeight: 700 }}>PARALLEL RUNNING</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step === 3 && (
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(168,85,247,0.3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <FileSpreadsheet size={20} color="#C084FC" />
                        <b style={{ color: "#FFF", fontSize: "14px" }}>Platinum Multi-Sheet Workbooks</b>
                      </div>
                      <small style={{ color: "#94A3B8", display: "block", marginBottom: "12px" }}>Auto-filtered by city, category, and sales agent routing.</small>
                      <button
                        type="button"
                        onClick={handleContactMaster}
                        className="button"
                        style={{ padding: "8px 16px", fontSize: "12px", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", color: "#FFF", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", border: "none" }}
                      >
                        <Phone size={13} />
                        <span>If You Want Master App, Please Contact →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Storyboard Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid rgba(165,184,204,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#94A3B8" }}>
            <ShieldCheck size={14} className="text-mint" />
            <span>Zero lock · Real-time verified mobiles · Direct WhatsApp outreach</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onLaunchClient}
              className="button button-primary"
              style={{ padding: "10px 20px", fontSize: "12.5px" }}
            >
              <span>Launch Client Dashboard</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={handleContactMaster}
              className="button button-secondary"
              style={{ padding: "10px 18px", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <Phone size={14} />
              <span>If You Want Master App, Please Contact →</span>
            </button>
          </div>
        </div>

        {/* Note that landing page is client-only */}
        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "14px", textAlign: "right" }}>
          * This landing page is exclusively for the Client App. If you want the Master Platform (Pan-India 633 district sweeps), please contact our team.
        </div>

      </div>
    </div>
  );
}
