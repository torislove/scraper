import React, { useMemo } from 'react';
import {
  ArrowRight, BarChart3, CheckCircle2, Download, FolderArchive, MapPin,
  Phone, Radar as RadarIcon, Search, Sparkles, Star, Target, Users, Zap
} from 'lucide-react';
import { CRM_STAGES, crmStageOf } from './CrmBoard';
import { cx, formatNumber, relativeTime } from './ui';

function qualityScore(vendor) {
  const score = vendor?.profileQuality?.score;
  if (score != null && Number.isFinite(Number(score))) return Number(score);
  return Number.isFinite(Number(vendor?.qualityScore)) ? Number(vendor.qualityScore) : null;
}

function sourceLabel(value) {
  const raw = String(value || '').toLowerCase();
  if (!raw) return 'Autonomous Signal';
  if (raw.includes('justdial') || raw.includes('telecom')) return 'Direct Telecom Registry';
  if (raw.includes('indiamart') || raw.includes('b2b')) return 'Enterprise B2B Network';
  if (raw.includes('wedding') || raw.includes('hospitality')) return 'Hospitality & Venue Vault';
  if (raw.includes('google') || raw.includes('maps') || raw.includes('mesh')) return 'Geospatial Radar Mesh';
  if (raw.includes('serp')) return 'Deep Web SERP Index';
  if (raw.includes('website')) return 'Website Intelligence';
  if (raw.includes('social') || raw.includes('footprint')) return 'Digital Footprint Scanner';
  if (raw.includes('ai')) return 'Autonomous AI Core';
  return 'Proprietary Vector';
}

