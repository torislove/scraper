import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Download, FileSpreadsheet, Folder, Loader2
} from 'lucide-react';
import { cx, formatNumber, relativeTime } from '../../ui';

export default function CockpitFolderRow({
  run,
  active,
  loading,
  onOpen,
  onExport,
  onSelectArea,
  activeArea
}) {
  const [expanded, setExpanded] = useState(false);
  const folderName = run.customName || run.name || (run.category ? `${run.category} in ${run.location || 'India'}` : 'Lead Folder');
  const subFolders = Array.isArray(run.subFolders) ? run.subFolders : [];

  return (
    <div className={cx('v2-cp-folder-block', active && 'is-active')}>
      <div className={cx('v2-cp-folder', active && 'is-active')}>
        {subFolders.length > 0 ? (
          <button
            type="button"
            className="v2-cp-folder-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            title={expanded ? "Collapse neighborhoods" : "Expand neighborhoods"}
          >
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="v2-cp-folder-toggle-spacer" />
        )}
        <button type="button" className="v2-cp-folder-main" onClick={onOpen} disabled={loading} title={`Open ${run.id}`}>
          <span className={cx('v2-cp-folder-dot', run.status === 'running' ? 'is-live' : run.status === 'aborted' ? 'is-aborted' : 'is-ready')} />
          <span>
            <b>{folderName}</b>
            <small>{run.location} · {formatNumber(run.leadCount)} leads ({formatNumber(run.phoneCount)} phones)</small>
          </span>
          {loading ? <Loader2 size={12} className="v2-spin" /> : <ChevronRight size={13} />}
        </button>
        <div className="v2-cp-folder-tools">
          <button type="button" onClick={() => onExport?.(run, 'csv')} title="Download Standard CSV"><Download size={11} /> CSV</button>
          <button type="button" onClick={() => onExport?.(run, 'csv', { divided: true })} title="Download Area-Divided CSV" style={{ color: '#1E40AF' }}><Download size={11} /> Area CSV</button>
          <button type="button" onClick={() => onExport?.(run, 'xlsx')} title="Download Multi-Tab Excel"><FileSpreadsheet size={11} /> XLSX</button>
          <span>{relativeTime(run.timestamp)}</span>
        </div>
      </div>

      {/* Expanded Area Sub-Folders Tree */}
      {expanded && subFolders.length > 0 && (
        <div className="v2-cp-subfolder-tree">
          <button
            type="button"
            className={cx('v2-cp-subfolder-row', active && (!activeArea || activeArea === 'all') && 'is-active')}
            onClick={() => onSelectArea?.(run, 'all')}
          >
            <Folder size={11} />
            <span>📍 All Areas</span>
            <b>{formatNumber(run.leadCount)}</b>
          </button>
          {subFolders.map(({ area, count }) => (
            <button
              type="button"
              key={area}
              className={cx('v2-cp-subfolder-row', active && activeArea === area && 'is-active')}
              onClick={() => onSelectArea?.(run, area)}
              title={`Filter Cockpit to ${area} (${count} leads)`}
            >
              <Folder size={11} />
              <span>📂 {area}</span>
              <b>{formatNumber(count)}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
