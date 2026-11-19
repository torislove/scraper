import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PricingPage from './pages/PricingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { IS_DESKTOP } from './desktop';
import { lazyRetry, isChunkLoadError } from './v2/lazyRetry';
import { AUTH_REQUIRED, getSession, logout } from './v2/auth';
import '@ui3d/tokens.css';
import '@ui3d/kit.css';
import './v2/v2.css';
import './v2/revamp.css';
import './v2/glass3d.css';
import './v2/whiteTheme.css';
import './v2/retroEmboss.css';

// scraper.co.in has exactly one workspace: the command center.
// lazyRetry keeps a single flaky chunk download from taking down the workspace.
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
            border: '2px solid rgba(37, 99, 235, 0.2)',
            borderTopColor: '#2563eb',
            animation: 'v2-spin 0.8s linear infinite'
          }}
        />
        <span
          style={{
            fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: '#94a3b8'
          }}
        >
          LOADING
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
    // A chunk that cannot be fetched is almost always transient (offline blip,
    // proxy hiccup, or a stale tab holding pre-deploy asset names). Reload once
    // automatically instead of parking the operator on a crash screen.
    if (isChunkLoadError(error)) {
      try {
        const last = Number(sessionStorage.getItem('chunkReloadAt') || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem('chunkReloadAt', String(Date.now()));
          window.location.reload();
        }
      } catch (e) {
        // sessionStorage unavailable: fall through to the manual reload screen.
      }
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
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
              Master Command Center Encountered a Problem
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '9px',
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

function RequireAuth({ children }) {
  const location = useLocation();
  if (IS_DESKTOP || !AUTH_REQUIRED) return children;
  if (getSession()) return children;
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`/login?next=${next}`} replace />;
}

function LogoutRoute() {
  React.useEffect(() => { logout(); }, []);
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1.5px solid #e2e8f0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 650,
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* LeadHarvest Master Command Center */}
          <Route path="/" element={<RequireAuth><CommandCenter isMaster /></RequireAuth>} />
          <Route path="/master" element={<RequireAuth><CommandCenter isMaster /></RequireAuth>} />
          <Route path="/command" element={<RequireAuth><CommandCenter isMaster /></RequireAuth>} />
          <Route path="/login" element={<LoginV2 variant="master" />} />
          <Route path="/logout" element={<LogoutRoute />} />
          <Route path="/landing" element={<LandingV2 />} />
          <Route path="/whatsapp" element={<Navigate to="/command" replace />} />
          <Route path="/clients" element={<MasterClients />} />
          <Route path="/learning" element={<LearningRoute />} />
          <Route path="/theater" element={<TheaterRoute />} />
          <Route path="/engines" element={<Navigate to="/command?tab=engines" replace />} />
          <Route path="/terminal" element={<Navigate to="/command?tab=terminal" replace />} />

          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Old URLs all land in the one workspace. */}
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
