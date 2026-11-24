import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2,
  Rocket,
  MapPin,
  Play,
  Pause,
  Building,
  Phone,
  Database,
  Layers
} from 'lucide-react';
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
    cityTiers: 'Metros (Bengaluru, Hyderabad, Mumbai, Delhi) · Tech Corridors (HITEC City, Koramangala, BKC)',
    specs: [
      { label: 'Administrative Bounds', value: '36 States/UTs · 760+ Districts · 6k+ Mandals & PINs', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: 'E.164 +91 / 10-digit Mobile Regex & Direct wa.me', icon: Phone },
      { label: 'Tax & Corporate Fields', value: 'GSTIN, PAN, CIN & Registered Business Name', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, OSM, Justdial, IndiaMART, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'US',
    name: 'United States',
    unitsNum: 19495,
    unitsLabel: '19,495 Incorporated Cities & 3,143 Counties',
    cityTiers: 'Metros (NYC, LA, Chicago, Dallas) · Regional (Plano, Irvine, Mesa, Naperville)',
    specs: [
      { label: 'Administrative Bounds', value: '50 States · 3,143 Counties · FIPS & ZIP Centroids', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+1 NANPA Normalization & Direct Owner Lines', icon: Phone },
      { label: 'Enriched Metadata', value: 'Website Emails, Hours, Ratings, Plus Code & Lat/Lng', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, YellowPages, Yelp, Websites & Social Profiles', icon: Database }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    unitsNum: 76,
    unitsLabel: '76 Official Cities · 100+ Ceremonial Counties',
    cityTiers: 'Metros (London, Birmingham, Manchester) · Commercial Hubs (Slough, Trafford, Leeds)',
    specs: [
      { label: 'Administrative Bounds', value: 'England, Scotland, Wales, NI · Boroughs & Postcodes', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+44 UK Mobile (07xxx) & Direct Landline Tagging', icon: Phone },
      { label: 'Corporate & Web Spec', value: 'Official Domain Emails, LinkedIn & Social Bio Links', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, UK Trade Directories, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    unitsNum: 3573,
    unitsLabel: '3,573 Municipal Cities & 293 Census Divisions',
    cityTiers: 'Metros (Toronto, Vancouver, Montreal, Calgary) · Commercial (Mississauga, Markham)',
    specs: [
      { label: 'Administrative Bounds', value: '10 Provinces · 3 Territories · FSA Postal Codes', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+1 North American Formatting & Mobile Classification', icon: Phone },
      { label: 'Enriched Metadata', value: 'Multi-Page Website Emails, Services & Business Hours', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, Canadian Directories, OSM, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    unitsNum: 1800,
    unitsLabel: '1,800+ Cities & Suburbs · 537 LGAs',
    cityTiers: 'Metros (Sydney, Melbourne, Brisbane, Perth) · Industrial (Dandenong, Blacktown)',
    specs: [
      { label: 'Administrative Bounds', value: '8 States/Territories · 537 LGAs · 4-Digit Postcodes', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+61 (04xx) Mobile Detection & Direct Contact Links', icon: Phone },
      { label: 'Enriched Metadata', value: 'Websites, Social Handles, Categories, Services & Reviews', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, YellowPages AU, Websites & Social Profiles', icon: Database }
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    unitsNum: 45,
    unitsLabel: 'Major Cities & 45+ Designated Free Zones',
    cityTiers: 'Metros (Dubai, Abu Dhabi, Sharjah) · Free Zones (JAFZA, DIFC, Business Bay, Musaffah)',
    specs: [
      { label: 'Administrative Bounds', value: '7 Emirates · Mainland Sectors & 45+ Free Zones', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+971 (05x) Direct Mobile & WhatsApp Click-to-Chat', icon: Phone },
      { label: 'Enriched Metadata', value: 'Multilingual Websites, Emails, Hours & PRO Contacts', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, UAE Business Registries, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    unitsNum: 55,
    unitsLabel: '55 Planning Districts & 81 Postal Sectors',
    cityTiers: 'Commercial Hubs: Marina Bay CBD · Jurong / Tuas · Changi Logistics · Woodlands',
    specs: [
      { label: 'Administrative Bounds', value: '5 Planning Regions · 55 Areas · 81 Postal Sectors', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+65 Direct 8/9-Series Mobile & WhatsApp Links', icon: Phone },
      { label: 'Enriched Metadata', value: 'Corporate Website Emails, Services, Hours & Lat/Lng', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, SG Commercial Directories, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    unitsNum: 67,
    unitsLabel: '67 Cities & Territorial Authorities',
    cityTiers: 'Cities: Auckland, Christchurch, Wellington · Commercial: Penrose, Hornby, Gracefield',
    specs: [
      { label: 'Administrative Bounds', value: '16 Regional Councils · 67 Territorial Authorities', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+64 Mobile Normalization & Landline Separation', icon: Phone },
      { label: 'Enriched Metadata', value: 'Websites, Social Profiles, Bookings & Review Metrics', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, NZ Commercial Directories, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'IE',
    name: 'Ireland',
    unitsNum: 31,
    unitsLabel: '31 City & County Councils · 82 Municipalities',
    cityTiers: 'Cities: Dublin, Cork, Galway, Limerick · Hubs: Citywest, Parkmore, Little Island',
    specs: [
      { label: 'Administrative Bounds', value: '4 Provinces · 31 Councils · Eircode Routing', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+353 Mobile (08x) Detection & Direct WhatsApp', icon: Phone },
      { label: 'Enriched Metadata', value: 'Websites, Business Emails, Categories & Coordinates', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, Irish Trade Directories, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'ZA',
    name: 'South Africa',
    unitsNum: 8,
    unitsLabel: '8 Metropolitan Cities & 257 Municipal Councils',
    cityTiers: 'Metros: Johannesburg, Cape Town, Durban, Pretoria · Hubs: Sandton, Alrode, Prospecton',
    specs: [
      { label: 'Administrative Bounds', value: '9 Provinces · 8 Metros · 205 Local Municipalities', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+27 Mobile & WhatsApp Direct Outreach Links', icon: Phone },
      { label: 'Enriched Metadata', value: 'Websites, Emails, Categories, Services & Hours', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, ZA Business Directories, Websites & Socials', icon: Database }
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    unitsNum: 2056,
    unitsLabel: '2,056 Cities & 401 Landkreise',
    cityTiers: 'Metros (Munich, Berlin, Frankfurt, Stuttgart) · Mittelstand (Garching, Sindelfingen)',
    specs: [
      { label: 'Administrative Bounds', value: '16 Bundesländer · 401 Landkreise · PLZ Postal Zones', icon: Layers },
      { label: 'Phone & WhatsApp Spec', value: '+49 Mobile & Commercial Switchboard Classification', icon: Phone },
      { label: 'Enriched Metadata', value: 'Impressum Emails, Websites, Legal Names & Hours', icon: Building },
      { label: 'Primary Data Sources', value: 'Maps, OSM, German Registries, Websites & Socials', icon: Database }
    ]
  }
];

export default function LandingGlobalCoverage() {
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isAutoTouring, setIsAutoTouring] = useState(true);
  const [cycleKey, setCycleKey] = useState(0);
  const orbitStripRef = useRef(null);

  useEffect(() => {
    if (!isAutoTouring) return undefined;
    const timer = setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % COUNTRIES.length);
      setCycleKey((k) => k + 1);
    }, 8000);
    return () => clearInterval(timer);
  }, [isAutoTouring]);

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
    setCycleKey((k) => k + 1);
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
          <span>✦ WORLDWIDE TERRITORY ACCESS</span>
        </span>

        <button
          type="button"
          onClick={() => setIsAutoTouring((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: isAutoTouring ? '#fffbeb' : '#f1f5f9',
            border: isAutoTouring ? '1.5px solid #d97706' : '1.5px solid #cbd5e1',
            color: isAutoTouring ? '#92400e' : '#64748b',
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
              <span>Touring 11 Nations (8s)</span>
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

      {/* 2. Headline & Subcopy */}
      <div style={{ maxWidth: 880 }}>
        <h1 className="lx-kinetic-title">
          Deep Local Coverage Across{' '}
          <span className="lx-gradient-text">11 Sovereign Nations.</span>
        </h1>

        <p className="lx-kinetic-subcopy" style={{ margin: '8px auto 0' }}>
          Pre-indexed administrative boundaries, postal centroids, and country-specific phone/tax extraction across every supported nation.
        </p>
      </div>

      {/* 3. Interactive Stage: 3D Globe + Vector Map + Real Country Extraction Specs */}
      <motion.div
        className="lx-sovereign-stage lx-border-beam-box"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        {/* Auto-Tour Progress Laser Bar */}
        <div className="lx-tour-progress-track">
          <motion.div
            key={cycleKey}
            initial={{ width: '0%' }}
            animate={{ width: isAutoTouring ? '100%' : '0%' }}
            transition={{ duration: 8, ease: 'linear' }}
            className="lx-tour-progress-bar"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: 14, alignItems: 'center' }}>
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
                <span style={{ color: '#b45309', fontWeight: 800 }}>{selectedCountry.name}</span>
              </div>
            </div>
          </div>

          {/* Column 2: High-Precision Country Vector Map */}
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
          </div>

          {/* Column 3: Country Extraction & Enrichment Specification (Zero Mockups) */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Country3DFlag code={selectedCountry.code} size={34} active isHome={selectedCountry.code === 'IN'} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                      {selectedCountry.name} Coverage
                    </h3>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669' }}>
                      <RollingCounter target={selectedCountry.unitsNum} /> {selectedCountry.unitsLabel.replace(/^\d+[\d,]*\+?\s*/, '')}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 9.5, color: '#92400e', background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.28)', padding: '3px 8px', borderRadius: 6, margin: '4px 0', fontWeight: 700 }}>
                {selectedCountry.cityTiers}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCountry.code}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.24 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4.5, margin: '5px 0' }}
                >
                  {selectedCountry.specs.map((sp) => {
                    const SpIcon = sp.icon;
                    return (
                      <div
                        key={sp.label}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 7,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <SpIcon size={13} color="#d97706" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {sp.label}
                          </span>
                          <strong style={{ fontSize: 10.5, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sp.value}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div style={{ marginTop: 4 }}>
              <LiquidButton3D
                variant="gold"
                size="sm"
                icon={Rocket}
                onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCountry.code)}`)}
              >
                Activate {selectedCountry.name} Engine Sweep
              </LiquidButton3D>
            </div>
          </div>
        </div>

        {/* 11 Country Selectors Orbit Strip */}
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
                {isSelected && isAutoTouring && <span className="lx-chip-live-dot" />}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 4. Action Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <LiquidButton3D
          variant="gold"
          size="lg"
          icon={Rocket}
          pulse
          onClick={() => navigate(`/command?country=${encodeURIComponent(selectedCountry.code)}`)}
        >
          Activate {selectedCountry.name} Engine Sweep
        </LiquidButton3D>

        <LiquidButton3D
          variant="glass-gold"
          size="lg"
          onClick={() => navigate(`/leads/${selectedCountry.code.toLowerCase()}`)}
        >
          Explore {selectedCountry.name} Commercial Directory →
        </LiquidButton3D>
      </div>

      {/* 5. Real Capabilities Strip */}
      <div className="lx-value-strip">
        <span className="lx-value-chip is-highlight">
          <MapPin size={12} color="#d97706" />
          <span>40,000+ Cities, Districts &amp; Mandals Indexed</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Country-Specific E.164 &amp; Tax ID Parsing</span>
        </span>
        <span className="lx-value-chip is-highlight">
          <span>✓ Local Postal Code Centroids</span>
        </span>
        <span className="lx-value-chip">
          <span>✓ Direct Mobile &amp; WhatsApp Extraction</span>
        </span>
      </div>
    </div>
  );
}
