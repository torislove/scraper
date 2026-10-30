import { create, insertMultiple, search } from '@orama/orama';

async function testOrama() {
  const oramaDb = await create({
    schema: { type: 'string', label: 'string' }
  });

  await insertMultiple(oramaDb, [
    { type: 'category', label: 'Cinematographers' },
    { type: 'category', label: 'Wedding Photographers' },
    { type: 'category', label: 'Candid Photographers' }
  ]);

  const res = await search(oramaDb, {
    term: 'phtographers',
    tolerance: 1,
  });

  console.log("Orama results for 'phtographers' (tolerance 1):");
  res.hits.forEach(h => console.log(h.document.label, h.score));

  const res2 = await search(oramaDb, {
    term: 'phtographers',
    tolerance: 2,
  });
  
  console.log("Orama results for 'phtographers' (tolerance 2):");
  res2.hits.forEach(h => console.log(h.document.label, h.score));
}

testOrama();
