import React, { useState } from 'react';
import { Phone, Globe2, Navigation, FolderPlus, Sparkles, Contact, Copy, Check } from 'lucide-react';
import { getAllDisplayPhones } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { Social3DIcon } from '../icons/Social3DIcons';

const BTN_BASE = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
  borderRadius: 11, fontSize: 11.5, fontWeight: 800, textDecoration: 'none',
  cursor: 'pointer', flexShrink: 0, transition: 'transform 120ms ease',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 4px rgba(15,23,42,0.08)'
};

export default function DossierActionStrip({ vendor, country = 'IN', onSaveToFolder, onDeepEnrich, enriching = false }) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  if (!vendor) return null;

  const dual = getAllDisplayPhones(vendor, vendor.country || country);
  const primaryCall = dual.mobile?.callUrl || dual.landline?.callUrl;
  const waUrl = dual.mobile?.whatsappUrl || vendor.whatsappLink;
  const mapsQuery = encodeURIComponent([vendor.name, vendor.address || vendor.city].filter(Boolean).join(', '));
  const mapsUrl = vendor.googleMapsUrl || vendor.mapsLink || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const websiteUrl = vendor.website ? (vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`) : null;

  const copySummary = () => {
    const lines = [
      vendor.name || vendor.title,
      vendor.category ? `Category: ${vendor.category}` : '',
      dual.mobile?.display ? `Mobile: ${dual.mobile.display}` : '',
      dual.landline?.display ? `Landline: ${dual.landline.display}` : '',
      vendor.email ? `Email: ${vendor.email}` : '',
      websiteUrl ? `Website: ${websiteUrl}` : '',
      vendor.address ? `Address: ${vendor.address}` : '',
      `Maps: ${mapsUrl}`
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(lines);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 1800);
  };

  return (
    <div style={{ padding: '10px 14px', background: '#ffffff', borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', flexShrink: 0 }}>
      {primaryCall && (
        <a href={primaryCall} style={{ ...BTN_BASE, background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#ffffff', border: 'none' }}>
          <Phone size={13} /> Call
        </a>
      )}

      {waUrl && (
        <a href={waUrl} target="_blank" rel="noreferrer" style={{ ...BTN_BASE, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none' }}>
          <Social3DIcon platform="whatsapp" size={16} /> WhatsApp
        </a>
      )}

      {websiteUrl && (
        <a href={websiteUrl} target="_blank" rel="noreferrer" style={{ ...BTN_BASE, background: '#f0f9ff', color: '#0369a1', border: '1px solid rgba(2,132,199,0.28)' }}>
          <Globe2 size={13} /> Website
        </a>
      )}

      <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ ...BTN_BASE, background: '#fff1f2', color: '#be123c', border: '1px solid rgba(225,29,72,0.24)' }}>
        <Navigation size={13} /> Maps
      </a>

      {typeof onDeepEnrich === 'function' && (
        <button type="button" onClick={() => onDeepEnrich(vendor)} disabled={enriching} style={{ ...BTN_BASE, background: 'linear-gradient(180deg, #e0f2fe, #bae6fd)', color: '#0c4a6e', border: '1px solid rgba(2,132,199,0.34)', opacity: enriching ? 0.65 : 1 }}>
          <Sparkles size={13} /> {enriching ? 'Enriching…' : 'Deep Enrich'}
        </button>
      )}

      <button type="button" onClick={() => exportLeadsToVcf([vendor], vendor.name || 'contact')} style={{ ...BTN_BASE, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15,23,42,0.12)' }} title="Download contact vCard (.vcf)">
        <Contact size={13} /> vCard
      </button>

      <button type="button" onClick={copySummary} style={{ ...BTN_BASE, background: '#f8fafc', color: '#334155', border: '1px solid rgba(15,23,42,0.12)' }}>
        {copiedSummary ? <Check size={13} color="#059669" /> : <Copy size={13} />} {copiedSummary ? 'Copied' : 'Copy All'}
      </button>

      {typeof onSaveToFolder === 'function' && (
        <button type="button" onClick={() => onSaveToFolder([vendor.id || `${vendor.name}-${vendor.phone}`])} style={{ ...BTN_BASE, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)', marginLeft: 'auto' }}>
          <FolderPlus size={13} /> Save
        </button>
      )}
    </div>
  );
}
