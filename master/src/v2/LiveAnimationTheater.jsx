import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, MapPin, Phone, CheckCircle, Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import Mascot from './Mascot';
import Mascot3D from './Mascot3D';
import './theater.css';

const SIMULATION_PRESETS = [
  {
    id: 'vja',
    city: 'Vijayawada',
    query: 'Wedding Photographers near Benz Circle',
    coords: '16.5062° N, 80.6480° E',
    leadsCount: 184,
    sampleLead: {
      name: 'Sri Krishna Photography & 4K Cinematography',
      phone: '+91 98480 23419',
      rating: '4.9 ★',
      reviews: '182 reviews',
      locality: 'Benz Circle, Vijayawada',
      verified: true
    }
  },
  {
    id: 'hyd',
    city: 'Hyderabad',
    query: 'B2B Interior Decorators in Madhapur',
    coords: '17.4483° N, 78.3915° E',
    leadsCount: 310,
    sampleLead: {
      name: 'Vanguard Architectural & Living Studios',
      phone: '+91 99891 76542',
      rating: '4.8 ★',
      reviews: '240 reviews',
      locality: 'Hitech City, Hyderabad',
      verified: true
    }
  },
  {
    id: 'blr',
    city: 'Bengaluru',
    query: 'Artisan Coffee Roasters in Koramangala',
    coords: '12.9352° N, 77.6245° E',
    leadsCount: 142,
    sampleLead: {
      name: 'Bloom Specialty Espresso & Bean Lab',
      phone: '+91 98801 12093',
      rating: '4.9 ★',
      reviews: '380 reviews',
      locality: '5th Block Koramangala, Bengaluru',
      verified: true
    }
  },
  {
    id: 'tnl',
    city: 'Tenali',
    query: 'Electrical Contractors in Maruthi Nagar',
    coords: '16.2437° N, 80.6400° E',
    leadsCount: 88,
    sampleLead: {
      name: 'Sai Electricals & Industrial Power Solutions',
      phone: '+91 94402 87611',
      rating: '4.7 ★',
      reviews: '64 reviews',
      locality: 'Maruthi Nagar, Tenali',
      verified: true
    }
  }
];

const STAGES = [
  { num: 1, label: 'Radar Target Lock', desc: 'Geospatial mesh locks GPS coordinates' },
  { num: 2, label: 'Diggy Infiltration', desc: 'Mascot parachutes to coordinate epicenter' },
  { num: 3, label: 'Seismic Matrix Dig', desc: 'Golden pickaxe penetrates 5 proprietary vectors' },
  { num: 4, label: 'Lead Extraction', desc: 'Direct +91 WhatsApp mobile lines emerge' },
  { num: 5, label: 'CRM Vault Ready', desc: 'Clean, verified records loaded for 1-click dialer' }
];

