/**
 * master/src/v2/components/MasterOmniSearchBar.jsx
 * District & State ONLY Search Pod for Master Fleet across all 11 Countries.
 * Features `/` shortcut, per-country recent District/State searches, live /api/search/classify
 * sync, live Territory Scope preview, and strict District/State validation.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, MapPin, Play, Square, Download, X, Tag, ShieldCheck, Layers, AlertTriangle
} from 'lucide-react';
import { getCountryByCode } from '@shared/data/countries';
import { detectCountryForText, formatPlaceDisplay, findSovereignPlace } from '@shared/data/sovereignPlaces';
import { classifyClientQuery } from '@shared/data/taxonomyClient';
import { strictParseSearchIntent, autoCorrectTypedQuery } from '@shared/data/searchNormalize';
import { readRecentSearches, saveRecentSearch, clearRecentSearches } from '@shared/search/searchRecent';
import LiquidButton from '@shared/ui/LiquidButton';
import { IntentPill } from '@shared/ui/Primitives';
import { FlagSphere } from '@shared/ui/FlagChip';
import OmniCountryPicker from '@shared/search/OmniCountryPicker';
import OmniSearchDropdown from '@shared/search/OmniSearchDropdown';
import { suggestMasterLocationsApi, validateMasterLocationApi } from '../apiMaster';
import { getMasterLabels, localSuggestMasterLocations } from '../data/masterLocations';

const MASTER_RECENT_KEY = 'lp_master_recent_v1';

export default function MasterOmniSearchBar({
  query = '', setQuery, city = '', setCity, country = 'IN', setCountry,
  scanning = false, onStart, onStop, onExport, leadCount = 0,
  territoryCounts = null, ctaLabel = 'Sweep Territory'
}) {
  const [rawInput, setRawInput] = useState(() => (query && city ? `${query} in ${city}` : query || ''));
  const [suggestions, setSuggestions] = useState([]);
  const [recentList, setRecentList] = useState(() => readRecentSearches(country, MASTER_RECENT_KEY));
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [disabledSubs, setDisabledSubs] = useState(new Set());
  const [inputError, setInputError] = useState('');
  const [fixChips, setFixChips] = useState([]);
  const [validating, setValidating] = useState(false);
  const [autoSwitchNote, setAutoSwitchNote] = useState('');
  const [backendTax, setBackendTax] = useState(null);

  const debounceRef = useRef(null);
  const classifyRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const selfEmitRef = useRef({ q: null, c: null });

  const activeCountry = useMemo(() => getCountryByCode(country), [country]);
  const adminLabels = useMemo(() => getMasterLabels(country), [country]);
  const localTax = useMemo(() => classifyClientQuery(query, country), [query, country]);
  const taxonomyInfo = useMemo(() => (
    backendTax && backendTax.query === query && backendTax.country === country && backendTax.subcategories?.length
      ? backendTax : localTax
  ), [backendTax, localTax, query, country]);

  useEffect(() => { setRecentList(readRecentSearches(country, MASTER_RECENT_KEY)); }, [country]);

  useEffect(() => {
    const self = selfEmitRef.current;
    if (self.q === query && self.c === city) return;
    if (query && city) setRawInput(`${query} in ${city}`);
    else if (!query && !city) setRawInput('');
    else if (query) setRawInput(query);
  }, [query, city]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false); };
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
          setBackendTax({ query: qClean, country, mode: cls.mode === 'umbrella' ? 'umbrella' : 'niche', subcategories: cls.subcategories });
        }
      } catch (_) {}
    }, 320);
    return () => clearTimeout(classifyRef.current);
  }, [query, country]);

  const parseAndEmit = (val) => {
    const parsed = strictParseSearchIntent(val, city);
    selfEmitRef.current = { q: parsed.q, c: parsed.c };
    setQuery?.(parsed.q);
    setCity?.(parsed.c);
    return parsed;
  };

  const loadSuggestions = async (val, ccOverride = null) => {
    const parsed = strictParseSearchIntent(val, '');
    const det = detectCountryForText(parsed.c || val);
    const activeCc = ccOverride || det?.country || country;
    const locTerm = parsed.c || '';
    const qCat = parsed.q || 'Hospitals';
    const terrItems = await suggestMasterLocationsApi(locTerm || val, activeCc, 8);
    if (terrItems.length > 0 && terrItems[0].autoSwitchCountry && terrItems[0].country && terrItems[0].country !== country) {
      const nextCc = String(terrItems[0].country).toUpperCase();
      setCountry?.(nextCc);
      const targetMeta = getCountryByCode(nextCc);
      setAutoSwitchNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name} (${terrItems[0].displayName || terrItems[0].name})`);
    }
    const territoryItems = terrItems.map((t) => {
      const fullLocLabel = t.displayName || (t.stateName && t.stateName !== t.name ? `${t.name}, ${t.stateName}` : t.name);
      return {
        type: t.scope === 'state' ? 'state' : 'district',
        badge: t.badge,
        category: qCat,
        city: t.name,
        country: t.country || activeCc,
        autoSwitchCountry: Boolean((t.country || activeCc) !== country),
        text: `${qCat} in ${fullLocLabel}`,
        subtitle: t.subtitle
      };
    });

    let catItems = [];
    if (val.trim().length >= 2) {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(val)}&country=${encodeURIComponent(activeCc)}`);
        if (res.ok) {
          const data = await res.json();
          catItems = (data?.suggestions || []).filter((s) => s.type !== 'location').slice(0, 4);
        }
      } catch (_) {}
    }
    setSuggestions([...territoryItems, ...catItems].slice(0, 10));
  };

  const handleInputChange = (val) => {
    const inlineFix = autoCorrectTypedQuery(val, { commitFinalToken: false });
    const nextVal = inlineFix.changed ? inlineFix.text : val;
    setRawInput(nextVal);
    setSelectedIdx(-1);
    setDisabledSubs(new Set());
    setInputError('');
    setAutoSwitchNote(inlineFix.changed ? `Auto-corrected "${inlineFix.replacements[0].from}" → "${inlineFix.replacements[0].to}"` : '');
    setFixChips([]);
    const parsed = parseAndEmit(nextVal);
    const det = detectCountryForText(parsed.c || nextVal);
    const effectiveCc = det?.country || country;
    if (det && det.country !== country) {
      setCountry?.(det.country);
      const targetMeta = getCountryByCode(det.country);
      setAutoSwitchNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name} (${det.place.district || det.place.label})`);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const idleFix = autoCorrectTypedQuery(nextVal, { commitFinalToken: true });
      const activeText = idleFix.changed ? idleFix.text : nextVal;
      if (idleFix.changed && idleFix.text !== nextVal) {
        const p2 = parseAndEmit(idleFix.text);
        setRawInput(idleFix.text);
        setAutoSwitchNote(`Auto-corrected "${idleFix.replacements[0].from}" → "${idleFix.replacements[0].to}"`);
        const d2 = detectCountryForText(p2.c || idleFix.text);
        if (d2 && d2.country !== country) setCountry?.(d2.country);
      }
      const nextCc = detectCountryForText(strictParseSearchIntent(activeText, '').c || activeText)?.country || effectiveCc;
      loadSuggestions(activeText, nextCc);
      setShowDropdown(true);
    }, 220);
  };

  const triggerSweep = async () => {
    setShowDropdown(false);
    const parsed = strictParseSearchIntent(rawInput, city);
    const finalQ = String(parsed.q || query || '').trim();
    const rawLoc = String(parsed.c || city || '').trim();
    const det = detectCountryForText(rawLoc);
    const effectiveCc = det?.country || country;
    if (det && det.country !== country) {
      setCountry?.(det.country);
      const targetMeta = getCountryByCode(det.country);
      setAutoSwitchNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name}`);
    }
    const mappedPlace = findSovereignPlace(rawLoc);
    const finalLoc = mappedPlace?.district && rawLoc.toLowerCase() === mappedPlace.name.toLowerCase()
      ? mappedPlace.district
      : rawLoc;
    const effLabels = getMasterLabels(effectiveCc);

    if (!finalQ || !finalLoc) {
      inputRef.current?.focus();
      setInputError(`Enter "<Category> in <${effLabels.level2} or ${effLabels.level1}>" (${effLabels.hint})`);
      setFixChips(localSuggestMasterLocations('', effectiveCc, 4).map((x) => x.name));
      return;
    }

    setValidating(true);
    setInputError('');
    setFixChips([]);
    try {
      const check = await validateMasterLocationApi(finalLoc, effectiveCc);
      if (!check?.ok) {
        setInputError(check?.error || `Master Fleet accepts only ${effLabels.level2} or ${effLabels.level1} names.`);
        setFixChips(Array.isArray(check?.suggestions) ? check.suggestions : []);
        return;
      }
      const canonicalLoc = check.canonicalName || finalLoc;
      selfEmitRef.current = { q: finalQ, c: canonicalLoc };
      setQuery?.(finalQ);
      setCity?.(canonicalLoc);
      setRawInput(`${finalQ} in ${canonicalLoc}`);
      saveRecentSearch(effectiveCc, finalQ, canonicalLoc, MASTER_RECENT_KEY);
      setRecentList(readRecentSearches(effectiveCc, MASTER_RECENT_KEY));

      const activeSubcategories = taxonomyInfo.mode === 'umbrella'
        ? taxonomyInfo.subcategories.filter((s) => !disabledSubs.has(s))
        : undefined;
      onStart?.(activeSubcategories, { query: finalQ, city: canonicalLoc, country: effectiveCc });
    } finally {
      setValidating(false);
    }
  };

  const applySuggestion = (item) => {
    const pickedCc = item.country ? String(item.country).toUpperCase() : country;
    if (pickedCc !== country) {
      setCountry?.(pickedCc);
      const targetMeta = getCountryByCode(pickedCc);
      setAutoSwitchNote(`Auto-switched to ${targetMeta.flag} ${targetMeta.name}`);
    }
    const cleanLoc = item.city || '';
    const fullText = (item.category || query || 'Hotels') + (cleanLoc ? ` in ${cleanLoc}` : '');
    selfEmitRef.current = { q: item.category || query, c: cleanLoc };
    setRawInput(fullText);
    if (item.category) setQuery?.(item.category);
    if (cleanLoc) setCity?.(cleanLoc);
    else parseAndEmit(fullText);
    setInputError('');
    setFixChips([]);
    setShowDropdown(false);
  };

  const showingRecents = rawInput.trim().length < 2 && recentList.length > 0;
  const dropdownItems = showingRecents ? recentList.map((r) => ({ ...r, type: 'recent', badge: 'Recent' })) : suggestions;

  return (
    <div ref={wrapRef} style={{ position: 'relative', zIndex: 40, marginBottom: 12 }}>
      <div className="lp-liquid-ring">
        <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px) saturate(180%)', borderRadius: 18.5, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <OmniCountryPicker country={country} setCountry={setCountry} disabled={scanning} />
            <span style={{ padding: '4px 9px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.28)', flexShrink: 0 }}>
              {adminLabels.level2} &amp; {adminLabels.level1} Only
            </span>

            <div style={{ position: 'relative', flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Search size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => { loadSuggestions(rawInput); setShowDropdown(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setShowDropdown(true); setSelectedIdx((p) => Math.min(dropdownItems.length - 1, p + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((p) => Math.max(-1, p - 1)); }
                  else if (e.key === 'Enter') { e.preventDefault(); if (showDropdown && selectedIdx >= 0 && dropdownItems[selectedIdx]) applySuggestion(dropdownItems[selectedIdx]); else triggerSweep(); }
                  else if (e.key === 'Escape') setShowDropdown(false);
                }}
                placeholder={`e.g. Hotels in ${adminLabels.hint.replace(/^e\.g\.\s*/i, '')}`}
                disabled={scanning}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--lp-ink)', fontFamily: 'var(--lp-font-sans)' }}
              />
              {!rawInput && !scanning && <kbd title="Press / to focus search" style={{ fontFamily: 'var(--lp-font-mono)', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.12)', color: '#64748b' }}>/</kbd>}
              {rawInput && !scanning && (
                <button type="button" onClick={() => { selfEmitRef.current = { q: '', c: '' }; setRawInput(''); setQuery?.(''); setCity?.(''); setInputError(''); inputRef.current?.focus(); }} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              {leadCount > 0 && onExport && <LiquidButton variant="glass-gold" size="sm" icon={Download} onClick={onExport} badge={leadCount}>Export CSV</LiquidButton>}
              {scanning ? (
                <LiquidButton variant="rose" size="md" icon={Square} onClick={onStop}>Halt Sweep</LiquidButton>
              ) : (
                <LiquidButton variant="gold" size="md" icon={Play} onClick={triggerSweep} disabled={validating}>{validating ? 'Checking…' : ctaLabel}</LiquidButton>
              )}
            </div>
          </div>

          {(inputError || autoSwitchNote || query || city) && (
            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(15,23,42,0.06)', overflowX: 'auto', flexWrap: 'wrap' }}>
              {autoSwitchNote && <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', padding: '2px 8px', borderRadius: 8, background: '#ecfdf5' }}>{autoSwitchNote}</span>}
              {inputError && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#be123c', padding: '3px 9px', borderRadius: 8, background: '#fff1f2' }}><AlertTriangle size={12} /> {inputError}</span>}
              {fixChips.map((chip) => (
                <button key={chip} type="button" onClick={() => applySuggestion({ category: query || 'Hotels', city: chip })} style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#92400e', border: '1px dashed rgba(217,119,6,0.5)', cursor: 'pointer' }}>
                  Use: {chip}
                </button>
              ))}
              {query && <IntentPill icon={Tag} tone="gold">{query}</IntentPill>}
              {query && taxonomyInfo?.intentMeta?.badge && (
                <IntentPill tone={taxonomyInfo.intentMeta.tone || 'sapphire'}>
                  {taxonomyInfo.isProductQuery ? 'Product → Store' : taxonomyInfo.intentMeta.badge}
                </IntentPill>
              )}
              {city && (
                <IntentPill icon={MapPin} tone="sapphire">
                  {formatPlaceDisplay(city, country, true)}{territoryCounts ? ` · ${territoryCounts.hqWards} HQ → ${territoryCounts.towns} Towns → ${territoryCounts.mandals} Sub-Divs` : ''}
                </IntentPill>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15,23,42,0.1)' }}>
                <FlagSphere code={country} size={13} /> {activeCountry.name}
              </span>
              {taxonomyInfo.mode === 'niche' && query.length >= 2 && <IntentPill icon={ShieldCheck} tone="emerald">Strict category match</IntentPill>}
              {taxonomyInfo.mode === 'umbrella' && (
                <>
                  <IntentPill icon={Layers} tone="sapphire" onClick={disabledSubs.size > 0 ? () => setDisabledSubs(new Set()) : undefined}>
                    {taxonomyInfo.subcategories.length - disabledSubs.size}/{taxonomyInfo.subcategories.length} sub-categories in every unit
                  </IntentPill>
                  {taxonomyInfo.subcategories.map((sub) => {
                    const active = !disabledSubs.has(sub);
                    return (
                      <IntentPill key={sub} tone="gold" active={active} onClick={() => setDisabledSubs((p) => { const n = new Set(p); if (n.has(sub)) n.delete(sub); else if (n.size < taxonomyInfo.subcategories.length - 1) n.add(sub); return n; })}>
                        {active ? '✓ ' : '+ '}{sub}
                      </IntentPill>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showDropdown && dropdownItems.length > 0 && (
        <OmniSearchDropdown
          items={dropdownItems}
          selectedIdx={selectedIdx}
          isRecentMode={showingRecents}
          headerLabel={showingRecents ? `Recent Master Sweeps (${activeCountry.name})` : `Master Fleet · ${adminLabels.level1} & ${adminLabels.level2} (${activeCountry.name})`}
          headerRight={`HQ Wards → Towns → ${adminLabels.level3}`}
          country={country}
          onSelect={applySuggestion}
          onClearRecents={() => { clearRecentSearches(country, MASTER_RECENT_KEY); setRecentList([]); }}
        />
      )}
    </div>
  );
}
