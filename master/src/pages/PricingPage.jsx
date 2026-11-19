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
    accentColor: '#0284c7',
    accentBorder: 'rgba(6, 182, 212, 0.38)',
    ctaBg: 'linear-gradient(135deg, #0284c7, #06b6d4)',
    ctaLip: '#0369a1',
    cta: 'Open Master Console',
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
    accentColor: '#7c3aed',
    accentBorder: 'rgba(124, 58, 237, 0.45)',
    ctaBg: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 55%, #06b6d4 100%)',
    ctaLip: '#4c1d95',
    cta: 'Manage Client Plans',
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
    accentColor: '#d97706',
    accentBorder: 'rgba(245, 158, 11, 0.4)',
    ctaBg: 'linear-gradient(135deg, #059669, #10b981)',
    ctaLip: '#047857',
    cta: 'Provision Enterprise',
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
          'radial-gradient(960px 460px at 12% -6%, rgba(124, 58, 237, 0.14), transparent 62%), radial-gradient(880px 440px at 88% 2%, rgba(6, 182, 212, 0.12), transparent 60%), #f5f7fb',
        color: '#0f172a',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
      }}
    >
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'linear-gradient(90deg, rgba(11, 17, 32, 0.94), rgba(19, 27, 46, 0.92))',
          backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(167, 139, 250, 0.28)'
        }}
      >
        <div style={{ width: 'min(1180px, calc(100% - 40px))', margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <button type="button" onClick={() => navigate('/command')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <BrandLogo size={30} theme="dark" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/clients')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 11,
                background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)',
                color: '#f8fafc', fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Client Desk
            </button>
            <button
              type="button"
              onClick={() => navigate('/command')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 17px', borderRadius: 11,
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none',
                color: '#ffffff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.35), 0 3px 0 #4c1d95'
              }}
            >
              Master Command <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ width: 'min(1180px, calc(100% - 40px))', margin: '0 auto', padding: '58px 0 92px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.24)', color: '#5b21b6', fontSize: 12, fontWeight: 850, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
            <Sparkles size={13} /> Commercial Plan Catalog
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 850, letterSpacing: '-0.035em', margin: '0 0 14px', lineHeight: 1.08 }}>
            Client tiers managed inside Sovereign Control.
          </h1>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, margin: '0 0 28px' }}>
            Every tier maps directly to credit limits &amp; workspace permissions in Master Client Desk.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(18px)', border: '1.5px solid #ffffff', borderRadius: 15, padding: 5, gap: 5, boxShadow: '0 10px 26px -10px rgba(15, 23, 42, 0.14)' }}>
            <button type="button" onClick={() => setIsAnnual(false)} style={{ padding: '9px 20px', borderRadius: 11, border: 'none', fontSize: 13.5, fontWeight: 750, cursor: 'pointer', background: !isAnnual ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'transparent', color: !isAnnual ? '#ffffff' : '#64748b' }}>
              Monthly
            </button>
            <button type="button" onClick={() => setIsAnnual(true)} style={{ padding: '9px 20px', borderRadius: 11, border: 'none', fontSize: 13.5, fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, background: isAnnual ? 'linear-gradient(135deg, #6d28d9, #7c3aed)' : 'transparent', color: isAnnual ? '#ffffff' : '#64748b' }}>
              Annual
              <span style={{ padding: '2px 8px', borderRadius: 999, background: '#10b981', color: '#ffffff', fontSize: 10.5, fontWeight: 850 }}>SAVE 20%</span>
            </button>
          </div>
        </motion.div>

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
                borderRadius: 24, padding: 30,
                border: `1.5px solid ${plan.highlight ? plan.accentBorder : '#ffffff'}`,
                boxShadow: plan.highlight
                  ? 'inset 0 2px 0 #ffffff, 0 28px 60px -16px rgba(124, 58, 237, 0.24)'
                  : 'inset 0 2px 0 #ffffff, 0 16px 38px -14px rgba(15, 23, 42, 0.12)',
                display: 'flex', flexDirection: 'column', position: 'relative'
              }}
            >
              {plan.badge && (
                <span style={{ position: 'absolute', top: -12, right: 24, padding: '5px 13px', borderRadius: 999, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: '#ffffff', fontSize: 10.5, fontWeight: 850, letterSpacing: '0.08em' }}>
                  {plan.badge}
                </span>
              )}

              <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.08em', textTransform: 'uppercase', color: plan.accentColor, marginBottom: 4 }}>
                {plan.id === 'agency' ? 'High Volume' : plan.id === 'pro' ? 'Best Value' : 'Starter Tier'}
              </span>
              <h2 style={{ fontSize: 23, fontWeight: 850, margin: '0 0 6px', letterSpacing: '-0.025em' }}>{plan.name}</h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 22px', minHeight: 40 }}>{plan.tagline}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <b style={{ fontSize: 40, fontWeight: 850, letterSpacing: '-0.03em', color: '#0f172a' }}>{isAnnual ? plan.annual : plan.monthly}</b>
                {plan.monthly !== 'Custom' && <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/month</span>}
              </div>
              <small style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 22, display: 'block' }}>{isAnnual ? plan.billingAnnual : plan.billingMonthly}</small>

              <button
                type="button"
                onClick={() => navigate('/clients')}
                style={{
                  width: '100%', height: 46, borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 24, border: 'none',
                  background: plan.ctaBg, color: '#ffffff',
                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.4), 0 3.5px 0 ${plan.ctaLip}`
                }}
              >
                {plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155', lineHeight: 1.45 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.14)', color: '#6d28d9', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={15} color="#059669" /> Encrypted client provisioning</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Globe2 size={15} color="#7c3aed" /> 11 core markets supported</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={15} color="#0284c7" /> Instant quota overrides</span>
        </div>
      </main>
    </div>
  );
}
