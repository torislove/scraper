import React, { useId } from 'react';
import './mascot3d.css';

/**
 * Mascot3D — Ultra High-End Articulated 3D Character Engine ("Diggy the Lead Harvester")
 * 
 * Features:
 * - True Volumetric 3D Shading: Multi-point lighting, metallic specular highlights, cylindrical depth
 * - Zero-Glitch Vector Rig: Anatomically cohesive joints that never detach or distort at any scale
 * - 3D Perspective Matrix: Hardware-accelerated CSS perspective & tilt (preserve-3d)
 * - 8 Kinetic Action Modes:
 *   'idle'  : 3D breathing floating hover, visor laser sweep, expressive eye blinks
 *   'walk'  : Realistic bipedal walk cycle with alternating leg pivots & torso sway
 *   'fly'   : Jetpack high-velocity forward flight with dual cyan thrust plumes
 *   'dig'   : High-energy golden energy pickaxe slam, ground crater rupture & flying gold
 *   'dance' : Comical robot breakdance with hip wiggles & alternating robotic arm waves
 *   'trip'  : Comedic stumble over telecom wire, faceplant & sheepish recovery
 *   'tap'   : Leaning up to the screen glass & knocking 3 times
 *   'peek'  : Ducking down and peeking up with one curious eye
 */
