import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, CheckCircle2, CircleDollarSign,
  Clock, IndianRupee, MessageCircle, MessageSquare, Phone,
  Search, Sparkles, Trophy, UserCheck, Users, X
} from 'lucide-react';
import { cx, formatNumber } from './ui';

export const CRM_STAGES = [
  { id: 'new', label: 'New', hint: 'Fresh lead', tone: 'blue', icon: Sparkles },
  { id: 'pitch_sent', label: 'Pitched', hint: 'Message sent', tone: 'amber', icon: MessageSquare },
  { id: 'in_discussion', label: 'Talking', hint: 'In conversation', tone: 'cyan', icon: Users },
  { id: 'qualified', label: 'Qualified', hint: 'Real opportunity', tone: 'violet', icon: UserCheck },
  { id: 'won', label: 'Won', hint: 'Customer closed', tone: 'lime', icon: Trophy },
  { id: 'lost', label: 'Lost', hint: 'Not now', tone: 'red', icon: X },
  { id: 'archived', label: 'Archived', hint: 'Parked', tone: 'neutral', icon: CircleDollarSign }
];

export function crmStageOf(vendor) {
  const raw = String(vendor?.crmStage || vendor?.crmStatus || 'new').toLowerCase();
  const direct = CRM_STAGES.find(stage => stage.id === raw);
  if (direct) return direct.id;
  const legacy = {
    contacted: 'pitch_sent',
    interested: 'in_discussion',
    proposal: 'qualified',
    closed_won: 'won',
    won: 'won',
    lost: 'lost',
    archived: 'archived'
  };
  return legacy[raw] || 'new';
}

