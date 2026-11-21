import React from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="lx-minimal-footer">
      <div className="lx-wrap" style={{ maxWidth: 1180 }}>
        <div className="lx-minimal-footer-inner">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <BrandLogo size={28} theme="light" />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              © {new Date().getFullYear()} Scraper.co.in · Engineered in India · 11 Sovereign Revenue Markets
            </span>
          </span>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <button type="button" onClick={() => navigate('/pricing')} className="lx-footer-link">Pricing</button>
            <button type="button" onClick={() => navigate('/login')} className="lx-footer-link">Sign In</button>
            <button type="button" onClick={() => navigate('/terms')} className="lx-footer-link">Terms</button>
            <button type="button" onClick={() => navigate('/privacy')} className="lx-footer-link">Privacy</button>
          </div>
        </div>

        {/* Legal Brand Protection / Trademark Compliance Disclaimer */}
        <div className="lx-nex-legal-disclaimer">
          <strong>Legal &amp; Trademark Compliance Notice:</strong> Scraper.co.in is an independent commercial intelligence software platform and search index designed for discovering publicly accessible commercial business records, open mapping points of interest (POI), and public corporate contact registries. All brand names, trade names, service marks, and logos referenced across public documentation are the intellectual property of their respective owners and are used purely for nominative and identification purposes. Scraper.co.in is not affiliated with, endorsed by, or sponsored by any third-party directory, search engine, or mapping provider. All data extraction operations are executed solely against publicly available data in compliance with automated rate-limiting protocols and local fair-use standards.
        </div>
      </div>
    </footer>
  );
}
