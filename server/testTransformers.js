const { pipeline } = require('@xenova/transformers');

async function test() {
  console.log('Loading model...');
  const generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M');
  console.log('Model loaded. Generating...');
  const res = await generator("List 5 synonyms for 'Ice cream vendors' including Indian terms like Kulfi. Just return a comma separated list.", {
    max_new_tokens: 50
  });
  console.log(res);
}
test().catch(console.error);
