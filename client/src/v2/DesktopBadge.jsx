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

  const state = license?.state || 'trial';
  const plan = String(license?.plan || (state === 'trial' ? 'trial' : '')).toLowerCase();
  const daysLeft = Number.isFinite(license?.daysLeft) ? license.daysLeft : null;

  const tone =
    state === 'active' ? 'is-active'
    : state === 'trial' ? 'is-trial'
    : state === 'grace' ? 'is-warning'
    : 'is-expired';

  const label =
    state === 'active' ? (plan && plan !== 'trial' ? plan.toUpperCase() : 'LICENSED')
    : state === 'trial' ? 'TRIAL'
    : state === 'grace' ? 'GRACE'
    : 'EXPIRED';

  const sub =
    daysLeft === null ? 'Manage'
    : daysLeft <= 0 ? 'Renew'
    : `${formatNumber(daysLeft)}d left`;

  const updateReady = update && (update.state === 'downloaded' || update.state === 'available');

  const open = () => {
    if (update?.state === 'downloaded') {
      desktopBridge?.updater?.install?.();
      return;
    }
    desktopBridge?.license?.openPortal?.();
  };

  const Icon = state === 'active' ? BadgeCheck : state === 'trial' ? Sparkles : ShieldAlert;

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
            : 'Manage subscription'
      }
    >
      {updateReady ? <Download size={12} /> : <Icon size={12} />}
      <b>{updateReady ? 'UPDATE' : label}</b>
      <span>{updateReady ? 'Install' : sub}</span>
    </button>
  );
}
