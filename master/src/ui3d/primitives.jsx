import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  clamp, cx, useCountUp, useDragSpin, useMagnetic, usePointerTilt, useReducedMotion,
} from './motion.js';

/* ─────────────────────────────────────────────────────────────────────────────
   primitives.jsx — the physical components.

   These are deliberately dumb: they own depth and motion, never business
   logic. Anything you can do with the old button you can do with Button3D.
   ──────────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════════════
   Magnetic — wraps a control and lets it lean toward the cursor
   ═══════════════════════════════════════════════════════════════════════════ */

export const Magnetic = forwardRef(function Magnetic(
  { children, strength = 0.16, max = 9, disabled = false, className }, ref,
) {
  const localRef = useRef(null);
  useMagnetic(localRef, { strength, max, disabled });

  return (
    <span
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('k3-magnetic', className)}
    >
      {children}
    </span>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   SparkBurst — twelve brass particles, then gone
   ═══════════════════════════════════════════════════════════════════════════ */

function SparkBurst({ seed, origin }) {
  const sparks = useMemo(() => {
    if (!seed) return [];
    return Array.from({ length: 11 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 11 + (i % 2 ? 0.22 : -0.12);
      const dist = 26 + ((i * 37) % 30);
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 8,
        delay: (i % 4) * 18,
      };
    });
  }, [seed]);

  if (!seed) return null;

  return (
    <span className="k3-spark-layer" aria-hidden="true">
      {sparks.map((s) => (
        <span
          key={`${seed}-${s.id}`}
          className="k3-spark"
          style={{
            '--k3-sx': `${origin.x}%`,
            '--k3-sy': `${origin.y}%`,
            '--k3-dx': `${s.dx}px`,
            '--k3-dy': `${s.dy}px`,
            animationDelay: `${s.delay}ms`,
          }}
        />
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Button3D
   ═══════════════════════════════════════════════════════════════════════════ */

export const Button3D = forwardRef(function Button3D({
  children,
  variant = 'glass',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  icon = null,
  iconRight = null,
  magnetic = true,
  spark,
  className,
  onClick,
  type = 'button',
  ...rest
}, ref) {
  const btnRef = useRef(null);
  const [seed, setSeed] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const reduce = useReducedMotion();

  // specular sweep only — no tilt, buttons must stay square to the eye
  usePointerTilt(btnRef, { max: 0, disabled: disabled || loading });

  useEffect(() => {
    if (!seed) return undefined;
    const t = setTimeout(() => setSeed(0), 720);
    return () => clearTimeout(t);
  }, [seed]);

  const wantsSpark = spark === undefined ? variant === 'brass' : spark;

  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    if (wantsSpark && !reduce) {
      const r = event.currentTarget.getBoundingClientRect();
      setOrigin({
        x: r.width ? clamp(((event.clientX - r.left) / r.width) * 100, 8, 92) : 50,
        y: r.height ? clamp(((event.clientY - r.top) / r.height) * 100, 8, 92) : 50,
      });
      setSeed((n) => n + 1);
    }
    onClick?.(event);
  };

  const button = (
    <button
      ref={(node) => {
        btnRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      className={cx(
        'k3-btn',
        `k3-btn--${variant}`,
        size !== 'md' && `k3-btn--${size}`,
        block && 'k3-btn--block',
        loading && 'is-loading',
        className,
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="k3-btn__spinner" aria-hidden="true" /> : icon}
      <span className="k3-btn__label">{children}</span>
      {iconRight}
      <SparkBurst seed={seed} origin={origin} />
    </button>
  );

  if (!magnetic) return button;
  return <Magnetic disabled={disabled || loading}>{button}</Magnetic>;
});

/* ═══════════════════════════════════════════════════════════════════════════
   Tilt3D / Card3D
   ═══════════════════════════════════════════════════════════════════════════ */

export function Tilt3D({ children, max = 6, disabled = false, className, style, ...rest }) {
  const ref = useRef(null);
  usePointerTilt(ref, { max, disabled });
  return (
    <div ref={ref} className={cx('k3-tilt-wrap', className)} style={style} {...rest}>
      {children}
    </div>
  );
}

export function Card3D({
  children,
  className,
  tilt = 6,
  interactive = false,
  material,
  glow,
  style,
  as: Tag = 'div',
  ...rest
}) {
  const ref = useRef(null);
  usePointerTilt(ref, { max: tilt, disabled: !tilt });
  return (
    <Tag
      ref={ref}
      className={cx(
        'k3-card',
        'k3-tilt',
        interactive && 'is-interactive',
        material === 'ceramic' && 'k3-card--ceramic',
        className,
      )}
      style={style}
      {...rest}
    >
      {glow ? <span className="k3-card__glow" style={{ '--k3-card-glow': glow }} aria-hidden="true" /> : null}
      <div className="k3-card__body">{children}</div>
    </Tag>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shelf3D — dashboard panel
   ═══════════════════════════════════════════════════════════════════════════ */

export function Shelf3D({ children, className, style, ...rest }) {
  return (
    <div className={cx('k3-shelf', className)} style={style} {...rest}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   StatTile — number, label, one-line explanation
   ═══════════════════════════════════════════════════════════════════════════ */

export function StatTile({
  label,
  value = 0,
  decimals = 0,
  suffix = null,
  hint = null,
  tone = '#38bdf8',
  className,
  style,
}) {
  const shown = useCountUp(value, { decimals });
  const text = shown.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className={cx('k3-stat', className)} style={style}>
      <span className="k3-stat__label">{label}</span>
      <span className="k3-stat__value" style={{ color: tone }}>
        {text}
        {suffix ? <small>{suffix}</small> : null}
      </span>
      {hint ? <span className="k3-stat__hint">{hint}</span> : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Segmented3D
   ═══════════════════════════════════════════════════════════════════════════ */

export function Segmented3D({ items = [], value, onChange, className, label, style }) {
  const index = Math.max(0, items.findIndex((i) => i.id === value));

  return (
    <div
      className={cx('k3-seg', className)}
      style={{ '--k3-count': items.length || 1, '--k3-index': index, ...style }}
      role="tablist"
      aria-label={label}
    >
      <span className="k3-seg__thumb" aria-hidden="true" />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={cx('k3-seg__item', active && 'is-active')}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SignalOrb — replaces every mascot badge
   ═══════════════════════════════════════════════════════════════════════════ */

export function SignalOrb({ size = 34, tone = '#7dd3fc', live = false, title, className, style }) {
  return (
    <span
      className={cx('k3-orb', live && 'is-live', className)}
      style={{ '--k3-orb-size': `${size}px`, '--k3-orb-tone': tone, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hint / Tip — the explanatory layer
   ═══════════════════════════════════════════════════════════════════════════ */

export function Hint({ children, tone = 'cyan', icon = null, className }) {
  return (
    <span className={cx('k3-hint', tone === 'brass' && 'k3-hint--brass', className)}>
      {icon || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.4" r="1.1" fill="currentColor" />
        </svg>
      )}
      <span>{children}</span>
    </span>
  );
}

export function Tip({ text, children, className }) {
  return (
    <span className={cx('k3-tip', className)}>
      {children}
      <span className="k3-tip__body" role="tooltip">{text}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OrbitalRadar — the hero object. Drag it.
   ═══════════════════════════════════════════════════════════════════════════ */

function buildRings(size) {
  const radius = size * 0.35;
  const rings = [];

  [-58, -29, 0, 29, 58].forEach((lat) => {
    const rad = (lat * Math.PI) / 180;
    const ringRadius = radius * Math.cos(rad) * 2;
    rings.push({
      key: `lat-${lat}`,
      width: ringRadius,
      height: ringRadius,
      transform: `translate(-50%, -50%) rotateX(90deg) translateZ(${(radius * Math.sin(rad)).toFixed(2)}px)`,
      opacity: lat === 0 ? 0.55 : 0.22,
    });
  });

  [0, 30, 60, 90, 120, 150].forEach((lon) => {
    rings.push({
      key: `lon-${lon}`,
      width: radius * 2,
      height: radius * 2,
      transform: `translate(-50%, -50%) rotateY(${lon}deg)`,
      opacity: 0.2,
    });
  });

  return rings;
}

function buildPins(count, size) {
  const radius = size * 0.352;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pins = [];

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const phi = Math.acos(clamp(y, -1, 1));
    const theta = golden * i;
    const lat = 90 - (phi * 180) / Math.PI;
    const lon = ((theta * 180) / Math.PI) % 360;
    pins.push({
      key: `pin-${i}`,
      transform: `translate(-50%, -50%) rotateY(${lon.toFixed(2)}deg) rotateX(${(-lat).toFixed(2)}deg) translateZ(${radius.toFixed(2)}px)`,
      delay: `${(i % 7) * 0.28}s`,
      tone: i % 5 === 0 ? '#f0c274' : '#5eead4',
    });
  }

  return pins;
}

export function OrbitalRadar({
  size = 430,
  pins = 16,
  floats = [],
  hint = 'Drag to spin',
  className,
  children,
}) {
  const ref = useRef(null);
  const px = typeof size === 'number' ? size : 430;

  useDragSpin(ref, {});

  const rings = useMemo(() => buildRings(px), [px]);
  const pinSet = useMemo(() => buildPins(pins, px), [pins, px]);

  return (
    <div
      ref={ref}
      className={cx('k3-radar', className)}
      style={{ '--k3-size': typeof size === 'number' ? `${size}px` : size }}
      aria-label="Interactive lead radar. Drag to rotate."
    >
      <span className="k3-radar__halo" aria-hidden="true" />

      <div className="k3-radar__stage" aria-hidden="true">
        <div className="k3-radar__globe" />
        {rings.map((r) => (
          <div
            key={r.key}
            className="k3-radar__ring"
            style={{ width: r.width, height: r.height, transform: r.transform, opacity: r.opacity }}
          />
        ))}
        {pinSet.map((p) => (
          <span
            key={p.key}
            className="k3-radar__pin"
            style={{ transform: p.transform, animationDelay: p.delay, '--k3-pin': p.tone }}
          />
        ))}
        <div className="k3-radar__sweep" />
        <div className="k3-radar__core" />
      </div>

      {floats.map((f, i) => (
        <div
          key={f.key || f.label || i}
          className="k3-radar__float"
          style={{ left: f.left, top: f.top, animationDelay: `${i * 0.9}s` }}
        >
          {f.value ? <b>{f.value}</b> : null}
          {f.label}
        </div>
      ))}

      {hint ? <div className="k3-radar__drag-hint">{hint}</div> : null}
      {children}
    </div>
  );
}

export default {
  Button3D,
  Card3D,
  Tilt3D,
  Shelf3D,
  StatTile,
  Segmented3D,
  SignalOrb,
  Hint,
  Tip,
  Magnetic,
  OrbitalRadar,
};
