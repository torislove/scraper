import { useState, useEffect, useRef, useCallback } from 'react';
import { createLiveStream } from '../liveStream';
import { streamUrl, fallbackStreamUrl, getHealth, startAuto, stopAllScrapes } from '../api';

/**
 * useSweepStream.js
 *
 * Lean, production-grade custom hook managing live SSE telemetry,
 * real-time scrape job events, server health checks, and start/stop controls.
 * Uses stable callback refs to prevent SSE reconnection loops and React infinite updates.
 */
export function useSweepStream({ onVendorReceived, onActivePoint, onSweepFinished } = {}) {
  const [sseStatus, setSseStatus] = useState('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [health, setHealth] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [sweepProgress, setSweepProgress] = useState({ current: 0, total: 0, speed: '0/min' });

  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const lastDoneKeyRef = useRef('');

  // Store latest callbacks in a stable ref synchronously each render
  const callbacksRef = useRef({ onVendorReceived, onActivePoint, onSweepFinished });
  callbacksRef.current = { onVendorReceived, onActivePoint, onSweepFinished };

  const finalizeIfTerminal = useCallback((payload) => {
    const st = String(payload?.status || '').toLowerCase();
    if (st !== 'stopped' && st !== 'complete' && st !== 'completed' && st !== 'error') return;
    setScanning(false);
    const doneKey = `${payload?.sessionId || 'active'}:${st}`;
    if (lastDoneKeyRef.current === doneKey) return;
    lastDoneKeyRef.current = doneKey;
    callbacksRef.current.onSweepFinished?.(payload);
  }, []);

  // Poll server health gently
  const checkServerHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      if (mountedRef.current && data) {
        setHealth(prev => (prev?.status === data?.status ? prev : data));
      }
    } catch {
      if (mountedRef.current) setHealth(null);
    }
  }, []);

  // Mount SSE stream strictly once on hook initialization
  useEffect(() => {
    mountedRef.current = true;
    checkServerHealth();

    const bindSource = (es) => {
      es.addEventListener('vendor', (e) => {
        try {
          const v = JSON.parse(e.data);
          const actual = v.vendor || v.place || v;
          callbacksRef.current.onVendorReceived?.(actual, v.sessionId);
        } catch {}
      });

      es.addEventListener('activePoint', (e) => {
        try {
          const pt = JSON.parse(e.data);
          if (mountedRef.current) {
            setActivePoint(pt);
            callbacksRef.current.onActivePoint?.(pt);
          }
        } catch {}
      });

      es.addEventListener('telemetry', (e) => {
        try {
          const t = JSON.parse(e.data);
          if (mountedRef.current && t) setTelemetry(t);
        } catch {}
      });

      es.addEventListener('progress', (e) => {
        try {
          const prog = JSON.parse(e.data);
          if (mountedRef.current) {
            setSweepProgress(prev => ({ ...prev, ...prog }));
            if (prog.status === 'running') setScanning(true);
            else finalizeIfTerminal(prog);
          }
        } catch {}
      });

      es.addEventListener('status', (e) => {
        try {
          const st = JSON.parse(e.data);
          if (mountedRef.current) {
            if (st.status === 'running') {
              lastDoneKeyRef.current = '';
              setScanning(true);
            } else {
              finalizeIfTerminal(st);
            }
          }
        } catch {}
      });
    };

    const stream = createLiveStream({
      url: streamUrl,
      fallbackUrl: fallbackStreamUrl,
      onSource: bindSource,
      onStatus: (st) => {
        if (!mountedRef.current) return;
        setSseStatus(st);
        if (st === 'open') checkServerHealth();
      },
      onAttempt: (count) => {
        if (mountedRef.current) setReconnectAttempts(count);
      }
    });

    streamRef.current = stream;
    stream.start();

    // Gentle health ping watchdog every 20s
    const healthTimer = setInterval(checkServerHealth, 20000);

    return () => {
      mountedRef.current = false;
      clearInterval(healthTimer);
      stream.stop();
    };
  }, [checkServerHealth, finalizeIfTerminal]);

  // Start new sweep (passes optional subcategories, zoneMode, and custom selectedZones)
  const startSweep = useCallback(async ({ query, city, country = 'IN', strategy = 'smart', zoneMode = 'smart', selectedZones, subcategories, fastSweep = true, sessionName = '', startZoneIndex = 0 }) => {
    try {
      lastDoneKeyRef.current = '';
      setScanning(true);
      const res = await startAuto({
        query,
        city,
        country,
        strategy,
        zoneMode,
        selectedZones: Array.isArray(selectedZones) && selectedZones.length > 0 ? selectedZones : undefined,
        subcategories: Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : undefined,
        fastSweep,
        startZoneIndex: Number(startZoneIndex || 0),
        name: sessionName || `${query} in ${city}`
      });
      if (res?.runId || res?.sessionId) {
        setCurrentRun(res);
      }
      return res;
    } catch (err) {
      setScanning(false);
      throw err;
    }
  }, []);

  // Stop current sweep
  const stopSweep = useCallback(async () => {
    try {
      await stopAllScrapes(currentRun?.sessionId || currentRun?.id);
    } finally {
      setScanning(false);
    }
  }, [currentRun]);

  return {
    sseStatus,
    reconnectAttempts,
    health,
    telemetry,
    scanning,
    currentRun,
    activePoint,
    sweepProgress,
    startSweep,
    stopSweep,
    refreshHealth: checkServerHealth
  };
}
