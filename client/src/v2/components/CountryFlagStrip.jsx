import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Search, X, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { COUNTRIES, POPULAR_COUNTRIES, flagOf, findCountry } from '../data/countries';
import './countryStrip.css';

/**
 * Country flag bar for the dashboard.
 *
 * Every country the engine can search is here, with its flag and name. India is
 * pinned first as HOME. Selecting a flag shows, in plain words, how many free
 * sources are ready there and which ones are blocked — no technical terms.
 */
export default function CountryFlagStrip({ selected = 'IN', onSelect, onMeta }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coverage, setCoverage] = useState(null);
  const [adminTable, setAdminTable] = useState({});
  const [loading, setLoading] = useState(false);

  const current = findCountry(selected) || findCountry('IN');
  const flag = flagOf(current?.code || 'IN');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_URL}/sources?country=${encodeURIComponent(current?.code || 'IN')}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!alive || !data) return;
        setCoverage(data);
        if (onMeta) onMeta(data);
      })
      .catch(() => { if (alive) setCoverage(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [current?.code, onMeta]);

  // One request for the whole table when the picker opens. The 245 cards then
  // show each country's real hierarchy without 245 separate API calls.
  useEffect(() => {
    if (!open || Object.keys(adminTable).length) return;
    let alive = true;
    fetch(`${API_URL}/admin-divisions`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!alive || !data || !Array.isArray(data.countries)) return;
        const table = {};
        for (const row of data.countries) table[row.code] = row.adminPath;
        setAdminTable(table);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, adminTable]);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    const list = value
      ? COUNTRIES.filter(country =>
          country.name.toLowerCase().includes(value) || country.code.toLowerCase() === value)
      : COUNTRIES;
    // India always first, then the rest alphabetically.
    return [...list].sort((a, b) => {
      if (a.code === 'IN') return -1;
      if (b.code === 'IN') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [query]);

  const engines = coverage?.engines || [];
  const blocked = (coverage?.sources || []).filter(source => source.access === 'blocked');

  const choose = (country) => {
    setOpen(false);
    setQuery('');
    if (onSelect) onSelect(country.code, country);
  };

  return (
    <section className="country-strip" aria-label="Search country">
      <div className="country-strip-glow" aria-hidden="true" />

      <div className="country-strip-main">
        <span className="country-strip-kicker"><Globe2 size={13} /> SEARCH COUNTRY</span>
        <div className={`country-strip-current${current?.code === 'IN' ? ' is-home' : ''}`}>
          <span className="country-strip-flag" aria-hidden="true">{flag}</span>
          <div className="country-strip-name">
            <b>{current?.name || 'India'}</b>
            <small className="country-strip-status">
              {current?.code === 'IN' && <em className="country-home">HOME</em>}
              {loading
                ? 'Checking free sources…'
                : engines.length
                  ? `${engines.length} free sources ready${blocked.length ? ` · ${blocked.length} blocked by the site` : ''}`
                  : 'Free sources ready'}
            </small>
            <small className="country-strip-path">
              {loading ? 'Loading hierarchy…' : (coverage?.adminPath || '')}
            </small>
          </div>
        </div>
      </div>

      <div className="country-strip-pills">
        {POPULAR_COUNTRIES.map(country => (
          <button
            type="button"
            key={country.code}
            className={`country-pill${country.code === current?.code ? ' is-active' : ''}${country.code === 'IN' ? ' is-home' : ''}`}
            onClick={() => choose(country)}
            title={`Search in ${country.name}`}
          >
            <span className="country-pill-flag">{flagOf(country.code)}</span>
            <span className="country-pill-text">{country.name}</span>
            {country.code === current?.code && <Check size={11} className="country-pill-check" />}
          </button>
        ))}
        <button
          type="button"
          className={`country-pill country-pill-all${open ? ' is-active' : ''}`}
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
        >
          <Sparkles size={13} />
          <span className="country-pill-text">All {COUNTRIES.length} countries</span>
        </button>
      </div>

      {open && (
        <div className="country-picker">
          <div className="country-picker-head">
            <div className="country-picker-search">
              <Search size={14} />
              <input
                autoFocus
                type="search"
                value={query}
                placeholder="Type a country name — India, United States, Germany, Brazil…"
                onChange={event => setQuery(event.target.value)}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
            <span className="country-picker-note">
              <ShieldCheck size={12} /> No keys. No logins. {COUNTRIES.length} countries.
            </span>
            <button type="button" className="country-picker-close" onClick={() => setOpen(false)} aria-label="Close country list">
              <X size={14} />
            </button>
          </div>

          <div className="country-picker-grid">
            {!query.trim() && (
              <button
                type="button"
                className={`country-feature${current?.code === 'IN' ? ' is-active' : ''}`}
                onClick={() => choose(findCountry('IN'))}
              >
                <span className="country-feature-flag" aria-hidden="true">{flagOf('IN')}</span>
                <span className="country-feature-text">
                  <b>India <em className="country-card-home">HOME</em></b>
                  <small>Primary market · 9 engines · JustDial, WeddingBazaar, WeddingWire, Mandap plus the global stack</small>
                  <small className="country-feature-path">State → District → Mandal / Taluka / Tehsil</small>
                </span>
                <span className="country-feature-cta">Search India</span>
              </button>
            )}
            {results.map(country => (
              <button
                type="button"
                key={country.code}
                className={`country-card${country.code === current?.code ? ' is-active' : ''}${country.code === 'IN' ? ' is-home' : ''}`}
                onClick={() => choose(country)}
              >
                <span className="country-card-flag">{flagOf(country.code)}</span>
                <span className="country-card-text">
                  <b>{country.name}</b>
                  <small>{country.code}{country.phone ? ` · ${country.phone}` : ''}</small>
                  {adminTable[country.code] && (
                    <em className="country-card-path">{adminTable[country.code]}</em>
                  )}
                </span>
                {country.code === 'IN' && <em className="country-card-home">HOME</em>}
              </button>
            ))}
            {!results.length && (
              <p className="country-picker-empty">No country matches “{query}”.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
