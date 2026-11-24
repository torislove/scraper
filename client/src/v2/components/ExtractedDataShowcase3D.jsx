import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Award, BadgeCheck, Briefcase, Building2, Calendar, CheckCircle2, Clock,
  Compass, Cpu, CreditCard, Database, Download, ExternalLink, FileSpreadsheet,
  FileText, Globe, Hash, Image, Languages, Layers, Link2, MapPin, MessageCircle,
  Navigation, Phone, Scale, ShieldCheck, Smartphone, Sparkles, Star, Tag, Users
} from 'lucide-react';

/**
 * ExtractedDataShowcase3D.jsx
 * Canonical 10-group, 52-field extraction & live frontend enrichment matrix
 * mapped directly to server/src/services/deepProfileService.js.
 * Zero mockups or sample fake businesses — displays only real extracted fields,
 * icons, and live frontend enrichment stages.
 */

const PIPELINE_NODES = [
  {
    id: 'extract',
    step: '01',
    title: '22-Engine Live Extraction',
    detail: 'Maps, Websites, JSON-LD, Directories & Social Profiles',
    icon: Globe
  },
  {
    id: 'enrich',
    step: '02',
    title: 'Live Frontend Enrichment',
    detail: 'E.164 Mobile & WhatsApp Tagging · 52-Field Merge · Zero Duplicates',
    icon: Sparkles
  },
  {
    id: 'export',
    step: '03',
    title: 'Command Center & Export',
    detail: 'CRM Drawer · Excel (.xlsx) · CSV · WhatsApp VCF',
    icon: FileSpreadsheet
  }
];

