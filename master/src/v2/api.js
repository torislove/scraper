import axios from 'axios';
import { API_URL } from '../apiConfig';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-workspace-scope': 'master',
    'x-user-id': 'master'
  }
});

// Optional operator key. Local installs need nothing; a shared engine can set
// MASTER_KEY and the operator pastes it once (stored only in this browser).
client.interceptors.request.use(config => {
  try {
    const key = window.localStorage.getItem('scraper_master_key');
    if (key) config.headers['x-master-key'] = key;
  } catch (e) {
    /* storage blocked */
  }
  return config;
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

export async function startMasterSweep(payload) {
  const { data } = await client.post('/scrape/master-sweep', payload);
  return data;
}

export async function getAllMasterSessions(clientFilter = 'all') {
  const { data } = await client.get('/sessions/master/all', { params: { client: clientFilter } });
  return data;
}

export async function getMasterClientList() {
  const { data } = await client.get('/sessions/master/clients');
  return data?.clients || [];
}

export async function classifySearchLocation(q) {
  const { data } = await client.get('/search/classify', { params: { q } });
  return data?.classification || null;
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

export async function renameSession(sessionId, payload = {}) {
  const { data } = await client.patch('/sessions/rename', { sessionId, ...payload });
  return data;
}

export async function mergeSessions(sessionIds, newName, tags = [], color = 'purple') {
  const { data } = await client.post('/sessions/merge', { sessionIds, newName, tags, color });
  return data;
}

export async function batchDeleteSessions(sessionIds) {
  const { data } = await client.post('/sessions/batch-delete', { sessionIds });
  return data;
}

export function sessionExportUrl(sessionId, format = 'csv') {
  return `${API_URL}/sessions/export/${encodeURIComponent(sessionId)}?format=${format}`;
}

export function streamUrl() {
  return `${API_URL}/logs/stream`;
}

export async function getGeoHierarchy(params = {}) {
  const { data } = await client.get('/locations/hierarchy', { params });
  return data;
}

/* -------------------------------------------------------- master operators */

export async function getMasterOverview() {
  const { data } = await client.get('/master/overview');
  return data;
}

export async function getMasterClients() {
  const { data } = await client.get('/master/clients');
  return { clients: data?.clients || [], plans: data?.plans || {} };
}

export async function createMasterClient(payload) {
  const { data } = await client.post('/master/clients', payload);
  return data?.client || null;
}

export async function updateMasterClient(id, payload) {
  const { data } = await client.patch(`/master/clients/${encodeURIComponent(id)}`, payload);
  return data?.client || null;
}

export async function deleteMasterClient(id) {
  const { data } = await client.delete(`/master/clients/${encodeURIComponent(id)}`);
  return data;
}

export async function getClientSessions(id) {
  const { data } = await client.get(`/master/clients/${encodeURIComponent(id)}/sessions`);
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function importClientSessions(id, sessionIds, mode = 'separate') {
  const { data } = await client.post(`/master/clients/${encodeURIComponent(id)}/import`, { sessionIds, mode });
  return data;
}

export async function getMasterNotifications() {
  const { data } = await client.get('/master/notifications');
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

export async function sendMasterNotification(payload) {
  const { data } = await client.post('/master/notifications', payload);
  return data?.notification || null;
}

export async function deleteMasterNotification(id) {
  const { data } = await client.delete(`/master/notifications/${encodeURIComponent(id)}`);
  return data;
}
