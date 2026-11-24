import React, { useEffect, useRef } from 'react';

/**
 * AnimatedLiquidBackground
 * - Layer 1: Ambient morphing chromatic plasma blobs (emerald, cyan, sapphire, amber)
 * - Layer 2: Subtle digital blueprint grid with radial fade mask
 * - Layer 3: Interactive HTML5 Canvas drifting glowing stardust particles
 * - Layer 4: Ambient mouse light follower for physical liquid glass refraction
 */
export default function AnimatedLiquidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate 45 light-weight floating particles in 24K Liquid Gold & Champagne tones
    const particleCount = Math.min(45, Math.floor(window.innerWidth / 30));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.42,
      vy: (Math.random() - 0.5) * 0.42 - 0.14,
      alpha: Math.random() * 0.52 + 0.2,
      color: Math.random() > 0.65 ? '#F59E0B' : Math.random() > 0.35 ? '#D97706' : Math.random() > 0.5 ? '#FBBF24' : '#94A3B8'
    }));

    // Mouse coordinates for gentle interactive attraction
    let mouseX = width / 2;
    let mouseY = height / 2;
    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render glowing particle motes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Gentle mouse interaction
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          p.x -= (dx / dist) * 0.8;
          p.y -= (dy / dist) * 0.8;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw faint constellation lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#D97706';
            ctx.globalAlpha = (1 - d / 110) * 0.1;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="lx-animated-bg-root"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#f8fafc'
      }}
    >
      {/* Dynamic Chromatic Fluid Plasma Blobs */}
      <div className="lx-liquid-plasma-orb orb-1" />
      <div className="lx-liquid-plasma-orb orb-2" />
      <div className="lx-liquid-plasma-orb orb-3" />
      <div className="lx-liquid-plasma-orb orb-4" />

      {/* Blueprint Grid Overlay with Radial Vignette */}
      <div className="lx-blueprint-grid" />

      {/* HTML5 Canvas for Floating Stardust Particles */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.85
        }}
      />
    </div>
  );
}
