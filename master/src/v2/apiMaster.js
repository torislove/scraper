/**
 * master/src/v2/apiMaster.js
 * Isolated API client for Master Fleet (/api/master/geo/* & /api/master/scrape/*)
 * with graceful client-side fallback if running against a pre-restart backend.
 */

import axios from 'axios';
import { API_URL, DIRECT_BACKEND_URL } from '../apiConfig';
import { getToken } from './auth';
import {
  getMasterLabels,
  localSuggestMasterLocations,
  localValidateMasterLocation
} from './data/masterLocations';

const masterHttp = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json', 'x-workspace-scope': 'master', 'x-user-id': 'master' }
});

masterHttp.interceptors.request.use((config) => {
  try {
    const key = window.localStorage.getItem('scraper_master_key');
    if (key) config.headers['x-master-key'] = key;
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

async function callMaster(fn, directFn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.response?.status === 404 && typeof directFn === 'function') {
      return directFn();
    }
    throw err;
  }
}

export async function getMasterGeoLabels(country = 'IN') {
  return callMaster(
    async () => {
      const { data } = await masterHttp.get('/master/geo/labels', { params: { country } });
      return data?.labels || getMasterLabels(country);
    },
    () => getMasterLabels(country)
  );
}

export async function suggestMasterLocationsApi(q = '', country = 'IN', limit = 12) {
  return callMaster(
    async () => {
      const { data } = await masterHttp.get('/master/geo/suggest', { params: { q, country, limit } });
      return Array.isArray(data?.suggestions) ? data.suggestions : localSuggestMasterLocations(q, country, limit);
    },
    () => localSuggestMasterLocations(q, country, limit)
  );
}

export async function validateMasterLocationApi(location, country = 'IN') {
  try {
    const { data } = await masterHttp.get('/master/geo/validate', { params: { location, country } });
    return data;
  } catch (err) {
    if (err?.response?.status === 400 && err?.response?.data) return err.response.data;
    return localValidateMasterLocation(location, country);
  }
}

export async function resolveMasterTerritoryApi(location, country = 'IN', maxDistricts = 12) {
  try {
    const { data } = await masterHttp.get('/master/geo/resolve', { params: { location, country, maxDistricts } });
    return data;
  } catch (err) {
    if (err?.response?.status === 400 && err?.response?.data) return err.response.data;
    const val = localValidateMasterLocation(location, country);
    if (!val.ok) return val;
    return {
      ok: true,
      country,
      scope: val.scope || 'district',
      locationName: val.canonicalName || location,
      labels: getMasterLabels(country),
      counts: { districts: 1, hqWards: 1, towns: 0, mandals: 0, total: 1 },
      districts: [{ districtName: val.canonicalName || location, hqCity: location, counts: { hqWards: 1, towns: 0, mandals: 0, total: 1 }, zones: [] }],
      zones: []
    };
  }
}

export async function startMasterSweepApi(payload = {}) {
  try {
    const { data } = await masterHttp.post('/master/scrape/start', payload);
    return data;
  } catch (err) {
    if (err?.response?.status === 400) {
      const msg = err?.response?.data?.error || 'Master Fleet accepts only District or State searches.';
      const e = new Error(msg);
      e.suggestions = err?.response?.data?.suggestions || [];
      throw e;
    }
    throw err;
  }
}

export async function stopMasterSweepApi(sessionId = '') {
  try {
    const { data } = await masterHttp.post('/master/scrape/stop', sessionId ? { sessionId } : {});
    return data;
  } catch (_) {
    const { data } = await masterHttp.post('/scrape/jobs/stop-all', sessionId ? { sessionId } : {});
    return data;
  }
}

export async function deepEnrichBatch(vendorIds = [], sessionId = '') {
  const { data } = await masterHttp.post('/leads/deep-enrich-batch', { vendorIds, sessionId });
  return data;
}

export { DIRECT_BACKEND_URL };
