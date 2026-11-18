import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PricingPage from './pages/PricingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { IS_DESKTOP } from './desktop';
import { lazyRetry, isChunkLoadError } from './v2/lazyRetry';
import '@ui3d/tokens.css';
import '@ui3d/kit.css';
import './v2/v2.css';
import './v2/ui3d.css';
import './v2/revamp.css';
import './v2/glass3d.css';
import './v2/whiteTheme.css';
import './v2/retroEmboss.css';

// scraper.co.in has exactly one workspace: the command center.
// lazyRetry keeps a single flaky chunk download from taking down the workspace.
const LandingV2 = lazyRetry(() => import('./v2/LandingV2'));
const CommandCenter = lazyRetry(() => import('./v2/CommandCenter'));
// Dev-only surface gallery. `import.meta.env.DEV` is statically false in every
// build, so this import is removed from production and desktop bundles.
const Lab = import.meta.env.DEV ? lazyRetry(() => import('./v2/Lab')) : null;

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
    console.error('App Uncaught Error:', error, errorInfo);
    // A chunk that cannot be fetched is almost always transient (offline blip,
    // proxy hiccup, or a stale tab holding pre-deploy asset names). Reload once
    // automatically instead of parking the user on a crash screen.
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
              Workspace Encountered a Problem
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
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* The Windows build has no marketing site: it opens the workspace. */}
          <Route path="/" element={IS_DESKTOP ? <Navigate to="/command" replace /> : <LandingV2 />} />
          <Route path="/command" element={<CommandCenter />} />
          {import.meta.env.DEV && Lab ? <Route path="/lab" element={<Lab />} /> : null}

          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Old URLs all land in the one workspace. */}
          <Route path="/login" element={<Navigate to="/command" replace />} />
          <Route path="/app/*" element={<Navigate to="/command" replace />} />
          <Route path="/marketplace/*" element={<Navigate to="/command" replace />} />
          <Route path="/landing-legacy" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
          <Route path="*" element={<Navigate to={IS_DESKTOP ? '/command' : '/'} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
