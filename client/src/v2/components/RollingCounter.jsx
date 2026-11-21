import React, { useEffect, useState } from 'react';

/**
 * RollingCounter
 * Mechanical rolling number animation for statistics & telemetry
 * - Rolls smoothly from 0 to target on mount
 * - Supports prefix, suffix, and locale formatting
 */
export default function RollingCounter({
  target = 0,
  duration = 1400,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  style = {}
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId;
    const startVal = 0;
    const endVal = Number(target) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Smooth ease-out cubic curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(endVal);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : Math.floor(count).toLocaleString();

  return (
    <span className={`lx-rolling-counter ${className}`} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
