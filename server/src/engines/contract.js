'use strict';

/**
 * contract.js
 * Standardized Engine Contract & Normalized Lead Schema.
 */

const crypto = require('crypto');
const { parsePhoneDetails } = require('./phoneUtils');
const { parseAddress } = require('../services/addressParser');
const { sanitizeSocialUrl } = require('../taxonomy/safetyFilter');

function generateLeadId(lead) {
  const parts = [
    lead.name || '',
    lead.phone || lead.mobilePhone || '',
    lead.address || lead.locality || lead.city || '',
    lead.country || ''
  ].map(s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''));
  return 'lead_' + crypto.createHash('sha256').update(parts.join('_')).digest('hex').slice(0, 16);
}

function buildFallbackMapsLink(raw, name, locality, city) {
  const explicit = String(raw.mapsLink || raw.googleMapsUrl || raw.link || '').trim();
  if (explicit) return explicit;
  if (raw.place_id || raw.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${raw.place_id || raw.placeId}`;
  }
  const lat = Number(raw.lat ?? raw.latitude);
  const lng = Number(raw.lng ?? raw.longitude);
  const label = [name, locality, city].filter(Boolean).join(', ');
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
  }
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return '';
}

function normalizeLead(raw = {}, source = 'unknown') {
  const cc = String(raw.country || raw.countryCode || 'IN').toUpperCase().trim();
  const cleanName = String(raw.name || raw.title || '').trim();
  const parsedAddr = parseAddress(raw.address || '', cc, raw.city || '');
  const cleanLocality = String(raw.locality || raw.area || parsedAddr.area || '').trim();
  const cleanCity = String(parsedAddr.city || raw.city || '').trim();
  const searchZone = String(raw.searchZone || raw.zone || raw.zoneName || '').trim();
  const mapsUrl = buildFallbackMapsLink(raw, cleanName, cleanLocality || searchZone, cleanCity);

  const srcName = String(raw.source || source).trim();
  const lead = {
    id: raw.id || '',
    name: cleanName,
    phone: String(raw.phone || raw.mobilePhone || raw.landlinePhone || '').trim(),
    mobilePhone: String(raw.mobilePhone || '').trim(),
    mobileVerified: String(raw.mobileVerified || (raw.isMobile ? 'Yes' : 'No')),
    landlinePhone: String(raw.landlinePhone || raw.landline || '').trim(),
    phones: Array.isArray(raw.phones) ? [...new Set(raw.phones.filter(Boolean))] : [],
    isMobile: Boolean(raw.isMobile),
    isLandline: Boolean(raw.isLandline),
    whatsappAvailable: Boolean(raw.whatsappAvailable),
    whatsappLink: raw.whatsappLink || '',
    callUrl: raw.callUrl || '',
    email: String(raw.email || '').trim().toLowerCase(),
    emailVerified: Boolean(raw.emailVerified),
    emails: Array.isArray(raw.emails) ? [...new Set(raw.emails.filter(Boolean).map(e => e.toLowerCase()))] : [],
    website: String(raw.website || '').trim(),
    instagram: sanitizeSocialUrl(raw.instagram || '', 'instagram'),
    facebook: sanitizeSocialUrl(raw.facebook || '', 'facebook'),
    linkedin: sanitizeSocialUrl(raw.linkedin || '', 'linkedin'),
    twitter: sanitizeSocialUrl(raw.twitter || '', 'twitter'),
    youtube: sanitizeSocialUrl(raw.youtube || '', 'youtube'),
    tiktok: sanitizeSocialUrl(raw.tiktok || '', 'tiktok'),
    instagramFollowers: raw.instagramFollowers || '',
    facebookFollowers: raw.facebookFollowers || '',
    youtubeSubscribers: raw.youtubeSubscribers || '',
    linkedinFollowers: raw.linkedinFollowers || '',
    socialMediaCount: Number(raw.socialMediaCount || 0),
    address: String(raw.address || '').trim(),
    area: String(raw.area || parsedAddr.area || cleanLocality || '').trim(),
    locality: cleanLocality,
    searchZone,
    zone: searchZone || cleanLocality,
    mandal: String(raw.mandal || '').trim(),
    city: cleanCity,
    district: String(raw.district || '').trim(),
    state: String(raw.state || parsedAddr.state || '').trim(),
    country: cc,
    pincode: String(raw.pincode || raw.postalCode || parsedAddr.postalCode || '').trim(),
    postalCode: String(raw.postalCode || raw.pincode || parsedAddr.postalCode || '').trim(),
    lat: Number.isFinite(Number(raw.lat ?? raw.latitude)) ? Number(raw.lat ?? raw.latitude) : null,
    lng: Number.isFinite(Number(raw.lng ?? raw.longitude)) ? Number(raw.lng ?? raw.longitude) : null,
    category: String(raw.category || '').trim(),
    subcategory: String(raw.subcategory || '').trim(),
    matchedSubcategory: String(raw.matchedSubcategory || raw.subcategory || '').trim(),
    query: String(raw.query || '').trim(),
    sessionId: String(raw.sessionId || '').trim(),
    rating: Number.isFinite(Number(raw.rating ?? raw.totalScore)) ? Number(raw.rating ?? raw.totalScore) : null,
    reviewsCount: Number.isFinite(Number(raw.reviewsCount ?? raw.reviews)) ? Number(raw.reviewsCount ?? raw.reviews) : null,
    businessStatus: String(raw.businessStatus || raw.business_status || 'OPERATIONAL').toUpperCase(),
    priceRange: raw.priceRange || '',
    operatingHours: raw.operatingHours || null,
    mapsLink: mapsUrl,
    googleMapsUrl: mapsUrl,
    placeId: String(raw.placeId || raw.place_id || '').trim(),
    logo: raw.logo || raw.avatar || '',
    verified: Boolean(raw.verified || raw.isMobile),
    aiVerified: Boolean(raw.aiVerified),
    source: srcName,
    sources: Array.isArray(raw.sources) && raw.sources.length ? [...new Set(raw.sources)] : [srcName],
    sourceCount: Number(raw.sourceCount || (Array.isArray(raw.sources) ? new Set(raw.sources).size : 1)),
    qualityScore: Number(raw.qualityScore || 0),
    scrapedAt: raw.scrapedAt || new Date().toISOString()
  };

  if (!lead.id) lead.id = generateLeadId(lead);

  if (cc !== 'IN') {
    const isForeignIn = (v) => /^\+?91\d{8,}$/.test(String(v || '').replace(/[^\d+]/g, ''));
    lead.phones = lead.phones.filter((p) => !isForeignIn(p));
    if (isForeignIn(lead.mobilePhone)) lead.mobilePhone = '';
    if (isForeignIn(lead.phone)) lead.phone = '';
    if (/^https?:\/\/wa\.me\/91\d{8,}/i.test(lead.whatsappLink || '')) {
      lead.whatsappLink = '';
      lead.whatsappAvailable = false;
    }
    if (!lead.phone) {
      lead.phone = lead.mobilePhone || lead.landlinePhone || lead.phones[0] || '';
    }
  }

  if (lead.phone) {
    const info = parsePhoneDetails(lead.phone, cc);
    if (info.isMobile) {
      lead.isMobile = true;
      lead.isLandline = false;
      lead.mobileVerified = 'Yes';
      lead.mobilePhone = info.mobile || lead.mobilePhone || info.primary;
      lead.phone = info.primary || lead.phone;
      lead.whatsappAvailable = true;
      lead.whatsappLink = info.whatsappLink || lead.whatsappLink;
      lead.verified = true;
    } else if (info.isLandline) {
      lead.isLandline = true;
      lead.landlinePhone = info.landline || lead.landlinePhone || info.primary;
      if (!lead.mobilePhone) {
        lead.isMobile = false;
        lead.mobileVerified = 'No';
        lead.whatsappAvailable = Boolean(lead.whatsappLink);
      }
    } else if (info.mobileVerified === 'Unverified') {
      lead.mobileVerified = 'Unverified';
      lead.phone = info.primary || lead.phone;
      if (!lead.mobilePhone) {
        lead.isMobile = false;
        lead.whatsappAvailable = Boolean(lead.whatsappLink);
      }
    }
  }

  const discoveredSocials = [lead.instagram, lead.facebook, lead.linkedin, lead.twitter, lead.youtube, lead.tiktok].filter(Boolean);
  if (discoveredSocials.length > 0 && !lead.socialMediaCount) {
    lead.socialMediaCount = discoveredSocials.length;
  }

  if (lead.isMobile && !lead.whatsappLink && lead.mobilePhone) {
    const digits = lead.mobilePhone.replace(/\D/g, '');
    lead.whatsappAvailable = true;
    lead.whatsappLink = `https://wa.me/${digits}`;
  }
  if (!lead.callUrl && lead.phone) {
    lead.callUrl = `tel:${lead.phone.replace(/\s+/g, '')}`;
  }
  return lead;
}

module.exports = {
  generateLeadId,
  normalizeLead
};
