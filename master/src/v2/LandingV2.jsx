import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, CheckCircle2, Phone, MapPin, Star,
  MessageSquare, Zap, ShieldCheck, Database, Building2, Play,
  Sparkles, ChevronDown, ChevronUp, Check, FileSpreadsheet, Download, RefreshCw,
  Table2, LayoutGrid, CheckSquare, Compass, Radio
} from 'lucide-react';
import './landing.css';
import BrandLogo from './components/BrandLogo';
import { API_URL } from '../apiConfig';
import { parseIndianPhone } from '../utils/phoneClassify';

const EASE = [0.16, 1, 0.3, 1];

/**
 * WhatsApp link for a validated Indian mobile only. The old builder stripped
 * digits with a double-escaped regex, which matched a literal backslash and
 * produced broken `wa.me` URLs. Landlines never get a chat link.
 */
function waHref(phone, message) {
  const parsed = parseIndianPhone(phone);
  if (!parsed || !parsed.isMobile) return '';
  return `${parsed.whatsappUrl}?text=${encodeURIComponent(message || '')}`;
}

// Realistic authentic search dataset for Indian markets (Customer-Focused, Zero Tech Jargon)
const PRESETS = [
  {
    label: 'Dental Clinics in Guntur',
    category: 'Dental Clinic',
    city: 'Guntur',
    yieldCount: 148,
    mobileCount: 142,
    timeSec: '6.4s',
    logs: [
      { badge: 'Market Search', text: 'Scanning registered clinics & dental hospitals across Guntur & Tenali...', type: 'info' },
      { badge: 'Proprietors', text: 'Identified 142 Clinic Owners, Doctors & Managing Director personal profiles', type: 'info' },
      { badge: 'Mobile Check', text: 'Filtered out 16 dead reception landlines (0863) · Retained 100% active +91 mobiles', type: 'warn' },
      { badge: 'Ready to Chat', text: '142 Decision-makers ready for direct 1-Click WhatsApp & God-Level Excel export', type: 'success' }
    ],
    leads: [
      {
        name: 'Kalyani Multispeciality Dental Clinic',
        owner: 'Dr. K. Srinivas Rao, MDS (Managing Director)',
        phone: '+91 76750 71081',
        area: '4th Line, Brodipet, Guntur - 522002',
        rating: 4.9,
        reviews: 420,
        score: '99% Match',
        waMessage: 'Hello Dr. Srinivas Rao, reaching out regarding premium dental implants and modern clinic equipment distribution in Guntur.'
      },
      {
        name: 'Happy Dental Hospital & Implant Centre',
        owner: 'Dr. P. Venkat Reddy (Chief Implantologist)',
        phone: '+91 80084 91391',
        area: 'Main Road, Arundelpet, Guntur - 522002',
        rating: 4.8,
        reviews: 315,
        score: '98% Match',
        waMessage: 'Hi Dr. Venkat Reddy, wanted to connect regarding dental digital imaging solutions and patient appointment CRM in Arundelpet.'
      },
      {
        name: 'Siri Super Speciality Dental Hospital',
        owner: 'Dr. M. Chaitanya Kumar (Oral Surgeon)',
        phone: '+91 70363 51100',
        area: 'Opp. Hindu College, Guntur - 522003',
        rating: 4.8,
        reviews: 260,
        score: '97% Match',
        waMessage: 'Hello Dr. Chaitanya, contacting you from Scraper.co.in regarding specialized surgical tools and autoclave sterilization supplies.'
      },
      {
        name: 'Guntur Dental Care & Laser Centre',
        owner: 'Dr. Anusha Reddy (Owner & Cosmetologist)',
        phone: '+91 99890 12344',
        area: 'Lakshmipuram Main Road, Guntur - 522007',
        rating: 4.7,
        reviews: 185,
        score: '96% Match',
        waMessage: 'Hello Dr. Anusha, reaching out regarding painless laser dentistry consumables and clinic supplies.'
      }
    ]
  },
  {
    label: 'Photographers in Vijayawada',
    category: 'Wedding Photography',
    city: 'Vijayawada',
    yieldCount: 164,
    mobileCount: 159,
    timeSec: '5.8s',
    logs: [
      { badge: 'Market Search', text: 'Scanning wedding photography studios across Benz Circle, MG Road & One Town...', type: 'info' },
      { badge: 'Proprietors', text: 'Extracted Lead Cinematographers, Studio Owners & Creative Directors', type: 'info' },
      { badge: 'Mobile Check', text: 'Filtered 12 reception landlines · Retained 159 verified personal WhatsApp mobiles', type: 'warn' },
      { badge: 'Ready to Chat', text: '159 Wedding Studio Owners ready for direct partnerships & wholesale albums', type: 'success' }
    ],
    leads: [
      {
        name: 'Vamsi Krishna Cinematic Weddings',
        owner: 'Vamsi Krishna (Founder & Lead Director)',
        phone: '+91 98481 29401',
        area: 'MG Road, Near Benz Circle, Vijayawada',
        rating: 4.9,
        reviews: 380,
        score: '99% Match',
        waMessage: 'Hi Vamsi garu, loved your candid wedding portfolio at Benz Circle. Reaching out regarding high-end gimbal & cinema lens leasing.'
      },
      {
        name: 'Sri Sai Ram Photo & Video Studio',
        owner: 'Ramesh Babu (Proprietor)',
        phone: '+91 94405 81920',
        area: 'Governorpet, Vijayawada - 520002',
        rating: 4.7,
        reviews: 195,
        score: '96% Match',
        waMessage: 'Namaste Ramesh garu, reaching out regarding wholesale photo album printing and acrylic frame distribution in Vijayawada.'
      },
      {
        name: 'Canvas Candid Wedding Cinema',
        owner: 'K. Anand (Creative Director)',
        phone: '+91 91002 44918',
        area: 'Labbipet, Vijayawada - 520010',
        rating: 4.8,
        reviews: 245,
        score: '97% Match',
        waMessage: 'Hi Anand, connecting regarding 4K drone cinematography gear and live-streaming encoders for destination weddings.'
      }
    ]
  },
  {
    label: 'Solar Panel Dealers in Jaipur',
    category: 'Solar Power Systems',
    city: 'Jaipur',
    yieldCount: 132,
    mobileCount: 126,
    timeSec: '7.1s',
    logs: [
      { badge: 'Market Search', text: 'Scanning Jaipur Industrial Belt: Sitapura, Mansarovar & VKI Industrial Area...', type: 'info' },
      { badge: 'Proprietors', text: 'Extracted active solar distributors, rooftop EPC contractors & owners', type: 'info' },
      { badge: 'Mobile Check', text: 'Excluded 6 toll-free & head-office landlines (0141) · 126 direct mobiles verified', type: 'warn' },
      { badge: 'Ready to Chat', text: '126 Solar Business Proprietors ready for immediate distribution supplies', type: 'success' }
    ],
    leads: [
      {
        name: 'Surya Shakti Green Energy Systems',
        owner: 'Rajesh Sharma (Managing Director)',
        phone: '+91 98290 61120',
        area: 'Sitapura Industrial Area, Jaipur - 302022',
        rating: 4.9,
        reviews: 210,
        score: '99% Match',
        waMessage: 'Namaste Rajesh ji, reaching out regarding tier-1 bifacial monocrystalline solar panels wholesale pricing in Sitapura.'
      },
      {
        name: 'Rajasthan Solar Tech Solutions',
        owner: 'Vikram Singh Rathore (Proprietor)',
        phone: '+91 94140 88231',
        area: 'Mansarovar, Jaipur - 302020',
        rating: 4.8,
        reviews: 175,
        score: '97% Match',
        waMessage: 'Hello Vikram ji, wanted to discuss hybrid solar inverter and lithium battery storage dealerships for Mansarovar.'
      },
      {
        name: 'PinkCity Solar Power Infrastructure',
        owner: 'Amit Meena (Director)',
        phone: '+91 98285 41902',
        area: 'VKI Area, Road No. 9, Jaipur',
        rating: 4.7,
        reviews: 140,
        score: '95% Match',
        waMessage: 'Hi Amit, connecting regarding rooftop subsidy scheme tenders and commercial net-metering project supplies.'
      }
    ]
  },
  {
    label: 'Interior Designers in Bengaluru',
    category: 'Interior Design',
    city: 'Bengaluru',
    yieldCount: 220,
    mobileCount: 214,
    timeSec: '8.2s',
    logs: [
      { badge: 'Market Search', text: 'Scanning interior design studios across Indiranagar, HSR Layout & Whitefield...', type: 'info' },
      { badge: 'Proprietors', text: 'Extracted Principal Architects, Studio Founders & Managing Partners', type: 'info' },
      { badge: 'Mobile Check', text: 'Filtered 14 office reception desks · 214 direct personal WhatsApp lines online', type: 'warn' },
      { badge: 'Ready to Chat', text: '214 Design Studio Heads ready for premium hardware & decor collaboration', type: 'success' }
    ],
    leads: [
      {
        name: 'Studio Form & Texture Architecture',
        owner: 'Rohan Mehta (Principal Architect)',
        phone: '+91 98450 11289',
        area: '100ft Road, Indiranagar, Bengaluru - 560038',
        rating: 4.9,
        reviews: 230,
        score: '99% Match',
        waMessage: 'Hi Rohan, loved your modern duplex interior projects in Indiranagar. Reaching out regarding bespoke Italian hardware & marble.'
      },
      {
        name: 'Vriksh Architectural Decor Studio',
        owner: 'Sneha Hegde (Managing Partner)',
        phone: '+91 99000 78215',
        area: 'Sector 4, HSR Layout, Bengaluru - 560102',
        rating: 4.8,
        reviews: 310,
        score: '98% Match',
        waMessage: 'Hello Sneha, reaching out regarding architectural smart lighting and custom modular furniture supply in HSR Layout.'
      },
      {
        name: 'Urban Nest Luxury Interiors',
        owner: 'Gautam Krishna (Proprietor)',
        phone: '+91 97410 33901',
        area: 'Whitefield Main Road, Bengaluru - 560066',
        rating: 4.7,
        reviews: 185,
        score: '96% Match',
        waMessage: 'Hi Gautam, connecting regarding acrylic sheet wholesale distribution and hardware fittings for high-rise apartments in Whitefield.'
      }
    ]
  }
];

