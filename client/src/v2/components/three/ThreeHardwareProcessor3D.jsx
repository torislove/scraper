import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeHardwareProcessor3D — Ultra-Precision Silicon Edition
 * - 3D isometric silicon processor wafer with metallic circuit bus traces
 * - Dynamic 3D RAM memory banks lighting up according to simulated RAM Gb (8 to 64 GB)
 * - Animated kinetic light packets flowing across concurrency bus lines
 * - Real-time memory lane calculation and bus frequency telemetry
 */
export default function ThreeHardwareProcessor3D({ style = {}, simulatedRamGb = 16, parallelLanes = 8 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 16, 23);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const boardGroup = new THREE.Group();
    boardGroup.rotation.x = 0.55; // Symmetrical isometric tilt
    scene.add(boardGroup);

    // 1. Silicon Motherboard Substrate
    const boardGeo = new THREE.BoxGeometry(16.5, 0.45, 12.5);
    const boardMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.88
    });
    boardGroup.add(new THREE.Mesh(boardGeo, boardMat));

    // Substrate outer wireframe border
    const boardWireGeo = new THREE.EdgesGeometry(boardGeo);
    const boardWireMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.38 });
    boardGroup.add(new THREE.LineSegments(boardWireGeo, boardWireMat));

    // 2. Central CPU Silicon Die
    const cpuGeo = new THREE.BoxGeometry(5.4, 0.65, 5.4);
    const cpuMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const cpuMesh = new THREE.Mesh(cpuGeo, cpuMat);
    cpuMesh.position.set(0, 0.45, 0);
    boardGroup.add(cpuMesh);

    const cpuEdgesGeo = new THREE.EdgesGeometry(cpuGeo);
    const cpuEdgesMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    boardGroup.add(new THREE.LineSegments(cpuEdgesGeo, cpuEdgesMat));

    // 3. 16 Dynamic RAM Memory Banks
    const activeChipCount = Math.min(16, Math.max(2, Math.round(parallelLanes)));

    for (let i = 0; i < 16; i++) {
      const isLeft = i < 8;
      const slotIndex = i % 8;
      const x = isLeft ? -6.3 : 6.3;
      const z = -4.6 + slotIndex * 1.32;

      const isActive = i < activeChipCount;
      const ramGeo = new THREE.BoxGeometry(1.65, 0.85, 0.75);
      const ramMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0x10b981 : 0x334155,
        transparent: true,
        opacity: isActive ? 0.95 : 0.35
      });
      const ramMesh = new THREE.Mesh(ramGeo, ramMat);
      ramMesh.position.set(x, 0.55, z);
      boardGroup.add(ramMesh);

      // Bus line trace connecting CPU to RAM
      const traceGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(isLeft ? -2.7 : 2.7, 0.32, z * 0.42),
        new THREE.Vector3(x, 0.32, z)
      ]);
      const traceMat = new THREE.LineBasicMaterial({
        color: isActive ? 0x10b981 : 0x1e293b,
        transparent: true,
        opacity: isActive ? 0.75 : 0.2
      });
      boardGroup.add(new THREE.Line(traceGeo, traceMat));
    }

    // 4. Kinetic Data Packets (Glowing traveling particles)
    const packetGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const packets = Array.from({ length: 14 }, (_, idx) => {
      const p = new THREE.Mesh(packetGeo, packetMat);
      boardGroup.add(p);
      return {
        mesh: p,
        progress: (idx / 14),
        speed: 0.018 + Math.random() * 0.01,
        isLeft: idx % 2 === 0,
        zTarget: -4.6 + (idx % 8) * 1.32
      };
    });

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.38;
      mouseY = y * 0.28;
    };
    container.addEventListener('mousemove', onMouseMove, { passive: true });

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
      // Flow packets along concurrency bus
      packets.forEach(pkt => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1) pkt.progress = 0;

        const startX = pkt.isLeft ? -2.7 : 2.7;
        const targetX = pkt.isLeft ? -6.3 : 6.3;
        const currX = startX + (targetX - startX) * pkt.progress;
        const currZ = pkt.zTarget * pkt.progress;

        pkt.mesh.position.set(currX, 0.72, currZ);
      });

      // Inertial tilt
      boardGroup.rotation.y += (mouseX - boardGroup.rotation.y) * 0.05;
      boardGroup.rotation.x += (0.55 + mouseY - boardGroup.rotation.x) * 0.05;

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
  }, [simulatedRamGb, parallelLanes]);

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
