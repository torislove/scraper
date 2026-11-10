import React from 'react';
import { AlertTriangle, Globe2, Phone, Search, X, Zap } from 'lucide-react';
import { cx, formatNumber } from '../../ui';

export const SORTS = [
  ['newest', 'Newest first'],
  ['rating', 'Highest rating'],
  ['reviews', 'Most reviews'],
  ['quality', 'Best profile'],
  ['name', 'Name A–Z']
];

export default function FilterBar({ filters, onChange, total, shown, compact = false }) {
  return (
    <div className={cx('v2-filter-bar', compact && 'is-compact')}>
      <div className="v2-filter-search">
        <Search size={14} />
        <input
          value={filters.query}
          onChange={event => onChange('query', event.target.value)}
          placeholder="Search name, category, phone, village…"
        />
        {filters.query && (
          <button type="button" onClick={() => onChange('query', '')} aria-label="Clear search"><X size={13} /></button>
        )}
      </div>

      <div className="v2-filter-toggles">
        <button
          type="button"
          className={cx('v2-btn-prime-filter', filters.primeOnly && 'is-active')}
          onClick={() => onChange('primeOnly', !filters.primeOnly)}
          title="Filter to Prime Leads: Rating ≥ 4.0★ with verified WhatsApp mobile and reviews"
        >
          🔥 Prime Leads
        </button>
        <button type="button" className={cx(filters.phoneOnly && 'is-active')} onClick={() => onChange('phoneOnly', !filters.phoneOnly)}>
          <Phone size={12} /> Phone
        </button>
        <button type="button" className={cx(filters.websiteOnly && 'is-active')} onClick={() => onChange('websiteOnly', !filters.websiteOnly)}>
          <Globe2 size={12} /> Website
        </button>
        <button type="button" className={cx(filters.deepOnly && 'is-active')} onClick={() => onChange('deepOnly', !filters.deepOnly)}>
          <Zap size={12} /> Deep
        </button>
        <button type="button" className={cx(filters.conflictsOnly && 'is-active')} onClick={() => onChange('conflictsOnly', !filters.conflictsOnly)}>
          <AlertTriangle size={12} /> Conflicts
        </button>
      </div>

      <div className="v2-filter-selects">
        <select value={filters.minRating} onChange={event => onChange('minRating', Number(event.target.value))}>
          <option value={0}>Any rating</option>
          <option value={3}>3.0+</option>
          <option value={4}>4.0+</option>
          <option value={4.5}>4.5+</option>
        </select>
        <select value={filters.sort} onChange={event => onChange('sort', event.target.value)}>
          {SORTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>

      <span className="v2-filter-count">{formatNumber(shown)}<i>/</i>{formatNumber(total)}</span>
    </div>
  );
}

