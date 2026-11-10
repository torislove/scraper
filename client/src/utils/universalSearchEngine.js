/**
 * universalSearchEngine.js
 *
 * Ultra-fast, multi-token, cross-field search & scoring engine for:
 *   1. Leads within folders (FolderModal)
 *   2. Saved folders / sweeps (Runs tab)
 *   3. Live Cockpit table (filteredVendors)
 *   4. Phone number normalization & instant digit-matching
 *   5. Match highlighting (<mark>)
 */
import React from 'react';

// ── Phone Normalization Helper ──────────────────────────────────────────────
export function normalizePhoneDigits(raw) {
  if (!raw) return '';
  const val = typeof raw === 'object' && raw
    ? (raw.e164 || raw.national || raw.number || '')
    : String(raw);
  const digits = val.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// ── Query Tokenizer ────────────────────────────────────────────────────────
export function tokenizeQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  return rawQuery
    .toLowerCase()
    .trim()
    .split(/[\s,+/&|_-]+/)
    .filter(t => t.length > 0);
}

// ── Simple Damerau-Levenshtein for short tokens (Distance <= 1) ─────────────
export function isFuzzyMatch(token, word) {
  if (!word || !token) return false;
  if (word.includes(token)) return true;
  if (token.length < 4 || word.length < 4) return false;
  if (Math.abs(token.length - word.length) > 1) return false;

  let diffs = 0;
  let i = 0, j = 0;
  while (i < token.length && j < word.length) {
    if (token[i] !== word[j]) {
      diffs++;
      if (diffs > 1) return false;
      if (token.length > word.length) i++;
      else if (word.length > token.length) j++;
      else { i++; j++; }
    } else {
      i++; j++;
    }
  }
  return true;
}

// ── Lead Matcher ────────────────────────────────────────────────────────────
/**
 * Tests if a lead matches a search query across all 12 key fields.
 * Enforces Boolean AND: EVERY query token must match somewhere in the lead.
 *
 * @param {Object} lead - The vendor/lead object
 * @param {string[]} tokens - Array of query tokens
 * @param {string} rawQuery - The raw query string
 * @param {string} phoneDigits - Digits extracted from query (if any)
 * @returns {boolean}
 */
export function matchesLead(lead, tokens, rawQuery = '', phoneDigits = '') {
  if (!lead) return false;
  if (!tokens || tokens.length === 0) return true;

  // Extract phone numbers in all possible formats
  const rawPhones = [
    lead.phone,
    lead.primaryPhone,
    lead.mobile,
    lead.whatsapp,
    ...(Array.isArray(lead.phones) ? lead.phones : [])
  ].filter(Boolean);

  const cleanPhones = rawPhones.map(normalizePhoneDigits).filter(Boolean);
  const rawPhoneStrings = rawPhones.map(p => (typeof p === 'object' ? JSON.stringify(p) : String(p)).toLowerCase());

  // If query is pure digits (e.g. searching a phone number)
  if (phoneDigits && phoneDigits.length >= 4) {
    const phoneMatched = cleanPhones.some(p => p.includes(phoneDigits)) ||
                         rawPhoneStrings.some(p => p.replace(/\D/g, '').includes(phoneDigits));
    if (tokens.every(t => /^\d+$/.test(t))) {
      return phoneMatched;
    }
  }

  // Build searchable text fields
  const fields = [
    lead.name || '',
    lead.category || '',
    lead.city || '',
    lead.area || '',
    lead.mandal || '',
    lead.village || '',
    lead.district || '',
    lead.state || '',
    lead.address || '',
    lead.pincode ? String(lead.pincode) : '',
    lead.email || '',
    lead.website || '',
    lead.crmStage || '',
    lead.notes || '',
    ...(Array.isArray(lead.tags) ? lead.tags : [])
  ].map(f => String(f).toLowerCase());

  // Also include phone strings in searchable text
  fields.push(...cleanPhones, ...rawPhoneStrings);

  // Quick check: If rawQuery as a whole is found in any field
  const qLower = rawQuery.toLowerCase().trim();
  if (qLower.length > 2 && fields.some(f => f.includes(qLower))) {
    return true;
  }

  // Multi-token Boolean AND: EVERY token must match at least one field
  return tokens.every(token => {
    // If token is numeric and looks like a phone segment
    if (/^\d{3,}$/.test(token)) {
      if (cleanPhones.some(p => p.includes(token))) return true;
    }

    // Exact or substring match in any field
    for (const f of fields) {
      if (!f) continue;
      if (f.includes(token)) return true;

      // Word-level fuzzy check for words >= 4 chars
      if (token.length >= 4) {
        const words = f.split(/[\s,./_-]+/);
        for (const w of words) {
          if (isFuzzyMatch(token, w)) return true;
        }
      }
    }
    return false;
  });
}

