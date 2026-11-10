import React from 'react';
import {
  ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Filter, Globe2,
  MapPin, Phone, Search, X
} from 'lucide-react';
import { formatNumber, cx } from '../../ui';
import FilterBar from '../cards/FilterBar';
import { VendorAvatar, EmptyState } from '../cards/MetricCard';
import { CRM_STAGES, crmStageOf } from '../../CrmBoard';
import { qualityOf, calculateHaversineKm } from '../../utils/leadHelpers';
import { isMobilePhone, whatsappNumber } from '../../../utils/phoneClassify';

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
  updateCrmStage,
  crmSavingId,
  currentPage = 1,
  pageSize = 100,
  pageCount = 1,
  setPage,
  setPageSize
}) {
  const originLat = Array.isArray(mapCenter) ? mapCenter[0] : (mapCenter?.lat || null);
  const originLng = Array.isArray(mapCenter) ? mapCenter[1] : (mapCenter?.lng || null);

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
                <th>BUSINESS</th>
                <th>LOCATION</th>
                <th>CONTACT</th>
                <th>RATING</th>
                <th>CRM STAGE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(pageRows || []).map((vendor, index) => {
                const quality = qualityOf(vendor);
                const stage = crmStageOf(vendor);
                const vLat = vendor.latitude ?? vendor.lat;
                const vLng = vendor.longitude ?? vendor.lng;
                const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
                const leadAddress = vendor.address || vendor.formattedAddress || vendor.street || [vendor.locality, vendor.city || vendor.village || vendor.mandal, vendor.district, vendor.state].filter(Boolean).join(', ') || (vendor.city || vendor.village || 'Locality');
                return (
                  <tr
                    key={vendor.id}
                    className="v2-lead-animated-row"
                    style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
                    onClick={() => setSelectedVendor(vendor)}
                  >
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
                            <span className="v2-geo-chip v2-geo-chip-zone" title="Commercial Zone / Neighborhood">
                              📍 {vendor.zoneName || vendor.locality}
                            </span>
                          )}
                          {vendor.mandal && (
                            <span className="v2-geo-chip v2-geo-chip-mandal" title="Revenue Mandal / Taluk">
                              🏛️ {vendor.mandal.toLowerCase().includes('mandal') ? vendor.mandal : `${vendor.mandal} Mandal`}
                            </span>
                          )}
                          {vendor.district && (
                            <span className="v2-geo-chip v2-geo-chip-dist" title="Administrative District">
                              🗺️ {vendor.district.toLowerCase().includes('dist') ? vendor.district : `${vendor.district} Dist`}
                            </span>
                          )}
                          {vendor.state && vendor.state !== 'India' && (
                            <span className="v2-geo-chip v2-geo-chip-state" title="State">
                              🇮🇳 {vendor.state}
                            </span>
                          )}
                          {distKm != null && (
                            <span className="v2-distance-badge" title="Distance from search origin">
                              📏 {distKm} km
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="v2-contact-cell">
                        {vendor.phone && !String(vendor.phone).includes('Requires') ? (
                          <div className="v2-phone-cluster">
                            <a
                              href={vendor.callUrl || `tel:${String(vendor.phone).replace(/\s+/g, '')}`}
                              className={`v2-phone-badge ${isMobilePhone(vendor.phone) ? 'is-mobile' : 'is-landline'}`}
                              title={isMobilePhone(vendor.phone) ? 'Verified Mobile' : 'STD Landline Contact'}
                              onClick={event => event.stopPropagation()}
                            >
                              <Phone size={11} /> {vendor.phone}
                              <span className="v2-phone-type-tag">{isMobilePhone(vendor.phone) ? 'Mobile' : 'Landline'}</span>
                            </a>
                            {isMobilePhone(vendor.phone) && (
                              <a
                                href={`https://wa.me/91${whatsappNumber(vendor.phone)}?text=Hi%20${encodeURIComponent(vendor.name || '')}%2C%20I%20found%20your%20business%20listing%20and%20wanted%20to%20connect.`}
                                target="_blank"
                                rel="noreferrer"
                                className="v2-wa-quick-btn"
                                title="Chat on WhatsApp"
                                onClick={event => event.stopPropagation()}
                              >
                                💬 WhatsApp
                              </a>
                            )}
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
                      {vendor.rating != null ? <span className="v2-table-rating">{Number(vendor.rating).toFixed(1)} <small>({formatNumber(vendor.reviewsCount || 0)})</small></span> : <span className="v2-muted">—</span>}
                    </td>
                    <td>
                      <select
                        className={cx('v2-stage-select', `stage-${stage}`)}
                        value={stage}
                        onClick={event => event.stopPropagation()}
                        onChange={event => updateCrmStage(vendor, event.target.value)}
                        disabled={crmSavingId === vendor.id}
                      >
                        {CRM_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
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
              body="Clear the filters or start a search to populate the command center. Nothing is seeded or faked."
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
              <option value={1000}>1,000 / page</option>
              <option value={100000}>All Leads</option>
            </select>
            <button type="button" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1}><ChevronLeft size={13} /></button>
            <span>{currentPage} / {pageCount}</span>
            <button type="button" onClick={() => setPage(prev => Math.min(pageCount, prev + 1))} disabled={currentPage >= pageCount}><ChevronRight size={13} /></button>
          </div>
        </footer>
      </div>
    </section>
  );
}
