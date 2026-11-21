import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PricingPage from './pages/PricingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { IS_DESKTOP } from './desktop';
import { lazyRetry, isChunkLoadError } from './v2/lazyRetry';
import {
  AUTH_REQUIRED, fetchAuthConfig, getCachedAuthConfig, logout, useAuthSession
} from './v2/auth';
import { ExtensionProvider } from './v2/context/ExtensionContext';
import './v2/v2.css';
import './v2/whiteTheme.css';
import './v2/designSystem.css';
import './v2/console3d.css';

const LandingV2 = lazyRetry(() => import('./v2/LandingV2'));
const CommandCenter = lazyRetry(() => import('./v2/CommandCenter'));
const LoginV2 = lazyRetry(() => import('./v2/LoginV2'));

function PageLoader() {
  return (
    <div className="v2-root" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(5, 150, 105, 0.16)',
            borderTopColor: '#10b981',
            borderRightColor: '#0e7490',
            animation: 'v2-spin 0.8s linear infinite'
          }}
        />
        <span
          style={{
            fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: '#64748b'
          }}
        >
          LOADING WORKSPACE
        </span>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Uncaught Error:', error, errorInfo);
    if (isChunkLoadError(error)) {
      try {
        const last = Number(sessionStorage.getItem('chunkReloadAt') || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem('chunkReloadAt', String(Date.now()));
          window.location.reload();
        }
      } catch (e) {}
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f7fb',
          color: '#0f172a',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            background: 'rgba(255, 255, 255, 0.86)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255,255,255,0.95)',
            borderRadius: '22px',
            padding: '30px',
            boxShadow: '0 24px 56px -14px rgba(15, 23, 42, 0.16)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#be123c', marginBottom: '8px' }}>
              Workspace Encountered a Problem
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '20px', lineHeight: 1.55 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13.5px',
                border: 'none',
                padding: '11px 24px',
                borderRadius: '12px',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.4), 0 4px 0 #047857',
                cursor: 'pointer'
              }}
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth({ children }) {
  const location = useLocation();
  const session = useAuthSession();
  const [authRequired, setAuthRequired] = useState(
    () => Boolean(AUTH_REQUIRED || getCachedAuthConfig().authRequired)
  );

  useEffect(() => {
    if (IS_DESKTOP) return;
    let alive = true;
    fetchAuthConfig()
      .then(cfg => { if (alive) setAuthRequired(Boolean(AUTH_REQUIRED || cfg?.authRequired)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (IS_DESKTOP || !authRequired) return children;
  if (session?.token) return children;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`/login?next=${next}`} replace />;
}

function LogoutRoute() {
  useEffect(() => { logout(); }, []);
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            color: '#0f172a',
            border: '1.5px solid rgba(255, 255, 255, 0.95)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            fontSize: '13px',
            fontWeight: 650,
            borderRadius: '14px',
            boxShadow: '0 14px 36px -8px rgba(15, 23, 42, 0.18)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#e11d48', secondary: '#ffffff' } },
        }}
      />

      <ExtensionProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={IS_DESKTOP ? <Navigate to="/command" replace /> : <LandingV2 />} />
            <Route path="/command" element={<RequireAuth><CommandCenter /></RequireAuth>} />
            <Route path="/login" element={<LoginV2 initialMode="signin" />} />
            <Route path="/signup" element={<LoginV2 initialMode="signup" />} />
            <Route path="/forgot-password" element={<LoginV2 initialMode="reset" />} />
            <Route path="/logout" element={<LogoutRoute />} />

            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/app/*" element={<Navigate to="/command" replace />} />
            <Route path="/marketplace/*" element={<Navigate to="/command" replace />} />
            <Route path="/landing-legacy" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
            <Route path="*" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
          </Routes>
        </Suspense>
      </ExtensionProvider>
    </ErrorBoundary>
  );
}
