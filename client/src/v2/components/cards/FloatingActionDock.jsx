import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Copy, Contact, FileSpreadsheet, X, CheckSquare } from 'lucide-react';

export default function FloatingActionDock({
  selectedCount = 0,
  onClear,
  onWhatsAppCampaign,
  onCopyMobiles,
  onExportVcf,
  onExportCsv
}) {
  if (selectedCount <= 0) return null;

  return (
    <AnimatePresence>
      <div className="v2-floating-dock-backdrop">
        <motion.div
          className="v2-floating-dock"
          initial={{ opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        >
          <div className="v2-dock-chip">
            <CheckSquare size={13} />
            <span>{selectedCount} Selected</span>
          </div>

          <div className="v2-dock-divider" />

          {onWhatsAppCampaign && (
            <button
              type="button"
              className="v2-dock-btn is-wa"
              onClick={onWhatsAppCampaign}
              title="Launch Bulk WhatsApp Outreach"
            >
              <MessageSquare size={13} />
              <span>WhatsApp Blast</span>
            </button>
          )}

          {onCopyMobiles && (
            <button
              type="button"
              className="v2-dock-btn"
              onClick={onCopyMobiles}
              title="Copy mobile numbers to clipboard"
            >
              <Copy size={13} />
              <span>Copy Mobiles</span>
            </button>
          )}

          {onExportVcf && (
            <button
              type="button"
              className="v2-dock-btn"
              onClick={onExportVcf}
              title="Export as iOS / Android vCard contacts (.vcf)"
            >
              <Contact size={13} />
              <span>Export VCF</span>
            </button>
          )}

          {onExportCsv && (
            <button
              type="button"
              className="v2-dock-btn"
              onClick={onExportCsv}
              title="Download selected leads as CSV"
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
              title="Deselect all"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
