import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../apiConfig';

/**
 * Real-time SSE Scraper Hook
 * Listens to server event streams with auto-reconnection, heartbeat detection,
 * and real-time vendor / progress / log updates.
 */
export function useSSEScraper({ onVendor, onProgress, onLog, onDispatch } = {}) {
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'error' | 'disconnected'
  const [lastEventAt, setLastEventAt] = useState(null);
  const esRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    setStatus('connecting');
    const streamUrl = `${API_URL}/logs/stream`;
    const es = new EventSource(streamUrl);
    esRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      setLastEventAt(Date.now());
    };

    es.addEventListener('vendor', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEventAt(Date.now());
        if (onVendor) onVendor(data);
      } catch (err) {
        console.error('[SSE] Failed to parse vendor event', err);
      }
    });

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEventAt(Date.now());
        if (onProgress) onProgress(data);
      } catch (err) {
        console.error('[SSE] Failed to parse progress event', err);
      }
    });

    es.addEventListener('dispatch', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEventAt(Date.now());
        if (onDispatch) onDispatch(data);
      } catch (err) {
        console.error('[SSE] Failed to parse dispatch event', err);
      }
    });

    es.addEventListener('log', (e) => {
      try {
        const logData = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
        setLastEventAt(Date.now());
        if (onLog) onLog(logData);
      } catch (err) {
        console.error('[SSE] Failed to process log event', err);
      }
    });

    es.onerror = () => {
      setStatus('error');
      es.close();
      // Auto-reconnect after 3 seconds
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [onVendor, onProgress, onLog, onDispatch]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastEventAt,
    reconnect: connect,
    disconnect
  };
}

export default useSSEScraper;
