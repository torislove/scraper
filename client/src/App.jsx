import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeDashboard from './EmployeeDashboard';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import ScraperDashboard from './ScraperDashboard';
import LoginPage from './pages/Login';

// Dashboard sub-pages
import OverviewPage from './pages/dashboard/Overview';
import LeadsPage from './pages/dashboard/Leads';
import AutomationsPage from './pages/dashboard/Automations';


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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/app/overview" replace /> : <LoginPage onLogin={setUser} />} />

        {/* Protected dashboard — ScraperDashboard wraps DashboardLayout which renders <Outlet /> */}
        <Route path="/app/*" element={
          user ? <ScraperDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        }>
          {/* Sub-routes rendered inside DashboardLayout's <Outlet /> */}
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
