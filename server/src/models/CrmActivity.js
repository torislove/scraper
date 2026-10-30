const mongoose = require('mongoose');

const crmActivitySchema = new mongoose.Schema({
  vendorId: { type: String, required: true, index: true },
  folderId: { type: String, default: 'default', index: true },
  action: {
    type: String,
    enum: ['stage_change', 'note_added', 'task_added', 'task_done', 'contacted', 'lead_created', 'lead_enriched'],
    required: true
  },
  fromStage: { type: String, default: null },
  toStage: { type: String, default: null },
  note: { type: String, default: '' },
  actor: { type: String, default: 'Admin' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('CrmActivity', crmActivitySchema);
