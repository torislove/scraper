import axios from 'axios';
import { API_URL } from '../../client/src/apiConfig';

const api = axios.create({ baseURL: API_URL, timeout: 25000 });

export async function resolveCityZones(city, country = 'IN', zoneMode = 'smart', options = {}) {
  const { data } = await api.get('/geo/resolve', {
    signal: options.signal,
    params: { city, country, zoneMode }
  });
  return data;
}

export async function getCountriesOverview() {
  const { data } = await api.get('/geo/countries-overview', { timeout: 10000 });
  return data?.countries || {};
}

export async function getScrapedFolders() {
  const { data } = await api.get('/folders', { timeout: 12000 });
  return Array.isArray(data?.folders) ? data.folders : [];
}

export async function getFolderLeads(folderId, { subcategory = '', sublocation = '', segment = '', runSessionId = '' } = {}) {
  const { data } = await api.get(`/folders/${encodeURIComponent(folderId)}/leads`, {
    params: {
      subcategory: subcategory || undefined,
      sublocation: sublocation || undefined,
      segment: segment || undefined,
      runSessionId: runSessionId || undefined
    }
  });
  return data;
}

export function getFolderExportUrl(folderId, { subcategory = '', sublocation = '', segment = '', runSessionId = '' } = {}) {
  const qs = new URLSearchParams();
  if (subcategory) qs.set('subcategory', subcategory);
  if (sublocation) qs.set('sublocation', sublocation);
  if (segment) qs.set('segment', segment);
  if (runSessionId) qs.set('runSessionId', runSessionId);
  const query = qs.toString();
  return `${API_URL}/folders/${encodeURIComponent(folderId)}/export${query ? `?${query}` : ''}`;
}

export async function resumeScrapedFolder(folderId) {
  const { data } = await api.post(`/folders/${encodeURIComponent(folderId)}/resume`);
  return data;
}

export async function deleteScrapedFolder(folderId) {
  const { data } = await api.delete(`/folders/${encodeURIComponent(folderId)}`);
  return data;
}
