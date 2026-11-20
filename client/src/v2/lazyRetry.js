import { lazy } from 'react';

/**
 * lazyRetry
 *
 * `React.lazy` turns a failed chunk download into a fatal render error: one
 * flaky response (offline blip, half-served asset, dev proxy hiccup) replaces
 * the whole workspace with an error screen. Route chunks are content-hashed and
 * immutable, so re-requesting them is always safe.
 *
 * This wrapper retries the dynamic import a few times with a short backoff and
 * only then lets the error reach the boundary, which has its own one-shot
 * reload for the stale-chunk case (an old tab asking for a bundle the new
 * deploy already replaced).
 */
export function lazyRetry(importer, attempts = 3) {
  return lazy(async () => {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Failed to load workspace bundle.');
  });
}

const CHUNK_ERROR = /Failed to fetch dynamically imported module|Unable to preload CSS|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Outdated Optimize Dep/i;

export function isChunkLoadError(error) {
  return CHUNK_ERROR.test(String(error?.message || error || ''));
}

function reloadOnce() {
  if (typeof window === 'undefined') return;
  try {
    const last = Number(sessionStorage.getItem('chunkReloadAt') || 0);
    if (Date.now() - last > 15000) {
      sessionStorage.setItem('chunkReloadAt', String(Date.now()));
      window.location.reload();
    }
  } catch (e) {
    /* storage blocked */
  }
}

/**
 * Installs global stale-chunk and Vite preload error recovery before React mounts
 * so Vite restarts or redeploys do not strand open tabs on a blank white page.
 */
export function installChunkErrorRecovery() {
  if (typeof window === 'undefined' || window.__scraperChunkRecoveryInstalled) return;
  window.__scraperChunkRecoveryInstalled = true;
  window.addEventListener('vite:preloadError', (event) => {
    event?.preventDefault?.();
    reloadOnce();
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event?.reason)) {
      reloadOnce();
    }
  });
}
