import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Loader2, RefreshCw } from 'lucide-react';
import { getEngineStatus, getLearnedTaxonomy } from './api';
import { cx } from './ui';

const GROUP_LABELS = {
  google: 'Google',
  directory: 'Directories',
  web: 'Web',
  ai: 'AI',
  api: 'APIs'
};

const STATUS_RANK = { error: 0, empty: 1, untested: 2, online: 3 };

function relativeTime(value) {
  if (!value) return 'never';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return 'unknown';
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

export default function EngineStatusBoard({ compact = false }) {
  const [data, setData] = useState(null);
  const [taxonomy, setTaxonomy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const next = await getEngineStatus();
      setData(next);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Engine status unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    try {
      const learned = await getLearnedTaxonomy();
      setTaxonomy(learned);
    } catch (err) {
      /* learning summary is advisory */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const engines = Array.isArray(data?.engines) ? data.engines : [];
  const summary = data?.summary || { total: 0, online: 0, error: 0, empty: 0, untested: 0 };

  const groups = useMemo(() => {
    const order = ['google', 'directory', 'web', 'ai', 'api'];
    return order
      .map(key => ({
        key,
        label: GROUP_LABELS[key] || key,
        engines: engines
          .filter(engine => engine.group === key)
          .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9))
      }))
      .filter(group => group.engines.length);
  }, [engines]);

  const worst = engines.some(e => e.status === 'error')
    ? 'error'
    : engines.some(e => e.status === 'empty')
      ? 'empty'
      : engines.some(e => e.status === 'untested')
        ? 'untested'
        : 'online';

  return (
    <section className={cx('v2-engine-board', compact && 'is-compact')}>
      <header className="v2-engine-board-head">
        <div className="v2-engine-board-title">
          <span className={cx('v2-engine-pulse', `is-${worst}`)} />
          <b>Engine &amp; API Status</b>
          <span className="v2-engine-summary">
            {summary.online}/{summary.total} online
            {summary.error ? ` · ${summary.error} error` : ''}
            {summary.untested ? ` · ${summary.untested} untested` : ''}
          </span>
        </div>
        <div className="v2-engine-board-actions">
          {data?.memory?.machineBudget ? (
            <span className="v2-engine-memory" title={`${data.memory.freeMb} MB free of ${data.memory.totalMb} MB`}>
              <Cpu size={11} /> {data.memory.machineBudget} workers
            </span>
          ) : null}
          <button type="button" onClick={() => load(true)} disabled={refreshing || loading} title="Refresh engine health">
            {refreshing ? <Loader2 size={12} className="v2-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="v2-engine-error">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="v2-engine-loading">
          <Loader2 size={13} className="v2-spin" /> Probing engines…
        </div>
      ) : (
        <div className="v2-engine-groups">
          {groups.map(group => (
            <div key={group.key} className="v2-engine-group">
              <span className="v2-engine-group-label">{group.label}</span>
              <div className="v2-engine-chips">
                {group.engines.map(engine => (
                  <span
                    key={engine.key}
                    className={cx('v2-engine-chip', `is-${engine.status}`)}
                    title={`${engine.detail || engine.label}\nStatus: ${engine.status}\n${engine.message}\nLast run: ${relativeTime(engine.lastRunAt)}${engine.lastCount != null ? ` · ${engine.lastCount} rows` : ''}`}
                  >
                    <i className="v2-engine-dot" />
                    <b>{engine.label}</b>
                    <small>
                      {engine.status === 'online' ? 'OK'
                        : engine.status === 'error' ? 'ERROR'
                          : engine.status === 'empty' ? 'EMPTY'
                            : 'UNTESTED'}
                    </small>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="v2-engine-board-foot">
        <span><CheckCircle2 size={11} /> Green = ready or last run returned rows</span>
        <span><AlertTriangle size={11} /> Red = missing key, browser runtime, or last run failed</span>
        {taxonomy ? (
          <span className="v2-engine-learned" title="Products and categories learned automatically from successful runs">
            🧠 Learned {taxonomy.products || 0} products · {taxonomy.categories || 0} categories · {taxonomy.brands || 0} brands
          </span>
        ) : null}
        <span className="v2-engine-checked"><Activity size={11} /> checked {relativeTime(data?.checkedAt)}</span>
      </footer>
    </section>
  );
}
