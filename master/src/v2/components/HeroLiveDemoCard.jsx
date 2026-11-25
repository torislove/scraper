import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Radar,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Social3DIcon } from './icons/Social3DIcons';

const BEATS = [
  {
    id: 'scan',
    step: '01',
    label: 'Zone Grid Scan',
    badge: 'Mumbai · Bandra West · Zone 14/45',
    metric: '4.9★ (312 reviews)'
  },
  {
    id: 'contacts',
    step: '02',
    label: 'Phone & Landline Split',
    badge: 'Direct +91 MOB · STD Landline Verified',
    metric: '98% Contact Hit'
  },
  {
    id: 'social',
    step: '03',
    label: '3D Social Enrichment',
    badge: 'WA · IG · FB · LI · Tax ID Live',
    metric: '52 Fields Ready'
  }
];

export default function HeroLiveDemoCard({ isMaster = false }) {
  const [beatIdx, setBeatIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setBeatIdx((prev) => (prev + 1) % BEATS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [paused]);

  const beat = BEATS[beatIdx];

  return (
    <motion.div
      className="lx-golden-glass-card lx-hero-demo-card"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Golden specular top accent */}
      <div className="lx-hero-demo-shine" aria-hidden="true" />

      {/* Header bar */}
      <div className="lx-hero-demo-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="lx-status-dot-pulse" />
          <span className="lx-hero-demo-eyebrow">
            {isMaster ? 'MASTER FLEET TELEMETRY PREVIEW' : 'LIVE ENRICHMENT STREAM'}
          </span>
        </div>
        <span className="lx-hero-demo-pill">{beat.metric}</span>
      </div>

      {/* Interactive 3-beat progress selector */}
      <div className="lx-hero-demo-beats" role="tablist" aria-label="Extraction workflow stages">
        {BEATS.map((item, idx) => {
          const active = idx === beatIdx;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`lx-hero-beat-btn ${active ? 'is-active' : ''}`}
              onClick={() => setBeatIdx(idx)}
            >
              <span className="lx-hero-beat-num">{item.step}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Business Record Preview */}
      <div className="lx-hero-record">
        <div className="lx-hero-record-top">
          <div style={{ minWidth: 0 }}>
            <div className="lx-hero-record-title">
              Atelier Aura Interior Studio Pvt. Ltd.
            </div>
            <div className="lx-hero-record-loc">
              <MapPin size={12} color="#d97706" />
              <span>19.0596° N, 72.8295° E · Bandra West, Mumbai 400050</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.span
              key={beat.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22 }}
              className="lx-hero-radar-tag"
            >
              <Radar size={12} color="#b45309" />
              <span>{beat.badge}</span>
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Contact Grid: Mobile + Landline + Web + Mail */}
        <div className="lx-hero-contact-grid">
          <motion.div
            animate={{
              borderColor: beatIdx >= 1 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(217, 119, 6, 0.2)',
              backgroundColor: beatIdx >= 1 ? 'rgba(236, 253, 245, 0.85)' : 'rgba(255, 255, 255, 0.9)'
            }}
            transition={{ duration: 0.35 }}
            className="lx-hero-contact-cell"
          >
            <span className="lx-hero-tag-mob">MOB</span>
            <Phone size={12} color="#059669" />
            <strong>+91 98204 71920</strong>
          </motion.div>

          <motion.div
            animate={{
              borderColor: beatIdx >= 1 ? 'rgba(14, 116, 144, 0.4)' : 'rgba(217, 119, 6, 0.2)',
              backgroundColor: beatIdx >= 1 ? 'rgba(240, 249, 255, 0.88)' : 'rgba(255, 255, 255, 0.9)'
            }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="lx-hero-contact-cell"
          >
            <span className="lx-hero-tag-std">STD</span>
            <Phone size={12} color="#0284c7" />
            <strong>022-2640-8114</strong>
          </motion.div>

          <div className="lx-hero-contact-cell">
            <Globe size={12} color="#d97706" />
            <span>atelieraura.in</span>
          </div>

          <div className="lx-hero-contact-cell">
            <Mail size={12} color="#b45309" />
            <span>hello@atelieraura.in</span>
          </div>
        </div>

        {/* 3D Social Media Row */}
        <div className="lx-hero-social-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'whatsapp', text: 'WA Chat' },
              { key: 'instagram', text: '42.4K' },
              { key: 'facebook', text: 'FB' },
              { key: 'linkedin', text: 'IN' },
              { key: 'youtube', text: 'YT' }
            ].map((item, idx) => (
              <motion.span
                key={item.key}
                initial={{ scale: 0.92, opacity: 0.8 }}
                animate={{
                  scale: beatIdx === 2 ? [1, 1.08, 1] : 1,
                  opacity: 1
                }}
                transition={{
                  duration: 0.45,
                  delay: beatIdx === 2 ? idx * 0.07 : 0
                }}
                className="lx-hero-social-chip"
              >
                <Social3DIcon platform={item.key} size={18} animated={beatIdx === 2} delayMs={idx * 90} />
                <span>{item.text}</span>
              </motion.span>
            ))}
          </div>

          <span className="lx-hero-gst-chip">
            <CheckCircle2 size={11} color="#059669" />
            <span>GSTIN Verified</span>
          </span>
        </div>
      </div>

      {/* Footer export reassurance */}
      <div className="lx-hero-demo-foot">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <ShieldCheck size={13} color="#059669" />
          <span>Zero API Keys Required · Instant .XLSX / .CSV / .VCF</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#92400e', fontWeight: 800 }}>
          <Sparkles size={12} color="#d97706" />
          <span>Hover to Pause</span>
        </span>
      </div>
    </motion.div>
  );
}
