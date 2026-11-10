/**
 * waStore.js — local, durable storage for the WhatsApp CRM.
 *
 * Everything stays on the customer's machine. No API keys, no cloud relay:
 * the only credential is the WhatsApp Web session in `data/wa-profile`.
 *
 * Files (under DATA_DIR):
 *   wa_session.json       connected number + mode + caps
 *   wa_conversations.json one thread per lead/chat
 *   wa_messages.json      messages, statuses, schedules
 *   wa_products.json      customer-authored catalogue
 *   wa_snippets.json      customer-authored saved replies
 *   wa_automations.json   customer-authored automations
 *   wa_optouts.json       suppression list
 *   wa_events.json        audit log
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR, ensureDir } = require('../../config/paths');

const FILES = {
  session: 'wa_session.json',
  conversations: 'wa_conversations.json',
  messages: 'wa_messages.json',
  products: 'wa_products.json',
  snippets: 'wa_snippets.json',
  automations: 'wa_automations.json',
  optouts: 'wa_optouts.json',
  events: 'wa_events.json'
};

const MAX_MESSAGES = 20000;
const MAX_EVENTS = 5000;
const cache = new Map();

function filePath(name) {
  return path.join(DATA_DIR, FILES[name]);
}

function read(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8');
    const parsed = JSON.parse(raw);
    cache.set(name, parsed);
    return parsed;
  } catch (e) {
    const value = typeof fallback === 'function' ? fallback() : fallback;
    cache.set(name, value);
    return value;
  }
}

function write(name, value) {
  cache.set(name, value);
  try {
    ensureDir(DATA_DIR);
    const target = filePath(name);
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, target);
  } catch (e) {
    // Never let a disk hiccup break a chat action.
  }
  return value;
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

function normalizeDigits(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 12) return digits.slice(-12);
  return digits;
}

/* ── session ───────────────────────────────────────────────────────────── */

function getSession() {
  return read('session', () => ({
    status: 'disconnected',
    displayPhone: '',
    mode: 'assisted',
    autoSend: false,
    pacingSeconds: 35,
    dailyCap: 120,
    quietStart: '21:00',
    quietEnd: '09:00',
    connectedAt: null,
    lastSeenAt: null
  }));
}

function saveSession(patch) {
  return write('session', { ...getSession(), ...patch, updatedAt: now() });
}

/* ── conversations ─────────────────────────────────────────────────────── */

function getConversations() {
  return read('conversations', []);
}

function findConversation(key) {
  const list = getConversations();
  return list.find(c => c.id === key || c.leadId === key || c.phone === normalizeDigits(key)) || null;
}

function upsertConversation(patch) {
  const list = getConversations();
  const phone = normalizeDigits(patch.phone || '');
  let index = -1;
  if (patch.id) index = list.findIndex(c => c.id === patch.id);
  if (index === -1 && patch.leadId) index = list.findIndex(c => c.leadId === patch.leadId);
  if (index === -1 && phone) index = list.findIndex(c => c.phone === phone);
  if (index === -1 && patch.name) index = list.findIndex(c => c.name && c.name.toLowerCase() === String(patch.name).toLowerCase());

  if (index === -1) {
    const created = {
      id: id('conv'),
      leadId: patch.leadId || null,
      phone,
      name: patch.name || 'Unknown',
      city: patch.city || '',
      stage: patch.stage || 'new',
      owner: patch.owner || '',
      tags: patch.tags || [],
      unread: Number(patch.unread) || 0,
      lastMessageAt: patch.lastMessageAt || now(),
      lastInboundAt: patch.lastInboundAt || null,
      dealValue: patch.dealValue || null,
      notes: patch.notes || [],
      tasks: patch.tasks || [],
      createdAt: now(),
      updatedAt: now()
    };
    list.unshift(created);
    write('conversations', list);
    return created;
  }

  const current = list[index];
  const updated = {
    ...current,
    ...patch,
    id: current.id,
    phone: phone || current.phone,
    name: patch.name || current.name,
    unread: patch.unread != null ? Number(patch.unread) : current.unread,
    updatedAt: now()
  };
  list[index] = updated;
  write('conversations', list);
  return updated;
}

