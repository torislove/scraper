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

/**
 * MasterVsClientShowcase
 * Big, animated dual-edition architecture comparison explaining the clear operational
 * difference between the private Client Cockpit and the central Master Fleet Command.
 */
export default function MasterVsClientShowcase() {
  const navigate = useNavigate();

  const handleLaunchClient = () => {
    navigate('/command?country=IN');
  };

  const handleLaunchMaster = () => {
    // Navigate to Master portal (port 5174 in dev, or /admin in production)
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      window.open('http://localhost:5174/', '_blank');
    } else {
      window.open('/admin', '_blank');
    }
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
          <span>DUAL-WORKSPACE ARCHITECTURE · SELECT YOUR OPERATIONAL EDITION</span>
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
        Two Distinct Editions.{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Built for Specific Operational Needs.
        </span>
      </h2>

      <p style={{ fontSize: 12.5, color: '#475569', maxWidth: '64ch', margin: '0 auto 16px', lineHeight: 1.45 }}>
        Choose between a private outbound machine running on your local computer, or an executive centralized
        master command that aggregates data across all connected client runners.
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
                    Edition 01 · Local Outbound
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    CLIENT WORKSPACE
                  </h3>
                </div>
              </div>

              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                PRIVATE &amp; LOCAL
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#334155', fontWeight: 650, margin: '0 0 10px', lineHeight: 1.4 }}>
              Your Private Local Outbound Machine for Solo Founders, Sales Reps, Agencies &amp; Businesses.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <ShieldCheck size={14} color="#059669" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>100% Machine Privacy:</strong> All scraped leads stay private on your local computer. Never leaked or shared.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Cpu size={14} color="#059669" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Zero Server RAM Markups:</strong> Crawls natively via your browser extension using your device RAM &amp; residential IP.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Zap size={14} color="#059669" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Instant Outreach:</strong> Direct WhatsApp messaging, 1-click Excel (.xlsx), CSV, and vCard phonebook sync.</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <LiquidButton3D
              variant="emerald"
              size="md"
              icon={Laptop}
              pulse
              onClick={handleLaunchClient}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Launch Client Cockpit (Private)
            </LiquidButton3D>
          </div>
        </motion.div>

        {/* EDITION 2: MASTER FLEET EDITION (Cyan/Indigo Theme) */}
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
                    Edition 02 · Central Hub
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    MASTER FLEET EDITION
                  </h3>
                </div>
              </div>

              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
                ADMIN &amp; OPERATORS
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#334155', fontWeight: 650, margin: '0 0 10px', lineHeight: 1.4 }}>
              Central Fleet Command &amp; Multi-Tenant Data Aggregator for Operators &amp; Agency Networks.
            </p>

            {/* Feature Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Database size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Global Fleet Data Vault:</strong> Collects &amp; aggregates all scraped leads from master, clients, and customer tenants.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Globe2 size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Fleet Orchestration:</strong> Orchestrates the 22 cloud discovery engines, manages client quotas, and audits fleet health.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Users size={14} color="#0891b2" style={{ marginTop: 2, flex: 'none' }} />
                <span><strong>Multi-Tenant Telemetry:</strong> Live ingestion velocity, global deduplicated exports, and remote client diagnostics.</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <LiquidButton3D
              variant="cyan"
              size="md"
              icon={Server}
              onClick={handleLaunchMaster}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Access Master Fleet Command (Admin)
            </LiquidButton3D>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
