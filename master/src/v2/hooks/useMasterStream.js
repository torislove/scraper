/**
 * master/src/v2/hooks/useMasterStream.js
 * Isolated SSE + Master Sweep Execution hook for Master Fleet UI.
 * Calls /api/master/scrape/start and propagates sessionId cleanly.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createLiveStream } from '../liveStream';
import { streamUrl, fallbackStreamUrl, getHealth } from '../api';
import { startMasterSweepApi, stopMasterSweepApi } from '../apiMaster';

export function useMasterStream({ onVendorReceived, onActivePoint, onSweepFinished } = {}) {
  const [sseStatus, setSseStatus] = useState('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [health, setHealth] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [sweepProgress, setSweepProgress] = useState({ current: 0, total: 0, speed: '0/min' });

  const mountedRef = useRef(true);
  const lastDoneKeyRef = useRef('');
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

  const checkServerHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      if (mountedRef.current && data) {
        setHealth((prev) => (prev?.status === data?.status ? prev : data));
      }
    } catch {
      if (mountedRef.current) setHealth(null);
    }
  }, []);

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
            setSweepProgress((prev) => ({ ...prev, ...prog }));
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
      onAttempt: (count) => { if (mountedRef.current) setReconnectAttempts(count); }
    });

    stream.start();
    const healthTimer = setInterval(checkServerHealth, 20000);
    return () => {
      mountedRef.current = false;
      clearInterval(healthTimer);
      stream.stop();
    };
  }, [checkServerHealth, finalizeIfTerminal]);

  const startSweep = useCallback(async ({ query, location, country = 'IN', selectedZones, subcategories, startZoneIndex = 0, maxStateDistricts = 12 }) => {
    try {
      lastDoneKeyRef.current = '';
      setScanning(true);
      const res = await startMasterSweepApi({
        query,
        location,
        country,
        selectedZones: Array.isArray(selectedZones) && selectedZones.length > 0 ? selectedZones : undefined,
        subcategories: Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : undefined,
        startZoneIndex: Number(startZoneIndex || 0),
        maxStateDistricts
      });
      if (res?.runId || res?.sessionId) setCurrentRun(res);
      return res;
    } catch (err) {
      setScanning(false);
      throw err;
    }
  }, []);

  const stopSweep = useCallback(async () => {
    try {
      await stopMasterSweepApi(currentRun?.sessionId || currentRun?.id);
    } finally {
      setScanning(false);
    }
  }, [currentRun]);

  return {
    sseStatus, reconnectAttempts, health, telemetry, scanning, currentRun,
    activePoint, sweepProgress, startSweep, stopSweep, refreshHealth: checkServerHealth
  };
}
