import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeSwarmCluster3D
 * Interactive 3D WebGL Neural Swarm Core
 * - Central pulsating icosahedron crystal core
 * - 22 orbiting satellite nodes in 3D space (representing 22 engines)
 * - Animated laser energy splines connecting core to engines
 * - Mouse drag & orbit interaction
 */
export default function ThreeSwarmCluster3D({ style = {}, onSelectEngine, selectedEngine = null }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 10, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const clusterGroup = new THREE.Group();
    scene.add(clusterGroup);

    // 1. Central Crystalline Engine Core
    const coreGeo = new THREE.IcosahedronGeometry(2.4, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    clusterGroup.add(coreMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.65
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    clusterGroup.add(innerMesh);

    // 2. 22 Orbiting Engine Nodes in 3D Spherical Coordinate Shells
    const nodeGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const engineNodes = [];
    const splineLines = [];

    const nodeColors = [0x10b981, 0x06b6d4, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0xec4899];

    for (let i = 0; i < 22; i++) {
      const phi = Math.acos(-1 + (2 * i) / 22);
      const theta = Math.sqrt(22 * Math.PI) * phi;
      const radius = 7.5 + (i % 3) * 1.5;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const color = nodeColors[i % nodeColors.length];
      const mat = new THREE.MeshBasicMaterial({ color });
      const node = new THREE.Mesh(nodeGeo, mat);
      node.position.set(x, y, z);
      node.userData = { id: i, baseRadius: radius, speed: 0.008 + (i % 4) * 0.004, phi, theta };
      clusterGroup.add(node);
      engineNodes.push(node);

      // Energy laser line from core to node
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28
      });
      const line = new THREE.Line(lineGeo, lineMat);
      clusterGroup.add(line);
      splineLines.push({ line, node });
    }

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.55;
      mouseY = y * 0.45;
    };
    container.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 280;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId;
    let time = 0;

    const animate = () => {
      time += 0.02;

      // Rotate core
      coreMesh.rotation.x += 0.01;
      coreMesh.rotation.y += 0.015;
      innerMesh.rotation.y -= 0.02;

      // Orbit 22 engine nodes
      engineNodes.forEach((node, idx) => {
        node.userData.theta += node.userData.speed;
        const r = node.userData.baseRadius;
        const x = r * Math.cos(node.userData.theta) * Math.sin(node.userData.phi);
        const y = r * Math.sin(node.userData.theta) * Math.sin(node.userData.phi) + Math.sin(time + idx) * 0.3;
        const z = r * Math.cos(node.userData.phi);
        node.position.set(x, y, z);

        // Update connection line
        const lineObj = splineLines[idx];
        if (lineObj) {
          const positions = lineObj.line.geometry.attributes.position.array;
          positions[3] = x;
          positions[4] = y;
          positions[5] = z;
          lineObj.line.geometry.attributes.position.needsUpdate = true;
        }
      });

      // Smooth mouse interaction
      clusterGroup.rotation.y += (mouseX - clusterGroup.rotation.y) * 0.05 + 0.003;
      clusterGroup.rotation.x += (mouseY + 0.15 - clusterGroup.rotation.x) * 0.05;

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
  }, [selectedEngine]);

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
