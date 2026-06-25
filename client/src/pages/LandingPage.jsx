import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, ArrowRight, Zap, Database, Phone, Mail, Globe, MapPin, Briefcase
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const CARTOON_FEATURES = [
    {
      icon: '📞',
      title: 'Direct Phone Numbers',
      desc: 'Stop dealing with gatekeepers. We extract verified mobile numbers directly from business pages.',
      color: '#fecaca', // red
    },
    {
      icon: '✉️',
      title: 'Verified Emails',
      desc: 'Get direct email addresses of local businesses, ready for your outreach campaigns.',
      color: '#fef08a', // yellow
    },
    {
      icon: '📱',
      title: 'WhatsApp Leads',
      desc: 'Find businesses that are actively using WhatsApp for faster conversions.',
      color: '#bfdbfe', // blue
    },
    {
      icon: '🌍',
      title: 'Global & Local Reach',
      desc: 'Whether you need leads in Mumbai or New York, our minions extract them by city.',
      color: '#bbf7d0', // green
    },
    {
      icon: '🤖',
      title: 'Automated Minions',
      desc: 'Deploy virtual bots that scrape 50 leads at a time, bypassing rate limits effortlessly.',
      color: '#fbcfe8', // pink
    },
    {
      icon: '📈',
      title: 'Ad Monetization Ready',
      desc: 'Sponsor ads and turn your own lead portal traffic into passive income.',
      color: '#fed7aa', // orange
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="min-h-screen text-black bg-[#fffbeb] font-sans pb-16 relative overflow-hidden">
      
      {/* Inject custom CSS keyframes for infinite marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 20s linear infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black py-4 px-6 shadow-[0_4px_0_#000]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 rounded-xl bg-[#ef4444] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]"
            >
              <span className="text-xl">🤖</span>
            </motion.div>
            <span className="font-display text-xl font-black text-black">
              India<span className="text-[#ef4444]">Scraper</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#problem" className="text-xs font-black uppercase hover:text-[#ef4444] transition-colors">The Problem</a>
            <a href="#features" className="text-xs font-black uppercase hover:text-[#ef4444] transition-colors">What We Scrape</a>
            <a href="#trial" className="text-xs font-black uppercase hover:text-[#ef4444] transition-colors">Free Giveaway 🇮🇳</a>
          </nav>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/app/overview')} 
              className="cartoon-btn cartoon-btn-yellow px-5 py-2.5 text-xs uppercase"
            >
              Client Dashboard 🚀
            </motion.button>
          </div>

          {/* Mobile toggle */}
          <button 
            className="lg:hidden p-2 border-2 border-black rounded-lg bg-[#fef08a]" 
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden px-6 py-4 bg-white border-t-4 border-black mt-4 flex flex-col gap-4 overflow-hidden"
            >
              <a href="#problem" className="text-sm font-black uppercase" onClick={() => setMobileOpen(false)}>The Problem</a>
              <a href="#features" className="text-sm font-black uppercase" onClick={() => setMobileOpen(false)}>What We Scrape</a>
              <a href="#trial" className="text-sm font-black uppercase" onClick={() => setMobileOpen(false)}>Free Giveaway 🇮🇳</a>
              <button 
                onClick={() => { navigate('/app/overview'); setMobileOpen(false); }} 
                className="cartoon-btn cartoon-btn-yellow w-full py-3 text-xs uppercase text-center"
              >
                Client Dashboard 🚀
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left Headline */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-6 text-left"
        >
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block bg-[#fecaca] border-2 border-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]"
          >
            🇮🇳 For Businesses Seeking Real Leads
          </motion.div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-black text-black leading-none">
            Stop Searching.<br/> Start <span className="text-[#ef4444]">Connecting.</span>
          </h1>
          
          <p className="text-sm sm:text-base font-semibold text-gray-700 leading-relaxed max-w-xl">
            Are you a business looking for verified contact numbers, emails, or leads, but struggling to find them? We deploy automated minions to scrape exactly what you need, from any city, instantly.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/app/overview')} 
              className="cartoon-btn cartoon-btn-red px-6 py-3.5 text-xs sm:text-sm uppercase flex items-center gap-2"
            >
              Get Your Leads Now <ArrowRight size={16} />
            </motion.button>
          </div>

          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-4 block">
            ⚡ Extracting Phone Numbers, Emails, and WhatsApp Handles Daily.
          </p>
        </motion.div>

        {/* Right Preview Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full lg:w-[480px] shrink-0 relative"
        >
          {/* Floating animated elements */}
          <div className="absolute -top-6 -left-6 text-4xl animate-float" style={{ animationDelay: '0s' }}>📞</div>
          <div className="absolute -bottom-6 -right-6 text-4xl animate-float" style={{ animationDelay: '1s' }}>✉️</div>
          <div className="absolute top-1/2 -right-8 text-4xl animate-float" style={{ animationDelay: '2s' }}>🤖</div>

          <div className="cartoon-card p-6 bg-white max-w-md mx-auto relative z-10">
            {/* Visual Title */}
            <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🤖</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">Extraction Engine</h3>
                  <p className="text-[9px] font-semibold text-gray-500">Live Scrape Status</p>
                </div>
              </div>
              <span className="bg-[#bbf7d0] text-black font-black text-[9px] border-2 border-black rounded-full px-2 py-0.5 animate-pulse">
                LIVE
              </span>
            </div>

            {/* Simulated Live Stream logs */}
            <div className="bg-black text-[#10b981] font-mono text-[10px] p-3 rounded-lg border-2 border-black h-36 overflow-y-auto leading-relaxed mb-4 space-y-1">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>&gt; Searching for businesses...</motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>&gt; Found local directory listings...</motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-white">&gt; Extracted direct phone: +91-9876543210</motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="text-white">&gt; Extracted email: contact@business.com</motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="text-yellow-400">&gt; Bypassing captchas seamlessly...</motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.0 }}>&gt; Saved to your dashboard.</motion.div>
            </div>

            {/* Stat Pill */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#fef08a] border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#000]">
                <p className="text-[9px] font-black uppercase text-gray-500">Leads Found</p>
                <p className="text-base font-black text-black mt-1">Ready</p>
              </div>
              <div className="bg-[#fed7aa] border-2 border-black rounded-xl p-2.5 text-center shadow-[2px_2px_0px_#000]">
                <p className="text-[9px] font-black uppercase text-gray-500">Time Saved</p>
                <p className="text-base font-black text-black mt-1">100+ Hours</p>
              </div>
            </div>
          </div>
        </motion.div>

      </section>

      {/* ── RUNNING MINION HORIZONTAL TICKER (MARQUEE) ── */}
      <div className="w-full bg-[#fef08a] border-y-4 border-black py-4 overflow-hidden relative mb-12 shadow-[0_4px_0_#000]">
        <div className="flex whitespace-nowrap animate-marquee">
          {[
            { icon: '🤖', text: 'Extracting Phones...' },
            { icon: '✉️', text: 'Validating Emails...' },
            { icon: '📱', text: 'Finding WhatsApps...' },
            { icon: '🌍', text: 'Targeting Local Cities...' },
            { icon: '🎯', text: 'High Quality B2B Leads...' }
          ].concat([
            { icon: '🤖', text: 'Extracting Phones...' },
            { icon: '✉️', text: 'Validating Emails...' },
            { icon: '📱', text: 'Finding WhatsApps...' },
            { icon: '🌍', text: 'Targeting Local Cities...' },
            { icon: '🎯', text: 'High Quality B2B Leads...' }
          ]).map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 mx-10 bg-white border-2 border-black rounded-full px-4 py-1.5 shadow-[2px_2px_0px_#000] shrink-0">
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-black uppercase text-black">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── THE PROBLEM WE SOLVE ── */}
      <section id="problem" className="max-w-5xl mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="cartoon-card p-8 bg-[#fed7aa] flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center shrink-0 shadow-[4px_4px_0px_#000] relative">
            <span className="text-5xl animate-pulse">🤷‍♂️</span>
            <div className="absolute -top-2 -right-2 text-2xl">❓</div>
          </div>
          <div className="space-y-4">
            <h3 className="font-display font-black text-2xl sm:text-3xl uppercase text-black">
              The Endless Search for Leads
            </h3>
            <p className="text-sm font-semibold text-gray-800 leading-relaxed">
              If you are running a business, you know the struggle. You need <span className="font-black">contact numbers, direct emails, and leads</span> to grow your sales. But buying old databases gives you dead numbers, and manual searching takes hours.
            </p>
            <p className="text-sm font-black text-black leading-relaxed bg-white border-2 border-black p-3 rounded-lg shadow-[2px_2px_0px_#000]">
              We solved this. You tell us the category and city. We provide the leads instantly.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES GRID (WHAT WE SCRAPE) ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-block bg-[#bfdbfe] border-2 border-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
            ⚡ WHAT WE DELIVER
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black text-black">
            Everything You Need to Connect.
          </h2>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CARTOON_FEATURES.map((feat, idx) => (
            <motion.div 
              key={idx} 
              variants={itemVariants}
              whileHover={{ scale: 1.03, rotate: (idx % 2 === 0 ? 1 : -1) }}
              className="cartoon-card p-6 flex flex-col justify-between"
              style={{ backgroundColor: feat.color }}
            >
              <div>
                <div className="w-12 h-12 bg-white border-2 border-black rounded-xl flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000] mb-4">
                  {feat.icon}
                </div>
                <h3 className="font-display font-black text-lg text-black uppercase tracking-wide mb-2">{feat.title}</h3>
                <p className="text-xs font-semibold text-gray-700 leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS (CARTOON FLOW) ── */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="cartoon-card p-8 bg-white">
          <div className="text-center mb-8">
            <h3 className="font-display text-2xl sm:text-4xl font-black text-black uppercase">Simple 3-Step Process</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">From raw queries to a dashboard full of verified contacts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Tell us What & Where', desc: 'Type "Dentists in Hyderabad" or "Restaurants in Mumbai".' },
              { step: '02', title: 'Minions Deploy', desc: 'Our bots scan maps, directories, and social media automatically.' },
              { step: '03', title: 'You Get Contacts', desc: 'Export direct phone numbers and emails to your CRM.' }
            ].map((step, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ y: -5 }}
                className="relative p-5 bg-[#fffbeb] border-2 border-black rounded-xl shadow-[3px_3px_0px_#000]"
              >
                <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-[#ef4444] border-2 border-black flex items-center justify-center text-white font-black text-xs">
                  {step.step}
                </span>
                <h4 className="font-display font-black text-base text-black mt-2 mb-1.5 uppercase">{step.title}</h4>
                <p className="text-xs text-gray-600 font-semibold leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE 30-DAY TICKET STUB GIVEAWAY ── */}
      <section id="trial" className="max-w-4xl mx-auto px-6 py-8">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="ticket-stub p-8 bg-white text-center shadow-[6px_6px_0px_#000] border-4 border-black"
        >
          <motion.span 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl inline-block"
          >
            🎁
          </motion.span>
          <h2 className="font-display font-black text-2xl uppercase tracking-wider text-black mt-2">
            One Month Unlimited Free Access! 🇮🇳
          </h2>
          <p className="text-xs text-gray-600 font-semibold max-w-md mx-auto mt-2">
            Try it out for 30 days. Deploy minions, scrape verified contacts, and boost your sales pipeline with zero setup costs.
          </p>
          <button 
            onClick={() => navigate('/app/overview')}
            className="cartoon-btn cartoon-btn-red px-6 py-2.5 text-xs uppercase mt-5"
          >
            Start Your Free Trial Now!
          </button>
        </motion.div>
      </section>

    </div>
  );
}
