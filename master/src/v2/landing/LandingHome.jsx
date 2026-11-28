/**
 * master/src/v2/landing/LandingHome.jsx
 * Standalone Master Fleet Landing Page using District & State Search Bar
 * and District/State presets across 11 Sovereign Countries.
 */

import React from 'react';
import SinglePageLanding from '@shared/landing/SinglePageLanding';
import { apiBase, suggestSearch } from '../api';
import { useExtension } from '../context/ExtensionContext';
import MasterOmniSearchBar from '../components/MasterOmniSearchBar';
import { getMasterExamplesForCountry } from '../data/searchExamples';
import {
  isMasterRuntime,
  openClientWorkspace,
  openMasterWorkspace,
  openPortalLogin
} from '../utils/editionSwitch';

export default function LandingHome() {
  const { ensureConnected } = useExtension() || {};
  const masterActive = isMasterRuntime();

  return (
    <SinglePageLanding
      apiBase={apiBase || '/api'}
      suggestFn={suggestSearch}
      isMaster={masterActive}
      customSearchBar={masterActive ? ({ query, setQuery, city, setCity, country, setCountry, launchCockpitSearch }) => (
        <MasterOmniSearchBar
          query={query}
          setQuery={setQuery}
          city={city}
          setCity={setCity}
          country={country}
          setCountry={setCountry}
          scanning={false}
          onStart={(subs, meta) => launchCockpitSearch({ subcategories: subs, qOverride: meta?.query, cityOverride: meta?.city, countryOverride: meta?.country })}
          ctaLabel="Sweep Territory in Cockpit"
        />
      ) : null}
      customZoneExplorer={masterActive ? ({ setQuery, setCity, country }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', margin: '10px 0 6px' }}>
          {getMasterExamplesForCountry(country).map((ex) => {
            const [cPart, lPart] = ex.split(/\s+(?:in|à|en)\s+/i);
            return (
              <button
                key={ex}
                type="button"
                onClick={() => { if (cPart) setQuery(cPart); if (lPart) setCity(lPart); }}
                style={{ padding: '4px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: 'rgba(255,255,255,0.9)', color: '#78350f', border: '1px solid rgba(217,119,6,0.28)', cursor: 'pointer' }}
              >
                {ex}
              </button>
            );
          })}
        </div>
      ) : undefined}
      onOpenClientWorkspace={(nav, path) => openClientWorkspace(nav, path, ensureConnected)}
      onOpenMasterWorkspace={(nav, path) => openMasterWorkspace(nav, path)}
      onOpenPortalLogin={(role, nav, mode) => openPortalLogin(role, nav, mode)}
    />
  );
}
