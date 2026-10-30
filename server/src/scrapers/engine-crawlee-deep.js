const dbAdapter = require('../config/dbAdapter');
const crypto = require('crypto');
const { deepExtractWebsite } = require('../services/websiteDeepExtractor');
const { deepExtractVendor } = require('../services/deepProfileService');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

function sameHost(a, b) {
  try {
    return new URL(a).hostname.replace(/^www\./i, '').toLowerCase() ===
      new URL(b).hostname.replace(/^www\./i, '').toLowerCase();
  } catch (e) {
    return false;
  }
}

function buildVendorFromWebsite(data, url, vendorName, category, location) {
  const now = new Date().toISOString();
  const phones = Array.isArray(data.contact && data.contact.phones) ? data.contact.phones : [];
  const emails = Array.isArray(data.contact && data.contact.emails) ? data.contact.emails : [];
  const address = data.address || {};
  const socials = data.socials || {};
  const legal = data.legal || {};
  const reviews = data.reviews || {};
  const identity = data.identity || {};
  const hours = data.hours || {};

  const id = `site_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  return {
    id,
    userId: 'admin_1',
    sessionId: `deep_${Date.now().toString(36)}`,
    name: identity.name || vendorName || new URL(url).hostname.replace(/^www\./i, ''),
    legalName: identity.legalName || '',
    category: category || 'Website Lead',
    description: identity.description || '',
    tagline: identity.tagline || '',
    priceRange: identity.priceRange || '',
    phone: (phones.find(p => p.isMobile) || phones[0] || {}).e164 || '',
    phones,
    email: emails[0] || '',
    emails,
    website: data.finalUrl || url,
    instagram: socials.instagram || '',
    facebook: socials.facebook || '',
    linkedin: socials.linkedin || '',
    youtube: socials.youtube || '',
    twitter: socials.twitter || '',
    socials: {
      website: data.finalUrl || url,
      instagram: socials.instagram || '',
      facebook: socials.facebook || '',
      linkedin: socials.linkedin || '',
      youtube: socials.youtube || '',
      twitter: socials.twitter || ''
    },
    address: address.full || address.street || location || '',
    locality: address.locality || address.city || '',
    district: address.district || '',
    state: address.state || '',
    pincode: address.pincode || '',
    latitude: data.geo && data.geo.lat != null ? data.geo.lat : '',
    longitude: data.geo && data.geo.lng != null ? data.geo.lng : '',
    rating: reviews.rating != null ? reviews.rating : '',
    reviewsCount: reviews.count != null ? reviews.count : '',
    topReviews: Array.isArray(reviews.topReviews) ? reviews.topReviews : [],
    operatingHours: hours.raw || '',
    hoursTable: Array.isArray(hours.specifications) ? hours.specifications : [],
    services: data.services || [],
    products: data.products || [],
    amenities: data.amenities || [],
    payments: data.payments || [],
    accessibility: data.accessibility || [],
    languages: data.languages || [],
    bookingLinks: data.bookingLinks || [],
    faqs: data.faqs || [],
    offers: data.offers || [],
    certifications: data.certifications || [],
    awards: data.awards || [],
    gstin: legal.gstin || '',
    pan: legal.pan || '',
    cin: legal.cin || '',
    legal: { gstin: legal.gstin || '', pan: legal.pan || '', cin: legal.cin || '', legalName: identity.legalName || '' },
    logo: identity.logo || '',
    avatar: identity.logo || '',
    images: Array.isArray(identity.images) ? identity.images : [],
    photos: [],
    source: 'Website Deep Scan',
    sourceUrl: data.finalUrl || url,
    createdAt: now,
    deepExtractedAt: now,
    deepAttemptedAt: now,
    deepVersion: '2.0.0',
    profileQuality: { score: 0, bucket: 'thin', updatedAt: now },
    enrichmentSources: ['website']
  };
}

/**
 * Real deep scan: enriches an existing vendor from its website, or creates a
 * new vendor record from live website data when no matching lead exists.
 */
async function scrapeCrawleeDeep(url, vendorName, category, location, sessionId) {
  if (!url || !/^https?:\/\//i.test(url)) {
    deps.logger('[Crawlee Deep Scanner] Skipped: no valid website URL.');
    return null;
  }

  const vendors = dbAdapter.getVendors();
  const existing = vendors.find(v => v.website && sameHost(v.website, url)) ||
    vendors.find(v => vendorName && v.name && v.name.trim().toLowerCase() === String(vendorName).trim().toLowerCase());

  if (existing) {
    deps.logger(`[Crawlee Deep Scanner] Deep-enriching "${existing.name}" from ${url}`);
    const result = await deepExtractVendor(existing.id, {
      force: true,
      includeGoogle: false,
      includeWebsite: true,
      websiteUrl: url,
      maxWebsitePages: 6
    });
    if (result && result.ok) {
      const updated = dbAdapter.getVendors().find(v => v.id === existing.id);
      if (updated) deps.emitVendorEvent(updated, 'updated');
      deps.logger(`[Crawlee Deep Scanner] ${existing.name}: ${result.completeness}% complete (${result.sources && result.sources.website ? result.sources.website.pagesCrawled : 0} pages).`);
    }
    return result;
  }

  deps.logger(`[Crawlee Deep Scanner] No stored lead for ${url}. Creating a live website profile...`);
  const data = await deepExtractWebsite(url, { maxPages: 6 });
  if (!data.ok) {
    deps.logger(`[Crawlee Deep Scanner] Website could not be read: ${(data.warnings || []).join(', ')}`);
    return null;
  }

  const vendor = buildVendorFromWebsite(data, url, vendorName, category, location);
  if (sessionId) vendor.sessionId = sessionId;
  dbAdapter.saveVendor(vendor.userId, vendor);
  deps.logger(`[Crawlee Deep Scanner] Created vendor "${vendor.name}" from ${data.pagesCrawled} page(s).`);
  deps.emitVendorEvent(vendor);
  return { ok: true, vendorId: vendor.id, name: vendor.name, created: true };
}

module.exports = { scrapeCrawleeDeep, setDeps };
