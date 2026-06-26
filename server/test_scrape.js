const { scrapeGooglePlaces } = require('./src/scrapers/engine-google-places');

async function test() {
  try {
    const res = await scrapeGooglePlaces("plumbers in guntur", "plumbers", "guntur");
    console.log("Scrape success:", res);
  } catch (e) {
    console.error("Scrape failed:", e);
  }
}
test();
