import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  Phone,
  MessageSquare,
  Server,
  Laptop,
  ExternalLink,
  Globe,
  Sparkles,
  MapPin
} from 'lucide-react';

const COUNTRIES = [
  { code: 'ALL', name: '🌍 All 11 Countries' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'AE', name: '🇦🇪 United Arab Emirates' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'NZ', name: '🇳🇿 New Zealand' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'IE', name: '🇮🇪 Ireland' },
  { code: 'MY', name: '🇲🇾 Malaysia' },
  { code: 'DE', name: '🇩🇪 Germany' }
];

const KNOWN_FAMILY_ICONS = {
  'Healthcare & Medical': '🏥',
  'Photography, Studios & Media': '📸',
  'B2B Wholesale & Agriculture': '🌾',
  'Home & Commercial Services': '🔨',
  'Corporate & Professional': '💼',
  'Hospitality & Events': '🏨',
  'General Commercial': '🏢'
};

export default function AdminDataVault() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [availableFamilies, setAvailableFamilies] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [source, setSource] = useState('all'); // 'all' | 'master' | 'client'
  const [country, setCountry] = useState('ALL');
  const [selectedFamily, setSelectedFamily] = useState('ALL');
  const [query, setQuery] = useState('');
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);
  const [hasWhatsAppOnly, setHasWhatsAppOnly] = useState(false);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [page, setPage] = useState(1);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        source,
        limit: '100',
        page: String(page)
      });
      if (country !== 'ALL') params.set('country', country);
      if (selectedFamily !== 'ALL') params.set('family', selectedFamily);
      if (query.trim()) params.set('q', query.trim());
      if (hasPhoneOnly) params.set('hasPhone', 'true');
      if (hasWhatsAppOnly) params.set('hasWhatsApp', 'true');
      if (hasWebsiteOnly) params.set('hasWebsite', 'true');

      const res = await fetch(`/api/admin/data/leads?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads || []);
        setTotal(json.total || 0);
        if (json.availableFamilies) {
          setAvailableFamilies(json.availableFamilies);
        }
      }
    } catch (e) {
      console.error('Failed to load leads from vault', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [source, country, selectedFamily, hasPhoneOnly, hasWhatsAppOnly, hasWebsiteOnly, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleExportCSV = () => {
    if (!leads.length) return;
    const headers = [
      'Business Name',
      'Category Family',
      'Category',
      'Scraper Source',
      'Country',
      'City / Sub-vector',
      'Phone Number',
      'WhatsApp Available',
      'WhatsApp Direct Link',
      'Website',
      'Quality Score',
      'Address'
    ];

    const rows = leads.map(l => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.family || ''}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${l.scraperSource === 'master' ? 'Master Fleet Scraper' : 'Client Desk Scraper'}"`,
      `"${l.country || 'IN'}"`,
      `"${(l.city || l.subVector || '').replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${l.hasWhatsApp ? 'YES' : 'NO'}"`,
      `"${l.whatsappLink || ''}"`,
      `"${l.website || ''}"`,
      `"${l.qualityScore || ''}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Scraper_Vault_${source}_${country}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetLeads = async () => {
    if (!window.confirm('Are you sure you want to delete all older leads and start completely fresh? All previous sessions will be safely archived.')) return;
    try {
      const res = await fetch('/api/admin/data/reset-leads', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('All previous leads wiped clean! You have a 100% fresh start.');
        fetchLeads();
      }
    } catch (e) {
      alert('Failed to reset leads: ' + e.message);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <Database size={12} />
            <span>CONNECTED MASTER &amp; CLIENT DATA VAULT · 2,615+ LEADS</span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 850, margin: 0, color: '#0f172a' }}>
            Unified Scraped Data Hub
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
            Multi-dimensional categorization across Macro Families, Geographic Sub-vectors, and direct WhatsApp channels.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleResetLeads}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 12,
              fontWeight: 750,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
            title="Archive and delete older leads to start fresh"
          >
            <span>Start Fresh</span>
          </button>

          <button
            type="button"
            onClick={fetchLeads}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Download size={14} />
            <span>Export Filtered CSV ({total})</span>
          </button>
        </div>
      </div>

      {/* Macro Category Family Filter Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {[
          { key: 'ALL', label: 'All Categories', icon: '✨' },
          ...Object.keys(availableFamilies).map(k => ({
            key: k,
            label: k,
            icon: KNOWN_FAMILY_ICONS[k] || '📁'
          }))
        ].map((fam) => {
          const isSelected = selectedFamily === fam.key;
          const count = fam.key === 'ALL' ? total : (availableFamilies[fam.key] || 0);
          return (
            <button
              key={fam.key}
              type="button"
              onClick={() => { setSelectedFamily(fam.key); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: isSelected ? '1.5px solid #059669' : '1px solid #e2e8f0',
                background: isSelected ? '#ecfdf5' : '#ffffff',
                color: isSelected ? '#047857' : '#475569',
                fontSize: 12,
                fontWeight: isSelected ? 800 : 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{fam.icon}</span>
              <span>{fam.label}</span>
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: isSelected ? '#059669' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: 800
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Ribbon */}
      <div className="admin-card" style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* Source Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          <button
            type="button"
            onClick={() => { setSource('all'); setPage(1); }}
            style={{
              padding: '5px 12px',
              borderRadius: 7,
              border: 'none',
              background: source === 'all' ? '#ffffff' : 'transparent',
              color: source === 'all' ? '#0f172a' : '#64748b',
              fontWeight: source === 'all' ? 800 : 600,
              fontSize: 11.5,
              cursor: 'pointer',
              boxShadow: source === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            All Sources
          </button>
          <button
            type="button"
            onClick={() => { setSource('master'); setPage(1); }}
            style={{
              padding: '5px 12px',
              borderRadius: 7,
              border: 'none',
              background: source === 'master' ? '#ecfeff' : 'transparent',
              color: source === 'master' ? '#0891b2' : '#64748b',
              fontWeight: source === 'master' ? 800 : 600,
              fontSize: 11.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Server size={12} />
            <span>Master Fleet (Sweeps)</span>
          </button>
          <button
            type="button"
            onClick={() => { setSource('client'); setPage(1); }}
            style={{
              padding: '5px 12px',
              borderRadius: 7,
              border: 'none',
              background: source === 'client' ? '#ecfdf5' : 'transparent',
              color: source === 'client' ? '#059669' : '#64748b',
              fontWeight: source === 'client' ? 800 : 600,
              fontSize: 11.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Laptop size={12} />
            <span>Client Desks</span>
          </button>
        </div>

        {/* Country Selector */}
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); setPage(1); }}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: 12,
            fontWeight: 750,
            color: '#334155',
            cursor: 'pointer'
          }}
        >
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filter by business, city, sub-vector, phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 12,
                color: '#0f172a'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 750,
              cursor: 'pointer'
            }}
          >
            Find
          </button>
        </form>

        {/* Channel Flags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 750, color: '#047857', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasWhatsAppOnly}
              onChange={(e) => { setHasWhatsAppOnly(e.target.checked); setPage(1); }}
              style={{ accentColor: '#059669', width: 15, height: 15 }}
            />
            <span>WhatsApp Ready</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 750, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasPhoneOnly}
              onChange={(e) => { setHasPhoneOnly(e.target.checked); setPage(1); }}
              style={{ accentColor: '#059669', width: 15, height: 15 }}
            />
            <span>Phones Only</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 750, color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasWebsiteOnly}
              onChange={(e) => { setHasWebsiteOnly(e.target.checked); setPage(1); }}
              style={{ accentColor: '#059669', width: 15, height: 15 }}
            />
            <span>Websites Only</span>
          </label>
        </div>
      </div>

      {/* Leads Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '52vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px' }}>Business Name</th>
                <th style={{ padding: '12px 16px' }}>Category Family &amp; Niche</th>
                <th style={{ padding: '12px 16px' }}>Source Fleet</th>
                <th style={{ padding: '12px 16px' }}>Sub-Vector / Locality</th>
                <th style={{ padding: '12px 16px' }}>Contact &amp; WhatsApp Outreach</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 650 }}>
                    Harvesting records from vault...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 650 }}>
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map((l, i) => (
                  <tr
                    key={l.id || i}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: i % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)',
                      transition: 'background 0.12s'
                    }}
                  >
                    {/* Business Name & Website */}
                    <td style={{ padding: '10px 16px', fontWeight: 750, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{l.name}</span>
                        {l.website && (
                          <a
                            href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#0891b2' }}
                            title="Visit Website"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {l.address && (
                        <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.address}
                        </div>
                      )}
                    </td>

                    {/* Category & Family */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 750, color: '#0f172a' }}>
                        <span>{l.familyIcon || '🏢'}</span>
                        <span>{l.family || 'General Commercial'}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>
                        {l.category}
                      </div>
                    </td>

                    {/* Source Tag */}
                    <td style={{ padding: '10px 16px' }}>
                      {l.scraperSource === 'master' ? (
                        <span className="admin-badge admin-badge-cyan">
                          <Server size={10} />
                          <span>Master Fleet</span>
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-emerald">
                          <Laptop size={10} />
                          <span>Client Desk</span>
                        </span>
                      )}
                    </td>

                    {/* Sub-Vector / City */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#334155' }}>
                        <span>{l.country === 'US' ? '🇺🇸' : l.country === 'GB' ? '🇬🇧' : '🇮🇳'}</span>
                        <span>{l.city || 'Regional Center'}</span>
                      </div>
                      {l.subVector && l.subVector !== l.city && (
                        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={9} color="#059669" />
                          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.subVector}</span>
                        </div>
                      )}
                    </td>

                    {/* Contact & WhatsApp Click-to-Chat */}
                    <td style={{ padding: '10px 16px' }}>
                      {l.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#047857', fontSize: 12 }}>
                            {l.phone}
                          </span>

                          {l.whatsappLink ? (
                            <a
                              href={l.whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                textDecoration: 'none',
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#25D366',
                                color: '#ffffff',
                                fontSize: 10.5,
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
                              }}
                              title="Click to open WhatsApp Web Chat"
                            >
                              <MessageSquare size={10} />
                              <span>WhatsApp</span>
                            </a>
                          ) : l.hasWhatsApp ? (
                            <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 800 }}>
                              WA Valid
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>No direct phone</span>
                      )}
                    </td>

                    {/* Quality Score */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: l.qualityScore >= 80 ? '#ecfdf5' : '#f1f5f9',
                          color: l.qualityScore >= 80 ? '#047857' : '#64748b',
                          border: l.qualityScore >= 80 ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                        }}
                      >
                        {l.qualityScore}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count */}
        <div style={{ padding: '12px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b' }}>
          <span>Showing <strong>{leads.length}</strong> of <strong>{total}</strong> verified records</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}
            >
              Previous
            </button>
            <span style={{ padding: '4px 8px', fontWeight: 800, color: '#0f172a' }}>Page {page}</span>
            <button
              type="button"
              disabled={leads.length < 100}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: leads.length < 100 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
