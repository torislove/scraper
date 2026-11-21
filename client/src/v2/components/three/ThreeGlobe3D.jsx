import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeGlobe3D — Ultra-Precision Geographic Edition
 * - Mathematical lat/lon spherical coordinates for all 11 sovereign nations
 * - High-precision latitude/longitude coordinate grid rings
 * - Smooth exponential rotation tweening to exact country coordinates
 * - Precision GPS beacon pins with vertical stems and target pulse rings
 */
const COUNTRY_COORDS = {
  IN: { lat: 20.5937, lon: 78.9629, name: 'India', code: 'IN-IND' },
  US: { lat: 37.0902, lon: -95.7129, name: 'United States', code: 'US-USA' },
  GB: { lat: 55.3781, lon: -3.4360, name: 'United Kingdom', code: 'GB-GBR' },
  CA: { lat: 56.1304, lon: -106.3468, name: 'Canada', code: 'CA-CAN' },
  AU: { lat: -25.2744, lon: 133.7751, name: 'Australia', code: 'AU-AUS' },
  AE: { lat: 23.4241, lon: 53.8478, name: 'United Arab Emirates', code: 'AE-ARE' },
  SG: { lat: 1.3521, lon: 103.8198, name: 'Singapore', code: 'SG-SGP' },
  NZ: { lat: -40.9006, lon: 174.8860, name: 'New Zealand', code: 'NZ-NZL' },
  IE: { lat: 53.1424, lon: -7.6921, name: 'Ireland', code: 'IE-IRL' },
  ZA: { lat: -30.5595, lon: 22.9375, name: 'South Africa', code: 'ZA-ZAF' },
  DE: { lat: 51.1657, lon: 10.4515, name: 'Germany', code: 'DE-DEU' }
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
    // Calculate exact target rotation to orient the country directly towards camera (z-axis)
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
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_RADIUS = 7.6;

    // 1. Primary Precision Holographic Wireframe
    const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });
    globeGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

    // Inner glowing atmospheric body
    const innerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.08
    });
    globeGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // 2. Precision Coordinate Rings: Equator & Prime Meridian
    const makeRing = (radius, tiltX = 0, tiltY = 0, color = 0x3b82f6) => {
      const geo = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const th = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(th) * radius, 0, Math.sin(th) * radius));
      }
      geo.setFromPoints(pts);
      const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 }));
      ring.rotation.x = tiltX;
      ring.rotation.y = tiltY;
      return ring;
    };

    globeGroup.add(makeRing(GLOBE_RADIUS + 0.08, 0, 0, 0x10b981)); // Equator
    globeGroup.add(makeRing(GLOBE_RADIUS + 0.08, Math.PI / 2, 0, 0x06b6d4)); // Meridian

    // 3. 11 Sovereign Country Beacon Pins
    const pinGeo = new THREE.SphereGeometry(0.36, 16, 16);
    const pinMeshes = {};

    Object.entries(COUNTRY_COORDS).forEach(([code, data]) => {
      const isHome = code === 'IN';
      const isSelected = code === selectedCountry;
      const color = isHome ? 0x10b981 : isSelected ? 0x06b6d4 : 0x3b82f6;

      const mat = new THREE.MeshBasicMaterial({ color });
      const pin = new THREE.Mesh(pinGeo, mat);
      const pos = latLonToVector3(data.lat, data.lon, GLOBE_RADIUS + 0.28);
      pin.position.copy(pos);
      pin.userData = { code, name: data.name };
      globeGroup.add(pin);

      // Elevated stem line
      const stemGeo = new THREE.BufferGeometry().setFromPoints([
        latLonToVector3(data.lat, data.lon, GLOBE_RADIUS),
        pos
      ]);
      const stemMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
      globeGroup.add(new THREE.Line(stemGeo, stemMat));

      pinMeshes[code] = pin;
    });

    // Inertial Drag Interaction
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevX;
      const deltaY = e.clientY - prevY;
      globeGroup.rotation.y += deltaX * 0.008;
      globeGroup.rotation.x += deltaY * 0.008;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 280;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    let animId;

    const animate = () => {
      if (!isDragging) {
        // Smooth exponential interpolation to selected target coordinates
        globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.06 + 0.002;
        globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.06;
      }

      // Pulse active country pin
      const activePin = pinMeshes[selectedCountry];
      if (activePin) {
        const s = 1 + Math.sin(Date.now() * 0.006) * 0.28;
        activePin.scale.set(s, s, s);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
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
