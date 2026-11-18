import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Compass, Sparkles, Zap, ShieldCheck, ArrowRight,
  Phone, Mail, Building2, CheckCircle2, MapPin, Globe2
} from 'lucide-react';
import Country3DFlag from './Country3DFlag';

export const MONETIZATION_COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    lat: 20.5937,
    lng: 78.9629,
    isHome: true,
    badge: 'PRIMARY DOMESTIC MARKET',
    stat: '619,287 Villages & Mandals',
    yieldVal: '100% Street Lattices',
    cpm: 'High-Volume Telecom & WhatsApp Engine',
    mobiles: 'Direct Owner Mobiles & WhatsApp',
    emails: 'Verified Corporate & Business Inboxes',
    details: 'Full Street Address, Land-Locked GPS & Reviews',
    coverage: 'Indexed down to 619,287 Villages & Mandals with 100% street lattices. Sweeps all vendor leads, proprietor cell numbers, and business details with zero blind spots.'
  },
  {
    code: 'US',
    name: 'United States',
    lat: 37.0902,
    lng: -95.7129,
    badge: 'TIER-1 GLOBAL HUB',
    stat: '50 States & 3,143 Counties',
    yieldVal: 'Top Global Ticket Size',
    cpm: 'Commercial, High-Ticket Events & Contractors',
    mobiles: 'Direct Executive Mobiles & SMS',
    emails: 'Verified Decision-Maker Inboxes',
    details: 'Complete Physical Address, State Filings & GPS',
    coverage: 'Autonomous 50-State & 3,143-County sweep. Scrapes 100% of local contractor leads, commercial enterprises, cell numbers, emails, and verified coordinates.'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    lat: 55.3781,
    lng: -3.4360,
    badge: 'HIGH-CONVERSION TRADE',
    stat: 'London, Manchester & Midlands',
    yieldVal: 'High Local Conversion',
    cpm: 'Corporate Trade & Event Services',
    mobiles: 'Direct Proprietor Mobile Numbers',
    emails: 'Verified Director & Sales Emails',
    details: 'Postcode Centroid Clamping & Company House Data',
    coverage: 'Complete coverage of London, Midlands, Scotland, and Wales. Extracts all local service leads, verified director emails, mobile numbers, and business profiles.'
  },
  {
    code: 'CA',
    name: 'Canada',
    lat: 56.1304,
    lng: -106.3468,
    badge: 'B2B COMMERCIAL CORE',
    stat: 'Toronto, Vancouver & Calgary',
    yieldVal: 'B2B & Wedding Density',
    cpm: 'North American Growth Engine',
    mobiles: 'Direct Mobile & Toll-Free Numbers',
    emails: 'Verified Commercial Inboxes',
    details: 'Territorial Street Lattices & Verified Reviews',
    coverage: 'Provinces & territories indexed across Toronto, Vancouver, Montreal, and Calgary. Sweeps all trade leads, cell numbers, verified emails, and business data.'
  },
  {
    code: 'AU',
    name: 'Australia',
    lat: -25.2744,
    lng: 133.7751,
    badge: 'PACIFIC COMMERCIAL',
    stat: 'Sydney, Melbourne & Brisbane',
    yieldVal: 'Premium Services Margin',
    cpm: 'Pacific Trade & Commercial Network',
    mobiles: 'Direct Mobile & WhatsApp Numbers',
    emails: 'Verified Owner & Manager Inboxes',
    details: 'ABN Verification & Land-Locked Geocoding',
    coverage: 'Covers NSW, Victoria, Queensland, WA, and SA. Sweeps all commercial contractors, event venues, proprietor mobiles, and verified business contacts.'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    lat: 23.4241,
    lng: 53.8478,
    badge: 'ULTRA-LUXURY MARKET',
    stat: 'Dubai & Abu Dhabi Commercial',
    yieldVal: 'World Ultra-Luxury Margin',
    cpm: 'Highest Average Deal Value on Earth',
    mobiles: 'Verified WhatsApp & Mobile Lines',
    emails: 'Executive & Managing Partner Inboxes',
    details: 'Free Zone & Mainland Registry Coordinates',
    coverage: 'Dubai, Abu Dhabi, Sharjah & all Emirates. Scrapes high-value trade enterprises, executive mobile numbers, corporate emails, and commercial license records.'
  },
  {
    code: 'SG',
    name: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    badge: 'APAC FINANCIAL HUB',
    stat: 'Asia-Pacific Commercial Core',
    yieldVal: 'High-Density B2B Suppliers',
    cpm: 'Dense Multinational Supplier Yield',
    mobiles: 'Direct WhatsApp & Office Mobile Contacts',
    emails: 'Direct Corporate Decision-Maker Inboxes',
    details: 'Precise Postal Centroids & ACRA Entities',
    coverage: 'High-density commercial core. Extracts APAC decision-maker emails, verified direct WhatsApp/mobiles, and exact commercial business addresses.'
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    lat: -40.9006,
    lng: 174.8860,
    badge: 'REGIONAL CONTRACTORS',
    stat: 'Auckland & Wellington Venues',
    yieldVal: 'High Purchasing Power',
    cpm: 'Boutique Luxury & Regional Contractors',
    mobiles: 'Direct Mobile & WhatsApp Numbers',
    emails: 'Verified Local Business Inboxes',
    details: 'Regional Council Terrestrial Centroids',
    coverage: 'Auckland, Wellington, Christchurch & regional councils. Scrapes local trade contacts, mobile numbers, verified emails, and full business records.'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    lat: -30.5595,
    lng: 22.9375,
    badge: 'PAN-AFRICAN HQ',
    stat: 'Johannesburg & Cape Town',
    yieldVal: 'African B2B Trade Capital',
    cpm: 'Pan-African Commercial Headquarters',
    mobiles: 'Direct WhatsApp & Cellular Contacts',
    emails: 'Direct Commercial Business Inboxes',
    details: 'Provincial Clamping & Verified Listings',
    coverage: 'Johannesburg, Cape Town, Durban & provinces. Extracts verified proprietor WhatsApp mobiles, direct commercial emails, and business registry profiles.'
  },
  {
    code: 'IE',
    name: 'Ireland',
    lat: 53.1424,
    lng: -7.6921,
    badge: 'EUROPEAN TECH HUB',
    stat: 'Dublin Tech & Local Services',
    yieldVal: 'Dense Corporate Spending',
    cpm: 'European High-Income Market',
    mobiles: 'Direct Mobile & WhatsApp Lines',
    emails: 'Verified Director & Enterprise Emails',
    details: 'Eircode High-Precision GPS Clamping',
    coverage: 'Dublin tech corridor, Cork, Galway & all counties. Sweeps all enterprise and local service leads, verified director emails, and mobile phones.'
  },
  {
    code: 'MY',
    name: 'Malaysia',
    lat: 4.2105,
    lng: 101.9758,
    badge: 'ASEAN TRADE CORE',
    stat: 'Kuala Lumpur & Penang',
    yieldVal: 'High-Velocity Transactions',
    cpm: 'Rapidly Growing ASEAN Trade Core',
    mobiles: 'Verified WhatsApp & Mobile Contacts',
    emails: 'Direct Commercial Business Inboxes',
    details: 'State & Municipal Commercial Geocoding',
    coverage: 'Kuala Lumpur, Penang, Johor & federal territories. Scrapes SME & enterprise owner contacts, WhatsApp business numbers, and verified corporate emails.'
  }
];

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function RealGlobe3D({ onSelectCountry, selectedCountry = 'IN' }) {
  const containerRef = useRef(null);
  const [activeCountry, setActiveCountry] = useState(
    MONETIZATION_COUNTRIES.find(c => c.code === selectedCountry) || MONETIZATION_COUNTRIES[0]
  );
  const targetRotationRef = useRef({ y: -1.35, x: 0.22 });

  useEffect(() => {
    const matched = MONETIZATION_COUNTRIES.find(c => c.code === selectedCountry);
    if (matched) {
      setActiveCountry(matched);
      const phi = (90 - matched.lat) * (Math.PI / 180);
      const theta = (matched.lng + 180) * (Math.PI / 180);
      targetRotationRef.current = {
        y: -(theta - Math.PI / 2),
        x: (phi - Math.PI / 2) * 0.45
      };
    }
  }, [selectedCountry]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 840;
    const height = container.clientHeight || 520;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 245;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.replaceChildren(renderer.domElement);

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(120, 90, 160);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.9);
    dirLight2.position.set(-140, -60, -80);
    scene.add(dirLight2);

    // 3. Globe Geometry & Earth Texture
    const globeRadius = 78;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Tilt Earth slightly on its natural axis
    globeGroup.rotation.z = 0.12;
    globeGroup.rotation.y = -1.35;
    globeGroup.rotation.x = 0.22;

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      '/textures/earth-blue-marble.jpg',
      () => renderer.render(scene, camera)
    );
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 28,
      specular: new THREE.Color(0x38bdf8),
      bumpScale: 0.08
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // 4. Atmospheric Glowing Rim / Limb Halo
    const haloGeo = new THREE.SphereGeometry(globeRadius * 1.055, 48, 48);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.6);
          gl_FragColor = vec4(0.2, 0.72, 1.0, 1.0) * intensity * 0.75;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // 5. Subtle Coordinate Guides
    const gridMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08
    });
    for (let lat = -60; lat <= 60; lat += 30) {
      const ringRadius = globeRadius * Math.cos((lat * Math.PI) / 180) + 0.2;
      const ringY = globeRadius * Math.sin((lat * Math.PI) / 180);
      const ringGeo = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * ringRadius, ringY, Math.sin(theta) * ringRadius));
      }
      ringGeo.setFromPoints(pts);
      const ring = new THREE.Line(ringGeo, gridMat);
      globeGroup.add(ring);
    }

    // 6. India (Home Core) Luminous Emerald Beacon + Multi-Ring Pulsar
    const indiaData = MONETIZATION_COUNTRIES.find(c => c.isHome);
    const indiaPos = latLngToVector3(indiaData.lat, indiaData.lng, globeRadius);

    const indiaCoreGeo = new THREE.SphereGeometry(4.2, 24, 24);
    const indiaCoreMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const indiaCore = new THREE.Mesh(indiaCoreGeo, indiaCoreMat);
    indiaCore.position.copy(indiaPos);
    globeGroup.add(indiaCore);

    const ringGeo1 = new THREE.RingGeometry(5.2, 6.8, 32);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const pulseRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    pulseRing1.position.copy(indiaPos);
    pulseRing1.lookAt(new THREE.Vector3(0, 0, 0));
    globeGroup.add(pulseRing1);

    const ringGeo2 = new THREE.RingGeometry(8.0, 9.4, 32);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
    const pulseRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    pulseRing2.position.copy(indiaPos);
    pulseRing2.lookAt(new THREE.Vector3(0, 0, 0));
    globeGroup.add(pulseRing2);

    // 7. 10 Premier Global Revenue Destinations (Sapphire Beacons)
    MONETIZATION_COUNTRIES.filter(c => !c.isHome).forEach(c => {
      const pos = latLngToVector3(c.lat, c.lng, globeRadius);
      const mGeo = new THREE.SphereGeometry(3.0, 20, 20);
      const mMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
      const mesh = new THREE.Mesh(mGeo, mMat);
      mesh.position.copy(pos);
      globeGroup.add(mesh);

      const destRingGeo = new THREE.RingGeometry(3.8, 4.8, 24);
      const destRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const destRing = new THREE.Mesh(destRingGeo, destRingMat);
      destRing.position.copy(pos);
      destRing.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(destRing);
    });

    // 8. 3D Glowing Quadratic Bezier Flight/Data Arcs & Photons
    const pulseMeshes = [];

    MONETIZATION_COUNTRIES.filter(c => !c.isHome).forEach((dest, idx) => {
      const destPos = latLngToVector3(dest.lat, dest.lng, globeRadius);

      const distance = indiaPos.distanceTo(destPos);
      const elevation = Math.min(72, Math.max(26, distance * 0.42));
      const mid = indiaPos.clone().add(destPos).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(globeRadius + elevation);

      const curve = new THREE.QuadraticBezierCurve3(indiaPos, mid, destPos);

      const pts = curve.getPoints(50);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.42
      });
      const arcLine = new THREE.Line(arcGeo, arcMat);
      globeGroup.add(arcLine);

      const pGeo = new THREE.SphereGeometry(1.8, 12, 12);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      globeGroup.add(pMesh);
      pulseMeshes.push({ mesh: pMesh, curve, offset: (idx * 0.1) % 1 });
    });

    // 9. Interactive Drag with Momentum Damping
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      dragVelocity = { x: deltaX * 0.005, y: deltaY * 0.005 };
      globeGroup.rotation.y += dragVelocity.x;
      globeGroup.rotation.x += dragVelocity.y;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      dragVelocity = { x: deltaX * 0.005, y: deltaY * 0.005 };
      globeGroup.rotation.y += dragVelocity.x;
      globeGroup.rotation.x += dragVelocity.y;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { isDragging = false; };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 10. Animation Loop
    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Inertia & Auto-Spin when idle
      if (!isDragging) {
        dragVelocity.x *= 0.94;
        dragVelocity.y *= 0.94;
        globeGroup.rotation.y += dragVelocity.x;
        globeGroup.rotation.x += dragVelocity.y;

        if (Math.abs(dragVelocity.x) < 0.0001 && Math.abs(dragVelocity.y) < 0.0001) {
          globeGroup.rotation.y += 0.0016;
        }
      }

      // Smooth camera interpolation towards selected country
      if (targetRotationRef.current) {
        const diffY = targetRotationRef.current.y - globeGroup.rotation.y;
        const diffX = targetRotationRef.current.x - globeGroup.rotation.x;
        if (Math.abs(diffY) > 0.01 || Math.abs(diffX) > 0.01) {
          globeGroup.rotation.y += diffY * 0.06;
          globeGroup.rotation.x += diffX * 0.06;
        }
      }

      // Pulse India concentric rings
      const pulseScale1 = 1 + 0.22 * Math.sin(elapsedTime * 3.5);
      const pulseScale2 = 1 + 0.35 * Math.sin(elapsedTime * 3.5 + 1.2);
      pulseRing1.scale.set(pulseScale1, pulseScale1, pulseScale1);
      pulseRing2.scale.set(pulseScale2, pulseScale2, pulseScale2);

      // Animate flight photons along arcs
      pulseMeshes.forEach(item => {
        item.offset = (item.offset + 0.004) % 1;
        const pt = item.curve.getPoint(item.offset);
        item.mesh.position.copy(pt);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, []);

  const handlePillClick = (c) => {
    setActiveCountry(c);
    const phi = (90 - c.lat) * (Math.PI / 180);
    const theta = (c.lng + 180) * (Math.PI / 180);
    targetRotationRef.current = {
      y: -(theta - Math.PI / 2),
      x: (phi - Math.PI / 2) * 0.45
    };
    onSelectCountry?.(c.code, c);
  };

  return (
    <div className="real-globe-center-stage" aria-label="Interactive 3D Monetization Earth Globe">
      {/* 3D WebGL Canvas Viewport */}
      <div className="real-globe-viewport-center" ref={containerRef} />

      {/* Floating 3D Telemetry HUD Card Explaining India (Home) & The 10 Global Revenue Engines */}
      <div className="real-globe-hud-center">
        {/* HUD Top Bar */}
        <div className="real-globe-hud-head">
          <span className="globe-hud-pill">
            <span className="globe-hud-pulse" />
            LIVE TELEMETRY
          </span>
          <span className="globe-hud-core">
            <Sparkles size={12} className="globe-hud-sparkle" />
            11 MONETIZED GLOBAL MARKETS
          </span>
        </div>

        {/* Country Main Hero Badge (Properly Aligned & No Duplicate Labels) */}
        <div className="globe-hud-country-badge">
          <Country3DFlag code={activeCountry.code} size={40} isHome={activeCountry.isHome} />
          <div className="globe-hud-country-meta">
            <b>
              {activeCountry.name}
              {activeCountry.isHome ? (
                <span className="home-tag">HOME CORE</span>
              ) : (
                <span className="market-tag">{activeCountry.badge}</span>
              )}
            </b>
            <small>
              {activeCountry.isHome
                ? 'Primary domestic market · Indexed down to 619,287 villages and mandals with 100% street lattices'
                : `${activeCountry.stat} · ${activeCountry.badge}`}
            </small>
          </div>
        </div>

        {/* Lead Extraction Scope: Mobiles, Emails, Business Details & Complete Leads */}
        <div className="globe-hud-capabilities-grid">
          <div className="globe-cap-pill">
            <span className="globe-cap-icon is-emerald"><Phone size={14} /></span>
            <div className="globe-cap-text">
              <strong>All Mobile Numbers</strong>
              <span>{activeCountry.mobiles}</span>
            </div>
          </div>
          <div className="globe-cap-pill">
            <span className="globe-cap-icon is-blue"><Mail size={14} /></span>
            <div className="globe-cap-text">
              <strong>All Business Emails</strong>
              <span>{activeCountry.emails}</span>
            </div>
          </div>
          <div className="globe-cap-pill">
            <span className="globe-cap-icon is-indigo"><Building2 size={14} /></span>
            <div className="globe-cap-text">
              <strong>Full Business Details</strong>
              <span>{activeCountry.details}</span>
            </div>
          </div>
          <div className="globe-cap-pill">
            <span className="globe-cap-icon is-amber"><CheckCircle2 size={14} /></span>
            <div className="globe-cap-text">
              <strong>100% Leads Captured</strong>
              <span>Zero missed local vendors</span>
            </div>
          </div>
        </div>

        {/* Country Mission Coverage Statement */}
        <p className="globe-hud-desc">
          {activeCountry.coverage}
        </p>

        {/* Administrative Coverage Depth Chips */}
        <div className="globe-hud-meta-row">
          <span className="globe-hud-chip">
            <Compass size={12} /> {activeCountry.stat}
          </span>
          <span className="globe-hud-chip is-accent">
            <Zap size={12} /> {activeCountry.yieldVal}
          </span>
          <span className="globe-hud-chip is-success">
            <ShieldCheck size={12} /> 100% Land-Locked Terrestrial GPS
          </span>
        </div>

        {/* 11 Supported Global Markets 3D Highlight Selector */}
        <div className="real-globe-country-pills-bar">
          <div className="globe-pills-label-row">
            <span className="globe-pills-label">
              <Globe2 size={12} /> HIGHLIGHT 11 GLOBAL MARKETS:
            </span>
            <span className="globe-pills-hint">Click any market to rotate 3D Earth</span>
          </div>

          <div className="real-globe-country-pills" role="tablist" aria-label="Select Monetization Country">
            {MONETIZATION_COUNTRIES.map(c => (
              <button
                key={c.code}
                type="button"
                className={`globe-pill-btn ${activeCountry.code === c.code ? 'is-active' : ''} ${c.isHome ? 'is-home' : ''}`}
                onClick={() => handlePillClick(c)}
                role="tab"
                aria-selected={activeCountry.code === c.code}
                title={`Focus 3D Globe on ${c.name} (${c.code})`}
              >
                <Country3DFlag code={c.code} size={18} isHome={c.isHome} active={activeCountry.code === c.code} />
                <b className="globe-pill-code">{c.code}</b>
                <span className="globe-pill-name">{c.name}</span>
                {c.isHome && <span className="mini-home-dot" title="Home Market" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
