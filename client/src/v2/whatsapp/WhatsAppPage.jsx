import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, CheckCheck, ChevronRight, Clock3, FileText, Globe2, Link2,
  Loader2, Mail, MapPin, MessageCircle, Package, Phone, Plus, QrCode, RefreshCw,
  Search, Send, Settings as SettingsIcon, Star, Trash2, Users, Wifi, WifiOff, X, Zap,
  Sparkles, ExternalLink, Copy, Check
} from 'lucide-react';
import {
  connectWa, createWaConversation, deleteWaProduct, deleteWaSnippet, disconnectWa,
  getWaAnalytics, getWaAutomations, getWaConversation, getWaConversations, getWaLeads,
  getWaProducts, getWaSnippets, getWaStatus, saveWaAutomation, saveWaProduct,
  saveWaSnippet, sendWaMessage, syncWaChats, updateWaConversation, updateWaSettings
} from '../api';
import { cx } from '../ui';
import './wa.css';

const QUICK_TEMPLATES = [
  {
    id: 'inquiry',
    title: '💬 Service Inquiry',
    getText: (name, city) => `Hi ${name || 'there'}, I came across your business in ${city || 'your area'} and wanted to connect regarding your services and current pricing.`
  },
  {
    id: 'collab',
    title: '🤝 B2B Collaboration',
    getText: (name, city) => `Hello ${name || ''} team, reaching out to explore potential business collaboration and supplier opportunities in ${city || 'your area'}.`
  },
  {
    id: 'booking',
    title: '📅 Booking Availability',
    getText: (name, city) => `Hi ${name || 'there'}, are you currently accepting new client bookings and project inquiries this month?`
  },
  {
    id: 'followup',
    title: '⚡ Quick Follow-up',
    getText: (name) => `Hello ${name || ''}, following up on my previous note. Would you have 2 minutes for a quick chat?`
  },
  {
    id: 'blank',
    title: '✏️ Blank Custom',
    getText: (name) => `Hi ${name || 'there'}, `
  }
];

const STAGES = [
  ['new', 'New'],
  ['contacted', 'Messaged'],
  ['interested', 'Interested'],
  ['quoted', 'Price sent'],
  ['won', 'Customer'],
  ['lost', 'Not interested']
];

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['needs_reply', 'Needs reply'],
  ['scheduled', 'Scheduled']
];

const EMPTY_PRODUCT = {
  name: '', price: '', currency: 'INR', description: '', link: '', paymentLink: '', images: ''
};

function stageLabel(value) {
  return (STAGES.find(([key]) => key === value) || STAGES[0])[1];
}

function timeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function digits(value) {
  const raw = String(value || '').replace(/[^0-9]/g, '');
  return raw.length > 10 ? raw.slice(-10) : raw;
}

/* ── small building blocks ──────────────────────────────────────────────── */

function Field({ label, value, source, mono }) {
  const known = value !== null && value !== undefined && String(value).trim() !== '' && !['unknown', 'n/a'].includes(String(value).trim().toLowerCase());
  return (
    <div className="wa-field">
      <span className="wa-field-label">{label}</span>
      <span className={cx('wa-field-value', mono && 'is-mono', !known && 'is-unknown')}>
        {known ? String(value) : 'Unknown'}
      </span>
      {known && source && <span className="wa-field-source">{source}</span>}
    </div>
  );
}

