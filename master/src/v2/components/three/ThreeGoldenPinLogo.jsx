import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeGoldenPinLogo.jsx
 * ==============================================================================
 * A physically-lit, 3D rotating Golden Location Pin with an embossed 'S' monogram
 * rendered in real-time WebGL via Three.js.
 *
 * Features:
 *   - Continuous 360° Y-axis rotation with dynamic gold specular reflections.
 *   - Golden PBR metallic material (metalness: 0.94, roughness: 0.18).
 *   - Sculpted 3D 'S' monogram centered inside the location pin aperture.
 *   - Mouse move tilt & parallax with smooth damping.
 * ==============================================================================
 */

export default function ThreeGoldenPinLogo({ size = 38, className = '', interactive = true }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = typeof size === 'number' ? size : 38;
    const height = typeof size === 'number' ? size : 38;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    // High performance WebGL Renderer
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
      return;
    }

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Studio Lighting for 24K Liquid Gold Sheen (Hemisphere + Key Point prevent black metallic reflections)
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0xd97706, 2.2);
    scene.add(hemiLight);

    const frontPointLight = new THREE.PointLight(0xffffff, 2.4, 30);
    frontPointLight.position.set(2, 3, 8);
    scene.add(frontPointLight);

    const keyLight = new THREE.DirectionalLight(0xfff8dc, 3.0);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfde68a, 1.5);
    fillLight.position.set(-5, -3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    rimLight.position.set(0, -6, -4);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x6b440a, 1.3);
    scene.add(ambientLight);

    // 2. High-Luster Gold PBR Material
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0x92400e,
      emissiveIntensity: 0.55,
      metalness: 0.52,
      roughness: 0.22
    });

    const platinumMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.35,
      metalness: 0.35,
      roughness: 0.16
    });

    // 3. Location Pin 2D Shape with Bevel Extrusion
    const pinShape = new THREE.Shape();
    // Start at top center
    pinShape.moveTo(0, 1.8);
    // Right curve down to needle point
    pinShape.bezierCurveTo(1.3, 1.8, 1.7, 0.9, 1.7, 0.1);
    pinShape.bezierCurveTo(1.7, -0.8, 0.8, -1.8, 0, -2.4);
    // Left curve back up
    pinShape.bezierCurveTo(-0.8, -1.8, -1.7, -0.8, -1.7, 0.1);
    pinShape.bezierCurveTo(-1.7, 0.9, -1.3, 1.8, 0, 1.8);

    // Central circular aperture (hole in the pin)
    const holePath = new THREE.Path();
    holePath.absarc(0, 0.35, 0.82, 0, Math.PI * 2, true);
    pinShape.holes.push(holePath);

    const extrudeSettings = {
      depth: 0.32,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08
    };

    const pinGeometry = new THREE.ExtrudeGeometry(pinShape, extrudeSettings);
    pinGeometry.computeBoundingBox();
    const pinCenterY = (pinGeometry.boundingBox.min.y + pinGeometry.boundingBox.max.y) / 2;
    pinGeometry.center();
    const apertureCenterY = 0.35 - pinCenterY;
    const pinMesh = new THREE.Mesh(pinGeometry, goldMaterial);
    mainGroup.add(pinMesh);

    // 4. Sculpted 3D "S" Monogram centered inside the Aperture
    // Maps the exact C1-continuous brand SVG centerline (center 32, 27.5) into the aperture
    const sScale = 0.044;
    const pt = (x, y) => new THREE.Vector3((x - 32) * sScale, (27.5 - y) * sScale, 0);
    const sCurvePath = new THREE.CurvePath();
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(39.8, 19.4), pt(38.4, 16.8), pt(35.6, 15.6), pt(32.0, 15.6)));
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(32.0, 15.6), pt(27.1, 15.6), pt(23.8, 18.0), pt(23.8, 21.4)));
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(23.8, 21.4), pt(23.8, 25.0), pt(27.0, 26.4), pt(32.0, 27.4)));
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(32.0, 27.4), pt(37.0, 28.4), pt(40.4, 29.9), pt(40.4, 33.4)));
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(40.4, 33.4), pt(40.4, 37.0), pt(36.9, 39.4), pt(32.0, 39.4)));
    sCurvePath.add(new THREE.CubicBezierCurve3(pt(32.0, 39.4), pt(28.1, 39.4), pt(25.1, 38.0), pt(23.6, 35.4)));

    const tubeRadius = 0.135;
    const sTubeGeometry = new THREE.TubeGeometry(sCurvePath, 96, tubeRadius, 24, false);
    const sCapGeometry = new THREE.SphereGeometry(tubeRadius, 20, 16);

    const sGroup = new THREE.Group();
    const sTubeMesh = new THREE.Mesh(sTubeGeometry, platinumMaterial);
    const topCap = new THREE.Mesh(sCapGeometry, platinumMaterial);
    topCap.position.copy(pt(39.8, 19.4));
    const bottomCap = new THREE.Mesh(sCapGeometry, platinumMaterial);
    bottomCap.position.copy(pt(23.6, 35.4));
    sGroup.add(sTubeMesh, topCap, bottomCap);
    sGroup.scale.set(1, 1, 1.35);
    sGroup.position.set(0, apertureCenterY, 0);
    mainGroup.add(sGroup);

    // 5. Mouse Parallax & Inertial Damping (Viewport-clamped to avoid zero-width NaN or extreme angles)
    let mouseY = 0;
    let targetRotX = 0;

    const handleMouseMove = (e) => {
      if (!interactive) return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const ny = -((e.clientY / vh) * 2 - 1);
      const nx = (e.clientX / vw) * 2 - 1;
      if (Number.isFinite(nx) && Number.isFinite(ny)) {
        mouseY = Math.max(-1, Math.min(1, ny * 0.75 + nx * 0.15));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 6. Lifecycle-aware Animation Loop (Pauses when scrolled offscreen or tab hidden)
    let animId = null;
    let isVisible = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isVisible || document.hidden) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous smooth 360 rotation on Y-axis
      mainGroup.rotation.y += 0.02;

      // Gentle floating bob
      mainGroup.position.y = Math.sin(elapsedTime * 2.2) * 0.1;

      // Bounded cursor tilt with smooth damping
      targetRotX = mouseY * 0.28;
      mainGroup.rotation.x += (targetRotX - mainGroup.rotation.x) * 0.08;

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
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      pinGeometry.dispose();
      sTubeGeometry.dispose();
      sCapGeometry.dispose();
      goldMaterial.dispose();
      platinumMaterial.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
    };
  }, [size, interactive]);

  return (
    <div
      ref={mountRef}
      className={`lx-three-golden-pin ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        cursor: 'pointer'
      }}
      title="Scraper.co.in — 3D Golden Location Mark"
      aria-label="Scraper.co.in 3D Golden Pin Logo"
    />
  );
}
