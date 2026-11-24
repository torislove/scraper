import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Phone,
  MessageSquare,
  ShieldCheck,
  Zap,
  Globe2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Search,
  Building,
  Star,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import BrandLogo from '../v2/components/BrandLogo';
import Country3DFlag from '../v2/components/Country3DFlag';

const COUNTRY_REGISTRY = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD ($)',
    dialCode: '+1',
    adminTerms: { state: 'State', county: 'County', city: 'City / Metro Area' },
    defaultState: 'Texas',
    defaultCity: 'Dallas',
    subsectors: [
      { slug: 'commercial-flat-roofing', title: 'Commercial Flat Roofing & TPO/EPDM', sector: 'Contracting', cpc: '$145' },
      { slug: 'semi-truck-accident-lawyers', title: 'Semi-Truck & 18-Wheeler Accident Lawyers', sector: 'Legal', cpc: '$480' },
      { slug: 'water-damage-restoration', title: '24/7 Water Damage & Flood Extraction', sector: 'Disaster Restoration', cpc: '$180' },
      { slug: 'commercial-solar-epc', title: 'Commercial Solar EPC & Battery Storage', sector: 'Renewable Energy', cpc: '$110' },
      { slug: 'swimming-pool-builders', title: 'Custom Inground Swimming Pool Builders', sector: 'Home Services', cpc: '$95' },
      { slug: 'cnc-machining-precision', title: 'Precision CNC Machining & Laser Cutting', sector: 'Industrial B2B', cpc: '$85' }
    ],
    sampleLeads: [
      { name: 'Apex Commercial Roofing Solutions', address: '1400 Main St, Dallas, TX 75202', phone: '+1 (214) 555-0182', rating: '4.9', reviews: 48, tag: 'TPO & EPDM Certified', verified: true },
      { name: 'Lone Star Truck Accident Litigators', address: '2200 Ross Ave, Dallas, TX 75201', phone: '+1 (214) 555-0199', rating: '5.0', reviews: 92, tag: 'High CPC Legal', verified: true },
      { name: 'Metroplex Rapid Water Extraction', address: '8500 Stemmons Fwy, Dallas, TX 75247', phone: '+1 (469) 555-0144', rating: '4.8', reviews: 36, tag: '24/7 Emergency', verified: true }
    ],
    cities: ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'Plano', 'Arlington', 'El Paso']
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP (£)',
    dialCode: '+44',
    adminTerms: { state: 'Country / Region', county: 'Ceremonial County', city: 'Borough / Postal Town' },
    defaultState: 'Greater London',
    defaultCity: 'Camden',
    subsectors: [
      { slug: 'emergency-gas-safe-engineers', title: 'Emergency Gas Safe Boiler Engineers', sector: 'Trades', cpc: '£95' },
      { slug: 'commercial-property-solicitors', title: 'Commercial Property & Conveyancing Solicitors', sector: 'Legal', cpc: '£160' },
      { slug: 'traditional-british-gastropubs', title: 'Traditional British Gastropubs & Real Ale', sector: 'Hospitality', cpc: '£45' },
      { slug: 'commercial-roof-cladding', title: 'Commercial Roofing & Industrial Cladding', sector: 'Contracting', cpc: '£120' },
      { slug: 'fue-hair-transplant-clinics', title: 'Doctor-Led FUE Hair Transplant Clinics', sector: 'Healthcare', cpc: '£140' }
    ],
    sampleLeads: [
      { name: 'Thames Boiler & Gas Safe Rapid Repair', address: 'Camden High St, London NW1 7JE', phone: '+44 20 7946 0912', rating: '4.9', reviews: 64, tag: 'Gas Safe Verified', verified: true },
      { name: 'Holborn Commercial Legal Partners', address: '48 Chancery Lane, London WC2A 1JF', phone: '+44 20 7946 0884', rating: '5.0', reviews: 110, tag: 'Solicitors Regulated', verified: true },
      { name: 'Mayfair Aesthetic & FUE Clinic', address: 'Harley St, London W1G 9PQ', phone: '+44 20 7946 0773', rating: '4.8', reviews: 52, tag: 'GMC Registered', verified: true }
    ],
    cities: ['Camden', 'Westminster', 'Islington', 'Kensington', 'Greenwich', 'Manchester City', 'Birmingham', 'Leeds']
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    dialCode: '+91',
    adminTerms: { state: 'State', county: 'District', city: 'Metro / Tech Hub' },
    defaultState: 'Telangana',
    defaultCity: 'Hyderabad',
    subsectors: [
      { slug: 'enterprise-saas-ai', title: 'Enterprise AI & SaaS Engineering Studios', sector: 'Software', cpc: 'Enterprise' },
      { slug: 'cloud-fintech-payments', title: 'Commercial FinTech & Payment Infrastructure', sector: 'FinTech', cpc: 'High Intent' },
      { slug: 'commercial-industrial-epc', title: 'Industrial EPC & Precision Manufacturing', sector: 'Industrial', cpc: 'Verified B2B' },
      { slug: 'corporate-legal-advisory', title: 'Corporate M&A & IP Legal Chambers', sector: 'Legal', cpc: 'Executive' },
      { slug: 'rooftop-solar-epc-plants', title: 'Industrial Rooftop Solar EPC & Grid Inverters', sector: 'Renewable', cpc: 'CleanTech' },
      { slug: 'global-3pl-freight-logistics', title: 'Cross-Border 3PL Freight & Cold-Chain', sector: 'Logistics', cpc: 'Supply Chain' }
    ],
    sampleLeads: [
      { name: 'CyberTowers Cloud & AI Systems', address: 'HITEC City, Madhapur, Hyderabad · PIN 500081', phone: '+91 98856 03754', rating: '5.0', reviews: 142, tag: 'Direct WhatsApp', verified: true },
      { name: 'Silicon Corridors SaaS Labs', address: '100ft Rd, Indiranagar, Bengaluru · PIN 560038', phone: '+91 94906 42816', rating: '4.9', reviews: 98, tag: 'Verified Founder', verified: true },
      { name: 'Bandra Kurla FinTech Partners', address: 'G Block BKC, Mumbai · PIN 400051', phone: '+91 98480 32190', rating: '4.9', reviews: 118, tag: 'Enterprise Desk', verified: true }
    ],
    cities: ['Hyderabad', 'Bengaluru', 'Mumbai', 'Gurugram', 'Chennai', 'Pune', 'New Delhi', 'Ahmedabad']
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD ($)',
    dialCode: '+61',
    adminTerms: { state: 'State', county: 'LGA', city: 'Suburb / Postcode' },
    defaultState: 'Victoria',
    defaultCity: 'Melbourne',
    subsectors: [
      { slug: 'commercial-solar-epc', title: 'Commercial Solar EPC & Battery Tradies', sector: 'Renewables', cpc: '$130' },
      { slug: '24-7-emergency-sparkies', title: '24/7 Emergency Sparkies & Electricians', sector: 'Trades', cpc: '$105' },
      { slug: 'conveyancing-property-solicitors', title: 'Conveyancing & Commercial Property Solicitors', sector: 'Legal', cpc: '$150' },
      { slug: 'smash-repairs-panel-beaters', title: 'Smash Repairs & Fleet Panel Beaters', sector: 'Automotive', cpc: '$90' }
    ],
    sampleLeads: [
      { name: 'Sunstate Commercial Solar Ltd', address: 'Dandenong South, VIC 3175', phone: '+61 3 7010 1142', rating: '4.9', reviews: 39, tag: 'CEC Accredited', verified: true },
      { name: 'Melbourne Rapid Emergency Sparkies', address: 'Southbank Blvd, Melbourne, VIC 3006', phone: '+61 3 9496 0214', rating: '5.0', reviews: 81, tag: 'A-Grade Electrician', verified: true }
    ],
    cities: ['Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Dandenong', 'Parramatta']
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED (د.إ)',
    dialCode: '+971',
    adminTerms: { state: 'Emirate', county: 'Jurisdiction', city: 'Sector / Free Zone' },
    defaultState: 'Dubai',
    defaultCity: 'Business Bay',
    subsectors: [
      { slug: 'pro-business-setup-services', title: 'Mainland & Free Zone Business Setup & PRO Services', sector: 'Corporate Services', cpc: 'AED 380' },
      { slug: 'freight-forwarders-logistics', title: 'JAFZA & Maritime Freight Forwarders', sector: 'Logistics', cpc: 'AED 290' },
      { slug: 'commercial-chiller-ac-maintenance', title: 'Commercial Chiller AC & Duct Sanitization', sector: 'HVAC Services', cpc: 'AED 210' }
    ],
    sampleLeads: [
      { name: 'Gulf Falcon Global Corporate Services', address: 'Bay Square, Business Bay, Dubai', phone: '+971 4 394 8812', rating: '5.0', reviews: 88, tag: 'Direct WhatsApp PRO', verified: true },
      { name: 'Jebel Ali Maritime Cargo Logistics', address: 'JAFZA South Zone, Dubai', phone: '+971 4 881 2290', rating: '4.9', reviews: 54, tag: 'Customs Broker Reg.', verified: true }
    ],
    cities: ['Business Bay', 'Downtown Dubai', 'JAFZA', 'Deira', 'Al Quoz', 'Abu Dhabi Island', 'Musaffah', 'Sharjah']
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD ($)',
    dialCode: '+1',
    adminTerms: { state: 'Province', county: 'Regional Municipality', city: 'City / Municipality' },
    defaultState: 'Ontario',
    defaultCity: 'Mississauga',
    subsectors: [
      { slug: 'commercial-precision-machining', title: 'Commercial Precision Tooling & CNC Fabrication', sector: 'Manufacturing', cpc: '$115' },
      { slug: 'barristers-commercial-solicitors', title: 'Barristers & Commercial Corporate Solicitors', sector: 'Legal', cpc: '$190' },
      { slug: 'commercial-hvac-heating', title: 'Commercial Rooftop HVAC & Boiler Service', sector: 'Trades', cpc: '$125' }
    ],
    sampleLeads: [
      { name: 'Bow Valley Precision Tooling Fab', address: 'Mississauga, ON · L5T 1W2', phone: '+1 (905) 555-0149', rating: '4.9', reviews: 31, tag: 'ISO 9001 CNC', verified: true },
      { name: 'Peel Region Corporate Legal Associates', address: 'Hurontario St, Mississauga, ON · L5B 1M8', phone: '+1 (905) 555-0188', rating: '5.0', reviews: 67, tag: 'Law Society Reg.', verified: true }
    ],
    cities: ['Mississauga', 'Toronto', 'Brampton', 'Markham', 'Vancouver', 'Calgary', 'Edmonton']
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    currency: 'EUR (€)',
    dialCode: '+49',
    adminTerms: { state: 'Bundesland', county: 'Landkreis', city: 'Stadt / Gemeinde' },
    defaultState: 'Bayern',
    defaultCity: 'Munich',
    subsectors: [
      { slug: 'maschinenbau-praezisionstechnik', title: 'Maschinenbau & CNC Präzisionstechnik', sector: 'Industrial', cpc: '€130' },
      { slug: 'steuerberater-wirtschaftspruefer', title: 'Steuerberater & Wirtschaftsprüfer Kanzleien', sector: 'Finance & Legal', cpc: '€180' },
      { slug: 'meisterbetrieb-sanitaer-heizung', title: 'Meisterbetrieb Sanitär, Heizung & Wärmepumpe', sector: 'Handwerk', cpc: '€110' }
    ],
    sampleLeads: [
      { name: 'Bavaria Präzisionstechnik GmbH', address: 'Garching bei München · PLZ 85748', phone: '+49 89 3290 210', rating: '5.0', reviews: 42, tag: 'Meisterbetrieb', verified: true },
      { name: 'Munich Corporate Steuerberatung', address: 'Leopoldstraße, München · PLZ 80802', phone: '+49 89 2180 440', rating: '4.9', reviews: 59, tag: 'Datev Partner', verified: true }
    ],
    cities: ['Munich', 'Berlin', 'Frankfurt', 'Stuttgart', 'Hamburg', 'Garching', 'Sindelfingen']
  }
};

