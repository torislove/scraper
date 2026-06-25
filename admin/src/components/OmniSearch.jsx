import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, List, ArrowRight, X, Clock, BrainCircuit, Command } from 'lucide-react';
import { initializeOrama, performOramaSearch } from '../utils/oramaEngine';
import Fuse from 'fuse.js';

export default function OmniSearch({ 
  onSearch, 
  knowledge = { categories: [], locations: [] },
  history = [] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const intentRef = useRef({ cat: '', loc: '' });
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const fuseRef = useRef({ categories: null, locations: null });
  const [oramaReady, setOramaReady] = useState(false);

  // Setup Engines (Orama + Fuse)
  useEffect(() => {
    const formattedCategories = knowledge.categories || [];
    const formattedLocations = knowledge.locations ? knowledge.locations.map(l => l.name) : [];
    
    // 1. Initialize Fuse Fallback Engine
    fuseRef.current.categories = new Fuse(formattedCategories, { threshold: 0.4, includeScore: true });
    fuseRef.current.locations = new Fuse(formattedLocations, { threshold: 0.4, includeScore: true });

    // 2. Initialize Orama Primary Engine
    initializeOrama({ categories: formattedCategories, locations: formattedLocations })
      .then(() => setOramaReady(true));
  }, [knowledge]);

  // Global Hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto focus
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // ADVANCED NLP PARSER (Handles "ner", "arnd", etc)
  const parseQuery = (text) => {
    const lower = text.toLowerCase().trim();
    const regex = /\s+(in|at|near|ner|naer|around|arnd|of)\s+/i;
    const match = lower.match(regex);
    
    let cat = text.trim();
    let loc = '';

    if (match) {
      const index = match.index;
      cat = text.substring(0, index).trim();
      loc = text.substring(index + match[0].length).trim();
    } else {
      // Fallback: split on known states if no preposition is found
      const stateKeywords = ['telangana', 'andhra pradesh'];
      for (const state of stateKeywords) {
        const idx = lower.lastIndexOf(state);
        if (idx !== -1 && idx > 0) {
          const beforeChar = lower[idx - 1];
          if (beforeChar === ' ' || beforeChar === ',') {
            cat = text.substring(0, idx).trim();
            loc = text.substring(idx).trim();
            break;
          }
        }
      }
    }

    // CLEAN CATEGORY: Strip state keywords, administrative prefixes/suffixes, and deduplicate words to handle typos like "banquet halls telanganabanquet halls telangana"
    if (cat) {
      let cleanCat = cat.toLowerCase().trim();
      
      // Strip administrative keywords at start/end of category
      cleanCat = cleanCat.replace(/^(state|district|mandal|tehsil|village|districts|states|mandals|villages)\s+/gi, '');
      cleanCat = cleanCat.replace(/\s+(state|district|mandal|tehsil|village|districts|states|mandals|villages)$/gi, '');
      
      const stateKeywords = ['telangana', 'andhra pradesh'];
      for (const state of stateKeywords) {
        cleanCat = cleanCat.replace(new RegExp(state, 'gi'), '');
      }
      const words = cleanCat.trim().split(/\s+/).filter(Boolean);
      const uniqueWords = [...new Set(words)];
      // Capitalize first letter of each word to match standard category names (e.g. "Banquet Halls")
      cat = uniqueWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return { cat, loc };
  };

  // Helper: Get Best Match Hybrid (Orama -> Fuse)
  const getBestMatch = async (token, type) => {
    // Try Orama First (Ultra Fast, exact/prefix)
    const oramaRes = await performOramaSearch(token);
    const oramaMatch = oramaRes.find(r => r.type === type);
    if (oramaMatch) return oramaMatch.label;

    // Fallback to Fuse (Fuzzy, deep typo)
    const engine = type === 'category' ? fuseRef.current.categories : fuseRef.current.locations;
    if (engine) {
      const fuseRes = engine.search(token);
      if (fuseRes.length > 0) {
        const best = fuseRes[0];
        // Only accept high-confidence matches (score <= 0.3)
        if (best.score <= 0.3) {
          return best.item;
        }
      }
    }
    return null;
  };

  // Generate Suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(history.slice(0, 5).map(h => ({ type: 'history', text: h })));
      return;
    }

    const { cat, loc } = parseQuery(query);
    let isActive = true;
    
    const fetchResults = async () => {
      try {
        let sugs = [];

        // Always include the exact match suggestion at the top
        sugs.push({
          type: 'search',
          text: `Search for "${cat}${loc ? ' in ' + loc : ''}"`,
          parsedCat: cat,
          parsedLoc: loc
        });

        // 1. Full Query NLP Check
        const bestCatByString = await getBestMatch(cat, 'category') || cat;
        const bestLocByString = loc ? (await getBestMatch(loc, 'location') || loc) : '';

        // 2. Token-by-Token Magic Intent Parsing (Fallback)
        const tokens = query.split(' ').filter(t => t.trim().length > 1);
        let tokenCats = [];
        let tokenLocs = [];
        let matchedLocationToken = '';

        for (const token of tokens) {
          const c = await getBestMatch(token, 'category');
          const l = await getBestMatch(token, 'location');
          if (c) tokenCats.push(c);
          if (l) {
            tokenLocs.push(l);
            matchedLocationToken = token;
          }
        }

        const topCat = bestCatByString !== cat ? bestCatByString : cat;
        const topLoc = bestLocByString !== loc ? bestLocByString : (tokenLocs[0] || loc);

        // Store intelligent intent globally for fast Enter press
        intentRef.current = { cat: topCat, loc: topLoc };

        // 3. Assemble Suggestions
        if (loc) {
           // Let's suggest multiple categories with the top location
           const allCatMatches = fuseRef.current.categories?.search(cat).map(r => r.item) || knowledge.categories || [];
           const catsToSuggest = [...new Set([topCat, ...allCatMatches])].filter(Boolean);

           if (bestLocByString !== loc) {
             catsToSuggest.forEach(c => {
               sugs.push({ type: 'ai', text: `${c} in ${bestLocByString}`, parsedCat: c, parsedLoc: bestLocByString });
             });
           } else {
             const locMatches = fuseRef.current.locations?.search(loc).map(r => r.item) || [];
             if (locMatches.length > 0) {
                catsToSuggest.forEach(c => {
                  locMatches.slice(0, 5).forEach(m => { // still limit loc combos slightly to prevent combinatorial explosion
                     sugs.push({ type: 'ai', text: `${c} in ${m}`, parsedCat: c, parsedLoc: m });
                  });
                });
             } else {
                catsToSuggest.forEach(c => {
                  sugs.push({ type: 'search', text: `${c} in ${loc}`, parsedCat: c, parsedLoc: loc });
                });
             }
           }
        } else {
           // No location typed yet. Just Category.
           const allCatMatches = fuseRef.current.categories?.search(cat).map(r => r.item) || [];
           // If no match, just show all categories
           const fallbackCats = allCatMatches.length > 0 ? allCatMatches : (knowledge.categories || []);
           const catsToSuggest = [...new Set([topCat, ...fallbackCats])].filter(Boolean);
           
           catsToSuggest.forEach(c => {
             sugs.push({ type: 'category', text: `${c} in...`, parsedCat: c, parsedLoc: '' });
           });

           // Magic intent combo (if they typed a city name WITHOUT "in")
           if (tokenLocs.length > 0) {
              const matchedLocName = tokenLocs[0];
              const resolvedCat = tokenCats[0] || (matchedLocationToken ? query.replace(new RegExp(matchedLocationToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '').replace(/\s+/g, ' ').trim() : '');
              if (resolvedCat && resolvedCat.toLowerCase() !== 'in') {
                sugs.push({ 
                  type: 'ai', 
                  text: `${resolvedCat} in ${matchedLocName}`, 
                  parsedCat: resolvedCat, 
                  parsedLoc: matchedLocName 
                });
              }
           } else if (tokenCats.length > 0 && tokenLocs.length > 0) {
              sugs.push({ 
                type: 'ai', 
                text: `${tokenCats[0]} in ${tokenLocs[0]}`, 
                parsedCat: tokenCats[0], 
                parsedLoc: tokenLocs[0] 
              });
           }
        }

        // Deduplicate
        const uniqueSugs = [];
        const seen = new Set();
        for (const s of sugs) {
          const key = s.text.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSugs.push(s);
          }
        }

        if (isActive) {
          setSuggestions(uniqueSugs);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('[OmniSearch] Engine failed:', error);
        if (isActive) {
          setSuggestions([{ type: 'search', text: query, parsedCat: cat, parsedLoc: loc }]);
          setSelectedIndex(-1);
        }
      }
    };
    
    const timer = setTimeout(() => {
      fetchResults();
    }, 150);
    
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query, history, knowledge, oramaReady]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        if (suggestions.length === 0) return -1;
        if (prev === -1) return 0;
        return (prev + 1) % suggestions.length;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        if (suggestions.length === 0) return -1;
        if (prev === -1 || prev === 0) return suggestions.length - 1;
        return prev - 1;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && selectedIndex >= 0) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        const { cat, loc } = parseQuery(query);
        submitSearch(cat, loc);
      }
    }
  };

  const handleSelect = (sug) => {
    if (sug.type === 'history') {
      const { cat, loc } = parseQuery(sug.text);
      submitSearch(cat, loc);
    } else if (sug.type === 'category') {
      setQuery(sug.parsedCat + ' in ');
      if (inputRef.current) inputRef.current.focus();
    } else {
      submitSearch(sug.parsedCat, sug.parsedLoc);
    }
  };

  const submitSearch = (category, location) => {
    if (!category || !location) {
      setQuery(`${category || query} in `);
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    onSearch(category, location);
    setIsOpen(false);
  };

  const { cat, loc } = parseQuery(query);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between w-full max-w-2xl mx-auto bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Search size={18} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
          <span className="text-sm font-medium">Search anything (e.g., Photographers in Guntur)...</span>
        </div>
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <kbd className="bg-white px-2 py-1 rounded text-xs border border-gray-200 shadow-sm font-sans font-bold">Cmd K</kbd>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              ref={containerRef}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center px-4 py-4 border-b border-white/10 bg-white/5 relative z-10">
                <Search size={22} className="text-violet-500 mr-3 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What are you looking for? (e.g. Banquet Halls in Amaravathi)"
                  className="flex-1 bg-transparent text-white text-lg font-medium outline-none placeholder:text-white/30"
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                )}
                <div className="ml-3 px-2 py-1 bg-black/40 rounded border border-white/5 text-[10px] text-white/40 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Command size={10} /> Esc
                </div>
              </div>

              {query.trim().length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border-b border-white/5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-400">
                    <List size={12} /> {cat || '...'}
                  </div>
                  <span className="text-white/20 text-xs">in</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">
                    <MapPin size={12} /> {loc || '...'}
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {suggestions.length === 0 ? (
                  <div className="p-8 text-center text-white/30">
                    <BrainCircuit size={32} className="mx-auto mb-3 opacity-20" />
                    <p>Start typing to explore vendors and locations.</p>
                  </div>
                ) : (
                  suggestions.map((sug, i) => {
                    const isSelected = i === selectedIndex;
                    let Icon = Search;
                    let color = 'text-white/40';
                    let bg = 'bg-white/5';
                    
                    if (sug.type === 'history') { Icon = Clock; }
                    else if (sug.type === 'category') { Icon = List; color = 'text-blue-400'; bg = 'bg-blue-500/10'; }
                    else if (sug.type === 'ai') { Icon = BrainCircuit; color = 'text-violet-400'; bg = 'bg-violet-500/10'; }
                    else if (sug.type === 'search') { Icon = Search; color = 'text-emerald-400'; bg = 'bg-emerald-500/10'; }

                    return (
                      <div
                        key={i}
                        onMouseEnter={() => setSelectedIndex(i)}
                        onClick={() => handleSelect(sug)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={16} className={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                            {sug.text}
                          </p>
                        </div>
                        {isSelected && <ArrowRight size={16} className="text-white/30 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
