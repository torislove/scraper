import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ThreeGoldenPinLogo from './three/ThreeGoldenPinLogo';
import { Sparkles, MapPin, Zap, SunMedium } from 'lucide-react';

/**
 * BrandLogoStory3D
 * An interactive, physically-lit visual explainer of the Scraper.co.in 3D Golden Brand Mark.
 * Breaks down the anatomy: 24k Gold Extruded Pin, Floating Platinum 'S' Monogram, and Real-time Three.js Optics.
 */
export default function BrandLogoStory3D() {
  const [activeLayer, setActiveLayer] = useState('all');

  const ANATOMY_PARTS = [
    {
      id: 'pin',
      title: '1. Extruded 24K Golden Pin',
      subtitle: 'Geospatial Micro-Coordinate Boundary',
      tag: 'Geospatial Core',
      color: '#d97706',
      bg: '#fffbeb',
      icon: MapPin,
      desc: 'Sculpted in high-density gold alloy (0.94 metalness, 0.18 roughness). Anchors every search result to verified physical street coordinates across 11 nations down to mandals, wards, and industrial parks—eliminating hallucinated leads.',
      points: [
        'Extruded 3D curved geometry with central optical aperture',
        'Physical metallic bevel catching warm key reflections',
        'Pins micro-territories without hitting the 120-result platform cap'
      ]
    },
    {
      id: 'monogram',
      title: '2. Floating Platinum "S"',
      subtitle: 'Supersonic Stream & Dual Engines',
      tag: 'Throughput Core',
      color: '#0284c7',
      bg: '#f0f9ff',
      icon: Zap,
      desc: 'The sculpted 3D platinum monogram (0.98 metalness, 0.1 roughness) floats at the geometric focal plane, embodying supersonic extraction throughput and the unified pipeline linking Client Cockpit to Master Command.',
      points: [
        'Pure platinum specular sheen providing maximum contrast against gold',
        'Continuous 360° fluid data stream dynamics',
        'Micro-beveled edges preserving sharpness at all zoom levels'
      ]
    },
    {
      id: 'optics',
      title: '3. Three.js Real-time Studio Optics',
      subtitle: '3-Point Physical Lighting & Parallax',
      tag: 'Optical Engine',
      color: '#059669',
      bg: '#ecfdf5',
      icon: SunMedium,
      desc: 'Rendered in real-time WebGL via Three.js with continuous axial rotation, subtle gravitational bobbing, and interactive cursor tilt parallax—symbolizing 100% legal clarity and live data freshness.',
      points: [
        '3-point studio lighting (amber key, white fill, cyan rim)',
        'Continuous 360° rotation with gyro tilt physics',
        'Hardware-accelerated 60 FPS WebGL rendering'
      ]
    }
  ];

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
      {/* Eyebrow Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            color: '#b45309'
          }}
        >
          <Sparkles size={12} />
          <span>OFFICIAL 3D GOLDEN LOCATION MARK · THREE.JS ANATOMY</span>
        </span>
      </div>

      {/* Main Title */}
      <h2
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 'clamp(20px, 2.5vw, 32px)',
          fontWeight: 850,
          color: '#0f172a',
          margin: '0 0 6px',
          letterSpacing: '-0.025em'
        }}
      >
        The Anatomy of a{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Precision 3D Data Instrument.
        </span>
      </h2>

      <p style={{ fontSize: 12.5, color: '#475569', maxWidth: '68ch', margin: '0 auto 18px', lineHeight: 1.5 }}>
        Engineered with genuine metallic physics, studio lighting, and smooth 360° rotation. Explore the physical layers that define the Scraper.co.in identity.
      </p>

      {/* Interactive 3D Showcase & Anatomy Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: 20,
          alignItems: 'stretch',
          textAlign: 'left'
        }}
      >
        {/* Left: 3D Mark Stage with Real Three.js Canvas */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fffbeb 100%)',
            border: '2px solid #fde68a',
            borderRadius: 20,
            padding: '24px 20px',
            boxShadow: '0 16px 36px -10px rgba(217, 119, 6, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Ambient Radial Light */}
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 220,
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              THREE.JS 3D GOLDEN PIN
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>
              LIVE 360° WEBGL
            </span>
          </div>

          {/* Real-time 3D Golden Pin Logo Canvas Centerpiece */}
          <div
            style={{
              padding: '16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 16px 24px rgba(217, 119, 6, 0.28))'
            }}
          >
            <ThreeGoldenPinLogo size={140} />
          </div>

          {/* Telemetry Pills */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #fde68a' }}>
              <span style={{ fontWeight: 650 }}>Pin Chassis:</span>
              <strong style={{ color: '#b45309' }}>24K Gold Metalness 0.94</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #fde68a' }}>
              <span style={{ fontWeight: 650 }}>Center Monogram:</span>
              <strong style={{ color: '#0284c7' }}>Platinum 'S' Monogram</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #fde68a' }}>
              <span style={{ fontWeight: 650 }}>Lighting Engine:</span>
              <strong style={{ color: '#059669' }}>3-Point Studio WebGL</strong>
            </div>
          </div>
        </div>

        {/* Right: Anatomy Breakdown Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ANATOMY_PARTS.map((part) => {
            const Icon = part.icon;
            const isSelected = activeLayer === part.id || activeLayer === 'all';
            return (
              <motion.div
                key={part.id}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.16 }}
                onClick={() => setActiveLayer(part.id)}
                style={{
                  background: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  border: `1.5px solid ${isSelected ? part.color : '#e2e8f0'}`,
                  borderRadius: 14,
                  padding: '12px 16px',
                  boxShadow: isSelected ? `0 6px 18px -4px ${part.color}24` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: part.bg,
                        color: part.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                        {part.title}
                      </h4>
                      <span style={{ fontSize: 10.5, fontWeight: 650, color: part.color }}>
                        {part.subtitle}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: part.bg,
                      color: part.color,
                      border: `1px solid ${part.color}40`
                    }}
                  >
                    {part.tag}
                  </span>
                </div>

                <p style={{ margin: '4px 0 8px', fontSize: 11.5, color: '#475569', lineHeight: 1.45 }}>
                  {part.desc}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {part.points.map((pt, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 10,
                        fontWeight: 650,
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '2px 7px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      ✓ {pt}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}