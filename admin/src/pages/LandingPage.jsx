import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Shield, Target, Download, Users, Globe, MapPin,
  CheckCircle2, ArrowRight, Star, BarChart2, Clock, Layers,
  ChevronDown, Menu, X, Phone, Mail, Camera, TrendingUp,
  Database, Filter, RefreshCw, Award, BrainCircuit, Workflow,
  Check, PlayCircle, Settings
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const featuresList = [
    { icon: <MapPin size={18}/>, title: 'Google Maps Extractor', desc: 'Pull verified local businesses' },
    { icon: <Camera size={18}/>, title: 'Social Discovery', desc: 'Find Instagram & social profiles' },
    { icon: <Mail size={18}/>, title: 'Contact Recovery', desc: 'Reveal hidden emails & phones' },
    { icon: <RefreshCw size={18}/>, title: 'Automated Refresh', desc: 'Keep your database up-to-date' },
  ];

  const solutionsList = [
    { title: 'For Sales Teams', desc: 'Automate outbound prospecting' },
    { title: 'For Marketing Agencies', desc: 'Build highly targeted local lists' },
    { title: 'For Recruiters', desc: 'Discover passive candidates' },
    { title: 'For Enterprises', desc: 'Custom CRM data enrichment' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden selection:bg-violet-200 selection:text-violet-900">
      
      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
              <Search size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">OmniLead<span className="text-violet-600">.</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* Products Dropdown */}
            <div 
              className="relative px-4 py-2"
              onMouseEnter={() => setActiveDropdown('products')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Products <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'products' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 grid grid-cols-2 gap-6"
                  >
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Core Platform</p>
                      <div className="space-y-4">
                        {featuresList.map((f, i) => (
                          <div key={i} className="flex items-start gap-3 group cursor-pointer">
                            <div className="p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">{f.icon}</div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-violet-600 transition-colors">{f.title}</p>
                              <p className="text-xs text-gray-500">{f.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">New Features</p>
                      <div onClick={() => navigate('/products/phone-scraper')} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 cursor-pointer hover:border-violet-200 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone size={16} className="text-violet-600" />
                          <p className="text-sm font-bold text-gray-900">Phone Extractor API</p>
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black uppercase rounded-full">Pro</span>
                        </div>
                        <p className="text-xs text-gray-500">Extract mobile numbers from raw website data using regex engines.</p>
                      </div>
                      <a href="#" className="text-sm font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">View all features <ArrowRight size={14}/></a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Solutions Dropdown */}
            <div 
              className="relative px-4 py-2"
              onMouseEnter={() => setActiveDropdown('solutions')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Solutions <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'solutions' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3"
                  >
                    {solutionsList.map((s, i) => (
                      <div key={i} className="p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                        <p className="text-sm font-bold text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => navigate('/pricing')} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Pricing</button>
            <a href="#how-it-works" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
          </nav>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-bold text-gray-700 hover:text-violet-600 transition-colors">Sign In</button>
            <button onClick={() => navigate('/login')} className="group flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg">
              Start Free Trial <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-lg font-bold text-gray-900" onClick={() => setMobileOpen(false)}>Features</a>
                <a href="#how-it-works" className="text-lg font-bold text-gray-900" onClick={() => setMobileOpen(false)}>How It Works</a>
                <button onClick={() => { navigate('/pricing'); setMobileOpen(false); }} className="text-left text-lg font-bold text-gray-900">Pricing</button>
                <div className="h-px bg-gray-100 my-2"></div>
                <button onClick={() => navigate('/login')} className="text-lg font-bold text-gray-600 text-left">Sign In</button>
                <button onClick={() => navigate('/login')} className="w-full py-3.5 text-center text-sm font-bold bg-violet-600 text-white rounded-xl">Get Started Free</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 pt-40 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background grids */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] pointer-events-none opacity-40">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.15), transparent 70%)' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            OmniLead 2.0 is Live
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tight mb-6 leading-[1.1] text-gray-900">
            Automate your lead gen<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
              at an industrial scale.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Stop scraping manually. OmniLead aggregates data from Maps, Social Media, and corporate sites to build verified, enriched pipelines directly into your CRM.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/marketplace')} className="w-full sm:w-auto px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-1 flex items-center justify-center gap-2">
              <Search size={18} /> Browse Marketplace
            </button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 text-gray-700 font-bold text-lg rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <PlayCircle size={20} /> Watch Demo
            </button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 text-sm text-gray-400 font-medium">
            No credit card required. 14-day free trial.
          </motion.p>
        </div>

        {/* Dashboard UI Preview Graphic */}
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-6xl mx-auto mt-24 relative z-20">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-3xl blur-2xl opacity-20"></div>
          <div className="relative rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Mock left sidebar */}
            <div className="hidden md:block w-64 bg-gray-50/80 border-r border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-8 px-2">
                <div className="w-6 h-6 bg-violet-600 rounded-lg"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-8 rounded-lg ${i===1 ? 'bg-violet-100/50 w-full' : 'bg-gray-200/50 w-5/6'}`}></div>
                ))}
              </div>
            </div>
            {/* Mock content */}
            <div className="flex-1 p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="h-6 w-48 bg-gray-800 rounded mb-2"></div>
                  <div className="h-4 w-64 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-violet-600 rounded-xl"></div>
              </div>
              {/* Fake grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-20 border border-gray-100 bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-800 rounded mb-2"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="h-6 w-20 bg-green-100 rounded-full"></div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 hidden md:block">
                  <div className="h-32 bg-gray-50 rounded-xl border border-gray-100"></div>
                  <div className="h-32 bg-violet-50 rounded-xl border border-violet-100"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── LOGOS SECTION ── */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Trusted by scaling revenue teams</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-40 grayscale">
            {/* Placeholder logos using text for now */}
            <span className="text-2xl font-black font-serif">Acme Corp</span>
            <span className="text-2xl font-black">Vercel</span>
            <span className="text-2xl font-black font-mono">STRIPE</span>
            <span className="text-2xl font-black italic">Spotify</span>
            <span className="text-2xl font-black tracking-widest">NVIDIA</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-6">Data Extraction Made Beautiful.</h2>
            <p className="text-xl text-gray-500">We've turned the complex process of web scraping, proxies, and data enrichment into a simple, beautiful UI that anyone can use.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
            {[
              {
                step: '01',
                icon: <Search size={24} />,
                title: 'Define your Target',
                desc: 'Enter a niche and location (e.g., "Photographers in London"). OmniLead automatically provisions proxies and bypasses rate limits.'
              },
              {
                step: '02',
                icon: <Layers size={24} />,
                title: 'Enrich & Verify',
                desc: 'We cross-reference multiple sources to append hidden phone numbers, email addresses, and social media handles to your list.'
              },
              {
                step: '03',
                icon: <Database size={24} />,
                title: 'Push to Pipeline',
                desc: 'Distribute leads seamlessly to your sales team\'s Client Portal or export them directly into your existing CRM workflows.'
              }
            ].map((feature, idx) => (
              <div key={idx} className="relative">
                <span className="text-8xl font-black text-gray-50 absolute -top-10 -left-6 z-0 select-none">{feature.step}</span>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLIT VIEW (CLIENT PORTAL TEASE) ── */}
      <section className="py-20 px-6 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-widest">Built-in CRM</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                Empower your sales team with dedicated Map views.
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                OmniLead isn't just a scraper. It includes a built-in Client Portal where your telecallers and sales agents can log in, view their assigned territory on an interactive map, and call prospects directly from their dashboard.
              </p>
              <ul className="space-y-4">
                {['Interactive OpenStreetMap integration', 'One-click WhatsApp & Phone dialing', 'Real-time status updates (Interested, Callback)', 'No scraping backend visibility for agents'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                    <CheckCircle2 size={20} className="text-violet-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex-1 relative w-full">
              {/* Abstract map UI representation */}
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 overflow-hidden aspect-square md:aspect-video lg:aspect-square transform rotate-2 lg:rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 bg-gray-100 rounded-xl m-2 overflow-hidden flex">
                  {/* List side */}
                  <div className="w-1/2 bg-white border-r border-gray-200 p-4 space-y-3">
                    <div className="h-8 bg-gray-100 rounded-lg w-full mb-6"></div>
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-lg shrink-0"></div>
                        <div className="w-full space-y-2">
                          <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Map side */}
                  <div className="w-1/2 bg-[#e5e7eb] relative">
                    {/* Fake map pins */}
                    <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-violet-600 rounded-full border-2 border-white shadow-md animate-bounce"></div>
                    <div className="absolute top-1/2 left-2/3 w-4 h-4 bg-violet-600 rounded-full border-2 border-white shadow-md"></div>
                    <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-violet-600 rounded-full border-2 border-white shadow-md"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[40px] overflow-hidden relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #7c3aed 0%, transparent 70%)' }}></div>
          <div className="relative z-10 px-6 py-20 md:p-24 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Ready to scale your outreach?</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Join thousands of companies using OmniLead to generate millions of dollars in pipeline value.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-50 font-bold text-lg rounded-2xl transition-all shadow-xl hover:-translate-y-1 w-full sm:w-auto">
                Get Started for Free
              </button>
              <button onClick={() => navigate('/pricing')} className="px-8 py-4 text-white font-bold text-lg rounded-2xl border border-gray-700 hover:bg-gray-800 transition-all w-full sm:w-auto">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <Search size={14} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-xl font-black text-gray-900">OmniLead<span className="text-violet-600">.</span></span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mb-6">
                The most powerful B2B lead generation and extraction platform. Automate your data collection securely and scalably.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-violet-50 hover:text-violet-600 cursor-pointer transition-colors">
                  <Globe size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-violet-50 hover:text-violet-600 cursor-pointer transition-colors">
                  <Mail size={18} />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-violet-600 transition-colors">Google Maps Scraper</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Email Extractor</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Contact Recovery</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">CRM Integrations</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-violet-600 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Blog & Guides</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Customer Success</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Help Center</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-violet-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-violet-600 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} OmniLead Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
