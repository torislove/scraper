import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Check, Clock, Cpu, FolderOpen, Globe, Layers, Loader2, MapPin, Phone, Search,
  Shield, Sparkles, Square, Tag, TrendingUp, X, Zap
} from 'lucide-react';
import { suggestSearch, sendSearchFeedback } from './api';
import { cx } from './ui';
import { examplesFor, omniExamplesFor, GLOBAL_11_COUNTRY_TICKER, industryClustersFor } from './data/searchExamples';
import {
  detectDeviceHardware, DEVICE_REQUIREMENTS, ALL_BUILTIN_ENGINES
} from './utils/deviceRamEngine';

function useTypewriterPlaceholder(examples, active) {
  const [text, setText] = useState('');
  const listKey = useMemo(() => (examples || []).join('|'), [examples]);

  useEffect(() => {
    const items = Array.isArray(examples) && examples.length ? examples : ['Computer shops in Hyderabad'];
    if (!active) {
      setText(`Search anywhere in 11 countries — Type service in place: e.g. ${items[0]}`);
      return undefined;
    }
    let idx = 0;
    let char = 0;
    let deleting = false;
    let holdTicks = 0;
    const timer = setInterval(() => {
      const target = items[idx % items.length] || '';
      if (holdTicks > 0) {
        holdTicks -= 1;
        return;
      }
      if (!deleting) {
        char += 1;
        setText(`Search anywhere in 11 countries — Type service in place: e.g. ${target.slice(0, char)}|`);
        if (char >= target.length) {
          deleting = true;
          holdTicks = 24;
        }
      } else {
        char -= 2;
        if (char <= 0) {
          char = 0;
          deleting = false;
          idx = (idx + 1) % items.length;
        }
        setText(`Search anywhere in 11 countries — Type service in place: e.g. ${target.slice(0, Math.max(0, char))}|`);
      }
    }, 48);
    return () => clearInterval(timer);
  }, [listKey, active]);

  return text;
}

// Instant 0ms client-side LRU cache for backspace and repeat keystrokes
const suggestCache = new Map();
const MAX_CACHE = 300;
const RECENT_KEY = 'scraper_recent_searches_v1';

function loadRecent(country) {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
    const list = raw[String(country || 'IN').toUpperCase()];
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch (e) {
    return [];
  }
}

function saveRecent(country, query) {
  const clean = String(query || '').trim();
  if (clean.length < 3) return;
  try {
    const code = String(country || 'IN').toUpperCase();
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
    const prev = Array.isArray(raw[code]) ? raw[code] : [];
    const next = [clean, ...prev.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    raw[code] = next;
    localStorage.setItem(RECENT_KEY, JSON.stringify(raw));
  } catch (e) { }
}

// Google-style match highlighting inside dropdown rows
function HighlightedLabel({ text, query }) {
  const str = String(text || '');
  const tokens = String(query || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length >= 2 && !['in', 'at', 'near', 'for', 'of'].includes(t));

  if (!tokens.length) return <>{str}</>;

  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const parts = str.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, idx) =>
        tokens.some(t => part.toLowerCase() === t)
          ? <mark key={idx} className="lx-hl">{part}</mark>
          : <React.Fragment key={idx}>{part}</React.Fragment>
      )}
    </>
  );
}

function useFastSuggestions(query, country, onResolve) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const reqIdRef = useRef(0);
  const abortRef = useRef(null);
  const resolveRef = useRef(onResolve);

  useEffect(() => {
    resolveRef.current = onResolve;
  }, [onResolve]);

  useEffect(() => {
    const text = String(query || '').trim();
    if (text.length < 2) {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      setResponse(null);
      setLoading(false);
      return undefined;
    }

    const cacheKey = `${String(country || 'IN').toUpperCase()}|${text.toLowerCase()}`;
    if (suggestCache.has(cacheKey)) {
      const cached = suggestCache.get(cacheKey);
      setResponse(cached);
      setLoading(false);
      startTransition(() => resolveRef.current?.(cached));
      return undefined;
    }

    clearTimeout(timerRef.current);
    const reqId = ++reqIdRef.current;

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const data = await suggestSearch(
          { q: text, isMaster: false, country, limit: 8 },
          { signal: ctrl.signal }
        );
        if (reqIdRef.current !== reqId) return;
        if (data) {
          suggestCache.set(cacheKey, data);
          if (suggestCache.size > MAX_CACHE) {
            suggestCache.delete(suggestCache.keys().next().value);
          }
          startTransition(() => {
            setResponse(data);
            resolveRef.current?.(data);
          });
        }
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      } finally {
        if (reqIdRef.current === reqId) setLoading(false);
      }
    }, 70);

    return () => {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, country]);

  return { response, loading };
}

