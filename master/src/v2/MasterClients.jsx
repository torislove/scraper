import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, Bell, BellRing, Building2, CheckCircle2, ChevronRight,
  CircleSlash, Coins, FolderOpen, Import, LayoutDashboard, Loader2, Mail, Megaphone,
  Pencil, Plus, RefreshCw, Search, Send, ShieldCheck, Trash2, UserRound, Users,
  X, Zap
} from 'lucide-react';
import {
  createMasterClient, deleteMasterClient, deleteMasterNotification, getClientSessions,
  getMasterClients, getMasterNotifications, getMasterOverview, importClientSessions,
  sendMasterNotification, updateMasterClient
} from './api';
import './masterClients.css';

const PLAN_ORDER = ['free', 'starter', 'pro', 'agency', 'custom'];
const PLAN_LABEL = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
  custom: 'Custom'
};
const PLAN_CREDITS = { free: 1000, starter: 2000, pro: 10000, agency: 50000, custom: 100000 };

const nf = new Intl.NumberFormat('en-IN');

function when(value) {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  const mins = Math.round((Date.now() - time) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'yesterday' : `${days}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function planLabel(plan) {
  return PLAN_LABEL[String(plan || '').toLowerCase()] || plan || 'Free';
}

function emptyDraft() {
  return { id: '', name: '', email: '', plan: 'starter', credits: PLAN_CREDITS.starter, status: 'active', note: '' };
}

export default function MasterClients() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [picked, setPicked] = useState([]);
  const [importMode, setImportMode] = useState('separate');
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newClient, setNewClient] = useState(emptyDraft);
  const [composer, setComposer] = useState({ audience: 'all', kind: 'info', title: '', body: '' });
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => clients.find(item => item.id === selectedId) || null,
    [clients, selectedId]
  );

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [stats, list, messages] = await Promise.all([
        getMasterOverview(),
        getMasterClients(),
        getMasterNotifications()
      ]);
      setOverview(stats);
      setClients(list.clients);
      setNotifications(messages);
    } catch (error) {
      const message = error?.response?.status === 403
        ? 'Master key required. Set it with localStorage.scraper_master_key.'
        : error.message || 'Could not reach the engine.';
      if (!quiet) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSessions([]);
      setPicked([]);
      return;
    }
    setDraft({
      name: selected.name || '',
      email: selected.email || '',
      plan: selected.plan || 'free',
      credits: selected.credits ?? PLAN_CREDITS[selected.plan] ?? 0,
      status: selected.status || 'active',
      note: selected.note || ''
    });
  }, [selected?.id, selected?.updatedAt]);

  const loadSessions = useCallback(async id => {
    if (!id) return;
    setSessionsLoading(true);
    try {
      const list = await getClientSessions(id);
      setSessions(list);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not read this client vault.');
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPicked([]);
    setSessions([]);
    if (selectedId) loadSessions(selectedId);
  }, [selectedId, loadSessions]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter(item => {
      if (statusFilter !== 'all' && (item.status || 'active') !== statusFilter) return false;
      // Empty auto-detected workspaces (test runs, one-off visitors) stay out of
      // the way until the operator asks for them.
      if (!showEmpty && item.autoCreated && !item.folders && !item.email) return false;
      if (!needle) return true;
      return [item.name, item.email, item.id, item.plan]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle));
    });
  }, [clients, query, statusFilter, showEmpty]);

  const totals = useMemo(() => {
    const managed = clients.filter(item => !item.autoCreated || item.folders > 0 || item.email);
    return {
      clients: managed.length,
      active: managed.filter(item => (item.status || 'active') === 'active').length,
      leads: managed.reduce((sum, item) => sum + (item.leads || 0), 0),
      folders: managed.reduce((sum, item) => sum + (item.folders || 0), 0)
    };
  }, [clients]);

  const saveClient = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      const updated = await updateMasterClient(selected.id, {
        name: draft.name,
        email: draft.email,
        plan: draft.plan,
        credits: Number(draft.credits),
        status: draft.status,
        note: draft.note
      });
      setClients(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast.success(`${updated.name} updated.`);
      load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save client.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const next = (selected.status || 'active') === 'suspended' ? 'active' : 'suspended';
    try {
      const updated = await updateMasterClient(selected.id, { status: next });
      setClients(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      toast.success(next === 'suspended' ? `${updated.name} paused.` : `${updated.name} resumed.`);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not change status.');
    }
  };

  const removeClient = async () => {
    if (!selected) return;
    if (!window.confirm(`Remove ${selected.name} from the client desk? Their saved folders stay on disk.`)) return;
    try {
      await deleteMasterClient(selected.id);
      toast.success('Removed from the client desk.');
      setSelectedId(null);
      load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not remove client.');
    }
  };

  const create = async () => {
    if (!newClient.id.trim()) {
      toast.error('Workspace ID is required (it is the device id shown in the client app).');
      return;
    }
    setSaving(true);
    try {
      const created = await createMasterClient({
        ...newClient,
        id: newClient.id.trim(),
        credits: Number(newClient.credits)
      });
      toast.success(`${created.name} added.`);
      setShowNew(false);
      setNewClient(emptyDraft());
      setSelectedId(created.id);
      load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not add client.');
    } finally {
      setSaving(false);
    }
  };

  const togglePick = sessionId => {
    setPicked(prev => (prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]));
  };

  const importSelected = async () => {
    if (!selected || !picked.length) {
      toast.error('Tick at least one folder to import.');
      return;
    }
    setImporting(true);
    try {
      const result = await importClientSessions(selected.id, picked, importMode);
      toast.success(`Pulled ${nf.format(result.importedLeads || 0)} leads into the master workspace.`);
      setPicked([]);
      load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const send = async () => {
    if (!composer.title.trim() || !composer.body.trim()) {
      toast.error('Add a title and a message.');
      return;
    }
    setSending(true);
    try {
      await sendMasterNotification(composer);
      toast.success('Message sent.');
      setComposer({ audience: 'all', kind: 'info', title: '', body: '' });
      load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const removeNotification = async id => {
    try {
      await deleteMasterNotification(id);
      setNotifications(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      toast.error('Could not delete message.');
    }
  };

  return (
    <div className="v2-root v2-desk">
      <header className="v2-desk-top">
        <div className="v2-desk-brand">
          <button type="button" className="v2-desk-back" onClick={() => navigate('/command')}>
            <ArrowLeft size={15} /> Command Center
          </button>
          <span className="v2-desk-title">
            <b>Client Desk</b>
            <em>Master workspace</em>
          </span>
        </div>

        <div className="v2-desk-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'clients'}
            className={tab === 'clients' ? 'is-active' : ''}
            onClick={() => setTab('clients')}
          >
            <Users size={13} /> Clients <b>{clients.filter(c => !c.autoCreated || c.folders || c.email).length}</b>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'messages'}
            className={tab === 'messages' ? 'is-active' : ''}
            onClick={() => setTab('messages')}
          >
            <Bell size={13} /> Messages <b>{notifications.length}</b>
          </button>
        </div>

        <div className="v2-desk-actions">
          <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'is-spinning' : ''} /> Refresh
          </button>
          <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={() => navigate('/command')}>
            <LayoutDashboard size={13} /> Sweep map
          </button>
        </div>
      </header>

      <main className="v2-desk-body">
        <section className="v2-desk-kpis">
          <Kpi icon={Users} label="Clients" value={nf.format(overview?.clients ?? totals.clients)} note={`${overview?.suspended ? `${overview.suspended} paused` : `${totals.active} active`}`} />
          <Kpi icon={Building2} label="Folders on disk" value={nf.format(overview?.folders ?? totals.folders)} note="client vaults" />
          <Kpi icon={Zap} label="Leads held" value={nf.format(overview?.leads ?? totals.leads)} note="across clients" />
          <Kpi icon={BellRing} label="Messages" value={nf.format(overview?.notifications ?? notifications.length)} note={`${overview?.unread ?? 0} unread`} />
        </section>

        {tab === 'clients' ? (
          <section className="v2-desk-split">
            <div className="v2-desk-card">
              <div className="v2-desk-card-head">
                <div>
                  <b>Who is using the scraper</b>
                  <span>Every device that has opened the client app appears here automatically.</span>
                </div>
                <div className="v2-desk-head-tools">
                  <label className="v2-desk-search">
                    <Search size={13} />
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, id or plan" />
                  </label>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Paused</option>
                  </select>
                  <button
                    type="button"
                    className={`v2-desk-empty-toggle${showEmpty ? ' is-on' : ''}`}
                    onClick={() => setShowEmpty(value => !value)}
                    title="Show workspaces with no saved folders"
                  >
                    {showEmpty ? 'Hide empty' : `Show empty (${clients.filter(c => c.autoCreated && !c.folders && !c.email).length})`}
                  </button>
                  <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={() => setShowNew(true)}>
                    <Plus size={13} /> Add client
                  </button>
                </div>
              </div>

              <div className="v2-desk-table">
                <div className="v2-desk-row is-head">
                  <span>Client</span>
                  <span>Plan</span>
                  <span>Status</span>
                  <span>Credits</span>
                  <span>Folders</span>
                  <span>Leads</span>
                  <span>Last active</span>
                  <span />
                </div>

                {loading && !clients.length ? (
                  <div className="v2-desk-empty"><Loader2 size={18} className="is-spinning" /> Reading client vaults…</div>
                ) : filtered.length === 0 ? (
                  <div className="v2-desk-empty">
                    <UserRound size={18} />
                    <b>No clients yet</b>
                    <span>Install the desktop app on a client PC and open it once. The workspace shows up here.</span>
                  </div>
                ) : (
                  filtered.map(client => {
                    const active = (client.status || 'active') !== 'suspended';
                    return (
                      <button
                        type="button"
                        key={client.id}
                        className={`v2-desk-row${selectedId === client.id ? ' is-selected' : ''}`}
                        onClick={() => setSelectedId(client.id)}
                      >
                        <span className="v2-desk-client">
                          <b>{client.name}</b>
                          <em>{client.email || client.id}</em>
                        </span>
                        <span><i className={`v2-desk-pill plan-${String(client.plan || 'free').toLowerCase()}`}>{planLabel(client.plan)}</i></span>
                        <span><i className={`v2-desk-pill ${active ? 'is-live' : 'is-paused'}`}>{active ? 'Active' : 'Paused'}</i></span>
                        <span className="is-num">{nf.format(client.credits || 0)}</span>
                        <span className="is-num">{nf.format(client.folders || 0)}</span>
                        <span className="is-num">{nf.format(client.leads || 0)}</span>
                        <span className="is-muted">{when(client.lastActive)}</span>
                        <span className="is-go"><ChevronRight size={14} /></span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <aside className="v2-desk-side">
              {!selected ? (
                <div className="v2-desk-inspector is-empty">
                  <UserRound size={22} />
                  <b>Pick a client</b>
                  <span>Edit their plan, pause searches, read their folders and pull leads into your master vault.</span>
                </div>
              ) : (
                <div className="v2-desk-inspector">
                  <div className="v2-desk-inspector-head">
                    <div>
                      <b>{selected.name}</b>
                      <em>{selected.id}</em>
                    </div>
                    <button type="button" className="v2-desk-x" onClick={() => setSelectedId(null)} aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="v2-desk-inspector-stats">
                    <div><span>Folders</span><b>{nf.format(selected.folders || 0)}</b></div>
                    <div><span>Leads</span><b>{nf.format(selected.leads || 0)}</b></div>
                    <div><span>Mobiles</span><b>{nf.format(selected.mobiles || 0)}</b></div>
                  </div>

                  {draft && (
                    <div className="v2-desk-form">
                      <label>
                        <span>Display name</span>
                        <input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
                      </label>
                      <label>
                        <span>Email / phone</span>
                        <input value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} placeholder="office@agency.in" />
                      </label>
                      <div className="v2-desk-form-pair">
                        <label>
                          <span>Plan</span>
                          <select
                            value={draft.plan}
                            onChange={event => {
                              const plan = event.target.value;
                              setDraft({ ...draft, plan, credits: PLAN_CREDITS[plan] ?? draft.credits });
                            }}
                          >
                            {PLAN_ORDER.map(plan => <option key={plan} value={plan}>{planLabel(plan)}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Credits</span>
                          <input
                            type="number"
                            min="0"
                            value={draft.credits}
                            onChange={event => setDraft({ ...draft, credits: event.target.value })}
                          />
                        </label>
                      </div>
                      <label>
                        <span>Note</span>
                        <textarea
                          rows={2}
                          value={draft.note}
                          onChange={event => setDraft({ ...draft, note: event.target.value })}
                          placeholder="Renewal on 12 Nov, wants Vizag hotels…"
                        />
                      </label>

                      <div className="v2-desk-form-actions">
                        <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={saveClient} disabled={saving}>
                          {saving ? <Loader2 size={13} className="is-spinning" /> : <ShieldCheck size={13} />} Save
                        </button>
                        <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={toggleStatus}>
                          <CircleSlash size={13} /> {(selected.status || 'active') === 'suspended' ? 'Resume' : 'Pause'}
                        </button>
                        <button type="button" className="v2-btn v2-btn-danger v2-btn-sm" onClick={removeClient}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="v2-desk-section">
                    <div className="v2-desk-section-head">
                      <span><FolderOpen size={13} /> Their folders</span>
                      <button type="button" className="v2-desk-link" onClick={() => loadSessions(selected.id)} disabled={sessionsLoading}>
                        {sessionsLoading ? <Loader2 size={12} className="is-spinning" /> : <RefreshCw size={12} />} Reload
                      </button>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="v2-desk-hint">No saved folders for this client yet.</div>
                    ) : (
                      <div className="v2-desk-sessions">
                        {sessions.map(session => (
                          <label key={session.id} className={`v2-desk-session${picked.includes(session.id) ? ' is-picked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={picked.includes(session.id)}
                              onChange={() => togglePick(session.id)}
                            />
                            <span>
                              <b>{session.name}</b>
                              <em>{session.location || 'India'} · {nf.format(session.leadCount || 0)} leads · {nf.format(session.phoneCount || 0)} mobiles</em>
                            </span>
                            <i>{when(session.timestamp)}</i>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="v2-desk-import">
                      <select value={importMode} onChange={event => setImportMode(event.target.value)}>
                        <option value="separate">Copy as separate folders</option>
                        <option value="consolidate">Merge into one master folder</option>
                      </select>
                      <button
                        type="button"
                        className="v2-btn v2-btn-lime v2-btn-sm"
                        onClick={importSelected}
                        disabled={importing || !picked.length}
                      >
                        {importing ? <Loader2 size={13} className="is-spinning" /> : <Import size={13} />}
                        Import {picked.length ? `(${picked.length})` : ''}
                      </button>
                    </div>
                    {picked.length > 0 && (
                      <div className="v2-desk-hint">
                        Imports land in your master workspace, ready for export and outreach.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </section>
        ) : (
          <section className="v2-desk-split v2-desk-split-messages">
            <div className="v2-desk-card">
              <div className="v2-desk-card-head">
                <div>
                  <b>Send a message</b>
                  <span>It appears in the bell inside the client app on their next open.</span>
                </div>
              </div>
              <div className="v2-desk-composer v2-desk-form">
                <div className="v2-desk-form-pair">
                  <label>
                    <span>Who gets it</span>
                    <select value={composer.audience} onChange={event => setComposer({ ...composer, audience: event.target.value })}>
                      <option value="all">All clients</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tone</span>
                    <select value={composer.kind} onChange={event => setComposer({ ...composer, kind: event.target.value })}>
                      <option value="info">Update</option>
                      <option value="success">Good news</option>
                      <option value="warning">Heads up</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span>Title</span>
                  <input
                    value={composer.title}
                    onChange={event => setComposer({ ...composer, title: event.target.value })}
                    placeholder="New Vizag hotels list is ready"
                  />
                </label>
                <label>
                  <span>Message</span>
                  <textarea
                    rows={5}
                    value={composer.body}
                    onChange={event => setComposer({ ...composer, body: event.target.value })}
                    placeholder="Your 240 verified leads are in the folder. Call between 10am and 1pm."
                  />
                </label>
                <button type="button" className="v2-btn v2-btn-lime v2-btn-lg v2-btn-block" onClick={send} disabled={sending}>
                  {sending ? <Loader2 size={14} className="is-spinning" /> : <Send size={14} />} Send to client app
                </button>
              </div>
            </div>

            <div className="v2-desk-card">
              <div className="v2-desk-card-head">
                <div>
                  <b>Message history</b>
                  <span>Everything you have sent, newest first.</span>
                </div>
              </div>
              <div className="v2-desk-messages">
                {notifications.length === 0 ? (
                  <div className="v2-desk-empty">
                    <Megaphone size={18} />
                    <b>No messages yet</b>
                    <span>Send your first note to tell clients what is new.</span>
                  </div>
                ) : (
                  notifications.map(item => (
                    <div key={item.id} className={`v2-desk-message kind-${item.kind || 'info'}`}>
                      <div className="v2-desk-message-head">
                        <b>{item.title}</b>
                        <em>{item.audience === 'all' ? 'All clients' : (clients.find(c => c.id === item.audience)?.name || item.audience)} · {when(item.createdAt)}</em>
                        <button type="button" className="v2-desk-x" onClick={() => removeNotification(item.id)} aria-label="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p>{item.body}</p>
                      <span className="v2-desk-message-read">
                        {(item.readBy || []).length
                          ? <><CheckCircle2 size={11} /> Read by {item.readBy.length}</>
                          : <><Mail size={11} /> Not read yet</>}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {showNew && (
        <div className="v2-desk-modal" role="dialog" aria-modal="true" aria-label="Add client">
          <div className="v2-desk-modal-card">
            <div className="v2-desk-inspector-head">
              <div>
                <b>Add a client workspace</b>
                <em>Use the device id from their app (Settings → Workspace).</em>
              </div>
              <button type="button" className="v2-desk-x" onClick={() => setShowNew(false)} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className="v2-desk-form">
              <label>
                <span>Workspace ID</span>
                <input value={newClient.id} onChange={event => setNewClient({ ...newClient, id: event.target.value })} placeholder="usr_ab12cd3_xyz" />
              </label>
              <label>
                <span>Display name</span>
                <input value={newClient.name} onChange={event => setNewClient({ ...newClient, name: event.target.value })} placeholder="Sri Sai Realty" />
              </label>
              <div className="v2-desk-form-pair">
                <label>
                  <span>Plan</span>
                  <select
                    value={newClient.plan}
                    onChange={event => setNewClient({ ...newClient, plan: event.target.value, credits: PLAN_CREDITS[event.target.value] })}
                  >
                    {PLAN_ORDER.map(plan => <option key={plan} value={plan}>{planLabel(plan)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Credits</span>
                  <input type="number" min="0" value={newClient.credits} onChange={event => setNewClient({ ...newClient, credits: event.target.value })} />
                </label>
              </div>
              <label>
                <span>Note</span>
                <input value={newClient.note} onChange={event => setNewClient({ ...newClient, note: event.target.value })} placeholder="Paid via UPI on 30 Oct" />
              </label>
              <div className="v2-desk-form-actions">
                <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={create} disabled={saving}>
                  {saving ? <Loader2 size={13} className="is-spinning" /> : <Plus size={13} />} Add client
                </button>
                <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, note }) {
  return (
    <div className="v2-desk-kpi">
      <span className="v2-desk-kpi-icon"><Icon size={14} /></span>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <em>{note}</em>
      </div>
    </div>
  );
}
