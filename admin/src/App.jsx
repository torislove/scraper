import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// import Login from './Login'; // Ripped out login
import EmployeeDashboard from './EmployeeDashboard';
import ScraperDashboard from './ScraperDashboard';

// Dashboard sub-pages
import OverviewPage from './pages/dashboard/Overview';
import LeadsPage from './pages/dashboard/Leads';
import AutomationsPage from './pages/dashboard/Automations';
import SettingsPage from './pages/dashboard/Settings';
import UsersPage from './pages/dashboard/Users';
import LocationIntelligencePage from './pages/dashboard/LocationIntelligence';

export default function App() {
  // Bypass login completely, always be an admin
  const user = { username: 'admin', role: 'admin' };

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
        {/* Bypass login and redirect straight to dashboard */}
        <Route path="/login" element={<Navigate to="/app/overview" replace />} />
        <Route path="/" element={<Navigate to="/app/overview" replace />} />

        {/* Protected dashboard — ScraperDashboard wraps DashboardLayout which renders <Outlet /> */}
        <Route path="/app/*" element={
          user.role === 'admin'
            ? <ScraperDashboard user={user} onLogout={() => {}} />
            : <EmployeeDashboard user={user} onLogout={() => {}} />
        }>
          {/* Sub-routes rendered inside DashboardLayout's <Outlet /> */}
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="locations" element={<LocationIntelligencePage />} />
          {user?.role === 'admin' && <Route path="users" element={<UsersPage />} />}
          {user?.role === 'admin' && <Route path="settings" element={<SettingsPage />} />}
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/app/overview" replace />} />
      </Routes>
    </>
  );
}
