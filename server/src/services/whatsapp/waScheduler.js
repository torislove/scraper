/**
 * waScheduler.js — the engine behind scheduled messages and inbox sync.
 *
 * Two jobs, both tiny:
 *
 *  1. Every 30 s, take messages the customer scheduled whose time has come and
 *     hand them to the same `deliver` path the UI uses (so opt-out, quiet hours,
 *     daily caps and product rendering all apply exactly once).
 *  2. Every chat-list read, match a WhatsApp chat name to a scraped lead and
 *     upsert the conversation. Names are matched conservatively (exact first,
 *     then containment with a high floor) because sending to the wrong business
 *     is worse than leaving a chat unlinked.
 *
 * Nothing here requires an API key: the only thing it drives is the customer's
 * own connected WhatsApp Web session.
 */

const dbAdapter = require('../../config/dbAdapter');
const waStore = require('./waStore');
const waSession = require('./waSession');

const TICK_MS = 30_000;

let timer = null;
let ticking = false;

function normalizedName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchLeadByName(name) {
  const target = normalizedName(name);
  if (!target) return null;
  let best = null;
  let bestScore = 0;
  for (const lead of dbAdapter.getVendors()) {
    const leadName = normalizedName(lead.name);
    if (!leadName) continue;
    let score = 0;
    if (leadName === target) {
      score = 100;
    } else if (leadName.includes(target) || target.includes(leadName)) {
      score = (Math.min(leadName.length, target.length) / Math.max(leadName.length, target.length)) * 80;
    }
    if (score > bestScore) {
      bestScore = score;
      best = lead;
    }
  }
  return bestScore >= 55 ? best : null;
}

function minutesOf(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function withinQuietHours(session) {
  const start = minutesOf(session.quietStart);
  const end = minutesOf(session.quietEnd);
  if (start == null || end == null || start === end) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return start < end ? (minutes >= start && minutes < end) : (minutes >= start || minutes < end);
}

function sentToday() {
  const today = new Date().toISOString().slice(0, 10);
  return waStore.getEvents(5000)
    .filter(e => e.type === 'message_sent' && String(e.at || '').slice(0, 10) === today)
    .length;
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const session = waStore.getSession();
    const due = waStore.dueScheduled();
    if (due.length) {
      const state = waSession.getState();
      const canSend = session.autoSend === true
        && state.status === 'connected'
        && !withinQuietHours(session)
        && sentToday() < (Number(session.dailyCap) || 120);

      for (const message of due) {
        if (!canSend) {
          // Leave it scheduled: the customer can resume later. Never silently
          // drop a message the customer wrote.
          continue;
        }
        if (waStore.isOptedOut(message.phone)) {
          waStore.updateMessage(message.id, {
            status: 'failed',
            errorReason: 'Contact opted out of WhatsApp messages.',
            updatedAt: new Date().toISOString()
          });
          continue;
        }
        try {
          const result = await waSession.sendNow({ phone: message.phone, text: message.body });
          if (result.ok) {
            wsUpdate(message, { status: 'sent', sentAt: new Date().toISOString(), mode: 'auto' });
            waStore.logEvent('message_sent', { conversationId: message.conversationId, messageId: message.id, mode: 'auto', source: 'scheduler' });
            await new Promise(resolve => setTimeout(resolve, Math.max(20, Number(session.pacingSeconds) || 35) * 1000));
          } else {
            wsUpdate(message, { status: 'queued', errorReason: result.error || 'WhatsApp is not connected.' });
          }
        } catch (error) {
          wsUpdate(message, { status: 'queued', errorReason: error.message });
        }
      }
    }

    waStore.saveSession({ lastSeenAt: new Date().toISOString() });
  } catch (error) {
    try { waStore.logEvent('scheduler_error', { message: error.message }); } catch (e) {}
  } finally {
    ticking = false;
  }
}

function wsUpdate(message, patch) {
  waStore.updateMessage(message.id, { ...patch, updatedAt: new Date().toISOString() });
}

/**
 * Called by waSession whenever it reads the chat list. Unread chats become
 * conversations so the inbox is populated with real, current chats.
 */
function onChats(chats) {
  if (!Array.isArray(chats) || !chats.length) return;
  for (const chat of chats) {
    const lead = matchLeadByName(chat.name);
    const existing = waStore.getConversations().find(c => normalizedName(c.name) === normalizedName(chat.name));
    waStore.upsertConversation({
      id: existing?.id,
      leadId: existing?.leadId || lead?.id || null,
      phone: existing?.phone || lead?.phone || '',
      name: chat.name,
      city: existing?.city || lead?.city || '',
      unread: Number(chat.unread) || 0,
      lastMessageAt: new Date().toISOString(),
      lastInboundAt: Number(chat.unread) > 0 ? new Date().toISOString() : existing?.lastInboundAt || null
    });
  }
}

function start() {
  if (timer) return;
  waSession.onChats = onChats;
  timer = setInterval(() => { tick().catch(() => {}); }, TICK_MS);
  if (timer.unref) timer.unref();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick, onChats, matchLeadByName };
