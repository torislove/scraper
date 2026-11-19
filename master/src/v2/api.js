import axios from 'axios';
import { API_URL } from '../apiConfig';
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
  } catch (e) {
    /* storage blocked */
  }
  return config;
});

/* Connection events are EDGE-TRIGGERED.
 *
 * The first version dispatched `leadharvest:server_online` on every successful
 * response. The command centre listened for that event, reconnected the event
 * stream and refreshed every panel. Each refresh produced another successful
 * response, which fired the event again — a self-feeding loop that exhausted
 * the API rate limit within a minute, made the stream flap, and surfaced to the
 * customer as "Reconnecting to Swarm Server … Attempt #473" while the engine
 * was perfectly healthy.
 *
 * The event now fires only on a real offline -> online transition, so it is a
 * genuine recovery signal that a listener may act on once.
 */
let serverReachable = true;

function markOffline(error) {
  if (typeof window === 'undefined') return;
  const status = error?.response?.status;
  const isOffline = !error?.response || status === 503 || status === 502
    || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNREFUSED'
    || error?.code === 'ERR_INSUFFICIENT_RESOURCES';
  // A 429 means the engine is alive and merely asking us to slow down; treating
  // it as "offline" is what turned a throttle into a reconnect storm.
  if (!isOffline) return;
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
  error => {
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

export function streamUrl() {
  return withStreamToken(`${API_URL}/logs/stream`);
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

/* ------------------------------------------------------ WhatsApp CRM (own account) */
// Everything here talks to the customer's own WhatsApp Web session. There is no
// API key anywhere: the only credential is the QR scan the customer performs.

export async function getWaStatus() {
  const { data } = await client.get('/wa/status');
  return data;
}

export async function connectWa() {
  const { data } = await client.post('/wa/connect');
  return data;
}

export async function disconnectWa(wipe = false) {
  const { data } = await client.post('/wa/disconnect', { wipe });
  return data;
}

export async function syncWaChats() {
  const { data } = await client.post('/wa/sync');
  return data;
}

export async function getWaLeads(params = {}) {
  const { data } = await client.get('/wa/leads', { params });
  return data?.leads || [];
}

export async function getWaConversations(params = {}) {
  const { data } = await client.get('/wa/conversations', { params });
  return data?.conversations || [];
}

export async function createWaConversation(body) {
  const { data } = await client.post('/wa/conversations', body);
  return data?.conversation;
}

export async function getWaConversation(id) {
  const { data } = await client.get(`/wa/conversations/${encodeURIComponent(id)}`);
  return data;
}

export async function updateWaConversation(id, patch) {
  const { data } = await client.patch(`/wa/conversations/${encodeURIComponent(id)}`, patch);
  return data?.conversation;
}

export async function sendWaMessage(body) {
  const { data } = await client.post('/wa/messages', body);
  return data;
}

export async function sendWaBulk(body) {
  const { data } = await client.post('/wa/bulk', body, { timeout: 120000 });
  return data;
}

export async function getWaProducts() {
  const { data } = await client.get('/wa/products');
  return data?.products || [];
}

export async function saveWaProduct(body) {
  const { data } = await client.post('/wa/products', body);
  return data?.product;
}

export async function deleteWaProduct(id) {
  const { data } = await client.delete(`/wa/products/${encodeURIComponent(id)}`);
  return data;
}

export async function getWaSnippets() {
  const { data } = await client.get('/wa/snippets');
  return data?.snippets || [];
}

export async function saveWaSnippet(body) {
  const { data } = await client.post('/wa/snippets', body);
  return data?.snippet;
}

export async function deleteWaSnippet(id) {
  const { data } = await client.delete(`/wa/snippets/${encodeURIComponent(id)}`);
  return data;
}

export async function getWaAutomations() {
  const { data } = await client.get('/wa/automations');
  return data?.automations || [];
}

export async function saveWaAutomation(body) {
  const { data } = await client.post('/wa/automations', body);
  return data?.automation;
}

export async function getWaAnalytics() {
  const { data } = await client.get('/wa/analytics');
  return data?.analytics || {};
}

export async function updateWaSettings(patch) {
  const { data } = await client.patch('/wa/settings', patch);
  return data?.session;
}
