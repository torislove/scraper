import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './Login';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';

// Public pages
import Marketplace from './pages/Marketplace';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PhoneScraper from './pages/products/PhoneScraper';

// Dashboard Components
import ScraperDashboard from './ScraperDashboard';
import OverviewPage from './pages/dashboard/Overview';
import LeadsPage from './pages/dashboard/Leads';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gomandap_scraper_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('gomandap_scraper_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gomandap_scraper_user');
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
        <Route path="/pricing" element={<PricingPage user={user} />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/products/phone-scraper" element={<PhoneScraper />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/app/scraper" replace />} />

        {/* Dashboard Routes (Protected) */}
        {/* ScraperDashboard acts as the Context Provider AND the Layout Wrapper */}
        <Route path="/app" element={user ? <ScraperDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
           <Route path="scraper" element={<OverviewPage />} />
           <Route path="leads" element={<LeadsPage />} />
           <Route path="billing" element={<PricingPage user={user} isDashboard={true} />} />
           <Route index element={<Navigate to="scraper" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
