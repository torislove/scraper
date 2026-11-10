/**
 * routes/whatsapp.js — own-account WhatsApp CRM API.
 *
 * The customer creates everything: products, messages, snippets, automations.
 * We never ship marketing copy and never require an API key.
 */

const express = require('express');
const dbAdapter = require('../config/dbAdapter');
const waStore = require('../services/whatsapp/waStore');
const waSession = require('../services/whatsapp/waSession');

const router = express.Router();
const MAX_EVENT_SCAN = 5000;

/* ── helpers ───────────────────────────────────────────────────────────── */

function digits(value) {
  return waStore.normalizeDigits(value);
}

function findLead(id) {
  if (!id) return null;
  return dbAdapter.getVendors().find(v => v.id === id) || null;
}

function normalizedName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchLeadByName(name) {
  const target = normalizedName(name);
  if (!target) return null;
  const leads = dbAdapter.getVendors();
  let best = null;
  let bestScore = 0;
  for (const lead of leads) {
    const leadName = normalizedName(lead.name);
    if (!leadName) continue;
    let score = 0;
    if (leadName === target) score = 100;
    else if (leadName.includes(target) || target.includes(leadName)) {
      score = Math.min(leadName.length, target.length) / Math.max(leadName.length, target.length) * 80;
    }
    if (score > bestScore) {
      bestScore = score;
      best = lead;
    }
  }
  return bestScore >= 55 ? best : null;
}

/** Only fields the engines actually returned. Never invents a value. */
function scrapedSnapshot(lead) {
  if (!lead) return null;
  return {
    id: lead.id || null,
    name: lead.name || 'Unknown',
    category: lead.category || 'Unknown',
    phone: lead.phone || 'Unknown',
    phones: Array.isArray(lead.phones) ? lead.phones : [],
    phoneType: lead.phoneType || 'Unknown',
    email: lead.email || 'Unknown',
    website: lead.website || 'Unknown',
    address: lead.address || 'Unknown',
    city: lead.city || 'Unknown',
    district: lead.district || 'Unknown',
    state: lead.state || 'Unknown',
    pincode: lead.pincode || 'Unknown',
    mandal: lead.mandal || 'Unknown',
    village: lead.village || 'Unknown',
    rating: lead.rating ?? 'Unknown',
    reviewsCount: lead.reviewsCount ?? 'Unknown',
    operatingHours: lead.operatingHours || 'Unknown',
    mapsLink: lead.mapsLink || '',
    latitude: lead.latitude ?? null,
    longitude: lead.longitude ?? null,
    source: lead.source || 'Unknown',
    sourceEngine: lead.sourceEngine || 'Unknown',
    zoneName: lead.zoneName || 'Unknown',
    scrapedAt: lead.scrapedAt || lead.lastScrapedAt || 'Unknown',
    logo: lead.logo || '',
    photo: lead.photo || '',
    images: Array.isArray(lead.images) ? lead.images : [],
    instagram: lead.instagram || 'Unknown',
    facebook: lead.facebook || 'Unknown',
    whatsappAvailable: Boolean(lead.whatsappAvailable),
    whatsappLink: lead.whatsappLink || ''
  };
}

function fillVariables(text, lead, session) {
  const phone = lead?.phone ? String(lead.phone) : '';
  return String(text || '')
    .replace(/\{\{\s*business\s*\}\}/gi, lead?.name || 'there')
    .replace(/\{\{\s*city\s*\}\}/gi, lead?.city || '')
    .replace(/\{\{\s*phone\s*\}\}/gi, phone)
    .replace(/\{\{\s*my_name\s*\}\}/gi, session.businessName || 'our team');
}

