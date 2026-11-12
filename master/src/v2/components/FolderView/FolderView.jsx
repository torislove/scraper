import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Building2,
  Check, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight,
  CircleDot, Clock, Compass, Copy, Crosshair, Database, Download, ExternalLink,
  FileSpreadsheet, FileText, Filter, Folder, FolderArchive, Globe2, Layers,
  LayoutDashboard, Loader2, MapPin, MessageSquare, Phone, PhoneCall, Play,
  Radar as RadarIcon, RefreshCw, RotateCcw, Search, Settings, SlidersHorizontal,
  Smartphone, Sparkles, Square, Star, Table2, Tag, Trash2, Users, Wifi,
  WifiOff, X, Zap, Edit3, GitMerge, Plus
} from 'lucide-react';
import CommandMap from '../../CommandMap';
import WhatsAppCampaignModal from '../modals/WhatsAppCampaignModal';
import { EmptyState, MapLegend, VendorAvatar } from '../cards/MetricCard';
import { extractLeadArea, CarriedBadge, qualityOf, buildFolderTree, resolveLeadMandal, resolveLeadVillage } from '../../utils/leadHelpers';
import {
  tokenizeQuery, normalizePhoneDigits, matchesLead, scoreLead, highlightMatches
} from '../../../utils/universalSearchEngine';
import { CRM_STAGES, crmStageOf, formatInr } from '../../CrmBoard';
import { getDisplayPhone, isMobilePhone, whatsappNumber, classifyPhone } from '../../../utils/phoneClassify';
import { exportLeadsToVcf } from '../../../utils/whatsappCatalog';
import { cx, formatNumber, relativeTime } from '../../ui';

