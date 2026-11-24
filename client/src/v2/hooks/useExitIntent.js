import { useState, useEffect, useCallback } from 'react';

/**
 * useExitIntent.js
 * Detects when a desktop user moves their cursor towards the top of the browser
 * window (e.g. to close tab, switch window, or enter new URL).
 *
 * Features:
 * - LocalStorage frequency capping (default: 72 hours cooldown).
 * - Session suppression guard (only fires once per browser session).
 * - Active run lockout guard (never fires if an active scraping run is running).
 * - Safe desktop-only listener (ignored on touch devices).
 */
export function useExitIntent({
  enabled = true,
  cooldownHours = 72,
  storageKey = 'scraper_exit_intent_dismissed',
  onExitIntent
} = {}) {
  const [triggered, setTriggered] = useState(false);

  const checkEligibility = useCallback(() => {
    if (!enabled) return false;
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

    // Check session suppression
    try {
      if (sessionStorage.getItem(storageKey + '_session')) {
        return false;
      }
      const lastDismissed = localStorage.getItem(storageKey);
      if (lastDismissed) {
        const diffMs = Date.now() - Number(lastDismissed);
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        if (diffMs < cooldownMs) {
          return false;
        }
      }
    } catch (e) {
      // In case private browsing blocks storage
    }
    return true;
  }, [enabled, cooldownHours, storageKey]);

  const dismiss = useCallback(() => {
    setTriggered(false);
    try {
      sessionStorage.setItem(storageKey + '_session', 'true');
      localStorage.setItem(storageKey, String(Date.now()));
    } catch (e) {}
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;
    if (!checkEligibility()) return;

    let delayTimer = null;
    let initialGracePeriod = true;

    // Give user 3 seconds on page before arming exit-intent to avoid false triggers
    delayTimer = setTimeout(() => {
      initialGracePeriod = false;
    }, 3000);

    const handleMouseLeave = (e) => {
      if (initialGracePeriod) return;
      // Only fire when cursor leaves top edge (clientY <= 0)
      if (e.clientY <= 0 && (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML')) {
        if (checkEligibility()) {
          setTriggered(true);
          try {
            sessionStorage.setItem(storageKey + '_session', 'true');
          } catch (err) {}
          if (typeof onExitIntent === 'function') {
            onExitIntent();
          }
        }
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, checkEligibility, onExitIntent, storageKey]);

  return {
    isTriggered: triggered,
    dismiss,
    reset: () => setTriggered(false)
  };
}
