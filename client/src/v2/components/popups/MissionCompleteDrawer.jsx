import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, Folder, X, CheckCircle2, Phone, MessageSquare } from 'lucide-react';

/**
 * MissionCompleteDrawer.jsx
 * Non-disruptive, glassmorphic post-mission card docked at the bottom-right.
 * Appears 1.5s after a search finishes if leads were found.
 * Never blocks interaction with the map or table.
 */
export default function MissionCompleteDrawer({
  isOpen,
  leadsCount = 0,
  mobilesCount = 0,
  whatsappCount = 0,
  onExportCsv,
  onOpenFolder,
  onClose
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDismissed(false);
    }
  }, [isOpen]);

  if (!isOpen || dismissed || leadsCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 120, opacity: 0, scale: 0.92 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 120, opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-40 w-80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/40 text-white"
        role="complementary"
        aria-label="Mission Completed Summary"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-md uppercase tracking-wider">
            <Sparkles size={12} /> Search Complete
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              if (typeof onClose === 'function') onClose();
            }}
            aria-label="Dismiss summary"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <h4 className="text-base font-bold text-white mb-1">
          {leadsCount} Leads Discovered
        </h4>
        <p className="text-xs text-slate-300 mb-3">
          All allocated zones processed with full multi-engine reconciliation.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Phone size={11} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">MOBILES</div>
              <div className="font-semibold text-emerald-300">{mobilesCount || 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare size={11} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">WHATSAPP</div>
              <div className="font-semibold text-emerald-300">{whatsappCount || 0}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}
          {onOpenFolder && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-700"
            >
              <Folder size={13} />
              <span>Inspect</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
