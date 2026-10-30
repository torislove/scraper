import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, Megaphone, ShieldAlert, Sparkles } from 'lucide-react';
import { getNotifications, markNotificationRead, getWorkspaceStatus } from './api';

function timeAgo(value) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

const KIND_ICON = { success: Sparkles, warning: ShieldAlert, info: Megaphone };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [client, setClient] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [messages, status] = await Promise.all([
        getNotifications(),
        getWorkspaceStatus()
      ]);
      setItems(messages.notifications || []);
      setUnread(messages.unread || 0);
      setClient(status);
    } catch (e) {
      /* engine may still be booting */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return undefined;
    }

    const measure = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) setAnchor({ top: rect.bottom + 10, right: Math.max(12, window.innerWidth - rect.right) });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = event => {
      const insideTrigger = wrapRef.current?.contains(event.target);
      const insidePanel = panelRef.current?.contains(event.target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const readOne = async item => {
    if (item.read) return;
    setItems(prev => prev.map(entry => (entry.id === item.id ? { ...entry, read: true } : entry)));
    setUnread(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(item.id);
    } catch (e) {
      /* retried on next poll */
    }
  };

  const readAll = async () => {
    const pending = items.filter(item => !item.read);
    setItems(prev => prev.map(entry => ({ ...entry, read: true })));
    setUnread(0);
    await Promise.allSettled(pending.map(item => markNotificationRead(item.id)));
  };

  const suspended = client?.status === 'suspended';

  return (
    <div className="v2-notif" ref={wrapRef}>
      <button
        type="button"
        className={`v2-notif-trigger${unread ? ' has-unread' : ''}${suspended ? ' is-suspended' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={suspended ? 'New searches are paused on this workspace' : 'Messages from the Scraper team'}
      >
        <Bell size={14} />
        {unread ? <b>{unread > 9 ? '9+' : unread}</b> : null}
      </button>

      {open && anchor ? createPortal(
        <div
          className="v2-notif-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{ top: anchor.top, right: anchor.right }}
        >
          <div className="v2-notif-head">
            <div>
              <b>Messages</b>
              <span>
                {client
                  ? `${client.name || 'This workspace'} · ${String(client.plan || 'free').toUpperCase()}`
                  : 'From the Scraper team'}
              </span>
            </div>
            {unread ? (
              <button type="button" className="v2-notif-readall" onClick={readAll}>
                <CheckCheck size={12} /> Mark all read
              </button>
            ) : null}
          </div>

          {suspended ? (
            <div className="v2-notif-suspended">
              <ShieldAlert size={14} />
              <span>New searches are paused. Saved folders, notes and exports still work.</span>
            </div>
          ) : null}

          <div className="v2-notif-list">
            {items.length === 0 ? (
              <div className="v2-notif-empty">
                <Bell size={18} />
                <b>Nothing yet</b>
                <span>Updates and notices from the Scraper team will land here.</span>
              </div>
            ) : (
              items.map(item => {
                const Icon = KIND_ICON[item.kind] || Megaphone;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`v2-notif-item kind-${item.kind || 'info'}${item.read ? ' is-read' : ''}`}
                    onClick={() => readOne(item)}
                  >
                    <span className="v2-notif-icon"><Icon size={13} /></span>
                    <span className="v2-notif-copy">
                      <b>{item.title}</b>
                      <span>{item.body}</span>
                      <em>{timeAgo(item.createdAt)}{item.audience === 'all' ? ' · all clients' : ''}</em>
                    </span>
                    {!item.read ? <i className="v2-notif-dot" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
