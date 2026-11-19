import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, FolderOpen, Loader2, MapPin, Search,
  Sparkles, Square, X, Zap
} from 'lucide-react';
import { suggestSearch } from './api';
import { cx } from './ui';
import { examplesFor } from './data/searchExamples';

// Instant 0ms client-side LRU cache for backspace and repeat keystrokes
const suggestCache = new Map();
const MAX_CACHE = 250;

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
    }, 85);

    return () => {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, country]);

  return { response, loading };
}

function SearchConsole({
  country = 'IN',
  value = '',
  onChange,
  category = '',
  location = '',
  onCategoryChange,
  onLocationChange,
  onDeploy,
  onStop,
  busy = false,
  running = false,
  compact = false,
  onResolve,
  runs = [],
  onOpenFolder
}) {
  const [draft, setDraft] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const focusedRef = useRef(false);
  const lastExternalRef = useRef(value || '');

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
        'Wedding photographers in Tenali'
      ];
    }
    return (market?.prompts || []).slice(0, 5);
  }, [country, market]);

  // Check if the user already has a saved folder matching this search
  const matchedSavedFolder = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (q.length < 4 || !Array.isArray(runs) || !runs.length) return null;
    return runs.find(r => {
      const title = String(r.customName || r.name || `${r.category || ''} in ${r.location || ''}`).toLowerCase();
      return title.includes(q) && (r.leadCount || 0) > 0;
    }) || null;
  }, [draft, runs]);

  const groups = useMemo(() => {
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
      out.push({ title: 'Matching Places', icon: MapPin, items: locations.slice(0, 5) });
    }
    return out;
  }, [response]);

  const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

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
  const didYouMean = response?.didYouMean && response.didYouMean.toLowerCase() !== draft.trim().toLowerCase()
    ? response.didYouMean
    : null;

  // Synchronous zero-lag input update (never blocks typing!)
  const handleInput = useCallback((text) => {
    focusedRef.current = true;
    setDraft(text);
    setOpen(text.trim().length >= 2);
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
  }, [running, onStop, draft, busy, parsedCategory, parsedLocation, category, location, onChange, onCategoryChange, onLocationChange, onDeploy]);

  const pickSuggestion = useCallback((item) => {
    if (!item) return;
    let nextText = '';
    if (item.type === 'location') {
      const cat = parsedCategory || category;
      nextText = cat ? `${cat} in ${item.value}` : item.value;
      onLocationChange?.(item.value);
    } else {
      const rawLabel = String(item.label || item.value || '').trim();
      const hasLoc = /\s+(?:in|near|at)\s+/i.test(rawLabel);
      const loc = parsedLocation || location;
      nextText = hasLoc ? rawLabel : (loc ? `${rawLabel} in ${loc}` : rawLabel);
      onCategoryChange?.(item.value || rawLabel);
    }
    setDraft(nextText);
    lastExternalRef.current = nextText;
    onChange?.(nextText);
    setOpen(false);
    inputRef.current?.focus();
  }, [parsedCategory, parsedLocation, category, location, onChange, onCategoryChange, onLocationChange]);

  const onKeyDown = useCallback((event) => {
    if (!open || !flatItems.length) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitAndDeploy();
      } else if (event.key === 'ArrowDown' && draft.trim().length >= 2) {
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
  }, [open, flatItems, activeIdx, draft, pickSuggestion, commitAndDeploy]);

  // Listen for external search suggestion events
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
              if (draft.trim().length >= 2) setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => { focusedRef.current = false; }, 180);
            }}
            onKeyDown={onKeyDown}
            placeholder={`Search any business & place — e.g. ${examples[0] || 'Computer shops in Guntur'}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          {loading && <Loader2 size={16} className="v2-spin" style={{ color: '#059669', flexShrink: 0 }} />}
          {!loading && draft && (
            <button
              type="button"
              className="v2-console-clear"
              onClick={() => {
                setDraft('');
                lastExternalRef.current = '';
                onChange?.('');
                setOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            className={cx('v2-console-go', running && 'is-stop', busy && 'is-busy')}
            onClick={() => commitAndDeploy()}
            disabled={busy || (!running && !canSearch)}
          >
            {busy ? <Loader2 size={16} className="v2-spin" /> : running ? <Square size={14} /> : <Zap size={16} />}
            <span>{busy ? 'Starting…' : running ? 'Stop Search' : 'Find Leads'}</span>
          </button>
        </div>

        {/* Instant Google-Grade Dropdown */}
        <AnimatePresence>
          {open && (flatItems.length > 0 || matchedSavedFolder) && (
            <motion.div
              className="v2-suggest"
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
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
                    <span className="v2-vault-badge"><FolderOpen size={11} /> ALREADY IN YOUR SAVED LISTS</span>
                    <b>{matchedSavedFolder.customName || matchedSavedFolder.name || `${matchedSavedFolder.category} in ${matchedSavedFolder.location}`}</b>
                    <small>{matchedSavedFolder.leadCount || 0} leads saved ({matchedSavedFolder.phoneCount || 0} with phone numbers)</small>
                  </div>
                  <button type="button" className="v2-btn-open-vault">
                    Open Saved List <ArrowRight size={12} />
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
                                {item.type === 'location' ? <MapPin size={13} /> : <Search size={13} />}
                              </span>
                              <span className="v2-suggest-copy">
                                <b className="v2-suggest-title">{item.label || item.value}</b>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clean, Human-Friendly Search Understanding (Zero Technical Jargon) */}
      {(parsedCategory || parsedLocation || didYouMean) && (
        <div className="lx-intent-strip">
          {parsedCategory && (
            <span className="lx-intent-pill is-ready">
              <Sparkles size={12} />
              Looking for: <b>{parsedCategory}</b>
            </span>
          )}
          {parsedLocation && (
            <span className="lx-intent-pill is-ready">
              <MapPin size={12} />
              Area: <b>{parsedLocation}</b>
            </span>
          )}
          {didYouMean && (
            <button
              type="button"
              className="lx-example-chip"
              style={{ borderColor: '#6ee7b7', background: '#ecfdf5', color: '#065f46' }}
              onClick={() => {
                setDraft(didYouMean);
                lastExternalRef.current = didYouMean;
                onChange?.(didYouMean);
              }}
            >
              <Check size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Did you mean <b>{didYouMean}</b>?
            </button>
          )}
        </div>
      )}

      {/* Friendly Quick Example Searches */}
      {!running && (
        <div className="lx-console-examples">
          <span className="lx-examples-label">Try searching:</span>
          {examples.map(example => (
            <button
              key={example}
              type="button"
              className="lx-example-chip"
              onClick={() => {
                setDraft(example);
                lastExternalRef.current = example;
                onChange?.(example);
                inputRef.current?.focus();
              }}
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
