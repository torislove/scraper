import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe2, Rocket, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import Country3DFlag from '../components/Country3DFlag';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeGlobe3D from '../components/three/ThreeGlobe3D';

const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳', units: '619,287 Villages & 6k+ Mandals', desc: 'Home Market: All 36 States & UTs, 760+ Districts, 6k+ Mandals, and 619,287 Villages.', sample: 'Wholesale Turmeric in Tenali' },
  { code: 'US', name: 'United States', flag: '🇺🇸', units: '3,143 Counties & Parishes', desc: 'All 50 States, 3,143 Counties, FIPS codes, ZIP centroids & Metropolitan statistical areas.', sample: 'HVAC Contractors in Dallas County TX' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', units: '100+ Counties & Boroughs', desc: 'England, Scotland, Wales, Northern Ireland, 100+ ceremonial counties & Greater London boroughs.', sample: 'B2B Logistics in Birmingham' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', units: '293 Census Divisions', desc: 'All 10 Provinces, 3 Territories & 293 Census Divisions across metropolitan census tracts.', sample: 'Commercial Roofing in Calgary AB' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', units: '537 Local Government Areas', desc: 'All 8 States & Territories, 537 LGAs, Regional councils & Suburb postcode directories.', sample: 'Solar Installers in Brisbane QLD' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', units: '7 Emirates & Free Zones', desc: 'Dubai, Abu Dhabi, Sharjah & all 7 Emirates, mainland economic zones & designated free zones.', sample: 'Freight Forwarders in Dubai' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', units: '5 Planning Regions', desc: 'Central, East, North, North-East, West Planning Regions, 55 development areas & 81 postal sectors.', sample: 'Fintech Consultants in Raffles Place' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', units: '67 Territorial Authorities', desc: '16 Regional Councils, 67 Territorial Authorities, Auckland local boards & postcodes.', sample: 'Precision Engineering in Christchurch' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', units: '82 Municipal Districts', desc: 'All 4 Historical Provinces, 31 Local Authorities & 82 Municipal District councils.', sample: 'Medical Device Firms in Galway' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', units: '257 Municipalities', desc: 'All 9 Provinces, 52 District & Metro Municipalities & 205 local municipal councils.', sample: 'Mining Equipment in Johannesburg' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', units: '401 Landkreise & Cities', desc: 'All 16 Bundesländer, 401 Landkreise and Kreisfreie Städte with exact postal code sectors.', sample: 'Maschinenbau in Landkreis München' }
];

export default function LandingGlobalCoverage() {
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState('IN');

  const selectedCountry = COUNTRIES.find(c => c.code === selectedCode) || COUNTRIES[0];

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="lx-highlight-tag">
          <Globe2 size={13} />
          <span>11 SOVEREIGN NATIONS · 650,000+ ADMINISTRATIVE UNITS</span>
        </span>
      </motion.div>

      {/* 2. Headline & Simple Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          From Indian Mandals to US Counties.{' '}
          <span className="lx-gradient-text">Full Local Depth.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Most tools only scrape capital cities. We index every village, mandal, district, county, and borough
          with native postal codes and dialing prefixes across 11 sovereign nations.
        </p>
      </div>

      {/* 3. Interactive 3D WebGL Sovereign Globe Stage */}
      <motion.div
        className="lx-sovereign-stage"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'center' }}>
          {/* Left: Interactive 3D WebGL Globe Canvas */}
          <div style={{ height: 210, width: '100%', position: 'relative', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <ThreeGlobe3D selectedCountry={selectedCode} onSelectCountry={setSelectedCode} />
            <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
              <span>🖱️ Drag to rotate 3D Earth</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>{selectedCountry.flag} {selectedCountry.name} Targeted</span>
            </div>
          </div>

          {/* Right: Selected Country Telemetry Card */}
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '4px 0' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 24 }}>{selectedCountry.flag}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 850, color: '#0f172a' }}>
                    {selectedCountry.name}
                  </h3>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#059669' }}>
                    {selectedCountry.units}
                  </span>
                </div>
              </div>

              <p style={{ margin: '10px 0 6px', fontSize: 12.5, lineHeight: 1.5, color: '#475569' }}>
                {selectedCountry.desc}
              </p>

              <div style={{ fontSize: 11.5, color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: 8 }}>
                <strong>Sample Query:</strong> &ldquo;{selectedCountry.sample}&rdquo;
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <LiquidButton3D
                variant="emerald"
                size="sm"
                icon={Rocket}
                onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCountry.code)}`)}
              >
                Launch {selectedCountry.name} Territory Sweep
              </LiquidButton3D>
            </div>
          </div>
        </div>

        {/* 11 Country Selectors */}
        <div className="lx-flags-orbit-strip">
          {COUNTRIES.map(c => {
            const isSelected = c.code === selectedCode;
            return (
              <button
                key={c.code}
                type="button"
                className={`lx-flag-orbit-chip ${isSelected ? 'is-active' : ''}`}
                onClick={() => setSelectedCode(c.code)}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="emerald"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCode)}`)}
        >
          Sweep {selectedCountry.name} Territory Free
        </LiquidButton3D>

        <LiquidButton3D
          variant="ghost"
          size="lg"
          onClick={() => navigate('/hardware')}
        >
          Check Hardware RAM Concurrency →
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ 11 Sovereign Revenue Markets</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Native Village &amp; County Granularity</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Local Postal Code Centroids</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ International Carrier Dialing Codes</span>
        </span>
      </div>
    </div>
  );
}
