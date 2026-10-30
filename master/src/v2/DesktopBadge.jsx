import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Download, ShieldAlert, Sparkles } from 'lucide-react';
import { IS_DESKTOP, desktopBridge, onLicenseChange, onUpdateStatus } from '../desktop';
import { cx, formatNumber } from './ui';

/**
 * Subscription + update indicator. Renders only inside the Windows shell, so
 * the web app is completely unaffected.
 */
export default function DesktopBadge() {
  const [license, setLicense] = useState(null);
  const [update, setUpdate] = useState(null);

  const load = useCallback(async () => {
    if (!desktopBridge?.license) return;
    try {
      setLicense(await desktopBridge.license.status());
    } catch (e) {
      /* shell not ready */
    }
  }, []);

  useEffect(() => {
    if (!IS_DESKTOP) return undefined;
    load();
    const offLicense = onLicenseChange(next => setLicense(next));
    const offUpdate = onUpdateStatus(next => setUpdate(next));
    const timer = setInterval(load, 60 * 60 * 1000);
    return () => {
      offLicense();
      offUpdate();
      clearInterval(timer);
    };
  }, [load]);

  if (!IS_DESKTOP) return null;

  const state = license?.state || 'credits';
  const plan = String(license?.plan || '').toLowerCase();
  const creditsLeft = Number.isFinite(license?.creditsLeft) ? license.creditsLeft : null;

  const tone =
    state === 'active' ? 'is-active'
    : state === 'credits' ? 'is-credits'
    : state === 'grace' ? 'is-warning'
    : 'is-expired';

  const label =
    state === 'active' ? (plan ? plan.toUpperCase() : 'LICENSED')
    : state === 'credits' ? 'FREE'
    : state === 'grace' ? 'GRACE'
    : 'OUT OF CREDITS';

  const sub =
    creditsLeft !== null && (state === 'active' || state === 'credits')
      ? `${formatNumber(creditsLeft)} left`
      : state === 'grace' ? 'Renew'
      : 'Get more';

  const updateReady = update && (update.state === 'downloaded' || update.state === 'available');

  const open = () => {
    if (update?.state === 'downloaded') {
      desktopBridge?.updater?.install?.();
      return;
    }
    desktopBridge?.license?.openPortal?.();
  };

  const Icon = state === 'active' ? BadgeCheck : state === 'credits' ? Sparkles : ShieldAlert;

  return (
    <button
      type="button"
      className={cx('v2-desktop-badge', tone)}
      onClick={open}
      title={
        updateReady
          ? `Update ${update.version || ''} ready — click to install`
          : license?.expiresAt
            ? `Subscription ends ${new Date(license.expiresAt).toLocaleDateString()}`
            : state === 'credits'
              ? `${formatNumber(creditsLeft || 0)} free credits left`
              : 'Add credits or manage your plan'
      }
    >
      {updateReady ? <Download size={12} /> : <Icon size={12} />}
      <b>{updateReady ? 'UPDATE' : label}</b>
      <span>{updateReady ? 'Install' : sub}</span>
    </button>
  );
}
