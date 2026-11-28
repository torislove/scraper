import React, { useState } from 'react';
import { MapPin, Navigation, Tag, MessageSquare, Send, Layers, Copy, Check } from 'lucide-react';
import { updateVendorCrm } from '../../api';
import { leadSourceMeta } from '../../utils/leadSource';

const CARD_STYLE = {
  padding: 14, borderRadius: 16, background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.09)',
  boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px -4px rgba(15,23,42,0.06)'
};

const LABEL_STYLE = {
  fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 5
};

export default function DossierGeoIntelligence({ vendor, country = 'IN' }) {
  const [crmNote, setCrmNote] = useState('');
  const [notes, setNotes] = useState(Array.isArray(vendor?.crmNotes) ? vendor.crmNotes : []);
  const [stage, setStage] = useState(vendor?.crmStage || 'new');
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  if (!vendor) return null;

  const lat = vendor.lat ?? vendor.latitude;
  const lng = vendor.lng ?? vendor.longitude;
  const hasCoords = lat != null && lng != null && (Number(lat) !== 0 || Number(lng) !== 0);
  const coordStr = hasCoords ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : '';
  const srcList = Array.isArray(vendor.sources) && vendor.sources.length ? vendor.sources : [leadSourceMeta(vendor).label];

  const copyVal = (txt, k) => {
    if (!txt) return;
    navigator.clipboard?.writeText(txt);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!crmNote.trim() || saving) return;
    const newNote = { text: crmNote.trim(), timestamp: new Date().toISOString() };
    const nextNotes = [...notes, newNote];
    setNotes(nextNotes);
    setCrmNote('');
    setSaving(true);
    try { if (vendor.id) await updateVendorCrm(vendor.id, { crmNotes: nextNotes, crmStage: stage }); } catch (_) {} finally { setSaving(false); }
  };

  const rows = [
    ['Query', vendor.query],
    ['Subcategory', vendor.matchedSubcategory || vendor.subcategory],
    ['Zone / Ward', vendor.zone || vendor.zoneName],
    ['Locality', vendor.locality || vendor.area],
    ['District', vendor.district],
    ['City / Town', vendor.city],
    ['State', vendor.state],
    ['Pincode', vendor.pincode],
    ['Country', vendor.country || country],
    ['Engines', srcList.join(', ')],
    ['Folder / Session', vendor.sessionId]
  ].filter(([, val]) => Boolean(val));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Location & Complete Geo Card */}
      <div style={CARD_STYLE}>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}><MapPin size={13} color="#e11d48" /> Address &amp; Coordinates</div>
        <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 600, color: '#1e293b', lineHeight: 1.45 }}>
          {vendor.address || vendor.formatted_address || 'Address unindexed'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {coordStr && (
            <button type="button" onClick={() => copyVal(coordStr, 'coords')} style={{ padding: '4px 9px', borderRadius: 8, border: '1px solid rgba(2,132,199,0.22)', background: '#f0f9ff', color: '#0369a1', fontSize: 11, fontFamily: 'var(--lp-font-mono)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <Navigation size={11} /> {coordStr}
              {copiedKey === 'coords' ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
          {vendor.placeId && (
            <button type="button" onClick={() => copyVal(vendor.placeId, 'pid')} style={{ padding: '4px 9px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', color: '#475569', fontSize: 11, fontFamily: 'var(--lp-font-mono)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <span>Place ID: {String(vendor.placeId).slice(0, 16)}…</span>
              {copiedKey === 'pid' ? <Check size={11} color="#059669" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Full Extracted Metadata Matrix */}
      <div style={CARD_STYLE}>
        <div style={{ ...LABEL_STYLE, marginBottom: 8 }}><Layers size={13} color="#d97706" /> All Extracted Intelligence</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px 12px' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ paddingBottom: 5, borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
              <div style={{ fontSize: 10, fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CRM Pipeline & Notes */}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={LABEL_STYLE}><Tag size={13} color="#d97706" /> CRM Stage &amp; Notes</span>
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
              if (vendor.id) updateVendorCrm(vendor.id, { crmStage: e.target.value }).catch(() => {});
            }}
            style={{ fontSize: 11.5, fontWeight: 800, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.34)', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}
          >
            <option value="new">New Lead</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CLOSED">Closed Won</option>
          </select>
        </div>

        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={crmNote}
            onChange={(e) => setCrmNote(e.target.value)}
            placeholder="Add follow-up note or contact outcome…"
            style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.14)', background: '#f8fafc', outline: 'none' }}
          />
          <button type="submit" disabled={!crmNote.trim() || saving} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#d97706', color: '#ffffff', fontWeight: 800, cursor: 'pointer', opacity: !crmNote.trim() || saving ? 0.5 : 1 }}>
            <Send size={13} />
          </button>
        </form>

        {notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, maxHeight: 110, overflowY: 'auto' }}>
            {notes.map((n, i) => (
              <div key={i} style={{ fontSize: 11.5, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '5px 8px', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MessageSquare size={12} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{n.text || n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
