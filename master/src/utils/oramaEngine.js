import { create, insertMultiple, search } from '@orama/orama';

let oramaDb = null;

/**
 * Initializes the Orama search engine with the given knowledge base.
 * @param {Object} knowledge - Expected format: { categories: [], locations: [] }
 */
export async function initializeOrama(knowledge) {
  if (!knowledge) return;
  
  // Create an in-memory Orama database
  oramaDb = await create({
    schema: {
      type: 'string', // 'category' or 'location'
      label: 'string', // The actual searchable text
      id: 'string', // Unique identifier
    }
  });

  const docs = [];

  // Index Categories
  if (knowledge.categories) {
    knowledge.categories.forEach(cat => {
      docs.push({
        type: 'category',
        label: cat,
        id: `cat_${cat.replace(/\s+/g, '_').toLowerCase()}`
      });
    });
  }

  // Index Locations (Districts, Mandals, etc.)
  if (knowledge.locations) {
    knowledge.locations.forEach(loc => {
      docs.push({
        type: 'location',
        label: loc,
        id: `loc_${loc.replace(/\s+/g, '_').toLowerCase()}`
      });
    });
  }

  // Insert all documents at once for maximum performance
  await insertMultiple(oramaDb, docs);
  console.log(`[Orama Engine] Indexed ${docs.length} entities into native browser memory.`);
}

/**
 * Executes a lightning-fast, typo-tolerant search against the indexed data.
 * @param {string} query - The user's input
 * @returns {Array} - Array of matched results with metadata
 */
export async function performOramaSearch(query) {
  if (!oramaDb || !query || query.trim().length === 0) return [];

  const results = await search(oramaDb, {
    term: query,
    tolerance: query.length > 5 ? 1 : 0, // Lower tolerance to prevent false positives like Guntur -> Puttur
    limit: 10
  });

  // Sort results to prioritize EXACT matches first
  const sortedHits = results.hits.sort((a, b) => {
    const aLower = a.document.label.toLowerCase();
    const bLower = b.document.label.toLowerCase();
    const qLower = query.toLowerCase();
    if (aLower === qLower) return -1;
    if (bLower === qLower) return 1;
    if (aLower.startsWith(qLower) && !bLower.startsWith(qLower)) return -1;
    if (bLower.startsWith(qLower) && !aLower.startsWith(qLower)) return 1;
    return 0;
  });

  return sortedHits.map(hit => ({
    id: hit.document.id,
    type: hit.document.type,
    label: hit.document.label,
    score: hit.score
  }));
}