const DATA_GROUPS = [
  {
    id: 'contact',
    bucket: 'contact-web',
    title: 'Contact & Direct Reach',
    count: 5,
    accent: '#d97706',
    bgTint: 'rgba(255, 251, 235, 0.88)',
    icon: Phone,
    enrichment: 'Mobile regex, E.164 normalization & wa.me WhatsApp link tagging',
    fields: [
      { label: 'Primary Mobile / Phone', icon: Smartphone },
      { label: 'All Phone Numbers', icon: Phone },
      { label: 'Direct WhatsApp & wa.me', icon: MessageCircle },
      { label: 'Primary Email', icon: FileText },
      { label: 'All Extracted Emails', icon: Layers }
    ]
  },
  {
    id: 'social',
    bucket: 'contact-web',
    title: 'Websites & Social Profiles',
    count: 6,
    accent: '#b45309',
    bgTint: 'rgba(255, 252, 244, 0.88)',
    icon: Globe,
    enrichment: 'Multi-page HTML & JSON-LD crawl linking social handles to entities',
    fields: [
      { label: 'Official Website', icon: ExternalLink },
      { label: 'Instagram Profile', icon: Users },
      { label: 'Facebook Page', icon: Link2 },
      { label: 'LinkedIn Company', icon: Briefcase },
      { label: 'YouTube Channel', icon: Sparkles },
      { label: 'X / Twitter & TikTok', icon: Globe }
    ]
  },
  {
    id: 'identity',
    bucket: 'identity-legal',
    title: 'Business Identity',
    count: 8,
    accent: '#059669',
    bgTint: 'rgba(240, 253, 244, 0.85)',
    icon: Building2,
    enrichment: 'Cross-source identity merge resolving canonical business names',
    fields: [
      { label: 'Business Name', icon: Building2 },
      { label: 'Legal / Registered Name', icon: FileText },
      { label: 'Primary Category', icon: Tag },
      { label: 'Business Description', icon: Layers },
      { label: 'Tagline', icon: Sparkles },
      { label: 'Price Range', icon: CreditCard },
      { label: 'Operational Status', icon: BadgeCheck },
      { label: 'Owner / Operator', icon: Users }
    ]
  },
  {
    id: 'location',
    bucket: 'location-hours',
    title: 'Location & Geocoordinates',
    count: 8,
    accent: '#0284c7',
    bgTint: 'rgba(240, 249, 255, 0.86)',
    icon: MapPin,
    enrichment: 'Postal PIN centroid matching & micro-zone boundary verification',
    fields: [
      { label: 'Full Street Address', icon: MapPin },
      { label: 'Locality / City', icon: Navigation },
      { label: 'District', icon: Compass },
      { label: 'State / Province', icon: Globe },
      { label: 'PIN / Postal Code', icon: Hash },
      { label: 'Plus Code', icon: Tag },
      { label: 'Latitude', icon: Navigation },
      { label: 'Longitude', icon: Navigation }
    ]
  },
  {
    id: 'catalog',
    bucket: 'catalog-proof',
    title: 'Services, Products & Catalog',
    count: 9,
    accent: '#7c3aed',
    bgTint: 'rgba(245, 243, 255, 0.86)',
    icon: Briefcase,
    enrichment: 'Structured offering extraction across services, payments & booking',
    fields: [
      { label: 'Services List', icon: Briefcase },
      { label: 'Products Catalog', icon: Layers },
      { label: 'Amenities', icon: CheckCircle2 },
      { label: 'Payments Accepted', icon: CreditCard },
      { label: 'Accessibility', icon: ShieldCheck },
      { label: 'Spoken Languages', icon: Languages },
      { label: 'Booking Links', icon: Link2 },
      { label: 'Menu / Catalogue Link', icon: ExternalLink },
      { label: 'Active Promotions', icon: Tag }
    ]
  },
  {
    id: 'reputation',
    bucket: 'catalog-proof',
    title: 'Reputation & Reviews',
    count: 4,
    accent: '#d97706',
    bgTint: 'rgba(255, 251, 235, 0.88)',
    icon: Star,
    enrichment: 'Live rating aggregation, review totals & owner reply indexing',
    fields: [
      { label: 'Star Rating', icon: Star },
      { label: 'Total Review Count', icon: Users },
      { label: 'Customer Review Samples', icon: MessageCircle },
      { label: 'Owner Responses', icon: BadgeCheck }
    ]
  },
  {
    id: 'legal',
    bucket: 'identity-legal',
    title: 'Legal & Corporate Tax IDs',
    count: 3,
    accent: '#b45309',
    bgTint: 'rgba(254, 243, 199, 0.55)',
    icon: Scale,
    enrichment: 'Format validation & checksum verification on public tax filings',
    fields: [
      { label: 'GSTIN Number', icon: Scale },
      { label: 'PAN Tax Identifier', icon: ShieldCheck },
      { label: 'CIN Corporate ID', icon: Building2 }
    ]
  },
  {
    id: 'hours',
    bucket: 'location-hours',
    title: 'Operating Hours',
    count: 2,
    accent: '#0891b2',
    bgTint: 'rgba(236, 254, 255, 0.86)',
    icon: Clock,
    enrichment: 'Normalized daily open/close schedule from live directory & web schema',
    fields: [
      { label: 'Operating Hours Summary', icon: Clock },
      { label: 'Day-Wise Weekly Schedule', icon: Calendar }
    ]
  },
  {
    id: 'media',
    bucket: 'catalog-proof',
    title: 'Brand Media Assets',
    count: 3,
    accent: '#db2777',
    bgTint: 'rgba(253, 242, 248, 0.86)',
    icon: Image,
    enrichment: 'Verified high-resolution asset URLs deduplicated across sources',
    fields: [
      { label: 'Company Logo URL', icon: Sparkles },
      { label: 'Website Media Images', icon: Image },
      { label: 'Place & Storefront Photos', icon: Image }
    ]
  },
  {
    id: 'answers',
    bucket: 'catalog-proof',
    title: 'Proof & Trust Signals',
    count: 4,
    accent: '#047857',
    bgTint: 'rgba(236, 253, 245, 0.86)',
    icon: Award,
    enrichment: 'Source provenance tracking & multi-engine conflict resolution',
    fields: [
      { label: 'Structured FAQs', icon: FileText },
      { label: 'Certifications & ISO', icon: BadgeCheck },
      { label: 'Industry Awards', icon: Award },
      { label: 'Popular Visiting Times', icon: Clock }
    ]
  }
];

const FILTERS = [
  { id: 'all', label: 'All 52 Fields (10)' },
  { id: 'contact-web', label: 'Contact & Web (11)' },
  { id: 'identity-legal', label: 'Identity & Tax (11)' },
  { id: 'location-hours', label: 'Location & Hours (10)' },
  { id: 'catalog-proof', label: 'Catalog, Media & Reviews (20)' }
];

