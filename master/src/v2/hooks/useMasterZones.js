/**
 * master/src/v2/hooks/useMasterZones.js
 * Manages Master District/State resolution (HQ Wards -> Towns -> Mandals) separately from Client.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { resolveMasterTerritoryApi, getMasterGeoLabels } from '../apiMaster';
import { getMasterLabels } from '../data/masterLocations';

export function useMasterZones(location, country) {
  const [territory, setTerritory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState(() => getMasterLabels(country));
  const [selectedZoneNames, setSelectedZoneNames] = useState(null);

  useEffect(() => {
    let active = true;
    getMasterGeoLabels(country).then((lbls) => {
      if (active && lbls) setLabels(lbls);
    }).catch(() => {});
    return () => { active = false; };
  }, [country]);

  const resolveNow = useCallback(async (targetLoc, targetCountry) => {
    const clean = String(targetLoc || '').trim();
    if (!clean || clean.length < 3) {
      setTerritory(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await resolveMasterTerritoryApi(clean, targetCountry || 'IN');
      if (data && data.ok !== false) {
        setTerritory(data);
        setSelectedZoneNames(null);
        setError('');
      } else {
        setTerritory(null);
        setError(data?.error || 'Master Fleet accepts only District or State names.');
      }
    } catch (_) {
      setTerritory(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => resolveNow(location, country), 320);
    return () => clearTimeout(t);
  }, [location, country, resolveNow]);

  const effectiveZones = useMemo(() => territory?.zones || [], [territory]);

  const toggleZoneName = useCallback((name) => {
    setSelectedZoneNames((prev) => {
      const base = prev ? new Set(prev) : new Set(effectiveZones.map((z) => z.name));
      if (base.has(name)) base.delete(name);
      else base.add(name);
      return Array.from(base);
    });
  }, [effectiveZones]);

  const selectAllZones = useCallback(() => setSelectedZoneNames(null), []);
  const setZoneSubset = useCallback((names) => setSelectedZoneNames(Array.isArray(names) ? names : null), []);

  return {
    territory,
    loading,
    error,
    labels,
    effectiveZones,
    selectedZoneNames,
    toggleZoneName,
    selectAllZones,
    setZoneSubset,
    refreshTerritory: () => resolveNow(location, country)
  };
}
