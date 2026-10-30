import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Building2, Check, CheckCircle2, ChevronRight, CircleHelp,
  Copy, Globe2, Loader2, MapPin, Search, Star, Terminal, Wifi, WifiOff
} from 'lucide-react';
import { suggestLocations } from './api';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function formatNumber(value, fallback = '0') {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) return rem ? `${mins}m ${rem}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function relativeTime(value) {
  if (!value) return 'Unknown';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Unknown';
  const diff = Date.now() - time;
  if (diff < 45_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function compactDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Logo({ compact = false }) {
  return (
    <span className={cx('v2-logo', compact && 'is-compact')}>
      <span className="v2-logo-mark" aria-hidden="true">
        <i /><i /><i /><b />
      </span>
      <span className="v2-logo-type">
        <strong>scraper<span>.co.in</span></strong>
        {!compact && <small>INDIA VENDOR INTELLIGENCE</small>}
      </span>
    </span>
  );
}

export function SectionTag({ index, children }) {
  return (
    <span className="v2-section-tag">
      <span>{index}</span>
      {children}
    </span>
  );
}

export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cx('v2-reveal', visible && 'is-visible', className)}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function CountUp({ value, suffix = '', prefix = '', duration = 1100, decimals = 0 }) {
  const target = Number(value);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    let frame = 0;
    const started = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : formatNumber(Math.round(display));
  return <>{prefix}{formatted}{suffix}</>;
}

export function StatusPill({ tone = 'neutral', pulse = false, children }) {
  return (
    <span className={cx('v2-status-pill', `tone-${tone}`, pulse && 'is-pulsing')}>
      <i />
      {children}
    </span>
  );
}

export function MiniMeter({ value = 0, tone = 'lime', label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="v2-mini-meter" aria-label={label || `${pct}%`}>
      <span className={cx('v2-mini-meter-fill', `tone-${tone}`)} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function ScoreRing({ value = 0, size = 86, label = 'quality' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const tone = pct >= 85 ? 'excellent' : pct >= 70 ? 'strong' : pct >= 50 ? 'fair' : 'thin';

  return (
    <span className={cx('v2-score-ring', `tone-${tone}`)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="v2-score-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="v2-score-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="v2-score-value">
        <b>{Math.round(pct)}</b>
        <small>{label}</small>
      </span>
    </span>
  );
}

export function Radar({ active = true, className = '' }) {
  const blips = useMemo(() => ([
    { x: 62, y: 29, tone: 'lime' },
    { x: 35, y: 42, tone: 'cyan' },
    { x: 72, y: 58, tone: 'lime' },
    { x: 46, y: 72, tone: 'amber' },
    { x: 24, y: 62, tone: 'cyan' },
    { x: 56, y: 48, tone: 'lime' }
  ]), []);

  return (
    <div className={cx('v2-radar', active && 'is-live', className)} aria-hidden="true">
      <span className="v2-radar-ring ring-1" />
      <span className="v2-radar-ring ring-2" />
      <span className="v2-radar-ring ring-3" />
      <span className="v2-radar-axis axis-x" />
      <span className="v2-radar-axis axis-y" />
      <span className="v2-radar-sweep" />
      {blips.map((blip, index) => (
        <span
          key={index}
          className={cx('v2-radar-blip', `tone-${blip.tone}`)}
          style={{ left: `${blip.x}%`, top: `${blip.y}%`, animationDelay: `${index * 0.42}s` }}
        />
      ))}
      <span className="v2-radar-core" />
    </div>
  );
}

const TYPE_LABEL = {
  state: 'STATE',
  district: 'DISTRICT',
  subdistrict: 'MANDAL',
  village: 'VILLAGE',
  city: 'CITY',
  town: 'TOWN'
};

export function LocationField({
  value,
  onChange,
  onSelect,
  placeholder = 'Village, mandal, district',
  label = 'Location',
  autoFocus = false,
  id = 'v2-location'
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const wrapRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const onDocClick = event => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const query = String(value || '').trim();
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return undefined;
    }

    clearTimeout(timer.current);
    const requestId = ++requestRef.current;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await suggestLocations(query, 8);
        if (requestRef.current !== requestId) return;
        setResults(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch (error) {
        if (requestRef.current === requestId) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 160);

    return () => clearTimeout(timer.current);
  }, [value]);

  const choose = item => {
    if (!item) return;
    onChange?.(item.display || item.name || '');
    onSelect?.(item);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(prev => (prev + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(prev => (prev - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="v2-field v2-location-field" ref={wrapRef}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="v2-location-input">
        <MapPin size={16} />
        <input
          id={id}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
        />
        {loading ? <Loader2 size={15} className="v2-spin" /> : <Search size={14} className="v2-input-hint" />}
      </div>
      {open && results.length > 0 && (
        <div className="v2-location-menu">
          <div className="v2-location-menu-head">
            <span>INDIA GEO INDEX</span>
            <b>{results.length} MATCHES</b>
          </div>
          {results.map((item, index) => (
            <button
              type="button"
              key={`${item.type}-${item.display}-${index}`}
              className={cx('v2-location-option', index === active && 'is-active')}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
            >
              <span className="v2-location-icon">
                {item.type === 'state' ? <Globe2 size={14} /> : item.type === 'district' ? <Building2 size={14} /> : <MapPin size={14} />}
              </span>
              <span className="v2-location-copy">
                <b>{item.name}</b>
                <small>{item.display}</small>
              </span>
              <span className={cx('v2-location-type', `type-${item.type}`)}>
                {TYPE_LABEL[item.type] || String(item.type || '').toUpperCase()}
              </span>
              <ChevronRight size={13} />
            </button>
          ))}
          <div className="v2-location-menu-foot">
            <span>36 states</span>
            <span>633 districts</span>
            <span>619,287 villages</span>
          </div>
        </div>
      )}
    </div>
  );
}

function logTone(line) {
  const text = String(line || '');
  if (/\[(ERROR|FATAL|CRITICAL)\]/i.test(text) || /error/i.test(text)) return 'error';
  if (/\[(WARN|WARNING)\]/i.test(text)) return 'warn';
  if (/\[(LEAD|VENDOR|HARVEST)\]/i.test(text) || /lead/i.test(text)) return 'lead';
  if (/\[(SYSTEM|ORCHESTRATOR|PROCESS)\]/i.test(text)) return 'system';
  if (/\[(OK|SUCCESS|DONE)\]/i.test(text) || /success/i.test(text)) return 'ok';
  return 'info';
}

export function LogTerminal({ lines = [], status = 'disconnected', onClear, className = '', empty = 'Awaiting signal…' }) {
  const bodyRef = useRef(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (!pinned || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines, pinned]);

  return (
    <section className={cx('v2-terminal', className)}>
      <header className="v2-terminal-head">
        <span className="v2-terminal-dots"><i /><i /><i /></span>
        <span className="v2-terminal-title">
          <Terminal size={13} /> live.signal <b>//</b> backend stream
        </span>
        <span className="v2-terminal-actions">
          <StatusPill tone={status === 'open' ? 'lime' : status === 'connecting' ? 'amber' : 'red'} pulse={status === 'open'}>
            {status === 'open' ? <Wifi size={11} /> : <WifiOff size={11} />}
            {status}
          </StatusPill>
          {onClear && <button type="button" onClick={onClear}>CLEAR</button>}
        </span>
      </header>
      <div
        className="v2-terminal-body"
        ref={bodyRef}
        onScroll={event => {
          const el = event.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 36);
        }}
      >
        {lines.length === 0 && <div className="v2-terminal-empty">{empty}</div>}
        {lines.map((line, index) => (
          <div className={cx('v2-terminal-line', `tone-${logTone(line)}`)} key={`${index}-${String(line).slice(0, 30)}`}>
            <span className="v2-terminal-index">{String(index + 1).padStart(3, '0')}</span>
            <span className="v2-terminal-text">{typeof line === 'string' ? line : JSON.stringify(line)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="v2-copy-btn"
      onClick={async event => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(String(value || ''));
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch (error) {
          setCopied(false);
        }
      }}
      title={label}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function Unknown({ children = 'Unknown' }) {
  return <span className="v2-unknown"><CircleHelp size={13} /> {children}</span>;
}

export function Rating({ value, count }) {
  if (value == null || value === '') return <Unknown />;
  return (
    <span className="v2-rating">
      <Star size={12} />
      <b>{Number(value).toFixed(1)}</b>
      {count != null && count !== '' && <small>({formatNumber(count)})</small>}
    </span>
  );
}

export function ArrowLink({ children, onClick, href, external = false }) {
  const content = (
    <>
      {children}
      <ArrowRight size={15} />
    </>
  );
  if (href) {
    return (
      <a className="v2-arrow-link" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {content}
      </a>
    );
  }
  return <button type="button" className="v2-arrow-link" onClick={onClick}>{content}</button>;
}

export function SuccessTick({ children }) {
  return <span className="v2-success-tick"><CheckCircle2 size={14} /> {children}</span>;
}
