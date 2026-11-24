import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Eye, EyeOff,
  KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles, User
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import {
  AUTH_REQUIRED, confirmPasswordReset, fetchAuthConfig, loginWithGoogle,
  loginWithPassword, registerWithPassword, requestPasswordReset
} from './auth';
import './login.css';

const MARKETS = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];

const COPY = {
  client: {
    eyebrow: '3D LIQUID WORKSPACE',
    title: 'Find verified business leads',
    titleAccent: 'in seconds.',
    subtitle: 'Access your saved search folders, Google-grade auto-learning search, live interactive territory maps, and instant Excel exports across 11 markets.',
    points: [
      ['Any industry, any city', 'Computer shops, clinics, builders, interior designers, distributors & 150+ local trades.'],
      ['Saved lists ready anytime', 'Every search is cleanly saved for 1-click Excel (.xlsx), CSV or phone (.vcf) export.'],
      ['India first + 10 global markets', 'Complete India town & village coverage plus US, UK, Canada, Australia, UAE, Germany & more.']
    ]
  },
  master: {
    eyebrow: 'SOVEREIGN MASTER CONTROL',
    title: 'Global territory',
    titleAccent: 'command center.',
    subtitle: 'Manage client workspaces, provision accounts, launch full-territory sweeps across 11 markets, and supervise live discovery.',
    points: [
      ['Unified client directory', 'Provision client logins, plans, lead vaults and announcements in one place.'],
      ['Full territory sweeps', 'Launch city, district, county and state sweeps across all 11 locked markets.'],
      ['Self-learning search brain', 'Inspect auto-learned synonyms, categories and live engine health.']
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

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score += 1;
  if (pw.length >= 11 || /[A-Z]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Locked'];
  return { score, label: labels[score] };
}

export default function LoginV2({ variant = 'client', initialMode = 'signin' }) {
  const copy = COPY[variant] || COPY.client;
  const isMaster = variant === 'master';
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(isMaster ? 'signin' : (initialMode || 'signin'));

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetRequested, setResetRequested] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState({ googleEnabled: false, authRequired: AUTH_REQUIRED, allowSelfSignup: true });

  const googleSlot = useRef(null);
  const googleInit = useRef(false);

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const target = params.get('next') || location.state?.from || '/command';
    return typeof target === 'string' && target.startsWith('/') ? target : '/command';
  }, [location.search, location.state?.from]);

  useEffect(() => {
    if (!isMaster && initialMode) setMode(initialMode);
  }, [initialMode, isMaster]);

  useEffect(() => {
    let alive = true;
    fetchAuthConfig()
      .then(cfg => { if (alive) setConfig(cfg); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const finish = useCallback((session) => {
    if (!session) return;
    if (isMaster && session.user?.role !== 'master') {
      setError('This account does not have Master administrator access.');
      return;
    }
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath, isMaster]);

  useEffect(() => {
    if (!config.googleEnabled || !config.googleClientId || mode === 'reset') return;

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
  }, [config.googleEnabled, config.googleClientId, finish, isMaster, mode]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    if (nextMode !== 'reset') setResetRequested(false);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'signin') {
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
      return;
    }

    if (mode === 'signup') {
      if (!name.trim() || !email.trim() || !password) {
        setError('Enter your name, email, and password to create your workspace.');
        return;
      }
      setBusy(true);
      try {
        const session = await registerWithPassword({
          name: name.trim(),
          email: email.trim(),
          password,
          company: company.trim(),
          plan: 'enterprise',
          remember
        });
        finish(session);
      } catch (err) {
        setError(err.message || 'Could not create account.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (!resetRequested) {
        if (!email.trim()) {
          setError('Enter your account email first.');
          return;
        }
        setBusy(true);
        try {
          const res = await requestPasswordReset(email.trim());
          setResetRequested(true);
          setNotice(
            res.devCode
              ? `Reset code generated (local dev code: ${res.devCode}). Enter it below with your new password.`
              : (res.message || 'Check your email or ask your workspace administrator for your 6-digit reset code.')
          );
        } catch (err) {
          setError(err.message || 'Could not request reset code.');
        } finally {
          setBusy(false);
        }
      } else {
        if (!email.trim() || !resetCode.trim() || !password) {
          setError('Enter your email, 6-digit code, and new password.');
          return;
        }
        setBusy(true);
        try {
          const res = await confirmPasswordReset({
            email: email.trim(),
            code: resetCode.trim(),
            newPassword: password
          });
          setNotice(res.message || 'Password updated! Sign in with your new password.');
          setPassword('');
          setResetCode('');
          setResetRequested(false);
          setMode('signin');
        } catch (err) {
          setError(err.message || 'Could not reset password.');
        } finally {
          setBusy(false);
        }
      }
    }
  }

  function handleGooglePlaceholder() {
    setError('');
    setNotice(
      config.googleEnabled
        ? 'Google Sign-In is still loading. Try again in a moment or sign in with email below.'
        : 'Sign in or create an account directly with your email and password below — zero extra setup needed.'
    );
  }

  const strength = passwordStrength(password);
  const effectiveAuthRequired = Boolean(config.authRequired || AUTH_REQUIRED);
  const canSignup = !isMaster && config.allowSelfSignup !== false;

  const headingByMode = {
    signin: {
      title: isMaster ? 'Master sign-in' : 'Welcome back',
      sub: isMaster
        ? 'Restricted to authorized administrators and operators.'
        : 'Sign in with Google or your workspace email.'
    },
    signup: {
      title: 'Create your workspace',
      sub: 'Launch distributed business intelligence across 11 sovereign markets in seconds.'
    },
    reset: {
      title: 'Reset your password',
      sub: resetRequested
        ? 'Enter your 6-digit reset code and choose a strong new password.'
        : 'We will generate a single-use 6-digit reset code for your account.'
    }
  }[mode];

  return (
    <div className={`login-shell login-shell--${variant}`}>
      <div className="login-aurora" aria-hidden="true" />

      <header className="login-topbar">
        <button type="button" className="login-brand" onClick={() => navigate('/')}>
          <BrandLogo size={32} theme="light" />
        </button>

        <div className="login-topbar-right">
          <span className="login-secure-chip">
            <ShieldCheck size={13} /> Encrypted Session
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
                {isMaster ? <LockKeyhole size={11} /> : <Sparkles size={11} />}
                {isMaster ? 'RESTRICTED' : 'SECURE ACCESS'}
              </span>
              <h2>{headingByMode.title}</h2>
              <p>{headingByMode.sub}</p>
            </div>

            {!isMaster && (
              <div className="login-mode-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  className={`login-mode-tab ${mode === 'signin' ? 'is-active' : ''}`}
                  onClick={() => switchMode('signin')}
                >
                  Sign In
                </button>
                {canSignup && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    className={`login-mode-tab ${mode === 'signup' ? 'is-active' : ''}`}
                    onClick={() => switchMode('signup')}
                  >
                    Create Account
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'reset'}
                  className={`login-mode-tab ${mode === 'reset' ? 'is-active' : ''}`}
                  onClick={() => switchMode('reset')}
                >
                  Reset
                </button>
              </div>
            )}

            {!effectiveAuthRequired && (
              <div className="login-preview">
                <b>Instant Access Enabled</b>
                <span>You can sign in to sync your personal account or jump straight into the workspace right now.</span>
                <button type="button" onClick={() => navigate('/command')}>
                  Open Workspace <ArrowRight size={13} />
                </button>
              </div>
            )}

            {mode !== 'reset' && (
              <>
                {config.googleEnabled ? (
                  <div className="login-google-slot" ref={googleSlot} />
                ) : (
                  <button type="button" className="login-google-btn" onClick={handleGooglePlaceholder}>
                    <GoogleMark size={18} />
                    <span>Continue with Google</span>
                  </button>
                )}

                <div className="login-divider">
                  <span>or continue with email</span>
                </div>
              </>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {mode === 'signup' && (
                <>
                  <div className="login-field">
                    <label htmlFor="auth-name">Full name</label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon"><User size={15} /></span>
                      <input
                        id="auth-name"
                        type="text"
                        className="login-input"
                        placeholder="e.g. Manoj Kumar"
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="login-field">
                    <label htmlFor="auth-company">Company / Team (optional)</label>
                    <div className="login-input-wrap">
                      <span className="login-input-icon"><Building2 size={15} /></span>
                      <input
                        id="auth-company"
                        type="text"
                        className="login-input"
                        placeholder="Your business or agency"
                        autoComplete="organization"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="login-field">
                <label htmlFor="auth-email">{isMaster ? 'Admin username or email' : 'Work email'}</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Mail size={15} /></span>
                  <input
                    id="auth-email"
                    type={isMaster ? 'text' : 'email'}
                    className="login-input"
                    placeholder={isMaster ? 'admin' : 'you@company.com'}
                    autoComplete="username"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {mode === 'reset' && resetRequested && (
                <div className="login-field">
                  <label htmlFor="auth-code">6-Digit Reset Code</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><KeyRound size={15} /></span>
                    <input
                      id="auth-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="login-input"
                      placeholder="123456"
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>
              )}

              {(mode !== 'reset' || resetRequested) && (
                <div className="login-field">
                  <label htmlFor="auth-password">
                    {mode === 'reset' ? 'New password' : 'Password'}
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><LockKeyhole size={15} /></span>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder={mode === 'signin' ? 'Enter your password' : 'At least 8 characters (letters + numbers)'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

                  {(mode === 'signup' || (mode === 'reset' && resetRequested)) && password && (
                    <div className="login-strength">
                      <div className="login-strength-bars">
                        {[1, 2, 3, 4].map(n => (
                          <span key={n} className={strength.score >= n ? `lvl-${strength.score}` : ''} />
                        ))}
                      </div>
                      <small>{strength.label}</small>
                    </div>
                  )}
                </div>
              )}

              {mode !== 'reset' && (
                <div className="login-row-between">
                  <label className="login-remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                    />
                    <span>Keep me signed in (7 days)</span>
                  </label>

                  {mode === 'signin' && !isMaster && (
                    <button type="button" className="login-link-btn" onClick={() => switchMode('reset')}>
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

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
                  <><Loader2 size={16} className="login-spin" /> Working…</>
                ) : mode === 'signup' ? (
                  <>Create Workspace <ArrowRight size={16} /></>
                ) : mode === 'reset' ? (
                  <>{resetRequested ? 'Confirm New Password' : 'Generate 6-Digit Code'} <ArrowRight size={16} /></>
                ) : (
                  <>{isMaster ? 'Enter Master Control' : 'Sign In to Workspace'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="login-card-foot">
              {isMaster ? (
                <span>Protected by HMAC-SHA256 signed sessions &amp; role verification.</span>
              ) : mode === 'signin' && canSignup ? (
                <span>
                  New here?{' '}
                  <button type="button" className="login-link-btn" onClick={() => switchMode('signup')}>
                    Create a free workspace
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button type="button" className="login-link-btn" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
