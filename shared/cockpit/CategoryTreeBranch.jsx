/**
 * shared/cockpit/CategoryTreeBranch.jsx
 * Animated Level-2 (Intent) -> Level-3 (Category) -> Level-4 (Subcategory Leaf)
 * interactive tree nodes for CategoryAtlasDrawer. Strictly <= 500 lines.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, ArrowUpRight, FolderTree } from 'lucide-react';

export default function CategoryTreeBranch({
  intentMeta,
  categories = [],
  isOpen,
  onToggleBranch,
  expandedCats,
  onToggleCat,
  onPickQuery
}) {
  const Icon = intentMeta.icon;
  const totalLeaves = categories.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0);

  return (
    <motion.div
      layout
      style={{
        borderRadius: 16,
        border: `1.5px solid ${isOpen ? intentMeta.border : 'rgba(15,23,42,0.09)'}`,
        background: '#ffffff',
        boxShadow: 'var(--lp-shadow-1)',
        overflow: 'hidden'
      }}
    >
      {/* Level 2: Intent Trunk Header */}
      <button
        type="button"
        onClick={onToggleBranch}
        style={{
          width: '100%',
          padding: '11px 14px',
          border: 'none',
          background: isOpen ? intentMeta.bg : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.16 }} style={{ display: 'inline-flex', color: intentMeta.tone }}>
            <ChevronRight size={16} />
          </motion.span>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: '#ffffff', border: `1px solid ${intentMeta.border}`, display: 'grid', placeItems: 'center', color: intentMeta.tone }}>
            <Icon size={14} />
          </span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--lp-ink)' }}>{intentMeta.label}</div>
            <div style={{ fontSize: 11, color: 'var(--lp-ink-3)' }}>{intentMeta.subtitle}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#ffffff', color: intentMeta.tone, border: `1px solid ${intentMeta.border}` }}>
            {categories.length} categories · {totalLeaves} searches
          </span>
        </div>
      </button>

      {/* Level 3: Category Nodes */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              {categories.map((cat) => {
                const catExpanded = expandedCats.has(cat.key);
                const subs = cat.subcategories || [];
                return (
                  <div
                    key={cat.key}
                    style={{
                      position: 'relative',
                      paddingLeft: 14,
                      borderLeft: `2px solid ${catExpanded ? intentMeta.tone : 'rgba(15,23,42,0.12)'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 6px', borderRadius: 10, background: catExpanded ? '#faf9f6' : 'transparent' }}>
                      <button
                        type="button"
                        onClick={() => onToggleCat(cat.key)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 0 }}
                      >
                        {catExpanded ? <ChevronDown size={14} color={intentMeta.tone} /> : <ChevronRight size={14} color="#64748b" />}
                        <FolderTree size={13} color={intentMeta.tone} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--lp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cat.label}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: intentMeta.bg, color: intentMeta.tone }}>
                          {subs.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPickQuery(cat.query)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8,
                          fontSize: 11, fontWeight: 800, background: intentMeta.bg, color: intentMeta.tone,
                          border: `1px solid ${intentMeta.border}`, cursor: 'pointer', flexShrink: 0
                        }}
                      >
                        <span>Pick</span>
                        <ArrowUpRight size={11} />
                      </button>
                    </div>

                    {/* Level 4: Subcategory Leaf Chips */}
                    <AnimatePresence initial={false}>
                      {catExpanded && subs.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 4px 4px 18px' }}>
                            {subs.map((sub, idx) => (
                              <motion.button
                                key={sub}
                                type="button"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(idx * 0.015, 0.18), duration: 0.14 }}
                                whileHover={{ scale: 1.03, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onPickQuery(sub)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '4px 10px', borderRadius: 9, fontSize: 11.5, fontWeight: 650,
                                  background: '#ffffff', color: 'var(--lp-ink-2)',
                                  border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: intentMeta.tone }} />
                                <span>{sub}</span>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
