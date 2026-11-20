import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Cpu, Globe2, Mail, Phone, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import BrandLogo from '../v2/components/BrandLogo';
import {
  detectDeviceHardware, DEVICE_REQUIREMENTS, THREE_BUILTIN_ENGINES
} from '../v2/utils/deviceRamEngine';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For local businesses & solo sales professionals',
    monthly: '₹1,499',
    annual: '₹1,199',
    billingMonthly: 'Billed monthly · Cancel anytime',
    billingAnnual: 'Billed annually · Save 20%',
    tone: 'teal',
    accentColor: '#0284c7',
    accentBorder: 'rgba(6, 182, 212, 0.38)',
    ctaBg: 'linear-gradient(135deg, #0284c7, #06b6d4)',
    ctaLip: '#0369a1',
    cta: 'Start Starter Plan',
    features: [
      '2,000 verified business leads / month',
      'Direct phone numbers, websites & addresses',
      'Live interactive territory map',
      'Saved search folders & automatic deduplication',
      '1-click Excel (.xlsx), CSV & phone (.vcf) export',
      'Full India coverage down to towns & villages'
    ]
  },
  {
    id: 'pro',
    name: 'Growth',
    tagline: 'Most popular for agencies & growing sales teams',
    monthly: '₹3,999',
    annual: '₹3,199',
    billingMonthly: 'Billed monthly · Cancel anytime',
    billingAnnual: 'Billed annually · Save 20%',
    highlight: true,
    badge: 'MOST POPULAR',
    tone: 'atomic',
    accentColor: '#7c3aed',
    accentBorder: 'rgba(124, 58, 237, 0.45)',
    ctaBg: 'linear-gradient(135deg, #059669 0%, #10b981 55%, #06b6d4 100%)',
    ctaLip: '#047857',
    cta: 'Start Growth Plan',
    features: [
      '10,000 verified business leads / month',
      'All 11 supported countries included (India, US, UK, UAE, CA, AU, SG, NZ, IE, ZA, DE)',
      'Automatic missing phone & email discovery',
      'Area-divided multi-sheet Excel reports',
      'Merge & deduplicate multiple lead lists',
      'Priority live discovery speed & support'
    ]
  },
  {
    id: 'agency',
    name: 'Agency & Enterprise',
    tagline: 'For large teams, distributors & high-volume territories',
    monthly: 'Custom',
    annual: 'Custom',
    billingMonthly: 'Tailored lead volume & dedicated onboarding',
    billingAnnual: 'Annual volume pricing available',
    tone: 'dandelion',
    accentColor: '#d97706',
    accentBorder: 'rgba(245, 158, 11, 0.4)',
    ctaBg: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
    ctaLip: '#4c1d95',
    cta: 'Contact Sales',
    features: [
      '50,000+ verified leads / month',
      'State, district & county-wide territory sweeps',
      'Multi-seat workspaces & shared lead lists',
      'Custom industry list preparation & onboarding',
      'Dedicated account specialist'
    ]
  }
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const hardware = detectDeviceHardware();

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(960px 460px at 12% -6%, rgba(124, 58, 237, 0.12), transparent 62%), radial-gradient(880px 440px at 88% 2%, rgba(16, 185, 129, 0.12), transparent 60%), radial-gradient(720px 380px at 50% 105%, rgba(6, 182, 212, 0.1), transparent 62%), #f5f7fb',
        color: '#0f172a',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
      }}
    >
      {/* Top 3D Liquid Glass Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.72))',
          backdropFilter: 'blur(24px) saturate(190%)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.94)',
          boxShadow: 'inset 0 -1px 0 rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.12)'
        }}
      >
        <div
          style={{
            width: 'min(1180px, calc(100% - 40px))',
            margin: '0 auto',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <BrandLogo size={32} theme="light" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 15px', borderRadius: 12,
                background: 'linear-gradient(180deg, #ffffff, #f8fafc)', border: '1px solid rgba(15, 23, 42, 0.13)',
                boxShadow: 'inset 0 1.5px 0 #ffffff, 0 2.5px 0 rgba(15, 23, 42, 0.08)',
                color: '#1e293b', fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              onClick={() => navigate('/command')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px', borderRadius: 12,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 55%, #06b6d4 100%)', border: 'none',
                color: '#ffffff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.42), 0 3px 0 #047857, 0 10px 22px -6px rgba(16, 185, 129, 0.48)'
              }}
            >
              Open Workspace <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ width: 'min(1180px, calc(100% - 40px))', margin: '0 auto', padding: '58px 0 92px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}
        >
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(16, 185, 129, 0.1))',
              border: '1px solid rgba(124, 58, 237, 0.24)', color: '#5b21b6',
              fontSize: 12, fontWeight: 850, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16
            }}
          >
            <Sparkles size={13} /> Pay Only for Our 3 Built-In Engines
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 850, letterSpacing: '-0.035em', margin: '0 0 14px', lineHeight: 1.08 }}>
            Pay only for our 3 engines — powered by your device RAM.
          </h1>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, margin: '0 0 28px' }}>
            Your computer&apos;s own RAM runs the discovery engines directly at hardware speed with zero shared cloud queues — so you simply pay for our 3 Built-In Discovery Engines, live offline maps, and 1-click Excel export.
          </p>

          {/* Tactile 3D Liquid Glass Billing Toggle */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.72))',
              backdropFilter: 'blur(18px)', border: '1.5px solid #ffffff', borderRadius: 15, padding: 5, gap: 5,
              boxShadow: 'inset 0 2px 0 #ffffff, 0 10px 26px -10px rgba(15, 23, 42, 0.14)'
            }}
          >
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '9px 20px', borderRadius: 11, border: 'none', fontSize: 13.5, fontWeight: 750, cursor: 'pointer',
                background: !isAnnual ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'transparent',
                color: !isAnnual ? '#ffffff' : '#64748b',
                boxShadow: !isAnnual ? 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2.5px 0 #4c1d95' : 'none'
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '9px 20px', borderRadius: 11, border: 'none', fontSize: 13.5, fontWeight: 750, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: isAnnual ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'transparent',
                color: isAnnual ? '#ffffff' : '#64748b',
                boxShadow: isAnnual ? 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2.5px 0 #4c1d95' : 'none'
              }}
            >
              Annual
              <span style={{ padding: '2px 8px', borderRadius: 999, background: '#10b981', color: '#ffffff', fontSize: 10.5, fontWeight: 850 }}>
                SAVE 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* 3 Built-In Discovery Engines + User-RAM Hardware Speed Guide */}
        <section
          style={{
            marginBottom: 34,
            padding: '20px 22px',
            borderRadius: 20,
            background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.84))',
            border: '1.5px solid #ffffff',
            boxShadow: 'inset 0 2px 0 #ffffff, 0 14px 34px -14px rgba(15, 23, 42, 0.12)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 850 }}>
              <Cpu size={16} color="#7c3aed" />
              <span>What You Get: All 3 Built-In Discovery Engines Running on Your RAM</span>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: 12, fontWeight: 800 }}>
              💻 Your Device Detected: {hardware.ramGb} GB RAM · {hardware.cpuCores} Cores · {hardware.parallelZones}x Zones ({hardware.expectedSpeed})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
            {THREE_BUILTIN_ENGINES.map(eng => (
              <div key={eng.id} style={{ padding: '12px 14px', borderRadius: 14, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <div style={{ fontSize: 11, fontWeight: 850, color: '#7c3aed', textTransform: 'uppercase' }}>{eng.number}</div>
                <b style={{ display: 'block', fontSize: 14, marginTop: 2 }}>{eng.name}</b>
                <small style={{ color: '#475569', fontSize: 12.5, lineHeight: 1.45, display: 'block', marginTop: 4 }}>{eng.shortDesc}</small>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {DEVICE_REQUIREMENTS.map(req => (
              <div
                key={req.tier}
                style={{
                  padding: '9px 12px',
                  borderRadius: 12,
                  background: req.tier === hardware.tier ? '#ecfdf5' : '#f8fafc',
                  border: req.tier === hardware.tier ? '1.5px solid #10b981' : '1px solid rgba(15, 23, 42, 0.08)',
                  fontSize: 12
                }}
              >
                <b style={{ color: '#0f172a' }}>{req.badge}: {req.ram} · {req.cpu}</b>
                <div style={{ color: '#047857', fontWeight: 700 }}>{req.parallelZones} Parallel Zones · {req.speed}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(305px, 1fr))', gap: 22, alignItems: 'stretch' }}>
          {PLANS.map((plan, idx) => (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * idx, duration: 0.4 }}
              whileHover={{ y: -4 }}
              style={{
                background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.76))',
                backdropFilter: 'blur(24px) saturate(190%)',
                borderRadius: 24,
                padding: 30,
                border: `1.5px solid ${plan.highlight ? plan.accentBorder : 'rgba(255, 255, 255, 0.98)'}`,
                boxShadow: plan.highlight
                  ? 'inset 0 2px 0 #ffffff, 0 28px 60px -16px rgba(124, 58, 237, 0.24)'
                  : 'inset 0 2px 0 #ffffff, 0 16px 38px -14px rgba(15, 23, 42, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {plan.badge && (
                <span
                  style={{
                    position: 'absolute', top: -12, right: 24, padding: '5px 13px', borderRadius: 999,
                    background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff',
                    fontSize: 10.5, fontWeight: 850, letterSpacing: '0.08em',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {plan.badge}
                </span>
              )}

              <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.08em', textTransform: 'uppercase', color: plan.accentColor, marginBottom: 4 }}>
                {plan.id === 'agency' ? 'High Volume' : plan.id === 'pro' ? 'Best Value' : 'Starter Tier'}
              </span>
              <h2 style={{ fontSize: 23, fontWeight: 850, margin: '0 0 6px', letterSpacing: '-0.025em' }}>{plan.name}</h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 22px', minHeight: 40 }}>{plan.tagline}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <b style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.03em', color: '#0f172a' }}>
                  {isAnnual ? plan.annual : plan.monthly}
                </b>
                {plan.monthly !== 'Custom' && <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/month</span>}
              </div>
              <small style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 22, display: 'block' }}>
                {isAnnual ? plan.billingAnnual : plan.billingMonthly}
              </small>

              <button
                type="button"
                onClick={() => plan.id === 'agency'
                  ? (window.location.href = 'mailto:support@scraper.co.in?subject=Enterprise%20Plan')
                  : navigate(`/signup?plan=${encodeURIComponent(plan.id)}`)
                }
                style={{
                  width: '100%', height: 46, borderRadius: 14, fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', marginBottom: 24, border: 'none',
                  background: plan.ctaBg, color: '#ffffff',
                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.4), 0 3.5px 0 ${plan.ctaLip}, 0 10px 24px -8px rgba(15,23,42,0.28)`
                }}
              >
                {plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155', lineHeight: 1.45 }}>
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.14)', color: '#059669',
                        display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', color: '#64748b', fontSize: 13, fontWeight: 650 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={15} color="#059669" /> Runs in your RAM · Secure accounts</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Globe2 size={15} color="#7c3aed" /> All 11 locked markets included</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={15} color="#0284c7" /> Upgrade or switch anytime</span>
        </div>

        {/* Master District / State Complete Internet Coverage Contact Bar */}
        <section
          style={{
            marginTop: 28,
            padding: '18px 22px',
            borderRadius: 18,
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(245, 243, 255, 0.85))',
            border: '1.5px solid #ffffff',
            boxShadow: '0 14px 32px -14px rgba(124, 58, 237, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div style={{ maxWidth: 580 }}>
            <b style={{ display: 'block', fontSize: 15, color: '#0f172a' }}>Need an entire District, County, State, or Nationwide list across every public website?</b>
            <span style={{ fontSize: 13, color: '#475569' }}>Ask our Master Territory Intelligence Desk — we gather and verify the entire region from every public directory, map, and website across the internet.</span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {/* TODO: Replace "Adding Soon" with live mobile & email */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', fontSize: 12.5, fontWeight: 750 }}>
              <Phone size={14} color="#059669" /> Mobile: Adding Soon
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', fontSize: 12.5, fontWeight: 750 }}>
              <Mail size={14} color="#7c3aed" /> Email: Adding Soon
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