function Empty({ icon: Icon = MessageCircle, title, body, action }) {
  return (
    <div className="wa-empty">
      <span className="wa-empty-icon"><Icon size={22} /></span>
      <b>{title}</b>
      <p>{body}</p>
      {action}
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────────── */

export default function WhatsAppPage({ onBack, targetLead = null }) {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [view, setView] = useState('inbox');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [thread, setThread] = useState([]);
  const [lead, setLead] = useState(null);

  const [products, setProducts] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [analytics, setAnalytics] = useState({});

  const [text, setText] = useState('');
  const [auto, setAuto] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [attached, setAttached] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState('');
  const [composerTab, setComposerTab] = useState('text');

  const [newChat, setNewChat] = useState(false);
  const [leadQuery, setLeadQuery] = useState('');
  const [leadResults, setLeadResults] = useState([]);

  const [productDraft, setProductDraft] = useState(null);
  const [snippetDraft, setSnippetDraft] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const threadRef = useRef(null);
  const pollRef = useRef(null);

  const session = status?.session || {};
  const state = status?.state || {};
  const connected = state.status === 'connected';

  // Auto-target lead passed from Cockpit Table or Drawer
  useEffect(() => {
    if (!targetLead) return;
    const phone = digits(targetLead.phone || (Array.isArray(targetLead.phones) && targetLead.phones[0]));
    const name = targetLead.name || 'Business Lead';
    const city = targetLead.city || '';

    // Check if an existing conversation matches this lead
    const match = conversations.find(c => 
      (phone && digits(c.phone) === phone) ||
      (targetLead.id && c.leadId === targetLead.id) ||
      (c.name && c.name.toLowerCase() === name.toLowerCase())
    );

    if (match) {
      setActiveId(match.id);
      setView('inbox');
    } else {
      const syntheticId = `target_${Date.now()}`;
      const syntheticConv = {
        id: syntheticId,
        leadId: targetLead.id || targetLead._id,
        name,
        phone,
        city,
        stage: 'new',
        lastMessage: '',
        lastMessageAt: new Date().toISOString()
      };
      setConversations(prev => [syntheticConv, ...prev.filter(c => c.phone !== phone)]);
      setActiveId(syntheticId);
      setView('inbox');
      setLead(targetLead);
    }

    // Pre-fill clean, customizable outreach text without ANY company name!
    setText(`Hi ${name}, I came across your business in ${city || 'your area'} and wanted to connect regarding your services.`);
  }, [targetLead]);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getWaStatus();
      setStatus(data);
      setAnalytics(data.analytics || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const list = await getWaConversations({ filter, q: query.trim() });
      setConversations(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    } catch (e) {
      setError(e.message);
    }
  }, [filter, query, activeId]);

  const loadThread = useCallback(async id => {
    if (!id) {
      setThread([]);
      setLead(null);
      return;
    }
    try {
      const data = await getWaConversation(id);
      setThread(data.messages || []);
      setLead(data.lead || null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [productList, snippetList, automationList] = await Promise.all([
        getWaProducts(), getWaSnippets(), getWaAutomations()
      ]);
      setProducts(productList);
      setSnippets(snippetList);
      setAutomations(automationList);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { loadStatus(); loadCatalog(); }, [loadStatus, loadCatalog]);
  useEffect(() => { loadConversations(); }, [filter, query]);
  useEffect(() => { loadThread(activeId); }, [activeId, loadThread]);

  // Poll while the QR is on screen: the scan can happen at any moment and the
  // customer should see it turn green without pressing anything.
  useEffect(() => {
    const active = state.status === 'qr' || state.status === 'connecting';
    if (!active) return undefined;
    pollRef.current = setInterval(loadStatus, 2500);
    return () => clearInterval(pollRef.current);
  }, [state.status, loadStatus]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread.length]);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeId) || null,
    [conversations, activeId]
  );

  async function connect() {
    setBusy('connect');
    setError('');
    try {
      await connectWa();
      setTimeout(loadStatus, 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function disconnect(wipe = false) {
    setBusy('disconnect');
    try {
      await disconnectWa(wipe);
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function refreshChats() {
    setBusy('sync');
    try {
      await syncWaChats();
      await loadConversations();
      await loadStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function searchLeads(value) {
    setLeadQuery(value);
    if (!value.trim()) {
      setLeadResults([]);
      return;
    }
    try {
      const rows = await getWaLeads({ q: value.trim(), hasPhone: 1 });
      setLeadResults(rows);
    } catch (e) {
      setError(e.message);
    }
  }

  async function startChat(row) {
    try {
      const conversation = await createWaConversation({
        leadId: row.id, phone: row.phone, name: row.name, city: row.city
      });
      setNewChat(false);
      setLeadQuery('');
      setLeadResults([]);
      await loadConversations();
      setActiveId(conversation.id);
      setView('inbox');
    } catch (e) {
      setError(e.message);
    }
  }

  async function send() {
    if (!activeConversation) return;
    if (!text.trim() && !attached.length) {
      setError('Write a message first.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const result = await sendWaMessage({
        leadId: activeConversation.leadId || undefined,
        phone: activeConversation.phone,
        name: activeConversation.name,
        city: activeConversation.city,
        text,
        type: attached.length ? 'product' : 'text',
        productIds: attached,
        auto,
        scheduledFor: schedule ? new Date(schedule).toISOString() : null
      });
      if (result.mode === 'assisted' && result.url) {
        window.open(result.url, '_blank', 'noopener');
        setSendNote('Opened in WhatsApp — press send there. Your WhatsApp sends it, not an API.');
      } else if (result.mode === 'scheduled') {
        setSendNote(`Scheduled for ${new Date(schedule).toLocaleString('en-IN')}.`);
      } else {
        setSendNote(result.message?.status === 'sent' ? 'Sent from your WhatsApp.' : (result.error || 'Prepared.'));
      }
      setText('');
      setAttached([]);
      setSchedule('');
      await loadThread(activeConversation.id);
      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function patchConversation(patch) {
    if (!activeConversation) return;
    try {
      const updated = await updateWaConversation(activeConversation.id, patch);
      setConversations(list => list.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function addNote() {
    if (!activeConversation || !noteDraft.trim()) return;
    const notes = [...(activeConversation.notes || []), { id: `n_${Date.now()}`, body: noteDraft.trim(), at: new Date().toISOString() }];
    await patchConversation({ notes });
    setNoteDraft('');
  }

  async function toggleAutomation(item) {
    try {
      const updated = await saveWaAutomation({ ...item, enabled: !item.enabled });
      setAutomations(list => list.map(a => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveProduct() {
    if (!productDraft?.name?.trim()) {
      setError('Give the product a name.');
      return;
    }
    try {
      const saved = await saveWaProduct({
        ...productDraft,
        id: productDraft.id,
        images: String(productDraft.images || '').split(/[\n,]/).map(v => v.trim()).filter(Boolean)
      });
      setProducts(list => (productDraft.id ? list.map(p => (p.id === saved.id ? saved : p)) : [saved, ...list]));
      setProductDraft(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveSnippet() {
    if (!snippetDraft?.name?.trim() || !snippetDraft?.body?.trim()) {
      setError('A saved reply needs a name and a message.');
      return;
    }
    try {
      const saved = await saveWaSnippet(snippetDraft);
      setSnippets(list => (snippetDraft.id ? list.map(s => (s.id === saved.id ? saved : s)) : [saved, ...list]));
      setSnippetDraft(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function patchSettings(patch) {
    try {
      const next = await updateWaSettings(patch);
      setStatus(prev => ({ ...prev, session: next }));
    } catch (e) {
      setError(e.message);
    }
  }

  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <div className="wa-root">
      <header className="wa-top">
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="wa-brand">
          <span className="wa-brand-mark"><MessageCircle size={18} /></span>
          <div>
            <b>WhatsApp</b>
            <small>Your own number · no API key</small>
          </div>
        </div>

        <div className={cx('wa-conn', connected ? 'is-on' : state.status === 'qr' ? 'is-wait' : 'is-off')}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>
            {connected ? `Connected${state.phone ? ` · ${state.phone}` : ''}` : state.status === 'qr' ? 'Scan the QR' : state.status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
        </div>

        <div className="wa-top-actions">
          {connected ? (
            <>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={refreshChats} disabled={busy === 'sync'}>
                <RefreshCw size={13} className={busy === 'sync' ? 'wa-spin' : ''} /> Sync chats
              </button>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => disconnect(false)} disabled={busy === 'disconnect'}>
                Disconnect
              </button>
            </>
          ) : (
            <button type="button" className="ui-btn ui-btn--success ui-btn--sm" onClick={connect} disabled={busy === 'connect'}>
              <QrCode size={13} /> {busy === 'connect' ? 'Opening…' : 'Connect my WhatsApp'}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="wa-alert">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss"><X size={13} /></button>
        </div>
      )}

      <nav className="wa-tabs">
        {[
          ['inbox', MessageCircle, 'Chats'],
          ['products', Package, 'Products'],
          ['snippets', FileText, 'Saved replies'],
          ['settings', SettingsIcon, 'Settings']
        ].map(([key, Icon, label]) => (
          <button key={key} type="button" className={cx('wa-tab', view === key && 'is-active')} onClick={() => setView(key)}>
            <Icon size={14} /> {label}
            {key === 'products' && products.length > 0 && <b>{products.length}</b>}
            {key === 'snippets' && snippets.length > 0 && <b>{snippets.length}</b>}
          </button>
        ))}
      </nav>

      {!connected && view === 'inbox' && (
        <section className="wa-connect-card ui-card ui-card--pad ui-rise">
          <div className="wa-connect-copy">
            <span className="ui-chip ui-chip--green"><Wifi size={11} /> No API key · no Meta approval</span>
            <h2>Connect the WhatsApp you already use</h2>
            <p>
              Open WhatsApp on your phone → <b>Linked devices</b> → <b>Link a device</b>, then point it at the code below.
              This links a private browser profile on this computer, exactly like WhatsApp Web. Your messages are sent from
              your own number, and nothing is stored on our servers.
            </p>
            <ol className="wa-steps">
              <li><b>1</b> Tap Connect — a QR appears here.</li>
              <li><b>2</b> Scan it with your phone.</li>
              <li><b>3</b> Pick a lead and press send.</li>
            </ol>
            <button type="button" className="ui-btn ui-btn--success" onClick={connect} disabled={busy === 'connect' || loadingStatus}>
              <QrCode size={15} /> {busy === 'connect' ? 'Opening WhatsApp…' : 'Connect my WhatsApp'}
            </button>
            <small className="wa-fine">
              Prefer not to connect? Every message can also open as a ready-to-send WhatsApp link. Same number, zero setup.
            </small>
          </div>

          <div className="wa-qr-panel">
            {state.qr ? (
              <>
                <img src={state.qr} alt="WhatsApp QR code" className="wa-qr" />
                <span className="ui-chip ui-chip--amber">Scan before it expires</span>
              </>
            ) : (
              <div className="wa-qr-placeholder">
                {state.status === 'connecting' ? <Loader2 size={26} className="wa-spin" /> : <QrCode size={30} />}
                <span>{state.status === 'connecting' ? 'Starting WhatsApp Web…' : 'Your QR will appear here'}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {view === 'inbox' && (
        <div className="wa-layout">
          <aside className="wa-list ui-card">
            <div className="wa-list-head">
              <div className="wa-search">
                <Search size={14} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or number" />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear"><X size={12} /></button>}
              </div>
              <button type="button" className="ui-btn ui-btn--primary ui-btn--icon" onClick={() => setNewChat(true)} title="New chat from your leads">
                <Plus size={16} />
              </button>
            </div>

            <div className="wa-filters">
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" className={cx('wa-filter', filter === key && 'is-active')} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="wa-conv-list">
              {conversations.length === 0 && (
                <Empty
                  icon={Users}
                  title="No chats yet"
                  body="Start from a lead you found, or sync your WhatsApp chats."
                  action={connected && (
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={refreshChats}>
                      <RefreshCw size={13} /> Sync now
                    </button>
                  )}
                />
              )}
              {conversations.map(row => (
                <button
                  key={row.id}
                  type="button"
                  className={cx('wa-conv', row.id === activeId && 'is-active')}
                  onClick={() => { setActiveId(row.id); setSendNote(''); }}
                >
                  <span className="wa-avatar">{(row.name || '?').charAt(0).toUpperCase()}</span>
                  <span className="wa-conv-main">
                    <span className="wa-conv-top">
                      <b>{row.name || 'Unknown'}</b>
                      <small>{timeLabel(row.lastMessageAt)}</small>
                    </span>
                    <span className="wa-conv-bottom">
                      <span className="wa-conv-preview">{row.lastMessage || row.city || 'No messages yet'}</span>
                      {Number(row.unread) > 0 && <em className="wa-unread">{row.unread}</em>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="wa-thread ui-card">
            {!activeConversation ? (
              <Empty
                icon={MessageCircle}
                title="Pick a chat"
                body="Choose a conversation on the left, or start one from a scraped lead."
                action={<button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setNewChat(true)}><Plus size={13} /> New chat</button>}
              />
            ) : (
              <>
                {targetLead && (
                  <div className="wa-target-lead-banner">
                    <div className="wa-target-lead-copy">
                      <span className="wa-target-badge"><Sparkles size={12} /> OUTREACH COMPOSER</span>
                      <b>Customizing message for {targetLead.name}</b>
                      <small>+91 {digits(targetLead.phone) || 'Direct'} {targetLead.city ? `· ${targetLead.city}` : ''}</small>
                    </div>
                    {onBack && (
                      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm wa-btn-back-leads" onClick={onBack}>
                        <ArrowLeft size={13} /> Return to Leads Table
                      </button>
                    )}
                  </div>
                )}

                <header className="wa-thread-head">
                  <span className="wa-avatar is-lg">{(activeConversation.name || '?').charAt(0).toUpperCase()}</span>
                  <div className="wa-thread-who">
                    <b>{activeConversation.name}</b>
                    <small>{activeConversation.phone ? `+91 ${digits(activeConversation.phone)}` : activeConversation.city || 'No number saved'}</small>
                  </div>
                  <div className="wa-thread-tags">
                    <span className={cx('ui-chip', activeConversation.stage === 'won' ? 'ui-chip--green' : 'ui-chip--cyan')}>
                      {stageLabel(activeConversation.stage)}
                    </span>
                  </div>
                </header>

                <div className="wa-messages" ref={threadRef}>
                  {thread.length === 0 && (
                    <div className="wa-thread-empty">
                      No messages yet. Customize your message below — you choose every word.
                    </div>
                  )}
                  {thread.map(message => (
                    <div key={message.id} className={cx('wa-bubble', message.direction === 'in' ? 'is-in' : 'is-out')}>
                      <div className="wa-bubble-body">{message.body}</div>
                      <div className="wa-bubble-meta">
                        {new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {message.direction === 'out' && (
                          <span className={cx('wa-tick', ['delivered', 'read'].includes(message.status) && 'is-done')}>
                            {message.status === 'scheduled' ? <Clock3 size={11} /> : message.status === 'failed' ? <AlertCircle size={11} /> : <CheckCheck size={11} />}
                            {message.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {sendNote && <div className="wa-note"><CheckCheck size={13} /> {sendNote}</div>}

                <div className="wa-composer">
                  <div className="wa-composer-tabs">
                    <button type="button" className={cx(composerTab === 'text' && 'is-active')} onClick={() => setComposerTab('text')}>Custom Message</button>
                    <button type="button" className={cx(composerTab === 'snippets' && 'is-active')} onClick={() => setComposerTab('snippets')}>Saved replies</button>
                    <button type="button" className={cx(composerTab === 'products' && 'is-active')} onClick={() => setComposerTab('products')}>Products</button>
                  </div>

                  {/* 1-Click Customizable Templates (No hardcoded company branding) */}
                  <div className="wa-quick-templates-bar">
                    <div className="wa-templates-title">
                      <Sparkles size={12} className="text-emerald-600" />
                      <span>Quick Templates:</span>
                    </div>
                    <div className="wa-templates-chips">
                      {QUICK_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          className="wa-tpl-pill-3d"
                          onClick={() => {
                            const generated = tpl.getText(activeConversation.name, activeConversation.city);
                            setText(generated);
                          }}
                          title={`Insert ${tpl.title}`}
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wa-var-chips-row">
                    <span className="wa-var-label">Insert dynamic tags:</span>
                    <button type="button" className="wa-var-tag" onClick={() => setText(prev => `${prev} {{business}}`)}>+ Business Name</button>
                    <button type="button" className="wa-var-tag" onClick={() => setText(prev => `${prev} {{city}}`)}>+ City</button>
                    {text && <button type="button" className="wa-var-tag is-clear" onClick={() => setText('')}>Clear Text</button>}
                  </div>

                  {composerTab === 'snippets' && (
                    <div className="wa-picker">
                      {snippets.length === 0 && <span className="wa-muted">No saved replies yet. Create one under Saved replies.</span>}
                      {snippets.map(snippet => (
                        <button key={snippet.id} type="button" className="wa-pick-row" onClick={() => { setText(prev => (prev ? `${prev}\n${snippet.body}` : snippet.body)); setComposerTab('text'); }}>
                          <b>{snippet.name}</b>
                          <span>{snippet.body.slice(0, 70)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {composerTab === 'products' && (
                    <div className="wa-picker">
                      {products.length === 0 && <span className="wa-muted">No products yet. Add them under Products.</span>}
                      {products.map(product => {
                        const on = attached.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className={cx('wa-pick-row', on && 'is-on')}
                            onClick={() => setAttached(list => (on ? list.filter(id => id !== product.id) : [...list, product.id]))}
                          >
                            <b>{product.name}</b>
                            <span>{product.currency} {product.price || '—'}{on ? ' · attached' : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Write your customized message… (Zero platform branding forced, customize every word)"
                    rows={3}
                  />

                  {attached.length > 0 && (
                    <div className="wa-attached">
                      {attached.map(id => {
                        const product = products.find(p => p.id === id);
                        return product ? (
                          <span key={id} className="ui-chip ui-chip--cyan">
                            <Package size={11} /> {product.name}
                            <button type="button" onClick={() => setAttached(list => list.filter(x => x !== id))} aria-label="Remove"><X size={10} /></button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="wa-composer-foot">
                    <label className="wa-inline-toggle" title="When off, WhatsApp opens with your message ready and you press send.">
                      <button
                        type="button"
                        className="ui-toggle"
                        role="switch"
                        aria-checked={auto}
                        onClick={() => setAuto(v => !v)}
                      />
                      <span>Send automatically</span>
                    </label>

                    <label className="wa-schedule">
                      <Clock3 size={13} />
                      <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} />
                      {schedule && <button type="button" onClick={() => setSchedule('')} aria-label="Clear schedule"><X size={11} /></button>}
                    </label>

                    <div className="wa-dual-actions">
                      <button
                        type="button"
                        className="ui-btn v2-btn-wa-open-web"
                        onClick={() => {
                          if (!text.trim()) {
                            setError('Please write or select a message to send.');
                            return;
                          }
                          const rawPhone = digits(activeConversation.phone || targetLead?.phone);
                          if (!rawPhone) {
                            setError('No valid mobile phone number available for this lead.');
                            return;
                          }
                          const resolvedText = text
                            .replace(/\{\{business\}\}/gi, activeConversation.name || 'there')
                            .replace(/\{\{city\}\}/gi, activeConversation.city || 'your area')
                            .replace(/\{\{my_name\}\}/gi, '');
                          const url = `https://wa.me/91${rawPhone}?text=${encodeURIComponent(resolvedText)}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                          setSendNote('Opened in WhatsApp with your customized message.');
                        }}
                        title="Open directly in WhatsApp Web / Desktop with your customized message"
                      >
                        <ExternalLink size={14} /> Open in WhatsApp Web / App
                      </button>

                      <button
                        type="button"
                        className={cx('ui-btn ui-btn--success v2-btn-wa-send-crm', sending && 'is-loading')}
                        onClick={send}
                        disabled={sending}
                        title="Send directly from your connected WhatsApp Web session"
                      >
                        <Send size={14} /> {schedule ? 'Schedule' : 'Send via WhatsApp CRM'}
                      </button>
                    </div>
                  </div>

                  {auto && !session.autoSend && (
                    <div className="wa-hint">
                      Automatic sending is off in settings. Turn it on to send without pressing send in WhatsApp.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <aside className="wa-profile ui-card">
            {!activeConversation ? (
              <Empty icon={Users} title="Scraped profile" body="Select a chat to see exactly what the engines found." />
            ) : (
              <>
                <div className="wa-profile-head">
                  <b>Scraped profile</b>
                  <span className="ui-chip ui-chip--cyan"><Link2 size={11} /> {lead?.sourceEngine || 'unknown'}</span>
                </div>
                <p className="wa-profile-note">Only values the engines returned. Nothing is guessed; missing stays Unknown.</p>

                <div className="wa-fields">
                  <Field label="Business" value={lead?.name} source={lead?.sourceEngine} />
                  <Field label="Phone" value={lead?.phone} source={lead?.sourceEngine} mono />
                  <Field label="Extra numbers" value={(lead?.phones || []).join(', ')} source={lead?.sourceEngine} mono />
                  <Field label="Category" value={lead?.category} source={lead?.sourceEngine} />
                  <Field label="Address" value={lead?.address} source={lead?.sourceEngine} />
                  <Field label="City" value={lead?.city} source={lead?.sourceEngine} />
                  <Field label="Email" value={lead?.email} source={lead?.sourceEngine} />
                  <Field label="Website" value={lead?.website} source={lead?.sourceEngine} />
                  <Field label="Rating" value={lead?.rating} source={lead?.sourceEngine} />
                  <Field label="Reviews" value={lead?.reviewsCount} source={lead?.sourceEngine} />
                  <Field label="Hours" value={lead?.operatingHours} source={lead?.sourceEngine} />
                  <Field label="Instagram" value={lead?.instagram} source={lead?.sourceEngine} />
                  <Field label="Facebook" value={lead?.facebook} source={lead?.sourceEngine} />
                  <Field label="Area searched" value={lead?.zoneName} source="search plan" />
                </div>

                {lead?.mapsLink && (
                  <a className="ui-btn ui-btn--ghost ui-btn--block ui-btn--sm" href={lead.mapsLink} target="_blank" rel="noreferrer">
                    <MapPin size={13} /> Open on Google Maps
                  </a>
                )}

                <div className="wa-profile-crm">
                  <b>Your notes</b>
                  <label className="wa-select">
                    <span>Stage</span>
                    <select value={activeConversation.stage || 'new'} onChange={e => patchConversation({ stage: e.target.value })}>
                      {STAGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </label>
                  <label className="wa-select">
                    <span>Deal value (₹)</span>
                    <input
                      type="number"
                      value={activeConversation.dealValue ?? ''}
                      onChange={e => patchConversation({ dealValue: e.target.value })}
                      placeholder="Optional"
                    />
                  </label>
                  <div className="wa-notes">
                    {(activeConversation.notes || []).map(note => (
                      <div key={note.id} className="wa-note-row">
                        <span>{note.body}</span>
                        <small>{new Date(note.at).toLocaleDateString('en-IN')}</small>
                      </div>
                    ))}
                    <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={2} placeholder="Add a note about this customer…" />
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={addNote} disabled={!noteDraft.trim()}>
                      <Plus size={12} /> Add note
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {view === 'products' && (
        <section className="wa-page ui-rise">
          <div className="wa-page-head">
            <div>
              <h2>Your products</h2>
              <p>You create everything here — any product, any price. These are yours to send.</p>
            </div>
            <button type="button" className="ui-btn ui-btn--primary" onClick={() => setProductDraft({ ...EMPTY_PRODUCT })}>
              <Plus size={14} /> Add product
            </button>
          </div>

          {productDraft && (
            <div className="wa-form ui-card ui-card--pad">
              <div className="wa-form-grid">
                <label><span>Name</span><input value={productDraft.name} onChange={e => setProductDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Bridal package" /></label>
                <label><span>Price</span><input value={productDraft.price} onChange={e => setProductDraft(d => ({ ...d, price: e.target.value }))} placeholder="e.g. 25000" /></label>
                <label><span>Description</span><textarea rows={2} value={productDraft.description} onChange={e => setProductDraft(d => ({ ...d, description: e.target.value }))} /></label>
                <label><span>Photo URLs (comma separated)</span><input value={productDraft.images} onChange={e => setProductDraft(d => ({ ...d, images: e.target.value }))} placeholder="https://…" /></label>
                <label><span>Website / catalogue link</span><input value={productDraft.link} onChange={e => setProductDraft(d => ({ ...d, link: e.target.value }))} placeholder="https://…" /></label>
                <label><span>Payment link</span><input value={productDraft.paymentLink} onChange={e => setProductDraft(d => ({ ...d, paymentLink: e.target.value }))} placeholder="UPI / Razorpay link" /></label>
              </div>
              <div className="wa-form-actions">
                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setProductDraft(null)}>Cancel</button>
                <button type="button" className="ui-btn ui-btn--success" onClick={saveProduct}>Save product</button>
              </div>
            </div>
          )}

          <div className="wa-grid">
            {products.map(product => (
              <article key={product.id} className="wa-product ui-card">
                {product.images?.[0] ? <img src={product.images[0]} alt="" /> : <div className="wa-product-blank"><Package size={20} /></div>}
                <div className="wa-product-body">
                  <b>{product.name}</b>
                  <span className="wa-price">{product.currency} {product.price || '—'}</span>
                  <p>{product.description || 'No description'}</p>
                  <div className="wa-product-actions">
                    <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setProductDraft({ ...EMPTY_PRODUCT, ...product, images: (product.images || []).join(', ') })}>Edit</button>
                    <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={async () => { await deleteWaProduct(product.id); setProducts(list => list.filter(p => p.id !== product.id)); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {products.length === 0 && !productDraft && (
              <Empty icon={Package} title="No products yet" body="Add your first product and it becomes available in every chat." action={<button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setProductDraft({ ...EMPTY_PRODUCT })}><Plus size={13} /> Add product</button>} />
            )}
          </div>
        </section>
      )}

      {view === 'snippets' && (
        <section className="wa-page ui-rise">
          <div className="wa-page-head">
            <div>
              <h2>Saved replies</h2>
              <p>Your own reusable messages. Use <code>{'{{business}}'}</code>, <code>{'{{city}}'}</code> and <code>{'{{my_name}}'}</code>.</p>
            </div>
            <button type="button" className="ui-btn ui-btn--primary" onClick={() => setSnippetDraft({ name: '', body: '' })}>
              <Plus size={14} /> New reply
            </button>
          </div>

          {snippetDraft && (
            <div className="wa-form ui-card ui-card--pad">
              <div className="wa-form-grid">
                <label><span>Name</span><input value={snippetDraft.name} onChange={e => setSnippetDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. First reply" /></label>
                <label className="is-wide"><span>Message</span><textarea rows={4} value={snippetDraft.body} onChange={e => setSnippetDraft(d => ({ ...d, body: e.target.value }))} placeholder="Hi {{business}}, this is {{my_name}}…" /></label>
              </div>
              <div className="wa-form-actions">
                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setSnippetDraft(null)}>Cancel</button>
                <button type="button" className="ui-btn ui-btn--success" onClick={saveSnippet}>Save reply</button>
              </div>
            </div>
          )}

          <div className="wa-grid">
            {snippets.map(snippet => (
              <article key={snippet.id} className="wa-snippet ui-card ui-card--pad">
                <b>{snippet.name}</b>
                <p>{snippet.body}</p>
                <div className="wa-product-actions">
                  <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setSnippetDraft(snippet)}>Edit</button>
                  <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={async () => { await deleteWaSnippet(snippet.id); setSnippets(list => list.filter(s => s.id !== snippet.id)); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            ))}
            {snippets.length === 0 && !snippetDraft && (
              <Empty icon={FileText} title="No saved replies" body="Write the first one — you decide every word." action={<button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setSnippetDraft({ name: '', body: '' })}><Plus size={13} /> New reply</button>} />
            )}
          </div>
        </section>
      )}

      {view === 'settings' && (
        <section className="wa-page ui-rise">
          <div className="wa-page-head">
            <div>
              <h2>Settings</h2>
              <p>Everything here is under your control. Nothing is sent unless you allow it.</p>
            </div>
          </div>

          <div className="wa-settings-grid">
            <div className="ui-card ui-card--pad">
              <h3>Connection</h3>
              <div className="wa-setting-row">
                <span>Status</span>
                <span className={cx('ui-chip', connected ? 'ui-chip--green' : 'ui-chip--amber')}>
                  {connected ? `Connected${state.phone ? ` · ${state.phone}` : ''}` : 'Not connected'}
                </span>
              </div>
              <div className="wa-setting-row">
                <span>Profile folder</span>
                <code className="wa-path">{state.profileDir || '—'}</code>
              </div>
              <div className="wa-form-actions">
                {connected
                  ? <button type="button" className="ui-btn ui-btn--ghost" onClick={() => disconnect(false)}>Disconnect</button>
                  : <button type="button" className="ui-btn ui-btn--success" onClick={connect}>Connect my WhatsApp</button>}
                <button type="button" className="ui-btn ui-btn--danger" onClick={() => { if (window.confirm('Remove the saved WhatsApp session from this computer?')) disconnect(true); }}>
                  Remove saved session
                </button>
              </div>
            </div>

            <div className="ui-card ui-card--pad">
              <h3>Sending</h3>
              <div className="wa-setting-row">
                <span>Send automatically</span>
                <button type="button" className="ui-toggle" role="switch" aria-checked={session.autoSend === true} onClick={() => patchSettings({ autoSend: !session.autoSend })} />
              </div>
              <p className="wa-muted">Off: WhatsApp opens with the message ready and you press send. On: the app sends from your WhatsApp for you.</p>
              <label className="wa-input-row"><span>Gap between messages (seconds)</span><input type="number" value={session.pacingSeconds ?? 35} onChange={e => patchSettings({ pacingSeconds: Number(e.target.value) })} /></label>
              <label className="wa-input-row"><span>Daily limit</span><input type="number" value={session.dailyCap ?? 120} onChange={e => patchSettings({ dailyCap: Number(e.target.value) })} /></label>
              <div className="wa-input-grid">
                <label className="wa-input-row"><span>Quiet from</span><input value={session.quietStart || ''} onChange={e => patchSettings({ quietStart: e.target.value })} placeholder="21:00" /></label>
                <label className="wa-input-row"><span>Quiet until</span><input value={session.quietEnd || ''} onChange={e => patchSettings({ quietEnd: e.target.value })} placeholder="09:00" /></label>
              </div>
              <label className="wa-input-row"><span>Your name in messages</span><input value={session.businessName || ''} onChange={e => patchSettings({ businessName: e.target.value })} placeholder="e.g. Ravi from Sri Events" /></label>
            </div>

            <div className="ui-card ui-card--pad">
              <h3>This month</h3>
              <div className="wa-stats">
                <div><b>{analytics.conversations || 0}</b><span>Chats</span></div>
                <div><b>{analytics.messagesOut || 0}</b><span>Sent</span></div>
                <div><b>{analytics.messagesIn || 0}</b><span>Replies</span></div>
                <div><b>{analytics.replyRate || 0}%</b><span>Reply rate</span></div>
              </div>
            </div>

            <div className="ui-card ui-card--pad">
              <h3>Automations</h3>
              {automations.length === 0 && <p className="wa-muted">No automations yet. Create one from a saved reply when you are ready.</p>}
              {automations.map(item => (
                <div key={item.id} className="wa-setting-row">
                  <span><b>{item.name}</b><small className="wa-muted"> · {item.trigger}</small></span>
                  <button type="button" className="ui-toggle" role="switch" aria-checked={Boolean(item.enabled)} onClick={() => toggleAutomation(item)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {newChat && (
        <div className="wa-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setNewChat(false); }}>
          <div className="wa-modal ui-card ui-card--raised" role="dialog" aria-modal="true">
            <header>
              <b>New chat from a lead</b>
              <button type="button" onClick={() => setNewChat(false)} aria-label="Close"><X size={15} /></button>
            </header>
            <div className="wa-search">
              <Search size={14} />
              <input autoFocus value={leadQuery} onChange={e => searchLeads(e.target.value)} placeholder="Search your leads by name or number" />
            </div>
            <div className="wa-lead-results">
              {leadResults.length === 0 && <p className="wa-muted">{leadQuery ? 'No leads matched.' : 'Type a name or number to find a scraped lead.'}</p>}
              {leadResults.map(row => (
                <button key={row.id} type="button" className="wa-lead-row" onClick={() => startChat(row)}>
                  <span className="wa-avatar">{(row.name || '?').charAt(0).toUpperCase()}</span>
                  <span>
                    <b>{row.name}</b>
                    <small>{row.phone || 'No number'} · {row.city || 'Unknown'}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
