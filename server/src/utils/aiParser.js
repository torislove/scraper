// Unused Fuse.js import removed for footprint optimization
let classifier = null;
let pipeline = null;

try {
  pipeline = require('@xenova/transformers').pipeline;
} catch (e) {
  // Transformers not installed on this lightweight server environment
}

async function loadAIModel() {
  try {
    if (!pipeline) return;
    if (!classifier) {
      console.log('[AI Model] Loading DistilBERT Zero-Shot Classifier (Offline/Local)...');
      classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli', {
        quantized: true 
      });
      console.log('[AI Model] Successfully loaded.');
    }
  } catch (err) {
    console.error('[AI Model] Failed to load Transformers.js:', err.message);
  }
}

// Kick off loading immediately so it's ready before first scrape
loadAIModel();

async function getKeywordSynonyms(category, location = '') {
  try {
    const res = await require('axios').get(`https://api.datamuse.com/words?ml=${encodeURIComponent(category)}`);
    const words = res.data.slice(0, 8).map(w => w.word);
    
    const coreTerms = category.split(/[\s&/]+/).filter(w => w.length > 3);
    let combined = [...new Set([...words, ...coreTerms, category])];
    
    const lowerLocation = location.toLowerCase();
    const isSouthIndia = lowerLocation.includes('andhra') || lowerLocation.includes('telangana') || lowerLocation.includes('hyderabad') || lowerLocation.includes('guntur') || lowerLocation.includes('vijayawada') || lowerLocation.includes('chennai') || lowerLocation.includes('tamil nadu') || lowerLocation.includes('kerala') || lowerLocation.includes('karnataka') || lowerLocation.includes('bangalore');
    const isNorthIndia = lowerLocation.includes('delhi') || lowerLocation.includes('mumbai') || lowerLocation.includes('punjab') || lowerLocation.includes('haryana') || lowerLocation.includes('up') || lowerLocation.includes('uttar pradesh') || lowerLocation.includes('rajasthan');

    // Wedding / Hall Region Intelligence
    if (category.toLowerCase().includes('mandap') || category.toLowerCase().includes('banquet') || category.toLowerCase().includes('hall') || category.toLowerCase().includes('wedding')) {
      if (isSouthIndia) {
        combined.push('kalyana', 'mandapamu', 'kalyanamandapam', 'function hall', 'pelli', 'muhurtham');
      } else if (isNorthIndia) {
        combined.push('shadi', 'khana', 'banquets', 'vivah', 'marriage palace', 'bhavan');
      } else {
        combined.push('convention', 'arena', 'marriage hall');
      }
    }

    // Specialize decoration categories for wedding/events, weeding out interior/car/painting terms
    if (category.toLowerCase().includes('decor')) {
      combined = combined.filter(w => {
        const lower = w.toLowerCase();
        return !lower.includes('interior') && 
               !lower.includes('house') && 
               !lower.includes('painter') && 
               !lower.includes('painting') && 
               !lower.includes('car') && 
               !lower.includes('furniture') && 
               !lower.includes('design') &&
               !lower.includes('paperhanger') &&
               !lower.includes('curtain') &&
               !lower.includes('mattress');
      });
      // Add strong wedding/event decoration markers
      combined.push(
        'event decoration', 'wedding decor', 'flower decoration', 
        'stage decor', 'mandap decoration', 'party decor', 
        'balloon decoration', 'lights and decoration', 'marriage decorators'
      );
    }
    
    return combined;
  } catch (error) {
    let fallback = [category, ...category.split(' ')];
    if (category.toLowerCase().includes('decor')) {
      fallback.push('event decoration', 'wedding decor', 'flower decoration', 'stage decor', 'mandap decoration');
    }
    return fallback;
  }
}

function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array(b.length + 1).fill(0).map((_, i) => i);
  let curr = [];
  for (let i = 1; i <= a.length; i++) {
    curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

async function verifyWithAI(vendorName, htmlContent, expectedCategory, aiKeywords = []) {
  if (!htmlContent || htmlContent.length < 50) return false;
  
  const cleanHtml = htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').toLowerCase();
  
  // 1. Fast Exact Substring Match Engine
  let foundKeywords = [];
  for (const keyword of aiKeywords) {
    const kwLower = keyword.toLowerCase();
    if (cleanHtml.includes(kwLower)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return true;
  }

  // 2. High-Performance Fuzzy Match Engine (using Set of unique words from HTML to bypass Fuse.js overhead)
  // Extract words of length > 3 to filter fluff noise
  const htmlWords = [...new Set(cleanHtml.split(/[^a-z0-9]+/))].filter(w => w.length > 3);
  
  for (const keyword of aiKeywords) {
    const kwLower = keyword.toLowerCase();
    if (kwLower.length > 3 && !kwLower.includes(' ')) {
      for (const word of htmlWords) {
        // Only run Levenshtein if string lengths differ by at most 1 (threshold 0.3 approx on word length 4+)
        if (Math.abs(word.length - kwLower.length) <= 1) {
          const dist = getLevenshteinDistance(word, kwLower);
          if (dist <= 1) {
            foundKeywords.push(keyword);
            break;
          }
        }
      }
    }
  }

  if (foundKeywords.length > 0) {
    return true;
  }

  // 3. Heavy AI Fallback 
  if (classifier) {
    try {
      const textToAnalyze = cleanHtml.substring(0, 1500); 
      const results = await classifier(textToAnalyze, [expectedCategory, ' unrelated business ', ' random blog ']);
      
      const categoryScore = results.scores[results.labels.indexOf(expectedCategory)];
      if (categoryScore > 0.4) {
        return true;
      }
    } catch (e) {
      console.warn(`[AI Parser] Transformers.js failed for ${vendorName}:`, e.message);
    }
  }

  return false;
}

module.exports = {
  loadAIModel,
  getKeywordSynonyms,
  verifyWithAI
};
