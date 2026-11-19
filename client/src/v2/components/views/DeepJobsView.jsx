import React from 'react';
import { CheckCircle2, Globe2, Loader2, MapPin, Sparkles, Zap } from 'lucide-react';
import { formatNumber, relativeTime, ScoreRing } from '../../ui';
import { ToggleTile, VendorAvatar, EmptyState, DeepJobRow } from '../cards/MetricCard';
import { qualityOf } from '../../utils/leadHelpers';

export default function DeepJobsView({
  stats = {},
  deepEstimate,
  batchConfig,
  setBatchConfig,
  queueDeepManual,
  batchStarting,
  vendors = [],
  deepJob,
  deepJobs = [],
  stopDeep,
  resumeDeep,
  recentProfiles = [],
  setSelectedVendor
}) {
  return (
    <section className="v2-deep-view">
      <div className="v2-deep-top">
        <div>
          <span className="v2-view-kicker">AUTOMATIC CONTACT FINDER</span>
          <h2>Discover missing phone numbers, emails &amp; websites.</h2>
          <p>
            Automatically check your saved businesses to fill in missing phone numbers, official
            websites, email addresses, opening hours, and full street details.
          </p>
        </div>
        <ScoreRing value={stats.avg || 0} size={94} label="profile score" />
      </div>

      <div className="v2-deep-grid">
        <div className="v2-panel v2-deep-config">
          <div className="v2-rail-head">
            <span><Sparkles size={14} /> FIND MISSING DETAILS</span>
            <b>{formatNumber(deepEstimate?.count || 0)} TO CHECK</b>
          </div>
          <div className="v2-deep-config-row">
            <label htmlFor="deep-limit">Businesses to check</label>
            <input
              id="deep-limit"
              type="number"
              min="1"
              max="750"
              value={batchConfig.limit}
              onChange={event => setBatchConfig(prev => ({ ...prev, limit: Math.max(1, Math.min(750, Number(event.target.value) || 1)) }))}
            />
            <span>Est. {deepEstimate?.label || 'a few minutes'}</span>
          </div>
          <div className="v2-toggle-stack">
            <ToggleTile
              active={batchConfig.website}
              onClick={() => setBatchConfig(prev => ({ ...prev, website: !prev.website }))}
              label="Check Official Websites"
              detail="Find contact emails & social pages"
              icon={Globe2}
            />
            <ToggleTile
              active={batchConfig.google}
              onClick={() => setBatchConfig(prev => ({ ...prev, google: !prev.google }))}
              label="Verify Business Listings"
              detail="Check phone numbers, ratings & opening hours"
              icon={MapPin}
            />
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-lime v2-btn-block"
            onClick={queueDeepManual}
            disabled={batchStarting || (deepEstimate?.count || 0) === 0}
          >
            {batchStarting ? <Loader2 size={15} className="v2-spin" /> : <Zap size={15} />}
            {batchStarting ? 'Starting…' : 'Find Missing Contacts'}
          </button>
          <small className="v2-deep-config-note">
            Businesses that already have complete details are automatically skipped to save time.
          </small>
        </div>

        <div className="v2-panel v2-deep-health">
          <div className="v2-rail-head">
            <span><CheckCircle2 size={14} /> YOUR LIST COMPLETENESS</span>
          </div>
          <div className="v2-deep-health-grid">
            <div>
              <span>TOTAL BUSINESSES</span>
              <b>{formatNumber(vendors.length)}</b>
              <small>in your workspace</small>
            </div>
            <div>
              <span>WITH PHONE</span>
              <b>{formatNumber(stats.phones || 0)}</b>
              <small>ready to call</small>
            </div>
            <div>
              <span>COMPLETE PROFILES</span>
              <b>{formatNumber(stats.deep || 0)}</b>
              <small>full details verified</small>
            </div>
            <div>
              <span>AVG COMPLETENESS</span>
              <b>{stats.avg || 0}%</b>
              <small>overall contact quality</small>
            </div>
          </div>
        </div>
      </div>

      <div className="v2-deep-jobs-head">
        <span className="v2-view-kicker">RECENT ACTIVITY</span>
        <h3>Contact lookup history</h3>
      </div>
      <div className="v2-deep-jobs-list">
        {(deepJob ? [deepJob, ...deepJobs.filter(job => job.id !== deepJob.id)] : deepJobs).slice(0, 6).map(job => (
          <DeepJobRow key={job.id} job={job} onStop={stopDeep} onResume={resumeDeep} active={job.id === deepJob?.id} />
        ))}
        {deepJobs.length === 0 && !deepJob && (
          <EmptyState
            icon={Sparkles}
            title="No contact lookups run yet"
            body="Click Find Missing Contacts above whenever you want to enrich a batch of businesses with additional phones, emails, and opening hours."
            action={queueDeepManual}
            actionLabel="Find Missing Contacts"
          />
        )}
      </div>

      <div className="v2-deep-jobs-head">
        <span className="v2-view-kicker">RECENTLY UPDATED</span>
        <h3>Latest enriched business profiles</h3>
      </div>
      <div className="v2-profile-grid">
        {recentProfiles.map(vendor => (
          <button type="button" className="v2-profile-card" key={vendor.id} onClick={() => setSelectedVendor(vendor)}>
            <VendorAvatar vendor={vendor} size={38} />
            <span>
              <b>{vendor.name}</b>
              <small>{vendor.category || 'Business'} · {relativeTime(vendor.deepExtractedAt)}</small>
            </span>
            <ScoreRing value={qualityOf(vendor) || 0} size={52} label="" />
          </button>
        ))}
        {recentProfiles.length === 0 && (
          <p className="v2-muted">Updated business profiles will appear here once you run a contact lookup.</p>
        )}
      </div>
    </section>
  );
}
