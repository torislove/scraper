import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AdminNavbar from './AdminNavbar';
import AdminDockControls from './AdminDockControls';
import AnimatedLiquidBackground from './AnimatedLiquidBackground';

const ROUTES_ORDER = [
  '/', '/customers', '/trending', '/data-vault', '/popups', '/countries', '/clients'
];

const pageVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 32 : -32,
    scale: 0.985
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 32,
      mass: 0.78
    }
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -28 : 28,
    scale: 0.985,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

export default function AdminLayout() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [routePulseKey, setRoutePulseKey] = useState(0);

  const prevIndex = ROUTES_ORDER.indexOf(prevPathRef.current);
  const currIndex = ROUTES_ORDER.indexOf(location.pathname);
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevPathRef.current = location.pathname;

  useEffect(() => {
    setRoutePulseKey((k) => k + 1);
  }, [location.pathname]);

  return (
    <div className="lx-single-viewport">
      {/* 1. Ambient Champagne & Liquid 3D Gold Background */}
      <AnimatedLiquidBackground />

      {/* 2. Flagship Glassmorphic Navigation (60px) */}
      <AdminNavbar />

      {/* 2.1 Molten Liquid Gold Route Progress Hairline */}
      <motion.div
        key={`admin-gold-${routePulseKey}`}
        initial={{ scaleX: 0, opacity: 0.95 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 59,
          left: 0,
          right: 0,
          height: 2,
          transformOrigin: 'left center',
          background: 'linear-gradient(90deg, #b45309 0%, #f59e0b 45%, #fde68a 80%, #d97706 100%)',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.75)',
          zIndex: 60,
          pointerEvents: 'none'
        }}
      />

      {/* 3. Center Stage with GPU-Accelerated Spring Choreography */}
      <main
        id="main-content"
        className="lx-single-stage"
        style={{ padding: '18px 24px 20px', overflowY: 'auto', alignItems: 'flex-start' }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              width: '100%',
              maxWidth: 1320,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. Single-Screen Bottom Dock & Keyboard Screen Switcher (56px) */}
      <AdminDockControls />
    </div>
  );
}