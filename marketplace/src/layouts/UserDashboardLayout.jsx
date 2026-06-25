import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Users, LogOut, Menu, X, Bell, Zap, Database, ArrowUpCircle, ChevronRight, Command, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../apiConfig';

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

export default function UserDashboardLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [credits, setCredits] = useState(user?.credits || 0);

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

  // Poll for credit updates
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.post(`${API_URL}/auth`, { email: user.email });
        if (res.data.user) {
          setCredits(res.data.user.credits);
        }
      } catch(e) { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    { to: '/app/scraper', icon: <Search size={16} />, label: 'Lead Engine', desc: 'AI Omni-Scraper' },
    { to: '/app/leads', icon: <Users size={16} />, label: 'My Leads', desc: 'Saved & Unlocked Contacts' },
    { to: '/app/billing', icon: <Zap size={16} />, label: 'Billing & Credits', desc: 'Manage your plan' }
  ];

  const handleLogout = () => { onLogout(); navigate('/login'); };

  const getPageTitle = () => {
    const item = navItems.find(i => location.pathname.startsWith(i.to));
    return item?.label || 'Dashboard';
  };

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
          background: 'rgba(6,8,18,0.97)',
          backdropFilter: 'blur(32px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Ambient glow top */}
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 70%)',
        }} />

        {/* ── Brand ── */}
        <div className="h-16 flex items-center justify-between px-4 flex-shrink-0 relative z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 0 20px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}>
              <Database size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-display font-black text-lg tracking-tight text-white whitespace-nowrap"
                >
                  Gomandap<span style={{ color: '#60a5fa' }}>B2B</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-all flex-shrink-0"
            onClick={() => setCollapsed(p => !p)}
          >
            <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
          </button>
          <button className="md:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
          {!collapsed && (
            <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Dashboard
            </p>
          )}

          {navItems.map((item, idx) => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
              {({ isActive }) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="nav-icon">
                    <span className={isActive ? 'text-blue-400' : 'text-white/40'}>
                      {item.icon}
                    </span>
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-semibold truncate">{item.label}</p>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{item.desc}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Credits Box ── */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 mb-4"
            >
              <div className="p-4 rounded-xl relative overflow-hidden"
                style={{
                  background: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.2)'
                }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10" style={{ background: 'rgba(59,130,246,0.15)' }} />
                <p className="text-[10px] font-bold text-blue-400 mb-1 uppercase tracking-wider">Available Credits</p>
                <p className="text-2xl font-black text-white">{credits}</p>
                <button onClick={() => navigate('/app/billing')} className="mt-3 w-full btn-3d btn-sm flex items-center justify-center gap-1.5 py-2" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  <ArrowUpCircle size={14} /> Buy Credits
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Command shortcut ── */}
        {!collapsed && (
          <div className="px-3 pb-3 relative z-10">
            <button
              onClick={() => setCmdOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all group"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <Command size={12} />
              <span className="flex-1 text-left">Quick search</span>
              <span className="font-mono" style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>⌘K</span>
            </button>
          </div>
        )}

        {/* ── User ── */}
        <div className="relative z-10 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {collapsed ? (
            <div className="p-2 flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }}>
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <button onClick={handleLogout} className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-500/15 transition-all" title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center gap-3 p-3 rounded-xl mb-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 0 12px rgba(59,130,246,0.4)' }}>
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white">{user?.name || 'Startup User'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-3d btn-ghost w-full text-xs py-2"
                style={{ color: '#fda4af', borderColor: 'rgba(244,63,94,0.2)' }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-30"
          style={{
            background: 'rgba(2,3,10,0.85)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>

          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all"
            >
              <Menu size={18} />
            </button>

            {/* Page title */}
            <div>
              <h1 className="text-sm font-bold text-white">{getPageTitle()}</h1>
              <p className="text-[10px] hidden md:block" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Marketplace Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Credits pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Zap size={12} style={{ color: '#60a5fa' }} />
              <span className="text-[10px] font-bold" style={{ color: '#93c5fd' }}>{credits} CR</span>
            </div>

            {/* Search pill */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <Search size={12} />
              <span>Search…</span>
              <span className="font-mono ml-2 text-[9px]" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px' }}>⌘K</span>
            </button>

            {/* Notification bell */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
            </button>
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
