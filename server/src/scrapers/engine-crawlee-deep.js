const dbAdapter = require('../config/dbAdapter');

let deps = {
  logger: console.log,
  abortSignal: { aborted: false },
  emitVendorEvent: () => {}
};

function setDeps(newDeps) {
  deps = { ...deps, ...newDeps };
}

async function scrapeCrawleeDeep(url, vendorName, category, location) {
  deps.logger(`[Crawlee Deep Scanner] Deep scan disabled to conserve server resources.`);
  return;
}

module.exports = { scrapeCrawleeDeep, setDeps };
