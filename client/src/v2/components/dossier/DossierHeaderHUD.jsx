import React from 'react';
import { X, ShieldCheck, Star, MapPin, Briefcase, ShoppingBag } from 'lucide-react';
import { FlagSphere } from '@shared/ui/FlagChip';
import { qualityOf } from '../../utils/leadHelpers';
import { leadSourceMeta } from '../../utils/leadSource';

export default function DossierHeaderHUD({ vendor, country = 'IN', onClose }) {
  if (!vendor) return null;
  const cleanTitle = vendor.name?.trim() || vendor.title?.trim() || vendor.category || 'Business Establishment';
  const initials = cleanTitle.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'B';
  const rating = Number(vendor.rating || vendor.totalScore || 0);
  const reviews = Number(vendor.reviewsCount || vendor.reviews || 0);
  const locality = vendor.zone || vendor.locality || vendor.city || '';
  const cc = (vendor.country || country || 'IN').toUpperCase();
  const quality = qualityOf(vendor) ?? 50;
  const srcMeta = leadSourceMeta(vendor);
  const isStore = String(vendor.intentType || vendor.businessModel || '').toLowerCase().includes('store');

  return (
    <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(155deg, #ffffff 0%, #fffbeb 100%)', borderBottom: '1px solid rgba(217, 119, 6, 0.22)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* 3D Monogram Badge */}
        <div
          style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 65%, #92400e 100%)',
            boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.6), 0 6px 14px -4px rgba(180,83,9,0.45)',
            color: '#ffffff', fontSize: 16, fontWeight: 900,
            display: 'grid', placeItems: 'center', letterSpacing: '-0.02em'
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 800, background: isStore ? '#f0f9ff' : '#fffbeb', color: isStore ? '#0369a1' : '#92400e', border: `1px solid ${isStore ? 'rgba(2,132,199,0.28)' : 'rgba(217,119,6,0.32)'}` }}>
              {isStore ? <ShoppingBag size={10} /> : <Briefcase size={10} />}
              {vendor.businessModel || (isStore ? 'Store / Retail' : 'Service')}
            </span>

            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 750, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15,23,42,0.1)' }}>
              {vendor.category || vendor.primary_type || 'Business'}
            </span>

            {vendor.verified !== false && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid rgba(5,150,105,0.24)' }}>
                <ShieldCheck size={11} /> Verified
              </span>
            )}

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid rgba(15,23,42,0.1)' }}>
              <FlagSphere code={cc} size={12} /> {srcMeta.short}
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: 17.5, fontWeight: 850, color: '#0f172a', lineHeight: 1.25, wordBreak: 'break-word' }}>
            {cleanTitle}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {locality && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 650, color: '#475569' }}>
                <MapPin size={12} color="#d97706" /> {locality}
              </span>
            )}
            {rating > 0 && (
              <span className="lp-tabular" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '1px 7px', borderRadius: 99 }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                {rating.toFixed(1)}
                {reviews > 0 && <span style={{ fontWeight: 600, color: '#78350f' }}>({reviews.toLocaleString()})</span>}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 750, color: '#047857', marginLeft: 'auto' }}>
              <span>{quality}% Complete</span>
              <span style={{ width: 44, height: 6, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden', display: 'inline-block' }}>
                <span style={{ display: 'block', width: `${quality}%`, height: '100%', background: quality >= 75 ? '#10b981' : '#f59e0b' }} />
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close Lead Dossier (ESC)"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 10,
            border: '1px solid rgba(15,23,42,0.12)', background: '#ffffff',
            color: '#334155', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', flexShrink: 0
          }}
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
