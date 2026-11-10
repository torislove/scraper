import React from 'react';
import {
  CheckSquare, FolderArchive, GitMerge, MapPin, Search, Square, Trash2, X
} from 'lucide-react';
import { formatNumber, relativeTime, cx } from '../../ui';
import RunCard from '../cards/RunCard';
import { EmptyState } from '../cards/MetricCard';

export default function FoldersGridView({
  headerExtra,
  effectiveRuns = [],
  filteredRuns = [],
  folderSearch = '',
  setFolderSearch,
  folderCity = 'all',
  setFolderCity,
  folderCities = [],
  folderSort = 'newest',
  setFolderSort,
  selectedFolderIds = new Set(),
  handleSelectAllFolders,
  handleToggleSelectFolder,
  setShowMergeModal,
  handleBatchDelete,
  setSelectedFolderIds,
  sessionFilter,
  run,
  folderLoading,
  openFolder,
  setRenamingFolder,
  exportFolder,
  loadFolderToCockpit,
  deleteFolder
}) {
  return (
    <section className="v2-runs-view">
      {headerExtra}
      <div className="v2-runs-top">
        <div>
          <span className="v2-view-kicker">SAVED SEARCH VAULTS · LOCAL LEAD ARCHIVES</span>
          <h2>Every search is saved in its own permanent folder.</h2>
          <p>Open any folder to explore leads, copy verified mobiles, export CSV/JSON, switch to Map view, or load it into your live Cockpit workspace.</p>
        </div>
        <div className="v2-folder-stats-pill">
          <FolderArchive size={16} />
          <span><b>{formatNumber(effectiveRuns.length)}</b> Folders</span>
          <span>•</span>
          <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.leadCount || 0), 0))}</b> Leads</span>
          <span>•</span>
          <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.phoneCount || 0), 0))}</b> Mobiles</span>
        </div>
      </div>

      {/* Runs Toolbar: Search, City Filter Pills, Select All, and Sort Dropdown */}
      <div className="v2-runs-toolbar">
        <div className="v2-runs-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Search folders (name, locality, phone, vendor, cmd_...)"
            value={folderSearch}
            onChange={e => setFolderSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setFolderSearch(''); }}
          />
          {folderSearch && (
            <button type="button" onClick={() => setFolderSearch('')} title="Clear search (Esc)">
              <X size={12} />
            </button>
          )}
        </div>
        {folderSearch.trim() && (
          <span className="v2-search-count-pill">
            Showing <b>{filteredRuns.length}</b> of {effectiveRuns.length} folders
          </span>
        )}

        <div className="v2-runs-city-pills">
          <button
            type="button"
            className={cx('v2-city-pill', folderCity === 'all' && 'is-active')}
            onClick={() => setFolderCity('all')}
          >
            All ({effectiveRuns.length})
          </button>
          {(folderCities || []).map(city => {
            const count = effectiveRuns.filter(r => (r.location || '').toLowerCase().includes(city.toLowerCase())).length;
            return (
              <button
                type="button"
                key={city}
                className={cx('v2-city-pill', folderCity.toLowerCase() === city.toLowerCase() && 'is-active')}
                onClick={() => setFolderCity(city)}
              >
                <MapPin size={10} /> {city} ({count})
              </button>
            );
          })}
        </div>

        <div className="v2-runs-toolbar-right">
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-xs"
            onClick={handleSelectAllFolders}
            title="Select or deselect all folders"
          >
            {selectedFolderIds.size === filteredRuns.length && filteredRuns.length > 0 ? (
              <>
                <CheckSquare size={12} className="v2-text-lime" /> Deselect All
              </>
            ) : (
              <>
                <Square size={12} /> Select All
              </>
            )}
          </button>

          <div className="v2-runs-sort">
            <select value={folderSort} onChange={e => setFolderSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="leads">Most leads</option>
              <option value="phones">Most mobile numbers</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Actions Floating / Sticky Bar */}
      {selectedFolderIds.size > 0 && (
        <div className="v2-runs-batch-bar">
          <div className="v2-runs-batch-info">
            <CheckSquare size={16} className="v2-text-lime" />
            <span><b>{selectedFolderIds.size}</b> folders selected</span>
            <span className="v2-runs-batch-leads">
              ({formatNumber(effectiveRuns.filter(r => selectedFolderIds.has(r.id)).reduce((acc, r) => acc + (r.leadCount || 0), 0))} total leads)
            </span>
          </div>
          <div className="v2-runs-batch-actions">
            {selectedFolderIds.size >= 2 && (
              <button
                type="button"
                className="v2-btn v2-btn-lime v2-btn-sm"
                onClick={() => setShowMergeModal(true)}
              >
                <GitMerge size={13} /> Merge &amp; Deduplicate ({selectedFolderIds.size})
              </button>
            )}
            <button
              type="button"
              className="v2-btn v2-btn-danger v2-btn-sm"
              onClick={handleBatchDelete}
            >
              <Trash2 size={13} /> Delete Selected ({selectedFolderIds.size})
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => setSelectedFolderIds(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="v2-run-grid">
        {(filteredRuns || []).map(runCard => (
          <RunCard
            key={runCard.id}
            run={runCard}
            active={sessionFilter === runCard.id || run?.id === runCard.id}
            loading={folderLoading === runCard.id}
            selected={selectedFolderIds.has(runCard.id)}
            onToggleSelect={handleToggleSelectFolder}
            onOpen={() => openFolder(runCard)}
            onRename={() => setRenamingFolder(runCard)}
            onExport={exportFolder}
            onLoadToCockpit={loadFolderToCockpit}
            onDelete={deleteFolder}
          />
        ))}
        {filteredRuns.length === 0 && (
          <EmptyState
            icon={FolderArchive}
            title={folderSearch || folderCity !== 'all' ? 'No folders match your filter.' : 'No folders saved yet.'}
            body={folderSearch || folderCity !== 'all' ? 'Try changing your search term or clearing the city filter.' : 'Run your first search. When it finishes, the leads are written to a dated folder you can reopen any time.'}
            action={() => { setFolderSearch(''); setFolderCity('all'); }}
            actionLabel="Reset filters"
          />
        )}
      </div>

      <div className="v2-run-folder-tree">
        <div className="v2-folder-head">
          <FolderArchive size={15} />
          <span>RECENT SEARCH FOLDERS DISK INDEX</span>
          <b>{effectiveRuns.length} TOTAL VAULTS</b>
        </div>
        {filteredRuns.slice(0, 8).map((runCard, index) => (
          <div className="v2-tree-row" key={runCard.id} style={{ paddingLeft: `${14 + (index % 4) * 16}px` }}>
            <span>▸</span>
            <b>{runCard.id}</b>
            <span>{runCard.name || `${runCard.category} in ${runCard.location}`}</span>
            <small>{formatNumber(runCard.leadCount)} leads · {formatNumber(runCard.phoneCount)} mobiles · {relativeTime(runCard.timestamp)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
