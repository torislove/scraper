/**
 * shared/landing/SinglePageLanding.jsx
 * Single Primary Search Experience (/):
 *  - Hosts the Main OmniSearchBar + Live 11-Country CityZonesExplorer + Stacked 11-Country Flags
 *  - Submitting a search launches straight into the active /command Cockpit (with ?autoStart=1)
 *  - Keeps an optional 10-lead preview in Section 2 (#live-proof)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCountryByCode } from '../data/countries';
import { useCityZones } from '../cockpit/useCityZones';
import LandingHeroPreview from './LandingHeroPreview';
import LandingStorySections from './LandingStorySections';

export const PENDING_LAUNCH_KEY = 'lp_pending_launch';

export default function SinglePageLanding({
  apiBase = '/api',
  suggestFn,
  isMaster = false,
  customSearchBar = null,
  customZoneExplorer = undefined,
  onOpenClientWorkspace,
  onOpenMasterWorkspace,
  onOpenPortalLogin
}) {
  const navigate = useNavigate();
  const [country, setCountry] = useState('IN');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [liveStats, setLiveStats] = useState(null);
  const [freeTrialDays, setFreeTrialDays] = useState(7);
  const [previewState, setPreviewState] = useState({
    loading: false,
    error: '',
    query: '',
    city: '',
    country: 'IN',
    leads: []
  });

  const cityZones = useCityZones({ city, country, initialMode: 'smart' });

  useEffect(() => {
    let alive = true;
    axios
      .get(`${apiBase}/public/stats`, { timeout: 5000 })
      .then(({ data }) => {
        if (alive && data?.ok) {
          setLiveStats(data);
          if (typeof data.freeTrialDays === 'number') setFreeTrialDays(data.freeTrialDays);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [apiBase]);

  const runPreview = useCallback(
    async (qInput, cityInput, countryInput) => {
      const targetCountry = (countryInput || country || 'IN').toUpperCase();
      const meta = getCountryByCode(targetCountry);
      const qClean = String(qInput || query || meta.vocabulary[0]?.category || '').trim();
      const cClean = String(cityInput || city || meta.defaultCity || '').trim();

      setPreviewState({ loading: true, error: '', query: qClean, city: cClean, country: targetCountry, leads: [] });
      document.getElementById('live-proof')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      try {
        const { data } = await axios.get(`${apiBase}/public/preview`, {
          params: { q: qClean, city: cClean, country: targetCountry },
          timeout: 8000
        });
        if (data?.ok) {
          setPreviewState({
            loading: false,
            error: '',
            query: data.query || qClean,
            city: data.city || cClean,
            country: targetCountry,
            leads: Array.isArray(data.leads) ? data.leads : []
          });
        } else {
          setPreviewState((p) => ({ ...p, loading: false, error: data?.message || 'Preview unavailable right now.' }));
        }
      } catch (err) {
        const msg = err?.response?.data?.message || 'Live preview engine busy — search above to launch in Cockpit.';
        setPreviewState((p) => ({ ...p, loading: false, error: msg }));
      }
    },
    [apiBase, country, query, city]
  );

  const launchCockpitSearch = useCallback(
    ({ subcategories, selectedZones, qOverride, cityOverride, countryOverride, autoStart = true } = {}) => {
      const cc = (countryOverride || country || 'IN').toUpperCase();
      const meta = getCountryByCode(cc);
      const qFinal = String(qOverride ?? query ?? meta.vocabulary[0]?.category ?? '').trim();
      const cFinal = String(cityOverride ?? city ?? meta.defaultCity ?? '').trim();

      try {
        sessionStorage.setItem(
          PENDING_LAUNCH_KEY,
          JSON.stringify({
            query: qFinal,
            city: cFinal,
            country: cc,
            zoneMode: cityZones.zoneMode,
            subcategories: Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : undefined,
            selectedZones:
              Array.isArray(selectedZones) && selectedZones.length > 0
                ? selectedZones
                : cityZones.selectedZoneNames
                  ? cityZones.effectiveZones
                  : undefined
          })
        );
      } catch (_) {}

      const params = new URLSearchParams();
      params.set('country', cc);
      if (qFinal) params.set('q', qFinal);
      if (cFinal) params.set('city', cFinal);
      if (cityZones.zoneMode === 'all') params.set('zoneMode', 'all');
      if (autoStart && qFinal && cFinal) params.set('autoStart', '1');

      const path = `/command?${params.toString()}`;
      if (isMaster) onOpenMasterWorkspace?.(navigate, path);
      else onOpenClientWorkspace?.(navigate, path);
    },
    [country, query, city, cityZones, isMaster, navigate, onOpenClientWorkspace, onOpenMasterWorkspace]
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <LandingHeroPreview
        country={country}
        setCountry={setCountry}
        query={query}
        setQuery={setQuery}
        city={city}
        setCity={setCity}
        cityZones={cityZones}
        suggestFn={suggestFn}
        previewState={previewState}
        onRunPreview={runPreview}
        onSearchToCockpit={launchCockpitSearch}
        liveStats={liveStats}
        isMaster={isMaster}
        customSearchBar={typeof customSearchBar === 'function' ? customSearchBar({ query, setQuery, city, setCity, country, setCountry, launchCockpitSearch }) : customSearchBar}
        customZoneExplorer={typeof customZoneExplorer === 'function' ? customZoneExplorer({ query, setQuery, city, setCity, country, setCountry, launchCockpitSearch }) : customZoneExplorer}
      />

      <LandingStorySections
        country={country}
        setCountry={setCountry}
        onSelectExample={(cCode, cat, sampleCity) => {
          setCountry(cCode);
          setQuery(cat);
          setCity(sampleCity);
          runPreview(cat, sampleCity, cCode);
        }}
        onOpenClient={() => onOpenClientWorkspace?.(navigate, `/command?country=${country}`)}
        onOpenMaster={() => onOpenMasterWorkspace?.(navigate, `/command?country=${country}`)}
        onSignIn={(role) => onOpenPortalLogin?.(role, navigate, 'signin')}
        freeTrialDays={freeTrialDays}
      />
    </div>
  );
}