function withinQuietHours(session) {
  const parse = value => {
    const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const start = parse(session.quietStart);
  const end = parse(session.quietEnd);
  if (start == null || end == null || start === end) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return start < end ? (minutes >= start && minutes < end) : (minutes >= start || minutes < end);
}

/** Count of outbound messages actually accepted by WhatsApp today. */
function sentToday() {
  const today = new Date().toISOString().slice(0, 10);
  return waStore.getEvents(MAX_EVENT_SCAN)
    .filter(e => e.type === 'message_sent' && String(e.at || '').slice(0, 10) === today)
    .length;
}

function canAutoSend(session, { force = false } = {}) {
  if (session.autoSend !== true) {
    return { ok: false, reason: 'Auto-send is off. The message will open in WhatsApp for you to press send.' };
  }
  if (!force && withinQuietHours(session)) {
    return { ok: false, reason: `Quiet hours are ${session.quietStart}–${session.quietEnd}. Turn them off in settings to send now.` };
  }
  const cap = Number(session.dailyCap) || 120;
  if (!force && sentToday() >= cap) {
    return { ok: false, reason: `Daily limit reached (${cap} messages). Raise it in settings or send manually.` };
  }
  return { ok: true };
}

/** Turn a product into the text the customer's own WhatsApp will carry. */
function productText(products, session) {
  return products.map(product => {
    const price = product.price !== '' && product.price != null
      ? ` — ${product.currency || 'INR'} ${product.price}`
      : '';
    const lines = [`*${product.name}*${price}`];
    if (product.description) lines.push(product.description);
    if (product.link) lines.push(product.link);
    if (product.paymentLink) lines.push(`Pay: ${product.paymentLink}`);
    return lines.join('\n');
  }).join('\n\n');
}

async function ensureConversation({ leadId, phone, name, city }) {
  const lead = leadId ? findLead(leadId) : null;
  return waStore.upsertConversation({
    leadId: leadId || lead?.id || null,
    phone: phone || lead?.phone || '',
    name: name || lead?.name || 'Unknown',
    city: city || lead?.city || ''
  });
}

async function deliver({ conversation, text, type = 'text', productIds = [], snippetId = null, auto = false, force = false, scheduledFor = null }) {
  const session = waStore.getSession();
  if (waStore.isOptedOut(conversation.phone)) {
    throw Object.assign(new Error('This contact opted out of WhatsApp messages.'), { statusCode: 409 });
  }

  const body = (() => {
    const base = fillVariables(text, findLead(conversation.leadId), session);
    if (type !== 'product' || !Array.isArray(productIds) || !productIds.length) return base;
    const products = waStore.getProducts().filter(p => productIds.includes(p.id));
    if (!products.length) return base;
    return base ? `${base}\n\n${productText(products, session)}` : productText(products, session);
  })();
  const base = {
    conversationId: conversation.id,
    leadId: conversation.leadId,
    phone: conversation.phone,
    direction: 'out',
    type,
    body,
    productIds,
    snippetId,
    mode: auto ? 'auto' : 'assisted',
    scheduledFor
  };

  if (scheduledFor && new Date(scheduledFor).getTime() > Date.now() + 2000) {
    const message = waStore.addMessage({ ...base, status: 'scheduled' });
    waStore.upsertConversation({ ...conversation, lastMessageAt: new Date().toISOString() });
    waStore.logEvent('message_scheduled', { conversationId: conversation.id, messageId: message.id, scheduledFor });
    return { message, mode: 'scheduled', url: waSession.toSendUrl(conversation.phone, body) };
  }

  const gate = auto ? canAutoSend(session, { force }) : { ok: false };
  let result = { ok: false, mode: 'assisted', url: waSession.toSendUrl(conversation.phone, body) };

  if (gate.ok) {
    result = await waSession.sendNow({ phone: conversation.phone, text: body });
  }

  const message = waStore.addMessage({
    ...base,
    mode: result.mode || 'assisted',
    status: result.ok ? 'sent' : 'queued',
    sentAt: result.ok ? new Date().toISOString() : null,
    errorReason: result.error || gate.reason || ''
  });
  waStore.upsertConversation({ ...conversation, lastMessageAt: new Date().toISOString(), unread: 0 });
  waStore.logEvent(result.ok ? 'message_sent' : 'message_prepared', {
    conversationId: conversation.id,
    messageId: message.id,
    mode: message.mode,
    reason: message.errorReason
  });

  return { message, mode: message.mode, url: result.url, error: message.errorReason || '' };
}

/* ── status / connection ───────────────────────────────────────────────── */

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    state: waSession.getState(),
    session: waStore.getSession(),
    analytics: waStore.getAnalytics()
  });
});

router.post('/connect', (req, res) => {
  // Start in the background: the first QR can take several seconds and the
  // client polls /status instead of holding one long request.
  waSession.connect().catch(() => {});
  setTimeout(() => {
    res.json({ ok: true, state: waSession.getState() });
  }, 700);
});

router.post('/disconnect', async (req, res) => {
  const state = await waSession.disconnect({ wipe: Boolean(req.body?.wipe) });
  res.json({ ok: true, state });
});

