import React, { useEffect, useRef } from 'react';

/**
 * AnimatedLiquidBackground (Hardware-Friendly Golden Silk Edition)
 * Zero heavy CSS blur(80px) orbs; renders champagne radial gradients,
 * architectural dot-grid, and lightweight 24K golden stardust particles.
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

    const particleCount = Math.min(28, Math.max(12, Math.floor(window.innerWidth / 48)));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 0.9,
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.34 - 0.1,
      alpha: Math.random() * 0.42 + 0.18,
      color: Math.random() > 0.65 ? '#F59E0B' : Math.random() > 0.35 ? '#D97706' : '#FBBF24'
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="lx-animated-bg-root" aria-hidden="true">
      <div className="lx-blueprint-grid" />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.75
        }}
      />
    </div>
  );
}
