const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  normalizedName: { type: String, index: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '' },
  
  // Phone & Communication
  phone: { type: String, default: '', index: true },
  normalizedPhone: { type: String, default: '', index: true },
  phones: [{ type: String }],
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  
  // Location
  address: { type: String, default: '' },
  locality: { type: String, default: '' },
  mandal: { type: String, default: '' },
  district: { type: String, default: '' },
  city: { type: String, required: true, index: true },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  
  // Reputation & Metadata
  rating: { type: Number, default: null },
  reviewCount: { type: Number, default: 0 },
  priceRange: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  aiVerified: { type: Boolean, default: false },
  photos: [{ type: String }],
  description: { type: String, default: '' },
  businessHours: { type: String, default: '' },
  
  // Online footprint
  googleMapsUrl: { type: String, default: '' },
  instagramUrl: { type: String, default: '' },
  facebookUrl: { type: String, default: '' },
  
  // Scraper metadata
  sourceEngine: { type: String, default: 'Google' },
  sourceUrl: { type: String, default: '' },
  folderId: { type: String, default: 'default', index: true },
  sessionId: { type: String, default: 'legacy', index: true },
  fingerprint: { type: String, default: '', index: true },
  scrapedAt: { type: Date, default: Date.now },
  
  // CRM Pipeline State
  crmStage: {
    type: String,
    enum: ['new', 'pitch_sent', 'in_discussion', 'qualified', 'won', 'lost', 'archived'],
    default: 'new',
    index: true
  },
  crmScore: { type: Number, default: 20 },
  crmNotes: [{
    text: String,
    author: String,
    date: { type: Date, default: Date.now }
  }],
  crmTasks: [{
    id: String,
    text: String,
    completed: { type: Boolean, default: false },
    dueDate: Date
  }],
  assignedTo: { type: String, default: null },
  tags: [{ type: String }]
}, {
  timestamps: true
});

// Indexes for ultra-fast queries & deduplication
vendorSchema.index({ normalizedPhone: 1, city: 1 });
vendorSchema.index({ folderId: 1, crmStage: 1 });
vendorSchema.index({ name: 'text', address: 'text', category: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
