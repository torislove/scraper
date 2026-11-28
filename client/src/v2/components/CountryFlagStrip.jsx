import React, { useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import Country3DFlag from './Country3DFlag';
import { API_URL } from '../../apiConfig';

const LOCKED_COUNTRIES = [
  { code: 'IN', name: 'India', home: true },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'UAE' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }
];

export default function CountryFlagStrip({ selected = 'IN', onSelect, onMeta }) {
  const [metaCache, setMetaCache] = useState({});
  const code = LOCKED_COUNTRIES.some(c => c.code === String(selected || '').toUpperCase())
    ? String(selected).toUpperCase()
    : 'IN';

  useEffect(() => {
    let alive = true;
    if (metaCache[code]) {
      onMeta?.(metaCache[code]);
      return undefined;
    }
    fetch(`${API_URL}/sources?country=${encodeURIComponent(code)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!alive || !data) return;
        setMetaCache(prev => ({ ...prev, [code]: data }));
        onMeta?.(data);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [code]);

  return (
    <div className="lx-flag-bar" role="region" aria-label="12 Supported Markets">
      <div className="lx-flag-dock-label" title="Strictly tuned across 12 sovereign markets">
        <span className="lx-flag-power-led" aria-hidden="true" />
        <Globe2 size={12} />
        <span>12 MARKETS</span>
      </div>

      <div className="lx-flag-scroll">
        {LOCKED_COUNTRIES.map(item => {
          const isActive = item.code === code;
          return (
            <button
              key={item.code}
              type="button"
              className={`lx-flag-pill${isActive ? ' is-active' : ''}${item.home ? ' is-home' : ''}`}
              onClick={() => onSelect?.(item.code)}
              aria-pressed={isActive}
              title={`Search businesses in ${item.name}`}
            >
              <Country3DFlag
                code={item.code}
                size={19}
                active={isActive}
                isHome={Boolean(item.home)}
              />
              <span className="lx-flag-name">{item.name}</span>
              {item.home && <span className="lx-flag-home-tag">HOME</span>}
              {isActive && <span className="lx-flag-led" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
