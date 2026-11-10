import React, { useEffect, useRef, useState } from "react";
import { Crosshair, Radio, Shield, Zap, Compass, MapPin } from "lucide-react";

const TARGET_CITIES = [
  { id: "guntur", name: "Guntur", state: "Andhra Pradesh", coords: "16.3067° N, 80.4365° E", x: 0.52, y: 0.56, leads: 418, category: "Kalyana Mandapams", status: "Active Sweep" },
  { id: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh", coords: "16.5062° N, 80.6480° E", x: 0.59, y: 0.48, leads: 592, category: "Photographers & Venues", status: "Target Lock" },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", coords: "17.3850° N, 78.4867° E", x: 0.38, y: 0.36, leads: 1240, category: "Banquet Halls & Catering", status: "Active Sweep" },
  { id: "warangal", name: "Warangal", state: "Telangana", coords: "17.9784° N, 79.5941° E", x: 0.46, y: 0.28, leads: 284, category: "Convention Centers", status: "Queued" },
  { id: "vizag", name: "Visakhapatnam", state: "Andhra Pradesh", coords: "17.6868° N, 83.2185° E", x: 0.74, y: 0.38, leads: 630, category: "Beach Resorts & Mandaps", status: "Active Sweep" },
  { id: "tirupati", name: "Tirupati", state: "Andhra Pradesh", coords: "13.6288° N, 79.4192° E", x: 0.54, y: 0.78, leads: 345, category: "Choultries & Mandapams", status: "Target Lock" }
];

