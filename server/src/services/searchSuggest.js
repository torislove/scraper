'use strict';

/**
 * services/searchSuggest.js
 * In-memory sub-15ms keystroke suggestion engine.
 * Provides real-time query parsing, NAICS sector trust badges,
 * geo gazetteer completion, and sovereign country mismatch auto-detection.
 */

const { resolveNaics, resolveCommodity, resolveNiche, getSubvectorsForQuery } = require('../taxonomy');
const { resolveUmbrella } = require('../taxonomy/umbrellas');
const { normalizeScrapeIntent } = require('./queryNormalizer');
const { KNOWN_CITIES } = require('../geo');

const COUNTRY_FLAGS = {
  IN: { name: 'India', flag: '🇮🇳' },
  US: { name: 'United States', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪' }
};

// Authoritative 5-country places for instant country auto-switch + full disambiguated City/State labels
const SOVEREIGN_PLACES = [
  { name: 'Guntur', label: 'Guntur City', country: 'IN', state: 'Andhra Pradesh', district: 'Guntur District' },
  { name: 'Tenali', label: 'Tenali', country: 'IN', state: 'Andhra Pradesh', district: 'Guntur District' },
  { name: 'Vijayawada', label: 'Vijayawada City', country: 'IN', state: 'Andhra Pradesh', district: 'NTR District' },
  { name: 'Visakhapatnam', label: 'Visakhapatnam City', country: 'IN', state: 'Andhra Pradesh', district: 'Visakhapatnam District' },
  { name: 'Tirupati', label: 'Tirupati City', country: 'IN', state: 'Andhra Pradesh', district: 'Tirupati District' },
  { name: 'Hyderabad', label: 'Hyderabad City', country: 'IN', state: 'Telangana', district: 'Hyderabad District' },
  { name: 'Warangal', label: 'Warangal City', country: 'IN', state: 'Telangana', district: 'Warangal District' },
  { name: 'Bangalore', label: 'Bengaluru City', country: 'IN', state: 'Karnataka', district: 'Bengaluru Urban District' },
  { name: 'Bengaluru', label: 'Bengaluru City', country: 'IN', state: 'Karnataka', district: 'Bengaluru Urban District' },
  { name: 'Mumbai', label: 'Mumbai City', country: 'IN', state: 'Maharashtra', district: 'Mumbai Suburban District' },
  { name: 'Pune', label: 'Pune City', country: 'IN', state: 'Maharashtra', district: 'Pune District' },
  { name: 'Delhi', label: 'New Delhi / NCR', country: 'IN', state: 'Delhi NCR', district: 'Central Delhi District' },
  { name: 'Chennai', label: 'Chennai City', country: 'IN', state: 'Tamil Nadu', district: 'Chennai District' },
  { name: 'Kolkata', label: 'Kolkata City', country: 'IN', state: 'West Bengal', district: 'Kolkata District' },
  { name: 'Ahmedabad', label: 'Ahmedabad City', country: 'IN', state: 'Gujarat', district: 'Ahmedabad District' },
  { name: 'Surat', label: 'Surat City', country: 'IN', state: 'Gujarat', district: 'Surat District' },
  { name: 'Jaipur', label: 'Jaipur City', country: 'IN', state: 'Rajasthan', district: 'Jaipur District' },
  { name: 'Kochi', label: 'Kochi City', country: 'IN', state: 'Kerala', district: 'Ernakulam District' },

  { name: 'Dallas', label: 'Dallas City', country: 'US', state: 'Texas', district: 'Dallas County' },
  { name: 'Austin', label: 'Austin City', country: 'US', state: 'Texas', district: 'Travis County' },
  { name: 'Houston', label: 'Houston City', country: 'US', state: 'Texas', district: 'Harris County' },
  { name: 'Texas', label: 'Texas (Dallas, Houston, Austin)', country: 'US', state: 'Texas', district: 'Statewide Texas' },
  { name: 'California', label: 'California (Los Angeles, San Francisco)', country: 'US', state: 'California', district: 'Statewide California' },
  { name: 'Florida', label: 'Florida (Miami, Orlando, Tampa)', country: 'US', state: 'Florida', district: 'Statewide Florida' },
  { name: 'New York', label: 'New York City', country: 'US', state: 'New York', district: 'New York County' },
  { name: 'Los Angeles', label: 'Los Angeles City', country: 'US', state: 'California', district: 'Los Angeles County' },
  { name: 'San Francisco', label: 'San Francisco', country: 'US', state: 'California', district: 'San Francisco County' },
  { name: 'Chicago', label: 'Chicago City', country: 'US', state: 'Illinois', district: 'Cook County' },
  { name: 'Miami', label: 'Miami City', country: 'US', state: 'Florida', district: 'Miami-Dade County' },
  { name: 'Atlanta', label: 'Atlanta City', country: 'US', state: 'Georgia', district: 'Fulton County' },
  { name: 'Seattle', label: 'Seattle City', country: 'US', state: 'Washington', district: 'King County' },
  { name: 'Boston', label: 'Boston City', country: 'US', state: 'Massachusetts', district: 'Suffolk County' },
  { name: 'Phoenix', label: 'Phoenix City', country: 'US', state: 'Arizona', district: 'Maricopa County' },

  { name: 'London', label: 'London', country: 'GB', state: 'Greater London', district: 'Greater London' },
  { name: 'Manchester', label: 'Manchester City', country: 'GB', state: 'Greater Manchester', district: 'Greater Manchester' },
  { name: 'Birmingham', label: 'Birmingham City', country: 'GB', state: 'West Midlands', district: 'West Midlands' },
  { name: 'Leeds', label: 'Leeds City', country: 'GB', state: 'West Yorkshire', district: 'West Yorkshire' },
  { name: 'Edinburgh', label: 'Edinburgh City', country: 'GB', state: 'Scotland', district: 'City of Edinburgh' },
  { name: 'Glasgow', label: 'Glasgow City', country: 'GB', state: 'Scotland', district: 'Glasgow City' },
  { name: 'Bristol', label: 'Bristol City', country: 'GB', state: 'South West England', district: 'Bristol' },
  { name: 'Liverpool', label: 'Liverpool City', country: 'GB', state: 'Merseyside', district: 'Merseyside' },

  { name: 'Sydney', label: 'Sydney', country: 'AU', state: 'New South Wales', district: 'Greater Sydney' },
  { name: 'Melbourne', label: 'Melbourne', country: 'AU', state: 'Victoria', district: 'Greater Melbourne' },
  { name: 'Brisbane', label: 'Brisbane', country: 'AU', state: 'Queensland', district: 'City of Brisbane' },
  { name: 'Perth', label: 'Perth', country: 'AU', state: 'Western Australia', district: 'Greater Perth' },
  { name: 'Adelaide', label: 'Adelaide', country: 'AU', state: 'South Australia', district: 'Greater Adelaide' },
  { name: 'Parramatta', label: 'Parramatta', country: 'AU', state: 'New South Wales', district: 'City of Parramatta' },
  { name: 'Canberra', label: 'Canberra', country: 'AU', state: 'ACT', district: 'ACT' },
  { name: 'Gold Coast', label: 'Gold Coast', country: 'AU', state: 'Queensland', district: 'City of Gold Coast' },

  { name: 'Dubai', label: 'Dubai', country: 'AE', state: 'Dubai Emirate', district: 'Dubai Emirate' },
  { name: 'Abu Dhabi', label: 'Abu Dhabi', country: 'AE', state: 'Abu Dhabi Emirate', district: 'Abu Dhabi Region' },
  { name: 'Sharjah', label: 'Sharjah', country: 'AE', state: 'Sharjah Emirate', district: 'Sharjah Emirate' },
  { name: 'Ajman', label: 'Ajman', country: 'AE', state: 'Ajman Emirate', district: 'Ajman Emirate' }
];

function extractPowerDirectives(rawQuery) {
  let text = String(rawQuery || '');
  const directives = {
    phonesOnly: false,
    websiteOnly: false,
    scope: null,
    target: null
  };

  if (/\b(?:phone|phones):(?:yes|true|only)\b/i.test(text) || /\bhas:phones?\b/i.test(text)) {
    directives.phonesOnly = true;
    text = text.replace(/\b(?:phones?:\s*(?:yes|true|only)|has:phones?)\b/gi, ' ');
  }

  if (/\b(?:site|web|website):(?:yes|true|only)\b/i.test(text) || /\bhas:(?:site|website|web)\b/i.test(text)) {
    directives.websiteOnly = true;
    text = text.replace(/\b(?:(?:site|web|website):\s*(?:yes|true|only)|has:(?:site|website|web))\b/gi, ' ');
  }

  const scopeMatch = text.match(/\bscope:(district|mandal|city|state)\b/i);
  if (scopeMatch) {
    directives.scope = scopeMatch[1].toLowerCase();
    text = text.replace(/\bscope:(?:district|mandal|city|state)\b/gi, ' ');
  }

  const targetMatch = text.match(/\b(?:target|min|max|goal):(\d+)\b/i);
  if (targetMatch) {
    directives.target = parseInt(targetMatch[1], 10);
    text = text.replace(/\b(?:target|min|max|goal):\d+\b/gi, ' ');
  }

  return {
    cleanedQuery: text.replace(/\s+/g, ' ').trim(),
    directives
  };
}

function detectCountryMismatch(queryText, activeCountry = 'IN') {
  const targetCode = String(activeCountry || 'IN').toUpperCase();
  const qLower = String(queryText || '').toLowerCase();

  for (const place of SOVEREIGN_PLACES) {
    if (qLower.includes(place.name.toLowerCase())) {
      if (place.country !== targetCode) {
        const meta = COUNTRY_FLAGS[place.country] || { name: place.country, flag: '🌐' };
        return {
          detectedCountry: place.country,
          countryName: meta.name,
          flag: meta.flag,
          matchedPlace: place.name,
          matchedState: place.state
        };
      }
    }
  }
  return null;
}

function cleanNaturalLanguageIntent(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^(?:can\s+you\s+(?:please\s+)?(?:find|get|search|show)|could\s+you\s+find|please\s+(?:find|get)|find\s+me|search\s+for|look\s+for|show\s+me|i\s+want(?:\s+to\s+find)?)\s+/i, '');
  text = text.replace(/^(?:the|all|top|best)\s+/i, '');
  return text.trim();
}

