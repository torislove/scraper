import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AtSign,
  Award,
  BadgeCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Hash,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users
} from 'lucide-react';

/**
 * 3D Glass Icons for Social Platforms
 * Crafted with specular highlights, glass gradients, and ambient depth.
 */
export function Glass3DInstagramIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-glass-bg" cx="30%" cy="107%" r="130%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
        <linearGradient id="ig-sheen" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="ig-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#d6249f" floodOpacity="0.38" />
        </filter>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#ig-glass-bg)" filter="url(#ig-glow)" />
      <rect x="7" y="7" width="50" height="24" rx="15" fill="url(#ig-sheen)" opacity="0.35" />
      <rect x="18" y="18" width="28" height="28" rx="8" stroke="#ffffff" strokeWidth="4" />
      <circle cx="32" cy="32" r="7" stroke="#ffffff" strokeWidth="4" />
      <circle cx="40" cy="24" r="2" fill="#ffffff" />
    </svg>
  );
}

export function Glass3DFacebookIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fb-glass-bg" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#2b87ff" />
          <stop offset="50%" stopColor="#1877f2" />
          <stop offset="100%" stopColor="#0d52b9" />
        </linearGradient>
        <linearGradient id="fb-sheen" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="fb-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1877f2" floodOpacity="0.4" />
        </filter>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#fb-glass-bg)" filter="url(#fb-glow)" />
      <rect x="7" y="7" width="50" height="24" rx="15" fill="url(#fb-sheen)" opacity="0.32" />
      <path
        d="M36 34h5l1-6h-6v-4c0-1.7.5-3 3-3h3v-5.2c-.5-.1-2.2-.2-4.2-.2-4.2 0-7.1 2.6-7.1 7.3V28h-5v6h5v16h6.3V34H36z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function Glass3DXTwitterIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="x-glass-bg" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#2c3440" />
          <stop offset="50%" stopColor="#14171a" />
          <stop offset="100%" stopColor="#05070a" />
        </linearGradient>
        <linearGradient id="x-sheen" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="x-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#x-glass-bg)" filter="url(#x-glow)" stroke="#475569" strokeWidth="1" />
      <rect x="7" y="7" width="50" height="24" rx="15" fill="url(#x-sheen)" opacity="0.25" />
      <path
        d="M20 18l9.8 13.1L20 44h2.5l8.4-11.2 6.8 11.2H46L35.6 30.1 44.8 18h-2.5l-7.7 10.2L28.3 18H20zm3.8 2h3.9l14.5 22h-3.9L23.8 20z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function Glass3DTikTokIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tt-glass-bg" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#1f1f23" />
          <stop offset="50%" stopColor="#0b0b0e" />
          <stop offset="100%" stopColor="#010101" />
        </linearGradient>
        <linearGradient id="tt-sheen" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="tt-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="4" stdDeviation="5" floodColor="#00f2fe" floodOpacity="0.4" />
          <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#fe2c55" floodOpacity="0.4" />
        </filter>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#tt-glass-bg)" filter="url(#tt-glow)" stroke="#334155" strokeWidth="1" />
      <rect x="7" y="7" width="50" height="24" rx="15" fill="url(#tt-sheen)" opacity="0.25" />
      <path
        d="M39 19c1.6 2.3 4 3.8 6.7 4.1v5.1c-2.6-.1-5-.8-7-2v11.4c0 6.3-5.1 11.4-11.4 11.4S16 43.9 16 37.6s5.1-11.4 11.4-11.4c.8 0 1.6.1 2.3.3v5.6c-.7-.3-1.5-.5-2.3-.5-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V15h5.6c0 1.5.3 2.9 1 4z"
        fill="#00f2fe"
        transform="translate(-1, -1)"
      />
      <path
        d="M39 19c1.6 2.3 4 3.8 6.7 4.1v5.1c-2.6-.1-5-.8-7-2v11.4c0 6.3-5.1 11.4-11.4 11.4S16 43.9 16 37.6s5.1-11.4 11.4-11.4c.8 0 1.6.1 2.3.3v5.6c-.7-.3-1.5-.5-2.3-.5-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V15h5.6c0 1.5.3 2.9 1 4z"
        fill="#fe2c55"
        transform="translate(1, 1)"
      />
      <path
        d="M39 19c1.6 2.3 4 3.8 6.7 4.1v5.1c-2.6-.1-5-.8-7-2v11.4c0 6.3-5.1 11.4-11.4 11.4S16 43.9 16 37.6s5.1-11.4 11.4-11.4c.8 0 1.6.1 2.3.3v5.6c-.7-.3-1.5-.5-2.3-.5-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6V15h5.6c0 1.5.3 2.9 1 4z"
        fill="#ffffff"
      />
    </svg>
  );
}

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram Business',
    tagline: 'Public Bios, Link-in-Bio, WhatsApp & Email Extraction',
    color: '#d6249f',
    bg: 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 50%, #fffbeb 100%)',
    borderColor: '#f472b6',
    iconComponent: Glass3DInstagramIcon,
    extractedFields: [
      { label: 'Public Handle & Profile URL', icon: AtSign },
      { label: 'Verified Badge Status', icon: BadgeCheck },
      { label: 'Follower & Post Metrics', icon: Users },
      { label: 'Bio Copy & Business Category', icon: Tag },
      { label: 'Link-in-Bio & Website URL', icon: ExternalLink },
      { label: 'Public Business Email', icon: Mail },
      { label: 'Direct Phone & WhatsApp Action', icon: MessageCircle }
    ],
    enrichmentActions: [
      'Cross-links Instagram handles to matching Maps & Website vendor records',
      'Normalizes phone numbers extracted from bio text into E.164 & wa.me links',
      'Merges multi-source contact fields in the frontend without creating duplicates',
      '100% logged-out public OpenGraph & metadata extraction (no login needed)'
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook Pages',
    tagline: 'Page Contact Cards, Ratings, Hours & WhatsApp Links',
    color: '#1877f2',
    bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #fffbeb 100%)',
    borderColor: '#60a5fa',
    iconComponent: Glass3DFacebookIcon,
    extractedFields: [
      { label: 'Official Page URL & Category', icon: Globe },
      { label: 'Follower, Like & Check-In Counts', icon: TrendingUp },
      { label: 'Public Star Rating & Review Totals', icon: Star },
      { label: 'Direct WhatsApp Click-to-Chat Link', icon: MessageCircle },
      { label: 'Public Phone & Email Contact', icon: Phone },
      { label: 'Registered Address & Postal PIN', icon: MapPin },
      { label: 'Operating Hours & Website URL', icon: Clock }
    ],
    enrichmentActions: [
      'Cross-verifies street address and phone numbers against Maps & registry records',
      'Tags verified mobile and WhatsApp-ready contacts immediately on ingestion',
      'Consolidates page ratings, website links, and categories into one profile',
      'Reads only publicly accessible page metadata with zero authentication required'
    ]
  },
  {
    id: 'twitter',
    name: 'X (formerly Twitter)',
    tagline: 'Founder Handles, Org Verification & Website Attribution',
    color: '#0f172a',
    bg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #fffbeb 100%)',
    borderColor: '#94a3b8',
    iconComponent: Glass3DXTwitterIcon,
    extractedFields: [
      { label: 'Account Handle & Display Name', icon: AtSign },
      { label: 'Blue, Gold or Gov Verification Flag', icon: BadgeCheck },
      { label: 'Follower & Following Metrics', icon: Users },
      { label: 'Bio Description & Location String', icon: Tag },
      { label: 'Official Website & Pinned URLs', icon: Link2 },
      { label: 'Public Contact Email in Bio', icon: Mail }
    ],
    enrichmentActions: [
      'Links X organization handles and domains back to unified B2B company records',
      'Extracts public contact emails and website URLs embedded in profile headers',
      'Tracks follower scale and organization badge type for outreach prioritization',
      'Strictly public read-only profile metadata with zero account session usage'
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok for Business',
    tagline: 'International Commercial Profiles, Link-in-Bio & Emails',
    color: '#0f172a',
    bg: 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 45%, #ecfeff 100%)',
    borderColor: '#f43f5e',
    iconComponent: Glass3DTikTokIcon,
    extractedFields: [
      { label: 'Commercial Handle & Profile Link', icon: AtSign },
      { label: 'Follower & Cumulative Like Totals', icon: TrendingUp },
      { label: 'Public Bio & Region Indicators', icon: Globe },
      { label: 'Link-in-Bio & Website Destination', icon: ExternalLink },
      { label: 'Public Business Contact Email', icon: Mail },
      { label: 'Social Storefront Category Tags', icon: Hash }
    ],
    enrichmentActions: [
      'Expands coverage across US, UK, CA, AU, AE, SG, NZ, ZA, IE & DE service businesses',
      'Pairs social website links with deep multi-page website extraction in the frontend',
      'Deduplicates handles across social channels so each business keeps one clean row',
      '100% public profile metadata extraction without storing user credentials'
    ]
  }
];

