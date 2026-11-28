import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { resolveCityZones, getCountriesOverview } from '../utils/foldersGeoApi';

const clientCache = new Map();

function keyFor(city, country, mode) {
  return `${String(country || 'IN').toUpperCase()}:${String(city || '').toLowerCase().trim()}:${mode}`;
}

export function useCityZones({ city = '', country = 'IN', initialMode = 'smart' } = {}) {
  const [zoneMode, setZoneMode] = useState(initialMode);
  const [zoneData, setZoneData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedZoneNames, setSelectedZoneNames] = useState(null); // null = all active
  const [countriesOverview, setCountriesOverview] = useState({});
  const abortRef = useRef(null);

  useEffect(() => {
    let active = true;
    getCountriesOverview()
      .then((data) => { if (active && data) setCountriesOverview(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const refreshOverview = useCallback(() => {
    getCountriesOverview()
      .then((data) => { if (data) setCountriesOverview(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cleanCity = String(city || '').trim();
    if (cleanCity.length < 2) {
      setZoneData(null);
      setLoading(false);
      return;
    }

    const k = keyFor(cleanCity, country, zoneMode);
    if (clientCache.has(k)) {
      setZoneData(clientCache.get(k));
      setSelectedZoneNames(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await resolveCityZones(cleanCity, country, zoneMode, { signal: ctrl.signal });
        if (res?.ok) {
          clientCache.set(k, res);
          setZoneData(res);
          setSelectedZoneNames(null);
          refreshOverview();
        }
      } catch (_) {
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 240);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [city, country, zoneMode, refreshOverview]);

  const effectiveZones = useMemo(() => {
    const list = zoneData?.zones || [];
    if (!selectedZoneNames) return list;
    return list.filter((z) => selectedZoneNames.has(z.name));
  }, [zoneData, selectedZoneNames]);

  const toggleZoneName = useCallback((name) => {
    const list = zoneData?.zones || [];
    setSelectedZoneNames((prev) => {
      const next = prev ? new Set(prev) : new Set(list.map((z) => z.name));
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next.size === list.length ? null : next;
    });
  }, [zoneData]);

  const selectAllZones = useCallback(() => setSelectedZoneNames(null), []);
  const setZoneSubset = useCallback((names) => {
    const list = zoneData?.zones || [];
    if (!names || names.length === 0 || names.length >= list.length) {
      setSelectedZoneNames(null);
      return;
    }
    setSelectedZoneNames(new Set(names));
  }, [zoneData]);

  return {
    zoneMode,
    setZoneMode,
    zoneData,
    loading,
    effectiveZones,
    selectedZoneNames,
    toggleZoneName,
    selectAllZones,
    setZoneSubset,
    countriesOverview
  };
}