function suggest({ q = '', country = 'IN' }) {
  const t0 = Date.now();
  const activeCountry = String(country || 'IN').toUpperCase();
  const { cleanedQuery: rawCleaned, directives } = extractPowerDirectives(cleanNaturalLanguageIntent(q));
  const norm = normalizeScrapeIntent({ query: rawCleaned, country: activeCountry });
  const categoryPart = norm.query;
  const locationPart = norm.location;
  const cleanedQuery = locationPart ? `${categoryPart} in ${locationPart}` : categoryPart;

  if (!cleanedQuery || cleanedQuery.length < 2) {
    return {
      query: cleanedQuery, directives, detectedCountryMismatch: null, category: null,
      suggestions: [], latencyMs: Date.now() - t0
    };
  }

  // Country Mismatch Auto-Detection (switch suggest taxonomy + city list to detected country)
  const mismatch = detectCountryMismatch(cleanedQuery, activeCountry);
  const effectiveCountry = mismatch?.detectedCountry || activeCountry;

  // Umbrella, NAICS & Niche Matching localized for effectiveCountry
  const umbrella = resolveUmbrella(categoryPart, effectiveCountry);
  const naics = resolveNaics(categoryPart);
  const commodity = resolveCommodity(categoryPart);
  const niche = resolveNiche(categoryPart);
  const subvectors = getSubvectorsForQuery(categoryPart, effectiveCountry);

  const suggestions = [];
  const primaryLabel = umbrella?.key || commodity?.label || niche?.label || categoryPart;
  const matchedPlace = SOVEREIGN_PLACES.find((p) => p.name.toLowerCase() === String(locationPart || '').toLowerCase());
  const fullDisplayLoc = matchedPlace ? `${matchedPlace.label}, ${matchedPlace.state}` : locationPart;
  const purePlaceMatch = !locationPart && SOVEREIGN_PLACES.find((p) => p.name.toLowerCase() === String(categoryPart || '').toLowerCase());

  // 1. Direct matched parsed intent with full City + State + Country context
  if (!purePlaceMatch) {
    const directText = fullDisplayLoc ? `${primaryLabel} in ${fullDisplayLoc}` : primaryLabel;
    suggestions.push({
      type: locationPart ? 'location' : 'intent',
      text: directText,
      category: primaryLabel,
      city: matchedPlace ? matchedPlace.name : (locationPart || ''),
      country: effectiveCountry,
      badge: matchedPlace ? `${matchedPlace.label} · ${matchedPlace.state}` : (COUNTRY_FLAGS[effectiveCountry]?.name || effectiveCountry),
      subtitle: matchedPlace ? `${matchedPlace.label}, ${matchedPlace.state} · ${COUNTRY_FLAGS[effectiveCountry]?.name || effectiveCountry}` : undefined,
      autoSwitchCountry: Boolean(mismatch),
      naics,
      subvectors: subvectors.slice(0, 4)
    });
  }

  // 2. Location gazetteer matches across effective + cross-market cities when user types city prefix
  const locLower = String(locationPart || cleanedQuery || '').toLowerCase();
  if (locLower.length >= 2) {
    for (const place of SOVEREIGN_PLACES) {
      if (place.name.toLowerCase().startsWith(locLower) || place.state.toLowerCase().startsWith(locLower) || place.label.toLowerCase().includes(locLower)) {
        const qHead = (locationPart && !purePlaceMatch) ? primaryLabel : 'Hospitals';
        suggestions.push({
          type: 'location',
          text: `${qHead} in ${place.label}, ${place.state}`,
          subtitle: `${place.label}, ${place.state} · ${COUNTRY_FLAGS[place.country]?.name || place.country} (${place.district})`,
          badge: `${place.state} · ${place.country}`,
          category: qHead,
          city: place.name,
          country: place.country,
          autoSwitchCountry: place.country !== activeCountry
        });
      }
    }
  }

  // 3. Localized Subcategories with full location context (skip when user only typed a bare city name)
  if (!purePlaceMatch) {
    for (const sub of subvectors.slice(0, 5)) {
      if (sub.toLowerCase() !== primaryLabel.toLowerCase()) {
        suggestions.push({
          type: 'subvector',
          text: fullDisplayLoc ? `${sub} in ${fullDisplayLoc}` : sub,
          category: sub,
          city: matchedPlace ? matchedPlace.name : (locationPart || ''),
          country: effectiveCountry,
          badge: 'Sub-category',
          naics
        });
      }
    }
  }

  return {
    query: cleanedQuery,
    parsedCategory: primaryLabel,
    parsedCity: locationPart,
    directives,
    detectedCountryMismatch: mismatch,
    category: { label: primaryLabel, naics, subvectors },
    suggestions: suggestions.slice(0, 8),
    latencyMs: Date.now() - t0
  };
}

module.exports = {
  extractPowerDirectives,
  detectCountryMismatch,
  suggest
};
