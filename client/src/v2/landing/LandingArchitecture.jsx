import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Globe2, Layers, Rocket, ShieldCheck } from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import PortalConnectivityFlow from '../components/PortalConnectivityFlow';
import { isMasterRuntime, openClientWorkspace, openMasterWorkspace } from '../utils/editionSwitch';

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'City & Zone Grid Split',
    desc: 'Decomposes metro cities, districts & mandals into non-overlapping geo sectors to beat 120-result caps.',
    icon: Globe2,
    color: '#059669'
  },
  {
    step: '02',
    title: 'Parallel Multi-Engine Run',
    desc: 'Queries Maps, trade directories & open websites concurrently with adaptive zero-drop pacing.',
    icon: Cpu,
    color: '#d97706'
  },
  {
    step: '03',
    title: 'MOB / STD & 3D Social Enrich',
    desc: 'Classifies mobile vs landline phones, extracts WhatsApp/IG/FB/LI handles & validates official domains.',
    icon: Layers,
    color: '#0284c7'
  },
  {
    step: '04',
    title: 'Live SSE Stream & Vault',
    desc: 'Streams verified pins & lead cards live to Client or Master folders with instant .xlsx & .vcf export.',
    icon: Database,
    color: '#92400e'
  }
];

export default function LandingArchitecture() {
  const navigate = useNavigate();
  const masterActive = isMasterRuntime();

  const handleLaunch = () => {
    if (masterActive) openMasterWorkspace(navigate, '/command?country=IN');
    else openClientWorkspace(navigate, '/command?country=IN');
  };

  return (
    <div className="lx-screen-container lx-arch-shell">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="lx-highlight-tag">
          <Activity size={13} color="#d97706" />
          <span>SERVER CONNECTIVITY &amp; PORTAL TOPOLOGY</span>
        </span>
      </motion.div>

      <div style={{ maxWidth: 900 }}>
        <h1 className="lx-kinetic-title">
          Three Dedicated Portals.{' '}
          <span className="lx-gradient-text">One Real-Time Engine Server.</span>
        </h1>
        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Client Cockpit, Master Fleet, and Admin Console connect directly to the Core API Engine over HTTPS REST and Live SSE—with real-time latency diagnostics built right in.
        </p>
      </div>

      {/* Interactive Animated Portal <-> Server Connectivity Mesh */}
      <PortalConnectivityFlow />

      {/* Clean 4-Stage Pipeline Strip */}
      <div className="lx-arch-steps-grid">
        {PIPELINE_STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="lx-golden-glass-card lx-arch-step-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="lx-arch-step-num">{item.step}</span>
                <Icon size={15} color={item.color} />
              </div>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={handleLaunch}
        >
          {masterActive ? 'Open Master Command' : 'Open Client Command Center'}
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          onClick={() => navigate('/global-coverage')}
        >
          Explore 11 Markets →
        </LiquidButton3D>
      </div>

      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <ShieldCheck size={13} color="#059669" />
          <span>Role-Scoped Sessions (Client · Master · Admin)</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Live /api/health Monitoring</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Instant Delta Sync Across Reloads</span>
        </span>
      </div>
    </div>
  );
}
