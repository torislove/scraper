import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Copy, Filter, Globe2,
  MapPin, Phone, Search, X
} from 'lucide-react';
import { formatNumber, cx } from '../../ui';
import FilterBar from '../cards/FilterBar';
import { VendorAvatar, EmptyState } from '../cards/MetricCard';
import { qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { isMobilePhone, getDisplayPhone } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import FloatingActionDock from '../cards/FloatingActionDock';
import { soundFx } from '../../utils/soundEffects';

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
    soundFx.playSuccess();
    navigator.clipboard?.writeText(unique.join('\n'));
    toast.success(`Copied ${unique.length} phone numbers to clipboard!`);
  };

  const handleExportVcf = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    if (!target.length) {
      toast.error('No leads selected for VCF export.');
      return;
    }
    soundFx.playSuccess();
    exportLeadsToVcf(target, `selected_leads_${target.length}`);
    toast.success(`Exported ${target.length} leads to vCard (.vcf)!`);
  };

  const handleExportCsv = () => {
    const target = pageRows.filter((v, idx) => selectedIds.has(v.id || `${v.name}-${v.phone || idx}`));
    if (!target.length) {
      toast.error('No leads selected for CSV export.');
      return;
    }
    soundFx.playSuccess();
    const headers = ['Business Name', 'Category', 'Phone', 'Locality', 'City', 'District', 'State', 'Rating', 'Reviews', 'Website'];
    const lines = [headers.join(',')];
    target.forEach(r => {
      lines.push([
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${getDisplayPhone(r) || ''}"`,
        `"${(r.locality || r.area || '').replace(/"/g, '""')}"`,
        `"${(r.city || r.village || '').replace(/"/g, '""')}"`,
        `"${(r.district || '').replace(/"/g, '""')}"`,
        `"${(r.state || '').replace(/"/g, '""')}"`,
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

  const flagOf = code => {
    const iso = String(code || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) return '';
    return String.fromCodePoint(...[...iso].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65));
  };

  return (
    <section className="v2-leads-view">
      {sessionFilter && (
        <div className="v2-session-banner">
          <Filter size={13} />
          <span>Showing run <b>{sessionFilter}</b></span>
          <button type="button" onClick={() => setSessionFilter('')}><X size={12} /> Clear</button>
        </div>
      )}

      <FilterBar
        filters={filters}
        onChange={updateFilter}
        total={sessionFilter ? filteredVendors.length : vendors.length}
        shown={filteredVendors.length}
      />

      <div className="v2-table-shell">
        <div className="v2-table-scroll">
          <table className="v2-lead-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleSelectAll}
                    title="Select all on this page"
                  />
                </th>
                <th>BUSINESS</th>
                <th>LOCATION</th>
                <th>DIRECT CONTACT</th>
                <th>RATING</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(pageRows || []).map((vendor, index) => {
                const quality = qualityOf(vendor);
                const rowKey = vendor.id || `${vendor.name}-${vendor.phone || index}`;
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                const leadCountry = (() => {
                  if (vendor.country) return String(vendor.country).toUpperCase();
                  const phone = String(vendor.phone || (Array.isArray(vendor.phones) && vendor.phones[0]) || '');
                  const cc = (phone.match(/^\+(\d{1,3})/) || [])[1];
                  if (cc === '91') return 'IN';
                  if (cc === '1') return 'US';
                  if (cc === '44') return 'GB';
                  return String(country || 'IN').toUpperCase();
                })();
                const leadIsIndia = leadCountry === 'IN';
                const rawAddress = vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, vendor.city || vendor.village || vendor.mandal, vendor.district, vendor.state].filter(Boolean).join(', ') || (vendor.city || vendor.village || 'Locality');
                const seenParts = new Set();
                const leadAddress = String(rawAddress).split(',').map(part => part.trim()).filter(part => {
                  if (!part) return false;
                  const key = part.toLowerCase();
                  if (seenParts.has(key)) return false;
                  seenParts.add(key);
                  return true;
                }).join(', ');
                const activePhone = getDisplayPhone(vendor);
                const isMob = activePhone ? isMobilePhone(activePhone, vendor.country || country) : false;

                return (
                  <tr
                    key={rowKey}
                    className={cx('v2-lead-animated-row', selectedIds.has(rowKey) && 'is-selected')}
                    style={{ animationDelay: `${Math.min(index * 20, 350)}ms` }}
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
                      <div className="v2-vendor-cell">
                        <VendorAvatar vendor={vendor} />
                        <span>
                          <b>{vendor.name || 'Unknown vendor'}</b>
                          <small>{vendor.category || 'Vendor'}{vendor.subcategory ? ` · ${vendor.subcategory}` : ''}{quality != null ? ` · ${quality}% profile` : ''}</small>
                        </span>
                        {vendor.verified && <CheckCircle2 size={13} className="v2-verified-icon" />}
                      </div>
                    </td>
                    <td>
                      <div className="v2-location-cell">
                        <div className="v2-lead-address-line" title={leadAddress}>
                          <MapPin size={11} className="v2-text-lime" style={{ flexShrink: 0 }} />
                          <span className="v2-lead-address">{leadAddress}</span>
                        </div>
                        <div className="v2-geo-hierarchy-chips">
                          {(vendor.zoneName || vendor.locality) && (
                            <span className="v2-geo-chip v2-geo-chip-zone" title="Commercial zone or neighbourhood">
                              {vendor.zoneName || vendor.locality}
                            </span>
                          )}
                          {leadIsIndia && vendor.mandal && (
                            <span className="v2-geo-chip v2-geo-chip-mandal" title="Revenue Mandal / Taluk">
                              {vendor.mandal.toLowerCase().includes('mandal') ? vendor.mandal : `${vendor.mandal} Mandal`}
                            </span>
                          )}
                          {!leadIsIndia && !vendor.zoneName && vendor.mandal && (
                            <span className="v2-geo-chip v2-geo-chip-zone" title="City">
                              {vendor.mandal}
                            </span>
                          )}
                          {vendor.district && (
                            <span className="v2-geo-chip v2-geo-chip-dist" title="Administrative district">
                              {leadIsIndia && !vendor.district.toLowerCase().includes('dist') ? `${vendor.district} Dist` : vendor.district}
                            </span>
                          )}
                          {vendor.state && vendor.state !== 'India' && (
                            <span className="v2-geo-chip v2-geo-chip-state" title="State / region">
                              {flagOf(leadCountry)} {vendor.state}
                            </span>
                          )}
                          {distKm != null && distKm <= 500 && (
                            <span className="v2-distance-badge" title="Distance from search origin">
                              {distKm} km
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="v2-contact-cell">
                        {activePhone ? (
                          <div className="v2-phone-cluster">
                            <a
                              href={vendor.callUrl || `tel:${String(activePhone).replace(/\s+/g, '')}`}
                              className={`v2-phone-badge ${isMob ? 'is-mobile' : 'is-landline'}`}
                              title={isMob ? 'Verified Mobile' : 'Landline Contact'}
                              onClick={event => event.stopPropagation()}
                            >
                              <Phone size={11} /> {activePhone}
                              <span className="v2-phone-type-tag">{isMob ? 'Mobile' : 'Landline'}</span>
                            </a>
                            <button
                              type="button"
                              onClick={event => handleCopyPhone(activePhone, event)}
                              style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              title="Copy phone number"
                            >
                              <Copy size={10} /> Copy
                            </button>
                          </div>
                        ) : (
                          <span className="v2-muted">No phone yet</span>
                        )}
                        <span className="v2-contact-sub">
                          {vendor.website
                            ? <a href={vendor.website} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}><Globe2 size={11} /> website</a>
                            : <em>no website</em>}
                          {vendor.email && <a href={`mailto:${vendor.email}`} onClick={event => event.stopPropagation()}>email</a>}
                        </span>
                      </div>
                    </td>
                    <td>
                      {vendor.rating != null ? <span className="v2-table-rating">★ {Number(vendor.rating).toFixed(1)} <small>({formatNumber(vendor.reviewsCount || 0)})</small></span> : <span className="v2-muted">—</span>}
                    </td>
                    <td>
                      <div className="v2-row-actions" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => setSelectedVendor(vendor)} title="Open full profile"><ArrowRight size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={Search}
              title="No vendors match this filter."
              body="Clear the filters or start a search to populate the command center."
              action={() => setFilters({ query: '', phoneOnly: false, websiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest' })}
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
              <option value={100}>100 / page</option>
              <option value={250}>250 / page</option>
              <option value={500}>500 / page</option>
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
        onExportCsv={handleExportCsv}
      />
    </section>
  );
}
