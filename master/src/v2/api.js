import axios from 'axios';
import { API_URL, BACKEND_URL, DIRECT_BACKEND_URL, SSE_STREAM_BASE } from '../apiConfig';
import { getToken, withStreamToken } from './auth';

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
    // A verified master token is stronger than the hardcoded header above: the
    // engine overwrites both headers from the token's claims.
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (typeof document !== 'undefined' && document.documentElement?.dataset?.scraperExtension) {
      config.headers['x-scraper-extension'] = document.documentElement.dataset.scraperExtension;
    }
  } catch (e) {
    /* storage blocked */
  }
  return config;
});

// Edge-triggered online/offline events prevent reconnect storms.
let serverReachable = true;

function isBackendUnreachableError(error) {
  const status = error?.response?.status;
  if (!error?.response) return true;
  if (status === 502 || status === 503 || status === 504) return true;
  if (error?.response?.data?.backendOffline === true) return true;
  if (status === 500 && typeof error?.response?.data === 'string' && !error.response.data.trim().startsWith('{')) {
    return true;
  }
  return error?.code === 'ERR_NETWORK'
    || error?.code === 'ECONNREFUSED'
    || error?.code === 'ERR_INSUFFICIENT_RESOURCES';
}

function markOffline(error) {
  if (typeof window === 'undefined') return;
  // A 429 means the engine is alive and merely asking us to slow down; treating
  // it as "offline" is what turned a throttle into a reconnect storm.
  if (!isBackendUnreachableError(error)) return;
  if (!serverReachable) return;
  serverReachable = false;
  window.dispatchEvent(new CustomEvent('leadharvest:server_offline', { detail: { error } }));
}

client.interceptors.response.use(
  response => {
    if (typeof window !== 'undefined' && !serverReachable) {
      serverReachable = true;
      window.dispatchEvent(new CustomEvent('leadharvest:server_online'));
    }
    return response;
  },
  async error => {
    const cfg = error?.config;
    const currentBase = String(cfg?.baseURL || API_URL || '');
    if (
      cfg &&
      !cfg._retriedDirect &&
      DIRECT_BACKEND_URL &&
      currentBase.startsWith('/') &&
      isBackendUnreachableError(error)
    ) {
      cfg._retriedDirect = true;
      cfg.baseURL = `${DIRECT_BACKEND_URL}/api`;
      try {
        return await client.request(cfg);
      } catch (retryError) {
        markOffline(retryError);
        return Promise.reject(retryError);
      }
    }
    markOffline(error);
    return Promise.reject(error);
  }
);

export const apiBase = API_URL;

export async function pingHealth() {
  try {
    // The landing is often opened while a sweep is saturating the machine, so
    // 2.5 s was too tight and reported a healthy backend as Offline.
    const { data } = await client.get('/health', { timeout: 6000 });
    return data?.ok === true;
  } catch (e) {
    return false;
  }
}

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

export async function suggestLocations(q, limit = 8, country = '') {
  const { data } = await client.get('/locations/suggest', {
    params: { q, limit, country: country || undefined }
  });
  return Array.isArray(data) ? data : [];
}

export async function suggestSearch(params = {}, options = {}) {
  const { data } = await client.get('/search/suggest', {
    signal: options.signal,
    params: {
      q: params.q || undefined,
      category: params.category || undefined,
      location: params.location || undefined,
      limit: params.limit || 6,
      isMaster: params.isMaster ?? true,
      country: params.country || undefined
    }
  });
  return data;
}

export function sendSearchFeedback(payload = {}) {
  try {
    client.post('/search/feedback', payload).catch(() => {});
  } catch (e) {}
}

export async function getGeoStats() {
  const { data } = await client.get('/locations/stats');
  return data;
}

