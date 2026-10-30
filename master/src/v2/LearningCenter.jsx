/**
 * LearningCenter.jsx
 *
 * What the engine learned by itself. Every row was written by a finished run
 * that returned real leads: product and service labels taken from directory
 * pages, brands seen in vendor names, and proven query phrases.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit, RefreshCw, Search, Loader2, Package, Layers, Wrench, Tag, History
} from 'lucide-react';
import { getLearnedCatalog } from './api';
import { cx, formatNumber, relativeTime } from './ui';

const TABS = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'brands', label: 'Brands', icon: Tag },
  { key: 'queries', label: 'Searches', icon: History }
];

export default function LearningCenter() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('products');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getLearnedCatalog();
      setData(next);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Learning store unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || {};
  const rows = useMemo(() => {
    const list = data?.[tab] || [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(row => [
      row.name, row.query, row.product, ...(row.samples || []), ...(row.expansions || [])
    ].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [data, tab, query]);

  return (
    <section className="v2-learning">
      <header className="v2-learning-head">
        <div>
          <h2><BrainCircuit size={18} /> Engine learning</h2>
          <p>Learned automatically from completed runs that returned leads. Nothing here is invented.</p>
        </div>
        <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={13} className="is-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </header>

      <div className="v2-learning-stats">
        {TABS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={cx('v2-learning-stat', tab === item.key && 'is-active')}
              onClick={() => setTab(item.key)}
            >
              <Icon size={14} />
              <b>{formatNumber(totals[item.key] || 0)}</b>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="v2-learning-tools">
        <div className="v2-learning-search">
          <Search size={13} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter learned entries…" />
        </div>
        <span className="v2-learning-updated">
          Updated {data?.updatedAt ? relativeTime(data.updatedAt) : '—'}
        </span>
      </div>

      {error ? <div className="v2-learning-error">{error}</div> : null}

      {!error && !loading && !rows.length ? (
        <div className="v2-learning-empty">
          <BrainCircuit size={26} />
          <b>Nothing learned yet</b>
          <span>Run a search in the console. When a run returns leads, its products, services and vendor categories appear here automatically.</span>
        </div>
      ) : null}

      {rows.length ? (
        <div className="v2-learning-table">
          <div className="v2-learning-row is-head">
            <span>Learned entry</span>
            <span>Runs</span>
            <span>Evidence</span>
            <span>Last seen</span>
          </div>
          {rows.map(row => (
            <div className="v2-learning-row" key={`${tab}-${row.key}`}>
              <span className="v2-learning-name">
                <b>{row.name}</b>
                {row.product ? <em>product: {row.product}</em> : null}
                {row.lastLocation ? <em>{row.lastLocation}</em> : null}
              </span>
              <span><b>{formatNumber(row.runs)}</b></span>
              <span className="v2-learning-evidence">
                {(row.samples?.length ? row.samples : row.expansions || []).slice(0, 3).join(' · ')
                  || (row.leadCount ? `${formatNumber(row.leadCount)} leads · ${formatNumber(row.phoneCount)} phones` : '—')}
              </span>
              <span>{row.lastAt ? relativeTime(row.lastAt) : '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
