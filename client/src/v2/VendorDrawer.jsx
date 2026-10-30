import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, CircleHelp, Clock3, ExternalLink, Globe2,
  Loader2, Mail, MapPin, MessageSquare, Phone, RefreshCw, Send, Star, X, Zap
} from 'lucide-react';
import {
  getVendorProfile, deepExtractVendor, getDeepJob, updateVendorCrm
} from './api';
import {
  CopyButton, ScoreRing, StatusPill, Unknown, cx, formatNumber, relativeTime
} from './ui';
import { CRM_STAGES, crmStageOf } from './CrmBoard';

function isKnown(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return Boolean(v) && !['unknown', 'n/a', 'na', 'none', 'null', 'undefined', 'requires manual lookup', 'obfuscated'].includes(v);
  }
  if (typeof value === 'number') return Number.isFinite(value);
  return Boolean(value);
}

function safeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return '';
}

function humanSource(source) {
  const map = {
    website: 'Website',
    website_jsonld: 'Website JSON-LD',
    website_contact: 'Website contact',
    website_address: 'Website address',
    website_legal: 'Website legal',
    website_social: 'Website social',
    google_maps: 'Google Maps',
    existing: 'Existing record',
    merged: 'Merged'
  };
  return map[source] || String(source || 'Unknown source').replace(/_/g, ' ');
}

function fieldProvenance(profile, field, path) {
  const entries = Array.isArray(profile?.provenance) ? profile.provenance : [];
  return entries.filter(item => {
    const key = String(item.field || '');
    return key === path || key === field.key || key.endsWith(`.${field.key}`);
  }).slice(0, 3);
}

function ChipList({ values }) {
  return (
    <span className="v2-chip-list">
      {values.map((item, index) => {
        const text = typeof item === 'string' ? item : (item?.name || item?.label || JSON.stringify(item));
        return <span className="v2-chip" key={`${text}-${index}`}>{text}</span>;
      })}
    </span>
  );
}

