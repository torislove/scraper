import React, { useEffect, useMemo } from 'react';
import { Globe2, Check } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { POPULAR_COUNTRIES, findCountry } from '../data/countries';
import Country3DFlag from './Country3DFlag';
import './countryStrip.css';

/**
 * Clean, zero-jargon 11-country market selector.
 * Locked strictly to the 11 supported revenue markets with India pinned as Home.
 */
const LOCKED_11_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

export default function CountryFlagStrip({ selected = 'IN', onSelect, onMeta }) {
  const markets = useMemo(() => {
    const list = POPULAR_COUNTRIES.filter(c => LOCKED_11_CODES.includes(c.code));
    return [...list].sort((a, b) => LOCKED_11_CODES.indexOf(a.code) - LOCKED_11_CODES.indexOf(b.code));
  }, []);

  const safeCode = LOCKED_11_CODES.includes(String(selected || 'IN').toUpperCase())
    ? String(selected).toUpperCase()
    : 'IN';
  const current = findCountry(safeCode) || findCountry('IN');

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/sources?country=${encodeURIComponent(current?.code || 'IN')}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (alive && data && onMeta) onMeta(data);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [current?.code, onMeta]);

  const choose = (country) => {
    if (onSelect) onSelect(country.code, country);
  };

  return (
    <section className="country-strip" aria-label="Choose market">
      <div className="country-strip-main">
        <span className="country-strip-kicker"><Globe2 size={13} /> 11 MARKETS</span>
        <div className={`country-strip-current${current?.code === 'IN' ? ' is-home' : ''}`}>
          <Country3DFlag code={current?.code || 'IN'} size={34} isHome={current?.code === 'IN'} />
          <div className="country-strip-name">
            <b>{current?.name || 'India'}</b>
            <small className="country-strip-status">
              {current?.code === 'IN' && <em className="country-home">HOME</em>}
              {current?.code === 'IN' ? 'Cities, towns & villages ready' : 'Cities, states & counties ready'}
            </small>
          </div>
        </div>
      </div>

      <div className="country-strip-pills">
        {markets.map(country => (
          <button
            type="button"
            key={country.code}
            className={`country-pill${country.code === current?.code ? ' is-active' : ''}${country.code === 'IN' ? ' is-home' : ''}`}
            onClick={() => choose(country)}
            title={`Find leads in ${country.name}`}
          >
            <Country3DFlag code={country.code} size={18} active={country.code === current?.code} isHome={country.code === 'IN'} />
            <span className="country-pill-text">{country.name}</span>
            {country.code === current?.code && <Check size={11} className="country-pill-check" />}
          </button>
        ))}
      </div>
    </section>
  );
}
