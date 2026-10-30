import axios from 'axios';
import { API_URL } from '../apiConfig';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

export const apiBase = API_URL;

export async function getHealth() {
  const { data } = await client.get('/deep-profile/health');
  return data;
}

export async function getFields() {
  const { data } = await client.get('/deep-profile/fields');
  return data;
}

export async function getEstimate(params = {}) {
  const { data } = await client.get('/deep-profile/estimate', {
    params: {
      query: params.query,
      category: params.category,
      location: params.location,
      strategy: params.strategy,
      engines: Array.isArray(params.engines) ? params.engines.join(',') : params.engines,
      targetLeads: params.targetLeads || undefined
    }
  });
  return data;
}

export async function getDeepEstimate(params = {}) {
  const { data } = await client.get('/deep-profile/estimate/deep', { params });
  return data;
}

export async function suggestLocations(q, limit = 8) {
  const { data } = await client.get('/locations/suggest', { params: { q, limit } });
  return Array.isArray(data) ? data : [];
}

export async function suggestSearch(params = {}, options = {}) {
  const { data } = await client.get('/search/suggest', {
    signal: options.signal,
    params: {
      q: params.q || undefined,
      category: params.category || undefined,
      location: params.location || undefined,
      limit: params.limit || 6
    }
  });
  return data;
}

export async function getGeoStats() {
  const { data } = await client.get('/locations/stats');
  return data;
}

export async function getVendors() {
  const { data } = await client.get('/vendors');
  return Array.isArray(data) ? data : [];
}

export async function getSessions() {
  const { data } = await client.get('/sessions/list');
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function getScrapeJobs() {
  const { data } = await client.get('/scrape/jobs');
  return data;
}

export async function startOmni(payload) {
  const { data } = await client.post('/scrape/omni', payload);
  return data;
}

export async function startAuto(payload) {
  const { data } = await client.post('/scrape/auto', payload);
  return data;
}

export async function stopAllScrapes() {
  const { data } = await client.post('/scrape/jobs/stop-all');
  return data;
}

export async function getVendorProfile(vendorId) {
  const { data } = await client.get(`/deep-profile/vendor/${encodeURIComponent(vendorId)}`);
  return data?.profile || null;
}

export async function deepExtractVendor(vendorId, options = {}) {
  const { data } = await client.post(`/deep-profile/vendor/${encodeURIComponent(vendorId)}`, options);
  return data;
}

export async function getDeepJobs() {
  const { data } = await client.get('/deep-profile/jobs');
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

export async function getDeepJob(jobId) {
  const { data } = await client.get(`/deep-profile/jobs/${encodeURIComponent(jobId)}`);
  return data?.job || null;
}

export async function startDeepBatch(payload = {}) {
  const { data } = await client.post('/deep-profile/run', payload);
  return data;
}

export async function stopDeepJob(jobId) {
  const { data } = await client.post(`/deep-profile/jobs/${encodeURIComponent(jobId)}/stop`);
  return data?.job || null;
}

export async function updateCrmStatus(vendorId, crmStatus, notes = '') {
  const { data } = await client.put(`/vendors/${encodeURIComponent(vendorId)}/crm`, { crmStatus, notes });
  return data;
}

export async function updateVendorCrm(vendorId, payload = {}) {
  const { data } = await client.put(`/vendors/${encodeURIComponent(vendorId)}/crm`, payload);
  return data;
}

export async function addCrmNote(vendorId, text) {
  const { data } = await client.post(`/vendors/${encodeURIComponent(vendorId)}/crm/notes`, { text });
  return data;
}

export async function saveCrmTasks(vendorId, tasks = []) {
  const { data } = await client.post(`/vendors/${encodeURIComponent(vendorId)}/crm/tasks`, { tasks });
  return data;
}

export async function getSessionVault(sessionId) {
  const { data } = await client.get(`/sessions/${encodeURIComponent(sessionId)}`);
  return data?.session || null;
}

export async function deleteSession(sessionId) {
  const { data } = await client.delete(`/sessions/${encodeURIComponent(sessionId)}`);
  return data;
}

export function sessionExportUrl(sessionId, format = 'csv') {
  return `${API_URL}/sessions/export/${encodeURIComponent(sessionId)}?format=${format}`;
}

export function streamUrl() {
  return `${API_URL}/logs/stream`;
}
