/**
 * shared/search/OmniSearchBar.jsx
 * Liquid Pearl Search Pod:
 * - 3D Flag Country Picker & country-aware native vocabulary placeholder
 * - Keyboard-first (`/` to focus, ↑↓ to navigate, Enter to sweep, Esc to close)
 * - Recent searches per country + inline "Did you mean" typo correction
 * - Taxonomy-aware pill: toggleable sub-category chips for umbrella queries,
 *   or strict-match badge for particular niche queries.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, MapPin, Play, Square, Download, X, Tag, ShieldCheck, Layers
} from 'lucide-react';
import { getCountryByCode } from '../data/countries';
import { detectCountryForText, formatPlaceDisplay } from '../data/sovereignPlaces';
import { classifyClientQuery } from '../data/taxonomyClient';
import { strictParseSearchIntent, autoCorrectTypedQuery } from '../data/searchNormalize';
import LiquidButton from '../ui/LiquidButton';
import { IntentPill } from '../ui/Primitives';
import { FlagSphere } from '../ui/FlagChip';
import OmniCountryPicker from './OmniCountryPicker';
import OmniSearchDropdown from './OmniSearchDropdown';
import { readRecentSearches, saveRecentSearch, clearRecentSearches } from './searchRecent';

const RECENT_STORAGE_KEY = 'lp_recent_searches_v1';
const readRecent = (country) => readRecentSearches(country, RECENT_STORAGE_KEY);
const saveRecent = (country, cat, city) => saveRecentSearch(country, cat, city, RECENT_STORAGE_KEY);

export default function OmniSearchBar({
  query = '',
  setQuery,
  city = '',
  setCity,
  country = 'IN',
  setCountry,
  scanning = false,
  onStart,
  onStop,
  onExport,
  leadCount = 0,
  zoneCount = 0,
  suggestFn,
  ctaLabel = 'Sweep Leads'
}) {
  const [rawInput, setRawInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentList, setRecentList] = useState(() => readRecent(country));
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [disabledSubs, setDisabledSubs] = useState(new Set());
  const [inputHint, setInputHint] = useState('');
  const [autoFixedNote, setAutoFixedNote] = useState('');
  const [backendTax, setBackendTax] = useState(null);
  const debounceRef = useRef(null);
  const classifyRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const activeCountry = useMemo(() => getCountryByCode(country), [country]);

  useEffect(() => {
    setRecentList(readRecent(country));
  }, [country]);

  // Tracks the last query/city values produced by the user's own typing so the
  // prop->input sync below never overwrites what is being typed.
  const selfEmitRef = useRef({ q: null, c: null });

  useEffect(() => {
    const self = selfEmitRef.current;
    if (self.q === query && self.c === city) return;
    if (query && city) {
      setRawInput(`${query} in ${city}`);
    } else if (!query && !city) {
      setRawInput('');
    } else if (query) {
      setRawInput(city ? `${query} in ${city}` : query);
    }
  }, [query, city]);

  // Global `/` shortcut to focus search bar
  useEffect(() => {
    const onGlobalKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const onPickCat = (e) => {
      const picked = String(e?.detail?.query || '').trim();
      const pickedCountry = String(e?.detail?.country || '').trim().toUpperCase();
      if (!picked) return;
      if (pickedCountry && pickedCountry !== country) setCountry?.(pickedCountry);
      selfEmitRef.current = { q: picked, c: city };
      setQuery?.(picked);
      setRawInput(city ? `${picked} in ${city}` : picked);
      setTimeout(() => inputRef.current?.focus(), 40);
    };
    window.addEventListener('scraper:pick-category', onPickCat);
    return () => window.removeEventListener('scraper:pick-category', onPickCat);
  }, [city, country, setCountry, setQuery]);

  const activeSuggestFn = useMemo(() => {
    if (typeof suggestFn === 'function') return suggestFn;
    return async ({ q, country: cc }) => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&country=${encodeURIComponent(cc || 'IN')}`);
        return res.ok ? await res.json() : { suggestions: [] };
      } catch (_) {
        return { suggestions: [] };
      }
    };
  }, [suggestFn]);

  const parseIntent = (val) => {
    const parsed = strictParseSearchIntent(val, city);
    selfEmitRef.current = { q: parsed.q, c: parsed.c };
    setQuery?.(parsed.q);
    setCity?.(parsed.c);
    return parsed;
  };

  const handleInputChange = (val) => {
    const inlineFix = autoCorrectTypedQuery(val, { commitFinalToken: false });
    const nextVal = inlineFix.changed ? inlineFix.text : val;
    setRawInput(nextVal);
    setSelectedIdx(-1);
    setDisabledSubs(new Set());
    setAutoFixedNote(inlineFix.changed ? `Auto-corrected "${inlineFix.replacements[0].from}" → "${inlineFix.replacements[0].to}"` : '');
    const parsed = parseIntent(nextVal);

    const det = detectCountryForText(parsed.c || nextVal);
    const effectiveCountry = det?.country || country;
    if (det && det.country !== country) {
      setCountry?.(det.country);
      const targetMeta = getCountryByCode(det.country);
      setAutoFixedNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name} (${det.place.label}, ${det.place.state})`);
    }

    if (nextVal.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const idleFix = autoCorrectTypedQuery(nextVal, { commitFinalToken: true });
      if (idleFix.changed && idleFix.text !== nextVal) {
        const fixParsed = parseIntent(idleFix.text);
        setRawInput(idleFix.text);
        setAutoFixedNote(`Auto-corrected "${idleFix.replacements[0].from}" → "${idleFix.replacements[0].to}"`);
        const fixDet = detectCountryForText(fixParsed.c || idleFix.text);
        if (fixDet && fixDet.country !== country) setCountry?.(fixDet.country);
      }
      const suggestQ = idleFix.changed ? idleFix.text : nextVal;
      const suggestCc = detectCountryForText(strictParseSearchIntent(suggestQ, '').c || suggestQ)?.country || effectiveCountry;
      try {
        const data = await activeSuggestFn({ q: suggestQ, country: suggestCc });
        if (data?.detectedCountryMismatch?.detectedCountry && data.detectedCountryMismatch.detectedCountry !== suggestCc) {
          const nextCc = data.detectedCountryMismatch.detectedCountry;
          setCountry?.(nextCc);
          setAutoFixedNote(`Auto-switched to ${data.detectedCountryMismatch.flag || ''} ${data.detectedCountryMismatch.countryName}`);
        }
        if (Array.isArray(data?.suggestions)) {
          setSuggestions(data.suggestions);
          setShowDropdown(true);
        }
      } catch (_) {}
    }, 320);
  };

  const liveParsed = useMemo(() => strictParseSearchIntent(rawInput, city), [rawInput, city]);
  const typoSuggestion = liveParsed.didCorrect
    ? (liveParsed.c ? `${liveParsed.q} in ${liveParsed.c}` : liveParsed.q)
    : null;
  const localTax = useMemo(() => classifyClientQuery(query, country), [query, country]);
  const taxonomyInfo = useMemo(() => {
    if (backendTax && backendTax.query === query && backendTax.country === country && backendTax.subcategories?.length) {
      return backendTax;
    }
    return localTax;
  }, [backendTax, localTax, query, country]);

  useEffect(() => {
    const qClean = String(query || '').trim();
    if (qClean.length < 3) { setBackendTax(null); return; }
    clearTimeout(classifyRef.current);
    classifyRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/classify?q=${encodeURIComponent(qClean)}&country=${encodeURIComponent(country || 'IN')}`);
        if (!res.ok) return;
        const data = await res.json();
        const cls = data?.classification;
        if (cls?.subcategories?.length > 1) {
          setBackendTax({
            query: qClean,
            country,
            mode: cls.mode === 'umbrella' ? 'umbrella' : 'niche',
            subcategories: cls.subcategories
          });
        }
      } catch (_) {}
    }, 320);
    return () => clearTimeout(classifyRef.current);
  }, [query, country]);

  const applyTypoFix = () => {
    if (!typoSuggestion) return;
    selfEmitRef.current = { q: liveParsed.q, c: liveParsed.c };
    setQuery?.(liveParsed.q);
    if (liveParsed.c) setCity?.(liveParsed.c);
    setRawInput(typoSuggestion);
    setAutoFixedNote(typoSuggestion);
  };

  const triggerSweep = () => {
    setShowDropdown(false);
    const parsed = strictParseSearchIntent(rawInput, city);
    const finalQ = String(parsed.q || query || '').trim();
    const finalC = String(parsed.c || city || '').trim();

    if (!finalQ || !finalC) {
      inputRef.current?.focus();
      if (!finalQ) setInputHint('Enter a business category and city (e.g. Hospitals in Hyderabad)');
      else setInputHint('Specify a city (e.g. "Hospitals in Hyderabad") or pick a city chip below');
      return;
    }

    const det = detectCountryForText(finalC);
    const effectiveCountry = det?.country || country;
    if (det && det.country !== country) {
      setCountry?.(det.country);
    }

    setInputHint('');
    selfEmitRef.current = { q: finalQ, c: finalC };
    setQuery?.(finalQ);
    setCity?.(finalC);
    if (det && det.country !== country) {
      const targetMeta = getCountryByCode(det.country);
      setAutoFixedNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name} (${formatPlaceDisplay(finalC, effectiveCountry, false)})`);
    } else if (parsed.didCorrect) {
      const normalizedStr = `${finalQ} in ${finalC}`;
      setRawInput(normalizedStr);
      setAutoFixedNote(`Auto-corrected to "${normalizedStr}"`);
    } else {
      setAutoFixedNote('');
    }

    const resolvedTax = classifyClientQuery(finalQ, effectiveCountry);
    const activeSubcategories =
      resolvedTax.mode === 'umbrella'
        ? resolvedTax.subcategories.filter((s) => !disabledSubs.has(s))
        : undefined;
    saveRecent(effectiveCountry, finalQ, finalC);
    setRecentList(readRecent(effectiveCountry));
    onStart?.(activeSubcategories, { query: finalQ, city: finalC, country: effectiveCountry });
  };

  const dropdownItems = rawInput.trim().length >= 2 ? suggestions : recentList.map((r) => ({ ...r, type: 'recent' }));

  const handleSelectItem = (item) => {
    const pickedCc = item.country ? String(item.country).toUpperCase() : country;
    if (pickedCc !== country) {
      setCountry?.(pickedCc);
    }
    const cleanCity = String(item.city || '').split(',')[0].trim();
    const fullText = item.category && cleanCity ? `${item.category} in ${cleanCity}` : (item.text || '');
    selfEmitRef.current = { q: item.category || query, c: cleanCity || city };
    setRawInput(fullText);
    if (item.category) setQuery?.(item.category);
    if (cleanCity) setCity?.(cleanCity);
    else parseIntent(fullText);
    const targetMeta = getCountryByCode(pickedCc);
    const displayPlace = item.subtitle || formatPlaceDisplay(cleanCity, pickedCc, false);
    if (pickedCc !== country) {
      setAutoFixedNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name}${displayPlace ? ` (${displayPlace})` : ''}`);
    } else if (displayPlace) {
      setAutoFixedNote(`${targetMeta.flag} ${displayPlace}`);
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIdx((p) => Math.min(dropdownItems.length - 1, p + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((p) => Math.max(-1, p - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && selectedIdx >= 0 && dropdownItems[selectedIdx]) {
        handleSelectItem(dropdownItems[selectedIdx]);
      } else {
        triggerSweep();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const toggleSubcategory = (sub) => {
    setDisabledSubs((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else if (next.size < taxonomyInfo.subcategories.length - 1) next.add(sub);
      return next;
    });
  };

  const clearRecents = () => {
    clearRecentSearches(country, RECENT_STORAGE_KEY);
    setRecentList([]);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', zIndex: 40, marginBottom: 12 }}>
      <div className="lp-liquid-ring">
        <div style={{ background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(24px) saturate(180%)', borderRadius: 18.5, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Row 1: Country Picker + Search Input + Sweep CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <OmniCountryPicker country={country} setCountry={setCountry} disabled={scanning} />

            <div style={{ position: 'relative', flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Search size={16} color="#d97706" style={{ flexShrink: 0, marginLeft: 4 }} />
              <input
                ref={inputRef}
                type="text"
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder={activeCountry.placeholder}
                disabled={scanning}
                aria-label="Search category and city"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--lp-ink)',
                  fontFamily: 'var(--lp-font-sans)'
                }}
              />
              {!rawInput && !scanning && (
                <kbd title="Press / to focus search" style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#f8fafc', border: '1px solid rgba(15, 23, 42, 0.12)', color: '#64748b', flexShrink: 0 }}>/</kbd>
              )}
              {rawInput && !scanning && (
                <button type="button" onClick={() => { selfEmitRef.current = { q: '', c: '' }; setRawInput(''); setQuery?.(''); setCity?.(''); setSuggestions([]); inputRef.current?.focus(); }} title="Clear search" style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'inline-flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
              {leadCount > 0 && onExport && (
                <LiquidButton variant="glass-gold" size="sm" icon={Download} onClick={onExport} badge={leadCount}>
                  Export CSV
                </LiquidButton>
              )}
              {scanning ? (
                <LiquidButton variant="rose" size="md" icon={Square} onClick={onStop}>
                  Halt Sweep
                </LiquidButton>
              ) : (
                <LiquidButton variant="gold" size="md" icon={Play} onClick={triggerSweep}>
                  {ctaLabel}
                </LiquidButton>
              )}
            </div>
          </div>

          {/* Row 2: Validation Hint / Typo Helper + Live Intent Pills + Taxonomy Mode */}
          {(inputHint || autoFixedNote || query || city || typoSuggestion) && (
            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(15, 23, 42, 0.06)', overflowX: 'auto' }}>
              {inputHint && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#be123c', padding: '2px 8px', borderRadius: 8, background: '#fff1f2', flexShrink: 0 }}>
                  {inputHint}
                </span>
              )}
              {autoFixedNote && !typoSuggestion && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', padding: '2px 8px', borderRadius: 8, background: '#ecfdf5', flexShrink: 0 }}>
                  {autoFixedNote}
                </span>
              )}
              {typoSuggestion && (
                <button
                  type="button"
                  onClick={applyTypoFix}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px dashed rgba(217, 119, 6, 0.55)',
                    cursor: 'pointer'
                  }}
                >
                  <span>Did you mean:</span>
                  <u>{typoSuggestion}</u>
                </button>
              )}

              {query && <IntentPill icon={Tag} tone="gold">{query}</IntentPill>}
              {query && taxonomyInfo?.intentMeta?.badge && (
                <IntentPill tone={taxonomyInfo.intentMeta.tone || 'sapphire'}>
                  {taxonomyInfo.isProductQuery ? 'Product → Store' : taxonomyInfo.intentMeta.badge}
                </IntentPill>
              )}
              {city && <IntentPill icon={MapPin} tone="sapphire">{formatPlaceDisplay(city, country, false)}{zoneCount > 0 ? ` · ${zoneCount} wards` : ''}</IntentPill>}

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15,23,42,0.1)', flexShrink: 0 }}>
                <FlagSphere code={country} size={13} />
                <span>{activeCountry.name}</span>
              </span>

              {taxonomyInfo.mode === 'niche' && query.length >= 2 && (
                <IntentPill icon={ShieldCheck} tone="emerald">
                  Strict category match
                </IntentPill>
              )}

              {taxonomyInfo.mode === 'umbrella' && (
                <IntentPill
                  icon={Layers}
                  tone="sapphire"
                  onClick={disabledSubs.size > 0 ? () => setDisabledSubs(new Set()) : undefined}
                >
                  {taxonomyInfo.subcategories.length - disabledSubs.size}/{taxonomyInfo.subcategories.length} sub-categories in every ward{disabledSubs.size > 0 ? ' (Reset all)' : ':'}
                </IntentPill>
              )}

              {taxonomyInfo.mode === 'umbrella' &&
                taxonomyInfo.subcategories.map((sub) => {
                  const active = !disabledSubs.has(sub);
                  return (
                    <IntentPill
                      key={sub}
                      tone="gold"
                      active={active}
                      onClick={() => toggleSubcategory(sub)}
                    >
                      {active ? '✓ ' : '+ '}{sub}
                    </IntentPill>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown: Smart Suggestions or Recent Searches */}
      {showDropdown && dropdownItems.length > 0 && (
        <OmniSearchDropdown
          items={dropdownItems}
          selectedIdx={selectedIdx}
          isRecentMode={rawInput.trim().length < 2}
          headerLabel={rawInput.trim().length >= 2 ? 'Search Suggestions · Full City & State' : `Recent in ${activeCountry.name}`}
          headerRight="↑↓ select · Enter"
          country={country}
          onSelect={handleSelectItem}
          onClearRecents={clearRecents}
        />
      )}
    </div>
  );
}
