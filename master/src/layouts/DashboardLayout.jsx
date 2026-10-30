import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Crosshair, FolderOpen, Users, Settings, BarChart3,
  Zap, Globe, Menu, X, Bell, Bot, ChevronRight,
  Activity, Database, TrendingUp, Layers, Shield,
  Cpu, Sparkles, Search, GitBranch, LayoutDashboard,
  Phone, Mail, Star, Filter, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScraper } from '../context/ScraperContext';
import ScrapedFoldersSidebar from '../components/ScrapedFoldersSidebar';

const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      {
        to: '/command',
        icon: LayoutDashboard,
        label: 'Command Center',
        desc: 'Search, map, CRM & folders',
        color: 'violet',
      },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      {
        to: '/app/automations',
        icon: Zap,
        label: 'Automations',
        desc: 'Scheduled scraping jobs',
        color: 'pink',
      },
      {
        to: '/app/settings',
        icon: Settings,
        label: 'Settings',
        desc: 'API keys & config',
        color: 'slate',
      },
      {
        to: '/app/users',
        icon: Users,
        label: 'Team',
        desc: 'People & assignment',
        color: 'cyan',
      },
    ],
  },
];

const MOBILE_NAV = [
  { to: '/command', icon: LayoutDashboard, label: 'Console' },
  { to: '/app/automations', icon: Zap, label: 'Automate' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
  { to: '/app/users', icon: Users, label: 'Team' },
];

const COLOR_MAP = {
  violet: {
    active: 'text-violet-300 bg-violet-500/10 border-violet-500/30',
    dot: 'bg-violet-400',
    glow: 'shadow-violet-500/20',
  },
  cyan: {
    active: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    dot: 'bg-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
  emerald: {
    active: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  amber: {
    active: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-400',
    glow: 'shadow-amber-500/20',
  },
  pink: {
    active: 'text-pink-300 bg-pink-500/10 border-pink-500/30',
    dot: 'bg-pink-400',
    glow: 'shadow-pink-500/20',
  },
  slate: {
    active: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
    dot: 'bg-slate-400',
    glow: 'shadow-slate-500/20',
  },
};

export default function DashboardLayout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let scraperContext = null;
  try { scraperContext = useScraper(); } catch (e) {}
  const { loading = false } = scraperContext || {};

  return (
    <div className="min-h-screen bg-[#050507] flex font-sans text-white overflow-hidden">

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={{ x: isMobile ? (sidebarOpen ? 0 : -300) : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen flex flex-col
          border-r border-white/[0.07]
          ${collapsed && !isMobile ? 'w-16' : 'w-64'}
          transition-all duration-300
        `}
        style={{
          background: 'linear-gradient(180deg, #0c0c1a 0%, #080810 100%)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── BRAND ── */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: '0 0 18px rgba(124,58,237,0.45)',
              }}
            >
              <Bot size={15} className="text-white" strokeWidth={2.5} />
            </div>
            {(!collapsed || isMobile) && (
              <div className="min-w-0">
                <p className="font-black text-sm tracking-tight text-white leading-none">
                  Scraper<span className="text-cyan-400">.co.in</span>
                </p>
                <p className="text-[9px] text-cyan-400/80 uppercase tracking-widest font-mono mt-0.5">
                  Workspace Tools
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isMobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              >
                <ChevronRight
                  size={13}
                  className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
                />
              </button>
            )}
            <button
              className="md:hidden p-1.5 text-white/40 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── LIVE STATUS ── */}
        {(!collapsed || isMobile) && (
          <div className="px-3 py-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${loading ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`relative rounded-full h-2 w-2 ${loading ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </span>
              <span className={`text-[9px] font-mono font-bold tracking-wider ${loading ? 'text-amber-400' : 'text-emerald-400'}`}>
                {loading ? 'SCANNING LIVE' : 'ENGINE READY'}
              </span>
              <span className="text-[8px] text-white/25 ml-auto font-mono">v2.0</span>
            </div>
          </div>
        )}

        {/* ── NAVIGATION ── */}
        <div className="flex-1 px-2 py-3 space-y-4 overflow-y-auto sidebar-scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {(!collapsed || isMobile) && (
                <p className="px-2 pb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-white/25">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const colors = COLOR_MAP[item.color] || COLOR_MAP.violet;
                  const badge = item.badgeDynamic && loading ? '⚡ LIVE' : item.badge;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-xs border ${
                          isActive
                            ? `${colors.active} border font-semibold shadow-sm ${colors.glow}`
                            : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] border-transparent font-medium'
                        } ${collapsed && !isMobile ? 'justify-center' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`shrink-0 transition-all ${isActive ? `text-${item.color}-400` : 'opacity-55 group-hover:opacity-90'}`}>
                            <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                          </span>
                          {(!collapsed || isMobile) && (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold truncate leading-tight">{item.label}</p>
                                <p className="text-[9px] text-white/35 truncate">{item.desc}</p>
                              </div>
                              {badge && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 animate-pulse">
                                  {badge}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── FOLDERS SECTION ── */}
          {(!collapsed || isMobile) && (
            <div>
              <p className="px-2 pb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-white/25">
                RECENT VAULTS
              </p>
              <ScrapedFoldersSidebar isDark={true} collapsed={false} />
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {(!collapsed || isMobile) && (
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-2 shrink-0">
            {/* Coverage Badge */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-950/40 via-indigo-950/30 to-purple-950/40 border border-violet-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1">
                    <Globe size={9} className="text-cyan-400" /> Pan-India Coverage
                  </span>
                  <p className="text-[10px] font-bold text-white mt-0.5">780+ Districts Indexed</p>
                </div>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FREE
                </span>
              </div>
            </div>

            {/* Admin User */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
              >
                {(user?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white truncate">{user?.name || 'Admin'}</p>
                <p className="text-[9px] text-emerald-400 font-semibold">Pro Edition</p>
              </div>
              <Shield size={12} className="text-violet-400 flex-shrink-0" />
            </div>
          </div>
        )}
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">

        {/* Mobile Header */}
        <header className="md:hidden h-12 border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0"
          style={{ background: 'rgba(9,9,18,0.97)', backdropFilter: 'blur(10px)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              <Bot size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-sm text-white">
              scraper<span className="text-lime-400">.co.in</span>
            </span>
          </div>
          <button className="p-1.5 text-white/50 hover:text-white transition-colors relative">
            <Bell size={16} />
            {loading && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full flex flex-col overflow-hidden">
          <div className="flex-1 w-full overflow-x-hidden overflow-y-auto custom-scrollbar pb-16 md:pb-0">
            <Outlet />
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
          style={{
            background: 'rgba(8,8,16,0.97)',
            backdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex items-center justify-around px-1 py-1.5">
            {MOBILE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]"
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-violet-500/20' : ''}`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? 'text-violet-400' : 'text-white/40'}
                    />
                  </motion.div>
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-violet-400' : 'text-white/35'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
