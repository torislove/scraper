import React from 'react';
import {
  AlertTriangle, ArrowUpRight, CheckSquare, Download, Edit3, FileSpreadsheet,
  FolderArchive, Layers, Loader2, MapPin, Phone, Play, Square, Tag, Trash2, ShieldCheck
} from 'lucide-react';
import { StatusPill, cx, formatNumber, relativeTime } from '../../ui';
import { formatInr } from '../../utils/leadStages';

export default function RunCard({
  run,
  onOpen,
  onExport,
  onLoadToCockpit,
  onDelete,
  onRename,
  onBackup,
  active,
  loading = false,
  selected = false,
  onToggleSelect
}) {
  const percentMobiles = run.leadCount > 0 ? Math.round((run.phoneCount / run.leadCount) * 100) : 0;
  const displayName = run.customName || run.name || `${run.category} in ${run.location}`;
  const colorStyle = run.isOutOfBound
    ? { borderLeftColor: '#f87171', borderLeftWidth: '3px' }
    : (run.color ? { borderLeftColor: run.color, borderLeftWidth: '3px' } : {});

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
          title={selected ? 'Deselect folder' : 'Select folder for batch operations'}
        >
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>

        <span className={cx('v2-run-mark', run.isOutOfBound && 'is-oob')} style={run.isOutOfBound ? {} : (run.color ? { color: run.color } : {})}>
          {run.isOutOfBound ? <AlertTriangle size={16} /> : <FolderArchive size={16} />}
        </span>

        <div className="v2-run-title-wrap">
          <div className="v2-run-title-row">
            <b className="v2-run-title" title={displayName}>
              {displayName}
            </b>
            {run.isOutOfBound && (
              <span className="v2-run-oob-pill" title="Rejected vendors kept for review. They never enter a client folder.">
                <AlertTriangle size={9} /> Out of Bound
              </span>
            )}
            <StatusPill tone={run.status === 'completed' || run.status === 'complete' ? 'lime' : run.status === 'running' ? 'cyan' : run.status === 'aborted' ? 'red' : 'neutral'}>
              {run.status === 'completed' ? 'ready' : run.status}
            </StatusPill>
          </div>
          {run._matchedLeadName && (
            <div className="v2-deep-match-tag">
              🎯 Matches lead: <b>{run._matchedLeadName}</b>{run._matchedPhone ? ` (${run._matchedPhone})` : ''}
            </div>
          )}
          <div className="v2-run-meta-row">
            <span className="v2-run-loc"><MapPin size={10} /> {run.location || 'India'}</span>
            {run.masterScope && (
              <span className="v2-run-scope-pill" style={{ marginLeft: 4, padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                {run.masterScope === 'state' ? '🏛️ State Sweep' : run.masterScope === 'district' ? '🗺️ District Sweep' : run.masterScope === 'mandal' ? '📍 Mandal Cluster' : `${run.masterScope} Sweep`}
              </span>
            )}
            <span className="v2-run-dot">•</span>
            <span className="v2-run-time">{relativeTime(run.timestamp)}</span>
            <span className="v2-run-dot">•</span>
            <span className="v2-run-mobiles"><Phone size={10} /> {formatNumber(run.phoneCount)} mobiles</span>
            {run.mandalCount > 0 && (
              <>
                <span className="v2-run-dot">•</span>
                <span className="v2-run-areas" title={run.isOutOfBound ? 'Number of rejection categories in this folder' : 'Mandal and village sub-folders'}>
                  <Layers size={10} /> {run.isOutOfBound
                    ? `${formatNumber(run.mandalCount)} categories`
                    : `${formatNumber(run.mandalCount)} mandals · ${formatNumber(run.villageCount)} villages`}
                </span>
              </>
            )}
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
          <span>LEADS</span>
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
          title="Open complete folder vault explorer with all options"
        >
          {loading ? <Loader2 size={12} className="v2-spin" /> : <FolderArchive size={12} />}
          <span>Open Folder</span>
          <ArrowUpRight size={11} />
        </button>

        <div className="v2-run-actions">
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onRename?.(run); }}
            title="Rename, tag or change color of this folder"
          >
            <Edit3 size={11} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onLoadToCockpit?.(run); }}
            title="Load this folder into active Cockpit workspace"
          >
            <Play size={10} />
            <span>Cockpit</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'csv'); }}
            title="Export standard CSV spreadsheet"
          >
            <Download size={10} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'csv', { divided: true }); }}
            title="Download CSV divided by Area / Neighborhood sections"
          >
            <Download size={10} />
            <span>Area CSV</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool is-primary"
            style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'xlsx'); }}
            title="Download Multi-Worksheet Excel (.xlsx)"
          >
            <FileSpreadsheet size={10} />
            <span>XLSX</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onBackup?.(run); }}
            title="Download offline JSON vault backup snapshot"
          >
            <ShieldCheck size={10} />
            <span>Backup</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-delete"
            onClick={(e) => { e.stopPropagation(); onDelete?.(run); }}
            title="Delete this folder"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
