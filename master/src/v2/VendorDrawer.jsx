import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, Building2, Calendar, Check, CheckCircle2, Clock3,
  Compass, Copy, ExternalLink, Globe2, Loader2, Mail, MapPin,
  MessageSquare, Navigation, Phone, RefreshCw, Send, ShieldCheck,
  Star, Utensils, X, Zap
} from 'lucide-react';
import {
  getVendorProfile, deepExtractVendor, deepEnrichVendor, getDeepJob, updateVendorCrm
} from './api';
import {
  CopyButton, StatusPill, ScoreRing, Unknown, cx, formatNumber, relativeTime
} from './ui';
import { CRM_STAGES, crmStageOf } from './utils/leadStages';
import { parseAdaptivePhone, parseIndianPhone, isIndianMobile } from '../utils/phoneClassify';

function isCssOrCodeSnippet(text) {
  if (!text || typeof text !== 'string') return false;
  if (/--[a-z0-9_-]+:/i.test(text)) return true;
  if (/[{};]\s*--/i.test(text)) return true;
  if (/(?:rgba?|hsla?)\s*\(/i.test(text)) return true;
  if (/(?:mOnSite|shouldReportErrorOnlyInPanorama|window\.__|document\.)/i.test(text)) return true;
  if (/#[0-9a-fA-F]{6}\b/.test(text) && text.includes(';')) return true;
  if (text.includes('var(--') || text.includes('!important')) return true;
  if (/[{}"\\]/.test(text) && (text.includes('true') || text.includes('false') || text.includes('null'))) return true;
  return false;
}

function detectCountry(vendor, fullAddress) {
  if (vendor?.country || vendor?.countryCode) {
    const c = String(vendor.country || vendor.countryCode).toUpperCase();
    if (c === 'US' || c === 'USA') return 'US';
    if (c === 'CA') return 'CA';
    if (c === 'GB' || c === 'UK') return 'GB';
    if (c === 'AU') return 'AU';
    if (c === 'IN') return 'IN';
  }
  const str = `${fullAddress || ''} ${vendor?.address || ''} ${vendor?.state || ''} ${vendor?.location || ''} ${vendor?.city || ''}`;
  if (/\b(?:USA|United States|Indiana|California|Texas|Florida|New York|Illinois|Ohio|Michigan|Washington)\b/i.test(str)) return 'US';
  if (/\b(?:Canada|Ontario|Quebec|British Columbia|Alberta|Manitoba)\b/i.test(str)) return 'CA';
  if (/\b(?:UK|United Kingdom|England|Scotland|London)\b/i.test(str)) return 'GB';
  if (/\b(?:Australia|Sydney|Melbourne|Brisbane|NSW)\b/i.test(str)) return 'AU';
  return 'IN';
}

function safeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || isCssOrCodeSnippet(raw)) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return '';
}

function extractArea(address, cityHint) {
  if (!address || typeof address !== 'string' || isCssOrCodeSnippet(address)) return '';
  const segs = address.split(',').map(s => s.trim()).filter(Boolean);
  const clean = segs.filter(s => !/^\d{5,6}$/.test(s) && !/^(Telangana|Andhra Pradesh|Karnataka|Maharashtra|Tamil Nadu|India)$/i.test(s));
  if (clean.length >= 2) {
    const cand = clean[clean.length - 2];
    if (cand && cand.length >= 3 && cand.length <= 40 && !/^(near|opp|behind|plot|door|flat|shop|floor|no\.)/i.test(cand) && !isCssOrCodeSnippet(cand)) {
      return cand;
    }
  }
  if (clean.length >= 1) {
    const cand = clean[clean.length - 1];
    if (cand.toLowerCase() !== (cityHint || '').toLowerCase() && !isCssOrCodeSnippet(cand)) {
      return cand;
    }
  }
  return '';
}

function getDirectGoogleMapsUrl(vendor, fullAddress) {
  if (vendor?.mapsLink && /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google|maps\.app)/i.test(vendor.mapsLink)) {
    return vendor.mapsLink;
  }
  const cleanName = !isCssOrCodeSnippet(vendor?.name) ? vendor?.name : '';
  const cleanAddr = !isCssOrCodeSnippet(fullAddress) ? fullAddress : (!isCssOrCodeSnippet(vendor?.city) ? vendor?.city : '');
  const query = [cleanName, cleanAddr].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function VendorDrawer({ vendor, onClose, onUpdated, onOpenWhatsApp }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      // 1. Direct aggressive enrichment for phone/mobile/email/socials
      try {
        const enriched = await deepEnrichVendor(vendor.id);
        if (enriched?.vendor && mountedRef.current) {
          if (enriched.vendor.phone && !vendor.phone) {
            setCrmMessage(`Aggressive Hunter found: ${enriched.vendor.phone}`);
          }
        }
      } catch (e) {
        console.warn('Direct deep-enrich note:', e?.message);
      }

      // 2. Also run comprehensive deep extraction pipeline
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
        setError('Deep extraction finished with errors.');
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

  if (!vendor) return null;

  // Contact fields resolution (Vendor record + Deep Profile)
  const contactGroup = profile?.groups?.contact || {};
  const locationGroup = profile?.groups?.location || {};
  const reputationGroup = profile?.groups?.reputation || {};
  const operationsGroup = profile?.groups?.operations || {};
  const offeringsGroup = profile?.groups?.offerings || {};
  const socialGroup = profile?.groups?.social || {};

  const country = detectCountry(vendor, vendor.address || locationGroup.address);
  const primaryPhone = vendor.phone || contactGroup.primaryPhone || contactGroup.phone || '';
  const parsedPhone = parseAdaptivePhone(primaryPhone, country);
  const isMobile = Boolean(parsedPhone && parsedPhone.isMobile);
  const isLandline = Boolean(parsedPhone && parsedPhone.isLandline);
  const formattedDisplayPhone = parsedPhone ? parsedPhone.display : primaryPhone;
  const callUrl = parsedPhone ? parsedPhone.callUrl : (primaryPhone ? `tel:${String(primaryPhone).replace(/\s+/g, '')}` : '');
  const whatsappUrl = parsedPhone?.whatsappUrl || (isMobile ? `https://wa.me/${String(primaryPhone).replace(/\D/g, '')}` : '');

  // Parse all phone numbers, normalize and deduplicate by E.164
  const allParsedPhones = useMemo(() => {
    const rawList = [
      primaryPhone,
      ...(Array.isArray(vendor.phones) ? vendor.phones : []),
      ...(contactGroup.alternatePhones || []),
      ...(vendor.otherInfo?.mobileNumbers || [])
    ].filter(Boolean);

    const map = new Map();
    for (const raw of rawList) {
      if (typeof raw !== 'string' && typeof raw !== 'number') continue;
      const parsed = parseAdaptivePhone(raw, country);
      if (!parsed) continue;
      const key = parsed.e164 || parsed.national;
      if (!map.has(key)) {
        map.set(key, parsed);
      }
    }
    return Array.from(map.values());
  }, [primaryPhone, vendor.phones, contactGroup.alternatePhones, vendor.otherInfo, country]);

  const displayEmail = (!isCssOrCodeSnippet(vendor.email) && vendor.email)
    || (!isCssOrCodeSnippet(contactGroup.email) && contactGroup.email)
    || (Array.isArray(vendor.emails) ? vendor.emails.find(e => !isCssOrCodeSnippet(e)) : '') || '';
  const displayWebsite = (!isCssOrCodeSnippet(vendor.website) && vendor.website) || (!isCssOrCodeSnippet(contactGroup.website) && contactGroup.website) || '';

  const rawAddress = vendor.address || locationGroup.address || '';
  const cleanAddress = !isCssOrCodeSnippet(rawAddress) ? rawAddress : '';
  const fullAddressLine = cleanAddress || [vendor.city, vendor.district, vendor.state, vendor.pincode].filter(v => v && !isCssOrCodeSnippet(v)).join(', ');

  const displayLocality = (!isCssOrCodeSnippet(vendor.locality) && vendor.locality)
    || (!isCssOrCodeSnippet(vendor.suburb) && vendor.suburb)
    || (!isCssOrCodeSnippet(locationGroup.locality) && locationGroup.locality)
    || extractArea(fullAddressLine, vendor.city) || vendor.city || '';

  const displayMandal = (!isCssOrCodeSnippet(vendor.mandal) && vendor.mandal)
    || (!isCssOrCodeSnippet(locationGroup.mandal) && locationGroup.mandal)
    || '';

  const displayDistrict = (!isCssOrCodeSnippet(vendor.district) && vendor.district)
    || (!isCssOrCodeSnippet(locationGroup.district) && locationGroup.district)
    || vendor.city || '';

  const displayState = (!isCssOrCodeSnippet(vendor.state) && vendor.state)
    || (!isCssOrCodeSnippet(locationGroup.state) && locationGroup.state)
    || (country === 'IN' ? 'Telangana' : '');

  const rawPincode = vendor.pincode || locationGroup.pincode || (fullAddressLine.match(/\b\d{5,6}\b/) ? fullAddressLine.match(/\b\d{5,6}\b/)[0] : '');
  const displayPincode = !isCssOrCodeSnippet(rawPincode) && !rawPincode.includes(';') ? rawPincode : '';

  const cleanOperatingHours = vendor.operatingHours && !isCssOrCodeSnippet(vendor.operatingHours) && !/[{}"\\]/.test(vendor.operatingHours) && !vendor.operatingHours.includes('mOnSite')
    ? vendor.operatingHours : '';
  const latitude = vendor.latitude || locationGroup.latitude;
  const longitude = vendor.longitude || locationGroup.longitude;

  const displayRating = vendor.rating || reputationGroup.rating;
  const displayReviews = vendor.reviewsCount || reputationGroup.reviewsCount;

  const directMapsUrl = getDirectGoogleMapsUrl(vendor, fullAddressLine);
  const reservations = vendor.reservations || offeringsGroup.bookingLinks || [];
  const serviceOptions = vendor.serviceOptions || (Array.isArray(offeringsGroup.services) ? offeringsGroup.services.join(' · ') : '');
  const hoursTable = operationsGroup.hoursTable || [];

  const hasLogo = vendor.logo && !/ui-avatars/i.test(vendor.logo) && !/google\.com\/s2\/favicons/i.test(vendor.logo);

  const drawerEl = (
    <div className="v2-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="v2-drawer" role="dialog" aria-modal="true" aria-label={vendor.name || 'Vendor Profile'}>
        {/* Top Header */}
        <header className="v2-drawer-top">
          <span className="v2-drawer-crumb">
            <Building2 size={13} /> {vendor.category || 'BUSINESS'} <b>/</b> {vendor.name || vendor.id}
          </span>
          <div className="v2-drawer-top-actions">
            <button type="button" className="v2-icon-btn" onClick={loadProfile} title="Refresh Profile" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'v2-spin' : ''} />
            </button>
            <button type="button" className="v2-icon-btn" onClick={onClose} title="Close Profile">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="v2-drawer-scroll">
          {/* Executive Hero Banner */}
          <section className="v2-drawer-hero" style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: '1.5px solid #E2E8F0' }}>
            <div className="v2-drawer-avatar" style={{ width: 56, height: 56, borderRadius: 12, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
              {hasLogo
                ? <img src={vendor.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={event => { event.currentTarget.style.display = 'none'; }} />
                : <b style={{ fontSize: 20, color: '#4F46E5' }}>{(vendor.name || '?').slice(0, 1).toUpperCase()}</b>}
            </div>
            <div className="v2-drawer-title" style={{ flex: 1, minWidth: 0 }}>
              <div className="v2-drawer-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="v2-chip" style={{ background: '#EEF2FF', color: '#4338CA', fontWeight: 700, fontSize: 11 }}>
                  {vendor.category || 'Business'}
                </span>
                {vendor.verified && <StatusPill tone="lime">VERIFIED</StatusPill>}
                {displayRating ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 750, color: '#D97706', fontSize: 12 }}>
                    <Star size={13} fill="#F59E0B" color="#D97706" /> {Number(displayRating).toFixed(1)}
                    {displayReviews > 0 && (
                      <span style={{ color: '#64748B', fontWeight: 600 }}>({formatNumber(displayReviews)} Google reviews)</span>
                    )}
                  </span>
                ) : null}
              </div>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: '#0F172A', margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                {vendor.name || 'Unknown Business'}
              </h2>
              <p style={{ display: 'flex', alignItems: 'flex-start', gap: 5, color: '#94a3b8', fontSize: 12, margin: 0 }}>
                <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: '#64748B' }} />
                <span>{fullAddressLine || 'Address not listed'}</span>
              </p>
            </div>
          </section>

          {/* 3D Tactile Action Bar (Call, Email, Direct Maps, Website, Enrich) */}
          <div className="v2-drawer-3d-actions">
            {/* Primary Call Button */}
            {isLandline ? (
              <a
                href={callUrl || `tel:${primaryPhone}`}
                className="v2-3d-action-btn v2-btn-call"
                style={{ background: '#F0FDF4', color: '#166534', border: '1.5px solid #BBF7D0', fontWeight: 750 }}
                title={`Call Landline ${formattedDisplayPhone}`}
              >
                <Phone size={14} /> 📞 Call Landline ({formattedDisplayPhone})
              </a>
            ) : (
              primaryPhone ? (
                <a
                  href={callUrl || `tel:${primaryPhone}`}
                  className="v2-3d-action-btn v2-btn-call"
                  title={`Call ${formattedDisplayPhone}`}
                >
                  <Phone size={14} /> 📞 Call Vendor
                </a>
              ) : (
                <button type="button" className="v2-3d-action-btn v2-btn-call is-disabled">
                  <Phone size={14} /> 📞 Call
                </button>
              )
            )}

            {/* 3. Email Button */}
            {displayEmail ? (
              <a
                href={`mailto:${displayEmail}`}
                className="v2-3d-action-btn v2-btn-email"
                title={`Send email to ${displayEmail}`}
              >
                <Mail size={14} /> ✉️ Send Email
              </a>
            ) : (
              <button
                type="button"
                className="v2-3d-action-btn v2-btn-email is-disabled"
                title="No email discovered yet"
              >
                <Mail size={14} /> ✉️ Email
              </button>
            )}

            {/* 4. Direct Google Maps Pin */}
            <a
              href={directMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="v2-3d-action-btn v2-btn-maps"
              title="Open exact vendor pin directly on Google Maps"
            >
              <Compass size={14} /> 🗺️ Google Maps Pin
            </a>

            {/* 5. Official Website */}
            {displayWebsite ? (
              <a
                href={safeUrl(displayWebsite)}
                target="_blank"
                rel="noopener noreferrer"
                className="v2-3d-action-btn v2-btn-web"
                title="Visit official website"
              >
                <Globe2 size={14} /> 🌐 Website
              </a>
            ) : null}

            {/* 6. Live Deep Enrich */}
            <button
              type="button"
              className="v2-3d-action-btn v2-btn-enrich"
              onClick={runDeepExtraction}
              disabled={extracting}
              title="Live scrape website & places for missing details"
            >
              {extracting ? <Loader2 size={14} className="v2-spin" /> : <Zap size={14} />}
              {extracting ? 'Enriching...' : '⚡ Deep Enrich'}
            </button>
          </div>

          {error && (
            <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, color: '#991B1B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {job && extracting && (
            <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 650, color: '#1E40AF' }}>
                <span>DEEP ENRICHMENT RUNNING</span>
                <span>{job.progressPercent || 0}%</span>
              </div>
              <div style={{ height: 6, background: '#DBEAFE', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${job.progressPercent || 0}%`, height: '100%', background: '#2563EB', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* Structured Pure Data Cards (Zero Nonsense, High Density) */}
          <div style={{ padding: '0 16px 24px' }}>
            {/* Card 1: Contact Intel & Telecom */}
            <div className="v2-drawer-data-card">
              <div className="v2-drawer-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} style={{ color: '#4F46E5' }} /> CONTACT INTEL & TELECOM
                </span>
                {allParsedPhones.some(p => p.isMobile) && (
                  <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 6, fontWeight: 750, fontSize: 10 }}>
                    VERIFIED MOBILE READY
                  </span>
                )}
                {allParsedPhones.some(p => p.isLandline) && (
                  <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 6, fontWeight: 750, fontSize: 10, marginLeft: 6 }}>
                    STD LANDLINE DETECTED
                  </span>
                )}
              </div>
              <div className="v2-drawer-card-body">
                <div className="v2-data-row">
                  <span className="v2-data-label">{isLandline ? 'Primary Landline' : 'Primary Mobile'}</span>
                  <span className="v2-data-val">
                    {primaryPhone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <a href={callUrl || `tel:${primaryPhone}`} style={{ color: isLandline ? '#0F766E' : '#0F172A', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
                          {formattedDisplayPhone}
                        </a>
                        {isMobile && (
                          <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 750 }}>
                            Mobile
                          </span>
                        )}
                        {isLandline && (
                          <span style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 750 }}>
                            Landline
                          </span>
                        )}
                        <CopyButton value={formattedDisplayPhone} />
                      </span>
                    ) : <span style={{ color: '#94A3B8' }}>Not found</span>}
                  </span>
                </div>

                {allParsedPhones.length > 1 && (
                  <div className="v2-data-row" style={{ alignItems: 'flex-start' }}>
                    <span className="v2-data-label" style={{ marginTop: 6 }}>All Direct Numbers ({allParsedPhones.length})</span>
                    <span className="v2-data-val" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                      {allParsedPhones.map((p, idx) => {
                        const isPrimary = p.e164 === parsedPhone?.e164;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '5px 10px',
                              background: isPrimary ? '#F8FAFC' : '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 8
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <a href={p.callUrl} style={{ color: '#0F172A', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                                {p.display}
                              </a>
                              {p.isMobile && (
                                <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 750 }}>
                                  📱 Mobile
                                </span>
                              )}
                              {p.isLandline && (
                                <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 750 }}>
                                  ☎️ STD Landline
                                </span>
                              )}
                              {isPrimary && (
                                <span style={{ background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                                  Primary
                                </span>
                              )}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <a
                                href={p.callUrl}
                                style={{ background: '#F1F5F9', color: '#334155', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                title="Call"
                              >
                                <Phone size={10} /> Call
                              </a>
                              <CopyButton value={p.display} />
                            </span>
                          </div>
                        );
                      })}
                    </span>
                  </div>
                )}

                <div className="v2-data-row">
                  <span className="v2-data-label">Email Address</span>
                  <span className="v2-data-val">
                    {displayEmail ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <a href={`mailto:${displayEmail}`} style={{ color: '#0284C7', fontWeight: 650, textDecoration: 'none' }}>
                          {displayEmail}
                        </a>
                        <CopyButton value={displayEmail} />
                      </span>
                    ) : <span style={{ color: '#94A3B8' }}>Not published</span>}
                  </span>
                </div>

                <div className="v2-data-row">
                  <span className="v2-data-label">Official Website</span>
                  <span className="v2-data-val">
                    {displayWebsite ? (
                      <a href={safeUrl(displayWebsite)} target="_blank" rel="noopener noreferrer" style={{ color: '#4F46E5', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {displayWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                        <ExternalLink size={11} />
                      </a>
                    ) : <span style={{ color: '#94A3B8' }}>No website attached</span>}
                  </span>
                </div>

                {(socialGroup.instagram || socialGroup.facebook || socialGroup.linkedin || socialGroup.twitter) && (
                  <div className="v2-data-row">
                    <span className="v2-data-label">Social Handles</span>
                    <span className="v2-data-val" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {socialGroup.instagram && (
                        <a href={socialGroup.instagram} target="_blank" rel="noreferrer" style={{ color: '#E1306C', fontWeight: 600 }}>Instagram</a>
                      )}
                      {socialGroup.facebook && (
                        <a href={socialGroup.facebook} target="_blank" rel="noreferrer" style={{ color: '#1877F2', fontWeight: 600 }}>Facebook</a>
                      )}
                      {socialGroup.linkedin && (
                        <a href={socialGroup.linkedin} target="_blank" rel="noreferrer" style={{ color: '#0A66C2', fontWeight: 600 }}>LinkedIn</a>
                      )}
                      {socialGroup.twitter && (
                        <a href={socialGroup.twitter} target="_blank" rel="noreferrer" style={{ color: '#1DA1F2', fontWeight: 600 }}>Twitter</a>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Postal & Geographic Intel */}
            <div className="v2-drawer-data-card">
              <div className="v2-drawer-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} style={{ color: '#EA580C' }} /> POSTAL & GEOGRAPHIC INTEL
                </span>
                <a href={directMapsUrl} target="_blank" rel="noreferrer" style={{ color: '#EA580C', fontSize: 10, fontWeight: 750, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  DIRECT MAP PIN <ExternalLink size={10} />
                </a>
              </div>
              <div className="v2-drawer-card-body">
                <div className="v2-data-row">
                  <span className="v2-data-label">Complete Address</span>
                  <span className="v2-data-val">
                    {fullAddressLine} <CopyButton value={fullAddressLine} />
                  </span>
                </div>

                {displayLocality && (
                  <div className="v2-data-row">
                    <span className="v2-data-label">{country === 'IN' ? 'Locality / Suburb' : 'City / Neighborhood'}</span>
                    <span className="v2-data-val" style={{ fontWeight: 750, color: '#1E293B' }}>
                      📍 {displayLocality}
                    </span>
                  </div>
                )}

                {country === 'IN' && displayMandal && displayMandal !== displayDistrict && (
                  <div className="v2-data-row">
                    <span className="v2-data-label">Mandal / Sub-district</span>
                    <span className="v2-data-val">{displayMandal}</span>
                  </div>
                )}

                <div className="v2-data-row">
                  <span className="v2-data-label">{country === 'US' ? 'City & State' : country === 'CA' ? 'City & Province' : country === 'GB' ? 'Town & County' : 'District & State'}</span>
                  <span className="v2-data-val">{[displayDistrict, displayState].filter(Boolean).join(', ')}</span>
                </div>

                {displayPincode && (
                  <div className="v2-data-row">
                    <span className="v2-data-label">{country === 'US' ? 'ZIP Code' : country === 'CA' ? 'Postal Code' : country === 'GB' ? 'Postcode' : 'Postal PIN Code'}</span>
                    <span className="v2-data-val" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                      {displayPincode}
                    </span>
                  </div>
                )}

                {latitude && longitude && (
                  <div className="v2-data-row">
                    <span className="v2-data-label">GPS Coordinates</span>
                    <span className="v2-data-val" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                      {Number(latitude).toFixed(5)}°, {Number(longitude).toFixed(5)}°
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Reputation & Google Reviews */}
            <div className="v2-drawer-data-card">
              <div className="v2-drawer-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={13} style={{ color: '#D97706' }} /> REPUTATION & GOOGLE REVIEWS
                </span>
                {displayRating >= 4.0 && (
                  <span style={{ color: '#059669', fontWeight: 700, fontSize: 10 }}>TOP RATED</span>
                )}
              </div>
              <div className="v2-drawer-card-body">
                <div className="v2-data-row">
                  <span className="v2-data-label">Google Rating</span>
                  <span className="v2-data-val">
                    {displayRating ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: '#D97706' }}>
                        <Star size={14} fill="#F59E0B" color="#D97706" /> {Number(displayRating).toFixed(1)} / 5.0
                      </span>
                    ) : <span style={{ color: '#94A3B8' }}>No rating</span>}
                  </span>
                </div>

                <div className="v2-data-row">
                  <span className="v2-data-label">Total Reviews</span>
                  <span className="v2-data-val" style={{ fontWeight: 700, color: '#0F172A' }}>
                    {displayReviews ? `${formatNumber(displayReviews)} Google reviews` : <span style={{ color: '#94A3B8' }}>0 reviews</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Amenities, Services & Table Reservations */}
            {(serviceOptions || reservations.length > 0 || offeringsGroup.menuLink) && (
              <div className="v2-drawer-data-card">
                <div className="v2-drawer-card-head">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Utensils size={13} style={{ color: '#059669' }} /> SERVICES & RESERVATIONS
                  </span>
                </div>
                <div className="v2-drawer-card-body">
                  {serviceOptions && (
                    <div className="v2-data-row">
                      <span className="v2-data-label">Service Options</span>
                      <span className="v2-data-val" style={{ color: '#334155' }}>
                        {serviceOptions}
                      </span>
                    </div>
                  )}

                  {reservations.length > 0 && (
                    <div className="v2-data-row">
                      <span className="v2-data-label">Online Table Booking</span>
                      <span className="v2-data-val" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {reservations.map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#15803D',
                              textDecoration: 'none'
                            }}
                          >
                            {r.provider || 'Reserve'} <ExternalLink size={10} />
                          </a>
                        ))}
                      </span>
                    </div>
                  )}

                  {offeringsGroup.menuLink && (
                    <div className="v2-data-row">
                      <span className="v2-data-label">Digital Menu</span>
                      <span className="v2-data-val">
                        <a href={safeUrl(offeringsGroup.menuLink)} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 650 }}>
                          View Menu <ExternalLink size={10} />
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card 5: Operating Hours */}
            {(cleanOperatingHours || hoursTable.length > 0) && (
              <div className="v2-drawer-data-card">
                <div className="v2-drawer-card-head">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock3 size={13} style={{ color: '#6366F1' }} /> OPERATING HOURS
                  </span>
                </div>
                <div className="v2-drawer-card-body">
                  {cleanOperatingHours && (
                    <div className="v2-data-row">
                      <span className="v2-data-label">Today's Schedule</span>
                      <span className="v2-data-val" style={{ fontWeight: 650, color: '#0F172A' }}>
                        {cleanOperatingHours}
                      </span>
                    </div>
                  )}

                  {hoursTable.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {hoursTable.map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px dashed rgba(165, 184, 204, 0.12)' }}>
                          <span style={{ color: '#8fa0b3', fontWeight: 600 }}>{h.day}</span>
                          <span style={{ color: '#0F172A', fontWeight: 650 }}>{h.hours || (h.opens ? `${h.opens} – ${h.closes}` : 'Closed')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card 6: Data Source & Audit Trail */}
            <div className="v2-drawer-data-card">
              <div className="v2-drawer-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={13} style={{ color: '#64748B' }} /> AUDIT TRAIL & SOURCE
                </span>
                <span style={{ color: '#64748B', fontSize: 10 }}>SCRAPER.CO.IN VERIFIED</span>
              </div>
              <div className="v2-drawer-card-body">
                <div className="v2-data-row">
                  <span className="v2-data-label">Source Engine</span>
                  <span className="v2-data-val" style={{ color: '#475569', fontSize: 11 }}>
                    {vendor.source || 'Google Local Knowledge Graph'}
                  </span>
                </div>
                <div className="v2-data-row">
                  <span className="v2-data-label">Scraped Timestamp</span>
                  <span className="v2-data-val" style={{ color: '#475569', fontSize: 11 }}>
                    {vendor.scrapedAt ? new Date(vendor.scrapedAt).toLocaleString() : 'Recent run'}
                  </span>
                </div>
                <div className="v2-data-row">
                  <span className="v2-data-label">Lead Unique ID</span>
                  <span className="v2-data-val" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: '#64748B' }}>
                    {vendor.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawerEl, document.body);
}
