import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingNavbar from './LandingNavbar';
import LandingDockControls from './LandingDockControls';
import AnimatedLiquidBackground from '../components/AnimatedLiquidBackground';
import '../landingExecutive.css';
import '../landingCloud.css';
import '../landingSingleScreen.css';

export default function LandingLayout({ children }) {
  const location = useLocation();

  return (
    <div className="lx-single-viewport">
      {/* 1. Mesmerizing Ambient Liquid & Stardust Background */}
      <AnimatedLiquidBackground />

      {/* 2. Sleek Fixed Glassmorphic Navigation (60px) */}
      <LandingNavbar />

      {/* 3. Center Stage with Cinematic Directional Transitions */}
      <main id="main-content" className="lx-single-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -14 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
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

      {/* 4. Single-Screen Bottom Dock & Keyboard Screen Switcher (56px) */}
      <LandingDockControls />
    </div>
  );
}
