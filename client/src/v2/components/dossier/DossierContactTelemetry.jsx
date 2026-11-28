import React, { useState } from 'react';
import { Smartphone, Phone, Mail, Copy, Check, Globe2, ExternalLink } from 'lucide-react';
import { getAllDisplayPhones, resolveLeadCountry } from '../../../utils/phoneClassify';
import { Social3DIcon } from '../icons/Social3DIcons';

const CARD_STYLE = {
  padding: 14, borderRadius: 16, background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.09)',
  boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px -4px rgba(15,23,42,0.06)'
};

const LABEL_STYLE = {
  fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 5
};

export default function DossierContactTelemetry({ vendor, country = 'IN' }) {
  const [copiedKey, setCopiedKey] = useState('');
  if (!vendor) return null;

  const effectiveCc = resolveLeadCountry(vendor, country);
  const dual = getAllDisplayPhones(vendor, effectiveCc);
  const copyText = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  const allPhones = Array.from(new Set([
    dual.mobile?.display, dual.landline?.display, vendor.phone, vendor.mobilePhone,
    vendor.landlinePhone, ...(Array.isArray(vendor.phones) ? vendor.phones : [])
  ].filter(Boolean).map((x) => String(x).trim())));

  const emails = Array.from(new Set([
    vendor.email, ...(Array.isArray(vendor.emails) ? vendor.emails : [])
  ].filter(Boolean)));

  const websiteUrl = vendor.website ? (vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`) : '';
  const socials = [
    vendor.instagram && { platform: 'instagram', label: 'Instagram', url: vendor.instagram, stat: vendor.instagramFollowers },
    vendor.facebook && { platform: 'facebook', label: 'Facebook', url: vendor.facebook, stat: vendor.facebookFollowers },
    vendor.linkedin && { platform: 'linkedin', label: 'LinkedIn', url: vendor.linkedin, stat: vendor.linkedinFollowers },
    vendor.youtube && { platform: 'youtube', label: 'YouTube', url: vendor.youtube, stat: vendor.youtubeSubscribers },
    vendor.tiktok && { platform: 'tiktok', label: 'TikTok', url: vendor.tiktok, stat: vendor.tiktokFollowers },
    vendor.twitter && { platform: 'twitter', label: 'X / Twitter', url: vendor.twitter, stat: null }
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Telephony 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <div style={CARD_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={LABEL_STYLE}><Smartphone size={13} color="#059669" /> Primary Mobile</span>
            {dual.mobile && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: '#ecfdf5', color: '#047857' }}>MOB</span>}
          </div>
          {dual.mobile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <a href={dual.mobile.callUrl} className="lp-tabular" style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>{dual.mobile.display}</a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {dual.mobile.whatsappUrl && (
                  <a href={dual.mobile.whatsappUrl} target="_blank" rel="noreferrer" title="WhatsApp Chat"><Social3DIcon platform="whatsapp" size={20} /></a>
                )}
                <button type="button" onClick={() => copyText(dual.mobile.display, 'mob')} style={{ border: 'none', background: '#f1f5f9', borderRadius: 7, padding: 5, cursor: 'pointer' }}>
                  {copiedKey === 'mob' ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748b" />}
                </button>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No mobile indexed</span>
          )}
        </div>

        <div style={CARD_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={LABEL_STYLE}><Phone size={13} color="#0284c7" /> Landline / STD</span>
            {dual.landline && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6, background: '#f0f9ff', color: '#0369a1' }}>STD</span>}
          </div>
          {dual.landline ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <a href={dual.landline.callUrl} className="lp-tabular" style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>{dual.landline.display}</a>
              <button type="button" onClick={() => copyText(dual.landline.display, 'land')} style={{ border: 'none', background: '#f1f5f9', borderRadius: 7, padding: 5, cursor: 'pointer' }}>
                {copiedKey === 'land' ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748b" />}
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No landline listed</span>
          )}
        </div>
      </div>

      {allPhones.length > 1 && (
        <div style={{ ...CARD_STYLE, padding: '10px 14px' }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>All Extracted Phones ({allPhones.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allPhones.map((ph, idx) => (
              <button key={ph} type="button" onClick={() => copyText(ph, `allp-${idx}`)} style={{ padding: '4px 9px', borderRadius: 8, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.1)', fontSize: 11.5, fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{ph}</span>
                {copiedKey === `allp-${idx}` ? <Check size={11} color="#059669" /> : <Copy size={11} color="#94a3b8" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Website & Emails */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <div style={CARD_STYLE}>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}><Globe2 size={13} color="#0284c7" /> Official Website</div>
          {websiteUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <a href={websiteUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {websiteUrl.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0]}
              </a>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <a href={websiteUrl} target="_blank" rel="noreferrer" style={{ padding: 5, borderRadius: 7, background: '#f0f9ff', color: '#0369a1' }}><ExternalLink size={12} /></a>
                <button type="button" onClick={() => copyText(websiteUrl, 'web')} style={{ border: 'none', background: '#f1f5f9', borderRadius: 7, padding: 5, cursor: 'pointer' }}>
                  {copiedKey === 'web' ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748b" />}
                </button>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No website listed</span>
          )}
        </div>

        <div style={CARD_STYLE}>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}><Mail size={13} color="#d97706" /> Business Email{emails.length > 1 ? `s (${emails.length})` : ''}</div>
          {emails.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {emails.map((em, i) => (
                <div key={em} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <a href={`mailto:${em}`} style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{em}</a>
                  <button type="button" onClick={() => copyText(em, `em-${i}`)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 7, padding: 4, cursor: 'pointer', flexShrink: 0 }}>
                    {copiedKey === `em-${i}` ? <Check size={11} color="#059669" /> : <Copy size={11} color="#64748b" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No email indexed</span>
          )}
        </div>
      </div>

      {/* 3D Social Profiles Grid */}
      {socials.length > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Social &amp; Media Profiles ({socials.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {socials.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 12, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', textDecoration: 'none', color: '#0f172a' }}
              >
                <Social3DIcon platform={s.platform} size={24} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{s.label}</div>
                  {s.stat && <div style={{ fontSize: 10.5, color: '#64748b' }}>{s.stat} followers</div>}
                </div>
                <ExternalLink size={12} color="#94a3b8" style={{ marginLeft: 'auto', flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
