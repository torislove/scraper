import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Country3DFlag from './Country3DFlag';

const LOCKED_COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'UK' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'UAE' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'DE', name: 'Germany' }
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
    fetch(`/api/sources?country=${encodeURIComponent(code)}`)
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
    <div className="lx-flag-bar" role="region" aria-label="Select country">
      <div className="lx-flag-scroll">
        {LOCKED_COUNTRIES.map(item => {
          const isActive = item.code === code;
          return (
            <button
              key={item.code}
              type="button"
              className={`lx-flag-pill${isActive ? ' is-active' : ''}`}
              onClick={() => onSelect?.(item.code)}
              aria-pressed={isActive}
            >
              <Country3DFlag code={item.code} size="xs" />
              <span>{item.name}</span>
              {isActive && <Check size={12} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
