/**
 * shared/cockpit/CategoryAtlasDrawer.jsx
 * Animated 4-Level Interactive Tree:
 *   Level 1: 5 Active Revenue Countries (IN, US, GB, AU, AE)
 *   Level 2: Intent Branches (Services, Product Stores & Malls, Venues, B2B)
 *   Level 3: Category Nodes -> Level 4: Localized Subcategory Leaves
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, ShoppingBag, Building2, Factory, Sparkles, Search, Layers, ChevronsUpDown } from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '../data/countries';
import { UMBRELLA_TAXONOMY, PRODUCT_STORE_EXPANSIONS, SECTOR_INTENT_MAP } from '../data/taxonomyClient';
import { TRADE_EXPANSIONS } from '../data/tradeExpansions';
import FlagChip from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';
import CategoryTreeBranch from './CategoryTreeBranch';

const INTENT_BRANCHES = [
  { id: 'service', label: 'Services & Trades', subtitle: 'Contractors, repairs, clinics, doctors, lawyers, agencies & field trades', icon: Wrench, tone: '#92400e', bg: '#fffbeb', border: 'rgba(217,119,6,0.34)' },
  { id: 'store', label: 'Product Stores, Showrooms & Malls', subtitle: 'Retail stores, supply dealers, showrooms & shopping malls (auto-resolved from products)', icon: ShoppingBag, tone: '#0369a1', bg: '#f0f9ff', border: 'rgba(2,132,199,0.3)' },
  { id: 'venue', label: 'Venues & Institutions', subtitle: 'Hospitals, schools, colleges, hotels, restaurants, labs & fitness centers', icon: Building2, tone: '#047857', bg: '#ecfdf5', border: 'rgba(5,150,105,0.3)' },
  { id: 'b2b', label: 'Wholesale & Manufacturing (B2B)', subtitle: 'Factories, industrial units, stockists, wholesalers & distributors', icon: Factory, tone: '#9a3412', bg: '#fff7ed', border: 'rgba(234,88,12,0.3)' }
];

function buildFallbackCatalog(cc) {
  const seen = new Set();
  const list = [];
  const push = (item) => {
    if (!item || seen.has(item.key)) return;
    seen.add(item.key);
    list.push(item);
  };
  for (const p of PRODUCT_STORE_EXPANSIONS) {
    push({
      key: p.key, label: p.label, intentType: 'store', isProductStore: true,
      query: p.label.split('&')[0].trim(), subcategories: p.byCountry?.[cc] || p.byCountry?.default || []
    });
  }
  for (const t of TRADE_EXPANSIONS) {
    push({
      key: t.key, label: t.label, intentType: t.intentType || 'service',
      query: t.label.split('&')[0].trim(), subcategories: t.byCountry?.[cc] || t.byCountry?.default || []
    });
  }
  for (const u of UMBRELLA_TAXONOMY) {
    push({
      key: u.key, label: u.label, intentType: SECTOR_INTENT_MAP[u.key] || 'service',
      query: u.key.replace(/_/g, ' '), subcategories: u.subcategories || []
    });
  }
  return list;
}

export default function CategoryAtlasDrawer({ isOpen, onClose, country = 'IN', onPickCategory }) {
  const [selectedCountry, setSelectedCountry] = useState(() => String(country || 'IN').toUpperCase());
  const [intentFilter, setIntentFilter] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [catalog, setCatalog] = useState(() => buildFallbackCatalog(selectedCountry));
  const [loading, setLoading] = useState(false);
  const [openBranches, setOpenBranches] = useState(() => new Set(['service', 'store']));
  const [expandedCats, setExpandedCats] = useState(() => new Set(['plumbing_trades', 'plumbing_sanitary_products', 'hospitals']));

  useEffect(() => {
    if (isOpen && country) setSelectedCountry(String(country).toUpperCase());
  }, [isOpen, country]);

  const activeCountry = useMemo(() => getCountryByCode(selectedCountry), [selectedCountry]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    setCatalog(buildFallbackCatalog(selectedCountry));
    fetch(`/api/search/taxonomy?country=${encodeURIComponent(selectedCountry)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.categories) && data.categories.length > 0) {
          setCatalog(data.categories);
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOpen, selectedCountry]);

  const groupedByIntent = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const map = { service: [], store: [], venue: [], b2b: [] };
    for (const item of catalog) {
      if (intentFilter !== 'all' && item.intentType !== intentFilter) continue;
      if (q) {
        const hitCat = item.label.toLowerCase().includes(q) || item.query.toLowerCase().includes(q);
        const matchingSubs = (item.subcategories || []).filter((s) => s.toLowerCase().includes(q));
        if (!hitCat && matchingSubs.length === 0) continue;
        if (map[item.intentType]) {
          map[item.intentType].push(hitCat ? item : { ...item, subcategories: matchingSubs });
        }
      } else if (map[item.intentType]) {
        map[item.intentType].push(item);
      }
    }
    return map;
  }, [catalog, intentFilter, filterText]);

  const handleExpandAll = () => {
    const allOpen = openBranches.size === INTENT_BRANCHES.length && expandedCats.size >= catalog.length;
    if (allOpen) {
      setOpenBranches(new Set(['service']));
      setExpandedCats(new Set());
    } else {
      setOpenBranches(new Set(INTENT_BRANCHES.map((b) => b.id)));
      setExpandedCats(new Set(catalog.map((c) => c.key)));
    }
  };

  const handlePick = (qStr) => {
    if (typeof onPickCategory === 'function') onPickCategory(qStr, selectedCountry);
    window.dispatchEvent(new CustomEvent('scraper:pick-category', { detail: { query: qStr, country: selectedCountry } }));
    onClose?.();
  };

  const toggleBranch = (id) => {
    setOpenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCat = (key) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const isSearching = filterText.trim().length > 0;
  const visibleBranches = INTENT_BRANCHES.filter((b) => (groupedByIntent[b.id] || []).length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '56px 16px 16px' }}
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="lp-glass"
            style={{ width: 'min(1080px, 100%)', maxHeight: '84vh', background: '#ffffff', borderRadius: 20, border: '1px solid rgba(217,119,6,0.28)', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 70%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: '#ffffff', border: '1px solid rgba(217,119,6,0.32)', display: 'grid', placeItems: 'center' }}>
                  <Sparkles size={16} color="#d97706" />
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--lp-ink)' }}>
                    5-Country Animated Services &amp; Stores Tree
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--lp-ink-3)' }}>
                    {activeCountry.name} ({activeCountry.currency}) · {activeCountry.paymentRail} · Click any branch or search leaf to populate search
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)' }}>
                  <Search size={13} color="#64748b" />
                  <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Search country tree (e.g. plumbers, pipes)…" style={{ border: 'none', outline: 'none', fontSize: 12, width: 220, fontWeight: 600 }} />
                </div>
                <LiquidButton size="sm" variant="glass-gold" icon={ChevronsUpDown} onClick={handleExpandAll} style={{ height: 32, padding: '0 10px', fontSize: 11 }}>
                  Expand / Collapse
                </LiquidButton>
                <button type="button" onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 9, padding: 6, cursor: 'pointer' }}><X size={16} /></button>
              </div>
            </div>

            {/* Level 1: 5-Country Switcher Dock */}
            <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: '#faf9f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                {COUNTRIES.map((c) => (
                  <FlagChip
                    key={c.code}
                    code={c.code}
                    name={c.code === 'AE' ? 'UAE' : c.name}
                    size={18}
                    active={c.code === selectedCountry}
                    onClick={() => setSelectedCountry(c.code)}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIntentFilter('all')}
                  style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, cursor: 'pointer', background: intentFilter === 'all' ? '#0f172a' : '#ffffff', color: intentFilter === 'all' ? '#ffffff' : '#64748b', border: '1px solid rgba(15,23,42,0.12)' }}
                >
                  <Layers size={11} style={{ display: 'inline', marginRight: 4 }} />All ({catalog.length})
                </button>
                {INTENT_BRANCHES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setIntentFilter(b.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      background: intentFilter === b.id ? b.bg : '#ffffff',
                      color: intentFilter === b.id ? b.tone : '#64748b',
                      border: `1px solid ${intentFilter === b.id ? b.tone : 'rgba(15,23,42,0.1)'}`
                    }}
                  >
                    {b.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tree Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && catalog.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--lp-ink-4)' }}>Syncing {activeCountry.name} tree…</div>}
              {visibleBranches.map((branch) => {
                const cats = groupedByIntent[branch.id] || [];
                const branchOpen = isSearching || intentFilter !== 'all' || openBranches.has(branch.id);
                const catExpandedSet = isSearching ? new Set(cats.map((c) => c.key)) : expandedCats;
                return (
                  <CategoryTreeBranch
                    key={branch.id}
                    intentMeta={branch}
                    categories={cats}
                    isOpen={branchOpen}
                    onToggleBranch={() => toggleBranch(branch.id)}
                    expandedCats={catExpandedSet}
                    onToggleCat={toggleCat}
                    onPickQuery={handlePick}
                  />
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
