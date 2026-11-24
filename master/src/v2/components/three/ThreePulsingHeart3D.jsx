import React, { useEffect, useId, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreePulsingHeart3D
 * ==============================================================================
 * Real-time WebGL 3D extruded beveled ruby-gold heart with authentic cardiac
 * "lub-dub" double-beat pulse animation, clearcoat physical lighting, and 24K
 * Gold rim reflections.
 *
 * Includes `Heart3DInline` for crisp inline ruby-glass 3D heart rendering next
 * to text without allocating extra WebGL contexts.
 * ==============================================================================
 */
export default function ThreePulsingHeart3D({ size = 64, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    const width = typeof size === 'number' ? size : 64;
    const height = typeof size === 'number' ? size : 64;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.05, 6.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);
    } catch (e) {
      return undefined;
    }

    const heartGroup = new THREE.Group();
    scene.add(heartGroup);

    // 1. Studio Lighting: warm white key, 24K gold rim, soft rose fill
    const keyLight = new THREE.DirectionalLight(0xfff5f5, 2.5);
    keyLight.position.set(3.5, 5, 5.5);
    scene.add(keyLight);

    const goldRim = new THREE.DirectionalLight(0xfbbf24, 2.2);
    goldRim.position.set(-4.5, 3, -3.5);
    scene.add(goldRim);

    const roseFill = new THREE.DirectionalLight(0xfb7185, 1.35);
    roseFill.position.set(3, -4, 3);
    scene.add(roseFill);

    const ambient = new THREE.AmbientLight(0x4c0519, 1.15);
    scene.add(ambient);

    // 2. Sculpted Symmetric Heart Shape (extruded + deeply beveled)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.55);
    shape.bezierCurveTo(0.45, 1.38, 1.65, 1.25, 1.55, 0.22);
    shape.bezierCurveTo(1.48, -0.58, 0.52, -1.12, 0, -1.55);
    shape.bezierCurveTo(-0.52, -1.12, -1.48, -0.58, -1.55, 0.22);
    shape.bezierCurveTo(-1.65, 1.25, -0.45, 1.38, 0, 0.55);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.44,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.26,
      curveSegments: 32
    });
    geometry.center();

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,
      emissive: 0x881337,
      emissiveIntensity: 0.42,
      metalness: 0.3,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08
    });

    const mesh = new THREE.Mesh(geometry, material);
    heartGroup.add(mesh);

    // 3. Cardiac "lub-dub" double-beat + 3D rock animation with lifecycle pause
    let animId = null;
    let isVisible = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isVisible || document.hidden) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Authentic cardiac "lub-dub" cycle (~1.15s period)
      const cycle = (t * 0.88) % 1;
      const lub = Math.exp(-Math.pow((cycle - 0.16) / 0.065, 2));
      const dub = 0.72 * Math.exp(-Math.pow((cycle - 0.33) / 0.055, 2));
      const beat = Math.max(lub, dub);

      const s = 1 + beat * 0.22;
      heartGroup.scale.set(s, s, s * (1 + beat * 0.12));
      heartGroup.rotation.y = Math.sin(t * 1.45) * 0.42;
      heartGroup.rotation.x = Math.cos(t * 1.1) * 0.1;
      heartGroup.position.y = Math.sin(t * 2.1) * 0.08 + beat * 0.05;

      material.emissiveIntensity = 0.36 + beat * 0.45;
      renderer.render(scene, camera);
    };

    const startLoop = () => {
      if (animId == null && isVisible && !document.hidden) {
        clock.getDelta();
        animate();
      }
    };

    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          isVisible = Boolean(entries[0]?.isIntersecting ?? true);
          if (isVisible) startLoop();
        }, { threshold: 0.01 })
      : null;
    if (observer) observer.observe(container);

    const handleVisibility = () => {
      if (!document.hidden) startLoop();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    startLoop();

    return () => {
      if (animId != null) cancelAnimationFrame(animId);
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
    };
  }, [size]);

  return (
    <div
      className={`lx-heart-3d-wrap ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
      title="Engineered with passion — Scraper.co.in"
    >
      <span className="lx-heart-3d-aura" aria-hidden="true" />
      <div
        ref={mountRef}
        style={{
          width: size,
          height: size,
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 10px 18px rgba(225, 29, 72, 0.32))'
        }}
      />
    </div>
  );
}

/**
 * Lightweight 3D glossy ruby-gold heart SVG for inline placement alongside
 * text ("— With love, Manoj") without allocating a WebGL context.
 */
export function Heart3DInline({ size = 20, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `heart3d-ruby-${uid}`;
  const sheenId = `heart3d-sheen-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`lx-heart-3d-inline ${className}`}
      aria-label="3D pulsing love heart"
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="35%" stopColor="#F43F5E" />
          <stop offset="78%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <linearGradient id={sheenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M16 28.2C16 28.2 3.2 20.1 3.2 11.4C3.2 7.2 6.5 4 10.6 4C13.1 4 15.1 5.3 16 7.1C16.9 5.3 18.9 4 21.4 4C25.5 4 28.8 7.2 28.8 11.4C28.8 20.1 16 28.2 16 28.2Z"
        fill={`url(#${gradId})`}
        stroke="#FBBF24"
        strokeWidth="1.15"
      />
      <ellipse cx="10.2" cy="9.4" rx="3.2" ry="2.1" transform="rotate(-24 10.2 9.4)" fill={`url(#${sheenId})`} />
    </svg>
  );
}