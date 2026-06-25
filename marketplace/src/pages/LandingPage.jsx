import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, ArrowRight, Database, ShieldCheck, Zap, PhoneCall, FileDown } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');

  const CATEGORIES = [
    "Bike Mechanics", "Car Service Centers", "Electricians", "Plumbers", "Carpenters", 
    "Pest Control", "Home Cleaners", "Packers and Movers", "Painters", "Appliance Repair",
    "Photographers", "Caterers", "Kalyana Mandapam", "Event Decorators", "Makeup Artists",
    "Chartered Accountants", "Lawyers", "Web Developers", "Graphic Designers", "SEO Agencies"
  ];

  const LOCATIONS = [
    "Guntur, Andhra Pradesh", "Vijayawada, Andhra Pradesh", "Hyderabad, Telangana", 
    "Visakhapatnam, Andhra Pradesh", "Rajahmundry, Andhra Pradesh", "Kurnool, Andhra Pradesh",
    "Chennai, Tamil Nadu", "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi, NCR"
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (category && location) {
      // Pass the parameters via query string so the dashboard can auto-start
      navigate(`/app/scraper?category=${encodeURIComponent(category)}&location=${encodeURIComponent(location)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* ── BACKGROUND SVGS ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden -z-10 opacity-60">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <path fill="#f3f4f6" d="M0,0 C30,40 70,40 100,0 L100,100 L0,100 Z"></path>
          <path fill="#eef2ff" d="M0,100 C20,60 80,60 100,100 Z"></path>
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-indigo-100/40 to-violet-100/40 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/4"></div>

      {/* ── HEADER ── */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Search size={20} className="text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight text-gray-900">Gomandap</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-600">
          <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
          <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
          <button className="bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-colors shadow-md">
            Sign In
          </button>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-block mb-4 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-black tracking-wider uppercase">
            The World's Smartest B2B Lead Engine
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
            Find <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">Verified Leads</span> in Seconds.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-lg md:text-xl text-gray-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop manually searching for clients. Our AI instantly extracts direct mobile numbers, emails, and social profiles for any business in any city. 
          </motion.p>

          {/* SEARCH COMPONENT */}
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} onSubmit={handleSearch} className="bg-white p-3 md:p-4 rounded-3xl shadow-2xl shadow-indigo-900/5 border border-gray-100 flex flex-col md:flex-row gap-3 max-w-3xl mx-auto relative z-20">
            
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={20} className="text-indigo-400" />
              </div>
              <input 
                type="text" 
                list="categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="What? (e.g., Photographers)" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-indigo-200 rounded-2xl text-gray-900 font-bold placeholder-gray-400 outline-none transition-all"
                required
              />
              <datalist id="categories">
                {CATEGORIES.map((cat, idx) => <option key={idx} value={cat} />)}
              </datalist>
            </div>

            <div className="hidden md:block w-px bg-gray-100 my-2"></div>

            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <MapPin size={20} className="text-indigo-400" />
              </div>
              <input 
                type="text" 
                list="locations"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where? (e.g., Guntur, AP)" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-indigo-200 rounded-2xl text-gray-900 font-bold placeholder-gray-400 outline-none transition-all"
                required
              />
              <datalist id="locations">
                {LOCATIONS.map((loc, idx) => <option key={idx} value={loc} />)}
              </datalist>
            </div>

            <button type="submit" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group shrink-0">
              Get Leads <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.form>
          <p className="text-xs font-bold text-gray-400 mt-6 uppercase tracking-widest">⚡ Get 20 Free Leads on Signup</p>
        </div>
      </main>

      {/* ── HOW IT WORKS (ANIMATED VECTOR EXPLANATION) ── */}
      <section id="how-it-works" className="py-24 bg-white border-y border-gray-100 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">How does it work?</h2>
            <p className="text-gray-500 font-medium mt-4 max-w-xl mx-auto">We use advanced AI to do the boring, manual work for you. Just tell us what you're looking for, and we deliver the data.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-24 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-transparent via-indigo-200 to-transparent"></div>

            {/* Step 1 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative text-center p-8">
              <div className="w-20 h-20 mx-auto bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative z-10">
                <Search size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">1. You Search</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">Enter any business category and location. Our system accepts completely natural language queries.</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="relative text-center p-8">
              <div className="w-20 h-20 mx-auto bg-violet-50 border border-violet-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative z-10">
                <Zap size={32} className="text-violet-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">2. AI Extracts Data</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">Our AI scans the internet in real-time, grabbing hidden phone numbers, emails, and social profiles.</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="relative text-center p-8">
              <div className="w-20 h-20 mx-auto bg-green-50 border border-green-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative z-10">
                <PhoneCall size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">3. Start Calling</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">You get a clean, exportable list of direct contact numbers. No more gatekeepers, just direct leads.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 bg-[#fafbfc] relative overflow-hidden">
        
        {/* Subtle SVG Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-6">Built for growth. <br/><span className="text-indigo-600">Designed for speed.</span></h2>
              <p className="text-gray-500 font-medium mb-10 text-lg leading-relaxed">
                Whether you are a freelancer looking for your next gig or an agency scaling outreach, our lead generation marketplace gives you the tools to succeed instantly.
              </p>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0"><Database size={24} className="text-indigo-600" /></div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Direct Mobile Numbers</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">We bypass generic customer service lines and use deep web extraction to find direct mobile numbers for decision makers.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0"><ShieldCheck size={24} className="text-indigo-600" /></div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">AI Verified Accuracy</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Our AI understands regional contexts (like "Mandapam" vs "Banquet") to ensure you only get completely relevant leads.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0"><FileDown size={24} className="text-indigo-600" /></div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Export to CSV</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">Instantly export your unlocked leads directly into a CSV file, ready to import into your favorite CRM or dialer software.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vector Illustration / Graphic Box */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-[3rem] transform rotate-3 scale-105 opacity-20 blur-xl"></div>
              <div className="bg-gray-900 rounded-[2rem] p-8 shadow-2xl relative border border-gray-800 overflow-hidden group">
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                
                <div className="space-y-4 font-mono text-sm">
                  <div className="text-indigo-400">~/gomandap/ai-engine</div>
                  <div className="text-gray-300"><span className="text-green-400">➜</span> Initiating deep web scan for "Bike Mechanics in Guntur"...</div>
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-gray-400">[Target] Found "Ramesh Bike Mechanic"</motion.div>
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1.0 }} className="text-gray-400">[Extract] Bypassing tooltips...</motion.div>
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-green-400 font-bold">✓ Success: Retrieved direct mobile +91 98765 43210</motion.div>
                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-indigo-300">Added to your lead dashboard.</motion.div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
              <Search size={14} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900">Gomandap</span>
          </div>
          <p className="text-gray-400 font-medium text-sm">© {new Date().getFullYear()} Gomandap Lead Intelligence. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
