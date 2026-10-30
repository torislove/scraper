import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, CheckSquare, ChevronDown, Compass,
  ChevronLeft, ChevronRight, CircleDot, Copy, Crosshair, Database, Download,
  ExternalLink, FileSpreadsheet, FileText, Filter, FolderArchive, Globe2, Layers, LayoutDashboard,
  Loader2, MapPin, MessageSquare, Phone, PhoneCall, Play, Radar as RadarIcon,
  RefreshCw, Search, SlidersHorizontal, Smartphone, Sparkles, Square, Star, Settings,
  Table2, Tag, Trash2, Users, Wifi, WifiOff, X, Zap, Edit3, GitMerge
} from 'lucide-react';
import CommandMap from './CommandMap';
import VendorDrawer from './VendorDrawer';
import SearchConsole from './SearchConsole';
import CrmBoard, { CRM_STAGES, crmStageOf, formatInr } from './CrmBoard';
import {
  deepExtractVendor, getDeepJob, getDeepJobs, getEstimate, getHealth,
  getScrapeJobs, getSessions, getSessionVault, getVendors, sessionExportUrl,
  startAuto, startMasterSweep, startDeepBatch, startOmni, stopAllScrapes, stopDeepJob, updateVendorCrm, streamUrl,
  deleteSession, renameSession, mergeSessions, batchDeleteSessions
} from './api';
import {
  Logo, ScoreRing, StatusPill, cx, formatDuration, formatNumber,
  relativeTime
} from './ui';
import { IS_DESKTOP, HOME_ROUTE } from '../desktop';
import DesktopBadge from './DesktopBadge';

const STRATEGIES = ['broad', 'smart', 'strict'];
const SORTS = [
  ['newest', 'Newest first'],
  ['rating', 'Highest rating'],
  ['quality', 'Best profile'],
  ['name', 'Name A–Z']
];

const TAB_ALIASES = {
  cockpit: 'cockpit',
  workspace: 'cockpit',
  home: 'cockpit',
  overview: 'cockpit',
  insights: 'cockpit',
  analytics: 'cockpit',
  leads: 'leads',
  map: 'map',
  crm: 'crm',
  folders: 'runs',
  runs: 'runs',
  deep: 'deep'
};

function tabFromUrl(value) {
  return TAB_ALIASES[String(value || '').toLowerCase()] || 'cockpit';
}

function urlFromTab(tab) {
  return tab === 'runs' ? 'folders' : tab;
}

export function getDisplayPhone(vendor) {
  if (!vendor) return null;
  if (vendor.phone && !String(vendor.phone).includes('Requires') && !String(vendor.phone).includes('Obfuscated')) return vendor.phone;
  if (Array.isArray(vendor.phones) && vendor.phones.length > 0) {
    const mobileFirst = vendor.phones.find(p => p && (p.isMobile || (typeof p === 'string' && /^[6-9]\d{9}$/.test(p.replace(/\D/g, '').slice(-10)))));
    if (mobileFirst) {
      const val = typeof mobileFirst === 'string' ? mobileFirst : mobileFirst.e164 || mobileFirst.national || mobileFirst.raw;
      if (val && !String(val).includes('Requires')) return val;
    }
    const first = vendor.phones[0];
    const val = typeof first === 'string' ? first : first?.e164 || first?.national || first?.raw;
    if (val && !String(val).includes('Requires')) return val;
  }
  if (vendor.whatsapp && !String(vendor.whatsapp).includes('Requires')) return vendor.whatsapp;
  if (vendor.phone_primary && !String(vendor.phone_primary).includes('Requires')) return vendor.phone_primary;
  return null;
}