const MARQUEE_ITEMS = [
  { tag: 'JUST FOUND', text: '148 Dental Clinics in Guntur · 142 Mobiles Extracted · Landlines kept separate' },
  { tag: 'WHATSAPP READY', text: '86 Solar Contractors in Jaipur · 100% WhatsApp Verified' },
  { tag: 'NEW CAMPAIGN', text: '214 Interior Designers in Bengaluru · All Director Numbers' },
  { tag: 'DATA REFRESH', text: '164 Wedding Photographers in Vijayawada · Full Proprietor Names' },
  { tag: 'ZERO RECEPTIONISTS', text: '310 Hardware Wholesalers in Surat · Personal mobiles first' },
  { tag: 'GOD-LEVEL EXCEL', text: 'Generated Styled Slate 900 Workbook with Auto-Filters' }
];

const SIMPLE_STEPS = [
  {
    step: '01',
    title: 'Type What & Where',
    desc: 'Enter any business type and any city (e.g. "Doctors in Guntur", "Boutiques in Hyderabad", "Hardware in Surat"). Scraper searches every market and commercial lane.'
  },
  {
    step: '02',
    title: 'Get Real Owner Numbers',
    desc: 'We filter out 65% fake numbers and dead landlines (0863-, 040-). You get the real personal WhatsApp mobile number carried directly by the business proprietor.'
  },
  {
    step: '03',
    title: 'Reach Out & Close Deals',
    desc: 'Click 1 button to start a personalized WhatsApp chat or download an executive-grade God-Level Excel workbook for your sales team. Close clients the very same day.'
  }
];

// Everyday Real-World Business Profiles (Intuitive Cash Return for Normal People)
const BUSINESS_PROFILES = [
  {
    icon: '📸',
    label: 'Wedding Studio & Photographers',
    sub: 'Cinematography, album printing, camera gear',
    typicalDeal: 45000,
    unit: 'Wedding Contract'
  },
  {
    icon: '🦷',
    label: 'Dental Clinics & Doctors',
    sub: 'Implants, dental equipment, patient leads',
    typicalDeal: 25000,
    unit: 'Implant Patient'
  },
  {
    icon: '☀️',
    label: 'Solar & Rooftop Installers',
    sub: 'Solar panels, hybrid inverters, batteries',
    typicalDeal: 180000,
    unit: 'Solar Project'
  },
  {
    icon: '🏗️',
    label: 'Hardware & Building Materials',
    sub: 'Cement, pipes, paints, electrical wholesale',
    typicalDeal: 60000,
    unit: 'Contractor Order'
  },
  {
    icon: '💻',
    label: 'Marketing Agency & Freelancer',
    sub: 'Web development, local SEO, social media',
    typicalDeal: 20000,
    unit: 'Monthly Client'
  }
];

