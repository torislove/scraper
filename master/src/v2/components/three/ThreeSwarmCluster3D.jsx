import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeSwarmCluster3D — Ultra-Precision Edition
 * - Mathematical Fibonacci Golden-Spiral distribution for 22 satellite nodes
 * - Precision crystalline neural core with double-shell geometry
 * - Traveling kinetic spark packets flowing along energy splines
 * - Mouse drag & tilt with spring damping
 */
export default function ThreeSwarmCluster3D({ style = {}, onSelectEngine, selectedEngine = null }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
    camera.position.set(0, 10, 23);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const clusterGroup = new THREE.Group();
    scene.add(clusterGroup);

    // 1. Dual-Shell Precision Crystalline Core
    const outerCoreGeo = new THREE.IcosahedronGeometry(2.5, 0);
    const outerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const outerCore = new THREE.Mesh(outerCoreGeo, outerCoreMat);
    clusterGroup.add(outerCore);

    const innerCoreGeo = new THREE.OctahedronGeometry(1.6, 0);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    clusterGroup.add(innerCore);

    // Glowing core nucleus
    const nucleusGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const nucleusMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
    clusterGroup.add(new THREE.Mesh(nucleusGeo, nucleusMat));

    // 2. 22 Satellite Nodes positioned via Golden Ratio Fibonacci Sphere
    const nodeCount = 22;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const nodeGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const engineNodes = [];
    const splineConnections = [];

    const categoryColors = [0x10b981, 0x06b6d4, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0xec4899];

    for (let i = 0; i < nodeCount; i++) {
      // Golden Spiral Spherical coordinates
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / nodeCount);
      const radius = 7.8 + (i % 3) * 1.2;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const color = categoryColors[i % categoryColors.length];
      const mat = new THREE.MeshBasicMaterial({ color });
      const node = new THREE.Mesh(nodeGeo, mat);
      node.position.set(x, y, z);
      node.userData = { id: i, radius, theta, phi, baseSpeed: 0.006 + (i % 4) * 0.003 };
      clusterGroup.add(node);
      engineNodes.push(node);

      // Laser energy connection line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(lineGeo, lineMat);
      clusterGroup.add(line);
      splineConnections.push({ line, node });
    }

    // 3. Traveling Energy Spark Packets
    const sparkGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const sparks = engineNodes.map((node, idx) => {
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      clusterGroup.add(spark);
      return { mesh: spark, nodeIndex: idx, progress: (idx / nodeCount) };
    });

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.5;
      mouseY = y * 0.4;
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
    let time = 0;

    const animate = () => {
      time += 0.02;

      // Rotate dual core in opposite directions
      outerCore.rotation.x += 0.008;
      outerCore.rotation.y += 0.012;
      innerCore.rotation.x -= 0.012;
      innerCore.rotation.y -= 0.015;

      // Orbit 22 satellite nodes
      engineNodes.forEach((node, idx) => {
        node.userData.theta += node.userData.baseSpeed;
        const r = node.userData.radius;
        const x = r * Math.cos(node.userData.theta) * Math.sin(node.userData.phi);
        const y = r * Math.sin(node.userData.theta) * Math.sin(node.userData.phi) + Math.sin(time + idx) * 0.25;
        const z = r * Math.cos(node.userData.phi);
        node.position.set(x, y, z);

        // Update energy line
        const conn = splineConnections[idx];
        if (conn) {
          const pos = conn.line.geometry.attributes.position.array;
          pos[3] = x;
          pos[4] = y;
          pos[5] = z;
          conn.line.geometry.attributes.position.needsUpdate = true;
        }
      });

      // Update traveling spark packets
      sparks.forEach(spark => {
        spark.progress += 0.018;
        if (spark.progress > 1) spark.progress = 0;
        const targetNode = engineNodes[spark.nodeIndex];
        spark.mesh.position.set(
          targetNode.position.x * spark.progress,
          targetNode.position.y * spark.progress,
          targetNode.position.z * spark.progress
        );
      });

      // Inertial group tilt
      clusterGroup.rotation.y += (mouseX - clusterGroup.rotation.y) * 0.05 + 0.002;
      clusterGroup.rotation.x += (mouseY + 0.15 - clusterGroup.rotation.x) * 0.05;

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
