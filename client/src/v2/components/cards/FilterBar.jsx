import React from 'react';
import { CheckCircle2, Globe2, Mail, Phone, Search, Smartphone, Star, X, RotateCcw, MessageSquare, UserCheck } from 'lucide-react';
import { cx, formatNumber } from '../../ui';
import { LEAD_SORT_OPTIONS, LEAD_SOURCE_OPTIONS } from '@shared/cockpit/sortOptions';

export default function FilterBar({ filters = {}, onChange = () => {}, onReset, total = 0, shown = 0, compact = false }) {
  const safeFilters = filters || {};
  const currentQuery = safeFilters.query || '';
  const hasActiveFilter = Boolean(
    currentQuery || safeFilters.phoneOnly || safeFilters.landlineOnly || safeFilters.whatsAppOnly ||
    safeFilters.dmOnly || safeFilters.websiteOnly || safeFilters.noWebsiteOnly || safeFilters.emailOnly ||
    safeFilters.deepOnly || safeFilters.primeOnly || (safeFilters.source && safeFilters.source !== 'all') ||
    Number(safeFilters.minRating || 0) > 0 || (safeFilters.sort && safeFilters.sort !== 'newest')
  );

  return (
    <div className={cx('v2-filter-bar', compact && 'is-compact')}>
      <div className="v2-filter-search" style={{ minWidth: 265, flex: '1 1 265px' }}>
        <Search size={14} />
        <input
          value={currentQuery}
          onChange={event => onChange('query', event.target.value)}
          placeholder="Filter by business name, category, phone or area…"
        />
        {currentQuery && (
          <button type="button" onClick={() => onChange('query', '')} aria-label="Clear filter">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="v2-filter-toggles">
        <button
          type="button"
          className={cx('v2-btn-prime-filter', safeFilters.primeOnly && 'is-active')}
          onClick={() => onChange('primeOnly', !safeFilters.primeOnly)}
          title="Businesses rated 4.0★+ with verified phone numbers"
        >
          <Star size={12} fill={safeFilters.primeOnly ? 'currentColor' : 'none'} /> Top Picks
        </button>
        <button
          type="button"
          className={cx(safeFilters.whatsAppOnly && 'is-active')}
          onClick={() => onChange('whatsAppOnly', !safeFilters.whatsAppOnly)}
          title="100% WhatsApp-ready verified direct mobile contacts"
        >
          <MessageSquare size={12} /> WhatsApp
        </button>
        <button
          type="button"
          className={cx(safeFilters.phoneOnly && 'is-active')}
          onClick={() => onChange('phoneOnly', !safeFilters.phoneOnly)}
          title="Direct mobile numbers ready for WhatsApp & SMS"
        >
          <Smartphone size={12} /> Mobiles Only
        </button>
        <button
          type="button"
          className={cx(safeFilters.dmOnly && 'is-active')}
          onClick={() => onChange('dmOnly', !safeFilters.dmOnly)}
          title="Verified Decision-Maker / Owner profiles"
        >
          <UserCheck size={12} /> Decision-Maker
        </button>
        <button
          type="button"
          className={cx(safeFilters.landlineOnly && 'is-active')}
          onClick={() => onChange('landlineOnly', !safeFilters.landlineOnly)}
          title="Office, school & reception STD / landline numbers"
        >
          <Phone size={12} /> Landline / STD
        </button>
        <button
          type="button"
          className={cx(safeFilters.emailOnly && 'is-active')}
          onClick={() => onChange('emailOnly', !safeFilters.emailOnly)}
          title="Businesses with an indexed email address"
        >
          <Mail size={12} /> Has Email
        </button>
        <button
          type="button"
          className={cx(safeFilters.websiteOnly && 'is-active')}
          onClick={() => onChange('websiteOnly', !safeFilters.websiteOnly)}
        >
          <Globe2 size={12} /> Has Website
        </button>
        <button
          type="button"
          className={cx(safeFilters.noWebsiteOnly && 'is-active')}
          onClick={() => onChange('noWebsiteOnly', !safeFilters.noWebsiteOnly)}
          title="Businesses with no official website — ideal for Web, SEO & Ad Agencies"
        >
          <Globe2 size={12} /> No Website
        </button>
        <button
          type="button"
          className={cx(safeFilters.deepOnly && 'is-active')}
          onClick={() => onChange('deepOnly', !safeFilters.deepOnly)}
        >
          <CheckCircle2 size={12} /> Full Profile
        </button>
      </div>

      <div className="v2-filter-selects">
        <select value={safeFilters.source || 'all'} onChange={event => onChange('source', event.target.value)} aria-label="Filter by scrape source">
          {LEAD_SOURCE_OPTIONS.map(([val, label]) => <option value={val} key={val}>{label}</option>)}
        </select>
        <select value={safeFilters.minRating || 0} onChange={event => onChange('minRating', Number(event.target.value))}>
          <option value={0}>Any rating</option>
          <option value={3}>3.0★ &amp; up</option>
          <option value={4}>4.0★ &amp; up</option>
          <option value={4.5}>4.5★ &amp; up</option>
        </select>
        <select value={safeFilters.sort || 'newest'} onChange={event => onChange('sort', event.target.value)} aria-label="Sort leads">
          {LEAD_SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        {hasActiveFilter && typeof onReset === 'function' && (
          <button type="button" onClick={onReset} title="Reset all filters & sort" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(225,29,72,0.22)', background: '#fff1f2', color: '#be123c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <span className="v2-filter-count">{formatNumber(shown || 0)}<i>/</i>{formatNumber(total || 0)}</span>
    </div>
  );
}