export default function RadarCanvas() {
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [activeCity, setActiveCity] = useState(TARGET_CITIES[0]);
  const [rangeKm, setRangeKm] = useState(25);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 24;

      ctx.clearRect(0, 0, width, height);

      // 1. Radar background circular gradients
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
      bgGrad.addColorStop(0, "rgba(10, 24, 28, 0.75)");
      bgGrad.addColorStop(0.7, "rgba(8, 16, 24, 0.85)");
      bgGrad.addColorStop(1, "rgba(6, 11, 18, 0.96)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Distance Rings
      const rings = [0.25, 0.5, 0.75, 1];
      rings.forEach((ratio, idx) => {
        const r = radius * ratio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === rings.length - 1 ? "rgba(102, 230, 189, 0.35)" : "rgba(102, 230, 189, 0.12)";
        ctx.lineWidth = idx === rings.length - 1 ? 1.5 : 1;
        ctx.stroke();

        // Distance text label
        ctx.fillStyle = "rgba(102, 230, 189, 0.45)";
        ctx.font = "9px 'Space Grotesk', monospace";
        const distKm = Math.round((rangeKm * ratio) * 10) / 10;
        ctx.fillText(`${distKm} km`, centerX + 6, centerY - r + 12);
      });

      // 3. Coordinate crosshairs & 45deg diagonals
      ctx.strokeStyle = "rgba(102, 230, 189, 0.08)";
      ctx.lineWidth = 1;

      // Axis lines
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();

      // Angle hashes on outer rim
      for (let a = 0; a < 360; a += 15) {
        const rad = (a * Math.PI) / 180;
        const tickLength = a % 45 === 0 ? 8 : 4;
        const x1 = centerX + Math.cos(rad) * (radius - tickLength);
        const y1 = centerY + Math.sin(rad) * (radius - tickLength);
        const x2 = centerX + Math.cos(rad) * radius;
        const y2 = centerY + Math.sin(rad) * radius;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = a % 45 === 0 ? "rgba(102, 230, 189, 0.4)" : "rgba(102, 230, 189, 0.15)";
        ctx.stroke();
      }

      // 4. Rotating Radar Sweep Beam (2D gradient wedge)
      angleRef.current = (angleRef.current + 0.018 * speed) % (Math.PI * 2);
      const currentAngle = angleRef.current;
      const sweepWedge = 0.55; // Angle width of beam trail

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle - sweepWedge, currentAngle);
      ctx.closePath();

      const beamGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      beamGrad.addColorStop(0, "rgba(102, 230, 189, 0.35)");
      beamGrad.addColorStop(1, "rgba(80, 220, 180, 0.0)");
      ctx.fillStyle = beamGrad;
      ctx.fill();

      // Leading sharp beam line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(currentAngle) * radius, centerY + Math.sin(currentAngle) * radius);
      ctx.strokeStyle = "rgba(140, 245, 205, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // 5. Draw City Target Nodes
      TARGET_CITIES.forEach((city) => {
        const nodeX = centerX + (city.x - 0.5) * 2 * (radius * 0.82);
        const nodeY = centerY + (city.y - 0.5) * 2 * (radius * 0.82);

        // Check if radar beam is passing over this node
        const nodeAngle = (Math.atan2(nodeY - centerY, nodeX - centerX) + Math.PI * 2) % (Math.PI * 2);
        const diff = Math.abs(currentAngle - nodeAngle);
        const isPinged = diff < 0.2 || diff > Math.PI * 2 - 0.2;
        const isSelected = activeCity.id === city.id;

        // Pulse ring
        if (isPinged || isSelected) {
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, isSelected ? 12 : 9, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? "rgba(102, 230, 189, 0.9)" : "rgba(126, 156, 255, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, isSelected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#66e6bd" : isPinged ? "#91a9ff" : "rgba(165, 184, 204, 0.7)";
        ctx.shadowColor = isSelected ? "#66e6bd" : "transparent";
        ctx.shadowBlur = isSelected ? 10 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        // City Label
        ctx.fillStyle = isSelected ? "#66e6bd" : "rgba(220, 230, 240, 0.8)";
        ctx.font = isSelected ? "bold 11px 'Space Grotesk', sans-serif" : "10px 'DM Sans', sans-serif";
        ctx.fillText(city.name, nodeX + 8, nodeY + 4);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [speed, activeCity, rangeKm]);

  return (
    <div className="radar-station-wrapper">
      <div className="radar-header">
        <div className="radar-status-pill">
          <span className="radar-pulse-dot" />
          <span>2D GEOSPATIAL RADAR · LIVE TERRITORY MESH</span>
        </div>
        <div className="radar-coords">
          <Crosshair size={13} className="text-mint" />
          <span>LOCK: {activeCity.coords}</span>
        </div>
      </div>

      <div className="radar-body">
        <div className="radar-canvas-container">
          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            className="radar-canvas"
          />
          <div className="radar-hud-overlay">
            <span className="hud-corner top-left" />
            <span className="hud-corner top-right" />
            <span className="hud-corner bottom-left" />
            <span className="hud-corner bottom-right" />
            <div className="radar-target-badge">
              <Radio size={14} className="radar-sweep-spin" />
              <span>RADIUS: {rangeKm} KM</span>
            </div>
          </div>
        </div>

        <div className="radar-telemetry-panel">
          <div className="telemetry-box">
            <div className="telemetry-label">CURRENT TARGET LOCK</div>
            <div className="telemetry-city">{activeCity.name}</div>
            <div className="telemetry-state">{activeCity.state} · {activeCity.coords}</div>
            <div className="telemetry-stats-row">
              <div className="t-stat">
                <span>EST. LEADS</span>
                <b>{activeCity.leads}+</b>
              </div>
              <div className="t-stat">
                <span>PRIMARY NICHE</span>
                <b>{activeCity.category}</b>
              </div>
              <div className="t-stat">
                <span>SWEEP STATUS</span>
                <span className="status-badge"><span className="live-dot" /> {activeCity.status}</span>
              </div>
            </div>
          </div>

          <div className="telemetry-city-selector">
            <div className="telemetry-label">SELECT TERRITORY TO SWEEP</div>
            <div className="city-buttons-grid">
              {TARGET_CITIES.map((c) => (
                <button
                  key={c.id}
                  className={`city-select-btn ${activeCity.id === c.id ? "active" : ""}`}
                  onClick={() => setActiveCity(c)}
                >
                  <MapPin size={12} />
                  <span>{c.name}</span>
                  <small>{c.leads}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="telemetry-controls-row">
            <div>
              <span className="ctrl-label">SWEEP RANGE:</span>
              <div className="range-pills">
                {[10, 25, 50].map((r) => (
                  <button
                    key={r}
                    className={`range-pill ${rangeKm === r ? "active" : ""}`}
                    onClick={() => setRangeKm(r)}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="ctrl-label">SPEED:</span>
              <div className="speed-pills">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    className={`range-pill ${speed === s ? "active" : ""}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="telemetry-footer-note">
            <Shield size={13} className="text-mint" />
            <span>Multi-source mesh: Google Places + JustDial + OSM + Web Crawler active.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

