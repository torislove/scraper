import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Globe2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import BrandLogo from '../v2/components/BrandLogo';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For local businesses & solo sales professionals',
    monthly: '₹1,499',
    annual: '₹1,199',
    billingMonthly: 'Billed monthly · Cancel anytime',
    billingAnnual: 'Billed annually · Save 20%',
    highlight: false,
    cta: 'Get Started',
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
    id: 'growth',
    name: 'Growth',
    tagline: 'Most popular for agencies & growing sales teams',
    monthly: '₹3,999',
    annual: '₹3,199',
    billingMonthly: 'Billed monthly · Cancel anytime',
    billingAnnual: 'Billed annually · Save 20%',
    highlight: true,
    badge: 'MOST POPULAR',
    cta: 'Start Growth Plan',
    features: [
      '10,000 verified business leads / month',
      'All 11 supported countries included (India, US, UK, UAE, CA, AU, SG, NZ, IE, ZA, DE)',
      'Automatic missing phone & email discovery',
      'Area-divided multi-sheet Excel reports',
      'Merge & deduplicate multiple lead lists',
      'Priority live discovery speed & email support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Agency & Enterprise',
    tagline: 'For large teams, distributors & high-volume territories',
    monthly: 'Custom',
    annual: 'Custom',
    billingMonthly: 'Tailored lead volume & dedicated onboarding',
    billingAnnual: 'Annual volume pricing available',
    highlight: false,
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(960px 440px at 15% -5%, rgba(16, 185, 129, 0.09), transparent 62%), radial-gradient(820px 400px at 88% 0%, rgba(37, 99, 235, 0.08), transparent 58%), #f8fafc',
        color: '#0f172a',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(15, 23, 42, 0.07)'
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
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <BrandLogo size={32} theme="light" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                color: '#334155',
                fontSize: 13.5,
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              onClick={() => navigate('/command')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                borderRadius: 11,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 20px -6px rgba(5, 150, 105, 0.45)'
              }}
            >
              Open Workspace <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ width: 'min(1160px, calc(100% - 40px))', margin: '0 auto', padding: '64px 0 96px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', maxWidth: 660, margin: '0 auto 44px' }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 13px',
              borderRadius: 999,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 16
            }}
          >
            <Sparkles size={13} /> Simple, Transparent Plans
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 850, letterSpacing: '-0.035em', margin: '0 0 14px', lineHeight: 1.08 }}>
            Pay for verified leads, not complicated tools.
          </h1>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, margin: '0 0 28px' }}>
            Every plan gives you instant local &amp; global business discovery, live interactive maps, clean saved folders, and 1-click Excel exports.
          </p>

          {/* Billing Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: 13,
              padding: 4,
              gap: 4,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
            }}
          >
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                background: !isAnnual ? '#0f172a' : 'transparent',
                color: !isAnnual ? '#ffffff' : '#64748b'
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: isAnnual ? '#0f172a' : 'transparent',
                color: isAnnual ? '#ffffff' : '#64748b'
              }}
            >
              Annual
              <span style={{ padding: '2px 7px', borderRadius: 999, background: '#10b981', color: '#ffffff', fontSize: 10.5, fontWeight: 800 }}>
                SAVE 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plan Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 22,
            alignItems: 'stretch'
          }}
        >
          {PLANS.map((plan, idx) => (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * idx, duration: 0.4 }}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                padding: 30,
                border: plan.highlight ? '2px solid #10b981' : '1px solid rgba(15, 23, 42, 0.1)',
                boxShadow: plan.highlight
                  ? '0 24px 52px -12px rgba(5, 150, 105, 0.22)'
                  : '0 8px 24px -8px rgba(15, 23, 42, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {plan.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: -12,
                    right: 24,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#ffffff',
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.08em'
                  }}
                >
                  {plan.badge}
                </span>
              )}

              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{plan.name}</h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 22px', minHeight: 40 }}>{plan.tagline}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <b style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.03em', color: '#0f172a' }}>
                  {isAnnual ? plan.annual : plan.monthly}
                </b>
                {plan.monthly !== 'Custom' && (
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/month</span>
                )}
              </div>
              <small style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 22, display: 'block' }}>
                {isAnnual ? plan.billingAnnual : plan.billingMonthly}
              </small>

              <button
                type="button"
                onClick={() => plan.id === 'enterprise' ? (window.location.href = 'mailto:support@scraper.co.in?subject=Enterprise%20Plan') : navigate('/command')}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 750,
                  cursor: 'pointer',
                  marginBottom: 24,
                  border: plan.highlight ? 'none' : '1.5px solid rgba(15, 23, 42, 0.16)',
                  background: plan.highlight ? 'linear-gradient(135deg, #059669, #10b981)' : '#ffffff',
                  color: plan.highlight ? '#ffffff' : '#0f172a',
                  boxShadow: plan.highlight ? '0 10px 22px -6px rgba(5, 150, 105, 0.45)' : 'none'
                }}
              >
                {plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155', lineHeight: 1.45 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        color: '#059669',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        marginTop: 1
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

        <div
          style={{
            marginTop: 42,
            display: 'flex',
            justifyContent: 'center',
            gap: 28,
            flexWrap: 'wrap',
            color: '#64748b',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={15} color="#059669" /> Secure instant access</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Globe2 size={15} color="#059669" /> 11 core markets supported</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={15} color="#059669" /> Cancel or switch anytime</span>
        </div>
      </main>
    </div>
  );
}
