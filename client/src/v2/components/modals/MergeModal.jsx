import React, { useState } from 'react';
import { FolderArchive, GitMerge, Loader2, X } from 'lucide-react';
import { formatNumber } from '../../ui';

export default function MergeModal({ folders, onClose, onMerge, isMerging }) {
  const sample = folders[0];
  const [title, setTitle] = useState(
    `Merged: ${sample?.category || 'Leads'} (${folders.length} folders)`
  );
  const totalRawLeads = folders.reduce((sum, f) => sum + (f.leadCount || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || isMerging) return;
    onMerge(title.trim());
  };

  return (
    <div className="v2-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-dialog-card" onClick={e => e.stopPropagation()}>
        <header className="v2-dialog-head">
          <div className="v2-dialog-title">
            <GitMerge size={16} className="v2-text-lime" />
            <h3>Merge &amp; Deduplicate Folders</h3>
          </div>
          <button type="button" className="v2-icon-btn" onClick={onClose}><X size={16} /></button>
        </header>

        <form onSubmit={handleSubmit} className="v2-dialog-form">
          <p className="v2-dialog-desc">
            Combine <b>{folders.length} folders</b> ({formatNumber(totalRawLeads)} raw leads) into a single consolidated search vault.
            Identical phone numbers and business names will be automatically deduplicated with merged metadata.
          </p>

          <div className="v2-merge-folders-list">
            {folders.map(f => (
              <div key={f.id} className="v2-merge-folder-row">
                <FolderArchive size={14} />
                <span className="v2-merge-folder-name">{f.customName || f.name}</span>
                <span className="v2-merge-folder-count">{formatNumber(f.leadCount)} leads · {formatNumber(f.phoneCount)} mobiles</span>
              </div>
            ))}
          </div>

          <label className="v2-dialog-field">
            <span>New Merged Folder Title</span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Master Consolidated Outreach Vault"
              required
            />
          </label>

          <footer className="v2-dialog-actions">
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-lime v2-btn-sm" disabled={isMerging || !title.trim()}>
              {isMerging ? <Loader2 size={13} className="v2-spin" /> : <GitMerge size={13} />}
              <span>Merge &amp; Deduplicate</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

