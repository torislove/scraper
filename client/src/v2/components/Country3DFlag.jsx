import React, { useState } from 'react';
import { flagOf } from '../data/countries';
import './country3DFlag.css';

const SIZE_MAP = {
  xs: 18,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 34
};

/**
 * Country3DFlag
 * Precision 3D optical glass flag sphere with specular dome reflection,
 * Fresnel rim lighting, and crisp retina scaling across Windows/macOS/Linux.
 */
export default function Country3DFlag({
  code = 'IN',
  size = 20,
  active = false,
  isHome = false,
  onClick,
  title,
  className = ''
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const safeCode = String(code || 'IN').toUpperCase();
  const lowerCode = safeCode.toLowerCase();
  const px = typeof size === 'number' && Number.isFinite(size)
    ? size
    : (SIZE_MAP[size] || (Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 20));

  const flagUrl = `https://flagcdn.com/w80/${lowerCode}.png`;

  const dimStyle = {
    width: `${px}px`,
    height: `${px}px`,
    minWidth: `${px}px`,
    minHeight: `${px}px`,
    maxWidth: `${px}px`,
    maxHeight: `${px}px`
  };

  return (
    <span
      className={`flag-3d-wrapper ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title || safeCode}
      style={dimStyle}
    >
      <span
        className={`flag-3d-badge ${active ? 'is-active' : ''} ${isHome ? 'is-home' : ''}`}
        style={dimStyle}
      >
        {!imgFailed ? (
          <img
            src={flagUrl}
            alt={safeCode}
            width={px}
            height={px}
            className="flag-3d-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flag-3d-fallback" style={{ fontSize: `${Math.round(px * 0.64)}px` }}>
            {flagOf(safeCode)}
          </span>
        )}
        <span className="flag-3d-lens" aria-hidden="true" />
      </span>
    </span>
  );
}
