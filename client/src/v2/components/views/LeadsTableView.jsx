import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Folder, FolderOpen, X, Search, Sparkles } from 'lucide-react';
import FilterBar from '../cards/FilterBar';
import FloatingActionDock from '../cards/FloatingActionDock';
import LeadTableRow from './LeadTableRow';
import TablePagination from './TablePagination';
import { EmptyState } from '@shared/ui/Primitives';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { getAllDisplayPhones, getDisplayPhone } from '../../../utils/phoneClassify';
import { downloadLeadCsv } from '../../utils/leadSource';
import { safeLeadId } from '../../utils/safeTypes';

const ROW_HEIGHT = 104;
const OVERSCAN = 8;

function AutoFolderPill({ folder, active, onOpenFolder }) {
  return (
    <button
      type="button"
      onClick={() => onOpenFolder?.(folder.id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 10,
        fontSize: 11.5,
        fontWeight: 700,
        background: active ? '#fffbeb' : '#ffffff',
        color: active ? '#78350f' : 'var(--lp-ink-2)',
        border: `1.5px solid ${active ? '#d97706' : 'rgba(15, 23, 42, 0.1)'}`,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 120ms ease'
      }}
      title="Open saved folder and sub-folders"
    >
      <Folder size={12} color="#d97706" fill="#fef3c7" />
      <span>{folder.title}</span>
      <span
        className="lp-tabular"
        style={{ padding: '1px 6px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: active ? '#fde68a' : '#f1f5f9', color: active ? '#78350f' : '#475569' }}
      >
        {folder.totalLeads || 0}
      </span>
    </button>
  );
}

export default function LeadsTableView({
  filters = {},
  updateFilter = () => {},
  filteredVendors = [],
  pageRows = [],
  mapCenter,
  setSelectedVendor,
  currentPage = 1,
  pageSize = 250,
  pageCount = 1,
  setPage,
  setPageSize,
  country = 'IN',
  scanning = false,
  freshLeadIds = null,
  phoneJustFoundIds = null,
  phoneHunting = false,
  onSaveToFolder,
  folders = [],
  activeSelection = null,
  onClearFolderSelection,
  onQuickOpenFolder,
  onOpenFoldersModal,
  onDeepEnrichPage,
  onResetFilters,
  syncNonce = 0
}) {
  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : mapCenter?.lat || null;
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : mapCenter?.lng || null;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const scrollWrapRef = useRef(null);
  const scrollRafRef = useRef(0);
  const isLiveHunting = Boolean(scanning || phoneHunting);

  useEffect(() => {
    const el = scrollWrapRef.current;
    if (!el || typeof ResizeObserver !== 'function') return undefined;
    setViewportHeight(el.clientHeight || 560);
    const ro = new ResizeObserver(() => {
      if (el.clientHeight > 0) setViewportHeight(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageRows.length]);

  useEffect(() => {
    const el = scrollWrapRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
    setSelectedIds(new Set());
  }, [currentPage, syncNonce, activeSelection?.folderId, activeSelection?.subcategory, activeSelection?.sublocation, activeSelection?.segment]);

  useEffect(() => {
    const maxTop = Math.max(0, pageRows.length * ROW_HEIGHT - viewportHeight + 48);
    if (scrollTop > maxTop) {
      const clamped = Math.max(0, maxTop);
      if (scrollWrapRef.current) scrollWrapRef.current.scrollTop = clamped;
      setScrollTop(clamped);
    }
  }, [pageRows.length, viewportHeight, scrollTop]);

  const onScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop;
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      setScrollTop(top);
    });
  }, []);

  const useVirtual = pageRows.length > 48;
  const { visibleRows, topSpacer, bottomSpacer } = useMemo(() => {
    if (!useVirtual) {
      return { visibleRows: pageRows, topSpacer: 0, bottomSpacer: 0 };
    }
    const maxStart = Math.max(0, pageRows.length - 1);
    const startIdx = Math.min(maxStart, Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN));
    const endIdx = Math.min(pageRows.length, Math.max(startIdx + 1, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN));
    return {
      visibleRows: pageRows.slice(startIdx, endIdx),
      topSpacer: startIdx * ROW_HEIGHT,
      bottomSpacer: Math.max(0, (pageRows.length - endIdx) * ROW_HEIGHT)
    };
  }, [useVirtual, pageRows, scrollTop, viewportHeight]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pageRows.length && pageRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageRows.map((v) => safeLeadId(v))));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyPhone = (phone, e) => {
    e?.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    toast.success(`Copied ${phone}`);
  };

  const handleCopyMobiles = () => {
    const target = pageRows.filter((v) => selectedIds.has(safeLeadId(v)));
    const rawPhones = target.flatMap((l) => {
      const dual = getAllDisplayPhones(l, l.country || country);
      return [dual.mobile?.display, dual.landline?.display, getDisplayPhone(l)].filter(Boolean);
    });
    const unique = [...new Set(rawPhones)];
    if (!unique.length) return toast.error('No phone numbers in selected rows.');
    navigator.clipboard?.writeText(unique.join('\n'));
    toast.success(`Copied ${unique.length} phone numbers.`);
  };

  const handleExportVcf = () => {
    const target = pageRows.filter((v) => selectedIds.has(safeLeadId(v)));
    if (!target.length) return toast.error('Select businesses first.');
    exportLeadsToVcf(target, `business_contacts_${target.length}`);
    toast.success(`Exported ${target.length} vCards.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 8 }}>
      {/* Auto-Saved Scraped Folders Strip */}
      <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--lp-ink-4)', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Folder size={12} color="#d97706" /> Scraped Folders:
        </span>
        {activeSelection && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 11.5,
              fontWeight: 800,
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid rgba(2, 132, 199, 0.28)',
              flexShrink: 0
            }}
          >
            <span>
              Viewing: {activeSelection.folderTitle}
              {activeSelection.subcategory ? ` › ${activeSelection.subcategory}` : ''}
              {activeSelection.sublocation ? ` › ${activeSelection.sublocation}` : ''}
              {activeSelection.segment ? ` › ${activeSelection.segment}` : ''}
            </span>
            {onClearFolderSelection && (
              <button
                type="button"
                onClick={onClearFolderSelection}
                style={{ border: 'none', background: 'transparent', color: '#0369a1', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                title="Clear folder scope"
              >
                <X size={12} />
              </button>
            )}
          </span>
        )}
        {folders.slice(0, 5).map((fld) => (
          <AutoFolderPill
            key={fld.id}
            folder={fld}
            active={activeSelection?.folderId === fld.id}
            onOpenFolder={onQuickOpenFolder}
          />
        ))}
        <button
          type="button"
          onClick={onOpenFoldersModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            background: '#fffbeb',
            color: '#92400e',
            border: '1px solid rgba(217, 119, 6, 0.34)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <FolderOpen size={12} /> All Folders ({folders.length})
        </button>

        {typeof onDeepEnrichPage === 'function' && pageRows.length > 0 && (
          <button
            type="button"
            onClick={() => onDeepEnrichPage(pageRows)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid rgba(2, 132, 199, 0.28)',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: 'auto'
            }}
          >
            <Sparkles size={12} /> Deep Enrich Page
          </button>
        )}
      </div>

      <FilterBar
        filters={filters}
        onChange={updateFilter}
        onReset={onResetFilters}
        total={filteredVendors.length}
        shown={pageRows.length}
        compact
      />

      {/* Virtualised Scroll Container */}
      <div
        ref={scrollWrapRef}
        onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.08)', background: '#ffffff' }}
      >
        {pageRows.length === 0 ? (
          <EmptyState
            icon={Search}
            title={scanning ? 'Scanning municipal wards…' : 'No matching leads in view'}
            description={scanning ? 'Leads stream into this table as each ward completes.' : 'Adjust your filters above or start a new sweep.'}
          />
        ) : (
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ width: 42, padding: '8px 10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleSelectAll}
                    aria-label="Select page rows"
                  />
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Business & Locality
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contacts & Socials
                </th>
                <th style={{ width: 112, textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reviews &amp; Dossier
                </th>
              </tr>
            </thead>
            <tbody>
              {topSpacer > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={4} style={{ height: topSpacer, padding: 0, border: 'none' }} />
                </tr>
              )}
              {visibleRows.map((v, idx) => {
                const id = safeLeadId(v);
                return (
                  <LeadTableRow
                    key={id}
                    vendor={v}
                    index={idx}
                    selected={selectedIds.has(id)}
                    selectedIds={selectedIds}
                    onToggleSelect={() => toggleSelectOne(id)}
                    onClick={() => setSelectedVendor?.(v)}
                    onCopyPhone={handleCopyPhone}
                    originLat={originLat}
                    originLng={originLng}
                    country={country}
                    isFresh={Boolean(freshLeadIds?.has(id))}
                    isPhonePop={Boolean(phoneJustFoundIds?.has(id))}
                    isLiveHunting={isLiveHunting}
                  />
                );
              })}
              {bottomSpacer > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={4} style={{ height: bottomSpacer, padding: 0, border: 'none' }} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        totalItems={filteredVendors.length}
        setPage={setPage}
        setPageSize={setPageSize}
      />

      {selectedIds.size > 0 && (
        <FloatingActionDock
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onCopyMobiles={handleCopyMobiles}
          onExportVcf={handleExportVcf}
          onExportCsv={() => {
            const target = pageRows.filter((v) => selectedIds.has(safeLeadId(v)));
            if (!target.length) return;
            downloadLeadCsv(target, `selected_${target.length}_leads.csv`);
          }}
          onDeepEnrichSelected={typeof onDeepEnrichPage === 'function' ? () => {
            const target = pageRows.filter((v) => selectedIds.has(safeLeadId(v)));
            if (target.length) onDeepEnrichPage(target);
          } : undefined}
          onSaveToFolder={() => onSaveToFolder?.(Array.from(selectedIds))}
        />
      )}
    </div>
  );
}
