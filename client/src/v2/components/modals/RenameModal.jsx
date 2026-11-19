import React, { useState } from 'react';
import { Check, Edit3, Loader2, X } from 'lucide-react';
import { cx } from '../../ui';

const COLOR_OPTIONS = ['#00f0ff', '#39ff14', '#ff007f', '#ffaa00', '#a855f7', '#3b82f6'];

export default function RenameModal({ folder, onClose, onSave }) {
  const [name, setName] = useState(folder?.customName || folder?.name || '');
  const [tags, setTags] = useState(Array.isArray(folder?.tags) ? folder.tags.join(', ') : '');
  const [color, setColor] = useState(folder?.color || '#00f0ff');
  const [notes, setNotes] = useState(folder?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    await onSave(folder.id, {
      customName: name.trim(),
      tags: parsedTags,
      color,
      notes: notes.trim()
    });
    setSaving(false);
  };

  return (
    <div className="v2-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-dialog-card" onClick={e => e.stopPropagation()}>
        <header className="v2-dialog-head">
          <div className="v2-dialog-title">
            <Edit3 size={16} className="v2-text-cyan" />
            <h3>Folder Settings &amp; Campaign Tags</h3>
          </div>
          <button type="button" className="v2-icon-btn" onClick={onClose}><X size={16} /></button>
        </header>

        <form onSubmit={handleSubmit} className="v2-dialog-form">
          <label className="v2-dialog-field">
            <span>Folder Display Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Hyderabad Q1 Plumbers Outreach"
              required
              autoFocus
            />
          </label>

          <label className="v2-dialog-field">
            <span>Campaign Tags (comma separated)</span>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. Priority, Cold Call, Telugu, Central Zone"
            />
          </label>

          <div className="v2-dialog-field">
            <span>Campaign Color Badge</span>
            <div className="v2-color-picker-row">
              {COLOR_OPTIONS.map(c => (
                <button
                  type="button"
                  key={c}
                  className={cx('v2-color-dot', color === c && 'is-active')}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <label className="v2-dialog-field">
            <span>List Notes</span>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Verified suppliers in Guntur & Vijayawada for Q2 calling."
            />
          </label>

          <footer className="v2-dialog-actions">
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-lime v2-btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="v2-spin" /> : <Check size={13} />}
              <span>Save Folder</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

