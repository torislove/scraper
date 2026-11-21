import React, { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingNavbar from './LandingNavbar';
import LandingDockControls from './LandingDockControls';
import AnimatedLiquidBackground from '../components/AnimatedLiquidBackground';
import '../landingExecutive.css';
import '../landingCloud.css';
import '../landingSingleScreen.css';

const ROUTES_ORDER = ['/', '/solutions', '/architecture', '/global-coverage', '/hardware'];

const pageVariants = {
  enter: (direction) => ({
    opacity: 0,
    rotateY: direction > 0 ? 10 : -10,
    translateZ: -70,
    x: direction > 0 ? 45 : -45,
    filter: 'blur(4px)'
  }),
  center: {
    opacity: 1,
    rotateY: 0,
    translateZ: 0,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 28,
      mass: 0.8
    }
  },
  exit: (direction) => ({
    opacity: 0,
    rotateY: direction > 0 ? -10 : 10,
    translateZ: -70,
    x: direction > 0 ? -45 : 45,
    filter: 'blur(4px)',
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

export default function LandingLayout({ children }) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const prevIndex = ROUTES_ORDER.indexOf(prevPathRef.current);
  const currIndex = ROUTES_ORDER.indexOf(location.pathname);
  const direction = currIndex >= prevIndex ? 1 : -1;
  prevPathRef.current = location.pathname;

  return (
    <div className="lx-single-viewport">
      {/* 1. Mesmerizing Ambient Liquid & Stardust Background */}
      <AnimatedLiquidBackground />

      {/* 2. Sleek Fixed Glassmorphic Navigation (60px) */}
      <LandingNavbar />

      {/* 3. Center Stage with 3D PERSPECTIVE DEPTH CHOREOGRAPHY */}
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
              position: 'relative',
              transformStyle: 'preserve-3d'
            }}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. Single-Screen Bottom Dock & Keyboard Screen Switcher (56px) */}
      <LandingDockControls />
    </div>
  );
}
