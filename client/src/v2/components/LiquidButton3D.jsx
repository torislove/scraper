import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LiquidButton3D — Advanced Interactive Cursor-Tracking Edition
 * - Dynamic mouse-tracking specular reflection (tracks mouse position over button)
 * - Click wave ripple shockwaves originating from exact click coordinates
 * - 3D hydraulic base lip with spring physics
 * - Continuous liquid wave sheen
 */
export default function LiquidButton3D({
  children,
  onClick,
  type = 'button',
  variant = 'gold',   // gold (default) | obsidian | glass-gold | ghost
  size = 'md',        // sm | md | lg | xl
  icon: IconComponent,
  iconRight: IconRightComponent,
  pulse = false,
  className = '',
  style = {},
  disabled = false,
  badge = null
}) {
  const buttonRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50, isHovered: false });
  const [ripples, setRipples] = useState([]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'obsidian':
        return {
          background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 65%, #334155 100%)',
          lipColor: '#020617',
          glowColor: 'rgba(217, 119, 6, 0.32)',
          color: '#fef3c7',
          border: '1.5px solid rgba(251, 191, 36, 0.58)'
        };
      case 'glass-gold':
      case 'ghost':
        return {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 251, 235, 0.9) 100%)',
          lipColor: '#d97706',
          glowColor: 'rgba(245, 158, 11, 0.24)',
          color: '#78350f',
          border: '1.5px solid rgba(217, 119, 6, 0.42)'
        };
      case 'sapphire':
        return {
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #b45309 100%)',
          lipColor: '#020617',
          glowColor: 'rgba(217, 119, 6, 0.35)',
          color: '#fef3c7',
          border: '1.5px solid rgba(253, 230, 138, 0.55)'
        };
      case 'gold':
      case 'emerald':
      case 'cyan':
      case 'amber':
      default:
        return {
          background: 'linear-gradient(135deg, #b45309 0%, #d97706 30%, #f59e0b 68%, #fbbf24 100%)',
          lipColor: '#78350f',
          glowColor: 'rgba(217, 119, 6, 0.44)',
          color: '#ffffff',
          border: '1.5px solid rgba(254, 243, 199, 0.78)'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: 36, padding: '0 16px', fontSize: 12, lipHeight: 3, borderRadius: 12 };
      case 'lg':
        return { height: 50, padding: '0 26px', fontSize: 14.5, lipHeight: 5, borderRadius: 16 };
      case 'xl':
        return { height: 56, padding: '0 32px', fontSize: 15.5, lipHeight: 6, borderRadius: 18 };
      case 'md':
      default:
        return { height: 42, padding: '0 20px', fontSize: 13, lipHeight: 4, borderRadius: 14 };
    }
  };

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovered: true
    });
  };

  const handleMouseLeave = () => {
    setCursorPos(prev => ({ ...prev, isHovered: false }));
  };

  const handleClick = (e) => {
    if (disabled) return;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const rippleX = e.clientX - rect.left;
      const rippleY = e.clientY - rect.top;
      const newRipple = { id: Date.now() + Math.random(), x: rippleX, y: rippleY };
      setRipples(prev => [...prev.slice(-3), newRipple]);
    }
    if (onClick) onClick(e);
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={`lx-liquid-btn-3d ${pulse ? 'has-pulse' : ''} ${className}`}
      whileHover={disabled ? {} : { y: -2.5, scale: 1.02 }}
      whileTap={disabled ? {} : { y: sStyles.lipHeight - 1, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 22 }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: vStyles.background,
        color: vStyles.color,
        border: vStyles.border,
        borderRadius: sStyles.borderRadius,
        height: sStyles.height,
        padding: sStyles.padding,
        fontSize: sStyles.fontSize,
        fontWeight: 800,
        fontFamily: 'inherit',
        letterSpacing: '0.015em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        textDecoration: 'none',
        boxShadow: `
          inset 0 1.5px 0.5px rgba(255, 255, 255, 0.75),
          inset 0 -2px 4px rgba(0, 0, 0, 0.15),
          0 ${sStyles.lipHeight}px 0 ${vStyles.lipColor},
          0 ${sStyles.lipHeight + 6}px 22px ${vStyles.glowColor}
        `,
        overflow: 'hidden',
        userSelect: 'none',
        ...style
      }}
    >
      {/* 1. Dynamic Cursor-Tracking Specular Light Gleam */}
      {cursorPos.isHovered && (
        <span
          style={{
            position: 'absolute',
            left: cursorPos.x - 45,
            top: cursorPos.y - 45,
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 1,
            mixBlendMode: 'overlay',
            transition: 'opacity 0.2s ease'
          }}
        />
      )}

      {/* 2. Expanding Click Wave Ripples */}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.75 }}
            animate={{ scale: 4.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            onAnimationComplete={() => setRipples(prev => prev.filter(item => item.id !== r.id))}
            style={{
              position: 'absolute',
              left: r.x - 20,
              top: r.y - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.15) 60%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
        ))}
      </AnimatePresence>

      {/* 3. Continuous Liquid Wave Sheen */}
      <span className="lx-liquid-sheen" />

      {/* 4. Upper Specular Gel Highlight */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: '10%',
          right: '10%',
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
          borderRadius: `${sStyles.borderRadius}px ${sStyles.borderRadius}px 40px 40px`,
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Optional Leading Icon */}
      {IconComponent && (
        <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <IconComponent size={sStyles.fontSize + 3} />
        </span>
      )}

      {/* Button Text */}
      <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap' }}>
        {children}
      </span>

      {/* Optional Badge */}
      {badge && (
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            fontSize: 10,
            fontWeight: 850,
            padding: '2px 7px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.28)',
            border: '1px solid rgba(255, 255, 255, 0.45)',
            letterSpacing: '0.04em'
          }}
        >
          {badge}
        </span>
      )}

      {/* Optional Trailing Icon */}
      {IconRightComponent && (
        <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <IconRightComponent size={sStyles.fontSize + 2} />
        </span>
      )}
    </motion.button>
  );
}