function LinkValue({ value, label }) {
  const url = safeUrl(value);
  if (!url) return <span>{String(value)}</span>;
  return (
    <a className="v2-link-value" href={url} target="_blank" rel="noreferrer">
      {label || String(value).replace(/^https?:\/\//i, '').replace(/\/$/, '')}
      <ExternalLink size={11} />
    </a>
  );
}

function HoursTable({ rows }) {
  return (
    <div className="v2-hours-table">
      {rows.map((row, index) => (
        <div key={`${row.day}-${index}`}>
          <span>{row.day || 'Day'}</span>
          <b>{row.hours || (row.opens || row.closes ? `${row.opens || '—'} – ${row.closes || '—'}` : 'Unknown')}</b>
        </div>
      ))}
    </div>
  );
}

function ReviewCards({ reviews }) {
  return (
    <div className="v2-review-list">
      {reviews.map((review, index) => (
        <article className="v2-review" key={`${review.author || 'review'}-${index}`}>
          <header>
            <b>{review.author || 'Anonymous'}</b>
            {review.rating != null && <span><Star size={11} /> {Number(review.rating).toFixed(1)}</span>}
            {review.date && <small>{review.date}</small>}
          </header>
          <p>{review.text || review.reviewBody || 'No text'}</p>
          {review.response && <blockquote><b>Owner response</b>{review.response}</blockquote>}
        </article>
      ))}
    </div>
  );
}

function FaqList({ faqs }) {
  return (
    <div className="v2-faq-list">
      {faqs.map((faq, index) => (
        <details key={`${faq.question}-${index}`}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

function MediaGrid({ items }) {
  const urls = items.map(item => typeof item === 'string' ? item : item?.url).filter(Boolean).slice(0, 12);
  if (!urls.length) return <Unknown />;
  return (
    <div className="v2-media-grid">
      {urls.map((url, index) => (
        <a href={url} target="_blank" rel="noreferrer" key={`${url}-${index}`}>
          <img src={url} alt="" loading="lazy" onError={event => { event.currentTarget.parentElement.style.display = 'none'; }} />
        </a>
      ))}
    </div>
  );
}

function renderValue(field, value) {
  if (!isKnown(value)) {
    return <Unknown />;
  }

  if (field.key === 'phone' && typeof value === 'string') {
    return (
      <span className="v2-phone-value">
        <a href={`tel:${value}`}>{value}</a>
        <CopyButton value={value} />
      </span>
    );
  }

  if (field.key === 'email' && typeof value === 'string') {
    return <a className="v2-link-value" href={`mailto:${value}`}>{value}<ExternalLink size={11} /></a>;
  }

  if (['website', 'instagram', 'facebook', 'linkedin', 'youtube', 'twitter', 'whatsapp', 'menuLink', 'plusCode'].includes(field.key)) {
    if (field.key === 'plusCode') return <span className="v2-mono-value">{String(value)}</span>;
    if (field.key === 'whatsapp' && !/^https?:/i.test(String(value))) {
      return <a className="v2-link-value" href={`https://wa.me/${String(value).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp<ExternalLink size={11} /></a>;
    }
    return <LinkValue value={value} />;
  }

  if (field.key === 'rating' && typeof value === 'number') {
    return <span className="v2-rating"><Star size={12} /><b>{value.toFixed(1)}</b></span>;
  }

  if (field.key === 'reviewsCount' || field.key === 'latitude' || field.key === 'longitude') {
    return <span className="v2-mono-value">{field.key === 'reviewsCount' ? formatNumber(value) : String(value)}</span>;
  }

  if (field.key === 'hoursTable' && Array.isArray(value)) return <HoursTable rows={value} />;
  if (field.key === 'reviews' && Array.isArray(value)) return <ReviewCards reviews={value} />;
  if (field.key === 'ownerResponses' && Array.isArray(value)) return <ReviewCards reviews={value} />;
  if (field.key === 'faqs' && Array.isArray(value)) return <FaqList faqs={value} />;
  if (['images', 'photos'].includes(field.key)) return <MediaGrid items={value} />;
  if (field.key === 'logo') {
    return (
      <span className="v2-logo-value">
        <img src={value} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />
        <LinkValue value={value} label="Open source image" />
      </span>
    );
  }

  if (['gstin', 'pan', 'cin'].includes(field.key)) {
    return <span className="v2-mono-value v2-legal-value">{String(value)}<CopyButton value={value} /></span>;
  }

  if (field.key === 'services' || field.key === 'products' || field.key === 'offers' || field.key === 'bookingLinks') {
    if (!Array.isArray(value)) return <span>{String(value)}</span>;
    return (
      <div className="v2-catalog-list">
        {value.map((item, index) => {
          if (typeof item === 'string') return <span className="v2-chip" key={index}>{item}</span>;
          const label = item.name || item.label || item.title || item.url || 'Untitled';
          const detail = [item.description, item.price && `${item.currency || '₹'} ${item.price}`, item.validUntil && `until ${item.validUntil}`].filter(Boolean).join(' · ');
          const url = safeUrl(item.url);
          return (
            <div className="v2-catalog-item" key={`${label}-${index}`}>
              <b>{url ? <a href={url} target="_blank" rel="noreferrer">{label}<ExternalLink size={10} /></a> : label}</b>
              {detail && <small>{detail}</small>}
            </div>
          );
        })}
      </div>
    );
  }

  if (Array.isArray(value)) {
    const simple = value.every(item => typeof item === 'string' || typeof item === 'number');
    if (simple) return <ChipList values={value.map(String)} />;
    return (
      <div className="v2-catalog-list">
        {value.map((item, index) => {
          const label = item?.name || item?.label || item?.author || item?.question || `Item ${index + 1}`;
          return <div className="v2-catalog-item" key={index}><b>{label}</b>{item?.description && <small>{item.description}</small>}</div>;
        })}
      </div>
    );
  }

  if (typeof value === 'object') {
    return <span className="v2-mono-value">{JSON.stringify(value)}</span>;
  }

  return <span>{String(value)}</span>;
}

export default function VendorDrawer({ vendor, onClose, onUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeGroup, setActiveGroup] = useState('identity');
  const [extracting, setExtracting] = useState(false);
  const [job, setJob] = useState(null);
  const [crmStage, setCrmStage] = useState(crmStageOf(vendor));
  const [crmNote, setCrmNote] = useState('');
  const [crmNotes, setCrmNotes] = useState(Array.isArray(vendor?.crmNotes) ? vendor.crmNotes : []);
  const [crmSaving, setCrmSaving] = useState(false);
  const [crmMessage, setCrmMessage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!vendor) return;
    setCrmStage(crmStageOf(vendor));
    setCrmNotes(Array.isArray(vendor.crmNotes) ? vendor.crmNotes : []);
    setCrmNote('');
    setCrmMessage('');
    setProfile(null);
    setError('');
    setActiveGroup('identity');
    setJob(null);
    loadProfile();
  }, [vendor?.id]);

  const loadProfile = async () => {
    if (!vendor) return;
    setLoading(true);
    setError('');
    try {
      const data = await getVendorProfile(vendor.id);
      if (!mountedRef.current) return;
      setProfile(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.response?.data?.error || err.message || 'Could not load profile.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const runDeepExtraction = async () => {
    if (!vendor || extracting) return;
    setExtracting(true);
    setError('');
    try {
      const response = await deepExtractVendor(vendor.id, {
        force: true,
        includeWebsite: Boolean(vendor.website),
        includeGoogle: true
      });
      const jobId = response?.jobId;
      if (!jobId) {
        await loadProfile();
        onUpdated?.();
        return;
      }

      const started = Date.now();
      let current = null;
      while (mountedRef.current && Date.now() - started < 180000) {
        await new Promise(resolve => setTimeout(resolve, 1800));
        current = await getDeepJob(jobId);
        if (!mountedRef.current) return;
        setJob(current);
        if (current && ['completed', 'failed', 'stopped'].includes(current.status)) break;
      }
      await loadProfile();
      onUpdated?.();
      if (current?.status === 'failed') {
        setError('Deep extraction finished with errors. Review the warnings below.');
      }
    } catch (err) {
      if (mountedRef.current) setError(err?.response?.data?.error || err.message || 'Deep extraction failed.');
    } finally {
      if (mountedRef.current) setExtracting(false);
    }
  };

  const saveCrm = async () => {
    if (!vendor) return;
    setCrmSaving(true);
    setCrmMessage('');
    try {
      const response = await updateVendorCrm(vendor.id, {
        crmStage,
        note: crmNote.trim() || undefined
      });
      const updated = response?.vendor;
      if (updated) {
        setCrmNotes(Array.isArray(updated.crmNotes) ? updated.crmNotes : crmNotes);
        setCrmStage(crmStageOf(updated));
      }
      setCrmNote('');
      setCrmMessage('Saved');
      onUpdated?.();
      setTimeout(() => setCrmMessage(''), 1800);
    } catch (err) {
      setCrmMessage(err?.response?.data?.error || 'Save failed');
    } finally {
      setCrmSaving(false);
    }
  };

  const groupProgress = profile?.completeness?.byGroup || {};
  const sources = profile?.sources || {};
  const unknownCount = profile ? Object.values(profile.fieldStatus || {}).filter(status => status === 'unknown').length : 0;
  const conflictCount = profile?.conflicts?.length || 0;

  const summary = useMemo(() => {
    if (!profile) return null;
    return {
      known: profile.completeness?.known || 0,
      total: profile.completeness?.total || 52,
      score: profile.completeness?.percent || 0,
      bucket: profile.completeness?.bucket || 'thin'
    };
  }, [profile]);

  if (!vendor) return null;

  const address = vendor.address || [vendor.city, vendor.district, vendor.state, vendor.pincode].filter(Boolean).join(', ');
  const hasLogo = vendor.logo && !/ui-avatars/i.test(vendor.logo) && !/google\.com\/s2\/favicons/i.test(vendor.logo);

  return (
    <div className="v2-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="v2-drawer" role="dialog" aria-modal="true" aria-label={vendor.name || 'Vendor profile'}>
        <header className="v2-drawer-top">
          <span className="v2-drawer-crumb">VENDOR PROFILE <b>/</b> {vendor.id}</span>
          <div className="v2-drawer-top-actions">
            <button type="button" className="v2-icon-btn" onClick={loadProfile} title="Refresh profile" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'v2-spin' : ''} />
            </button>
            <button type="button" className="v2-icon-btn" onClick={onClose} title="Close profile">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="v2-drawer-scroll">
          <section className="v2-drawer-hero">
            <div className="v2-drawer-avatar">
              {hasLogo
                ? <img src={vendor.logo} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />
                : <b>{(vendor.name || '?').slice(0, 1).toUpperCase()}</b>}
            </div>
            <div className="v2-drawer-title">
              <div className="v2-drawer-eyebrow">
                <span>{vendor.category || 'Uncategorised'}</span>
                {vendor.verified && <StatusPill tone="lime">VERIFIED</StatusPill>}
                {profile?.hasDeepProfile && <StatusPill tone="cyan">DEEP PROFILE</StatusPill>}
              </div>
              <h2>{vendor.name || 'Unknown vendor'}</h2>
              <p><MapPin size={13} /> {address || 'Address unknown'}</p>
              <div className="v2-drawer-quick">
                {vendor.phone && <a href={`tel:${vendor.phone}`}><Phone size={13} /> {vendor.phone}</a>}
                {vendor.email && <a href={`mailto:${vendor.email}`}><Mail size={13} /> {vendor.email}</a>}
                {vendor.website && <a href={vendor.website} target="_blank" rel="noreferrer"><Globe2 size={13} /> Website</a>}
                {vendor.mapsLink && <a href={vendor.mapsLink} target="_blank" rel="noreferrer"><MapPin size={13} /> Maps</a>}
                {vendor.whatsappLink && <a href={vendor.whatsappLink} target="_blank" rel="noreferrer"><Send size={13} /> WhatsApp</a>}
              </div>
            </div>
            <div className="v2-drawer-score">
              <ScoreRing value={summary?.score || vendor.profileQuality?.score || 0} size={92} label="complete" />
              <small>{summary ? `${summary.known}/${summary.total} fields known` : 'Live record view'}</small>
            </div>
          </section>

          <section className="v2-drawer-metrics">
            <div><span>CONFIDENCE</span><b>{summary ? `${summary.score}%` : '—'}</b><small>{summary?.bucket || 'not extracted'}</small></div>
            <div><span>UNKNOWN FIELDS</span><b>{profile ? unknownCount : '—'}</b><small>never guessed</small></div>
            <div><span>CONFLICTS</span><b className={conflictCount ? 'tone-amber' : ''}>{profile ? conflictCount : '—'}</b><small>source disagreements</small></div>
            <div><span>LAST DEEP PASS</span><b className="is-small">{profile?.extractedAt ? relativeTime(profile.extractedAt) : 'Never'}</b><small>{profile?.version ? `v${profile.version}` : 'not run'}</small></div>
          </section>

          {!profile?.hasDeepProfile && !loading && (
            <div className="v2-drawer-notice">
              <Zap size={15} />
              <span>
                <b>Live record only.</b> Fields below come from the existing scrape. Run a deep pass to crawl the website and Google Maps profile.
              </span>
            </div>
          )}

          {error && (
            <div className="v2-drawer-error"><AlertTriangle size={14} /> {error}</div>
          )}

          <section className="v2-drawer-actions">
            <button type="button" className="v2-btn v2-btn-lime" onClick={runDeepExtraction} disabled={extracting || !vendor.id}>
              {extracting ? <Loader2 size={15} className="v2-spin" /> : <Zap size={15} />}
              {extracting ? 'DEEP EXTRACTION RUNNING' : 'RUN DEEP EXTRACTION'}
            </button>
            <span className="v2-drawer-actions-hint">
              Fills missing emails, websites, hours and social handles. Safe to re-run.
            </span>
          </section>

          <section className="v2-drawer-crm">
            <div className="v2-drawer-crm-head">
              <span><MessageSquare size={13} /> SALES PIPELINE</span>
              <b>{crmStage.replace(/_/g, ' ')}</b>
            </div>

            <div className="v2-crm-stage-chips" role="group" aria-label="CRM stage">
              {CRM_STAGES.map(stage => (
                <button
                  type="button"
                  key={stage.id}
                  className={cx('v2-crm-stage-chip', `tone-${stage.tone}`, crmStage === stage.id && 'is-on')}
                  onClick={() => setCrmStage(stage.id)}
                  aria-pressed={crmStage === stage.id}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            <label className="v2-crm-note-field">
              <span>ADD A NOTE</span>
              <textarea
                value={crmNote}
                onChange={event => setCrmNote(event.target.value)}
                placeholder="Called the owner, asked for a quote. Follow up Monday…"
                rows={3}
              />
            </label>

            <div className="v2-crm-save-row">
              <button type="button" className="v2-btn v2-btn-lime v2-btn-sm" onClick={saveCrm} disabled={crmSaving}>
                {crmSaving ? <Loader2 size={12} className="v2-spin" /> : <CheckCircle2 size={12} />}
                SAVE CRM
              </button>
              {crmMessage && <small className={cx('v2-crm-msg', crmMessage === 'Saved' && 'is-ok')}>{crmMessage}</small>}
            </div>

            {crmNotes.length > 0 && (
              <div className="v2-crm-notes">
                <span className="v2-crm-notes-title">NOTE HISTORY · {crmNotes.length}</span>
                {crmNotes.slice(0, 6).map((note, index) => (
                  <div className="v2-crm-note" key={`${note.date || index}-${index}`}>
                    <p>{note.text}</p>
                    <small>{note.author || 'You'} · {relativeTime(note.date)}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          {job && extracting && (
            <div className="v2-job-inline">
              <div>
                <span>DEEP JOB {job.id}</span>
                <b>{job.status} · {job.progressPercent}%</b>
              </div>
              <span className="v2-progress"><i style={{ width: `${job.progressPercent}%` }} /></span>
            </div>
          )}

          <section className="v2-drawer-sources">
            <div className={cx('v2-source-card', sources.website?.ok && 'is-ok')}>
              <Globe2 size={15} />
              <span>
                <b>Website crawl</b>
                <small>{sources.website?.ok ? `${sources.website.pagesCrawled || 0} pages · ${humanSource('website')}` : sources.website?.skipped ? 'Skipped' : 'No website'}</small>
              </span>
              <StatusPill tone={sources.website?.ok ? 'lime' : 'neutral'}>{sources.website?.ok ? 'ONLINE' : 'OFF'}</StatusPill>
            </div>
            <div className={cx('v2-source-card', sources.google?.ok && 'is-ok')}>
              <MapPin size={15} />
              <span>
                <b>Google Maps</b>
                <small>{sources.google?.ok ? `${Math.round((sources.google.durationMs || 0) / 100) / 10}s · place detail DOM` : 'Not extracted yet'}</small>
              </span>
              <StatusPill tone={sources.google?.ok ? 'lime' : 'neutral'}>{sources.google?.ok ? 'ONLINE' : 'OFF'}</StatusPill>
            </div>
          </section>

          {loading && !profile && (
            <div className="v2-drawer-loading"><Loader2 size={18} className="v2-spin" /> Loading field contract…</div>
          )}

          {profile && (
            <>
              <nav className="v2-drawer-groups">
                {(profile.fieldGroups || []).map(group => {
                  const stat = groupProgress[group.key] || { known: 0, total: group.fields.length, percent: 0 };
                  return (
                    <button
                      type="button"
                      key={group.key}
                      className={cx('v2-group-tab', activeGroup === group.key && 'is-active')}
                      onClick={() => setActiveGroup(group.key)}
                    >
                      <span>{group.label}</span>
                      <b>{stat.known}/{stat.total}</b>
                      <i style={{ width: `${stat.percent}%` }} />
                    </button>
                  );
                })}
              </nav>

              {(profile.fieldGroups || []).filter(group => group.key === activeGroup).map(group => (
                <section className="v2-field-group" key={group.key}>
                  <header>
                    <div>
                      <span>GROUP {String((profile.fieldGroups || []).indexOf(group) + 1).padStart(2, '0')}</span>
                      <h3>{group.label}</h3>
                    </div>
                    <small>{groupProgress[group.key]?.percent || 0}% complete</small>
                  </header>

                  {group.fields.map(field => {
                    const path = `${group.key}.${field.key}`;
                    const value = profile.groups?.[group.key]?.[field.key];
                    const status = profile.fieldStatus?.[path] || (isKnown(value) ? 'known' : 'unknown');
                    const conflict = (profile.conflicts || []).find(item => item.field === path);
                    const provenance = fieldProvenance(profile, field, path);

                    return (
                      <div className={cx('v2-field-row', `status-${status}`)} key={path}>
                        <div className="v2-field-label">
                          <span className={cx('v2-status-dot', `tone-${status}`)} />
                          <span>
                            <b>{field.label}</b>
                            <small>{path}</small>
                          </span>
                        </div>
                        <div className="v2-field-value">
                          {renderValue(field, value)}
                          {status === 'unknown' && (
                            <small className="v2-field-reason">Not observed on website, Maps or the existing record. Left unknown on purpose.</small>
                          )}
                          {conflict && (
                            <div className="v2-conflict">
                              <div className="v2-conflict-head"><AlertTriangle size={13} /><b>Source conflict</b><span>chosen: {humanSource(conflict.chosenSource)}</span></div>
                              <div className="v2-conflict-values">
                                {conflict.values.map((item, index) => (
                                  <span key={index}><b>{humanSource(item.source)}</b>{String(item.value)}</span>
                                ))}
                              </div>
                              {conflict.reason && <small>{conflict.reason}</small>}
                            </div>
                          )}
                          {provenance.length > 0 && (
                            <div className="v2-provenance">
                              {provenance.map((item, index) => (
                                <span key={`${item.source}-${index}`} title={item.url || ''}>
                                  <CheckCircle2 size={11} />
                                  {humanSource(item.source)}
                                  {item.confidence != null && <b>{Math.round(Number(item.confidence) * 100)}%</b>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))}

              {profile.warnings?.length > 0 && (
                <section className="v2-drawer-warnings">
                  <h4><AlertTriangle size={13} /> EXTRACTION WARNINGS</h4>
                  {profile.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                </section>
              )}

              <section className="v2-drawer-footer">
                <Clock3 size={13} />
                <span>
                  {profile.extractedAt ? `Extracted ${relativeTime(profile.extractedAt)}` : 'Not deep-extracted yet'}
                  {profile.provenance?.length ? ` · ${profile.provenance.length} provenance records` : ''}
                  {' · '}Unknown values are never fabricated.
                </span>
              </section>
            </>
          )}

          {!loading && !profile && !error && (
            <div className="v2-drawer-loading"><CircleHelp size={16} /> No profile data available for this vendor.</div>
          )}
        </div>
      </aside>
    </div>
  );
}