export default function Mascot3D({
  mode = 'idle', // 'idle' | 'walk' | 'fly' | 'dig' | 'dance' | 'trip' | 'tap' | 'peek'
  size = 120,
  className = '',
  bubbleText = null,
  onClick = null,
  rotationY = 0
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '_');

  return (
    <div
      className={`mascot-3d-stage mode-${mode} ${className}`}
      style={{
        width: size,
        height: size,
        '--mascot-size': `${size}px`,
        '--user-rot-y': `${rotationY}deg`
      }}
      onClick={onClick}
      role="img"
      aria-label={`Diggy the 3D Lead Harvester (${mode})`}
    >
      {/* 3D Floating Speech Bubble */}
      {bubbleText && (
        <div className="mascot-3d-bubble">
          <span className="bubble-text">{bubbleText}</span>
          <i className="bubble-tail" />
        </div>
      )}

      {/* 3D Perspective Matrix Wrapper */}
      <div className="mascot-3d-rig">
        {/* Dynamic Contact Shadow */}
        <div className="plane-ground-shadow">
          <div className="ground-shadow-ellipse" />
        </div>

        {/* The Unified 3D Volumetric Articulated Vector Rig */}
        <svg
          viewBox="0 0 200 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mascot-3d-svg-mesh"
        >
          <defs>
            {/* 1. Volumetric Armor Chassis Gradient (Metallic Curvature) */}
            <linearGradient id={`armor3D_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="65%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0a0f1d" />
            </linearGradient>

            {/* 2. Helmet Spherical 3D Gradient */}
            <radialGradient id={`helmet3D_${uid}`} cx="38%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="35%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>

            {/* 3. Curved Glass Cyber Visor 3D Gradient */}
            <linearGradient id={`visor3D_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="20%" stopColor="#00f0ff" />
              <stop offset="65%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#034d75" />
            </linearGradient>

            {/* 4. Golden Energy Pickaxe High-Voltage 3D Plasma Gradient */}
            <linearGradient id={`goldPick3D_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#fef08a" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* 5. Jetpack Titanium Cylinder Gradient */}
            <linearGradient id={`jetpack3D_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* 6. Plasma Thruster Flame 3D Gradient */}
            <linearGradient id={`thrusterFlame3D_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#00f0ff" />
              <stop offset="65%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* 7. Neon Glow Filter */}
            <filter id={`neonGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>

            {/* 8. Gold Sparks Filter */}
            <filter id={`goldGlow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="gold" />
              <feComposite in="SourceGraphic" in2="gold" operator="over" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* LAYER 1: TWIN CYLINDRICAL JETPACK TANKS & THRUSTER FLAMES       */}
          {/* ============================================================== */}
          <g className="rig-layer-jetpack">
            {/* Left Jetpack Tank */}
            <rect x="44" y="74" width="20" height="48" rx="10" fill={`url(#jetpack3D_${uid})`} stroke="#00f0ff" strokeWidth="1.5" />
            <ellipse cx="54" cy="74" rx="8" ry="4" fill="#94a3b8" />
            <rect x="48" y="120" width="12" height="6" rx="2" fill="#334155" stroke="#00f0ff" strokeWidth="1" />

            {/* Right Jetpack Tank */}
            <rect x="136" y="74" width="20" height="48" rx="10" fill={`url(#jetpack3D_${uid})`} stroke="#00f0ff" strokeWidth="1.5" />
            <ellipse cx="146" cy="74" rx="8" ry="4" fill="#94a3b8" />
            <rect x="140" y="120" width="12" height="6" rx="2" fill="#334155" stroke="#00f0ff" strokeWidth="1" />

            {/* Jetpack Manifold Crossbar */}
            <rect x="62" y="86" width="76" height="10" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

            {/* Pulsing Jetpack Plasma Thruster Flames */}
            <g className="rig-jetpack-flames">
              <ellipse cx="54" cy="138" rx="7" ry="18" fill={`url(#thrusterFlame3D_${uid})`} className="flame flame-l" filter={`url(#neonGlow_${uid})`} />
              <ellipse cx="146" cy="138" rx="7" ry="18" fill={`url(#thrusterFlame3D_${uid})`} className="flame flame-r" filter={`url(#neonGlow_${uid})`} />
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 2: BIPEDAL ARTICULATED LEGS & TREAD BOOTS                 */}
          {/* ============================================================== */}
          <g className="rig-layer-legs">
            {/* Left Leg */}
            <g className="rig-leg leg-left">
              {/* Thigh */}
              <rect x="70" y="132" width="18" height="30" rx="9" fill={`url(#armor3D_${uid})`} stroke="#334155" strokeWidth="2" />
              {/* Knee Joint */}
              <circle cx="79" cy="158" r="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
              <circle cx="79" cy="158" r="2.5" fill="#10b981" />
              {/* Shin & Boot */}
              <rect x="65" y="160" width="26" height="18" rx="7" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              {/* Sole Plate */}
              <rect x="63" y="174" width="30" height="6" rx="3" fill="#0284c7" />
            </g>

            {/* Right Leg */}
            <g className="rig-leg leg-right">
              {/* Thigh */}
              <rect x="112" y="132" width="18" height="30" rx="9" fill={`url(#armor3D_${uid})`} stroke="#334155" strokeWidth="2" />
              {/* Knee Joint */}
              <circle cx="121" cy="158" r="6" fill="#0f172a" stroke="#00f0ff" strokeWidth="1.5" />
              <circle cx="121" cy="158" r="2.5" fill="#10b981" />
              {/* Shin & Boot */}
              <rect x="109" y="160" width="26" height="18" rx="7" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              {/* Sole Plate */}
              <rect x="107" y="174" width="30" height="6" rx="3" fill="#0284c7" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 3: MAIN TORSO CHASSIS & REACTOR CORE                      */}
          {/* ============================================================== */}
          <g className="rig-layer-torso">
            {/* Heavy Armored Chassis Body */}
            <rect x="60" y="66" width="80" height="74" rx="22" fill={`url(#armor3D_${uid})`} stroke="#38bdf8" strokeWidth="2.5" />

            {/* Specular Top Rim Reflection */}
            <path d="M72 68 Q100 74 128 68" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2" strokeLinecap="round" />

            {/* Central Ingestion Reactor Core */}
            <circle cx="100" cy="100" r="17" fill="#0a0f1d" stroke="#00f0ff" strokeWidth="2" />
            <circle cx="100" cy="100" r="11" fill="#10b981" className="rig-reactor-pulse" filter={`url(#neonGlow_${uid})`} />
            <circle cx="100" cy="100" r="4.5" fill="#ffffff" />

            {/* Utility Belt & Golden +91 Lead Pouch */}
            <rect x="58" y="128" width="84" height="12" rx="6" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
            <g className="rig-lead-pouch">
              <rect x="91" y="124" width="18" height="17" rx="4" fill="url(#goldPick3D_${uid})" stroke="#fef08a" strokeWidth="1.5" filter={`url(#goldGlow_${uid})`} />
              <path d="M95 132 H105" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 4: 3D ARMORED HELMET, CYBER VISOR & RADAR BEACON         */}
          {/* ============================================================== */}
          <g className="rig-layer-head">
            {/* Helmet Main Volumetric Shell */}
            <rect x="54" y="14" width="92" height="60" rx="30" fill={`url(#helmet3D_${uid})`} stroke="#38bdf8" strokeWidth="3" />
            
            {/* Top Specular Rim Reflection */}
            <path d="M68 20 Q100 16 132 20" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Top Radar Antenna */}
            <line x1="100" y1="14" x2="100" y2="3" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="2" r="4.5" fill="#10b981" filter={`url(#neonGlow_${uid})`} className="rig-antenna-orb" />

            {/* Curved Glowing Cyber Visor */}
            <rect x="64" y="26" width="72" height="34" rx="17" fill={`url(#visor3D_${uid})`} stroke="#00f0ff" strokeWidth="1.8" />

            {/* Visor Glass Top Gloss Sheen */}
            <path d="M74 31 Q100 37 126 31" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="2" strokeLinecap="round" />

            {/* Visor Laser Scan Sweep Beam */}
            <line x1="68" y1="43" x2="132" y2="43" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 8" className="rig-visor-sweep" />

            {/* Expressive Glowing 3D Robot Eyes */}
            <g className="rig-visor-eyes">
              <ellipse cx="86" cy="43" rx="5.5" ry="8" fill="#ffffff" filter={`url(#neonGlow_${uid})`} className="rig-eye eye-l" />
              <ellipse cx="114" cy="43" rx="5.5" ry="8" fill="#ffffff" filter={`url(#neonGlow_${uid})`} className="rig-eye eye-r" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 5: LEFT CYBER ARM (COUNTER-BALANCE & GESTURES)            */}
          {/* ============================================================== */}
          <g className="rig-layer-arm-left">
            <g className="rig-arm arm-left">
              {/* Shoulder Joint */}
              <circle cx="48" cy="80" r="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              {/* Bicep */}
              <rect x="40" y="80" width="16" height="32" rx="8" fill={`url(#armor3D_${uid})`} stroke="#334155" strokeWidth="1.8" />
              {/* Forearm & Cyber Gauntlet */}
              <rect x="38" y="104" width="18" height="26" rx="7" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <circle cx="47" cy="126" r="6.5" fill="#00f0ff" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 6: RIGHT CYBER ARM & GOLDEN ENERGY PICKAXE               */}
          {/* ============================================================== */}
          <g className="rig-layer-arm-right">
            <g className="rig-arm arm-right">
              {/* Shoulder Joint */}
              <circle cx="152" cy="80" r="9" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              {/* Bicep */}
              <rect x="144" y="80" width="16" height="32" rx="8" fill={`url(#armor3D_${uid})`} stroke="#334155" strokeWidth="1.8" />
              {/* Forearm & Cyber Gauntlet */}
              <rect x="144" y="104" width="18" height="26" rx="7" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <circle cx="153" cy="126" r="6.5" fill="#00f0ff" />

              {/* The 3D Golden Energy Pickaxe */}
              <g className="rig-pickaxe-tool">
                {/* Heavy Titanium Shaft */}
                <rect x="151" y="60" width="6" height="74" rx="3" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" transform="rotate(-30 151 60)" />
                {/* Collar */}
                <rect x="146" y="55" width="14" height="6" rx="2" fill="#00f0ff" transform="rotate(-30 146 55)" />
                {/* High-Voltage Curved Plasma Pick Blade */}
                <path
                  d="M116 38 C140 48, 172 48, 196 38 C184 56, 160 62, 116 38 Z"
                  fill={`url(#goldPick3D_${uid})`}
                  stroke="#fef08a"
                  strokeWidth="2"
                  filter={`url(#goldGlow_${uid})`}
                />
                {/* Plasma Diamond Tip Flash */}
                <circle cx="118" cy="39" r="3.5" fill="#ffffff" />
                <circle cx="194" cy="39" r="2.5" fill="#fef08a" />
              </g>
            </g>
          </g>

          {/* ============================================================== */}
          {/* LAYER 7: GROUND CRATER, FLYING GOLD SPARKS & CONTACT CARDS     */}
          {/* ============================================================== */}
          {(mode === 'dig' || mode === 'celebrate') && (
            <g className="rig-layer-excavation">
              {/* Ground Fissures */}
              <ellipse cx="100" cy="195" rx="55" ry="12" fill="rgba(245, 158, 11, 0.3)" />
              <path d="M70 194 L85 200 L102 193 L120 200 L135 194" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
              <path d="M88 198 L96 206 L112 196" stroke="#fef08a" strokeWidth="2" />

              {/* Flying Gold Sparks */}
              <circle cx="78" cy="180" r="3" fill="#fef08a" className="spark spark-1" filter={`url(#goldGlow_${uid})`} />
              <circle cx="128" cy="176" r="3.5" fill="#f59e0b" className="spark spark-2" filter={`url(#goldGlow_${uid})`} />
              <circle cx="104" cy="164" r="2.5" fill="#ffffff" className="spark spark-3" />
              <circle cx="92" cy="155" r="2" fill="#38bdf8" className="spark spark-1" />

              {/* Popping WhatsApp Verified Contact Card */}
              <g className="rig-pop-contact-card">
                <rect x="130" y="20" width="66" height="38" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.8" filter={`url(#goldGlow_${uid})`} />
                <rect x="134" y="24" width="58" height="5" rx="2.5" fill="#10b981" />
                <text x="137" y="38" fill="#fef08a" fontSize="7.5" fontWeight="bold" fontFamily="monospace">+91 Verified</text>
                <text x="137" y="49" fill="#38bdf8" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">✓ WhatsApp</text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * Generates rich HTML for Leaflet maps to render the 3D Excavator
 */
export function getMascot3DMarkerHtml(zoneName = '') {
  return `
    <div class="mascot-3d-map-anchor">
      <!-- 1. 3D Concentric Seismic Shockwaves & Glowing Fissures -->
      <div class="map-3d-ground-blast">
        <span class="blast-wave wave-1"></span>
        <span class="blast-wave wave-2"></span>
        <span class="blast-wave wave-3"></span>
        <div class="fissure-cracks-glow"></div>
      </div>

      <!-- 2. White-Hot Strike Impact Flash -->
      <div class="map-strike-flash"></div>

      <!-- 3. High-Fidelity 3D Diggy Excavator Vector Rig -->
      <div class="map-3d-character-assembly">
        <svg viewBox="0 0 120 120" fill="none" class="map-diggy-excavator-svg">
          <defs>
            <linearGradient id="m_mapArmor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#475569"/>
              <stop offset="60%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0a0f1d"/>
            </linearGradient>
            <linearGradient id="m_mapVisor" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="45%" stop-color="#00f0ff"/>
              <stop offset="100%" stop-color="#0284c7"/>
            </linearGradient>
            <linearGradient id="m_mapGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="50%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#78350f"/>
            </linearGradient>
          </defs>

          <!-- Jetpack on back -->
          <rect x="22" y="44" width="12" height="28" rx="6" fill="#1e293b" stroke="#00f0ff" stroke-width="1.4"/>
          <ellipse cx="28" cy="74" rx="4" ry="10" fill="#00f0ff" class="map-flame-flare"/>

          <!-- Armored Torso Chassis -->
          <rect x="34" y="40" width="44" height="42" rx="12" fill="url(#m_mapArmor)" stroke="#38bdf8" stroke-width="2"/>
          <circle cx="56" cy="61" r="9" fill="#0a0f1d" stroke="#00f0ff" stroke-width="1.5"/>
          <circle cx="56" cy="61" r="5" fill="#10b981" class="map-core-pulse"/>

          <!-- Braced Heavy Boots -->
          <rect x="38" y="78" width="12" height="20" rx="5" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <rect x="58" y="78" width="12" height="20" rx="5" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
          <rect x="35" y="93" width="18" height="9" rx="4" fill="#0284c7"/>
          <rect x="55" y="93" width="18" height="9" rx="4" fill="#0284c7"/>

          <!-- Helmet Shell & Cyber Visor -->
          <rect x="30" y="12" width="52" height="34" rx="16" fill="url(#m_mapArmor)" stroke="#38bdf8" stroke-width="2.2"/>
          <line x1="56" y1="12" x2="56" y2="3" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="56" cy="2" r="3.5" fill="#10b981" class="map-antenna-pulse"/>
          <rect x="37" y="21" width="38" height="18" rx="9" fill="url(#m_mapVisor)" stroke="#00f0ff" stroke-width="1.2"/>
          <ellipse cx="48" cy="30" rx="3" ry="4" fill="#ffffff"/>
          <ellipse cx="64" cy="30" rx="3" ry="4" fill="#ffffff"/>

          <!-- Dynamic Striking Golden Pickaxe Arm -->
          <g class="map-strike-arm-rig">
            <rect x="74" y="44" width="10" height="22" rx="5" fill="#1e293b" stroke="#334155" stroke-width="1.2"/>
            <g class="map-pickaxe-head-rig">
              <rect x="78" y="28" width="5" height="52" rx="2.5" fill="#94a3b8" transform="rotate(-30 78 28)"/>
              <path d="M54 14 C70 22, 94 22, 110 14 C102 28, 86 32, 54 14 Z" fill="url(#m_mapGold)" stroke="#fef08a" stroke-width="1.8"/>
              <circle cx="56" cy="15" r="3" fill="#ffffff"/>
            </g>
          </g>
        </svg>
      </div>

      <!-- 4. Multi-Particle Flying Gold Fountain & Dual Verified Contact Cards -->
      <div class="map-gold-fountain">
        <span class="gold-spark s1"></span>
        <span class="gold-spark s2"></span>
        <span class="gold-spark s3"></span>
        <span class="gold-spark s4"></span>
        <span class="gold-spark s5"></span>
        <span class="gold-spark s6"></span>
        <div class="floating-lead-card-pop card-1">
          <b>+91 98480...</b>
          <small>✓ WA</small>
        </div>
        <div class="floating-lead-card-pop card-2">
          <b>+91 99123...</b>
          <small>✓ Owner</small>
        </div>
      </div>

      <!-- 5. Comic Live Dialogue & Active Telemetry Zone Badge (Floating Cleanly Above) -->
      <div class="map-3d-speech-bubble">
        <span>⛏️ I AM DIGGING REAL LEADS!</span>
      </div>
      <div class="map-3d-zone-badge">
        <i class="badge-pulse-dot"></i>
        <b>⚡ ACTIVE RADAR: ${zoneName ? zoneName.toUpperCase() : 'SEARCH SECTOR'}</b>
      </div>
    </div>
  `;
}
