import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Cpu, Globe, Layers, Loader2,
  MapPin, Phone, Search, Sliders, SlidersHorizontal, Sparkles, Square, Target, Wand2, X, Zap,
  Compass, ShieldCheck
} from 'lucide-react';
import { SignalOrb } from '@ui3d';
import { setDynamicFaviconState } from '../utils/dynamicFavicon';
import { suggestSearch } from './api';
import { cx } from './ui';
import { tokenizeQuery, matchesFolder } from '../utils/universalSearchEngine';
import { parseQuerySemantic } from './utils/semanticClient';
import { examplesFor, placeholderFor, scopeHintFor } from './data/searchExamples';

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

const localSuggestCache = new Map();
const MAX_LOCAL_CACHE = 300;

function useDebouncedSuggestion(query, onResolve, country = 'IN') {
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

    const cacheKey = `${String(country || 'IN').toUpperCase()}|${text.toLowerCase()}`;
    if (localSuggestCache.has(cacheKey)) {
      const cached = localSuggestCache.get(cacheKey);
      setResponse(cached);
      setLoading(false);
      const resolveKey = `${cached?.query || ''}|${cached?.ready ? '1' : '0'}`;
      if (resolveKey !== lastResolveKey.current) {
        lastResolveKey.current = resolveKey;
        resolveRef.current?.(cached);
      }
      return undefined;
    }

    // Instant on-device semantic evaluation (<0.5ms) via Web Worker
    parseQuerySemantic(text, country).then(localParsed => {
      if (localParsed && localParsed.ready) {
        startTransition(() => {
          setResponse(prev => {
            if (!prev || !prev.ready) {
              return {
                ok: true,
                query: text,
                ready: true,
                category: localParsed.category,
                location: localParsed.location,
                parsed: localParsed,
                suggestions: []
              };
            }
            return prev;
          });
        });
        const resolveKey = `${text}|1`;
        if (resolveKey !== lastResolveKey.current) {
          lastResolveKey.current = resolveKey;
          startTransition(() => {
            resolveRef.current?.({
              ok: true,
              query: text,
              ready: true,
              category: localParsed.category,
              location: localParsed.location,
              parsed: localParsed
            });
          });
        }
      }
    }).catch(() => {});

    clearTimeout(timer.current);
    const requestId = ++requestRef.current;

    timer.current = setTimeout(async () => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);

      try {
        const data = await suggestSearch({ q: text, isMaster: false, country }, { signal: controller.signal });
        if (requestRef.current !== requestId) return;

        // Cache result for ultra-fast 0ms backspace & repeat keystrokes
        if (data) {
          localSuggestCache.set(cacheKey, data);
          if (localSuggestCache.size > MAX_LOCAL_CACHE) {
            const oldestKey = localSuggestCache.keys().next().value;
            localSuggestCache.delete(oldestKey);
          }
        }

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
  }, [query, country]);

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
                            {item.detail === 'Mandal' ? '📍 Mandal Swarm'
                              : item.detail === 'City' ? '🏙️ City Sweep'
                              : item.detail === 'Village' ? '🏡 Village'
                              : item.detail === 'District' ? '🏛️ District Sweep'
                              : item.detail === 'State' ? '🗺️ State Sweep'
                              : item.detail === 'County' ? '🏛️ County Sweep'
                              : item.detail === 'Province' ? '🗺️ Province Sweep'
                              : item.detail}
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

