import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PricingPage from './pages/PricingPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { IS_DESKTOP } from './desktop';
import './v2/v2.css';

// scraper.co.in has exactly one workspace: the command center.
const LandingV2 = lazy(() => import('./v2/LandingV2'));
const CommandCenter = lazy(() => import('./v2/CommandCenter'));

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

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1526',
            color: '#e6edf7',
            border: '1px solid rgba(37,99,235,0.3)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(2,6,23,0.55)',
          },
          success: { iconTheme: { primary: '#22d3ee', secondary: '#0d1526' } },
          error: { iconTheme: { primary: '#fb7185', secondary: '#0d1526' } },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* The Windows build has no marketing site: it opens the workspace. */}
          <Route path="/" element={IS_DESKTOP ? <Navigate to="/command" replace /> : <LandingV2 />} />
          <Route path="/command" element={<CommandCenter />} />

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
    </>
  );
}
