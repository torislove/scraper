import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';

const AdminOverview = lazy(() => import('./views/AdminOverview'));
const AdminCustomers = lazy(() => import('./views/AdminCustomers'));
const AdminTrending = lazy(() => import('./views/AdminTrending'));
const AdminDataVault = lazy(() => import('./views/AdminDataVault'));
const AdminPopupStudio = lazy(() => import('./views/AdminPopupStudio'));
const AdminCountries = lazy(() => import('./views/AdminCountries'));
const AdminClients = lazy(() => import('./views/AdminClients'));

function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(5, 150, 105, 0.2)',
          borderTopColor: '#059669',
          animation: 'v2-spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.14em' }}>
        LOADING ADMIN CONSOLE
      </span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="trending" element={<AdminTrending />} />
          <Route path="data-vault" element={<AdminDataVault />} />
          <Route path="popups" element={<AdminPopupStudio />} />
          <Route path="countries" element={<AdminCountries />} />
          <Route path="clients" element={<AdminClients />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
