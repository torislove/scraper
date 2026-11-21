import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe2, Rocket, MapPin, CheckCircle2 } from 'lucide-react';
import Country3DFlag from '../components/Country3DFlag';
import { POPULAR_COUNTRIES } from '../data/countries';
import { GlobalSovereignIcon } from '../components/FeatureIcons';

const LOCKED_11_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

const COUNTRY_DESCRIPTIONS = {
  IN: 'Home Market · 36 States, 760+ Districts, 6k+ Mandals & 619,287 Villages',
  US: 'All 50 States, 3,143 Counties & Parishes, ZIP Zones & Metros',
  GB: 'England, Scotland, Wales, 100+ Counties & Greater Boroughs',
  CA: 'All 10 Provinces, 3 Territories & 293 Census Divisions',
  AU: 'All 8 States & Territories, 537 Local Government Areas (LGAs)',
  AE: 'Dubai, Abu Dhabi, Sharjah & all 7 Emirates & Free Zones',
  SG: '5 Planning Regions, 55 Development Areas & 81 Postal Sectors',
  NZ: '16 Regions, 67 Territorial Authorities & City Districts',
  IE: 'All 4 Provinces, 31 Local Authorities & 82 Municipal Districts',
  ZA: '9 Provinces, 52 District & Metro Municipalities & 205 Councils',
  DE: 'All 16 Bundesländer, 401 Landkreise & Kreisfreie Städte'
};