export function OverviewBoard({
  vendors = [], runs = [], run, stats, onTab, onOpenFolder, onExportFolder
}) {
  const pipeline = useMemo(() => {
    const counts = Object.fromEntries(CRM_STAGES.map(stage => [stage.id, 0]));
    vendors.forEach(vendor => {
      const stage = crmStageOf(vendor);
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return CRM_STAGES.map(stage => ({ ...stage, count: counts[stage.id] || 0 }));
  }, [vendors]);

  const maxStage = Math.max(1, ...pipeline.map(stage => stage.count));
  const contacted = pipeline.filter(stage => stage.id !== 'new' && stage.id !== 'archived').reduce((sum, stage) => sum + stage.count, 0);
  const won = pipeline.find(stage => stage.id === 'won')?.count || 0;

  const topCities = useMemo(() => {
    const map = new Map();
    vendors.forEach(vendor => {
      const city = vendor.city || vendor.village || vendor.mandal || vendor.district;
      if (!city) return;
      map.set(city, (map.get(city) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [vendors]);

  const maxCity = Math.max(1, ...topCities.map(([, count]) => count));
  const recentRuns = runs.slice(0, 4);

  return (
    <section className="v2-overview-view">
      <div className="v2-view-head">
        <div>
          <span className="v2-view-kicker">WORKSPACE OVERVIEW</span>
          <h2>Everything that matters, on one screen.</h2>
          <p>
            Your live search, saved folders and sales pipeline are the same data.
            No duplicate dashboards, no exports to reconcile.
          </p>
        </div>
        <div className="v2-overview-quick">
          <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={() => onTab?.('leads')}>
            <Search size={13} /> New search
          </button>
          <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm" onClick={() => onTab?.('map')}>
            <MapPin size={13} /> Live map
          </button>
        </div>
      </div>

      <div className="v2-overview-hero">
        <article className="v2-ov-card v2-ov-pipeline">
          <header>
            <span><Target size={13} /> SALES PIPELINE</span>
            <b>{formatNumber(contacted)} contacted · {formatNumber(won)} won</b>
          </header>
          <div className="v2-ov-stage-list">
            {pipeline.map(stage => (
              <button
                type="button"
                key={stage.id}
                className={cx('v2-ov-stage', `tone-${stage.tone}`)}
                onClick={() => onTab?.('crm')}
              >
                <span>{stage.label}</span>
                <span className="v2-ov-stage-track">
                  <i style={{ width: `${Math.max(3, (stage.count / maxStage) * 100)}%` }} />
                </span>
                <b>{formatNumber(stage.count)}</b>
              </button>
            ))}
          </div>
        </article>

        <article className="v2-ov-card v2-ov-folders">
          <header>
            <span><FolderArchive size={13} /> RECENT SEARCHES</span>
            <b>{formatNumber(runs.length)} saved</b>
          </header>
          <div className="v2-ov-folder-list">
            {recentRuns.map(folder => (
              <div className="v2-ov-folder" key={folder.id}>
                <span className="v2-ov-folder-mark"><FolderArchive size={13} /></span>
                <span className="v2-ov-folder-copy">
                  <b>{folder.category} <span>in</span> {folder.location}</b>
                  <small>{formatNumber(folder.leadCount)} leads · {relativeTime(folder.timestamp)}</small>
                </span>
                <button type="button" onClick={() => onOpenFolder?.(folder)}>Open</button>
                <button type="button" className="is-icon" onClick={() => onExportFolder?.(folder, 'csv')} title="Download CSV">
                  <Download size={12} />
                </button>
              </div>
            ))}
            {!recentRuns.length && (
              <div className="v2-ov-empty">
                <p>No saved searches yet.</p>
                <button type="button" onClick={() => onTab?.('leads')}>Start your first search <ArrowRight size={12} /></button>
              </div>
            )}
          </div>
        </article>

        <article className="v2-ov-card v2-ov-cities">
          <header>
            <span><MapPin size={13} /> WHERE YOUR LEADS ARE</span>
            <b>{formatNumber(topCities.length)} cities</b>
          </header>
          <div className="v2-ov-city-list">
            {topCities.map(([city, count]) => (
              <div className="v2-ov-city" key={city}>
                <span>{city}</span>
                <span className="v2-ov-city-track"><i style={{ width: `${Math.max(4, (count / maxCity) * 100)}%` }} /></span>
                <b>{formatNumber(count)}</b>
              </div>
            ))}
            {!topCities.length && <div className="v2-ov-empty"><p>Location data appears as soon as leads arrive.</p></div>}
          </div>
        </article>

        <article className="v2-ov-card v2-ov-activity">
          <header>
            <span><RadarIcon size={13} /> PIPELINE HEALTH</span>
            <b>{run?.status === 'running' ? 'RUNNING' : 'READY'}</b>
          </header>
          <div className="v2-ov-empty">
            <p>{run?.status === 'running' ? 'The search is live. New leads stream into the table as each zone reports back.' : 'Run a search to fill this workspace with verified leads, folders and map coverage.'}</p>
          </div>
        </article>
      </div>

      <div className="v2-overview-actions">
        <button type="button" onClick={() => onTab?.('leads')}>
          <span className="v2-ov-action-icon"><Search size={16} /></span>
          <span><b>Find new leads</b><small>One search, fresh results</small></span>
          <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onTab?.('crm')}>
          <span className="v2-ov-action-icon is-cyan"><Users size={16} /></span>
          <span><b>Work the pipeline</b><small>{formatNumber(contacted)} leads in play</small></span>
          <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onTab?.('insights')}>
          <span className="v2-ov-action-icon is-violet"><BarChart3 size={16} /></span>
          <span><b>See conversion</b><small>Stages, sources and quality</small></span>
          <ArrowRight size={14} />
        </button>
        <button type="button" onClick={() => onTab?.('runs')}>
          <span className="v2-ov-action-icon is-amber"><FolderArchive size={16} /></span>
          <span><b>Open a folder</b><small>{formatNumber(runs.length)} past searches</small></span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

export function InsightsBoard({ vendors = [], runs = [] }) {
  const data = useMemo(() => {
    const stages = CRM_STAGES.map(stage => ({ ...stage, count: 0 }));
    const stageMap = Object.fromEntries(stages.map(stage => [stage.id, stage]));
    const sources = new Map();
    const cities = new Map();
    const states = new Set();
    const quality = { excellent: 0, good: 0, fair: 0, thin: 0 };
    let phone = 0;
    let website = 0;
    let email = 0;
    let notes = 0;
    let tasks = 0;

    vendors.forEach(vendor => {
      const stage = crmStageOf(vendor);
      if (stageMap[stage]) stageMap[stage].count += 1;

      const sourceKey = sourceLabel(vendor.bestSource || vendor.source || vendor.primarySource);
      sources.set(sourceKey, (sources.get(sourceKey) || 0) + 1);

      const city = vendor.city || vendor.village || vendor.mandal;
      if (city) cities.set(city, (cities.get(city) || 0) + 1);
      if (vendor.state) states.add(vendor.state);

      const score = qualityScore(vendor);
      if (score == null) quality.thin += 1;
      else if (score >= 80) quality.excellent += 1;
      else if (score >= 60) quality.good += 1;
      else if (score >= 40) quality.fair += 1;
      else quality.thin += 1;

      if (vendor.phone && !String(vendor.phone).includes('Requires')) phone += 1;
      if (vendor.website) website += 1;
      if (vendor.email) email += 1;
      notes += Array.isArray(vendor.crmNotes) ? vendor.crmNotes.length : 0;
      tasks += Array.isArray(vendor.crmTasks) ? vendor.crmTasks.filter(task => !task.done).length : 0;
    });

    const contacted = stages
      .filter(stage => !['new', 'archived'].includes(stage.id))
      .reduce((sum, stage) => sum + stage.count, 0);
    const won = stageMap.won?.count || 0;
    const lost = stageMap.lost?.count || 0;
    const conversion = contacted ? Math.round((won / contacted) * 1000) / 10 : 0;
    const maxStage = Math.max(1, ...stages.map(stage => stage.count));
    const topSources = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const total = vendors.length || 1;

    return {
      stages, contacted, won, lost, conversion, maxStage, topSources, topCities,
      states: states.size, quality, phone, website, email, notes, tasks,
      total, maxSource: Math.max(1, ...topSources.map(([, count]) => count)),
      maxCity: Math.max(1, ...topCities.map(([, count]) => count))
    };
  }, [vendors]);

  return (
    <section className="v2-insights-view">
      <div className="v2-view-head">
        <div>
          <span className="v2-view-kicker">PIPELINE INTELLIGENCE</span>
          <h2>What is working, in plain numbers.</h2>
          <p>
            Conversion, coverage and profile quality for the live dataset. Everything is
            calculated from your real leads — nothing is estimated or seeded.
          </p>
        </div>
        <div className="v2-insights-badge">
          <Zap size={13} />
          <span><b>{formatNumber(vendors.length)}</b> live leads</span>
        </div>
      </div>

      <div className="v2-insights-kpis">
        <div className="v2-insight-kpi">
          <span>CONVERSION</span>
          <b>{data.conversion}%</b>
          <small>won / contacted</small>
        </div>
        <div className="v2-insight-kpi">
          <span>CONTACTED</span>
          <b>{formatNumber(data.contacted)}</b>
          <small>moved past new</small>
        </div>
        <div className="v2-insight-kpi">
          <span>WON</span>
          <b>{formatNumber(data.won)}</b>
          <small>{formatNumber(data.lost)} lost</small>
        </div>
        <div className="v2-insight-kpi">
          <span>MOBILE COVERAGE</span>
          <b>{Math.round((data.phone / data.total) * 100)}%</b>
          <small>{formatNumber(data.phone)} numbers</small>
        </div>
      </div>

      <div className="v2-insights-grid">
        <article className="v2-insight-card v2-insight-funnel">
          <header><span><Target size={13} /> STAGE FUNNEL</span><b>{formatNumber(vendors.length)} total</b></header>
          <div className="v2-insight-funnel-list">
            {data.stages.map(stage => (
              <div className={cx('v2-insight-stage', `tone-${stage.tone}`)} key={stage.id}>
                <span className="v2-insight-stage-label">{stage.label}</span>
                <span className="v2-insight-stage-track">
                  <i style={{ width: `${Math.max(3, (stage.count / data.maxStage) * 100)}%` }} />
                </span>
                <b>{formatNumber(stage.count)}</b>
                <small>{Math.round((stage.count / data.total) * 100)}%</small>
              </div>
            ))}
          </div>
          <footer>
            <span><CheckCircle2 size={12} /> {formatNumber(data.notes)} notes</span>
            <span><Target size={12} /> {formatNumber(data.tasks)} open tasks</span>
          </footer>
        </article>

        <article className="v2-insight-card">
          <header><span><Sparkles size={13} /> PROFILE QUALITY</span><b>{formatNumber(vendors.length)} profiles</b></header>
          <div className="v2-quality-list">
            {[
              ['Excellent', data.quality.excellent, 'lime', '80–100%'],
              ['Good', data.quality.good, 'cyan', '60–79%'],
              ['Fair', data.quality.fair, 'amber', '40–59%'],
              ['Thin', data.quality.thin, 'red', 'below 40%']
            ].map(([label, count, tone, range]) => (
              <div className="v2-quality-row" key={label}>
                <span className={cx('v2-quality-dot', `tone-${tone}`)} />
                <span className="v2-quality-copy">
                  <b>{label}</b>
                  <small>{range}</small>
                </span>
                <span className="v2-quality-track"><i className={cx(`tone-${tone}`)} style={{ width: `${Math.round((count / data.total) * 100)}%` }} /></span>
                <b>{formatNumber(count)}</b>
              </div>
            ))}
          </div>
          <footer>
            <span><Phone size={12} /> {formatNumber(data.phone)} mobile</span>
            <span><GlobeIcon /> {formatNumber(data.website)} websites</span>
          </footer>
        </article>

        <article className="v2-insight-card">
          <header><span><RadarIcon size={13} /> SOURCE MIX</span><b>where leads came from</b></header>
          <div className="v2-source-mix">
            {data.topSources.map(([source, count]) => (
              <div className="v2-source-row" key={source}>
                <span>{source}</span>
                <span className="v2-source-track"><i style={{ width: `${Math.max(4, (count / data.maxSource) * 100)}%` }} /></span>
                <b>{formatNumber(count)}</b>
              </div>
            ))}
            {!data.topSources.length && <div className="v2-ov-empty"><p>Source data appears with your first leads.</p></div>}
          </div>
        </article>

        <article className="v2-insight-card">
          <header><span><MapPin size={13} /> COVERAGE</span><b>{formatNumber(data.states)} states</b></header>
          <div className="v2-city-mix">
            {data.topCities.map(([city, count]) => (
              <div className="v2-city-row" key={city}>
                <span>{city}</span>
                <span className="v2-city-track"><i style={{ width: `${Math.max(4, (count / data.maxCity) * 100)}%` }} /></span>
                <b>{formatNumber(count)}</b>
              </div>
            ))}
            {!data.topCities.length && <div className="v2-ov-empty"><p>Run a search to populate coverage.</p></div>}
          </div>
          <footer>
            <span><Star size={12} /> {formatNumber(runs.length)} saved folders</span>
            <span><Download size={12} /> CSV / JSON exports</span>
          </footer>
        </article>
      </div>
    </section>
  );
}

function GlobeIcon() {
  return <span className="v2-inline-globe" aria-hidden="true">◎</span>;
}
