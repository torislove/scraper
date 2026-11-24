import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe2,
  Briefcase,
  Search,
  Building,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Zap,
  CheckCircle2,
  Phone,
  Scale,
  Sparkles,
  Flame,
  Wrench,
  Stethoscope,
  Car,
  UtensilsCrossed,
  Sun
} from 'lucide-react';
import BrandLogo from '../v2/components/BrandLogo';
import Country3DFlag from '../v2/components/Country3DFlag';

const SECTORS = [
  {
    id: 'contracting',
    title: 'Commercial Contracting & Trades',
    icon: Wrench,
    niches: [
      { slug: 'commercial-flat-roofing', label: 'Commercial Flat Roofing (TPO/EPDM)', desc: 'Industrial membrane & standing seam roofing contractors' },
      { slug: 'emergency-gas-safe-engineers', label: 'Emergency Gas Safe & Boiler Repair', desc: '24/7 heating breakdown & boiler replacement engineers' },
      { slug: 'water-damage-restoration', label: '24/7 Water Damage & Flood Extraction', desc: 'Emergency flood drying, mold remediation & structural drying' },
      { slug: 'foundation-repair-underpinning', label: 'Foundation Repair & Concrete Leveling', desc: 'House underpinning, slab stabilization & polyjacking' },
      { slug: 'swimming-pool-builders', label: 'Custom Inground Swimming Pool Builders', desc: 'Gunite, concrete & luxury backyard pool contractors' }
    ]
  },
  {
    id: 'legal',
    title: 'High-CPC Legal & Law Firms',
    icon: Scale,
    niches: [
      { slug: 'semi-truck-accident-lawyers', label: 'Semi-Truck & 18-Wheeler Crash Lawyers', desc: 'High-value commercial truck collision litigation firms' },
      { slug: 'medical-malpractice-lawyers', label: 'Medical Malpractice & Birth Injury Law', desc: 'Hospital negligence & surgical error advocates' },
      { slug: 'commercial-property-solicitors', label: 'Commercial Property & Conveyancing Solicitors', desc: 'Commercial lease & property development solicitors' },
      { slug: 'mact-advocates-high-court', label: 'Motor Accident (MACT) & High Court Advocates', desc: 'Tribunal compensation & insurance claim settlement advocates' }
    ]
  },
  {
    id: 'health',
    title: 'High-Value Healthcare & Surgeries',
    icon: Stethoscope,
    niches: [
      { slug: 'fue-hair-transplant-clinics', label: 'FUE Hair Transplant & Restoration Clinics', desc: 'Doctor-led robotic FUE & hair restoration surgeons' },
      { slug: 'plastic-surgery-cosmetic', label: 'Board-Certified Plastic & Cosmetic Surgery', desc: 'Rhinoplasty, body contouring & aesthetic surgery centers' },
      { slug: 'ivf-fertility-centers', label: 'IVF & Reproductive Fertility Centers', desc: 'Advanced fertility, egg freezing & reproductive medicine' },
      { slug: 'root-canal-implants', label: 'Dental Implants & Root Canal Specialists', desc: 'All-on-4 dental implants & endodontic smile design' }
    ]
  },
  {
    id: 'industrial',
    title: 'Industrial Manufacturing & B2B Commodities',
    icon: Briefcase,
    niches: [
      { slug: 'cnc-machining-precision', label: 'Precision CNC Machining & Laser Cutting', desc: '5-axis milling, aerospace tooling & sheet metal fabrication' },
      { slug: 'scrap-metal-recycling', label: 'Industrial Scrap Metal Recyclers', desc: 'Copper buyers, ferrous & non-ferrous industrial scrap yards' },
      { slug: 'enterprise-saas-ai', label: 'Enterprise AI & SaaS Engineering Studios', desc: 'Bengaluru & Hyderabad cloud platforms, DevOps, and B2B software leaders' },
      { slug: 'freight-forwarders-logistics', label: 'International Freight Forwarders & 3PL Logistics', desc: 'Customs clearance, port drayage & ocean container logistics' }
    ]
  },
  {
    id: 'renewables',
    title: 'Renewable Energy & Electrical',
    icon: Sun,
    niches: [
      { slug: 'commercial-solar-epc', label: 'Commercial Solar EPC & Battery Storage', desc: 'Industrial rooftop solar plants & commercial inverters' },
      { slug: '24-7-emergency-sparkies', label: '24/7 Emergency Electricians & Sparkies', desc: 'Short circuit emergency repairs & EV charging installations' }
    ]
  },
  {
    id: 'food',
    title: 'Culinary, Dining & Event Catering',
    icon: UtensilsCrossed,
    niches: [
      { slug: 'traditional-british-gastropubs', label: 'Traditional British Gastropubs & Real Ale', desc: 'Sunday roast & craft brew dining pubs' },
      { slug: 'kalyana-mandapams-pure-veg', label: 'Kalyana Mandapams & Pure Veg Caterers', desc: 'Grand marriage halls & traditional Brahmin feasts' },
      { slug: 'sushi-japanese-ramen', label: 'Artisan Sushi & Japanese Ramen Bars', desc: 'Omakase dining & authentic Japanese ramen bars' }
    ]
  }
];

