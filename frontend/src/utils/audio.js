// Shared volume settings, wired to the sliders on the Settings page.
// Anything that plays a sound in the app should route through here so the
// Master/SFX Volume sliders actually affect what the player hears.

export const MASTER_VOLUME_KEY = 'wizardfrac_master_volume';
export const SFX_VOLUME_KEY = 'wizardfrac_sfx_volume';

// Reads a 0-100 value from localStorage and returns it as a 0-1 volume,
// falling back (also 0-1) if nothing's been saved yet or it's not a number.
export const getStoredVolume = (key, fallback01) => {
  try {
    const raw = localStorage.getItem(key);
    const n = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) / 100 : fallback01;
  } catch {
    return fallback01;
  }
};

export const getMasterVolume = () => getStoredVolume(MASTER_VOLUME_KEY, 0.5);
export const getSfxVolume = () => getStoredVolume(SFX_VOLUME_KEY, 0.7);

// Fire-and-forget sound effect, volume-controlled by the SFX slider.
// Mirrors the old `new Audio(path).play().catch(() => {})` one-liners.
export const playSfx = (path) => {
  const audio = new Audio(path);
  audio.volume = getSfxVolume();
  audio.play().catch(() => {});
  return audio;
};
