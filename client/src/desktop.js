/**
 * Runtime detection for the bundled Windows shell.
 *
 * The same React bundle is used by the web app and the desktop app. The
 * Electron preload injects `window.scraperDesktop` before any script runs, so
 * the UI can branch without a separate build.
 *
 * Desktop build: no marketing site at all - the shell boots into /command.
 * Web build:    the landing page stays at /.
 */

const bridge = typeof window !== 'undefined' ? window.scraperDesktop : null;

export const IS_DESKTOP = Boolean(bridge) || import.meta.env.VITE_DESKTOP === '1';

export const desktopBridge = bridge || null;

/** Where the logo / back-to-home control should go. */
export const HOME_ROUTE = IS_DESKTOP ? '/command' : '/';

export async function getLicenseStatus() {
  if (!bridge?.license) return null;
  try {
    return await bridge.license.status();
  } catch (e) {
    return null;
  }
}

export function onLicenseChange(handler) {
  if (!bridge?.license?.onChange) return () => {};
  return bridge.license.onChange(handler);
}

export function onUpdateStatus(handler) {
  if (!bridge?.updater?.onStatus) return () => {};
  return bridge.updater.onStatus(handler);
}

export default { IS_DESKTOP, desktopBridge, HOME_ROUTE };
