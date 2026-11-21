import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers, Cpu, ShieldCheck, Zap, Rocket, Check, ArrowRight
} from 'lucide-react';
import { ALL_BUILTIN_ENGINES } from '../utils/deviceRamEngine';
import {
  RadarGeospatialIcon, TradePurityIcon, TelecomWhatsAppIcon,
  GlobalSovereignIcon, HardwareConcurrencyIcon, PrivacyZeroKnowledgeIcon
} from '../components/FeatureIcons';

const BENTO_ADVANTAGES = [
  {
    IconComponent: HardwareConcurrencyIcon,
    span: 'col-7',
    badge: 'HARDWARE-AWARE CONCURRENCY',
    title: 'Workstation Memory Engine with >= 4.5 GB Headroom',
    body: 'Hardware tier detection automatically provisions 2, 4, 8, or 16 parallel workers directly inside your browser memory with guaranteed OS headroom. Zero cloud server waiting lines or shared datacenter throttle queues.'
  },
  {
    IconComponent: TradePurityIcon,
    span: 'col-5',
    badge: 'ZERO HALLUCINATION FIDELITY',
    title: 'Universal Trade Context Mutual Exclusion',
    body: 'Deep commodity preservation and cross-industry boundary enforcement guarantee that turmeric searches never return sarees, metal shops, or unrelated retail stores. Leads match exact commercial intent.'
  },
  {
    IconComponent: TelecomWhatsAppIcon,
    span: 'col-5',
    badge: 'CARRIER REGEX VALIDATOR',
    title: 'Deep Telecom & Direct WhatsApp Classification',
    body: 'Classifies every phone line as verified mobile, direct WhatsApp, or corporate landline before writing to Excel. Strips dead switchboards so your outbound team reaches real decision-makers immediately.'
  },
  {
    IconComponent: GlobalSovereignIcon,
    span: 'col-7',
    badge: 'EQUAL SOVEREIGN COVERAGE',
    title: 'Equal Prominence Across All 11 Global Markets',
    body: 'Every single US county, UK borough, Canadian census division, Australian LGA, German Landkreis, and Indian mandal is indexed with identical administrative granularity. No territory is second-class.'
  },
  {
    IconComponent: RadarGeospatialIcon,
    span: 'col-6',
    badge: 'PARALLEL SWARM ARCHITECTURE',
    title: '22-Engine Synchronized Autonomous Swarm',
    body: 'Sweeps across satellite geospatial nodes, verified commercial directories, B2B wholesale portals, open knowledge graphs, and corporate websites simultaneously. Eliminates search listing caps by decomposing territories into fine micro-zones.'
  },
  {
    IconComponent: PrivacyZeroKnowledgeIcon,
    span: 'col-6',
    badge: 'ZERO-KNOWLEDGE ARCHITECTURE',
    title: '100% Local Self-Hosted Privacy',
    body: 'Run on your local server engine or RAM extension. Your search queries, extracted contacts, and target prospect databases remain 100% confidential on your physical machine. Zero data uploaded to third-party clouds.'
  }
];

