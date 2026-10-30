import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Check, X, Sparkles, Building2, 
  Map, Compass, Store, Zap, Clock, Trash2, ArrowUpRight,
  Car, Scissors, Mail, Wrench, Landmark, Camera, Star, Layers, Globe, Square
} from 'lucide-react';
import { 
  resolvePanIndiaLocation, 
  searchLocations, 
  searchCategories,
  POPULAR_CATEGORIES,
  PAN_INDIA_REGIONS, 
  AUTHORITATIVE_MANDALS 
} from '../data/panIndiaGazetteer';

// Levenshtein distance for fuzzy typo auto-correction
function levenshteinDistance(a, b) {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const matrix = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[al][bl];
}

// Helper to highlight matching text in search suggestions
function HighlightedText({ text, highlight }) {
  if (!highlight || !highlight.trim()) {
    return <span>{text}</span>;
  }
  const cleanHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${cleanHighlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase().trim() ? (
          <span key={i} className="text-cyan-300 font-black underline decoration-cyan-500/50">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function UniversalSearchBar({
  onSearchQuery,
  currentCategory = '',
  currentLocation = '',
  activeDistrict = '',
  activeMandal = '',
  onTerritoryChange,
  vendors = [],
  isAutonomousActive = true,
  onAbort,
  isScrapingActive = false
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [districtFilter, setDistrictFilter] = useState(activeDistrict || '');
  const [mandalFilter, setMandalFilter] = useState(activeMandal || '');
  const [autoCorrection, setAutoCorrection] = useState(null);
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  // Persistent Search History with local storage
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('gomandap_search_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      'cars in macherla',
      'cars in nalgonda',
      'photographers in guntur',
      'wedding cards in chebrolu',
      'cafes in bangalore'
    ];
  });

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Save to History
  const saveToHistory = (item) => {
    if (!item || !item.trim()) return;
    const trimmed = item.trim();
    setSearchHistory((prev) => {
      const updated = [trimmed, ...prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      try { localStorage.setItem('gomandap_search_history', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
  };

  const deleteHistoryItem = (e, itemToDelete) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter(h => h !== itemToDelete);
      try { localStorage.setItem('gomandap_search_history', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
  };

  const clearAllHistory = (e) => {
    e.stopPropagation();
    setSearchHistory([]);
    try { localStorage.removeItem('gomandap_search_history'); } catch(e) {}
  };

  // Sync internal state if props change externally
  useEffect(() => {
    if (activeDistrict) setDistrictFilter(activeDistrict);
    if (activeMandal) setMandalFilter(activeMandal);
  }, [activeDistrict, activeMandal]);

  // Synchronize initial query if empty
  useEffect(() => {
    if (!query && (currentCategory || currentLocation)) {
      setQuery(`${currentCategory || 'Businesses'} in ${currentLocation || activeMandal || activeDistrict}`);
    }
  }, []);

  // Global Cmd+K / Ctrl+K hotkey
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Parse current query
  const currentParsed = useMemo(() => {
    return resolvePanIndiaLocation(query, districtFilter, mandalFilter);
  }, [query, districtFilter, mandalFilter]);

  // Dynamic typo auto-correction
  useEffect(() => {
    if (!query || query.trim().length < 4) {
      setAutoCorrection(null);
      return;
    }

    const words = currentParsed.category.split(/\s+/);
    let correctedCat = currentParsed.category;
    let hasCorrection = false;

    const COMMON_WORDS = [
      'cars', 'car dealers', 'automobiles', 'barbers', 'saloons', 'salons', 'hair stylists',
      'wedding cards', 'invitations', 'offset printers', 'banquet halls', 'function halls',
      'photographers', 'studios', 'videography', 'catering', 'caterers', 'decorators',
      'restaurants', 'hotels', 'hospitals', 'clinics', 'pharmacies', 'supermarkets', 'hardware stores'
    ];

    for (const w of words) {
      if (w.length > 3) {
        let bestDist = 99;
        let bestCandidate = null;
        for (const c of COMMON_WORDS) {
          const dist = levenshteinDistance(w.toLowerCase(), c.toLowerCase());
          if (dist > 0 && dist <= 2 && dist < bestDist) {
            bestDist = dist;
            bestCandidate = c;
          }
        }
        if (bestCandidate && bestDist <= 2) {
          correctedCat = correctedCat.replace(new RegExp(`\\b${w}\\b`, 'gi'), bestCandidate);
          hasCorrection = true;
        }
      }
    }

    if (hasCorrection) {
      const fullSuggested = `${correctedCat} in ${currentParsed.location}`;
      if (fullSuggested.toLowerCase() !== query.toLowerCase()) {
        setAutoCorrection(fullSuggested);
      } else {
        setAutoCorrection(null);
      }
    } else {
      setAutoCorrection(null);
    }
  }, [query, currentParsed]);

  // Execute Search
  const handleExecuteSearch = (customQuery = null, forceLocation = null, forceMandal = null) => {
    let searchText = customQuery != null ? customQuery : query;
    if (!searchText.trim()) return;

    let parsed = resolvePanIndiaLocation(searchText, districtFilter, mandalFilter);

    if (forceLocation) {
      searchText = `${parsed.category} in ${forceLocation}`;
      parsed = resolvePanIndiaLocation(searchText, districtFilter, mandalFilter);
      setQuery(searchText);
    } else if (forceMandal) {
      searchText = `${parsed.category} in ${forceMandal}, ${parsed.district}`;
      parsed = resolvePanIndiaLocation(searchText, parsed.district, forceMandal);
      setQuery(searchText);
    }

    saveToHistory(searchText);
    setIsOpen(false);
    setKeyboardIndex(-1);

    if (onSearchQuery) {
      onSearchQuery({
        category: parsed.category,
        location: parsed.location,
        district: parsed.district,
        mandal: parsed.mandal,
        state: parsed.state,
        lat: parsed.lat,
        lng: parsed.lng,
        isDualCityAndDistrict: parsed.isDualCityAndDistrict,
        allMandals: parsed.allMandals,
        rawQuery: searchText
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // WORLD-CLASS GOOGLE-GRADE AUTOCOMPLETE INTELLIGENCE ENGINE
  // ──────────────────────────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();

    // 1. If Empty, Show Recent Searches & Trending Pan-India Starters
    if (!q) {
      let initialSections = [];
      if (searchHistory.length > 0) {
        initialSections.push({
          type: 'history',
          title: 'Recent Searches',
          items: searchHistory.map(h => ({
            label: h,
            sub: 'Previous search history',
            query: h,
            isHistory: true,
            icon: Clock
          }))
        });
      }
      initialSections.push({
        type: 'popular',
        title: 'Trending Pan-India Searches',
        items: [
          { label: `Cars in Macherla`, sub: 'Automobiles & Car Dealers in Palnadu District, AP', query: `cars in macherla`, icon: Car, tag: 'Town / Mandal' },
          { label: `Cars in Nalgonda`, sub: 'Whole District • Covers all 31 Mandals, Telangana', query: `cars in nalgonda`, icon: Car, tag: 'District' },
          { label: `Cafes in Bangalore`, sub: 'Specialty Coffee & Roasters in Karnataka', query: `cafes in bangalore`, icon: Store, tag: 'Metro' },
          { label: `Hotels in Jaipur`, sub: 'Resorts & Heritage Stays in Rajasthan', query: `hotels in jaipur`, icon: Building2, tag: 'Metro' },
          { label: `Textiles in Surat`, sub: 'Wholesale Fabric & Sarees in Gujarat', query: `textiles in surat`, icon: Store, tag: 'Metro' },
          { label: `Wedding Cards in Chebrolu`, sub: 'Printing & Invites in Guntur District', query: `wedding cards in chebrolu`, icon: Mail, tag: 'Mandal' }
        ]
      });
      return initialSections;
    }

    let results = [];

    // Parse whether user typed "[category] in [loc_prefix]" or just words
    const prepMatch = q.match(/\s+(in|at|near|around|of)\s+/i);
    let categoryPart = q;
    let locationPart = '';

    if (prepMatch) {
      categoryPart = q.substring(0, prepMatch.index).trim();
      locationPart = q.substring(prepMatch.index + prepMatch[0].length).trim();
    }

    // 2. REAL-TIME TYPEAHEAD LOCATION MATCHES
    // If the user typed a location part ("in mac") OR if the whole query looks like a location ("mach", "nalg")
    const testLocationToken = locationPart || q;
    const matchingPlaces = searchLocations(testLocationToken, 4);

    if (matchingPlaces.length > 0) {
      const activeCat = categoryPart && categoryPart !== q ? categoryPart : 'Businesses';
      const capCat = activeCat.charAt(0).toUpperCase() + activeCat.slice(1);

      const placeItems = [];

      for (const place of matchingPlaces) {
        const isTownMandal = place.type === 'town' || place.type === 'mandal';
        const isDistrict = place.type === 'district';
        const isMetro = place.type === 'metro' || place.type === 'city';

        const hierarchyDesc = isTownMandal
          ? `Town / Mandal in ${place.district} District, ${place.state}`
          : isDistrict
            ? `District Headquarters in ${place.state} • Covers ${AUTHORITATIVE_MANDALS[place.district.toLowerCase()]?.length || 'all'} Mandals`
            : `Metropolitan Hub in ${place.state}`;

        // Option A: Specific Local Search
        placeItems.push({
          label: `${capCat} in ${place.name}, ${place.district} (${place.state})`,
          sub: `${hierarchyDesc} • Precise local search`,
          query: `${capCat} in ${place.name}, ${place.district}`,
          isPrimary: true,
          icon: isTownMandal ? MapPin : isDistrict ? Landmark : Globe,
          tag: isTownMandal ? 'Town / Mandal' : isDistrict ? 'District' : 'Metro',
          highlight: testLocationToken
        });

        // Option B: If it's a town, also suggest expanding to whole parent district
        if (isTownMandal && place.district && place.district.toLowerCase() !== place.name.toLowerCase()) {
          const mandalsCount = AUTHORITATIVE_MANDALS[place.district.toLowerCase()]?.length || 24;
          placeItems.push({
            label: `${capCat} in ${place.district} (Whole District - ${mandalsCount} Mandals)`,
            sub: `Expand search across all ${mandalsCount} mandals in ${place.district} District`,
            query: `${capCat} in ${place.district}`,
            icon: Landmark,
            tag: 'Whole District',
            highlight: place.district
          });
        }
      }

      results.push({
        type: 'places',
        title: 'Geographic Intelligence Match',
        items: placeItems
      });
    }

    // 3. REAL-TIME CATEGORY MATCHES
    // If the user is typing category letters ("car", "sal", "wed", "hot")
    const matchingCategories = searchCategories(categoryPart, 3);
    if (matchingCategories.length > 0) {
      const targetLoc = locationPart || districtFilter || 'India';
      const catItems = [];

      for (const c of matchingCategories) {
        catItems.push({
          label: `${c.term} in ${targetLoc}`,
          sub: `Search verified ${c.aliases.slice(0, 3).join(', ')}`,
          query: `${c.term} in ${targetLoc}`,
          icon: Store,
          tag: 'Category',
          highlight: categoryPart
        });
      }

      results.push({
        type: 'categories',
        title: 'Suggested Business Sectors',
        items: catItems
      });
    }

    // 4. SMART SEMANTIC VARIATIONS (Top Rated, Wholesale, Authorized)
    const effectiveLoc = currentParsed.location || districtFilter || 'India';
    const effectiveCat = currentParsed.category || 'Businesses';

    results.push({
      type: 'semantic',
      title: 'Contextual Search Modifiers',
      items: [
        { label: `Top Rated ${effectiveCat} in ${effectiveLoc}`, sub: 'Filter by ★ 4.5+ Verified Ratings', query: `Top Rated ${effectiveCat} in ${effectiveLoc}`, icon: Star, tag: 'High Rating' },
        { label: `Wholesale ${effectiveCat} in ${effectiveLoc}`, sub: 'Direct Stockists & Authorized Dealers', query: `Wholesale ${effectiveCat} in ${effectiveLoc}`, icon: Zap, tag: 'B2B Wholesale' },
        { label: `${effectiveCat} near ${effectiveLoc}`, sub: 'Nearby Local Radius Grid', query: `${effectiveCat} near ${effectiveLoc}`, icon: Compass, tag: 'Local Radius' }
      ]
    });

    return results;
  }, [query, currentParsed, searchHistory, districtFilter]);

  // Flattened items for seamless keyboard navigation
  const flatItems = useMemo(() => {
    return suggestions.flatMap(s => s.items);
  }, [suggestions]);

  // Handle Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setKeyboardIndex(prev => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setKeyboardIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (keyboardIndex >= 0 && keyboardIndex < flatItems.length) {
        const item = flatItems[keyboardIndex];
        setQuery(item.query);
        handleExecuteSearch(item.query);
      } else {
        handleExecuteSearch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full relative z-[9000]">
      {/* ── GOOGLE-STYLE DISTRACTION-FREE INPUT BAR ── */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 hover:border-violet-500/50 rounded-2xl p-2 shadow-2xl transition-all duration-200">
        <div className="flex items-center gap-3 px-3 py-1.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Search size={18} className="text-violet-400" />
          </div>

          <div className="flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setKeyboardIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search any business across India like Google (e.g. cars in macherla, cafes in bangalore, hotels in jaipur)..."
              className="w-full bg-transparent text-white placeholder-slate-500 text-sm font-semibold outline-none border-none focus:ring-0"
            />
          </div>

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}

          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400">
            <span>Cmd K</span>
          </div>

          <button
            type="button"
            onClick={() => handleExecuteSearch()}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-violet-600/30 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Zap size={14} className="text-yellow-300" />
            <span>Search</span>
          </button>
        </div>

        {/* ── AUTO-CORRECTION "DID YOU MEAN?" PILL ── */}
        <AnimatePresence>
          {autoCorrection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1.5 bg-violet-950/40 border-t border-violet-500/20 flex items-center justify-between text-xs text-left"
            >
              <div className="flex items-center gap-1.5 text-slate-300">
                <Sparkles size={13} className="text-yellow-300 shrink-0" />
                <span>Did you mean:</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(autoCorrection);
                    handleExecuteSearch(autoCorrection);
                  }}
                  className="font-bold text-cyan-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {autoCorrection}
                  <ArrowUpRight size={12} />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1-click auto-correct</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── GOOGLE-STYLE CLEAN SUGGESTIONS OVERLAY DROPDOWN (Z-[99999]) ── */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-2.5 space-y-3 z-[99999] text-left max-h-[500px] overflow-y-auto custom-scrollbar shadow-black/90 ring-1 ring-white/10"
          >
            {suggestions.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase font-black tracking-wider text-slate-400 border-b border-white/5 flex items-center justify-between">
                  <span>{section.title}</span>
                  {section.type === 'history' ? (
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                    >
                      Clear History
                    </button>
                  ) : null}
                </div>

                <div className="space-y-0.5">
                  {section.items.map((item, itemIdx) => {
                    const globalIdx = flatItems.indexOf(item);
                    const isKeyboardSelected = globalIdx === keyboardIndex;
                    const ItemIcon = item.icon || Search;

                    return (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() => {
                          setQuery(item.query);
                          handleExecuteSearch(item.query);
                        }}
                        onMouseEnter={() => setKeyboardIndex(globalIdx)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                          isKeyboardSelected 
                            ? 'bg-violet-600/30 border border-violet-500/40 text-white' 
                            : 'hover:bg-slate-800/90 text-slate-200 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <ItemIcon size={14} className={
                              item.isHistory ? 'text-slate-400 group-hover:text-cyan-400' :
                              item.isPrimary ? 'text-cyan-400 group-hover:text-yellow-300' :
                              'text-violet-400 group-hover:text-cyan-400'
                            } />
                            
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                              <HighlightedText text={item.label} highlight={item.highlight || query} />
                            </span>

                            {item.tag && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-slate-800/80 border border-white/10 text-slate-300 shrink-0">
                                {item.tag}
                              </span>
                            )}
                          </div>

                          {item.sub && (
                            <p className="text-[10px] text-slate-400 pl-5.5 truncate mt-0.5 font-normal">
                              {item.sub}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.isHistory && (
                            <span
                              onClick={(e) => deleteHistoryItem(e, item.query)}
                              className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={12} />
                            </span>
                          )}
                          <span className={`text-[10px] font-mono font-bold transition-opacity ${
                            isKeyboardSelected ? 'opacity-100 text-violet-300' : 'opacity-0 group-hover:opacity-100 text-slate-500'
                          }`}>
                            Instant ↵
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
