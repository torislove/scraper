'use strict';

/**
 * hardwareSafety.js
 * OS-Aware Hardware Telemetry & Dynamic Concurrency Scaler.
 * Scales zone, Gosom, Direct-RPC, and enrichment pools dynamically from 8 GB to 64 GB+
 * while reserving 3.5 - 6 GB for Windows OS stability.
 */

const os = require('os');

class HardwareSafetyEngine {
  static getProfile() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const totalGb = totalBytes / (1024 ** 3);
    const freeGb = freeBytes / (1024 ** 3);
    const freeRatio = freeBytes / totalBytes;
    const cpuCores = os.cpus()?.length || 4;

    if (freeRatio < 0.12 || freeGb < 1.2) {
      return {
        tier: 'emergency_throttle',
        totalGb: totalGb.toFixed(1),
        freeGb: freeGb.toFixed(1),
        zoneConcurrency: 1,
        gosomConcurrency: 2,
        gmapDirectConcurrency: 1,
        directoryConcurrency: 1,
        webEnrichWorkers: 8,
        huntWorkers: 4,
        totalSlots: 3,
        isThrottled: true,
        message: 'System RAM low: throttled to 1 worker to protect OS'
      };
    }

    if (totalGb >= 56 && freeGb >= 24) {
      const workers = Math.min(12, Math.max(8, Math.floor(cpuCores * 0.65)));
      return {
        tier: '64gb_ultra_parallel',
        totalGb: totalGb.toFixed(1),
        freeGb: freeGb.toFixed(1),
        zoneConcurrency: 12,
        gosomConcurrency: workers,
        gmapDirectConcurrency: 6,
        directoryConcurrency: 8,
        webEnrichWorkers: 96,
        huntWorkers: 32,
        totalSlots: workers + 12,
        isThrottled: false,
        message: `Ultra 64GB mode: 12 parallel zones x ${workers} workers active`
      };
    }

    if (totalGb >= 28 && freeGb >= 12) {
      const workers = Math.min(10, Math.max(8, Math.floor(cpuCores * 0.55)));
      return {
        tier: '32gb_mega_parallel',
        totalGb: totalGb.toFixed(1),
        freeGb: freeGb.toFixed(1),
        zoneConcurrency: 8,
        gosomConcurrency: workers,
        gmapDirectConcurrency: 5,
        directoryConcurrency: 6,
        webEnrichWorkers: 64,
        huntWorkers: 24,
        totalSlots: workers + 8,
        isThrottled: false,
        message: `High-performance 32GB mode: 8 parallel zones x ${workers} workers active`
      };
    }

    if (totalGb >= 14 && freeGb >= 6) {
      const workers = Math.min(8, Math.max(6, Math.floor(cpuCores * 0.5)));
      return {
        tier: '16gb_turbo_parallel',
        totalGb: totalGb.toFixed(1),
        freeGb: freeGb.toFixed(1),
        zoneConcurrency: 5,
        gosomConcurrency: workers,
        gmapDirectConcurrency: 4,
        directoryConcurrency: 4,
        webEnrichWorkers: 40,
        huntWorkers: 16,
        totalSlots: workers + 5,
        isThrottled: false,
        message: `Turbo 16GB mode: 5 parallel zones x ${workers} workers active`
      };
    }

    if (totalGb >= 7.5 && freeGb >= 2.0) {
      return {
        tier: '8gb_standard',
        totalGb: totalGb.toFixed(1),
        freeGb: freeGb.toFixed(1),
        zoneConcurrency: 3,
        gosomConcurrency: 6,
        gmapDirectConcurrency: 3,
        directoryConcurrency: 3,
        webEnrichWorkers: 24,
        huntWorkers: 10,
        totalSlots: 9,
        isThrottled: false,
        message: 'Standard 8GB mode: 3 parallel zones x 6 workers active'
      };
    }

    return {
      tier: 'eco_low_ram',
      totalGb: totalGb.toFixed(1),
      freeGb: freeGb.toFixed(1),
      zoneConcurrency: 1,
      gosomConcurrency: 4,
      gmapDirectConcurrency: 2,
      directoryConcurrency: 1,
      webEnrichWorkers: 12,
      huntWorkers: 6,
      totalSlots: 5,
      isThrottled: false,
      message: 'Eco mode: 1 zone x 4 workers active'
    };
  }

  static async enforceSafetyPause() {
    const freeBytes = os.freemem();
    const totalBytes = os.totalmem();
    if ((freeBytes / totalBytes) < 0.12 || (freeBytes / (1024 ** 3)) < 1.2) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return true;
    }
    return false;
  }

  static getLiveTelemetry(extra = {}) {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const mem = process.memoryUsage();
    const profile = HardwareSafetyEngine.getProfile();
    return {
      timestamp: Date.now(),
      serverRamMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      osTotalGb: Number((totalBytes / (1024 ** 3)).toFixed(1)),
      osFreeGb: Number((freeBytes / (1024 ** 3)).toFixed(1)),
      osUsedPct: Math.round((usedBytes / totalBytes) * 100),
      cpuCores: os.cpus()?.length || 4,
      tier: profile.tier,
      zoneConcurrency: profile.zoneConcurrency,
      ...extra
    };
  }
}

module.exports = HardwareSafetyEngine;
