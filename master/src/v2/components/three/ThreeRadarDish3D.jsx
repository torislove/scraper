import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeRadarDish3D
 * Interactive 3D WebGL Holographic Radar Station
 * - Holographic wireframe radar dish & scanner rings
 * - 360-degree rotating laser sweep beam
 * - 3D pulsing coordinate beacons
 * - Mouse drag/tilt rotation for full 3D interactive feel
 */
export default function ThreeRadarDish3D({ style = {}, activeScenario = null }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 260;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 28);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for mouse tilt
    const radarGroup = new THREE.Group();
    scene.add(radarGroup);

    // 1. Concentric Holographic Radar Rings
    const ringMaterials = [
      new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.65 }),
      new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 }),
      new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 })
    ];

    [4, 8, 12].forEach((radius, idx) => {
      const circleGeo = new THREE.BufferGeometry();
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      circleGeo.setFromPoints(points);
      const ringLine = new THREE.Line(circleGeo, ringMaterials[idx % ringMaterials.length]);
      radarGroup.add(ringLine);
    });

    // Crosshairs
    const crossHairGeo = new THREE.BufferGeometry();
    crossHairGeo.setFromPoints([
      new THREE.Vector3(-13, 0, 0), new THREE.Vector3(13, 0, 0),
      new THREE.Vector3(0, 0, -13), new THREE.Vector3(0, 0, 13)
    ]);
    const crossHairMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 });
    const crossHairs = new THREE.LineSegments(crossHairGeo, crossHairMat);
    radarGroup.add(crossHairs);

    // 2. Rotating Sweeper Beam (Conic Sector)
    const sweepGeo = new THREE.RingGeometry(0.2, 12.5, 32, 1, 0, Math.PI / 3);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    radarGroup.add(sweepMesh);

    // 3. 3D Lead Beacons (Glowing floating spheres)
    const beaconGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beaconMatCyan = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const beaconMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const beaconCoords = [
      { x: -5, z: -4, mat: beaconMat },
      { x: 3, z: 6, mat: beaconMatCyan },
      { x: 7, z: -3, mat: beaconMatAmber },
      { x: -6, z: 5, mat: beaconMat },
      { x: 2, z: -7, mat: beaconMatCyan }
    ];

    const beaconMeshes = beaconCoords.map(coord => {
      const mesh = new THREE.Mesh(beaconGeo, coord.mat);
      mesh.position.set(coord.x, 0.5, coord.z);
      radarGroup.add(mesh);
      return mesh;
    });

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.45;
      mouseY = y * 0.35;
    };
    container.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 320;
      height = container.clientHeight || 260;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    let time = 0;
    const animate = () => {
      time += 0.035;

      // Rotate laser sweep beam
      sweepMesh.rotation.z -= 0.045;

      // Bob beacons up and down
      beaconMeshes.forEach((mesh, idx) => {
        mesh.position.y = 0.5 + Math.sin(time * 2 + idx) * 0.25;
      });

      // Smooth mouse tilt
      radarGroup.rotation.y += (mouseX - radarGroup.rotation.y) * 0.06;
      radarGroup.rotation.x += (mouseY + 0.35 - radarGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeScenario]);

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