function SearchConsole({
  country = 'IN',
  onCountrySelect,
  value = '',
  onChange,
  category = '',
  location = '',
  onCategoryChange,
  onLocationChange,
  strategy = 'balanced',
  onStrategyChange,
  form = {},
  onToggle,
  onDeploy,
  onStop,
  busy = false,
  running = false,
  compact = false,
  onResolve,
  runs = [],
  onOpenFolder,
  progress = null,
  zonesDone = 0,
  zonesTotal = 0
}) {
  const doneZones = Math.max(0, Number(zonesDone || progress?.overallCompletedMandals || progress?.completedMandals || 0));
  const totalZones = Math.max(1, Number(zonesTotal || progress?.totalMandalsAcrossAll || progress?.totalMandals || 1));
  const [draft, setDraft] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => loadRecent(country));

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const focusedRef = useRef(false);
  const lastExternalRef = useRef(value || '');

  useEffect(() => {
    setRecentSearches(loadRecent(country));
  }, [country]);

  // Global / and Ctrl+K shortcut to jump straight to search bar
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Sync only when external caller explicitly resets/changes query (never fight active typing)
  useEffect(() => {
    const incoming = String(value || '');
    if (incoming !== lastExternalRef.current) {
      lastExternalRef.current = incoming;
      if (!focusedRef.current) {
        setDraft(incoming);
      }
    }
  }, [value]);

  const { response, loading } = useFastSuggestions(draft, country, onResolve);

  const market = useMemo(() => examplesFor(country), [country]);
  const examples = useMemo(() => {
    if (country === 'IN') {
      return [
        'Computer shops in Guntur',
        'Interior designers in Mumbai',
        'Dental clinics in Hyderabad',
        'Mobile repair in Vijayawada',
        'Flower shops in Chennai'
      ];
    }
    return (market?.prompts || []).slice(0, 5);
  }, [country, market]);

  // Fresh suggestions only (no folder interruptions in search box)
  const matchedSavedFolder = null;

  const industryClusters = useMemo(() => industryClustersFor(country), [country]);

  // Auto-sync power directives if user typed directives into the query
  useEffect(() => {
    if (response?.directives) {
      if (response.directives.phonesOnly && !form?.phonesOnly) {
        onToggle?.('phonesOnly');
      }
      if (response.directives.websiteOnly && !form?.websiteOnly) {
        onToggle?.('websiteOnly');
      }
    }
  }, [response?.directives, form?.phonesOnly, form?.websiteOnly, onToggle]);

  const groups = useMemo(() => {
    if (draft.trim().length < 2) {
      return [{
        title: 'Popular Suggestions',
        icon: Sparkles,
        items: examples.map(q => ({ type: 'example', value: q, label: q, subtitle: 'Click to search immediately', detail: 'TRY' }))
      }];
    }

    const list = Array.isArray(response?.suggestions) ? response.suggestions : [];
    const seen = new Set();
    const categories = [];
    const locations = [];

    for (const item of list) {
      if (!item) continue;
      const key = `${item.type || 'category'}|${String(item.label || item.value || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (item.type === 'location') {
        locations.push({ ...item, type: 'location' });
      } else {
        categories.push({ ...item, type: 'category' });
      }
    }

    const out = [];
    if (categories.length) {
      out.push({ title: 'Suggested Searches', icon: Sparkles, items: categories.slice(0, 6) });
    }
    if (locations.length) {
      out.push({ title: 'Matching Places', icon: MapPin, items: locations.slice(0, 6) });
    }
    return out;
  }, [response, draft, examples]);

  const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

  const ghostText = useMemo(() => {
    if (!draft || draft.trim().length < 2 || !open) return '';
    const cleanDraft = draft.trim();
    const topSuggestion = flatItems[0]?.label || flatItems[0]?.value || response?.query || '';
    if (
      topSuggestion &&
      topSuggestion.toLowerCase().startsWith(cleanDraft.toLowerCase()) &&
      topSuggestion.length > cleanDraft.length
    ) {
      return topSuggestion.slice(cleanDraft.length);
    }
    return '';
  }, [draft, open, flatItems, response]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [flatItems.length]);

  useEffect(() => {
    const onOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const parsedCategory = response?.category?.value || response?.fragments?.category || '';
  const parsedLocation = response?.location?.value || response?.fragments?.location || '';
  const relatedSynonyms = Array.isArray(response?.relatedSynonyms) ? response.relatedSynonyms : [];
  const didYouMean = response?.didYouMean && response.didYouMean.toLowerCase() !== draft.trim().toLowerCase()
    ? response.didYouMean
    : null;

  // Synchronous zero-lag input update (never blocks typing!)
  const handleInput = useCallback((text) => {
    focusedRef.current = true;
    setDraft(text);
    setOpen(true);
  }, []);

  const commitAndDeploy = useCallback((overrideText = null, catOverride = '', locOverride = '') => {
    if (running) {
      onStop?.();
      return;
    }
    const queryText = String(typeof overrideText === 'string' ? overrideText : draft).trim();
    if (!queryText || queryText.length < 2 || busy) return;

    const finalCat = catOverride || parsedCategory || category;
    const finalLoc = locOverride || parsedLocation || location;

    saveRecent(country, queryText);
    setRecentSearches(loadRecent(country));
    sendSearchFeedback({
      rawQuery: queryText,
      selectedCategory: finalCat,
      selectedLocation: finalLoc,
      country
    });

    lastExternalRef.current = queryText;
    onChange?.(queryText);
    if (finalCat) onCategoryChange?.(finalCat);
    if (finalLoc) onLocationChange?.(finalLoc);

    setOpen(false);
    onDeploy?.({
      query: queryText,
      category: finalCat,
      location: finalLoc
    });
  }, [running, onStop, draft, busy, parsedCategory, parsedLocation, category, location, country, onChange, onCategoryChange, onLocationChange, onDeploy]);

  const pickSuggestion = useCallback((item) => {
    if (!item) return;
    if (item.type === 'recent') {
      setDraft(item.value);
      lastExternalRef.current = item.value;
      onChange?.(item.value);
      setOpen(false);
      commitAndDeploy(item.value);
      return;
    }

    let nextText = '';
    let nextCat = parsedCategory || category;
    let nextLoc = parsedLocation || location;

    if (item.type === 'location') {
      nextLoc = item.value;
      nextText = nextCat ? `${nextCat} in ${item.value}` : item.value;
      onLocationChange?.(item.value);
    } else {
      const rawLabel = String(item.label || item.value || '').trim();
      const hasLoc = /\s+(?:in|near|at)\s+/i.test(rawLabel);
      nextCat = item.value || rawLabel;
      nextText = hasLoc ? rawLabel : (nextLoc ? `${rawLabel} in ${nextLoc}` : rawLabel);
      onCategoryChange?.(nextCat);
    }

    sendSearchFeedback({
      rawQuery: draft,
      selectedCategory: nextCat,
      selectedLocation: nextLoc,
      country
    });

    setDraft(nextText);
    lastExternalRef.current = nextText;
    onChange?.(nextText);
    setOpen(false);
    inputRef.current?.focus();
  }, [draft, parsedCategory, parsedLocation, category, location, country, onChange, onCategoryChange, onLocationChange, commitAndDeploy]);

  const onKeyDown = useCallback((event) => {
    // 1. Sovereign country switch on Tab when mismatch detected
    if (event.key === 'Tab' && response?.detectedCountryMismatch && onCountrySelect && activeIdx < 0) {
      event.preventDefault();
      onCountrySelect(response.detectedCountryMismatch.detectedCountry);
      return;
    }
    // 2. Ghost autocomplete on Tab or RightArrow at end of input
    if (event.key === 'Tab' && ghostText) {
      event.preventDefault();
      const completed = draft + ghostText;
      setDraft(completed);
      lastExternalRef.current = completed;
      onChange?.(completed);
      return;
    }
    if (event.key === 'ArrowRight' && inputRef.current?.selectionStart === draft.length && ghostText) {
      event.preventDefault();
      const completed = draft + ghostText;
      setDraft(completed);
      lastExternalRef.current = completed;
      onChange?.(completed);
      return;
    }
    if (event.key === 'Tab' && open && flatItems.length > 0) {
      event.preventDefault();
      pickSuggestion(flatItems[activeIdx >= 0 ? activeIdx : 0]);
      return;
    }
    if (!open || !flatItems.length) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitAndDeploy();
      } else if (event.key === 'ArrowDown') {
        setOpen(true);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIdx(prev => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIdx(prev => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIdx >= 0 && flatItems[activeIdx]) {
        pickSuggestion(flatItems[activeIdx]);
      } else {
        commitAndDeploy();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  }, [open, flatItems, activeIdx, ghostText, draft, response, onCountrySelect, pickSuggestion, commitAndDeploy, onChange]);

  useEffect(() => {
    const handler = (e) => {
      const q = e?.detail?.query;
      if (q) {
        setDraft(q);
        lastExternalRef.current = q;
        onChange?.(q);
        commitAndDeploy(q);
      }
    };
    window.addEventListener('leadharvest:run-suggestion', handler);
    return () => window.removeEventListener('leadharvest:run-suggestion', handler);
  }, [onChange, commitAndDeploy]);

  const hardware = useMemo(() => detectDeviceHardware(), []);
  const [ramCardOpen, setRamCardOpen] = useState(false);
  const [showAll11Countries, setShowAll11Countries] = useState(false);
  const omniExamples = useMemo(() => omniExamplesFor(country), [country]);
  const animatedPlaceholder = useTypewriterPlaceholder(omniExamples, !draft);
  const locClassification = response?.locationClassification || response?.parsed?.locationClassification || null;
  const displayService = parsedCategory || category || 'Any Business / Service';
  const displayPlace = parsedLocation || location || 'City, Mandal or County';
  const precisionBadge = locClassification?.zoneCount
    ? `${locClassification.zoneCount} ${locClassification.type || 'Zone'} Pockets`
    : `${totalZones || 'Auto'} Zones`;

  const canSearch = draft.trim().length >= 2;
  let runningIdx = 0;

  return (
    <section ref={wrapRef} className={cx('v2-console', (running || compact) && 'is-compact')}>
      <div className="v2-console-field" style={{ position: 'relative' }}>
        <div className={cx('v2-console-bar', open && (flatItems.length > 0 || !draft.trim() || response?.detectedCountryMismatch) && 'is-open')}>
          <span className="v2-console-glyph"><Search size={20} /></span>
          
          <div className="v2-console-input-wrap">
            {parsedCategory && parsedLocation && draft.includes(parsedLocation) && (
              <span
                className="v2-entity-pill is-location"
                title={`Verified Target: ${response?.location?.display || parsedLocation} · Perimeter: ${response?.location?.radiusKm ? `${response.location.radiusKm} km (Strict Urban Boundary)` : 'Strict City Boundary'}`}
              >
                <MapPin size={11} />
                <span>{parsedLocation}</span>
                {response?.location?.radiusKm && (
                  <span style={{ opacity: 0.85, fontSize: 10, fontWeight: 700, marginLeft: 3 }}>
                    · {response.location.radiusKm} km
                  </span>
                )}
                <button
                  type="button"
                  className="v2-entity-pill-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newText = parsedCategory;
                    setDraft(newText);
                    lastExternalRef.current = newText;
                    onChange?.(newText);
                    onLocationChange?.('');
                    inputRef.current?.focus();
                  }}
                  title="Remove location filter"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            <div className="v2-console-input-box">
              <input
                ref={inputRef}
                id="cmd-console-query"
                className="v2-console-input"
                value={draft}
                onChange={e => handleInput(e.target.value)}
                onFocus={() => {
                  focusedRef.current = true;
                  setOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => { focusedRef.current = false; }, 180);
                }}
                onKeyDown={onKeyDown}
                placeholder={animatedPlaceholder || `Type service in place — e.g. ${examples[0] || 'Computer shops in Hyderabad'}`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />

              {ghostText && (
                <span className="v2-console-ghost" aria-hidden="true">
                  <span style={{ opacity: 0 }}>{draft}</span>
                  <span style={{ opacity: 0.38, color: '#0f172a' }}>{ghostText}</span>
                </span>
              )}
            </div>
          </div>

          {loading && <Loader2 size={16} className="v2-spin" style={{ color: '#059669', flexShrink: 0 }} />}
          {!loading && draft && (
            <button
              type="button"
              className="v2-console-clear"
              onClick={() => {
                setDraft('');
                lastExternalRef.current = '';
                onChange?.('');
                setOpen(recentSearches.length > 0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            className={cx('v2-console-go', (running || busy) && 'is-stop')}
            onClick={() => {
              if (running || busy) {
                onStop?.();
              } else {
                commitAndDeploy();
              }
            }}
            disabled={!running && !busy && !canSearch}
            title={running || busy ? 'Stop search and save all leads immediately' : 'Find leads across all zones'}
          >
            <span className={cx('lx-gbc-keycap', (running || busy) ? 'is-b' : 'is-a')}>
              {(running || busy) ? 'B' : 'A'}
            </span>
            {(running || busy) ? <Square size={14} /> : <Zap size={16} />}
            <span>{(running || busy) ? `Stop · ${doneZones}/${totalZones} Zones` : 'Find Leads'}</span>
          </button>
        </div>

        {/* Instant Google-Grade Dropdown & Mission Palette */}
        <AnimatePresence>
          {open && (flatItems.length > 0 || matchedSavedFolder || !draft.trim() || response?.detectedCountryMismatch) && (
            <motion.div
              className="v2-suggest"
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.09, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Sovereign Country Mismatch Prompt */}
              {response?.detectedCountryMismatch && (
                <div className="v2-country-detect-banner">
                  <div className="v2-country-detect-info">
                    <span className="v2-country-detect-flag">{response.detectedCountryMismatch.flag}</span>
                    <span>
                      Detected <b>{response.detectedCountryMismatch.matchedPlace}</b> in <b>{response.detectedCountryMismatch.countryName}</b> ({response.detectedCountryMismatch.detectedCountry})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="v2-country-detect-btn"
                    onClick={() => {
                      onCountrySelect?.(response.detectedCountryMismatch.detectedCountry);
                    }}
                  >
                    <span>Switch to {response.detectedCountryMismatch.countryName}</span>
                    <kbd>Tab</kbd>
                  </button>
                </div>
              )}

              {/* Google-Grade Search Palette: Recent Searches & Trending Searches when draft is empty */}
              {!draft.trim() ? (
                <div className="v2-google-palette">
                  {recentSearches && recentSearches.length > 0 && (
                    <div className="v2-palette-group">
                      <div className="v2-palette-header">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} />
                          <span>Recent Searches</span>
                        </span>
                        <button
                          type="button"
                          className="v2-palette-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
                              delete raw[String(country || 'IN').toUpperCase()];
                              localStorage.setItem(RECENT_KEY, JSON.stringify(raw));
                            } catch (err) {}
                            setRecentSearches([]);
                          }}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="v2-palette-list">
                        {recentSearches.map((query, rIdx) => (
                          <div
                            key={`recent-${query}-${rIdx}`}
                            className="v2-palette-row"
                            onClick={() => {
                              setDraft(query);
                              lastExternalRef.current = query;
                              onChange?.(query);
                              commitAndDeploy(query);
                            }}
                          >
                            <span className="v2-palette-icon"><Clock size={13} /></span>
                            <span className="v2-palette-text">{query}</span>
                            <button
                              type="button"
                              className="v2-palette-del-btn"
                              title="Remove from history"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = recentSearches.filter((_, i) => i !== rIdx);
                                setRecentSearches(updated);
                                try {
                                  const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
                                  raw[String(country || 'IN').toUpperCase()] = updated;
                                  localStorage.setItem(RECENT_KEY, JSON.stringify(raw));
                                } catch (err) {}
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="v2-palette-group">
                    <div className="v2-palette-header">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={12} />
                        <span>Trending & Popular Searches</span>
                      </span>
                    </div>
                    <div className="v2-palette-list">
                      {examples.map((item, eIdx) => (
                        <div
                          key={`trending-${item}-${eIdx}`}
                          className="v2-palette-row"
                          onClick={() => {
                            setDraft(item);
                            lastExternalRef.current = item;
                            onChange?.(item);
                            commitAndDeploy(item);
                          }}
                        >
                          <span className="v2-palette-icon"><Search size={13} /></span>
                          <span className="v2-palette-text">{item}</span>
                          <span className="v2-palette-arrow"><ArrowUpRight size={13} /></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="v2-palette-footer">
                    <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                    <span><kbd>↵</kbd> search</span>
                    <span><kbd>esc</kbd> close</span>
                  </div>
                </div>
              ) : (
                <div className="v2-suggest-grid" style={{ gridTemplateColumns: groups.length > 1 ? '1.35fr 0.85fr' : '1fr' }}>
                  {groups.map(group => {
                    const Icon = group.icon;
                    return (
                      <div key={group.title} className="v2-suggest-group">
                        <header>
                          <Icon size={12} />
                          <span>{group.title}</span>
                        </header>
                        <div className="v2-suggest-items">
                          {group.items.map((item, idx) => {
                            const currentIdx = runningIdx++;
                            const isSelected = currentIdx === activeIdx;
                            return (
                              <button
                                key={`${item.type}-${item.label || item.value}-${idx}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={cx('v2-suggest-row', isSelected && 'is-active')}
                                onMouseEnter={() => setActiveIdx(currentIdx)}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  pickSuggestion(item);
                                }}
                              >
                                <span className="v2-suggest-mark">
                                  {item.type === 'location' ? <MapPin size={13} /> : item.type === 'recent' ? <Clock size={13} /> : <Search size={13} />}
                                </span>
                                <span className="v2-suggest-copy">
                                  <b className="v2-suggest-title">
                                    <HighlightedLabel text={item.label || item.value} query={draft} />
                                  </b>
                                  {item.subtitle && <small>{item.subtitle}</small>}
                                  {item.naics && (
                                    <div className="v2-suggest-naics-badge">
                                      <span className="v2-naics-tag">
                                        <Shield size={10} color="#059669" /> NAICS {item.naics.code}: {item.naics.name}
                                      </span>
                                      <span className="v2-naics-pure">100% PURE</span>
                                    </div>
                                  )}
                                </span>
                                {item.detail && (() => {
                                  const intentKind = item.type === 'location'
                                    ? 'is-location'
                                    : item.intentType
                                      ? `is-${item.intentType}`
                                      : /mall|complex/i.test(item.detail)
                                        ? 'is-mall'
                                        : /factory|manufacturer|oem/i.test(item.detail)
                                          ? 'is-manufacturer'
                                          : /store|shop|showroom|retail/i.test(item.detail)
                                            ? 'is-store'
                                            : /product|gear|hardware|custom pc|accessory/i.test(item.detail)
                                              ? 'is-product'
                                              : /vendor|wholesale|distributor|b2b/i.test(item.detail)
                                                ? 'is-vendor'
                                                : 'is-service';
                                  return <span className={cx('v2-suggest-fix', intentKind)}>{item.detail}</span>;
                                })()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Directives Toolbar */}
              <div className="v2-quick-filter-strip">
                <span className="v2-qf-label">PRE-FLIGHT DIRECTIVES:</span>
                <button
                  type="button"
                  className={cx('v2-qf-chip', form?.phonesOnly && 'is-active')}
                  onClick={() => onToggle?.('phonesOnly')}
                  title="Filter only leads with direct phone numbers"
                >
                  <Phone size={11} /> Phones Only
                </button>
                <button
                  type="button"
                  className={cx('v2-qf-chip', form?.websiteOnly && 'is-active')}
                  onClick={() => onToggle?.('websiteOnly')}
                  title="Filter only leads with verified websites"
                >
                  <Globe size={11} /> Websites Only
                </button>
                <button
                  type="button"
                  className={cx('v2-qf-chip', strategy === 'turbo' && 'is-active')}
                  onClick={() => onStrategyChange?.(strategy === 'turbo' ? 'balanced' : 'turbo')}
                  title="Toggle multi-engine turbo scraping speed"
                >
                  <Zap size={11} /> Turbo Speed
                </button>
              </div>

              <div className="lx-suggest-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>Tab</kbd> complete</span>
                <span><kbd>Enter</kbd> search</span>
                <span><kbd>Esc</kbd> close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clean Game Boy Color 3D Liquid Glass Search Strip */}
      <div className="lx-search-helper-strip" role="region" aria-label="Search assistant and 11-country examples">
        <div className="lx-search-helper-row">
          <div className="lx-precision-badges">
            <span className="lx-precision-pill is-service">🎯 <b>{displayService}</b></span>
            <span className="lx-precision-pill is-place">📍 <b>{displayPlace}</b></span>
            <span className="lx-precision-pill is-scope">⚡ <b>{precisionBadge}</b></span>
            <span className="lx-precision-pill"><Layers size={12} color="#0e7490" /> 20+ Engines Auto On</span>
          </div>

          <button
            type="button"
            className="lx-ram-pill"
            onClick={() => setRamCardOpen(prev => !prev)}
            aria-expanded={ramCardOpen}
            title="View device RAM acceleration & system requirements"
          >
            <Cpu size={13} />
            <span>
              {hardware.ramGb} GB RAM · {hardware.cpuCores} Cores · {hardware.parallelZones}x Speed
            </span>
          </button>
        </div>

        <div className="lx-example-chips-row">
          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>TRY IN {String(country || 'IN').toUpperCase()}:</span>
          {examples.slice(0, 4).map(example => (
            <button
              key={example}
              type="button"
              className="lx-example-chip"
              onClick={() => {
                setDraft(example);
                lastExternalRef.current = example;
                onChange?.(example);
                commitAndDeploy(example);
              }}
            >
              <Sparkles size={11} color="#059669" />
              <span>{example}</span>
            </button>
          ))}
          <button
            type="button"
            className="lx-example-chip"
            style={{ background: showAll11Countries ? '#ecfdf5' : '#ffffff', borderColor: 'rgba(5, 150, 105, 0.34)', color: '#065f46' }}
            onClick={() => setShowAll11Countries(prev => !prev)}
            aria-expanded={showAll11Countries}
          >
            <span>{showAll11Countries ? 'Hide 11 Countries ▲' : 'All 11 Countries 🌍'}</span>
          </button>
        </div>

        {showAll11Countries && (
          <div className="lx-example-chips-row" role="list" aria-label="Starter searches across all 11 countries">
            {GLOBAL_11_COUNTRY_TICKER.map(item => (
              <button
                key={`${item.code}-${item.query}`}
                type="button"
                role="listitem"
                className="lx-example-chip"
                onClick={() => {
                  setDraft(item.query);
                  lastExternalRef.current = item.query;
                  onChange?.(item.query);
                  commitAndDeploy(item.query);
                }}
              >
                <b style={{ color: '#0e7490' }}>{item.country}:</b>
                <span>{item.query}</span>
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {ramCardOpen && (
            <motion.div
              className="lx-ram-modal-card"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                <b style={{ fontSize: 13 }}>
                  💻 Your Device Powers the Speed · Zero Server Queues (Need an entire District, State or Country? Ask our Master Team)
                </b>
                <button
                  type="button"
                  onClick={() => setRamCardOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 10 }}>
                {DEVICE_REQUIREMENTS.map(req => (
                  <div
                    key={req.tier}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: req.tier === hardware.tier ? '1.5px solid #10b981' : '1px solid rgba(15,23,42,0.1)',
                      background: req.tier === hardware.tier ? '#ecfdf5' : '#ffffff'
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 850, color: '#0e7490' }}>{req.badge} {req.tier === hardware.tier ? '· YOUR PC' : ''}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>{req.ram} · {req.cpu}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857' }}>{req.parallelZones} Parallel Zones · {req.speed}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{req.note}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {ALL_BUILTIN_ENGINES.map(eng => (
                  <div key={eng.id} style={{ fontSize: 11.5, color: '#334155', background: '#f8fafc', padding: '7px 10px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)' }}>
                    <b style={{ color: '#0f172a' }}>{eng.number}: {eng.name}</b>
                    <div style={{ color: '#64748b', marginTop: 2 }}>{eng.shortDesc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Only show compact typo-heal bar when there is a real typo correction */}
      {didYouMean && (
        <div className="lx-didyoumean-bar">
          <span>Did you mean</span>
          <button
            type="button"
            onClick={() => {
              sendSearchFeedback({
                rawQuery: draft,
                selectedCategory: parsedCategory,
                selectedLocation: parsedLocation,
                country,
                correctedFrom: draft
              });
              setDraft(didYouMean);
              lastExternalRef.current = didYouMean;
              onChange?.(didYouMean);
              commitAndDeploy(didYouMean);
            }}
          >
            <Check size={12} /> <b>{didYouMean}</b>
          </button>
        </div>
      )}
    </section>
  );
}

export default React.memo(SearchConsole);
