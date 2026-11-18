import React from 'react';
import { Cpu, MapPin, Globe2, Crosshair, Building2, Search, CheckCircle2 } from 'lucide-react';
import './parallelEngines.css';

const ENGINES_SPEC = [
  {
    id: 'maps',
    name: 'Google Maps',
    icon: MapPin,
    color: '#38bdf8',
    role: 'Places & Geo'
  },
  {
    id: 'local_finder',
    name: 'Google Local Finder',
    icon: Crosshair,
    color: '#f59e0b',
    role: 'Local Pack'
  },
  {
    id: 'openstreetmap',
    name: 'OpenStreetMap',
    icon: Globe2,
    color: '#22c55e',
    role: 'OSM Directory'
  },
  {
    id: 'weddingwire',
    name: 'WeddingWire / Portals',
    icon: Building2,
    color: '#ec4899',
    role: 'Vendor Profiles'
  },
  {
    id: 'web_discovery',
    name: 'Web Discovery',
    icon: Search,
    color: '#a78bfa',
    role: 'Web & Direct Contact'
  }
];

export default function ParallelEnginesStatus({
  scanning = false,
  engineYields = {},
  activeEngines = ['maps', 'local_finder', 'openstreetmap', 'weddingwire', 'web_discovery'],
  totalHarvested = 0,
  elapsedSec = 0
}) {
  return (
    <section className="parallel-engines-card" aria-label="Parallel Engine Telemetry">
      <div className="parallel-engines-head">
        <span className="parallel-engines-title">
          <Cpu size={14} /> 5-ENGINE PARALLEL SCRAPING STATUS
        </span>
        <div className="parallel-engines-metrics">
          <span>HARVESTED: <b>{totalHarvested} leads</b></span>
          {scanning && <span>SPEED: <b>{elapsedSec > 0 ? (totalHarvested / elapsedSec).toFixed(1) : totalHarvested} leads/s</b></span>}
          <span>STATUS: <b style={{ color: scanning ? '#38bdf8' : '#66e6bd' }}>{scanning ? 'RUNNING' : 'READY'}</b></span>
        </div>
      </div>

      <div className="parallel-engines-grid">
        {ENGINES_SPEC.map(eng => {
          const isEnabled = activeEngines.includes(eng.id) || activeEngines.includes('auto') || activeEngines.length === 0;
          const count = engineYields[eng.id] || 0;
          const Icon = eng.icon;
          const isActive = scanning && isEnabled;
          const isDone = !scanning && count > 0;

          return (
            <div
              key={eng.id}
              className={`engine-item ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
            >
              <div className="engine-item-head">
                <span className="engine-item-name">
                  <Icon size={13} style={{ color: eng.color }} />
                  {eng.name}
                </span>
                <span className="engine-item-badge">
                  {isActive ? 'SCANNING' : isDone ? 'COMPLETED' : 'IDLE'}
                </span>
              </div>
              <div className="engine-item-meta">
                <span>{eng.role}</span>
                <span className="engine-yield-count">
                  {count > 0 ? `${count} leads` : (isActive ? '...' : '—')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