export default function LandingArchitecture() {
  const navigate = useNavigate();
  const [engineCategoryFilter, setEngineCategoryFilter] = useState('All');

  const categories = [
    { id: 'All', label: 'All Engines (22)' },
    { id: 'Maps & Geospatial', label: 'Maps & Geospatial (4)' },
    { id: 'National Directories', label: 'National Commercial Directories (7)' },
    { id: 'B2B & Wholesale', label: 'B2B & Wholesale (1)' },
    { id: 'Hospitality', label: 'Hospitality & Venues (4)' },
    { id: 'Web Discovery', label: 'Web Discovery & Crawling (3)' },
    { id: 'Social Discovery', label: 'Social & Knowledge (2)' },
    { id: 'Data Quality & Export', label: 'Deduplication & Quality (1)' }
  ];

  return (
    <div className="lx-subpage-wrap">
      {/* Page Header */}
      <section className="lx-subpage-hero">
        <div className="lx-wrap" style={{ maxWidth: 960, textAlign: 'center' }}>
          <div className="lx-eyebrow-capsule" style={{ margin: '0 auto 16px' }}>
            <Layers size={13} />
            <span>ENTERPRISE ARCHITECTURE · 22 SPECIALIZED CORES</span>
          </div>

          <h1 className="lx-subpage-h1">
            Engineered for Extreme Yield, Trade Fidelity &amp; Machine Safety.
          </h1>

          <p className="lx-subpage-copy">
            Every component is decoupled and optimized for native workstation performance.
            Explore the 6 architectural pillars and 22 brand-safe discovery engines below.
          </p>
        </div>
      </section>

      {/* 6 Bento Grid Pillars */}
      <section className="lx-section">
        <div className="lx-wrap" style={{ maxWidth: 1180 }}>
          <div className="lx-nex-bento-grid">
            {BENTO_ADVANTAGES.map(b => {
              const IconComp = b.IconComponent;
              return (
                <div key={b.title} className={`lx-nex-bento-card ${b.span}`}>
                  <div style={{ marginBottom: 18 }}>
                    <IconComp size={48} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: '0.06em', color: '#007aff', textTransform: 'uppercase', marginBottom: 6 }}>
                    {b.badge}
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trade Context & Anti-Bleed Explanation Banner */}
      <section className="lx-section lx-section-alt">
        <div className="lx-wrap" style={{ maxWidth: 1100 }}>
          <div className="lx-trade-purity-banner">
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <TradePurityIcon size={52} />
              <div>
                <span className="lx-kicker" style={{ color: '#059669', marginBottom: 6 }}>
                  <ShieldCheck size={14} /> ZERO-HALLUCINATION COMMODITY PRESERVATION
                </span>
                <h3 style={{ fontSize: 22, fontWeight: 850, color: '#0f172a', margin: '4px 0 10px' }}>
                  Universal Cross-Industry Anti-Bleed Mutual Exclusion Matrix
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#475569', margin: 0 }}>
                  Standard map scraping tools blindly return sarees, steel dealerships, or hardware stores when you search for agricultural commodities like turmeric or spices.
                  Scraper.co.in implements 18 commercial sector vector definitions with strict mutual exclusion:
                  queries for <em>&ldquo;Wholesale Turmeric in Tenali&rdquo;</em> automatically reject textiles, building materials, and retail fashion before writing to your export files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 22 Specialized Extraction Engines Fleet */}
      <section className="lx-section" id="engines">
        <div className="lx-wrap" style={{ maxWidth: 1180 }}>
          <div className="lx-sec-head">
            <span className="lx-kicker"><Cpu size={13} /> 22 Specialized Extraction Engines</span>
            <h2>Synchronized Multi-Engine Sweep Fleet</h2>
            <p>
              All proprietary third-party names have been abstracted into enterprise generic architectures
              to prevent trademark liabilities while delivering full deep-web discovery depth across 11 sovereign nations.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                style={{
                  padding: '8px 18px', borderRadius: 50, fontSize: 12.5, fontWeight: 750,
                  background: engineCategoryFilter === cat.id ? '#007aff' : '#ffffff',
                  border: engineCategoryFilter === cat.id ? '1px solid #007aff' : '1px solid #e2e8f0',
                  color: engineCategoryFilter === cat.id ? '#ffffff' : '#475569',
                  boxShadow: engineCategoryFilter === cat.id ? '0 4px 12px rgba(0, 122, 255, 0.25)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                  cursor: 'pointer', transition: 'all 0.16s ease'
                }}
                onClick={() => setEngineCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 22 Engines Grid */}
          <div className="lx-engines-6-grid">
            {ALL_BUILTIN_ENGINES
              .filter(eng => {
                if (engineCategoryFilter === 'All') return true;
                if (engineCategoryFilter === 'Hospitality') return eng.category.includes('Hospitality');
                return eng.category.includes(engineCategoryFilter);
              })
              .map((eng, idx) => (
                <motion.div
                  key={eng.id}
                  className="lx-engine-cart-card"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={{ y: -3 }}
                >
                  <div className="lx-engine-cart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span
                      style={{
                        width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
                        background: '#eff6ff', border: '1px solid #bfdbfe', color: '#007aff'
                      }}
                    >
                      <Zap size={15} />
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 850, color: '#047857', letterSpacing: '0.04em' }}>LIVE · {eng.number.toUpperCase()}</span>
                      <div style={{ fontSize: 10.5, color: '#007aff', fontWeight: 750 }}>{eng.coverage}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 850, textTransform: 'uppercase', color: '#007aff', marginBottom: 4 }}>
                    {eng.category}
                  </div>
                  <b>{eng.name}</b>
                  <small>{eng.shortDesc}</small>
                </motion.div>
              ))}
          </div>

          {/* Bottom Launch Bar */}
          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              style={{ height: 48, padding: '0 28px', fontSize: 14, borderRadius: 50 }}
              onClick={() => navigate('/command?country=IN')}
            >
              <Rocket size={16} /> Launch All 22 Engines in Command Center
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