function Card3D({ group, index }) {
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 260, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, nx)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, ny)));
  };

  const handleMouseLeave = () => {
    setHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const GroupIcon = group.icon;

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.24) }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="lx-data3d-card"
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1100,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Dynamic liquid gold specular sheen on hover */}
      <div
        className="lx-data3d-sheen"
        style={{ opacity: hovered ? 1 : 0 }}
        aria-hidden="true"
      />

      {/* Card Header with Floating 3D Icon Pedestal */}
      <div className="lx-data3d-card-head" style={{ transform: 'translateZ(20px)' }}>
        <div className="lx-data3d-head-left">
          <div className="lx-data3d-icon-orb" style={{ boxShadow: `0 6px 16px -4px ${group.accent}45, inset 0 1.5px 0 rgba(255,255,255,0.9)` }}>
            <GroupIcon size={16} color={group.accent} />
          </div>
          <div>
            <h3 className="lx-data3d-card-title">{group.title}</h3>
            <span className="lx-data3d-card-count">{group.count} Tracked Fields</span>
          </div>
        </div>
        <span className="lx-data3d-live-badge">
          <span className="lx-chip-live-dot" />
          <span>ENRICHED LIVE</span>
        </span>
      </div>

      {/* Exact Backend-Tracked Fields Grid with Icons */}
      <div className="lx-data3d-fields-wrap" style={{ transform: 'translateZ(14px)' }}>
        {group.fields.map((f) => {
          const FieldIcon = f.icon;
          return (
            <span key={f.label} className="lx-data3d-field-pill">
              <FieldIcon size={11} color={group.accent} style={{ flexShrink: 0 }} />
              <span>{f.label}</span>
            </span>
          );
        })}
      </div>

      {/* Frontend Enrichment Explanation Footer */}
      <div className="lx-data3d-card-foot" style={{ transform: 'translateZ(10px)' }}>
        <Cpu size={11} color="#b45309" style={{ flexShrink: 0 }} />
        <span>{group.enrichment}</span>
      </div>
    </motion.div>
  );
}

export default function ExtractedDataShowcase3D() {
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'all') return DATA_GROUPS;
    return DATA_GROUPS.filter((g) => g.bucket === activeFilter);
  }, [activeFilter]);

  const totalShownFields = useMemo(
    () => visibleGroups.reduce((acc, g) => acc + g.count, 0),
    [visibleGroups]
  );

  return (
    <div className="lx-data3d-stage lx-border-beam-box">
      {/* Top 3D Pipeline Bar: Extraction -> Live Frontend Enrichment -> Export */}
      <div className="lx-data3d-pipeline">
        {PIPELINE_NODES.map((node, idx) => {
          const NodeIcon = node.icon;
          return (
            <React.Fragment key={node.id}>
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                className="lx-data3d-pipe-node"
              >
                <div className="lx-data3d-pipe-icon">
                  <NodeIcon size={15} color="#92400e" />
                </div>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div className="lx-data3d-pipe-title">
                    <span className="lx-data3d-pipe-step">{node.step}</span>
                    <span>{node.title}</span>
                  </div>
                  <div className="lx-data3d-pipe-sub">{node.detail}</div>
                </div>
              </motion.div>
              {idx < PIPELINE_NODES.length - 1 && (
                <div className="lx-data3d-pipe-connector" aria-hidden="true">
                  <motion.span
                    className="lx-data3d-pipe-pulse"
                    animate={{ x: ['-100%', '220%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.45 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Category Filter Capsule + Schema Count Indicator */}
      <div className="lx-data3d-toolbar">
        <div className="lx-data3d-filter-bar" role="tablist" aria-label="Filter extracted business data categories">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(f.id)}
                className={`lx-data3d-filter-btn ${isActive ? 'is-active' : ''}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="extractedDataFilterPill"
                    className="lx-data3d-filter-active-bg"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
              </button>
            );
          })}
        </div>

        <div className="lx-data3d-schema-badge">
          <Database size={12} color="#b45309" />
          <span>Showing <strong>{totalShownFields}</strong> Real Extracted Fields</span>
        </div>
      </div>

      {/* Scrollable 3D Tilt Cards Matrix */}
      <div className="lx-data3d-scroll-body">
        <motion.div layout className="lx-data3d-grid">
          <AnimatePresence mode="popLayout">
            {visibleGroups.map((group, idx) => (
              <Card3D key={group.id} group={group} index={idx} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer Contract Guarantee */}
      <div className="lx-data3d-footer">
        <span>
          <CheckCircle2 size={13} color="#d97706" />
          <span>Every field is extracted from public websites, directories &amp; social profiles and enriched live in the frontend before export.</span>
        </span>
        <span className="lx-data3d-footer-formats">
          <Download size={12} color="#92400e" />
          <span>Zero Mockups · Excel (.xlsx) · CSV · WhatsApp VCF</span>
        </span>
      </div>
    </div>
  );
}
