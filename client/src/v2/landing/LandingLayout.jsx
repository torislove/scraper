import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingNavbar from './LandingNavbar';
import LandingFooter from './LandingFooter';
import ScrollProgress from './ScrollProgress';
import '../landingExecutive.css';
import '../landingCloud.css';

export default function LandingLayout({ children }) {
  const location = useLocation();

  return (
    <div className="lx-landing is-nexera">
      <ScrollProgress />
      <LandingNavbar />

      <main id="main-content" style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 140px)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      <LandingFooter />
    </div>
  );
}