export function formatInr(num) {
  const n = Number(num) || 0;
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const CALL_OUTCOMES = {
  connected_interested: { label: 'Interested', tone: 'lime' },
  busy_call_later: { label: 'Call Later', tone: 'amber' },
  switched_off: { label: 'No Answer', tone: 'red' },
  not_interested: { label: 'Not Int.', tone: 'neutral' }
};

function CrmCard({ vendor, stage, onOpen, onStageChange, onValueChange, saving }) {
  const [editingValue, setEditingValue] = useState(false);
  const [valDraft, setValDraft] = useState(vendor.dealValue || '');

  const notes = Array.isArray(vendor.crmNotes) ? vendor.crmNotes.length : 0;
  const tasks = Array.isArray(vendor.crmTasks) ? vendor.crmTasks.filter(task => !task.done).length : 0;
  const stageIndex = CRM_STAGES.findIndex(s => s.id === stage);
  const prevStage = stageIndex > 0 ? CRM_STAGES[stageIndex - 1] : null;
  const nextStage = stageIndex < CRM_STAGES.length - 1 ? CRM_STAGES[stageIndex + 1] : null;

  const phoneDigits = vendor.phone ? String(vendor.phone).replace(/\D/g, '').slice(-10) : '';
  const hasPhone = phoneDigits.length === 10;
  const outcomeInfo = vendor.callOutcome ? CALL_OUTCOMES[vendor.callOutcome] : null;

  const handleValueBlur = () => {
    setEditingValue(false);
    const num = Math.max(0, Number(valDraft) || 0);
    if (num !== Number(vendor.dealValue || 0)) {
      onValueChange?.(vendor, num);
    }
  };

  const openWhatsApp = (e) => {
    e.stopPropagation();
    if (!hasPhone) return;
    const name = vendor.contactName || vendor.name || 'Business Owner';
    const cat = vendor.category || 'service';
    const city = vendor.city || vendor.village || 'your city';
    const msg = `Hello ${name}, saw your ${cat} business in ${city}. We help local providers get 3x more bookings. Open to a quick 2-min chat?`;
    window.open(`https://wa.me/91${phoneDigits}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    if (stage === 'new') {
      onStageChange?.(vendor, 'pitch_sent');
    }
  };

  return (
    <article className="v2-crm-card" onClick={() => onOpen(vendor)}>
      <header>
        <span className="v2-crm-avatar">{(vendor.name || '?').slice(0, 1).toUpperCase()}</span>
        <span className="v2-crm-title-copy">
          <b>{vendor.name || 'Unknown vendor'}</b>
          <small>{vendor.category || 'Uncategorised'}</small>
        </span>
        {vendor.verified && <CheckCircle2 size={13} className="v2-crm-verified" />}
      </header>

      <div className="v2-crm-card-meta">
        <div className="v2-crm-meta-row">
          <span><Phone size={11} /> {vendor.phone || 'No mobile'}</span>
          {hasPhone && (
            <button
              type="button"
              className="v2-crm-wa-quick-btn"
              onClick={openWhatsApp}
              title="1-Click WhatsApp Quick Pitch"
            >
              <MessageCircle size={11} />
              <span>Pitch</span>
            </button>
          )}
        </div>
        <span>{vendor.city || vendor.village || vendor.district || 'Location unknown'}</span>
      </div>

      {/* Deal Value Pill & Flags */}
      <div className="v2-crm-card-flags">
        {editingValue ? (
          <div className="v2-crm-deal-edit" onClick={e => e.stopPropagation()}>
            <span>₹</span>
            <input
              type="number"
              value={valDraft}
              onChange={e => setValDraft(e.target.value)}
              onBlur={handleValueBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleValueBlur(); }}
              autoFocus
              placeholder="Value"
            />
          </div>
        ) : (
          <span
            className={cx('v2-crm-deal-pill', Number(vendor.dealValue) > 0 && 'has-value')}
            onClick={(e) => { e.stopPropagation(); setEditingValue(true); }}
            title="Click to set Deal Value (₹ INR)"
          >
            <IndianRupee size={10} />
            <b>{Number(vendor.dealValue) > 0 ? formatInr(vendor.dealValue) : 'Add Value'}</b>
          </span>
        )}

        {outcomeInfo && (
          <span className={cx('v2-crm-outcome-chip', `tone-${outcomeInfo.tone}`)}>
            {outcomeInfo.label}
          </span>
        )}

        {vendor.rating ? <span>★ {Number(vendor.rating).toFixed(1)}</span> : null}
        {notes > 0 && <span>{notes} note{notes > 1 ? 's' : ''}</span>}
        {tasks > 0 && <span>{tasks} task{tasks > 1 ? 's' : ''}</span>}
        {vendor.followUpDate && (
          <span className="v2-crm-follow-chip" title={`Follow up: ${vendor.followUpDate}`}>
            <Clock size={9} /> Follow-up
          </span>
        )}
      </div>

      {/* 1-Click Fast Stage Navigation Footer */}
      <footer onClick={event => event.stopPropagation()}>
        <div className="v2-crm-quick-nav">
          {prevStage && (
            <button
              type="button"
              className="v2-crm-nav-btn is-prev"
              onClick={() => onStageChange(vendor, prevStage.id)}
              disabled={saving}
              title={`Move back to ${prevStage.label}`}
            >
              <ArrowLeft size={11} />
            </button>
          )}

          <select
            value={stage}
            onChange={event => onStageChange(vendor, event.target.value)}
            disabled={saving}
            aria-label={`Move ${vendor.name || 'lead'} to another stage`}
            className="v2-crm-stage-select"
          >
            {CRM_STAGES.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>

          {nextStage && (
            <button
              type="button"
              className="v2-crm-nav-btn is-next"
              onClick={() => onStageChange(vendor, nextStage.id)}
              disabled={saving}
              title={`Advance to ${nextStage.label}`}
            >
              <span>{nextStage.label}</span>
              <ArrowRight size={11} />
            </button>
          )}

          {stage !== 'won' && (
            <button
              type="button"
              className="v2-crm-nav-btn is-won"
              onClick={() => onStageChange(vendor, 'won')}
              disabled={saving}
              title="Mark as Won Customer!"
            >
              <Trophy size={11} />
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

export default function CrmBoard({ vendors = [], onOpen, onStageChange, onValueChange, savingId = '' }) {
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState('all');
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);

  const filteredVendors = useMemo(() => {
    let list = vendors;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(vendor => {
        const haystack = [
          vendor.name, vendor.phone, vendor.city, vendor.district,
          vendor.category, vendor.contactName, vendor.callOutcome
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    if (minRating === '4') {
      list = list.filter(v => Number(v.rating) >= 4.0);
    }
    if (hasPhoneOnly) {
      list = list.filter(v => Boolean(v.phone && String(v.phone).replace(/\D/g, '').length >= 10));
    }
    return list;
  }, [vendors, query, minRating, hasPhoneOnly]);

  const grouped = useMemo(() => {
    const map = new Map(CRM_STAGES.map(stage => [stage.id, []]));
    for (const vendor of filteredVendors) {
      const stage = crmStageOf(vendor);
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage).push(vendor);
    }
    return map;
  }, [filteredVendors]);

  // Financial & Conversion Calculations
  const contacted = vendors.filter(vendor => crmStageOf(vendor) !== 'new').length;
  const won = vendors.filter(vendor => crmStageOf(vendor) === 'won').length;
  const totalPipelineValue = vendors.reduce((sum, v) => sum + (Number(v.dealValue) || 0), 0);
  const totalWonValue = vendors
    .filter(v => crmStageOf(v) === 'won')
    .reduce((sum, v) => sum + (Number(v.dealValue) || 0), 0);

  return (
    <section className="v2-crm-board-view">
      <div className="v2-crm-board-top">
        <div>
          <span className="v2-view-kicker">STARTUP SALES COCKPIT · ACTIVE PIPELINE</span>
          <h2>Move prospects from first message to closed revenue.</h2>
          <p>Advance stages with 1-click, track deal values in ₹ INR, and trigger direct WhatsApp pitches instantly.</p>
        </div>
        <div className="v2-crm-board-stats">
          <div className="v2-crm-stat-box">
            <span>PIPELINE VALUE</span>
            <b className="text-cyan-400">{formatInr(totalPipelineValue)}</b>
          </div>
          <div className="v2-crm-stat-box">
            <span>WON REVENUE</span>
            <b className="text-emerald-400">{formatInr(totalWonValue)}</b>
          </div>
          <div className="v2-crm-stat-box">
            <span>TOTAL LEADS</span>
            <b>{formatNumber(vendors.length)}</b>
          </div>
          <div className="v2-crm-stat-box">
            <span>CONTACTED</span>
            <b>{formatNumber(contacted)}</b>
          </div>
          <div className="v2-crm-stat-box">
            <span>WON DEALS</span>
            <b className="text-lime-400">{formatNumber(won)}</b>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Tips */}
      <div className="v2-crm-toolbar">
        <label className="v2-crm-search-box">
          <Search size={13} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search leads by name, phone, city, outcome or deal value…"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear CRM search"><X size={12} /></button>}
        </label>

        <div className="v2-crm-filters">
          <button
            type="button"
            className={cx('v2-crm-filter-btn', hasPhoneOnly && 'is-active')}
            onClick={() => setHasPhoneOnly(prev => !prev)}
          >
            <Phone size={11} />
            <span>Mobiles Only</span>
          </button>
          <button
            type="button"
            className={cx('v2-crm-filter-btn', minRating === '4' && 'is-active')}
            onClick={() => setMinRating(prev => prev === '4' ? 'all' : '4')}
          >
            ★ 4.0+ Rated
          </button>
        </div>

        <span className="v2-crm-tip">
          ⚡ <b>Pro-Tip:</b> Click <b>Pitch</b> to send WhatsApp pitch templates, or click <b>Add Value</b> to log Deal INR.
        </span>
      </div>

      {/* 7-Stage Pipeline Grid */}
      <div className="v2-crm-board">
        {CRM_STAGES.map(stage => {
          const items = grouped.get(stage.id) || [];
          const Icon = stage.icon;
          const stageTotalValue = items.reduce((sum, v) => sum + (Number(v.dealValue) || 0), 0);

          return (
            <div className={cx('v2-crm-column', `tone-${stage.tone}`)} key={stage.id}>
              <header className="v2-crm-col-header">
                <span className="v2-crm-col-icon"><Icon size={12} /></span>
                <div className="v2-crm-col-title-wrap">
                  <div className="v2-crm-col-title-row">
                    <b>{stage.label}</b>
                    <em>{items.length}</em>
                  </div>
                  {stageTotalValue > 0 && (
                    <span className="v2-crm-col-value">{formatInr(stageTotalValue)}</span>
                  )}
                </div>
              </header>

              <div className="v2-crm-column-body">
                {items.map(vendor => (
                  <CrmCard
                    key={vendor.id}
                    vendor={vendor}
                    stage={crmStageOf(vendor)}
                    onOpen={onOpen}
                    onStageChange={onStageChange}
                    onValueChange={onValueChange}
                    saving={savingId === vendor.id}
                  />
                ))}
                {!items.length && (
                  <div className="v2-crm-column-empty">{query ? 'No leads match filter.' : 'No leads in this stage.'}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
