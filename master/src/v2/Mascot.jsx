import React from 'react';
import './mascot.css';

/**
 * Diggy the Lead Miner / Harvester Scout
 * High-end animated SVG character with 5 interactive states:
 * - 'idle': floating cyber bob, blinking eyes, radar sweep visor
 * - 'sprint': running across screen with jetpack thrusters firing
 * - 'dig': striking ground with golden energy pickaxe, ground shockwaves & gold sparks
 * - 'celebrate': jumping with glowing +91 contact card and celebration confetti
 * - 'map-marker': compact circular map marker digging on active GPS coordinates
 */
export default function Mascot({
  mode = 'idle', // 'idle' | 'sprint' | 'dig' | 'celebrate' | 'map-marker'
  size = 120,
  className = '',
  bubbleText = null,
  onClick = null
}) {
  const isMapMarker = mode === 'map-marker';
  const effectiveSize = isMapMarker ? 56 : size;

  return (
    <div
      className={`diggy-mascot-container mode-${mode} ${className}`}
      style={{ width: effectiveSize, height: effectiveSize }}
      onClick={onClick}
      role="img"
      aria-label={`Diggy the Lead Harvester (${mode})`}
    >
      {bubbleText && (
        <div className="diggy-speech-bubble">
          <span>{bubbleText}</span>
          <i className="diggy-bubble-tail" />
        </div>
      )}

      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="diggy-svg"
      >
        <defs>
          {/* Cyber Visor Gradient */}
          <linearGradient id="m_visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Gold Cyber Pickaxe Gradient */}
          <linearGradient id="m_goldEnergyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Armor Body Gradient */}
          <linearGradient id="m_armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Jetpack Flame Gradient */}
          <linearGradient id="m_thrusterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="m_neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- JETPACK & THRUSTER FLAMES --- */}
        <g className="diggy-jetpack">
          <rect x="52" y="80" width="18" height="42" rx="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
          <rect x="130" y="80" width="18" height="42" rx="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
          <g className="diggy-thrusters">
            <ellipse cx="61" cy="130" rx="6" ry="14" fill="url(#m_thrusterGrad)" className="flame flame-left" />
            <ellipse cx="139" cy="130" rx="6" ry="14" fill="url(#m_thrusterGrad)" className="flame flame-right" />
          </g>
        </g>

        {/* --- SHADOW / GROUND RIPPLE --- */}
        <ellipse cx="100" cy="182" rx="42" ry="8" fill="rgba(0, 240, 255, 0.2)" className="diggy-ground-shadow" />
        
        {/* Ground excavation crack when digging */}
        <g className="diggy-ground-cracks">
          <path d="M85 180 L95 186 L105 180 L115 185 L108 178" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="102" cy="182" r="3" fill="#fbbf24" filter="url(#m_neonGlow)" />
          <circle cx="82" cy="165" r="2.5" fill="#fef08a" className="spark spark-1" />
          <circle cx="122" cy="160" r="3" fill="#fef08a" className="spark spark-2" />
          <circle cx="105" cy="150" r="2" fill="#38bdf8" className="spark spark-3" />
        </g>

        {/* --- LEGS & BOOTS --- */}
        <g className="diggy-legs">
          <g className="diggy-leg leg-left">
            <rect x="76" y="132" width="14" height="28" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="72" y="154" width="22" height="14" rx="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
          </g>
          <g className="diggy-leg leg-right">
            <rect x="110" y="132" width="14" height="28" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="106" y="154" width="22" height="14" rx="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
          </g>
        </g>

        {/* --- MAIN BODY / TORSO --- */}
        <g className="diggy-body-group">
          <rect x="68" y="74" width="64" height="64" rx="20" fill="url(#m_armorGrad)" stroke="#38bdf8" strokeWidth="2.5" />
          
          <circle cx="100" cy="106" r="14" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
          <circle cx="100" cy="106" r="8" fill="#10b981" className="diggy-reactor-pulse" filter="url(#m_neonGlow)" />
          
          <rect x="66" y="126" width="68" height="10" rx="5" fill="#090d16" stroke="#475569" strokeWidth="1" />
          <rect x="92" y="123" width="16" height="15" rx="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" className="diggy-gold-pouch" />
          <path d="M96 130 H104" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />

          {/* ARMS */}
          <g className="diggy-arm arm-left">
            <rect x="52" y="82" width="16" height="34" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="60" cy="116" r="7" fill="#00f0ff" />
          </g>

          <g className="diggy-arm arm-right">
            <rect x="132" y="82" width="16" height="34" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="140" cy="116" r="7" fill="#00f0ff" />
            
            <g className="diggy-pickaxe">
              <rect x="138" y="70" width="6" height="65" rx="3" fill="#64748b" transform="rotate(-30 138 70)" />
              <path
                d="M110 50 C130 58, 155 58, 175 50 C165 65, 145 68, 110 50 Z"
                fill="url(#m_goldEnergyGrad)"
                stroke="#fef08a"
                strokeWidth="1.5"
                filter="url(#m_neonGlow)"
              />
              <circle cx="112" cy="51" r="3" fill="#ffffff" />
            </g>
          </g>

          {/* CELEBRATION */}
          {mode === 'celebrate' && (
            <g className="diggy-found-card">
              <rect x="65" y="10" width="70" height="42" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" filter="url(#m_neonGlow)" />
              <rect x="70" y="16" width="60" height="6" rx="3" fill="#10b981" />
              <text x="73" y="32" fill="#fef08a" fontSize="8" fontWeight="bold" fontFamily="sans-serif">+91 98480...</text>
              <text x="73" y="44" fill="#38bdf8" fontSize="6.5" fontFamily="sans-serif">✓ Verified Owner</text>
            </g>
          )}

          {/* HEAD & VISOR */}
          <g className="diggy-head">
            <rect x="62" y="24" width="76" height="54" rx="26" fill="url(#m_armorGrad)" stroke="#38bdf8" strokeWidth="3" />
            
            <path d="M100 24 V10" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="8" r="4.5" fill="#10b981" filter="url(#m_neonGlow)" className="diggy-antenna-beacon" />

            <rect x="70" y="36" width="60" height="30" rx="14" fill="url(#m_visorGrad)" stroke="#00f0ff" strokeWidth="1.5" />
            
            <line x1="72" y1="51" x2="128" y2="51" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 6" className="diggy-visor-beam" />
            
            <g className="diggy-eyes">
              <ellipse cx="88" cy="51" rx="5" ry="7" fill="#ffffff" className="diggy-eye eye-left" filter="url(#m_neonGlow)" />
              <ellipse cx="112" cy="51" rx="5" ry="7" fill="#ffffff" className="diggy-eye eye-right" filter="url(#m_neonGlow)" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export function getMascotMarkerHtml(mode = 'dig') {
  return `
    <div class="diggy-map-pin mode-${mode}">
      <span class="diggy-map-pulse-ring"></span>
      <span class="diggy-map-pulse-ring r2"></span>
      <div class="diggy-map-avatar">
        <svg viewBox="0 0 200 200" fill="none" class="diggy-mini-svg">
          <ellipse cx="100" cy="180" rx="35" ry="8" fill="rgba(0, 240, 255, 0.3)" />
          <rect x="68" y="74" width="64" height="64" rx="20" fill="#1e293b" stroke="#00f0ff" stroke-width="3" />
          <circle cx="100" cy="106" r="10" fill="#10b981" />
          <rect x="62" y="24" width="76" height="54" rx="26" fill="#0f172a" stroke="#38bdf8" stroke-width="4" />
          <circle cx="100" cy="8" r="5" fill="#f59e0b" />
          <line x1="100" y1="24" x2="100" y2="10" stroke="#00f0ff" stroke-width="3" />
          <rect x="70" y="36" width="60" height="30" rx="14" fill="#0284c7" />
          <circle cx="88" cy="51" r="5" fill="#fff" />
          <circle cx="112" cy="51" r="5" fill="#fff" />
          <g class="mini-pickaxe">
            <path d="M120 40 L160 55 L135 65 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="2" />
          </g>
        </svg>
      </div>
      <span class="diggy-map-badge">⚡ DIGGING RADAR</span>
    </div>
  `;
}
