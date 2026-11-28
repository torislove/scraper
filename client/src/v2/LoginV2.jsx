import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowRight, Building2, CheckCircle2, Eye, EyeOff,
  KeyRound, Laptop, Loader2, LockKeyhole, Mail, Server, Sparkles, User
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import LoginBrandPane, { LoginTopbar, GoogleMark, passwordStrength, useGoogleGsiSlot } from '@shared/auth/LoginBrandPane';
import { openPortalLogin } from './utils/editionSwitch';
import {
  AUTH_REQUIRED, confirmPasswordReset, fetchAuthConfig, isLocalDev, loginLocalDevBypass,
  loginWithFirebaseGoogle, loginWithGoogle, loginWithPassword, registerWithPassword, requestPasswordReset
} from './auth';
import './login.css';

export default function LoginV2({ variant = 'client', initialMode = 'signin' }) {
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
  const [config, setConfig] = useState({
    googleEnabled: false,
    firebaseAuthEnabled: true,
    freeTrialDays: 7,
    paymentRequired: false,
    authRequired: AUTH_REQUIRED,
    allowSelfSignup: true
  });

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
    fetchAuthConfig().then((cfg) => { if (alive) setConfig(cfg); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const finish = useCallback((session) => {
    if (!session) return;
    if (isMaster && session.user?.role !== 'master' && session.user?.role !== 'admin') {
      setError('This account does not have Master administrator access.');
      return;
    }
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath, isMaster]);

  const isLocal = useMemo(() => isLocalDev(), []);
  const handleDevSkip = () => finish(loginLocalDevBypass(isMaster ? 'admin' : 'user'));
  const handleQuickFill = (e, p) => { setEmail(e); setPassword(p); };
  const googleSlot = useGoogleGsiSlot({ config, mode, isMaster, loginWithGoogle, finish, setBusy, setError });

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
      if (!email.trim() || !password) return setError('Enter your email and password.');
      setBusy(true);
      try { finish(await loginWithPassword(email.trim(), password, { remember })); }
      catch (err) { setError(err.message || 'Sign-in failed.'); }
      finally { setBusy(false); }
      return;
    }
    if (mode === 'signup') {
      if (!name.trim() || !email.trim() || !password) return setError('Enter your name, email, and password to create your workspace.');
      setBusy(true);
      try { finish(await registerWithPassword({ name: name.trim(), email: email.trim(), password, company: company.trim(), plan: 'enterprise', remember })); }
      catch (err) { setError(err.message || 'Could not create account.'); }
      finally { setBusy(false); }
      return;
    }
    if (mode === 'reset') {
      if (!resetRequested) {
        if (!email.trim()) return setError('Enter your account email first.');
        setBusy(true);
        try {
          const res = await requestPasswordReset(email.trim());
          if (res?.firebaseEmailSent) {
            setResetRequested(false);
            setMode('signin');
            setNotice(res.message || 'Password reset link sent to your email.');
          } else {
            setResetRequested(true);
            setNotice(res.devCode ? `Reset code generated (local dev code: ${res.devCode}).` : (res.message || 'Enter your 6-digit reset code below.'));
          }
        } catch (err) { setError(err.message || 'Could not request reset code.'); }
        finally { setBusy(false); }
      } else {
        if (!email.trim() || !resetCode.trim() || !password) return setError('Enter your email, 6-digit code, and new password.');
        setBusy(true);
        try {
          const res = await confirmPasswordReset({ email: email.trim(), code: resetCode.trim(), newPassword: password });
          setNotice(res.message || 'Password updated! Sign in with your new password.');
          setPassword(''); setResetCode(''); setResetRequested(false); setMode('signin');
        } catch (err) { setError(err.message || 'Could not reset password.'); }
        finally { setBusy(false); }
      }
    }
  }

  async function handleFirebaseGoogle() {
    setError(''); setNotice(''); setBusy(true);
    try { finish(await loginWithFirebaseGoogle({ remember })); }
    catch (err) { setError(err.message || 'Google sign-in failed.'); }
    finally { setBusy(false); }
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
      <LoginTopbar BrandLogoComp={BrandLogo} onHome={() => navigate('/')} />

      <main className="login-main">
        <LoginBrandPane variant={variant} />

        <section className="login-card-wrap">
          <div className="login-card">
            <div className="login-portal-switcher" role="navigation" aria-label="Switch Login Portal">
              <button
                type="button"
                className={`login-portal-pill ${!isMaster ? 'is-active' : ''}`}
                onClick={() => openPortalLogin('client', navigate, mode === 'signup' ? 'signup' : 'signin')}
              >
                <Laptop size={12} />
                <span>Client Portal</span>
              </button>
              <button
                type="button"
                className={`login-portal-pill ${isMaster ? 'is-active' : ''}`}
                onClick={() => openPortalLogin('master', navigate)}
              >
                <Server size={12} />
                <span>Master Fleet</span>
              </button>
            </div>

            {isLocal && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid #10b981', borderRadius: 14, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#065f46', marginBottom: 6 }}>
                  <Sparkles size={13} /> LOCAL DEV ENVIRONMENT
                </div>
                <button
                  type="button"
                  onClick={handleDevSkip}
                  style={{ width: '100%', padding: '9px 12px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <span>Skip to Workspace</span>
                  <ArrowRight size={14} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#065f46' }}>
                  <span>Quick fill:</span>
                  <button type="button" onClick={() => handleQuickFill('admin@scraper.co.in', 'admin123')} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#047857', cursor: 'pointer' }}>Admin</button>
                  <button type="button" onClick={() => handleQuickFill('demo@scraper.co.in', 'demo123')} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#047857', cursor: 'pointer' }}>Demo</button>
                </div>
              </div>
            )}

            <div className="login-card-head">
              <span className="login-card-badge">
                {isMaster ? <LockKeyhole size={11} /> : <Sparkles size={11} />}
                {isMaster ? 'RESTRICTED' : 'SECURE ACCESS'}
              </span>
              <h2>{headingByMode.title}</h2>
              <p>{headingByMode.sub}</p>
              {!isMaster && !config.paymentRequired && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#065f46',
                    fontSize: 11.5,
                    fontWeight: 700
                  }}
                >
                  <Sparkles size={12} color="#059669" />
                  <span>{config.freeTrialDays || 7}-Day Free Launch Access · No Card or Payment Required</span>
                </div>
              )}
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
                {config.firebaseAuthEnabled === false && config.googleEnabled && config.googleClientId ? (
                  <div className="login-google-slot" ref={googleSlot} />
                ) : (
                  <button type="button" className="login-google-btn" onClick={handleFirebaseGoogle} disabled={busy}>
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
