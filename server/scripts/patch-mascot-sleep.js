const fs = require('fs');

for (const file of ['client/src/v2/ScreenMascotCompanion.jsx', 'master/src/v2/ScreenMascotCompanion.jsx']) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  // Map the new rest / alert states onto the 3D rig.
  text = text.replace(
    "            actionState === 'peek' ? 'peek' :",
    "            actionState === 'peek' ? 'peek' :\n            actionState === 'sleep' ? 'sleep' :\n            actionState === 'warning' ? 'warning' :"
  );

  // Do not wander the screen while asleep.
  text = text.replace(
    "if (['dance', 'trip', 'tap', 'peek', 'dig', 'sprint'].includes(actionState)) return;",
    "if (['dance', 'trip', 'tap', 'peek', 'dig', 'sprint', 'sleep', 'warning', 'celebrate'].includes(actionState)) return;"
  );

  // Doze off when nothing has happened for a while; any click wakes him up.
  const anchor = "  // Interactive click handler\n  const handleClick = () => {";
  if (!text.includes('__diggySleepWired')) {
    text = text.replace(anchor, `  // Doze off after a quiet spell, then wake on interaction.
  useEffect(() => {
    if (scraping || minimized || isTransitioning) return undefined;
    const timer = setTimeout(() => {
      if (currentWaypoint !== 'patrol') return;
      setActionState('sleep');
      setSpeech('Zzz... still on watch. Wake me for the next search!');
      setShowSpeech(true);
      setShowFlightMenu(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [scraping, minimized, isTransitioning, currentWaypoint]);

  // Interactive click handler
  const handleClick = () => { // __diggySleepWired`);
  }

  // Wake instantly from a nap.
  text = text.replace(
    "  const handleClick = () => {\n    setClickCount(prev => prev + 1);",
    "  const handleClick = () => {\n    if (actionState === 'sleep') {\n      setActionState('tap');\n      setSpeech('I am up! Point me at a city and I will dig.');\n      setShowSpeech(true);\n      setShowFlightMenu(false);\n      setClickCount(prev => prev + 1);\n      setTimeout(() => setActionState(currentWaypoint === 'patrol' ? 'walking' : 'idle'), 1400);\n      return;\n    }\n    setClickCount(prev => prev + 1);"
  );

  if (text !== before) {
    fs.writeFileSync(file, text, 'utf8');
    console.log('patched', file);
  } else {
    console.log('unchanged', file);
  }
}
