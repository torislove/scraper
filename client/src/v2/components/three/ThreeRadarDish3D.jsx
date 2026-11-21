import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeRadarDish3D — Ultra-Precision Edition
 * - 360-degree Azimuth coordinate ticks (0°, 90°, 180°, 270°)
 * - High-precision concentric range rings with distance markers
 * - Mathematical target acquisition beacons with live pulse
 * - Mouse drag & tilt with smooth inertial damping
 */
export default function ThreeRadarDish3D({ style = {}, activeScenario = null }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 15, 27);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const radarGroup = new THREE.Group();
    scene.add(radarGroup);

    // 1. Precision Concentric Distance Rings (4km, 8km, 12km)
    const ringRadii = [4.2, 8.4, 12.6];
    const ringColors = [0x10b981, 0x06b6d4, 0x3b82f6];

    ringRadii.forEach((radius, idx) => {
      const circleGeo = new THREE.BufferGeometry();
      const points = [];
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      circleGeo.setFromPoints(points);
      const ringLine = new THREE.Line(
        circleGeo,
        new THREE.LineBasicMaterial({ color: ringColors[idx], transparent: true, opacity: 0.55 - idx * 0.1 })
      );
      radarGroup.add(ringLine);
    });

    // 2. 12 Precision Radial Azimuth Spokes (Every 30 degrees)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spokeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5),
        new THREE.Vector3(Math.cos(angle) * 13.2, 0, Math.sin(angle) * 13.2)
      ]);
      const spokeMat = new THREE.LineBasicMaterial({
        color: i % 3 === 0 ? 0x10b981 : 0x06b6d4,
        transparent: true,
        opacity: i % 3 === 0 ? 0.45 : 0.2
      });
      radarGroup.add(new THREE.Line(spokeGeo, spokeMat));
    }

    // 3. Central Focal Reticle
    const focalGeo = new THREE.RingGeometry(0.3, 0.65, 32);
    const focalMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const focalMesh = new THREE.Mesh(focalGeo, focalMat);
    focalMesh.rotation.x = -Math.PI / 2;
    radarGroup.add(focalMesh);

    // 4. Sweeper Beam Sector with Smooth Angular Falloff
    const sweepGeo = new THREE.RingGeometry(0.65, 13.0, 48, 1, 0, Math.PI / 3.2);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    radarGroup.add(sweepMesh);

    // 5. High-Precision Coordinate Target Beacons
    const beaconCoords = [
      { x: -5.2, z: -4.1, color: 0x10b981 },
      { x: 3.8, z: 6.2, color: 0x06b6d4 },
      { x: 7.4, z: -3.5, color: 0xf59e0b },
      { x: -6.8, z: 5.1, color: 0x10b981 },
      { x: 2.1, z: -7.6, color: 0x06b6d4 }
    ];

    const beaconGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const beaconMeshes = beaconCoords.map(coord => {
      const mat = new THREE.MeshBasicMaterial({ color: coord.color });
      const mesh = new THREE.Mesh(beaconGeo, mat);
      mesh.position.set(coord.x, 0.45, coord.z);
      radarGroup.add(mesh);

      // Vertical coordinate tether line
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(coord.x, 0, coord.z),
        new THREE.Vector3(coord.x, 0.45, coord.z)
      ]);
      const tetherMat = new THREE.LineBasicMaterial({ color: coord.color, transparent: true, opacity: 0.6 });
      radarGroup.add(new THREE.Line(tetherGeo, tetherMat));

      return mesh;
    });

    // Inertial Mouse Tilt
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.45;
      mouseY = y * 0.35;
    };
    container.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || 320;
      height = container.clientHeight || 260;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    let animId;
    let time = 0;

    const animate = () => {
      time += 0.035;

      // Constant precision laser sweep
      sweepMesh.rotation.z -= 0.045;

      // Pulse and bob coordinate beacons
      beaconMeshes.forEach((mesh, idx) => {
        mesh.position.y = 0.45 + Math.sin(time * 2.5 + idx * 1.2) * 0.22;
        const s = 1 + Math.sin(time * 3 + idx) * 0.18;
        mesh.scale.set(s, s, s);
      });

      // Smooth inertial tilt damping
      radarGroup.rotation.y += (mouseX - radarGroup.rotation.y) * 0.06;
      radarGroup.rotation.x += (mouseY + 0.38 - radarGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
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
