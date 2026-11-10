import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   motion.js — the only place that knows about frames.

   Rules:
   • one rAF loop per interactive object, never per element inside it
   • stop the loop when the object is off-screen or the tab is hidden
   • reduced-motion turns every loop off and leaves a static, readable pose
   ──────────────────────────────────────────────────────────────────────────── */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduce(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduce;
}

/** rAF count-up that never reflows the layout (tabular numerals in CSS). */
export function useCountUp(value, { duration = 700, decimals = 0 } = {}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const from = fromRef.current;
    if (from === target) return undefined;

    const started = performance.now();
    const step = (now) => {
      const t = clamp((now - started) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduce]);

  const factor = Math.pow(10, decimals);
  return Math.round(display * factor) / factor;
}

/**
 * Pointer tilt. Writes CSS vars so the browser can composite the transform
 * without React re-rendering. Coarse pointers and reduced motion are static.
 */
export function usePointerTilt(ref, { max = 6, disabled = false } = {}) {
  const reduce = useReducedMotion();
  const off = disabled || reduce;

  useEffect(() => {
    const el = ref.current;
    if (!el || off) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let raf = 0;
    let next = null;
    let hovered = false;

    const paint = () => {
      raf = 0;
      if (!next) return;
      const { px, py } = next;
      el.style.setProperty('--k3-ry', `${(px - 0.5) * 2 * max}deg`);
      el.style.setProperty('--k3-rx', `${(0.5 - py) * 2 * max}deg`);
      el.style.setProperty('--k3-mx', `${px * 100}%`);
      el.style.setProperty('--k3-my', `${py * 100}%`);
      el.style.setProperty('--k3-gx', `${px * 100}%`);
      el.style.setProperty('--k3-gy', `${py * 100}%`);
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      next = { px: clamp((e.clientX - r.left) / r.width, 0, 1), py: clamp((e.clientY - r.top) / r.height, 0, 1) };
      hovered = true;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const onEnter = () => { hovered = true; };

    const onLeave = () => {
      hovered = false;
      next = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      el.style.setProperty('--k3-rx', '0deg');
      el.style.setProperty('--k3-ry', '0deg');
      el.style.setProperty('--k3-mx', '30%');
      el.style.setProperty('--k3-my', '8%');
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('pointercancel', onLeave, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
      if (hovered) onLeave();
    };
  }, [ref, max, off]);
}

/**
 * Drag-to-spin with inertia and an idle drift. Used by OrbitalRadar.
 * Everything is written straight to CSS vars; React never re-renders.
 */
export function useDragSpin(ref, { rx = -12, ry = -18, drift = 0.055, disabled = false } = {}) {
  const reduce = useReducedMotion();
  const off = disabled || reduce;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const s = {
      rx,
      ry,
      vx: 0,
      vy: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      raf: 0,
      running: false,
    };

    const apply = () => {
      el.style.setProperty('--k3-rx', `${s.rx.toFixed(2)}deg`);
      el.style.setProperty('--k3-ry', `${s.ry.toFixed(2)}deg`);
    };

    apply();
    if (off) return undefined;

    let last = performance.now();

    const tick = (now) => {
      if (!s.running) return;
      const dt = Math.min(48, Math.max(0, now - last));
      last = now;
      const k = dt / 16.6667;

      if (!s.dragging) {
        if (Math.abs(s.vy) > 0.01 || Math.abs(s.vx) > 0.01) {
          s.ry += s.vy * k;
          s.rx = clamp(s.rx + s.vx * k, -42, 42);
          const decay = Math.pow(0.93, k);
          s.vx *= decay;
          s.vy *= decay;
        } else {
          s.vy = 0;
          s.vx = 0;
          s.ry += drift * k;
          s.rx += (-12 - s.rx) * 0.02 * k;
        }
        apply();
      }

      s.raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (s.running) return;
      s.running = true;
      last = performance.now();
      s.raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      s.running = false;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };

    let visible = true;
    let onScreen = true;
    const sync = () => {
      if (visible && onScreen) start();
      else stop();
    };

    const onVisibility = () => { visible = !document.hidden; sync(); };
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0.05 })
      : null;
    if (observer) observer.observe(el);

    const onDown = (e) => {
      s.dragging = true;
      s.vx = 0;
      s.vy = 0;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      el.classList.add('is-grabbing');
      try { el.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
    };

    const onMove = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.ry += dx * 0.34;
      s.rx = clamp(s.rx - dy * 0.22, -42, 42);
      s.vy = dx * 0.34;
      s.vx = -dy * 0.22;
      apply();
    };

    const onUp = () => {
      s.dragging = false;
      el.classList.remove('is-grabbing');
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    document.addEventListener('visibilitychange', onVisibility);

    start();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
    };
  }, [ref, rx, ry, drift, off]);
}

/** Magnetic pull for primary controls. Writes transform directly. */
export function useMagnetic(ref, { strength = 0.16, max = 9, disabled = false } = {}) {
  const reduce = useReducedMotion();
  const off = disabled || reduce;

  useEffect(() => {
    const el = ref.current;
    if (!el || off) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let raf = 0;
    let target = { x: 0, y: 0 };

    const paint = () => {
      raf = 0;
      el.style.transform = `translate(${target.x.toFixed(2)}px, ${target.y.toFixed(2)}px)`;
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx0 = r.left + r.width / 2;
      const cy0 = r.top + r.height / 2;
      target = {
        x: clamp((e.clientX - cx0) * strength, -max, max),
        y: clamp((e.clientY - cy0) * strength, -max, max),
      };
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const reset = () => {
      target = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(paint);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', reset, { passive: true });
    el.addEventListener('blur', reset);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', reset);
      el.removeEventListener('blur', reset);
    };
  }, [ref, strength, max, off]);
}
