import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import Mascot from './Mascot';
import './mascot3d.css';

/**
 * Mascot3D — "Diggy", a real WebGL 3D character (three.js).
 *
 * The old version was CSS perspective + SVG. This one is a genuine 3D rig:
 * PBR ceramic shell, glass visor, emissive eyes, jetpack with animated
 * thruster cones, pickaxe and magnifier props, floating scan rings, sparks
 * and confetti. Every action is performed by the rig in 3D space:
 *
 *   idle · walk · fly · dig · dance · trip · tap · peek · scan ·
 *   celebrate · warning · sleep
 *
 * It never blocks the interface: the stage is pointer-events:none unless an
 * onClick is supplied, and the canvas pauses when off-screen or hidden.
 * If WebGL is unavailable it falls back to the original CSS mascot.
 */

const DAMP = (current, target, lambda, dt) => THREE.MathUtils.damp(current, target, lambda, dt);
const clamp01 = value => Math.min(1, Math.max(0, value));

const PALETTE = {
  ceramic: 0xf3f7fc,
  ceramicShade: 0xd8e4f2,
  graphite: 0x1b2433,
  graphiteSoft: 0x2b3647,
  cyan: 0x22d3ee,
  cyanDeep: 0x0284c7,
  gold: 0xffc247,
  warning: 0xff5a5f,
  glass: 0x071b2c
};

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
  gradient.addColorStop(0.45, 'rgba(34, 211, 238, 0.18)');
  gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(2, 10, 20, 0.55)');
  gradient.addColorStop(0.6, 'rgba(2, 10, 20, 0.18)');
  gradient.addColorStop(1, 'rgba(2, 10, 20, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

class DiggyEngine {
  constructor(host, options = {}) {
    this.host = host;
    this.options = options;
    this.mode = 'idle';
    this.modeTime = 0;
    this.userYaw = 0;
    this.pointer = { x: 0, y: 0 };
    this.blink = 1;
    this.nextBlink = 2 + Math.random() * 3;
    this.disposed = false;
    this.visible = true;
    this.lastFrame = 0;
    this.accumulator = 0;
    this.clock = new THREE.Clock();

    this._buildRenderer();
    this._buildScene();
    this._buildCharacter();
    this._bindEvents();
    if (typeof window !== 'undefined') {
      window.__diggyEngines = Array.isArray(window.__diggyEngines) ? window.__diggyEngines : [];
      window.__diggyEngines.push(this);
    }
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  _buildRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
    } catch (error) {
      this.options.onFallback?.(error);
      throw error;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.className = 'mascot-3d-canvas';
    this.host.appendChild(this.renderer.domElement);
  }

  _buildScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    this.camera.position.set(0, 1.32, 4.75);
    this.camera.lookAt(0, 1.16, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.9;
    pmrem.dispose();

    this.key = new THREE.DirectionalLight(0xffffff, 2.4);
    this.key.position.set(2.4, 4.2, 3.2);
    this.scene.add(this.key);

    this.rim = new THREE.DirectionalLight(PALETTE.cyan, 2.6);
    this.rim.position.set(-3.2, 2.4, -2.6);
    this.scene.add(this.rim);

    this.fill = new THREE.DirectionalLight(0x9fb8d8, 0.8);
    this.fill.position.set(-2, 1, 3);
    this.scene.add(this.fill);

    this.ambient = new THREE.HemisphereLight(0xdff3ff, 0x0b1220, 1.15);
    this.scene.add(this.ambient);

    this.yawGroup = new THREE.Group();
    this.scene.add(this.yawGroup);
  }

  _materials() {
    return {
      ceramic: new THREE.MeshPhysicalMaterial({
        color: PALETTE.ceramic,
        metalness: 0.18,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        sheen: 0.35,
        sheenColor: new THREE.Color(0x9ad9ff)
      }),
      ceramicShade: new THREE.MeshPhysicalMaterial({
        color: PALETTE.ceramicShade,
        metalness: 0.28,
        roughness: 0.32,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      }),
      graphite: new THREE.MeshStandardMaterial({
        color: PALETTE.graphite,
        metalness: 0.82,
        roughness: 0.28
      }),
      graphiteSoft: new THREE.MeshStandardMaterial({
        color: PALETTE.graphiteSoft,
        metalness: 0.65,
        roughness: 0.42
      }),
      accent: new THREE.MeshStandardMaterial({
        color: PALETTE.cyan,
        emissive: new THREE.Color(PALETTE.cyanDeep),
        emissiveIntensity: 1.35,
        metalness: 0.35,
        roughness: 0.26
      }),
      rubber: new THREE.MeshStandardMaterial({
        color: 0x0d1521,
        metalness: 0.2,
        roughness: 0.72
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: PALETTE.glass,
        metalness: 0.35,
        roughness: 0.05,
        transmission: 0.2,
        transparent: true,
        opacity: 0.94,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        emissive: new THREE.Color(0x04283c),
        emissiveIntensity: 0.6
      }),
      eye: new THREE.MeshStandardMaterial({
        color: 0xdcfeff,
        emissive: new THREE.Color(PALETTE.cyan),
        emissiveIntensity: 2.8,
        toneMapped: false
      }),
      gold: new THREE.MeshStandardMaterial({
        color: PALETTE.gold,
        metalness: 1,
        roughness: 0.22,
        emissive: new THREE.Color(0x7a4a00),
        emissiveIntensity: 0.35
      }),
      flame: new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }),
      flameWarm: new THREE.MeshBasicMaterial({
        color: 0xffc247,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    };
  }

  _add(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = null) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    if (scale) mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  _buildCharacter() {
    const M = this._materials();
    this.M = M;

    const root = new THREE.Group();
    this.yawGroup.add(root);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.9
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    root.add(shadow);

    const hoverRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.012, 10, 72),
      new THREE.MeshBasicMaterial({
        color: PALETTE.cyan,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    hoverRing.rotation.x = Math.PI / 2;
    hoverRing.position.y = 0.06;
    root.add(hoverRing);

    const hoverRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.008, 8, 64),
      hoverRing.material.clone()
    );
    hoverRing2.material.opacity = 0.32;
    hoverRing2.rotation.x = Math.PI / 2;
    hoverRing2.position.y = 0.1;
    root.add(hoverRing2);

    const scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.009, 8, 80),
      new THREE.MeshBasicMaterial({
        color: PALETTE.cyan,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    scanRing.rotation.x = Math.PI / 2;
    scanRing.position.y = 0.07;
    root.add(scanRing);

    const scanRing2 = scanRing.clone();
    scanRing2.material = scanRing.material.clone();
    root.add(scanRing2);

    const body = new THREE.Group();
    root.add(body);

    // Pelvis + torso -----------------------------------------------------
    this._add(body, new RoundedBoxGeometry(0.46, 0.24, 0.34, 4, 0.09), M.graphite, [0, 0.86, 0]);
    this._add(body, new RoundedBoxGeometry(0.7, 0.62, 0.44, 6, 0.2), M.ceramic, [0, 1.2, 0]);
    this._add(body, new RoundedBoxGeometry(0.52, 0.1, 0.38, 4, 0.04), M.graphiteSoft, [0, 0.9, 0.02]);

    const chestPlate = this._add(
      body,
      new RoundedBoxGeometry(0.42, 0.32, 0.08, 4, 0.07),
      M.graphite,
      [0, 1.24, 0.22]
    );
    chestPlate.rotation.x = -0.06;

    const core = this._add(
      body,
      new THREE.TorusGeometry(0.105, 0.024, 12, 40),
      M.accent,
      [0, 1.24, 0.28],
      [0, 0, 0]
    );
    this.core = core;
    this._add(body, new THREE.SphereGeometry(0.052, 20, 16), M.eye, [0, 1.24, 0.29]);

    this._add(body, new THREE.SphereGeometry(0.15, 20, 16), M.ceramic, [-0.42, 1.47, 0], [0, 0, 0], [1.05, 0.85, 1]);
    this._add(body, new THREE.SphereGeometry(0.15, 20, 16), M.ceramic, [0.42, 1.47, 0], [0, 0, 0], [1.05, 0.85, 1]);

    // Jetpack ------------------------------------------------------------
    const pack = this._add(body, new RoundedBoxGeometry(0.48, 0.5, 0.2, 5, 0.08), M.graphite, [0, 1.22, -0.29]);
    pack.rotation.x = 0.04;
    this._add(body, new RoundedBoxGeometry(0.12, 0.34, 0.06, 4, 0.03), M.accent, [0, 1.24, -0.4]);

    this.flames = [];
    for (const x of [-0.15, 0.15]) {
      this._add(body, new THREE.CylinderGeometry(0.055, 0.075, 0.14, 14), M.graphiteSoft, [x, 0.93, -0.31], [0.18, 0, 0]);
      const flame = this._add(
        body,
        new THREE.ConeGeometry(0.075, 0.42, 14, 1, true),
        M.flame,
        [x, 0.66, -0.35],
        [Math.PI, 0, 0]
      );
      flame.visible = false;
      const inner = this._add(
        body,
        new THREE.ConeGeometry(0.04, 0.28, 12, 1, true),
        M.flameWarm,
        [x, 0.68, -0.35],
        [Math.PI, 0, 0]
      );
      inner.visible = false;
      this.flames.push({ outer: flame, inner });
    }

    // Head ---------------------------------------------------------------
    const head = new THREE.Group();
    head.position.set(0, 1.76, 0);
    body.add(head);
    this.head = head;

    this._add(head, new THREE.SphereGeometry(0.35, 40, 32), M.ceramic, [0, 0.06, 0], [0, 0, 0], [1, 1.02, 0.96]);
    this._add(head, new THREE.SphereGeometry(0.355, 32, 24), M.glass, [0, 0.055, 0.075], [0, 0, 0], [1.01, 0.62, 0.78]);

    this._add(head, new RoundedBoxGeometry(0.46, 0.055, 0.05, 3, 0.02), M.accent, [0, 0.19, 0.29], [0.18, 0, 0]);

    const eyes = [];
    for (const x of [-0.105, 0.105]) {
      const eye = this._add(
        head,
        new THREE.SphereGeometry(0.058, 18, 14),
        M.eye,
        [x, 0.09, 0.305],
        [0, 0, 0],
        [1, 1.35, 0.55]
      );
      eyes.push(eye);
    }
    this.eyes = eyes;

    // Ear pods
    for (const x of [-0.35, 0.35]) {
      this._add(head, new THREE.CylinderGeometry(0.095, 0.095, 0.07, 20), M.graphite, [x, 0.05, 0], [0, 0, Math.PI / 2]);
      this._add(head, new THREE.CylinderGeometry(0.062, 0.062, 0.075, 20), M.accent, [x * 1.03, 0.05, 0], [0, 0, Math.PI / 2]);
    }

    // Antenna
    this._add(head, new THREE.CylinderGeometry(0.012, 0.016, 0.24, 8), M.graphiteSoft, [0, 0.44, -0.02], [0.12, 0, 0]);
    const tip = this._add(head, new THREE.SphereGeometry(0.038, 18, 14), M.eye, [0, 0.57, -0.035]);
    this.antennaTip = tip;

    // Arms ---------------------------------------------------------------
    const buildArm = side => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.44 * side, 1.47, 0);
      body.add(shoulder);
      this._add(shoulder, new THREE.SphereGeometry(0.105, 18, 14), M.graphiteSoft, [0, 0, 0]);
      this._add(shoulder, new THREE.CapsuleGeometry(0.072, 0.24, 6, 14), M.ceramic, [0, -0.19, 0]);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.34, 0);
      shoulder.add(elbow);
      this._add(elbow, new THREE.SphereGeometry(0.075, 16, 12), M.graphiteSoft, [0, 0, 0]);
      this._add(elbow, new THREE.CapsuleGeometry(0.062, 0.2, 6, 14), M.ceramic, [0, -0.15, 0]);
      const hand = new THREE.Group();
      hand.position.set(0, -0.29, 0);
      elbow.add(hand);
      this._add(hand, new THREE.SphereGeometry(0.082, 18, 14), M.graphite, [0, 0, 0], [0, 0, 0], [1, 0.92, 0.86]);
      this._add(hand, new RoundedBoxGeometry(0.09, 0.055, 0.07, 3, 0.02), M.accent, [0, -0.02, 0.05]);
      return { shoulder, elbow, hand };
    };
    this.leftArm = buildArm(-1);
    this.rightArm = buildArm(1);

    // Legs ---------------------------------------------------------------
    const buildLeg = side => {
      const hip = new THREE.Group();
      hip.position.set(0.165 * side, 0.82, 0);
      body.add(hip);
      this._add(hip, new THREE.SphereGeometry(0.1, 16, 12), M.graphiteSoft, [0, 0, 0]);
      this._add(hip, new THREE.CapsuleGeometry(0.088, 0.24, 6, 14), M.ceramic, [0, -0.18, 0]);
      const knee = new THREE.Group();
      knee.position.set(0, -0.35, 0);
      hip.add(knee);
      this._add(knee, new THREE.SphereGeometry(0.078, 16, 12), M.graphiteSoft, [0, 0, 0]);
      this._add(knee, new THREE.CapsuleGeometry(0.076, 0.2, 6, 14), M.ceramic, [0, -0.14, 0]);
      this._add(knee, new RoundedBoxGeometry(0.2, 0.12, 0.32, 4, 0.05), M.graphite, [0, -0.31, 0.06]);
      this._add(knee, new RoundedBoxGeometry(0.16, 0.03, 0.26, 3, 0.012), M.accent, [0, -0.37, 0.06]);
      return { hip, knee };
    };
    this.leftLeg = buildLeg(-1);
    this.rightLeg = buildLeg(1);

    // Pickaxe prop (right hand) -----------------------------------------
    const pickaxe = new THREE.Group();
    pickaxe.position.set(0, -0.02, 0.02);
    pickaxe.rotation.set(0.2, 0.25, -0.32);
    this.rightArm.hand.add(pickaxe);
    this._add(pickaxe, new THREE.CylinderGeometry(0.024, 0.028, 0.72, 10), M.graphiteSoft, [0, 0.26, 0]);
    const pickHead = new THREE.Group();
    pickHead.position.set(0, 0.63, 0);
    pickaxe.add(pickHead);
    this._add(pickHead, new RoundedBoxGeometry(0.46, 0.09, 0.09, 4, 0.035), M.gold, [0, 0, 0]);
    this._add(pickHead, new THREE.ConeGeometry(0.075, 0.2, 5), M.gold, [-0.3, 0, 0], [0, 0, Math.PI / 2]);
    this._add(pickHead, new THREE.ConeGeometry(0.075, 0.2, 5), M.gold, [0.3, 0, 0], [0, 0, -Math.PI / 2]);
    pickaxe.visible = false;
    pickaxe.scale.setScalar(0.001);
    this.pickaxe = pickaxe;

    // Magnifier prop (left hand) ----------------------------------------
    const magnifier = new THREE.Group();
    magnifier.position.set(0, -0.03, 0.05);
    this.leftArm.hand.add(magnifier);
    this._add(magnifier, new THREE.CylinderGeometry(0.024, 0.028, 0.3, 10), M.graphite, [0, -0.12, 0]);
    this._add(magnifier, new THREE.TorusGeometry(0.17, 0.028, 12, 40), M.gold, [0, 0.15, 0]);
    this._add(
      magnifier,
      new THREE.CircleGeometry(0.15, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.22,
        metalness: 0,
        roughness: 0.02,
        transmission: 0.6,
        side: THREE.DoubleSide
      }),
      [0, 0.15, 0]
    );
    magnifier.visible = false;
    magnifier.scale.setScalar(0.001);
    this.magnifier = magnifier;

    // Tap ripple: three rings expand in 3D toward the viewer when Diggy
    // knocks on the screen.
    this.knockRings = [];
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.012, 8, 48),
        new THREE.MeshBasicMaterial({
          color: PALETTE.cyan,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      );
      ring.position.set(0.32, 1.18, 0.6);
      root.add(ring);
      this.knockRings.push(ring);
    }

    // Ground impact shockwave for the pickaxe strike.
    this.impactRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.02, 10, 64),
      new THREE.MeshBasicMaterial({
        color: PALETTE.gold,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    this.impactRing.rotation.x = Math.PI / 2;
    this.impactRing.position.set(0.1, 0.03, 0.42);
    root.add(this.impactRing);

    // Particles ----------------------------------------------------------
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i += 1) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 0.8;
      sparkPos[i * 3 + 1] = Math.random() * 1.4;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: PALETTE.gold,
        size: 0.045,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    root.add(sparks);
    this.sparks = sparks;
    this.sparkCount = sparkCount;

    const confettiCount = 120;
    const confettiGeo = new THREE.BufferGeometry();
    const confettiPos = new Float32Array(confettiCount * 3);
    const confettiColor = new Float32Array(confettiCount * 3);
    const palette = [new THREE.Color(0x22d3ee), new THREE.Color(0xffc247), new THREE.Color(0xa78bfa), new THREE.Color(0x34d399), new THREE.Color(0xf472b6)];
    for (let i = 0; i < confettiCount; i += 1) {
      confettiPos[i * 3] = (Math.random() - 0.5) * 1.6;
      confettiPos[i * 3 + 1] = Math.random() * 2.4;
      confettiPos[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
      const color = palette[i % palette.length];
      confettiColor[i * 3] = color.r;
      confettiColor[i * 3 + 1] = color.g;
      confettiColor[i * 3 + 2] = color.b;
    }
    confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPos, 3));
    confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiColor, 3));
    const confetti = new THREE.Points(
      confettiGeo,
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    root.add(confetti);
    this.confetti = confetti;
    this.confettiCount = confettiCount;

    // Soft contact glow under the character
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: PALETTE.cyan,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55
      })
    );
    glow.scale.set(2.1, 2.1, 1);
    glow.position.y = 1.05;
    root.add(glow);
    this.glow = glow;

    this.rig = {
      root,
      body,
      head,
      shadow,
      hoverRing,
      hoverRing2,
      scanRing,
      scanRing2,
      glow
    };
  }

  _bindEvents() {
    this._onPointer = event => {
      const x = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const y = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      this.pointer.x = THREE.MathUtils.clamp(x, -1, 1);
      this.pointer.y = THREE.MathUtils.clamp(y, -1, 1);
    };
    this._onVisibility = () => {
      this.visible = !document.hidden;
    };
    window.addEventListener('pointermove', this._onPointer, { passive: true });
    document.addEventListener('visibilitychange', this._onVisibility);

    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.host);
    this._resize();

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersection = new IntersectionObserver(entries => {
        for (const entry of entries) this.visible = entry.isIntersecting && !document.hidden;
      }, { threshold: 0.01 });
      this.intersection.observe(this.host);
    }
  }

  _resize() {
    const width = this.host.clientWidth || 120;
    const height = this.host.clientHeight || 120;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    if (!mode || mode === this.mode) return;
    this.mode = mode;
    this.modeTime = 0;
  }

  setRotation(degrees) {
    this.userYaw = THREE.MathUtils.degToRad(Number(degrees) || 0);
  }

  _pointerAllowed() {
    return ['idle', 'peek', 'tap', 'walk', 'scan'].includes(this.mode);
  }

  _loop(now) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this._loop);
    if (!this.visible) return;

    const delta = Math.min(0.05, this.clock.getDelta());
    const idle = this.mode === 'idle' || this.mode === 'sleep';
    this.accumulator += delta * 1000;
    const minFrame = idle ? 32 : 14;
    if (this.accumulator < minFrame) return;
    const dt = Math.min(0.06, this.accumulator / 1000);
    this.accumulator = 0;

    this._animate(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _animate(dt) {
    const t = this.clock.elapsedTime;
    this.modeTime += dt;
    const rig = this.rig;
    const M = this.M;
    const pose = {
      rootX: 0,
      rootY: 0,
      rootZ: 0,
      rootRY: this.userYaw,
      bodyX: 0,
      bodyY: 0,
      bodyZ: 0,
      headX: 0,
      headY: 0,
      headZ: 0,
      lArmX: 0,
      lArmY: 0,
      lArmZ: -0.12,
      rArmX: 0,
      rArmY: 0,
      rArmZ: 0.12,
      lForeX: 0,
      rForeX: 0,
      lForeZ: 0,
      rForeZ: 0,
      lLegX: 0,
      lLegZ: -0.02,
      rLegX: 0,
      rLegZ: 0.02,
      lKneeX: 0,
      rKneeX: 0,
      flame: 0,
      ring: 0.25,
      pick: 0,
      pickRot: 0.2,
      mag: 0,
      spark: 0,
      confetti: 0,
      eye: 2.8,
      eyeColor: PALETTE.cyan,
      glow: 0.45
    };

    const pointer = this.pointer;
    const look = this._pointerAllowed();

    switch (this.mode) {
      case 'walk': {
        const swing = Math.sin(t * 7.4);
        pose.rootY = Math.abs(Math.sin(t * 7.4)) * 0.055;
        pose.bodyZ = swing * 0.04;
        pose.headZ = -swing * 0.03;
        pose.lLegX = swing * 0.62;
        pose.rLegX = -swing * 0.62;
        pose.lKneeX = Math.max(0, -swing) * 0.5;
        pose.rKneeX = Math.max(0, swing) * 0.5;
        pose.lArmX = -swing * 0.52;
        pose.rArmX = swing * 0.52;
        pose.lArmZ = -0.1;
        pose.rArmZ = 0.1;
        pose.ring = 0.45;
        break;
      }
      case 'fly': {
        pose.rootRY = this.userYaw + 0.58;
        pose.rootX = 0.52 + Math.sin(t * 2.1) * 0.045;
        pose.rootY = 0.2 + Math.sin(t * 2.4) * 0.035;
        pose.bodyY = 0.06;
        pose.lLegX = 0.58;
        pose.rLegX = 0.7;
        pose.lKneeX = 0.25;
        pose.rKneeX = 0.18;
        pose.lArmX = 0.95;
        pose.rArmX = 0.86;
        pose.lArmZ = -0.24;
        pose.rArmZ = 0.24;
        pose.lForeX = 0.22;
        pose.rForeX = 0.22;
        pose.headX = -0.28;
        pose.flame = 1.25;
        pose.ring = 1;
        pose.glow = 0.9;
        break;
      }
      case 'dig': {
        // Full pickaxe cycle: slow overhead wind-up, fast strike, recovery.
        const phase = (this.modeTime * 0.92) % 1;
        const raise = phase < 0.6
          ? Math.sin((phase / 0.6) * Math.PI * 0.5)
          : Math.max(0, 1 - (phase - 0.6) / 0.14);
        const impact = phase >= 0.6 && phase < 0.82
          ? Math.max(0, 1 - (phase - 0.6) / 0.22)
          : 0;
        pose.rootZ = -impact * 0.05;
        pose.rootX = 0.02 + impact * 0.05;
        pose.rootY = -impact * 0.035;
        pose.bodyX = 0.05 + raise * 0.16 - impact * 0.2;
        pose.headX = 0.16 + raise * 0.26 - impact * 0.24;
        pose.headZ = raise * 0.05;
        pose.rArmX = -0.35 - raise * 0.5;
        pose.rArmZ = 0.22 - raise * 2.35;
        pose.rForeX = 0.18 + raise * 0.28;
        pose.rForeZ = -raise * 0.18;
        pose.lArmX = -0.5 - raise * 0.25;
        pose.lArmZ = -0.4;
        pose.lForeX = -0.65;
        pose.lLegX = 0.2 - raise * 0.35;
        pose.rLegX = -0.18 + raise * 0.3;
        pose.pick = 1;
        pose.pickRot = 2.8 + raise * 0.15;
        pose.spark = impact;
        pose.ring = 0.8;
        pose.eye = 3.2;
        break;
      }
      case 'dance': {
        const beat = Math.sin(t * 5.2);
        const beat2 = Math.sin(t * 5.2 + Math.PI);
        pose.rootRY = this.userYaw + Math.sin(t * 2.6) * 0.5;
        pose.rootY = Math.abs(Math.sin(t * 5.2)) * 0.09;
        pose.rootZ = Math.cos(t * 5.2) * 0.06;
        pose.lArmX = -2.1 + beat * 0.35;
        pose.rArmX = -2.1 + beat2 * 0.35;
        pose.lArmZ = -0.55;
        pose.rArmZ = 0.55;
        pose.lForeX = -0.7;
        pose.rForeX = -0.7;
        pose.lLegX = beat * 0.28;
        pose.rLegX = beat2 * 0.28;
        pose.headZ = beat * 0.12;
        pose.headY = beat2 * 0.16;
        pose.ring = 1;
        pose.glow = 0.85;
        pose.confetti = 0.55;
        break;
      }
      case 'trip': {
        const p = clamp01(this.modeTime / 2.1);
        const fall = Math.sin(Math.min(1, p * 1.15) * Math.PI);
        pose.rootX = 1.05 * fall;
        pose.rootY = -0.04 * fall;
        pose.rootZ = 0.12 * fall;
        pose.lArmX = -1.4 * fall;
        pose.rArmX = -1.1 * fall;
        pose.lArmZ = -0.9 * fall;
        pose.rArmZ = 0.9 * fall;
        pose.lLegX = 0.45 * fall;
        pose.rLegX = -0.35 * fall;
        pose.headX = -0.2 * fall;
        pose.eye = 1.6;
        pose.ring = 0.3;
        break;
      }
      case 'tap': {
        const knock = Math.sin(t * 11);
        pose.rootX = 0.1;
        pose.bodyZ = 0.05;
        pose.headZ = 0.1;
        pose.headX = 0.08;
        pose.rArmX = -1.15 + knock * 0.3;
        pose.rArmZ = 0.28;
        pose.rForeX = -0.3;
        pose.lArmZ = -0.2;
        pose.ring = 0.5;
        pose.eye = 3.1;
        break;
      }
      case 'peek': {
        pose.rootY = -0.16;
        pose.bodyX = 0.16;
        pose.headZ = 0.3;
        pose.headY = 0.28;
        pose.headX = -0.12;
        pose.lArmZ = -0.5;
        pose.rArmZ = 0.16;
        pose.rArmX = -0.4;
        pose.lLegX = 0.3;
        pose.rLegX = -0.1;
        pose.ring = 0.35;
        pose.eye = 3.4;
        break;
      }
      case 'scan': {
        pose.rootX = 0.04;
        pose.lArmX = -1.15;
        pose.lArmZ = -0.45;
        pose.lForeX = -0.55;
        pose.rArmX = -0.5;
        pose.rArmZ = 0.32;
        pose.headY = Math.sin(t * 1.1) * 0.32;
        pose.headX = 0.1;
        pose.mag = 1;
        pose.ring = 1;
        pose.eye = 3.4;
        pose.glow = 0.8;
        break;
      }
      case 'celebrate': {
        const jump = Math.abs(Math.sin(t * 4.4));
        pose.rootY = jump * 0.24;
        pose.rootZ = Math.sin(t * 4.4) * 0.05;
        pose.lArmX = -2.5;
        pose.rArmX = -2.5;
        pose.lArmZ = -0.72;
        pose.rArmZ = 0.72;
        pose.lForeX = -0.5;
        pose.rForeX = -0.5;
        pose.headX = -0.22;
        pose.lLegX = jump * 0.3;
        pose.rLegX = -jump * 0.3;
        pose.confetti = 1;
        pose.ring = 1;
        pose.eye = 3.6;
        pose.eyeColor = PALETTE.gold;
        pose.glow = 1;
        break;
      }
      case 'warning': {
        pose.rootX = Math.sin(t * 30) * 0.02;
        pose.headY = Math.sin(t * 26) * 0.08;
        pose.lArmX = -0.9;
        pose.rArmX = -0.9;
        pose.lArmZ = -0.7;
        pose.rArmZ = 0.7;
        pose.eye = 3.4;
        pose.eyeColor = PALETTE.warning;
        pose.ring = 0.6;
        break;
      }
      case 'sleep': {
        pose.rootY = -0.05 + Math.sin(t * 1.1) * 0.02;
        pose.headX = 0.26;
        pose.headZ = 0.12;
        pose.lArmZ = -0.06;
        pose.rArmZ = 0.06;
        pose.eye = 0.35;
        pose.ring = 0.1;
        pose.glow = 0.25;
        break;
      }
      case 'idle':
      default: {
        pose.rootY = Math.sin(t * 2.2) * 0.025;
        pose.bodyY = Math.sin(t * 1.6) * 0.012;
        pose.headX = Math.sin(t * 1.15) * 0.03;
        pose.lArmX = Math.sin(t * 1.3) * 0.06;
        pose.rArmX = Math.sin(t * 1.34 + 1) * 0.06;
        pose.lLegX = 0;
        pose.rLegX = 0;
        pose.ring = 0.3;
        break;
      }
    }

    // Pointer tracking for the head (disabled while the mascot is busy).
    if (look) {
      pose.headY += pointer.x * 0.34;
      pose.headX += pointer.y * 0.16;
      pose.rootRY += pointer.x * 0.08;
    }

    const k = 16;
    rig.root.rotation.x = DAMP(rig.root.rotation.x, pose.rootX, k, dt);
    rig.root.rotation.y = DAMP(rig.root.rotation.y, pose.rootRY, 8, dt);
    rig.root.rotation.z = DAMP(rig.root.rotation.z, pose.rootZ, k, dt);
    rig.root.position.y = DAMP(rig.root.position.y, pose.rootY, k, dt);

    rig.body.rotation.x = DAMP(rig.body.rotation.x, pose.bodyX, k, dt);
    rig.body.rotation.z = DAMP(rig.body.rotation.z, pose.bodyZ, k, dt);
    rig.body.position.y = DAMP(rig.body.position.y, pose.bodyY, 10, dt);

    rig.head.rotation.x = DAMP(rig.head.rotation.x, pose.headX, 12, dt);
    rig.head.rotation.y = DAMP(rig.head.rotation.y, pose.headY, 10, dt);
    rig.head.rotation.z = DAMP(rig.head.rotation.z, pose.headZ, 12, dt);

    this.leftArm.shoulder.rotation.x = DAMP(this.leftArm.shoulder.rotation.x, pose.lArmX, k, dt);
    this.leftArm.shoulder.rotation.y = DAMP(this.leftArm.shoulder.rotation.y, pose.lArmY, k, dt);
    this.leftArm.shoulder.rotation.z = DAMP(this.leftArm.shoulder.rotation.z, pose.lArmZ, k, dt);
    this.rightArm.shoulder.rotation.x = DAMP(this.rightArm.shoulder.rotation.x, pose.rArmX, k, dt);
    this.rightArm.shoulder.rotation.y = DAMP(this.rightArm.shoulder.rotation.y, pose.rArmY, k, dt);
    this.rightArm.shoulder.rotation.z = DAMP(this.rightArm.shoulder.rotation.z, pose.rArmZ, k, dt);
    this.leftArm.elbow.rotation.x = DAMP(this.leftArm.elbow.rotation.x, pose.lForeX, k, dt);
    this.rightArm.elbow.rotation.x = DAMP(this.rightArm.elbow.rotation.x, pose.rForeX, k, dt);
    this.leftArm.elbow.rotation.z = DAMP(this.leftArm.elbow.rotation.z, pose.lForeZ, k, dt);
    this.rightArm.elbow.rotation.z = DAMP(this.rightArm.elbow.rotation.z, pose.rForeZ, k, dt);

    this.leftLeg.hip.rotation.x = DAMP(this.leftLeg.hip.rotation.x, pose.lLegX, k, dt);
    this.leftLeg.hip.rotation.z = DAMP(this.leftLeg.hip.rotation.z, pose.lLegZ, k, dt);
    this.rightLeg.hip.rotation.x = DAMP(this.rightLeg.hip.rotation.x, pose.rLegX, k, dt);
    this.rightLeg.hip.rotation.z = DAMP(this.rightLeg.hip.rotation.z, pose.rLegZ, k, dt);
    this.leftLeg.knee.rotation.x = DAMP(this.leftLeg.knee.rotation.x, pose.lKneeX, k, dt);
    this.rightLeg.knee.rotation.x = DAMP(this.rightLeg.knee.rotation.x, pose.rKneeX, k, dt);

    // Props --------------------------------------------------------------
    const pickScale = DAMP(this.pickaxe.scale.x, pose.pick > 0.02 ? 1 : 0.001, 12, dt);
    this.pickaxe.scale.setScalar(pickScale);
    this.pickaxe.visible = pickScale > 0.02;
    this.pickaxe.rotation.x = DAMP(this.pickaxe.rotation.x, pose.pickRot, 14, dt);
    this.pickaxe.rotation.z = DAMP(this.pickaxe.rotation.z, this.mode === 'dig' ? -0.18 : -0.32, 10, dt);

    const magScale = DAMP(this.magnifier.scale.x, pose.mag > 0.02 ? 1 : 0.001, 12, dt);
    this.magnifier.scale.setScalar(magScale);
    this.magnifier.visible = magScale > 0.02;

    // Jet flames ---------------------------------------------------------
    for (const flame of this.flames) {
      const level = pose.flame;
      const flicker = 0.82 + Math.sin(t * 38 + flame.outer.position.x * 10) * 0.18;
      flame.outer.visible = level > 0.02;
      flame.inner.visible = level > 0.02;
      flame.outer.scale.set(1, Math.max(0.001, level * flicker), 1);
      flame.inner.scale.set(1, Math.max(0.001, level * (0.6 + flicker * 0.3)), 1);
      flame.outer.material.opacity = 0.55 + level * 0.4;
    }

    // Hover / scan rings -------------------------------------------------
    const ringLevel = pose.ring;
    rig.hoverRing.material.opacity = DAMP(rig.hoverRing.material.opacity, ringLevel * 0.7, 6, dt);
    rig.hoverRing2.material.opacity = DAMP(rig.hoverRing2.material.opacity, ringLevel * 0.45, 6, dt);
    rig.hoverRing2.scale.setScalar(1 + Math.sin(t * 2.6) * 0.03);
    rig.hoverRing.rotation.z = t * 0.35;

    const scanning = this.mode === 'scan' || this.mode === 'celebrate';
    rig.scanRing.visible = scanning;
    rig.scanRing2.visible = scanning;
    if (scanning) {
      const phase = (t * 0.7) % 1;
      const phase2 = (phase + 0.5) % 1;
      rig.scanRing.scale.setScalar(0.6 + phase * 1.6);
      rig.scanRing.material.opacity = (1 - phase) * 0.55;
      rig.scanRing2.scale.setScalar(0.6 + phase2 * 1.6);
      rig.scanRing2.material.opacity = (1 - phase2) * 0.45;
    }

    // Ground impact shockwave -------------------------------------------
    const impactLevel = this.mode === 'dig' ? pose.spark : 0;
    this.impactRing.visible = impactLevel > 0.02;
    if (impactLevel > 0.02) {
      const wave = 1 - impactLevel;
      this.impactRing.scale.setScalar(0.6 + wave * 2.4);
      this.impactRing.material.opacity = impactLevel * 0.9;
    }

    // Screen knock ripples (tap) ---------------------------------------
    const knocking = this.mode === 'tap';
    this.knockRings.forEach((ring, index) => {
      ring.visible = knocking;
      if (!knocking) return;
      const phase = (t * 1.55 + index / this.knockRings.length) % 1;
      ring.scale.setScalar(0.35 + phase * 1.85);
      ring.material.opacity = (1 - phase) * 0.66;
      ring.position.z = 0.55 + phase * 0.16;
      ring.position.x = 0.3 + Math.sin(t * 11) * 0.015;
    });

    // Eyes: blink + colour ----------------------------------------------
    if (this.mode !== 'sleep') {
      if (t > this.nextBlink) {
        this.blink = 0;
        this.nextBlink = t + 2.2 + Math.random() * 3.4;
      }
      this.blink = Math.min(1, this.blink + dt * 7);
      const closing = this.blink < 0.55 ? this.blink / 0.55 : 1;
      const eyeScale = 0.08 + closing * 0.92;
      for (const eye of this.eyes) eye.scale.y = 1.35 * eyeScale;
    } else {
      for (const eye of this.eyes) eye.scale.y = 0.08;
    }

    M.eye.emissiveIntensity = DAMP(M.eye.emissiveIntensity, pose.eye, 8, dt);
    M.eye.emissive.lerp(new THREE.Color(pose.eyeColor), Math.min(1, dt * 8));
    M.eye.color.lerp(new THREE.Color(pose.eyeColor).lerp(new THREE.Color(0xffffff), 0.72), Math.min(1, dt * 8));
    M.accent.emissiveIntensity = DAMP(M.accent.emissiveIntensity, 1.2 + (pose.eye - 2.8) * 0.4, 8, dt);

    rig.glow.material.opacity = DAMP(rig.glow.material.opacity, pose.glow, 6, dt);

    // Shadow follows height ---------------------------------------------
    const height = Math.max(0, rig.root.position.y);
    const shadowScale = 1 - Math.min(0.45, height * 1.1);
    rig.shadow.scale.setScalar(shadowScale);
    rig.shadow.material.opacity = 0.85 * shadowScale;

    // Sparks -------------------------------------------------------------
    const sparkLevel = pose.spark;
    this.sparks.material.opacity = DAMP(this.sparks.material.opacity, sparkLevel * 0.9, 10, dt);
    if (sparkLevel > 0.02) {
      const positions = this.sparks.geometry.attributes.position.array;
      for (let i = 0; i < this.sparkCount; i += 1) {
        positions[i * 3 + 1] += dt * (1.2 + (i % 5) * 0.35);
        positions[i * 3] += Math.sin(t * 3 + i) * dt * 0.25;
        if (positions[i * 3 + 1] > 1.7) positions[i * 3 + 1] = 0.1;
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
      this.sparks.rotation.y = t * 0.4;
    }

    // Confetti -----------------------------------------------------------
    const confettiLevel = pose.confetti;
    this.confetti.material.opacity = DAMP(this.confetti.material.opacity, confettiLevel * 0.95, 8, dt);
    if (confettiLevel > 0.02) {
      const positions = this.confetti.geometry.attributes.position.array;
      for (let i = 0; i < this.confettiCount; i += 1) {
        positions[i * 3 + 1] -= dt * (0.35 + (i % 7) * 0.08);
        positions[i * 3] += Math.sin(t * 2 + i * 0.7) * dt * 0.35;
        if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 2.2;
      }
      this.confetti.geometry.attributes.position.needsUpdate = true;
    }

    // Camera parallax: subtle, never disorienting ------------------------
    this.camera.position.x = DAMP(this.camera.position.x, pointer.x * 0.14, 3, dt);
    this.camera.position.y = DAMP(this.camera.position.y, 1.32 - pointer.y * 0.06, 3, dt);
    this.camera.lookAt(0, 1.16, 0);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (typeof window !== 'undefined' && Array.isArray(window.__diggyEngines)) {
      window.__diggyEngines = window.__diggyEngines.filter(engine => engine !== this);
    }
    window.removeEventListener('pointermove', this._onPointer);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.resizeObserver?.disconnect();
    this.intersection?.disconnect();
    const disposeMaterial = material => {
      if (!material) return;
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose?.();
    };
    this.scene?.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
      else disposeMaterial(object.material);
    });
    this.envTexture?.dispose?.();
    this.renderer?.dispose?.();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default function Mascot3D({
  mode = 'idle',
  size = 120,
  className = '',
  bubbleText = null,
  onClick = null,
  rotationY = 0
}) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let engine = null;
    try {
      engine = new DiggyEngine(host, { onFallback: () => setFailed(true) });
      engineRef.current = engine;
    } catch (error) {
      setFailed(true);
    }
    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    engineRef.current?.setRotation(rotationY);
  }, [rotationY]);

  if (failed) {
    return (
      <Mascot
        mode={mode}
        size={size}
        className={className}
        bubbleText={bubbleText}
      />
    );
  }

  return (
    <div
      className={`mascot-3d-stage mode-${mode} ${onClick ? 'is-clickable' : ''} ${className}`}
      style={{ width: size, height: size, '--mascot-size': `${size}px` }}
      onClick={onClick || undefined}
      role="img"
      aria-label={`Diggy the 3D Lead Harvester (${mode})`}
    >
      {bubbleText ? (
        <div className="mascot-3d-bubble">
          <span className="bubble-text">{bubbleText}</span>
          <i className="bubble-tail" />
        </div>
      ) : null}
      <div ref={hostRef} className="mascot-3d-canvas-host" />
    </div>
  );
}
