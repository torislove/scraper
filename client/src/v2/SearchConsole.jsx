import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Cpu, Globe, Layers, Loader2,
  MapPin, Phone, Search, Sliders, SlidersHorizontal, Sparkles, Square, Target, Wand2, X, Zap,
  Compass, ShieldCheck
} from 'lucide-react';
import Mascot from './Mascot';
import Mascot3D from './Mascot3D';
import { setDynamicFaviconState } from '../utils/dynamicFavicon';
import { suggestSearch } from './api';
import { cx } from './ui';

const EXAMPLES = [
  'Wedding Album Printing in Guntur',
  'Water Purifier Repair in Benz Circle Vijayawada',
  'Car Detailing & Ceramic Coating in Hyderabad',
  'Urgent wedding photographers near Benz Circle with phone',
  'AC repair technicians in Tenali under 5km',
  'Steel fabrication & iron grills in Auto Nagar'
];

const TARGETS = [100, 250, 500, 1000];

// Proprietary Multi-Vector Intelligence Grid (Strictly Zero 3rd-Party Platform Names)
const PROPRIETARY_VECTORS = [
  {
    id: 'geospatial_mesh',
    name: 'Geospatial Radar Mesh',
    desc: 'High-precision GPS coordinate grid, physical street verification & opening hours',
    badge: '🛰️ GPS RADAR',
    color: 'cyan'
  },
  {
    id: 'direct_telecom',
    name: 'Direct Telecom Registry',
    desc: 'Primary Indian +91 mobile lines with live carrier connection status (High Yield 300+)',
    badge: '📱 DIRECT MOBILES',
    color: 'emerald'
  },
  {
    id: 'deep_serp',
    name: 'Deep Web SERP Index',
    desc: 'Organic multi-area business citations, municipal registries and local directories',
    badge: '🌐 DEEP SERP',
    color: 'amber'
  },
  {
    id: 'b2b_network',
    name: 'Enterprise Supplier Network',
    desc: 'Wholesale distributors, material suppliers, industrial contractors & manufacturing plants',
    badge: '🏢 B2B NETWORK',
    color: 'indigo'
  },
  {
    id: 'digital_footprint',
    name: 'Digital Footprint Scanner',
    desc: 'Direct WhatsApp communication channels, verified company portals & digital presence',
    badge: '💬 SOCIAL & WA',
    color: 'purple'
  }
];

const SPEED_PRESETS = [
  {
    id: 'hyper_blitz',
    name: '⚡ Hyper-Blitz (2.5s)',
    desc: 'Direct Telecom + Deep SERP cache burst for instant numbers',
    engines: ['direct_telecom', 'deep_serp']
  },
  {
    id: 'precision_grid',
    name: '🎯 Precision Grid (6s)',
    desc: 'Geospatial Radar Mesh + Direct Telecom 5km multi-zone swarm',
    engines: ['geospatial_mesh', 'direct_telecom']
  },
  {
    id: 'full_regional',
    name: '🌪️ Full Multi-Vector Swarm (15s)',
    desc: 'All 5 proprietary intelligence vectors active in parallel',
    engines: ['geospatial_mesh', 'direct_telecom', 'deep_serp', 'b2b_network', 'digital_footprint']
  },
  {
    id: 'auto',
    name: '✨ Autonomous AI Router',
    desc: 'Dynamic vector selection based on prompt category & intent',
    engines: ['auto']
  }
];