router.post('/sync', async (req, res) => {
  const chats = await waSession.readChatList();
  const saved = [];
  for (const chat of chats) {
    const lead = matchLeadByName(chat.name);
    const conversation = waStore.upsertConversation({
      leadId: lead?.id || null,
      phone: lead?.phone || '',
      name: chat.name,
      city: lead?.city || '',
      unread: chat.unread || 0,
      lastMessageAt: new Date().toISOString()
    });
    saved.push({ ...conversation, preview: chat.preview, scrapedLeadId: lead?.id || null });
  }
  res.json({ ok: true, chats: saved.length, conversations: saved });
});

/* ── leads for the composer ────────────────────────────────────────────── */

router.get('/leads', (req, res) => {
  const q = normalizedName(req.query.q || '');
  const onlyPhone = String(req.query.hasPhone || '') === '1';
  let leads = dbAdapter.getVendors();
  if (onlyPhone) leads = leads.filter(l => String(l.phone || '').replace(/[^0-9]/g, '').length >= 10);
  if (q) {
    leads = leads.filter(l =>
      normalizedName(l.name).includes(q)
      || String(l.phone || '').replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))
      || normalizedName(l.city).includes(q)
    );
  }
  res.json({
    ok: true,
    leads: leads.slice(0, 60).map(l => ({
      id: l.id,
      name: l.name || 'Unknown',
      phone: l.phone || '',
      city: l.city || '',
      category: l.category || '',
      address: l.address || ''
    }))
  });
});

/* ── conversations ─────────────────────────────────────────────────────── */

router.get('/conversations', (req, res) => {
  const filter = String(req.query.filter || 'all');
  const q = normalizedName(req.query.q || '');
  let list = waStore.getConversations();

  if (filter === 'unread') list = list.filter(c => Number(c.unread) > 0);
  if (filter === 'needs_reply') list = list.filter(c => Number(c.unread) > 0 || !c.lastInboundAt);
  if (filter === 'scheduled') {
    const pending = new Set(waStore.listScheduled().map(m => m.conversationId));
    list = list.filter(c => pending.has(c.id));
  }
  if (q) {
    list = list.filter(c =>
      normalizedName(c.name).includes(q)
      || String(c.phone || '').includes(q.replace(/[^0-9]/g, ''))
      || normalizedName(c.city).includes(q)
    );
  }

  list = list
    .map(c => {
      const messages = waStore.listMessages(c.id, 1);
      const last = messages[messages.length - 1] || null;
      return { ...c, lastMessage: last ? last.body : '', lastMessageStatus: last ? last.status : '', lastMessageDirection: last ? last.direction : '' };
    })
    .sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')));

  res.json({ ok: true, conversations: list });
});

router.post('/conversations', async (req, res) => {
  const conversation = await ensureConversation(req.body || {});
  res.json({ ok: true, conversation });
});

router.get('/conversations/:id', (req, res) => {
  const conversation = waStore.findConversation(req.params.id);
  if (!conversation) return res.status(404).json({ ok: false, error: 'Conversation not found' });
  const lead = findLead(conversation.leadId);
  res.json({
    ok: true,
    conversation,
    messages: waStore.listMessages(conversation.id),
    lead: scrapedSnapshot(lead)
  });
});

router.patch('/conversations/:id', (req, res) => {
  const conversation = waStore.findConversation(req.params.id);
  if (!conversation) return res.status(404).json({ ok: false, error: 'Conversation not found' });
  const allowed = ['stage', 'owner', 'tags', 'dealValue', 'notes', 'tasks', 'unread', 'name', 'city'];
  const patch = {};
  for (const key of allowed) if (req.body?.[key] !== undefined) patch[key] = req.body[key];
  const updated = waStore.upsertConversation({ ...conversation, ...patch });
  res.json({ ok: true, conversation: updated });
});

router.delete('/conversations/:id', (req, res) => {
  waStore.deleteConversation(req.params.id);
  res.json({ ok: true });
});

/* ── messages ──────────────────────────────────────────────────────────── */

