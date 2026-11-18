import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cx, formatNumber } from '../ui';
import { getTrash, restoreTrash } from '../api';

/**
 * Recovery bin. Every lead removed by a folder delete, a merge or a manual
 * cleanup is archived before it leaves the store, so this panel is the undo
 * button for all of those paths.
 */
export default function TrashModal({ onClose, onRestored }) {
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getTrash(100);
      setData(next);
      setSelected(new Set());
    } catch (error) {
      toast.error('Could not read the recovery bin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = data?.recent || [];
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggle = id => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map(row => row.id)));
  };

  const handleRestore = async () => {
    if (!selected.size || restoring) return;
    setRestoring(true);
    try {
      const result = await restoreTrash([...selected]);
      toast.success(`Restored ${formatNumber(result?.restored || 0)} lead${(result?.restored || 0) === 1 ? '' : 's'}.`);
      onRestored?.(result);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not restore those leads.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="v2-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-dialog-card v2-trash-card" onClick={event => event.stopPropagation()}>
        <header className="v2-dialog-head">
          <div className="v2-dialog-title">
            <Trash2 size={16} className="v2-text-lime" />
            <h3>Recovery bin</h3>
          </div>
          <button type="button" className="v2-icon-btn" onClick={onClose} aria-label="Close recovery bin"><X size={16} /></button>
        </header>

        <div className="v2-trash-body">
          <p className="v2-dialog-desc">
            {loading
              ? 'Reading the archive…'
              : `${formatNumber(data?.totalArchived || 0)} archived lead${(data?.totalArchived || 0) === 1 ? '' : 's'} can be put back into the live list.`}
          </p>

          {!loading && rows.length === 0 && (
            <div className="v2-trash-empty">
              <Trash2 size={20} />
              <b>Nothing in the bin</b>
              <span>Deleted folders and merged duplicates will appear here.</span>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="v2-trash-toolbar">
                <label>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span>Select all</span>
                </label>
                <span>{formatNumber(selected.size)} selected</span>
              </div>
              <div className="v2-trash-list">
                {rows.map(row => (
                  <label key={`${row.id}-${row.at || ''}`} className={cx('v2-trash-row', selected.has(row.id) && 'is-selected')}>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                    <span className="v2-trash-row-main">
                      <b>{row.name || 'Unknown lead'}</b>
                      <small>
                        {[row.category, row.city, row.phone].filter(Boolean).join(' · ') || 'No contact details'}
                      </small>
                    </span>
                    <span className="v2-trash-row-reason">{row.reason || 'removed'}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="v2-dialog-actions">
          <button type="button" className="v2-btn v2-btn-ghost" onClick={onClose}>Close</button>
          <button
            type="button"
            className="v2-btn v2-btn-lime"
            onClick={handleRestore}
            disabled={!selected.size || restoring}
          >
            <RotateCcw size={13} /> {restoring ? 'Restoring…' : `Restore ${selected.size || ''}`.trim()}
          </button>
        </footer>
      </div>
    </div>
  );
}
