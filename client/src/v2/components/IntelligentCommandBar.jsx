import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, MapPin, Play, Square, Download, Sparkles, Loader2, Globe, Shield, ArrowRight } from 'lucide-react';
import { COUNTRIES, FOCUS_COUNTRIES } from '../data/countries';
import { suggestSearch } from '../api';

const suggestLruCache = new Map();

// Google-style token highlighter
function HighlightedText({ text, query }) {
  const str = String(text || '');
  const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(t => t.length >= 2 && !['in', 'at', 'near', 'of'].includes(t));
  if (!tokens.length) return <span>{str}</span>;
  const regex = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = str.split(regex);
  return (
    <span>
      {parts.map((part, i) => regex.test(part) ? (
        <span key={i} className="font-bold text-amber-600 bg-amber-50/80 rounded px-0.5">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      ))}
    </span>
  );
}

export default function IntelligentCommandBar({
  query,
  setQuery,
  city,
  setCity,
  country,
  setCountry,
  strategy,
  setStrategy,
  scanning,
  onStart,
  onStop,
  onExport,
  leadCount = 0,
  activePoint = null
}) {
  const [rawInput, setRawInput] = useState('');
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ghostText, setGhostText] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceTimer = useRef(null);
  const inputRef = useRef(null);

  // Sync initial query & city into rawInput
  useEffect(() => {
    if (query && city && !rawInput) {
      setRawInput(`${query} in ${city}`);
    }
  }, [query, city]);

  // Country-specific typewriter inspirations
  const inspirations = useMemo(() => {
    if (country === 'US') return ['Dental Clinics in Dallas', 'Roofing Contractors in Austin', 'Personal Injury Lawyers in Houston'];
    if (country === 'GB') return ['Gas Safe Plumbers in Manchester', 'Solicitors in London', 'Gastropubs in Edinburgh'];
    if (country === 'AU') return ['Tradies in Sydney', 'Solar Installers in Brisbane', 'Medical Centres in Melbourne'];
    return ['Dental Hospitals in Guntur', 'Turmeric Traders in Tenali', 'Biryani Centers in Hyderabad'];
  }, [country]);

  // Typewriter placeholder animation
  useEffect(() => {
    let pIdx = 0, cIdx = 0, deleting = false, timer = null;
    const tick = () => {
      const phrase = inspirations[pIdx % inspirations.length];
      if (!deleting) {
        setPlaceholderText(phrase.slice(0, cIdx + 1));
        cIdx++;
        if (cIdx === phrase.length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
          return;
        }
      } else {
        setPlaceholderText(phrase.slice(0, cIdx - 1));
        cIdx--;
        if (cIdx <= 0) {
          deleting = false;
          pIdx++;
          timer = setTimeout(tick, 400);
          return;
        }
      }
      timer = setTimeout(tick, deleting ? 35 : 75);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [inspirations]);

  // Keystroke Suggestion Fetcher with 0ms LRU Cache
  const handleInputChange = (val) => {
    setRawInput(val);
    setSelectedIdx(-1);
    setGhostText('');

    // Natural Language Query Split: "category in city"
    const match = val.match(/^(.*?)\s+(?:in|near|at|,|around)\s+(.*)$/i);
    if (match) {
      setQuery(match[1].trim());
      setCity(match[2].trim());
    } else {
      setQuery(val);
    }

    if (val.trim().length < 2) {
      setSuggestionsData(null);
      return;
    }

    const cacheKey = `${country}_${val.trim().toLowerCase()}`;
    if (suggestLruCache.has(cacheKey)) {
      const cached = suggestLruCache.get(cacheKey);
      setSuggestionsData(cached);
      updateGhost(val, cached);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const data = await suggestSearch({ q: val, country });
        if (data) {
          suggestLruCache.set(cacheKey, data);
          setSuggestionsData(data);
          updateGhost(val, data);
        }
      } catch (_) {}
    }, 80);
  };

  const updateGhost = (val, data) => {
    const first = data?.suggestions?.[0]?.text;
    if (first && first.toLowerCase().startsWith(val.toLowerCase()) && first.length > val.length) {
      setGhostText(first.slice(val.length));
    } else {
      setGhostText('');
    }
  };

  const applySuggestion = (suggText) => {
    setRawInput(suggText);
    const match = suggText.match(/^(.*?)\s+(?:in|near|at|,|around)\s+(.*)$/i);
    if (match) {
      setQuery(match[1].trim());
      setCity(match[2].trim());
    } else {
      setQuery(suggText);
    }
    setShowDropdown(false);
    setGhostText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' || (e.key === 'ArrowRight' && ghostText)) {
      if (ghostText) {
        e.preventDefault();
        applySuggestion(rawInput + ghostText);
        return;
      }
    }
    const items = suggestionsData?.suggestions || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setShowDropdown(false);
      if (selectedIdx >= 0 && items[selectedIdx]) {
        applySuggestion(items[selectedIdx].text);
      } else {
        onStart();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 transition-all relative">
      {/* 4 Focus Hubs Quick-Toggle Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10.5px]">Core Sovereign Hubs:</span>
          <div className="flex items-center gap-1">
            {FOCUS_COUNTRIES.map((fc) => (
              <button
                key={fc.code}
                type="button"
                onClick={() => setCountry(fc.code)}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  country === fc.code
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200 scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{fc.flag}</span>
                <span>{fc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sovereign Country Mismatch Detection Alert */}
        {suggestionsData?.detectedCountryMismatch && suggestionsData.detectedCountryMismatch.detectedCountry !== country && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 animate-pulse">
            <span>📍 Detected <b>{suggestionsData.detectedCountryMismatch.countryName}</b> ({suggestionsData.detectedCountryMismatch.matchedPlace})</span>
            <button
              type="button"
              onClick={() => setCountry(suggestionsData.detectedCountryMismatch.detectedCountry)}
              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10.5px]"
            >
              Switch to {suggestionsData.detectedCountryMismatch.flag}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Intelligent Google-Grade Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={rawInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
              onKeyDown={handleKeyDown}
              placeholder={`e.g. ${placeholderText}`}
              disabled={scanning}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-60 relative z-10"
            />
            {ghostText && (
              <div className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none z-10">
                <span className="opacity-0">{rawInput}</span>
                <span>{ghostText}</span>
                <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-slate-200/70 text-slate-600 rounded">Tab ⇥</span>
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestionsData?.suggestions?.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 overflow-hidden">
              {suggestionsData.suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={() => applySuggestion(item.text)}
                  className={`px-3.5 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    selectedIdx === idx ? 'bg-amber-50 text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <HighlightedText text={item.text} query={rawInput} />
                  </div>
                  {item.naics && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md shrink-0 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-emerald-600" /> NAICS {item.naics.code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* City Input (Manual Override) */}
        <div className="relative w-full md:w-48">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (query) setRawInput(`${query} in ${e.target.value}`);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Target City..."
            disabled={scanning}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        {/* 11 Sovereign Countries Dropdown */}
        <div className="relative w-full md:w-36">
          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={scanning}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer disabled:opacity-60"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Execution Trigger Buttons */}
        <div className="flex items-center gap-2">
          {scanning ? (
            <button
              onClick={onStop}
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all shadow-sm shadow-rose-200 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              type="button"
              disabled={!query.trim() || !city.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-sm shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Sweep</span>
            </button>
          )}

          {leadCount > 0 && (
            <button
              onClick={onExport}
              type="button"
              title="Download CSV"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Live Status Ribbon */}
      {scanning && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-700">Multi-Engine Sweep Active:</span>
            <span>{activePoint ? (activePoint.name || activePoint.label) : 'Scanning zones...'}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-emerald-600 font-bold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Streaming Live Leads ({leadCount})</span>
          </div>
        </div>
      )}
    </div>
  );
}
