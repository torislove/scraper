import React, { memo } from 'react';
import {
  CheckCircle2, MapPin, Smartphone, Copy, Phone, Globe2, Star, GripVertical, Mail, ExternalLink, Briefcase, ShoppingBag, ArrowUpRight
} from 'lucide-react';
import { cx } from '../../ui';
import { VendorAvatar } from '../cards/MetricCard';
import { qualityOf, calculateHaversineKm, countSocialProfiles } from '../../utils/leadHelpers';
import { leadSourceMeta } from '../../utils/leadSource';
import { getAllDisplayPhones, resolveLeadCountry } from '../../../utils/phoneClassify';
import { safeStr, safeLeadId } from '../../utils/safeTypes';
import { Social3DIcon, VendorSocialPills } from '../icons/Social3DIcons';

function LeadTableRow({
  vendor,
  selected,
  selectedIds,
  onToggleSelect,
  onClick,
  onCopyPhone,
  originLat,
  originLng,
  country = 'IN',
  isFresh = false,
  isPhonePop = false,
  isLiveHunting = false
}) {
  const rowKey = safeLeadId(vendor);
  const quality = qualityOf(vendor);
  const vLat = vendor.latitude ?? vendor.lat;
  const vLng = vendor.longitude ?? vendor.lng;
  const distKm = calculateHaversineKm(originLat, originLng, vLat, vLng);
  const locality = vendor.city || vendor.village || vendor.district || '';
  const rawAddress =
    vendor.address ||
    vendor.formattedAddress ||
    vendor.street ||
    [vendor.locality, locality, vendor.state].filter(Boolean).join(', ') ||
    'Address listed';

  const leadAddress = safeStr(rawAddress)
    .split(',')
    .map((p) => p.trim())
    .filter((p, idx, arr) => p && arr.indexOf(p) === idx)
    .join(', ');
  const cleanTitle = safeStr(vendor.name || vendor.title) || safeStr(vendor.category) || 'Business Establishment';
  const effectiveCc = resolveLeadCountry(vendor, country);
  const dual = getAllDisplayPhones(vendor, effectiveCc);
  const hasAnyPhone = Boolean(dual.mobile || dual.landline);
  const socialCount = vendor?._socialCount ?? countSocialProfiles(vendor);
  const srcMeta = leadSourceMeta(vendor);
  const isStore = String(vendor.intentType || vendor.businessModel || '').toLowerCase().includes('store');
  const extraPhones = Array.isArray(vendor.phones) ? vendor.phones.filter(Boolean).length : 0;

  const handleDragStart = (e) => {
    const ids = selected && selectedIds?.size > 0 ? Array.from(selectedIds) : [rowKey];
    const payload = JSON.stringify(ids);
    e.dataTransfer.setData('application/x-lead-ids', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <tr
      draggable
      onDragStart={handleDragStart}
      className={cx(selected && 'is-selected', isFresh && 'lp-row-enter')}
      onClick={onClick}
      style={{ minHeight: 102 }}
    >
      <td style={{ width: 44, padding: '12px 10px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <GripVertical size={12} color="#94a3b8" style={{ cursor: 'grab', flexShrink: 0 }} title="Drag onto a folder" />
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${cleanTitle}`} />
        </div>
      </td>

      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
        <div className="lx-biz-cell">
          <VendorAvatar vendor={vendor} />
          <div className="lx-biz-info" style={{ minWidth: 0, gap: 4 }}>
            <div className="lx-biz-name-row" style={{ gap: 6 }}>
              <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{cleanTitle}</b>
              {vendor.verified !== false && <CheckCircle2 size={13} color="#059669" style={{ flexShrink: 0 }} />}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: isStore ? '#f0f9ff' : '#fffbeb', color: isStore ? '#0369a1' : '#92400e', border: `1px solid ${isStore ? 'rgba(2,132,199,0.22)' : 'rgba(217,119,6,0.25)'}`, flexShrink: 0 }}>
                {isStore ? <ShoppingBag size={9} /> : <Briefcase size={9} />}
                {vendor.businessModel || (isStore ? 'Store' : 'Service')}
              </span>
              <span style={{ fontSize: 10, fontWeight: 750, padding: '1px 6px', borderRadius: 6, background: '#f1f5f9', color: '#475569', flexShrink: 0 }}>
                {srcMeta.short}
              </span>
            </div>

            <div className="lx-biz-addr" title={leadAddress} style={{ maxWidth: 460 }}>
              <MapPin size={11} color="#d97706" style={{ flexShrink: 0 }} />
              <span>{leadAddress}</span>
              {vendor.zone && <em>{vendor.zone}</em>}
              {vendor.district && <em>{vendor.district}</em>}
              {distKm != null && distKm <= 500 && <em>{distKm} km</em>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, fontWeight: 650, color: '#64748b' }}>
              <span>{safeStr(vendor.category) || 'Business'}{vendor.subcategory ? ` · ${safeStr(vendor.subcategory)}` : ''}</span>
              {vendor.pincode && <span style={{ color: '#475569', fontFamily: 'var(--lp-font-mono)' }}>· {vendor.pincode}</span>}
              {quality != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: quality >= 70 ? '#047857' : '#b45309', fontWeight: 750 }}>
                  · {quality}% data
                </span>
              )}
            </div>

            {vendor.decisionMaker?.name && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', border: '1px solid rgba(5,150,105,0.25)', color: '#047857', fontSize: 10.5, fontWeight: 750, width: 'fit-content' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                <span>{vendor.decisionMaker.title || 'Owner'}: <b>{vendor.decisionMaker.name}</b></span>
              </div>
            )}
          </div>
        </div>
      </td>

      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
        <div className="lx-contact-stack" style={{ gap: 6 }}>
          {hasAnyPhone ? (
            <div className={isPhonePop ? 'lp-resolve-pop' : ''} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
              {dual.mobile && (
                <div className="lx-phone-row">
                  <a
                    href={dual.mobile.callUrl || `tel:${safeStr(dual.mobile.display).replace(/\s+/g, '')}`}
                    className="lx-phone-pill is-mob lp-tabular"
                    title="Call mobile"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Smartphone size={11} /> {dual.mobile.display}
                    <span className="lx-phone-tag is-mob">MOB</span>
                  </a>
                  {dual.mobile.whatsappUrl && (
                    <a
                      href={dual.mobile.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Chat on WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Social3DIcon platform="whatsapp" size={22} />
                    </a>
                  )}
                  <button type="button" className="lx-copy-chip" onClick={(e) => onCopyPhone(dual.mobile.display, e)} title="Copy mobile">
                    <Copy size={10} /> Copy
                  </button>
                </div>
              )}
              {dual.landline && (
                <div className="lx-phone-row">
                  <a
                    href={dual.landline.callUrl || `tel:${safeStr(dual.landline.display).replace(/\s+/g, '')}`}
                    className="lx-phone-pill is-land lp-tabular"
                    title="Call landline / STD"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={11} /> {dual.landline.display}
                    <span className="lx-phone-tag is-land">STD</span>
                  </a>
                  <button type="button" className="lx-copy-chip" onClick={(e) => onCopyPhone(dual.landline.display, e)} title="Copy landline">
                    <Copy size={10} />
                  </button>
                </div>
              )}
              {extraPhones > 2 && (
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.28)' }}>
                  +{extraPhones - 1} more
                </span>
              )}
            </div>
          ) : isLiveHunting ? (
            <span className="lp-shimmer" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', width: 'fit-content' }}>
              Enriching contact…
            </span>
          ) : (
            <span className="lx-no-phone">Phone not listed</span>
          )}

          <div className="lx-meta-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
            {vendor.website && (
              <a
                href={safeStr(vendor.website).startsWith('http') ? safeStr(vendor.website) : `https://${safeStr(vendor.website)}`}
                target="_blank" rel="noreferrer" className="lx-web-pill" onClick={(e) => e.stopPropagation()}
              >
                <Globe2 size={10} />
                {safeStr(vendor.website).replace(/^https?:\/\/(www\.)?/i, '').split('/')[0]}
              </a>
            )}
            {vendor.email && (
              <a
                href={`mailto:${safeStr(vendor.email)}`}
                className="lx-web-pill" style={{ color: '#0369a1' }} onClick={(e) => e.stopPropagation()} title={safeStr(vendor.email)}
              >
                <Mail size={10} />
                {safeStr(vendor.email).length > 24 ? `${safeStr(vendor.email).slice(0, 22)}…` : safeStr(vendor.email)}
              </a>
            )}
            {(vendor.mapsLink || vendor.googleMapsUrl) && (
              <a
                href={vendor.mapsLink || vendor.googleMapsUrl}
                target="_blank" rel="noreferrer" className="lx-web-pill" style={{ color: '#be123c' }} onClick={(e) => e.stopPropagation()} title="Open Google Maps"
              >
                <ExternalLink size={10} /> Maps
              </a>
            )}
            {socialCount > 0 ? (
              <VendorSocialPills vendor={vendor} max={5} />
            ) : isLiveHunting && vendor.website ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.22)' }}>
                Checking socials…
              </span>
            ) : null}
          </div>
        </div>
      </td>

      <td style={{ width: 112, textAlign: 'right', padding: '10px 12px', verticalAlign: 'middle' }}>
        <div className="lp-tabular" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {Number(vendor.rating || vendor.totalScore || 0) > 0 ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 800, color: '#92400e' }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                {Number(vendor.rating || vendor.totalScore).toFixed(1)}
              </span>
              {Number(vendor.reviewsCount || vendor.reviews || 0) > 0 && (
                <span style={{ fontSize: 10.5, color: '#64748b' }}>
                  ({Number(vendor.reviewsCount || vendor.reviews).toLocaleString()})
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>No rating</span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '3px 9px', borderRadius: 99,
              border: '1px solid rgba(217,119,6,0.32)',
              background: '#fffbeb', color: '#92400e',
              fontSize: 10.5, fontWeight: 800, cursor: 'pointer'
            }}
          >
            Inspect <ArrowUpRight size={10} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(LeadTableRow);
