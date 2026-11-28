import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  Server,
  ShieldCheck,
  Zap,
  Lock,
  Globe2,
  Database,
  ArrowRight,
  ExternalLink,
  Layers,
  Cpu,
  Users
} from 'lucide-react';
import LiquidButton3D from './LiquidButton3D';
import { useExtension } from '../context/ExtensionContext';
import { openClientWorkspace, openMasterWorkspace } from '../utils/editionSwitch';

/**
 * MasterVsClientShowcase
 * Big, animated dual-edition architecture comparison explaining the clear operational
 * difference between the private Client Cockpit and the central Master Fleet Command.
 */
export default function MasterVsClientShowcase() {
  const navigate = useNavigate();
  const { ensureConnected } = useExtension() || {};

  const handleLaunchClient = () => {
    openClientWorkspace(navigate, '/command?country=IN', ensureConnected);
  };

  const handleLaunchMaster = () => {
    openMasterWorkspace(navigate, '/command?country=IN');
  };

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1px solid #a7f3d0',
            color: '#047857'
          }}
        >
          <Layers size={12} />
          <span>DUAL-SCRAPER FLEET ARCHITECTURE · MASTER (5 MARKETS) &amp; CLIENT</span>
        </span>
      </div>

      {/* Big Animated Section Title */}
      <h2
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 'clamp(20px, 2.5vw, 32px)',
          fontWeight: 850,
          color: '#0f172a',
          margin: '0 0 6px',
          letterSpacing: '-0.025em'
        }}
      >
        Two Distinct Scrapers.{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Engineered for Pure Data Acquisition.
        </span>
      </h2>

      <p style={{ fontSize: 12.5, color: '#475569', maxWidth: '64ch', margin: '0 auto 16px', lineHeight: 1.45 }}>
        Choose between the Client Cockpit for targeted local city sweeps, or the Master Scraper running district- &amp; state-scale sweeps across all 5 active revenue markets (IN, US, GB, AU, AE).
      </p>

      {/* Side-by-Side Dual Edition Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          textAlign: 'left'
        }}
      >
        {/* EDITION 1: CLIENT EDITION (Emerald Theme) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #10b981',
            borderRadius: 18,
            padding: '18px 20px',
            boxShadow: '0 12px 32px -8px rgba(16, 185, 129, 0.14)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #10b981, #059669)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Laptop size={19} />
                </div>
                <div>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Edition 01 · Local Client Engine
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    CLIENT COCKPIT
                  </h3>
                </div>
              </div>

              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                LOCAL &amp; FOCUSED
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#334155', fontWeight: 650, margin: '0 0 10px', lineHeight: 1.4 }}>
              Streamlined client-tier scraper for targeted local business discovery, verified phone extraction, and CRM exports.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <ShieldCheck size={14} color="#059669" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Targeted City Searches:</strong> Clean single-city and mandal scans with 15–25 zone concurrency.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Zap size={14} color="#059669" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Zero-Knowledge Privacy:</strong> Direct local-to-browser execution with no centralized tracking.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Lock size={14} color="#D97706" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Verified Export Safeguards:</strong> Automated carrier filtering, WhatsApp readiness tags, and structured Excel output.</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <LiquidButton3D
              variant="gold"
              size="md"
              icon={Laptop}
              onClick={handleLaunchClient}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Launch Client Cockpit
            </LiquidButton3D>
          </div>
        </motion.div>

        {/* EDITION 2: MASTER SCRAPER (Cyan/Indigo Theme) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #06b6d4',
            borderRadius: 18,
            padding: '18px 20px',
            boxShadow: '0 12px 32px -8px rgba(6, 182, 212, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Server size={19} />
                </div>
                <div>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0891b2', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Edition 02 · Master Scraper
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    MASTER SCRAPER (5 MARKETS)
                  </h3>
                </div>
              </div>

              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
                UNMETERED · 5 MARKETS
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#334155', fontWeight: 650, margin: '0 0 10px', lineHeight: 1.4 }}>
              Flagship High-Throughput District &amp; State Scraper Across All 5 Revenue Markets.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Globe2 size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>5 Active Revenue Markets:</strong> Full coverage for India (IN), USA (US), UK (GB), Australia (AU), and UAE (AE).</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Zap size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Unmetered Territorial Sweeps:</strong> State-wide and district-wide multi-zone parallel extraction without rate limits.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Database size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Parallel Multi-Engine Extraction:</strong> Google Maps RPC, Geo-Pinned JustDial, QLever OSM, Website Crawl &amp; Social Enrichment.</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <LiquidButton3D
              variant="obsidian"
              size="md"
              icon={Server}
              onClick={handleLaunchMaster}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Launch Master Scraper (5 Markets)
            </LiquidButton3D>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