function useDebouncedSuggestion(query, onResolve) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const requestRef = useRef(0);
  const controllerRef = useRef(null);
  const resolveRef = useRef(onResolve);
  const lastResolveKey = useRef('');

  useEffect(() => { resolveRef.current = onResolve; }, [onResolve]);

  useEffect(() => {
    const text = String(query || '').trim();

    if (text.length < 2) {
      setResponse(null);
      setLoading(false);
      resolveRef.current?.(null);
      lastResolveKey.current = '';
      return undefined;
    }

    clearTimeout(timer.current);
    const requestId = ++requestRef.current;

    timer.current = setTimeout(async () => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);

      try {
        const data = await suggestSearch({ q: text }, { signal: controller.signal });
        if (requestRef.current !== requestId) return;
        startTransition(() => setResponse(data));

        const resolveKey = `${data?.query || ''}|${data?.ready ? '1' : '0'}`;
        if (resolveKey !== lastResolveKey.current) {
          lastResolveKey.current = resolveKey;
          startTransition(() => resolveRef.current?.(data));
        }
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
        if (requestRef.current === requestId) setResponse(null);
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [query]);

  return { response, loading };
}

function SuggestionList({ groups, active, onPick, onHover }) {
  let index = 0;
  return (
    <div className="v2-suggest-groups">
      <div className="v2-suggest-grid">
        {groups.map(group => {
          if (!group.items.length) return null;
          return (
            <div key={group.title} className="v2-suggest-group">
              <header>
                <group.icon size={12} />
                <span>{group.title}</span>
                <b>{group.items.length}</b>
              </header>
              {group.items.map(item => {
                const itemIndex = index++;
                const isSelected = itemIndex === active;
                return (
                  <button
                    type="button"
                    key={`${item.type}-${item.value}-${item.subtitle || item.display || ''}`}
                    role="option"
                    aria-selected={isSelected}
                    className={cx('v2-suggest-row', isSelected && 'is-active')}
                    onMouseEnter={() => onHover(itemIndex)}
                    onClick={() => onPick(item)}
                  >
                    <span className="v2-suggest-mark">
                      {item.type === 'category' ? <Sparkles size={13} /> : <MapPin size={13} />}
                    </span>
                    <span className="v2-suggest-copy">
                      <div className="v2-suggest-top-line">
                        <b className="v2-suggest-title">{item.label}</b>
                        {item.corrected && (
                          <span className="v2-suggest-tag-corrected">
                            ✨ Corrected
                          </span>
                        )}
                        {item.type === 'location' && item.detail && (
                          <span className={cx('v2-geo-level-badge', `level-${item.detail.toLowerCase()}`)}>
                            {item.detail}
                          </span>
                        )}
                      </div>
                      {item.type === 'category' && item.subtitle && (
                        <small>{item.subtitle}</small>
                      )}
                      {item.type === 'location' && (item.display || item.district) && (
                        <small>{item.display || `${item.mandal ? `${item.mandal}, ` : ''}${item.district}`}</small>
                      )}
                    </span>
                    {item.type === 'category' && item.detail && <span className="v2-suggest-fix">{item.detail}</span>}
                    <ArrowRight size={11} className="v2-suggest-arrow" />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SearchConsole({
  value = '',
  onChange,
  category = '',
  location = '',
  onCategoryChange,
  onLocationChange,
  targetLeads = 100,
  onTargetChange,
  form = {},
  onDeploy,
  onStop,
  busy = false,
  running = false,
  compact = false,
  onResolve,
  onMasterSweep,
  progress = null,
  eta = ''
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [showPrecisionDrawer, setShowPrecisionDrawer] = useState(false);
  const [activePreset, setActivePreset] = useState('auto');
  const [selectedEngines, setSelectedEngines] = useState(form.engines || ['auto']);
  const [radius, setRadius] = useState(form.radius || 5);
  const [etaRemaining, setEtaRemaining] = useState(38);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Sync draft with incoming value prop
  useEffect(() => { setDraft(value || ''); }, [value]);

  const { response, loading } = useDebouncedSuggestion(draft, onResolve);

  // Extract real-time semantic parsing output
  const parsed = response?.parsed || null;
  const parsedCategory = parsed?.category || response?.category?.value || category || '';
  const parsedLocation = parsed?.location || response?.location?.value || location || '';
  const parsedZones = parsed?.zonesCount || (response?.location ? 1 : 0);
  const expectedLeads = parsed?.expectedLeads || (parsedCategory && parsedLocation ? '120–240+ verified leads' : 'Type service & location');

  const locClassification = response?.locationClassification || response?.parsed?.locationClassification || null;
  const autocorrectItem = useMemo(() => {
    const list = response?.suggestions || [];
    return list.find(item => item.corrected) || null;
  }, [response]);

  const estimatedTimeText = useMemo(() => {
    const zones = locClassification?.zoneCount || parsedZones || 1;
    if (zones <= 1) return '~25–40s';
    if (zones <= 5) return '~1.5–2 min';
    if (zones <= 15) return '~3–5 min';
    return '~8–12 min (Full Sweep)';
  }, [locClassification, parsedZones]);

  // Push detected category & location back to parent form if available
  useEffect(() => {
    if (parsedCategory && parsedCategory !== category) onCategoryChange?.(parsedCategory);
    if (parsedLocation && parsedLocation !== location) onLocationChange?.(parsedLocation);
  }, [parsedCategory, parsedLocation]);

  // Dynamic Animated Favicon State Sync
  useEffect(() => {
    if (running) {
      setDynamicFaviconState('scraping');
    } else {
      setDynamicFaviconState('idle');
    }
  }, [running]);

  // Live countdown timer for estimated harvest time
  useEffect(() => {
    if (!running) {
      setEtaRemaining(Math.max(12, (parsedZones || 12) * 3));
      return;
    }
    const timer = setInterval(() => {
      setEtaRemaining(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running, parsedZones]);

  const groups = useMemo(() => {
    const list = response?.suggestions || [];
    return [
      {
        title: 'SERVICES & SPECIALTIES',
        icon: Sparkles,
        items: list.filter(item => item.type === 'category')
      },
      {
        title: 'CITIES, MANDALS & WARDS',
        icon: MapPin,
        items: list.filter(item => item.type === 'location')
      }
    ];
  }, [response]);

  const visible = useMemo(() => groups.flatMap(group => group.items), [groups]);

  useEffect(() => { setActive(0); }, [visible.length]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parentTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(parentTimerRef.current), []);

  const handleQuery = useCallback(text => {
    setDraft(text);
    setOpen(true);
    clearTimeout(parentTimerRef.current);
    parentTimerRef.current = setTimeout(() => {
      startTransition(() => {
        onChange?.(text);
      });
    }, 60);
  }, [onChange]);

  const toggleVector = useCallback(vectorId => {
    setSelectedEngines(prev => {
      let next;
      if (prev.includes('auto')) {
        next = [vectorId];
      } else if (prev.includes(vectorId)) {
        next = prev.filter(id => id !== vectorId);
        if (!next.length) next = ['auto'];
      } else {
        next = [...prev, vectorId];
      }
      setActivePreset(next.length === 1 && next[0] === 'auto' ? 'auto' : 'custom');
      return next;
    });
  }, []);

  const applyPreset = useCallback(preset => {
    setActivePreset(preset.id);
    setSelectedEngines(preset.engines);
  }, []);

  const choose = useCallback(item => {
    if (!item) return;
    if (item.type === 'category') {
      const loc = parsedLocation || location;
      const updated = loc ? `${item.value} in ${loc}` : item.value;
      setDraft(updated);
      onChange?.(updated);
      onCategoryChange?.(item.value);
    } else if (item.type === 'location') {
      const cat = parsedCategory || category;
      const updated = cat ? `${cat} in ${item.value}` : item.value;
      setDraft(updated);
      onChange?.(updated);
      onLocationChange?.(item.value);
    }
    setOpen(false);
    inputRef.current?.focus();
  }, [parsedCategory, parsedLocation, category, location, onChange, onCategoryChange, onLocationChange]);

  const onKeyDown = useCallback(event => {
    if (!open || !visible.length) {
      if (event.key === 'ArrowDown') {
        setOpen(true);
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(prev => (prev + 1) % visible.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(prev => (prev - 1 + visible.length) % visible.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (visible[active]) choose(visible[active]);
      else setOpen(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }, [open, visible, active, choose]);

  const isWideAreaBlocked = !onMasterSweep && (locClassification?.type === 'district' || locClassification?.type === 'state');
  const canDeploy = Boolean(parsedCategory || draft.trim().length >= 3) && !isWideAreaBlocked;

  const submit = useCallback((overrideQuery = null) => {
    if (running) {
      onStop?.();
      return;
    }
    const currentDraft = typeof overrideQuery === 'string' ? overrideQuery : draft;
    if (isWideAreaBlocked) {
      toast.error(`Client searches are restricted to individual cities and mandals. District and state-wide sweeps (${locClassification?.name || ''}) require Master Command Center. Choose an individual city or mandal below!`);
      return;
    }
    if ((!canDeploy && !overrideQuery) || busy) return;
    setOpen(false);
    onDeploy?.({
      query: currentDraft,
      category: parsedCategory,
      location: parsedLocation,
      radius,
      engines: selectedEngines,
      targetLeads
    });
  }, [running, canDeploy, busy, isWideAreaBlocked, locClassification, onStop, onDeploy, draft, parsedCategory, parsedLocation, radius, selectedEngines, targetLeads]);

  // Listen for companion mascot searches ("Diggy intelligent relative search")
  useEffect(() => {
    const handleMascotSearch = (e) => {
      const q = e?.detail?.query;
      if (q) {
        setDraft(q);
        onChange?.(q);
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputRef.current?.focus();
        setTimeout(() => {
          submit(q);
        }, 400);
      }
    };
    window.addEventListener('leadharvest:search', handleMascotSearch);
    return () => window.removeEventListener('leadharvest:search', handleMascotSearch);
  }, [onChange, submit]);

return (
  <section ref={wrapRef} className={cx('v2-console', 'is-unified', (running || compact) && 'is-compact')}>
    <div className="v2-console-aura" aria-hidden="true" />
    <div className="v2-console-scan" aria-hidden="true" />

    {/* Top Header Strip */}
    <div className="v2-console-head">
      <div className="v2-console-live">
        <Mascot
          mode={running ? 'sprint' : isWideAreaBlocked ? 'dig' : 'idle'}
          size={36}
          className="v2-console-head-mascot"
        />
        <i />
        <span>AUTONOMOUS MULTI-VECTOR INTELLIGENCE CORE</span>
        <b>619,287 VILLAGES & MANDALS INDEXED</b>
      </div>
      <div className="v2-console-head-actions">
        <button
          type="button"
          className={cx('v2-engine-toggle-pill', showPrecisionDrawer && 'is-open')}
          onClick={() => setShowPrecisionDrawer(prev => !prev)}
          title="Configure Precision Radius, Vectors & Target Speed"
        >
          <SlidersHorizontal size={12} />
          <span>Precision & Tuning: <b>{radius}km Radius · {selectedEngines.includes('auto') ? 'Auto AI' : `${selectedEngines.length} Vectors`}</b></span>
          {showPrecisionDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
    </div>

    {/* Expandable Precision Matrix Drawer */}
    {showPrecisionDrawer && (
      <div className="v2-engine-drawer">
        <div className="v2-engine-drawer-header">
          <span className="v2-drawer-title"><Cpu size={13} /> PROPRIETARY MULTI-VECTOR INTELLIGENCE GRID</span>
          <div className="v2-speed-presets">
            {SPEED_PRESETS.map(preset => (
              <button
                type="button"
                key={preset.id}
                className={cx('v2-speed-preset-btn', activePreset === preset.id && 'is-active')}
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Proprietary Vector Cards (Zero 3rd-Party Names) */}
        <div className="v2-engine-cards-grid">
          {PROPRIETARY_VECTORS.map(vector => {
            const active = selectedEngines.includes('auto') || selectedEngines.includes(vector.id);
            return (
              <button
                type="button"
                key={vector.id}
                className={cx('v2-engine-card', active && 'is-selected', `theme-${vector.color}`)}
                onClick={() => toggleVector(vector.id)}
              >
                <div className="v2-engine-card-top">
                  <span className="v2-engine-badge">{vector.badge}</span>
                  <span className={cx('v2-engine-checkbox', active && 'is-checked')}>
                    {active && <Check size={11} />}
                  </span>
                </div>
                <b className="v2-engine-name">{vector.name}</b>
                <small className="v2-engine-desc">{vector.desc}</small>
              </button>
            );
          })}
        </div>

        {/* Tuning Sliders: Radius Sweep + Target Leads */}
        <div className="v2-tuning-bar">
          <div className="v2-tuning-control">
            <span className="v2-tuning-label">
              <Compass size={12} /> SWEEP RADIUS PER CONSTITUENT POINT: <b>{radius} KM</b>
            </span>
            <div className="v2-radius-slider-wrap">
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="v2-radius-slider"
              />
              <div className="v2-radius-ticks">
                <span>1 km (Hyperlocal)</span>
                <span className="is-mid">5 km (Benchmark)</span>
                <span>15 km (Suburbs)</span>
                <span>25 km (District)</span>
              </div>
            </div>
          </div>

          <div className="v2-tuning-control">
            <span className="v2-tuning-label">
              <Target size={12} /> TARGET LEADS HARVEST:
            </span>
            <div className="v2-adv-chips">
              {TARGETS.map(t => (
                <button
                  type="button"
                  key={t}
                  className={cx('v2-adv-chip', Number(targetLeads) === t && 'is-on')}
                  onClick={() => onTargetChange?.(t)}
                >
                  {Number(targetLeads) === t && <Check size={10} />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* The Unified Omnibox Field */}
    <div className="v2-console-field">
      <div className={cx('v2-console-bar', open && visible.length > 0 && 'is-open', parsed && 'is-ready')}>
        <span className="v2-console-glyph"><Search size={20} /></span>
        <input
          ref={inputRef}
          id="cmd-console-query"
          className="v2-console-input"
          value={draft}
          onChange={event => handleQuery(event.target.value)}
          onFocus={() => {
            setOpen(true);
            window.dispatchEvent(new CustomEvent('leadharvest:search-focus'));
          }}
          onKeyDown={onKeyDown}
          placeholder="Type anything (e.g. urgent wedding photographers near benz circle vijayawada under 5km with phone)..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {loading && <Loader2 size={16} className="v2-spin v2-console-loading" />}
        {!loading && draft && (
          <button
            type="button"
            className="v2-console-clear"
            onClick={() => { handleQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear query"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          className={cx(
            'v2-console-go',
            'v2-btn-deploy-3d',
            running && 'is-stop',
            busy && 'is-busy',
            isWideAreaBlocked && 'is-blocked'
          )}
          onClick={submit}
          disabled={busy || (!running && !canDeploy)}
          title={isWideAreaBlocked ? 'Wide-area sweeps require Master Command Center. Please pick an individual city or mandal.' : undefined}
        >
          <span className="v2-btn-shimmer" />
          {busy
            ? <Loader2 size={16} className="v2-spin" />
            : running
              ? <Square size={14} />
              : isWideAreaBlocked
                ? <AlertTriangle size={15} />
                : <Zap size={16} />}
          <span>{busy ? 'STARTING...' : running ? 'STOP SWARM' : isWideAreaBlocked ? 'SELECT CITY / MANDAL' : 'DEPLOY INTELLIGENCE SWARM'}</span>
        </button>
      </div>

      {/* Suggestion Dropdown */}
      {open && visible.length > 0 && (
        <div className="v2-suggest" role="listbox">
          <SuggestionList
            groups={groups}
            active={active}
            onPick={choose}
            onHover={setActive}
          />
          <footer className="v2-suggest-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
            {loading && <span className="v2-suggest-loading"><Loader2 size={10} className="v2-spin" /> searching index</span>}
          </footer>
        </div>
      )}
    </div>

    {/* Autocorrect Intelligence Pill */}
    {autocorrectItem && (
      <div className="v2-autocorrect-banner">
        <Sparkles size={13} className="v2-text-cyan" />
        <span>Intelligent Auto-Correction:</span>
        <button type="button" className="v2-autocorrect-pill" onClick={() => choose(autocorrectItem)}>
          <span>Did you mean <b>{autocorrectItem.label}</b>?</span>
          <Check size={11} />
        </button>
      </div>
    )}

    {/* Live Semantic Parsing Intent HUD (Real-Time Feedback) */}
    <div className="v2-intent-hud">
      <div className="v2-hud-chips">
        <div className={cx('v2-hud-chip chip-category', parsedCategory && 'is-locked')}>
          <Sparkles size={11} className="v2-text-cyan" />
          <span>Service:</span>
          <b>{parsedCategory || 'Type what you need...'}</b>
        </div>

        <div className={cx('v2-hud-chip chip-location', parsedLocation && 'is-locked')}>
          <MapPin size={11} className="v2-text-lime" />
          <span>Locality:</span>
          <b>{parsedLocation || 'Type location...'}</b>
          {parsedZones > 1 && <span className="v2-hud-badge">{parsedZones} ZONES</span>}
        </div>

        <div className="v2-hud-chip chip-radius">
          <Compass size={11} className="v2-text-amber" />
          <span>Sweep:</span>
          <b>{radius} km Radius</b>
        </div>

        <div className="v2-hud-chip chip-vectors">
          <Cpu size={11} className="v2-text-violet" />
          <span>Vectors:</span>
          <b>{selectedEngines.includes('auto') ? 'Autonomous Swarm' : `${selectedEngines.length} Active`}</b>
        </div>

        {parsed?.modifiers?.phoneOnly && (
          <div className="v2-hud-chip chip-filter">
            <Phone size={10} className="v2-text-lime" />
            <b>Verified Mobiles Only</b>
          </div>
        )}

        {parsed?.modifiers?.urgent && (
          <div className="v2-hud-chip chip-filter is-urgent">
            <Zap size={10} className="v2-text-amber" />
            <b>24/7 Emergency Priority</b>
          </div>
        )}

        {parsed?.modifiers?.isB2B && (
          <div className="v2-hud-chip chip-filter is-b2b">
            <ShieldCheck size={10} className="v2-text-cyan" />
            <b>B2B & Wholesale Mode</b>
          </div>
        )}

        {locClassification && (
          <div className={cx('v2-hud-chip chip-geo-intel', 'type-' + locClassification.type)}>
            <span className="v2-geo-badge-tag">{locClassification.badge || '🗺️ GEO'}</span>
            <span>Hierarchy:</span>
            <b>{locClassification.name}</b>
            <span className="v2-geo-sub-count">({locClassification.zoneCount} {locClassification.type === 'state' ? 'districts' : 'mandals'})</span>
            {onMasterSweep && (locClassification.type === 'district' || locClassification.type === 'state' || locClassification.type === 'mandal') && (
              <button
                type="button"
                className="v2-hud-sweep-btn"
                onClick={() => onMasterSweep({
                  category: parsedCategory || category,
                  name: locClassification.name,
                  scope: locClassification.type,
                  engines: selectedEngines
                })}
                title={'Launch full ' + locClassification.type + ' master sweep'}
              >
                <Compass size={11} /> Sweep Entire {locClassification.type === 'state' ? 'State' : locClassification.type === 'district' ? 'District' : 'Mandal'}
              </button>
            )}
          </div>
        )}

        <div className="v2-hud-chip chip-time">
          <Clock size={11} className="v2-text-amber" />
          <span>Est. Scrape:</span>
          <b>{estimatedTimeText}</b>
        </div>

        <div className="v2-hud-chip chip-forecast">
          <span className="v2-pulse-dot" />
          <span>Yield Forecast:</span>
          <b className="v2-text-lime">{expectedLeads}</b>
        </div>
      </div>
    </div>

      {/* Client Restriction Alert: Suggest Individual Cities & Mandals */}
      {isWideAreaBlocked && (
        <div className="v2-widearea-block-box">
          <div className="v2-widearea-flex">
            <Mascot
              mode="dig"
              size={54}
              className="v2-widearea-mascot"
              bubbleText={`I scout single cities! Pick one below ⬇`}
            />
            <div className="v2-widearea-block-body">
              <div className="v2-widearea-block-head">
                <AlertTriangle size={15} className="v2-text-amber" />
                <span>
                  <b>Client search is restricted to individual cities and mandals only.</b>{' '}
                  District &amp; state-wide sweeps require Master Command Center. Choose an individual city or mandal in {locClassification?.name}:
                </span>
              </div>
              <div className="v2-widearea-subzones-pills">
                {(locClassification?.subzones || []).slice(0, 12).map(sz => (
                  <button
                    type="button"
                    key={typeof sz === 'string' ? sz : sz.name}
                    className="v2-subzone-pill"
                    onClick={() => {
                      const szName = typeof sz === 'string' ? sz : sz.name;
                      const cat = parsedCategory || category || 'Businesses';
                      const updated = `${cat} in ${szName}`;
                      setDraft(updated);
                      onChange?.(updated);
                      onLocationChange?.(szName);
                    }}
                  >
                    <MapPin size={11} />
                    <span>{typeof sz === 'string' ? sz : sz.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    {/* Live Swarm Harvesting HUD & ETA (Active when running) */}
    {running && (
      <div className="v2-swarm-live-hud">
        <div className="v2-swarm-live-left">
          <Mascot mode="sprint" size={50} className="v2-hud-mascot" />
          <span className="v2-swarm-pulse-ring" />
          <div className="v2-swarm-live-info">
            <span className="v2-swarm-live-title">
              DIGGY INTELLIGENCE SWARM ACTIVE · SWEEPING {parsedZones > 1 ? `${parsedZones} CONSTITUENT RADAR ZONES` : 'GEOSPATIAL COORDINATES'}
            </span>
            <div className="v2-swarm-live-meta">
              <span>📍 {parsedLocation || location || 'Target Locality'} ({radius}km radius per zone)</span>
              <span>•</span>
              <span>⚡ Real-Time Streaming Ingestion</span>
            </div>
          </div>
        </div>
        <div className="v2-swarm-live-right">
          <div className="v2-swarm-eta-chip">
            <Clock size={12} className="v2-text-amber" />
            <span>EST. HARVEST TIME:</span>
            <b>{eta || (progress?.eta ? `${progress.eta}` : `~${etaRemaining}s remaining`)}</b>
          </div>
          <div className="v2-swarm-throughput-chip">
            <Zap size={12} className="v2-text-lime" />
            <b>~18–24 leads/sec</b>
          </div>
        </div>
      </div>
    )}

    {/* Quick Example Pills */}
    {!running && (
      <div className="v2-console-examples">
        <span>POPULAR PROMPTS</span>
        {EXAMPLES.map(example => (
          <button
            type="button"
            key={example}
            className={cx(draft === example && 'is-active')}
            onClick={() => { handleQuery(example); inputRef.current?.focus(); }}
          >
            {example}
          </button>
        ))}
      </div>
    )}
  </section>
);
}
