const fs = require('fs');

const files = [
  'client/src/v2/ScreenMascotCompanion.jsx',
  'master/src/v2/ScreenMascotCompanion.jsx'
];

function patch(file) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  // Copy rules: never say "scrape" outside the brand name.
  text = text.replace(/I AM SCRAPING!/g, 'I AM FINDING LEADS!');
  text = text.replace(/Keep the scrape going!/g, 'Keep the search going!');
  text = text.replace(/I AM SCRAPING/g, 'I AM FINDING LEADS');

  // Completion is a celebration pose, not the dance loop.
  text = text.replace(/Ready for WhatsApp!`, 'dance'\)/g, "Ready for WhatsApp!`, 'celebrate')");
  text = text.replace(/ready!`, 'dance'\)/g, "ready!`, 'celebrate')");
  text = text.replace(/`\? Master Vault Loaded! \$\{leadsFound\} total verified leads ready!`, 'dance'\)/g,
    "`Master Vault Loaded! ${leadsFound} total verified leads ready!`, 'celebrate')");

  // Radar/map waypoints use the 3D scanning action.
  text = text.replace(/radar:  \{ id: 'radar',  name: 'Telemetry Radar', x: 82, y: 40, mode: 'fly'/g,
    "radar:  { id: 'radar',  name: 'Telemetry Radar', x: 82, y: 40, mode: 'scan'");
  text = text.replace(/map:    \{ id: 'map',    name: 'Excavation Grid', x: 48, y: 56, mode: 'dig'/g,
    "map:    { id: 'map',    name: 'Excavation Grid', x: 48, y: 56, mode: 'scan'");

  // Add the new modes to the prop mapping.
  text = text.replace(
    /actionState === 'dance' \? 'dance' :/g,
    "actionState === 'dance' ? 'dance' :\n            actionState === 'celebrate' ? 'celebrate' :\n            actionState === 'scan' ? 'scan' :"
  );

  // Action labels.
  text = text.replace(/<Sparkles size=\{9\} \/> DANCE BREAK!/g, "<Sparkles size={9} /> DANCE BREAK!");
  text = text.replace(/<Radio size=\{9\} \/> RADAR HUD/g, "<Radio size={9} /> SCANNING");

  if (text !== before) {
    fs.writeFileSync(file, text, 'utf8');
    console.log('patched', file);
  } else {
    console.log('unchanged', file);
  }
}

files.forEach(patch);
