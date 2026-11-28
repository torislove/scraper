import React, { useState } from 'react';
import { Folder, Download, Trash2, Users } from 'lucide-react';

export default function FolderCard({
  folder,
  colorHex = '#d97706',
  active = false,
  selectedCount = 0,
  onViewLeads,
  onSaveSelected,
  onExportCsv,
  onDelete,
  onDropLeads
}) {
  const [dragOver, setDragOver] = useState(false);
  const [bumped, setBumped] = useState(false);
  const count = folder?.leadIds?.length || 0;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/x-lead-ids') || e.dataTransfer.getData('text/plain');
      const ids = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length > 0 && onDropLeads) {
        onDropLeads(folder.id, ids);
        setBumped(true);
        setTimeout(() => setBumped(false), 360);
      }
    } catch (_) {}
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        padding: 14,
        borderRadius: 14,
        background: dragOver || active ? '#fffbeb' : '#ffffff',
        border: `1.5px solid ${dragOver || active ? '#d97706' : 'rgba(15, 23, 42, 0.1)'}`,
        boxShadow: dragOver ? '0 0 0 3px rgba(245, 158, 11, 0.24)' : 'var(--lp-shadow-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 140ms cubic-bezier(0.22, 1, 0.36, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${colorHex}18`,
              color: colorHex,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}
          >
            <Folder size={17} fill="currentColor" />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--lp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.name}
            </div>
            <div
              className={`lp-tabular ${bumped ? 'lp-resolve-pop' : ''}`}
              style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--lp-ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Users size={11} />
              <span>{count} {count === 1 ? 'lead' : 'leads'}</span>
            </div>
          </div>
        </div>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorHex, flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(15, 23, 42, 0.07)' }}>
        {selectedCount > 0 && onSaveSelected ? (
          <button
            type="button"
            onClick={() => onSaveSelected(folder.id)}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              background: 'var(--lp-gold-gradient)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Save {selectedCount} Selected
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onViewLeads?.(active ? null : folder.id)}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: active ? '#d97706' : '#f1f5f9',
              color: active ? '#ffffff' : '#334155',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {active ? 'Clear Filter' : 'View Leads'}
          </button>
        )}

        <button
          type="button"
          onClick={() => onExportCsv?.(folder.id)}
          disabled={count === 0}
          title="Export CSV"
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            fontSize: 11.5,
            fontWeight: 700,
            background: '#f8fafc',
            color: '#334155',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            cursor: count === 0 ? 'not-allowed' : 'pointer',
            opacity: count === 0 ? 0.45 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Download size={12} /> Export CSV
        </button>

        <button
          type="button"
          onClick={() => onDelete?.(folder.id)}
          title="Delete"
          style={{
            padding: '6px 8px',
            borderRadius: 10,
            fontSize: 11.5,
            fontWeight: 700,
            background: '#fff1f2',
            color: '#be123c',
            border: '1px solid rgba(225, 29, 72, 0.2)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}
