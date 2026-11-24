import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Laptop, Server } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AdminNavbar() {
  const [engineAlive, setEngineAlive] = useState(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        if (alive) setEngineAlive(res.ok);
      } catch (e) {
        if (alive) setEngineAlive(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { to: '/', label: '01 Overview', end: true },
    { to: '/customers', label: '02 Customers' },
    { to: '/trending', label: '03 Trending' },
    { to: '/data-vault', label: '04 Data Vault' },
    { to: '/popups', label: '05 Popups' },
    { to: '/countries', label: '06 11 Nations' },
    { to: '/clients', label: '07 Clients' }
  ];

  return (
    <header className="lx-single-nav" style={{ zIndex: 40 }}>
      <div className="lx-single-nav-inner" style={{ maxWidth: 1380, padding: '0 20px' }}>
        {/* Zone 1 (Left): Golden Brand */}
        <NavLink to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <BrandLogo size={32} />
        </NavLink>

        {/* Zone 2 (Center): Liquid 3D Gold Navigation Capsule */}
        <nav
          aria-label="Admin Navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '4px',
            borderRadius: 999,
            background: 'rgba(255, 251, 235, 0.72)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.95)'
          }}
        >
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                position: 'relative',
                textDecoration: 'none',
                fontSize: 11.5,
                fontWeight: isActive ? 850 : 650,
                color: isActive ? '#92400e' : '#475569',
                padding: '5px 11px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                transition: 'color 0.16s ease'
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="adminGoldNavPill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
                        border: '1.5px solid rgba(217, 119, 6, 0.45)',
                        boxShadow: '0 2px 10px rgba(217, 119, 6, 0.18)',
                        zIndex: 0
                      }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3 (Right): Live Telemetry + Master & Client Launchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: engineAlive ? '#ecfdf5' : '#fef2f2',
              border: engineAlive ? '1px solid #a7f3d0' : '1px solid #fecaca',
              fontSize: 10.5,
              fontWeight: 800,
              color: engineAlive ? '#047857' : '#b91c1c'
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: engineAlive ? '#10b981' : '#ef4444',
                boxShadow: engineAlive ? '0 0 8px #10b981' : 'none'
              }}
            />
            <span>{engineAlive ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          <a
            href="http://localhost:5174/command"
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 9,
              background: '#0b1120',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              color: '#fde68a',
              fontSize: 11,
              fontWeight: 750,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
            title="Open Master Fleet Command (Port 5174)"
          >
            <Server size={11} color="#fbbf24" />
            <span>Master Fleet</span>
            <ExternalLink size={10} />
          </a>

          <a
            href="http://localhost:5173/command"
            target="_blank"
            rel="noreferrer"
            className="admin-btn-gold"
            style={{
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
            title="Open Client Cockpit (Port 5173)"
          >
            <Laptop size={11} />
            <span>Client Cockpit</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </header>
  );
}