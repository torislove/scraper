import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, LogOut, Menu, X,
  Activity, Bell, Search, Zap, MapPin, ChevronRight,
  Database, Shield, Command, Target, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScraper } from '../context/ScraperContext';
import SponsorAd from '../components/SponsorAd';

// ── Command Palette ──
function CommandPalette({ open, onClose, navItems }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : null; }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = navItems.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="cmd-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="cmd-palette"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
              <Search size={16} className="text-violet-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium placeholder:text-white/30"
              />
              <span className="text-[10px] text-white/25 font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">ESC</span>
            </div>

            {/* Results */}
            <div className="py-2 max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/30 text-sm">No results found</div>
              ) : (
                filtered.map((item, i) => (
                  <motion.button
                    key={item.to}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => { navigate(item.to); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:border-violet-500/30 transition-all">
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white/90 group-hover:text-white">{item.label}</p>
                      <p className="text-xs text-white/35">{item.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-white/20 group-hover:text-violet-400 transition-colors" />
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DashboardLayout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { adsEnabled, incrementImpressions, registerAdClick } = useScraper();
  const [trialDaysLeft, setTrialDaysLeft] = useState(30);

  useEffect(() => {
    let trialStart = localStorage.getItem('gomandap_trial_start');
    if (!trialStart) {
      trialStart = new Date().toISOString();
      localStorage.setItem('gomandap_trial_start', trialStart);
    }
    const diffTime = Math.abs(new Date() - new Date(trialStart));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const left = Math.max(0, 30 - diffDays);
    setTrialDaysLeft(left);
  }, []);

  useEffect(() => {
    if (adsEnabled && incrementImpressions) {
      incrementImpressions();
    }
  }, [location.pathname, adsEnabled]);

  // Global ⌘K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isAdmin = user?.role === 'admin';

  const navItems = [
    { to: '/app/overview',    icon: <LayoutDashboard size={18} />, label: 'Minion Scraper 🇮🇳',    desc: 'Deploy workers to get leads' },
    { to: '/app/leads',       icon: <Database size={18} />,        label: 'My Loot',   desc: 'Your scraped loot' },
    { to: '/app/marketplace', icon: <ShoppingBag size={18} />,     label: 'Leads Shop 🛒',    desc: 'Shop curated lead lists' },
    ...(isAdmin ? [
      { to: '/app/automations', icon: <Zap size={18} />,             label: 'Workflows',      desc: 'Automatic scraping' },
      { to: '/app/users',     icon: <Users size={18} />,           label: 'Marketplace Users',  desc: 'Manage buyers' },
      { to: '/app/settings',  icon: <Settings size={18} />,        label: 'Settings H.Q.',         desc: 'Ad control tower' },
    ] : []),
  ];



  const getPageTitle = () => {
    const item = navItems.find(i => location.pathname.startsWith(i.to));
    return item?.label || 'Dashboard';
  };

  const sidebarW = collapsed ? 'w-16' : 'w-64';

  return (
    <div className="min-h-screen flex font-sans" style={{ background: 'var(--bg-void)' }}>

      {/* ── Command Palette ── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} navItems={navItems} />

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen flex-shrink-0 flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: '#fef08a',
          borderRight: '4px solid #000000',
        }}
      >
        {/* ── Brand ── */}
        <div className="h-16 flex items-center justify-between px-4 flex-shrink-0 relative z-10 border-b-4 border-black bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500 border-2 border-black"
              style={{ boxShadow: '2px 2px 0px #000' }}>
              <Target size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-display font-black text-lg tracking-tight text-black whitespace-nowrap"
                >
                  India<span className="text-red-500 font-bold">Scraper</span>
                  <span className="ml-1 text-[8px] font-black text-white bg-black rounded-lg px-1.5 py-0.5 align-middle border border-black font-display">🇮🇳</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-black/40 hover:text-black hover:bg-black/5 transition-all flex-shrink-0 border-2 border-transparent hover:border-black"
            onClick={() => setCollapsed(p => !p)}
          >
            <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
          </button>
          <button className="md:hidden text-black hover:text-red-500" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2 py-4 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
          {!collapsed && (
            <p className="px-3 pb-1 text-[9px] font-black uppercase tracking-widest text-black/40">
              Operations Center
            </p>
          )}

          {navItems.map((item, idx) => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
              {({ isActive }) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-4 border-black transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-red-500 text-white shadow-[2px_2px_0px_#000]' 
                      : 'bg-white text-black hover:bg-amber-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] shadow-[4px_4px_0px_#000]'
                  } ${collapsed ? 'justify-center p-2' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <div className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shrink-0 ${isActive ? 'bg-white text-red-500' : 'bg-amber-100 text-black'}`}>
                    {item.icon}
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-xs font-black truncate">{item.label}</p>
                        <p className="text-[9px] font-semibold truncate leading-tight mt-0.5 text-black/55">{item.desc}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Sidebar Ads & Ticket ── */}
        {!collapsed && (
          <div className="flex flex-col px-3 gap-3 relative z-10 pb-3">
            {/* Sponsored Ad */}
            {adsEnabled && (
              <SponsorAd layout="vertical" onAdClick={registerAdClick} />
            )}

            {/* Trial Ticket Stub */}
            <div className="ticket-stub p-3.5 border-4 border-black text-center shadow-[4px_4px_0px_#000] bg-white">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Unlimited Free Trial</p>
              <p className="text-base font-black text-black mt-1">{trialDaysLeft} DAYS LEFT</p>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">GIVEAWAY ACTIVE 🎁</p>
            </div>
          </div>
        )}

        {/* ── User ── */}
        <div className="relative z-10 flex-shrink-0 border-t-4 border-black bg-white">
          {collapsed ? (
            <div className="p-2 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-white text-xs font-black flex-shrink-0 bg-red-500"
                style={{ boxShadow: '1px 1px 0px #000' }}>
                {(user?.name || user?.username || 'A')[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl border-4 border-black bg-amber-50" style={{ boxShadow: '2px 2px 0px #000' }}>
                <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-white text-sm font-black flex-shrink-0 bg-red-500"
                  style={{ boxShadow: '1px 1px 0px #000' }}>
                  {(user?.name || user?.username || 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-black">{user?.name || user?.username || 'Admin'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 border border-black animate-ping" />
                    <p className="text-[9px] font-black uppercase text-black/60">
                      {isAdmin ? 'Admin' : 'Agent'}
                    </p>
                  </div>
                </div>
                <Shield size={13} className="text-red-500" />
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">

        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-30 bg-white border-b-4 border-black">

          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-black hover:bg-black/5 transition-all border-2 border-black"
            >
              <Menu size={18} />
            </button>

            {/* Page title */}
            <div>
              <h1 className="text-sm font-black text-black">{getPageTitle()}</h1>
              <p className="text-[10px] hidden md:block font-semibold text-black/40">
                IndiaScraper Minion Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search pill */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-50 border-2 border-black font-semibold text-black shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Search size={12} />
              <span>Search…</span>
              <span className="font-mono ml-2 text-[9px] bg-amber-100 border border-black rounded px-1.5 py-0.5">⌘K</span>
            </button>

            {/* Notification bell */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-black hover:bg-black/5 border-2 border-black bg-white shadow-[2px_2px_0px_#000] relative cursor-pointer">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 border border-black animate-pulse" />
            </button>

            {/* Status chip */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-100 border-2 border-black text-black font-extrabold shadow-[2px_2px_0px_#000]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 border border-black animate-ping" />
              <span className="text-[9px] font-black uppercase">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full flex flex-col overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