function deleteConversation(key) {
  const list = getConversations().filter(c => c.id !== key && c.leadId !== key);
  write('conversations', list);
  return true;
}

/* ── messages ──────────────────────────────────────────────────────────── */

function getMessages() {
  return read('messages', []);
}

function listMessages(conversationId, limit = 200) {
  return getMessages()
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .slice(-limit);
}

/** Messages the customer scheduled that are still waiting to go out. */
function listScheduled() {
  return getMessages().filter(m => m.status === 'scheduled');
}

function dueScheduled(nowMs = Date.now()) {
  return listScheduled().filter(m => {
    const when = new Date(m.scheduledFor).getTime();
    return Number.isFinite(when) && when <= nowMs;
  });
}

function addMessage(patch) {
  const list = getMessages();
  const message = {
    id: id('msg'),
    conversationId: patch.conversationId || null,
    leadId: patch.leadId || null,
    phone: normalizeDigits(patch.phone || ''),
    direction: patch.direction || 'out',
    type: patch.type || 'text',
    body: patch.body || '',
    media: patch.media || null,
    productIds: patch.productIds || [],
    snippetId: patch.snippetId || null,
    status: patch.status || 'queued',
    errorReason: patch.errorReason || '',
    mode: patch.mode || 'assisted',
    scheduledFor: patch.scheduledFor || null,
    sentAt: patch.sentAt || null,
    deliveredAt: patch.deliveredAt || null,
    readAt: patch.readAt || null,
    createdAt: now()
  };
  list.push(message);
  write('messages', list.slice(-MAX_MESSAGES));
  return message;
}

function updateMessage(messageId, patch) {
  const list = getMessages();
  const index = list.findIndex(m => m.id === messageId);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch, updatedAt: now() };
  write('messages', list);
  return list[index];
}

/* ── products ──────────────────────────────────────────────────────────── */

function getProducts() {
  return read('products', []);
}

function upsertProduct(patch) {
  const list = getProducts();
  const index = patch.id ? list.findIndex(p => p.id === patch.id) : -1;
  if (index === -1) {
    const created = {
      id: id('prod'),
      name: patch.name || 'Untitled product',
      type: patch.type || 'product',
      description: patch.description || '',
      price: patch.price ?? '',
      compareAt: patch.compareAt ?? '',
      currency: patch.currency || 'INR',
      sku: patch.sku || '',
      images: patch.images || [],
      video: patch.video || '',
      link: patch.link || '',
      paymentLink: patch.paymentLink || '',
      variants: patch.variants || [],
      collection: patch.collection || '',
      availability: patch.availability || 'in stock',
      visibleInCatalog: patch.visibleInCatalog !== false,
      createdAt: now(),
      updatedAt: now()
    };
    list.unshift(created);
    write('products', list);
    return created;
  }
  list[index] = { ...list[index], ...patch, id: list[index].id, updatedAt: now() };
  write('products', list);
  return list[index];
}

function deleteProduct(productId) {
  write('products', getProducts().filter(p => p.id !== productId));
  return true;
}

/* ── snippets ──────────────────────────────────────────────────────────── */

function getSnippets() {
  return read('snippets', []);
}

function upsertSnippet(patch) {
  const list = getSnippets();
  const index = patch.id ? list.findIndex(s => s.id === patch.id) : -1;
  if (index === -1) {
    const created = {
      id: id('snip'),
      name: patch.name || 'Untitled snippet',
      language: patch.language || 'en',
      body: patch.body || '',
      header: patch.header || '',
      footer: patch.footer || '',
      buttons: patch.buttons || [],
      version: 1,
      createdAt: now(),
      updatedAt: now()
    };
    list.unshift(created);
    write('snippets', list);
    return created;
  }
  list[index] = { ...list[index], ...patch, id: list[index].id, version: (list[index].version || 1) + 1, updatedAt: now() };
  write('snippets', list);
  return list[index];
}