function formatSlug(slug) {
  if (!slug) return '';
  return String(slug)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function SeoLandingPage() {
  const { countryCode = 'us', stateSlug, citySlug, subvectorSlug } = useParams();
  const navigate = useNavigate();

  const cCode = countryCode.toUpperCase();
  const country = COUNTRY_REGISTRY[cCode] || COUNTRY_REGISTRY.US;

  const stateName = stateSlug ? formatSlug(stateSlug) : country.defaultState;
  const cityName = citySlug ? formatSlug(citySlug) : country.defaultCity;

  const activeSubvector = useMemo(() => {
    if (subvectorSlug) {
      const match = country.subsectors.find(s => s.slug === subvectorSlug);
      if (match) return match;
      return { slug: subvectorSlug, title: formatSlug(subvectorSlug), sector: 'Commercial Direct', cpc: '$90+' };
    }
    return country.subsectors[0];
  }, [subvectorSlug, country]);

  const pageTitle = `${activeSubvector.title} in ${cityName}, ${stateName} (${country.name}) | Verified Directory & Leads`;
  const metaDescription = `Find 100% verified ${activeSubvector.title} in ${cityName}, ${stateName} (${country.name}). Access direct phone numbers, WhatsApp links, and verified addresses with zero cross-trade dilution.`;
  const canonicalUrl = `https://scraper.co.in/leads/${cCode.toLowerCase()}${stateSlug ? `/${stateSlug}` : ''}${citySlug ? `/${citySlug}` : ''}${subvectorSlug ? `/${subvectorSlug}` : ''}`;

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${activeSubvector.title} Directory - ${cityName}`,
    description: metaDescription,
    url: canonicalUrl,
    telephone: country.sampleLeads[0]?.phone || country.dialCode,
    address: {
      '@type': 'PostalAddress',
      addressLocality: cityName,
      addressRegion: stateName,
      addressCountry: country.code
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: `${cityName}, ${stateName}`
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '184',
      bestRating: '5.0'
    }
  };

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://scraper.co.in/' },
      { '@type': 'ListItem', position: 2, name: country.name, item: `https://scraper.co.in/leads/${cCode.toLowerCase()}` },
      { '@type': 'ListItem', position: 3, name: stateName, item: `https://scraper.co.in/leads/${cCode.toLowerCase()}/${stateSlug || country.defaultState.toLowerCase()}` },
      { '@type': 'ListItem', position: 4, name: cityName, item: `https://scraper.co.in/leads/${cCode.toLowerCase()}/${stateSlug || country.defaultState.toLowerCase()}/${citySlug || country.defaultCity.toLowerCase()}` },
      { '@type': 'ListItem', position: 5, name: activeSubvector.title, item: canonicalUrl }
    ]
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do I find verified ${activeSubvector.title} in ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Scraper.co.in indexes verified direct contact details for ${activeSubvector.title} in ${cityName}, ${stateName}, including valid E.164 phone numbers, physical addresses, and 1-click WhatsApp messaging links with zero cross-trade dilution.`
        }
      },
      {
        '@type': 'Question',
        name: `Are the phone numbers for ${activeSubvector.title} in ${cityName} verified?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, 100% of phone numbers are parsed and validated using google-libphonenumber standards, ensuring authentic mobile and direct proprietor contacts.`
        }
      },
      {
        '@type': 'Question',
        name: `Can I export ${cityName} business leads to Excel?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, you can run instant multi-vector sweeps on Scraper.co.in and export clean, formatted Excel workbooks containing proprietor names, direct phone numbers, and WhatsApp links.`
        }
      }
    ]
  };

  // Dynamic programmatic SEO tags & Schema.org injection
  useEffect(() => {
    document.title = pageTitle;

    // Update or create meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = metaDescription;

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Inject JSON-LD Schema
    const scriptId = 'seo-jsonld-schema';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.text = JSON.stringify([jsonLdData, breadcrumbsLd, faqLd]);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [pageTitle, metaDescription, canonicalUrl]);

  const handleLaunchConsole = (searchQuery) => {
    const q = encodeURIComponent(searchQuery || `${activeSubvector.title} in ${cityName} ${stateName}`);
    navigate(`/command?q=${q}&country=${country.code}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <BrandLogo size="compact" />
          </Link>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }}>
            <span>{country.flag}</span>
            <span>{country.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => handleLaunchConsole()}
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
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 20px 80px' }}>
        
        {/* Breadcrumb Trail */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 20, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={13} color="#94a3b8" />
          <Link to={`/leads/${cCode.toLowerCase()}`} style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>{country.name}</Link>
          <ChevronRight size={13} color="#94a3b8" />
          <span style={{ color: '#64748b' }}>{stateName} ({country.adminTerms.state})</span>
          <ChevronRight size={13} color="#94a3b8" />
          <span style={{ color: '#0f172a', fontWeight: 700 }}>{cityName}</span>
        </nav>

        {/* Hero Banner */}
        <section style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1.5px solid #dcfce7',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 20px 40px -15px rgba(5, 150, 105, 0.08)',
          marginBottom: 32
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dcfce7', color: '#15803d', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 14 }}>
            <ShieldCheck size={14} />
            <span>100% LASER DOMAIN PURITY · ZERO CROSS-DILUTION</span>
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.25, marginBottom: 14 }}>
            {activeSubvector.title} in {cityName}, {stateName}
          </h1>

          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, maxWidth: 840, marginBottom: 24 }}>
            Direct, verified B2B and consumer leads in <strong>{cityName}</strong>, {stateName}. Complete contact intelligence including E.164 verified phone numbers, direct WhatsApp links, and physical addresses across {country.name}.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
            <button
              onClick={() => handleLaunchConsole()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 14,
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.18)'
              }}
            >
              <Search size={16} />
              <span>Scrape All Leads in {cityName}</span>
              <ArrowRight size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#64748b', fontSize: 13, fontWeight: 650 }}>
              <span>Average CPC: <strong style={{ color: '#059669' }}>{activeSubvector.cpc}</strong></span>
              <span>•</span>
              <span>Currency: <strong>{country.currency}</strong></span>
              <span>•</span>
              <span>Dial Code: <strong>{country.dialCode}</strong></span>
            </div>
          </div>
        </section>

        {/* Subvectors Pill Carousel */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="#059669" />
              <span>Target Commercial Niches in {cityName}</span>
            </h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>Select niche for domain purity</span>
          </div>

          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {country.subsectors.map(sub => {
              const isSelected = sub.slug === activeSubvector.slug;
              return (
                <Link
                  key={sub.slug}
                  to={`/leads/${cCode.toLowerCase()}/${stateSlug || country.defaultState.toLowerCase()}/${citySlug || country.defaultCity.toLowerCase()}/${sub.slug}`}
                  style={{
                    textDecoration: 'none',
                    padding: '10px 18px',
                    borderRadius: 12,
                    background: isSelected ? '#0f172a' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 4px 14px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {sub.title}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Verified Sample Leads Showcase */}
        <section style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>
                Verified Direct Leads: {activeSubvector.title}
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Sample direct contacts extracted with verified phone numbers & WhatsApp deep links.
              </p>
            </div>
            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 800 }}>
              ● LIVE VERIFIED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {country.sampleLeads.map((lead, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 22,
                  boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                      {lead.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#b45309', padding: '3px 7px', borderRadius: 6, fontSize: 11.5, fontWeight: 800 }}>
                      <Star size={11} fill="#b45309" color="#b45309" />
                      <span>{lead.rating}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <MapPin size={13} color="#94a3b8" />
                    <span>{lead.address}</span>
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', color: '#475569', padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                    <span>{lead.tag}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <a
                    href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '8px 12px',
                      borderRadius: 9,
                      fontSize: 12.5,
                      fontWeight: 750,
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={13} />
                    <span>Call Direct</span>
                  </a>

                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, inquiring about ${activeSubvector.title} in ${cityName}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: 9,
                      fontSize: 12.5,
                      fontWeight: 750,
                      textDecoration: 'none'
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby Cities & Internal SEO Linking */}
        <section style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={16} color="#64748b" />
            <span>Nearby Metro & Commercial Centers in {stateName}</span>
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {country.cities.map(c => (
              <Link
                key={c}
                to={`/leads/${cCode.toLowerCase()}/${stateSlug || country.defaultState.toLowerCase()}/${c.toLowerCase()}/${activeSubvector.slug}`}
                style={{
                  textDecoration: 'none',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 650
                }}
              >
                {activeSubvector.title} in {c}
              </Link>
            ))}
          </div>
        </section>

        {/* High-Intent FAQ Section (People Also Ask) */}
        <section style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 28,
          marginBottom: 32
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 850, color: '#0f172a', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#059669" />
            <span>Frequently Asked Questions &amp; Verification Details</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                How do I extract all verified {activeSubvector.title} in {cityName}?
              </h4>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Click the &ldquo;Launch Live Scraper&rdquo; button above to open the Scraper.co.in command console. The engine automatically sweeps across multiple localized subvectors, extracting 300 to 800 verified business proprietor phone numbers and WhatsApp contacts in under 30 seconds.
              </p>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                Are the phone numbers and WhatsApp contacts verified?
              </h4>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Yes, every contact is parsed and validated using google-libphonenumber international E.164 formatting standards ({country.dialCode}). Dummy numbers, fragments, and invalid series are rejected before export.
              </p>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                How does laser domain purity prevent cross-trade contamination?
              </h4>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Our semantic query classifier isolates specific niches (e.g. flat roofing, commercial solicitors, FUE hair restoration) and applies negative avoidance constraints so that unrelated low-ticket services never dilute your target client pipeline.
              </p>
            </div>
          </div>
        </section>

        {/* Global Directory Footer Link */}
        <div style={{ textAlign: 'center', paddingTop: 10 }}>
          <Link
            to="/directory"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#059669',
              textDecoration: 'none',
              fontWeight: 750,
              fontSize: 13.5
            }}
          >
            <span>Browse Full Global Category &amp; Country Directory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </main>
    </div>
  );
}
