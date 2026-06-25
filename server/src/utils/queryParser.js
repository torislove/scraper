const STOP_WORDS = [
  "i", "want", "looking", "for", "find", "me", "some", "best", "good", "cheap", 
  "top", "rated", "can", "you", "search", "show", "get", "need", "a", "an", "the", "are", "is", "am", "to"
];

/**
 * Strips fluff words and splits intent. Does NOT restrict search terms.
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

  // 2. Split on geographic prepositions
  const prepRegex = /\s+(in|near|at|around)\s+/i;
  const match = cleanText.match(prepRegex);

  let rawCategory = cleanText;
  let rawLocation = '';

  if (match) {
    const splitIndex = match.index;
    rawCategory = cleanText.substring(0, splitIndex).trim();
    rawLocation = cleanText.substring(splitIndex + match[0].length).trim();
  } else {
    // Fallback: split on known states if no preposition is found
    const stateKeywords = ['telangana', 'andhra pradesh'];
    for (const state of stateKeywords) {
      const idx = cleanText.lastIndexOf(state);
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

  // CLEAN CATEGORY: Strip state keywords, administrative prefixes/suffixes, and deduplicate words
  let finalCategory = rawCategory;
  if (finalCategory) {
    let cleanCat = finalCategory.toLowerCase().trim();
    
    // Strip administrative keywords at start/end of category
    cleanCat = cleanCat.replace(/^(state|district|mandal|tehsil|village|districts|states|mandals|villages)\s+/gi, '');
    cleanCat = cleanCat.replace(/\s+(state|district|mandal|tehsil|village|districts|states|mandals|villages)$/gi, '');
    
    const stateKeywords = ['telangana', 'andhra pradesh'];
    for (const state of stateKeywords) {
      cleanCat = cleanCat.replace(new RegExp(state, 'gi'), '');
    }
    
    const words = cleanCat.trim().split(/\s+/).filter(Boolean);
    const uniqueWords = [...new Set(words)];
    // Capitalize first letter of each word
    finalCategory = uniqueWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return {
    category: finalCategory,
    location: rawLocation,
    correctedQuery: `${finalCategory} ${rawLocation ? 'in ' + rawLocation : ''}`.trim()
  };
}

module.exports = {
  parseNaturalLanguageQuery
};
