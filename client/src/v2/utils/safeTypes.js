/**
 * safeTypes.js
 * Bulletproof Primitive Type Coercion & Crash Prevention.
 * Prevents "Cannot convert object to primitive value" exceptions across React trees.
 * Strictly <= 250 lines.
 */

export function safeStr(val, fallback = '') {
  if (val == null) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'symbol') return val.description || fallback;
  if (typeof val === 'function') return fallback;
  if (typeof val === 'object') {
    try {
      if (typeof val.display === 'string') return val.display.trim();
      if (typeof val.displayPhone === 'string') return val.displayPhone.trim();
      if (typeof val.e164 === 'string') return val.e164.trim();
      if (typeof val.national === 'string') return val.national.trim();
      if (typeof val.raw === 'string') return val.raw.trim();
      if (typeof val.phone === 'string') return val.phone.trim();
      if (typeof val.primary === 'string') return val.primary.trim();
      if (typeof val.formatted === 'string') return val.formatted.trim();
      if (typeof val.text === 'string') return val.text.trim();
      if (typeof val.name === 'string') return val.name.trim();
      if (typeof val.title === 'string') return val.title.trim();
      if (typeof val.address === 'string') return val.address.trim();
      if (typeof val.message === 'string') return val.message.trim();
      if (typeof val.toString === 'function' && val.toString !== Object.prototype.toString) {
        const s = val.toString();
        if (typeof s === 'string') return s.trim();
      }
      const json = JSON.stringify(val);
      return json === '{}' ? fallback : (json || fallback);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

export function safeLeadId(lead) {
  if (!lead) return `lead_gen_${Math.random().toString(36).slice(2, 8)}`;
  if (lead.id) return safeStr(lead.id);
  const rawPhone = typeof lead.phone === 'object' ? (lead.phone.display || lead.phone.primary || '') : lead.phone;
  const digits = safeStr(lead.mobilePhone || rawPhone).replace(/\D/g, '');
  if (digits && digits.length >= 7) return `phone_${digits}`;
  const namePart = safeStr(lead.name || lead.title).toLowerCase().replace(/[^a-z0-9]/g, '');
  const addrPart = safeStr(lead.address || lead.locality || lead.city).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `lead_${namePart}_${addrPart || Math.random().toString(36).slice(2, 6)}`;
}
