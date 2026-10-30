import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, ShieldCheck, Target, Download, Users, Globe, MapPin,
  CheckCircle2, ArrowRight, Star, BarChart2, Clock, Layers,
  ChevronDown, Menu, X, Phone, Mail, Camera, TrendingUp,
  Database, Filter, RefreshCw, Award, BrainCircuit, Rocket,
  Check, Play, MessageSquare, PhoneCall, ExternalLink, Flame, Sparkles,
  Heart, Copy, Cpu, Terminal, Laptop, QrCode, CheckCheck, Compass,
  Gift, ShieldAlert, Coffee, Send, Share2, AlertCircle, Bot, Square, Folder
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // ── HERO LIVE RADAR SCRAPER SIMULATOR STATE ──
  const [demoQuery, setDemoQuery] = useState('Cafes in Bangalore');
  const [simStatus, setSimStatus] = useState('idle'); // 'idle' | 'running' | 'aborted' | 'completed'
  const simIntervalRef = useRef(null);
  const [simResults, setSimResults] = useState([
    { name: "Dyu Art Cafe", category: "Artisan Coffee & Bakery", locality: "Koramangala 5th Block, Bangalore", phone: "+91 96113 19774", rating: "4.6", reviews: "14,250", coords: "12.9344, 77.6192", verified: true },
    { name: "The Hole In The Wall Cafe", category: "Breakfast & Roastery", locality: "4th Block Koramangala, Bangalore", phone: "+91 99456 92562", rating: "4.5", reviews: "11,890", coords: "12.9332, 77.6254", verified: true },
    { name: "Open Door Coffee Co.", category: "Specialty Pour-Over & Espresso", locality: "100ft Road Indiranagar, Bangalore", phone: "+91 63634 27663", rating: "4.7", reviews: "8,920", coords: "12.9784, 77.6408", verified: true }
  ]);

  const sampleDatasets = {
    'cafes in bangalore': [
      { name: "Dyu Art Cafe", category: "Artisan Coffee & Bakery", locality: "Koramangala 5th Block, Bangalore", phone: "+91 96113 19774", rating: "4.6", reviews: "14,250", coords: "12.9344, 77.6192", verified: true },
      { name: "The Hole In The Wall Cafe", category: "Breakfast & Roastery", locality: "4th Block Koramangala, Bangalore", phone: "+91 99456 92562", rating: "4.5", reviews: "11,890", coords: "12.9332, 77.6254", verified: true },
      { name: "Open Door Coffee Co.", category: "Specialty Pour-Over & Espresso", locality: "100ft Road Indiranagar, Bangalore", phone: "+91 63634 27663", rating: "4.7", reviews: "8,920", coords: "12.9784, 77.6408", verified: true },
      { name: "Cafe Kampu | Specialty Coffee", category: "Micro-Roaster", locality: "9th Block Jayanagar, Bangalore", phone: "+91 99014 72757", rating: "4.8", reviews: "4,600", coords: "12.9250, 77.5938", verified: true },
      { name: "Third Wave Coffee", category: "Modern Espresso Bar", locality: "Whitefield Main Rd, Bangalore", phone: "+91 80456 82000", rating: "4.4", reviews: "18,400", coords: "12.9698, 77.7500", verified: true }
    ],
    'cars in macherla': [
      { name: "Sri Venkateswara Motors", category: "Pre-Owned Cars & Showroom", locality: "Near RTC Bus Stand, Macherla, Palnadu", phone: "+91 98481 23456", rating: "4.7", reviews: "520", coords: "16.4800, 79.4300", verified: true },
      { name: "Palnadu Auto Spares & Sales", category: "Automotive Hub", locality: "Market Yard Road, Macherla, Palnadu", phone: "+91 94402 87654", rating: "4.5", reviews: "380", coords: "16.4780, 79.4320", verified: true },
      { name: "Royal Car Care & Dealers", category: "Certified Pre-Owned", locality: "Nagarjuna Sagar Road, Macherla", phone: "+91 99498 76543", rating: "4.6", reviews: "290", coords: "16.4820, 79.4280", verified: true }
    ],
    'jewelers in vijayawada': [
      { name: "Kirtilals Jewellers", category: "Diamond & Gold Jewellery", locality: "MG Road, Vijayawada, NTR District", phone: "+91 86624 71234", rating: "4.8", reviews: "3,400", coords: "16.5062, 80.6480", verified: true },
      { name: "Navarang Gold & Silver", category: "Traditional Jewellery", locality: "Governorpet, Vijayawada, NTR District", phone: "+91 93901 54321", rating: "4.6", reviews: "2,150", coords: "16.5120, 80.6350", verified: true },
      { name: "Sri Bhavani Jewellers", category: "Heritage Ornaments", locality: "Besant Road, Vijayawada", phone: "+91 98480 98765", rating: "4.7", reviews: "1,890", coords: "16.5100, 80.6380", verified: true }
    ]
  };

  const handleStartSim = (targetQuery) => {
    const q = (targetQuery || demoQuery).trim().toLowerCase();
    if (targetQuery) setDemoQuery(targetQuery);
    setSimStatus('running');
    setSimResults([]);
    toast.success(`Autonomous Swarm targeting: "${targetQuery || demoQuery}"`, { icon: '⚡' });

    const key = Object.keys(sampleDatasets).find(k => {
      const parts = k.split(' in ');
      return q.includes(parts[0]) || (parts[1] && q.includes(parts[1]));
    }) || 'cafes in bangalore';
    const pool = sampleDatasets[key] || sampleDatasets['cafes in bangalore'];

    let idx = 0;
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => {
      if (idx < pool.length) {
        const item = pool[idx];
        setSimResults(prev => [...prev, item]);
        idx++;
      } else {
        clearInterval(simIntervalRef.current);
        setSimStatus('completed');
        toast.success(`Scrape complete! ${pool.length} verified stores organized into folder.`);
      }
    }, 600);
  };

  const handleAbortSim = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setSimStatus('aborted');
    toast.error('Scraper stopped by user. Current stores preserved in folder.', { icon: '⏹' });
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const COMMUNITY_PHONE = "9876543210";
  const COMMUNITY_UPI = "9876543210@paytm";
  const COMMUNITY_WHATSAPP = `https://wa.me/91${COMMUNITY_PHONE}?text=Hi%20Scraper.co.in%20Team%2C%20I%20saw%20your%20platform%20and%20want%20to%20connect!`;
  const COMMUNITY_HIRE_WHATSAPP = `https://wa.me/91${COMMUNITY_PHONE}?text=Hi%20Scraper.co.in%20Team%2C%20I%20reviewed%20your%20platform%20and%20would%20love%20to%20discuss%20a%20project!`;
  const COMMUNITY_AUTOMATION_WHATSAPP = `https://wa.me/91${COMMUNITY_PHONE}?text=Hi%20Scraper.co.in%20Team%2C%20I%20am%20excited%20about%20the%20WhatsApp%20Automation%20feature!`;

  const copyToClipboard = (text, type) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'upi') {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2500);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2500);
      }
      toast.success(`Copied: ${text}`, {
        icon: '📋',
        style: { background: '#090d16', color: '#38bdf8', border: '1px solid #0284c7' }
      });
    }
  };

  const faqs = [
    {
      q: "Is Scraper.co.in really 100% free with no ads?",
      a: "Yes, completely free forever with ZERO ads, zero tracking, and zero hidden walls. Scraper.co.in is engineered to give every Indian startup, SME, and entrepreneur direct access to high-velocity business intelligence."
    },
    {
      q: "What does Scraper.co.in deliver for businesses and startups?",
      a: "We deliver real-time verified business owners, active phone numbers, direct 1-click WhatsApp communication links, customer ratings, physical addresses, and geospatial coordinates across 780+ Indian districts and mandals."
    },
    {
      q: "What is the upcoming Local WhatsApp Automation feature?",
      a: "Scraper.co.in is releasing full local WhatsApp automation within weeks! Instead of manually clicking numbers one by one, your local browser will safely send personalized startup pitches directly to verified business owners using humanized delays and dynamic personalization tags."
    },
    {
      q: "How does the scraper work in simple terms?",
      a: "Just type what business you are looking for (like 'Doctors' or 'Caterers') and the city or town. Our autonomous system scans authentic public registries and map coordinates, collects verified phone numbers, direct WhatsApp links, ratings, and addresses, and gives them to you in one click or Excel download."
    },
    {
      q: "What makes the search bar so intelligent?",
      a: "Scraper.co.in engineered it with real-time natural language disambiguation and Levenshtein fuzzy auto-correction. You don't need to choose 5 dropdown filters; simply type 'cars in macherla' or 'wedding photographers in vijayawada'. It automatically separates the business trade from the location and locks onto post-2022 780+ Indian district and mandal boundaries."
    },
    {
      q: "How does Scraper.co.in compare to traditional business directories?",
      a: "Traditional directories provide outdated listings that are resold to dozens of competitors at once. Scraper.co.in delivers fresh, live-scraped, unshared raw data with direct 1-click WhatsApp outreach and pin-point geographic precision."
    },
    {
      q: "How can I support Scraper.co.in?",
      a: "You can support Scraper.co.in via UPI (9876543210@paytm) or by sharing the platform with fellow entrepreneurs and business owners."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070712] text-slate-100 font-sans selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* ── TOP NAV BAR ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#090918]/85 border-b border-white/[0.08] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25 border border-white/10">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">Scraper<span className="text-cyan-400">.co.in</span></span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Pro Intelligence Engine
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">100% Free • Zero Ads • Pan-India</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
            <a href="#search-intelligence" className="hover:text-violet-400 transition-colors">Smart Search</a>
            <a href="#whatsapp-automation" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Send size={12} className="text-emerald-400" />
              <span>WhatsApp Automation</span>
            </a>
            <a href="#manifesto" className="hover:text-amber-400 transition-colors">Solo Dev Guarantee</a>
            <a href="#why-startups" className="hover:text-cyan-400 transition-colors">Why Startups</a>
            <a href="#what-we-deliver" className="hover:text-slate-200 transition-colors">What We Deliver</a>
            <a href="#how-it-works" className="hover:text-pink-400 transition-colors">Features</a>
            <a href="#donate" className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <Heart size={12} className="text-rose-400 fill-rose-400/40" />
              <span>Donate</span>
            </a>
          </div>

          {/* Right Action CTA */}
          <div className="flex items-center gap-3">
            {/* Quick Donate Modal Trigger */}
            <button
              onClick={() => setDonationModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500/10 to-amber-500/10 hover:from-pink-500/20 hover:to-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Coffee size={13} className="text-amber-400" />
              <span>Support Scraper.co.in</span>
            </button>

            <a
              href={COMMUNITY_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-semibold transition-colors"
            >
              <PhoneCall size={13} className="text-emerald-400" />
              <span>+91 9876543210</span>
            </a>

            <button
              onClick={() => navigate('/app/overview')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-violet-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Launch Free Cockpit</span>
              <ArrowRight size={14} />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="xl:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden pt-4 pb-2 border-t border-white/[0.08] mt-3 space-y-2 text-xs font-semibold text-slate-300">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2">How It Works</a>
            <a href="#search-intelligence" onClick={() => setMobileMenuOpen(false)} className="block py-2">Smart Search</a>
            <a href="#whatsapp-automation" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-emerald-400 font-bold">Upcoming: WhatsApp Automation</a>
            <a href="#manifesto" onClick={() => setMobileMenuOpen(false)} className="block py-2">Solo Dev Guarantee & Roadmap</a>
            <a href="#why-startups" onClick={() => setMobileMenuOpen(false)} className="block py-2">Why Startups Need This</a>
            <a href="#what-we-deliver" onClick={() => setMobileMenuOpen(false)} className="block py-2">What We Deliver</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2">Hire LeadHarvest</a>
            <button
              onClick={() => { setMobileMenuOpen(false); setDonationModalOpen(true); }}
              className="w-full text-left py-2 text-amber-300 flex items-center gap-1.5"
            >
              <Heart size={13} className="text-rose-400" />
              <span>Support Solo Developer (Donate UPI)</span>
            </button>
            <div className="pt-2">
              <a
                href={COMMUNITY_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30"
              >
                <span>WhatsApp LeadHarvest: +91 9876543210</span>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-violet-600/20 via-cyan-500/10 to-indigo-600/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          
          {/* Mission Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-purple-500/20 border border-violet-500/30 text-xs font-bold text-violet-300 mb-6 shadow-inner">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>100% Free Forever • Zero Ads • Single-Handedly Engineered by LeadHarvest</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
            The World's Fastest <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
              Lead Intelligence Engine
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Engineered by a dedicated solo developer to deliver <strong>verified business owners, direct 1-click WhatsApp links</strong>, 
            customer ratings, and exact coordinates across <strong>780+ Indian districts & mandals</strong> completely free.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/app/overview')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-violet-600/30 flex items-center gap-2.5 transition-all transform hover:-translate-y-1 cursor-pointer"
            >
              <Zap size={18} />
              <span>Launch Free Cockpit (Instant Access)</span>
              <ArrowRight size={18} />
            </button>

            <a
              href="#whatsapp-automation"
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 font-bold text-sm border border-emerald-500/40 flex items-center gap-2 transition-all shadow-md"
            >
              <Send size={16} className="text-emerald-400" />
              <span>Upcoming WhatsApp Automation</span>
            </a>

            <button
              onClick={() => setDonationModalOpen(true)}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-amber-500/10 hover:from-rose-500/20 hover:to-amber-500/20 text-amber-200 font-bold text-sm border border-amber-500/30 flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Heart size={16} className="text-rose-400 fill-rose-400/40" />
              <span>Support Solo Dev (UPI)</span>
            </button>
          </div>

          {/* ── HERO INTERACTIVE LIVE RADAR SCRAPER SIMULATOR ── */}
          <div className="mt-14 max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl text-left">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Live Radar Scraper Simulator</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                      TEST-DRIVE IN 1 CLICK
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time multi-threaded extraction • 1-Click direct WhatsApp launch • Zero Ads
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  Status: <strong className={simStatus === 'running' ? 'text-cyan-400 animate-pulse' : simStatus === 'aborted' ? 'text-rose-400' : 'text-emerald-400'}>
                    {simStatus === 'running' ? '⚡ SCANNING...' : simStatus === 'aborted' ? '🛑 ABORTED' : simStatus === 'completed' ? '✅ COMPLETED' : 'READY'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Google-Grade Search Input Bar with ABORT Button Near Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="flex-1 w-full relative flex items-center bg-slate-950/80 border border-slate-800 focus-within:border-violet-500/60 rounded-2xl p-2 shadow-inner transition-all">
                <Search size={18} className="text-violet-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={demoQuery}
                  onChange={(e) => setDemoQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartSim(demoQuery);
                  }}
                  placeholder="Try: Cafes in Bangalore, Cars in Macherla, Jewelers in Vijayawada..."
                  className="w-full bg-transparent text-white placeholder-slate-500 text-sm font-semibold px-3 py-1 outline-none border-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => handleStartSim(demoQuery)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-violet-600/30 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Zap size={14} className="text-yellow-300" />
                  <span>Search</span>
                </button>
              </div>

              {/* Glowing Crimson ABORT Button Near Search Bar */}
              <button
                type="button"
                onClick={handleAbortSim}
                className={`h-[48px] px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border ${
                  simStatus === 'running'
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/40 border-rose-400/50 animate-pulse'
                    : 'bg-slate-950/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/40'
                }`}
                title="Immediately abort active scraping process"
              >
                <Square size={13} className={simStatus === 'running' ? "fill-white" : "fill-current text-rose-500"} />
                <span>ABORT</span>
              </button>
            </div>

            {/* Quick Demo Search Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
              {[
                { label: '☕ Cafes in Bangalore', q: 'Cafes in Bangalore' },
                { label: '🚗 Cars in Macherla', q: 'Cars in Macherla' },
                { label: '💎 Jewelers in Vijayawada', q: 'Jewelers in Vijayawada' }
              ].map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleStartSim(preset.q)}
                  className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-violet-600/20 text-slate-300 hover:text-white border border-white/[0.08] hover:border-violet-500/40 font-mono text-[11px] transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Live Scraper Output Window */}
            <div className="mt-5 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/5 text-xs text-slate-400 gap-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-bold">{simResults.length} Stores Extracted</span>
                  <span>•</span>
                  <span>Velocity: <strong>4.8 stores/sec</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-violet-400 font-bold">Folder: sess_{demoQuery.toLowerCase().replace(/[^a-z0-9]/g, '_')}</span>
                </div>
              </div>

              {/* Stores Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AnimatePresence>
                  {simResults.map((store, sIdx) => (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 flex flex-col justify-between transition-all shadow-md group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {store.name}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold shrink-0">
                            {store.rating} ★
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mb-1.5">{store.locality}</p>
                        <p className="text-[11px] font-mono font-black text-emerald-400 tracking-wide mb-2 flex items-center gap-1">
                          <Phone size={10} />
                          <span>{store.phone}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                        <a
                          href={`https://wa.me/91${store.phone.replace(/\D/g, '').slice(-10)}?text=Hi%20${encodeURIComponent(store.name)}%2C%20connecting%20via%20Scraper.co.in`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center justify-center gap-1 transition-all"
                        >
                          <Send size={10} className="text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                        <span className="text-[9px] font-mono text-slate-500 px-1.5 py-1 bg-slate-800/40 rounded">
                          {store.coords}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {simResults.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  <span>⚡ Initializing autonomous search swarm...</span>
                </div>
              )}

              {/* Bottom Simulator Bar */}
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-cyan-400" />
                  <span>100% Verified records with complete store folders</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/overview')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Folder size={13} />
                  <span>Launch Live Cockpit with {demoQuery}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Credibility Stats */}
          <div className="mt-16 pt-10 border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">780+</p>
              <p className="text-xs text-slate-400 mt-1">Districts & Mandals</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">100% Free</p>
              <p className="text-xs text-slate-400 mt-1">Zero Paywalls & No Ads</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-2xl sm:text-3xl font-black text-violet-400 font-mono">1-Click</p>
              <p className="text-xs text-slate-400 mt-1">Direct WhatsApp Launch</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">Solo Dev</p>
              <p className="text-xs text-slate-400 mt-1">Rapid Weekly Upgrades</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 1: HOW IT WORKS (IN SIMPLE PLAIN ENGLISH, ZERO TECH JARGON) ── */}
      <section id="how-it-works" className="py-20 px-6 border-t border-white/[0.08] bg-[#09091a]/80">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 mb-3">
              <Compass size={13} />
              <span>Simplicity First • Zero Technical Knowledge Required</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              How Scraper.co.in Works (In 4 Simple Steps)
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              You don't need any technical skills, complex software, or setup. 
              Here is how any business owner, student, or founder can get hundreds of clients in 2 minutes:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-cyan-500/20 relative group hover:border-cyan-500/40 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 font-mono font-black text-lg flex items-center justify-center mb-5">
                01
              </div>
              <h3 className="text-base font-bold text-white mb-2">Type What You Need & Where</h3>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                Simply type what business you want in plain words. For example: 
                <span className="block mt-2 font-mono text-[11px] text-cyan-300 bg-cyan-950/40 p-2 rounded-xl border border-cyan-800/40">
                  "Photographers in Warangal"
                </span>
                or "Catering services in Vijayawada". No dropdowns needed.
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                <CheckCheck size={14} />
                <span>Understands everyday language</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-violet-500/20 relative group hover:border-violet-500/40 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-300 font-mono font-black text-lg flex items-center justify-center mb-5">
                02
              </div>
              <h3 className="text-base font-bold text-white mb-2">Digital Scout Sweeps the Map</h3>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                Like an automated digital scout driving down every road and town square, 
                our system instantly sweeps authentic public registries and map coordinates within your chosen town or mandal.
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-violet-400 font-semibold flex items-center gap-1">
                <CheckCheck size={14} />
                <span>Radar pins exact locations</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-emerald-500/20 relative group hover:border-emerald-500/40 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 font-mono font-black text-lg flex items-center justify-center mb-5">
                03
              </div>
              <h3 className="text-base font-bold text-white mb-2">Gathers Verified Mobile & WhatsApp</h3>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                It filters out disconnected numbers and extracts active mobile numbers, direct WhatsApp links, 
                shop addresses, customer star ratings, and opening hours automatically.
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCheck size={14} />
                <span>Verified phone numbers</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-7 rounded-3xl bg-slate-900/60 border border-amber-500/20 relative group hover:border-amber-500/40 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 font-mono font-black text-lg flex items-center justify-center mb-5">
                04
              </div>
              <h3 className="text-base font-bold text-white mb-2">1-Click WhatsApp or Excel Export</h3>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                Tap the green WhatsApp button to launch a pre-written business proposal directly to the owner's phone, 
                or click "Export Excel / CSV" to download the whole dataset instantly.
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.05] text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <CheckCheck size={14} />
                <span>Instant outreach • Zero barriers</span>
              </div>
            </div>

          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/app/overview')}
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2 cursor-pointer hover:opacity-95 transition-all"
            >
              <span>Try A Search Now in Live Cockpit</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* ── SECTION 2: THE INTELLIGENT SEARCH BAR DEEP DIVE ── */}
      <section id="search-intelligence" className="py-20 px-6 border-t border-white/[0.08] relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/20 mb-3">
              <BrainCircuit size={13} />
              <span>AI Natural Language Engine • Engineered by LeadHarvest</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              The Intelligent Natural Language Search Bar
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              LeadHarvest didn't just build a basic text input. He engineered an autonomous multi-stage parser 
              that converts your natural thoughts into geocoded queries without requiring complex filters.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            {/* Left: Explanatory Features */}
            <div className="space-y-6">
              
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-violet-500/20 hover:border-violet-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Natural Language Intent Separation</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Type <em>"wedding cards in chebrolu"</em> or <em>"photographers in amaravathi andhra pradesh"</em>. The engine automatically separates the business category from the geographic locality in real-time, matching against an authoritative pan-India gazetteer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Levenshtein Typo Auto-Correction</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Mistyped a city or trade (e.g. <em>"fotographer"</em>, <em>"vijaywada"</em>)? The built-in algorithmic distance matrix calculates typo probability and autocorrects instantly so your searches never fail.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Post-2022 780+ Mandal Containment</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Traditional systems bleed searches into neighboring cities. LeadHarvest mapped authentic Indian revenue mandals and post-2022 re-organized districts so leads stay strictly within your target territory.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Persistent Device History & Keyboard Navigation</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Never lose your previous searches. Instant keyboard cycling (Arrow keys, Enter, Escape) and one-tap re-launching from persistent local storage.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Interactive Visual Mock of Search Bar in Action */}
            <div className="p-8 rounded-3xl bg-slate-900/80 border-2 border-violet-500/30 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-xs font-mono text-slate-400 ml-2">LeadHarvest Intelligent Engine v4.2</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/40">
                  REAL-TIME DISAMBIGUATION
                </span>
              </div>

              {/* Mock Input Bar */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-inner flex items-center gap-3">
                <Search size={18} className="text-cyan-400 shrink-0" />
                <span className="text-sm font-mono text-white font-bold">
                  photographers in amaravathi andhra pradesh
                </span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  ENTER ↵
                </span>
              </div>

              {/* Parsing Output Visualizer */}
              <div className="mt-5 space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Extracted Category:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">"Wedding & Event Photographers"</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Extracted Mandal:</span>
                  <span className="text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">"Amaravathi (Guntur / Capital Region)"</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Geographic Bounding Box:</span>
                  <span className="text-violet-300 font-bold">16.5735° N, 80.3575° E</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-slate-400">Execution Speed:</span>
                  <span className="text-amber-300 font-bold">~12 milliseconds</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-slate-400">
                  Zero setup. No registration. Just open the cockpit and search.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 3: UPCOMING BREAKTHROUGH: LOCAL WHATSAPP AUTOMATION ── */}
      <section id="whatsapp-automation" className="py-20 px-6 border-t border-white/[0.08] bg-gradient-to-b from-[#080d19] via-[#091522] to-[#080d19] relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[300px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3 shadow-sm">
              <Bot size={14} className="text-emerald-400 animate-pulse" />
              <span>Upcoming Superpower • Shipping in Weeks by LeadHarvest</span>
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Full Access to Local WhatsApp Automation
            </h2>
            
            <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed">
              Why send pitches one by one? LeadHarvest is giving Indian startups full, unrestricted access to 
              <strong> Local WhatsApp Outreach Automation</strong>. Send your startup proposal, offers, and catalogs 
              directly to hundreds of verified business owners right from your local browser!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Superpower 1 */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-emerald-500/30 relative overflow-hidden group hover:border-emerald-500/50 transition-all flex flex-col shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Send size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Automated Startup Outreach</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed flex-1">
                Simply compose your startup's pitch, select 50 or 500 scraped local business owners, and press <strong>"Launch Outreach"</strong>. 
                Our local engine sends personalized messages directly through your connected WhatsApp Web tab.
              </p>
              <div className="mt-5 pt-4 border-t border-white/[0.06] text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCheck size={14} />
                <span>Zero manual typing • Instant responses</span>
              </div>
            </div>

            {/* Superpower 2 */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-cyan-500/30 relative overflow-hidden group hover:border-cyan-500/50 transition-all flex flex-col shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dynamic Tags & Personalization</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed flex-1">
                Insert dynamic variables like <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded text-[11px] font-mono">&#123;BusinessName&#125;</code>, 
                <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded text-[11px] font-mono">&#123;City&#125;</code>, and 
                <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded text-[11px] font-mono">&#123;Category&#125;</code> so every message sounds personally handcrafted.
              </p>
              <div className="mt-5 pt-4 border-t border-white/[0.06] text-xs font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <CheckCheck size={14} />
                <span>98% read rate • High response engagement</span>
              </div>
            </div>

            {/* Superpower 3 */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-amber-500/30 relative overflow-hidden group hover:border-amber-500/50 transition-all flex flex-col shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Humanized Anti-Ban Protection</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed flex-1">
                Built-in randomized delays (15 to 45 seconds between messages) and human-like typing cadences prevent spam detection and keep your personal WhatsApp account completely safe.
              </p>
              <div className="mt-5 pt-4 border-t border-white/[0.06] text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <CheckCheck size={14} />
                <span>Safe • Local-only • No cloud bans</span>
              </div>
            </div>

          </div>

          {/* Deep Explanation Box: Why this is a game changer for startups */}
          <div className="mt-10 p-8 rounded-3xl bg-slate-950/80 border-2 border-emerald-500/30 shadow-2xl">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Rocket size={20} className="text-emerald-400" />
              <span>Why This is a Game-Changer for Indian Startups & MSMEs</span>
            </h3>
            
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div>
                <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Direct Access to Decision-Makers</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Cold emails rarely get opened, and traditional advertising often gets ignored. Sending a personalized message directly to a business owner's WhatsApp inbox ensures it is seen and read within minutes.
                </p>
              </div>

              <div>
                <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>No Middlemen or Third-Party Fees</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Run high-conversion direct outreach without relying on third-party aggregators or complicated enterprise platforms. It operates locally from your own browser with zero added fees.
                </p>
              </div>

              <div>
                <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Saves 20+ Hours of Manual Outreach Every Week</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Copy-pasting hundreds of outreach messages manually burns valuable founder hours. Let the autonomous engine send them in the background while you focus on handling inbound calls and closing deals.
                </p>
              </div>

              <div>
                <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Hyper-Local Pin-Code Targeting</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Whether you are launching a delivery service, wholesale supply, or regional SaaS, you can message the exact verified owners located within your target mandals.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-300">Status: Currently in Final Quality Testing</p>
                <p className="text-[11px] text-slate-400">Releasing to all users within weeks • 100% Free • No extra charge</p>
              </div>

              <a
                href={COMMUNITY_AUTOMATION_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Request Early Access on WhatsApp</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 4: SOLO DEVELOPER MANIFESTO & WEEKLY UPGRADE GUARANTEE ── */}
      <section id="manifesto" className="py-20 px-6 border-t border-white/[0.08] bg-gradient-to-b from-[#090918] via-[#0d091e] to-[#090918]">
        <div className="max-w-5xl mx-auto">
          
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-violet-950/40 via-purple-950/40 to-slate-900 border-2 border-violet-500/40 shadow-2xl relative overflow-hidden">
            
            {/* Top Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-white/10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Award size={14} className="text-amber-400" />
                <span>The Solo Developer Guarantee</span>
              </div>
              <span className="text-xs font-mono text-slate-400">Committed by LeadHarvest • Founder & Solo Dev</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
              "I Will Add Advance Features Within Weeks. <br className="hidden sm:inline" />
              All Free Updates. Zero Ads. Nothing Hidden."
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Because I build Scraper.co.in as an <strong>autonomous solo developer and AI prompt engineer</strong>, 
              there is zero bureaucracy. When you need an advance feature or custom mandal data, I engineer and ship it in days.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-emerald-400 mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Weekly Feature Drops</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  I continuously roll out new scrapers, higher concurrency clusters, and mandal gazetteers every single week.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-cyan-400 mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">100% Free Forever</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every future feature, algorithm update, and export option will remain 100% free for everyone.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-rose-400 mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Zero Ads & Zero Tracking</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No popup banners, no third-party advertisements, no sale of user contacts, and no hidden marketing trackers.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-amber-400 mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Solo Agility</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct personal communication. WhatsApp me with a feature request and I'll build it.
                </p>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] text-slate-400">Next Upcoming Advance Features:</p>
                <p className="text-xs font-mono font-bold text-cyan-300">
                  ⚡ 1. Local WhatsApp Automation Engine • 2. Deep Social Handle Enrichment • 3. Multi-Mandal Sonar Sweeps
                </p>
              </div>

              <a
                href={COMMUNITY_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <MessageSquare size={13} />
                <span>Request A Feature Directly</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 5: WHY STARTUPS NEED THIS ── */}
      <section id="why-startups" className="py-20 px-6 border-t border-white/[0.08] bg-[#0a0a18]/70">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-3">
              <Rocket size={13} />
              <span>Built for the Indian Startup Ecosystem</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Why Every Indian Startup Needs Scraper.co.in
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              We provide founders an unfair, direct advantage to connect with real decision-makers anywhere in India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-7 rounded-3xl bg-white/[0.02] border border-violet-500/20 relative overflow-hidden group hover:border-violet-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Flame size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero Customer Acquisition Cost (CAC)</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Bootstrapped founders don't need expensive subscription tiers. 
                Scraper.co.in extracts hundreds of targeted leads with verified phones in seconds.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-3xl bg-white/[0.02] border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">98% Read Rate via Direct WhatsApp</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Cold emails in India have less than a 2% open rate, but WhatsApp has a <strong>98% read rate</strong>. 
                Our 1-click launcher opens WhatsApp with a pre-filled personalized pitch directly to the owner's personal device.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-3xl bg-white/[0.02] border border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MapPin size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Penetrate Tier 2, 3 & Rural India</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Traditional directories only know metropolitan cities. We map 780+ districts down to specific mandals 
                and taluks, unlocking massive regional supply chains and untapped consumer bases.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 6: WHAT WE DELIVER (THE GOLD STANDARD) ── */}
      <section id="what-we-deliver" className="py-20 px-6 border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              What We Deliver — The Gold Standard
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Clear, transparent comparison of what Scraper.co.in delivers versus traditional methods.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Traditional Directories & Static Databases */}
            <div className="p-7 rounded-3xl bg-white/[0.02] border border-rose-500/20 relative">
              <div className="inline-block px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold mb-4">
                Traditional Directories & Static Databases
              </div>
              <h3 className="text-lg font-bold text-white mb-4">Outdated & Shared Models</h3>
              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <X size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Locked Paywalls & Cluttered Ads:</strong> Require complex subscriptions just to view numbers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Shared Recycled Leads:</strong> Resells the exact same lead to dozens of competitors at once.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>No WhatsApp Launchers:</strong> Forces you to manually copy and dial every single number by hand.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Inaccurate Boundary Bleed:</strong> Searches bleed into neighboring towns and irrelevant regions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span><strong>Stale Defunct Contacts:</strong> High percentage of disconnected numbers and outdated locations.</span>
                </li>
              </ul>
            </div>

            {/* What Scraper.co.in Delivers */}
            <div className="p-7 rounded-3xl bg-gradient-to-b from-violet-950/40 via-purple-950/30 to-slate-900 border-2 border-emerald-500/50 relative shadow-2xl">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-4">
                ★ What Scraper.co.in Delivers
              </div>
              <h3 className="text-lg font-black text-white mb-4">Live Autonomous Lead Intelligence</h3>
              <ul className="space-y-3.5 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>100% Free Forever with Zero Ads:</strong> Zero paywalls, zero tokens, zero ads, zero credit cards.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Exclusive Fresh Raw Data:</strong> Live-scraped directly from public registries with zero middlemen.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1-Click WhatsApp Direct Launcher:</strong> Instant pre-filled proposals sent straight to owners.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Active-Point Geospatial Radar:</strong> Real-time sonar scanning coordinates with mandal containment.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Upcoming Local WhatsApp Automation:</strong> Single-click personalized outreach to hundreds of leads.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 7: COMMUNITY DONATION SUPPORT ── */}
      <section id="donate" className="py-20 px-6 border-t border-white/[0.08] bg-[#0c0919]/80">
        <div className="max-w-4xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-bold border border-rose-500/20 mb-3">
            <Heart size={14} className="text-rose-400 fill-rose-400/40" />
            <span>Community Supported • Keep It Free & Ad-Free</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Support LeadHarvest's Mission for India
          </h2>
          <p className="text-slate-300 text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
            LeadHarvest maintains and hosts Scraper.co.in completely solo, paying for server infrastructure and browser crawler clusters out of his own pocket. 
            If this free platform has helped your startup generate leads and clients, 
            consider sending a small contribution to keep our servers running!
          </p>

          {/* Donation Box Card */}
          <div className="mt-10 p-8 rounded-3xl bg-gradient-to-r from-violet-950/50 via-slate-900 to-indigo-950/50 border-2 border-amber-500/30 shadow-2xl text-left max-w-2xl mx-auto">
            
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* QR Code / Visual Icon Box */}
              <div className="w-32 h-32 rounded-2xl bg-white p-2.5 flex flex-col items-center justify-center shrink-0 shadow-lg border border-slate-700">
                <div className="w-full h-full bg-slate-950 rounded-xl flex flex-col items-center justify-center text-center p-2">
                  <QrCode size={36} className="text-cyan-400" />
                  <span className="text-[9px] font-black font-mono text-amber-300 mt-1 uppercase">Scan & Pay</span>
                  <span className="text-[8px] text-slate-400 font-mono">Any UPI App</span>
                </div>
              </div>

              {/* UPI & Phone Details */}
              <div className="flex-1 w-full space-y-3">
                
                {/* UPI ID */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">UPI ID (Paytm / GPay / PhonePe)</p>
                    <p className="text-sm font-black font-mono text-cyan-300">{COMMUNITY_UPI}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(COMMUNITY_UPI, 'upi')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedUpi ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                </div>

                {/* Direct Mobile Number */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">Direct Phone Number</p>
                    <p className="text-sm font-black font-mono text-emerald-400">+91 {COMMUNITY_PHONE}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(COMMUNITY_PHONE, 'phone')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedPhone ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedPhone ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

              </div>

            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Accepted: Google Pay • PhonePe • Paytm • BHIM • CRED</span>
              </span>
              <a
                href={`upi://pay?pa=${COMMUNITY_UPI}&pn=LeadHarvest&cu=INR`}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-all inline-flex items-center gap-1"
              >
                <span>Pay via UPI App</span>
                <ExternalLink size={12} />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 8: LEADHARVEST ENTERPRISE — ENGINEERING SHOWCASE & PORTFOLIO ── */}
      <section id="hire-leadharvest" className="py-20 px-6 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-violet-950/40 via-purple-950/30 to-indigo-950/40 border-2 border-violet-500/30 shadow-2xl">
          
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            
            {/* Avatar & Badges */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-5xl shadow-2xl border-2 border-white/20">
                M
              </div>
              <span className="mt-3 inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                AVAILABLE FOR HIRE
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">Full-Time / Consulting</p>
            </div>

            {/* Profile Content */}
            <div className="flex-1 text-center lg:text-left">
              
              <div className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30 mb-2">
                Engineer Spotlight
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Hire LeadHarvest — Senior Full-Stack, AI Prompt Engineer & Automation Architect
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                Need an exceptional engineer who delivers entire enterprise-grade products solo in days rather than months? 
                LeadHarvest engineered <strong>Scraper.co.in</strong> from scratch — from real-time high-concurrency browser clusters (Playwright, Node.js), 
                natural language search parsers, interactive Leaflet radars, and session stores to production Cloud Run & Firebase architectures.
              </p>

              {/* Specialization Tags */}
              <div className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
                {[
                  "AI Prompt Engineering & Autonomous Agents",
                  "Professional Code & Solution Generation",
                  "High-Concurrency Web Crawling (Playwright/Puppeteer)",
                  "React 18 & High-Performance Frontends",
                  "Node.js Distributed Backend Systems",
                  "Cloud Run, Docker & Firebase Multi-Site",
                  "Geospatial Mapping & Spatial Indexing"
                ].map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-cyan-300">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Direct Hire / Contact CTAs */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Direct Founder Contact</p>
                  <p className="text-base font-black text-emerald-400 font-mono">+91 9876543210</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="tel:+919876543210"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PhoneCall size={14} />
                    <span>Call LeadHarvest</span>
                  </a>
                  <a
                    href={COMMUNITY_HIRE_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>Hire LeadHarvest via WhatsApp</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 9: FAQ ── */}
      <section id="faq" className="py-20 px-6 border-t border-white/[0.08] bg-[#0a0a18]/70">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Everything you need to know about Scraper.co.in.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white hover:text-violet-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-violet-400' : 'text-slate-500'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── FINAL CTA BANNER ── */}
      <section className="py-20 px-6 border-t border-white/[0.08] text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to Supercharge Your Outbound Sales?
          </h2>
          <p className="text-slate-400 text-sm mt-3 mb-8">
            Access the complete Pan-India scraper cockpit right now. 100% Free, Zero Ads, No login required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/app/overview')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-violet-600/30 inline-flex items-center gap-2.5 transition-all transform hover:-translate-y-1 cursor-pointer"
            >
              <Zap size={18} />
              <span>Open Live Scraper Cockpit Now</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => setDonationModalOpen(true)}
              className="px-6 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 font-bold text-sm border border-amber-500/30 inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Heart size={16} className="text-rose-400" />
              <span>Support LeadHarvest (Donate)</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.08] py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Scraper.co.in • 100% Free & Open Source for India • Engineered Solo by LeadHarvest (+91 9876543210)</p>
          <div className="flex items-center gap-4 text-slate-400 font-semibold">
            <a href="#how-it-works" className="hover:text-white">How It Works</a>
            <a href="#search-intelligence" className="hover:text-white">Smart Search</a>
            <a href="#whatsapp-automation" className="hover:text-white">WhatsApp Automation</a>
            <a href="#manifesto" className="hover:text-white">Solo Dev Guarantee</a>
            <a href="#what-we-deliver" className="hover:text-white">What We Deliver</a>
            <a href="#features" className="hover:text-white">Hire LeadHarvest</a>
            <a href={COMMUNITY_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">WhatsApp LeadHarvest</a>
          </div>
        </div>
      </footer>

      {/* ── INTERACTIVE DONATION MODAL ── */}
      <AnimatePresence>
        {donationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#0c0d1e] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setDonationModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/30 w-fit mb-4">
                <Heart size={14} className="text-rose-400 fill-rose-400/40" />
                <span>Support Solo Developer LeadHarvest</span>
              </div>

              <h3 className="text-2xl font-black text-white">Fuel The Free Mission</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                LeadHarvest pays for server nodes, scrapers, and gazetteer updates out of pocket to keep Scraper.co.in completely free with zero ads. 
                Any contribution helps keep this tool live for all Indian entrepreneurs!
              </p>

              <div className="mt-6 space-y-3">
                {/* UPI Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono uppercase font-bold">UPI ID (All Apps)</p>
                    <p className="text-base font-black font-mono text-cyan-300">{COMMUNITY_UPI}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(COMMUNITY_UPI, 'upi')}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedUpi ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                </div>

                {/* Phone Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono uppercase font-bold">PhonePe / GPay / Paytm</p>
                    <p className="text-base font-black font-mono text-emerald-400">+91 {COMMUNITY_PHONE}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(COMMUNITY_PHONE, 'phone')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedPhone ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedPhone ? 'Copied!' : 'Copy Phone'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <a
                  href={`upi://pay?pa=${COMMUNITY_UPI}&pn=LeadHarvest&cu=INR`}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs text-center shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Open UPI App to Pay</span>
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => setDonationModalOpen(false)}
                  className="py-3 px-5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
