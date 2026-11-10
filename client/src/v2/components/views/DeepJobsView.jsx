import React from 'react';
import {
  Activity, Database, Globe2, Loader2, MapPin, Zap
} from 'lucide-react';
import { formatNumber, relativeTime, ScoreRing, StatusPill } from '../../ui';
import { ToggleTile, VendorAvatar, EmptyState, DeepJobRow } from '../cards/MetricCard';
import { qualityOf } from '../../utils/leadHelpers';

export default function DeepJobsView({
  stats = {},
  deepEstimate,
  batchConfig,
  setBatchConfig,
  queueDeepManual,
  batchStarting,
  health,
  vendors = [],
  activeDeepJobs = [],
  deepJob,
  deepJobs = [],
  stopDeep,
  recentProfiles = [],
  setSelectedVendor
}) {
  return (
    <section className="v2-deep-view">
      <div className="v2-deep-top">
        <div>
          <span className="v2-view-kicker">DEEP PROFILE ENGINE</span>
          <h2>Fill the field contract. Keep the unknowns.</h2>
          <p>Each vendor is saved independently under <code>server/data/deep_profiles/</code>. Stop and resume without losing completed profiles.</p>
        </div>
        <ScoreRing value={stats.avg} size={94} label="avg quality" />
      </div>

      <div className="v2-deep-grid">
        <div className="v2-panel v2-deep-config">
          <div className="v2-rail-head">
            <span><Zap size={14} /> QUEUE A DEEP PASS</span>
            <b>{formatNumber(deepEstimate?.count || 0)} UNEXTRACTED</b>
          </div>
          <div className="v2-deep-config-row">
            <label htmlFor="deep-limit">Vendor limit</label>
            <input
              id="deep-limit"
              type="number"
              min="1"
              max="750"
              value={batchConfig.limit}
              onChange={event => setBatchConfig(prev => ({ ...prev, limit: Math.max(1, Math.min(750, Number(event.target.value) || 1)) }))}
            />
            <span>~{deepEstimate?.label || '—'} · 2 browsers</span>
          </div>
          <div className="v2-toggle-stack">
            <ToggleTile active={batchConfig.website} onClick={() => setBatchConfig(prev => ({ ...prev, website: !prev.website }))} label="Website" detail="Multi-page crawl" icon={Globe2} />
            <ToggleTile active={batchConfig.google} onClick={() => setBatchConfig(prev => ({ ...prev, google: !prev.google }))} label="Google Maps" detail="Place detail DOM" icon={MapPin} />
          </div>
          <button type="button" className="v2-btn v2-btn-lime v2-btn-block" onClick={queueDeepManual} disabled={batchStarting || (deepEstimate?.count || 0) === 0}>
            {batchStarting ? <Loader2 size={15} className="v2-spin" /> : <Zap size={15} />}
            {batchStarting ? 'QUEUEING…' : 'START DEEP BATCH'}
          </button>
          <small className="v2-deep-config-note">Existing deep profiles are skipped unless you force a single-vendor pass from the drawer.</small>
        </div>

        <div className="v2-panel v2-deep-health">
          <div className="v2-rail-head">
            <span><Activity size={14} /> ENGINE HEALTH</span>
            <StatusPill tone={health?.status === 'ok' ? 'lime' : 'amber'} pulse>{health?.status || 'unknown'}</StatusPill>
          </div>
          <div className="v2-deep-health-grid">
            <div><span>TRACKED FIELDS</span><b>{health?.trackedFields || 52}</b><small>{health?.fieldGroups || 10} groups</small></div>
            <div><span>DEEP EXTRACTED</span><b>{formatNumber(health?.deepExtracted || 0)}</b><small>{formatNumber(health?.vendors || vendors.length)} vendors</small></div>
            <div><span>PROFILE FILES</span><b>{formatNumber(health?.profileFiles || 0)}</b><small>file-backed</small></div>
            <div><span>ACTIVE JOBS</span><b>{formatNumber(health?.activeJobs || activeDeepJobs.length)}</b><small>resumable</small></div>
          </div>
          <div className="v2-deep-health-foot">
            <span><Globe2 size={12} /> website {health?.engines?.website ? 'online' : 'offline'}</span>
            <span><MapPin size={12} /> maps {health?.engines?.playwright ? 'online' : 'offline'}</span>
            <span><Database size={12} /> village index {health?.geo?.villageIndexReady ? 'ready' : 'lazy'}</span>
          </div>
        </div>
      </div>

      <div className="v2-deep-jobs-head">
        <span className="v2-view-kicker">JOB LEDGER</span>
        <h3>Recent deep jobs</h3>
      </div>
      <div className="v2-deep-jobs-list">
        {(deepJob ? [deepJob, ...deepJobs.filter(job => job.id !== deepJob.id)] : deepJobs).slice(0, 8).map(job => (
          <DeepJobRow key={job.id} job={job} onStop={stopDeep} active={job.id === deepJob?.id} />
        ))}
        {deepJobs.length === 0 && !deepJob && (
          <EmptyState
            icon={Zap}
            title="No deep jobs yet."
            body="Queue a batch or open any vendor and run a single deep extraction."
            action={queueDeepManual}
            actionLabel="Queue deep pass"
          />
        )}
      </div>

      <div className="v2-deep-jobs-head">
        <span className="v2-view-kicker">LATEST PROFILES</span>
        <h3>Recently completed</h3>
      </div>
      <div className="v2-profile-grid">
        {recentProfiles.map(vendor => (
          <button type="button" className="v2-profile-card" key={vendor.id} onClick={() => setSelectedVendor(vendor)}>
            <VendorAvatar vendor={vendor} size={38} />
            <span>
              <b>{vendor.name}</b>
              <small>{vendor.category || 'Uncategorised'} · {relativeTime(vendor.deepExtractedAt)}</small>
            </span>
            <ScoreRing value={qualityOf(vendor) || 0} size={52} label="" />
          </button>
        ))}
        {recentProfiles.length === 0 && <p className="v2-muted">No deep profiles yet. Run the engine to populate this ledger.</p>}
      </div>
    </section>
  );
}

