import React, { useState } from 'react';
import { Folder, FolderPlus, X, Check } from 'lucide-react';
import FolderCard from '../ui/FolderCard';
import LiquidButton from '../ui/LiquidButton';
import { FOLDER_SWATCHES, resolveSwatchHex } from './useLeadFolders';

export default function LeadFoldersModal({
  isOpen,
  onClose,
  folders = [],
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onExportFolder,
  selectedLeadIds = [],
  onSaveSelectedToFolder,
  allLeads = []
}) {
  const [name, setName] = useState('');
  const [swatch, setSwatch] = useState('gold');
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateFolder?.(name.trim(), swatch);
    setName('');
    notify('Folder created.');
  };

  const handleSaveSelected = (folderId) => {
    if (!folderId || !selectedLeadIds.length) return;
    const added = onSaveSelectedToFolder?.(folderId, selectedLeadIds) || 0;
    notify(`Added ${added} ${added === 1 ? 'lead' : 'leads'}.`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(15, 23, 42, 0.36)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="lp-glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '84vh',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: 'var(--lp-shadow-3)'
        }}
      >
        {/* Header — Clean Enterprise Labels */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.32)', color: '#d97706', display: 'grid', placeItems: 'center' }}>
              <Folder size={19} fill="#fef3c7" />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>Lead Folders</h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--lp-ink-3)' }}>Organize and segment your harvested leads</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lead Folders"
            style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: '#f8fafc', color: '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {selectedLeadIds.length > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.34)', fontSize: 12, fontWeight: 700, color: '#92400e' }}>
            {selectedLeadIds.length} leads selected — choose a folder below to save them.
          </div>
        )}

        {feedback && (
          <div style={{ padding: '8px 12px', borderRadius: 10, background: '#ecfdf5', border: '1px solid rgba(5, 150, 105, 0.28)', fontSize: 12, fontWeight: 700, color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> {feedback}
          </div>
        )}

        {/* Folders Grid */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, padding: '2px 0' }}>
          {folders.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '28px 12px', textAlign: 'center', fontSize: 12.5, color: 'var(--lp-ink-4)' }}>
              No folders yet. Create your first folder below or drag rows onto folder chips in the table.
            </div>
          ) : (
            folders.map((fld) => (
              <FolderCard
                key={fld.id}
                folder={fld}
                colorHex={resolveSwatchHex(fld.color)}
                active={activeFolderId === fld.id}
                selectedCount={selectedLeadIds.length}
                onViewLeads={(nextId) => { onSelectFolder?.(nextId); onClose?.(); }}
                onSaveSelected={handleSaveSelected}
                onExportCsv={(id) => onExportFolder?.(id, allLeads)}
                onDelete={(id) => onDeleteFolder?.(id)}
                onDropLeads={(id, ids) => onSaveSelectedToFolder?.(id, ids)}
              />
            ))
          )}
        </div>

        {/* Create Folder Form */}
        <form onSubmit={handleCreate} style={{ paddingTop: 12, borderTop: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dental Outreach"
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid rgba(15, 23, 42, 0.14)',
                background: '#ffffff',
                fontSize: 13,
                color: 'var(--lp-ink)'
              }}
            />
            <LiquidButton type="submit" variant="gold" size="sm" icon={FolderPlus} disabled={!name.trim()}>
              Create Folder
            </LiquidButton>
          </div>

          {/* Clean Color Radio Dots (no text color labels) */}
          <div role="radiogroup" aria-label="Folder color" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {FOLDER_SWATCHES.map((s) => {
              const checked = swatch === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={s.id}
                  onClick={() => setSwatch(s.id)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: s.hex,
                    border: checked ? '2px solid #ffffff' : 'none',
                    boxShadow: checked ? `0 0 0 2px ${s.hex}` : 'none',
                    cursor: 'pointer',
                    transform: checked ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 120ms ease'
                  }}
                />
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
}
