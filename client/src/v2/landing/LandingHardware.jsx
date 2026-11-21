import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cpu, Server, Zap, Rocket, ShieldCheck, Phone, Mail, CheckCircle2
} from 'lucide-react';
import { detectDeviceHardware, DEVICE_REQUIREMENTS } from '../utils/deviceRamEngine';
import { HardwareConcurrencyIcon } from '../components/FeatureIcons';

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
    let tier = 'T1';
    if (ram >= 64) {
      lanes = 16;
      speed = '600+ leads/min';
      tier = 'T4';
    } else if (ram >= 32) {
      lanes = 12;
      speed = '450+ leads/min';
      tier = 'T3';
    } else if (ram >= 16) {
      lanes = 8;
      speed = '300+ leads/min';
      tier = 'T2';
    } else if (ram >= 8) {
      lanes = 4;
      speed = '180+ leads/min';
      tier = 'T1';
    }
    const headroom = Math.max(4.5, (ram * 0.35)).toFixed(1);
    return { ram, lanes, speed, tier, headroom };
  }, [simulatedRamGb]);

  return (
    <div className="lx-subpage-wrap">
      {/* Page Header */}
      <section className="lx-subpage-hero">
        <div className="lx-wrap" style={{ maxWidth: 960, textAlign: 'center' }}>
          <div className="lx-eyebrow-capsule" style={{ margin: '0 auto 16px' }}>
            <Cpu size={13} />
            <span>HARDWARE CONCURRENCY · ZERO CLOUD COSTS</span>
          </div>

          <h1 className="lx-subpage-h1">
            Workstation Memory Architecture with Headroom Safety.
          </h1>

          <p className="lx-subpage-copy">
            Parallel multi-lane extraction runs directly on your machine&apos;s physical RAM with
            guaranteed operating system headroom protection. Zero cloud queue waiting lines.
          </p>
        </div>
      </section>

      {/* Interactive RAM Safety Allocator Section */}
      <section className="lx-section">
        <div className="lx-wrap" style={{ maxWidth: 1180 }}>
          <div className="lx-ram-banner">
            <div className="lx-ram-banner-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <HardwareConcurrencyIcon size={48} />
                <div>
                  <b style={{ fontSize: 20, color: '#0f172a' }}>Hardware-Governed RAM Extraction Lanes</b>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 3 }}>
                    Parallel concurrency auto-calibrates to your physical hardware with strict OS headroom protection:
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '6px 16px', borderRadius: 50,
                  background: '#eff6ff', border: '1.5px solid #bfdbfe',
                  color: '#007aff', fontSize: 12.5, fontWeight: 850
                }}
              >
                💻 Detected: {hardware.ramGb} GB RAM · {hardware.cpuCores} Cores · {hardware.parallelZones}x Parallel Lanes
              </span>
            </div>

            {/* Interactive Simulation Slider Box */}
            <div className="lx-ram-slider-box">
              <div className="lx-ram-slider-header">
                <div>
                  <strong style={{ fontSize: 14.5, color: '#0f172a' }}>Interactive Hardware Safety Calculator:</strong>
                  <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>
                    Slide to simulate extraction lanes and OS headroom across workstation RAM configurations.
                  </span>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 850, color: '#007aff', background: '#ffffff', padding: '5px 14px', borderRadius: 50, border: '1px solid #e2e8f0' }}>
                  Simulated: {simSpecs.ram} GB RAM
                </span>
              </div>

              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={simulatedRamGb}
                onChange={e => setSimulatedRamGb(Number(e.target.value))}
                className="lx-ram-slider-range"
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
                <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 750, textTransform: 'uppercase' }}>Extraction Lanes</small>
                  <div style={{ fontSize: 18, fontWeight: 850, color: '#007aff', marginTop: 3 }}>{simSpecs.lanes} Parallel Lanes</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 750, textTransform: 'uppercase' }}>OS Safety Headroom</small>
                  <div style={{ fontSize: 18, fontWeight: 850, color: '#10b981', marginTop: 3 }}>&ge; {simSpecs.headroom} GB Buffer</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 750, textTransform: 'uppercase' }}>Peak Mining Rate</small>
                  <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', marginTop: 3 }}>{simSpecs.speed}</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 750, textTransform: 'uppercase' }}>Crash Protection</small>
                  <div style={{ fontSize: 18, fontWeight: 850, color: '#059669', marginTop: 3 }}>Guaranteed Fluid</div>
                </div>
              </div>
            </div>

            {/* 4 Hardware Requirements Tiers */}
            <div className="lx-req-grid">
              {DEVICE_REQUIREMENTS.map(req => (
                <div key={req.tier} className={`lx-req-card ${req.tier === hardware.tier ? 'is-matched' : ''}`}>
                  <span className="lx-req-badge">{req.badge}{req.tier === hardware.tier ? ' · DETECTED MATCH' : ''}</span>
                  <b>{req.ram} · {req.cpu}</b>
                  <small style={{ color: '#047857', fontWeight: 850 }}>{req.parallelZones} Parallel Zones · {req.speed}</small>
                  <p>{req.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dual Cartridge Operating Modes */}
      <section className="lx-section lx-section-alt">
        <div className="lx-wrap" style={{ maxWidth: 1180 }}>
          <div className="lx-sec-head">
            <span className="lx-kicker"><Server size={13} /> Dual Operating Modes</span>
            <h2>Client Workspace &amp; Master Territory Intelligence</h2>
            <p>
              Self-serve immediate micro-zone searches in your browser, or let our Master Intelligence Desk
              deliver entire nationwide datasets.
            </p>
          </div>

          <div className="lx-dual-cartridge-grid">
            {/* Cartridge 01: Client Workspace Edition */}
            <article className="lx-cartridge-panel is-client">
              <span className="lx-cartridge-tag is-client">CARTRIDGE 01 · CLIENT WORKSPACE EDITION</span>
              <h3>Instant City, Town, Mandal &amp; County Leads</h3>
              <p>
                Built for startups, sales reps, and growth agencies. Select any of the 11 global markets,
                type a query, and stream verified phone numbers straight into Excel. Works locally on your
                machine with zero setup.
              </p>
              <ul className="lx-story-bullets">
                <li><CheckCircle2 size={15} color="#10b981" /> All 22 Discovery Engines running in parallel</li>
                <li><CheckCircle2 size={15} color="#10b981" /> 100% HD Satellite Live Zone Radar across 11 nations</li>
                <li><CheckCircle2 size={15} color="#10b981" /> Clean, deduplicated Excel (.xlsx), CSV &amp; Phone (.vcf) exports</li>
              </ul>
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  onClick={() => navigate('/command?country=IN')}
                >
                  <Rocket size={15} /> Launch Client Workspace
                </button>
                <button
                  type="button"
                  className="lx-btn-local-engine"
                  onClick={() => navigate('/command?country=IN&mode=local')}
                >
                  <Zap size={14} /> Run on Local Server
                </button>
              </div>
            </article>

            {/* Cartridge 02: Master Territory Intelligence Edition */}
            <article className="lx-cartridge-panel is-master">
              <span className="lx-cartridge-tag is-master">CARTRIDGE 02 · MASTER TERRITORY INTELLIGENCE</span>
              <h3>Entire Districts, Full States &amp; Complete Web Rollouts</h3>
              <p>
                Need every business across an entire District, County, State, or Nationwide territory?
                Our Master Edition gathers verified datasets from every public website, trade catalog, and
                corporate registry across the internet and delivers clean master workbooks.
              </p>
              <div className="lx-contact-slots" style={{ marginTop: 'auto' }}>
                <div className="lx-contact-slot" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Phone size={18} color="#10b981" />
                  <div>
                    <small style={{ color: '#64748b' }}>DIRECT MOBILE &amp; WHATSAPP DESK</small>
                    <b style={{ color: '#0f172a' }}>Priority Access Desk</b>
                  </div>
                </div>
                <div className="lx-contact-slot" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Mail size={18} color="#007aff" />
                  <div>
                    <small style={{ color: '#64748b' }}>ENTERPRISE DISPATCH EMAIL</small>
                    <b style={{ color: '#0f172a' }}>support@scraper.co.in</b>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
