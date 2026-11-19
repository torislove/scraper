import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Loader2,
  LockKeyhole, Mail, ShieldCheck, Sparkles
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import {
  AUTH_REQUIRED, fetchAuthConfig, loginWithGoogle, loginWithPassword
} from './auth';
import './login.css';

const MARKETS = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

const COPY = {
  client: {
    eyebrow: 'LEAD WORKSPACE',
    title: 'Find verified business leads',
    titleAccent: 'in seconds.',
    subtitle: 'Sign in to access your saved lists, live interactive territory maps, and instant Excel exports across 11 markets.',
    cardTitle: 'Welcome back',
    cardSubtitle: 'Sign in with Google or your workspace email.',
    points: [
      ['Any industry, any city', 'Find shops, clinics, suppliers, agencies and local services effortlessly.'],
      ['Saved lists ready anytime', 'Every search is neatly stored for 1-click Excel, CSV or phone export.'],
      ['India first + 10 global markets', 'Complete India village coverage plus US, UK, Canada, Australia, UAE, Germany & more.']
    ]
  },
  master: {
    eyebrow: 'MASTER CONTROL',
    title: 'Global territory',
    titleAccent: 'command center.',
    subtitle: 'Manage client workspaces, launch state & county sweeps across all 11 markets, and oversee live intelligence.',
    cardTitle: 'Master sign-in',
    cardSubtitle: 'Restricted to authorized operators and administrators.',
    points: [
      ['Unified client directory', 'Manage customer plans, lead vaults and announcements in one view.'],
      ['Full territory sweeps', 'Launch city, county, district and state sweeps across all 11 markets.'],
      ['Live operational control', 'Monitor discovery throughput, self-learning AI and system health.']
    ]
  }
};

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.7 2.6 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.6-5.9c-2.1 1.4-4.8 2.4-7.9 2.4-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function LoginV2({ variant = 'client' }) {
  const copy = COPY[variant] || COPY.client;
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState({ googleEnabled: false, authRequired: AUTH_REQUIRED });

  const googleSlot = useRef(null);
  const googleInit = useRef(false);

  const nextPath = (() => {
    const params = new URLSearchParams(location.search);
    const target = params.get('next') || location.state?.from || '/command';
    return typeof target === 'string' && target.startsWith('/') ? target : '/command';
  })();

  useEffect(() => {
    let alive = true;
    fetchAuthConfig()
      .then(cfg => { if (alive) setConfig(cfg); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const finish = useCallback((session) => {
    if (!session) return;
    if (session.user?.role === 'master' && variant !== 'master') {
      // A master account that lands on the client host still belongs in master.
      window.location.assign('/command');
      return;
    }
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath, variant]);

  /* Google Identity Services: rendered only when the server has a client ID.
     The custom button below is the fallback while GOOGLE_CLIENT_ID is unset. */
  useEffect(() => {
    if (!config.googleEnabled || !config.googleClientId) return;
    if (googleInit.current) return;

    const render = () => {
      if (!window.google?.accounts?.id || !googleSlot.current) return;
      googleInit.current = true;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (response) => {
          setBusy(true);
          setError('');
          try {
            const session = await loginWithGoogle(response.credential);
            finish(session);
          } catch (err) {
            setError(err.message || 'Google sign-in failed.');
          } finally {
            setBusy(false);
          }
        }
      });
      window.google.accounts.id.renderButton(googleSlot.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 336
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return;
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
  }, [config.googleEnabled, config.googleClientId, finish]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setBusy(true);
    try {
      const session = await loginWithPassword(email.trim(), password, { remember });
      finish(session);
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  function handleGooglePlaceholder() {
    setError('');
    setNotice(
      config.googleEnabled
        ? 'Google Sign-In is still loading. Try again in a moment, or sign in with your email below.'
        : 'Please sign in with your workspace email and password below.'
    );
  }

  return (
    <div className={`login-shell login-shell--${variant}`}>
      <div className="login-aurora" aria-hidden="true" />

      <header className="login-topbar">
        <button type="button" className="login-brand" onClick={() => navigate('/')}>
          <BrandLogo size={30} showTagline tagline={variant === 'master' ? 'Master Control' : 'Autonomous Lead Radar'} />
        </button>

        <div className="login-topbar-right">
          <span className="login-secure-chip">
            <ShieldCheck size={13} /> Signed session
          </span>
          <button type="button" className="login-back" onClick={() => navigate('/')}>
            <ArrowLeft size={13} /> Back to site
          </button>
        </div>
      </header>

      <main className="login-main">
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
            {copy.points.map(([head, body], index) => (
              <li key={head} style={{ animationDelay: `${0.08 + index * 0.07}s` }}>
                <span className="login-point-icon"><Check size={12} strokeWidth={3} /></span>
                <span>
                  <b>{head}</b>
                  <i>{body}</i>
                </span>
              </li>
            ))}
          </ul>

          <div className="login-markets" aria-label="Eleven supported markets">
            {MARKETS.map(code => (
              <span key={code} className={code === 'IN' ? 'is-home' : ''}>{code}</span>
            ))}
          </div>
        </section>

        <section className="login-card-wrap">
          <div className="login-card">
            <div className="login-card-head">
              <span className="login-card-badge">
                {variant === 'master' ? <LockKeyhole size={11} /> : <Sparkles size={11} />}
                {variant === 'master' ? 'RESTRICTED' : 'SECURE SIGN-IN'}
              </span>
              <h2>{copy.cardTitle}</h2>
              <p>{copy.cardSubtitle}</p>
            </div>

            {!AUTH_REQUIRED && (
              <div className="login-preview">
                <b>Preview mode</b>
                <span>Sign-in is not enforced yet. You can open the workspace directly.</span>
                <button type="button" onClick={() => navigate('/command')}>
                  Open command center <ArrowRight size={13} />
                </button>
              </div>
            )}

            {config.googleEnabled ? (
              <div className="login-google-slot" ref={googleSlot} />
            ) : (
              <button type="button" className="login-google" onClick={handleGooglePlaceholder}>
                <GoogleMark />
                <span>Continue with Google</span>
                <em>SETUP</em>
              </button>
            )}

            <div className="login-divider"><span>or use your email</span></div>

            {error && (
              <div className="login-alert is-error" role="alert">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            {notice && !error && (
              <div className="login-alert is-info" role="status">
                <ShieldCheck size={14} />
                <span>{notice}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="login-field">
                <span className="login-label">Email</span>
                <span className="login-input">
                  <Mail size={15} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="login-label">Password</span>
                <span className="login-input">
                  <LockKeyhole size={15} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              <div className="login-row">
                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
                <a className="login-link" href="mailto:support@scraper.co.in?subject=Password%20reset">
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="login-submit" disabled={busy}>
                {busy ? <Loader2 size={16} className="login-spin" /> : null}
                <span>{busy ? 'Signing in…' : variant === 'master' ? 'Enter control room' : 'Sign in'}</span>
                {!busy && <ArrowRight size={15} />}
              </button>
            </form>

            <p className="login-fine">
              By continuing you agree to the{' '}
              <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>

          <p className="login-footnote">
            <ShieldCheck size={12} />
            Secure workspace · Instant business leads across 11 markets
          </p>
        </section>
      </main>
    </div>
  );
}
