import React, { useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, CircleDollarSign, MessageSquare, Phone,
  Search, Sparkles, Trophy, UserCheck, Users, X
} from 'lucide-react';
import { cx, formatNumber } from './ui';

export const CRM_STAGES = [
  { id: 'new', label: 'New', hint: 'Fresh lead', tone: 'blue', icon: Sparkles },
  { id: 'pitch_sent', label: 'Pitched', hint: 'Message sent', tone: 'amber', icon: MessageSquare },
  { id: 'in_discussion', label: 'Talking', hint: 'In conversation', tone: 'cyan', icon: Users },
  { id: 'qualified', label: 'Qualified', hint: 'Real opportunity', tone: 'violet', icon: UserCheck },
  { id: 'won', label: 'Won', hint: 'Customer', tone: 'lime', icon: Trophy },
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

function CrmCard({ vendor, stage, onOpen, onStageChange, saving }) {
  const notes = Array.isArray(vendor.crmNotes) ? vendor.crmNotes.length : 0;
  const tasks = Array.isArray(vendor.crmTasks) ? vendor.crmTasks.filter(task => !task.done).length : 0;

  return (
    <article className="v2-crm-card" onClick={() => onOpen(vendor)}>
      <header>
        <span className="v2-crm-avatar">{(vendor.name || '?').slice(0, 1).toUpperCase()}</span>
        <span>
          <b>{vendor.name || 'Unknown vendor'}</b>
          <small>{vendor.category || 'Uncategorised'}</small>
        </span>
        {vendor.verified && <CheckCircle2 size={13} className="v2-crm-verified" />}
      </header>

      <div className="v2-crm-card-meta">
        <span><Phone size={11} /> {vendor.phone || 'No mobile'}</span>
        <span>{vendor.city || vendor.village || vendor.district || 'Location unknown'}</span>
      </div>

      {(notes > 0 || tasks > 0 || vendor.rating) && (
        <div className="v2-crm-card-flags">
          {vendor.rating ? <span>★ {Number(vendor.rating).toFixed(1)}</span> : null}
          {notes > 0 && <span>{notes} note{notes > 1 ? 's' : ''}</span>}
          {tasks > 0 && <span>{tasks} task{tasks > 1 ? 's' : ''}</span>}
        </div>
      )}

      <footer onClick={event => event.stopPropagation()}>
        <select
          value={stage}
          onChange={event => onStageChange(vendor, event.target.value)}
          disabled={saving}
          aria-label={`Move ${vendor.name || 'lead'} to another stage`}
        >
          {CRM_STAGES.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => onOpen(vendor)}>
          Open <ArrowRight size={12} />
        </button>
      </footer>
    </article>
  );
}

export default function CrmBoard({ vendors = [], onOpen, onStageChange, savingId = '' }) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const map = new Map(CRM_STAGES.map(stage => [stage.id, []]));
    const q = query.trim().toLowerCase();
    for (const vendor of vendors) {
      if (q) {
        const haystack = [vendor.name, vendor.phone, vendor.city, vendor.district, vendor.category]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const stage = crmStageOf(vendor);
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage).push(vendor);
    }
    return map;
  }, [vendors, query]);

  const contacted = vendors.filter(vendor => crmStageOf(vendor) !== 'new').length;
  const won = vendors.filter(vendor => crmStageOf(vendor) === 'won').length;

  return (
    <section className="v2-crm-board-view">
      <div className="v2-crm-board-top">
        <div>
          <span className="v2-view-kicker">YOUR SALES PIPELINE</span>
          <h2>Every lead, one clear next step.</h2>
          <p>Move a lead as the conversation progresses. Notes and tasks stay attached to the business.</p>
        </div>
        <div className="v2-crm-board-stats">
          <div><span>LEADS</span><b>{formatNumber(vendors.length)}</b></div>
          <div><span>CONTACTED</span><b>{formatNumber(contacted)}</b></div>
          <div><span>WON</span><b>{formatNumber(won)}</b></div>
        </div>
      </div>

      <div className="v2-crm-toolbar">
        <label>
          <Search size={13} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find a business, phone or city…"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear CRM search"><X size={12} /></button>}
        </label>
        <span>Tip: open a lead to add notes, tasks and the full profile.</span>
      </div>

      <div className="v2-crm-board">
        {CRM_STAGES.map(stage => {
          const items = grouped.get(stage.id) || [];
          const Icon = stage.icon;
          return (
            <div className={cx('v2-crm-column', `tone-${stage.tone}`)} key={stage.id}>
              <header>
                <span className="v2-crm-col-icon"><Icon size={12} /></span>
                <span>
                  <b>{stage.label}</b>
                  <small>{stage.hint}</small>
                </span>
                <em>{items.length}</em>
              </header>
              <div className="v2-crm-column-body">
                {items.map(vendor => (
                  <CrmCard
                    key={vendor.id}
                    vendor={vendor}
                    stage={crmStageOf(vendor)}
                    onOpen={onOpen}
                    onStageChange={onStageChange}
                    saving={savingId === vendor.id}
                  />
                ))}
                {!items.length && (
                  <div className="v2-crm-column-empty">{query ? 'No match here.' : 'No leads in this stage yet.'}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
