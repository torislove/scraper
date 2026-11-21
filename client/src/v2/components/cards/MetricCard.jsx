import React from 'react';
import { motion } from 'framer-motion';
import { CircleDot, Zap } from 'lucide-react';
import { StatusPill, cx, relativeTime } from '../../ui';

export function vendorInitial(vendor) {
  return (vendor?.name || '?').slice(0, 1).toUpperCase();
}

export function hasValidLogo(vendor) {
  return Boolean(vendor?.logo) && !/ui-avatars|google\.com\/s2\/favicons/i.test(vendor.logo);
}

export function VendorAvatar({ vendor, size = 36 }) {
  const palette = ['#059669', '#0284c7', '#0e7490', '#d97706', '#0891b2', '#db2777'];
  const code = (vendor?.name || 'A').charCodeAt(0) % palette.length;
  const accent = palette[code];
  return (
    <span
      className="v2-vendor-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${accent}18, ${accent}2c)`,
        border: `1px solid ${accent}38`,
        color: accent
      }}
    >
      {hasValidLogo(vendor)
        ? <img src={vendor.logo} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />
        : <b>{vendorInitial(vendor)}</b>}
    </span>
  );
}

const TONE_THEME = {
  lime: { bg: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)', iconBg: '#dcfce7', iconColor: '#059669', bar: '#10b981' },
  cyan: { bg: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', iconBg: '#dbeafe', iconColor: '#2563eb', bar: '#3b82f6' },
  violet: { bg: 'linear-gradient(135deg, #ecfeff 0%, #ffffff 100%)', iconBg: '#cffafe', iconColor: '#0e7490', bar: '#06b6d4' },
  amber: { bg: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', iconBg: '#fef3c7', iconColor: '#d97706', bar: '#f59e0b' }
};

export function MetricCard({ label, value, sub, tone = 'lime', icon: Icon, pulse = false, percent = null }) {
  const theme = TONE_THEME[tone] || TONE_THEME.lime;
  return (
    <motion.div
      className={cx('v2-metric-card', `tone-${tone}`, pulse && 'is-pulsing')}
      whileHover={{ y: -3, transition: { duration: 0.16 } }}
      style={{
        background: theme.bg,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <span
        className="v2-metric-icon"
        style={{
          background: theme.iconBg,
          color: theme.iconColor,
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0
        }}
      >
        {Icon && <Icon size={18} />}
      </span>
      <span className="v2-metric-copy" style={{ flex: 1, minWidth: 0 }}>
        <small>{label}</small>
        <b>{value}</b>
        {sub && <em>{sub}</em>}
        {percent != null && Number.isFinite(percent) && (
          <div style={{ marginTop: 6, height: 4, borderRadius: 99, background: 'rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: theme.bar, borderRadius: 99 }}
            />
          </div>
        )}
      </span>
    </motion.div>
  );
}

export function ToggleTile({ active, onClick, label, detail, icon: Icon, disabled = false }) {
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

export function EmptyState({ icon: Icon = CircleDot, title, body, action, actionLabel }) {
  return (
    <div className="v2-empty-state">
      <span className="v2-empty-icon"><Icon size={26} /></span>
      <b>{title}</b>
      {body && <p>{body}</p>}
      {action && actionLabel && (
        <button type="button" className="v2-btn v2-btn-cyan v2-btn-sm" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="v2-map-legend">
      <span><i className="is-phone" /> Mobile phone</span>
      <span><i className="is-landline" /> Office phone</span>
      <span><i className="is-web" /> Website listed</span>
      <span><i className="is-empty" /> Location only</span>
    </div>
  );
}

export function DeepJobRow({ job, onStop, onResume, active = false }) {
  const tone = job.status === 'completed' ? 'lime'
    : job.status === 'failed' ? 'red'
      : ['stopped', 'interrupted'].includes(job.status) ? 'amber'
        : 'cyan';
  const processed = Number.isFinite(Number(job.processed)) ? Number(job.processed) : (Number(job.completed) || 0);
  const enriched = Number.isFinite(Number(job.enriched)) ? Number(job.enriched) : (Number(job.succeeded) || 0);
  const percent = job.total ? Math.min(100, Math.round((processed / job.total) * 100)) : 0;
  const canResume = job.resumable === true || job.status === 'interrupted';
  return (
    <div className={cx('v2-deep-job-row', active && 'is-active')}>
      <div className="v2-deep-job-head">
        <span className="v2-deep-job-mark"><Zap size={13} /></span>
        <span>
          <b>Contact Lookup Batch</b>
          <small>
            {job.updatedAt || relativeTime(job.createdAt)} · {job.total} businesses
            {job.status === 'interrupted' ? ' · paused' : ''}
          </small>
        </span>
        <StatusPill tone={tone} pulse={['queued', 'running', 'stopping'].includes(job.status)}>
          {job.status === 'completed' ? 'Done' : job.status}
        </StatusPill>
      </div>
      <div className="v2-deep-job-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="v2-deep-job-foot">
        <small>{processed} of {job.total} checked · {enriched} updated with new details</small>
        {['queued', 'running'].includes(job.status) && onStop && (
          <button type="button" className="v2-btn v2-btn-xs" onClick={() => onStop(job.id)}>Stop</button>
        )}
        {canResume && !['queued', 'running', 'stopping'].includes(job.status) && onResume && (
          <button type="button" className="v2-btn v2-btn-xs v2-btn-lime" onClick={() => onResume(job.id)}>
            Resume
          </button>
        )}
      </div>
    </div>
  );
}
