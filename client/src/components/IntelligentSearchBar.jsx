import React, { useState, useRef, useEffect } from "react";
import { Search, X, XCircle, RefreshCw, Send, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import debounce from "lodash.debounce";
import axios from "axios";

export default function IntelligentSearchBar({
  onSearch,
  loading,
  onStop,
  searchRadius,
  setSearchRadius,
  fuseInstances,
  workerRef,
  autoLocation,
  apiUrl,
  omniQuery,
  setOmniQuery,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [didYouMean, setDidYouMean] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gomandap_search_history") || "[]");
    } catch {
      return [];
    }
  });

  const searchContainerRef = useRef(null);

  const osmCache = useRef({});

  // Super-fast intuitive sorting algorithm:
  // 1. Exact exact match
  // 2. Prefix exact match
  // 3. Shortest strings first
  const sortSuggestions = (sugs, query) => {
    const q = (query || "").toLowerCase().trim();
    const validSugs = sugs.filter(s => typeof s === 'string' && s.trim().length > 0);
    if (!q) return validSugs;
    
    return validSugs.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      const aExact = aLower === q;
      const bExact = bLower === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = aLower.startsWith(q);
      const bStarts = bLower.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      if (aStarts && bStarts) return a.length - b.length;
      return 0;
    });
  };

  // Debounced OSM Fetcher
  const debouncedOSMSearch = useRef(
    debounce(async (searchVal, prefix, exactVal) => {
      if (osmCache.current[searchVal]) {
        setSuggestions((prev) => {
          return [...new Set([exactVal, ...prev, ...osmCache.current[searchVal]])];
        });
        setShowSuggestions(true);
        return;
      }

      try {
        const res = await axios.get(`${apiUrl}/location/search`, {
          params: { q: searchVal },
        });
        
        let newSugs = [];
        if (res.data && res.data.length > 0) {
          newSugs = res.data.map((loc) => prefix + loc.display);
        }
        
        osmCache.current[searchVal] = newSugs;

        setSuggestions((prev) => {
          const merged = [...new Set([exactVal, ...prev, ...newSugs])];
          return sortSuggestions(merged, exactVal);
        });
        setShowSuggestions(true);
      } catch (e) {
        console.error("OSM Search failed", e);
      }
    }, 50)
  ).current;

  // Handle worker messages for Semantic Search
  useEffect(() => {
    if (!workerRef || !workerRef.current) return;

    const handleWorkerMessage = (event) => {
      const msg = event.data;
      if (msg.status === "search_results") {
        const topMatches = msg.results.filter((r) => r.score > 0.4);
        let topSuggestions = topMatches.map((r) => (msg.prefix || "") + r.text);

        if (!msg.prefix && topMatches.length > 0 && topMatches[0].type === "category") {
          topSuggestions.push(`${topMatches[0].text} in `);
        }

        const currentQueryLower = ((msg.prefix || "") + (msg.text || "")).toLowerCase();
        const matchingHistory = searchHistory.filter(
          (h) => h.toLowerCase().includes(currentQueryLower) && currentQueryLower.length > 0
        );

        setSuggestions((prev) => {
          const merged = [...new Set([...matchingHistory, ...prev, ...topSuggestions])];
          return sortSuggestions(merged, ((msg.prefix || "") + (msg.text || "")));
        });
        setShowSuggestions(true);
      }
    };

    workerRef.current.addEventListener("message", handleWorkerMessage);
    return () => {
      workerRef.current.removeEventListener("message", handleWorkerMessage);
    };
  }, [workerRef, searchHistory]);

  const handleSearchChange = (val) => {
    setOmniQuery(val);
    setDidYouMean(""); // Reset by default

    if (val.trim().length === 0) {
      if (searchHistory.length > 0) {
        setSuggestions(searchHistory);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const prepRegex = /\s+(in|near|at|around)\s+/i;
    const match = val.match(prepRegex);

    let rawCategory = val.trim();
    let searchVal = "";
    let prefix = "";

    if (match) {
      rawCategory = val.substring(0, match.index).trim();
      searchVal = val.substring(match.index + match[0].length).trim();
    }

    let correctedCategory = rawCategory;
    if (fuseInstances && fuseInstances.categories && rawCategory) {
      const catResult = fuseInstances.categories.search(rawCategory);
      if (catResult.length > 0 && catResult[0].score < 0.45) {
        correctedCategory = catResult[0].item;
        if (correctedCategory.toLowerCase() !== rawCategory.toLowerCase() && rawCategory.length > 3) {
          setDidYouMean(`${correctedCategory} ${match ? match[0].trim() : ''} ${searchVal}`.trim());
        }
      }
    }

    if (match) {
      prefix = correctedCategory + " " + match[0].trim() + " ";
    } else {
      prefix = correctedCategory;
    }

    let exactValCorrectedCategory = val;
    if (match) {
      exactValCorrectedCategory = correctedCategory + " " + match[0].trim() + " " + searchVal;
    } else {
      exactValCorrectedCategory = correctedCategory;
    }

    // INSTANT SUGGESTIONS via Fuse.js (Typo tolerance & fast autocomplete)
    let instantSuggestions = [];
    if (!match && fuseInstances && fuseInstances.categories && rawCategory.length > 0) {
      const catResult = fuseInstances.categories.search(rawCategory);
      instantSuggestions = catResult.filter(r => r.score < 0.6).map(r => r.item);
      if (instantSuggestions.length > 0) {
        // add "in " hint for the top suggestion
        instantSuggestions.splice(1, 0, instantSuggestions[0] + " in ");
      }
    } else if (match && searchVal.length > 0 && fuseInstances && fuseInstances.locations) {
      const locResult = fuseInstances.locations.search(searchVal);
      instantSuggestions = locResult.filter(r => r.score < 0.6).map(r => prefix + r.item);
    }

    const currentQueryLower = val.toLowerCase();
    const matchingHistory = searchHistory.filter(
      (h) => h && h.toLowerCase().includes(currentQueryLower) && currentQueryLower.length > 0
    );

    setSuggestions(sortSuggestions([...new Set([val, exactValCorrectedCategory, ...matchingHistory, ...instantSuggestions])], val));
    setShowSuggestions(true);

    // Execute Local Semantic Search immediately ONLY for categories
    if (workerRef && workerRef.current && !match) {
      workerRef.current.postMessage({
        action: "search",
        text: rawCategory,
        prefix: "",
        id: Date.now(),
      });
    }
    setSuggestionIndex(-1);

    // Debounced OpenStreetMap Search for obscure villages
    if (match && searchVal.length > 2) {
      debouncedOSMSearch(searchVal, prefix, exactValCorrectedCategory);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && omniQuery.length > 0 && suggestions.length > 0) {
      const best = suggestions[0];
      if (best.toLowerCase().startsWith(omniQuery.toLowerCase())) {
        e.preventDefault();
        setOmniQuery(best);
        if (!best.endsWith(" in ")) {
          setShowSuggestions(false);
          submitSearch(best);
        } else {
          searchContainerRef.current?.querySelector("input")?.focus();
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && suggestionIndex >= 0) {
      e.preventDefault();
      const sel = suggestions[suggestionIndex];
      setOmniQuery(sel);
      setShowSuggestions(false);
      submitSearch(sel);
    }
  };

  const submitSearch = (queryOverride = null) => {
    const q = queryOverride || omniQuery;
    if (!q.trim()) return;

    // Save to history
    const newHistory = [q, ...searchHistory.filter((item) => item !== q)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("gomandap_search_history", JSON.stringify(newHistory));

    setShowSuggestions(false);
    onSearch(q);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitSearch();
      }}
      className="w-full max-w-2xl relative"
      ref={searchContainerRef}
    >
      <div className="relative group flex items-center liquid-glass-3d focus-within:glow-cyan transition-all shadow-2xl">
        <Search className="absolute left-4 text-white/40 group-focus-within:text-white transition-colors z-20" size={20} />

        {/* Ghost text container */}
        <div className="absolute inset-y-0 left-12 right-32 flex items-center pointer-events-none z-0 overflow-hidden">
          <span className="text-transparent whitespace-pre px-0 text-lg font-sans tracking-normal">
            {omniQuery}
          </span>
          {omniQuery.length > 0 &&
            suggestions.length > 0 &&
            suggestions[0].toLowerCase().startsWith(omniQuery.toLowerCase()) && (
              <span className="text-white/20 whitespace-pre text-lg font-sans tracking-normal">
                {suggestions[0].slice(omniQuery.length)}
              </span>
            )}
        </div>

        <input
          type="text"
          placeholder={`e.g. 'Photographers in ${autoLocation || "Hyderabad"}' or 'Banquet Halls'`}
          className="w-full bg-transparent text-white placeholder-white/30 pl-12 pr-[20rem] py-4 rounded-xl outline-none text-lg relative z-10 font-sans tracking-normal"
          value={omniQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (omniQuery.trim().length === 0 && searchHistory.length > 0) {
              setSuggestions(searchHistory);
              setShowSuggestions(true);
            } else if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {!loading && omniQuery && (
          <button
            type="button"
            onClick={() => {
              setOmniQuery("");
              setSuggestions([]);
              setSuggestionIndex(-1);
              setDidYouMean("");
            }}
            className="absolute right-[17rem] text-white/30 hover:text-white transition-colors z-20"
            title="Clear Search"
          >
            <X size={18} />
          </button>
        )}
        {loading && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onStop();
            }}
            className="absolute right-[17rem] text-red-400 hover:text-red-500 transition-colors z-20 flex items-center gap-1 text-xs font-bold bg-red-500/10 px-2 py-1 rounded"
            title="Stop Scraping"
          >
            <XCircle size={14} /> STOP
          </button>
        )}
        <div className="absolute right-2 flex items-center gap-2 z-20">
          <select
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="bg-white/5 text-white/70 text-sm py-1.5 px-2 rounded-md border border-white/10 focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
          >
            <option value={0}>Exact City</option>
            <option value={20}>+20km Radius</option>
            <option value={50}>+50km Radius</option>
            <option value={100}>+100km Radius</option>
          </select>
          <button
            type="submit"
            className={`p-2.5 rounded-lg transition-colors shadow-sm ${loading ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-white text-black hover:bg-white/90"}`}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* Progress Animation Bar */}
      {loading && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: "0%", x: "0%" }}
            animate={{ width: ["0%", "30%", "100%", "30%"], x: ["0%", "50%", "100%", "200%"] }}
            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
          />
        </div>
      )}

      <AnimatePresence>
        {((showSuggestions && suggestions.length > 0) || didYouMean) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute w-full mt-2 bg-black/95 border border-cyan-400/30 rounded-xl max-h-64 overflow-y-auto shadow-2xl z-50 custom-scrollbar"
          >
            {didYouMean && (
              <div
                className="px-4 py-3 text-sm cursor-pointer bg-fuchsia-900/20 border-b border-fuchsia-500/30 hover:bg-fuchsia-900/40 text-fuchsia-200 transition-colors flex items-center gap-3 font-semibold"
                onClick={() => {
                  setOmniQuery(didYouMean);
                  setDidYouMean("");
                  setShowSuggestions(false);
                  setTimeout(() => submitSearch(didYouMean), 50);
                }}
              >
                <span className="text-fuchsia-400">✨</span>
                Did you mean: <span className="underline decoration-fuchsia-400/50 underline-offset-4">{didYouMean}</span>?
              </div>
            )}
            {showSuggestions && [...new Set(omniQuery.trim().length > 0 ? [omniQuery, ...suggestions] : suggestions)].slice(0, 8).map((s, idx) => {
              const isHistory = omniQuery.trim().length === 0;
              return (
                <div
                  key={idx}
                  className={`px-4 py-3 text-sm cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-3 transition-colors ${
                    suggestionIndex === idx ? "bg-white/10 text-white" : "hover:bg-white/5 text-white/70 hover:text-white"
                  }`}
                  onClick={() => {
                    setOmniQuery(s);
                    setShowSuggestions(false);
                    if (isHistory || !s.endsWith(" in ")) {
                      setTimeout(() => submitSearch(s), 50);
                    } else {
                      searchContainerRef.current?.querySelector("input")?.focus();
                    }
                  }}
                >
                  {isHistory ? <Clock size={14} className="text-white/30" /> : <Search size={14} className={suggestionIndex === idx ? "text-white" : "text-white/30"} />}
                  {s}
                </div>
              );
            })}
            {omniQuery.trim().length === 0 && searchHistory.length > 0 && (
              <div
                className="px-4 py-2 text-xs text-red-400/70 hover:text-red-400 cursor-pointer bg-[#1a1a1a] flex items-center justify-center gap-1 border-t border-white/5"
                onClick={() => {
                  setSearchHistory([]);
                  localStorage.removeItem("gomandap_search_history");
                  setShowSuggestions(false);
                }}
              >
                <Trash2 size={12} /> Clear History
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