router.post('/messages', async (req, res, next) => {
  try {
    const { leadId, phone, name, city, text = '', type = 'text', productIds = [], snippetId = null, auto = false, force = false, scheduledFor = null } = req.body || {};
    if (!phone && !leadId) return res.status(400).json({ ok: false, error: 'A phone number or lead is required.' });
    if (!String(text).trim()) return res.status(400).json({ ok: false, error: 'Write a message first.' });

    const conversation = await ensureConversation({ leadId, phone, name, city });
    const result = await deliver({ conversation, text, type, productIds, snippetId, auto, force, scheduledFor });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/bulk', async (req, res, next) => {
  try {
    const { recipients = [], text = '', auto = false, force = false, throttleSeconds = 35 } = req.body || {};
    if (!Array.isArray(recipients) || !recipients.length) return res.status(400).json({ ok: false, error: 'Pick at least one recipient.' });
    const session = waStore.getSession();
    const gap = Math.max(20, Math.min(120, Number(throttleSeconds) || 35));
    const results = [];

    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];
      if (waStore.isOptedOut(recipient.phone)) {
        results.push({ phone: recipient.phone, ok: false, error: 'opted out' });
        continue;
      }
      const conversation = await ensureConversation(recipient);
      const scheduledFor = index === 0 ? null : new Date(Date.now() + index * gap * 1000).toISOString();
      const result = await deliver({ conversation, text, auto, force, scheduledFor });
      results.push({ phone: conversation.phone, name: conversation.name, ok: true, messageId: result.message.id, scheduledFor });
    }

    res.json({
      ok: true,
      queued: results.length,
      auto,
      pacingSeconds: gap,
      note: auto
        ? 'Messages send from your WhatsApp while the app is open.'
        : 'Each message opens in WhatsApp for you to press send.',
      results
    });
  } catch (error) {
    next(error);
  }
});

router.get('/messages', (req, res) => {
  const { conversationId } = req.query;
  res.json({ ok: true, messages: waStore.listMessages(conversationId, 300) });
});

router.post('/optout', (req, res) => {
  const entry = waStore.addOptout(req.body?.phone, req.body?.reason || 'manual');
  res.json({ ok: true, optout: entry });
});

/* ── products ──────────────────────────────────────────────────────────── */

router.get('/products', (req, res) => res.json({ ok: true, products: waStore.getProducts() }));
router.post('/products', (req, res) => res.json({ ok: true, product: waStore.upsertProduct(req.body || {}) }));
router.patch('/products/:id', (req, res) => res.json({ ok: true, product: waStore.upsertProduct({ ...(req.body || {}), id: req.params.id }) }));
router.delete('/products/:id', (req, res) => { waStore.deleteProduct(req.params.id); res.json({ ok: true }); });

/* ── snippets ──────────────────────────────────────────────────────────── */

router.get('/snippets', (req, res) => res.json({ ok: true, snippets: waStore.getSnippets() }));
router.post('/snippets', (req, res) => res.json({ ok: true, snippet: waStore.upsertSnippet(req.body || {}) }));
router.patch('/snippets/:id', (req, res) => res.json({ ok: true, snippet: waStore.upsertSnippet({ ...(req.body || {}), id: req.params.id }) }));
router.delete('/snippets/:id', (req, res) => { waStore.deleteSnippet(req.params.id); res.json({ ok: true }); });

/* ── automations ───────────────────────────────────────────────────────── */

router.get('/automations', (req, res) => res.json({ ok: true, automations: waStore.getAutomations() }));
router.post('/automations', (req, res) => res.json({ ok: true, automation: waStore.upsertAutomation(req.body || {}) }));
router.patch('/automations/:id', (req, res) => res.json({ ok: true, automation: waStore.upsertAutomation({ ...(req.body || {}), id: req.params.id }) }));
router.delete('/automations/:id', (req, res) => { waStore.deleteAutomation(req.params.id); res.json({ ok: true }); });

/* ── analytics / audit ─────────────────────────────────────────────────── */

router.get('/analytics', (req, res) => res.json({ ok: true, analytics: waStore.getAnalytics() }));
router.get('/events', (req, res) => res.json({ ok: true, events: waStore.getEvents(Number(req.query.limit) || 200) }));

/* ── settings ──────────────────────────────────────────────────────────── */

router.patch('/settings', (req, res) => {
  const allowed = ['mode', 'autoSend', 'pacingSeconds', 'dailyCap', 'quietStart', 'quietEnd', 'businessName'];
  const patch = {};
  for (const key of allowed) if (req.body?.[key] !== undefined) patch[key] = req.body[key];
  res.json({ ok: true, session: waStore.saveSession(patch) });
});

module.exports = router;