export async function getVendors(params = {}) {
  const query = typeof params === 'number' ? { limit: params } : (params || {});
  const { data } = await client.get('/vendors', { params: query });
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

/** Dry-run: exact zone count, local unit names and coverage before launching. */
export async function previewMasterSweep(payload) {
  const { data } = await client.post('/scrape/master-sweep/preview', payload);
  return data;
}

export async function getEngineStatus() {
  const { data } = await client.get('/scrape/engines/status');
  return data;
}

export async function getLearnedTaxonomy() {
  const { data } = await client.get('/search/taxonomy');
  return data;
}

export async function getLearnedCatalog(options = {}) {
  const { data } = await client.get('/search/learned', {
    timeout: options.timeout ?? 8000,
    params: { limit: options.limit || 200 }
  });
  return data;
}

export async function resetEngineHealth(engine = '') {
  const { data } = await client.post('/scrape/engines/reset', { engine });
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

export async function stopAllScrapes(sessionId) {
  const { data } = await client.post('/scrape/jobs/stop-all', sessionId ? { sessionId } : {});
  return data;
}

export async function resumeScrape(sessionId) {
  const { data } = await client.post('/scrape/resume', { sessionId });
  return data;
}

export async function getVendorProfile(vendorId) {
  const { data } = await client.get(`/deep-profile/vendor/${encodeURIComponent(vendorId)}`);
  return data?.profile || null;
}

export async function deepEnrichVendor(vendorId) {
  const { data } = await client.post(`/vendors/${encodeURIComponent(vendorId)}/deep-enrich`);
  return data;
}

export async function aggressiveEnrichSession(sessionId) {
  const { data } = await client.post(`/sessions/${encodeURIComponent(sessionId)}/aggressive-enrich`);
  return data;
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

export async function resumeDeepJob(jobId) {
  const { data } = await client.post(`/deep-profile/jobs/${encodeURIComponent(jobId)}/resume`);
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

export async function getTrash(limit = 50) {
  const { data } = await client.get('/sessions/trash', { params: { limit } });
  return data;
}

export async function restoreTrash(ids, sessionId = '') {
  const { data } = await client.post('/sessions/trash/restore', { ids, sessionId });
  return data;
}

export function sessionExportUrl(sessionId, format = 'csv', options = {}) {
  const actualFormat = format === 'area-csv' ? 'csv' : format;
  let url = `${API_URL}/sessions/export/${encodeURIComponent(sessionId)}?format=${actualFormat}`;
  if (format === 'area-csv' || options?.divided) url += '&divided=true';
  if (options && options.area && options.area !== 'all') url += `&area=${encodeURIComponent(options.area)}`;
  return url;
}

export function getUserId() {
  try {
    return window.localStorage.getItem('scraper_master_user_id') || 'master';
  } catch (e) {
    return 'master';
  }
}

export function streamUrl() {
  const uid = getUserId();
  const sep = SSE_STREAM_BASE.includes('?') ? '&' : '?';
  return withStreamToken(`${SSE_STREAM_BASE}/logs/stream${sep}scope=master&uid=${encodeURIComponent(uid)}`);
}

export function fallbackStreamUrl() {
  const uid = getUserId();
  const primary = streamUrl();
  const direct = withStreamToken(`${DIRECT_BACKEND_URL || BACKEND_URL}/api/logs/stream?scope=master&uid=${encodeURIComponent(uid)}`);
  const proxied = withStreamToken(`${API_URL}/logs/stream?scope=master&uid=${encodeURIComponent(uid)}`);
  return primary === direct ? proxied : direct;
}

export function sessionStreamUrl(sessionId) {
  const sid = encodeURIComponent(sessionId || '');
  const uid = getUserId() || 'master';
  const sep = SSE_STREAM_BASE.includes('?') ? '&' : '?';
  return withStreamToken(`${SSE_STREAM_BASE}/scrape/stream/${sid}${sep}scope=master&uid=${encodeURIComponent(uid)}`);
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

export async function getMasterLeads(params = {}) {
  const { data } = await client.get('/master/leads', { params });
  return data;
}

export async function sendMasterNotification(payload) {
  const { data } = await client.post('/master/notifications', payload);
  return data?.notification || null;
}

export async function deleteMasterNotification(id) {
  const { data } = await client.delete(`/master/notifications/${encodeURIComponent(id)}`);
  return data;
}

import { createWaApi } from './apiWa';
const waApi = createWaApi(client);
export const {
  getWaStatus, connectWa, disconnectWa, syncWaChats, getWaLeads,
  getWaConversations, createWaConversation, getWaConversation, updateWaConversation,
  sendWaMessage, sendWaBulk, getWaProducts, saveWaProduct, deleteWaProduct,
  getWaSnippets, saveWaSnippet, deleteWaSnippet, getWaAutomations, saveWaAutomation,
  getWaAnalytics, updateWaSettings
} = waApi;

/* â”€â”€ Master Client Auth Provisioning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export async function setMasterClientCredentials(id, payload) {
  const { data } = await client.post(`/master/clients/${encodeURIComponent(id)}/credentials`, payload);
  return data;
}

export async function createMasterClientResetCode(id) {
  const { data } = await client.post(`/master/clients/${encodeURIComponent(id)}/reset-code`);
  return data;
}

export async function revokeMasterClientSessions(id) {
  const { data } = await client.post(`/master/clients/${encodeURIComponent(id)}/revoke-sessions`);
  return data;
}

export async function huntMissingPhones(payload = {}) {
  const { data } = await client.post('/scrape/enrich-now', payload);
  return data;
}

export async function getPhoneHuntStatus(sessionId = '') {
  const { data } = await client.get('/scrape/hunt-status', {
    params: sessionId ? { sessionId } : {}
  });
  return data;
}

export async function stopPhoneHunt() {
  const { data } = await client.post('/scrape/hunt-stop');
  return data;
}

export {
  resolveCityZones, getCountriesOverview, getScrapedFolders,
  getFolderLeads, getFolderExportUrl, resumeScrapedFolder, deleteScrapedFolder
} from '@shared/utils/foldersGeoApi';