const PRICING_TIERS = [
  {
    name: 'Free Test Drive',
    badge: '100% FREE TEST',
    price: '₹0',
    period: 'forever',
    leadCount: '1,000 Leads Included',
    perLead: '₹0.00 / lead',
    features: [
      'Full proprietor mobile numbers',
      'Instant 1-click WhatsApp launcher',
      'Test with any city or category',
      'Standard CSV lead download',
      'No credit card required'
    ],
    cta: 'Get 1,000 Leads Free',
    isPopular: false
  },
  {
    name: 'Starter Plan',
    badge: 'FOR FREELANCERS & FOUNDERS',
    price: '₹999',
    period: 'one-time / monthly',
    leadCount: '2,500 Verified Leads',
    perLead: '₹0.40 / lead',
    features: [
      '2,500 verified proprietor mobiles',
      'Every number checked by a real phone-number parser, not a digit guess',
      '1-click direct WhatsApp chat',
      'Standard Excel & CSV export',
      'Zero duplicate guarantee',
      'Email & chat support'
    ],
    cta: 'Get Starter Plan (₹999)',
    isPopular: false
  },
  {
    name: 'Scale Plan',
    badge: 'MOST POPULAR FOR AGENCIES',
    price: '₹2,499',
    period: 'one-time / monthly',
    leadCount: '10,000 Verified Leads',
    perLead: '₹0.25 / lead',
    features: [
      '10,000 verified proprietor mobiles',
      'Full God-Level Formatted Excel (.xlsx)',
      'Slate 900 headers & auto-filters',
      'Direct WhatsApp click-to-chat links in Excel',
      'Priority multi-engine parallel speed',
      'VIP WhatsApp support'
    ],
    cta: 'Get Scale Plan (₹2,499)',
    isPopular: true
  },
  {
    name: 'Agency Swarm',
    badge: 'MAXIMUM PIPELINE POWER',
    price: '₹4,999',
    period: 'one-time / monthly',
    leadCount: '50,000 Verified Leads',
    perLead: '₹0.10 / lead',
    features: [
      '50,000 verified proprietor mobiles',
      'Unlimited God-Level Excel workbooks',
      'All 28 States & 660+ Districts coverage',
      'Custom CRM CSV & XLSX formatting',
      'Dedicated account strategist',
      'Custom webhook integrations'
    ],
    cta: 'Get Agency Swarm (₹4,999)',
    isPopular: false
  }
];

