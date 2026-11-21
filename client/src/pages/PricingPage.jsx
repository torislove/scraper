import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, ShieldCheck, Zap, Globe2, Rocket } from 'lucide-react';
import BrandLogo from '../v2/components/BrandLogo';
import LiquidButton3D from '../v2/components/LiquidButton3D';
import AnimatedLiquidBackground from '../v2/components/AnimatedLiquidBackground';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    badge: 'SOLO PROFESSIONAL',
    tagline: 'Ideal for local businesses & solo sales reps',
    monthly: '₹1,499',
    annual: '₹1,199',
    leads: '2,000 Verified Leads / mo',
    features: [
      'Full India coverage (all towns & villages)',
      'Direct mobile numbers & WhatsApp filter',
      'Live interactive territory mapping',
      '1-click Excel (.xlsx), CSV & vCard export',
      'Automatic deduplication'
    ],
    buttonVariant: 'cyan',
    buttonLabel: 'Start Starter Plan'
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'MOST POPULAR',
    highlight: true,
    tagline: 'Best for agencies & growing outbound sales teams',
    monthly: '₹3,999',
    annual: '₹3,199',
    leads: '10,000 Verified Leads / mo',
    features: [
      'All 11 sovereign nations included',
      'All 22 synchronized extraction engines',
      'Automatic phone & executive email enrichment',
      'Multi-sheet Excel territory reports',
      'Priority extraction speed & support'
    ],
    buttonVariant: 'emerald',
    buttonLabel: 'Start Growth Plan',
    pulse: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'CUSTOM VOLUME',
    tagline: 'For distributors, large teams & multi-seat desks',
    monthly: 'Custom',
    annual: 'Custom',
    leads: '50,000+ Verified Leads / mo',
    features: [
      'State & district-wide complete internet sweeps',
      'Multi-seat team workspace with shared lists',
      'Dedicated account onboarding specialist',
      'Custom CRM data preparation',
      'SLA guarantee & custom API webhooks'
    ],
    buttonVariant: 'ghost',
    buttonLabel: 'Contact Enterprise Sales'
  }
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
        color: '#0f172a',
        overflowX: 'hidden'
      }}
    >
      {/* 1. Mesmerizing Ambient Background */}
      <AnimatedLiquidBackground />

      {/* 2. Glassmorphic Header */}
      <header
        style={{
          height: 62,
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.92)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            width: 'min(1220px, calc(100% - 36px))',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <BrandLogo size={30} theme="light" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                color: '#475569',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back to Overview
            </button>

            <LiquidButton3D
              variant="emerald"
              size="sm"
              icon={Rocket}
              onClick={() => navigate('/command')}
            >
              Open Command Center
            </LiquidButton3D>
          </div>
        </div>
      </header>

      {/* 3. Concentrated Pricing Stage */}
      <main
        style={{
          flex: 1,
          width: 'min(1160px, calc(100% - 32px))',
          margin: '0 auto',
          padding: '36px 0 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Simple Eyebrow & Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: 660, marginBottom: 28 }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 13px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(207, 250, 254, 0.95))',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#047857',
              fontSize: 11,
              fontWeight: 850,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 12
            }}
          >
            <Sparkles size={13} />
            <span>TRANSPARENT PRICING · ZERO API BILLS EVER</span>
          </span>

          <h1
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 'clamp(28px, 3.4vw, 42px)',
              fontWeight: 850,
              letterSpacing: '-0.035em',
              color: '#0f172a',
              margin: '0 0 10px',
              lineHeight: 1.1
            }}
          >
            Simple, Transparent Pricing.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 40%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Zero Hidden Fees.
            </span>
          </h1>

          <p style={{ fontSize: 14.5, color: '#475569', margin: 0, lineHeight: 1.5 }}>
            No per-lead credits. No proxy bills. No surprise monthly charges.
            Every plan unlocks our fleet of 22 specialized engines running directly on your hardware.
          </p>

          {/* Concentrated Annual / Monthly Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(241, 245, 249, 0.9)',
              border: '1px solid rgba(203, 213, 225, 0.8)',
              borderRadius: 999,
              padding: 4,
              marginTop: 18,
              boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)'
            }}
          >
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                fontSize: 12.5,
                fontWeight: 750,
                cursor: 'pointer',
                background: !isAnnual ? '#ffffff' : 'transparent',
                color: !isAnnual ? '#047857' : '#64748b',
                boxShadow: !isAnnual ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.16s ease'
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                fontSize: 12.5,
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: isAnnual ? '#ffffff' : 'transparent',
                color: isAnnual ? '#047857' : '#64748b',
                boxShadow: isAnnual ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.16s ease'
              }}
            >
              <span>Annual</span>
              <span style={{ padding: '1px 7px', borderRadius: 999, background: '#10b981', color: '#ffffff', fontSize: 10, fontWeight: 850 }}>
                SAVE 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* 3 Concentrated Plan Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 20,
            width: '100%',
            alignItems: 'stretch'
          }}
        >
          {PLANS.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              style={{
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(24px)',
                borderRadius: 20,
                padding: '24px 26px',
                border: plan.highlight ? '1.5px solid #10b981' : '1.5px solid rgba(255, 255, 255, 0.95)',
                boxShadow: plan.highlight
                  ? '0 20px 48px -12px rgba(16, 185, 129, 0.22), inset 0 1px 0 #ffffff'
                  : '0 16px 36px -12px rgba(15, 23, 42, 0.08), inset 0 1px 0 #ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              {plan.highlight && (
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 20,
                    padding: '3px 11px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 850,
                    letterSpacing: '0.06em'
                  }}
                >
                  MOST POPULAR
                </span>
              )}

              <div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 850,
                    letterSpacing: '0.06em',
                    color: plan.highlight ? '#059669' : '#64748b'
                  }}
                >
                  {plan.badge}
                </span>

                <h2 style={{ fontSize: 22, fontWeight: 850, margin: '4px 0 4px', color: '#0f172a' }}>
                  {plan.name}
                </h2>

                <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
                  {plan.tagline}
                </p>

                {/* Pricing Block */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <b style={{ fontSize: 34, fontWeight: 850, color: '#0f172a', letterSpacing: '-0.03em' }}>
                    {isAnnual ? plan.annual : plan.monthly}
                  </b>
                  {plan.monthly !== 'Custom' && <span style={{ fontSize: 13, color: '#64748b' }}>/month</span>}
                </div>

                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: '#047857',
                    background: '#ecfdf5',
                    padding: '3px 8px',
                    borderRadius: 6,
                    display: 'inline-block',
                    marginBottom: 18
                  }}
                >
                  ⚡ {plan.leads}
                </div>

                {/* Features List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155' }}>
                      <span
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: '50%',
                          background: '#ecfdf5',
                          color: '#059669',
                          display: 'grid',
                          placeItems: 'center',
                          flex: 'none'
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3D Liquid Action Button */}
              <div style={{ marginTop: 'auto' }}>
                <LiquidButton3D
                  variant={plan.buttonVariant}
                  size="md"
                  pulse={plan.pulse}
                  style={{ width: '100%' }}
                  onClick={() => plan.id === 'enterprise'
                    ? (window.location.href = 'mailto:support@scraper.co.in?subject=Enterprise%20Plan')
                    : navigate(`/signup?plan=${encodeURIComponent(plan.id)}`)
                  }
                >
                  {plan.buttonLabel}
                </LiquidButton3D>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 4. Single-Line Trust Assurance Footer */}
        <div
          style={{
            marginTop: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12,
            fontWeight: 700,
            color: '#64748b'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={14} color="#059669" /> 100% On-Device Memory Privacy
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Globe2 size={14} color="#0284c7" /> 11 Sovereign Markets Included
          </span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Zap size={14} color="#f59e0b" /> Zero Cloud Proxy or Scraping Fees
          </span>
        </div>
      </main>
    </div>
  );
}
