const STOP_WORDS = [
  "i", "want", "looking", "for", "find", "me", "some", "best", "good", "cheap", 
  "top", "rated", "can", "you", "search", "show", "get", "need", "a", "an", "the", 
  "are", "is", "am", "to", "all", "few", "list", "services", "agencies", "service"
];

// Comprehensive registry of Indian States & Union Territories
const ALL_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh', 'puducherry', 'chandigarh'
];

const KNOWN_ATTACHED_PLACES = new Set([
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'kolkata',
  'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'thane', 'bhopal', 'visakhapatnam', 'vizag', 'patna', 'vadodara', 'ghaziabad',
  'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi',
  'coimbatore', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh',
  'guwahati', 'mysore', 'mysuru', 'tirupati', 'salem', 'warangal', 'guntur', 'tenali',
  'mangalagiri', 'nellore', 'kurnool', 'kakinada', 'rajahmundry', 'ongole', 'eluru',
  'noida', 'gurugram', 'gurgaon', 'secunderabad', 'amaravati', 'kochi', 'goa',
  'london', 'dubai', 'toronto', 'sydney', 'melbourne', 'dallas', 'austin', 'chicago',
  'houston', 'miami', 'seattle', 'boston', 'denver', 'phoenix', 'paris', 'berlin', 'munich', 'tokyo', 'singapore'
]);

function normalizePrepositionTypos(text) {
  if (!text) return '';
  // If the query already contains a proper spaced geographic preposition, never chop words!
  if (/\s+(?:in|near|around|within|at|across)\s+/i.test(text)) {
    return text;
  }
  // Only split attached prepositions when the remainder is a real known place (e.g. "plumbers intenali" -> "plumbers in tenali")
  return text.replace(/\b(in|near|at)([a-z]{3,})\b/gi, (full, prep, token) => {
    const lowerToken = token.toLowerCase();
    if (KNOWN_ATTACHED_PLACES.has(lowerToken)) {
      return `${prep} ${token}`;
    }
    return full;
  });
}

// Major Indian Metropolitan & Tier-1/Tier-2 City Hubs
const MAJOR_CITIES = [
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'kolkata',
  'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'thane', 'bhopal', 'visakhapatnam', 'vizag', 'patna', 'vadodara', 'ghaziabad',
  'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi',
  'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad',
  'prayagraj', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada',
  'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh', 'guwahati', 'solapur',
  'hubli', 'dharwad', 'bareilly', 'mysore', 'mysuru', 'tiruchirappalli', 'tirupati',
  'salem', 'aligarh', 'bhubaneswar', 'dehradun', 'jamnagar', 'warangal', 'guntur',
  'mangaluru', 'mangalore', 'kollam', 'ernakulam', 'kochi', 'calicut', 'kozhikode',
  'noida', 'gurugram', 'gurgaon', 'secunderabad', 'amaravathi', 'kurnool', 'rajahmundry'
];

/**
 * Strips fluff words, identifies geographic intent, and cleanly splits category and location.
 * @param {string} rawQuery - The natural language query from the user
 * @returns {{category: string, location: string, correctedQuery: string}}
 */
function parseNaturalLanguageQuery(rawQuery) {
  if (!rawQuery) return { category: '', location: '', correctedQuery: '' };

  let cleanText = rawQuery.toLowerCase().trim();

  // 1. Remove stopwords
  const words = cleanText.split(/\s+/);
  const filteredWords = words.filter(w => !STOP_WORDS.includes(w));
  cleanText = filteredWords.join(' ');

  // Normalize attached preposition typos: "plumbers intenali" -> "plumbers in tenali"
  cleanText = normalizePrepositionTypos(cleanText);

  // 2. Split on geographic prepositions (in, near, at, around)
  const prepRegex = /\s+(in|near|at|around)\s+/i;
  const match = cleanText.match(prepRegex);

  let rawCategory = cleanText;
  let rawLocation = '';

  if (match) {
    const splitIndex = match.index;
    rawCategory = cleanText.substring(0, splitIndex).trim();
    rawLocation = cleanText.substring(splitIndex + match[0].length).trim();
  } else {
    // 3. Fallback: match known cities or states occurring at the end of the query
    const geoTokens = [...MAJOR_CITIES, ...ALL_STATES];
    for (const geo of geoTokens) {
      const idx = cleanText.lastIndexOf(geo);
      if (idx !== -1 && idx > 0) {
        const beforeChar = cleanText[idx - 1];
        if (beforeChar === ' ' || beforeChar === ',') {
          rawCategory = cleanText.substring(0, idx).trim();
          rawLocation = cleanText.substring(idx).trim();
          break;
        }
      }
    }
  }

  // 4. CLEAN CATEGORY: Strip administrative keywords and state leaks
  let finalCategory = rawCategory;
  if (finalCategory) {
    let cleanCat = finalCategory.toLowerCase().trim();
    
    // Strip administrative keywords at start/end of category
    cleanCat = cleanCat.replace(/^(state|district|mandal|tehsil|village|districts|states|mandals|villages)\s+/gi, '');
    cleanCat = cleanCat.replace(/\s+(state|district|mandal|tehsil|village|districts|states|mandals|villages)$/gi, '');
    
    for (const state of ALL_STATES) {
      cleanCat = cleanCat.replace(new RegExp(`\\b${state}\\b`, 'gi'), '');
    }
    
    const catWords = cleanCat.trim().split(/\s+/).filter(Boolean);
    const uniqueWords = [...new Set(catWords)];
    
    // Capitalize first letter of each word
    finalCategory = uniqueWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Normalize location capitalization
  let finalLocation = rawLocation;
  if (finalLocation) {
    const locWords = finalLocation.trim().split(/\s+/).filter(Boolean);
    finalLocation = locWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return {
    category: finalCategory,
    location: finalLocation,
    correctedQuery: `${finalCategory} ${finalLocation ? 'in ' + finalLocation : ''}`.trim()
  };
}

module.exports = {
  parseNaturalLanguageQuery,
  normalizePrepositionTypos,
  ALL_STATES,
  MAJOR_CITIES
};
