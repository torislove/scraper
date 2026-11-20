import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PricingPage from './pages/PricingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { IS_DESKTOP } from './desktop';
import { lazyRetry, isChunkLoadError } from './v2/lazyRetry';
import {
  AUTH_REQUIRED, fetchAuthConfig, getCachedAuthConfig, logout, useAuthSession
} from './v2/auth';
import './v2/v2.css';
import './v2/whiteTheme.css';
import './v2/designSystem.css';
import './v2/console3d.css';

const LandingV2 = lazyRetry(() => import('./v2/LandingV2'));
const CommandCenter = lazyRetry(() => import('./v2/CommandCenter'));
const LoginV2 = lazyRetry(() => import('./v2/LoginV2'));
const FeatureShell = lazyRetry(() => import('./v2/FeatureShell'));
const MasterClients = lazyRetry(() => import('./v2/MasterClients'));
const LearningCenter = lazyRetry(() => import('./v2/LearningCenter'));
const LiveAnimationTheater = lazyRetry(() => import('./v2/LiveAnimationTheater'));

function LearningRoute() {
  return (
    <FeatureShell title="Learning Center" subtitle="What the engine has learned from every sweep">
      <LearningCenter />
    </FeatureShell>
  );
}

function TheaterRoute() {
  const navigate = useNavigate();
  return (
    <FeatureShell title="Sweep Theater" subtitle="Sample walkthrough — demo data, not live leads">
      <LiveAnimationTheater onDeployClick={() => navigate('/command')} />
    </FeatureShell>
  );
}

function PageLoader() {
  return (
    <div className="v2-root" style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(124, 58, 237, 0.2)',
            borderTopColor: '#7c3aed',
            borderRightColor: '#06b6d4',
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
          LOADING MASTER CONTROL
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
    console.error('Master App Uncaught Error:', error, errorInfo);
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
          backgroundColor: '#070b14',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1.5px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '22px',
            padding: '30px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fda4af', marginBottom: '8px' }}>
              Master Command Center Encountered a Problem
            </h2>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.55 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13.5px',
                border: 'none',
                padding: '11px 24px',
                borderRadius: '12px',
                boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.35), 0 4px 0 #4c1d95',
                cursor: 'pointer'
              }}
            >
              Reload Master Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireMasterAuth({ children }) {
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
  const isMaster = session?.token && (session.user?.role === 'master' || session.user?.role === 'admin');
  if (isMaster) return children;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`/login?next=${next}`} replace />;
}

function LogoutRoute() {
  useEffect(() => { logout(); }, []);
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(18px)',
            color: '#f8fafc',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            fontSize: '13px',
            fontWeight: 650,
            borderRadius: '14px',
            boxShadow: '0 16px 38px -8px rgba(0, 0, 0, 0.45)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#fb7185', secondary: '#0f172a' } },
        }}
      />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RequireMasterAuth><CommandCenter isMaster /></RequireMasterAuth>} />
            <Route path="/master" element={<RequireMasterAuth><CommandCenter isMaster /></RequireMasterAuth>} />
            <Route path="/command" element={<RequireMasterAuth><CommandCenter isMaster /></RequireMasterAuth>} />
            <Route path="/login" element={<LoginV2 variant="master" />} />
            <Route path="/logout" element={<LogoutRoute />} />
            <Route path="/landing" element={<LandingV2 />} />
            <Route path="/whatsapp" element={<Navigate to="/command" replace />} />
            <Route path="/clients" element={<RequireMasterAuth><MasterClients /></RequireMasterAuth>} />
            <Route path="/learning" element={<RequireMasterAuth><LearningRoute /></RequireMasterAuth>} />
            <Route path="/theater" element={<RequireMasterAuth><TheaterRoute /></RequireMasterAuth>} />
            <Route path="/engines" element={<Navigate to="/command?tab=engines" replace />} />
            <Route path="/terminal" element={<Navigate to="/command?tab=terminal" replace />} />

            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            <Route path="/app/*" element={<Navigate to="/command" replace />} />
            <Route path="/marketplace/*" element={<Navigate to="/command" replace />} />
            <Route path="/landing-legacy" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
            <Route path="*" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