export default function LiveAnimationTheater({ onDeployClick }) {
  const [activePreset, setActivePreset] = useState(SIMULATION_PRESETS[0]);
  const [stage, setStage] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [vaultCount, setVaultCount] = useState(0);

  // Simulation autoplay loop
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setStage(prev => {
        if (prev >= 5) {
          return 1;
        }
        return prev + 1;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Sync simulated lead count based on stage
  useEffect(() => {
    if (stage === 1) setVaultCount(0);
    else if (stage === 2) setVaultCount(Math.floor(activePreset.leadsCount * 0.15));
    else if (stage === 3) setVaultCount(Math.floor(activePreset.leadsCount * 0.45));
    else if (stage === 4) setVaultCount(Math.floor(activePreset.leadsCount * 0.85));
    else if (stage === 5) setVaultCount(activePreset.leadsCount);
  }, [stage, activePreset]);

  return (
    <div className="theater-card-root">
      {/* Top Cockpit Header */}
      <div className="theater-header">
        <div className="theater-title-group">
          <span className="theater-live-pill">
            <span className="theater-pulse-dot" />
            LIVE HARVEST SIMULATOR
          </span>
          <h3 className="theater-heading">Watch Diggy Dig &amp; Extract Real Leads in Real Time</h3>
          <p className="theater-sub">Select an Indian city below to see the 5-vector matrix uncover verified +91 numbers in seconds.</p>
        </div>

        {/* City Switcher Tabs */}
        <div className="theater-city-pills">
          {SIMULATION_PRESETS.map(p => (
            <button
              type="button"
              key={p.id}
              className={`theater-city-btn ${activePreset.id === p.id ? 'is-active' : ''}`}
              onClick={() => {
                setActivePreset(p);
                setStage(1);
                setIsPlaying(true);
              }}
            >
              <MapPin size={12} />
              <span>{p.city}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="theater-stage">
        {/* Radar Background Grid */}
        <div className="theater-grid-bg" />
        <div className="theater-radar-sweep" />

        {/* Floating Telemetry Box */}
        <div className="theater-telemetry-box">
          <div className="telemetry-row">
            <span className="telemetry-label">TARGET QUERY:</span>
            <b className="telemetry-val text-cyan">{activePreset.query}</b>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">GPS COORDS:</span>
            <b className="telemetry-val text-amber">{activePreset.coords}</b>
          </div>
          <div className="telemetry-row">
            <span className="telemetry-label">ACTIVE STATUS:</span>
            <b className="telemetry-val text-emerald">
              {stage === 1 && 'LOCKING RADAR GRID...'}
              {stage === 2 && 'DEPLOYING HARVESTER SCOUT...'}
              {stage === 3 && 'PENETRATING 5-VECTOR MATRIX...'}
              {stage === 4 && 'EXTRACTING VERIFIED MOBILES...'}
              {stage === 5 && 'SWARM MISSION COMPLETE!'}
            </b>
          </div>
        </div>

        {/* Center Stage: Diggy and Ground Animation */}
        <div className="theater-center-stage">
          {/* Ground Target Rings */}
          <div className="theater-target-rings">
            <div className={`radar-ring ring-1 ${stage >= 1 ? 'is-active' : ''}`} />
            <div className={`radar-ring ring-2 ${stage >= 2 ? 'is-active' : ''}`} />
            <div className={`radar-ring ring-3 ${stage >= 3 ? 'is-active' : ''}`} />
          </div>

          {/* Diggy Mascot with Dynamic 3D Articulation */}
          <div className="theater-mascot-wrap">
            <Mascot3D
              mode={
                stage === 1 ? 'idle' :
                stage === 2 ? 'fly' :
                stage === 3 ? 'dig' :
                stage === 4 ? 'dig' :
                'dance'
              }
              size={180}
              rotationY={stage === 2 ? -25 : 0}
              bubbleText={
                stage === 1 ? `Targeting ${activePreset.city}!` :
                stage === 2 ? `Rocketing to ${activePreset.city}...` :
                stage === 3 ? `Striking subsoil telecom data!` :
                stage === 4 ? `Found WhatsApp Verified Lead!` :
                `Captured ${activePreset.leadsCount} Verified Leads!`
              }
            />
          </div>

          {/* Emerged Golden Lead Card (Stage 4 & 5) */}
          <AnimatePresence>
            {stage >= 4 && (
              <motion.div
                className="theater-lead-card-popup"
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <div className="lead-card-pill">
                  <Sparkles size={12} className="text-amber" />
                  <span>UNEARTHED CONTACT RECORD</span>
                </div>
                <h4 className="lead-card-title">{activePreset.sampleLead.name}</h4>
                <div className="lead-card-meta">
                  <span className="lead-rating">{activePreset.sampleLead.rating} ({activePreset.sampleLead.reviews})</span>
                  <span className="lead-loc"><MapPin size={11} /> {activePreset.sampleLead.locality}</span>
                </div>
                <div className="lead-card-phone-strip">
                  <span className="phone-verified-badge">
                    <CheckCircle size={13} />
                    <span>WhatsApp Verified</span>
                  </span>
                  <b className="phone-number">{activePreset.sampleLead.phone}</b>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Vault Counter HUD */}
        <div className="theater-vault-hud">
          <span className="vault-hud-label">ORGANIZED CRM VAULT</span>
          <div className="vault-count-display">
            <span className="vault-num">{vaultCount}</span>
            <small>LEADS CAPTURED</small>
          </div>
          <div className="vault-progress-bar">
            <div
              className="vault-progress-fill"
              style={{ width: `${(vaultCount / activePreset.leadsCount) * 100}%` }}
            />
          </div>
          <span className="vault-status-text">
            {stage === 5 ? '✓ 100% Export Ready (VCF / CSV)' : '⚡ Real-Time Ingestion...'}
          </span>
        </div>
      </div>

      {/* Stage Timeline Stepper */}
      <div className="theater-stepper-bar">
        {STAGES.map(s => (
          <div
            key={s.num}
            className={`theater-step-item ${stage === s.num ? 'is-current' : stage > s.num ? 'is-done' : ''}`}
            onClick={() => {
              setStage(s.num);
              setIsPlaying(false);
            }}
          >
            <span className="step-dot">{stage > s.num ? '✓' : s.num}</span>
            <div className="step-info">
              <b>{s.label}</b>
              <small>{s.desc}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls & Live CTA */}
      <div className="theater-footer">
        <div className="theater-playback-controls">
          <button
            type="button"
            className="theater-ctrl-btn"
            onClick={() => setIsPlaying(prev => !prev)}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            className="theater-ctrl-btn"
            onClick={() => { setStage(1); setIsPlaying(true); }}
            title="Restart Simulation"
          >
            <RotateCcw size={14} />
            <span>Restart</span>
          </button>
        </div>

        <button
          type="button"
          className="theater-cta-btn v2-btn-deploy-3d"
          onClick={onDeployClick}
        >
          <Zap size={16} />
          <span>TRY IT WITH YOUR BUSINESS (1,000 FREE CREDITS)</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
