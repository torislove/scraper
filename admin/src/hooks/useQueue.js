// ─────────────────────────────────────────────────────────────────────────────
// useQueue React Hook (Frontend Scraper Orchestration)
// Connects the in-memory FrontendQueue to React component state.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { FrontendQueue } from '../utils/FrontendQueue';

export function useQueue(onLog, onResult) {
  const [queueState, setQueueState] = useState({
    jobs: [],
    isActive: false,
    completedCount: 0
  });
  
  const [activePoints, setActivePoints] = useState([]);
  const [gridPoints, setGridPoints] = useState([]);
  
  const queueInstanceRef = useRef(null);

  if (!queueInstanceRef.current) {
    queueInstanceRef.current = new FrontendQueue({
      concurrency: 3,
      onLog: (msg) => {
        if (onLog) onLog(msg);
      },
      onResult: (res) => {
        if (onResult) onResult(res);
      },
      onStatusChange: () => {
        if (queueInstanceRef.current) {
          setQueueState({
            jobs: [...queueInstanceRef.current.jobs],
            isActive: queueInstanceRef.current.isActive,
            completedCount: queueInstanceRef.current.completedCount
          });
        }
      },
      onActivePointsChange: (pts) => {
        setActivePoints(pts);
      },
      onGridPointsChange: (pts) => {
        setGridPoints(pts);
      }
    });
  }

  const enqueue = useCallback((newJobs) => {
    queueInstanceRef.current.enqueue(newJobs);
  }, []);

  const start = useCallback(() => {
    queueInstanceRef.current.start();
  }, []);

  const stop = useCallback(() => {
    queueInstanceRef.current.stop();
  }, []);

  return {
    queue: queueState.jobs,
    isActive: queueState.isActive,
    completed: queueState.completedCount,
    total: queueState.jobs.length,
    activePoints,
    setActivePoints,
    gridPoints,
    setGridPoints,
    enqueue,
    start,
    stop
  };
}
