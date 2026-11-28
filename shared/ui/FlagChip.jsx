import React, { useState } from 'react';
import { flagOf } from '../data/countries';
import './flagChip.css';

const SIZE_MAP = { xs: 18, sm: 20, md: 24, lg: 28, xl: 34 };

export function FlagSphere({ code = 'IN', size = 22, active = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  const upper = String(code || 'IN').toUpperCase();
  const lower = upper === 'UK' ? 'gb' : upper.toLowerCase();
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] || 22);
  const dim = { width: px, height: px, minWidth: px, minHeight: px };

  return (
    <span className={`lp-flag-sphere ${active ? 'is-active' : ''} ${className}`} style={dim}>
      {!failed ? (
        <img
          src={`https://flagcdn.com/w80/${lower}.png`}
          alt={upper}
          width={px}
          height={px}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: Math.round(px * 0.64), lineHeight: 1 }}>{flagOf(upper)}</span>
      )}
      <span className="lp-flag-lens" aria-hidden="true" />
    </span>
  );
}

export default function FlagChip({
  code = 'IN',
  name,
  size = 20,
  active = false,
  showCode = true,
  onClick,
  disabled = false,
  title,
  className = ''
}) {
  const upper = String(code || 'IN').toUpperCase();
  if (!name && !onClick) {
    return <FlagSphere code={upper} size={size} active={active} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || name || upper}
      className={`lp-flag-tile ${active ? 'is-active' : ''} ${className}`}
    >
      <FlagSphere code={upper} size={size} active={active} />
      {showCode && <span className="lp-flag-code">{upper}</span>}
      {name && <span>{name}</span>}
    </button>
  );
}
