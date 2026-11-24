import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Play,
  RotateCcw,
  Radio,
  Globe2
} from 'lucide-react';
import LiquidButton3D from './LiquidButton3D';

const PROGRESSION_STEPS = [
  {
    step: 1,
    id: 'lock',
    title: '1. Territory & Query Lock',
    badge: 'Micro-Coordinates',
    color: '#10b981',
    bg: '#ecfdf5',
    icon: MapPin,
    headline: 'Locks exact geospatial boundary across 11 nations',
    detail: 'Rather than running vague, broad queries, the engine anchors the latitude, longitude, and administrative bounds down to mandals, wards, ZIP codes, and industrial sectors.',
    statLabel: 'Boundary Precision',
    statVal: 'Mandal & Ward Level'
  },
  {
    step: 2,
    id: 'subdivide',
    title: '2. Micro-Grid Hexagon Division',
    badge: 'Conquers Map Caps',
    color: '#06b6d4',
    bg: '#ecfeff',
    icon: Layers,
    headline: 'Splits territory into geometric sub-zones',
    detail: 'Google Maps and directories cap search results at 120 places per query. Our micro-grid subdivider splits a city or district into 15–30 overlapping radial micro-zones to extract every single unlisted business.',
    statLabel: 'Search Cap Multiplier',
    statVal: '15x to 30x Depth'
  },
  {
    step: 3,
    id: 'parallel',
    title: '3. 22 Engines Fire In Parallel',
    badge: 'Zero Sequential Waiting',
    color: '#3b82f6',
    bg: '#eff6ff',
    icon: Zap,
    headline: 'All 22 specialized engines execute simultaneously',
    detail: 'Zero waiting for one directory after another. Mapping nodes, OpenStreetMap, corporate registrars (MCA, Companies House), and local trade directories run at the same millisecond.',
    statLabel: 'Concurrent Throughput',
    statVal: '22 Cores Synchronized'
  },
  {
    step: 4,
    id: 'social',
    title: '4. Deep Website & Social Crawl',
    badge: 'IG · FB · X · TikTok',
    color: '#d6249f',
    bg: '#fdf2f8',
    icon: Sparkles,
    headline: 'Crawls official websites and unauthenticated social footprints',
    detail: 'Extracts direct mobile numbers, verified WhatsApp links, Instagram follower counts, Facebook reviews, Twitter/X bios, and TikTok metrics with zero login credentials required.',
    statLabel: 'Decision-Maker Reach',
    statVal: 'Direct WhatsApp + Bio Links'
  },
  {
    step: 5,
    id: 'dedup',
    title: '5. Triple Dedupe & Phone Scoring',
    badge: '100% Zero Duplicates',
    color: '#f59e0b',
    bg: '#fffbeb',
    icon: ShieldCheck,
    headline: 'L1-L3 phone classification & mathematical deduplication',
    detail: 'Removes dead landlines, normalizes international E.164 formats, and scores phones (L1 WhatsApp Direct, L2 Mobile, L3 Landline) while merging multi-source records into one verified profile.',
    statLabel: 'Deduplication Rate',
    statVal: '100% Unique Verified Leads'
  },
  {
    step: 6,
    id: 'export',
    title: '6. Master Sync & Instant Export',
    badge: 'Excel · CSV · VCF',
    color: '#059669',
    bg: '#f0fdf4',
    icon: FileSpreadsheet,
    headline: 'Immediate 1-click download and Master Data Lake synchronization',
    detail: 'Leads are instantly available in your Client Cockpit with 1-click Excel (.xlsx), CSV, and WhatsApp VCF phonebook export, while permanently updating the central Master database.',
    statLabel: 'Export Formats',
    statVal: 'Excel, CSV, WhatsApp VCF'
  }
];

export default function ScrapeProgressionFlow({ onLaunch }) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStepIdx(prev => (prev + 1) % PROGRESSION_STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStep = PROGRESSION_STEPS[activeStepIdx];
  const StepIcon = currentStep.icon;

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', textAlign: 'left' }}>
      {/* Top Controls: Status pill + Play/Pause */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
            PARALLEL SCRAPE PIPELINE · HOW IT PROCEEDS IN REAL-TIME
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 11,
              fontWeight: 750,
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {isPlaying ? '⏸ Pause Pipeline Animation' : '▶ Play Pipeline Animation'}
          </button>
          <button
            type="button"
            onClick={() => setActiveStepIdx(0)}
            style={{
              padding: '4px 8px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 11,
              color: '#64748b',
              cursor: 'pointer'
            }}
            title="Reset to Step 1"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* 6-Step Interactive Horizontal Timeline */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 8,
          marginBottom: 16
        }}
      >
        {PROGRESSION_STEPS.map((s, idx) => {
          const isActive = idx === activeStepIdx;
          const isPassed = idx < activeStepIdx;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveStepIdx(idx);
                setIsPlaying(false);
              }}
              style={{
                background: isActive ? '#ffffff' : isPassed ? '#f8fafc' : '#ffffff',
                border: isActive ? `2px solid ${s.color}` : isPassed ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: isActive ? `0 6px 16px -4px ${s.color}35` : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: isActive ? s.color : '#64748b' }}>
                  STEP 0{s.step}
                </span>
                {isPassed && <CheckCircle2 size={12} color="#10b981" />}
              </div>
              <strong style={{ fontSize: 11, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.title.replace(/^\d+\.\s*/, '')}
              </strong>
            </button>
          );
        })}
      </div>

      {/* Active Step Detailed Stage Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28 }}
          style={{
            background: currentStep.bg,
            border: `2px solid ${currentStep.color}50`,
            borderRadius: 18,
            padding: '22px 24px',
            boxShadow: `0 14px 32px -10px ${currentStep.color}25`,
            position: 'relative'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(220px, 1fr)', gap: 20, alignItems: 'center' }}>
            {/* Left: Step Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#ffffff',
                    border: `1.5px solid ${currentStep.color}`,
                    color: currentStep.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                  }}
                >
                  <StepIcon size={20} />
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: currentStep.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {currentStep.badge}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    {currentStep.title}
                  </h3>
                </div>
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 750, color: '#334155' }}>
                {currentStep.headline}
              </h4>

              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.55 }}>
                {currentStep.detail}
              </p>
            </div>

            {/* Right: Telemetry & Parallel Proof */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid rgba(226,232,240,0.9)',
                borderRadius: 14,
                padding: '14px 16px',
                boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Pipeline Metric:</span>
                <span style={{ fontWeight: 800, color: currentStep.color }}>{currentStep.statLabel}</span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 850, color: '#0f172a', padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                {currentStep.statVal}
              </div>

              <div style={{ fontSize: 10.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <CheckCircle2 size={13} color="#10b981" />
                <span>Runs automatically in every business sweep</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
