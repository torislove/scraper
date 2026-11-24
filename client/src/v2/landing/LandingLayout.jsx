import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingNavbar from './LandingNavbar';
import LandingDockControls from './LandingDockControls';
import AnimatedLiquidBackground from '../components/AnimatedLiquidBackground';
import SocialProofSlideIn from '../components/popups/SocialProofSlideIn';
import CommandPalette from '../components/CommandPalette';
import '../landingExecutive.css';
import '../landingCloud.css';
import '../landingSingleScreen.css';

const ROUTES_ORDER = ['/', '/solutions', '/architecture', '/global-coverage', '/hardware', '/story'];

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

export default function LandingLayout({ children }) {
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
      {/* 1. Ambient Champagne & Liquid 3D Gold Stardust Background */}
      <AnimatedLiquidBackground />

      {/* 2. Flagship 3-Zone Liquid 3D Gold Navigation Header (60px) */}
      <LandingNavbar />

      {/* 2.1 Molten Liquid Gold Route Transition Progress Hairline */}
      <motion.div
        key={`gold-bar-${routePulseKey}`}
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
              height: '100%',
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

      {/* 4. Non-disruptive Live Extraction Social Proof Slide-in */}
      <SocialProofSlideIn />

      {/* 5. Global Ctrl+K / Cmd+K Liquid 3D Gold Command Palette */}
      <CommandPalette />

      {/* 6. Single-Screen Bottom Dock & Keyboard Screen Switcher (56px) */}
      <LandingDockControls />
    </div>
  );
}