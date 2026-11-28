/**
 * shared/folders/ScrapedFoldersModal.jsx
 * Automatic Hierarchical Scraped Folders Explorer (Zero Manual Folder Creation):
 *  - Every scrape is auto-saved as a Root Folder (query · city · country)
 *  - Inside every Root Folder: automatic Sub-Categories & Sub-Locations (Wards) sub-folders
 *  - Supports 1-click Cockpit filter, scoped CSV/vCard export, and Resume Remaining Zones
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder, FolderOpen, Layers, MapPin, Download, Play, Trash2, Search, X,
  RefreshCw, Users, Smartphone, MessageCircle, ChevronRight, Contact, Target, History
} from 'lucide-react';
import { FlagSphere } from '../ui/FlagChip';
import LiquidButton from '../ui/LiquidButton';

function StatusBadge({ folder }) {
  if (folder.status === 'running') {
    return (
      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>
        LIVE · {folder.completedZones}/{folder.totalZones}
      </span>
    );
  }
  if (folder.status === 'stopped' && (folder.completedZones || 0) < (folder.totalZones || 1)) {
    return (
      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#fff1f2', color: '#be123c', border: '1px solid rgba(225,29,72,0.25)' }}>
        PAUSED · {folder.completedZones}/{folder.totalZones}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#ecfdf5', color: '#047857', border: '1px solid rgba(5,150,105,0.24)' }}>
      SAVED · {folder.totalZones} {folder.totalZones === 1 ? 'zone' : 'zones'}
    </span>
  );
}

export default function ScrapedFoldersModal({
  isOpen,
  onClose,
  folders = [],
  loading = false,
  onRefresh,
  onLoadScope,
  onExportCsv,
  onExportVcf,
  onResumeFolder,
  onDeleteFolder
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [subTab, setSubTab] = useState('subcategories'); // subcategories | sublocations | segments | runs
  const [folderQuery, setFolderQuery] = useState('');
  const [subQuery, setSubQuery] = useState('');
  const [pickedSubcat, setPickedSubcat] = useState('');
  const [pickedSubloc, setPickedSubloc] = useState('');
  const [pickedSegment, setPickedSegment] = useState('');

  useEffect(() => {
    if (isOpen) onRefresh?.();
  }, [isOpen, onRefresh]);

  useEffect(() => {
    if (!selectedId && folders.length > 0) setSelectedId(folders[0].id);
    else if (selectedId && !folders.some((f) => f.id === selectedId)) setSelectedId(folders[0]?.id || null);
  }, [folders, selectedId]);

  const filteredFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (f) =>
        (f.title || '').toLowerCase().includes(q) ||
        (f.query || '').toLowerCase().includes(q) ||
        (f.city || '').toLowerCase().includes(q) ||
        (f.country || '').toLowerCase().includes(q)
    );
  }, [folders, folderQuery]);

  const activeFolder = useMemo(() => folders.find((f) => f.id === selectedId) || null, [folders, selectedId]);

  const activeSubList = useMemo(() => {
    if (!activeFolder) return [];
    const list = subTab === 'subcategories'
      ? activeFolder.subcategories || []
      : subTab === 'sublocations'
        ? activeFolder.sublocations || []
        : subTab === 'segments'
          ? activeFolder.segments || []
          : activeFolder.runs || [];
    const q = subQuery.trim().toLowerCase();
    return q ? list.filter((x) => x.name.toLowerCase().includes(q)) : list;
  }, [activeFolder, subTab, subQuery]);

  if (!isOpen) return null;

  const triggerLoad = async (subcat = pickedSubcat, subloc = pickedSubloc, seg = pickedSegment, runSid = '') => {
    if (!activeFolder) return;
    await onLoadScope?.(activeFolder.id, { subcategory: subcat, sublocation: subloc, segment: seg, runSessionId: runSid });
    onClose?.();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 75,
        background: 'rgba(15, 23, 42, 0.38)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="lp-glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1020,
          height: '86vh',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: 'var(--lp-shadow-3)'
        }}
      >
        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.34)', color: '#d97706', display: 'grid', placeItems: 'center' }}>
              <FolderOpen size={19} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--lp-ink)' }}>
                Scraped Lead Folders ({folders.length})
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--lp-ink-3)' }}>
                Every sweep is auto-saved with Sub-Category and Sub-Location (Ward) sub-folders
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh folders"
              style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(15,23,42,0.1)', background: '#ffffff', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Scraped Folders"
              style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: '#f8fafc', color: '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2-Pane Folder Explorer */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(250px, 320px) minmax(0, 1fr)', gap: 14 }}>
          {/* Left Pane: Root Scrape Folders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, borderRight: '1px solid rgba(15, 23, 42, 0.08)', paddingRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)' }}>
              <Search size={13} color="#64748b" />
              <input
                type="text"
                value={folderQuery}
                onChange={(e) => setFolderQuery(e.target.value)}
                placeholder="Search scraped folders…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent' }}
              />
            </div>

            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredFolders.length === 0 ? (
                <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 12.5, color: 'var(--lp-ink-4)' }}>
                  No saved sweeps yet. Run any search and it saves here automatically.
                </div>
              ) : (
                filteredFolders.map((f) => {
                  const selected = f.id === activeFolder?.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(f.id);
                        setPickedSubcat('');
                        setPickedSubloc('');
                        setPickedSegment('');
                        setSubQuery('');
                      }}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 12,
                        background: selected ? '#fffbeb' : '#ffffff',
                        border: `1.5px solid ${selected ? '#d97706' : 'rgba(15, 23, 42, 0.09)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <FlagSphere code={f.country} size={15} />
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--lp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.title}
                          </span>
                        </span>
                        <ChevronRight size={14} color={selected ? '#d97706' : '#94a3b8'} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <StatusBadge folder={f} />
                        <span className="lp-tabular" style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-ink-3)' }}>
                          {(f.totalLeads || 0).toLocaleString()} leads
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Hierarchical Sub-Categories & Sub-Locations Tree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {!activeFolder ? (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--lp-ink-4)', fontSize: 13 }}>
                Select a scraped folder on the left to inspect its sub-categories and ward sub-folders.
              </div>
            ) : (
              <>
                {/* Root Folder Summary Card */}
                <div style={{ padding: 14, borderRadius: 14, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.09)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Folder size={20} color="#d97706" fill="#fef3c7" />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--lp-ink)' }}>{activeFolder.title}</div>
                        <div className="lp-tabular" style={{ fontSize: 11.5, color: 'var(--lp-ink-3)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                          <span><Users size={11} style={{ verticalAlign: 'middle' }} /> <b>{(activeFolder.totalLeads || 0).toLocaleString()}</b> leads</span>
                          <span><Smartphone size={11} style={{ verticalAlign: 'middle', color: '#059669' }} /> <b>{(activeFolder.mobileCount || 0).toLocaleString()}</b> mobiles</span>
                          <span><MessageCircle size={11} style={{ verticalAlign: 'middle', color: '#0284c7' }} /> <b>{(activeFolder.whatsappCount || 0).toLocaleString()}</b> WhatsApp</span>
                          <span><b>{activeFolder.subcategoriesCount || 0}</b> Sub-Categories · <b>{activeFolder.sublocationsCount || 0}</b> Sub-Locations</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <LiquidButton variant="gold" size="sm" onClick={() => triggerLoad('', '')}>
                        View All Leads
                      </LiquidButton>
                      <LiquidButton variant="glass-gold" size="sm" icon={Download} onClick={() => onExportCsv?.(activeFolder.id, {})}>
                        CSV
                      </LiquidButton>
                      {onExportVcf && (
                        <LiquidButton variant="glass-gold" size="sm" icon={Contact} onClick={() => onExportVcf(activeFolder)}>
                          vCard
                        </LiquidButton>
                      )}
                      {activeFolder.status === 'stopped' && (activeFolder.completedZones || 0) < (activeFolder.totalZones || 1) && (
                        <LiquidButton
                          variant="emerald"
                          size="sm"
                          icon={Play}
                          onClick={async () => { await onResumeFolder?.(activeFolder.id); onClose?.(); }}
                        >
                          Resume Ward {(activeFolder.completedZones || 0) + 1}
                        </LiquidButton>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteFolder?.(activeFolder.id)}
                        title="Delete Folder"
                        style={{ padding: '6px 9px', borderRadius: 10, background: '#fff1f2', color: '#be123c', border: '1px solid rgba(225,29,72,0.2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Active Cross-Filter Pill */}
                  {(pickedSubcat || pickedSubloc || pickedSegment) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 10, background: '#f0f9ff', border: '1px solid rgba(2,132,199,0.22)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1' }}>
                        Selected Sub-Folder: {[pickedSubcat, pickedSubloc, pickedSegment].filter(Boolean).join(' · ')}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <LiquidButton variant="sapphire" size="sm" onClick={() => triggerLoad(pickedSubcat, pickedSubloc, pickedSegment)}>
                          Open in Cockpit
                        </LiquidButton>
                        <LiquidButton variant="glass-gold" size="sm" icon={Download} onClick={() => onExportCsv?.(activeFolder.id, { subcategory: pickedSubcat, sublocation: pickedSubloc, segment: pickedSegment })}>
                          Export Sub-Folder CSV
                        </LiquidButton>
                        <button
                          type="button"
                          onClick={() => { setPickedSubcat(''); setPickedSubloc(''); setPickedSegment(''); }}
                          style={{ border: 'none', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Folder Tabs + Search */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', flexWrap: 'wrap', gap: 2 }}>
                    {[
                      { id: 'subcategories', label: `Sub-Categories (${activeFolder.subcategoriesCount || 0})`, icon: Layers, bg: '#fffbeb', fg: '#92400e' },
                      { id: 'sublocations', label: `Wards (${activeFolder.sublocationsCount || 0})`, icon: MapPin, bg: '#f0f9ff', fg: '#0369a1' },
                      { id: 'segments', label: `Segments (${(activeFolder.segments || []).length})`, icon: Target, bg: '#ecfdf5', fg: '#047857' },
                      { id: 'runs', label: `Runs (${activeFolder.runsCount || 1})`, icon: History, bg: '#f8fafc', fg: '#334155' }
                    ].map((t) => {
                      const TabIcon = t.icon;
                      const active = subTab === t.id;
                      return (
                        <button
                          key={t.id} type="button" onClick={() => { setSubTab(t.id); setSubQuery(''); }}
                          style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, background: active ? t.bg : 'transparent', color: active ? t.fg : '#64748b' }}
                        >
                          <TabIcon size={12.5} /> {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.1)', minWidth: 180 }}>
                    <Search size={13} color="#64748b" />
                    <input type="text" value={subQuery} onChange={(e) => setSubQuery(e.target.value)} placeholder="Filter sub-folders…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent' }} />
                  </div>
                </div>

                {/* Sub-Folders Grid */}
                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))', gap: 10 }}>
                  {activeSubList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: 28, textAlign: 'center', fontSize: 12.5, color: 'var(--lp-ink-4)' }}>
                      No matching sub-folders.
                    </div>
                  ) : (
                    activeSubList.map((sub) => {
                      const isSeg = subTab === 'segments';
                      const isRun = subTab === 'runs';
                      const isPicked = isSeg ? pickedSegment === sub.key : (subTab === 'subcategories' ? pickedSubcat === sub.name : subTab === 'sublocations' ? pickedSubloc === sub.name : false);
                      const scopePayload = {
                        subcategory: subTab === 'subcategories' ? sub.name : pickedSubcat,
                        sublocation: subTab === 'sublocations' ? sub.name : pickedSubloc,
                        segment: isSeg ? sub.key : pickedSegment,
                        runSessionId: isRun ? sub.sessionId : ''
                      };
                      return (
                        <div key={sub.key} style={{ padding: 12, borderRadius: 12, background: isPicked ? '#fffbeb' : '#ffffff', border: `1.5px solid ${isPicked ? '#d97706' : 'rgba(15, 23, 42, 0.09)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                              {subTab === 'subcategories' ? <Layers size={14} color="#d97706" /> : subTab === 'sublocations' ? <MapPin size={14} color="#0284c7" /> : isSeg ? <Target size={14} color="#059669" /> : <History size={14} color="#475569" />}
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--lp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                            </div>
                            <div className="lp-tabular" style={{ fontSize: 11, color: 'var(--lp-ink-3)' }}>
                              <b>{sub.leadCount}</b> leads{sub.mobileCount != null ? <> · <b>{sub.mobileCount}</b> mobiles · <b>{sub.whatsappCount || 0}</b> WA</> : null}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button type="button" onClick={() => triggerLoad(scopePayload.subcategory, scopePayload.sublocation, scopePayload.segment, scopePayload.runSessionId)} style={{ flex: 1, padding: '5px 8px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#334155', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              View Leads
                            </button>
                            {!isRun && (
                              <button
                                type="button"
                                onClick={() => isSeg ? setPickedSegment(isPicked ? '' : sub.key) : (subTab === 'subcategories' ? setPickedSubcat(isPicked ? '' : sub.name) : setPickedSubloc(isPicked ? '' : sub.name))}
                                style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(2,132,199,0.22)', background: isPicked ? '#0284c7' : '#f0f9ff', color: isPicked ? '#ffffff' : '#0369a1', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              >
                                {isPicked ? 'Picked' : '+Combine'}
                              </button>
                            )}
                            <button type="button" onClick={() => onExportCsv?.(activeFolder.id, scopePayload)} title="Export sub-folder CSV" style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', color: '#334155', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                              <Download size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
