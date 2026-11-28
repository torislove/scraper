/**
 * shared/pages/CountryHubPage.jsx
 * Localized Country Acquisition Page (/leads/:countryCode and nested routes) across the 5 revenue markets.
 * Features native commercial vocabulary, native DE & FR copy with language toggle,
 * hreflang SEO tags, real 10-lead preview, and regional compliance summaries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MapPin, Phone, Clock, Globe2, ArrowRight, Play, Rocket, CheckCircle2, Shield
} from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '../data/countries';
import FlagChip, { FlagSphere } from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';
import { Skeleton } from '../ui/Primitives';
import OmniSearchBar from '../search/OmniSearchBar';
import { useCityZones } from '../cockpit/useCityZones';
import CityZonesExplorer from '../cockpit/CityZonesExplorer';
import LandingNavbar from '../../client/src/v2/landing/LandingNavbar';

function humanizeSlug(slug = '') {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default function CountryHubPage({ apiBase = '/api', suggestFn }) {
  const { countryCode = 'in', citySlug, subvectorSlug } = useParams();
  const navigate = useNavigate();
  const country = getCountryByCode(countryCode);
  const hasNativeLang = Boolean(country.localizedCopy);

  const [useNativeLang, setUseNativeLang] = useState(hasNativeLang);
  const [query, setQuery] = useState(() => humanizeSlug(subvectorSlug) || country.vocabulary[0]?.category || 'Hospitals');
  const [city, setCity] = useState(() => humanizeSlug(citySlug) || country.defaultCity);
  const [preview, setPreview] = useState({ loading: false, error: '', leads: [] });
  const cityZones = useCityZones({ city, country: country.code });

  useEffect(() => {
    setUseNativeLang(Boolean(country.localizedCopy));
    setQuery(humanizeSlug(subvectorSlug) || country.vocabulary[0]?.category || 'Hospitals');
    setCity(humanizeSlug(citySlug) || country.defaultCity);
    setPreview({ loading: false, error: '', leads: [] });
  }, [country.code, citySlug, subvectorSlug]);

  // Inject per-country document title, meta description, and hreflang links
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${country.name} Business Contact Discovery (${country.code}) — Scraper.co.in`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') || '';
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `Search publicly listed businesses, clinics, and trades across ${country.name} (${country.phone}). Separate direct mobiles and landlines, filter by category, and export CSV or vCard.`
      );
    }

    const injected = [];
    for (const c of COUNTRIES) {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = c.localizedCopy?.langCode ? `${c.localizedCopy.langCode}-${c.code}` : `en-${c.code}`;
      link.href = `${window.location.origin}/leads/${c.code.toLowerCase()}`;
      link.dataset.lpHreflang = '1';
      document.head.appendChild(link);
      injected.push(link);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      injected.forEach((el) => el.remove());
    };
  }, [country]);

  const runPreview = useCallback(
    async (qInput, cInput) => {
      const qClean = String(qInput || query || country.vocabulary[0]?.category || '').trim();
      const cClean = String(cInput || city || country.defaultCity).trim();
      setPreview({ loading: true, error: '', leads: [] });
      try {
        const { data } = await axios.get(`${apiBase}/public/preview`, {
          params: { q: qClean, city: cClean, country: country.code },
          timeout: 8000
        });
        if (data?.ok) {
          setPreview({ loading: false, error: '', leads: Array.isArray(data.leads) ? data.leads : [] });
        } else {
          setPreview({ loading: false, error: data?.message || 'Preview unavailable.', leads: [] });
        }
      } catch (err) {
        setPreview({
          loading: false,
          error: err?.response?.data?.message || 'Live preview engine busy — open the workspace to run directly.',
          leads: []
        });
      }
    },
    [apiBase, country, query, city]
  );

  const copy = useNativeLang && country.localizedCopy ? country.localizedCopy : null;
  const openWorkspace = () => {
    const params = new URLSearchParams({ country: country.code });
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    if (cityZones.zoneMode === 'all') params.set('zoneMode', 'all');
    navigate(`/command?${params.toString()}`);
  };

  return (
    <div className="lp-canvas-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />

      <main style={{ flex: 1, maxWidth: 1060, width: '100%', margin: '0 auto', padding: '32px 16px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Country Hero */}
        <section className="lp-glass" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <FlagSphere code={country.code} size={34} active />
            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#fffbeb', border: '1px solid rgba(217,119,6,0.3)', color: '#92400e' }}>
              {country.nativeName} · {country.phone} · {country.currency}
            </span>

            {hasNativeLang && (
              <button
                type="button"
                onClick={() => setUseNativeLang((p) => !p)}
                style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(2,132,199,0.3)', background: '#f0f9ff', color: '#0369a1', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {useNativeLang ? 'Switch to English' : `View in ${country.localizedCopy.langLabel}`}
              </button>
            )}
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)', fontWeight: 800, color: 'var(--lp-ink)', letterSpacing: '-0.025em' }}>
            {copy ? copy.headline : `Public Business Contact Discovery in ${country.name}`}
          </h1>

          <p style={{ margin: '0 0 20px', maxWidth: 660, fontSize: 14, color: 'var(--lp-ink-3)', lineHeight: 1.6 }}>
            {copy
              ? copy.subheadline
              : `Search publicly listed establishments across ${country.name} (${country.adminHierarchy}), separating mobile numbers from fixed lines with category-level filtering.`}
          </p>

          <div style={{ width: '100%', maxWidth: 780, textAlign: 'left' }}>
            <OmniSearchBar
              query={query}
              setQuery={setQuery}
              city={city}
              setCity={setCity}
              country={country.code}
              setCountry={(next) => navigate(`/leads/${next.toLowerCase()}`)}
              scanning={preview.loading}
              onStart={() => runPreview(query, city)}
              suggestFn={suggestFn}
              ctaLabel={copy ? copy.ctaPreview : 'Preview 10 Leads'}
            />
          </div>

          {/* Target Cities */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: 12 }}>
            {country.cities.map((ct) => {
              const overviewItem = (cityZones.countriesOverview?.[country.code] || []).find((x) => x.city.toLowerCase() === ct.toLowerCase());
              const zoneCount = overviewItem ? (overviewItem.allCount > overviewItem.smartCount ? `${overviewItem.smartCount}/${overviewItem.allCount}` : `${overviewItem.smartCount}`) : '';
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setCity(ct)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 11px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: city === ct ? 800 : 600,
                    background: city === ct ? '#0284c7' : '#ffffff',
                    color: city === ct ? '#ffffff' : 'var(--lp-ink-2)',
                    border: `1px solid ${city === ct ? '#0284c7' : 'rgba(15,23,42,0.1)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <MapPin size={11} />
                  <span>{ct}</span>
                  {zoneCount && (
                    <span className="lp-tabular" style={{ fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 6, background: city === ct ? 'rgba(255,255,255,0.2)' : '#f0f9ff', color: city === ct ? '#ffffff' : '#0369a1' }}>
                      {zoneCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ width: '100%', maxWidth: 780, textAlign: 'left' }}>
            <CityZonesExplorer
              city={city}
              country={country.code}
              zoneData={cityZones.zoneData}
              loading={cityZones.loading}
              zoneMode={cityZones.zoneMode}
              onChangeMode={cityZones.setZoneMode}
              effectiveZones={cityZones.effectiveZones}
              selectedZoneNames={cityZones.selectedZoneNames}
              onToggleZone={cityZones.toggleZoneName}
              onSelectAllZones={cityZones.selectAllZones}
              onSetZoneSubset={cityZones.setZoneSubset}
              onSweepSelected={openWorkspace}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            <LiquidButton variant="gold" size="lg" icon={Rocket} onClick={openWorkspace}>
              {copy ? copy.ctaWorkspace : `Open ${country.name} Workspace`}
            </LiquidButton>
            <LiquidButton variant="glass-gold" size="lg" icon={Play} disabled={preview.loading} onClick={() => runPreview(query, city)}>
              {copy ? copy.ctaPreview : `Run Live Preview in ${city}`}
            </LiquidButton>
          </div>
        </section>

        {/* Live Preview Results */}
        {(preview.loading || preview.error || preview.leads.length > 0) && (
          <section className="lp-glass" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>
              Live Preview — {query} in {city} ({country.code})
            </h2>
            {preview.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map((i) => <Skeleton key={i} height={48} radius={10} />)}
              </div>
            ) : preview.error ? (
              <div style={{ padding: 14, borderRadius: 10, background: '#fffbeb', color: '#92400e', fontSize: 13 }}>{preview.error}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {preview.leads.map((lead, idx) => (
                  <div key={lead.id || idx} style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lp-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{lead.name || lead.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: '#ecfdf5', color: '#047857' }}>
                          <CheckCircle2 size={10} style={{ verticalAlign: 'middle' }} /> {lead.category || query}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--lp-ink-3)' }}>{lead.address || city}</div>
                    </div>
                    {(lead.mobilePhone || lead.phone) && (
                      <span className="lp-tabular" style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#fffbeb', color: '#78350f' }}>
                        <Phone size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {lead.mobilePhone || lead.phone}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Native Vocabulary & Local Formats */}
        <section className="lp-glass-subtle" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--lp-ink)' }}>
              {copy ? copy.vocabHeading : `Native Industry Terminology in ${country.name}`}
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 700, color: 'var(--lp-ink-2)' }}>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
                <Phone size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {country.phoneSample}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
                <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {country.hoursSample}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {country.vocabulary.map((v) => (
              <div key={v.term} style={{ padding: 14, borderRadius: 12, background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lp-ink)' }}>{v.term}</div>
                  <div style={{ fontSize: 12, color: 'var(--lp-ink-3)' }}>{v.category} · {v.sampleCity}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setQuery(v.category); setCity(v.sampleCity); runPreview(v.category, v.sampleCity); }}
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(217,119,6,0.34)', background: '#fffbeb', color: '#92400e', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  Preview in {v.sampleCity} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Regional Compliance Summary */}
        <section className="lp-glass-subtle" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Shield size={17} color="#0284c7" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>
              {copy ? copy.complianceHeading : `${country.name} Compliance Overview (${country.compliance.laws})`}
            </h2>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--lp-ink-2)', lineHeight: 1.6 }}>
            {country.compliance.summary}
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--lp-ink-4)', fontStyle: 'italic' }}>
            Informational summary only — not legal advice. Consult qualified legal counsel regarding applicable data-protection and electronic-marketing regulations before conducting commercial outreach.
          </p>
        </section>

        {/* Centered Stacked 5-Market Switcher */}
        <section style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--lp-ink-4)', marginBottom: 10 }}>
            Explore All 5 Markets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {COUNTRIES.map((c) => (
              <FlagChip
                key={c.code}
                code={c.code}
                name={c.code === 'AE' ? 'UAE' : c.name}
                size={20}
                active={c.code === country.code}
                onClick={() => navigate(`/leads/${c.code.toLowerCase()}`)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
