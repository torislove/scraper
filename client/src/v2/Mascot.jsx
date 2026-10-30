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
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Gold Cyber Pickaxe Gradient */}
          <linearGradient id="goldEnergyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Armor Body Gradient */}
          <linearGradient id="armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Jetpack Flame Gradient */}
          <linearGradient id="thrusterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- JETPACK & THRUSTER FLAMES --- */}
        <g className="diggy-jetpack">
          {/* Jetpack Tanks */}
          <rect x="52" y="80" width="18" height="42" rx="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
          <rect x="130" y="80" width="18" height="42" rx="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
          {/* Thruster Flames */}
          <g className="diggy-thrusters">
            <ellipse cx="61" cy="130" rx="6" ry="14" fill="url(#thrusterGrad)" className="flame flame-left" />
            <ellipse cx="139" cy="130" rx="6" ry="14" fill="url(#thrusterGrad)" className="flame flame-right" />
          </g>
        </g>

        {/* --- SHADOW / GROUND RIPPLE --- */}
        <ellipse cx="100" cy="182" rx="42" ry="8" fill="rgba(0, 240, 255, 0.2)" className="diggy-ground-shadow" />
        
        {/* Ground excavation crack when digging */}
        <g className="diggy-ground-cracks">
          <path d="M85 180 L95 186 L105 180 L115 185 L108 178" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="102" cy="182" r="3" fill="#fbbf24" filter="url(#neonGlow)" />
          {/* Flying gold spark nuggets */}
          <circle cx="82" cy="165" r="2.5" fill="#fef08a" className="spark spark-1" />
          <circle cx="122" cy="160" r="3" fill="#fef08a" className="spark spark-2" />
          <circle cx="105" cy="150" r="2" fill="#38bdf8" className="spark spark-3" />
        </g>

        {/* --- LEGS & BOOTS --- */}
        <g className="diggy-legs">
          {/* Left Leg */}
          <g className="diggy-leg leg-left">
            <rect x="76" y="132" width="14" height="28" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="72" y="154" width="22" height="14" rx="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
          </g>
          {/* Right Leg */}
          <g className="diggy-leg leg-right">
            <rect x="110" y="132" width="14" height="28" rx="7" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="106" y="154" width="22" height="14" rx="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
          </g>
        </g>

        {/* --- MAIN BODY / TORSO --- */}
        <g className="diggy-body-group">
          {/* Armored Chassis */}
          <rect x="68" y="74" width="64" height="64" rx="20" fill="url(#armorGrad)" stroke="#38bdf8" strokeWidth="2.5" />
          
          {/* Chest Reactor / Lead Ingestion Core */}
          <circle cx="100" cy="106" r="14" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
          <circle cx="100" cy="106" r="8" fill="#10b981" className="diggy-reactor-pulse" filter="url(#neonGlow)" />
          
          {/* Utility Belt with Gold Lead Pouch */}
          <rect x="66" y="126" width="68" height="10" rx="5" fill="#090d16" stroke="#475569" strokeWidth="1" />
          <rect x="92" y="123" width="16" height="15" rx="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" className="diggy-gold-pouch" />
          <path d="M96 130 H104" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />

          {/* --- ARMS & PICKAXE TOOL --- */}
          {/* Left Arm */}
          <g className="diggy-arm arm-left">
            <rect x="52" y="82" width="16" height="34" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="60" cy="116" r="7" fill="#00f0ff" />
          </g>

          {/* Right Arm Holding the Energy Pickaxe */}
          <g className="diggy-arm arm-right">
            <rect x="132" y="82" width="16" height="34" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle cx="140" cy="116" r="7" fill="#00f0ff" />
            
            {/* Golden Energy Pickaxe */}
            <g className="diggy-pickaxe">
              {/* Handle */}
              <rect x="138" y="70" width="6" height="65" rx="3" fill="#64748b" transform="rotate(-30 138 70)" />
              {/* Pickaxe Head */}
              <path
                d="M110 50 C130 58, 155 58, 175 50 C165 65, 145 68, 110 50 Z"
                fill="url(#goldEnergyGrad)"
                stroke="#fef08a"
                strokeWidth="1.5"
                filter="url(#neonGlow)"
              />
              {/* Plasma Tip Glow */}
              <circle cx="112" cy="51" r="3" fill="#ffffff" />
            </g>
          </g>

          {/* --- CELEBRATION GOLD LEAD CARD --- */}
          {mode === 'celebrate' && (
            <g className="diggy-found-card">
              <rect x="65" y="10" width="70" height="42" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" filter="url(#neonGlow)" />
              <rect x="70" y="16" width="60" height="6" rx="3" fill="#10b981" />
              <text x="73" y="32" fill="#fef08a" fontSize="8" fontWeight="bold" fontFamily="sans-serif">+91 98480...</text>
              <text x="73" y="44" fill="#38bdf8" fontSize="6.5" fontFamily="sans-serif">✓ Verified Owner</text>
            </g>
          )}

          {/* --- HEAD & VISOR --- */}
          <g className="diggy-head">
            {/* Cyber Helmet */}
            <rect x="62" y="24" width="76" height="54" rx="26" fill="url(#armorGrad)" stroke="#38bdf8" strokeWidth="3" />
            
            {/* Head Radar Antenna */}
            <path d="M100 24 V10" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="8" r="4.5" fill="#10b981" filter="url(#neonGlow)" className="diggy-antenna-beacon" />

            {/* Glowing Cyber Visor */}
            <rect x="70" y="36" width="60" height="30" rx="14" fill="url(#visorGrad)" stroke="#00f0ff" strokeWidth="1.5" />
            
            {/* Visor Scan Sweep Beam */}
            <line x1="72" y1="51" x2="128" y2="51" stroke="#ffffff" strokeWidth="2" strokeDasharray="8 6" className="diggy-visor-beam" />
            
            {/* Expressive Glowing Eyes */}
            <g className="diggy-eyes">
              <ellipse cx="88" cy="51" rx="5" ry="7" fill="#ffffff" className="diggy-eye eye-left" filter="url(#neonGlow)" />
              <ellipse cx="112" cy="51" rx="5" ry="7" fill="#ffffff" className="diggy-eye eye-right" filter="url(#neonGlow)" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

/**
 * Generates an HTML string suitable for Leaflet L.divIcon
 * Renders a full realistic cartoon excavation scene on the map:
 * ground crater, seismic shockwaves, swinging golden pickaxe,
 * flying gold sparks & contact card debris, and live speech bubble!
 */
export function getMascotMarkerHtml(mode = 'dig', zoneName = '') {
  return `
    <div class="diggy-realistic-excavator-pin">
      <!-- Ground Crater & Seismic Rupture -->
      <div class="diggy-ground-rupture">
        <span class="rupture-ring ring-a"></span>
        <span class="rupture-ring ring-b"></span>
        <svg viewBox="0 0 100 40" class="crater-svg">
          <ellipse cx="50" cy="20" rx="42" ry="12" fill="rgba(245, 158, 11, 0.25)" />
          <path d="M20 20 L35 24 L50 18 L65 24 L80 19" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
          <path d="M38 23 L44 30 L55 21" stroke="#fef08a" stroke-width="1.8" />
        </svg>
      </div>

      <!-- Flying Gold Nuggets & Contact Debris Particles -->
      <div class="excavator-debris-cloud">
        <span class="debris-particle d1"></span>
        <span class="debris-particle d2"></span>
        <span class="debris-particle d3"></span>
        <span class="debris-particle d4"></span>
        <span class="debris-card-pop">
          <b>+91</b>
          <small>✓ WA</small>
        </span>
      </div>

      <!-- Diggy Mascot Excavating with Dynamic Energy Pickaxe -->
      <div class="excavator-mascot-rig">
        <svg viewBox="0 0 120 120" fill="none" class="excavator-svg">
          <!-- Jetpack -->
          <rect x="26" y="46" width="10" height="24" rx="5" fill="#1e293b" stroke="#00f0ff" stroke-width="1.5" />
          <ellipse cx="31" cy="74" rx="3.5" ry="7" fill="#38bdf8" class="jetpack-flame" />

          <!-- Body & Reactor -->
          <rect x="36" y="42" width="40" height="40" rx="12" fill="#1e293b" stroke="#00f0ff" stroke-width="2" />
          <circle cx="56" cy="62" r="7" fill="#10b981" class="reactor-glow" />

          <!-- Legs Braced for Strike -->
          <rect x="40" y="80" width="10" height="18" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
          <rect x="58" y="80" width="10" height="18" rx="5" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
          <rect x="36" y="94" width="16" height="8" rx="3" fill="#0284c7" />
          <rect x="56" y="94" width="16" height="8" rx="3" fill="#0284c7" />

          <!-- Head & Visor -->
          <rect x="34" y="14" width="48" height="34" rx="16" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
          <line x1="58" y1="14" x2="58" y2="4" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" />
          <circle cx="58" cy="3" r="3" fill="#10b981" />
          <rect x="40" y="22" width="36" height="18" rx="9" fill="#0284c7" stroke="#00f0ff" stroke-width="1" />
          <circle cx="50" cy="31" r="3.5" fill="#ffffff" />
          <circle cx="66" cy="31" r="3.5" fill="#ffffff" />

          <!-- Swinging Golden Energy Pickaxe -->
          <g class="strike-arm-rig">
            <rect x="74" y="44" width="9" height="22" rx="4.5" fill="#1e293b" stroke="#334155" stroke-width="1.2" />
            <g class="strike-pickaxe">
              <rect x="78" y="32" width="4.5" height="42" rx="2" fill="#64748b" transform="rotate(-35 78 32)" />
              <path d="M60 20 C72 26, 88 26, 102 20 C96 31, 82 33, 60 20 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5" />
              <circle cx="61" cy="21" r="2.5" fill="#ffffff" />
            </g>
          </g>
        </svg>
      </div>

      <!-- Comic Dialogue & Telemetry Badge -->
      <div class="excavator-speech-bubble">
        <span>⛏️ I AM SCRAPING HERE!</span>
        <i class="speech-tail"></i>
      </div>
      <div class="excavator-zone-badge">
        <span class="live-dot"></span>
        <b>${zoneName || 'EXCAVATING LEADS'}</b>
      </div>
    </div>
  `;
}
