import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, Clock, Compass, Cpu, FolderOpen, Loader2, MapPin,
  Search, SlidersHorizontal, Sparkles, Square, X, Zap
} from 'lucide-react';
import { setDynamicFaviconState } from '../utils/dynamicFavicon';
import { suggestSearch, sendSearchFeedback } from './api';
import { cx } from './ui';
import { examplesFor, placeholderFor } from './data/searchExamples';

const PROPRIETARY_VECTORS = [
  { id: 'geospatial_mesh', name: 'GPS Radar Mesh', badge: 'GPS RADAR' },
  { id: 'direct_telecom', name: 'Direct Telecom Registry', badge: 'DIRECT MOBILES' },
  { id: 'deep_serp', name: 'Deep Web SERP Index', badge: 'DEEP SERP' },
  { id: 'b2b_network', name: 'Enterprise Supplier Network', badge: 'B2B NETWORK' },
  { id: 'digital_footprint', name: 'Digital Footprint Scanner', badge: 'WEB & PORTALS' }
];

const localSuggestCache = new Map();
const MAX_LOCAL_CACHE = 300;
const RECENT_KEY = 'scraper_master_recent_v1';

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
    raw[code] = [clean, ...prev.filter(i => i.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(raw));
  } catch (e) {}
}

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

function useDebouncedSuggestion(query, onResolve, country = 'IN') {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const requestRef = useRef(0);
  const controllerRef = useRef(null);
  const resolveRef = useRef(onResolve);

  useEffect(() => { resolveRef.current = onResolve; }, [onResolve]);

  useEffect(() => {
    const text = String(query || '').trim();
    if (text.length < 2) {
      clearTimeout(timer.current);
      if (controllerRef.current) controllerRef.current.abort();
      setResponse(null);
      setLoading(false);
      return undefined;
    }

    const cacheKey = `${String(country || 'IN').toUpperCase()}|${text.toLowerCase()}`;
    if (localSuggestCache.has(cacheKey)) {
      const cached = localSuggestCache.get(cacheKey);
      setResponse(cached);
      setLoading(false);
      startTransition(() => resolveRef.current?.(cached));
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
        const data = await suggestSearch({ q: text, isMaster: true, country, limit: 8 }, { signal: controller.signal });
        if (requestRef.current !== requestId) return;
        if (data) {
          localSuggestCache.set(cacheKey, data);
          if (localSuggestCache.size > MAX_LOCAL_CACHE) {
            localSuggestCache.delete(localSuggestCache.keys().next().value);
          }
          startTransition(() => {
            setResponse(data);
            resolveRef.current?.(data);
          });
        }
      } catch (error) {
        if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 70);

    return () => {
      clearTimeout(timer.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [query, country]);

  return { response, loading };
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
  form = {},
  onDeploy,
  onStop,
  busy = false,
  running = false,
  compact = false,
  onResolve,
  progress = null,
  runs = [],
  onOpenFolder,
  zonesDone = 0,
  zonesTotal = 0
}) {
  const doneZones = Math.max(0, Number(zonesDone || progress?.overallCompletedMandals || progress?.completedMandals || 0));
  const totalZones = Math.max(1, Number(zonesTotal || progress?.totalMandalsAcrossAll || progress?.totalMandals || 1));
  const [draft, setDraft] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedEngines, setSelectedEngines] = useState(form.engines || ['auto']);
  const [radius, setRadius] = useState(form.radius || 5);
  const [coverageMode, setCoverageMode] = useState(form.coverageMode === 'fast' ? 'fast' : 'deep');
  const [recentSearches, setRecentSearches] = useState(() => loadRecent(country));

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const focusedRef = useRef(false);
  const lastExternalRef = useRef(value || '');

  useEffect(() => {
    setRecentSearches(loadRecent(country));
  }, [country]);

  useEffect(() => {
    setDynamicFaviconState(running ? 'scraping' : 'idle');
  }, [running]);

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

  useEffect(() => {
    const incoming = String(value || '');
    if (incoming !== lastExternalRef.current) {
      lastExternalRef.current = incoming;
      if (!focusedRef.current) setDraft(incoming);
    }
  }, [value]);

  const { response, loading } = useDebouncedSuggestion(draft, onResolve, country);

  const market = useMemo(() => examplesFor(country), [country]);
  const examples = useMemo(() => {
    if (country === 'IN') {
      return [
        'Computer shops in Guntur',
        'Solar installers in Chennai',
        'Dental clinics in Hyderabad',
        'Mobile repair in Vijayawada',
        'Flower shops in Pune'
      ];
    }
    return (market?.prompts || []).slice(0, 5);
  }, [country, market]);

  const matchedSavedFolder = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (q.length < 4 || !Array.isArray(runs) || !runs.length) return null;
    return runs.find(r => {
      const title = String(r.customName || r.name || `${r.category || ''} in ${r.location || ''}`).toLowerCase();
      return title.includes(q) && (r.leadCount || 0) > 0;
    }) || null;
  }, [draft, runs]);

  const groups = useMemo(() => {
    if (draft.trim().length < 2) {
      const out = [];
      if (recentSearches.length) {
        out.push({
          title: 'Recent Searches',
          icon: Clock,
          items: recentSearches.map(q => ({ type: 'recent', value: q, label: q, subtitle: 'Run again instantly', detail: 'RECENT' }))
        });
      }
      out.push({
        title: 'Popular Examples',
        icon: Sparkles,
        items: examples.map(q => ({ type: 'recent', value: q, label: q, subtitle: 'Click to search immediately', detail: 'TRY' }))
      });
      return out;
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
      if (item.type === 'location') locations.push({ ...item, type: 'location' });
      else categories.push({ ...item, type: 'category' });
    }

    const out = [];
    if (categories.length) out.push({ title: 'Suggested Searches & Synonyms', icon: Sparkles, items: categories.slice(0, 6) });
    if (locations.length) out.push({ title: 'Cities, Mandals, Districts & States', icon: MapPin, items: locations.slice(0, 6) });
    return out;
  }, [response, draft, recentSearches]);

  const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

  useEffect(() => { setActiveIdx(-1); }, [flatItems.length]);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const parsedCategory = response?.category?.value || response?.fragments?.category || '';
  const parsedLocation = response?.location?.value || response?.fragments?.location || '';
  const locClassification = response?.locationClassification || response?.parsed?.locationClassification || null;
  const relatedSynonyms = Array.isArray(response?.relatedSynonyms) ? response.relatedSynonyms : [];
  const didYouMean = response?.didYouMean && response.didYouMean.toLowerCase() !== draft.trim().toLowerCase()
    ? response.didYouMean
    : null;

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
      location: finalLoc,
      radius,
      engines: selectedEngines,
      targetLeads,
      coverageMode
    });
  }, [running, onStop, draft, busy, parsedCategory, parsedLocation, category, location, country, radius, selectedEngines, targetLeads, coverageMode, onChange, onCategoryChange, onLocationChange, onDeploy]);

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
      if (activeIdx >= 0 && flatItems[activeIdx]) pickSuggestion(flatItems[activeIdx]);
      else commitAndDeploy();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  }, [open, flatItems, activeIdx, pickSuggestion, commitAndDeploy]);

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
    window.addEventListener('leadharvest:search', handler);
    return () => window.removeEventListener('leadharvest:search', handler);
  }, [onChange, commitAndDeploy]);

  const toggleVector = (vectorId) => {
    setSelectedEngines(prev => {
      if (prev.includes('auto')) return [vectorId];
      if (prev.includes(vectorId)) {
        const next = prev.filter(id => id !== vectorId);
        return next.length ? next : ['auto'];
      }
      return [...prev, vectorId];
    });
  };

  const canSearch = draft.trim().length >= 2;
  let runningIdx = 0;

  return (
    <section ref={wrapRef} className={cx('v2-console', (running || compact) && 'is-compact')}>
      <div className="v2-console-field" style={{ position: 'relative' }}>
        <div className={cx('v2-console-bar', open && flatItems.length > 0 && 'is-open')}>
          <span className="v2-console-glyph"><Search size={20} /></span>
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
            placeholder={placeholderFor(country) || `Search any business & city, district or state — e.g. ${examples[0]}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          {loading && <Loader2 size={16} className="v2-spin" style={{ color: '#4f46e5', flexShrink: 0 }} />}
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
            className={cx('lx-adv-toggle', showAdvanced && 'is-open')}
            onClick={() => setShowAdvanced(prev => !prev)}
            title="Master Sweep Radius & Engine Controls"
          >
            <SlidersHorizontal size={14} />
            <span>{selectedEngines.includes('auto') ? 'Auto' : `${selectedEngines.length} Eng`} · {radius}km</span>
          </button>

          <button
            type="button"
            className={cx('v2-console-go', running && 'is-stop', busy && 'is-busy')}
            onClick={() => commitAndDeploy()}
            disabled={busy || (!running && !canSearch)}
          >
            {!busy && (
              <span className={cx('lx-gbc-keycap', running ? 'is-b' : 'is-a')}>
                {running ? 'B' : 'A'}
              </span>
            )}
            {busy ? <Loader2 size={16} className="v2-spin" /> : running ? <Square size={14} /> : <Zap size={16} />}
            <span>
              {busy
                ? 'Starting…'
                : running
                  ? `Stop · ${doneZones}/${totalZones} Zones`
                  : locClassification?.type === 'district'
                    ? 'Sweep District'
                    : locClassification?.type === 'state'
                      ? 'Sweep State'
                      : 'Find Leads'}
            </span>
          </button>
        </div>

        {/* Google-Grade Master Dropdown */}
        <AnimatePresence>
          {open && (flatItems.length > 0 || matchedSavedFolder) && (
            <motion.div
              className="v2-suggest"
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.09, ease: [0.22, 1, 0.36, 1] }}
            >
              {matchedSavedFolder && (
                <div
                  className="v2-suggest-vault-bridge"
                  onMouseDown={e => {
                    e.preventDefault();
                    setOpen(false);
                    onOpenFolder?.(matchedSavedFolder);
                  }}
                >
                  <div className="v2-vault-bridge-info">
                    <span className="v2-vault-badge"><FolderOpen size={11} /> SAVED FOLDER MATCH</span>
                    <b>{matchedSavedFolder.customName || matchedSavedFolder.name || `${matchedSavedFolder.category} in ${matchedSavedFolder.location}`}</b>
                    <small>{matchedSavedFolder.leadCount || 0} leads saved ({matchedSavedFolder.phoneCount || 0} with phones)</small>
                  </div>
                  <button type="button" className="v2-btn-open-vault">
                    Open Folder <ArrowRight size={12} />
                  </button>
                </div>
              )}

              <div className="v2-suggest-grid" style={{ gridTemplateColumns: groups.length > 1 ? '1.3fr 0.9fr' : '1fr' }}>
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
                              </span>
                              {item.detail && <span className="v2-suggest-fix">{item.detail}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lx-suggest-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>Tab</kbd> complete</span>
                <span><kbd>Enter</kbd> launch</span>
                <span><kbd>Esc</kbd> close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable Master Engine & Radius Drawer */}
      {showAdvanced && (
        <div className="mc-adv-drawer">
          <div className="mc-adv-group">
            <span><Compass size={12} /> Radius:</span>
            {[3, 5, 10, 25].map(r => (
              <button
                key={r}
                type="button"
                className={cx('lx-example-chip', radius === r && 'is-selected')}
                onClick={() => setRadius(r)}
              >
                {r} km
              </button>
            ))}
          </div>
          <div className="mc-adv-group">
            <span><Cpu size={12} /> Engines:</span>
            <button
              type="button"
              className={cx('lx-example-chip', selectedEngines.includes('auto') && 'is-selected')}
              onClick={() => setSelectedEngines(['auto'])}
            >
              Auto Router
            </button>
            {PROPRIETARY_VECTORS.map(v => (
              <button
                key={v.id}
                type="button"
                className={cx('lx-example-chip', selectedEngines.includes(v.id) && 'is-selected')}
                onClick={() => toggleVector(v.id)}
              >
                {v.badge}
              </button>
            ))}
          </div>
          <div className="mc-adv-group">
            <span>Depth:</span>
            <button type="button" className={cx('lx-example-chip', coverageMode === 'deep' && 'is-selected')} onClick={() => setCoverageMode('deep')}>Deep Sweep</button>
            <button type="button" className={cx('lx-example-chip', coverageMode === 'fast' && 'is-selected')} onClick={() => setCoverageMode('fast')}>Fast Burst</button>
          </div>
        </div>
      )}

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