export default function LandingGlobalCoverage() {
  const navigate = useNavigate();
  const [selectedMarketCode, setSelectedMarketCode] = useState('IN');

  const lockedMarkets = useMemo(() => {
    return POPULAR_COUNTRIES
      .filter(c => LOCKED_11_CODES.includes(c.code))
      .sort((a, b) => LOCKED_11_CODES.indexOf(a.code) - LOCKED_11_CODES.indexOf(b.code));
  }, []);

  const activeCountryObj = lockedMarkets.find(c => c.code === selectedMarketCode) || lockedMarkets[0];

  return (
    <div className="lx-subpage-wrap">
      {/* Page Header */}
      <section className="lx-subpage-hero">
        <div className="lx-wrap" style={{ maxWidth: 960, textAlign: 'center' }}>
          <div className="lx-eyebrow-capsule" style={{ margin: '0 auto 16px' }}>
            <Globe2 size={13} />
            <span>11 SOVEREIGN NATIONS · 650,000+ ADMINISTRATIVE UNITS</span>
          </div>

          <h1 className="lx-subpage-h1">
            Equal Administrative Depth Across Global Revenue Markets.
          </h1>

          <p className="lx-subpage-copy">
            From 619,287 Indian villages and mandals to 3,143 US counties, 100+ UK boroughs, and 401 German Landkreise —
            each sovereign market receives first-class native territorial boundaries and postal intelligence.
          </p>
        </div>
      </section>

      {/* Interactive Country Switcher */}
      <section className="lx-section">
        <div className="lx-wrap" style={{ maxWidth: 1180 }}>
          <div className="lx-country-grid" style={{ marginBottom: 36 }}>
            {lockedMarkets.map(country => {
              const isHome = country.code === 'IN';
              const isSelected = selectedMarketCode === country.code;
              return (
                <button
                  key={country.code}
                  type="button"
                  aria-pressed={isSelected}
                  className={`lx-country-btn ${isHome ? 'is-home' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMarketCode(country.code)}
                >
                  <Country3DFlag code={country.code} size={28} isHome={isHome} />
                  <div>
                    <b>{country.name} {country.phone ? `(${country.phone})` : ''}</b>
                    <small>{COUNTRY_DESCRIPTIONS[country.code] || `${country.name} local businesses`}</small>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Country Detail Highlight Card */}
          <div className="lx-active-country-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Country3DFlag code={selectedMarketCode} size={44} isHome={selectedMarketCode === 'IN'} />
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: '#0f172a' }}>
                  {activeCountryObj.name} Territory Intelligence
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748b' }}>
                  {COUNTRY_DESCRIPTIONS[selectedMarketCode]}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              style={{ height: 42, padding: '0 20px', borderRadius: 50, fontSize: 13 }}
              onClick={() => navigate(`/command?country=${encodeURIComponent(selectedMarketCode)}`)}
            >
              <Rocket size={14} /> Open {activeCountryObj.name} in Command Center
            </button>
          </div>

          {/* Full Administrative Alignment Matrix */}
          <div className="lx-terminology-card" style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                  Administrative Alignment Matrix Across All 11 Supported Nations
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  Micro-zones cover mandals, suburbs, and neighborhoods. Full territories deliver entire counties, districts, and states.
                </p>
              </div>
              <span
                style={{
                  padding: '6px 14px', borderRadius: 50, background: '#ecfdf5',
                  border: '1px solid #a7f3d0', color: '#047857', fontSize: 12, fontWeight: 800
                }}
              >
                650,000+ TOTAL UNITS INDEXED
              </span>
            </div>

            <div className="lx-terminology-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="lx-terminology-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 14px' }}>Sovereign Nation</th>
                    <th style={{ padding: '12px 14px' }}>Top-Level Division (State / Province)</th>
                    <th style={{ padding: '12px 14px' }}>Regional Unit (District / County / LGA)</th>
                    <th style={{ padding: '12px 14px' }}>Local Micro-Zone (Mandal / Village / Ward)</th>
                    <th style={{ padding: '12px 14px' }}>Dedicated Engines</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#ecfdf5' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#047857' }}>🇮🇳 India (Home)</td>
                    <td style={{ padding: '12px 14px' }}>State / Union Territory (36)</td>
                    <td style={{ padding: '12px 14px' }}>District (760+)</td>
                    <td style={{ padding: '12px 14px' }}>Revenue Mandal / Taluka / 619k+ Villages</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#047857' }}>11 Engines (Full Depth)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇺🇸 United States</td>
                    <td style={{ padding: '12px 14px' }}>State (50 States)</td>
                    <td style={{ padding: '12px 14px' }}>County / Parish (3,143)</td>
                    <td style={{ padding: '12px 14px' }}>City / Township / ZIP Code / Neighborhood</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>12 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇬🇧 United Kingdom</td>
                    <td style={{ padding: '12px 14px' }}>Country / Region (England, Scotland…)</td>
                    <td style={{ padding: '12px 14px' }}>County / Greater Borough (100+)</td>
                    <td style={{ padding: '12px 14px' }}>City / Town / Postcode District / Ward</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>12 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇨🇦 Canada</td>
                    <td style={{ padding: '12px 14px' }}>Province / Territory (13)</td>
                    <td style={{ padding: '12px 14px' }}>Census Division / Regional County (293)</td>
                    <td style={{ padding: '12px 14px' }}>Municipality / City / FSA Postal Zone</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>12 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇦🇺 Australia</td>
                    <td style={{ padding: '12px 14px' }}>State / Territory (8)</td>
                    <td style={{ padding: '12px 14px' }}>Local Government Area (LGA) / Shire (537)</td>
                    <td style={{ padding: '12px 14px' }}>Suburb / Town / Postcode Area</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>12 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇩🇪 Germany</td>
                    <td style={{ padding: '12px 14px' }}>Bundesland (Federal State — 16)</td>
                    <td style={{ padding: '12px 14px' }}>Landkreis / Kreisfreie Stadt (401)</td>
                    <td style={{ padding: '12px 14px' }}>Gemeinde / Stadt / Stadtteil / Ortsteil</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>10 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇦🇪 UAE</td>
                    <td style={{ padding: '12px 14px' }}>Emirate (7 Emirates)</td>
                    <td style={{ padding: '12px 14px' }}>Municipality / Commercial Sector</td>
                    <td style={{ padding: '12px 14px' }}>Community / Commercial District / Free Zone</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>11 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇸🇬 Singapore</td>
                    <td style={{ padding: '12px 14px' }}>National Island</td>
                    <td style={{ padding: '12px 14px' }}>Planning Region (5 Regions)</td>
                    <td style={{ padding: '12px 14px' }}>Planning Area / Subzone / Postal Sector (55)</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>11 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇳🇿 New Zealand</td>
                    <td style={{ padding: '12px 14px' }}>Region (16 Regions)</td>
                    <td style={{ padding: '12px 14px' }}>Territorial Authority (City / District — 67)</td>
                    <td style={{ padding: '12px 14px' }}>Ward / Suburb / Local Postcode Area</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>10 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇮🇪 Ireland</td>
                    <td style={{ padding: '12px 14px' }}>Province (4 Provinces)</td>
                    <td style={{ padding: '12px 14px' }}>County / City Council (31 Authorities)</td>
                    <td style={{ padding: '12px 14px' }}>Municipal District (82) / Electoral Area / Eircode</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>10 Engines</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>🇿🇦 South Africa</td>
                    <td style={{ padding: '12px 14px' }}>Province (9 Provinces)</td>
                    <td style={{ padding: '12px 14px' }}>District / Metropolitan Municipality (52)</td>
                    <td style={{ padding: '12px 14px' }}>Local Municipality / Ward / Suburb (205)</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>10 Engines</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
