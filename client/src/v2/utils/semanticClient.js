/**
 * semanticClient.js — Promise-based Bridge to On-Device Semantic Worker
 *
 * Provides sub-millisecond natural language query parsing, country intelligence,
 * multi-engine parameter compilation, and background lead filtering without
 * blocking the main React render thread.
 */

let workerInstance = null;
let reqIdCounter = 0;
const pendingRequests = new Map();

function getWorker() {
  if (typeof window === 'undefined') return null;

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('../../semanticWorker.js', import.meta.url), { type: 'module' });
      workerInstance.addEventListener('message', (event) => {
        const { id, status, message, ...data } = event.data || {};
        if (id && pendingRequests.has(id)) {
          const { resolve, reject } = pendingRequests.get(id);
          pendingRequests.delete(id);
          if (status === 'error') {
            reject(new Error(message || 'Worker error'));
          } else {
            resolve(data);
          }
        }
      });
      workerInstance.addEventListener('error', (err) => {
        console.warn('[SemanticWorker] Worker runtime error:', err);
      });
    } catch (e) {
      console.warn('[SemanticWorker] Failed to instantiate worker:', e);
      return null;
    }
  }

  return workerInstance;
}

function sendWorkerMessage(action, payload = {}) {
  const worker = getWorker();
  if (!worker) {
    return Promise.reject(new Error('Web Worker not available in this environment'));
  }

  const id = ++reqIdCounter;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ action, id, ...payload });

    // Safety timeout after 5 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Worker request ${action} timed out`));
      }
    }, 5000);
  });
}

/**
 * Parses freeform user queries with on-device country intelligence and all-engine compilers.
 * @param {string} text - User query string
 * @param {string} [country] - Explicit country code (e.g. 'US', 'GB', 'IN')
 * @returns {Promise<object>} Parsed query contract
 */
export async function parseQuerySemantic(text, country = null) {
  try {
    const res = await sendWorkerMessage('parse_query', { text, country });
    return res.parsed;
  } catch (e) {
    // Graceful fallback
    return null;
  }
}

/**
 * Compiles exact query parameters for all 10 international engines.
 */
export async function compileAllEngines(category, location, country = 'IN') {
  try {
    const res = await sendWorkerMessage('compile_engines', { category, location, country });
    return res.queries;
  } catch (e) {
    return null;
  }
}

/**
 * Filters a large list of leads in worker thread to prevent UI frame drops.
 */
export async function filterLeadsSemantic(leads, filterText = '', criteria = {}) {
  try {
    const res = await sendWorkerMessage('search_leads', { leads, filterText, criteria });
    return res.matchedIds || [];
  } catch (e) {
    return leads.map(l => l.id);
  }
}

/**
 * Telecom normalizer & WhatsApp link generator.
 */
export async function normalizePhoneSemantic(phone, country = 'IN') {
  try {
    const res = await sendWorkerMessage('normalize_phone', { phone, country });
    return res.result;
  } catch (e) {
    return { valid: false, phone, isMobile: false, whatsappLink: '' };
  }
}
