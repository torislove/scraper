/**
 * shared/landing/LandingStorySections.jsx
 * Clean executive below-the-fold landing flow with sculpted 3D icons,
 * crisp 5-Market Showcase, 3-Step Architecture + Purity Gate, Client vs Master cards, & Extension v2.0.
 */

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Phone, Clock, CheckCircle2, XCircle, ArrowRight, Rocket, LogIn, Download
} from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '../data/countries';
import { PURITY_SHOWCASE_CASES } from '../data/taxonomyClient';
import { getCountryPricing } from '../data/pricingModels';
import FlagChip, { FlagSphere } from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';
import {
  Pin3DIcon,
  PhoneShield3DIcon,
  Layers3DIcon,
  RocketVault3DIcon,
  TerritoryGlobe3DIcon,
  ExtensionBolt3DIcon
} from '../ui/Sculpted3DIcons';
import { EXTENSION_DOWNLOAD_URL } from '../utils/extensionBridge';

export default function LandingStorySections({
  country,
  setCountry,
  onSelectExample,
  onOpenClient,
  onOpenMaster,
  onSignIn,
  freeTrialDays = 7
}) {
  const activeCountry = getCountryByCode(country);
  const pricing = getCountryPricing(country || 'IN');
  const [purityCaseId, setPurityCaseId] = useState('hospitals');
  const activeCase = PURITY_SHOWCASE_CASES.find((c) => c.id === purityCaseId) || PURITY_SHOWCASE_CASES[0];

  const stepsRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ['start 80%', 'end 40%'] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0.12, 1]);

  return (
    <>
      {/* SECTION 3: 5 SOVEREIGN MARKETS */}
      <section id="markets" style={{ padding: '44px 16px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309' }}>
            5 High-Revenue Markets
          </span>
          <h2 style={{ margin: '6px 0 8px', fontSize: 'var(--lp-text-xl)', fontWeight: 800, color: 'var(--lp-ink)' }}>
            Localized Phone Rules &amp; Municipal Boundaries
          </h2>
          <p style={{ margin: '0 auto', maxWidth: 620, fontSize: 13.5, color: 'var(--lp-ink-3)' }}>
            Click any nation to inspect E.164 phone classification, local business vocabulary, and administrative hierarchy.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {COUNTRIES.map((c) => (
            <FlagChip
              key={c.code}
              code={c.code}
              name={c.code === 'AE' ? 'UAE' : c.name}
              size={22}
              active={c.code === country}
              onClick={() => setCountry(c.code)}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="lp-glass"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FlagSphere code={activeCountry.code} size={36} active />
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--lp-ink)' }}>
                    {activeCountry.nativeName} ({activeCountry.code})
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--lp-ink-3)' }}>{activeCountry.adminHierarchy}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="lp-tabular" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, background: '#fffbeb', border: '1px solid rgba(217,119,6,0.28)', fontSize: 12, fontWeight: 700, color: '#78350f' }}>
                  <Phone size={12} /> {activeCountry.phoneSample}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', fontSize: 12, fontWeight: 600, color: 'var(--lp-ink-2)' }}>
                  <Clock size={12} color="#0284c7" /> {activeCountry.hoursSample}
                </span>
                <Link
                  to={`/leads/${activeCountry.code.toLowerCase()}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: '#0284c7', color: '#ffffff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  <span>Explore {activeCountry.name}</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
              {activeCountry.vocabulary.map((v) => (
                <div key={v.term} style={{ padding: 14, borderRadius: 14, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lp-ink)' }}>{v.term}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--lp-ink-3)', marginTop: 2 }}>
                      {v.category} · {v.sampleCity}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectExample(activeCountry.code, v.category, v.sampleCity)}
                    style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(217,119,6,0.34)', background: '#fffbeb', color: '#92400e', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Preview in {v.sampleCity} →
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* SECTION 4: WORKFLOW & CATEGORY GATE WITH SCULPTED 3D ICONS */}
      <section ref={stepsRef} id="how-it-works" style={{ padding: '44px 16px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309' }}>
            Zero-Chromium Native Pipeline
          </span>
          <h2 style={{ margin: '6px 0 8px', fontSize: 'var(--lp-text-xl)', fontWeight: 800, color: 'var(--lp-ink)' }}>
            Target Wards → Verify Phones → Export Ready Lists
          </h2>
          <p style={{ margin: '0 auto', maxWidth: 640, fontSize: 13.5, color: 'var(--lp-ink-3)' }}>
            Every listing passes strict country phone validation and domain-intent rules so your outreach sheets stay focused and duplicate-free.
          </p>
        </div>

        <div style={{ height: 4, borderRadius: 999, background: 'rgba(217, 119, 6, 0.14)', overflow: 'hidden', marginBottom: 20 }}>
          <motion.div style={{ height: '100%', scaleX: lineScale, transformOrigin: 'left center', background: 'var(--lp-gold-gradient)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 22 }}>
          {[
            {
              step: '01 · ZONE PRECISION',
              title: 'Auto-Detect Country & Wards',
              desc: 'Type any category and city (or full district/state in Master). The search bar switches markets automatically and maps municipal sub-zones.',
              IconComp: Pin3DIcon
            },
            {
              step: '02 · DUAL RESCUE',
              title: 'Extract Mobiles, STD & Socials',
              desc: 'Multi-engine harvesting separates WhatsApp-ready direct mobiles from office landlines and crawls official sites for public emails and socials.',
              IconComp: PhoneShield3DIcon
            },
            {
              step: '03 · INSTANT FOLDERS',
              title: 'Organize & Export Clean Files',
              desc: 'Leads organize automatically into searchable folders by sub-category and ward for one-click CSV spreadsheets and vCard (.vcf) phone imports.',
              IconComp: RocketVault3DIcon
            }
          ].map(({ step, title, desc, IconComp }) => (
            <motion.div key={step} whileHover={{ y: -3 }} transition={{ duration: 0.16 }} className="lp-glass-subtle" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 11, fontWeight: 800, color: '#b45309' }}>{step}</span>
                <IconComp size={38} />
              </div>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--lp-ink)' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--lp-ink-3)', lineHeight: 1.55 }}>{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Category Gate Inspector */}
        <div className="lp-glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers3DIcon size={32} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--lp-ink)' }}>Category Purity Gate</div>
                <div style={{ fontSize: 11.5, color: 'var(--lp-ink-3)' }}>Separates Services from Retail Stores and rejects off-topic results</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PURITY_SHOWCASE_CASES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPurityCaseId(c.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1px solid ${purityCaseId === c.id ? '#d97706' : 'rgba(15,23,42,0.1)'}`,
                    background: purityCaseId === c.id ? '#fffbeb' : '#ffffff',
                    color: purityCaseId === c.id ? '#78350f' : 'var(--lp-ink-2)',
                    cursor: 'pointer'
                  }}
                >
                  &ldquo;{c.query}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 12, background: '#ecfdf5', border: '1px solid rgba(5,150,105,0.24)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#047857', marginBottom: 8, textTransform: 'uppercase' }}>
                Kept ({activeCase.mode})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeCase.kept.map((k) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: '#ffffff', color: '#047857', fontSize: 12, fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> {k}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 12, background: '#fff1f2', border: '1px solid rgba(225,29,72,0.22)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#be123c', marginBottom: 8, textTransform: 'uppercase' }}>
                Filtered Out Automatically
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeCase.dropped.map((d) => (
                  <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: '#ffffff', color: '#be123c', fontSize: 12, fontWeight: 700 }}>
                    <XCircle size={12} /> {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: WORKSPACE EDITIONS & EXTENSION v2.0 */}
      <section id="editions" style={{ padding: '44px 16px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309' }}>
            Client Workspace · Master Fleet · Edge Extension
          </span>
          <h2 style={{ margin: '6px 0 8px', fontSize: 'var(--lp-text-xl)', fontWeight: 800, color: 'var(--lp-ink)' }}>
            Choose Your Workspace Scale
          </h2>
          {freeTrialDays > 0 && (
            <p style={{ margin: '0 auto', maxWidth: 560, fontSize: 13, color: 'var(--lp-ink-3)' }}>
              Includes a {freeTrialDays}-day free trial with instant access to all 5 high-revenue markets.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.16 }} className="lp-glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Pin3DIcon size={36} />
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--lp-ink)' }}>Client Radar</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857' }}>City &amp; Ward Outreach</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#ecfdf5', color: '#047857' }}>
                  Teams &amp; Founders
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--lp-ink-3)', lineHeight: 1.6 }}>
                Target any single city across all municipal wards, filter verified mobile vs. landline leads in real time, and export clean CRM spreadsheets or vCards.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '12px 0 0' }}>
                <span style={{ fontSize: 22, fontWeight: 850, color: 'var(--lp-ink)' }}>{pricing.symbol}{pricing.clientProMonthly.toLocaleString()}</span>
                <span style={{ fontSize: 12, fontWeight: 650, color: '#64748b' }}>/ mo · {pricing.highlightRail}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <LiquidButton variant="gold" size="md" icon={Rocket} onClick={onOpenClient}>
                Open Client Workspace
              </LiquidButton>
              <LiquidButton variant="glass-gold" size="md" icon={LogIn} onClick={() => onSignIn('client')}>
                Sign In / {freeTrialDays > 0 ? `${freeTrialDays}-Day Trial` : 'Register'}
              </LiquidButton>
            </div>
          </motion.article>

          <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.16 }} className="lp-glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TerritoryGlobe3DIcon size={36} />
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--lp-ink)' }}>Master Fleet</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309' }}>District · County · State Scale</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#fffbeb', color: '#92400e' }}>
                  Operators &amp; Agencies
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--lp-ink-3)', lineHeight: 1.6 }}>
                Run automated territory sweeps across HQ urban wards, surrounding towns, and mandals / counties / boroughs with unified multi-zone exports.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '12px 0 0' }}>
                <span style={{ fontSize: 22, fontWeight: 850, color: 'var(--lp-ink)' }}>{pricing.symbol}{pricing.masterFleetMonthly.toLocaleString()}</span>
                <span style={{ fontSize: 12, fontWeight: 650, color: '#64748b' }}>/ mo · {pricing.highlightRail}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <LiquidButton variant="obsidian" size="md" icon={Rocket} onClick={onOpenMaster}>
                Open Master Fleet
              </LiquidButton>
              <LiquidButton variant="glass-gold" size="md" icon={LogIn} onClick={() => onSignIn('master')}>
                Master Sign In
              </LiquidButton>
            </div>
          </motion.article>
        </div>

        {/* Browser Extension v2.0 Hardware Turbo Card */}
        <div className="lp-glass-subtle" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ExtensionBolt3DIcon size={38} />
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--lp-ink)' }}>
                RAM Turbo Browser Extension v2.0
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--lp-ink-3)' }}>
                Offloads directory &amp; public contact lookups directly through your residential browser across all 5 markets (Client + Master supported).
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a href={EXTENSION_DOWNLOAD_URL} style={{ textDecoration: 'none' }}>
              <LiquidButton variant="sapphire" size="sm" icon={Download}>
                Chrome / Edge v2.0
              </LiquidButton>
            </a>
            <a href={`${EXTENSION_DOWNLOAD_URL}?browser=firefox`} style={{ textDecoration: 'none' }}>
              <LiquidButton variant="glass-gold" size="sm" icon={Download}>
                Firefox MV3 v2.0
              </LiquidButton>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 6: METHODOLOGY & COMPLIANCE */}
      <section id="compliance" style={{ padding: '16px 16px 64px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <div className="lp-glass" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0369a1' }}>
                Public Commercial Data Only
              </span>
              <h2 style={{ margin: '6px 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--lp-ink)' }}>
                Transparent Public Listing Extraction
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--lp-ink-3)', lineHeight: 1.6 }}>
                Scraper.co.in queries publicly published business directories, map cards, and official company contact pages without bypassing logins or paywalls.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, fontWeight: 700 }}>
                <Link to="/privacy" style={{ color: '#0284c7', textDecoration: 'none' }}>Privacy Policy →</Link>
                <Link to="/terms" style={{ color: '#0284c7', textDecoration: 'none' }}>Terms of Service →</Link>
                <Link to="/directory" style={{ color: '#0284c7', textDecoration: 'none' }}>5-Market Directory →</Link>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 14, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FlagSphere code={activeCountry.code} size={20} active />
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--lp-ink)' }}>
                  {activeCountry.name}: {activeCountry.compliance.laws}
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--lp-ink-2)', lineHeight: 1.55 }}>
                {activeCountry.compliance.summary}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--lp-ink-4)', fontStyle: 'italic' }}>
                Informational summary only — verify applicable B2B outreach rules in your target jurisdiction.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