// Sample top states and modern districts for territory explorer
const TOP_STATES_TERRITORIES = [
  {
    state: 'Andhra Pradesh',
    districts: [
      'Guntur', 'NTR (Vijayawada)', 'Palnadu', 'Bapatla', 'Krishna', 'Visakhapatnam',
      'Anakapalli', 'Kakinada', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'West Godavari',
      'Eluru', 'Tirupati', 'Chittoor', 'Annamayya', 'Sri Sathya Sai', 'Ananthapuramu',
      'Kurnool', 'Nandyal', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Srikakulam',
      'Vizianagaram', 'Parvathipuram Manyam', 'Alluri Sitharama Raju', 'YSR Kadapa'
    ]
  },
  {
    state: 'Telangana',
    districts: ['Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda', 'Sangareddy', 'Siddipet']
  },
  {
    state: 'Maharashtra',
    districts: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur', 'Amravati', 'Nanded']
  },
  {
    state: 'Karnataka',
    districts: ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubli-Dharwad', 'Belagavi', 'Mangaluru', 'Davangere', 'Ballari']
  },
  {
    state: 'Gujarat',
    districts: ['Surat', 'Ahmedabad', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh']
  },
  {
    state: 'Tamil Nadu',
    districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore']
  },
  {
    state: 'Rajasthan',
    districts: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur', 'Ajmer', 'Bhilwara', 'Alwar']
  },
  {
    state: 'Uttar Pradesh',
    districts: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad', 'Noida (G.B. Nagar)', 'Meerut']
  }
];

export default function LandingV2() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Navigation Solidification
  const [solid, setSolid] = useState(false);

  // Playground State
  const [activePreset, setActivePreset] = useState(0);
  const [customQuery, setCustomQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [playgroundView, setPlaygroundView] = useState('table'); // 'table' | 'cards'
  const [liveLogs, setLiveLogs] = useState(PRESETS[0].logs);
  const [openFaq, setOpenFaq] = useState(0);

  // Relatable Real-World Cash Return State
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [dealsClosed, setDealsClosed] = useState(2);
  const [customDealValue, setCustomDealValue] = useState(45000);

  // Territory Explorer State
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const [villageSearch, setVillageSearch] = useState('');
  const [villageResults, setVillageResults] = useState([]);

  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 15);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('lp-page');
    document.body.classList.add('lp-page');
    return () => {
      document.documentElement.classList.remove('lp-page');
      document.body.classList.remove('lp-page');
    };
  }, []);

  // Update deal value when profile changes
  const handleSelectBusinessProfile = (index) => {
    setSelectedProfileIndex(index);
    setCustomDealValue(BUSINESS_PROFILES[index].typicalDeal);
  };

  const goWorkspace = () => navigate('/command');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const handleSelectPreset = (index) => {
    setActivePreset(index);
    setCustomQuery(PRESETS[index].label);
    setIsSimulating(true);
    setLiveLogs([
      { badge: 'Market Search', text: `Scanning local market registry in ${PRESETS[index].city}...`, type: 'info' },
      { badge: 'Proprietors', text: `Locating business owners for ${PRESETS[index].category}...`, type: 'info' }
    ]);

    setTimeout(() => {
      setLiveLogs(PRESETS[index].logs);
      setIsSimulating(false);
    }, 400);
  };

  const handleRunCustomSearch = () => {
    setIsSimulating(true);
    const query = customQuery.trim() || 'Businesses in Guntur';
    setLiveLogs([
      { badge: 'Market Search', text: `Searching verified local businesses for "${query}"...`, type: 'info' },
      { badge: 'Proprietors', text: 'Identifying business owners, partners & managing directors...', type: 'info' },
      { badge: 'Mobile Check', text: 'Filtered out dead reception landlines · Retaining 100% active +91 personal mobiles', type: 'warn' },
      { badge: 'Ready to Chat', text: 'Verified decision-makers extracted · 1-Click WhatsApp & God-Level Excel ready', type: 'success' }
    ]);
    setTimeout(() => setIsSimulating(false), 450);
  };

  // God-Level Excel Download Trigger
  const handleDownloadGodLevelExcel = () => {
    const current = PRESETS[activePreset];
    // Attempt download from live backend God-Level Excel endpoint
    const url = `${API_URL}/export/sample-excel?category=${encodeURIComponent(current.category)}&city=${encodeURIComponent(current.city)}`;
    const win = window.open(url, '_blank');
    if (!win) {
      // Fallback to CSV if popup blocker is active
      const rows = [
        ['Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'Email', 'Address', 'Pincode', 'Rating', 'Reviews Count', 'WhatsApp Direct URL'],
        ...current.leads.map(l => [
          l.name,
          current.category,
          l.phone,
          '',
          // Never invent an email: unknown stays unknown.
          '',
          l.area,
          '',
          l.rating,
          l.reviews,
          waHref(l.phone, l.waMessage)
        ])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(i => `"${String(i).replace(/"/g, '""')}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sample_${current.category.replace(/\s+/g, '_')}_${current.city}_Leads.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Live Village Search lookup
  const handleSearchVillages = async (query) => {
    setVillageSearch(query);
    if (!query || query.trim().length < 2) {
      setVillageResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/territory/search?q=${encodeURIComponent(query)}&limit=12`);
      if (res.ok) {
        const json = await res.json();
        setVillageResults(json.results || []);
      }
    } catch (e) {
      // Local fallback lookup
      const q = query.toLowerCase();
      const matches = [];
      for (const st of TOP_STATES_TERRITORIES) {
        for (const dist of st.districts) {
          if (dist.toLowerCase().includes(q)) {
            matches.push({ type: 'district', name: dist, state: st.state });
          }
        }
      }
      setVillageResults(matches);
    }
  };

  // Cash Return Calculations
  const cashCalculations = useMemo(() => {
    const totalRevenue = dealsClosed * customDealValue;
    const softwareCost = 999;
    const netProfit = totalRevenue - softwareCost;
    const multiplier = Math.round(totalRevenue / softwareCost);

    return {
      totalRevenue,
      softwareCost,
      netProfit,
      multiplier: Math.max(10, multiplier)
    };
  }, [dealsClosed, customDealValue]);

  const currentPresetData = PRESETS[activePreset] || PRESETS[0];
  const currentStateTerritory = TOP_STATES_TERRITORIES[selectedStateIndex] || TOP_STATES_TERRITORIES[0];

  return (
    <div className="lp-root">
      {/* --------------------------------------------------------------------
         EXECUTIVE CALM ARCHITECTURAL SLATE GRID ON WHITE BACKGROUND
         Non-sticky, steady, pristine white canvas with gentle radiant pulse
         -------------------------------------------------------------------- */}
      <div className="lp-white-grid-layer">
        <div className="lp-white-grid" />
      </div>

      {/* Ambient Radial Soft Lighting */}
      <div className="lp-ambient-glow" />
      <div className="lp-ambient-glow-secondary" />
      <div className="lp-ambient-glow-tertiary" />

      {/* Top Scroll Progress Indicator */}
      <motion.div
        style={{
          scaleX: progressBar,
          transformOrigin: '0% 50%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 999,
          background: 'linear-gradient(90deg, #7c3aed, #4f46e5, #059669)',
          boxShadow: '0 0 14px rgba(124,58,237,0.7)'
        }}
      />

      {/* --------------------------------------------------------------------
         Sticky Glass Navbar
         -------------------------------------------------------------------- */}
      <header className="lp-header" data-solid={solid}>
        <div className="lp-container lp-nav-inner">
          <BrandLogo
            size={36}
            theme="light"
            onClick={goWorkspace}
            showTagline={true}
            tagline="Real Business Leads & Mobiles"
            className="lp-logo"
          />

          <nav className="lp-nav-links">
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('playground')}>Live Scraper</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('roi-calculator')}>Cash Calculator</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('territory-directory')}>All 660+ Districts</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
          </nav>

          <div className="lp-nav-actions">
            <span className="lp-status-pill">
              <span className="lp-pulse-dot" />
              Mobiles first
            </span>
            <button type="button" className="lp-btn-3d-primary" onClick={goWorkspace}>
              Get 1,000 Leads Free <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* --------------------------------------------------------------------
           Hero Section: 3D Embossed Typography & Tactile 3D Buttons
           -------------------------------------------------------------------- */}
        <section className="lp-hero-section">
          <div className="lp-container">
            {/* Hero Badges Stack — Strictly One Below Another */}
            <div className="lp-hero-badges-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <motion.div
                className="lp-hero-badge"
                style={{ margin: 0 }}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Sparkles size={14} color="#7c3aed" />
                ⚡ VALIDATED BUSINESS MOBILES · WHATSAPP READY
              </motion.div>

              <motion.div
                className="lp-hero-subbadge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 750,
                  color: '#475569',
                  letterSpacing: '0.04em',
                  margin: 0,
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  padding: '5px 16px',
                  borderRadius: 9999
                }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.04, ease: EASE }}
              >
                <Compass size={13} color="#059669" />
                INDIA HOME · 245 COUNTRIES · 660+ DISTRICTS · 5,900+ MANDALS · 0 API KEYS
              </motion.div>
            </div>

            <motion.h1
              className="lp-embossed-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
            >
              Find Every Business Owner, In Any Country.
              <span className="lp-embossed-sub">India first. Then the UK, US, Canada, UAE and 240 more.</span>
            </motion.h1>

            <motion.p
              className="lp-hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            >
              Stop wasting days calling receptionists, fake numbers, and dead landlines. <b>Scraper.co.in</b> gives you the direct personal WhatsApp mobile numbers of real business proprietors in any city, county, province, prefecture or mandal — parsed in the country's own phone format and labelled with its own hierarchy.
            </motion.p>

            <motion.div
              className="lp-hero-ctas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
            >
              <button type="button" className="lp-btn-3d-primary" onClick={goWorkspace}>
                Find Leads in Your City (1,000 Free) <ArrowRight size={16} />
              </button>
              <button type="button" className="lp-btn-3d-secondary" onClick={() => scrollToSection('playground')}>
                <Play size={14} /> Try Live Scraper Demo
              </button>
            </motion.div>

            {/* Sleek Territory Pill Strip */}
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 20,
                fontSize: 11.5,
                color: '#64748b'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span style={{ fontWeight: 700, color: '#334155' }}>POPULAR TERRITORIES:</span>
              <span className="lp-territory-pill">📍 Guntur</span>
              <span className="lp-territory-pill">📍 NTR (Vijayawada)</span>
              <span className="lp-territory-pill">📍 Palnadu</span>
              <span className="lp-territory-pill">📍 Bapatla</span>
              <span className="lp-territory-pill">📍 Tirupati</span>
              <span className="lp-territory-pill">📍 Visakhapatnam</span>
              <span className="lp-territory-pill">📍 Hyderabad</span>
              <span className="lp-territory-pill">📍 Bengaluru</span>
              <span className="lp-territory-pill">📍 Surat</span>
              <span className="lp-territory-pill">📍 Jaipur</span>
              <span className="lp-territory-pill">📍 Pune</span>
              <span className="lp-territory-pill">📍 All 660+ Districts</span>
            </motion.div>

            {/* Proof Metric Bar */}
            <div className="lp-proof-bar">
              <div className="lp-proof-item">
                <CheckCircle2 size={16} color="#059669" />
                <span>100% Real Indian Mobiles</span>
              </div>
              <div className="lp-proof-item">
                <CheckCircle2 size={16} color="#059669" />
                <span>Direct Owner WhatsApp</span>
              </div>
              <div className="lp-proof-item">
                <CheckCircle2 size={16} color="#059669" />
                <span>Zero Gatekeepers / Receptionists</span>
              </div>
              <div className="lp-proof-item">
                <CheckCircle2 size={16} color="#059669" />
                <span>God-Level Formatted Excel</span>
              </div>
            </div>

            {/* 3D Spatial Front-Facing Cockpit Canvas */}
            <motion.div
              className="lp-cockpit-canvas"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.32, ease: EASE }}
            >
              <div className="lp-cockpit-topbar">
                <div className="lp-cockpit-dots">
                  <span /><span /><span />
                </div>
                <span className="lp-cockpit-title">scraper.co.in — real-time business lead console</span>
                <span className="lp-status-pill">
                  <span className="lp-pulse-dot" /> Verified Leads Live
                </span>
              </div>

              {/* Animated Search Command Mockup */}
              <div className="lp-cockpit-searchbar">
                <Search size={18} color="#7c3aed" />
                <span className="lp-cockpit-search-input">Dental Clinics in Guntur</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                  Search Complete (6.4s)
                </span>
              </div>

              {/* Telemetry Strip */}
              <div className="lp-cockpit-telemetry">
                <div className="lp-telemetry-badge">
                  <span className="lp-telemetry-val">148 Clinics</span>
                  <span className="lp-telemetry-lbl">Extracted in 6.4s</span>
                </div>
                <div className="lp-telemetry-badge">
                  <span className="lp-telemetry-val" style={{ color: '#059669' }}>142 Mobiles</span>
                  <span className="lp-telemetry-lbl">Validated +91</span>
                </div>
                <div className="lp-telemetry-badge">
                  <span className="lp-telemetry-val" style={{ color: '#0284c7' }}>Landlines kept separate</span>
                  <span className="lp-telemetry-lbl">Zero Switchboards</span>
                </div>
                <div className="lp-telemetry-badge">
                  <span className="lp-telemetry-val" style={{ color: '#7c3aed' }}>100% WhatsApp</span>
                  <span className="lp-telemetry-lbl">Click-to-Connect</span>
                </div>
              </div>

              {/* Live Streaming Lead Rows */}
              <div className="lp-cockpit-stream">
                {currentPresetData.leads.map((lead, idx) => (
                  <div className="lp-stream-card" key={idx}>
                    <div className="lp-stream-left">
                      <div className="lp-stream-avatar">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="lp-stream-info">
                        <span className="lp-stream-name">
                          {lead.name}
                          <CheckCircle2 size={13} color="#059669" />
                        </span>
                        <span className="lp-stream-sub">
                          <span>{lead.owner}</span>
                          <span>•</span>
                          <span>{lead.area}</span>
                        </span>
                      </div>
                    </div>

                    <div className="lp-stream-right">
                      <span className="lp-phone-pill">
                        <Phone size={12} /> {lead.phone}
                      </span>
                      <a
                        href={waHref(lead.phone, lead.waMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lp-btn-3d-wa"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare size={13} /> Message
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* --------------------------------------------------------------------
           Infinite Live Activity Marquee Ticker Strip
           -------------------------------------------------------------------- */}
        <div className="lp-marquee-section">
          <div className="lp-marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
              <div className="lp-marquee-item" key={idx}>
                <b>{item.tag}</b>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------------------------
           Simple 3-Step Explanation
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-steps-section"
          id="how-it-works"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Simple 3-Step Process</span>
              <h2 className="lp-section-title">I Am Just Opening This Portal. How Does It Work?</h2>
              <p className="lp-section-desc">
                No complex setups or technical installations. Three dead-simple steps from opening the portal to closing your first WhatsApp client.
              </p>
            </div>

            <div className="lp-steps-grid">
              {SIMPLE_STEPS.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    padding: 32,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#7C3AED', opacity: 0.8, marginBottom: 12 }}>
                    {s.step}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 750, color: '#0F172A', marginBottom: 12 }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6 }}>
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           Interactive Authentic Scraper Live Playground (Dashboard Spoof)
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-playground-section"
          id="playground"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Interactive Live Playground</span>
              <h2 className="lp-section-title">Test Any Category in Any City</h2>
              <p className="lp-section-desc">
                Experience the authentic dashboard in real time. Choose an example market or type your city to see direct proprietor leads verified live.
              </p>
            </div>

            <div className="lp-playground-box">
              {/* Preset Prompt Chips */}
              <div className="lp-preset-chips">
                <span className="lp-chip-label">POPULAR PROMPTS:</span>
                {PRESETS.map((preset, index) => (
                  <button
                    type="button"
                    key={index}
                    className="lp-chip-btn"
                    data-active={activePreset === index}
                    onClick={() => handleSelectPreset(index)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Search Bar Input */}
              <div className="lp-search-bar-wrap">
                <input
                  type="text"
                  className="lp-search-input-field"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunCustomSearch()}
                  placeholder="e.g. Doctors in Guntur, Photographers in Vijayawada, Hardware in Surat..."
                />
                <button
                  type="button"
                  className="lp-btn-3d-primary"
                  onClick={handleRunCustomSearch}
                >
                  <Search size={16} /> Run Live Search
                </button>
              </div>

              {/* Executive Live Scanner Status Card (Customer-Focused, Zero Technical Jargon) */}
              <div className="lp-dash-status-card">
                <div className="lp-dash-status-top">
                  <div className="lp-dash-status-title">
                    <span className="lp-pulse-dot" />
                    LIVE BUSINESS SCANNER · REAL-TIME VERIFICATION
                  </div>
                  <div className="lp-dash-status-meta">
                    <CheckCircle2 size={13} color="#059669" />
                    Mobile-first contact column · landlines kept separate
                  </div>
                </div>

                <div className="lp-dash-steps-strip">
                  {liveLogs.map((log, i) => (
                    <div className="lp-dash-step-item" key={i}>
                      <div className={`lp-dash-step-icon ${i === 0 ? 'indigo' : i === 1 ? 'violet' : i === 2 ? 'amber' : 'emerald'}`}>
                        {i === 0 ? <Search size={14} /> : i === 1 ? <Building2 size={14} /> : i === 2 ? <Phone size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div className="lp-dash-step-content">
                        <div className="lp-dash-step-heading">{log.badge}</div>
                        <div className="lp-dash-step-sub">{log.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard View Switcher & Toolbar */}
              <div className="lp-dash-toolbar">
                <div className="lp-dash-tabs">
                  <button
                    type="button"
                    className="lp-dash-tab-btn"
                    data-active={playgroundView === 'table'}
                    onClick={() => setPlaygroundView('table')}
                  >
                    <Table2 size={14} /> Dashboard Table View
                  </button>
                  <button
                    type="button"
                    className="lp-dash-tab-btn"
                    data-active={playgroundView === 'cards'}
                    onClick={() => setPlaygroundView('cards')}
                  >
                    <LayoutGrid size={14} /> Lead Cards View
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                    ⚡ <b>{currentPresetData.yieldCount} verified businesses</b> · <b>{currentPresetData.mobileCount} direct mobiles</b>
                  </span>

                  <button
                    type="button"
                    className="lp-btn-3d-secondary"
                    onClick={handleDownloadGodLevelExcel}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    <FileSpreadsheet size={15} color="#059669" />
                    Download God-Level Excel (.xlsx)
                  </button>
                </div>
              </div>

              {/* View 1: Authentic Dashboard Lead Table View (Default) */}
              {playgroundView === 'table' ? (
                <div className="lp-dash-table-wrap">
                  <table className="lp-dash-table">
                    <thead>
                      <tr>
                        <th className="lp-dash-th">BUSINESS &amp; CATEGORY</th>
                        <th className="lp-dash-th">DECISION MAKER / PROPRIETOR</th>
                        <th className="lp-dash-th">VERIFIED MOBILE NUMBER</th>
                        <th className="lp-dash-th">LOCATION &amp; PINCODE</th>
                        <th className="lp-dash-th">INSTANT OUTREACH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPresetData.leads.map((lead, i) => (
                        <tr className="lp-dash-row" key={i}>
                          <td className="lp-dash-td">
                            <div className="lp-dash-cell-biz">
                              {lead.name}
                              <CheckCircle2 size={13} color="#059669" />
                            </div>
                            <div className="lp-dash-cell-cat">
                              {currentPresetData.category} · <span className="lp-dash-rating-pill">★ {lead.rating} ({lead.reviews})</span>
                            </div>
                          </td>
                          <td className="lp-dash-td">
                            <div className="lp-dash-cell-owner">{lead.owner.split('(')[0]}</div>
                            <div className="lp-dash-cell-title">{lead.owner.includes('(') ? lead.owner.split('(')[1].replace(')', '') : 'Owner / Founder'}</div>
                          </td>
                          <td className="lp-dash-td">
                            <span className="lp-dash-phone-badge">
                              <Phone size={11} /> {lead.phone}
                            </span>
                          </td>
                          <td className="lp-dash-td">
                            <div style={{ fontSize: 12.5, color: '#334155' }}>
                              <MapPin size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                              {lead.area}
                            </div>
                          </td>
                          <td className="lp-dash-td">
                            <a
                              href={waHref(lead.phone, lead.waMessage)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lp-dash-action-btn"
                            >
                              <MessageSquare size={13} /> Chat on WhatsApp
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* View 2: Cards Grid View */
                <div className="lp-results-grid">
                  {currentPresetData.leads.map((lead, i) => (
                    <div className="lp-lead-card" key={i}>
                      <div>
                        <div className="lp-lead-card-head">
                          <div>
                            <div className="lp-lead-title">{lead.name}</div>
                            <div className="lp-lead-loc">
                              <MapPin size={12} /> {lead.area}
                            </div>
                          </div>
                          <span className="lp-score-badge">{lead.score}</span>
                        </div>

                        <div className="lp-lead-card-body">
                          <div style={{ fontSize: 13, color: '#0F172A', marginBottom: 8, fontWeight: 600 }}>
                            {lead.owner}
                          </div>
                          <div className="lp-lead-phone-row">
                            <span className="lp-lead-phone-text">{lead.phone}</span>
                            <span style={{ fontSize: 11, fontWeight: 750, color: '#059669' }}>VERIFIED MOBILE</span>
                          </div>
                        </div>
                      </div>

                      <div className="lp-lead-card-footer">
                        <div className="lp-rating-tag">
                          <Star size={13} fill="#d97706" stroke="#d97706" />
                          <span>{lead.rating}</span>
                          <span style={{ color: '#64748b', fontSize: 11 }}>({lead.reviews} reviews)</span>
                        </div>
                        <a
                          href={waHref(lead.phone, lead.waMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lp-btn-3d-wa"
                        >
                          <MessageSquare size={13} /> Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           Outcome-Driven Bento Grid ("Why We Beat Other Tools")
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-bento-section"
          id="why-we-win"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Why We Beat Other Portals</span>
              <h2 className="lp-section-title">Built for Real Deals, Not Dead Databases</h2>
              <p className="lp-section-desc">
                Here is why sales teams, marketing agencies, and distributors switch to Scraper.co.in.
              </p>
            </div>

            <div className="lp-bento-grid">
              {/* Bento 1 */}
              <div className="lp-bento-card lp-bento-span-2">
                <div>
                  <div className="lp-bento-icon is-emerald">
                    <Phone size={24} />
                  </div>
                  <h3 className="lp-bento-title">Direct Proprietor Mobiles Only — Zero Receptionists</h3>
                  <p className="lp-bento-desc">
                    Most databases give you switchboard numbers and landlines where 70% of calls bounce or get blocked by gatekeepers. We verify every single number against Indian mobile carriers. You get the personal 10-digit mobile that the owner carries in their pocket.
                  </p>
                </div>
                <div className="lp-comparison-pill">
                  <div className="lp-compare-bad">
                    <span>❌ Other tools:</span> 65% landlines, receptionists refusing to transfer, outdated numbers from 2021.
                  </div>
                  <div className="lp-compare-good">
                    <span>✓ Scraper.co.in:</span> 100% active Indian mobiles. If it is not a direct mobile, it never enters your list.
                  </div>
                </div>
              </div>

              {/* Bento 2 */}
              <div className="lp-bento-card">
                <div>
                  <div className="lp-bento-icon is-violet">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="lp-bento-title">1-Click WhatsApp Sales Outreach</h3>
                  <p className="lp-bento-desc">
                    No more copying numbers into your phone contacts by hand. Click once to open WhatsApp Web with a personalized, high-converting pitch ready to send.
                  </p>
                </div>
                <div className="lp-comparison-pill">
                  <div className="lp-compare-good">
                    <span>✓ 14.5% reply rate</span> on WhatsApp vs 1.8% cold calls.
                  </div>
                </div>
              </div>

              {/* Bento 3 */}
              <div className="lp-bento-card">
                <div>
                  <div className="lp-bento-icon is-indigo">
                    <MapPin size={24} />
                  </div>
                  <h3 className="lp-bento-title">Every Shop in Town — Complete Depth</h3>
                  <p className="lp-bento-desc">
                    Generic tools give up after 40 results on page 1. We sweep every commercial lane, suburb, and market across the entire city, town, or village so you never miss a client.
                  </p>
                </div>
                <div className="lp-comparison-pill">
                  <div className="lp-compare-good">
                    <span>✓ Complete market inventory:</span> 660+ districts &amp; 600,000+ villages covered.
                  </div>
                </div>
              </div>

              {/* Bento 4 */}
              <div className="lp-bento-card">
                <div>
                  <div className="lp-bento-icon is-cyan">
                    <Zap size={24} />
                  </div>
                  <h3 className="lp-bento-title">Fresh on Demand — Never Recycled</h3>
                  <p className="lp-bento-desc">
                    Data brokers resell the same stale Excel list to dozens of your competitors. Your search runs fresh the second you ask. Closed shops and old numbers are dropped automatically.
                  </p>
                </div>
                <div className="lp-comparison-pill">
                  <div className="lp-compare-good">
                    <span>✓ 0ms stale data:</span> Harvested live and stored privately in your PC.
                  </div>
                </div>
              </div>

              {/* Bento 5 */}
              <div className="lp-bento-card">
                <div>
                  <div className="lp-bento-icon is-amber">
                    <Building2 size={24} />
                  </div>
                  <h3 className="lp-bento-title">God-Level Formatted Excel Workbooks</h3>
                  <p className="lp-bento-desc">
                    Get beautifully formatted spreadsheets matching our Slate 900 openpyxl standard: green highlights on top-rated businesses, yellow rating metrics, clean integer pincodes, auto-filters, and freeze panes.
                  </p>
                </div>
                <div className="lp-comparison-pill">
                  <div className="lp-compare-good">
                    <span>✓ Executive Grade:</span> Ready to hand directly to your sales reps or clients.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           Relatable Real-World Cash Return Calculator (Attractive for Normal People)
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-roi-section"
          id="roi-calculator"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Real-World Money Calculator</span>
              <h2 className="lp-section-title">How Much Money Can You Make From 50 WhatsApp Leads?</h2>
              <p className="lp-section-desc">
                You don't need hundreds of clients. In Indian B2B markets, closing even 1 or 2 deals from real proprietor WhatsApp numbers pays back your software 50× to 100× over.
              </p>
            </div>

            <div className="lp-roi-box">
              <div className="lp-roi-sliders">
                {/* 1-Click Industry Selector */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 750, color: '#0F172A', letterSpacing: '0.04em', display: 'block', marginBottom: 10 }}>
                    1. SELECT YOUR BUSINESS / INDUSTRY:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                    {BUSINESS_PROFILES.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelectBusinessProfile(idx)}
                        style={{
                          background: selectedProfileIndex === idx ? '#0F172A' : '#FFFFFF',
                          borderColor: selectedProfileIndex === idx ? '#0F172A' : '#CBD5E1',
                          color: selectedProfileIndex === idx ? '#FFFFFF' : '#334155',
                          border: '1px solid',
                          borderRadius: 10,
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{p.icon}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 750 }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: selectedProfileIndex === idx ? '#94A3B8' : '#64748B' }}>
                          ₹{p.typicalDeal.toLocaleString('en-IN')} / {p.unit}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider: Deals to Close */}
                <div className="lp-slider-group">
                  <div className="lp-slider-header">
                    <span className="lp-slider-label">If you close just this many deals this month:</span>
                    <span className="lp-slider-val" style={{ color: '#059669' }}>{dealsClosed} Deals Closed</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={dealsClosed}
                    onChange={(e) => setDealsClosed(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <span>1 client (minimum)</span>
                    <span>3 clients</span>
                    <span>5 clients</span>
                    <span>10 clients (huge month)</span>
                  </div>
                </div>

                {/* Slider: Value per Deal */}
                <div className="lp-slider-group">
                  <div className="lp-slider-header">
                    <span className="lp-slider-label">Your Profit / Revenue per Closed Deal:</span>
                    <span className="lp-slider-val">₹{customDealValue.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="250000"
                    step="5000"
                    value={customDealValue}
                    onChange={(e) => setCustomDealValue(Number(e.target.value))}
                    className="lp-range-slider"
                  />
                </div>
              </div>

              {/* Calculated Concrete Rupee Returns */}
              <div className="lp-roi-results">
                <div className="lp-roi-stat-row">
                  <div className="lp-roi-stat-val" style={{ color: '#059669', fontSize: 40, fontWeight: 900 }}>
                    ₹{cashCalculations.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="lp-roi-stat-lbl">Direct Cash In Your Pocket This Month</div>
                </div>

                <div className="lp-roi-stat-row">
                  <div className="lp-roi-stat-val" style={{ color: '#0284c7', fontSize: 24 }}>
                    ₹{cashCalculations.softwareCost}
                  </div>
                  <div className="lp-roi-stat-lbl">Your Total Software Cost (Starter Plan / Free Drive)</div>
                </div>

                <div className="lp-roi-stat-row">
                  <div className="lp-roi-stat-val" style={{ color: '#7c3aed', fontSize: 28 }}>
                    {cashCalculations.multiplier}× Payoff
                  </div>
                  <div className="lp-roi-stat-lbl">Net Profit: ₹{cashCalculations.netProfit.toLocaleString('en-IN')}</div>
                </div>

                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: 12, borderRadius: 10, fontSize: 12, color: '#065F46', marginBottom: 16 }}>
                  💡 <b>Real-World Guarantee:</b> Closing just 1 single customer from your WhatsApp leads pays for your entire year of software.
                </div>

                <button type="button" className="lp-btn-3d-primary" onClick={goWorkspace} style={{ width: '100%' }}>
                  Claim 1,000 Free Leads — Close Your First Client <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           All-India Territorial Lead Engine & 660+ Districts Directory (SEO Powerhouse)
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-territory-section"
          id="territory-directory"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">All-India Territorial Coverage</span>
              <h2 className="lp-section-title">Verified Business Leads Across All 660+ Districts &amp; 600,000 Villages</h2>
              <p className="lp-section-desc">
                From major metro tech corridors to district headquarters, tehsils, and rural mandals: Scraper.co.in extracts direct proprietor WhatsApp mobiles everywhere.
              </p>
            </div>

            <div className="lp-territory-box">
              {/* Live Search Input for Towns & Villages */}
              <div className="lp-territory-search-row">
                <input
                  type="text"
                  className="lp-territory-input"
                  placeholder="Search any Indian District, Mandal or Village (e.g. Guntur, Brodipet, Tenali, Sitapura, Whitefield)..."
                  value={villageSearch}
                  onChange={(e) => handleSearchVillages(e.target.value)}
                />
                <button
                  type="button"
                  className="lp-btn-3d-primary"
                  onClick={() => handleSearchVillages(villageSearch)}
                >
                  <Search size={16} /> Search Village Leads
                </button>
              </div>

              {/* Real-Time Village Search Matches Popup */}
              {villageResults.length > 0 && (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 750, color: '#0F172A', marginBottom: 10 }}>
                    FOUND {villageResults.length} MATCHING TERRITORIES FOR "{villageSearch}":
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {villageResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setCustomQuery(`Businesses in ${item.name}`);
                          scrollToSection('playground');
                        }}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          padding: '10px 14px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        <div style={{ fontWeight: 750, color: '#0F172A' }}>📍 {item.name}</div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>
                          {item.mandal ? `${item.mandal} Mandal · ` : ''}{item.district ? `${item.district} Dist · ` : ''}{item.state}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', display: 'block', marginTop: 4 }}>
                          ⚡ Click to Search This Market
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State Chips */}
              <div className="lp-territory-state-chips">
                {TOP_STATES_TERRITORIES.map((st, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className="lp-territory-state-pill"
                    data-active={selectedStateIndex === idx}
                    onClick={() => setSelectedStateIndex(idx)}
                  >
                    {st.state} ({st.districts.length} Districts)
                  </button>
                ))}
              </div>

              {/* District Cards Grid */}
              <div className="lp-territory-districts-grid">
                {currentStateTerritory.districts.map((dist, idx) => (
                  <div
                    className="lp-district-card"
                    key={idx}
                    onClick={() => {
                      setCustomQuery(`Businesses in ${dist}`);
                      scrollToSection('playground');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="lp-district-name">
                        <MapPin size={13} color="#7c3aed" /> {dist}
                      </div>
                      <div className="lp-district-meta">
                        {currentStateTerritory.state} · 100% Mobile Coverage
                      </div>
                    </div>
                    <div className="lp-district-lead-tag">
                      <Zap size={11} color="#059669" /> Find verified leads in {dist} →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           Simple, Transparent Portal Launch Pricing
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-pricing-section"
          id="pricing"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Portal Launch Pricing</span>
              <h2 className="lp-section-title">Zero Contracts. Simple &amp; Transparent.</h2>
              <p className="lp-section-desc">
                Start with 1,000 free leads today. Upgrade only when you want to expand your sales pipeline.
              </p>
            </div>

            <div className="lp-pricing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {PRICING_TIERS.map((tier, idx) => (
                <div className={`lp-price-card ${tier.isPopular ? 'is-featured' : ''}`} key={idx}>
                  {tier.isPopular && <span className="lp-featured-badge">MOST POPULAR</span>}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 750, color: '#7c3aed', letterSpacing: '0.06em', marginBottom: 6 }}>
                      {tier.badge}
                    </div>
                    <div className="lp-price-name">{tier.name}</div>
                    <div className="lp-price-amount">
                      {tier.price}<span>/{tier.period}</span>
                    </div>
                    <div className="lp-price-per-lead" style={{ color: tier.isPopular ? '#0284c7' : '#059669' }}>
                      {tier.leadCount} ({tier.perLead})
                    </div>

                    <div className="lp-price-features">
                      {tier.features.map((f, i) => (
                        <div className="lp-feature-item" key={i}>
                          <Check size={16} /> {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={tier.isPopular ? 'lp-btn-3d-primary' : 'lp-btn-3d-secondary'}
                    onClick={goWorkspace}
                    style={{ width: '100%', marginTop: 24 }}
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* --------------------------------------------------------------------
           FAQ Accordion
           -------------------------------------------------------------------- */}
        <motion.section
          className="lp-faq-section"
          id="faq"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="lp-container">
            <div className="lp-section-header">
              <span className="lp-section-pill">Frequently Asked Questions</span>
              <h2 className="lp-section-title">Everything You Need to Know</h2>
            </div>

            <div className="lp-faq-list">
              <div className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(openFaq === 0 ? -1 : 0)}
                >
                  <span>Why is Scraper.co.in better than buying old Excel sheets or using JustDial?</span>
                  {openFaq === 0 ? <ChevronUp size={18} color="#7c3aed" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {openFaq === 0 && (
                  <div className="lp-faq-answer">
                    Old data brokers sell years-old sheets where 65% of numbers are dead landlines, switchboards, or disconnected lines. JustDial sells the exact same lead to 10 of your competitors at once. With Scraper.co.in, every lead is searched live on-demand, exclusive to you, and 100% verified for WhatsApp.
                  </div>
                )}
              </div>

              <div className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(openFaq === 1 ? -1 : 1)}
                >
                  <span>How does 1-Click WhatsApp outreach work?</span>
                  {openFaq === 1 ? <ChevronUp size={18} color="#7c3aed" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {openFaq === 1 && (
                  <div className="lp-faq-answer">
                    Every verified mobile number includes a generated WhatsApp click-to-chat link. Clicking it immediately opens WhatsApp Web (on PC) or WhatsApp App (on mobile) with a polite, pre-formatted intro message addressed to the proprietor. No copy-pasting numbers or saving contacts into your phone.
                  </div>
                )}
              </div>

              <div className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(openFaq === 2 ? -1 : 2)}
                >
                  <span>What format is the God-Level Excel export?</span>
                  {openFaq === 2 ? <ChevronUp size={18} color="#7c3aed" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {openFaq === 2 && (
                  <div className="lp-faq-answer">
                    Our God-Level Excel export generates an executive-grade .xlsx spreadsheet styled per our openpyxl design system: Slate 900 headers, green highlights on top-tier businesses (Rating 4.7+ and 100+ reviews), yellow rating metrics, zebra striping, freeze panes at row 6, auto-filters, clean integer pincodes, and direct WhatsApp URLs.
                  </div>
                )}
              </div>

              <div className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-question"
                  onClick={() => setOpenFaq(openFaq === 3 ? -1 : 3)}
                >
                  <span>Does it cover smaller towns, tehsils, mandals, and villages across all 660+ districts?</span>
                  {openFaq === 3 ? <ChevronUp size={18} color="#7c3aed" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {openFaq === 3 && (
                  <div className="lp-faq-answer">
                    Yes! We have all 26 modernized Andhra Pradesh districts, 33 Telangana districts, and all 660+ districts across 28 states and 8 UTs indexed with over 619,290 Indian villages and towns. Whether you are searching for clinics in Guntur, borewell contractors in a rural mandal, or manufacturers in Surat, you get 100% full coverage.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* --------------------------------------------------------------------
         Footer with Scraper.co.in Branding
         -------------------------------------------------------------------- */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-in">
          <div className="lp-footer-left">
            <BrandLogo
              size={30}
              theme="light"
              onClick={goWorkspace}
              className="lp-logo"
            />
            <span className="lp-footer-copy">
              © 2026 Scraper.co.in — Real Business Leads &amp; Decision Maker Mobiles. All 660+ Indian Districts Covered. All rights reserved.
            </span>
          </div>

          <div className="lp-footer-links">
            <button type="button" className="lp-footer-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="lp-footer-link" onClick={() => scrollToSection('playground')}>Live Scraper</button>
            <button type="button" className="lp-footer-link" onClick={() => scrollToSection('territory-directory')}>660+ Districts</button>
            <button type="button" className="lp-footer-link" onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button type="button" className="lp-footer-link" onClick={goWorkspace}>Launch Portal</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
