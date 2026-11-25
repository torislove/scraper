import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff,
  Loader2, LockKeyhole, Mail, ShieldCheck
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import { AUTH_REQUIRED, fetchAuthConfig, loginWithFirebaseGoogle, loginWithGoogle, loginWithPassword } from './auth';
import './login.css';

const MARKETS = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

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

export default function LoginV2({ variant = 'master' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState({ googleEnabled: false, firebaseAuthEnabled: true, authRequired: AUTH_REQUIRED });

  const googleSlot = useRef(null);
  const googleInit = useRef(false);

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const target = params.get('next') || location.state?.from || '/command';
    return typeof target === 'string' && target.startsWith('/') ? target : '/command';
  }, [location.search, location.state?.from]);

  useEffect(() => {
    let alive = true;
    fetchAuthConfig()
      .then(cfg => { if (alive) setConfig(cfg); })
      .catch(() => { });
    return () => { alive = false; };
  }, []);

  const finish = useCallback((session) => {
    if (!session) return;
    if (session.user?.role !== 'master' && session.user?.role !== 'admin') {
      setError('Access restricted: Master administrator credentials required.');
      return;
    }
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath]);

  useEffect(() => {
    if (config.firebaseAuthEnabled !== false || !config.googleEnabled || !config.googleClientId) return;

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
              const session = await loginWithGoogle(response.credential);
              finish(session);
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
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: 340
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

  async function handleFirebaseGoogle() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const session = await loginWithFirebaseGoogle({ remember });
      finish(session);
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('Enter your administrator username/email and password.');
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

  const effectiveAuthRequired = Boolean(config.authRequired || AUTH_REQUIRED);

  return (
    <div className={`login-shell login-shell--${variant || 'master'}`}>
      <div className="login-aurora" aria-hidden="true" />

      <header className="login-topbar">
        <button type="button" className="login-brand" onClick={() => navigate('/command')}>
          <BrandLogo size={32} theme="light" />
        </button>

        <div className="login-topbar-right">
          <span className="login-secure-chip">
            <ShieldCheck size={13} /> Sovereign Guard
          </span>
          <button type="button" className="login-back" onClick={() => navigate('/command')}>
            <ArrowLeft size={13} /> Workspace
          </button>
        </div>
      </header>

      <main className="login-main">
        <section className="login-hero">
          <span className="login-eyebrow">
            <span className="login-eyebrow-dot" />
            SOVEREIGN MASTER CONTROL
          </span>

          <h1 className="login-title">
            Global territory
            <em>command center.</em>
          </h1>

          <p className="login-subtitle">
            Provision client workspaces, issue reset codes, launch full-territory sweeps across 11 markets, and supervise the self-learning search engine.
          </p>

          <ul className="login-points">
            {[
              ['Client Login Provisioning', 'Create client credentials, set plans & quotas, or revoke sessions instantly.'],
              ['Full 11-Market Sweeps', 'Coordinate city, district, county and state sweeps across all 11 locked markets.'],
              ['Self-Learning Intelligence', 'Inspect live auto-learned synonyms, categories and AI routing metrics.']
            ].map(([head, body]) => (
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
            {MARKETS.map(code => (
              <span key={code} className={`login-market-chip ${code === 'IN' ? 'is-home' : ''}`}>
                <Country3DFlag code={code} size={18} isHome={code === 'IN'} />
                {code}
              </span>
            ))}
          </div>
        </section>

        <section className="login-card-wrap">
          <div className="login-card">
            <div className="login-gbc-dots" aria-hidden="true">
              <span className="login-gbc-dot is-kiwi" />
              <span className="login-gbc-dot is-atomic" />
              <span className="login-gbc-dot is-berry" />
            </div>

            <div className="login-card-head">
              <span className="login-card-badge">
                <LockKeyhole size={11} /> RESTRICTED
              </span>
              <h2>Master sign-in</h2>
              <p>Sign in with your administrator credentials to unlock Master Control.</p>
            </div>

            {!effectiveAuthRequired && (
              <div className="login-preview">
                <b>Local Operator Mode</b>
                <span>Authentication gate is optional on localhost. Sign in or open Master Control directly.</span>
                <button type="button" onClick={() => navigate('/command')}>
                  Open Master Control <ArrowRight size={13} />
                </button>
              </div>
            )}

            {config.firebaseAuthEnabled === false && config.googleEnabled && config.googleClientId ? (
              <div className="login-google-slot" ref={googleSlot} />
            ) : (
              <button
                type="button"
                className="login-google-btn"
                onClick={handleFirebaseGoogle}
                disabled={busy}
              >
                <GoogleMark size={18} />
                <span>Continue with Google (Master SSO)</span>
              </button>
            )}

            <div className="login-divider"><span>administrator credentials</span></div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="master-email">Username or email</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Mail size={15} /></span>
                  <input
                    id="master-email"
                    type="text"
                    className="login-input"
                    placeholder="admin"
                    autoComplete="username"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="master-password">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockKeyhole size={15} /></span>
                  <input
                    id="master-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Enter administrator password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="login-row-between">
                <label className="login-remember">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  <span>Keep session active (7 days)</span>
                </label>
              </div>

              {error && (
                <div className="login-alert is-error" role="alert">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              {notice && (
                <div className="login-alert is-notice" role="status">
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{notice}</span>
                </div>
              )}

              <button type="submit" className="login-submit" disabled={busy}>
                {busy ? (
                  <><Loader2 size={16} className="login-spin" /> Authenticating…</>
                ) : (
                  <>Enter Master Control <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="login-card-foot">
              <span>Role-verified HMAC-SHA256 Master session · Zero external auth dependency</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
