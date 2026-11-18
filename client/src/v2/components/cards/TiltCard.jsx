import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 7,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [lightPos, setLightPos] = useState({ x: 50, y: 50, opacity: 0 });

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -maxTilt;
    const rY = ((x - centerX) / centerX) * maxTilt;

    rotateX.set(rX);
    rotateY.set(rY);

    setLightPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 1
    });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setLightPos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      ref={cardRef}
      className={`glass-card-3d ${className}`}
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {/* Specular cursor spotlight sheen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          background: `radial-gradient(circle 180px at ${lightPos.x}% ${lightPos.y}%, rgba(0, 240, 255, 0.14), transparent 80%)`,
          opacity: lightPos.opacity,
          transition: 'opacity 0.25s ease',
          zIndex: 2
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </motion.div>
  );
}
