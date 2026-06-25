// ─────────────────────────────────────────────────────────────────────────────
// Frontend Queue Orchestrator (in-memory FIFO with LocalStorage recovery)
// Replaces BullMQ and server-side scraping queue.
// Runs purely inside the React frontend.
// ─────────────────────────────────────────────────────────────────────────────

import { scrapeJustDial } from './engines/justdial';
import { scrapeGoogleSerp } from './engines/googleSerp';
import { scrapeWeddingBazaar } from './engines/weddingBazaar';
import { scrapeWeddingWire } from './engines/weddingWire';
import { scrapeMandap } from './engines/mandap';
import { API_URL } from '../apiConfig';

const ENGINES = {
  google: scrapeGoogleSerp,
  justdial: scrapeJustDial,
  weddingbazaar: scrapeWeddingBazaar,
  weddingwire: scrapeWeddingWire,
  mandap: scrapeMandap
};

export class FrontendQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.onLog = options.onLog || (() => {});
    this.onResult = options.onResult || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onActivePointsChange = options.onActivePointsChange || (() => {});
    this.onGridPointsChange = options.onGridPointsChange || (() => {});
    
    this.jobs = [];
    this.isActive = false;
    this.completedCount = 0;
    this.activeWorkers = new Set();
    this.activePoints = [];
    this.loadQueue();
  }

  loadQueue() {
    try {
      const saved = localStorage.getItem('gomandap_frontend_queue');
      if (saved) {
        const data = JSON.parse(saved);
        this.jobs = data.jobs || [];
        this.completedCount = data.completedCount || 0;
      }
    } catch (e) {
      this.jobs = [];
      this.completedCount = 0;
    }
  }

  saveQueue() {
    try {
      localStorage.setItem('gomandap_frontend_queue', JSON.stringify({
        jobs: this.jobs,
        completedCount: this.completedCount
      }));
    } catch (e) {}
  }

  enqueue(newJobs) {
    this.jobs.push(...newJobs.map(job => ({
      id: job.id || Math.random().toString(36).substring(7),
      status: 'pending',
      ...job
    })));
    this.saveQueue();
    this.onStatusChange();
  }

  async start() {
    if (this.isActive) return;
    this.isActive = true;
    this.onLog('[Frontend Queue] Queue execution started.');
    this.onStatusChange();
    this.processNext();
  }

  stop() {
    this.isActive = false;
    this.jobs = [];
    this.completedCount = 0;
    this.activeWorkers.clear();
    this.activePoints = [];
    this.saveQueue();
    this.onActivePointsChange([]);
    this.onGridPointsChange([]);
    this.onStatusChange();
    this.onLog('[Frontend Queue] Queue execution stopped.');
  }

  async processNext() {
    if (!this.isActive) return;
    
    const pendingJobs = this.jobs.filter(j => j.status === 'pending');
    const runningJobsCount = this.jobs.filter(j => j.status === 'running').length;
    
    if (pendingJobs.length === 0 && runningJobsCount === 0) {
      this.isActive = false;
      this.onStatusChange();
      this.onLog('[Frontend Queue] All tasks completed.');
      return;
    }

    const availableSlots = this.concurrency - runningJobsCount;
    if (availableSlots <= 0) return;

    const jobsToStart = pendingJobs.slice(0, availableSlots);
    jobsToStart.forEach(job => {
      this.runJob(job);
    });
  }

  async runJob(job) {
    job.status = 'running';
    this.saveQueue();
    this.onStatusChange();

    // Allocate worker/instance slot
    let workerId = 1;
    while (this.activeWorkers.has(workerId)) {
      workerId++;
    }
    this.activeWorkers.add(workerId);

    // Update active coordinates on map
    const activePoint = {
      instanceId: workerId,
      locationName: job.centerLoc || job.location,
      lat: job.lat || null,
      lng: job.lng || null
    };
    this.activePoints.push(activePoint);
    this.onActivePointsChange([...this.activePoints]);

    const engineFn = ENGINES[job.platform];
    this.onLog(`[Frontend Queue] Worker ${workerId} started: ${job.platform} for "${job.category}" in "${job.location}"`);

    try {
      if (!engineFn) {
        throw new Error(`Platform engine "${job.platform}" not supported`);
      }

      // Execute scraper engine with 3 minute timeout
      const resultPromise = engineFn(job.category, job.location, (msg) => {
        this.onLog(`[Worker ${workerId}] ${msg}`);
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout after 3 minutes')), 180000)
      );

      const results = await Promise.race([resultPromise, timeoutPromise]);
      
      job.status = 'completed';
      this.completedCount++;

      if (results && results.length > 0) {
        this.onLog(`[Frontend Queue] Worker ${workerId} found ${results.length} leads. Saving...`);
        await this.saveResultsToBackend(results);
        this.onResult(results);
      } else {
        this.onLog(`[Frontend Queue] Worker ${workerId} found 0 leads.`);
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      this.completedCount++;
      this.onLog(`[Frontend Queue] Worker ${workerId} failed: ${error.message}`);
    } finally {
      // Cleanup worker
      this.activeWorkers.delete(workerId);
      this.activePoints = this.activePoints.filter(p => p.instanceId !== workerId);
      this.onActivePointsChange([...this.activePoints]);
      
      this.saveQueue();
      this.onStatusChange();

      // Add a slight delay to avoid IP blocking
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Continue next job
      this.processNext();
    }
  }

  async saveResultsToBackend(results) {
    try {
      // Post all scraped items to backend /api/vendors
      const response = await fetch(`${API_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(results)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.onLog(`[Frontend Queue] Saved ${data.inserted} new/updated vendors in database.`);
    } catch (e) {
      this.onLog(`[ERROR] Failed to save results to backend: ${e.message}`);
    }
  }
}