function deleteSnippet(snippetId) {
  write('snippets', getSnippets().filter(s => s.id !== snippetId));
  return true;
}

/* ── automations ───────────────────────────────────────────────────────── */

function getAutomations() {
  return read('automations', []);
}

function upsertAutomation(patch) {
  const list = getAutomations();
  const index = patch.id ? list.findIndex(a => a.id === patch.id) : -1;
  if (index === -1) {
    const created = {
      id: id('auto'),
      name: patch.name || 'Untitled automation',
      enabled: patch.enabled !== false,
      trigger: patch.trigger || 'lead_added',
      audience: patch.audience || 'all',
      delayMinutes: Number(patch.delayMinutes) || 0,
      quietHours: patch.quietHours !== false,
      dailyCap: Number(patch.dailyCap) || 50,
      actions: patch.actions || [],
      stopWhen: patch.stopWhen || 'reply',
      createdAt: now(),
      updatedAt: now()
    };
    list.unshift(created);
    write('automations', list);
    return created;
  }
  list[index] = { ...list[index], ...patch, id: list[index].id, updatedAt: now() };
  write('automations', list);
  return list[index];
}

function deleteAutomation(automationId) {
  write('automations', getAutomations().filter(a => a.id !== automationId));
  return true;
}

/* ── opt-outs / events ─────────────────────────────────────────────────── */

function getOptouts() {
  return read('optouts', []);
}

function addOptout(phone, reason = 'manual') {
  const list = getOptouts();
  const digits = normalizeDigits(phone);
  if (!digits) return null;
  if (list.some(o => o.phone === digits)) return list.find(o => o.phone === digits);
  const entry = { phone: digits, reason, createdAt: now() };
  list.unshift(entry);
  write('optouts', list);
  return entry;
}

function isOptedOut(phone) {
  const digits = normalizeDigits(phone);
  return getOptouts().some(o => o.phone === digits);
}

function logEvent(type, payload = {}) {
  const list = read('events', []);
  list.push({ id: id('evt'), type, ...payload, at: now() });
  write('events', list.slice(-MAX_EVENTS));
}

function getEvents(limit = 200) {
  return read('events', []).slice(-limit).reverse();
}

/* ── analytics ─────────────────────────────────────────────────────────── */

function getAnalytics() {
  const messages = getMessages();
  const conversations = getConversations();
  const outbound = messages.filter(m => m.direction === 'out');
  const inbound = messages.filter(m => m.direction === 'in');
  return {
    conversations: conversations.length,
    messagesOut: outbound.length,
    messagesIn: inbound.length,
    delivered: outbound.filter(m => m.status === 'delivered' || m.status === 'read').length,
    read: outbound.filter(m => m.status === 'read').length,
    failed: outbound.filter(m => m.status === 'failed').length,
    scheduled: outbound.filter(m => m.status === 'scheduled').length,
    replyRate: outbound.length ? Math.round((inbound.length / outbound.length) * 100) : 0,
    won: conversations.filter(c => c.stage === 'won').length,
    pipelineValue: conversations
      .filter(c => !['lost'].includes(c.stage))
      .reduce((sum, c) => sum + (Number(c.dealValue) || 0), 0)
  };
}

module.exports = {
  normalizeDigits,
  getSession,
  saveSession,
  getConversations,
  findConversation,
  upsertConversation,
  deleteConversation,
  listMessages,
  listScheduled,
  dueScheduled,
  addMessage,
  updateMessage,
  getProducts,
  upsertProduct,
  deleteProduct,
  getSnippets,
  upsertSnippet,
  deleteSnippet,
  getAutomations,
  upsertAutomation,
  deleteAutomation,
  getOptouts,
  addOptout,
  isOptedOut,
  logEvent,
  getEvents,
  getAnalytics
};
