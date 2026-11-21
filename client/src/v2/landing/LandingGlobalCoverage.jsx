import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, Rocket, MapPin, CheckCircle2, Play, Pause, ArrowRight, ShieldCheck, Zap, Building } from 'lucide-react';
import LiquidButton3D from '../components/LiquidButton3D';
import ThreeGlobe3D from '../components/three/ThreeGlobe3D';
import CountryMapVector from '../components/CountryMapVector';
import Country3DFlag from '../components/Country3DFlag';
import RollingCounter from '../components/RollingCounter';

const COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    unitsNum: 7935,
    unitsLabel: '7,935 Cities & Towns · 6k+ Mandals · 619k Villages',
    desc: 'All 36 States & UTs, 7,935 Cities & Towns, 760+ Districts, 6k+ Mandals, and 619,287 Villages with PIN codes.',
    cityTiers: 'Metros (Delhi, Mumbai, BLR) · Tier-2 (Tenali, Morbi, Surat, Tirupur) · 6k+ Mandals',
    query: 'Wholesale Turmeric in Tenali Mandals & Guntur AP',
    leads: [
      { name: 'Minar Traders & Turmeric Millers', area: 'Tenali Mandals, AP · PIN 522201', phone: '+91 98856 03754', tag: 'Direct WhatsApp' },
      { name: 'Sri Balaji Turmeric Processing Co', area: 'Guntur District, AP · PIN 522003', phone: '+91 94906 42816', tag: 'Raw Curcumin' }
    ]
  },
  {
    code: 'US',
    name: 'United States',
    unitsNum: 19495,
    unitsLabel: '19,495 Incorporated Cities & 3,143 Counties',
    desc: 'All 50 States, 19,495 Incorporated Cities & Towns, 3,143 Counties, FIPS codes & ZIP centroids.',
    cityTiers: 'Metros (NYC, LA, Chicago, Dallas) · Regional (Plano, Irvine, Mesa, Naperville)',
    query: 'HVAC Contractors in Collin & Dallas County TX',
    leads: [
      { name: 'Lone Star Air & Heating Co.', area: 'Plano, TX · ZIP 75024', phone: '+1 (214) 555-0192', tag: 'Commercial' },
      { name: 'Metroplex Climate Solutions', area: 'Dallas, TX · ZIP 75201', phone: '+1 (469) 555-4418', tag: 'Emergency' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    unitsNum: 76,
    unitsLabel: '76 Official Cities · 100+ Ceremonial Counties',
    desc: 'England, Scotland, Wales, Northern Ireland, 76 official cities, 100+ ceremonial counties & London boroughs.',
    cityTiers: 'Metros (London, Birmingham, Manchester) · Industrial (Slough, Trafford, Digbeth)',
    query: 'Fintech & B2B Logistics in Slough & City of London',
    leads: [
      { name: 'Thames Capital Advisory Ltd', area: 'Lombard St, London · EC2V 7HQ', phone: '+44 20 7946 0912', tag: 'Direct WhatsApp' },
      { name: 'Slough Trading Logistics Hub', area: 'Slough Trading Estate · SL1 4NB', phone: '+44 1753 496 084', tag: 'Freight Hub' }
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    unitsNum: 3573,
    unitsLabel: '3,573 Municipal Cities & 293 Census Divisions',
    desc: 'All 10 Provinces, 3 Territories, 3,573 Municipal Cities & Towns, and 293 Census Divisions.',
    cityTiers: 'Metros (Toronto, Vancouver, Montreal, Calgary) · Commercial (Mississauga, Markham, Nisku)',
    query: 'Commercial Precision Tooling in Peel Region & Mississauga',
    leads: [
      { name: 'Bow Valley Precision Tooling Fab', area: 'Mississauga, ON · L5T', phone: '+1 (905) 555-0149', tag: 'Industrial' },
      { name: 'Nisku Energy Fabrication Co.', area: 'Edmonton / Nisku · AB T9E', phone: '+1 (780) 555-0184', tag: 'Direct WhatsApp' }
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    unitsNum: 1800,
    unitsLabel: '1,800+ Cities & Suburbs · 537 LGAs',
    desc: 'All 8 States & Territories, 1,800+ Cities & Commercial Suburbs, 537 Local Government Areas.',
    cityTiers: 'Metros (Sydney, Melbourne, Brisbane, Perth) · Industrial (Dandenong, Blacktown, Acacia Ridge)',
    query: 'Commercial Solar in Dandenong South & Melbourne',
    leads: [
      { name: 'Sunstate Commercial Solar Ltd', area: 'Dandenong South, VIC 3175', phone: '+61 3 7010 1142', tag: 'Direct WhatsApp' },
      { name: 'Pacific Mining Tech Solutions', area: 'Blacktown, NSW 2148', phone: '+61 2 9496 0214', tag: 'Heavy Industry' }
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    unitsNum: 45,
    unitsLabel: 'Major Cities & 45+ Designated Free Zones',
    desc: 'Dubai, Abu Dhabi, Sharjah, Ajman, RAK & all 7 Emirates with mainland commercial sectors & free zones.',
    cityTiers: 'Metros (Dubai, Abu Dhabi, Sharjah) · Free Zones (JAFZA, Musaffah, Al Quoz, Sharjah Ind.)',
    query: 'Freight Forwarders in JAFZA & Dubai Maritime City',
    leads: [
      { name: 'Gulf Falcon Global Logistics', area: 'JAFZA Free Zone, Dubai', phone: '+971 4 394 8812', tag: 'Direct WhatsApp' },
      { name: 'Musaffah Heavy Petro Tech', area: 'Musaffah Industrial, Abu Dhabi', phone: '+971 2 642 9901', tag: 'Commercial' }
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    unitsNum: 55,
    unitsLabel: '55 New Town Cities & 81 Postal Sectors',
    desc: 'Central, East, North, North-East, West Planning Regions, 55 development town sectors & 81 postal sectors.',
    cityTiers: 'Commercial Hubs: Jurong / Tuas · Marina Bay CBD · Changi Logistics · Woodlands',
    query: 'Maritime Logistics in Jurong Industrial Port',
    leads: [
      { name: 'Straits Maritime Logistics Pte', area: 'Jurong Port Rd · Postal 619110', phone: '+65 6791 2284', tag: 'Direct WhatsApp' },
      { name: 'Raffles Cloud AI Solutions', area: 'Marina Bay Financial Centre · 018981', phone: '+65 6534 8910', tag: 'Enterprise' }
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    unitsNum: 67,
    unitsLabel: '67 Cities & Territorial Authorities',
    desc: '16 Regional Councils, 67 Territorial Cities & Authorities, Auckland local boards & postcodes.',
    cityTiers: 'Cities: Auckland, Christchurch, Wellington · Industrial: Penrose, Hornby, Gracefield',
    query: 'Precision Engineering in Hornby Christchurch',
    leads: [
      { name: 'Canterbury Aerospace CNC Works', area: 'Hornby Industrial, CHC · 8042', phone: '+64 3 379 8412', tag: 'Direct WhatsApp' },
      { name: 'Penrose Commercial Fab Co.', area: 'Penrose, Auckland · 1061', phone: '+64 9 309 4410', tag: 'Agri Export' }
    ]
  },
  {
    code: 'IE',
    name: 'Ireland',
    unitsNum: 31,
    unitsLabel: '31 City & County Councils · 82 Municipalities',
    desc: 'All 4 Historical Provinces, 31 Local City & County Authorities, and 82 Municipal District councils.',
    cityTiers: 'Cities: Dublin, Cork, Galway, Limerick · Hubs: Parkmore MedTech, Little Island, Citywest',
    query: 'MedTech & Pharma in Parkmore East Galway',
    leads: [
      { name: 'Atlantic BioDevice Labs Ireland', area: 'Parkmore East, Galway · H91', phone: '+353 91 751 290', tag: 'Direct WhatsApp' },
      { name: 'Citywest Telecom Solutions', area: 'Citywest Business Campus, Dublin 24', phone: '+353 1 496 0881', tag: 'Enterprise' }
    ]
  },
  {
    code: 'ZA',
    name: 'South Africa',
    unitsNum: 8,
    unitsLabel: '8 Metropolitan Cities & 257 Municipal Councils',
    desc: 'All 9 Provinces, 8 Metropolitan Cities, 52 District Councils & 205 local municipal councils.',
    cityTiers: 'Metro Cities: Johannesburg, Cape Town, Durban, Pretoria · Industrial: Alrode, Prospecton',
    query: 'Heavy Machinery in Alrode Industrial & Soweto',
    leads: [
      { name: 'Witwatersrand Heavy Machinery', area: 'Alrode, Ekurhuleni · 1451', phone: '+27 11 832 9410', tag: 'Direct WhatsApp' },
      { name: 'Prospecton Marine Suppliers', area: 'Prospecton, Durban · 4110', phone: '+27 21 418 3320', tag: 'Marine Trade' }
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    unitsNum: 2056,
    unitsLabel: '2,056 Cities & 401 Landkreise',
    desc: 'All 16 Bundesländer, 2,056 Cities & Towns, 401 Landkreise and Kreisfreie Städte with postal codes.',
    cityTiers: 'Metros (Munich, Berlin, Frankfurt, Stuttgart) · Mittelstand Hubs (Garching, Sindelfingen, Erlangen)',
    query: 'Maschinenbau in Garching bei München & Sindelfingen',
    leads: [
      { name: 'Bavaria Präzisionstechnik GmbH', area: 'Garching bei München · PLZ 85748', phone: '+49 89 3290 210', tag: 'Direct WhatsApp' },
      { name: 'Sindelfingen Werkzeugbau Fabrik', area: 'Sindelfingen · PLZ 71063', phone: '+49 7031 3290 91', tag: 'Tooling & Die' }
    ]
  }
];

export default function LandingGlobalCoverage() {
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(true);
  const [cycleKey, setCycleKey] = useState(0);
  const orbitStripRef = useRef(null);

  // 3.2-Second Continuous Auto-Tour Loop across all 11 Sovereign Nations
  useEffect(() => {
    if (!isAutoTouring) return;
    const timer = setInterval(() => {
      setSelectedIdx(prev => (prev + 1) % COUNTRIES.length);
      setCycleKey(k => k + 1);
    }, 3200);
    return () => clearInterval(timer);
  }, [isAutoTouring]);

  // Keep active flag visible in orbit strip
  useEffect(() => {
    if (!orbitStripRef.current) return;
    const activeChip = orbitStripRef.current.children[selectedIdx];
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIdx]);

  const selectedCountry = COUNTRIES[selectedIdx];

  const handleCountryClick = (idx) => {
    setSelectedIdx(idx);
    setCycleKey(k => k + 1);
  };

  return (
    <div className="lx-screen-container">
      {/* 1. Eyebrow Badge with Live Auto-Tour Status & Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <span className="lx-highlight-tag">
          <Globe2 size={13} />
          <span>11 SOVEREIGN NATIONS · 40,000+ CITIES &amp; TOWNS · 650,000+ LOCAL UNITS</span>
        </span>

        {/* Auto-Tour Play/Pause Control Button */}
        <button
          type="button"
          onClick={() => setIsAutoTouring(prev => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 12px',
            borderRadius: 999,
            background: isAutoTouring ? '#ecfdf5' : '#f1f5f9',
            border: isAutoTouring ? '1.5px solid #a7f3d0' : '1.5px solid #cbd5e1',
            color: isAutoTouring ? '#047857' : '#64748b',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.16s ease'
          }}
          title={isAutoTouring ? 'Click to Pause Auto-Tour' : 'Click to Resume Auto-Tour'}
        >
          {isAutoTouring ? (
            <>
              <span className="lx-chip-live-dot" />
              <span>Touring 11 Nations (3.2s)</span>
              <Pause size={10} style={{ marginLeft: 2 }} />
            </>
          ) : (
            <>
              <Play size={10} />
              <span>Auto-Tour Paused · Click to Play</span>
            </>
          )}
        </button>
      </motion.div>

      {/* 2. Headline & Dynamic Counter Explainer */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          From Metro Cities to Rural Mandals.{' '}
          <span className="lx-gradient-text">Full Local Depth.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Most tools only scrape capital cities. We index every Tier-1 metropolis, Tier-2 commercial city,
          mandal, and county with native postal codes across <strong style={{ color: '#047857' }}><RollingCounter target={11} /> sovereign nations</strong>.
        </p>
      </div>

      {/* 3. Interactive Stage: 3D Globe + High-Precision Vector Map + Telemetry Card */}
      <motion.div
        className="lx-sovereign-stage lx-border-beam-box"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        {/* Continuous Auto-Tour Progress Laser Bar */}
        <div className="lx-tour-progress-track">
          <motion.div
            key={cycleKey}
            initial={{ width: '0%' }}
            animate={{ width: isAutoTouring ? '100%' : '0%' }}
            transition={{ duration: 3.2, ease: 'linear' }}
            className="lx-tour-progress-bar"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 14, alignItems: 'center' }}>
          {/* Column 1: Interactive 3D WebGL Globe Canvas */}
          <div
            style={{
              height: 215,
              width: '100%',
              position: 'relative',
              background: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <ThreeGlobe3D selectedCountry={selectedCountry.code} />
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 10,
                right: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#64748b',
                pointerEvents: 'none'
              }}
            >
              <span>🖱️ Drag to rotate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Country3DFlag code={selectedCountry.code} size={16} active isHome={selectedCountry.code === 'IN'} />
                <span style={{ color: '#059669', fontWeight: 800 }}>{selectedCountry.name}</span>
              </div>
            </div>
          </div>

          {/* Column 2: High-Precision Country Vector Map with Micro-Zone Cities Radar */}
          <div
            style={{
              height: 215,
              width: '100%',
              position: 'relative',
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <CountryMapVector countryCode={selectedCountry.code} />
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 10,
                right: 10,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#64748b',
                pointerEvents: 'none'
              }}
            >
              <span className="lx-precision-telemetry">CITIES &amp; MICRO-ZONES</span>
              <span style={{ color: '#047857', fontWeight: 800 }}>Verified Coverage</span>
            </div>
          </div>

          {/* Column 3: Selected Country Live Telemetry & Lead Stream */}
          <div
            style={{
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              padding: '2px 0'
            }}
          >
            <div>
              {/* Country Header with 3D Flag & Unit Counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Country3DFlag code={selectedCountry.code} size={36} active isHome={selectedCountry.code === 'IN'} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                      {selectedCountry.name} Cities &amp; Mandals
                    </h3>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669' }}>
                      <RollingCounter target={selectedCountry.unitsNum} /> {selectedCountry.unitsLabel.replace(/^\d+[\d,]*\+?\s*/, '')}
                    </span>
                  </div>
                </div>
              </div>

              {/* City Tiers Telemetry Badge */}
              <div style={{ fontSize: 9.5, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 6, margin: '4px 0', fontWeight: 700 }}>
                {selectedCountry.cityTiers}
              </div>

              {/* Animated Query & Leads Container */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCountry.code}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28 }}
                >
                  <div style={{ fontSize: 10.5, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, margin: '4px 0', border: '1px solid #e2e8f0' }}>
                    <strong style={{ color: '#0f172a' }}>City Search:</strong> &ldquo;{selectedCountry.query}&rdquo;
                  </div>

                  {/* Streaming Lead Cards for the Active Country */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '4px 0' }}>
                    {selectedCountry.leads.map((ld, i) => (
                      <div
                        key={ld.name + i}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 7,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <Country3DFlag code={selectedCountry.code} size={14} isHome={selectedCountry.code === 'IN'} />
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: 11, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ld.name}
                            </strong>
                            <span style={{ fontSize: 9.5, color: '#64748b' }}>{ld.area}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669', display: 'block' }}>{ld.phone}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '1px 5px', borderRadius: 4 }}>
                            {ld.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={{ marginTop: 5 }}>
              <LiquidButton3D
                variant="emerald"
                size="sm"
                icon={Rocket}
                onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCountry.code)}`)}
              >
                Activate {selectedCountry.name} Engine Sweep
              </LiquidButton3D>
            </div>
          </div>
        </div>

        {/* 11 Country Selectors Orbit Strip with 3D Graphic Flags */}
        <div ref={orbitStripRef} className="lx-flags-orbit-strip">
          {COUNTRIES.map((c, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={c.code}
                type="button"
                className={`lx-flag-orbit-chip ${isSelected ? 'is-active' : ''}`}
                onClick={() => handleCountryClick(idx)}
              >
                <Country3DFlag code={c.code} size={22} active={isSelected} isHome={c.code === 'IN'} />
                <span>{c.name}</span>
                {isSelected && isAutoTouring && (
                  <span className="lx-chip-live-dot" />
                )}
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
          onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCountry.code)}`)}
        >
          Activate {selectedCountry.name} Engine Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="ghost"
          size="lg"
          onClick={() => navigate('/hardware')}
        >
          Check Multi-City Hardware Concurrency →
        </LiquidButton3D>
      </div>

      {/* 5. 4 Micro Value Pills */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <span>✓ 40,000+ Cities &amp; Micro-Zone Mandals</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Metros &amp; Tier-2/3 Industrial Cities</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Local Postal Code Centroids</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Direct Mobile &amp; WhatsApp Dialers</span>
        </span>
      </div>
    </div>
  );
}
