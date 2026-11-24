const os = require('os');

class ConcurrencyPool {
  /**
   * @param {number} maxConcurrent - Maximum concurrent tasks (default auto-tuned by CPU cores)
   */
  constructor(maxConcurrent = null) {
    const cores = os.cpus()?.length || 4;
    this.maxConcurrent = maxConcurrent || Math.min(Math.max(cores * 2, 4), 12);
    this.activeTasks = 0;
    this.queue = [];
    this.metrics = {
      totalSubmitted: 0,
      totalCompleted: 0,
      totalFailed: 0,
      peakConcurrent: 0
    };
  }

  /**
   * Executes an async task respecting concurrency limits.
   */
  async run(taskFn) {
    this.metrics.totalSubmitted++;

    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.activeTasks++;
        this.metrics.peakConcurrent = Math.max(this.metrics.peakConcurrent, this.activeTasks);

        try {
          const result = await taskFn();
          this.metrics.totalCompleted++;
          resolve(result);
        } catch (error) {
          this.metrics.totalFailed++;
          reject(error);
        } finally {
          this.activeTasks--;
          this.next();
        }
      };

      if (this.activeTasks < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  /**
   * Runs an array of task functions concurrently in the pool,
   * triggering progress callbacks as tasks finish.
   */
  async runBatch(taskFns, onProgress = null) {
    let completed = 0;
    const total = taskFns.length;
    const results = [];

    const promises = taskFns.map((fn, idx) => {
      return this.run(async () => {
        const res = await fn();
        completed++;
        results[idx] = res;
        if (onProgress) {
          onProgress({ completed, total, percentage: Math.round((completed / total) * 100) });
        }
        return res;
      });
    });

    await Promise.allSettled(promises);
    return results;
  }

  next() {
    if (this.queue.length > 0 && this.activeTasks < this.maxConcurrent) {
      const nextFn = this.queue.shift();
      nextFn();
    }
  }

  /**
   * Wait for all active and queued tasks to settle.
   */
  async drain() {
    while (this.activeTasks > 0 || this.queue.length > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  get active() {
    return this.activeTasks;
  }

  get queued() {
    return this.queue.length;
  }

  get stats() {
    return {
      active: this.activeTasks,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      ...this.metrics
    };
  }
}

// Global shared default pool
const defaultPool = new ConcurrencyPool();

module.exports = {
  ConcurrencyPool,
  defaultPool
};