export function isMobilePhone(phoneStr) {
  if (!phoneStr) return false;
  const digits = String(phoneStr).replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

function qualityOf(vendor) {
  const score = vendor?.profileQuality?.score;
  if (score != null && Number.isFinite(Number(score))) return Number(score);
  const legacy = vendor?.qualityScore;
  return legacy != null && Number.isFinite(Number(legacy)) ? Number(legacy) : null;
}

function vendorInitial(vendor) {
  return (vendor?.name || '?').slice(0, 1).toUpperCase();
}

function hasValidLogo(vendor) {
  return Boolean(vendor?.logo) && !/ui-avatars|google\.com\/s2\/favicons/i.test(vendor.logo);
}

function VendorAvatar({ vendor, size = 36 }) {
  return (
    <span className="v2-vendor-avatar" style={{ width: size, height: size }}>
      {hasValidLogo(vendor)
        ? <img src={vendor.logo} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />
        : <b>{vendorInitial(vendor)}</b>}
    </span>
  );
}

function MetricCard({ label, value, sub, tone = 'lime', icon: Icon, pulse = false }) {
  return (
    <div className={cx('v2-metric-card', `tone-${tone}`, pulse && 'is-pulsing')}>
      <span className="v2-metric-icon">{Icon && <Icon size={15} />}</span>
      <span className="v2-metric-copy">
        <small>{label}</small>
        <b>{value}</b>
        {sub && <em>{sub}</em>}
      </span>
    </div>
  );
}

function ToggleTile({ active, onClick, label, detail, icon: Icon, disabled = false }) {
  return (
    <button
      type="button"
      className={cx('v2-toggle-tile', active && 'is-active')}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="v2-toggle-icon">{Icon && <Icon size={15} />}</span>
      <span>
        <b>{label}</b>
        <small>{detail}</small>
      </span>
      <i className="v2-switch"><b /></i>
    </button>
  );
}

function FilterBar({ filters, onChange, total, shown, compact = false }) {
  return (
    <div className={cx('v2-filter-bar', compact && 'is-compact')}>
      <div className="v2-filter-search">
        <Search size={14} />
        <input
          value={filters.query}
          onChange={event => onChange('query', event.target.value)}
          placeholder="Search name, category, phone, village…"
        />
        {filters.query && (
          <button type="button" onClick={() => onChange('query', '')} aria-label="Clear search"><X size={13} /></button>
        )}
      </div>

      <div className="v2-filter-toggles">
        <button type="button" className={cx(filters.phoneOnly && 'is-active')} onClick={() => onChange('phoneOnly', !filters.phoneOnly)}>
          <Phone size={12} /> Phone
        </button>
        <button type="button" className={cx(filters.websiteOnly && 'is-active')} onClick={() => onChange('websiteOnly', !filters.websiteOnly)}>
          <Globe2 size={12} /> Website
        </button>
        <button type="button" className={cx(filters.deepOnly && 'is-active')} onClick={() => onChange('deepOnly', !filters.deepOnly)}>
          <Zap size={12} /> Deep
        </button>
        <button type="button" className={cx(filters.conflictsOnly && 'is-active')} onClick={() => onChange('conflictsOnly', !filters.conflictsOnly)}>
          <AlertTriangle size={12} /> Conflicts
        </button>
      </div>

      <div className="v2-filter-selects">
        <select value={filters.minRating} onChange={event => onChange('minRating', Number(event.target.value))}>
          <option value={0}>Any rating</option>
          <option value={3}>3.0+</option>
          <option value={4}>4.0+</option>
          <option value={4.5}>4.5+</option>
        </select>
        <select value={filters.sort} onChange={event => onChange('sort', event.target.value)}>
          {SORTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </div>

      <span className="v2-filter-count">{formatNumber(shown)}<i>/</i>{formatNumber(total)}</span>
    </div>
  );
}

function DeepJobRow({ job, onStop, active = false }) {
  const tone = job.status === 'completed' ? 'lime' : job.status === 'failed' ? 'red' : job.status === 'stopped' ? 'amber' : 'cyan';
  return (
    <div className={cx('v2-deep-job-row', active && 'is-active')}>
      <div className="v2-deep-job-head">
        <span className="v2-deep-job-mark"><Zap size={13} /></span>
        <span>
          <b>{job.id}</b>
          <small>{job.updatedAt || relativeTime(job.createdAt)} · {job.total} vendors</small>
        </span>
        <StatusPill tone={tone} pulse={['queued', 'running', 'stopping'].includes(job.status)}>{job.status}</StatusPill>
        {['queued', 'running', 'stopping'].includes(job.status) && onStop && (
          <button type="button" className="v2-icon-btn" onClick={() => onStop(job.id)} title="Stop job"><Square size={12} /></button>
        )}
      </div>
      <div className="v2-deep-job-progress">
        <span><i style={{ width: `${job.progressPercent || 0}%` }} /></span>
        <b>{job.progressPercent || 0}%</b>
        <small>{job.completed}/{job.total} · {job.succeeded} ok · {job.failed} failed</small>
      </div>
    </div>
  );
}

function RunCard({
  run,
  onOpen,
  onExport,
  onLoadToCockpit,
  onDelete,
  onRename,
  active,
  loading = false,
  selected = false,
  onToggleSelect
}) {
  const percentMobiles = run.leadCount > 0 ? Math.round((run.phoneCount / run.leadCount) * 100) : 0;
  const displayName = run.customName || run.name || `${run.category} in ${run.location}`;
  const colorStyle = run.color ? { borderLeftColor: run.color, borderLeftWidth: '3px' } : {};

  return (
    <div
      className={cx('v2-run-card', active && 'is-active', loading && 'is-loading', selected && 'is-selected')}
      style={colorStyle}
      onClick={(e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) return;
        onOpen?.();
      }}
    >
      <header className="v2-run-card-header">
        <button
          type="button"
          className={cx('v2-run-check', selected && 'is-checked')}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(run.id);
          }}
          title={selected ? 'Deselect folder' : 'Select folder for batch operations'}
        >
          {selected ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>

        <span className="v2-run-mark" style={run.color ? { color: run.color } : {}}>
          <FolderArchive size={16} />
        </span>

        <div className="v2-run-title-wrap">
          <div className="v2-run-title-row">
            <b className="v2-run-title" title={displayName}>
              {displayName}
            </b>
            <StatusPill tone={run.status === 'completed' || run.status === 'complete' ? 'lime' : run.status === 'running' ? 'cyan' : run.status === 'aborted' ? 'red' : 'neutral'}>
              {run.status === 'completed' ? 'ready' : run.status}
            </StatusPill>
            {run.isMasterSweep && (
              <span className="v2-master-sweep-pill">
                <Compass size={10} /> {run.masterScope ? run.masterScope.toUpperCase() + ' SWEEP' : 'MASTER SWEEP'}
              </span>
            )}
          </div>
          <div className="v2-run-meta-row">
            <span className="v2-run-loc"><MapPin size={10} /> {run.location || 'India'}</span>
            <span className="v2-run-dot">•</span>
            <span className="v2-run-time">{relativeTime(run.timestamp)}</span>
            <span className="v2-run-dot">•</span>
            <span className="v2-run-mobiles"><Phone size={10} /> {formatNumber(run.phoneCount)} mobiles</span>
          </div>
          {Array.isArray(run.tags) && run.tags.length > 0 && (
            <div className="v2-run-tags-row">
              {run.tags.map(tag => (
                <span key={tag} className="v2-run-tag"><Tag size={9} /> {tag}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="v2-run-metrics">
        <div className="v2-run-metric-cell">
          <span>LEADS</span>
          <b>{formatNumber(run.leadCount)}</b>
        </div>
        <div className="v2-run-metric-cell is-highlight">
          <span>PHONES</span>
          <b>{formatNumber(run.phoneCount)} <small>({percentMobiles}%)</small></b>
        </div>
        <div className="v2-run-metric-cell">
          <span>{Number(run.dealValueTotal) > 0 ? 'PIPELINE' : 'SAVED'}</span>
          {Number(run.dealValueTotal) > 0 ? (
            <b className="is-small v2-text-cyan" title="Total Deal Value in this folder">
              {formatInr(run.dealValueTotal)}
            </b>
          ) : (
            <b className="is-small" title={run.timestamp ? new Date(run.timestamp).toLocaleString() : ''}>
              {relativeTime(run.timestamp)}
            </b>
          )}
        </div>
      </div>

      <footer className="v2-run-card-footer">
        <button
          type="button"
          className="v2-run-open-btn"
          onClick={onOpen}
          disabled={loading}
          title="Open complete folder vault explorer with all options"
        >
          {loading ? <Loader2 size={12} className="v2-spin" /> : <FolderArchive size={12} />}
          <span>Open Folder</span>
          <ArrowUpRight size={11} />
        </button>

        <div className="v2-run-actions">
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onRename?.(run); }}
            title="Rename, tag or change color of this folder"
          >
            <Edit3 size={11} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onLoadToCockpit?.(run); }}
            title="Load this folder into active Cockpit workspace"
          >
            <Play size={10} />
            <span>Cockpit</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-tool"
            onClick={(e) => { e.stopPropagation(); onExport?.(run, 'csv'); }}
            title="Export CSV spreadsheet"
          >
            <Download size={10} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="v2-run-btn-delete"
            onClick={(e) => { e.stopPropagation(); onDelete?.(run); }}
            title="Delete this folder"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function FolderView({
  view,
  onClose,
  onExport,
  onLoadToCockpit,
  onDelete,
  onReScrape,
  onSelectVendor,
  onStageChange,
  onRename
}) {
  const session = view?.session;
  const leads = Array.isArray(session?.leads) ? session.leads : [];
  const isMasterSweep = Boolean(session?.isMasterSweep || view?.run?.isMasterSweep || /master_/i.test(session?.id || '') || /sweep/i.test(session?.location || ''));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map' | 'telecaller' | 'analytics'
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');

  const phoneLeads = useMemo(() => leads.filter(l => Boolean(getDisplayPhone(l))), [leads]);
  const webLeads = useMemo(() => leads.filter(l => Boolean(l.website)), [leads]);
  const ratedLeads = useMemo(() => leads.filter(l => Number(l.rating) >= 4.0), [leads]);
  const wonLeads = useMemo(() => leads.filter(l => (l.crmStage || crmStageOf(l)) === 'won'), [leads]);
  const pipelineTotal = useMemo(() => leads.reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0), [leads]);
  const percentMobiles = leads.length > 0 ? Math.round((phoneLeads.length / leads.length) * 100) : 0;
  const percentRated = leads.length > 0 ? Math.round((ratedLeads.length / leads.length) * 100) : 0;
  const percentWeb = leads.length > 0 ? Math.round((webLeads.length / leads.length) * 100) : 0;

  // Extract top localities for quick filter chips
  const localityStats = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const loc = l.area || l.city || l.village || 'Other';
      if (loc && loc !== 'Other') {
        counts[loc] = (counts[loc] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [leads]);

  // Filter & Search logic
  const filtered = useMemo(() => {
    let list = leads;
    if (filter === 'phone') list = list.filter(l => Boolean(getDisplayPhone(l)));
    if (filter === 'website') list = list.filter(l => Boolean(l.website));
    if (filter === 'rated') list = list.filter(l => Number(l.rating) >= 4.0);

    if (selectedLocality !== 'all') {
      list = list.filter(l => (l.area || l.city || l.village || 'Other') === selectedLocality);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(l => {
        const p = getDisplayPhone(l);
        return (
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.area && l.area.toLowerCase().includes(q)) ||
          (l.category && l.category.toLowerCase().includes(q)) ||
          (p && String(p).includes(q))
        );
      });
    }

    if (sortField === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '') * (sortOrder === 'asc' ? 1 : -1));
    } else if (sortField === 'rating') {
      list = [...list].sort((a, b) => ((Number(b.rating) || 0) - (Number(a.rating) || 0)) * (sortOrder === 'asc' ? -1 : 1));
    } else if (sortField === 'locality') {
      list = [...list].sort((a, b) => (a.area || a.city || '').localeCompare(b.area || b.city || '') * (sortOrder === 'asc' ? 1 : -1));
    }

    return list;
  }, [leads, filter, selectedLocality, search, sortField, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id || `${l.name}-${l.phone}`)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const copyAllMobiles = () => {
    const targetLeads = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id || `${l.name}-${l.phone}`)) 
      : phoneLeads;
    const rawPhones = targetLeads.map(l => {
      const p = getDisplayPhone(l);
      if (!p) return null;
      const digits = String(p).replace(/\D/g, '').slice(-10);
      return digits.length === 10 ? `+91${digits}` : p;
    }).filter(Boolean);
    const unique = [...new Set(rawPhones)];
    if (!unique.length) {
      toast.error('No phone numbers in selection.');
      return;
    }
    navigator.clipboard.writeText(unique.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success(`Copied ${unique.length} verified mobile numbers!`);
  };

  const downloadPhoneListTxt = () => {
    const targetLeads = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id || `${l.name}-${l.phone}`)) 
      : phoneLeads;
    const rawPhones = targetLeads.map(l => {
      const p = getDisplayPhone(l);
      if (!p) return null;
      const digits = String(p).replace(/\D/g, '').slice(-10);
      return digits.length === 10 ? `+91${digits}` : p;
    }).filter(Boolean);
    const unique = [...new Set(rawPhones)];
    if (!unique.length) {
      toast.error('No phone numbers to export.');
      return;
    }
    const blob = new Blob([unique.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session?.id || 'folder'}_mobiles.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${unique.length} mobile numbers (.txt)`);
  };

  const downloadVcfContacts = () => {
    const targetLeads = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id || `${l.name}-${l.phone}`)) 
      : phoneLeads;
    if (!targetLeads.length) {
      toast.error('No leads with phone numbers to export.');
      return;
    }
    const cards = targetLeads.map(l => {
      const p = getDisplayPhone(l);
      if (!p) return null;
      const digits = String(p).replace(/\D/g, '').slice(-10);
      const phoneNum = digits.length === 10 ? `+91${digits}` : p;
      const cleanName = (l.name || 'Business Contact').replace(/[;,\n]/g, ' ');
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${cleanName}\nORG:${cleanName}\nTEL;TYPE=CELL,VOICE:${phoneNum}\nNOTE:${l.category || ''} - ${[l.area, l.city].filter(Boolean).join(', ')}\nEND:VCARD`;
    }).filter(Boolean).join('\n');
    
    const blob = new Blob([cards], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session?.id || 'folder'}_contacts.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${targetLeads.length} phone contacts (.vcf) ready for Android / iPhone!`);
  };

  const exportSelectedCsv = () => {
    const rows = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id || `${l.name}-${l.phone}`))
      : filtered;
    if (!rows.length) {
      toast.error('No rows to export.');
      return;
    }
    const headers = ['Business Name', 'Category', 'Phone', 'Verified Mobile', 'Area', 'City', 'District', 'Rating', 'Reviews Count', 'Website', 'CRM Stage'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const phone = getDisplayPhone(r) || '';
      const cleanDigits = phone.replace(/\D/g, '').slice(-10);
      const isMob = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
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
        `"${(r.website || '').replace(/"/g, '""')}"`,
        `"${crmStageOf(r)}"`
      ];
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session?.id || 'folder'}_leads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows to CSV!`);
  };

  const handleBulkStageChange = (newStage) => {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    leads.forEach(l => {
      const id = l.id || `${l.name}-${l.phone}`;
      if (selectedIds.has(id)) {
        onStageChange?.(l, newStage);
      }
    });
    toast.success(`Updated ${count} leads to stage "${newStage}".`);
    setSelectedIds(new Set());
  };

  return (
    <div className="v2-folder-modal" role="dialog" aria-modal="true" aria-label={`Folder: ${session?.name || ''}`}>
      <div className="v2-folder-modal-card">
        {/* Top Header Strip */}
        <header className="v2-folder-header">
          <div className="v2-folder-header-info">
            <div className="v2-folder-header-title-row">
              <span className="v2-folder-mark-badge"><FolderArchive size={18} /></span>
              <h2>{session?.name || `${session?.category || 'Search'} in ${session?.location || 'India'}`}</h2>
              {isMasterSweep && (
                <span className="v2-master-sweep-pill">
                  <Compass size={11} /> MASTER GEO ARCHIVE
                </span>
              )}
            </div>
            <div className="v2-folder-header-meta">
              <span className="v2-meta-badge"><MapPin size={11} /> {session?.location || 'India'}</span>
              <span className="v2-meta-badge"><Users size={11} /> <b>{formatNumber(leads.length)}</b> leads</span>
              <span className="v2-meta-badge is-highlight"><Phone size={11} /> <b>{formatNumber(phoneLeads.length)}</b> verified mobiles ({percentMobiles}%)</span>
              <span className="v2-meta-badge"><Globe2 size={11} /> <b>{formatNumber(webLeads.length)}</b> websites</span>
              <span className="v2-meta-badge"><Star size={11} /> <b>{formatNumber(ratedLeads.length)}</b> rated 4.0+</span>
              <span className="v2-meta-id" title="Click to copy folder ID" onClick={() => { navigator.clipboard.writeText(session?.id || ''); toast.success('Copied folder ID!'); }}>
                <code>{session?.id}</code>
                <Copy size={9} />
              </span>
              <span className="v2-meta-time">{relativeTime(session?.timestamp)}</span>
            </div>
          </div>

          <div className="v2-folder-top-actions">
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => onRename?.(view.run || session)}
              title="Rename folder, change campaign tags or color"
            >
              <Edit3 size={12} /> Rename &amp; Tag
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-lime v2-btn-sm"
              onClick={() => onLoadToCockpit?.(view.run, session)}
              title="Load this folder into active Cockpit workspace"
            >
              <Play size={12} /> Load in Cockpit
            </button>
            <button
              type="button"
              className="v2-icon-btn"
              onClick={onClose}
              aria-label="Close folder"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Quality Scorecard Banner */}
        <div className="v2-folder-scorecard">
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">VERIFIED MOBILES</span>
            <b className="v2-scorecard-value is-lime">
              <Phone size={13} /> {formatNumber(phoneLeads.length)} <small>({percentMobiles}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">RATED 4.0+</span>
            <b className="v2-scorecard-value">
              <Star size={13} /> {formatNumber(ratedLeads.length)} <small>({percentRated}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">WEBSITE / SOCIAL</span>
            <b className="v2-scorecard-value">
              <Globe2 size={13} /> {formatNumber(webLeads.length)} <small>({percentWeb}%)</small>
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">DEALS WON</span>
            <b className="v2-scorecard-value is-gold">
              <CheckCircle2 size={13} /> {formatNumber(wonLeads.length)}
            </b>
          </div>
          <div className="v2-scorecard-item">
            <span className="v2-scorecard-label">PIPELINE VALUE</span>
            <b className="v2-scorecard-value is-cyan">
              {formatInr(pipelineTotal)}
            </b>
          </div>
        </div>

        {/* Master Actions Ribbon — ALL OPTIONS at user's fingertips */}
        <div className="v2-folder-actions-ribbon">
          <div className="v2-ribbon-group">
            <span className="v2-ribbon-label">OUTREACH &amp; EXPORT:</span>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={copyAllMobiles}
              title="Copy all phone numbers comma-separated for bulk outreach"
            >
              {copied ? <Check size={11} className="v2-text-lime" /> : <Copy size={11} />}
              {copied ? 'Copied!' : `Copy Mobiles (${selectedIds.size > 0 ? selectedIds.size : phoneLeads.length})`}
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'dialer')}
              title="Download Vicidial / Exotel telecaller dialer CSV"
            >
              <PhoneCall size={11} /> Dialer CSV
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'vcf')}
              title="Download vCard (.vcf) contacts file to import on Android / iPhone"
            >
              <Smartphone size={11} /> Contacts .VCF
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'txt')}
              title="Download plain phone numbers list (.txt)"
            >
              <FileText size={11} /> Mobiles .TXT
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => (selectedIds.size > 0 ? exportSelectedCsv() : onExport?.(view.run, 'csv'))}
              title="Download clean CSV spreadsheet without scientific notation"
            >
              <Download size={11} /> Spreadsheet CSV
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onExport?.(view.run, 'json')}
              title="Download structured JSON"
            >
              <FileSpreadsheet size={11} /> JSON
            </button>
          </div>

          <div className="v2-ribbon-group is-right">
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onReScrape?.(view.run)}
              title="Re-scrape this query with 5km Radar Swarm"
            >
              <RefreshCw size={11} /> Re-Scrape Swarm
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-danger v2-btn-xs"
              onClick={() => onDelete?.(view.run)}
              title="Permanently delete this folder"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>

        {/* Filter and View Mode Toolbar */}
        <div className="v2-folder-toolbar">
          <div className="v2-folder-search-wrap">
            <Search size={13} className="v2-search-icon" />
            <input
              type="search"
              placeholder="Search leads in folder (business, area, phone)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="v2-folder-search-input"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="v2-search-clear">
                <X size={12} />
              </button>
            )}
          </div>

          {/* 4 View Modes */}
          <div className="v2-folder-view-toggle">
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'table' && 'is-active')}
              onClick={() => setViewMode('table')}
              title="Full interactive spreadsheet table"
            >
              <Table2 size={12} /> Table ({filtered.length})
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'map' && 'is-active')}
              onClick={() => setViewMode('map')}
              title="Interactive map with lead pins"
            >
              <MapPin size={12} /> Map Radar
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'telecaller' && 'is-active')}
              onClick={() => setViewMode('telecaller')}
              title="Fast speed-dial & WhatsApp cards for outreach"
            >
              <PhoneCall size={12} /> Telecaller Cards ({phoneLeads.length})
            </button>
            <button
              type="button"
              className={cx('v2-vtoggle-btn', viewMode === 'analytics' && 'is-active')}
              onClick={() => setViewMode('analytics')}
              title="Locality & conversion analytics"
            >
              <BarChart3 size={12} /> Analytics
            </button>
          </div>

          {/* Quick Filters */}
          <div className="v2-folder-filter-pills">
            <button
              type="button"
              className={cx('v2-fpill', filter === 'all' && 'is-active')}
              onClick={() => setFilter('all')}
            >
              All <b>{leads.length}</b>
            </button>
            <button
              type="button"
              className={cx('v2-fpill', filter === 'phone' && 'is-active')}
              onClick={() => setFilter('phone')}
            >
              <Phone size={10} /> Mobiles <b>{phoneLeads.length}</b>
            </button>
            <button
              type="button"
              className={cx('v2-fpill', filter === 'website' && 'is-active')}
              onClick={() => setFilter('website')}
            >
              <Globe2 size={10} /> Web <b>{webLeads.length}</b>
            </button>
            <button
              type="button"
              className={cx('v2-fpill', filter === 'rated' && 'is-active')}
              onClick={() => setFilter('rated')}
            >
              <Star size={10} /> 4.0+ <b>{ratedLeads.length}</b>
            </button>
          </div>
        </div>

        {/* Locality Quick Chips Strip (if multiple localities found) */}
        {localityStats.length > 1 && (
          <div className="v2-folder-locality-strip">
            <span className="v2-locality-strip-title">{isMasterSweep ? '🗺️ MANDALS & ZONES (' + localityStats.length + ' COVERED):' : 'AREAS:'}</span>
            <button
              type="button"
              className={cx('v2-loc-chip', selectedLocality === 'all' && 'is-active')}
              onClick={() => setSelectedLocality('all')}
            >
              All Areas ({leads.length})
            </button>
            {localityStats.map(([locName, count]) => (
              <button
                type="button"
                key={locName}
                className={cx('v2-loc-chip', selectedLocality === locName && 'is-active')}
                onClick={() => setSelectedLocality(selectedLocality === locName ? 'all' : locName)}
              >
                {locName} <b>({count})</b>
              </button>
            ))}
          </div>
        )}

        {/* Bulk Selection Bar */}
        {selectedIds.size > 0 && (
          <div className="v2-folder-bulk-bar">
            <span><b>{selectedIds.size}</b> leads selected</span>
            <div className="v2-bulk-actions">
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={copyAllMobiles}>
                <Copy size={11} /> Copy Mobiles ({selectedIds.size})
              </button>
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={exportSelectedCsv}>
                <Download size={11} /> Export Selected CSV
              </button>
              <button type="button" className="v2-btn v2-btn-xs v2-btn-ghost" onClick={downloadVcfContacts}>
                <Smartphone size={11} /> Export .VCF
              </button>
              <div className="v2-bulk-stage-wrap">
                <span>Set Stage:</span>
                <select onChange={e => { if (e.target.value) handleBulkStageChange(e.target.value); }}>
                  <option value="">Choose Stage...</option>
                  {CRM_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="v2-bulk-clear" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Content Area: Table / Map / Telecaller / Analytics */}
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

          {viewMode === 'telecaller' && (
            <div className="v2-folder-telecaller-grid">
              {filtered.map((lead, index) => {
                const phone = getDisplayPhone(lead);
                const cleanDigits = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
                const isMob = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
                const stage = crmStageOf(lead);
                const leadId = lead.id || `${lead.name}-${phone}`;
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
                        <b className="v2-tc-name">{lead.name || 'Unknown Business'}</b>
                        <small className="v2-tc-cat">
                          {[lead.area, lead.city || lead.village].filter(Boolean).join(', ') || 'Local'}
                          {lead.rating != null && (
                            <span className="v2-tc-star">★ {Number(lead.rating).toFixed(1)}</span>
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="v2-tc-actions">
                      {phone ? (
                        <>
                          <a href={`tel:${phone}`} className="v2-tc-btn-call" title="Click to call">
                            <PhoneCall size={12} />
                            <span>{phone}</span>
                          </a>
                          {isMob && (
                            <a
                              href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(`Hi ${lead.name || 'there'}, I found your business listing and wanted to connect.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="v2-tc-btn-wa"
                              title="1-Click WhatsApp outreach"
                            >
                              <MessageSquare size={12} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="v2-tc-nophone">No direct phone listed</span>
                      )}
                    </div>

                    <div className="v2-tc-footer">
                      <span className="v2-tc-stage-label">Stage:</span>
                      <select
                        className={cx('v2-stage-select', `stage-${stage}`)}
                        value={stage}
                        onChange={e => onStageChange?.(lead, e.target.value)}
                      >
                        {CRM_STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="v2-tc-inspect-btn"
                        onClick={() => { onClose(); onSelectVendor?.(lead); }}
                        title="View complete vendor profile"
                      >
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!filtered.length && (
                <div className="v2-folder-empty">
                  {search ? `No leads matching "${search}".` : 'No leads found in this filter.'}
                </div>
              )}
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="v2-folder-analytics-view">
              <div className="v2-analytics-top-grid">
                <div className="v2-analytics-card">
                  <span className="v2-an-title">MOBILE VERIFICATION RATE</span>
                  <div className="v2-an-big-stat">
                    <b>{percentMobiles}%</b>
                    <span>{phoneLeads.length} of {leads.length} leads have direct mobile numbers</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill" style={{ width: `${percentMobiles}%` }} />
                  </div>
                </div>

                <div className="v2-analytics-card">
                  <span className="v2-an-title">ONLINE PRESENCE</span>
                  <div className="v2-an-big-stat">
                    <b>{leads.length ? Math.round((webLeads.length / leads.length) * 100) : 0}%</b>
                    <span>{webLeads.length} leads have an official website listed</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill is-cyan" style={{ width: `${leads.length ? (webLeads.length / leads.length) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="v2-analytics-card">
                  <span className="v2-an-title">HIGH RATING CONCENTRATION</span>
                  <div className="v2-an-big-stat">
                    <b>{leads.length ? Math.round((ratedLeads.length / leads.length) * 100) : 0}%</b>
                    <span>{ratedLeads.length} leads rated 4.0 stars or higher</span>
                  </div>
                  <div className="v2-an-bar-wrap">
                    <div className="v2-an-bar-fill is-amber" style={{ width: `${leads.length ? (ratedLeads.length / leads.length) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="v2-analytics-localities-card">
                <span className="v2-an-title">GEOGRAPHIC DISTRIBUTION (TOP LOCALITIES IN FOLDER)</span>
                <div className="v2-an-locality-list">
                  {localityStats.map(([name, count]) => {
                    const pct = Math.round((count / (leads.length || 1)) * 100);
                    return (
                      <div key={name} className="v2-an-loc-row">
                        <span className="v2-an-loc-name"><MapPin size={11} /> {name}</span>
                        <div className="v2-an-loc-progress">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="v2-an-loc-count"><b>{count}</b> leads ({pct}%)</span>
                      </div>
                    );
                  })}
                  {!localityStats.length && <p className="v2-muted">No specific localities detected.</p>}
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
                        title="Select all leads"
                      />
                    </th>
                    <th>BUSINESS</th>
                    <th>LOCALITY</th>
                    <th>VERIFIED CONTACT</th>
                    <th>WEBSITE</th>
                    <th>CRM STAGE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, index) => {
                    const phone = getDisplayPhone(lead);
                    const cleanDigits = phone ? String(phone).replace(/\D/g, '').slice(-10) : '';
                    const isMob = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
                    const stage = crmStageOf(lead);
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
                              <b>{lead.name || 'Unknown Business'}</b>
                              <small className="v2-cp-cat">
                                {lead.category || session?.category || 'Service'}
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
                            {[lead.area, lead.city || lead.village, lead.district].filter(Boolean).join(', ') || '—'}
                          </span>
                        </td>
                        <td>
                          {phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <a href={`tel:${phone}`} className="v2-phone-link" onClick={e => e.stopPropagation()}>
                                <Phone size={11} /> {phone}
                              </a>
                              {isMob && (
                                <a
                                  href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(`Hi ${lead.name || 'there'}, I found your business and wanted to connect.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="v2-whatsapp-chip"
                                  title="1-Click WhatsApp"
                                  onClick={e => e.stopPropagation()}
                                >
                                  WhatsApp
                                </a>
                              )}
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
                              <Globe2 size={11} /> Website
                            </a>
                          ) : (
                            <span className="v2-muted">—</span>
                          )}
                        </td>
                        <td>
                          <select
                            className={cx('v2-stage-select', `stage-${stage}`)}
                            value={stage}
                            onChange={e => onStageChange?.(lead, e.target.value)}
                          >
                            {CRM_STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="v2-folder-row-inspect"
                            onClick={() => {
                              onClose();
                              onSelectVendor?.(lead);
                            }}
                            title="Inspect full vendor profile"
                          >
                            Inspect <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filtered.length && (
                <div className="v2-folder-empty">
                  {search ? `No leads matching "${search}".` : 'This folder has no saved leads yet.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = CircleDot, title, body, action, actionLabel }) {
  return (
    <div className="v2-empty-state">
      <span><Icon size={22} /></span>
      <b>{title}</b>
      <p>{body}</p>
      {action && <button type="button" className="v2-btn v2-btn-lime" onClick={action}>{actionLabel || 'Continue'} <ArrowRight size={14} /></button>}
    </div>
  );
}

function MapLegend() {
  return (
    <div className="v2-map-legend">
      <span><i className="pin-verified" /> verified</span>
      <span><i className="pin-phone" /> phone found</span>
      <span><i className="pin-cold" /> no phone</span>
      <span><i className="pin-zone" /> coverage zone</span>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Cockpit: everything on one screen — folders + CRM | live leads | live map  */
/* ------------------------------------------------------------------------- */

function CockpitFolderRow({ run, active, loading, onOpen, onExport }) {
  return (
    <div className={cx('v2-cp-folder', active && 'is-active')}>
      <button type="button" className="v2-cp-folder-main" onClick={onOpen} disabled={loading} title={`Open ${run.id}`}>
        <span className={cx('v2-cp-folder-dot', run.status === 'running' ? 'is-live' : run.status === 'aborted' ? 'is-aborted' : 'is-ready')} />
        <span>
          <b>{run.name || run.category}</b>
          <small>{run.location} · {formatNumber(run.leadCount)} leads ({formatNumber(run.phoneCount)} mobiles)</small>
        </span>
        {loading ? <Loader2 size={12} className="v2-spin" /> : <ChevronRight size={13} />}
      </button>
      <div className="v2-cp-folder-tools">
        <button type="button" onClick={() => onExport?.(run, 'csv')} title="Download CSV"><Download size={11} /> CSV</button>
        <span>{relativeTime(run.timestamp)}</span>
      </div>
    </div>
  );
}

function CockpitView({
  vendors,
  filteredVendors,
  pageRows,
  filters,
  onFilterChange,
  runs,
  sessionFilter,
  folderLoading,
  onOpenFolder,
  onExportFolder,
  crmSavingId,
  onStageChange,
  onSelectVendor,
  onTab,
  mapZones,
  activeZone,
  scanning,
  mapCenter,
  mapZoom,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
  run,
  stats
}) {
  const stageCounts = useMemo(() => {
    const map = {};
    CRM_STAGES.forEach(stage => { map[stage.id] = 0; });
    vendors.forEach(vendor => {
      const stage = crmStageOf(vendor);
      map[stage] = (map[stage] || 0) + 1;
    });
    return map;
  }, [vendors]);

  const plotted = filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length;
  const recentRuns = runs.slice(0, 6);

  return (
    <div className="v2-cockpit">
      {/* LEFT: folders + CRM */}
      <aside className="v2-cockpit-col v2-cp-left">
        <section className="v2-cp-panel v2-cp-folders">
          <header className="v2-cp-head">
            <span><FolderArchive size={13} /> FOLDERS <b>{formatNumber(runs.length)}</b></span>
            <button type="button" onClick={() => onTab('runs')} title="Open all folders">All</button>
          </header>
          <div className="v2-cp-folder-list">
            {recentRuns.map(runCard => (
              <CockpitFolderRow
                key={runCard.id}
                run={runCard}
                active={sessionFilter === runCard.id || run?.id === runCard.id}
                loading={folderLoading === runCard.id}
                onOpen={() => onOpenFolder(runCard)}
                onExport={onExportFolder}
              />
            ))}
            {!recentRuns.length && (
              <p className="v2-cp-empty">No folders yet. Your first search is saved automatically.</p>
            )}
          </div>
        </section>

        <section className="v2-cp-panel v2-cp-crm">
          <header className="v2-cp-head">
            <span><Users size={13} /> PIPELINE</span>
            <button type="button" onClick={() => onTab('crm')} title="Open CRM board">Board</button>
          </header>
          <div className="v2-cp-crm-list">
            {CRM_STAGES.map(stage => (
              <button
                type="button"
                key={stage.id}
                className={cx('v2-cp-crm-row', `stage-${stage.id}`)}
                onClick={() => onTab('crm')}
                title={`${stage.label}: open the CRM board`}
              >
                <i />
                <span>{stage.label}</span>
                <b>{formatNumber(stageCounts[stage.id] || 0)}</b>
              </button>
            ))}
          </div>
          <footer className="v2-cp-crm-foot">
            <span>Qualified <b>{formatNumber(stageCounts.qualified || 0)}</b></span>
            <span>Won <b>{formatNumber(stageCounts.won || 0)}</b></span>
          </footer>
        </section>
      </aside>

      {/* CENTER: live leads */}
      <section className="v2-cockpit-col v2-cp-center">
        <div className="v2-cp-center-head">
          <span className="v2-cp-title">
            <CircleDot size={13} className={scanning ? 'v2-cp-live' : ''} />
            LIVE LEADS
            <b>{formatNumber(filteredVendors.length)}</b>
          </span>
          <span className="v2-cp-sub">
            {formatNumber(stats.phones)} mobiles · {stats.avg}% profile quality
          </span>
        </div>

        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          total={vendors.length}
          shown={filteredVendors.length}
          compact
        />

        <div className="v2-cp-table">
          <table className="v2-lead-table">
            <thead>
              <tr>
                <th>BUSINESS</th>
                <th>CONTACT</th>
                <th>STAGE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((vendor, index) => {
                const stage = crmStageOf(vendor);
                const quality = qualityOf(vendor);
                const locality = vendor.city || vendor.village || vendor.district || 'Unknown';
                return (
                  <tr
                    key={vendor.id}
                    className="v2-lead-animated-row"
                    style={{ animationDelay: `${Math.min(index * 35, 600)}ms` }}
                    onClick={() => onSelectVendor(vendor)}
                  >
                    <td>
                      <div className="v2-vendor-cell">
                        <VendorAvatar vendor={vendor} size={32} />
                        <span>
                          <b>{vendor.name || 'Unknown vendor'}</b>
                          <small className="v2-cp-cat">
                            {vendor.category || 'Business'} <i>·</i> {locality}
                          </small>
                        </span>
                        {quality != null && <em className="v2-cp-q">{quality}%</em>}
                        {vendor.verified && <CheckCircle2 size={12} className="v2-verified-icon" />}
                      </div>
                    </td>
                    <td>
                      <div className="v2-contact-cell">
                        {(() => {
                          const activePhone = getDisplayPhone(vendor);
                          if (!activePhone) return <span className="v2-muted">No mobile yet</span>;
                          const cleanDigits = String(activePhone).replace(/\D/g, '').slice(-10);
                          const isMob = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <a href={`tel:${activePhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: isMob ? '#22d3ee' : '#cbd5e1' }} onClick={event => event.stopPropagation()}>
                                <Phone size={11} /> {activePhone}
                              </a>
                              {isMob && (
                                <a
                                  href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(`Hi ${vendor.name || 'there'}, I found your business on scraper.co.in and wanted to connect.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    textDecoration: 'none',
                                    fontWeight: 700
                                  }}
                                  onClick={event => event.stopPropagation()}
                                  title="Open WhatsApp Chat"
                                >
                                  WA
                                </a>
                              )}
                            </div>
                          );
                        })()}
                        <span className="v2-contact-sub">
                          {vendor.website
                            ? <a href={vendor.website} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}><Globe2 size={10} /> site</a>
                            : <em>no site</em>}
                          {vendor.rating != null && (
                            <span className="v2-cp-rating">
                              ★ {Number(vendor.rating).toFixed(1)}
                              {vendor.reviewsCount ? ` (${formatNumber(vendor.reviewsCount)})` : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <select
                        className={cx('v2-stage-select', `stage-${stage}`)}
                        value={stage}
                        onClick={event => event.stopPropagation()}
                        onChange={event => onStageChange(vendor, event.target.value)}
                        disabled={crmSavingId === vendor.id}
                      >
                        {CRM_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="v2-row-actions" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => onSelectVendor(vendor)} title="Open full profile"><ArrowRight size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!pageRows.length && (
            scanning ? (
              <div className="v2-scanning-leads-state">
                <div className="v2-scanning-radar-pulse">
                  <span className="v2-radar-sweep-beam" />
                  <span className="v2-radar-ring r1" />
                  <span className="v2-radar-ring r2" />
                  <span className="v2-radar-ring r3" />
                  <RadarIcon size={26} className="v2-radar-center-icon v2-spin" />
                </div>
                <b className="v2-scanning-leads-title">Ultra-Blazing Multi-Vector Swarm In Progress</b>
                <p className="v2-scanning-leads-desc">
                  Sweeping Geospatial Radar Mesh, Direct Telecom Registry & Deep SERP Index. Direct verified mobile contacts streaming in...
                </p>
                <div className="v2-leads-skeleton-grid">
                  <div className="v2-lead-skeleton-row" />
                  <div className="v2-lead-skeleton-row" />
                  <div className="v2-lead-skeleton-row" />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No leads on screen yet."
                body="Type a category and a city in the search bar above. Verified businesses appear here as each area reports back."
                action={() => onFilterChange({ query: '', phoneOnly: false, websiteOnly: false, deepOnly: false, conflictsOnly: false, minRating: 0, sort: 'newest' })}
                actionLabel="Reset filters"
              />
            )
          )}
        </div>

        <footer className="v2-cp-foot">
          <span>
            {filteredVendors.length
              ? <>Showing <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredVendors.length)}</b> of <b>{formatNumber(filteredVendors.length)}</b></>
              : 'No rows'}
          </span>
          <div className="v2-pagination">
            <select value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>
              {[25, 50, 100].map(size => <option value={size} key={size}>{size} / page</option>)}
            </select>
            <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft size={13} /></button>
            <span>{page} / {pageCount}</span>
            <button type="button" onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}><ChevronRight size={13} /></button>
          </div>
        </footer>
      </section>

      {/* RIGHT: live map */}
      <aside className="v2-cockpit-col v2-cp-right">
        <section className="v2-cp-panel v2-cp-map">
          <header className="v2-cp-head">
            <span><RadarIcon size={13} className={scanning ? 'v2-cp-live' : ''} /> LIVE MAP</span>
            <button type="button" onClick={() => onTab('map')} title="Open the full map">Expand</button>
          </header>
          <div className="v2-cp-map-body">
            <CommandMap
              vendors={filteredVendors}
              zones={mapZones}
              activeZone={activeZone}
              scanning={scanning}
              center={mapCenter}
              zoom={mapZoom}
              height="100%"
              onSelect={vendor => onSelectVendor(vendor)}
            />
          </div>
          <footer className="v2-cp-map-foot">
            <div><span>PLOTTED</span><b>{formatNumber(plotted)}</b></div>
            <div><span>NO COORDS</span><b>{formatNumber(filteredVendors.length - plotted)}</b></div>
            <div><span>ZONES</span><b>{formatNumber(mapZones.length)}</b></div>
          </footer>
        </section>
      </aside>
    </div>
  );
}

function RenameModal({ folder, onClose, onSave }) {
  const [name, setName] = useState(folder?.customName || folder?.name || '');
  const [tags, setTags] = useState(Array.isArray(folder?.tags) ? folder.tags.join(', ') : '');
  const [color, setColor] = useState(folder?.color || '#00f0ff');
  const [notes, setNotes] = useState(folder?.notes || '');
  const [saving, setSaving] = useState(false);

  const COLOR_OPTIONS = ['#00f0ff', '#39ff14', '#ff007f', '#ffaa00', '#a855f7', '#3b82f6'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    await onSave(folder.id, {
      customName: name.trim(),
      tags: parsedTags,
      color,
      notes: notes.trim()
    });
    setSaving(false);
  };

  return (
    <div className="v2-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-dialog-card" onClick={e => e.stopPropagation()}>
        <header className="v2-dialog-head">
          <div className="v2-dialog-title">
            <Edit3 size={16} className="v2-text-cyan" />
            <h3>Folder Settings &amp; Campaign Tags</h3>
          </div>
          <button type="button" className="v2-icon-btn" onClick={onClose}><X size={16} /></button>
        </header>

        <form onSubmit={handleSubmit} className="v2-dialog-form">
          <label className="v2-dialog-field">
            <span>Folder Display Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Hyderabad Q1 Plumbers Outreach"
              required
              autoFocus
            />
          </label>

          <label className="v2-dialog-field">
            <span>Campaign Tags (comma separated)</span>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. Priority, Cold Call, Telugu, Central Zone"
            />
          </label>

          <div className="v2-dialog-field">
            <span>Campaign Color Badge</span>
            <div className="v2-color-picker-row">
              {COLOR_OPTIONS.map(c => (
                <button
                  type="button"
                  key={c}
                  className={cx('v2-color-dot', color === c && 'is-active')}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <label className="v2-dialog-field">
            <span>Campaign Notes / Strategy</span>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Pitched on WhatsApp Tuesday. Target 50 calls daily."
            />
          </label>

          <footer className="v2-dialog-actions">
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-lime v2-btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="v2-spin" /> : <Check size={13} />}
              <span>Save Folder</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function MergeModal({ folders, onClose, onMerge, isMerging }) {
  const sample = folders[0];
  const [title, setTitle] = useState(
    `Merged: ${sample?.category || 'Leads'} (${folders.length} folders)`
  );
  const totalRawLeads = folders.reduce((sum, f) => sum + (f.leadCount || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || isMerging) return;
    onMerge(title.trim());
  };

  return (
    <div className="v2-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-dialog-card" onClick={e => e.stopPropagation()}>
        <header className="v2-dialog-head">
          <div className="v2-dialog-title">
            <GitMerge size={16} className="v2-text-lime" />
            <h3>Merge &amp; Deduplicate Folders</h3>
          </div>
          <button type="button" className="v2-icon-btn" onClick={onClose}><X size={16} /></button>
        </header>

        <form onSubmit={handleSubmit} className="v2-dialog-form">
          <p className="v2-dialog-desc">
            Combine <b>{folders.length} folders</b> ({formatNumber(totalRawLeads)} raw leads) into a single consolidated search vault.
            Identical phone numbers and business names will be automatically deduplicated with merged metadata.
          </p>

          <div className="v2-merge-folders-list">
            {folders.map(f => (
              <div key={f.id} className="v2-merge-folder-row">
                <FolderArchive size={14} />
                <span className="v2-merge-folder-name">{f.customName || f.name}</span>
                <span className="v2-merge-folder-count">{formatNumber(f.leadCount)} leads · {formatNumber(f.phoneCount)} mobiles</span>
              </div>
            ))}
          </div>

          <label className="v2-dialog-field">
            <span>New Merged Folder Title</span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Master Consolidated Outreach Vault"
              required
            />
          </label>

          <footer className="v2-dialog-actions">
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="v2-btn v2-btn-lime v2-btn-sm" disabled={isMerging || !title.trim()}>
              {isMerging ? <Loader2 size={13} className="v2-spin" /> : <GitMerge size={13} />}
              <span>Merge &amp; Deduplicate</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [health, setHealth] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [deepJobs, setDeepJobs] = useState([]);
  const [activeTab, setActiveTabState] = useState(() => tabFromUrl(searchParams.get('tab')));
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Tab state is mirrored to the URL. This keeps deep links, refreshes and the
  // browser back button working across the merged workspace.
  const setActiveTab = useCallback(tab => {
    const next = tab || 'cockpit';
    setActiveTabState(next);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('tab', urlFromTab(next));
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const fromUrl = tabFromUrl(searchParams.get('tab'));
    setActiveTabState(prev => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    const onDown = event => {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const [logs, setLogs] = useState(['[BOOT] command center initialised.', '[WAIT] connecting to backend signal…']);
  const [sseStatus, setSseStatus] = useState('connecting');
  const [progress, setProgress] = useState(null);
  const [runLeadCount, setRunLeadCount] = useState(0);
  const [run, setRun] = useState(null);
  const [deepJob, setDeepJob] = useState(null);
  const [vendorJobs, setVendorJobs] = useState({});
  const [now, setNow] = useState(Date.now());
  const [crmSavingId, setCrmSavingId] = useState('');
  const [folderView, setFolderView] = useState(null);
  const [folderLoading, setFolderLoading] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [folderCity, setFolderCity] = useState('all');
  const [folderSort, setFolderSort] = useState('newest');
  const [runsSubTab, setRunsSubTab] = useState('client'); // 'client' | 'master'
  const [masterSweepForm, setMasterSweepForm] = useState({ category: '', name: '', scope: 'district' });
  const [masterLaunching, setMasterLaunching] = useState(false);

  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const [form, setForm] = useState({
    category: 'Plumbers',
    location: 'Vijayawada',
    strategy: 'broad',
    targetLeads: 100,
    serp: true,
    maps: true,
    ai: false,
    justdial: true,
    indiamart: false,
    weddings: false,
    social: false,
    postWebsite: true,
    postDeep: true,
    deepLimit: 100
  });

  // The default flow is one free-text query. Category, engines, zones and
  // post-run deep extraction are resolved server-side by the category router.
  const [runMode, setRunMode] = useState('auto');
  const [autoQuery, setAutoQuery] = useState(
    routerLocation.state?.query || 'Plumbers in Vijayawada'
  );
  const [activeZone, setActiveZone] = useState(null);
  const [gridZones, setGridZones] = useState([]);
  const [scanning, setScanning] = useState(false);

  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(true);
  const [estimateError, setEstimateError] = useState('');
  const [deepEstimate, setDeepEstimate] = useState(null);
  const [scanPlan, setScanPlan] = useState(null);

  const [filters, setFilters] = useState({
    query: '',
    phoneOnly: false,
    websiteOnly: false,
    deepOnly: false,
    conflictsOnly: false,
    minRating: 0,
    sort: 'newest'
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sessionFilter, setSessionFilter] = useState('');

  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [batchStarting, setBatchStarting] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ limit: 100, website: true, google: true });

  const mountedRef = useRef(true);
  const runRef = useRef(null);
  const runVendorIdsRef = useRef(new Set());
  const lastEventRef = useRef(Date.now());
  const finishingRef = useRef(false);
  const deepJobRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => { deepJobRef.current = deepJob; }, [deepJob]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const data = await getVendors();
      if (mountedRef.current) setVendors(data);
      return data;
    } catch (error) {
      return [];
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      if (mountedRef.current) setHealth(data);
      return data;
    } catch (error) {
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.allSettled([loadVendors(), loadHealth()]);
    try {
      const [sessionData, deepData] = await Promise.all([
        getSessions(), getDeepJobs()
      ]);
      if (!mountedRef.current) return;
      setSessions(sessionData || []);
      setDeepJobs(deepData || []);
      const runningDeep = (deepData || []).find(job => ['queued', 'running', 'stopping'].includes(job.status));
      if (runningDeep && !deepJobRef.current) setDeepJob(runningDeep);
    } catch (error) {
      // Keep the last good state.
    }
  }, [loadVendors, loadHealth]);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      getDeepJobs().then(deepData => {
        if (!mountedRef.current) return;
        setDeepJobs(deepData || []);
      }).catch(() => { });
    }, 9000);
    return () => clearInterval(id);
  }, [refresh]);

  // Live estimate. Auto mode parses the free-text query server-side, so the
  // same sentence that starts a run also drives the pre-flight numbers.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const auto = runMode === 'auto';
      if (auto && !autoQuery.trim()) {
        setEstimating(false);
        return;
      }
      if (!auto && !form.location.trim()) {
        setEstimating(false);
        return;
      }

      const engines = ['auto'];

      setEstimating(true);
      setEstimateError('');
      try {
        const data = await getEstimate(auto
          ? {
            query: autoQuery,
            strategy: form.strategy,
            targetLeads: form.targetLeads,
            engines: ['auto']
          }
          : {
            category: form.category || 'Business',
            location: form.location,
            strategy: form.strategy,
            targetLeads: form.targetLeads,
            engines
          });
        if (mountedRef.current) setEstimate(data);
      } catch (error) {
        if (mountedRef.current) setEstimateError('Estimator offline. Check the backend on port 5002.');
      } finally {
        if (mountedRef.current) setEstimating(false);
      }
    }, 420);
    return () => clearTimeout(timer);
  }, [
    runMode, autoQuery, form.category, form.location, form.strategy,
    form.targetLeads, form.serp, form.maps, form.postWebsite, form.postDeep
  ]);

  useEffect(() => {
    const unextracted = vendors.filter(vendor => !vendor.deepExtractedAt).length;
    setDeepEstimate({
      count: unextracted,
      seconds: Math.ceil(Math.max(1, unextracted) / 2) * 22,
      label: formatDuration(Math.ceil(Math.max(1, unextracted) / 2) * 22)
    });
  }, [vendors]);

  // SSE: logs, vendor events, progress.
  useEffect(() => {
    let es;
    let flushTimer;
    let bufferTimer;
    const vendorBuffer = [];
    const logBuffer = [];

    const pushLog = line => {
      if (!line) return;
      logBuffer.push(typeof line === 'string' ? line : JSON.stringify(line));
      lastEventRef.current = Date.now();
    };

    try {
      es = new EventSource(streamUrl());
      setSseStatus('connecting');
      es.addEventListener('open', () => setSseStatus('open'));
      es.addEventListener('error', () => setSseStatus('error'));

      es.addEventListener('init', event => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) setLogs(data.slice(-400));
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('vendor', event => {
        try {
          const payload = JSON.parse(event.data);
          const vendor = payload?.vendor;
          if (!vendor || !vendor.id) return;
          if (payload.action === 'out-of-bounds') return;
          lastEventRef.current = Date.now();
          vendorBuffer.push(vendor);
          if (runRef.current?.status === 'running') {
            runVendorIdsRef.current.add(vendor.id);
            setRunLeadCount(runVendorIdsRef.current.size);
          }
          pushLog(`[LEAD] ${vendor.name || vendor.id} · ${vendor.phone || 'no phone'} · ${vendor.city || vendor.village || 'location unknown'}`);
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('progress', event => {
        try {
          const data = JSON.parse(event.data);
          lastEventRef.current = Date.now();
          setProgress(data);
          if (typeof data?.sessionActive === 'boolean') {
            setScanning(Boolean(data.sessionActive));
          }
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('dispatch_targets', event => {
        try {
          const targets = JSON.parse(event.data);
          if (Array.isArray(targets) && targets.length) pushLog(`[DISPATCH] ${targets.length} zone targets armed: ${targets.slice(0, 5).join(', ')}${targets.length > 5 ? '…' : ''}`);
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('grid_points', event => {
        try {
          const points = JSON.parse(event.data);
          const grid = Array.isArray(points) ? points : [];
          const zoneEntry = grid.find(item => Array.isArray(item.zones) && item.zones.length);
          if (zoneEntry) {
            setGridZones(zoneEntry.zones);
            pushLog(`[GRID] ${zoneEntry.zones.length} coverage zones anchored.`);
          } else if (grid.length) {
            pushLog(`[GRID] ${grid.length} geocoded grid points received.`);
          }
        } catch (error) { /* ignore */ }
      });

      es.addEventListener('active_point', event => {
        try {
          const point = JSON.parse(event.data);
          if (!point || point.completed) return;
          const lat = Number(point.lat);
          const lng = Number(point.lng);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
          if (point.zoneName) {
            setActiveZone(prev => ({
              name: point.zoneName,
              lat: hasCoords ? lat : prev?.lat,
              lng: hasCoords ? lng : prev?.lng
            }));
            pushLog(`[ZONE] searching ${point.zoneName}`);
          }
          setScanning(true);
          lastEventRef.current = Date.now();
        } catch (error) { /* ignore */ }
      });

      es.onmessage = event => pushLog(event.data);

      flushTimer = setInterval(() => {
        if (vendorBuffer.length) {
          const incoming = vendorBuffer.splice(0, vendorBuffer.length);
          setVendors(prev => {
            const map = new Map(prev.map(vendor => [vendor.id, vendor]));
            const existingIds = prev.map(vendor => vendor.id);
            const freshIds = [];
            let hasChanges = false;

            incoming.forEach(v => {
              if (!v || !v.id) return;
              const existing = map.get(v.id);
              if (existing) {
                const existingPhone = getDisplayPhone(existing);
                const incomingPhone = getDisplayPhone(v);
                const isIncomingMob = incomingPhone && /^[6-9]\d{9}$/.test(incomingPhone.replace(/\D/g, '').slice(-10));
                const isExistingMob = existingPhone && /^[6-9]\d{9}$/.test(existingPhone.replace(/\D/g, '').slice(-10));

                let mergedPhone = existing.phone;
                if (isIncomingMob) mergedPhone = incomingPhone;
                else if (isExistingMob) mergedPhone = existingPhone;
                else if (incomingPhone) mergedPhone = incomingPhone;

                const mergedPhones = Array.from(new Set([
                  ...(Array.isArray(existing.phones) ? existing.phones : (existing.phone ? [existing.phone] : [])),
                  ...(Array.isArray(v.phones) ? v.phones : (v.phone ? [v.phone] : []))
                ])).filter(Boolean);

                map.set(v.id, {
                  ...existing,
                  ...v,
                  phone: mergedPhone,
                  phones: mergedPhones.length ? mergedPhones : (mergedPhone ? [mergedPhone] : []),
                  website: v.website || existing.website,
                  email: v.email || existing.email,
                  emails: (Array.isArray(v.emails) && v.emails.length) ? v.emails : existing.emails,
                  address: v.address || existing.address,
                  crmStage: existing.crmStage || v.crmStage || 'new',
                  crmStatus: existing.crmStatus || v.crmStatus || 'new',
                  crmNotes: existing.crmNotes || v.crmNotes,
                  crmTasks: existing.crmTasks || v.crmTasks
                });
                hasChanges = true;
              } else {
                map.set(v.id, v);
                freshIds.push(v.id);
                hasChanges = true;
              }
            });
            if (!hasChanges) return prev;
            const fullOrder = [...freshIds, ...existingIds.filter(id => !freshIds.includes(id))];
            return fullOrder.map(id => map.get(id)).filter(Boolean);
          });
        }
        if (logBuffer.length) {
          const incoming = logBuffer.splice(0, logBuffer.length);
          setLogs(prev => [...prev, ...incoming].slice(-400));
        }
      }, 420);

      bufferTimer = setInterval(() => {
        lastEventRef.current = Date.now();
      }, 15000);
    } catch (error) {
      setSseStatus('error');
    }

    return () => {
      if (flushTimer) clearInterval(flushTimer);
      if (bufferTimer) clearInterval(bufferTimer);
      if (es) es.close();
    };
  }, []);

  const finishRun = useCallback(async status => {
    const current = runRef.current;
    if (!current || current.status !== 'running' || finishingRef.current) return;
    finishingRef.current = true;

    const finishedAt = Date.now();
    setRun(prev => prev ? { ...prev, status, finishedAt } : prev);
    setScanning(false);
    setLogs(prev => [...prev, `[RUN] ${current.id} ${status} · ${runVendorIdsRef.current.size} vendors observed`].slice(-400));

    // The omni orchestrator queues deep enrichment itself when the scrape
    // phase ends. Queueing another batch from the client duplicated every
    // Maps and website pass. Just surface the server-side phase.
    const vendorIds = Array.from(runVendorIdsRef.current);
    if (current.postDeep || current.postWebsite) {
      if (!vendorIds.length) {
        toast('Deep pass skipped: no new vendors were observed.', { icon: '!' });
      } else {
        setLogs(prev => [
          ...prev,
          `[DEEP] Server-side enrichment queued for ${vendorIds.length} vendors. Profiles stream into the Deep tab.`
        ].slice(-400));
      }
    }

    setTimeout(() => {
      refresh();
      finishingRef.current = false;
    }, 800);
  }, [refresh]);

  // Progress completion and watchdog: never leave a run stuck in "running".
  useEffect(() => {
    if (run?.status === 'running' && progress && progress.sessionActive === false) {
      finishRun(progress.error ? 'error' : 'complete');
    }
  }, [progress, run?.status, finishRun]);

  useEffect(() => {
    if (run?.status !== 'running') return undefined;
    const id = setInterval(async () => {
      try {
        const jobs = await getScrapeJobs();
        if (!mountedRef.current) return;
        // The backend returns a flat array of omni + cron jobs. Accept the
        // wrapped shape too so this watchdog cannot silently stop working.
        const list = Array.isArray(jobs)
          ? jobs
          : Array.isArray(jobs?.omniJobs) ? jobs.omniJobs : [];
        const matching = list.find(job => job.id === run.id || job.sessionId === run.id);
        if (matching?.status === 'completed') {
          finishRun('complete');
        } else if (!matching && Date.now() - lastEventRef.current > 32000) {
          finishRun('complete');
        }
      } catch (error) { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [run?.status, run?.id, finishRun]);

  // Deep job polling.
  useEffect(() => {
    if (!deepJob || ['completed', 'failed', 'stopped'].includes(deepJob.status)) return undefined;
    const id = setInterval(async () => {
      try {
        const job = await getDeepJob(deepJob.id);
        if (!mountedRef.current || !job) return;
        setDeepJob(job);
        setDeepJobs(prev => {
          const map = new Map(prev.map(item => [item.id, item]));
          map.set(job.id, job);
          return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });
        if (['completed', 'failed', 'stopped'].includes(job.status)) {
          toast[job.status === 'completed' ? 'success' : 'error'](`Deep job ${job.status} · ${job.succeeded || 0} profiles`);
          refresh();
        }
      } catch (error) { /* ignore */ }
    }, 2200);
    return () => clearInterval(id);
  }, [deepJob?.id, deepJob?.status, refresh]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleStartMasterSweep = async (sweepParams = {}) => {
    const sweepCat = String(sweepParams.category || masterSweepForm.category || form.category || autoQuery).trim();
    const sweepName = String(sweepParams.name || masterSweepForm.name || form.location || '').trim();
    const scope = sweepParams.scope || masterSweepForm.scope || 'district';

    if (!sweepCat || !sweepName) {
      toast.error('Please specify both a category and a target location name for the Master Sweep.');
      return;
    }

    setMasterLaunching(true);
    setLaunching(true);
    try {
      const res = await startMasterSweep({
        category: sweepCat,
        scope,
        name: sweepName,
        engines: sweepParams.engines || ['geospatial_mesh', 'direct_telecom']
      });

      if (res?.sessionId) {
        toast.success('🗺️ Master ' + scope + ' sweep initiated! Swarming ' + res.totalZones + ' zones across ' + res.targetName);
        setActiveTab('cockpit');
        refresh();
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || 'Failed to start Master Sweep');
    } finally {
      setMasterLaunching(false);
      setLaunching(false);
    }
  };

  const startRun = async (overrides = {}) => {
    const auto = runMode === 'auto';
    const runQuery = String(overrides.query ?? autoQuery).trim();
    const runCategory = String(overrides.category ?? form.category).trim();
    const runLocation = String(overrides.location ?? form.location).trim();

    if (auto && !runQuery) {
      toast.error('Type what you need and where. Example: plumbers in Vijayawada.');
      return;
    }
    if (!auto && (!runCategory || !runLocation)) {
      toast.error('Category and location are required.');
      return;
    }

    // Honor custom engine selection from overrides or default to auto
    const engines = (Array.isArray(overrides.engines) && overrides.engines.length)
      ? overrides.engines
      : ['auto'];

    setLaunching(true);
    const sessionId = `cmd_${Date.now().toString(36)}`;
    if (overrides.query) setAutoQuery(overrides.query);
    runVendorIdsRef.current = new Set();
    finishingRef.current = false;
    setRunLeadCount(0);
    setProgress(null);
    setSessionFilter('');
    setActiveTab('cockpit');
    setActiveZone(null);
    setGridZones([]);
    setLogs(prev => [
      ...prev,
      auto
        ? `[RUN] auto mode · "${runQuery}" · ${engines.join(' + ')}`
        : `[RUN] launching "${runCategory}" in "${runLocation}" · ${engines.join(' + ')}`,
      `[ESTIMATE] ${estimate ? `${estimate.zones?.count || 0} zones · first lead ${estimate.timing?.firstLeadLabel} · total ${estimate.timing?.totalLabel}` : 'not available'}`
    ]);

    try {
      if (auto) {
        const response = await startAuto({
          query: runQuery,
          strategy: form.strategy,
          radius: overrides.radius || form.radius || 5,
          engines,
          sessionId
        });
        const plan = response?.plan || {};
        setForm(prev => ({
          ...prev,
          category: plan.category || prev.category,
          location: plan.location || prev.location
        }));
        setRun({
          id: sessionId,
          sessionId,
          category: plan.category || runQuery,
          location: plan.location || '',
          familyLabel: plan.familyLabel || 'Auto',
          strategy: form.strategy,
          engines: plan.engines || engines,
          postWebsite: true,
          postDeep: true,
          targetLeads: overrides.targetLeads || form.targetLeads,
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running'
        });
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · ${(plan.engines || []).join(' + ') || 'auto'}`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled before purge` : null
        ].filter(Boolean));

        // The purge just deleted the previous dataset. Drop those rows from the
        // client too, otherwise the map and counters keep showing stale leads
        // until the next manual refresh.
        if (response?.purge?.removed || response?.deepStopped) {
          await loadVendors();
        }
      } else {
        const response = await startOmni({
          query: `${runCategory} in ${runLocation}`,
          category: runCategory,
          location: runLocation,
          strategy: form.strategy,
          engines,
          sessionId
        });
        const plan = response?.plan || {};
        setRun({
          id: sessionId,
          sessionId,
          category: plan.category || runCategory,
          location: plan.location || runLocation,
          strategy: form.strategy,
          engines: plan.engines || engines,
          postWebsite: true,
          postDeep: true,
          targetLeads: form.targetLeads,
          startedAt: Date.now(),
          finishedAt: null,
          status: 'running'
        });
        setLogs(prev => [
          ...prev,
          `[PLAN] ${plan.familyLabel || 'General vendors'} · sources chosen automatically`,
          response?.purge?.removed ? `[PURGE] ${response.purge.removed} stale leads removed · fresh run` : '[PURGE] no stale leads',
          response?.deepStopped ? `[DEEP] ${response.deepStopped} superseded deep job(s) cancelled` : null
        ].filter(Boolean));

        if (response?.purge?.removed || response?.deepStopped) {
          await loadVendors();
        }
      }

      lastEventRef.current = Date.now();
      setScanning(true);
      toast.success(auto ? 'Search started. Live leads will appear in seconds.' : 'Search started. We chose the sources automatically.');
      setActiveTab('cockpit');
    } catch (error) {
      setScanning(false);
      toast.error(error?.response?.data?.error || 'Scrape could not be started.');
      setLogs(prev => [...prev, `[ERROR] ${error?.response?.data?.error || error.message}`]);
    } finally {
      setLaunching(false);
    }
  };

  const stopRun = async () => {
    setStopping(true);
    try {
      await stopAllScrapes();
      setRun(prev => prev ? { ...prev, status: 'stopped', finishedAt: Date.now() } : prev);
      setScanning(false);
      toast('Run stopped. Completed leads remain saved.', { icon: '■' });
      refresh();
    } catch (error) {
      toast.error('Stop request failed.');
    } finally {
      setStopping(false);
    }
  };

  const launchDeep = async (vendorIds, options = {}) => {
    if (!vendorIds.length) {
      toast('No vendors need a deep pass.', { icon: '!' });
      return null;
    }
    setBatchStarting(true);
    try {
      const response = await startDeepBatch({
        vendorIds,
        force: false,
        includeWebsite: options.website !== false,
        includeGoogle: options.google !== false,
        limit: options.limit || vendorIds.length,
        concurrency: 2
      });
      if (response?.job) {
        setDeepJob(response.job);
        setDeepJobs(prev => [response.job, ...prev]);
        toast.success(`Deep pass queued · ${response.job.total} vendors`);
        setActiveTab('deep');
      }
      return response;
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Deep pass could not start.');
      return null;
    } finally {
      setBatchStarting(false);
    }
  };

  const queueDeepManual = () => {
    const candidates = vendors
      .filter(vendor => !vendor.deepExtractedAt)
      .slice(0, Number(batchConfig.limit) || 100)
      .map(vendor => vendor.id);
    return launchDeep(candidates, { website: batchConfig.website, google: batchConfig.google, limit: candidates.length });
  };

  const queueDeepForRun = async runCard => {
    const ids = vendors
      .filter(vendor => (vendor.sessionId || 'unassigned') === runCard.id && !vendor.deepExtractedAt)
      .map(vendor => vendor.id);
    return launchDeep(ids, { website: true, google: true, limit: ids.length });
  };

  const stopDeep = async jobId => {
    try {
      const job = await stopDeepJob(jobId);
      if (job) {
        setDeepJob(job);
        setDeepJobs(prev => prev.map(item => item.id === job.id ? job : item));
        toast('Deep job stopping after the current vendor.');
      }
    } catch (error) {
      toast.error('Could not stop deep job.');
    }
  };

  const quickDeep = async vendor => {
    if (!vendor?.id || vendorJobs[vendor.id]) return;
    setVendorJobs(prev => ({ ...prev, [vendor.id]: { status: 'queued', progressPercent: 0 } }));
    try {
      const response = await deepExtractVendor(vendor.id, {
        force: true,
        includeWebsite: Boolean(vendor.website),
        includeGoogle: true
      });
      const jobId = response?.jobId;
      if (!jobId) {
        await loadVendors();
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        return;
      }

      const started = Date.now();
      let current = null;
      while (mountedRef.current && Date.now() - started < 150000) {
        await new Promise(resolve => setTimeout(resolve, 1800));
        current = await getDeepJob(jobId);
        if (!mountedRef.current) return;
        setVendorJobs(prev => ({ ...prev, [vendor.id]: current || { status: 'running', progressPercent: 0 } }));
        if (current && ['completed', 'failed', 'stopped'].includes(current.status)) break;
      }
      await loadVendors();
      if (mountedRef.current) {
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        toast.success(`Deep profile updated · ${vendor.name || vendor.id}`);
      }
    } catch (error) {
      if (mountedRef.current) {
        setVendorJobs(prev => {
          const next = { ...prev };
          delete next[vendor.id];
          return next;
        });
        toast.error('Quick deep extraction failed.');
      }
    }
  };

  const updateCrmStage = async (vendor, stage) => {
    if (!vendor?.id || crmSavingId) return;
    setCrmSavingId(vendor.id);
    try {
      const response = await updateVendorCrm(vendor.id, { crmStage: stage });
      const updated = response?.vendor;
      if (updated) {
        setVendors(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
        setSelectedVendor(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        setFolderView(prev => {
          if (!prev?.session?.leads) return prev;
          const nextLeads = prev.session.leads.map(l => l.id === updated.id ? { ...l, ...updated } : l);
          return { ...prev, session: { ...prev.session, leads: nextLeads } };
        });
      }
      toast.success(`Moved to ${stage.replace(/_/g, ' ')}`);
    } catch (error) {
      toast.error('Could not update the CRM stage.');
    } finally {
      setCrmSavingId('');
    }
  };

  const updateDealValue = async (vendor, dealValue) => {
    if (!vendor?.id || crmSavingId) return;
    setCrmSavingId(vendor.id);
    try {
      const response = await updateVendorCrm(vendor.id, { dealValue: Number(dealValue) || 0 });
      const updated = response?.vendor;
      if (updated) {
        setVendors(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
        setSelectedVendor(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        setFolderView(prev => {
          if (!prev?.session?.leads) return prev;
          const nextLeads = prev.session.leads.map(l => l.id === updated.id ? { ...l, ...updated } : l);
          return { ...prev, session: { ...prev.session, leads: nextLeads } };
        });
      }
      toast.success(`Deal value saved: ${formatInr(Number(dealValue) || 0)}`);
    } catch (error) {
      toast.error('Could not save deal value.');
    } finally {
      setCrmSavingId('');
    }
  };

  const handleToggleSelectFolder = id => {
    setSelectedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFolders = () => {
    if (selectedFolderIds.size === filteredRuns.length && filteredRuns.length > 0) {
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFolderIds(new Set(filteredRuns.map(r => r.id)));
    }
  };

  const handleRenameFolder = async (folderId, payload) => {
    try {
      const res = await renameSession(folderId, payload);
      if (res?.success) {
        setSessions(prev => prev.map(s => s.id === folderId ? { ...s, ...res.session } : s));
        if (folderView?.run?.id === folderId) {
          setFolderView(prev => ({
            ...prev,
            run: { ...prev.run, ...res.session },
            session: { ...prev.session, ...res.session }
          }));
        }
        setRenamingFolder(null);
        toast.success('Folder renamed successfully.');
      } else {
        toast.error(res?.error || 'Failed to rename folder.');
      }
    } catch (err) {
      toast.error('Error renaming folder.');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedFolderIds.size) return;
    const ids = Array.from(selectedFolderIds);
    if (!window.confirm(`Permanently delete ${ids.length} selected search folders? This cannot be undone.`)) return;
    try {
      const res = await batchDeleteSessions(ids);
      if (res?.deleted?.length) {
        const deletedSet = new Set(res.deleted);
        setSessions(prev => prev.filter(s => !deletedSet.has(s.id)));
        setSelectedFolderIds(new Set());
        if (folderView && deletedSet.has(folderView.run?.id)) {
          setFolderView(null);
        }
        toast.success(`Deleted ${res.deleted.length} folders.`);
      }
    } catch (err) {
      toast.error('Failed to delete selected folders.');
    }
  };

  const handleMergeFolders = async targetTitle => {
    if (selectedFolderIds.size < 2) {
      toast.error('Select at least 2 folders to merge.');
      return;
    }
    const ids = Array.from(selectedFolderIds);
    setIsMerging(true);
    try {
      const res = await mergeSessions(ids, targetTitle);
      const merged = res?.session || res?.mergedSession;
      if (merged) {
        const updated = await getSessions();
        setSessions(updated || []);
        setSelectedFolderIds(new Set());
        setShowMergeModal(false);
        toast.success(`Merged ${ids.length} folders into "${merged.name}" (${merged.leadCount} unique leads, ${merged.phoneCount} mobiles)!`);
        openFolder({
          id: merged.id,
          name: merged.name,
          category: merged.category,
          location: merged.location,
          leadCount: merged.leadCount,
          phoneCount: merged.phoneCount
        });
      } else {
        toast.error(res?.error || 'Failed to merge folders.');
      }
    } catch (err) {
      toast.error('Error merging folders.');
    } finally {
      setIsMerging(false);
    }
  };

  const openFolder = async runCard => {
    if (!runCard?.id || folderLoading) return;
    setFolderLoading(runCard.id);
    try {
      const session = await getSessionVault(runCard.id);
      if (!session) {
        toast.error('This folder is empty or was removed.');
        return;
      }
      setFolderView({ run: runCard, session });
    } catch (error) {
      toast.error('Could not open this search folder.');
    } finally {
      setFolderLoading('');
    }
  };

  const exportFolder = (runCard, format = 'csv') => {
    if (!runCard?.id) return;
    const link = document.createElement('a');
    link.href = sessionExportUrl(runCard.id, format);
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const loadFolderToCockpit = async (runCard, sessionData) => {
    try {
      let session = sessionData;
      if (!session) {
        setFolderLoading(runCard.id);
        session = await getSessionVault(runCard.id);
        setFolderLoading('');
      }
      if (!session || !Array.isArray(session.leads) || session.leads.length === 0) {
        toast.error('This folder contains no leads to load.');
        return;
      }
      setVendors(session.leads);
      setSessionFilter(runCard.id);
      if (session.category) updateForm('category', session.category);
      if (session.location) updateForm('location', session.location);
      if (session.category && session.location) setAutoQuery(`${session.category} in ${session.location}`);
      setActiveTab('cockpit');
      setFolderView(null);
      toast.success(`Loaded ${session.leads.length} leads from "${runCard.name || runCard.id}" into Cockpit!`);
    } catch (err) {
      setFolderLoading('');
      toast.error('Failed to load folder into Cockpit workspace.');
    }
  };

  const deleteFolder = async runCard => {
    if (!runCard?.id) return;
    if (!window.confirm(`Permanently delete folder "${runCard.name || runCard.id}"? This cannot be undone.`)) return;
    try {
      await deleteSession(runCard.id);
      setSessions(prev => prev.filter(s => s.id !== runCard.id));
      if (sessionFilter === runCard.id) setSessionFilter('');
      if (folderView?.run?.id === runCard.id) setFolderView(null);
      toast.success(`Deleted folder "${runCard.name || runCard.id}".`);
    } catch (err) {
      toast.error('Failed to delete folder.');
    }
  };

  const reScrapeFolder = runCard => {
    if (!runCard) return;
    const cat = runCard.category || 'Businesses';
    const loc = runCard.location || 'India';
    updateForm('category', cat);
    updateForm('location', loc);
    setAutoQuery(`${cat} in ${loc}`);
    setFolderView(null);
    setActiveTab('cockpit');
    toast.success(`Configured search for ${cat} in ${loc}. Click "FIND ALL LEADS" to swarm!`);
  };

  const filteredVendors = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    let list = vendors.filter(vendor => {
      if (sessionFilter && (vendor.sessionId || 'unassigned') !== sessionFilter) return false;
      if (filters.phoneOnly && !getDisplayPhone(vendor)) return false;
      if (filters.websiteOnly && !vendor.website) return false;
      if (filters.deepOnly && !vendor.deepExtractedAt) return false;
      if (filters.conflictsOnly && !(Array.isArray(vendor.conflicts) && vendor.conflicts.length)) return false;
      if (filters.minRating && !(Number(vendor.rating) >= Number(filters.minRating))) return false;
      if (query) {
        const haystack = [
          vendor.name, vendor.category, vendor.city, vendor.village, vendor.mandal,
          vendor.district, vendor.state, vendor.pincode, vendor.phone, vendor.email, vendor.address
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (filters.sort === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (filters.sort === 'quality') return (qualityOf(b) || 0) - (qualityOf(a) || 0);
      if (filters.sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      return new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0);
    });

    return list;
  }, [vendors, filters, sessionFilter]);

  useEffect(() => { setPage(1); }, [filters, sessionFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const effectiveRuns = useMemo(() => {
    const map = new Map();
    for (const vendor of vendors) {
      const id = vendor.sessionId || 'unassigned';
      const existing = map.get(id) || {
        id,
        category: vendor.category || 'Business search',
        location: [vendor.city || vendor.village, vendor.district, vendor.state].filter(Boolean).join(', ') || 'India',
        timestamp: vendor.scrapedAt || null,
        leadCount: 0,
        phoneCount: 0,
        deepCount: 0,
        dealValueTotal: 0,
        status: 'saved',
        vendorIds: []
      };
      existing.leadCount += 1;
      if (getDisplayPhone(vendor)) existing.phoneCount += 1;
      if (vendor.deepExtractedAt) existing.deepCount += 1;
      if (vendor.dealValue) existing.dealValueTotal = (existing.dealValueTotal || 0) + (Number(vendor.dealValue) || 0);
      if (vendor.scrapedAt && (!existing.timestamp || new Date(vendor.scrapedAt) > new Date(existing.timestamp))) existing.timestamp = vendor.scrapedAt;
      existing.vendorIds.push(vendor.id);
      map.set(id, existing);
    }
    for (const session of sessions) {
      const existing = map.get(session.id) || {
        id: session.id,
        category: session.category || 'Business search',
        location: session.location || 'India',
        timestamp: session.timestamp,
        leadCount: session.leadCount || 0,
        phoneCount: session.phoneCount || 0,
        deepCount: 0,
        dealValueTotal: 0,
        status: session.metadata?.status || 'saved',
        vendorIds: []
      };
      existing.customName = session.customName || existing.customName || '';
      existing.name = session.customName || session.name || existing.name || (session.category ? `${session.category} in ${session.location || 'India'}` : 'Lead Folder');
      existing.category = session.category || existing.category;
      existing.location = session.location || existing.location;
      existing.timestamp = session.timestamp || existing.timestamp;
      existing.leadCount = Math.max(existing.leadCount, session.leadCount || 0);
      existing.phoneCount = Math.max(existing.phoneCount, session.phoneCount || 0);
      existing.tags = Array.isArray(session.tags) ? session.tags : existing.tags || [];
      existing.color = session.color || existing.color || '';
      existing.notes = session.notes || existing.notes || '';
      if (session.dealValueTotal != null && Number(session.dealValueTotal) > 0) {
        existing.dealValueTotal = Number(session.dealValueTotal);
      }
      existing.isMasterSweep = Boolean(session.isMasterSweep || session.metadata?.isMasterSweep || /master_/i.test(session.id) || /sweep/i.test(session.location || ''));
      existing.masterScope = session.masterScope || (existing.isMasterSweep ? (/state/i.test(existing.location || '') ? 'state' : 'district') : null);
      existing.status = session.metadata?.status || existing.status;
      map.set(session.id, existing);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [vendors, sessions]);

  const folderCities = useMemo(() => {
    const set = new Set();
    effectiveRuns.forEach(r => {
      if (r.location) {
        const primary = r.location.split(',')[0].trim();
        if (primary && primary !== 'India') set.add(primary);
      }
    });
    return Array.from(set).slice(0, 8);
  }, [effectiveRuns]);

  const clientRuns = useMemo(() => effectiveRuns.filter(r => !r.isMasterSweep), [effectiveRuns]);
  const masterRuns = useMemo(() => effectiveRuns.filter(r => r.isMasterSweep), [effectiveRuns]);

  const filteredRuns = useMemo(() => {
    const sourcePool = runsSubTab === 'master' ? masterRuns : clientRuns;
    let list = sourcePool;
    if (folderCity !== 'all') {
      list = list.filter(r => (r.location || '').toLowerCase().includes(folderCity.toLowerCase()));
    }
    if (folderSearch.trim()) {
      const q = folderSearch.toLowerCase().trim();
      list = list.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (folderSort === 'leads') return (b.leadCount || 0) - (a.leadCount || 0);
      if (folderSort === 'phones') return (b.phoneCount || 0) - (a.phoneCount || 0);
      if (folderSort === 'name') return String(a.name || a.category).localeCompare(String(b.name || b.category));
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
  }, [effectiveRuns, folderCity, folderSearch, folderSort]);

  const stats = useMemo(() => {
    const phones = vendors.filter(vendor => Boolean(getDisplayPhone(vendor))).length;
    const websites = vendors.filter(vendor => vendor.website).length;
    const deep = vendors.filter(vendor => vendor.deepExtractedAt).length;
    const conflicts = vendors.reduce((sum, vendor) => sum + (Array.isArray(vendor.conflicts) ? vendor.conflicts.length : 0), 0);
    const scores = vendors
      .map(vendor => qualityOf(vendor))
      .filter(score => score != null && Number.isFinite(score));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { phones, websites, deep, conflicts, avg };
  }, [vendors]);

  const runElapsed = run ? Math.max(0, Math.floor(((run.finishedAt || now) - run.startedAt) / 1000)) : 0;
  const runTotal = progress?.totalMandalsAcrossAll || progress?.totalMandals || estimate?.zones?.count || 0;
  const runDone = progress?.overallCompletedMandals ?? progress?.completedMandals ?? 0;
  const runPercent = run?.status === 'complete' || run?.status === 'stopped'
    ? 100
    : runTotal ? Math.round((runDone / runTotal) * 100) : 0;

  const mapCenter = useMemo(() => {
    const lat = Number(estimate?.location?.lat);
    const lng = Number(estimate?.location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) return [lat, lng];
    const coords = filteredVendors
      .map(vendor => [Number(vendor.latitude), Number(vendor.longitude)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && a >= 6 && a <= 38 && b >= 68 && b <= 98);
    if (!coords.length) return [22.5937, 79.9629];
    return [
      coords.reduce((sum, pair) => sum + pair[0], 0) / coords.length,
      coords.reduce((sum, pair) => sum + pair[1], 0) / coords.length
    ];
  }, [estimate, filteredVendors]);

  const mapZoom = estimate?.location?.lat ? 10 : 5;
  const mapZones = useMemo(() => {
    if (gridZones.length) return gridZones;
    return (estimate?.zones?.preview || []).map(zone => ({ ...zone, zoneName: zone.zoneName || zone.name }));
  }, [gridZones, estimate]);
  const currentDeep = deepJob;
  const activeDeepJobs = deepJobs.filter(job => ['queued', 'running', 'stopping'].includes(job.status));
  const recentProfiles = vendors
    .filter(vendor => vendor.deepExtractedAt)
    .sort((a, b) => new Date(b.deepExtractedAt) - new Date(a.deepExtractedAt))
    .slice(0, 8);

  const formatClock = seconds => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="v2-root v2-command">
      <div className="v2-page-grid" aria-hidden="true" />

      <header className="v2-cmd-top">
        <div className="v2-cmd-brand">
          <button type="button" className="v2-cmd-home" onClick={() => navigate(HOME_ROUTE)} title={IS_DESKTOP ? 'Dashboard' : 'Back to landing'}>
            <Logo compact />
          </button>
          <span className="v2-cmd-breadcrumb">
            <span>COMMAND CENTER</span>
            <b>/</b>
            <code>{run ? run.id : 'STANDBY'}</code>
          </span>
        </div>

        <div className="v2-cmd-top-status">
          <StatusPill tone={sseStatus === 'open' ? 'lime' : sseStatus === 'connecting' ? 'amber' : 'red'} pulse={sseStatus === 'open'}>
            {sseStatus === 'open' ? <Wifi size={11} /> : <WifiOff size={11} />}
            {sseStatus === 'open' ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
          </StatusPill>
          <span className="v2-cmd-context">{formatNumber(vendors.length)} leads · India</span>

          <button
            type="button"
            className="v2-btn v2-btn-sm"
            onClick={() => navigate('/master')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)'
            }}
            title="Open Master Command Center for District, State, City-Mesh & Mandal sweeps"
          >
            <Compass size={13} /> 🗺️ Master Command Center
          </button>
          <DesktopBadge />
          <div className="v2-tools" ref={toolsRef}>
            <button
              type="button"
              className={cx('v2-btn v2-btn-ghost v2-btn-sm v2-tools-trigger', toolsOpen && 'is-open')}
              onClick={() => setToolsOpen(open => !open)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              <Settings size={13} /> Tools <ChevronDown size={12} className="v2-tools-caret" />
            </button>
            {toolsOpen && (
              <div className="v2-tools-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('deep'); }}>
                  <Zap size={14} />
                  <span><b>Profile engine</b><small>Fill the 52-field vendor profiles</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setActiveTab('map'); }}>
                  <MapPin size={14} />
                  <span><b>Coverage map</b><small>See every lead and search zone</small></span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setToolsOpen(false);
                    const target = run || sessions[0];
                    if (target?.id) exportFolder(target, 'csv');
                    else toast.error('Run a search first, then export its folder.');
                  }}
                >
                  <Download size={14} />
                  <span><b>Export CSV</b><small>Download the current search folder</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); refresh(); toast.success('Data refreshed.'); }}>
                  <RefreshCw size={14} />
                  <span><b>Refresh data</b><small>Pull the latest leads and folders</small></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cx('v2-cmd-body', activeTab === 'cockpit' && 'is-cockpit')}>
        <aside className="v2-cmd-rail">
          <section className="v2-rail-panel">
            <div className="v2-rail-head">
              <span><Crosshair size={14} /> YOUR SEARCH</span>
              <b>{estimate?.zones?.count || '—'} AREAS</b>
            </div>

            <div className="v2-plan-card">
              <div className="v2-plan-what">
                <span>LOOKING FOR</span>
                <b>{scanPlan?.category?.value || form.category || 'Waiting for a query'}</b>
              </div>
              <div className="v2-plan-where">
                <MapPin size={12} />
                <span>{scanPlan?.location?.display || scanPlan?.location?.value || form.location || 'Add a city or village'}</span>
              </div>
              <div className="v2-plan-tags">
                {estimate?.family?.label && <span className="is-family">{estimate.family.label}</span>}
                <span>Automatic sources</span>
                <span>Fresh results</span>
              </div>
              <div className="v2-plan-note">
                <RadarIcon size={12} />
                <span>Autonomous Multi-Vector Swarm. Type any query into the unified Omnibox. Service category, constituent 5km zones, and proprietary vector routing are resolved automatically.</span>
              </div>
            </div>

            {estimateError && <div className="v2-inline-error">{estimateError}</div>}

            <div className="v2-rail-estimate">
              <div className="v2-form-head">
                <span>WHAT TO EXPECT</span>
                <b>{estimating ? 'CALCULATING' : estimate?.calibration || 'READY'}</b>
              </div>
              {estimate ? (
                <>
                  <div className="v2-rail-estimate-grid">
                    <div><span>LEADS</span><b>{formatNumber(estimate.expectedLeads?.expected || 0)}</b><small>estimated</small></div>
                    <div><span>FIRST LEAD</span><b>{estimate.timing?.firstLeadLabel}</b><small>stream</small></div>
                    <div><span>TOTAL TIME</span><b>{estimate.timing?.totalLabel}</b><small>full scan</small></div>
                    <div><span>SPEED</span><b>{estimate.throughput?.leadsPerMinute || 0}</b><small>leads/min</small></div>
                  </div>
                  <div className="v2-rail-phases">
                    {(estimate.phases || []).map(phase => (
                      <div key={phase.name}>
                        <span>{phase.name === 'Scrape' ? 'Find businesses' : phase.name === 'Deep' ? 'Complete profiles' : phase.name}</span>
                        <b>{phase.label}</b>
                      </div>
                    ))}
                  </div>
                  {estimate.warnings?.length > 0 && (
                    <div className="v2-rail-warning"><AlertTriangle size={12} /> {estimate.warnings[0]}</div>
                  )}
                </>
              ) : (
                <div className="v2-rail-empty">{estimating ? 'Reading zone index…' : 'Add a location to estimate.'}</div>
              )}
            </div>
          </section>

          <section className="v2-rail-panel v2-run-panel">
            <div className="v2-rail-head">
              <span><RadarIcon size={14} /> CURRENT RUN</span>
              <StatusPill tone={run?.status === 'running' ? 'cyan' : run?.status === 'complete' ? 'lime' : run ? 'amber' : 'neutral'} pulse={run?.status === 'running'}>
                {run?.status || 'idle'}
              </StatusPill>
            </div>

            {run ? (
              <>
                <div className="v2-run-big">
                  <b>{formatNumber(runLeadCount || 0)}</b>
                  <span>LEADS THIS RUN</span>
                  <small>{formatClock(runElapsed)} elapsed</small>
                </div>
                <span className="v2-run-progress"><i style={{ width: `${runPercent}%` }} /></span>
                <div className="v2-run-detail">
                  <span><b>{runPercent}%</b> zones</span>
                  <span><b>{runDone}/{runTotal || '—'}</b> complete</span>
                  <span><b>{progress?.eta || '—'}</b> ETA</span>
                </div>
                <div className="v2-run-zone">
                  <CircleDot size={12} />
                  <span>{progress?.activeMandal || (run.status === 'running' ? 'Opening signal…' : 'Run finished')}</span>
                </div>
                <div className="v2-run-tags">
                  {run.engines.map(engine => <span key={engine}>{engine}</span>)}
                  {run.postWebsite && <span>website</span>}
                  {run.postDeep && <span>deep</span>}
                </div>
              </>
            ) : (
              <div className="v2-rail-empty">No active run. Configure a category and a location, then dispatch.</div>
            )}
          </section>

          <section className="v2-rail-panel v2-rail-help">
            <div className="v2-rail-head">
              <span><Sparkles size={14} /> HOW IT WORKS</span>
            </div>
            <ol className="v2-help-steps">
              <li><b>1</b><span>Type what you need and where.</span></li>
              <li><b>2</b><span>Watch verified businesses appear live.</span></li>
              <li><b>3</b><span>Call, add notes and move them through CRM.</span></li>
            </ol>
            <div className="v2-exact-note">
              <b>Exact-match guard is on</b>
              <span>Only businesses that match the category you type are kept. Other vendor types and generic labels are rejected.</span>
            </div>
          </section>
        </aside>

        <main className={cx('v2-cmd-main', activeTab === 'cockpit' && 'is-cockpit')}>
          <SearchConsole
            mode={runMode}
            onModeChange={setRunMode}
            value={autoQuery}
            onChange={setAutoQuery}
            category={form.category}
            location={form.location}
            onCategoryChange={value => updateForm('category', value)}
            onLocationChange={value => updateForm('location', value)}
            strategy={form.strategy}
            strategies={STRATEGIES}
            onStrategyChange={value => updateForm('strategy', value)}
            targetLeads={form.targetLeads}
            onTargetChange={value => updateForm('targetLeads', value)}
            form={form}
            onToggle={key => updateForm(key, !form[key])}
            onDeploy={startRun}
            onStop={stopRun}
            busy={launching}
            running={run?.status === 'running'}
            compact={activeTab === 'cockpit'}
            onResolve={setScanPlan}
            onMasterSweep={handleStartMasterSweep}
          />

          <section className="v2-cmd-stats">
            <MetricCard label="LEADS FOUND" value={formatNumber(vendors.length)} sub={`${formatNumber(runLeadCount)} this search`} icon={Users} tone="lime" pulse={run?.status === 'running'} />
            <MetricCard label="MOBILE NUMBERS" value={formatNumber(stats.phones)} sub={`${vendors.length ? Math.round((stats.phones / vendors.length) * 100) : 0}% have a phone`} icon={Phone} tone="cyan" />
            <MetricCard label="COMPLETE PROFILES" value={formatNumber(stats.deep)} sub={`${stats.avg}% avg profile quality`} icon={Zap} tone="violet" />
            <MetricCard label="SAVED FOLDERS" value={formatNumber(effectiveRuns.length)} sub={`${formatNumber(estimate?.zones?.count || 0)} areas in this search`} icon={FolderArchive} tone="amber" />
          </section>

          {currentDeep && ['queued', 'running', 'stopping'].includes(currentDeep.status) && (
            <div className="v2-deep-banner">
              <span className="v2-deep-banner-pulse" />
              <Zap size={13} />
              <b>Completing business profiles</b>
              <span>{currentDeep.completed || 0}/{currentDeep.total || 0} done · phones, emails and websites are still streaming in</span>
              <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setActiveTab('deep')}>
                View engine
              </button>
            </div>
          )}

          <nav className="v2-cmd-tabs">
            <button type="button" className={cx(activeTab === 'cockpit' && 'is-active')} onClick={() => setActiveTab('cockpit')}>
              <LayoutDashboard size={14} /> Workspace
            </button>
            <button type="button" className={cx(activeTab === 'leads' && 'is-active')} onClick={() => setActiveTab('leads')}>
              <Table2 size={14} /> Leads <b>{formatNumber(filteredVendors.length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'map' && 'is-active')} onClick={() => setActiveTab('map')}>
              <MapPin size={14} /> Map <b>{formatNumber(filteredVendors.filter(v => Number.isFinite(Number(v.latitude))).length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'crm' && 'is-active')} onClick={() => setActiveTab('crm')}>
              <Users size={14} /> CRM <b>{formatNumber(vendors.filter(v => crmStageOf(v) !== 'new').length)}</b>
            </button>
            <button type="button" className={cx(activeTab === 'runs' && runsSubTab === 'client' && 'is-active')} onClick={() => { setActiveTab('runs'); setRunsSubTab('client'); }}>
              <FolderArchive size={14} /> Client Folders <b>{formatNumber(clientRuns.length)}</b>
            </button>
            <button type="button" className={cx((activeTab === 'runs' && runsSubTab === 'master') || activeTab === 'master' ? 'is-active' : '')} onClick={() => { setActiveTab('runs'); setRunsSubTab('master'); }}>
              <Compass size={14} /> 🗺️ Master Folders <b>{formatNumber(masterRuns.length)}</b>
            </button>
            <span className="v2-cmd-tabs-spacer" />
            <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={refresh}>
              <RefreshCw size={13} /> Refresh
            </button>
          </nav>

          <div className={cx('v2-cmd-content', activeTab === 'map' && 'is-map')}>
            {activeTab === 'cockpit' && (
              <CockpitView
                vendors={vendors}
                filteredVendors={filteredVendors}
                pageRows={pageRows}
                filters={filters}
                onFilterChange={updateFilter}
                runs={effectiveRuns}
                sessionFilter={sessionFilter}
                folderLoading={folderLoading}
                onOpenFolder={openFolder}
                onExportFolder={exportFolder}
                crmSavingId={crmSavingId}
                onStageChange={updateCrmStage}
                onSelectVendor={setSelectedVendor}
                onTab={setActiveTab}
                mapZones={mapZones}
                activeZone={activeZone}
                scanning={scanning}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={setPageSize}
                run={run}
                stats={stats}
              />
            )}

            {activeTab === 'leads' && (
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
                  total={vendors.length}
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
                        {pageRows.map((vendor, index) => {
                          const quality = qualityOf(vendor);
                          const stage = crmStageOf(vendor);
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
                                  <span>{vendor.city || vendor.village || vendor.mandal || 'Unknown'}</span>
                                  <small>{[vendor.district, vendor.state].filter(Boolean).join(', ') || vendor.pincode || '—'}</small>
                                </div>
                              </td>
                              <td>
                                <div className="v2-contact-cell">
                                  {vendor.phone && !String(vendor.phone).includes('Requires') ? (
                                    <div className="v2-phone-cluster">
                                      <a href={`tel:${vendor.phone}`} className="v2-phone-badge" onClick={event => event.stopPropagation()}>
                                        <Phone size={11} /> {vendor.phone}
                                      </a>
                                      {isMobilePhone(vendor.phone) && (
                                        <a
                                          href={`https://wa.me/91${vendor.phone.replace(/[^0-9]/g, '').slice(-10)}?text=Hi%20${encodeURIComponent(vendor.name || '')}%2C%20I%20found%20your%20business%20listing%20and%20wanted%20to%20connect.`}
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
                                    <span className="v2-muted">No mobile yet</span>
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
                        body="Clear the filters or start a scrape to populate the command center. Nothing is seeded or faked."
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
                        {[25, 50, 100].map(size => <option value={size} key={size}>{size} / page</option>)}
                      </select>
                      <button type="button" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1}><ChevronLeft size={13} /></button>
                      <span>{currentPage} / {pageCount}</span>
                      <button type="button" onClick={() => setPage(prev => Math.min(pageCount, prev + 1))} disabled={currentPage >= pageCount}><ChevronRight size={13} /></button>
                    </div>
                  </footer>
                </div>
              </section>
            )}

            {activeTab === 'map' && (
              <section className="v2-map-view">
                <div className="v2-map-view-head">
                  <FilterBar
                    filters={filters}
                    onChange={updateFilter}
                    total={vendors.length}
                    shown={filteredVendors.length}
                    compact
                  />
                  <MapLegend />
                </div>
                <div className="v2-map-view-body">
                  <CommandMap
                    vendors={filteredVendors}
                    zones={mapZones}
                    activeZone={activeZone}
                    scanning={scanning}
                    center={mapCenter}
                    zoom={mapZoom}
                    height="100%"
                    onSelect={vendor => setSelectedVendor(vendor)}
                  />
                  <aside className="v2-map-side">
                    <div className="v2-map-side-head">
                      <span><Layers size={13} /> COVERAGE ZONES</span>
                      <b>{estimate?.zones?.count || mapZones.length}</b>
                    </div>
                    <div className="v2-zone-list">
                      {mapZones.map(zone => {
                        const name = zone.zoneName || zone.name || 'Zone';
                        const isActive = scanning && activeZone?.name === name;
                        return (
                          <div key={`${zone.index}-${name}`} className={cx(isActive && 'is-active')}>
                            <span>{String(zone.index || 0).padStart(2, '0')}</span>
                            <b>{name}</b>
                            <small>{isActive ? 'SCANNING' : zone.lat ? 'ANCHORED' : 'GEOCODE'}</small>
                          </div>
                        );
                      })}
                      {!mapZones.length && <p>No zone preview. Run an estimate first.</p>}
                    </div>
                    <div className="v2-map-side-foot">
                      <div><span>PLOTTED</span><b>{formatNumber(filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length)}</b></div>
                      <div><span>NO COORDS</span><b>{formatNumber(filteredVendors.filter(vendor => !Number.isFinite(Number(vendor.latitude))).length)}</b></div>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'crm' && (
              <CrmBoard
                vendors={vendors}
                onOpen={setSelectedVendor}
                onStageChange={updateCrmStage}
                onValueChange={updateDealValue}
                savingId={crmSavingId}
              />
            )}

            {activeTab === 'runs' && (
              <section className="v2-runs-view">
                {/* Subtab Switcher: Client Folders vs Master Folders */}
                <div className="v2-runs-subtabs-bar">
                  <button
                    type="button"
                    className={cx('v2-runs-subtab-btn', runsSubTab === 'client' && 'is-active')}
                    onClick={() => setRunsSubTab('client')}
                  >
                    <FolderArchive size={14} /> 📁 Client Search Folders ({clientRuns.length})
                  </button>
                  <button
                    type="button"
                    className={cx('v2-runs-subtab-btn', runsSubTab === 'master' && 'is-active')}
                    onClick={() => setRunsSubTab('master')}
                  >
                    <Compass size={14} /> 🗺️ Master Geo Folders · District & State Sweeps ({masterRuns.length})
                  </button>
                </div>

                {runsSubTab === 'master' && (
                  <div className="v2-master-sweep-launcher-card">
                    <div className="v2-master-launcher-head">
                      <div>
                        <span className="v2-badge-gold">🗺️ MASTER GEO-COVERAGE SWEEP LAUNCHPAD</span>
                        <h3>Swarm an Entire District, Mandal Cluster, or State</h3>
                        <p>Automatically enumerates all constituent mandals/districts, eliminates duplicate leads cross-regionally, and creates a consolidated Master Folder.</p>
                      </div>
                    </div>
                    <div className="v2-master-launcher-fields">
                      <div className="v2-master-field">
                        <label>Business Category</label>
                        <input
                          type="text"
                          placeholder="e.g. Photography Studios, Plumbers, Banquet Halls"
                          value={masterSweepForm.category}
                          onChange={e => setMasterSweepForm(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>
                      <div className="v2-master-field">
                        <label>District, Mandal or State</label>
                        <input
                          type="text"
                          placeholder="e.g. Guntur District, Tenali Mandal, Andhra Pradesh"
                          value={masterSweepForm.name}
                          onChange={e => setMasterSweepForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="v2-master-field">
                        <label>Coverage Scope</label>
                        <select
                          value={masterSweepForm.scope}
                          onChange={e => setMasterSweepForm(prev => ({ ...prev, scope: e.target.value }))}
                        >
                          <option value="district">🗺️ District Sweep (all 14–35 mandals)</option>
                          <option value="mandal">📍 Mandal Cluster (all villages)</option>
                          <option value="state">🏛️ State Sweep (all districts)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="v2-btn-master-sweep"
                        onClick={() => handleStartMasterSweep()}
                        disabled={masterLaunching || !masterSweepForm.category || !masterSweepForm.name}
                      >
                        <Compass size={15} /> {masterLaunching ? 'SWARMING...' : '🚀 START MASTER SWEEP'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="v2-runs-top">
                  <div>
                    <span className="v2-view-kicker">SAVED SEARCH VAULTS · LOCAL LEAD ARCHIVES</span>
                    <h2>Every search is saved in its own permanent folder.</h2>
                    <p>Open any folder to explore leads, copy verified mobiles, export CSV/JSON, switch to Map view, or load it into your live Cockpit workspace.</p>
                  </div>
                  <div className="v2-folder-stats-pill">
                    <FolderArchive size={16} />
                    <span><b>{formatNumber(effectiveRuns.length)}</b> Folders</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.leadCount || 0), 0))}</b> Leads</span>
                    <span>•</span>
                    <span><b>{formatNumber(effectiveRuns.reduce((acc, r) => acc + (r.phoneCount || 0), 0))}</b> Mobiles</span>
                  </div>
                </div>

                {/* Runs Toolbar: Search, City Filter Pills, Select All, and Sort Dropdown */}
                <div className="v2-runs-toolbar">
                  <div className="v2-runs-search">
                    <Search size={14} />
                    <input
                      type="search"
                      placeholder="Search folders (e.g. Plumbers, Vijayawada, Tenali, cmd_...)"
                      value={folderSearch}
                      onChange={e => setFolderSearch(e.target.value)}
                    />
                    {folderSearch && (
                      <button type="button" onClick={() => setFolderSearch('')}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="v2-runs-city-pills">
                    <button
                      type="button"
                      className={cx('v2-city-pill', folderCity === 'all' && 'is-active')}
                      onClick={() => setFolderCity('all')}
                    >
                      All ({effectiveRuns.length})
                    </button>
                    {folderCities.map(city => {
                      const count = effectiveRuns.filter(r => (r.location || '').toLowerCase().includes(city.toLowerCase())).length;
                      return (
                        <button
                          type="button"
                          key={city}
                          className={cx('v2-city-pill', folderCity.toLowerCase() === city.toLowerCase() && 'is-active')}
                          onClick={() => setFolderCity(city)}
                        >
                          <MapPin size={10} /> {city} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="v2-runs-toolbar-right">
                    <button
                      type="button"
                      className="v2-btn v2-btn-ghost v2-btn-xs"
                      onClick={handleSelectAllFolders}
                      title="Select or deselect all folders"
                    >
                      {selectedFolderIds.size === filteredRuns.length && filteredRuns.length > 0 ? (
                        <>
                          <CheckSquare size={12} className="v2-text-lime" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={12} /> Select All
                        </>
                      )}
                    </button>

                    <div className="v2-runs-sort">
                      <select value={folderSort} onChange={e => setFolderSort(e.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="leads">Most leads</option>
                        <option value="phones">Most mobile numbers</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Batch Actions Floating / Sticky Bar */}
                {selectedFolderIds.size > 0 && (
                  <div className="v2-runs-batch-bar">
                    <div className="v2-runs-batch-info">
                      <CheckSquare size={16} className="v2-text-lime" />
                      <span><b>{selectedFolderIds.size}</b> folders selected</span>
                      <span className="v2-runs-batch-leads">
                        ({formatNumber(effectiveRuns.filter(r => selectedFolderIds.has(r.id)).reduce((acc, r) => acc + (r.leadCount || 0), 0))} total leads)
                      </span>
                    </div>
                    <div className="v2-runs-batch-actions">
                      {selectedFolderIds.size >= 2 && (
                        <button
                          type="button"
                          className="v2-btn v2-btn-lime v2-btn-sm"
                          onClick={() => setShowMergeModal(true)}
                        >
                          <GitMerge size={13} /> Merge &amp; Deduplicate ({selectedFolderIds.size})
                        </button>
                      )}
                      <button
                        type="button"
                        className="v2-btn v2-btn-danger v2-btn-sm"
                        onClick={handleBatchDelete}
                      >
                        <Trash2 size={13} /> Delete Selected ({selectedFolderIds.size})
                      </button>
                      <button
                        type="button"
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => setSelectedFolderIds(new Set())}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                <div className="v2-run-grid">
                  {filteredRuns.map(runCard => (
                    <RunCard
                      key={runCard.id}
                      run={runCard}
                      active={sessionFilter === runCard.id || run?.id === runCard.id}
                      loading={folderLoading === runCard.id}
                      selected={selectedFolderIds.has(runCard.id)}
                      onToggleSelect={handleToggleSelectFolder}
                      onOpen={() => openFolder(runCard)}
                      onRename={() => setRenamingFolder(runCard)}
                      onExport={exportFolder}
                      onLoadToCockpit={loadFolderToCockpit}
                      onDelete={deleteFolder}
                    />
                  ))}
                  {filteredRuns.length === 0 && (
                    <EmptyState
                      icon={FolderArchive}
                      title={folderSearch || folderCity !== 'all' ? 'No folders match your filter.' : 'No folders saved yet.'}
                      body={folderSearch || folderCity !== 'all' ? 'Try changing your search term or clearing the city filter.' : 'Run your first search. When it finishes, the leads are written to a dated folder you can reopen any time.'}
                      action={() => { setFolderSearch(''); setFolderCity('all'); }}
                      actionLabel="Reset filters"
                    />
                  )}
                </div>

                <div className="v2-run-folder-tree">
                  <div className="v2-folder-head">
                    <FolderArchive size={15} />
                    <span>RECENT SEARCH FOLDERS DISK INDEX</span>
                    <b>{effectiveRuns.length} TOTAL VAULTS</b>
                  </div>
                  {filteredRuns.slice(0, 8).map((runCard, index) => (
                    <div className="v2-tree-row" key={runCard.id} style={{ paddingLeft: `${14 + (index % 4) * 16}px` }}>
                      <span>▸</span>
                      <b>{runCard.id}</b>
                      <span>{runCard.name || `${runCard.category} in ${runCard.location}`}</span>
                      <small>{formatNumber(runCard.leadCount)} leads · {formatNumber(runCard.phoneCount)} mobiles · {relativeTime(runCard.timestamp)}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'deep' && (
              <section className="v2-deep-view">
                <div className="v2-deep-top">
                  <div>
                    <span className="v2-view-kicker">DEEP PROFILE ENGINE</span>
                    <h2>Fill the field contract. Keep the unknowns.</h2>
                    <p>Each vendor is saved independently under <code>server/data/deep_profiles/</code>. Stop and resume without losing completed profiles.</p>
                  </div>
                  <ScoreRing value={stats.avg} size={94} label="avg quality" />
                </div>

                <div className="v2-deep-grid">
                  <div className="v2-panel v2-deep-config">
                    <div className="v2-rail-head">
                      <span><Zap size={14} /> QUEUE A DEEP PASS</span>
                      <b>{formatNumber(deepEstimate?.count || 0)} UNEXTRACTED</b>
                    </div>
                    <div className="v2-deep-config-row">
                      <label htmlFor="deep-limit">Vendor limit</label>
                      <input
                        id="deep-limit"
                        type="number"
                        min="1"
                        max="750"
                        value={batchConfig.limit}
                        onChange={event => setBatchConfig(prev => ({ ...prev, limit: Math.max(1, Math.min(750, Number(event.target.value) || 1)) }))}
                      />
                      <span>~{deepEstimate?.label || '—'} · 2 browsers</span>
                    </div>
                    <div className="v2-toggle-stack">
                      <ToggleTile active={batchConfig.website} onClick={() => setBatchConfig(prev => ({ ...prev, website: !prev.website }))} label="Website" detail="Multi-page crawl" icon={Globe2} />
                      <ToggleTile active={batchConfig.google} onClick={() => setBatchConfig(prev => ({ ...prev, google: !prev.google }))} label="Google Maps" detail="Place detail DOM" icon={MapPin} />
                    </div>
                    <button type="button" className="v2-btn v2-btn-lime v2-btn-block" onClick={queueDeepManual} disabled={batchStarting || (deepEstimate?.count || 0) === 0}>
                      {batchStarting ? <Loader2 size={15} className="v2-spin" /> : <Zap size={15} />}
                      {batchStarting ? 'QUEUEING…' : 'START DEEP BATCH'}
                    </button>
                    <small className="v2-deep-config-note">Existing deep profiles are skipped unless you force a single-vendor pass from the drawer.</small>
                  </div>

                  <div className="v2-panel v2-deep-health">
                    <div className="v2-rail-head">
                      <span><Activity size={14} /> ENGINE HEALTH</span>
                      <StatusPill tone={health?.status === 'ok' ? 'lime' : 'amber'} pulse>{health?.status || 'unknown'}</StatusPill>
                    </div>
                    <div className="v2-deep-health-grid">
                      <div><span>TRACKED FIELDS</span><b>{health?.trackedFields || 52}</b><small>{health?.fieldGroups || 10} groups</small></div>
                      <div><span>DEEP EXTRACTED</span><b>{formatNumber(health?.deepExtracted || 0)}</b><small>{formatNumber(health?.vendors || vendors.length)} vendors</small></div>
                      <div><span>PROFILE FILES</span><b>{formatNumber(health?.profileFiles || 0)}</b><small>file-backed</small></div>
                      <div><span>ACTIVE JOBS</span><b>{formatNumber(health?.activeJobs || activeDeepJobs.length)}</b><small>resumable</small></div>
                    </div>
                    <div className="v2-deep-health-foot">
                      <span><Globe2 size={12} /> website {health?.engines?.website ? 'online' : 'offline'}</span>
                      <span><MapPin size={12} /> maps {health?.engines?.playwright ? 'online' : 'offline'}</span>
                      <span><Database size={12} /> village index {health?.geo?.villageIndexReady ? 'ready' : 'lazy'}</span>
                    </div>
                  </div>
                </div>

                <div className="v2-deep-jobs-head">
                  <span className="v2-view-kicker">JOB LEDGER</span>
                  <h3>Recent deep jobs</h3>
                </div>
                <div className="v2-deep-jobs-list">
                  {(deepJob ? [deepJob, ...deepJobs.filter(job => job.id !== deepJob.id)] : deepJobs).slice(0, 8).map(job => (
                    <DeepJobRow key={job.id} job={job} onStop={stopDeep} active={job.id === deepJob?.id} />
                  ))}
                  {deepJobs.length === 0 && !deepJob && (
                    <EmptyState
                      icon={Zap}
                      title="No deep jobs yet."
                      body="Queue a batch or open any vendor and run a single deep extraction."
                      action={queueDeepManual}
                      actionLabel="Queue deep pass"
                    />
                  )}
                </div>

                <div className="v2-deep-jobs-head">
                  <span className="v2-view-kicker">LATEST PROFILES</span>
                  <h3>Recently completed</h3>
                </div>
                <div className="v2-profile-grid">
                  {recentProfiles.map(vendor => (
                    <button type="button" className="v2-profile-card" key={vendor.id} onClick={() => setSelectedVendor(vendor)}>
                      <VendorAvatar vendor={vendor} size={38} />
                      <span>
                        <b>{vendor.name}</b>
                        <small>{vendor.category || 'Uncategorised'} · {relativeTime(vendor.deepExtractedAt)}</small>
                      </span>
                      <ScoreRing value={qualityOf(vendor) || 0} size={52} label="" />
                    </button>
                  ))}
                  {recentProfiles.length === 0 && <p className="v2-muted">No deep profiles yet. Run the engine to populate this ledger.</p>}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {selectedVendor && (
        <VendorDrawer
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdated={() => { loadVendors(); loadHealth(); }}
        />
      )}

      {folderView && (
        <FolderView
          view={folderView}
          onClose={() => setFolderView(null)}
          onExport={exportFolder}
          onLoadToCockpit={loadFolderToCockpit}
          onDelete={deleteFolder}
          onReScrape={reScrapeFolder}
          onSelectVendor={setSelectedVendor}
          onStageChange={updateCrmStage}
          onRename={folder => setRenamingFolder(folder || folderView.run || folderView.session)}
        />
      )}

      {renamingFolder && (
        <RenameModal
          folder={renamingFolder}
          onClose={() => setRenamingFolder(null)}
          onSave={handleRenameFolder}
        />
      )}

      {showMergeModal && (
        <MergeModal
          folders={effectiveRuns.filter(r => selectedFolderIds.has(r.id))}
          onClose={() => setShowMergeModal(false)}
          onMerge={handleMergeFolders}
          isMerging={isMerging}
        />
      )}
    </div>
  );
}
