import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Filter,
  Globe2, Loader2, MapPin, MessageCircle, Phone, Search, Smartphone, Sparkles, Star, X
} from 'lucide-react';
import { formatNumber, cx } from '../../ui';
import FilterBar from '../cards/FilterBar';
import { VendorAvatar, EmptyState } from '../cards/MetricCard';
import { qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { getAllDisplayPhones, getDisplayPhone } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import FloatingActionDock from '../cards/FloatingActionDock';

export default function LeadsTableView({
  sessionFilter,
  setSessionFilter,
  filters,
  updateFilter,
  setFilters,
  vendors = [],
  filteredVendors = [],
  pageRows = [],
  mapCenter,
  setSelectedVendor,
  currentPage = 1,
  pageSize = 100,
  pageCount = 1,
  setPage,
  setPageSize,
  country = 'IN',
  scanning = false,
  phoneJustFoundIds = null
}) {
  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { mobileCount, landlineCount, huntingCount } = useMemo(() => {
    let mobs = 0;
    let lands = 0;
    let hunting = 0;
    for (const v of filteredVendors) {
      const dual = getAllDisplayPhones(v, v?.country || country);
      if (dual.mobile || dual.landline) {
        if (dual.mobile) mobs += 1;
        if (dual.landline) lands += 1;
      } else if (scanning || (v?.website && !v?.websiteEnrichedAt)) {
        hunting += 1;
      }
    }
    return { mobileCount: mobs, landlineCount: lands, huntingCount: hunting };
  }, [filteredVendors, country, scanning]);

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

  const handleCopyPhone = (phone, e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    toast.success(`Copied ${phone}`);
  };

  const handleCopyMobiles = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    const rawPhones = target.flatMap(l => {
      const dual = getAllDisplayPhones(l, l.country || country);
      return [dual.mobile?.display, dual.landline?.display, getDisplayPhone(l)].filter(Boolean);
    });
    const unique = [...new Set(rawPhones)];
    if (!unique.length) {
      toast.error('No phone numbers found in selected rows.');
      return;
    }
    navigator.clipboard?.writeText(unique.join('\n'));
    toast.success(`Copied ${unique.length} phone numbers!`);
  };

  const handleExportVcf = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    if (!target.length) {
      toast.error('Select businesses first to save contacts.');
      return;
    }
    exportLeadsToVcf(target, `master_contacts_${target.length}`);
    toast.success(`Saved ${target.length} contacts (.vcf)!`);
  };

  const handleExportCsv = (rowsOverride = null) => {
    const target = Array.isArray(rowsOverride)
      ? rowsOverride
      : pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    if (!target.length) {
      toast.error('Select businesses first to export CSV.');
      return;
    }
    const headers = [
      'Business Name', 'Category', 'Phone', 'Mobile Phone', 'Landline / STD', 'Address', 'Area / Mandal',
      'City', 'District', 'State', 'Pincode', 'Latitude', 'Longitude',
      'Map Directions', 'Rating', 'Reviews', 'Website',
      'Instagram', 'Facebook', 'TikTok', 'Twitter / X', 'WhatsApp Link'
    ];
    const lines = [headers.join(',')];
    target.forEach(r => {
      const dual = getAllDisplayPhones(r, r.country || country);
      const combinedPhone = [dual.mobile?.display, dual.landline?.display].filter(Boolean).join(' / ') || getDisplayPhone(r) || '';
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
        `"${(r.website || '').replace(/"/g, '""')}"`,
        `"${(r.instagram || '').replace(/"/g, '""')}"`,
        `"${(r.facebook || '').replace(/"/g, '""')}"`,
        `"${(r.tiktok || '').replace(/"/g, '""')}"`,
        `"${(r.twitter || '').replace(/"/g, '""')}"`,
        `"${(r.whatsappLink || '').replace(/"/g, '""')}"`
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master_leads_${target.length}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${target.length} leads to CSV!`);
  };

  return (
    <section className="v2-leads-view">
      {sessionFilter && (
        <div className="v2-session-banner">
          <Filter size={13} />
          <span>Viewing folder <b>{sessionFilter}</b></span>
          <button type="button" onClick={() => setSessionFilter('')}><X size={12} /> Show all</button>
        </div>
      )}

      <div className="lx-preset-strip" role="region" aria-label="1-Click Playbook Presets">
        <span className="lx-preset-label">WORKFLOW PRESETS</span>
        <button
          type="button"
          className={cx('lx-preset-btn', filters.phoneOnly && !filters.noWebsiteOnly && filters.sort === 'quality' && 'is-active')}
          onClick={() => setFilters(prev => ({ ...prev, phoneOnly: true, noWebsiteOnly: false, websiteOnly: false, minRating: 0, sort: 'quality' }))}
        >
          Startup Outreach
        </button>
        <button
          type="button"
          className={cx('lx-preset-btn', filters.noWebsiteOnly && Number(filters.minRating || 0) >= 4 && 'is-active')}
          onClick={() => setFilters(prev => ({ ...prev, noWebsiteOnly: true, websiteOnly: false, minRating: 4, sort: 'rating' }))}
        >
          Agency · No Website (4★+)
        </button>
        <button
          type="button"
          className={cx('lx-preset-btn', filters.sort === 'area' && 'is-active')}
          onClick={() => setFilters(prev => ({ ...prev, phoneOnly: true, noWebsiteOnly: false, sort: 'area' }))}
        >
          Field Rep · Area &amp; Pins
        </button>
        {(filters.query || filters.phoneOnly || filters.noWebsiteOnly || filters.websiteOnly || filters.minRating > 0 || filters.sort !== 'newest') && (
          <button
            type="button"
            className="lx-preset-reset"
            onClick={() => setFilters({ query: '', phoneOnly: false, primeOnly: false, websiteOnly: false, noWebsiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest', source: 'all' })}
          >
            <X size={11} /> Reset
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <FilterBar
            filters={filters}
            onChange={updateFilter}
            total={sessionFilter ? filteredVendors.length : vendors.length}
            shown={filteredVendors.length}
          />
        </div>
        <button
          type="button"
          className="lx-chip-export"
          style={{ height: 42, padding: '0 15px', borderRadius: 13 }}
          onClick={() => handleExportCsv(filteredVendors)}
          disabled={!filteredVendors.length}
          title="Export all matching leads as CSV"
        >
          <Download size={13} /> Export All ({formatNumber(filteredVendors.length)})
        </button>
      </div>

      <style>{'@keyframes lxSpin{to{transform:rotate(360deg)}} @keyframes lxHunterGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.22)}50%{box-shadow:0 0 0 4px rgba(16,185,129,0.08)}}'}</style>

      {scanning && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '10px 14px',
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
              <b style={{ color: '#065f46' }}>Don&apos;t panic — Parallel Contact Hunter is delivering your numbers live!</b>{' '}
              <span style={{ color: '#475569' }}>
                JustDial, Google Maps, OpenStreetMap &amp; our 12-lane Website Crawler are extracting direct Mobile &amp; Landline numbers in real time.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 700 }}>
            <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(16,185,129,0.16)', color: '#065f46' }}>
              ✓ {formatNumber(mobileCount)} Mobiles
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(59,130,246,0.14)', color: '#1d4ed8' }}>
              ☎ {formatNumber(landlineCount)} Landlines
            </span>
            {huntingCount > 0 && (
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(245,158,11,0.16)', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={10} /> Hunting {formatNumber(huntingCount)} Websites &amp; Cards…
              </span>
            )}
          </div>
        </div>
      )}

      <div className="v2-table-shell">
        <div className="v2-table-scroll">
          <table className="lx-clean-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleSelectAll}
                    title="Select all on this page"
                    aria-label="Select all on this page"
                  />
                </th>
                <th>Business &amp; Location</th>
                <th>Direct Mobile, Landline &amp; Web</th>
                <th style={{ width: 110 }}>Rating</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {(pageRows || []).map((vendor, index) => {
                const quality = qualityOf(vendor);
                const rowKey = vendor.id || `${vendor.name}-${vendor.phone || index}`;
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                const locality = vendor.city || vendor.village || vendor.district || '';
                const rawAddress = vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, locality, vendor.state].filter(Boolean).join(', ') || 'Address available';
                const seenParts = new Set();
                const leadAddress = String(rawAddress).split(',').map(part => part.trim()).filter(part => {
                  if (!part) return false;
                  const key = part.toLowerCase();
                  if (seenParts.has(key)) return false;
                  seenParts.add(key);
                  return true;
                }).join(', ');
                const dual = getAllDisplayPhones(vendor, vendor.country || country);
                const hasAnyPhone = Boolean(dual.mobile || dual.landline);
                const isPhonePop = Boolean(phoneJustFoundIds?.has(vendor.id || rowKey));
                const hasGeo = Number.isFinite(Number(vLat)) && Number.isFinite(Number(vLng)) && (Number(vLat) !== 0 || Number(vLng) !== 0);
                const pinUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hasGeo ? `${vLat},${vLng}` : `${vendor.name || ''} ${leadAddress}`)}`;

                return (
                  <tr
                    key={rowKey}
                    className={cx(selectedIds.has(rowKey) && 'is-selected')}
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <td style={{ width: 34 }} onClick={event => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rowKey)}
                        onChange={() => toggleSelectOne(rowKey)}
                      />
                    </td>
                    <td>
                      <div className="lx-biz-cell">
                        <VendorAvatar vendor={vendor} />
                        <div className="lx-biz-info">
                          <div className="lx-biz-name-row">
                            <b>{vendor.name || 'Business'}</b>
                            {vendor.verified && <CheckCircle2 size={13} color="#059669" />}
                          </div>
                          <div className="lx-biz-addr" title={leadAddress}>
                            <MapPin size={11} color="#06b6d4" style={{ flexShrink: 0 }} />
                            <span>{leadAddress}</span>
                            {distKm != null && distKm <= 500 && <em>{distKm} km</em>}
                          </div>
                          <span className="lx-biz-cat">
                            {vendor.category || 'Business'}
                            {vendor.subcategory ? ` · ${vendor.subcategory}` : ''}
                            {(vendor.mandal || vendor.pincode) ? ` · ${[vendor.mandal, vendor.pincode].filter(Boolean).join(' · ')}` : ''}
                            {quality != null ? ` · ${quality}% complete` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="lx-contact-stack">
                        {hasAnyPhone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dual.mobile && (
                              <div className="lx-phone-row">
                                <a
                                  href={dual.mobile.callUrl || `tel:${String(dual.mobile.display).replace(/\s+/g, '')}`}
                                  className={cx('lx-phone-pill is-mob', isPhonePop && 'lx-phone-pop')}
                                  title="Tap to call mobile"
                                  onClick={event => event.stopPropagation()}
                                >
                                  <Smartphone size={11} /> {dual.mobile.display}
                                  <span className="lx-phone-tag is-mob">MOB</span>
                                </a>
                                {dual.mobile.whatsappUrl && (
                                  <a
                                    href={dual.mobile.whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="lx-wa-mini"
                                    title="Message on WhatsApp"
                                    onClick={event => event.stopPropagation()}
                                  >
                                    <MessageCircle size={11} />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="lx-copy-chip"
                                  onClick={event => handleCopyPhone(dual.mobile.display, event)}
                                  title="Copy mobile number"
                                >
                                  <Copy size={10} /> Copy
                                </button>
                              </div>
                            )}
                            {dual.landline && (
                              <div className="lx-phone-row">
                                <a
                                  href={dual.landline.callUrl || `tel:${String(dual.landline.display).replace(/\s+/g, '')}`}
                                  className={cx('lx-phone-pill is-land', isPhonePop && 'lx-phone-pop')}
                                  title="Tap to call landline / STD"
                                  onClick={event => event.stopPropagation()}
                                >
                                  <Phone size={11} /> {dual.landline.display}
                                  <span className="lx-phone-tag is-land">STD</span>
                                </a>
                                <button
                                  type="button"
                                  className="lx-copy-chip"
                                  onClick={event => handleCopyPhone(dual.landline.display, event)}
                                  title="Copy landline / STD number"
                                >
                                  <Copy size={10} /> Copy
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (scanning || (vendor.website && !vendor.websiteEnrichedAt)) ? (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                          {vendor.website ? (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                            >
                              <Globe2 size={11} /> Website
                            </a>
                          ) : (
                            <span className="lx-noweb-pill">No Website · Warm Lead</span>
                          )}
                          <a
                            href={pinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="lx-pin-link"
                            title="Open street pin & directions"
                          >
                            <MapPin size={10} /> Street Pin
                          </a>
                          {vendor.email && (
                            <a
                              href={`mailto:${vendor.email}`}
                              className="lx-web-mini"
                            >
                              Email
                            </a>
                          )}
                          {vendor.whatsappLink && (
                            <a
                              href={vendor.whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                              style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)' }}
                              title="Open WhatsApp chat"
                            >
                              WhatsApp
                            </a>
                          )}
                          {vendor.instagram && (
                            <a
                              href={vendor.instagram}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                              style={{ borderColor: 'rgba(225, 48, 108, 0.4)', color: '#E1306C', background: 'rgba(225, 48, 108, 0.08)' }}
                              title={`Instagram ${vendor.instagramFollowers ? `(${vendor.instagramFollowers})` : ''}`}
                            >
                              IG {vendor.instagramFollowers ? `· ${vendor.instagramFollowers}` : ''}
                            </a>
                          )}
                          {vendor.facebook && (
                            <a
                              href={vendor.facebook}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                              style={{ borderColor: 'rgba(24, 119, 242, 0.4)', color: '#1877F2', background: 'rgba(24, 119, 242, 0.08)' }}
                              title={`Facebook ${vendor.facebookFollowers ? `(${vendor.facebookFollowers})` : ''}`}
                            >
                              FB {vendor.facebookFollowers ? `· ${vendor.facebookFollowers}` : ''}
                            </a>
                          )}
                          {vendor.tiktok && (
                            <a
                              href={vendor.tiktok}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                              style={{ borderColor: 'rgba(0, 242, 254, 0.4)', color: '#00F2FE', background: 'rgba(0, 242, 254, 0.08)' }}
                              title={`TikTok ${vendor.tiktokFollowers ? `(${vendor.tiktokFollowers})` : ''}`}
                            >
                              TikTok {vendor.tiktokFollowers ? `· ${vendor.tiktokFollowers}` : ''}
                            </a>
                          )}
                          {vendor.twitter && (
                            <a
                              href={vendor.twitter}
                              target="_blank"
                              rel="noreferrer"
                              className="lx-web-mini"
                              style={{ borderColor: 'rgba(148, 163, 184, 0.4)', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.08)' }}
                              title="Twitter / X profile"
                            >
                              X
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {vendor.rating != null ? (
                        <span className="lx-rating-cell">
                          <Star size={12} fill="#f59e0b" color="#d97706" />
                          <b>{Number(vendor.rating).toFixed(1)}</b>
                          <small>({formatNumber(vendor.reviewsCount || 0)})</small>
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

          {pageRows.length === 0 && (
            <EmptyState
              icon={Search}
              title="No businesses match this filter."
              body="Clear your filters or start a new search above to populate leads."
              action={() => setFilters({ query: '', phoneOnly: false, primeOnly: false, websiteOnly: false, noWebsiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest', source: 'all' })}
              actionLabel="Reset filters"
            />
          )}
        </div>

        <footer className="v2-table-foot">
          <span>
            Showing <b>{filteredVendors.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredVendors.length)}</b> of <b>{formatNumber(filteredVendors.length)}</b>
          </span>
          <div className="v2-pagination">
            <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
              <option value={500}>500 / page</option>
              <option value={10000}>All Leads</option>
            </select>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))} aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </div>

      <FloatingActionDock
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onCopyMobiles={handleCopyMobiles}
        onExportVcf={handleExportVcf}
        onExportCsv={() => handleExportCsv()}
      />
    </section>
  );
}
