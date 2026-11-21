import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Server, Zap, Rocket, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { detectDeviceHardware } from '../utils/deviceRamEngine';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeHardwareProcessor3D from '../components/three/ThreeHardwareProcessor3D';

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
    let tier = 'T1 Basic';
    if (ram >= 64) {
      lanes = 16;
      speed = '600+ leads/min';
      tier = 'T4 Extreme';
    } else if (ram >= 32) {
      lanes = 12;
      speed = '450+ leads/min';
      tier = 'T3 Professional';
    } else if (ram >= 16) {
      lanes = 8;
      speed = '300+ leads/min';
      tier = 'T2 Standard';
    } else if (ram >= 8) {
      lanes = 4;
      speed = '180+ leads/min';
      tier = 'T1 Starter';
    }
    const headroom = Math.max(4.5, ram * 0.35).toFixed(1);
    return { ram, lanes, speed, tier, headroom };
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
          <span>ZERO CLOUD QUEUE LATENCY · 100% PRIVATE HARDWARE ENGINE</span>
        </span>
      </motion.div>

      {/* 2. Headline & Simple Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          Your Workstation Drives the Speed.{' '}
          <span className="lx-gradient-text">Safely.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          No waiting in shared cloud queues. The engine checks your computer's RAM, locks a safe 4.5 GB buffer
          so your PC stays butter-smooth, and uses the rest for parallel multi-core scraping.
        </p>
      </div>

      {/* 3. Interactive 3D WebGL Hardware Processor Stage */}
      <motion.div
        className="lx-hardware-stage"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'center' }}>
          {/* Left: 3D WebGL Motherboard & RAM Banks */}
          <div style={{ height: 210, width: '100%', position: 'relative', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <ThreeHardwareProcessor3D simulatedRamGb={simSpecs.ram} parallelLanes={simSpecs.lanes} />
            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
              <span>🖱️ Drag to inspect 3D Silicon Wafer</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>{simSpecs.lanes} Parallel Lanes Active</span>
            </div>
          </div>

          {/* Right: Telemetry & Interactive Slider */}
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '4px 0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 850, color: '#0f172a' }}>Simulate System RAM:</span>
                <span style={{ fontSize: 14, fontWeight: 850, color: '#047857', background: '#ecfdf5', padding: '2px 10px', borderRadius: 999 }}>
                  {simSpecs.ram} GB RAM
                </span>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="8"
                max="64"
                step="8"
                value={simulatedRamGb}
                onChange={(e) => setSimulatedRamGb(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer', marginBottom: 14 }}
              />

              {/* Dynamic Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Extraction Concurrency</span>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>{simSpecs.lanes}x Parallel Lanes</strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Estimated Speed</span>
                  <strong style={{ fontSize: 14, color: '#059669' }}>{simSpecs.speed}</strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Hardware Tier</span>
                  <strong style={{ fontSize: 14, color: '#0284c7' }}>{simSpecs.tier}</strong>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', display: 'block' }}>Guaranteed OS Headroom</span>
                  <strong style={{ fontSize: 14, color: '#d97706' }}>&ge; {simSpecs.headroom} GB Free</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginTop: 12 }}>
              <ShieldCheck size={13} color="#10b981" />
              <span>Detected Device: {hardware.ramGb} GB RAM · {hardware.cpuCores} CPU Cores</span>
            </div>
          </div>
        </div>

        {/* Multi-Lane Concurrency Strip */}
        <div className="lx-ram-lanes-track">
          {Array.from({ length: 8 }, (_, idx) => {
            const isActive = idx < simSpecs.lanes;
            return (
              <div key={idx} className={`lx-ram-lane-pipe ${isActive ? 'is-active' : ''}`}>
                <span>Lane 0{idx + 1}</span>
                {isActive && <div className="lx-ram-lane-pulse" />}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="emerald"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate('/command?country=IN')}
        >
          Launch Full-Speed Workstation Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="ghost"
          size="lg"
          onClick={() => navigate('/')}
        >
          ← Return to Overview
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ Guaranteed &ge; 4.5 GB Headroom</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Up to 16x Hardware Lanes</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ 100% On-Device Memory Privacy</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Zero Cloud Queue Throttle</span>
        </span>
      </div>
    </div>
  );
}
