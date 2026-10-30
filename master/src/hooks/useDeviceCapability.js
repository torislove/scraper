import { useState, useEffect } from 'react';

/**
 * Hardware and Network Adaptive Capability Hook
 * Detects device hardware (CPU cores, RAM, network speed, touch)
 * to adjust UI rendering budgets, animation complexity, and scraping concurrency.
 */
export function useDeviceCapability() {
  const [capabilities, setCapabilities] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        cpuCores: 4,
        memoryGB: 4,
        connection: '4g',
        saveData: false,
        prefersReducedMotion: false,
        recommendedBatchSize: 8,
      };
    }

    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const cpuCores = navigator.hardwareConcurrency || 4;
    const memoryGB = navigator.deviceMemory || 4;
    const navConn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const connection = navConn?.effectiveType || '4g';
    const saveData = Boolean(navConn?.saveData);
    const prefersReducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    // Recommend concurrency batch size based on hardware
    let recommendedBatchSize = 8;
    if (isMobile || memoryGB <= 2 || cpuCores <= 2 || connection === '2g' || connection === '3g') {
      recommendedBatchSize = 3;
    } else if (cpuCores >= 8 && memoryGB >= 8 && connection === '4g') {
      recommendedBatchSize = 12;
    }

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      cpuCores,
      memoryGB,
      connection,
      saveData,
      prefersReducedMotion,
      recommendedBatchSize,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setCapabilities(prev => ({
        ...prev,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return capabilities;
}

export default useDeviceCapability;
