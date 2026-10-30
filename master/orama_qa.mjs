import { create, insertMultiple, search } from '@orama/orama';

async function runQA() {
  console.log('[QA] Initializing Orama Engine...');
  
  const oramaDb = await create({
    schema: {
      type: 'string', 
      label: 'string',
      id: 'string', 
    }
  });

  const docs = [
    { type: 'category', label: 'Photography', id: 'c1' },
    { type: 'category', label: 'Banquet Halls', id: 'c2' },
    { type: 'location', label: 'Guntur', id: 'l1' },
    { type: 'location', label: 'Amaravathi', id: 'l2' }
  ];

  await insertMultiple(oramaDb, docs);
  console.log(`[QA] Inserted ${docs.length} docs`);

  let res = await search(oramaDb, { term: 'Guntur', tolerance: 2 });
  console.log('[QA Test 1] "Guntur" results:', res.hits.map(h => h.document.label));

  res = await search(oramaDb, { term: 'Gntr', tolerance: 2 });
  console.log('[QA Test 2] "Gntr" results:', res.hits.map(h => h.document.label));

  res = await search(oramaDb, { term: 'Photograp', tolerance: 2 });
  console.log('[QA Test 3] "Photograp" results:', res.hits.map(h => h.document.label));
}

runQA().catch(console.error);
