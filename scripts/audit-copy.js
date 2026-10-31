const fs = require('fs');
const path = require('path');

const roots = ['client/src/v2', 'master/src/v2'];

const replacements = [
  ['title="Re-scrape this query with 5km Radar Swarm"', 'title="Run this search again with the 5km radar swarm"'],
  ['<RefreshCw size={11} /> Re-Scrape Swarm', '<RefreshCw size={11} /> Run Again'],
  [
    'body="Clear the filters or start a scrape to populate the command center. Nothing is seeded or faked."',
    'body="Clear the filters or start a search to populate the command center. Nothing is seeded or faked."'
  ],
  ['<span>Est. Scrape:</span>', '<span>Est. Time:</span>'],
  [
    'Fields below come from the existing scrape. Run a deep pass to crawl the website and Google Maps profile.',
    'Fields below come from the existing search. Run a deep pass to read the website and Google Maps profile.'
  ],
  ['I AM SCRAPING HERE!', 'I AM DIGGING HERE!'],
  ['Scrape could not be started.', 'Search could not be started.'],
  ["'Scrape' ? 'Find businesses'", "'Search' ? 'Find businesses'"]
];

let touched = 0;
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!/\.(jsx?|css)$/.test(name)) continue;
    const file = path.join(root, name);
    let text = fs.readFileSync(file, 'utf8');
    const before = text;
    for (const [from, to] of replacements) {
      if (text.includes(from)) text = text.split(from).join(to);
    }
    if (text !== before) {
      fs.writeFileSync(file, text, 'utf8');
      console.log('patched', file);
      touched += 1;
    }
  }
}
console.log('files touched', touched);
