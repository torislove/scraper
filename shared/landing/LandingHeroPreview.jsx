/**
 * shared/landing/LandingHeroPreview.jsx
 * Sections 1 & 2 of the Single-Page Landing Story:
 * 1. Hero (#overview) — 3D Gold Pin, THE Main Liquid Search Bar + Live City Zones Explorer + 11-Country Strip -> Launches directly to Cockpit.
 * 2. Live Proof (#live-proof) — Optional pre-signup 10-lead preview + direct Sweep Launch.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, CheckCircle2, Phone, Globe2, Tag, MapPin } from 'lucide-react';
import LazyBrandPin from '../three/LazyBrandPin';
import OmniSearchBar from '../search/OmniSearchBar';
import CityZonesExplorer from '../cockpit/CityZonesExplorer';
import SovereignFlagStrip from '../cockpit/SovereignFlagStrip';
import LiquidButton from '../ui/LiquidButton';
import { FlagSphere } from '../ui/FlagChip';
import { IntentPill, Skeleton } from '../ui/Primitives';
import EditionSwitchPill from '../ui/EditionSwitchPill';
import EditionCompareModal, { shouldSkipEditionModal, buildEditionSwitchUrl } from '../ui/EditionCompareModal';
import { getCountryByCode } from '../data/countries';
import { detectCountryForText } from '../data/sovereignPlaces';

export default function LandingHeroPreview({
  country,
  setCountry,
  query,
  setQuery,
  city,
  setCity,
  cityZones,
  suggestFn,
  previewState,
  onRunPreview,
  onSearchToCockpit,
  liveStats,
  isMaster = false,
  customSearchBar = null,
  customZoneExplorer = null
}) {
  const activeCountry = getCountryByCode(country);
  const [switchModalTarget, setSwitchModalTarget] = useState(null);

  const handleRequestSwitch = (target) => {
    const current = isMaster ? 'master' : 'client';
    if (target !== current && shouldSkipEditionModal()) {
      window.location.href = buildEditionSwitchUrl(target, { query, city, country });
      return;
    }
    setSwitchModalTarget(target);
  };

  return (
    <>
      {/* SECTION 1: HERO — SINGLE PRIMARY SEARCH BAR */}
      <section
        id="overview"
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px 16px 24px',
          maxWidth: 960,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
        >
          <LazyBrandPin size={84} speed={1.0} interactive className="mb-1" />

          {/* Crisp Scraper.co.in Brand Lockup directly below the 3D Logo */}
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #92400e 0%, #d97706 45%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Scraper
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--lp-ink-2)', letterSpacing: '-0.02em' }}>
              .co.in
            </span>
          </div>

          {/* Sovereign UI Control & Mode Switcher Strip below Scraper.co.in */}
          <div
            className="lp-glass-subtle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              padding: '5px 8px 5px 14px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.96)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              boxShadow: 'var(--lp-shadow-1)',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--lp-ink-2)',
              marginBottom: 14
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <FlagSphere code={country} size={14} />
              <span>{activeCountry.name}</span>
            </span>
            {liveStats?.ok && (
              <>
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span style={{ color: '#047857', fontWeight: 700 }}>
                  {liveStats.marketsOnline} Markets Ready
                </span>
              </>
            )}
            <span style={{ color: '#cbd5e1' }}>·</span>
            <EditionSwitchPill isMaster={isMaster} onRequestSwitch={handleRequestSwitch} />
          </div>
          <EditionCompareModal
            isOpen={Boolean(switchModalTarget)}
            currentEdition={isMaster ? 'master' : 'client'}
            targetEdition={switchModalTarget || (isMaster ? 'client' : 'master')}
            context={{ query, city, country }}
            onClose={() => setSwitchModalTarget(null)}
          />

          <h1
            style={{
              margin: '0 0 10px',
              fontSize: 'clamp(1.95rem, 4.1vw, 3.1rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--lp-ink)'
            }}
          >
            Direct Mobiles, Landlines &amp; Socials{' '}
            <span style={{ background: 'linear-gradient(135deg, #92400e 0%, #d97706 45%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Extracted Live.
            </span>
          </h1>

          <p
            style={{
              margin: '0 0 20px',
              fontSize: 'var(--lp-text-base)',
              color: 'var(--lp-ink-3)',
              maxWidth: 660,
              lineHeight: 1.55,
              fontWeight: 500
            }}
          >
            {isMaster
              ? 'Enter any Category and District or State across 5 high-revenue countries to sweep District HQ Urban Wards first, then Towns and Mandals / Sub-Divisions.'
              : 'Search any business category and city across 5 high-revenue countries below to launch straight into the live Cockpit, inspect municipal zones, and export clean CSV or vCard files.'}
          </p>

          {/* THE MAIN SEARCH POD + ZONES EXPLORER + CENTERED 11-COUNTRY FLAGS */}
          <div style={{ width: '100%', maxWidth: 860, textAlign: 'left' }}>
            {customSearchBar || (
              <OmniSearchBar
                query={query}
                setQuery={setQuery}
                city={city}
                setCity={setCity}
                country={country}
                setCountry={setCountry}
                scanning={false}
                onStart={(subs, meta) =>
                  onSearchToCockpit?.({
                    subcategories: subs,
                    qOverride: meta?.query,
                    cityOverride: meta?.city,
                    countryOverride: meta?.country
                  })
                }
                suggestFn={suggestFn}
                ctaLabel="Sweep Leads in Cockpit"
              />
            )}

            {customZoneExplorer !== undefined ? customZoneExplorer : (
              <CityZonesExplorer
                city={city}
                country={country}
                zoneData={cityZones?.zoneData}
                loading={cityZones?.loading}
                zoneMode={cityZones?.zoneMode}
                onChangeMode={cityZones?.setZoneMode}
                effectiveZones={cityZones?.effectiveZones || []}
                selectedZoneNames={cityZones?.selectedZoneNames}
                onToggleZone={cityZones?.toggleZoneName}
                onSelectAllZones={cityZones?.selectAllZones}
                onSetZoneSubset={cityZones?.setZoneSubset}
                onSweepSelected={(zonesSubset) => onSearchToCockpit?.({ selectedZones: zonesSubset })}
              />
            )}

            <SovereignFlagStrip
              selectedCountry={country}
              onSelectCountry={(nextCode) => {
                setCountry(nextCode);
                if (city) setCity(getCountryByCode(nextCode).defaultCity);
              }}
              selectedCity={city}
              onSelectCity={(ct) => setCity(ct)}
              countriesOverview={cityZones?.countriesOverview}
            />
          </div>

          {/* Subtle Secondary Sample Preview Trigger */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={previewState.loading}
              onClick={() => onRunPreview(query || activeCountry.vocabulary[0]?.category, city || activeCountry.defaultCity, country)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(15,23,42,0.1)',
                color: 'var(--lp-ink-2)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <ArrowDown size={13} color="#d97706" />
              {previewState.loading ? 'Running Sample Preview…' : `Or preview 10 live leads in ${city || activeCountry.defaultCity}`}
            </button>

            {liveStats?.ok && (
              <span className="lp-tabular" style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.08)', color: 'var(--lp-ink-2)' }}>
                <b>{liveStats.marketsOnline}</b> markets online
                {liveStats.leadsHarvestedToday > 0 ? ` · ${liveStats.leadsHarvestedToday.toLocaleString()} leads today` : ''}
              </span>
            )}
          </div>
        </motion.div>
      </section>

      {/* SECTION 2: LIVE PROOF (Optional 10-Lead Verifiable Preview) */}
      <section id="live-proof" style={{ padding: '40px 16px 56px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="lp-glass"
          style={{ padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 16, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FlagSphere code={previewState.country || country} size={20} active />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--lp-ink)' }}>
                  Live Engine Preview (Up to 10 Sample Listings)
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--lp-ink-3)' }}>
                Verify category matching and direct phone extraction live, or launch the full ward-by-ward sweep in the Cockpit.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <IntentPill icon={Tag} tone="gold">Query: {previewState.query || query || activeCountry.vocabulary[0]?.category}</IntentPill>
              <IntentPill icon={MapPin} tone="sapphire">{previewState.city || city || activeCountry.defaultCity}</IntentPill>
              <LiquidButton variant="gold" size="sm" iconRight={ArrowUpRight} onClick={() => onSearchToCockpit?.()}>
                Sweep in Cockpit
              </LiquidButton>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {previewState.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={52} radius={12} />
                ))}
              </div>
            ) : previewState.error ? (
              <div style={{ padding: 20, borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217,119,6,0.3)', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span>{previewState.error}</span>
                <LiquidButton variant="gold" size="sm" onClick={() => onSearchToCockpit?.()}>
                  Launch Cockpit Directly
                </LiquidButton>
              </div>
            ) : previewState.leads.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--lp-ink-3)', fontSize: 13 }}>
                <p style={{ margin: '0 0 12px' }}>
                  Click any sample below to inspect up to 10 live public listings, or use the main search bar above to run the full ward sweep in the Cockpit.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {activeCountry.vocabulary.map((v) => (
                    <button
                      key={v.term}
                      type="button"
                      onClick={() => {
                        setQuery(v.category);
                        setCity(v.sampleCity);
                        onRunPreview(v.category, v.sampleCity, country);
                      }}
                      style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(217,119,6,0.34)', background: '#fffbeb', color: '#78350f', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Preview: {v.category} in {v.sampleCity}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previewState.leads.map((lead, idx) => (
                  <div
                    key={lead.id || `${lead.name}-${idx}`}
                    className="lp-row-enter"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ minWidth: 200, flex: '1 1 260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lp-ink)' }}>{lead.name || lead.title}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 8, background: '#ecfdf5', color: '#047857', border: '1px solid rgba(5,150,105,0.24)', fontSize: 11, fontWeight: 700 }}>
                          <CheckCircle2 size={11} /> {lead.category || previewState.query}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--lp-ink-3)', marginTop: 2 }}>
                        {lead.address || lead.city || previewState.city}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {(lead.mobilePhone || lead.phone) && (
                        <span className="lp-tabular" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 10, background: '#fffbeb', color: '#78350f', border: '1px solid rgba(217,119,6,0.3)', fontSize: 12, fontWeight: 700 }}>
                          <Phone size={12} /> {lead.mobilePhone || lead.phone}
                        </span>
                      )}
                      {lead.website && (
                        <a
                          href={String(lead.website).startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 10, background: '#f0f9ff', color: '#0369a1', border: '1px solid rgba(2,132,199,0.22)', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}
                        >
                          <Globe2 size={11} /> Website
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </>
  );
}
