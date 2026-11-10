import React from 'react';
import { Layers } from 'lucide-react';
import { formatNumber, cx } from '../../ui';
import FilterBar from '../cards/FilterBar';
import { MapLegend } from '../cards/MetricCard';
import CommandMap from '../../CommandMap';

export default function MapViewTab({
  filters,
  updateFilter,
  vendors = [],
  filteredVendors = [],
  run,
  sessionFilter,
  mapZones = [],
  activeZone,
  scanning,
  mapCenter,
  mapZoom,
  estimate,
  setSelectedVendor
}) {
  const mapVendors = (run?.id || sessionFilter)
    ? filteredVendors.filter(v => v.sessionId === (run?.id || sessionFilter) || v.lastSessionId === (run?.id || sessionFilter))
    : filteredVendors.slice(0, 200);

  const scopeTitle = run?.category
    ? `${run.category} (${run.location || 'Current'})`
    : sessionFilter
      ? 'Selected Folder'
      : 'Current Search';

  return (
    <section className="v2-map-view">
      <div className="v2-map-view-head">
        <FilterBar
          filters={filters}
          onChange={updateFilter}
          total={vendors.length}
          shown={filteredVendors.length}
          compact
        />
        <MapLegend />
      </div>
      <div className="v2-map-view-body">
        <CommandMap
          vendors={mapVendors}
          zones={mapZones}
          activeZone={activeZone}
          scanning={scanning}
          center={mapCenter}
          zoom={mapZoom}
          height="100%"
          fitKey={run?.id || sessionFilter || 'map-tab'}
          scopeTitle={scopeTitle}
          onSelect={vendor => setSelectedVendor(vendor)}
          onSelectZone={name => updateFilter('query', name)}
        />
        <aside className="v2-map-side">
          <div className="v2-map-side-head">
            <span><Layers size={13} /> COVERAGE ZONES</span>
            <b>{estimate?.zones?.count || (mapZones || []).length}</b>
          </div>
          <div className="v2-zone-list">
            {(mapZones || []).map(zone => {
              const name = zone.zoneName || zone.name || 'Zone';
              const isActive = scanning && activeZone?.name === name;
              return (
                <div key={`${zone.index}-${name}`} className={cx(isActive && 'is-active')}>
                  <span>{String(zone.index || 0).padStart(2, '0')}</span>
                  <b>{name}</b>
                  <small>{isActive ? 'SCANNING' : zone.lat ? 'ANCHORED' : 'GEOCODE'}</small>
                </div>
              );
            })}
            {!mapZones.length && <p>No zone preview. Run an estimate first.</p>}
          </div>
          <div className="v2-map-side-foot">
            <div>
              <span>PLOTTED</span>
              <b>{formatNumber(filteredVendors.filter(vendor => Number.isFinite(Number(vendor.latitude))).length)}</b>
            </div>
            <div>
              <span>NO COORDS</span>
              <b>{formatNumber(filteredVendors.filter(vendor => !Number.isFinite(Number(vendor.latitude))).length)}</b>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
