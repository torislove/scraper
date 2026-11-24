import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, Compass, Cpu, Globe2, Layers, Laptop, LogIn, MapPin,
  RefreshCw, Rocket, Search, Server, Sparkles, X
} from 'lucide-react';
import { isMasterRuntime, openClientWorkspace, openMasterWorkspace } from '../utils/editionSwitch';
import { useExtension } from '../context/ExtensionContext';

const MARKETS = [
  { code: 'IN', label: 'India — 633 Districts & Tech Corridors', icon: '🇮🇳' },
  { code: 'US', label: 'United States — 3,143 Counties', icon: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom — London & 76 Cities', icon: '🇬🇧' },
  { code: 'AE', label: 'United Arab Emirates — DIFC & Free Zones', icon: '🇦🇪' },
  { code: 'SG', label: 'Singapore — Marina Bay & Jurong', icon: '🇸🇬' },
  { code: 'AU', label: 'Australia — Sydney & Melbourne', icon: '🇦🇺' },
  { code: 'DE', label: 'Germany — Munich & Mittelstand', icon: '🇩🇪' },
  { code: 'CA', label: 'Canada — Toronto & Vancouver', icon: '🇨🇦' },
  { code: 'NZ', label: 'New Zealand — Auckland & Christchurch', icon: '🇳🇿' },
  { code: 'IE', label: 'Ireland — Dublin & Galway', icon: '🇮🇪' },
  { code: 'ZA', label: 'South Africa — Johannesburg & Cape Town', icon: '🇿🇦' }
];

export default function CommandPalette({ workspaceActions = null }) {
  const navigate = useNavigate();
  const { ensureConnected } = useExtension() || {};
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const masterActive = isMasterRuntime();

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-command-palette', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const items = useMemo(() => {
    const list = [
      {
        id: 'nav-home',
        group: 'Platform Showcase',
        label: '01 · Overview & Autonomous Radar',
        hint: 'Screen 01',
        icon: Compass,
        run: () => navigate('/')
      },
      {
        id: 'nav-solutions',
        group: 'Platform Showcase',
        label: '02 · Three-Step Extraction Pipeline',
        hint: 'Screen 02',
        icon: Sparkles,
        run: () => navigate('/solutions')
      },
      {
        id: 'nav-arch',
        group: 'Platform Showcase',
        label: '03 · 22 Parallel Engines Architecture',
        hint: 'Screen 03',
        icon: Layers,
        run: () => navigate('/architecture')
      },
      {
        id: 'nav-global',
        group: 'Platform Showcase',
        label: '04 · 11 Sovereign Markets & Geofencing',
        hint: 'Screen 04',
        icon: Globe2,
        run: () => navigate('/global-coverage')
      },
      {
        id: 'nav-hw',
        group: 'Platform Showcase',
        label: '05 · Client-Side RAM Virtualization',
        hint: 'Screen 05',
        icon: Cpu,
        run: () => navigate('/hardware')
      },
      {
        id: 'nav-story',
        group: 'Platform Showcase',
        label: '06 · Founder Story & 20% Strategic Equity',
        hint: 'Screen 06',
        icon: Award,
        run: () => navigate('/story')
      },
      {
        id: 'ed-client',
        group: 'Workspaces & Editions',
        label: `Launch Client Cockpit${!masterActive ? ' (Current)' : ''}`,
        hint: 'Local RAM',
        icon: Laptop,
        run: () => openClientWorkspace(navigate, '/command?country=IN', ensureConnected)
      },
      {
        id: 'ed-master',
        group: 'Workspaces & Editions',
        label: `Open Master Fleet Command${masterActive ? ' (Current)' : ''}`,
        hint: 'Swarm Fleet',
        icon: Server,
        run: () => openMasterWorkspace(navigate, '/command?country=IN')
      },
      {
        id: 'ed-login',
        group: 'Workspaces & Editions',
        label: 'Workspace Sign In / Authentication',
        hint: '/login',
        icon: LogIn,
        run: () => navigate('/login')
      }
    ];

    if (workspaceActions) {
      if (workspaceActions.onFocusSearch) {
        list.unshift({
          id: 'ws-focus',
          group: 'Workspace Actions',
          label: 'Focus Live Search Bar',
          hint: '/ key',
          icon: Search,
          run: workspaceActions.onFocusSearch
        });
      }
      if (workspaceActions.onSwitchTab) {
        list.unshift(
          {
            id: 'ws-map',
            group: 'Workspace Actions',
            label: 'Open Full Screen Territory Map',
            hint: 'Map View',
            icon: MapPin,
            run: () => workspaceActions.onSwitchTab('map')
          },
          {
            id: 'ws-runs',
            group: 'Workspace Actions',
            label: 'View Saved Lead Folders',
            hint: 'Folders',
            icon: Rocket,
            run: () => workspaceActions.onSwitchTab('runs')
          }
        );
      }
      if (workspaceActions.onRefresh) {
        list.unshift({
          id: 'ws-refresh',
          group: 'Workspace Actions',
          label: 'Refresh Live Workspace Telemetry',
          hint: 'Sync',
          icon: RefreshCw,
          run: workspaceActions.onRefresh
        });
      }
    }

    for (const m of MARKETS) {
      list.push({
        id: `mkt-${m.code}`,
        group: '11 Sovereign Markets',
        label: `${m.icon} ${m.label}`,
        hint: `/command?country=${m.code}`,
        icon: Globe2,
        run: () => navigate(`/command?country=${m.code}`)
      });
    }

    return list;
  }, [navigate, ensureConnected, masterActive, workspaceActions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault();
      const target = filtered[selectedIdx];
      setOpen(false);
      target.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(11, 17, 32, 0.48)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '10vh 16px 20px'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 620,
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(28px) saturate(190%)',
              borderRadius: 20,
              border: '1.5px solid rgba(217, 119, 6, 0.45)',
              boxShadow:
                '0 28px 64px -14px rgba(11, 17, 32, 0.35), 0 0 0 1px rgba(254, 243, 199, 0.8) inset',
              overflow: 'hidden'
            }}
            role="dialog"
            aria-label="Global Command Palette"
          >
            {/* Search Input Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 18px',
                background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
                borderBottom: '1px solid rgba(217, 119, 6, 0.22)'
              }}
            >
              <Search size={17} color="#d97706" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIdx(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Jump to screen, switch Client / Master, or select a country..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: '1px solid rgba(217, 119, 6, 0.28)',
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#92400e',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>ESC</span>
                <X size={12} />
              </button>
            </div>

            {/* Results List */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '10px 10px 12px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No matching screens, editions, or countries found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => {
                        setOpen(false);
                        item.run();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '9px 12px',
                        borderRadius: 12,
                        border: active ? '1px solid rgba(217, 119, 6, 0.45)' : '1px solid transparent',
                        background: active
                          ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: active ? '#d97706' : '#f8fafc',
                            color: active ? '#ffffff' : '#92400e',
                            border: '1px solid rgba(217, 119, 6, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 750, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: 10.5, fontWeight: 650, color: '#92400e' }}>
                            {item.group}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: active ? '#ffffff' : '#f1f5f9',
                          color: active ? '#92400e' : '#64748b',
                          border: '1px solid rgba(217, 119, 6, 0.2)',
                          flexShrink: 0
                        }}
                      >
                        {item.hint}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