export default function FolderView({
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
  const isOutOfBound = Boolean(session?.isOutOfBound || session?.metadata?.isOutOfBound || view?.run?.isOutOfBound);
  const boundary = session?.metadata?.boundary || null;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLocality, setSelectedLocality] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNode, setSelectedNode] = useState({ type: 'all', group: '', child: '' });
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map' | 'telecaller' | 'analytics'
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showWaCampaign, setShowWaCampaign] = useState(false);
  const [sortField, setSortField] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');

  // District → mandal → village tree. Every lead lands in exactly one group,
  // including rows whose mandal field was never filled by the engine.
  const tree = useMemo(
    () => buildFolderTree(leads, {
      boundary,
      isOutOfBound,
      fallbackDistrict: session?.location || ''
    }),
    [leads, boundary, isOutOfBound, session?.location]
  );

  const selectAllLeads = () => setSelectedNode({ type: 'all', group: '', child: '' });
  const selectGroup = (group) => {
    setSelectedNode(prev => (prev.type === 'group' && prev.group === group ? { type: 'all', group: '', child: '' } : { type: 'group', group, child: '' }));
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.add(group);
      return next;
    });
  };
  const selectChild = (group, child) => {
    setSelectedNode(prev => (
      prev.type === 'child' && prev.group === group && prev.child === child
        ? { type: 'group', group, child: '' }
        : { type: 'child', group, child }
    ));
  };
  const toggleGroup = (group) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const phoneLeads = useMemo(() => leads.filter(l => Boolean(getDisplayPhone(l))), [leads]);
  const webLeads = useMemo(() => leads.filter(l => Boolean(l.website)), [leads]);
  const ratedLeads = useMemo(() => leads.filter(l => Number(l.rating) >= 4.0), [leads]);
  const wonLeads = useMemo(() => leads.filter(l => (l.crmStage || crmStageOf(l)) === 'won'), [leads]);
  const pipelineTotal = useMemo(() => leads.reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0), [leads]);
  const percentMobiles = leads.length > 0 ? Math.round((phoneLeads.length / leads.length) * 100) : 0;
  const percentRated = leads.length > 0 ? Math.round((ratedLeads.length / leads.length) * 100) : 0;
  const percentWeb = leads.length > 0 ? Math.round((webLeads.length / leads.length) * 100) : 0;

  // Extract area subfolders across all leads in this folder
  const areaSubfolders = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const area = extractLeadArea(l, session?.location);
      if (area) {
        counts[area] = (counts[area] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads, session?.location]);

  const localityStats = useMemo(() => {
    return areaSubfolders.map(item => [item.area, item.count]).slice(0, 10);
  }, [areaSubfolders]);

  // Extract category subfolders across all leads in this folder
  const categorySubfolders = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const cat = (l.category || '').trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  // Filter & Search logic
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

    if (selectedNode.type === 'group') {
      list = list.filter(l => {
        if (isOutOfBound) return String(l.oobCategory || 'Outside target boundary') === selectedNode.group;
        return resolveLeadMandal(l, boundary) === selectedNode.group;
      });
    } else if (selectedNode.type === 'child') {
      list = list.filter(l => {
        if (isOutOfBound) {
          const group = String(l.oobCategory || 'Outside target boundary');
          const child = String(l.district || '').replace(/\b(district|dist)\b/gi, '').trim() || 'Unknown district';
          return group === selectedNode.group && child === selectedNode.child;
        }
        return resolveLeadMandal(l, boundary) === selectedNode.group
          && resolveLeadVillage(l) === selectedNode.child;
      });
    }

    if (search.trim()) {
      const tokens = searchTokens;
      const digits = normalizePhoneDigits(search);
      list = list.filter(l => matchesLead(l, tokens, search, digits));
      if (sortField === 'default') {
        list = [...list].sort((a, b) => scoreLead(b, tokens, search) - scoreLead(a, tokens, search));
      }
    }

    if (sortField === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '') * (sortOrder === 'asc' ? 1 : -1));
    } else if (sortField === 'rating') {
      list = [...list].sort((a, b) => ((Number(b.rating) || 0) - (Number(a.rating) || 0)) * (sortOrder === 'asc' ? -1 : 1));
    } else if (sortField === 'locality') {
      list = [...list].sort((a, b) => (a.area || a.city || '').localeCompare(b.area || b.city || '') * (sortOrder === 'asc' ? 1 : -1));
    }

    return list;
  }, [leads, filter, selectedLocality, selectedCategory, search, searchTokens, sortField, sortOrder, session?.location, selectedNode, boundary, isOutOfBound]);

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
      const mobile = whatsappNumber(p);
      return mobile ? `+91${mobile}` : p;
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
      const mobile = whatsappNumber(p);
      return mobile ? `+91${mobile}` : p;
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
      const mobile = whatsappNumber(p);
      const phoneNum = mobile ? `+91${mobile}` : p;
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
            </div>
            <div className="v2-folder-header-meta">
              <span className="v2-meta-badge"><MapPin size={11} /> {session?.location || 'India'}</span>
              {isOutOfBound && (
                <span className="v2-meta-badge is-oob" title="Rejected by district containment; these leads are not part of any client folder.">
                  <AlertTriangle size={11} /> Out of Bound
                </span>
              )}
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
              style={{ background: '#F0FDF4', color: '#166534', border: '1.5px solid #BBF7D0', fontWeight: 750 }}
              onClick={() => onExport?.(view.run, 'xlsx')}
              title="Download Executive Multi-Sheet Excel Workbook (.xlsx) with dedicated tabs per Area"
            >
              <FileSpreadsheet size={11} /> 📊 Master Excel (.xlsx)
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              style={{ background: '#EFF6FF', color: '#1E40AF', border: '1.5px solid #BFDBFE', fontWeight: 750 }}
              onClick={() => onExport?.(view.run, 'csv', { divided: true })}
              title="Download Master CSV Divided into Sections by Neighborhood / Area"
            >
              <Download size={11} /> 📑 Area-Divided CSV
            </button>
            {selectedLocality !== 'all' && (
              <button
                type="button"
                className="v2-btn v2-btn-ghost v2-btn-xs"
                style={{ background: '#FAF5FF', color: '#6B21A8', border: '1.5px solid #E9D5FF', fontWeight: 750 }}
                onClick={() => onExport?.(view.run, 'csv', { area: selectedLocality })}
                title={`Download CSV for ${selectedLocality} only`}
              >
                <Download size={11} /> 🎯 {selectedLocality} CSV ({filtered.length})
              </button>
            )}
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
            <button
              type="button"
              className="v2-btn v2-btn-green v2-btn-xs"
              onClick={() => setShowWaCampaign(true)}
              title="Launch Paced 1-Click WhatsApp Outreach Campaign"
            >
              <MessageSquare size={11} /> ⚡ WhatsApp Campaign
            </button>
          </div>

          <div className="v2-ribbon-group is-right">
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-xs"
              onClick={() => onReScrape?.(view.run)}
              title="Run this search again with the 5km radar swarm"
            >
              <RefreshCw size={11} /> Run Again
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

        {/* Folder body: left coverage tree + main workspace */}
        <div className="v2-folder-split">
          <aside className="v2-folder-rail" aria-label={isOutOfBound ? 'Rejection categories' : 'District, mandal and village folders'}>
            <div className="v2-folder-rail-head">
              <Layers size={13} />
              <span>{isOutOfBound ? 'REJECTION CATEGORIES' : 'DISTRICT · MANDAL · VILLAGE'}</span>
            </div>
            <div className="v2-folder-rail-district" title={tree.district}>
              <MapPin size={12} />
              <span>{tree.district}</span>
              <b>{formatNumber(tree.total)}</b>
            </div>
            <button
              type="button"
              className={cx('v2-tree-node', 'is-root', selectedNode.type === 'all' && 'is-active')}
              onClick={selectAllLeads}
            >
              <Folder size={13} />
              <span>All leads</span>
              <b>{formatNumber(tree.total)}</b>
            </button>
            <div className="v2-tree-scroll">
              {tree.groups.map(group => {
                const expanded = expandedGroups.has(group.name);
                const groupActive = selectedNode.type === 'group' && selectedNode.group === group.name;
                return (
                  <div className="v2-tree-group" key={group.name}>
                    <button
                      type="button"
                      className={cx('v2-tree-node', 'is-group', groupActive && 'is-active')}
                      onClick={() => selectGroup(group.name)}
                      title={`${group.name} · ${group.count} leads`}
                    >
                      <span
                        className="v2-tree-caret"
                        onClick={event => { event.stopPropagation(); toggleGroup(group.name); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleGroup(group.name); } }}
                      >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <FolderArchive size={12} />
                      <span className="v2-tree-label">{group.name}</span>
                      <b>{formatNumber(group.count)}</b>
                    </button>
                    {expanded && (
                      <div className="v2-tree-children">
                        {group.children.map(child => {
                          const childActive = selectedNode.type === 'child'
                            && selectedNode.group === group.name
                            && selectedNode.child === child.name;
                          return (
                            <button
                              type="button"
                              className={cx('v2-tree-node', 'is-child', childActive && 'is-active')}
                              key={`${group.name}-${child.name}`}
                              onClick={() => selectChild(group.name, child.name)}
                              title={`${child.name} · ${child.count} leads`}
                            >
                              <CircleDot size={9} />
                              <span className="v2-tree-label">{child.name}</span>
                              <b>{formatNumber(child.count)}</b>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {!tree.groups.length && (
                <div className="v2-tree-empty">No lead groups yet.</div>
              )}
            </div>
            <div className="v2-folder-rail-foot">
              {isOutOfBound
                ? 'Rejected vendors stay here for review and never enter a client folder.'
                : 'Every lead is filed under its mandal and village.'}
            </div>
          </aside>

          <div className="v2-folder-main">
        {/* Filter and View Mode Toolbar */}
        <div className="v2-folder-toolbar">
          <div className="v2-folder-search-wrap">
            <Search size={13} className="v2-search-icon" />
            <input
              type="search"
              placeholder="Search leads in folder (business, phone, area, service)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setSearch(''); }}
              className="v2-folder-search-input"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="v2-search-clear" title="Clear search (Esc)">
                <X size={12} />
              </button>
            )}
          </div>
          {search.trim() && (
            <span className="v2-search-count-pill">
              Showing <b>{filtered.length}</b> of {leads.length} leads
            </span>
          )}
          {selectedNode.type !== 'all' && (
            <button
              type="button"
              className="v2-node-clear-pill"
              onClick={selectAllLeads}
              title="Clear the selected folder and show all leads"
            >
              {selectedNode.group}{selectedNode.child ? ` · ${selectedNode.child}` : ''}
              <X size={11} />
            </button>
          )}

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

        {/* Category sub-folders (area grouping now lives in the left tree) */}
        {categorySubfolders.length > 1 && (
          <div className="v2-subfolder-container">
            <div className="v2-subfolder-label">
              <Building2 size={12} />
              <span>CATEGORIES ({categorySubfolders.length})</span>
            </div>
            <div className="v2-subfolder-chips">
              <button
                type="button"
                className={cx('v2-subfolder-chip', selectedCategory === 'all' && 'is-active')}
                onClick={() => setSelectedCategory('all')}
              >
                📁 All Categories
              </button>
              {categorySubfolders.map(({ cat, count }) => (
                <button
                  type="button"
                  key={cat}
                  className={cx('v2-subfolder-chip', selectedCategory === cat && 'is-active')}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                >
                  🏷️ {cat} <b style={{ opacity: 0.85 }}>({count})</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Selection Bar */}
        {selectedIds.size > 0 && (
          <div className="v2-folder-bulk-bar">
            <span><b>{selectedIds.size}</b> leads selected</span>
            <div className="v2-bulk-actions">
              <button
                type="button"
                className="v2-btn v2-btn-xs v2-btn-green"
                onClick={() => setShowWaCampaign(true)}
                title="Launch personalized WhatsApp outreach queue"
              >
                <MessageSquare size={11} /> ⚡ WhatsApp Campaign ({selectedIds.size})
              </button>
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
                const cleanDigits = whatsappNumber(phone);
                const isMob = Boolean(cleanDigits);
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
                    const cleanDigits = whatsappNumber(phone);
                    const isMob = Boolean(cleanDigits);
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
                              <b>{highlightMatches(lead.name || 'Unknown Business', searchTokens)}</b>
                              <CarriedBadge lead={lead} />
                              <small className="v2-cp-cat">
                                {highlightMatches(lead.category || session?.category || 'Service', searchTokens)}
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
                              {!isMob && (
                                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                                  LANDLINE
                                </span>
                              )}
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

        {showWaCampaign && (
          <WhatsAppCampaignModal
            leads={selectedIds.size > 0 ? leads.filter(l => selectedIds.has(l.id || `${l.name}-${l.phone}`)) : phoneLeads}
            onClose={() => setShowWaCampaign(false)}
            onUpdateStage={onStageChange}
          />
        )}
      </div>
    </div>
  );
}
