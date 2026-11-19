import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDot,
  Copy, FolderArchive, Globe2, MapPin, Phone, Radar as RadarIcon,
  Search, Sparkles, Star, X
} from 'lucide-react';
import FilterBar from '../cards/FilterBar';
import CommandMap from '../../CommandMap';
import CockpitFolderRow from './CockpitFolderRow';
import { EmptyState, VendorAvatar } from '../cards/MetricCard';
import { extractLeadArea, qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { getDisplayPhone, isMobilePhone, whatsappNumber } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { cx, formatNumber } from '../../ui';
import OdometerCounter from '../cards/OdometerCounter';
import FloatingActionDock from '../cards/FloatingActionDock';

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
  progress = null,
  selectedAreaFilter = 'all',
  onSelectArea
}) {
  const [cockpitSelectedIds, setCockpitSelectedIds] = useState(new Set());

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
      const digits = whatsappNumber(p, l.country);
      if (!digits) return p;
      if (digits.startsWith('91') || l.country === 'IN') return `+91 ${digits.replace(/^91/, '')}`;
      return `+${digits}`;
    }).filter(Boolean);
    const unique = [...new Set(rawPhones)];
    if (!unique.length) {
      toast.error('No phone numbers found in the selected rows.');
      return;
    }
    navigator.clipboard?.writeText(unique.join('\n'));
    toast.success(`Copied ${unique.length} phone numbers to clipboard!`);
  };

  const handleCockpitExportVcf = () => {
    const target = pageRows.filter(v => cockpitSelectedIds.has(v.id || `${v.name}-${v.phone}`));
    if (!target.length) {
      toast.error('Select at least one business first.');
      return;
    }
    const ok = exportLeadsToVcf(target, `business_contacts_${target.length}.vcf`);
    if (ok) toast.success(`Saved ${target.length} contacts (.vcf) for your phone!`);
    else toast.error('No phone numbers available in selected rows.');
  };

  const handleCockpitExportCsv = () => {
    const target = pageRows.filter(v => cockpitSelectedIds.has(v.id || `${v.name}-${v.phone}`));
    if (!target.length) {
      toast.error('Select at least one business first.');
      return;
    }
    if (onExportFolder) {
      onExportFolder({ leads: target, name: `selected_leads_${target.length}` }, 'csv');
    } else {
      toast.success(`Exporting ${target.length} selected businesses…`);
    }
  };

  const copySinglePhone = (e, phone) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    toast.success(`Copied ${phone}`);
  };

  // Current search leads scoped cleanly for the live map
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
    const withCoords = filteredVendors.filter(v => Number.isFinite(Number(v.latitude)));
    if (withCoords.length > 0) return withCoords.slice(0, 150);
    return filteredVendors.slice(0, 150);
  }, [filteredVendors, run?.id, run?.sessionId, sessionFilter]);

  const plotted = (mapVendors || []).filter(vendor => Number.isFinite(Number(vendor.latitude))).length;
  const recentRuns = (runs || []).slice(0, 8);

  const cockpitPhonesCount = useMemo(() => {
    return (filteredVendors || []).filter(v => Boolean(getDisplayPhone(v))).length;
  }, [filteredVendors]);

  // Unique Area Breakdown Explorer (Replaces removed CRM Pipeline panel!)
  const topAreas = useMemo(() => {
    const counts = new Map();
    (filteredVendors || []).forEach(v => {
      const area = extractLeadArea(v, run?.location) || v.city || v.locality || '';
      const clean = String(area || '').trim();
      if (clean && clean.length >= 2) {
        counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filteredVendors, run?.location]);

  return (
    <div className="v2-cockpit">
      {/* LEFT RAIL: Saved Lists + Smart Area Explorer (ZERO CRM / Pipeline!) */}
      <aside className="v2-cockpit-col v2-cp-left">
        <section className="v2-cp-panel v2-cp-folders">
          <header className="v2-cp-head">
            <span><FolderArchive size={13} /> MY LISTS <b>{formatNumber((runs || []).length)}</b></span>
            <button type="button" onClick={() => onTab('runs')} title="See all saved lists">View All</button>
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
              <p className="v2-cp-empty">Your searches save here automatically as clean, downloadable lists.</p>
            )}
          </div>
        </section>

        {/* Smart Area Breakdown (Unique, actionable geographic lens) */}
        {topAreas.length > 0 && (
          <section className="v2-cp-panel" style={{ paddingBottom: 10 }}>
            <header className="v2-cp-head">
              <span><MapPin size={13} /> TOP AREAS</span>
              {filters.query && (
                <button type="button" onClick={() => onFilterChange('query', '')}>Reset</button>
              )}
            </header>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topAreas.map(([areaName, count]) => {
                const isActive = (filters.query || '').toLowerCase() === areaName.toLowerCase();
                return (
                  <button
                    key={areaName}
                    type="button"
                    onClick={() => onFilterChange('query', isActive ? '' : areaName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 10,
                      border: isActive ? '1px solid #10b981' : '1px solid rgba(15, 23, 42, 0.06)',
                      background: isActive ? '#ecfdf5' : '#f8fafc',
                      color: isActive ? '#065f46' : '#334155',
                      fontSize: 12,
                      fontWeight: 650,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.14s ease'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{areaName}</span>
                    <b style={{ fontSize: 11, color: isActive ? '#059669' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(count)}
                    </b>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </aside>

      {/* CENTER STAGE: Clean, Ultra-Fast Live Business Leads Feed */}
      <section className="v2-cockpit-col v2-cp-center">
        <div className="v2-cp-center-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="v2-cp-title">
              <CircleDot size={13} className={scanning ? 'v2-cp-live' : ''} />
              VERIFIED LEADS
              <b><OdometerCounter value={filteredVendors.length} /></b>
            </span>
            <span className="v2-cp-sub">
              <OdometerCounter value={cockpitPhonesCount} /> with direct phone numbers
            </span>
          </div>
          <button
            type="button"
            className="v2-btn-ghost"
            style={{
              fontSize: 12,
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              cursor: 'pointer',
              fontWeight: 700
            }}
            onClick={async () => {
              try {
                toast.loading('Looking up missing phone numbers…', { id: 'enrich-toast' });
                const res = await fetch('/api/scrape/enrich-now', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: run?.sessionId || run?.id })
                });
                const data = await res.json();
                toast.success(data.message || 'Finding missing phone numbers in the background!', { id: 'enrich-toast' });
              } catch (e) {
                toast.error('Unable to start contact lookup right now.', { id: 'enrich-toast' });
              }
            }}
            title="Automatically discover missing phone numbers and street addresses"
          >
            <Sparkles size={13} />
            <span>Find Missing Phones</span>
          </button>
        </div>

        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          total={vendors.length}
          shown={filteredVendors.length}
          compact
        />

        {selectedAreaFilter && selectedAreaFilter !== 'all' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 10,
              margin: '8px 0',
              fontSize: 12.5,
              color: '#065f46',
              fontWeight: 650
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} />
              Showing area: <b>{selectedAreaFilter}</b> ({formatNumber(filteredVendors.length)} businesses)
            </span>
            <button
              type="button"
              onClick={() => onSelectArea && onSelectArea('all')}
              style={{
                background: '#ffffff',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                padding: '3px 9px',
                fontSize: 11.5,
                cursor: 'pointer',
                fontWeight: 700,
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <X size={11} /> Show All Areas
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
                    title="Select all businesses on this page"
                  />
                </th>
                <th>BUSINESS &amp; LOCATION</th>
                <th>DIRECT CONTACT</th>
                <th>RATING</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {(pageRows || []).map((vendor, index) => {
                const quality = qualityOf(vendor);
                const locality = vendor.city || vendor.village || vendor.district || 'Area';
                const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
                const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                const leadAddress = vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, vendor.city || vendor.village || vendor.mandal, vendor.district, vendor.state].filter(Boolean).join(', ') || locality;
                const rowKey = vendor.id || `${vendor.name}-${vendor.phone || index}`;
                const activePhone = getDisplayPhone(vendor);
                const isMob = activePhone ? isMobilePhone(activePhone, vendor.country) : false;

                return (
                  <tr
                    key={rowKey}
                    className={cx('v2-lead-animated-row', cockpitSelectedIds.has(rowKey) && 'is-selected')}
                    style={{ animationDelay: `${Math.min(index * 22, 320)}ms` }}
                    onClick={() => onSelectVendor(vendor)}
                  >
                    <td onClick={e => e.stopPropagation()} style={{ width: 32 }}>
                      <input
                        type="checkbox"
                        checked={cockpitSelectedIds.has(rowKey)}
                        onChange={() => toggleCockpitSelectOne(rowKey)}
                      />
                    </td>
                    <td>
                      <div className="v2-vendor-cell">
                        <VendorAvatar vendor={vendor} size={36} />
                        <span className="v2-vendor-info-wrap">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <b className="v2-lead-proper-name">{vendor.name || 'Local Business'}</b>
                            {vendor.verified && <CheckCircle2 size={13} color="#059669" title="Verified business listing" />}
                          </div>
                          <div className="v2-lead-address-line" title={leadAddress}>
                            <MapPin size={11} color="#059669" style={{ flexShrink: 0 }} />
                            <span className="v2-lead-address">{leadAddress}</span>
                            {distKm != null && distKm <= 500 && (
                              <span className="v2-distance-badge">{distKm} km</span>
                            )}
                          </div>
                          <small className="v2-cp-cat">
                            {vendor.category || 'Business'} <i>·</i> {locality}
                            {quality != null ? ` · ${quality}% complete` : ''}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="v2-contact-cell">
                        {activePhone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <a
                              href={`tel:${activePhone}`}
                              className="v2-phone-badge"
                              onClick={event => event.stopPropagation()}
                              title={`Call ${activePhone}`}
                            >
                              <Phone size={11} /> {activePhone}
                            </a>
                            <button
                              type="button"
                              onClick={e => copySinglePhone(e, activePhone)}
                              title="Copy phone number"
                              style={{
                                border: '1px solid rgba(15, 23, 42, 0.12)',
                                background: '#ffffff',
                                borderRadius: 7,
                                width: 26,
                                height: 26,
                                display: 'grid',
                                placeItems: 'center',
                                cursor: 'pointer',
                                color: '#475569'
                              }}
                            >
                              <Copy size={11} />
                            </button>
                            {!isMob && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                                Office
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                            {scanning ? 'Checking phone…' : 'Not listed'}
                          </span>
                        )}
                        <span className="v2-contact-sub" style={{ marginTop: 4 }}>
                          {vendor.website ? (
                            <a href={vendor.website} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>
                              <Globe2 size={11} /> Website
                            </a>
                          ) : (
                            <em>No website</em>
                          )}
                          {vendor.email && (
                            <a href={`mailto:${vendor.email}`} onClick={event => event.stopPropagation()}>
                              Email
                            </a>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      {vendor.rating != null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          <Star size={12} fill="#f59e0b" color="#d97706" />
                          {Number(vendor.rating).toFixed(1)}
                          {vendor.reviewsCount ? <small style={{ color: '#64748b', fontWeight: 600 }}>({formatNumber(vendor.reviewsCount)})</small> : null}
                        </span>
                      ) : (
                        <span className="v2-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="v2-row-actions" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => onSelectVendor(vendor)} title="View full business details">
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!pageRows.length && (
            scanning ? (
              <div className="lx-calm-discovery">
                <div className="lx-radar-orb">
                  <MapPin size={26} />
                </div>
                <b style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Finding verified businesses in {activeZone?.name || run?.location || 'your area'}…
                </b>
                <p style={{ margin: 0, maxWidth: 420, fontSize: 13.5, lineHeight: 1.6, color: '#64748b' }}>
                  Businesses with verified phone numbers, street addresses, and map locations will appear live here in just a moment.
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="Ready to discover leads"
                body="Type any business and city in the search bar above — like Computer shops in Guntur — and click Find Leads."
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
              : 'No leads yet'}
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
      </section>

      {/* RIGHT STAGE: Live Interactive Territory Map */}
      <aside className="v2-cockpit-col v2-cp-right">
        <section className="v2-cp-panel v2-cp-map">
          <header className="v2-cp-head">
            <span><RadarIcon size={13} className={scanning ? 'v2-cp-live' : ''} /> LIVE MAP</span>
            <button type="button" onClick={() => onTab('map')} title="Expand map to full screen">Full Map</button>
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
              scopeTitle={run?.category ? `${run.category} (${run.location || 'Current'})` : sessionFilter ? 'Selected List' : 'Live Map'}
              onSelect={vendor => onSelectVendor(vendor)}
              onSelectZone={name => onFilterChange('query', name)}
            />
          </div>
          <footer className="v2-cp-map-foot">
            <div><span>ON MAP</span><b>{formatNumber(plotted)}</b></div>
            <div><span>WITH PHONE</span><b>{formatNumber(cockpitPhonesCount)}</b></div>
            <div><span>TOTAL LISTED</span><b>{formatNumber(filteredVendors.length)}</b></div>
          </footer>
        </section>
      </aside>

      <FloatingActionDock
        selectedCount={cockpitSelectedIds.size}
        onClear={() => setCockpitSelectedIds(new Set())}
        onCopyMobiles={handleCockpitCopyMobiles}
        onExportVcf={handleCockpitExportVcf}
        onExportCsv={handleCockpitExportCsv}
      />
    </div>
  );
}
