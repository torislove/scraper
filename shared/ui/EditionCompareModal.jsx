import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import LiquidButton from './LiquidButton';
import { Pin3DIcon, TerritoryGlobe3DIcon } from './Sculpted3DIcons';
import { CLIENT_ORIGIN, MASTER_ORIGIN } from '../../client/src/v2/utils/editionSwitch';
import { getCountryPricing } from '../data/pricingModels';

const SKIP_KEY = 'lp_skip_edition_modal';

export function shouldSkipEditionModal() {
  try { return localStorage.getItem(SKIP_KEY) === '1'; } catch (_) { return false; }
}

export function buildEditionSwitchUrl(targetEdition, { query = '', city = '', country = 'IN' } = {}) {
  const origin = targetEdition === 'master' ? MASTER_ORIGIN : CLIENT_ORIGIN;
  const params = new URLSearchParams();
  if (country) params.set('country', String(country).toUpperCase());
  if (query) params.set('q', query);
  if (city) params.set('city', city);
  const suffix = params.toString() ? `/command?${params.toString()}` : '/';
  return `${origin}${suffix}`;
}

export default function EditionCompareModal({
  isOpen = false,
  currentEdition = 'client',
  targetEdition = 'master',
  context = {},
  onClose
}) {
  const [skipNext, setSkipNext] = useState(shouldSkipEditionModal);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const isTargetMaster = targetEdition === 'master';
  const pricing = getCountryPricing(context?.country || 'IN');
  const handleConfirm = () => {
    try { localStorage.setItem(SKIP_KEY, skipNext ? '1' : '0'); } catch (_) {}
    onClose?.();
    if (targetEdition !== currentEdition) {
      window.location.href = buildEditionSwitchUrl(targetEdition, context);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edition-modal-title"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 140,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="lp-glass"
            style={{
              width: '100%',
              maxWidth: 780,
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: 24,
              padding: 24,
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
              border: '1px solid rgba(217, 119, 6, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <Sparkles size={12} /> Two Purpose-Built Workspaces
                </span>
                <h2 id="edition-modal-title" style={{ margin: '4px 0 4px', fontSize: 21, fontWeight: 800, color: 'var(--lp-ink)' }}>
                  Client Radar vs. Master Fleet
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--lp-ink-3)' }}>
                  Both engines share the same verified 5-country extractors — pick the geographic scale your workflow requires.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', borderRadius: 10, padding: 7, cursor: 'pointer', color: '#475569' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div style={{ padding: 18, borderRadius: 18, background: !isTargetMaster ? '#ecfdf5' : '#f8fafc', border: `2px solid ${!isTargetMaster ? '#10b981' : 'rgba(15,23,42,0.08)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <Pin3DIcon size={38} />
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--lp-ink)' }}>Client Radar</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857' }}>Single City &amp; Ward Precision</div>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--lp-ink-2)', lineHeight: 1.5 }}>
                  Ideal for sales teams, local agencies, and B2B outreach targeting one city at a time.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#334155', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#059669" /> Municipal ward &amp; smart cluster control</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#059669" /> Instant mobile, STD &amp; WhatsApp separation</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#059669" /> Interactive lead table + CSV / vCard exports</span>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 800, color: '#047857' }}>{pricing.symbol}{pricing.clientProMonthly.toLocaleString()} / mo</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>{pricing.highlightRail}</span>
                </div>
              </div>

              <div style={{ padding: 18, borderRadius: 18, background: isTargetMaster ? '#fffbeb' : '#f8fafc', border: `2px solid ${isTargetMaster ? '#d97706' : 'rgba(15,23,42,0.08)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <TerritoryGlobe3DIcon size={38} />
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--lp-ink)' }}>Master Fleet</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309' }}>District, County &amp; State Scale</div>
                  </div>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--lp-ink-2)', lineHeight: 1.5 }}>
                  Built for operators harvesting entire districts, counties, or full states automatically.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#334155', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#d97706" /> 3-Tier Cascade: HQ Wards → Towns → Mandals</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#d97706" /> District &amp; State disambiguation across 5 nations</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={13} color="#d97706" /> Consolidated multi-zone Folders &amp; exports</span>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 800, color: '#b45309' }}>{pricing.symbol}{pricing.masterFleetMonthly.toLocaleString()} / mo</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>{pricing.highlightRail}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={skipNext} onChange={(e) => setSkipNext(e.target.checked)} />
                Switch directly next time without showing this guide
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LiquidButton variant="glass-gold" size="sm" onClick={onClose}>
                  Stay Here
                </LiquidButton>
                <LiquidButton variant={isTargetMaster ? 'obsidian' : 'gold'} size="md" icon={ArrowRight} onClick={handleConfirm}>
                  {targetEdition === currentEdition
                    ? `Continue in ${isTargetMaster ? 'Master Fleet' : 'Client Radar'}`
                    : `Open ${isTargetMaster ? 'Master Fleet' : 'Client Radar'}`}
                </LiquidButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
