import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeGlobe3D
 * Interactive 3D WebGL Holographic Sovereign Globe
 * - Holographic wireframe earth sphere with atmospheric rim glow
 * - 11 3D sovereign beacon pins (India, US, UK, CA, AU, AE, SG, NZ, IE, ZA, DE)
 * - Smooth camera / rotation tweening to active selected country
 * - Mouse drag / orbit interaction
 */
const COUNTRY_COORDS = {
  IN: { lat: 20.5937, lon: 78.9629, name: 'India' },
  US: { lat: 37.0902, lon: -95.7129, name: 'United States' },
  GB: { lat: 55.3781, lon: -3.4360, name: 'United Kingdom' },
  CA: { lat: 56.1304, lon: -106.3468, name: 'Canada' },
  AU: { lat: -25.2744, lon: 133.7751, name: 'Australia' },
  AE: { lat: 23.4241, lon: 53.8478, name: 'United Arab Emirates' },
  SG: { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
  NZ: { lat: -40.9006, lon: 174.8860, name: 'New Zealand' },
  IE: { lat: 53.1424, lon: -7.6921, name: 'Ireland' },
  ZA: { lat: -30.5595, lon: 22.9375, name: 'South Africa' },
  DE: { lat: 51.1657, lon: 10.4515, name: 'Germany' }
};

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function ThreeGlobe3D({ style = {}, selectedCountry = 'IN', onSelectCountry }) {
  const mountRef = useRef(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const coords = COUNTRY_COORDS[selectedCountry] || COUNTRY_COORDS.IN;
    // Target rotation to face the country towards camera (z-axis)
    const targetY = -((coords.lon + 90) * (Math.PI / 180));
    const targetX = (coords.lat * (Math.PI / 180)) * 0.45;
    targetRotationRef.current = { x: targetX, y: targetY };
  }, [selectedCountry]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_RADIUS = 7.5;

    // 1. Holographic Wireframe Sphere
    const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 28, 28);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphereMesh);

    // Inner subtle glow sphere
    const innerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.98, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.08
    });
    globeGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // 2. Latitude / Longitude Equator Ring
    const equatorGeo = new THREE.BufferGeometry();
    const eqPoints = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      eqPoints.push(new THREE.Vector3(Math.cos(th) * (GLOBE_RADIUS + 0.1), 0, Math.sin(th) * (GLOBE_RADIUS + 0.1)));
    }
    equatorGeo.setFromPoints(eqPoints);
    const eqMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4 });
    globeGroup.add(new THREE.Line(equatorGeo, eqMat));

    // 3. 11 3D Sovereign Beacon Pins
    const pinGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const pinMeshes = {};

    Object.entries(COUNTRY_COORDS).forEach(([code, data]) => {
      const isHome = code === 'IN';
      const isSelected = code === selectedCountry;
      const color = isHome ? 0x10b981 : isSelected ? 0x06b6d4 : 0x3b82f6;

      const mat = new THREE.MeshBasicMaterial({ color });
      const pin = new THREE.Mesh(pinGeo, mat);
      const pos = latLonToVector3(data.lat, data.lon, GLOBE_RADIUS + 0.25);
      pin.position.copy(pos);
      pin.userData = { code, name: data.name };
      globeGroup.add(pin);

      // Elevated stem line
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        latLonToVector3(data.lat, data.lon, GLOBE_RADIUS),
        pos
      ]);
      const stemMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
      globeGroup.add(new THREE.Line(stemGeo, stemMat));

      pinMeshes[code] = pin;
    });

    // Mouse interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      globeGroup.rotation.y += deltaX * 0.008;
      globeGroup.rotation.x += deltaY * 0.008;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 280;
      camera.aspect = width / height;
      camera.updateProjectionMatrix;
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId;

    const animate = () => {
      if (!isDragging) {
        // Smoothly rotate towards targeted country
        globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.05 + 0.002;
        globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.05;
      }

      // Gentle pulse on selected country pin
      const activePin = pinMeshes[selectedCountry];
      if (activePin) {
        const s = 1 + Math.sin(Date.now() * 0.006) * 0.25;
        activePin.scale.set(s, s, s);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedCountry]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        ...style
      }}
    />
  );
}
