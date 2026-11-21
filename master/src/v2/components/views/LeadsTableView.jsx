import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Filter,
  Globe2, MapPin, Phone, Search, Star, X
} from 'lucide-react';
import { formatNumber, cx } from '../../ui';
import FilterBar from '../cards/FilterBar';
import { VendorAvatar, EmptyState } from '../cards/MetricCard';
import { qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { isMobilePhone, getDisplayPhone } from '../../../utils/phoneClassify';
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
  country = 'IN'
}) {
  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);
  const [selectedIds, setSelectedIds] = useState(new Set());

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
    const rawPhones = target.map(l => getDisplayPhone(l)).filter(Boolean);
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
      'Business Name', 'Category', 'Phone', 'Address', 'Area / Mandal',
      'City', 'District', 'State', 'Pincode', 'Latitude', 'Longitude',
      'Map Directions', 'Rating', 'Reviews', 'Website'
    ];
    const lines = [headers.join(',')];
    target.forEach(r => {
      const rLat = r.latitude ?? r.lat ?? '';
      const rLng = r.longitude ?? r.lng ?? '';
      const hasGeo = Number.isFinite(Number(rLat)) && Number.isFinite(Number(rLng)) && (Number(rLat) !== 0 || Number(rLng) !== 0);
      const mapUrl = hasGeo
        ? `https://www.google.com/maps/search/?api=1&query=${rLat},${rLng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name || ''} ${r.address || r.city || ''}`)}`;
      lines.push([
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${getDisplayPhone(r) || ''}"`,
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
                <th>Direct Contact &amp; Web</th>
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
                const displayPhone = getDisplayPhone(vendor);
                const isMob = displayPhone ? isMobilePhone(displayPhone, vendor.country || country) : false;
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
                        {displayPhone ? (
                          <div className="lx-phone-row">
                            <a
                              href={vendor.callUrl || `tel:${String(displayPhone).replace(/\s+/g, '')}`}
                              className={cx('lx-phone-pill', isMob ? 'is-mob' : 'is-land')}
                              title="Tap to call"
                              onClick={event => event.stopPropagation()}
                            >
                              <Phone size={11} /> {displayPhone}
                            </a>
                            <button
                              type="button"
                              className="lx-copy-chip"
                              onClick={event => handleCopyPhone(displayPhone, event)}
                              title="Copy phone number"
                            >
                              <Copy size={10} /> Copy
                            </button>
                          </div>
                        ) : (
                          <span className="lx-muted-text">No phone listed</span>
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
