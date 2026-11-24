import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Server, Zap, Rocket, ShieldCheck, CheckCircle2, Puzzle, Cloud, Lock, Building } from 'lucide-react';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeHardwareProcessor3D from '../components/three/ThreeHardwareProcessor3D';
import RollingCounter from '../components/RollingCounter';

export default function LandingHardware() {
  const navigate = useNavigate();
  const hardware = useMemo(() => detectDeviceHardware(), []);
  const [simulatedRamGb, setSimulatedRamGb] = useState(16);

  useEffect(() => {
    if (hardware && hardware.ramGb) {
      setSimulatedRamGb(hardware.ramGb);
    }
  }, [hardware]);

  const simSpecs = useMemo(() => {
    const ram = Number(simulatedRamGb) || 16;
    let lanes = 2;
    let speed = '120 leads/min';
    let speedNum = 120;
    let tier = 'T1 Basic';
    let citiesConcurrent = '4 Cities in Parallel';
    if (ram >= 64) {
      lanes = 16;
      speed = '600+ leads/min';
      speedNum = 600;
      tier = 'T4 Extreme';
      citiesConcurrent = '32 Cities in Parallel';
    } else if (ram >= 32) {
      lanes = 12;
      speed = '450+ leads/min';
      speedNum = 450;
      tier = 'T3 Professional';
      citiesConcurrent = '24 Cities in Parallel';
    } else if (ram >= 16) {
      lanes = 8;
      speed = '300+ leads/min';
      speedNum = 300;
      tier = 'T2 Standard';
      citiesConcurrent = '16 Cities in Parallel';
    } else if (ram >= 8) {
      lanes = 4;
      speed = '180+ leads/min';
      speedNum = 180;
      tier = 'T1 Edge Core';
      citiesConcurrent = '8 Cities in Parallel';
    }
    const headroom = Math.max(4.5, ram * 0.35).toFixed(1);
    return { ram, lanes, speed, speedNum, tier, headroom, citiesConcurrent };
  }, [simulatedRamGb]);

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="lx-highlight-tag">
          <Cpu size={13} />
          <span>✦ DISTRIBUTED CLIENT-SIDE COMPUTE ARCHITECTURE</span>
        </span>
      </motion.div>

      {/* 2. Headline & Simple Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          Cloud Brain. Your Browser.{' '}
          <span className="lx-gradient-text">Zero Server Queues.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Cloud orchestration plans the geographic grid while your local browser executes parallel discovery lanes directly on your machine—delivering low latency and private execution.
        </p>
      </div>

      {/* 3. Interactive Stage: 3D Microchip + 3 Architecture Pillars with Laser Border-Beam */}
      <motion.div
        className="lx-hardware-stage lx-border-beam-box"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'center' }}>
          {/* Left: 3D WebGL Motherboard & RAM Banks */}
          <div style={{ height: 215, width: '100%', position: 'relative', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <ThreeHardwareProcessor3D simulatedRamGb={simSpecs.ram} parallelLanes={simSpecs.lanes} />
            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
              <span>Live RAM Concurrency Model</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>{simSpecs.citiesConcurrent}</span>
            </div>
          </div>

          {/* Right: The 3 Architecture Pillars in Simple Language */}
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Pillar 1: Cloud Server Brain */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 2 }}>
                <Cloud size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>
                  1. Cloud AI Coordinates the Search
                </strong>
                <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.35, display: 'block' }}>
                  Our central server coordinates 22 discovery sources, scans 40,000+ cities, and strips off-topic noise before scraping.
                </span>
              </div>
            </div>

            {/* Pillar 2: Local Hardware RAM */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #a7f3d0', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 2 }}>
                <Cpu size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 12, color: '#065f46', display: 'block' }}>
                  2. Your Browser Sweeps Locally
                </strong>
                <span style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.35, display: 'block' }}>
                  Your computer renders search results natively across <strong>{simSpecs.citiesConcurrent}</strong> using your unmetered connection with zero bot blocks.
                </span>
              </div>
            </div>

            {/* Pillar 3: Zero Server Markup */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 2 }}>
                <Zap size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>
                  3. Private Local Execution &amp; Full Speed
                </strong>
                <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.35, display: 'block' }}>
                  Zero shared server queues, native residential routing, and complete data privacy directly on your workstation.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Device Hardware Status Bar with Slider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '8px 14px', borderRadius: 12, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>Simulate Local Device RAM:</span>
            {[8, 16, 32, 64].map(ram => (
              <button
                key={ram}
                type="button"
                onClick={() => setSimulatedRamGb(ram)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: simulatedRamGb === ram ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                  background: simulatedRamGb === ram ? '#ffffff' : '#f8fafc',
                  color: simulatedRamGb === ram ? '#047857' : '#64748b',
                  fontWeight: 800,
                  fontSize: 10.5,
                  cursor: 'pointer'
                }}
              >
                {ram} GB
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Concurrency: <strong style={{ color: '#047857' }}>{simSpecs.lanes} Parallel Lanes</strong></span>
            <span>Speed: <strong style={{ color: '#0284c7' }}>{simSpecs.speed}</strong></span>
            <span>Concurrent Cities: <strong style={{ color: '#059669' }}>{simSpecs.citiesConcurrent}</strong></span>
          </div>
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command')}
        >
          Activate Precision Engine Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          onClick={() => navigate('/story')}
        >
          Explore 20% Strategic Equity Allocation →
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ Zero Shared Server Queues</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Hardware-Adaptive Parallel Lanes</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Multi-City Concurrent Workers</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ 100% Machine Private Execution</span>
        </span>
      </div>
    </div>
  );
}
