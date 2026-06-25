import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Terminal, Search, Zap, CheckCircle2, Phone, Code, 
  ArrowRight, ShieldCheck, FileJson, Globe, Lock 
} from 'lucide-react';
import { API_URL } from '../../apiConfig';

export default function PhoneScraper() {
  const navigate = useNavigate();
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    setResults(null);
    setError(null);

    // Get the logged-in user if available to pass for auth check
    const storedUser = localStorage.getItem('omni_public_user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    try {
      // Small artificial delay to make the animation look cooler
      await new Promise(r => setTimeout(r, 1500));
      
      const res = await axios.post(`${API_URL}/public/deep-extract`, {
        target,
        isAnonymous: !user,
        userId: user?.id
      });
      setResults(res.data.extractedPhones);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to extract. Try a different domain.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Phone size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">OmniLead <span className="font-medium text-gray-400">Extractor API</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/marketplace')} className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Marketplace</button>
            <button onClick={() => navigate('/login')} className="px-5 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">Sign In</button>
          </div>
        </div>
      </header>

      {/* ── HERO & DEMO ── */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Pitch */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Terminal size={14} /> Developer API
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              Extract phone numbers from <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">any website.</span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-lg">
              Don't let valuable leads hide behind complex website structures. Our Deep Extractor uses smart search algorithms and Regex parsing to bypass blocks and return clean, verified phone numbers.
            </p>
            
            <div className="flex items-center gap-4">
              <button onClick={() => document.getElementById('demo').scrollIntoView({behavior: 'smooth'})} className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                Try Live Demo
              </button>
              <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">
                Get API Key
              </button>
            </div>
          </div>

          {/* Live Demo Terminal */}
          <div id="demo" className="relative z-10 bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3 bg-white/5 border-b border-white/10 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-4 text-xs font-mono text-gray-500">deep-extractor.exe</span>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleExtract} className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Enter a website or business name (e.g., 'Tesla' or 'apple.com')"
                  className="w-full pl-12 pr-32 py-4 bg-black border border-white/10 rounded-xl text-white font-mono text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white text-xs font-bold font-mono rounded-lg transition-colors"
                >
                  {loading ? 'Crawling...' : 'Extract'}
                </button>
              </form>

              {/* Animated Results Area */}
              <div className="min-h-[200px] bg-black rounded-xl border border-white/10 p-4 font-mono text-sm relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-gray-500 space-y-2"
                    >
                      <motion.p initial={{ x: -10 }} animate={{ x: 0 }}>&gt; Initializing search vectors...</motion.p>
                      <motion.p initial={{ x: -10 }} animate={{ x: 0 }} transition={{ delay: 0.3 }}>&gt; Bypassing anti-bot protections...</motion.p>
                      <motion.p initial={{ x: -10 }} animate={{ x: 0 }} transition={{ delay: 0.6 }}>&gt; Scraping raw HTML payload...</motion.p>
                      <motion.p initial={{ x: -10 }} animate={{ x: 0 }} transition={{ delay: 0.9 }}>&gt; Running phone number regex parser...</motion.p>
                      <motion.div 
                        className="absolute bottom-0 left-0 h-1 bg-violet-600"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, ease: "linear" }}
                      />
                    </motion.div>
                  ) : error ? (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-red-400"
                    >
                      &gt; Error: {error}
                      <p className="text-gray-500 mt-4 text-xs">Note: Premium Data License may be required for full access.</p>
                    </motion.div>
                  ) : results ? (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-green-400 mb-4">&gt; Extraction Complete. Found {results.length} numbers.</p>
                      {results.map((phone, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          key={i} 
                          className="flex items-center gap-3 text-white mb-2"
                        >
                          <Phone size={14} className="text-violet-400" /> {phone}
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="text-gray-600 flex flex-col items-center justify-center h-full text-center mt-8">
                      <Code size={24} className="mb-2 opacity-50" />
                      <p>Awaiting target input.</p>
                      <p className="text-xs mt-1">Ready to parse raw HTML.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (Plain English) ── */}
      <section className="py-24 bg-white/5 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-black mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">You don't need to be a developer. We handle the complex infrastructure so you can focus on closing deals.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <Search size={24} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Smart Targeting</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Enter a business name or URL. Our algorithm acts like a super-fast human, locating the official website and public directory listings instantly.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-6">
                <Globe size={24} className="text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Raw Data Extraction</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                We bypass anti-bot protections and download the raw underlying code of the website, looking everywhere from the footer to the hidden metadata.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
                <FileJson size={24} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Pattern Matching</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Using advanced mathematical formulas (Regex), we instantly identify, format, and return anything that matches global phone number structures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-violet-600 to-indigo-900 rounded-3xl p-12 text-center relative overflow-hidden border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Lock size={200} />
          </div>
          <h2 className="text-3xl lg:text-5xl font-black mb-6 relative z-10">Need bulk extraction?</h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto relative z-10">
            Get the Premium Data License. Unlock the ability to run thousands of Deep Extractions directly from the OmniLead Marketplace.
          </p>
          <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-violet-900 font-bold rounded-xl transition-all hover:scale-105 shadow-xl relative z-10">
            Request Premium Access
          </button>
        </div>
      </section>

    </div>
  );
}
