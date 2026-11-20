import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download,
  Globe2, MapPin, Maximize2, MessageCircle, Phone, Radar as RadarIcon, Search, Smartphone, X, Zap
} from 'lucide-react';
import CommandMap from '../../CommandMap';
import { EmptyState, VendorAvatar } from '../cards/MetricCard';
import { CarriedBadge, calculateHaversineKm } from '../../utils/leadHelpers';
import { formatLeadPhone, getDisplayPhone } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { cx, formatNumber } from '../../ui';
import FloatingActionDock from '../cards/FloatingActionDock';

export default function CockpitView({
  filteredVendors = [],
  pageRows = [],
  filters = {},
  onFilterChange,
  sessionFilter,
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
  runStatus = '',
  freshLeadIds = null,
  phoneJustFoundIds = null,
  searchCountry = 'IN',
  progress = null,
  jumpTrail = null,
  hopTransition = ''
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hoveredLeadId, setHoveredLeadId] = useState(null);
  const zoneTotal = Math.max(1, Number(progress?.totalMandalsAcrossAll ?? progress?.totalMandals ?? mapZones?.length ?? 1));
  const zoneDone = Math.max(0, Number(progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0));

  const toggleSelectAll = () => {
    if (selectedIds.size === pageRows.length && pageRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageRows.map((v, idx) => v.id || `${v.name}-${v.phone || idx}`)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCopySingle = (phone, e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    toast.success(`Copied ${phone}`);
  };

  const handleCopySelectedPhones = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    const phones = [...new Set(target.map(l => getDisplayPhone(l)).filter(Boolean))];
    if (!phones.length) {
      toast.error('No phone numbers in selected rows.');
      return;
    }
    navigator.clipboard?.writeText(phones.join('\n'));
    toast.success(`Copied ${phones.length} phone numbers!`);
  };

  const handleExportVcf = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    if (!target.length) return;
    exportLeadsToVcf(target, `contacts_${target.length}`);
    toast.success(`Saved ${target.length} phone contacts (.vcf)!`);
  };

  const exportCsvRows = (rows, label) => {
    if (!rows.length) {
      toast.error('No leads to download yet.');
      return;
    }
    const headers = ['Business Name', 'Category', 'Phone', 'Address', 'City', 'Rating', 'Reviews', 'Website'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${formatLeadPhone(r, r.country || searchCountry)?.display || getDisplayPhone(r) || ''}"`,
        `"${(r.address || '').replace(/"/g, '""')}"`,
        `"${(r.city || r.village || '').replace(/"/g, '""')}"`,
        `"${r.rating || ''}"`,
        `"${r.reviewsCount || ''}"`,
        `"${(r.website || '').replace(/"/g, '""')}"`
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}_${rows.length}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rows.length} leads as CSV!`);
  };

  const handleExportSelectedCsv = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    exportCsvRows(target, 'selected_leads');
  };

  // Leads shown on the live map
  const mapVendors = useMemo(() => {
    if (run?.id || run?.sessionId) {
      const activeId = run.sessionId || run.id;
      const scoped = filteredVendors.filter(v =>
        v.sessionId === activeId ||
        v.lastSessionId === activeId ||
        (Array.isArray(v.sessionIds) && v.sessionIds.includes(activeId))
      );
      if (scoped.length) return scoped;
    }
    if (sessionFilter) {
      const scoped = filteredVendors.filter(v =>
        v.sessionId === sessionFilter ||
        v.lastSessionId === sessionFilter ||
        (Array.isArray(v.sessionIds) && v.sessionIds.includes(sessionFilter))
      );
      if (scoped.length) return scoped;
    }
    return filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).slice(0, 200);
  }, [filteredVendors, run?.id, run?.sessionId, sessionFilter]);

  const { phoneCount, mobileCount } = useMemo(() => {
    let totalPhones = 0;
    let totalMobiles = 0;
    for (const v of filteredVendors) {
      const parsed = formatLeadPhone(v, v?.country || searchCountry);
      if (parsed) {
        totalPhones += 1;
        if (parsed.isMobile) totalMobiles += 1;
      }
    }
    return { phoneCount: totalPhones, mobileCount: totalMobiles };
  }, [filteredVendors, searchCountry]);
  const plottedCount = useMemo(
    () => mapVendors.filter(v => Number.isFinite(Number(v.latitude))).length,
    [mapVendors]
  );

  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);

  return (
    <div className="lx-split-stage">
      {/* LEFT PANEL: CLEAN LIVE LEADS */}
      <section className="lx-leads-pane">
        <header className="lx-pane-head">
          <div className="lx-pane-title">
            <span className={cx('lx-status-dot', scanning && 'is-live')} />
            <h2>Live Leads</h2>
            {scanning ? (
              <span className="lx-zone-pill is-hot">
                <Zap size={10} /> LIVE
              </span>
            ) : filteredVendors.length > 0 && (runStatus === 'complete' || runStatus === 'completed' || runStatus === 'stopped' || sessionFilter) ? (
              <span className="lx-zone-pill is-done">
                <CheckCircle2 size={10} /> SAVED · LAST RUN
              </span>
            ) : null}
            <span className="lx-count-badge">{formatNumber(filteredVendors.length)}</span>
            <span className="lx-sub-stat">{formatNumber(mobileCount)} mobiles · {formatNumber(phoneCount)} phones</span>
          </div>

          <div className="lx-pane-controls">
            <div className="lx-mini-search">
              <Search size={13} />
              <input
                type="search"
                value={filters.query || ''}
                onChange={e => onFilterChange?.('query', e.target.value)}
                placeholder="Filter results…"
              />
              {filters.query && (
                <button type="button" onClick={() => onFilterChange?.('query', '')} aria-label="Clear filter">
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={cx('lx-chip-toggle', filters.phoneOnly && 'is-on')}
              onClick={() => onFilterChange?.('phoneOnly', !filters.phoneOnly)}
            >
              <Phone size={12} /> Has Phone
            </button>

            <button
              type="button"
              className="lx-chip-export"
              onClick={() => exportCsvRows(filteredVendors, 'leads')}
              disabled={!filteredVendors.length}
              title="Download CSV spreadsheet"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </header>

        <div className="lx-table-wrap">
          <table className="lx-clean-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Business &amp; Location</th>
                <th>Phone &amp; Website</th>
                <th style={{ width: 96 }}>Rating</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((vendor, index) => {
                const vKey = vendor.id || `${vendor.name}-${vendor.phone || index}`;
                const parsedPhone = formatLeadPhone(vendor, vendor.country || searchCountry);
                const phone = parsedPhone?.display || '';
                const isMob = Boolean(parsedPhone?.isMobile);
                const isFresh = Boolean(freshLeadIds?.has(vendor.id || vKey));
                const isPhonePop = Boolean(phoneJustFoundIds?.has(vendor.id || vKey));
                const locality = vendor.city || vendor.village || vendor.district || '';
                const address = vendor.address || [vendor.locality, locality, vendor.state].filter(Boolean).join(', ') || 'Location available';
                const distKm = calculateHaversineKm(originLat, originLng, vendor.latitude ?? vendor.lat, vendor.longitude ?? vendor.lng);
                const isHovered = hoveredLeadId === vKey || hoveredLeadId === vendor.id;

                return (
                  <tr
                    key={vKey}
                    id={`lead-row-${vKey}`}
                    className={cx(selectedIds.has(vKey) && 'is-selected', isHovered && 'is-hovered', isFresh && 'lx-row-enter')}
                    onClick={() => onSelectVendor?.(vendor)}
                    onMouseEnter={() => setHoveredLeadId(vKey)}
                    onMouseLeave={() => setHoveredLeadId(null)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(vKey)}
                        onChange={() => toggleSelectOne(vKey)}
                      />
                    </td>
                    <td>
                      <div className="lx-biz-cell">
                        <VendorAvatar vendor={vendor} size={34} />
                        <div className="lx-biz-info">
                          <div className="lx-biz-name-row">
                            <b>{vendor.name || 'Business'}</b>
                            {vendor.verified && <CheckCircle2 size={13} color="#059669" />}
                            <CarriedBadge lead={vendor} />
                          </div>
                          <div className="lx-biz-addr" title={address}>
                            <MapPin size={11} />
                            <span>{address}</span>
                            {distKm != null && distKm <= 200 && <em>{distKm} km</em>}
                          </div>
                          {vendor.category && <small className="lx-biz-cat">{vendor.category}</small>}
                        </div>
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="lx-contact-stack">
                        {phone ? (
                          <div className="lx-phone-row">
                            <a href={parsedPhone?.callUrl || `tel:${phone}`} className={cx('lx-phone-pill', isMob ? 'is-mob' : 'is-land', isPhonePop && 'lx-phone-pop')}>
                              {isMob ? <Smartphone size={11} /> : <Phone size={11} />}
                              <span>{phone}</span>
                              <span className={cx('lx-phone-tag', isMob ? 'is-mob' : 'is-land')}>
                                {isMob ? 'MOB' : 'STD'}
                              </span>
                            </a>
                            {isMob && parsedPhone?.whatsappUrl && (
                              <a
                                href={parsedPhone.whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="lx-wa-mini"
                                title="Message on WhatsApp"
                              >
                                <MessageCircle size={11} />
                              </a>
                            )}
                            <button
                              type="button"
                              className="lx-copy-mini"
                              onClick={e => handleCopySingle(phone, e)}
                              title="Copy phone number"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        ) : scanning ? (
                          <span className="lx-phone-scanning">
                            <span className="lx-dot-pulse" /> Finding phone…
                          </span>
                        ) : (
                          <span className="lx-muted-text">No phone listed</span>
                        )}
                        {vendor.website && (
                          <a href={vendor.website} target="_blank" rel="noreferrer" className="lx-web-mini">
                            <Globe2 size={10} /> Website
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      {vendor.rating != null ? (
                        <span className="lx-rating-cell">
                          ★ <b>{Number(vendor.rating).toFixed(1)}</b>
                          {vendor.reviewsCount ? <small>({formatNumber(vendor.reviewsCount)})</small> : null}
                        </span>
                      ) : (
                        <span className="lx-muted-text">—</span>
                      )}
                    </td>
                    <td>
                      <ArrowRight size={14} className="lx-row-arrow" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!pageRows.length && (
            scanning ? (
              <div className="lx-calm-discovery">
                <div className="lx-radar-orb"><RadarIcon size={26} /></div>
                <b style={{ fontSize: 15, color: '#0f172a' }}>Finding businesses for you…</b>
                <p style={{ margin: 0, maxWidth: 360, fontSize: 13, color: '#64748b' }}>
                  Verified names, phone numbers, and locations will appear here live as they come in.
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="Ready to find leads"
                body="Pick a country flag above, type any business and city in the search bar, and press Enter."
                action={filters.query || filters.phoneOnly ? () => onFilterChange?.({ query: '', phoneOnly: false }) : undefined}
                actionLabel="Clear filters"
              />
            )
          )}
        </div>

        <footer className="lx-pane-foot">
          <span>
            {filteredVendors.length
              ? <>Showing <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredVendors.length)}</b> of <b>{formatNumber(filteredVendors.length)}</b></>
              : 'No results'}
          </span>
          <div className="lx-pager">
            <select value={pageSize} onChange={e => onPageSize?.(Number(e.target.value))}>
              {[50, 100, 250, 500].map(size => <option key={size} value={size}>{size} / page</option>)}
            </select>
            <button type="button" onClick={() => onPage?.(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft size={14} /></button>
            <span>{page} / {pageCount}</span>
            <button type="button" onClick={() => onPage?.(Math.min(pageCount, page + 1))} disabled={page >= pageCount}><ChevronRight size={14} /></button>
          </div>
        </footer>
      </section>

      {/* RIGHT PANEL: PROPER FULL-HEIGHT FRAMED MAP */}
      <aside className="lx-map-pane">
        <header className="lx-pane-head">
          <div className="lx-pane-title">
            <MapPin size={15} color="#059669" />
            <h2>Live Map</h2>
            <span className={cx('lx-zone-pill', scanning && 'is-live')}>
              {scanning
                ? `⚡ Zone ${Math.min(zoneTotal, zoneDone + 1)} of ${zoneTotal}`
                : `${formatNumber(mapZones.length || 1)} Zones Ready`}
            </span>
            {hopTransition ? (
              <span className="retro-hop-transition" style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800 }}>
                {hopTransition}
              </span>
            ) : null}
            <span className="lx-count-badge">{formatNumber(plottedCount)} pinned</span>
          </div>
          <button type="button" className="lx-chip-toggle" onClick={() => onTab?.('map')} title="Open full screen map">
            <Maximize2 size={12} /> Full Screen
          </button>
        </header>

        <div className="lx-map-frame">
          <CommandMap
            vendors={mapVendors}
            zones={mapZones}
            activeZone={activeZone}
            scanning={scanning}
            center={mapCenter}
            zoom={mapZoom}
            height="100%"
            compact={false}
            hoveredLeadId={hoveredLeadId}
            cellStates={progress?.cellStates || {}}
            jumpTrail={jumpTrail}
            fitKey={run?.id || sessionFilter || 'workspace-map'}
            scopeTitle={run?.category ? `${run.category} (${run.location || 'Area'})` : 'Live Map'}
            onSelect={vendor => {
              onSelectVendor?.(vendor);
              const vKey = vendor.id || `${vendor.name}-${vendor.phone}`;
              const rowEl = document.getElementById(`lead-row-${vKey}`);
              if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            onSelectZone={name => onFilterChange?.('query', name)}
          />
        </div>
      </aside>

      <FloatingActionDock
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onCopyMobiles={handleCopySelectedPhones}
        onExportVcf={handleExportVcf}
        onExportCsv={handleExportSelectedCsv}
      />
    </div>
  );
}
