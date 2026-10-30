let emitIntervention = () => {};
const pendingInterventions = new Map();

function setInterventionEmitter(emitterFn) {
  emitIntervention = emitterFn;
}

function resolveIntervention(platformName, shouldContinue) {
  const resolver = pendingInterventions.get(platformName);
  if (resolver) {
    resolver(shouldContinue);
    pendingInterventions.delete(platformName);
    // Tell frontend to hide the UI
    emitIntervention(platformName, false);
    return true;
  }
  return false;
}

async function injectManualLoginUI(page, platformName) {
  // Disable timeouts so the script waits indefinitely for the user
  page.setDefaultTimeout(0);
  
  // Emit the SSE event to tell the React Admin Panel to show the YES/NO buttons
  console.log(`[Manual UI] Requesting manual intervention on Admin Panel for ${platformName}...`);
  emitIntervention(platformName, true);

  return new Promise((resolve) => {
    // Store the resolve function in the global map
    // The Express route /api/scrape/resolve-intervention will call it
    pendingInterventions.set(platformName, resolve);
  });
}

module.exports = { injectManualLoginUI, setInterventionEmitter, resolveIntervention };