const SOVEREIGN_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', state: 'texas', city: 'dallas' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', state: 'greater-london', city: 'camden' },
  { code: 'IN', name: 'India', flag: '🇮🇳', state: 'telangana', city: 'hyderabad' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', state: 'victoria', city: 'melbourne' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', state: 'dubai', city: 'business-bay' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', state: 'ontario', city: 'mississauga' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', state: 'bayern', city: 'munich' },
  { code: 'FR', name: 'France', flag: '🇫🇷', state: 'ile-de-france', city: 'paris' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', state: 'central-region', city: 'downtown-core' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', state: 'auckland-region', city: 'auckland-cbd' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', state: 'leinster', city: 'dublin-city-centre' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', state: 'gauteng', city: 'sandton' }
];

export default function DirectoryPage() {
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('US');

  useEffect(() => {
    document.title = 'Global Business Lead Directory — 22+ Commercial Sectors Across 11 Nations | Scraper.co.in';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'Browse 100% verified business proprietor phone numbers, WhatsApp links, and physical addresses across 22+ commercial sectors and 11 sovereign nations.';

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://scraper.co.in/directory';
  }, []);

  const activeCountryObj = SOVEREIGN_COUNTRIES.find(c => c.code === selectedCountry) || SOVEREIGN_COUNTRIES[0];

  const filteredSectors = SECTORS.map(sec => ({
    ...sec,
    niches: sec.niches.filter(n =>
      n.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.desc.toLowerCase().includes(filterQuery.toLowerCase())
    )
  })).filter(sec => sec.niches.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <BrandLogo size="compact" />
          </Link>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 750, color: '#0f172a' }}>Global Directory</span>
        </div>

        <button
          onClick={() => navigate('/command')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#ffffff',
            fontWeight: 750,
            fontSize: 13,
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)'
          }}
        >
          <Zap size={14} />
          <span>Launch Live Scraper</span>
        </button>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto 36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
            <Globe2 size={14} />
            <span>UNIVERSAL CATEGORY DIRECTORY &amp; CRAWL MATRIX</span>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.2, marginBottom: 14 }}>
            Direct Business Leads Across Every Category &amp; Country
          </h1>

          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
            Explore verified business proprietor contacts, direct phone numbers, and WhatsApp links across 11 sovereign nations. 100% laser domain purity with zero cross-trade dilution.
          </p>

          {/* Search Filter Bar */}
          <div style={{ position: 'relative', maxWidth: 540, margin: '0 auto' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search category or commercial niche (e.g. Roofing, Solicitors, Turmeric, Solar)..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px 14px 46px',
                borderRadius: 14,
                border: '1.5px solid #cbd5e1',
                fontSize: 14.5,
                fontWeight: 600,
                outline: 'none',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)'
              }}
            />
          </div>
        </div>

        {/* Sovereign Country Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 32 }}>
          {SOVEREIGN_COUNTRIES.map(c => {
            const isSelected = c.code === selectedCountry;
            return (
              <button
                key={c.code}
                onClick={() => setSelectedCountry(c.code)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 12,
                  background: isSelected ? '#0f172a' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                  fontWeight: 750,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 14px rgba(15, 23, 42, 0.14)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.16s ease'
                }}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* Commercial Sectors Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {filteredSectors.map(sec => {
            const IconComponent = sec.icon;
            return (
              <section
                key={sec.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '28px 24px',
                  boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', margin: 0 }}>
                      {sec.title}
                    </h2>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Viewing directory for {activeCountryObj.name} ({activeCountryObj.flag})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14 }}>
                  {sec.niches.map(niche => {
                    const destinationUrl = `/leads/${activeCountryObj.code.toLowerCase()}/${activeCountryObj.state}/${activeCountryObj.city}/${niche.slug}`;
                    return (
                      <Link
                        key={niche.slug}
                        to={destinationUrl}
                        style={{
                          textDecoration: 'none',
                          padding: '16px 18px',
                          borderRadius: 14,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.16s ease'
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                            {niche.label}
                          </h3>
                          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                            {niche.desc}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 750, color: '#059669' }}>
                            View in {activeCountryObj.city} →
                          </span>
                          <span style={{ fontSize: 11, background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: 6, color: '#475569', fontWeight: 650 }}>
                            {activeCountryObj.code}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

      </main>
    </div>
  );
}
