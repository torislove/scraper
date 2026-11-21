import React from 'react';
import { motion, useScroll } from 'framer-motion';

/**
 * Top viewport 2.5px electric-blue scroll progress indicator.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, #007aff 0%, #14b8a6 50%, #3355ff 100%)',
        transformOrigin: '0%',
        scaleX: scrollYProgress,
        zIndex: 100,
        boxShadow: '0 0 10px rgba(0, 122, 255, 0.6)'
      }}
    />
  );
}
