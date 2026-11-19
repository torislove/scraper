import React from 'react';
import { CheckCircle2, Globe2, Phone, Search, Star, X } from 'lucide-react';
import { cx, formatNumber } from '../../ui';

export const SORTS = [
  ['newest', 'Newest first'],
  ['rating', 'Highest rating'],
  ['reviews', 'Most reviews'],
  ['quality', 'Most complete'],
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
          placeholder="Filter by business name, category, phone or area…"
        />
        {filters.query && (
          <button type="button" onClick={() => onChange('query', '')} aria-label="Clear filter"><X size={13} /></button>
        )}
      </div>

      <div className="v2-filter-toggles">
        <button
          type="button"
          className={cx('v2-btn-prime-filter', filters.primeOnly && 'is-active')}
          onClick={() => onChange('primeOnly', !filters.primeOnly)}
          title="Businesses rated 4.0★+ with verified phone numbers"
        >
          <Star size={12} fill={filters.primeOnly ? 'currentColor' : 'none'} /> Top Picks
        </button>
        <button type="button" className={cx(filters.phoneOnly && 'is-active')} onClick={() => onChange('phoneOnly', !filters.phoneOnly)}>
          <Phone size={12} /> Has Phone
        </button>
        <button type="button" className={cx(filters.websiteOnly && 'is-active')} onClick={() => onChange('websiteOnly', !filters.websiteOnly)}>
          <Globe2 size={12} /> Has Website
        </button>
        <button type="button" className={cx(filters.deepOnly && 'is-active')} onClick={() => onChange('deepOnly', !filters.deepOnly)}>
          <CheckCircle2 size={12} /> Full Profile
        </button>
      </div>

      <div className="v2-filter-selects">
        <select value={filters.minRating} onChange={event => onChange('minRating', Number(event.target.value))}>
          <option value={0}>Any rating</option>
          <option value={3}>3.0★ &amp; up</option>
          <option value={4}>4.0★ &amp; up</option>
          <option value={4.5}>4.5★ &amp; up</option>
        </select>
        <select value={filters.sort} onChange={event => onChange('sort', event.target.value)}>
          {SORTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>

      <span className="v2-filter-count">{formatNumber(shown)}<i>/</i>{formatNumber(total)}</span>
    </div>
  );
}
