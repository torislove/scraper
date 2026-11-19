import React from 'react';
import {
  ArrowUpRight, CheckSquare, Download, Edit3, FileSpreadsheet, FolderArchive,
  Loader2, MapPin, Phone, Play, Square, Tag, Trash2
} from 'lucide-react';
import { StatusPill, cx, formatNumber, relativeTime } from '../../ui';

export default function RunCard({
  run,
  onOpen,
  onExport,
  onLoadToCockpit,
  onDelete,
  onRename,
  active,
  loading = false,
  selected = false,
  onToggleSelect
}) {
  const percentMobiles = run.leadCount > 0 ? Math.round((run.phoneCount / run.leadCount) * 100) : 0;
  const displayName = run.customName || run.name || `${run.category} in ${run.location}`;
  const colorStyle = run.color ? { borderLeftColor: run.color, borderLeftWidth: '3px' } : {};

  return (
    <div
      className={cx('v2-run-card', active && 'is-active', loading && 'is-loading', selected && 'is-selected')}
      style={colorStyle}
      onClick={(e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) return;
        onOpen?.();
      }}
    >
      <header className="v2-run-card-header">
        <button
          type="button"
          className={cx('v2-run-check', selected && 'is-checked')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(run.id);
          }}
          title={selected ? 'Deselect list' : 'Select list'}
        >
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>

        <span className="v2-run-mark" style={run.color ? { color: run.color } : {}}>
          <FolderArchive size={16} />
        </span>

        <div className="v2-run-title-wrap">
          <div className="v2-run-title-row">
            <b className="v2-run-title" title={displayName}>
              {displayName}
            </b>
            <StatusPill tone={run.status === 'completed' || run.status === 'complete' ? 'lime' : run.status === 'running' ? 'cyan' : run.status === 'aborted' ? 'red' : 'neutral'}>
              {run.status === 'completed' ? 'ready' : run.status}
            </StatusPill>
          </div>
          {run._matchedLeadName && (
            <div className="v2-deep-match-tag">
              Matches: <b>{run._matchedLeadName}</b>{run._matchedPhone ? ` (${run._matchedPhone})` : ''}
            </div>
          )}
          <div className="v2-run-meta-row">
            <span className="v2-run-loc"><MapPin size={10} /> {run.location || 'India'}</span>
            <span className="v2-run-dot">•</span>
            <span className="v2-run-time">{relativeTime(run.timestamp)}</span>
            <span className="v2-run-dot">•</span>
            <span className="v2-run-mobiles"><Phone size={10} /> {formatNumber(run.phoneCount)} phones</span>
          </div>
          {Array.isArray(run.tags) && run.tags.length > 0 && (
            <div className="v2-run-tags-row">
              {run.tags.map(tag => (
                <span key={tag} className="v2-run-tag"><Tag size={9} /> {tag}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="v2-run-metrics">
        <div className="v2-run-metric-cell">
          <span>BUSINESSES</span>
          <b>{formatNumber(run.leadCount)}</b>
        </div>
        <div className="v2-run-metric-cell is-highlight">
          <span>PHONES</span>
          <b>{formatNumber(run.phoneCount)} <small>({percentMobiles}%)</small></b>
        </div>
        <div className="v2-run-metric-cell">
          <span>SAVED</span>
          <b className="is-small" title={run.timestamp ? new Date(run.timestamp).toLocaleString() : ''}>
            {relativeTime(run.timestamp)}
          </b>
        </div>
      </div>

      <footer className="v2-run-card-footer">
        <button
          type="button"
          className="v2-run-open-btn"
          onClick={onOpen}
          disabled={loading}
          title="Open saved list to view, filter, or download"
        >
          {loading ? <Loader2 size={12} className="v2-spin" /> : <FolderArchive size={12} />}
          <span>Open List</span>
          <ArrowUpRight size={11} />
        </button>

        <div className="v2-run-actions">
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onRename?.(run); }}
            title="Rename or add color tags"
          >
            <Edit3 size={11} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onLoadToCockpit?.(run); }}
            title="Load this list into your workspace"
          >
            <Play size={10} />
            <span>Load</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'csv'); }}
            title="Download CSV spreadsheet"
          >
            <Download size={10} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool is-primary"
            style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'xlsx'); }}
            title="Download multi-sheet Excel (.xlsx)"
          >
            <FileSpreadsheet size={10} />
            <span>Excel</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-delete"
            onClick={(e) => { e.stopPropagation(); onDelete?.(run); }}
            title="Delete this saved list"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
