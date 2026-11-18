/**
 * soundEffects.js
 * Sounds completely disabled as requested.
 */
class SoundEngine {
  isMuted() { return true; }
  setMuted() {}
  toggleMute() { return true; }
  playClick() {}
  playLeadBlip() {}
  playSuccess() {}
}

export const soundFx = new SoundEngine();
