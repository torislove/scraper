const mongoose = require('mongoose');

const stagingLeadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Legacy ID or place_id
  name: { type: String, required: true },
  category: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, default: '' },
  pincode: { type: String, default: '' },
  phone: { type: String, default: 'Requires Manual Lookup' },
  rating: { type: Number, default: null },
  mapsLink: { type: String, default: '' },
  source: { type: String, default: 'Unknown' },
  verified: { type: Boolean, default: false },
  aiVerified: { type: Boolean, default: false },
  matchedKeywords: [{ type: String }],
  pushed: { type: Boolean, default: false },
  pushedAt: { type: Date, default: null },
  scrapedAt: { type: Date, default: Date.now },
  assignedTo: { type: String, default: null }, // Telecaller ID
  crmStatus: { type: String, default: 'New' }, // e.g., Interested, Callback, Not Interested
  crmNotes: { type: String, default: '' },
  email: { type: String },
  instagram: { type: String },
  instagramFollowers: { type: String },
  facebook: { type: String },
  facebookFollowers: { type: String },
  pinterest: { type: String },
  youtube: { type: String },
  linkedin: { type: String },
  qualityScore: { type: Number, default: 0 },
  tier: { type: String, default: 'Basic' },
  operatingHours: { type: String },
  topReviews: [{ type: String }],
  aiCategory: { type: String },
  businessSummary: { type: String },
  pricingInfo: { type: String },
  images: [{ type: String }]
});

// Create index for fast duplicate checks
stagingLeadSchema.index({ name: 1, city: 1 }, { unique: false });
stagingLeadSchema.index({ mapsLink: 1 }, { unique: false });

module.exports = mongoose.model('StagingLead', stagingLeadSchema);
