import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight, BarChart3, Building2, Check, CheckCircle2, Copy, Download,
  Edit3, FileSpreadsheet, FileText, FolderArchive, Globe2, LayoutGrid,
  MapPin, Phone, PhoneCall, Play, RefreshCw, Search, Smartphone, Star,
  Table2, Trash2, Users, X
} from 'lucide-react';
import CommandMap from '../../CommandMap';
import { VendorAvatar } from '../cards/MetricCard';
import { extractLeadArea, CarriedBadge } from '../../utils/leadHelpers';
import {
  tokenizeQuery, normalizePhoneDigits, matchesLead, scoreLead, highlightMatches
} from '../../../utils/universalSearchEngine';
import { getDisplayPhone, isMobilePhone, whatsappNumber } from '../../../utils/phoneClassify';
import { cx, formatNumber, relativeTime } from '../../ui';

export default function FolderView({
  view,
  onClose,
  onExport,
  onLoadToCockpit,
  onDelete,
  onReScrape,
  onSelectVendor,
  onRename
}) {
  const session = view?.session;
  const leads = Array.isArray(session?.leads) ? session.leads : [];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map' | 'cards' | 'analytics'
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const phoneLeads = useMemo(() => leads.filter(l => Boolean(getDisplayPhone(l))), [leads]);
  const webLeads = useMemo(() => leads.filter(l => Boolean(l.website)), [leads]);
  const ratedLeads = useMemo(() => leads.filter(l => Number(l.rating) >= 4.0), [leads]);
  const percentMobiles = leads.length > 0 ? Math.round((phoneLeads.length / leads.length) * 100) : 0;
  const percentRated = leads.length > 0 ? Math.round((ratedLeads.length / leads.length) * 100) : 0;
  const percentWeb = leads.length > 0 ? Math.round((webLeads.length / leads.length) * 100) : 0;

  const areaSubfolders = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const area = extractLeadArea(l, session?.location);
      if (area) counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads, session?.location]);

  const localityStats = useMemo(() => areaSubfolders.map(item => [item.area, item.count]).slice(0, 10), [areaSubfolders]);

  const categorySubfolders = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const cat = (l.category || '').trim();
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const searchTokens = useMemo(() => tokenizeQuery(search), [search]);

  const filtered = useMemo(() => {
    let list = leads;
    if (filter === 'phone') list = list.filter(l => Boolean(getDisplayPhone(l)));
    if (filter === 'website') list = list.filter(l => Boolean(l.website));
    if (filter === 'rated') list = list.filter(l => Number(l.rating) >= 4.0);

    if (selectedLocality !== 'all') {
      list = list.filter(l => extractLeadArea(l, session?.location) === selectedLocality);
    }

    if (selectedCategory !== 'all') {
      list = list.filter(l => (l.category || '').trim() === selectedCategory);
    }

    if (search.trim()) {
      const tokens = searchTokens;
      const digits = normalizePhoneDigits(search);
      list = list.filter(l => matchesLead(l, tokens, search, digits));
      list = [...list].sort((a, b) => scoreLead(b, tokens, search) - scoreLead(a, tokens, search));
    }

    return list;
  }, [leads, filter, selectedLocality, selectedCategory, search, searchTokens, session?.location]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l, idx) => l.id || `${l.name}-${getDisplayPhone(l) || idx}`)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const copyPhone = (phone, e) => {
    if (e) e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    toast.success(`Copied ${phone}`);
  };

  const copyAllPhones = () => {
    const targetLeads = selectedIds.size > 0
      ? leads.filter((l, idx) => selectedIds.has(l.id || `${l.name}-${getDisplayPhone(l) || idx}`))
      : phoneLeads;
    const rawPhones = targetLeads.map(l => getDisplayPhone(l)).filter(Boolean);
    const unique = [...new Set(rawPhones)];
    if (!unique.length) {
      toast.error('No phone numbers in selection.');
      return;
    }
    navigator.clipboard.writeText(unique.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success(`Copied ${unique.length} phone numbers!`);
  };

  const downloadVcfContacts = () => {
    const targetLeads = selectedIds.size > 0
      ? leads.filter((l, idx) => selectedIds.has(l.id || `${l.name}-${getDisplayPhone(l) || idx}`))
      : phoneLeads;
    if (!targetLeads.length) {
      toast.error('No businesses with phone numbers to save.');
      return;
    }
    const cards = targetLeads.map(l => {
      const p = getDisplayPhone(l);
      if (!p) return null;
      const mobile = whatsappNumber(p);
      const phoneNum = mobile ? `+91${mobile}` : p;
      const cleanName = (l.name || 'Business Contact').replace(/[;,\n]/g, ' ');
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${cleanName}\nORG:${cleanName}\nTEL;TYPE=CELL,VOICE:${phoneNum}\nNOTE:${l.category || ''} - ${[l.area, l.city].filter(Boolean).join(', ')}\nEND:VCARD`;
    }).filter(Boolean).join('\n');

    const blob = new Blob([cards], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(session?.name || session?.id || 'saved-list').replace(/[^a-z0-9]+/gi, '_')}_contacts.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Saved ${targetLeads.length} phone contacts (.vcf) ready for Android & iPhone!`);
  };

  const exportSelectedCsv = () => {
    const rows = selectedIds.size > 0
      ? leads.filter((l, idx) => selectedIds.has(l.id || `${l.name}-${getDisplayPhone(l) || idx}`))
      : filtered;
    if (!rows.length) {
      toast.error('No leads to export.');
      return;
    }
    const headers = ['Business Name', 'Category', 'Phone', 'Mobile', 'Area', 'City', 'District', 'Rating', 'Reviews', 'Website'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const phone = getDisplayPhone(r) || '';
      const isMob = isMobilePhone(phone);
      const row = [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${phone}"`,
        `"${isMob ? 'Yes' : 'No'}"`,
        `"${(r.area || '').replace(/"/g, '""')}"`,
        `"${(r.city || r.village || '').replace(/"/g, '""')}"`,
        `"${(r.district || '').replace(/"/g, '""')}"`,
        `"${r.rating || ''}"`,
        `"${r.reviewsCount || ''}"`,
        `"${(r.website || '').replace(/"/g, '""')}"`
      ];
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(session?.name || session?.id || 'saved-list').replace(/[^a-z0-9]+/gi, '_')}_leads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rows.length} leads as CSV!`);
  };

  return (
    <div className="v2-folder-modal" role="dialog" aria-modal="true" aria-label={`Saved List: ${session?.name || ''}`}>
      <div className="v2-folder-modal-card">
        <header className="v2-folder-header">
          <div className="v2-folder-header-info">
            <div className="v2-folder-header-title-row">
              <span className="v2-folder-mark-badge"><FolderArchive size={18} /></span>
              <h2>{session?.name || `${session?.category || 'Businesses'} in ${session?.location || 'India'}`}</h2>
            </div>
            <div className="v2-folder-header-meta">
              <span className="v2-meta-badge"><MapPin size={11} /> {session?.location || 'India'}</span>
              <span className="v2-meta-badge"><Users size={11} /> <b>{formatNumber(leads.length)}</b> businesses</span>
              <span className="v2-meta-badge is-highlight"><Phone size={11} /> <b>{formatNumber(phoneLeads.length)}</b> with phones ({percentMobiles}%)</span>
              <span className="v2-meta-badge"><Globe2 size={11} /> <b>{formatNumber(webLeads.length)}</b> websites</span>
              <span className="v2-meta-badge"><Star size={11} /> <b>{formatNumber(ratedLeads.length)}</b> rated 4.0+</span>
              <span className="v2-meta-time">{relativeTime(session?.timestamp)}</span>
            </div>
          </div>

          <div className="v2-folder-top-actions">
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => onRename?.(view.run || session)}
              title="Rename list or add tags"
            >
              <Edit3 size={12} /> Rename
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-lime v2-btn-sm"
              onClick={() => onLoadToCockpit?.(view.run, session)}
              title="Open this saved list in your main workspace"
            >
              <Play size={12} /> Open in Workspace
            </button>
            <button
              type="button"
              className="v2-icon-btn"
              onClick={onClose}
              aria-label="Close list"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Clean Quality Summary Bar */}
        <div className="v2-folder-scorecard">
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">TOTAL BUSINESSES</span>
            <b className="v2-scorecard-value">
              <Users size={13} /> {formatNumber(leads.length)}
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">DIRECT PHONES</span>
            <b className="v2-scorecard-value is-lime">
              <Phone size={13} /> {formatNumber(phoneLeads.length)} <small>({percentMobiles}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">TOP RATED (4.0+)</span>
            <b className="v2-scorecard-value is-gold">
              <Star size={13} /> {formatNumber(ratedLeads.length)} <small>({percentRated}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">WEBSITES</span>
            <b className="v2-scorecard-value is-cyan">
              <Globe2 size={13} /> {formatNumber(webLeads.length)} <small>({percentWeb}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">AREAS COVERED</span>
            <b className="v2-scorecard-value">
              <MapPin size={13} /> {formatNumber(areaSubfolders.length)}
            </b>
          </div>
        </div>

        {/* Download & Action Ribbon */}
        <div className="v2-folder-actions-ribbon">
          <div className="v2-ribbon-group">
            <span className="v2-ribbon-label">DOWNLOAD &amp; COPY:</span>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={copyAllPhones}
              title="Copy all phone numbers to your clipboard"
            >
              {copied ? <Check size={11} className="v2-text-lime" /> : <Copy size={11} />}
              {copied ? 'Copied!' : `Copy Phones (${selectedIds.size > 0 ? selectedIds.size : phoneLeads.length})`}
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              style={{ background: '#F0FDF4', color: '#166534', border: '1.5px solid #BBF7D0', fontWeight: 750 }}
              onClick={() => onExport?.(view.run, 'xlsx')}
              title="Download multi-tab Excel workbook organized by neighborhood"
            >
              <FileSpreadsheet size={11} /> Excel (.xlsx)
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => (selectedIds.size > 0 ? exportSelectedCsv() : onExport?.(view.run, 'csv'))}
              title="Download clean CSV spreadsheet"
            >
              <Download size={11} /> CSV Sheet
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              style={{ background: '#EFF6FF', color: '#1E40AF', border: '1.5px solid #BFDBFE', fontWeight: 750 }}
              onClick={() => onExport?.(view.run, 'csv', { divided: true })}
              title="Download CSV grouped by neighborhood"
            >
              <Download size={11} /> Area-Grouped CSV
            </button>
            {selectedLocality !== 'all' && (
              <button
                type="button"
                className="v2-btn v2-btn-ghost v2-btn-xs"
                style={{ background: '#FAF5FF', color: '#6B21A8', border: '1.5px solid #E9D5FF', fontWeight: 750 }}
                onClick={() => onExport?.(view.run, 'csv', { area: selectedLocality })}
                title={`Download CSV for ${selectedLocality} only`}
              >
                <Download size={11} /> {selectedLocality} CSV ({filtered.length})
              </button>
            )}
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'vcf')}
              title="Save phone contacts (.vcf) directly to Android or iPhone"
            >
              <Smartphone size={11} /> Phone Contacts (.vcf)
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'txt')}
              title="Download plain text phone numbers list"
            >
              <FileText size={11} /> Phones (.txt)
            </button>
          </div>

          <div className="v2-ribbon-group is-right">
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onReScrape?.(view.run)}
              title="Refresh this search to check for newly listed businesses"
            >
              <RefreshCw size={11} /> Refresh Search
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-danger v2-btn-xs"
              onClick={() => onDelete?.(view.run)}
              title="Delete this saved list"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>

        {/* Search, View Mode & Quick Filters */}
        <div className="v2-folder-toolbar">
          <div className="v2-folder-search-wrap">
            <Search size={13} className="v2-search-icon" />
            <input
              type="search"
              placeholder="Search inside this list (business name, phone, area)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setSearch(''); }}
              className="v2-folder-search-input"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="v2-search-clear" title="Clear search">
                <X size={12} />
              </button>
            )}
          </div>
          {search.trim() && (
            <span className="v2-search-count-pill">
              Showing <b>{filtered.length}</b> of {leads.length}
            </span>
          )}

          <div className="v2-folder-view-toggle">
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'table' && 'is-active')}
              onClick={() => setViewMode('table')}
            >
              <Table2 size={12} /> Table ({filtered.length})
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'cards' && 'is-active')}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={12} /> Contact Cards
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'map' && 'is-active')}
              onClick={() => setViewMode('map')}
            >
              <MapPin size={12} /> Map
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'analytics' && 'is-active')}
              onClick={() => setViewMode('analytics')}
            >
              <BarChart3 size={12} /> Summary
            </button>
          </div>

          <div className="v2-folder-filter-pills">
            <button type="button" className={cx('v2-fpill', filter === 'all' && 'is-active')} onClick={() => setFilter('all')}>
              All <b>{leads.length}</b>
            </button>
            <button type="button" className={cx('v2-fpill', filter === 'phone' && 'is-active')} onClick={() => setFilter('phone')}>
              <Phone size={10} /> Phones <b>{phoneLeads.length}</b>
            </button>
            <button type="button" className={cx('v2-fpill', filter === 'website' && 'is-active')} onClick={() => setFilter('website')}>
              <Globe2 size={10} /> Web <b>{webLeads.length}</b>
            </button>
            <button type="button" className={cx('v2-fpill', filter === 'rated' && 'is-active')} onClick={() => setFilter('rated')}>
              <Star size={10} /> 4.0+ <b>{ratedLeads.length}</b>
            </button>
          </div>
        </div>

        {/* Neighborhood & Category Filter Chips */}
        {(areaSubfolders.length > 0 || categorySubfolders.length > 1) && (
          <div className="v2-subfolder-container">
            {areaSubfolders.length > 0 && (
              <>
                <div className="v2-subfolder-label">
                  <MapPin size={12} />
                  <span>NEIGHBORHOODS IN {(session?.location || 'AREA').toUpperCase()} ({areaSubfolders.length})</span>
                </div>
                <div className="v2-subfolder-chips">
                  <button
                    type="button"
                    className={cx('v2-subfolder-chip', selectedLocality === 'all' && 'is-active')}
                    onClick={() => setSelectedLocality('all')}
                  >
                    All Areas ({leads.length})
                  </button>
                  {areaSubfolders.map(({ area, count }) => (
                    <button
                      type="button"
                      key={area}
                      className={cx('v2-subfolder-chip', selectedLocality === area && 'is-active')}
                      onClick={() => setSelectedLocality(selectedLocality === area ? 'all' : area)}
                    >
                      {area} <b style={{ opacity: 0.85 }}>({count})</b>
                    </button>
                  ))}
                </div>
              </>
            )}

            {categorySubfolders.length > 1 && (
              <>
                <div className="v2-subfolder-label" style={{ marginTop: 10 }}>
                  <Building2 size={12} />
                  <span>CATEGORIES ({categorySubfolders.length})</span>
                </div>
                <div className="v2-subfolder-chips">
                  <button
                    type="button"
                    className={cx('v2-subfolder-chip', selectedCategory === 'all' && 'is-active')}
                    onClick={() => setSelectedCategory('all')}
                  >
                    All Categories
                  </button>
                  {categorySubfolders.map(({ cat, count }) => (
                    <button
                      type="button"
                      key={cat}
                      className={cx('v2-subfolder-chip', selectedCategory === cat && 'is-active')}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                    >
                      {cat} <b style={{ opacity: 0.85 }}>({count})</b>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bulk Selection Bar */}
        {selectedIds.size > 0 && (
          <div className="v2-folder-bulk-bar">
            <span><b>{selectedIds.size}</b> businesses selected</span>
            <div className="v2-bulk-actions">
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={copyAllPhones}>
                <Copy size={11} /> Copy Phones ({selectedIds.size})
              </button>
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={exportSelectedCsv}>
                <Download size={11} /> Export Selected CSV
              </button>
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={downloadVcfContacts}>
                <Smartphone size={11} /> Save Contacts (.vcf)
              </button>
              <button type="button" className="v2-bulk-clear" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="v2-folder-content">
          {viewMode === 'map' && (
            <div className="v2-folder-map-wrap">
              <CommandMap
                vendors={filtered}
                scanning={false}
                center={filtered.length > 0 && filtered[0].latitude ? [Number(filtered[0].latitude), Number(filtered[0].longitude)] : undefined}
                zoom={12}
                height="540px"
                onSelect={vendor => {
                  onClose();
                  onSelectVendor?.(vendor);
                }}
              />
            </div>
          )}

          {viewMode === 'cards' && (
            <div className="v2-folder-telecaller-grid">
              {filtered.map((lead, index) => {
                const phone = getDisplayPhone(lead);
                const leadId = lead.id || `${lead.name}-${phone || index}`;
                const isSelected = selectedIds.has(leadId);

                return (
                  <div key={leadId} className={cx('v2-tc-card', isSelected && 'is-selected')}>
                    <div className="v2-tc-header">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(leadId)}
                        className="v2-lead-checkbox"
                      />
                      <VendorAvatar vendor={lead} size={28} />
                      <div className="v2-tc-title-wrap">
                        <b className="v2-tc-name">{lead.name || 'Business'}</b>
                        <CarriedBadge lead={lead} />
                        <small className="v2-tc-cat">
                          {[lead.area, lead.city || lead.village].filter(Boolean).join(', ') || 'Local'}
                          {lead.rating != null && (
                            <span className="v2-tc-star">★ {Number(lead.rating).toFixed(1)} {lead.reviewsCount ? `(${formatNumber(lead.reviewsCount)})` : ''}</span>
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="v2-tc-actions">
                      {phone ? (
                        <>
                          <a href={`tel:${phone}`} className="v2-tc-btn-call" title="Tap to call">
                            <PhoneCall size={12} />
                            <span>{phone}</span>
                          </a>
                          <button
                            type="button"
                            className="v2-btn v2-btn-ghost v2-btn-xs"
                            onClick={(e) => copyPhone(phone, e)}
                            title="Copy phone number"
                          >
                            <Copy size={11} /> Copy
                          </button>
                        </>
                      ) : (
                        <span className="v2-tc-nophone">No phone listed</span>
                      )}
                    </div>

                    <div className="v2-tc-footer">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="v2-site-link">
                          <Globe2 size={11} /> Website
                        </a>
                      ) : (
                        <span className="v2-muted" style={{ fontSize: 11 }}>{lead.category || session?.category || 'Business'}</span>
                      )}
                      <button
                        type="button"
                        className="v2-tc-inspect-btn"
                        onClick={() => { onClose(); onSelectVendor?.(lead); }}
                        title="View full business details"
                      >
                        Details <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!filtered.length && (
                <div className="v2-folder-empty">
                  {search ? `No businesses matching "${search}".` : 'No businesses found in this filter.'}
                </div>
              )}
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="v2-folder-analytics-view">
              <div className="v2-analytics-top-grid">
                <div className="v2-analytics-card">
                  <span className="v2-an-title">PHONE AVAILABILITY</span>
                  <div className="v2-an-big-stat">
                    <b>{percentMobiles}%</b>
                    <span>{phoneLeads.length} of {leads.length} businesses have a direct phone number</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill" style={{ width: `${percentMobiles}%` }} />
                  </div>
                </div>

                <div className="v2-analytics-card">
                  <span className="v2-an-title">ONLINE PRESENCE</span>
                  <div className="v2-an-big-stat">
                    <b>{percentWeb}%</b>
                    <span>{webLeads.length} businesses have an official website listed</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill is-cyan" style={{ width: `${percentWeb}%` }} />
                  </div>
                </div>

                <div className="v2-analytics-card">
                  <span className="v2-an-title">TOP-RATED BUSINESSES</span>
                  <div className="v2-an-big-stat">
                    <b>{percentRated}%</b>
                    <span>{ratedLeads.length} businesses rated 4.0 stars or higher</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill is-amber" style={{ width: `${percentRated}%` }} />
                  </div>
                </div>
              </div>

              <div className="v2-analytics-localities-card">
                <span className="v2-an-title">TOP NEIGHBORHOODS IN THIS LIST</span>
                <div className="v2-an-locality-list">
                  {localityStats.map(([name, count]) => {
                    const pct = Math.round((count / (leads.length || 1)) * 100);
                    return (
                      <div key={name} className="v2-an-loc-row">
                        <span className="v2-an-loc-name"><MapPin size={11} /> {name}</span>
                        <div className="v2-an-loc-progress">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="v2-an-loc-count"><b>{count}</b> businesses ({pct}%)</span>
                      </div>
                    );
                  })}
                  {!localityStats.length && <p className="v2-muted">No specific neighborhoods grouped yet.</p>}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'table' && (
            <div className="v2-folder-modal-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        title="Select all businesses"
                      />
                    </th>
                    <th>BUSINESS</th>
                    <th>AREA</th>
                    <th>DIRECT PHONE</th>
                    <th>WEBSITE</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, index) => {
                    const phone = getDisplayPhone(lead);
                    const leadId = lead.id || `${lead.name}-${phone || index}`;
                    const isSelected = selectedIds.has(leadId);

                    return (
                      <tr key={leadId} className={cx(isSelected && 'is-selected')}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(leadId)}
                            className="v2-lead-checkbox"
                          />
                        </td>
                        <td>
                          <div className="v2-vendor-cell">
                            <VendorAvatar vendor={lead} size={28} />
                            <span>
                              <b>{highlightMatches(lead.name || 'Business', searchTokens)}</b>
                              <CarriedBadge lead={lead} />
                              <small className="v2-cp-cat">
                                {highlightMatches(lead.category || session?.category || 'Business', searchTokens)}
                                {lead.rating != null && (
                                  <em className="v2-folder-rating">
                                    ★ {Number(lead.rating).toFixed(1)} {lead.reviewsCount ? `(${lead.reviewsCount})` : ''}
                                  </em>
                                )}
                              </small>
                            </span>
                            {lead.verified && <CheckCircle2 size={12} className="v2-verified-icon" />}
                          </div>
                        </td>
                        <td>
                          <span className="v2-folder-loc-text">
                            {highlightMatches([lead.area, lead.city || lead.village, lead.district].filter(Boolean).join(', ') || '—', searchTokens)}
                          </span>
                        </td>
                        <td>
                          {phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <a href={`tel:${phone}`} className="v2-phone-link" onClick={e => e.stopPropagation()}>
                                <Phone size={11} /> {highlightMatches(phone, searchTokens)}
                              </a>
                              <button
                                type="button"
                                className="lx-copy-chip"
                                onClick={e => copyPhone(phone, e)}
                                title="Copy phone number"
                              >
                                <Copy size={10} /> Copy
                              </button>
                            </div>
                          ) : (
                            <span className="v2-muted">No phone</span>
                          )}
                        </td>
                        <td>
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="v2-site-link"
                              title={lead.website}
                            >
                              <Globe2 size={11} /> Visit Site
                            </a>
                          ) : (
                            <span className="v2-muted">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="v2-folder-row-inspect"
                            onClick={() => {
                              onClose();
                              onSelectVendor?.(lead);
                            }}
                            title="View complete business profile"
                          >
                            View <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filtered.length && (
                <div className="v2-folder-empty">
                  {search ? `No businesses matching "${search}".` : 'This saved list is empty.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
