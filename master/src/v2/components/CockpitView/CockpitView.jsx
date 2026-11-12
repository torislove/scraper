import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, CircleDot, Compass, Copy, Crosshair,
  Download, ExternalLink, FileSpreadsheet, FileText, Filter, Folder,
  FolderArchive, Globe2, Layers, Loader2, MapPin, MessageSquare, Phone,
  PhoneCall, Play, Radar as RadarIcon, RefreshCw, RotateCcw, Search,
  SlidersHorizontal, Smartphone, Sparkles, Square, Star, Table2, Tag,
  Trash2, Users, Wifi, WifiOff, X, Zap
} from 'lucide-react';
import FilterBar from '../cards/FilterBar';
import CommandMap from '../../CommandMap';
import WhatsAppCampaignModal from '../modals/WhatsAppCampaignModal';
import CockpitFolderRow from './CockpitFolderRow';
import { EmptyState, VendorAvatar } from '../cards/MetricCard';
import { extractLeadArea, CarriedBadge, qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { CRM_STAGES, crmStageOf, formatInr } from '../../CrmBoard';
import { getDisplayPhone, isMobilePhone, whatsappNumber, classifyPhone } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { leadSourceMeta, listLeadSources, downloadLeadCsv } from '../../utils/leadSource';
import { cx, formatNumber, relativeTime } from '../../ui';

export default function CockpitView({
  vendors = [],
  filteredVendors = [],
  pageRows = [],
  filters = {},
  onFilterChange,
  runs = [],
  sessionFilter,
  folderLoading,
  onOpenFolder,
  onExportFolder,
  crmSavingId,
  onStageChange,
  onSelectVendor,
  onTab,
  mapZones = [],
  activeZone,
  scanning,
  mapCenter,
  mapZoom,
  page = 1,
  pageCount = 1,
  pageSize = 100,
  onPage,
  onPageSize,
  run = null,
  stats = {},
  onOpenWhatsApp,
  selectedAreaFilter = 'all',
  onSelectArea
}) {
  const [cockpitSelectedIds, setCockpitSelectedIds] = useState(new Set());
  const [showCockpitWaModal, setShowCockpitWaModal] = useState(false);

  const crmPhonesMap = useMemo(() => {
    const map = new Map();
    (vendors || []).forEach(v => {
      const stage = crmStageOf(v);
      if (stage && stage !== 'new') {
        const p = getDisplayPhone(v);
        if (p) {
          const digits = whatsappNumber(p);
          if (digits) {
            map.set(digits, {
              stage,
              folderName: v.sessionName || v.category || 'CRM',
              vendorName: v.name
            });
          }
        }
      }
    });
    return map;
  }, [vendors]);

  const toggleSelectAllCockpit = () => {
    if (cockpitSelectedIds.size === pageRows.length && pageRows.length > 0) {
      setCockpitSelectedIds(new Set());
    } else {
      setCockpitSelectedIds(new Set(pageRows.map(v => v.id || `${v.name}-${v.phone}`)));
    }
  };

  const toggleCockpitSelectOne = (id) => {
    const next = new Set(cockpitSelectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCockpitSelectedIds(next);
  };

  const handleCockpitCopyMobiles = () => {
    const target = pageRows.filter(v => cockpitSelectedIds.has(v.id || `${v.name}-${v.phone}`));
    const rawPhones = target.map(l => {
      const p = getDisplayPhone(l);
      if (!p) return null;
      const digits = whatsappNumber(p);
      return digits ? `+91 ${digits}` : null;
    }).filter(Boolean);
    if (!rawPhones.length) {
      toast.error('No mobile numbers found in selected rows.');
      return;
    }
    navigator.clipboard?.writeText(rawPhones.join('\n'));
    toast.success(`Copied ${rawPhones.length} mobile numbers to clipboard!`);
  };

  const stageCounts = useMemo(() => {
    const map = {};
    CRM_STAGES.forEach(stage => { map[stage.id] = 0; });
    vendors.forEach(vendor => {
      const stage = crmStageOf(vendor);
      map[stage] = (map[stage] || 0) + 1;
    });
    return map;
  }, [vendors]);

  // Current search leads strictly scoped for the live map
  const mapVendors = useMemo(() => {
    if (run?.id || run?.sessionId) {
      const activeId = run.sessionId || run.id;
      return filteredVendors.filter(v =>
        v.sessionId === activeId ||
        v.lastSessionId === activeId ||
        (Array.isArray(v.sessionIds) && v.sessionIds.includes(activeId))
      );
    }
    if (sessionFilter) {
      return filteredVendors.filter(v =>
        v.sessionId === sessionFilter ||
        v.lastSessionId === sessionFilter ||
        (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionFilter))
      );
    }
    // Initial workspace state: show recent verified leads with valid coords so map is vibrant immediately
    const withCoords = filteredVendors.filter(v => Number.isFinite(Number(v.latitude)));
    if (withCoords.length > 0) return withCoords.slice(0, 150);
    return filteredVendors.slice(0, 150);
  }, [filteredVendors, run?.id, run?.sessionId, sessionFilter]);

  const plotted = (mapVendors || []).filter(vendor => Number.isFinite(Number(vendor.latitude))).length;
  const recentRuns = (runs || []).slice(0, 6);

  const cockpitMobilesCount = useMemo(() => {
    return (filteredVendors || []).filter(v => {
      const p = getDisplayPhone(v);
      return isMobilePhone(p);
    }).length;
  }, [filteredVendors]);

  const cockpitAvgQuality = useMemo(() => {
    const scores = (filteredVendors || [])
      .map(v => qualityOf(v))
      .filter(s => s != null && Number.isFinite(s));
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [filteredVendors]);

  // Which scrapes produced the live rows? Counts respect the open folder so a
  // selected source chip keeps a stable total instead of collapsing to itself.
  const scopedVendors = useMemo(() => {
    if (!sessionFilter) return vendors || [];
    return (vendors || []).filter(v =>
      v.sessionId === sessionFilter ||
      v.lastSessionId === sessionFilter ||
      (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionFilter))
    );
  }, [vendors, sessionFilter]);

  const sourceFacets = useMemo(() => listLeadSources(scopedVendors), [scopedVendors]);
  const activeSource = filters?.source || 'all';

  const handleExportCsv = () => {
    const selected = (filteredVendors || []).filter(v =>
      cockpitSelectedIds.has(v.id || `${v.name}-${v.phone}`)
    );
    const rows = selected.length ? selected : (filteredVendors || []);
    if (!rows.length) {
      toast.error('No leads to export yet.');
      return;
    }
    const name = selected.length ? 'selected_leads' : 'live_leads';
    const ok = downloadLeadCsv(rows, `${name}_${Date.now()}.csv`, { city: run?.location || '' });
    if (ok) {
      toast.success(`Exported ${rows.length} leads with scrape source to CSV.`);
    }
  };

  return (
    <div className="v2-cockpit">
      {/* LEFT: folders + CRM */}
      <aside className="v2-cockpit-col v2-cp-left">
        <section className="v2-cp-panel v2-cp-folders">
          <header className="v2-cp-head">
            <span><FolderArchive size={13} /> FOLDERS <b>{formatNumber((runs || []).length)}</b></span>
            <button type="button" onClick={() => onTab('runs')} title="Open all folders">All</button>
          </header>
          <div className="v2-cp-folder-list">
            {(recentRuns || []).map(runCard => (
              <CockpitFolderRow
                key={runCard.id}
                run={runCard}
                active={sessionFilter === runCard.id || run?.id === runCard.id}
                loading={folderLoading === runCard.id}
                onOpen={() => onOpenFolder(runCard)}
                onExport={onExportFolder}
                activeArea={selectedAreaFilter}
                onSelectArea={(targetRun, area) => {
                  if (sessionFilter !== targetRun?.id && targetRun?.id) {
                    onOpenFolder(targetRun);
                  }
                  onSelectArea?.(area);
                }}
              />
            ))}
            {!recentRuns.length && (
              <p className="v2-cp-empty">No folders yet. Your first search is saved automatically.</p>
            )}
          </div>
        </section>

        <section className="v2-cp-panel v2-cp-crm">
          <header className="v2-cp-head">
            <span><Users size={13} /> PIPELINE</span>
            <button type="button" onClick={() => onTab('crm')} title="Open CRM board">Board</button>
          </header>
          <div className="v2-cp-crm-list">
            {CRM_STAGES.map(stage => (
              <button
                type="button"
                key={stage.id}
                className={cx('v2-cp-crm-row', `stage-${stage.id}`)}
                onClick={() => onTab('crm')}
                title={`${stage.label}: open the CRM board`}
              >
                <i />
                <span>{stage.label}</span>
                <b>{formatNumber(stageCounts[stage.id] || 0)}</b>
              </button>
            ))}
          </div>
          <footer className="v2-cp-crm-foot">
            <span>Qualified <b>{formatNumber(stageCounts.qualified || 0)}</b></span>
            <span>Won <b>{formatNumber(stageCounts.won || 0)}</b></span>
          </footer>
        </section>
      </aside>

      {/* CENTER: live leads */}
      <section className="v2-cockpit-col v2-cp-center">
        <div className="v2-cp-center-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="v2-cp-title">
              <CircleDot size={13} className={scanning ? 'v2-cp-live' : ''} />
              LIVE LEADS
              <b>{formatNumber(filteredVendors.length)}</b>
            </span>
            <span className="v2-cp-sub">
              {formatNumber(cockpitMobilesCount)} mobiles · {cockpitAvgQuality}% profile quality
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="v2-btn-ghost v2-export-csv-btn"
              onClick={handleExportCsv}
              title="Download the live leads (or selected rows) as a CSV spreadsheet with the scrape source"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="v2-btn-ghost"
              style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', color: '#fbbf24', cursor: 'pointer', fontWeight: 600 }}
              onClick={async () => {
                try {
                  toast.loading('Enriching contact numbers...', { id: 'enrich-toast' });
                  const res = await fetch('/api/scrape/enrich-now', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: run?.sessionId || run?.id })
                  });
                  const data = await res.json();
                  toast.success(data.message || 'Real-time contact enrichment active!', { id: 'enrich-toast' });
                } catch (e) {
                  toast.error('Could not reach enrichment service', { id: 'enrich-toast' });
                }
              }}
              title="Extract mobile numbers, WhatsApp links & full postal addresses"
            >
              <Sparkles size={12} className="v2-text-amber" />
              <span>Enrich Mobile Numbers</span>
            </button>
          </div>
        </div>

        {/* Scrape source differentiation: every live row is stamped by the
            engine that produced it, and the chips filter without a reload. */}
        {sourceFacets.length > 0 && (
          <div className="v2-source-bar" role="group" aria-label="Filter live leads by scrape source">
            <span className="v2-source-bar-label">SCRAPE SOURCE</span>
            <button
              type="button"
              className={cx('v2-source-chip', activeSource === 'all' && 'is-active')}
              onClick={() => onFilterChange?.('source', 'all')}
            >
              All scrapes <b>{formatNumber(filteredVendors.length)}</b>
            </button>
            {sourceFacets.map(facet => (
              <button
                type="button"
                key={facet.key}
                className={cx('v2-source-chip', `is-${facet.tone}`, activeSource === facet.key && 'is-active')}
                onClick={() => onFilterChange?.('source', activeSource === facet.key ? 'all' : facet.key)}
                title={`${facet.label} · ${facet.count} leads from this scrape`}
              >
                {facet.short} <b>{formatNumber(facet.count)}</b>
              </button>
            ))}
          </div>
        )}

        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          total={vendors.length}
          shown={filteredVendors.length}
          compact
        />

        {selectedAreaFilter && selectedAreaFilter !== 'all' && (
          <div className="v2-area-filter-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 8, margin: '8px 0', fontSize: 12, color: '#0F172A', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} style={{ color: '#2563EB' }} />
              Sub-Area Filter: <b style={{ color: '#1D4ED8' }}>{selectedAreaFilter}</b> ({formatNumber(filteredVendors.length)} leads)
            </span>
            <button
              type="button"
              onClick={() => onSelectArea && onSelectArea('all')}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 0 #94A3B8' }}
            >
              <X size={11} /> Clear Filter
            </button>
          </div>
        )}

        <div className="v2-cp-table">
          <table className="v2-lead-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && cockpitSelectedIds.size === pageRows.length}
                    onChange={toggleSelectAllCockpit}
                    title="Select all on this page"
                  />
                </th>
                <th>BUSINESS</th>
                <th>CONTACT</th>
                <th>STAGE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(pageRows || []).map((vendor, index) => {
                const stage = crmStageOf(vendor);
                const quality = qualityOf(vendor);
                const locality = vendor.city || vendor.village || vendor.district || 'Unknown';
                const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
                const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                const leadAddress = vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, vendor.city || vendor.village || vendor.mandal, vendor.district, vendor.state].filter(Boolean).join(', ') || locality;
                return (
                  <tr
                    key={vendor.id}
                    className={cx('v2-lead-animated-row', cockpitSelectedIds.has(vendor.id || `${vendor.name}-${vendor.phone}`) && 'is-selected')}
                    style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
                    onClick={() => onSelectVendor(vendor)}
                  >
                    <td onClick={e => e.stopPropagation()} style={{ width: 32 }}>
                      <input
                        type="checkbox"
                        checked={cockpitSelectedIds.has(vendor.id || `${vendor.name}-${vendor.phone}`)}
                        onChange={() => toggleCockpitSelectOne(vendor.id || `${vendor.name}-${vendor.phone}`)}
                      />
                    </td>
                    <td>
                      <div className="v2-vendor-cell">
                        <VendorAvatar vendor={vendor} size={32} />
                        <span className="v2-vendor-info-wrap">
                          <b className="v2-lead-proper-name">{vendor.name || 'Verified Business'}</b>
                          <CarriedBadge lead={vendor} />
                          {(() => {
                            const src = leadSourceMeta(vendor);
                            return (
                              <span
                                className={cx('v2-source-badge', `is-${src.tone}`)}
                                title={`This lead was found by the ${src.label} scrape`}
                              >
                                {src.short}
                              </span>
                            );
                          })()}
                          {(() => {
                            const activePhone = getDisplayPhone(vendor);
                            if (!activePhone) return null;
                            const digits = whatsappNumber(activePhone);
                            const col = digits ? crmPhonesMap.get(digits) : null;
                            if (!col) return null;
                            return (<span className="v2-collision-badge" title={`Already in CRM as "${col.stage}" (${col.folderName})`}>🔄 In CRM ({col.stage})</span>);
                          })()}
                          <div className="v2-lead-address-line" title={leadAddress}>
                            <MapPin size={11} className="v2-text-lime" style={{ flexShrink: 0 }} />
                            <span className="v2-lead-address">{leadAddress}</span>
                            {distKm != null && (
                              <span className="v2-distance-badge" title="Distance from search origin">
                                📍 {distKm} km
                              </span>
                            )}
                          </div>
                          <small className="v2-cp-cat">
                            {vendor.category || 'Business'} <i>·</i> {locality}
                          </small>
                        </span>
                        {quality != null && <em className="v2-cp-q">{quality}%</em>}
                        {vendor.verified && <CheckCircle2 size={12} className="v2-verified-icon" />}
                      </div>
                    </td>
                    <td>
                      <div className="v2-contact-cell">
                        {(() => {
                          const activePhone = getDisplayPhone(vendor);
                          if (!activePhone) {
                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', borderRadius: 6, background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>
                                <Sparkles size={11} className={scanning ? 'v2-spin-slow' : ''} />
                                <span>{scanning ? 'Enriching contact...' : 'No contact yet'}</span>
                              </div>
                            );
                          }
                          const cleanDigits = whatsappNumber(activePhone);
                          const isMob = Boolean(cleanDigits);
                          const hasMultiPhones = Array.isArray(vendor.phones) && vendor.phones.length > 1;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <a href={`tel:${activePhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 650, color: isMob ? '#0369A1' : '#334155' }} onClick={event => event.stopPropagation()}>
                                <Phone size={11} /> {activePhone}
                              </a>
                              {hasMultiPhones && (
                                <span
                                  style={{ fontSize: '9px', fontWeight: 750, padding: '1px 5px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', cursor: 'help' }}
                                  title={`Consolidated Numbers: ${vendor.phones.join(' · ')}`}
                                >
                                  +{vendor.phones.length - 1} MORE
                                </span>
                              )}
                              {!isMob && (
                                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                                  LANDLINE
                                </span>
                              )}
                              {isMob && (
                                <button
                                  type="button"
                                  className="v2-row-wa-btn"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (onOpenWhatsApp) {
                                      onOpenWhatsApp(vendor);
                                    } else {
                                      window.open(`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(`Hi ${vendor.name || 'there'}, reaching out regarding your business services.`)}`, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                  title="Open WhatsApp Command Center to customize message & send"
                                >
                                  <MessageSquare size={11} />
                                  <span>WhatsApp</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        <span className="v2-contact-sub">
                          {vendor.website
                            ? <a href={vendor.website} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}><Globe2 size={10} /> site</a>
                            : <em>no site</em>}
                          {vendor.rating != null && (
                            <span className="v2-cp-rating">
                              ★ {Number(vendor.rating).toFixed(1)}
                              {vendor.reviewsCount ? ` (${formatNumber(vendor.reviewsCount)})` : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        className={cx('v2-stage-select', `stage-${stage}`)}
                        value={stage}
                        onClick={event => event.stopPropagation()}
                        onChange={event => onStageChange(vendor, event.target.value)}
                        disabled={crmSavingId === vendor.id}
                      >
                        {CRM_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="v2-row-actions" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => onSelectVendor(vendor)} title="Open full profile"><ArrowRight size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!pageRows.length && (
            scanning ? (
              <div className="v2-scanning-leads-state">
                <div className="v2-scanning-radar-pulse">
                  <span className="v2-radar-sweep-beam" />
                  <span className="v2-radar-ring r1" />
                  <span className="v2-radar-ring r2" />
                  <span className="v2-radar-ring r3" />
                  <RadarIcon size={26} className="v2-radar-center-icon v2-spin" />
                </div>
                <b className="v2-scanning-leads-title">Ultra-Blazing Multi-Vector Swarm In Progress</b>
                <p className="v2-scanning-leads-desc">
                  Sweeping Geospatial Radar Mesh, Direct Telecom Registry & Deep SERP Index. Direct verified mobile contacts streaming in...
                </p>
                <div className="v2-leads-skeleton-grid">
                  <div className="v2-lead-skeleton-row" />
                  <div className="v2-lead-skeleton-row" />
                  <div className="v2-lead-skeleton-row" />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No leads on screen yet."
                body="Type a category and a city in the search bar above. Verified businesses appear here as each area reports back."
                action={() => onFilterChange({ query: '', phoneOnly: false, websiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest' })}
                actionLabel="Reset filters"
              />
            )
          )}
        </div>

        <footer className="v2-cp-foot">
          <span>
            {filteredVendors.length
              ? <>Showing <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredVendors.length)}</b> of <b>{formatNumber(filteredVendors.length)}</b></>
              : 'No rows'}
          </span>
          <div className="v2-pagination">
            <select value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
              <option value={500}>500 / page</option>
              <option value={1000}>1,000 / page</option>
              <option value={100000}>All Leads</option>
            </select>
            <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft size={13} /></button>
            <span>{page} / {pageCount}</span>
            <button type="button" onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}><ChevronRight size={13} /></button>
          </div>
        </footer>

        {cockpitSelectedIds.size > 0 && (
          <div className="v2-floating-action-bar">
            <span><b>{cockpitSelectedIds.size}</b> leads selected</span>
            <div className="v2-fab-actions">
              <button
                type="button"
                className="v2-btn v2-btn-sm v2-btn-green"
                onClick={() => setShowCockpitWaModal(true)}
              >
                <MessageSquare size={13} /> Launch WhatsApp Campaign ({cockpitSelectedIds.size})
              </button>
              <button
                type="button"
                className="v2-btn v2-btn-sm v2-btn-ghost"
                onClick={() => {
                  const selectedLeads = pageRows.filter(v => cockpitSelectedIds.has(v.id || (v.name + '-' + v.phone)));
                  const ok = exportLeadsToVcf(selectedLeads, 'leads_contacts_' + Date.now() + '.vcf');
                  if (ok) {
                    toast.success('Exported ' + selectedLeads.length + ' contacts to vCard (.vcf)!');
                  } else {
                    toast.error('No leads with mobile numbers to export.');
                  }
                }}
                title="Download .vcf vCard to import all selected contacts into your phone with 1 tap"
              >
                <Download size={13} /> 📲 Export VCF ({cockpitSelectedIds.size})
              </button>
              <button
                type="button"
                className="v2-btn v2-btn-sm v2-btn-ghost"
                onClick={handleCockpitCopyMobiles}
              >
                <Copy size={13} /> Copy Mobiles
              </button>
              <button
                type="button"
                className="v2-btn v2-btn-sm v2-btn-ghost"
                onClick={() => setCockpitSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {showCockpitWaModal && (
          <WhatsAppCampaignModal
            leads={pageRows.filter(v => cockpitSelectedIds.has(v.id || `${v.name}-${v.phone}`))}
            onClose={() => setShowCockpitWaModal(false)}
            onUpdateStage={onStageChange}
          />
        )}
      </section>

      {/* RIGHT: live map */}
      <aside className="v2-cockpit-col v2-cp-right">
        <section className="v2-cp-panel v2-cp-map">
          <header className="v2-cp-head">
            <span><RadarIcon size={13} className={scanning ? 'v2-cp-live' : ''} /> LIVE MAP</span>
            <button type="button" onClick={() => onTab('map')} title="Open the full map">Expand</button>
          </header>
          <div className="v2-cp-map-body">
            <CommandMap
              vendors={mapVendors}
              zones={mapZones}
              activeZone={activeZone}
              scanning={scanning}
              center={mapCenter}
              zoom={mapZoom}
              height="100%"
              fitKey={run?.id || sessionFilter || 'current-search'}
              scopeTitle={run?.category ? `${run.category} (${run.location || 'Current'})` : sessionFilter ? 'Selected Folder' : 'Current Search'}
              onSelect={vendor => onSelectVendor(vendor)}
              onSelectZone={name => onFilterChange('query', name)}
            />
          </div>
          <footer className="v2-cp-map-foot">
            <div><span>PLOTTED</span><b>{formatNumber(plotted)}</b></div>
            <div><span>NO COORDS</span><b>{formatNumber(mapVendors.length - plotted)}</b></div>
            <div><span>ZONES</span><b>{formatNumber(mapZones.length)}</b></div>
          </footer>
        </section>
      </aside>
    </div>
  );
}
