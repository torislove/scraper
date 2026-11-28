import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import DossierHeaderHUD from './DossierHeaderHUD';
import DossierActionStrip from './DossierActionStrip';
import DossierContactTelemetry from './DossierContactTelemetry';
import DossierGeoIntelligence from './DossierGeoIntelligence';

export default function CockpitDossierDrawer({
  vendor,
  onClose,
  country = 'IN',
  onSaveToFolder,
  onDeepEnrich,
  enriching = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {vendor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 92,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 18,
            background: 'rgba(15, 23, 42, 0.48)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(940px, 100%)',
              maxHeight: '88vh',
              background: '#faf9f6',
              borderRadius: 22,
              border: '1.5px solid rgba(217, 119, 6, 0.34)',
              boxShadow: '0 28px 80px rgba(15, 23, 42, 0.32)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <DossierHeaderHUD vendor={vendor} country={country} onClose={onClose} />
            <DossierActionStrip
              vendor={vendor}
              country={country}
              onSaveToFolder={onSaveToFolder}
              onDeepEnrich={onDeepEnrich}
              enriching={enriching}
            />

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
              <DossierContactTelemetry vendor={vendor} country={country} />
              <DossierGeoIntelligence vendor={vendor} country={country} />
            </div>

            <div style={{ padding: '10px 16px', background: '#ffffff', borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 650, color: '#64748b' }}>
                Press <kbd style={{ fontFamily: 'var(--lp-font-mono)', padding: '1px 5px', borderRadius: 5, background: '#f1f5f9', border: '1px solid rgba(15,23,42,0.12)' }}>Esc</kbd> or Cancel to close lead dossier
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', borderRadius: 10,
                  border: '1px solid rgba(225,29,72,0.28)',
                  background: '#fff1f2', color: '#be123c',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer'
                }}
              >
                <X size={13} /> Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
