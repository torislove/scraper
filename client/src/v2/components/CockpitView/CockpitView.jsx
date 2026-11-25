import React, { useDeferredValue, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download,
  Globe2, Loader2, MapPin, Maximize2, MessageCircle, Phone, Radar as RadarIcon, Search, Smartphone, Sparkles, X, Zap
} from 'lucide-react';
import CommandMap from '../../CommandMap';
import { EmptyState, VendorAvatar } from '../cards/MetricCard';
import { CarriedBadge, calculateHaversineKm, countSocialProfiles } from '../../utils/leadHelpers';
import { SocialHunterBadgeRow, VendorSocialPills } from '../icons/Social3DIcons';
import { formatLeadPhone, getAllDisplayPhones, getDisplayPhone } from '../../../utils/phoneClassify';
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
    const phones = [...new Set(target.flatMap(l => {
      const dual = getAllDisplayPhones(l, l.country || searchCountry);
      return [dual.mobile?.display, dual.landline?.display, getDisplayPhone(l)].filter(Boolean);
    }))];
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
    const headers = [
      'Business Name', 'Category', 'Phone', 'Mobile Phone', 'Landline / STD', 'Address', 'Area / Mandal',
      'City', 'District', 'State', 'Pincode', 'Latitude', 'Longitude',
      'Map Directions', 'Rating', 'Reviews', 'Website'
    ];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const dual = getAllDisplayPhones(r, r.country || searchCountry);
      const combinedPhone = [dual.mobile?.display, dual.landline?.display].filter(Boolean).join(' / ') || formatLeadPhone(r, r.country || searchCountry)?.display || getDisplayPhone(r) || '';
      const rLat = r.latitude ?? r.lat ?? '';
      const rLng = r.longitude ?? r.lng ?? '';
      const hasGeo = Number.isFinite(Number(rLat)) && Number.isFinite(Number(rLng)) && (Number(rLat) !== 0 || Number(rLng) !== 0);
      const mapUrl = hasGeo
        ? `https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name || ''} ${r.address || r.city || ''}`)}`;
      lines.push([
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${combinedPhone}"`,
        `"${dual.mobile?.display || ''}"`,
        `"${dual.landline?.display || ''}"`,
        `"${(r.address || '').replace(/"/g, '""')}"`,
        `"${(r.mandal || r.locality || '').replace(/"/g, '""')}"`,
        `"${(r.city || r.village || '').replace(/"/g, '""')}"`,
        `"${(r.district || '').replace(/"/g, '""')}"`,
        `"${(r.state || '').replace(/"/g, '""')}"`,
        `"${(r.pincode || '').replace(/"/g, '""')}"`,
        `"${hasGeo ? rLat : ''}"`,
        `"${hasGeo ? rLng : ''}"`,
        `"${mapUrl}"`,
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

  const { phoneCount, mobileCount, landlineCount, huntingCount, socialCount } = useMemo(() => {
    let totalPhones = 0;
    let totalMobiles = 0;
    let totalLandlines = 0;
    let totalHunting = 0;
    let totalSocials = 0;
    for (const v of filteredVendors) {
      const dual = getAllDisplayPhones(v, v?.country || searchCountry);
      if (dual.mobile || dual.landline) {
        totalPhones += 1;
        if (dual.mobile) totalMobiles += 1;
        if (dual.landline) totalLandlines += 1;
      } else if (scanning || runStatus === 'running' || (v?.website && !v?.websiteEnrichedAt)) {
        totalHunting += 1;
      }
      if ((v?._socialCount ?? countSocialProfiles(v)) > 0) totalSocials += 1;
    }
    return { phoneCount: totalPhones, mobileCount: totalMobiles, landlineCount: totalLandlines, huntingCount: totalHunting, socialCount: totalSocials };
  }, [filteredVendors, searchCountry, scanning, runStatus]);
  const deferredMapVendors = useDeferredValue(mapVendors);
  const plottedCount = useMemo(
    () => mapVendors.filter(v => Number.isFinite(Number(v.latitude))).length,
    [mapVendors]
  );

  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);

  return (
    <div className="lx-split-stage">
      <style>{'@keyframes lxSpin{to{transform:rotate(360deg)}} @keyframes lxHunterGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.22)}50%{box-shadow:0 0 0 4px rgba(16,185,129,0.08)}}'}</style>
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
            <span className="lx-sub-stat">{formatNumber(mobileCount)} mobiles · {formatNumber(landlineCount)} landlines · {formatNumber(phoneCount)} with phone</span>
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
              className={cx('lx-chip-toggle', filters.noWebsiteOnly && 'is-on')}
              onClick={() => onFilterChange?.('noWebsiteOnly', !filters.noWebsiteOnly)}
              title="Spot high-value businesses with No Website — warm agency prospects"
            >
              <Globe2 size={12} /> No Website
            </button>

            <button
              type="button"
              className={cx('lx-chip-toggle', filters.sort === 'area' && 'is-on')}
              onClick={() => onFilterChange?.('sort', filters.sort === 'area' ? 'newest' : 'area')}
              title="Group leads by Pincode, Mandal & Locality for field reps"
            >
              <MapPin size={12} /> Area Sort
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

        {(scanning || runStatus === 'running') && (
          <div
            role="status"
            aria-live="polite"
            style={{
              margin: '8px 14px 4px',
              padding: '9px 13px',
              borderRadius: 12,
              background: 'linear-gradient(95deg, rgba(16,185,129,0.10) 0%, rgba(245,158,11,0.10) 55%, rgba(6,182,212,0.10) 100%)',
              border: '1px solid rgba(16,185,129,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              animation: 'lxHunterGlow 2.4s ease-in-out infinite'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 220 }}>
              <Loader2 size={15} color="#059669" style={{ flexShrink: 0, animation: 'lxSpin 1.1s linear infinite' }} />
              <div style={{ fontSize: 12, lineHeight: 1.35, color: '#0f172a' }}>
                <b style={{ color: '#065f46' }}>Don&apos;t panic — Parallel Contact &amp; Social Hunter is delivering your numbers live!</b>{' '}
                <span style={{ color: '#475569' }}>
                  Google Maps, JustDial, Instagram, Facebook &amp; our 12-lane Website Crawler are extracting direct Mobile, Landline &amp; Social handles in real time.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, fontWeight: 700 }}>
              <SocialHunterBadgeRow scanning={Boolean(scanning || runStatus === 'running')} />
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(16,185,129,0.16)', color: '#065f46' }}>
                ✓ {formatNumber(mobileCount)} Mobiles
              </span>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(59,130,246,0.14)', color: '#1d4ed8' }}>
                ☎ {formatNumber(landlineCount)} Landlines
              </span>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(225,48,108,0.12)', color: '#be185d' }}>
                ✨ {formatNumber(socialCount)} Socials
              </span>
              {huntingCount > 0 && (
                <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(245,158,11,0.16)', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={10} /> Hunting {formatNumber(huntingCount)} Websites &amp; Profiles…
                </span>
              )}
            </div>
          </div>
        )}

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
                <th>Mobile, Landline &amp; Website</th>
                <th style={{ width: 96 }}>Rating</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((vendor, index) => {
                const vKey = vendor.id || `${vendor.name}-${vendor.phone || index}`;
                const dual = getAllDisplayPhones(vendor, vendor.country || searchCountry);
                const hasAnyPhone = Boolean(dual.mobile || dual.landline);
                const isFresh = Boolean(freshLeadIds?.has(vendor.id || vKey));
                const isPhonePop = Boolean(phoneJustFoundIds?.has(vendor.id || vKey));
                const locality = vendor.city || vendor.village || vendor.district || '';
                const address = vendor.address || [vendor.locality, locality, vendor.state].filter(Boolean).join(', ') || 'Location available';
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const hasGeo = Number.isFinite(Number(vLat)) && Number.isFinite(Number(vLng)) && (Number(vLat) !== 0 || Number(vLng) !== 0);
                const pinUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hasGeo ? `${vLat},${vLng}` : `${vendor.name || ''} ${address}`)}`;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
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
                        {hasAnyPhone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dual.mobile && (
                              <div className="lx-phone-row">
                                <a href={dual.mobile.callUrl || `tel:${dual.mobile.display}`} className={cx('lx-phone-pill is-mob', isPhonePop && 'lx-phone-pop')}>
                                  <Smartphone size={11} />
                                  <span>{dual.mobile.display}</span>
                                  <span className="lx-phone-tag is-mob">MOB</span>
                                </a>
                                {dual.mobile.whatsappUrl && (
                                  <a
                                    href={dual.mobile.whatsappUrl}
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
                                  onClick={e => handleCopySingle(dual.mobile.display, e)}
                                  title="Copy mobile number"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            )}
                            {dual.landline && (
                              <div className="lx-phone-row">
                                <a href={dual.landline.callUrl || `tel:${dual.landline.display}`} className={cx('lx-phone-pill is-land', isPhonePop && 'lx-phone-pop')}>
                                  <Phone size={11} />
                                  <span>{dual.landline.display}</span>
                                  <span className="lx-phone-tag is-land">STD</span>
                                </a>
                                <button
                                  type="button"
                                  className="lx-copy-mini"
                                  onClick={e => handleCopySingle(dual.landline.display, e)}
                                  title="Copy landline / STD number"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (scanning || runStatus === 'running' || (vendor.website && !vendor.websiteEnrichedAt)) ? (
                          <span
                            className="lx-phone-scanning"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#065f46',
                              background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(245,158,11,0.15) 50%, rgba(16,185,129,0.12) 100%)',
                              border: '1px solid rgba(16,185,129,0.28)'
                            }}
                          >
                            <Loader2 size={11} style={{ animation: 'lxSpin 1.1s linear infinite' }} />
                            {vendor.website ? 'Scanning website & Maps for phone…' : 'Hunting mobile & landline live…'}
                          </span>
                        ) : (
                          <span className="lx-muted-text">No public phone listed</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {vendor.website ? (
                            <a href={vendor.website} target="_blank" rel="noreferrer" className="lx-web-mini">
                              <Globe2 size={10} /> Website
                            </a>
                          ) : (
                            <span className="lx-noweb-pill">No Website · Warm Lead</span>
                          )}
                          <a href={pinUrl} target="_blank" rel="noreferrer" className="lx-pin-link" title="Open street pin & directions">
                            <MapPin size={10} /> Street Pin
                          </a>
                          <VendorSocialPills vendor={vendor} max={3} />
                        </div>
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
                action={(filters.query || filters.phoneOnly || filters.noWebsiteOnly || filters.sort === 'area')
                  ? () => onFilterChange?.({ query: '', phoneOnly: false, noWebsiteOnly: false, sort: 'newest' })
                  : undefined}
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
            vendors={deferredMapVendors}
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
