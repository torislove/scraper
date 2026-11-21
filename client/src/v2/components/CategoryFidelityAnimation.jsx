import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, Sparkles, Filter } from 'lucide-react';

/**
 * CategoryFidelityAnimation
 * Interactive visual demonstration of server/src/services/categoryFidelity.js
 * Shows how Universal Trade Context Mutual Exclusion stops off-topic cross-bleed
 * (e.g. Sarees during Turmeric sweeps, CCTV in DSLR camera sweeps, Banquet halls in Photographer sweeps)
 */
const SCENARIOS = [
  {
    id: 'turmeric',
    label: 'Turmeric & Agri Wholesale',
    query: 'Wholesale Turmeric in Tenali Guntur',
    targetCategory: 'Raw Spices & Curcumin Processing',
    avoidCategories: ['Sarees & Textiles', 'General Retail', 'Jewelry'],
    leads: [
      {
        id: 1,
        name: 'Minar Traders & Turmeric Millers',
        category: 'Spices & Agri Millers',
        phone: '+91 98856 03754',
        locality: 'Gopal Reddy St, Tenali',
        isPure: true,
        reason: 'Direct match on Curcumin, Turmeric milling & wholesale licensing'
      },
      {
        id: 2,
        name: 'Sri Lakshmi Saree Emporium',
        category: 'Textiles & Sarees',
        phone: '+91 94401 12984',
        locality: 'Main Bazaar, Tenali',
        isPure: false,
        reason: 'REJECTED: Cross-bleed keyword avoidance (Textile / Retail Saree store)'
      },
      {
        id: 3,
        name: 'Kisan Bio Turmeric Cultivators Hub',
        category: 'Export-Grade Agri Spices',
        phone: '+91 99494 29934',
        locality: 'Sivaji Circle, Tenali',
        isPure: true,
        reason: 'Direct match on Organic Curcumin & Farmer Producer Organisation'
      },
      {
        id: 4,
        name: 'New Modern Plastic & Kitchen Store',
        category: 'General Household Retail',
        phone: '+91 98480 54120',
        locality: 'Station Rd, Tenali',
        isPure: false,
        reason: 'REJECTED: Off-topic retail merchant (No agricultural trade license)'
      }
    ]
  },
  {
    id: 'cameras',
    label: 'DSLR & Cinema Cameras',
    query: 'Camera & DSLR Stores in Hyderabad',
    targetCategory: 'Professional Imaging & Cinema Gear',
    avoidCategories: ['CCTV & Security', 'Biometrics', 'Mobile Repair'],
    leads: [
      {
        id: 1,
        name: 'Aura Pro DSLR & Mirrorless Hub',
        category: 'Cinema & Studio Cameras',
        phone: '+91 98490 88124',
        locality: 'Secunderabad',
        isPure: true,
        reason: 'Direct authorized dealer for Sony Alpha, Canon Cinema & Red cameras'
      },
      {
        id: 2,
        name: 'Zion CCTV & Surveillance Systems',
        category: 'Security & DVR Equipment',
        phone: '+91 97001 44219',
        locality: 'Ameerpet, Hyderabad',
        isPure: false,
        reason: 'REJECTED: Negative avoidance token "cctv / surveillance / biometric"'
      },
      {
        id: 3,
        name: 'Deccan Camera Lens & Gimbal Lab',
        category: 'Pro Photography Equipment',
        phone: '+91 90005 32187',
        locality: 'Banjara Hills',
        isPure: true,
        reason: 'Verified supplier for telephoto glass, cinema primes & gimbals'
      },
      {
        id: 4,
        name: 'QuickFix Smart Phone Screen Repair',
        category: 'Mobile Hardware Service',
        phone: '+91 99887 66541',
        locality: 'Madhapur',
        isPure: false,
        reason: 'REJECTED: Unrelated mobile phone hardware repair shop'
      }
    ]
  },
  {
    id: 'photo',
    label: 'Wedding Cinematography',
    query: 'Wedding Photographers in Vijayawada',
    targetCategory: 'Candid Photography & 4K Cinema',
    avoidCategories: ['Banquet Halls', 'Catering', 'Makeup Artists'],
    leads: [
      {
        id: 1,
        name: 'Sri Krishna Photography & 4K Cinema',
        category: 'Wedding Cinematography',
        phone: '+91 98480 23419',
        locality: 'Benz Circle, Vijayawada',
        isPure: true,
        reason: 'Direct match on Candid Wedding Photography, 4K Drone & Cinematography'
      },
      {
        id: 2,
        name: 'Grand Royal Kalyana Mandapam & AC Hall',
        category: 'Function Hall & Venue',
        phone: '+91 94901 88712',
        locality: 'MG Road, Vijayawada',
        isPure: false,
        reason: 'REJECTED: Venue directory cross-bleed (Banquet / Convention hall)'
      },
      {
        id: 3,
        name: 'DreamArt Bridal Studio & Portfolios',
        category: 'Candid & Pre-Wedding Films',
        phone: '+91 99890 41250',
        locality: 'Governorpet',
        isPure: true,
        reason: 'Verified candid photographers with direct WhatsApp mobile contact'
      },
      {
        id: 4,
        name: 'Swagath Pure Ghee Sweets & Caterers',
        category: 'Wedding Food Catering',
        phone: '+91 98850 77123',
        locality: 'Eluru Rd, Vijayawada',
        isPure: false,
        reason: 'REJECTED: Catering / confectioner mutual exclusion boundary'
      }
    ]
  }
];

