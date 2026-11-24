import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  Lock,
  Unlock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

const LEGAL_PILLARS = [
  {
    id: 'logged-out',
    title: '1. Logged-Out Scraping Only',
    tag: 'CFAA Compliance',
    color: '#10b981',
    bg: '#ecfdf5',
    desc: 'We extract only public data visible to any open browser without a password. Because our engines never authenticate, we never click "I Agree" to restrictive platform Terms of Service, remaining entirely outside CFAA anti-hacking claims.'
  },
  {
    id: 'tos-civil',
    title: '2. ToS Violations Are Not Crimes',
    tag: 'Contract vs. Criminal Law',
    color: '#06b6d4',
    bg: '#ecfeff',
    desc: 'Website Terms of Service are private contracts, not statutory criminal laws. While a private platform can block an IP address, scraping public web information has been repeatedly affirmed as a civil matter—never a criminal offence.'
  },
  {
    id: 'facts-copyright',
    title: '3. Public Facts Have No Copyright',
    tag: 'Feist Publications Doctrine',
    color: '#3b82f6',
    bg: '#eff6ff',
    desc: 'Under established US and international intellectual property law, factual business data (names, phone numbers, addresses, ratings, follower statistics, and public bios) cannot be copyrighted. Platforms do not own public facts.'
  },
  {
    id: 'data-processor',
    title: '4. Neutral Data Processor Model',
    tag: 'GDPR / CCPA / DPDP Safe',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    desc: 'Scraper.co.in operates strictly as an infrastructure utility (Data Processor). The customer acts as the Data Controller, deciding how extracted leads are stored, contacted, and processed in compliance with global privacy regulations.'
  }
];

const COURT_RULINGS = [
  {
    caseName: 'hiQ Labs v. LinkedIn',
    year: '2017–2022',
    court: 'US 9th Circuit Court of Appeals',
    verdict: 'Landmark Victory for Scrapers',
    color: '#10b981',
    takeaway: 'Scraping public profiles does not violate the Computer Fraud and Abuse Act (CFAA). The anti-hacking statute cannot be weaponized to gate public data on the open web.'
  },
  {
    caseName: 'Meta Platforms v. Bright Data',
    year: '2024',
    court: 'US Federal District Court (N.D. Cal.)',
    verdict: 'Logged-Off Scraping Upheld',
    color: '#0284c7',
    takeaway: "The court ruled that Meta's Terms of Service do not bar logged-off scraping of public Facebook and Instagram data. Bright Data prevailed against Meta's preliminary injunction."
  },
  {
    caseName: 'X Corp v. Bright Data',
    year: '2024',
    court: 'US Federal Court',
    verdict: 'Case Dismissed',
    color: '#6366f1',
    takeaway: 'Judge dismissed X Corp’s copyright and breach-of-contract claims, confirming social media platforms do not hold copyright over user-generated public posts and factual metrics.'
  },
  {
    caseName: 'Google LLC v. SerpApi',
    year: '2025–2026',
    court: 'US Federal Court',
    verdict: 'DMCA Claims Dismissed',
    color: '#d97706',
    takeaway: "Court dismissed Google's DMCA anti-circumvention claims against public search scrapers. Google was forced to withdraw its Maps and Shopping claims."
  }
];

export default function LegalTrustPlaybook() {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const activeCase = COURT_RULINGS[selectedCaseIdx];

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
      {/* 1. High-Impact Eyebrow Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)',
            border: '1px solid #a7f3d0',
            color: '#047857'
          }}
        >
          <Scale size={12} />
          <span>THE PUBLIC LEGAL PLAYBOOK · WHY SCRAPING PUBLIC DATA IS LEGAL</span>
        </span>
      </div>

      {/* 2. Headline */}
      <h2
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 'clamp(20px, 2.5vw, 32px)',
          fontWeight: 850,
          color: '#0f172a',
          margin: '0 0 6px',
          letterSpacing: '-0.025em'
        }}
      >
        Structured for Legality.{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Protected by Settled Law.
        </span>
      </h2>

      <p style={{ fontSize: 12.5, color: '#475569', maxWidth: '72ch', margin: '0 auto 18px', lineHeight: 1.5 }}>
        Like industry pioneers Apify, Bright Data, and SerpApi, Scraper.co.in operates completely in the open. Public web data belongs to the public, and our technology is strictly engineered to stay within established legal and ethical boundaries.
      </p>

      {/* 3. The 4 Legal Pillars Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 12,
          marginBottom: 20,
          textAlign: 'left'
        }}
      >
        {LEGAL_PILLARS.map((pillar) => (
          <div
            key={pillar.id}
            style={{
              background: '#ffffff',
              border: `1.5px solid #e2e8f0`,
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: pillar.bg,
                    color: pillar.color,
                    border: `1px solid ${pillar.color}35`
                  }}
                >
                  {pillar.tag}
                </span>
                <CheckCircle2 size={14} color={pillar.color} />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                {pillar.title}
              </h4>

              <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
                {pillar.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Landmark Court Rulings Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1.5px solid #cbd5e1',
          borderRadius: 18,
          padding: '18px 20px',
          boxShadow: '0 8px 24px -6px rgba(15,23,42,0.08)',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 850, color: '#0f172a' }}>
                Landmark Judicial Precedents Protecting Public Scrapers
              </h3>
              <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                Federal court cases affirming that public web data cannot be monopolized
              </span>
            </div>
          </div>

          {/* Quick Case Switcher */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COURT_RULINGS.map((c, idx) => (
              <button
                key={c.caseName}
                type="button"
                onClick={() => setSelectedCaseIdx(idx)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 10.5,
                  fontWeight: 750,
                  border: idx === selectedCaseIdx ? `1.5px solid ${c.color}` : '1px solid #e2e8f0',
                  background: idx === selectedCaseIdx ? '#ffffff' : '#f1f5f9',
                  color: idx === selectedCaseIdx ? c.color : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.16s ease'
                }}
              >
                {c.caseName.split(' v. ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Active Case Detail Box */}
        <div
          style={{
            background: '#ffffff',
            border: `1.5px solid ${activeCase.color}40`,
            borderRadius: 12,
            padding: '14px 16px',
            boxShadow: `0 4px 16px -4px ${activeCase.color}20`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{activeCase.caseName}</strong>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 650 }}>({activeCase.year})</span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: activeCase.color,
                background: '#f8fafc',
                padding: '2px 8px',
                borderRadius: 6,
                border: `1px solid ${activeCase.color}30`
              }}
            >
              ✓ {activeCase.verdict}
            </span>
          </div>

          <p style={{ margin: '4px 0 8px', fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
            {activeCase.takeaway}
          </p>

          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
            Jurisdiction: <strong>{activeCase.court}</strong>
          </div>
        </div>

        {/* 3 Red Lines We Strictly Avoid */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🛡️ Strict Red Lines We Never Cross:
          </span>
          <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: '#475569', flexWrap: 'wrap' }}>
            <span>❌ <strong>No Login/Paywall Bypassing</strong></span>
            <span>❌ <strong>No Server Flooding / DDoS</strong></span>
            <span>❌ <strong>No Direct Content Cloning</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
