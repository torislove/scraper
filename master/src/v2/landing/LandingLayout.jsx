import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingNavbar from './LandingNavbar';
import AnimatedLiquidBackground from '../components/AnimatedLiquidBackground';
import CommandPalette from '../components/CommandPalette';
import '../landingExecutive.css';
import '../landingCloud.css';
import '../landingSingleScreen.css';

const ROUTES_ORDER = ['/', '/architecture', '/global-coverage', '/story'];

const pageVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 24 : -24,
    scale: 0.99
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 32,
      mass: 0.72
    }
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

export default function LandingLayout({ children }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [routePulseKey, setRoutePulseKey] = useState(0);

  const prevIndex = Math.max(0, ROUTES_ORDER.indexOf(prevPathRef.current));
  const currIndex = Math.max(0, ROUTES_ORDER.indexOf(location.pathname));
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevPathRef.current = location.pathname;

  useEffect(() => {
    setRoutePulseKey((k) => k + 1);
  }, [location.pathname]);

  return (
    <div className="lx-single-viewport">
      <AnimatedLiquidBackground />

      <LandingNavbar />

      {/* Molten Liquid Gold Route Transition Hairline */}
      <motion.div
        key={`gold-bar-${routePulseKey}`}
        initial={{ scaleX: 0, opacity: 0.95 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 59,
          left: 0,
          right: 0,
          height: 2,
          transformOrigin: 'left center',
          background: 'linear-gradient(90deg, #b45309 0%, #f59e0b 45%, #fde68a 80%, #d97706 100%)',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.7)',
          zIndex: 60,
          pointerEvents: 'none'
        }}
      />

      <main id="main-content" className="lx-single-stage">
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette />
    </div>
  );
}
