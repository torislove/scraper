import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeDashboard from './EmployeeDashboard';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import ScraperDashboard from './ScraperDashboard';
import LoginPage from './pages/Login';

// Dashboard sub-pages (loaded by ScraperDashboard via DashboardLayout <Outlet />)
import OverviewPage from './pages/dashboard/Overview';
import LeadsPage from './pages/dashboard/Leads';
import AutomationsPage from './pages/dashboard/Automations';
import SettingsPage from './pages/dashboard/Settings';
import UsersPage from './pages/dashboard/Users';
import OutOfBoundsPage from './pages/dashboard/OutOfBounds';
import Marketplace from './pages/Marketplace';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PhoneScraper from './pages/products/PhoneScraper';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('indiascraper_client_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('indiascraper_client_user');
    setUser(null);
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e1b4b', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600 },
          success: { iconTheme: { primary: '#7c3aed', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/marketplace" element={<Marketplace />} />

        <Route path="/products/phone-scraper" element={<PhoneScraper />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={user ? <Navigate to="/app/overview" replace /> : <LoginPage onLogin={setUser} />} />

        {/* Protected dashboard — ScraperDashboard wraps DashboardLayout which renders <Outlet /> */}
        <Route path="/app/*" element={
          user ? <ScraperDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }>
          {/* Sub-routes rendered inside DashboardLayout's <Outlet /> */}
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="out-of-bounds" element={<OutOfBoundsPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          {user?.role === 'admin' && <Route path="users" element={<UsersPage />} />}
          {user?.role === 'admin' && <Route path="settings" element={<SettingsPage />} />}
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
