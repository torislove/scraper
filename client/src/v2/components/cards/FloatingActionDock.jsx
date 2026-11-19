import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Contact, FileSpreadsheet, X, CheckSquare } from 'lucide-react';

export default function FloatingActionDock({
  selectedCount = 0,
  onClear,
  onCopyMobiles,
  onExportVcf,
  onExportCsv
}) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <div className="v2-floating-dock-backdrop">
          <motion.div
            className="v2-floating-dock"
            initial={{ opacity: 0, y: 36, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            <div className="v2-dock-chip">
              <CheckSquare size={13} />
              <span>{selectedCount} Selected</span>
            </div>

            <div className="v2-dock-divider" />

            {onCopyMobiles && (
              <button
                type="button"
                className="v2-dock-btn"
                onClick={onCopyMobiles}
                title="Copy all phone numbers to clipboard"
              >
                <Copy size={13} />
                <span>Copy Phones</span>
              </button>
            )}

            {onExportVcf && (
              <button
                type="button"
                className="v2-dock-btn"
                onClick={onExportVcf}
                title="Save selected businesses directly to your phone contacts (.vcf)"
              >
                <Contact size={13} />
                <span>Save Contacts (.vcf)</span>
              </button>
            )}

            {onExportCsv && (
              <button
                type="button"
                className="v2-dock-btn"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#ffffff', border: 'none' }}
                onClick={onExportCsv}
                title="Download selected leads as spreadsheet (.csv)"
              >
                <FileSpreadsheet size={13} />
                <span>Export CSV</span>
              </button>
            )}

            <div className="v2-dock-divider" />

            {onClear && (
              <button
                type="button"
                className="v2-dock-btn"
                style={{ padding: '0 8px', color: '#94a3b8' }}
                onClick={onClear}
                title="Clear selection"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