export default function CategoryFidelityAnimation() {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [activeLeadIdx, setActiveLeadIdx] = useState(0);

  const scenario = SCENARIOS[activeScenarioIdx];

  // Cycle through leads in the scenario
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLeadIdx(prev => (prev + 1) % scenario.leads.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [scenario]);

  const currLead = scenario.leads[activeLeadIdx];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 980,
        background: '#ffffff',
        borderRadius: 20,
        padding: '16px 20px',
        border: '1.5px solid rgba(226, 232, 240, 0.95)',
        boxShadow: '0 20px 48px -12px rgba(15, 23, 42, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      {/* Header & Scenario Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={{ fontSize: 10.5, fontWeight: 850, color: '#047857', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={12} color="#10b981" />
            Universal Trade Context Mutual Exclusion Gate
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
            Zero-Bleed Category Fidelity Engine
          </h3>
        </div>

        {/* 3 Preset Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {SCENARIOS.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setActiveScenarioIdx(idx);
                setActiveLeadIdx(0);
              }}
              style={{
                padding: '4px 11px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 750,
                border: idx === activeScenarioIdx ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                background: idx === activeScenarioIdx ? '#ecfdf5' : '#ffffff',
                color: idx === activeScenarioIdx ? '#047857' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.16s ease'
              }}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Simulation Stage */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 80px 1.2fr',
          gap: 12,
          alignItems: 'center',
          background: '#f8fafc',
          borderRadius: 16,
          padding: '16px',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Left: Incoming Candidate Lead Card */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
            1. Raw Engine Discovery Candidate
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currLead.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 12,
                padding: '12px 14px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)'
              }}
            >
              <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{currLead.name}</strong>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{currLead.locality}</div>
              <div style={{ fontSize: 11.5, fontWeight: 750, color: '#0284c7', marginTop: 6 }}>
                Category Tag: &ldquo;{currLead.category}&rdquo;
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Center: Laser Fidelity Filter Gate */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: currLead.isPure ? '#ecfdf5' : '#fef2f2',
              border: currLead.isPure ? '2px solid #10b981' : '2px solid #ef4444',
              display: 'grid',
              placeItems: 'center',
              boxShadow: currLead.isPure
                ? '0 0 16px rgba(16, 185, 129, 0.5)'
                : '0 0 16px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            {currLead.isPure ? <CheckCircle2 size={18} color="#059669" /> : <XCircle size={18} color="#ef4444" />}
          </div>
          <span style={{ fontSize: 9.5, fontWeight: 850, color: currLead.isPure ? '#059669' : '#ef4444' }}>
            {currLead.isPure ? 'PASS' : 'BLOCK'}
          </span>
        </div>

        {/* Right: Disposition Result Card */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
            2. Fidelity Gate Classification
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currLead.name + '-res'}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              style={{
                background: currLead.isPure ? '#ecfdf5' : '#fef2f2',
                border: currLead.isPure ? '1.5px solid #a7f3d0' : '1.5px solid #fecaca',
                borderRadius: 12,
                padding: '12px 14px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 850,
                    background: currLead.isPure ? '#059669' : '#ef4444',
                    color: '#ffffff'
                  }}
                >
                  {currLead.isPure ? '100% TRADE FIDELITY' : 'REJECTED: CROSS-BLEED'}
                </span>
                {currLead.isPure && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#047857' }}>
                    {currLead.phone}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: currLead.isPure ? '#065f46' : '#991b1b', lineHeight: 1.45 }}>
                {currLead.reason}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Guarantees */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Zero Hallucinations · Turmeric searches never return sarees or grocery stores</span>
        </span>
        <span style={{ fontWeight: 700, color: '#0f172a' }}>
          Guaranteed 100% Commercial Intent in Every Export
        </span>
      </div>
    </div>
  );
}
