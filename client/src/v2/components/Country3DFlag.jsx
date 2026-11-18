import React, { useState } from 'react';
import { flagOf } from '../data/countries';
import './country3DFlag.css';

/**
 * Country3DFlag
 * Renders a crisp 3D embossed convex physical badge for any country code.
 * Solves the Windows OS flat-text emoji limitation by displaying high-res
 * circular flag imagery with specular glass lighting and 3D physical depth.
 */
export default function Country3DFlag({
  code = 'IN',
  size = 28,
  active = false,
  isHome = false,
  onClick,
  title,
  className = ''
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const safeCode = String(code || 'IN').toUpperCase();
  const lowerCode = safeCode.toLowerCase();

  // FlagCDN provides crisp, fast, lightweight flag assets for all ISO 3166-1 alpha-2 codes
  const flagUrl = `https://flagcdn.com/w80/${lowerCode}.png`;

  return (
    <div
      className={`flag-3d-wrapper ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title || safeCode}
    >
      <div
        className={`flag-3d-badge ${active ? 'is-active' : ''} ${isHome ? 'is-home' : ''}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {!imgFailed ? (
          <img
            src={flagUrl}
            alt={safeCode}
            className="flag-3d-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flag-3d-fallback" style={{ fontSize: `${Math.round(size * 0.65)}px` }}>
            {flagOf(safeCode)}
          </span>
        )}
        <div className="flag-3d-lens" aria-hidden="true" />
      </div>
    </div>
  );
}
