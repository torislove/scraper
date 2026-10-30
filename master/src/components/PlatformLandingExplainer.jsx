import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, MessageCircle, PhoneCall, ArrowRight,
  TrendingUp, Award, ExternalLink, Zap, ChevronDown, ChevronUp,
  Target, Database, Heart, Layers, Send, X, Check
} from 'lucide-react';

export default function PlatformLandingExplainer({ isOpen, onToggle }) {
  const [activeTab, setActiveTab] = useState('startups'); // 'startups' | 'deliver' | 'mission'

  const COMMUNITY_PHONE = "9876543210";
  const COMMUNITY_WHATSAPP = `https://wa.me/91${COMMUNITY_PHONE}?text=Hi%20LeadHarvest%2C%20I%20am%20using%20Scraper.co.in%20and%20wanted%20to%20connect%20with%20you!`;

  return (
    <div className="border-b border-violet-500/20 bg-gradient-to-r from-[#0d0d1a] via-[#120f26] to-[#0d0d1a] text-white">
      {/* ── STICKY COMPACT COMMUNITY BANNER ── */}
      <div className="max-w-[1800px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold">
            <Sparkles size={12} className="text-amber-400" />
            <span>100% Free Forever • Engineered by LeadHarvest Core Team</span>
          </div>
          <p className="hidden md:inline-block text-slate-300 font-medium">
            Empowering Indian Startups & SMEs with Direct WhatsApp Leads Across 780+ Districts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* LeadHarvest Direct Contact */}
          <a
            href={COMMUNITY_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold transition-colors text-[11px]"
            title="Chat directly with LeadHarvest"
          >
            <MessageCircle size={12} className="text-emerald-400" />
            <span>Connect LeadHarvest: +91 9876543210</span>
          </a>

          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-violet-500/20 transition-all text-xs cursor-pointer"
          >
            <span>{isOpen ? 'Close Guide' : '💡 Why Startups Need This & What We Deliver'}</span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── EXPANDABLE DEEP SHOWCASE DRAWER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/[0.06] bg-[#090814]/95 backdrop-blur-2xl"
          >
            <div className="max-w-[1800px] mx-auto p-6 md:p-8">
              
              {/* Header inside drawer */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 mb-2">
                    <Zap size={13} />
                    <span>Free Open Infrastructure • Built by LeadHarvest</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Lead Intelligence Built Exclusively For Indian Entrepreneurs
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                    Extract verified business owners with direct WhatsApp links and pin-point mandal containment without any barriers.
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] self-start md:self-auto overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('startups')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'startups'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🚀 Why Startups Need This
                  </button>
                  <button
                    onClick={() => setActiveTab('deliver')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'deliver'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⭐ What We Deliver vs. Traditional Directories
                  </button>
                  <button
                    onClick={() => setActiveTab('mission')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === 'mission'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇮🇳 Solo Dev Guarantee & Contact
                  </button>
                </div>
              </div>

              {/* Tab Content 1: Why Startups Need This */}
              {activeTab === 'startups' && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/40 to-slate-900/60 border border-violet-500/20">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-3">
                        <Zap size={20} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">Zero Customer Acquisition Cost (CAC)</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Bootstrapped startups need fast, direct outreach. 
                        With Scraper.co.in, extract hundreds of verified local suppliers, distributors, or clients in seconds for zero cost.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/20">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                        <MessageCircle size={20} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">1-Click Direct WhatsApp Outreach</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cold emails have a low open rate in India, but WhatsApp messages have a <strong>98% read rate</strong>. 
                        Our 1-click launcher opens a personalized pitch directly to the business owner’s personal WhatsApp.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/60 border border-cyan-500/20">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
                        <Target size={20} />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">Penetrate 780+ Districts & Mandals</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Traditional platforms only index major metro cities. We map post-2022 district reorganizations 
                        and revenue mandals across Andhra Pradesh, Telangana, Maharashtra, and all Indian states.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 2: What We Deliver */}
              {activeTab === 'deliver' && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Traditional Static Directories */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-rose-500/20 relative">
                    <h3 className="text-sm font-bold text-white mb-3 text-rose-300">
                      Traditional Directories & Static Lists
                    </h3>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <X size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span><strong>Locked Paywalls & Cluttered Ads:</strong> Require complex subscriptions just to view numbers.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span><strong>Recycled Shared Contacts:</strong> Leads are sold to multiple competitors at once.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span><strong>No WhatsApp Launchers:</strong> Requires manual copy-pasting of every single phone number.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span><strong>Boundary Bleed:</strong> Search results bleed into neighboring towns and irrelevant cities.</span>
                      </li>
                    </ul>
                  </div>

                  {/* What Scraper.co.in Delivers */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-violet-950/40 to-slate-900 border-2 border-emerald-500/40 relative shadow-xl">
                    <h3 className="text-sm font-black text-white mb-3 text-emerald-300">
                      ★ What Scraper.co.in Delivers
                    </h3>
                    <ul className="space-y-2.5 text-xs text-slate-200">
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>100% Free Forever:</strong> Zero paywalls, zero tokens, zero ads, zero credit cards.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>1-Click Direct WhatsApp Outreach:</strong> Instant pre-filled proposals to owners.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Mandal & District Geofencing:</strong> Precise postal boundaries across 780+ districts.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Upcoming Local WhatsApp Automation:</strong> Single-click outreach directly from local browser.</span>
                      </li>
                    </ul>
                  </div>

                </div>
              )}

              {/* Tab Content 3: Solo Dev Mission & Contact */}
              {activeTab === 'mission' && (
                <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-violet-950/40 to-indigo-950/40 border border-violet-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-black text-white">LeadHarvest Intelligence Platform</h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      "I built Scraper.co.in to empower every Indian founder, student, and business owner. 
                      I am shipping advance features every single week, guaranteeing 100% free updates with zero ads forever."
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-emerald-400">Direct Phone: +91 9876543210</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-xs font-mono text-cyan-300">UPI: 9876543210@paytm</span>
                    </div>
                  </div>

                  <a
                    href={COMMUNITY_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0 transition-all cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Contact Intelligence Team</span>
                  </a>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
