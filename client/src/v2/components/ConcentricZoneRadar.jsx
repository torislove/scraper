import React, { useRef, useEffect } from 'react';
import { Radar, CheckCircle2, Clock, MapPin } from 'lucide-react';
import './concentricZoneRadar.css';

export default function ConcentricZoneRadar({
  zones = [],
  activeZone = '',
  completedCount = 0,
  totalCount = 0,
  eta = '',
  scanning = false
}) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const activeZoneName = typeof activeZone === 'string'
    ? activeZone
    : (activeZone?.name || activeZone?.zoneName || '');
  const cleanActive = norm(activeZoneName);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [cleanActive]);

  const safeTotal = Math.max(totalCount, zones.length, 1);
  const percent = Math.min(100, Math.round((completedCount / safeTotal) * 100));

  // If no detailed zone array passed, generate default concentric zones
  const displayZones = zones.length > 0 ? zones : [
    { name: activeZoneName || 'Zone 1: Central Commercial Hub', distanceKm: 0, priority: 30 },
    { name: 'Zone 2: Commercial Business District', distanceKm: 2.4, priority: 25 },
    { name: 'Zone 3: North Radial Sector', distanceKm: 4.8, priority: 20 },
    { name: 'Zone 4: East Radial Sector', distanceKm: 5.6, priority: 18 },
    { name: 'Zone 5: South Radial Sector', distanceKm: 6.2, priority: 16 },
    { name: 'Zone 6: West Radial Sector', distanceKm: 7.1, priority: 14 },
    { name: 'Zone 7: Outer Ring & Extended Territory', distanceKm: 9.5, priority: 10 }
  ];

  return (
    <section className="zone-radar-card" aria-label="Concentric Zone Sweep Status">
      <div className="zone-radar-head">
        <span className="zone-radar-title">
          <Radar size={14} className={scanning ? 'v2-spin' : ''} /> CONCENTRIC ZONE-BY-ZONE PROGRESS
        </span>
        <div className="zone-radar-summary">
          <span>ZONES: <b>{completedCount} / {safeTotal}</b></span>
          {eta && <span>ETA: <b>{eta}</b></span>}
          <span>STATUS: <b style={{ color: scanning ? '#66e6bd' : '#94a3b8' }}>{scanning ? 'SWEEPING' : 'READY'}</b></span>
        </div>
      </div>

      <div className="zone-radar-bar-bg">
        <div
          className="zone-radar-bar-fill"
          style={{ width: `${scanning && percent === 0 ? 12 : percent}%` }}
        />
      </div>

      <div className="zone-radar-list">
        {displayZones.map((z, idx) => {
          const zName = z.name || z.zoneName || `Zone ${idx + 1}`;
          const cleanZ = norm(zName);
          const isExplicitMatch = cleanActive && (cleanZ === cleanActive || cleanZ.includes(cleanActive) || cleanActive.includes(cleanZ));
          const isActive = scanning && (isExplicitMatch || (!cleanActive && idx === completedCount));
          const isComplete = idx < completedCount && !isActive;
          const dist = z.distanceKm != null ? `${z.distanceKm} km` : `${(idx * 1.8).toFixed(1)} km`;

          return (
            <div
              key={zName + idx}
              ref={isActive ? activeRef : null}
              className={`zone-chip ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
            >
              <div className="zone-chip-head">
                <span className="zone-chip-label">ZONE {idx + 1}</span>
                {isComplete ? (
                  <CheckCircle2 size={11} style={{ color: '#66e6bd' }} />
                ) : isActive ? (
                  <Radar size={11} style={{ color: '#38bdf8' }} className="v2-spin" />
                ) : (
                  <Clock size={11} style={{ color: '#64748b' }} />
                )}
              </div>
              <div className="zone-chip-name" title={zName}>
                {zName}
              </div>
              <div className="zone-chip-foot">
                <span>{dist}</span>
                <span className="zone-chip-leads">
                  {isComplete ? 'Done' : isActive ? 'Sweeping...' : 'Queued'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
