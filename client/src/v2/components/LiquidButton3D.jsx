import React from 'react';
import { motion } from 'framer-motion';

/**
 * LiquidButton3D
 * - 3D tactile hydraulic lip (elevated box-shadow that depresses on click)
 * - Translucent liquid gel surface with glossy specular reflection
 * - Animated continuous liquid wave sheen animation
 * - Framer Motion spring physics on hover and press
 */
export default function LiquidButton3D({
  children,
  onClick,
  type = 'button',
  variant = 'emerald', // emerald | cyan | sapphire | amber | ghost
  size = 'md',        // sm | md | lg | xl
  icon: IconComponent,
  iconRight: IconRightComponent,
  pulse = false,
  className = '',
  style = {},
  disabled = false,
  badge = null
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)',
          lipColor: '#047857',
          glowColor: 'rgba(16, 185, 129, 0.42)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.45)'
        };
      case 'cyan':
        return {
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #10b981 100%)',
          lipColor: '#0369a1',
          glowColor: 'rgba(6, 182, 212, 0.42)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.45)'
        };
      case 'sapphire':
        return {
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #38bdf8 100%)',
          lipColor: '#1e3a8a',
          glowColor: 'rgba(37, 99, 235, 0.42)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.45)'
        };
      case 'amber':
        return {
          background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fbbf24 100%)',
          lipColor: '#b45309',
          glowColor: 'rgba(245, 158, 11, 0.45)',
          color: '#ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.5)'
        };
      case 'ghost':
      default:
        return {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
          lipColor: '#cbd5e1',
          glowColor: 'rgba(15, 23, 42, 0.08)',
          color: '#0f172a',
          border: '1.5px solid rgba(255, 255, 255, 0.9)'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          height: 36,
          padding: '0 16px',
          fontSize: 12,
          lipHeight: 3,
          borderRadius: 12
        };
      case 'lg':
        return {
          height: 52,
          padding: '0 28px',
          fontSize: 14.5,
          lipHeight: 5,
          borderRadius: 16
        };
      case 'xl':
        return {
          height: 58,
          padding: '0 34px',
          fontSize: 16,
          lipHeight: 6,
          borderRadius: 18
        };
      case 'md':
      default:
        return {
          height: 44,
          padding: '0 22px',
          fontSize: 13.5,
          lipHeight: 4,
          borderRadius: 14
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`lx-liquid-btn-3d ${pulse ? 'has-pulse' : ''} ${className}`}
      whileHover={disabled ? {} : { y: -2.5, scale: 1.02 }}
      whileTap={disabled ? {} : { y: sStyles.lipHeight - 1, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
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
      {/* Animated Liquid Specular Sheen Ripple */}
      <span className="lx-liquid-sheen" />

      {/* Internal Liquid Gel Highlight Bubble */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: '10%',
          right: '10%',
          height: '42%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)',
          borderRadius: `${sStyles.borderRadius}px ${sStyles.borderRadius}px 40px 40px`,
          pointerEvents: 'none'
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
