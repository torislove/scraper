import React, { useEffect, useState } from 'react';
import { AlertTriangle, CircleDot, Globe2, Phone, Search, X, Zap } from 'lucide-react';
import { StatusPill, cx, formatNumber, relativeTime } from '../../ui';

export function vendorInitial(vendor) {
  return (vendor?.name || '?').slice(0, 1).toUpperCase();
}

export function hasValidLogo(vendor) {
  return Boolean(vendor?.logo) && !/ui-avatars|google\.com\/s2\/favicons/i.test(vendor.logo);
}

export function VendorAvatar({ vendor, size = 36 }) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [vendor?.logo]);
  const showLogo = !imgFailed && hasValidLogo(vendor);
  return (
    <span className="v2-vendor-avatar" style={{ width: size, height: size }}>
      {showLogo
        ? <img src={vendor.logo} alt="" loading="lazy" onError={() => setImgFailed(true)} />
        : <b>{vendorInitial(vendor)}</b>}
    </span>
  );
}

export function MetricCard({ label, value, sub, tone = 'lime', icon: Icon, pulse = false }) {
  return (
    <div className={cx('v2-metric-card', `tone-${tone}`, pulse && 'is-pulsing')}>
      <span className="v2-metric-icon">{Icon && <Icon size={15} />}</span>
      <span className="v2-metric-copy">
        <small>{label}</small>
        <b>{value}</b>
        {sub && <em>{sub}</em>}
      </span>
    </div>
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
          <b>{job.id}</b>
          <small>
            {job.updatedAt || relativeTime(job.createdAt)} · {job.total} vendors
            {job.status === 'interrupted' ? ' · stopped by an engine restart' : ''}
          </small>
        </span>
        <StatusPill tone={tone} pulse={['queued', 'running', 'stopping'].includes(job.status)}>{job.status}</StatusPill>
      </div>
      <div className="v2-deep-job-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="v2-deep-job-foot">
        <small>{processed} / {job.total} processed · {enriched} enriched</small>
        {['queued', 'running'].includes(job.status) && onStop && (
          <button type="button" className="v2-btn v2-btn-xs" onClick={() => onStop(job.id)}>Stop</button>
        )}
        {canResume && !['queued', 'running', 'stopping'].includes(job.status) && onResume && (
          <button type="button" className="v2-btn v2-btn-xs v2-btn-lime" onClick={() => onResume(job.id)}>
            Resume remaining
          </button>
        )}
      </div>
    </div>
  );
}