function SearchConsole({
  value = '',
  onChange,
  country = 'IN',
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
  eta = '',
  runs = [],
  onOpenFolder
}) {
  const [draft, setDraft] = useState(value);
  const deferredDraft = React.useDeferredValue(draft);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [activePreset, setActivePreset] = useState('auto');
  const [selectedEngines, setSelectedEngines] = useState(form.engines || ['auto']);
  const [radius, setRadius] = useState(form.radius || 5);
  const [coverageMode, setCoverageMode] = useState(form.coverageMode === 'fast' ? 'fast' : 'deep');
  const [etaRemaining, setEtaRemaining] = useState(38);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const isFocusedRef = useRef(false);
  const lastEmittedValueRef = useRef(value);

  // Global / and Ctrl+K shortcut to focus search console
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Sync draft with incoming value prop only when not actively typing
  useEffect(() => {
    if (!isFocusedRef.current || value !== lastEmittedValueRef.current) {
      setDraft(value || '');
      lastEmittedValueRef.current = value;
    }
  }, [value]);

  const { response, loading } = useDebouncedSuggestion(deferredDraft, onResolve, country);

  // Check if draft matches any saved vault folder for instant shortcut
  const matchedSavedFolder = useMemo(() => {
    if (!deferredDraft || deferredDraft.trim().length < 3 || !runs || !runs.length) return null;
    const tokens = tokenizeQuery(deferredDraft);
    if (!tokens.length) return null;
    return runs.find(r => {
      const match = matchesFolder(r, tokens, deferredDraft);
      return match.matches && (r.leadCount || 0) > 0;
    }) || null;
  }, [deferredDraft, runs]);

  // Extract real-time semantic parsing output
  const parsed = response?.parsed || null;
  const parsedCategory = parsed?.category || (response?.category && !response?.category?.corrected ? response.category.value : '') || category || '';
  const parsedLocation = parsed?.location || response?.location?.value || location || '';
  const parsedZones = parsed?.zonesCount || (response?.location ? 1 : 0);
  const expectedLeads = parsed?.expectedLeads || (parsedCategory && parsedLocation ? '120–240+ verified leads' : 'Type service & location');

  const locClassification = response?.locationClassification || response?.parsed?.locationClassification || null;
  const autocorrectItem = useMemo(() => {
    // Only surface auto-correction if server identified a true typo and provided didYouMean
    if (!response?.didYouMean) return null;
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

  // One example set per market. Switching country swaps both the placeholder
  // and the quick-pick strip, so an American never sees a Vijayawada example.
  const market = useMemo(() => examplesFor(country), [country]);
  const examples = market.prompts;
  const scopeHint = useMemo(() => scopeHintFor(country), [country]);

  // The placeholder rotates through the market's examples while the field is
  // empty and unfocused. A static "Type anything" is noise; a real query the
  // user can run with one click is a shortcut.
  const [exampleIndex, setExampleIndex] = useState(0);
  useEffect(() => {
    setExampleIndex(0);
  }, [country]);
  useEffect(() => {
    if (draft || isFocusedRef.current) return undefined;
    const timer = setInterval(() => {
      setExampleIndex(index => (index + 1) % examples.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [draft, examples.length]);

  const placeholderText = useMemo(() => {
    if (!draft && !isFocusedRef.current) {
      return placeholderFor(country).replace(market.prompts[0], examples[exampleIndex]);
    }
    return placeholderFor(country);
  }, [country, market, examples, exampleIndex, draft]);

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
    const locationItems = list.filter(item => item.type === 'location');
    const categoryItems = list.filter(item => item.type === 'category' || item.detail === 'VERIFIED' || item.detail === 'AC HALLS' || item.detail === 'HERITAGE' || item.detail === 'BANQUETS' || (!item.type && item.label));

    // Also include territorial options from disambiguation
    const disambiguationItems = (response?.disambiguation?.options || [])
      .map(opt => ({
        type: 'location',
        value: opt.value,
        label: opt.value,
        display: `${opt.value}, ${opt.state || 'India'}`,
        subtitle: `${opt.detail} · ${opt.state || ''}`,
        detail: opt.detail,
        level: opt.level
      }));

    const mergedLocations = [...locationItems];
    for (const d of disambiguationItems) {
      if (!mergedLocations.some(m => m.value.toLowerCase() === d.value.toLowerCase())) {
        mergedLocations.push(d);
      }
    }

    return [
      {
        title: 'CITIES, MANDALS, DISTRICTS & STATES',
        icon: MapPin,
        items: mergedLocations
      },
      {
        title: 'SERVICES & SPECIALTIES',
        icon: Sparkles,
        items: categoryItems
      }
    ];
  }, [response]);

  const visible = useMemo(() => groups.flatMap(group => group.items), [groups]);

  useEffect(() => { setActive(-1); }, [visible.length]);

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
    isFocusedRef.current = true;
    setDraft(text);
    setOpen(true);
    lastEmittedValueRef.current = text;
    clearTimeout(parentTimerRef.current);
    parentTimerRef.current = setTimeout(() => {
      startTransition(() => {
        onChange?.(text);
      });
    }, 280);
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
    } else if (item.label) {
      setDraft(item.label);
      onChange?.(item.label);
    }
    setOpen(false);
    inputRef.current?.focus();
  }, [parsedCategory, parsedLocation, category, location, onChange, onCategoryChange, onLocationChange]);

  const canDeploy = Boolean(parsedCategory || draft.trim().length >= 3);

  const submit = useCallback((overrideQuery = null) => {
    if (running) {
      onStop?.();
      return;
    }
    // Priority 1: Explicit override (from clicking suggestion or chip)
    // Priority 2: User's exact typed draft!
    const currentDraft = typeof overrideQuery === 'string'
      ? overrideQuery.trim()
      : draft.trim();

    if ((!canDeploy && !overrideQuery) || busy || !currentDraft) return;
    if (parsedCategory) onCategoryChange?.(parsedCategory);
    if (parsedLocation) onLocationChange?.(parsedLocation);
    setOpen(false);
    onDeploy?.({
      query: currentDraft,
      category: parsedCategory,
      location: parsedLocation,
      radius,
      engines: selectedEngines,
      targetLeads,
      coverageMode
    });
  }, [running, canDeploy, busy, locClassification, onStop, onDeploy, draft, parsedCategory, parsedLocation, radius, selectedEngines, targetLeads, coverageMode]);

  const onKeyDown = useCallback(event => {
    if (!open || !visible.length) {
      if (event.key === 'ArrowDown') {
        setOpen(true);
        event.preventDefault();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        submit();
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
      if (active >= 0 && visible[active]) {
        choose(visible[active]);
      } else {
        setOpen(false);
        submit();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }, [open, visible, active, choose, submit]);

  // Listen for suggestion clicks coming from other surfaces.
  useEffect(() => {
    const handleSuggestionSearch = (e) => {
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
    window.addEventListener('leadharvest:search', handleSuggestionSearch);
    return () => window.removeEventListener('leadharvest:search', handleSuggestionSearch);
  }, [onChange, submit]);

  return (
    <section ref={wrapRef} className={cx('v2-console', 'is-unified', (running || compact) && 'is-compact')}>
      <div className="v2-console-aura" aria-hidden="true" />
      <div className="v2-console-scan" aria-hidden="true" />

      {/* The Unified Autonomous Omnibox Field */}
      <div className="v2-console-field">
        <div className={cx('v2-console-bar', open && visible.length > 0 && 'is-open', parsed && 'is-ready')}>
          <span className="v2-console-glyph"><Search size={20} /></span>
          <input
            ref={inputRef}
            id="cmd-console-query"
            className="v2-console-input"
            style={{ color: 'var(--gb-ink, #232c1c)', WebkitTextFillColor: 'var(--gb-ink, #232c1c)', caretColor: 'var(--gb-green-deep, #4f6619)', background: 'transparent' }}
            value={draft}
            onChange={event => handleQuery(event.target.value)}
            onFocus={() => {
              isFocusedRef.current = true;
              if (draft.trim().length >= 2) setOpen(true);
              window.dispatchEvent(new CustomEvent('leadharvest:search-focus'));
            }}
            onBlur={() => {
              setTimeout(() => { isFocusedRef.current = false; }, 200);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholderText}
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
              busy && 'is-busy'
            )}
            onClick={submit}
            disabled={busy || (!running && !canDeploy)}
          >
            <span className="v2-btn-shimmer" />
            {busy
              ? <Loader2 size={16} className="v2-spin" />
              : running
                ? <Square size={14} />
                : <Zap size={16} />}
            <span>
              {busy
                ? 'STARTING...'
                : running
                  ? `STOP (${Number(progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0)}/${Number(progress?.totalMandalsAcrossAll || progress?.totalMandals || parsedZones || 1)})`
                  : locClassification?.type === 'district'
                    ? 'SWEEP DISTRICT'
                    : locClassification?.type === 'state'
                      ? 'SWEEP STATE'
                      : 'FIND LEADS'}
            </span>
          </button>
        </div>

        {/* Suggestion Dropdown */}
        {open && (visible.length > 0 || matchedSavedFolder) && (
          <div className="v2-suggest" role="listbox">
            {matchedSavedFolder && (
              <div
                className="v2-suggest-vault-bridge"
                onClick={() => {
                  setOpen(false);
                  onOpenFolder?.(matchedSavedFolder);
                }}
              >
                <div className="v2-vault-bridge-info">
                  <span className="v2-vault-badge">📁 SAVED VAULT MATCH</span>
                  <b>{matchedSavedFolder.name || `${matchedSavedFolder.category} in ${matchedSavedFolder.location}`}</b>
                  <small>{matchedSavedFolder.leadCount || 0} leads ready ({matchedSavedFolder.phoneCount || 0} mobiles)</small>
                </div>
                <button type="button" className="v2-btn-open-vault">
                  Open Folder <ArrowRight size={12} />
                </button>
              </div>
            )}
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
      {((response?.query && response?.ready && response.query.toLowerCase() !== draft.trim().toLowerCase()) || autocorrectItem) && (
        <div className="v2-autocorrect-banner">
          <Sparkles size={13} className="v2-text-cyan" />
          <span>Intelligent Auto-Correction:</span>
          <button
            type="button"
            className="v2-autocorrect-pill"
            onClick={() => {
              const cleanTarget = response?.ready && response?.query ? response.query : (autocorrectItem ? autocorrectItem.label : draft);
              setDraft(cleanTarget);
              onChange?.(cleanTarget);
              if (response?.category?.value) onCategoryChange?.(response.category.value);
              if (response?.location?.value) onLocationChange?.(response.location.value);
            }}
          >
            <span>Did you mean <b>{response?.ready && response?.query ? response.query : autocorrectItem?.label}</b>?</span>
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
            <span>Location:</span>
            <b>{parsedLocation || 'Type location...'}</b>
            {parsedZones > 1 && <span className="v2-hud-badge">{parsedZones} ZONES</span>}
            {parsed?.coverageKind === 'whole-city' && (
              <span className="v2-hud-badge is-ring" title="Searches the whole city plus a 5 km ring around it">
                +5 KM RING
              </span>
            )}
          </div>

          <div className="v2-hud-chip chip-radius">
            <Compass size={11} className="v2-text-amber" />
            <span>Sweep:</span>
            <b>{radius} km Radius</b>
          </div>

          <div className="v2-hud-chip chip-vectors">
            <Cpu size={11} className="v2-text-violet" />
            <span>Engines:</span>
            <b>{selectedEngines.includes('auto') ? 'Automatic' : `${selectedEngines.length} selected`}</b>
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
              <span className="v2-geo-sub-count">({locClassification.zoneCount} {locClassification.type === 'state' ? 'districts' : locClassification.type === 'district' ? 'mandals' : 'zones'})</span>
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
                  <Compass size={11} /> Sweep Entire {locClassification.type === 'state' ? 'State' : locClassification.type === 'district' ? 'District' : 'Territory'}
                </button>
              )}
            </div>
          )}

          <div className="v2-hud-chip chip-time">
            <Clock size={11} className="v2-text-amber" />
            <span>Est. time:</span>
            <b>{estimatedTimeText}</b>
          </div>

          <div className="v2-hud-chip chip-forecast">
            <span className="v2-pulse-dot" />
            <span>Yield Forecast:</span>
            <b className="v2-text-lime">{expectedLeads}</b>
          </div>
        </div>
      </div>

      {/* Territorial Subzones Quick-Pills (Optional quick selection) */}
      {(locClassification?.type === 'district' || locClassification?.type === 'state') && (locClassification?.subzones || []).length > 0 && (
        <div className="v2-widearea-block-box">
          <div className="v2-widearea-flex">
            <SignalOrb
              size={40}
              tone="#10b981"
              title="Territorial sweep enabled"
            />
            <div className="v2-widearea-block-body">
              <div className="v2-widearea-block-head">
                <Compass size={15} className="v2-text-emerald" />
                <span>
                  <b>Territorial Swarm Enabled:</b> Sweeping all constituent centers in {locClassification?.name}. Or click to narrow to an individual town:
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
            <SignalOrb
              size={40}
              live
              tone="#5eead4"
              title="Live search running"
              style={{ marginRight: 12 }}
            />
            <span className="v2-swarm-pulse-ring" />
            <div className="v2-swarm-live-info">
              <span className="v2-swarm-live-title">
                SEARCHING {parsedZones > 1 ? `${parsedZones} AREAS` : 'THIS AREA'} · FINDING LEADS
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
          <span>TRY · {market.label.toUpperCase()}</span>
          <span className="v2-console-scope" title="You can search any of these places">
            {scopeHint}
          </span>
          {examples.map(example => (
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

export default React.memo(SearchConsole);
