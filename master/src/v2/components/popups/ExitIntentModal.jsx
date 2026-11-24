import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Download, X, CheckCircle2, ArrowRight } from 'lucide-react';

const DEFAULT_SAMPLE_LEADS = [
  { name: 'Studio Sandhya Raagam', phone: '+91 99592 82819', type: 'Mobile · WhatsApp', city: 'Guntur' },
  { name: 'Apex Logistics & Freight', phone: '+91 98480 12345', type: 'Mobile · Direct', city: 'Vijayawada' },
  { name: 'Sri Balaji Turmeric Traders', phone: '+91 94401 56789', type: 'Mobile · WhatsApp', city: 'Tenali' }
];

export default function ExitIntentModal({ isOpen, onClose, onSearchCity }) {
  const [downloaded, setDownloaded] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    tag: 'Free Lead Sample',
    title: 'Wait! Take 25 Free Verified Leads Before You Go 🚀',
    subtitle: 'See the exact phone and WhatsApp data quality our machine extracts before running a full scan.',
    sampleLeads: DEFAULT_SAMPLE_LEADS,
    downloadButtonText: 'Download Sample CSV',
    scanCityButtonText: 'Scan My City',
    scanCityUrl: '/login'
  });

  useEffect(() => {
    let alive = true;
    fetch('/api/popups')
      .then(res => res.json())
      .then(data => {
        if (!alive || !data?.exitIntentModal) return;
        setConfig(prev => ({
          ...prev,
          ...data.exitIntentModal,
          sampleLeads: Array.isArray(data.exitIntentModal.sampleLeads) && data.exitIntentModal.sampleLeads.length > 0
            ? data.exitIntentModal.sampleLeads
            : DEFAULT_SAMPLE_LEADS
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!isOpen || !config.enabled) return null;

  const leads = config.sampleLeads || DEFAULT_SAMPLE_LEADS;

  const handleDownloadSample = () => {
    setDownloaded(true);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Business Name,Phone,Channel,City,Status\n' +
      leads.map((l) => `"${l.name}","${l.phone}","${l.type}","${l.city}","Verified Active"`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample-verified-leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            background: config.bgColor ? `linear-gradient(to bottom, ${config.bgColor}, #020617)` : undefined,
            color: config.textColor || undefined,
            borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
          }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl shadow-emerald-950/40 text-white"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div
            style={{ color: config.buttonColor || undefined }}
            className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider"
          >
            <Gift size={16} /> {config.tag || 'Free Lead Sample'}
          </div>

          <h3 style={{ color: config.textColor || undefined }} className="text-xl font-bold text-white mb-2">
            {config.title || 'Wait! Take 25 Free Verified Leads Before You Go 🚀'}
          </h3>
          <p style={{ color: config.textColor || undefined, opacity: 0.85 }} className="text-sm text-slate-300 mb-4">
            {config.subtitle || 'See the exact phone and WhatsApp data quality our machine extracts before running a full scan.'}
          </p>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-5 overflow-hidden">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sample Verified Extraction Preview:
            </div>
            <div className="space-y-2">
              {leads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                  <div className="font-medium text-slate-200">{lead.name}</div>
                  <div className="flex items-center gap-2">
                    <span
                      style={{ color: config.buttonColor || undefined }}
                      className="font-mono text-emerald-400 font-semibold"
                    >
                      {lead.phone}
                    </span>
                    <span
                      style={{
                        background: config.badgeColor || undefined,
                        color: config.buttonColor || undefined,
                        borderColor: config.buttonColor ? `${config.buttonColor}40` : undefined
                      }}
                      className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded"
                    >
                      <CheckCircle2 size={10} /> Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadSample}
              style={{
                background: config.buttonColor || undefined,
                color: config.buttonColor ? '#020617' : undefined
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Download size={16} />
              <span>{downloaded ? 'Downloaded Sample!' : (config.downloadButtonText || 'Download Sample CSV')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (typeof onSearchCity === 'function') onSearchCity();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors cursor-pointer border border-slate-700"
            >
              <span>{config.scanCityButtonText || 'Scan My City'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
