import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { COUNTRIES } from '../data/countries';
import { FlagSphere } from '../ui/FlagChip';

export function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.6 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.4-7.9 2.4-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score += 1;
  if (pw.length >= 11 || /[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Locked'];
  return { score, label: labels[score] };
}

export function useGoogleGsiSlot({ config, mode, isMaster, loginWithGoogle, finish, setBusy, setError }) {
  const googleSlot = useRef(null);
  const googleInit = useRef(false);

  useEffect(() => {
    if (config.firebaseAuthEnabled !== false || !config.googleEnabled || !config.googleClientId || mode === 'reset') return undefined;
    const render = () => {
      if (!window.google?.accounts?.id || !googleSlot.current) return;
      if (!googleInit.current) {
        googleInit.current = true;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async (response) => {
            setBusy(true);
            setError('');
            try {
              finish(await loginWithGoogle(response.credential));
            } catch (err) {
              setError(err.message || 'Google sign-in failed.');
            } finally {
              setBusy(false);
            }
          }
        });
      }
      googleSlot.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleSlot.current, {
        theme: isMaster ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 340
      });
    };
    if (window.google?.accounts?.id) {
      render();
      return undefined;
    }
    const existing = document.querySelector('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = 'true';
    script.addEventListener('load', render);
    document.head.appendChild(script);
    return () => script.removeEventListener('load', render);
  }, [config.firebaseAuthEnabled, config.googleEnabled, config.googleClientId, finish, isMaster, loginWithGoogle, mode, setBusy, setError]);

  return googleSlot;
}

const COPY = {
  client: {
    eyebrow: 'CLIENT WORKSPACE',
    title: 'Public business contacts ',
    titleAccent: 'extracted live.',
    subtitle: 'Access saved Lead Folders, category-filtered search, interactive territory maps, and CSV / vCard exports across 5 active markets.',
    points: [
      ['15+ industry umbrellas & niches', 'Hospitals, clinics, dental, trades, legal, manufacturing, wholesalers, and local services.'],
      ['Saved Lead Folders', 'Segment harvested leads and export spreadsheets (.csv) or phone contacts (.vcf).'],
      ['5 active markets supported', 'India (Main), United States, United Kingdom, Australia, and United Arab Emirates.']
    ]
  },
  master: {
    eyebrow: 'MASTER FLEET CONTROL',
    title: 'Multi-territory ',
    titleAccent: 'command center.',
    subtitle: 'Manage client workspaces, provision accounts, run city, district, and state sweeps across 5 markets, and monitor live jobs.',
    points: [
      ['Unified client directory', 'Provision client logins, plans, and workspace access in one place.'],
      ['District & state sweeps', 'Run city, district, county, and state-scale sweeps across all 5 active markets.'],
      ['Live engine telemetry', 'Monitor active wards, sub-category queues, and server RAM usage.']
    ]
  }
};

export function LoginTopbar({ BrandLogoComp, onHome }) {
  return (
    <header className="login-topbar">
      <button type="button" className="login-brand" onClick={onHome}>
        <BrandLogoComp size={32} theme="light" />
      </button>

      <div className="login-topbar-right">
        <span className="login-secure-chip">
          <ShieldCheck size={13} /> Encrypted Session
        </span>
        <button type="button" className="login-back" onClick={onHome}>
          <ArrowLeft size={13} /> Back to site
        </button>
      </div>
    </header>
  );
}

export default function LoginBrandPane({ variant = 'client' }) {
  const copy = COPY[variant] || COPY.client;

  return (
    <section className="login-hero">
      <span className="login-eyebrow">
        <span className="login-eyebrow-dot" />
        {copy.eyebrow}
      </span>

      <h1 className="login-title">
        {copy.title}
        <em>{copy.titleAccent}</em>
      </h1>

      <p className="login-subtitle">{copy.subtitle}</p>

      <ul className="login-points">
        {copy.points.map(([head, body]) => (
          <li key={head}>
            <span className="login-point-icon"><Check size={13} strokeWidth={3} /></span>
            <span>
              <b>{head}</b>
              <i>{body}</i>
            </span>
          </li>
        ))}
      </ul>

      <div className="login-markets" aria-label="Eleven supported markets">
        {COUNTRIES.map((c) => (
          <span key={c.code} className={`login-market-chip ${c.code === 'IN' ? 'is-home' : ''}`}>
            <FlagSphere code={c.code} size={18} active={c.code === 'IN'} />
            {c.code}
          </span>
        ))}
      </div>
    </section>
  );
}
