import React, { useState, useEffect } from 'react';
import { Clock, Zap, Activity, Compass, ArrowRight } from 'lucide-react';

/**
 * Format milliseconds into HH:MM:SS or MM:SS
 */
function formatDigitalTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = n => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function RetroDigitalTimer({
  etaMs = 0,
  etaText = '',
  elapsedSeconds = 0,
  zoneIndex = 1,
  totalZones = 1,
  activeZoneName = '',
  hopTransition = '',
  leadsCount = 0,
  runningCount = 0,
  doneCount = 0,
  queuedCount = 0,
  engineCount = 11,
  scanning = false,
  compact = false
}) {
  const [blink, setBlink] = useState(true);

  // 1-second blinking colon for authentic digital watch feel
  useEffect(() => {
    if (!scanning) {
      setBlink(true);
      return undefined;
    }
    const interval = setInterval(() => {
      setBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [scanning]);

  const elapsedMs = Math.max(0, elapsedSeconds * 1000);
  const formattedElapsed = formatDigitalTime(elapsedMs);
  const formattedEta = etaText || (etaMs > 0 ? formatDigitalTime(etaMs) : 'CALC…');

  const zoneDisplay = totalZones > 1 ? `ZONE ${zoneIndex} / ${totalZones}` : `ZONE ${zoneIndex}`;
  const displayZoneLabel = hopTransition || activeZoneName || 'INITIALIZING…';

  return (
    <div
      className={`retro-watch-frame ${compact ? 'is-compact' : ''} ${scanning ? 'is-live' : 'is-idle'}`}
      data-testid="live-eta-timer"
      title="Live Retro Digital Watch Telemetry & Orchestrator ETA"
    >
      {/* Metallic/Resin Bezel Header */}
      <div className="retro-watch-bezel-top">
        <span className="retro-brand">MASTER ORCHESTRATOR · CHRONO</span>
        <span className="retro-water-resist">TITANIUM 100M</span>
        <div className="retro-indicator-lights">
          <span className={`retro-led-dot ${scanning ? 'is-active' : ''}`} />
          <span className="retro-mode-tag">{scanning ? 'SWEEP' : 'STANDBY'}</span>
        </div>
      </div>

      {/* 7-Segment LCD Screen */}
      <div className="retro-lcd-screen">
        {/* Top Telemetry Line */}
        <div className="retro-lcd-topline">
          <span className="retro-tele-item">
            <Compass size={11} className="retro-icon" />
            <b className="retro-zone-tag">{zoneDisplay}</b>
          </span>
          <span className="retro-tele-item retro-engines-tag">
            <Zap size={11} className="retro-icon" />
            <span>{engineCount} ENGINES</span>
          </span>
          <span className="retro-tele-item retro-leads-tag">
            <Activity size={11} className="retro-icon" />
            <span>{leadsCount} LEADS</span>
          </span>
        </div>

        {/* Primary Digital Watch Display: ETA & Elapsed */}
        <div className="retro-lcd-main">
          <div className="retro-time-block is-eta">
            <span className="retro-time-lbl">ESTIMATED REMAINING</span>
            <div className="retro-lcd-digits">
              <span className="retro-prefix">ETA:</span>
              <span className="retro-val">
                {formattedEta.includes(':') ? (
                  <>
                    <span>{formattedEta.split(':')[0]}</span>
                    <span className={`retro-colon ${blink ? 'is-visible' : 'is-hidden'}`}>:</span>
                    <span>{formattedEta.split(':')[1]}</span>
                    {formattedEta.split(':')[2] && (
                      <>
                        <span className={`retro-colon ${blink ? 'is-visible' : 'is-hidden'}`}>:</span>
                        <span>{formattedEta.split(':')[2]}</span>
                      </>
                    )}
                  </>
                ) : (
                  formattedEta
                )}
              </span>
            </div>
          </div>

          <div className="retro-time-divider" />

          <div className="retro-time-block is-elapsed">
            <span className="retro-time-lbl">ELAPSED TIME</span>
            <div className="retro-lcd-digits retro-sub-digits">
              <span className="retro-val">
                <span>{formattedElapsed.split(':')[0]}</span>
                <span className={`retro-colon ${blink ? 'is-visible' : 'is-hidden'}`}>:</span>
                <span>{formattedElapsed.split(':')[1]}</span>
                {formattedElapsed.split(':')[2] && (
                  <>
                    <span className={`retro-colon ${blink ? 'is-visible' : 'is-hidden'}`}>:</span>
                    <span>{formattedElapsed.split(':')[2]}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Zone Hop Transition */}
        <div className="retro-lcd-zone-row">
          <span className="retro-hop-lbl">ACTIVE HOP:</span>
          <span className="retro-hop-transition" title={displayZoneLabel}>
            {displayZoneLabel}
          </span>
        </div>

        {/* Micro Telemetry Footer */}
        <div className="retro-lcd-footer">
          <span className="retro-foot-badge">RUN: {runningCount}</span>
          <span className="retro-foot-badge">DONE: {doneCount}</span>
          <span className="retro-foot-badge">QUEUED: {queuedCount}</span>
          <span className="retro-sync-status">{scanning ? '100% SATELLITE RADAR' : 'STANDBY'}</span>
        </div>
      </div>
    </div>
  );
}
