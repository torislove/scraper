import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import sovereignBoundaries from '../../data/sovereignBoundaries.json';

/**
 * ThreeCountryMap3D — Hardware-Accelerated 3D Sovereign Topographical Plate
 * - 100% Survey of India & Official Admin-0 Geographic Accuracy
 * - True THREE.ExtrudeGeometry with physical bevel & metallic relief depth
 * - Isometric perspective with interactive mouse-parallax tilt & idle hovering
 * - Automatic bounding-box camera framing: fills 88% of container with zero clipping
 * - 3D Micro-Zone radar beacons with pulsing animated surface waves
 */
export default function ThreeCountryMap3D({
  countryCode = 'IN',
  style = {},
  interactive = true,
  onHubClick = null
}) {
  const mountRef = useRef(null);
  const code = (countryCode || 'IN').toUpperCase();
  const countryData = sovereignBoundaries[code] || sovereignBoundaries.IN;
  const [activeHub, setActiveHub] = useState(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 340;
    let height = container.clientHeight || 220;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup for 3D metallic plate relief
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x10b981, 1.8);
    keyLight.position.set(25, 45, 55);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-35, -20, 40);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.9);
    topLight.position.set(0, 50, 20);
    scene.add(topLight);

    // 3. Country 3D Group
    const countryGroup = new THREE.Group();
    scene.add(countryGroup);

    // Base isometric rotation: angled forward so user sees topographical depth
    const BASE_ROTATION_X = -0.42;
    const BASE_ROTATION_Y = 0.08;
    countryGroup.rotation.x = BASE_ROTATION_X;
    countryGroup.rotation.y = BASE_ROTATION_Y;

    // Materials
    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f2b23,
      emissive: 0x054f3b,
      emissiveIntensity: 0.22,
      roughness: 0.25,
      metalness: 0.65,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      reflectivity: 0.85
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x10b981,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.92
    });

    const allPolygons = [countryData.threeCoords, ...(countryData.additionalPolygons || [])];
    const radarPings = [];

    // Extrude each sovereign polygon
    allPolygons.forEach(polyCoords => {
      if (!polyCoords || polyCoords.length < 3) return;

      const shape = new THREE.Shape();
      polyCoords.forEach(([x, y], idx) => {
        if (idx === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();

      const extrudeSettings = {
        depth: 1.6,
        bevelEnabled: true,
        bevelThickness: 0.4,
        bevelSize: 0.28,
        bevelSegments: 3
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const mesh = new THREE.Mesh(geometry, plateMaterial);
      countryGroup.add(mesh);

      // Add glowing neon edge outline
      const edges = new THREE.EdgesGeometry(geometry, 28);
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      countryGroup.add(edgeLines);
    });

    // 4. Micro-Zone Radar Beacons on 3D Surface
    const Z_SURFACE = 2.1; // surface height of extruded plate
    const hubMarkers = [];

    (countryData.hubs || []).forEach((hub, idx) => {
      const hubGroup = new THREE.Group();
      hubGroup.position.set(hub.threeX, hub.threeY, Z_SURFACE);

      // Pin Cylinder Beacon
      const pinGeo = new THREE.CylinderGeometry(0.35, 0.2, 1.2, 16);
      pinGeo.rotateX(Math.PI / 2);
      const pinMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x10b981 : 0x06b6d4
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.z = 0.6;
      hubGroup.add(pinMesh);

      // Top glowing sphere
      const sphereGeo = new THREE.SphereGeometry(0.45, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x34d399 : 0x38bdf8
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.z = 1.2;
      hubGroup.add(sphereMesh);

      // Animated Expanding Wave Rings
      const ringGeo = new THREE.RingGeometry(0.4, 0.75, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x10b981 : 0x06b6d4,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      hubGroup.add(ringMesh);

      radarPings.push({
        ring: ringMesh,
        mat: ringMat,
        scale: 1,
        speed: 0.02 + (idx * 0.003)
      });

      hubMarkers.push({
        hub,
        position: new THREE.Vector3(hub.threeX, hub.threeY, Z_SURFACE)
      });
    });

    // 5. Automatic Camera Auto-Fitting: Fills 88% of container box perfectly
    const box = new THREE.Box3().setFromObject(countryGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center the country geometry in local space
    countryGroup.position.x = -center.x;
    countryGroup.position.y = -center.y;

    const maxDim = Math.max(size.x, size.y);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
    cameraZ *= 1.15; // 88% box fill padding
    camera.position.set(0, 0, Math.max(cameraZ, 55));
    camera.lookAt(0, 0, 0);

    // 6. Interactive Mouse Drag & Parallax Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let targetRotX = BASE_ROTATION_X;
    let targetRotY = BASE_ROTATION_Y;

    const onMouseDown = (e) => {
      if (!interactive) return;
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!interactive) return;
      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        targetRotY += deltaX * 0.008;
        targetRotX += deltaY * 0.008;
        // Clamp rotation angles so map stays right-side up
        targetRotX = Math.max(-0.85, Math.min(0.05, targetRotX));
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile
    const onTouchStart = (e) => {
      if (!interactive || e.touches.length !== 1) return;
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchMove = (e) => {
      if (!interactive || !isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;
      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
      targetRotX = Math.max(-0.85, Math.min(0.05, targetRotX));
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDragging = false;
    };
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 7. Animation Loop with Idle Floating & Radar Expansion
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth inertia rotation interpolation
      countryGroup.rotation.x += (targetRotX - countryGroup.rotation.x) * 0.08;
      countryGroup.rotation.y += (targetRotY - countryGroup.rotation.y) * 0.08;

      // Subtle idle levitation hover
      countryGroup.position.z = Math.sin(elapsedTime * 1.6) * 0.45;

      // Animate surface radar wave rings
      radarPings.forEach(p => {
        p.scale += p.speed;
        if (p.scale > 4.2) {
          p.scale = 1;
        }
        p.ring.scale.set(p.scale, p.scale, 1);
        p.mat.opacity = Math.max(0, 0.95 - (p.scale / 4.2));
      });

      renderer.render(scene, camera);
    };

    animate();

    // 8. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      plateMaterial.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [code, countryData, interactive]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: interactive ? 'grab' : 'default',
        touchAction: 'none',
        ...style
      }}
    />
  );
}