// ── Lead Scoring ────────────────────────────────────────────────────────────
export function scoreLead(lead, tokens, rawQuery = '') {
  if (!lead) return 0;
  let score = 0;
  const name = (lead.name || '').toLowerCase();
  const q = rawQuery.toLowerCase().trim();

  if (q && name === q) score += 100;
  else if (q && name.startsWith(q)) score += 60;
  else if (q && name.includes(q)) score += 40;

  tokens.forEach(t => {
    if (name.includes(t)) score += 20;
    if ((lead.category || '').toLowerCase().includes(t)) score += 15;
    if ((lead.area || lead.city || '').toLowerCase().includes(t)) score += 10;
  });

  if (lead.phone && !lead.phone.includes('Obfuscated')) score += 10;
  if (lead.rating) score += Math.min(10, Math.round(Number(lead.rating) * 2));

  return score;
}

// ── Folder Matcher ──────────────────────────────────────────────────────────
/**
 * Tests if a saved folder/run matches the search query.
 * Checks folder metadata AND performs deep search on leads contained within the folder.
 *
 * @param {Object} folder - The run/session folder object
 * @param {string[]} tokens - Array of query tokens
 * @param {string} rawQuery - The raw query string
 * @param {string} phoneDigits - Phone digits from query (if any)
 * @param {Map<string, Object[]>|null} vendorsBySessionMap - Map of sessionId -> leads
 * @returns {{ matches: boolean, matchedLeadName: string|null, matchedPhone: string|null }}
 */
export function matchesFolder(folder, tokens, rawQuery = '', phoneDigits = '', vendorsBySessionMap = null) {
  if (!folder) return { matches: false, matchedLeadName: null, matchedPhone: null };
  if (!tokens || tokens.length === 0) return { matches: true, matchedLeadName: null, matchedPhone: null };

  const qLower = rawQuery.toLowerCase().trim();

  // 1. Check Folder Metadata
  const metadataFields = [
    folder.name || '',
    folder.customName || '',
    folder.id || '',
    folder.category || '',
    folder.location || '',
    folder.clientLabel || '',
    folder.clientId || '',
    folder.status || '',
    folder.notes || '',
    ...(Array.isArray(folder.tags) ? folder.tags : [])
  ].map(f => String(f).toLowerCase());

  // Check if all tokens match metadata
  const metadataMatches = tokens.every(token => metadataFields.some(f => f.includes(token)));
  if (metadataMatches) {
    return { matches: true, matchedLeadName: null, matchedPhone: null };
  }

  // 2. Deep Search into Folder Leads (if leads are available)
  const leads = Array.isArray(folder.leads) && folder.leads.length
    ? folder.leads
    : vendorsBySessionMap?.get(folder.id) || [];

  if (leads.length > 0) {
    // Check if any lead matches the query
    for (const lead of leads) {
      if (matchesLead(lead, tokens, rawQuery, phoneDigits)) {
        return {
          matches: true,
          matchedLeadName: lead.name || null,
          matchedPhone: lead.phone || lead.mobile || null
        };
      }
    }
  }

  return { matches: false, matchedLeadName: null, matchedPhone: null };
}

// ── Highlight Match Renderer ────────────────────────────────────────────────
/**
 * Safely renders a string with matched search tokens wrapped in <mark className="v2-search-highlight">.
 * Returns an array of React elements.
 *
 * @param {string} text - The text to display
 * @param {string[]} tokens - The search query tokens
 * @returns {React.ReactNode}
 */
export function highlightMatches(text, tokens) {
  if (!text || typeof text !== 'string') return text || '';
  if (!tokens || tokens.length === 0) return text;

  // Filter out single character tokens to prevent over-highlighting
  const validTokens = tokens.filter(t => t.length >= 2);
  if (validTokens.length === 0) return text;

  // Escape regex special chars
  const escaped = validTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = validTokens.some(t => t.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return React.createElement('mark', { key: i, className: 'v2-search-highlight' }, part);
    }
    return part;
  });
}
