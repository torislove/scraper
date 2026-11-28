/**
 * shared/three/ThreeBrandLogo.jsx
 * Upright 24K Gold & Sapphire 3D Locator Pin.
 * Uses native performance.now() (zero THREE.Clock deprecation warnings),
 * WebGL context-loss recovery, Error-guarded render loop, and IntersectionObserver pause.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function FallbackPinSvg({ size = 82 }) {
  return (
    <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lpSafePinGold" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M32 6C19.85 6 10 15.85 10 28C10 42.5 32 58 32 58C32 58 54 42.5 54 28C54 15.85 44.15 6 32 6ZM32 36C27.58 36 24 32.42 24 28C24 23.58 27.58 20 32 20C36.42 20 40 23.58 40 28C40 32.42 36.42 36 32 36Z"
        fill="url(#lpSafePinGold)"
      />
      <circle cx="32" cy="28" r="5" fill="#0284c7" />
    </svg>
  );
}

export default function ThreeBrandLogo({
  size = 82,
  interactive = true,
  speed = 1.0,
  className = ''
}) {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || webglFailed) return undefined;

    const width = typeof size === 'number' && Number.isFinite(size) ? size : 82;
    const height = width;
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    let pinGeo;
    let pinMat;
    let sGeo;
    let sMat;
    let animId = 0;
    let observer = null;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0, 6.2);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.replaceChildren(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.45));
      const keyLight = new THREE.DirectionalLight(0xfef3c7, 2.2);
      keyLight.position.set(3, 4, 5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x0284c7, 1.4);
      rimLight.position.set(-3, 1, -2);
      scene.add(rimLight);

      const bottomFill = new THREE.DirectionalLight(0xfde68a, 1.0);
      bottomFill.position.set(0, -3, 2);
      scene.add(bottomFill);

      // Upright Locator Pin (Bulb at +Y, Needle at -Y)
      const shape = new THREE.Shape();
      shape.moveTo(0, -1.3);
      shape.bezierCurveTo(-0.6, -0.6, -1.1, 0.2, -1.1, 0.7);
      shape.absarc(0, 0.7, 1.1, Math.PI, 0, true);
      shape.bezierCurveTo(1.1, 0.2, 0.6, -0.6, 0, -1.3);

      const holePath = new THREE.Path();
      holePath.absarc(0, 0.7, 0.52, 0, Math.PI * 2, true);
      shape.holes.push(holePath);

      pinGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.32,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.06
      });
      pinGeo.center();

      pinMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x92400e,
        emissiveIntensity: 0.14,
        metalness: 0.72,
        roughness: 0.26
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);

      sGeo = new THREE.TorusKnotGeometry(0.24, 0.07, 56, 14, 2, 3);
      sMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.24,
        metalness: 0.88,
        roughness: 0.16
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(0, 0.24, 0.06);

      const rootGroup = new THREE.Group();
      rootGroup.add(pinMesh);
      rootGroup.add(sMesh);
      scene.add(rootGroup);

      let contextLost = false;
      const canvas = renderer.domElement;
      const onContextLost = (e) => {
        e.preventDefault();
        contextLost = true;
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      };
      const onContextRestored = () => {
        contextLost = false;
        startLoop();
      };
      canvas.addEventListener('webglcontextlost', onContextLost, false);
      canvas.addEventListener('webglcontextrestored', onContextRestored, false);

      const handleMouseMove = (e) => {
        if (!interactive || reducedMotion) return;
        const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
        const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
        mouseRef.current = {
          x: Math.max(-1, Math.min(1, nx)),
          y: Math.max(-1, Math.min(1, ny))
        };
      };

      if (interactive && !reducedMotion) window.addEventListener('mousemove', handleMouseMove, { passive: true });

      let isVisible = true;
      const nowSec = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
      const t0 = nowSec();
      let prevSec = t0;

      const renderFrame = () => {
        if (!isVisible || document.hidden || contextLost) {
          animId = 0;
          return;
        }
        if (!reducedMotion) {
          animId = requestAnimationFrame(renderFrame);
        }
        try {
          const cur = nowSec();
          const dt = Math.min(0.05, Math.max(0, cur - prevSec));
          prevSec = cur;
          const elapsed = (cur - t0) * speed;

          if (!reducedMotion) {
            rootGroup.position.y = Math.sin(elapsed * 1.7) * 0.07;
            const baseOsc = Math.sin(elapsed * 0.75) * 0.14;
            const targetRotY = baseOsc + (interactive ? mouseRef.current.x * 0.16 : 0);
            const targetRotX = interactive ? mouseRef.current.y * 0.11 : 0;
            const targetRotZ = interactive ? -mouseRef.current.x * 0.06 : 0;

            rootGroup.rotation.x = THREE.MathUtils.lerp(rootGroup.rotation.x, targetRotX, 0.06);
            rootGroup.rotation.y = THREE.MathUtils.lerp(rootGroup.rotation.y, targetRotY, 0.06);
            rootGroup.rotation.z = THREE.MathUtils.lerp(rootGroup.rotation.z, targetRotZ, 0.06);
            sMesh.rotation.x += 0.65 * dt * speed;
            sMesh.rotation.y += 0.9 * dt * speed;
          }
          renderer.render(scene, camera);
        } catch (_) {
          if (animId) cancelAnimationFrame(animId);
          animId = 0;
          setWebglFailed(true);
        }
      };

      function startLoop() {
        if (!animId && isVisible && !document.hidden && !contextLost) {
          prevSec = nowSec();
          renderFrame();
        }
      }

      if (typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver(
          (entries) => {
            isVisible = Boolean(entries[0]?.isIntersecting);
            if (isVisible) startLoop();
            else if (animId) {
              cancelAnimationFrame(animId);
              animId = 0;
            }
          },
          { threshold: 0.05 }
        );
        observer.observe(container);
      }

      const onVisChange = () => { if (!document.hidden) startLoop(); };
      document.addEventListener('visibilitychange', onVisChange);
      renderFrame();

      return () => {
        if (animId) cancelAnimationFrame(animId);
        observer?.disconnect();
        document.removeEventListener('visibilitychange', onVisChange);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        if (interactive && !reducedMotion) window.removeEventListener('mousemove', handleMouseMove);
        try {
          if (container.contains(canvas)) container.removeChild(canvas);
          pinGeo?.dispose();
          pinMat?.dispose();
          sGeo?.dispose();
          sMat?.dispose();
          renderer?.dispose();
        } catch (_) {}
      };
    } catch (_) {
      setWebglFailed(true);
      return undefined;
    }
  }, [size, interactive, speed, webglFailed]);

  return (
    <div
      ref={mountRef}
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Scraper.co.in 3D Pin"
    >
      {webglFailed && <FallbackPinSvg size={size} />}
    </div>
  );
}