export default function SocialEnrichmentShowcase() {
  const [selectedId, setSelectedId] = useState('instagram');
  const activePlatform = SOCIAL_PLATFORMS.find((p) => p.id === selectedId) || SOCIAL_PLATFORMS[0];
  const IconComponent = activePlatform.iconComponent;

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
      {/* Eyebrow Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        <span className="lx-highlight-tag">
          <Sparkles size={12} color="#b45309" />
          <span>SOCIAL &amp; WEB METADATA EXTRACTION · 100% LOGGED-OUT</span>
        </span>
      </div>

      {/* Headline */}
      <h2
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 'clamp(20px, 2.3vw, 28px)',
          fontWeight: 850,
          color: '#0f172a',
          margin: '0 0 6px',
          letterSpacing: '-0.025em'
        }}
      >
        Extracted Social Signals.{' '}
        <span className="lx-gradient-text">Unified Live in the Frontend.</span>
      </h2>

      <p style={{ fontSize: 12.5, color: '#475569', maxWidth: '72ch', margin: '0 auto 12px', lineHeight: 1.45 }}>
        Every social profile discovered alongside your business query is parsed for verified contact links, emails, follower metrics, and website URLs—then merged into one deduplicated lead record inside your Command Center.
      </p>

      {/* Four Interactive Platform Selector Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 10,
          marginBottom: 12
        }}
      >
        {SOCIAL_PLATFORMS.map((platform) => {
          const isSelected = platform.id === selectedId;
          const PIcon = platform.iconComponent;
          return (
            <motion.button
              key={platform.id}
              type="button"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setSelectedId(platform.id)}
              style={{
                background: isSelected ? '#ffffff' : 'rgba(255,255,255,0.78)',
                border: isSelected ? `1.5px solid #d97706` : '1px solid rgba(203,213,225,0.85)',
                borderRadius: 14,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isSelected
                  ? '0 10px 24px -8px rgba(217, 119, 6, 0.25), 0 0 0 1px rgba(217, 119, 6, 0.25)'
                  : '0 2px 6px rgba(15,23,42,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <PIcon size={36} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                    {platform.name}
                  </h4>
                  {isSelected && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {platform.extractedFields.length} Extracted Fields
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 3D Animated Extracted Fields & Frontend Enrichment Breakdown */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePlatform.id}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.24 }}
          style={{
            background: activePlatform.bg,
            border: '1.5px solid rgba(217, 119, 6, 0.35)',
            borderRadius: 18,
            padding: '16px 20px',
            boxShadow: '0 16px 36px -14px rgba(120, 53, 15, 0.16), inset 0 1.5px 0 rgba(255,255,255,0.95)',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(217,119,6,0.16)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconComponent size={40} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                    {activePlatform.name}
                  </h3>
                  <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#fffbeb', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>
                    REAL SCHEMA EXTRACTION
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  {activePlatform.tagline}
                </p>
              </div>
            </div>

            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: 999, border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Layers size={12} />
              <span>Merged to Vendor Profile</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14 }}>
            {/* Left: Exact Extracted Fields with Icons */}
            <div
              style={{
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(217,119,6,0.22)',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(15,23,42,0.04)'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 850, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="#d97706" />
                <span>Exact Data Points Extracted</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activePlatform.extractedFields.map((field) => {
                  const FieldIcon = field.icon;
                  return (
                    <span
                      key={field.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 10px',
                        borderRadius: 9,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#1e293b',
                        boxShadow: '0 2px 5px rgba(15,23,42,0.04)'
                      }}
                    >
                      <FieldIcon size={12} color="#d97706" />
                      <span>{field.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Right: Frontend Enrichment Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} color="#d97706" />
                  <span>Frontend Enrichment &amp; Linking</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11.5, color: '#334155' }}>
                  {activePlatform.enrichmentActions.map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <CheckCircle2 size={14} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 11px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px dashed rgba(217,119,6,0.35)',
                  fontSize: 10.5,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <ShieldCheck size={15} color="#059669" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Zero Mockups &amp; Logged-Out:</strong> Extracted only from public business pages and OpenGraph metadata; missing fields remain blank.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
