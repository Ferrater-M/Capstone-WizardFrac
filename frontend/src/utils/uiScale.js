// ── GUI Scaling: how big the buttons, panels and text are (Settings → GUI Scaling) ──
//
// Three sizes: Default (the original look), Medium (a little bigger) and Large (the biggest).
// A computer starts on Default; a phone starts on Large, because there the whole 1920×1080
// stage is shrunk onto a small screen. The player's choice is remembered on this device.
//
// How it works: the chosen size is the CSS variable --wf-ui on <html> (1, 1.2 or 1.4).
// Every piece of GUI that may grow carries the attribute data-ui, and index.css gives
// [data-ui] "zoom: var(--wf-ui)". zoom (unlike transform: scale) grows the element's real
// layout box too, so neighbours make room instead of being overlapped. Elements inside a
// zoomed part that must keep their size use data-ui-keep (zoom back to 1).
//
// NOT scaled, on purpose: the island pictures, the walkable island, every sprite, and the
// battle's player/enemy platform with its name and health boxes.
//
// Rules for a [data-ui] element:
//   • never nest one [data-ui] inside another (the zoom would multiply)
//   • sizes that must still fit the 1920×1080 stage (max-height, height) are divided by
//     var(--wf-ui), e.g. max-height: calc(972px / var(--wf-ui))
//   • JS that positions things inside it from getBoundingClientRect must divide by getUiScale()

import { useEffect, useState } from 'react';
import { isTouchDevice } from './device';

export const UI_SCALE_KEY = 'wizardfrac_ui_scale';
export const UI_SCALES = [
  { id: 'default', label: 'Default', value: 1 },
  { id: 'medium', label: 'Medium', value: 1.2 },
  { id: 'large', label: 'Large', value: 1.4 },
];
const CHANGE_EVENT = 'wf-ui-scale-change';

const defaultId = () => (isTouchDevice() ? 'large' : 'default');

export const getUiScaleSetting = () => {
  try {
    const saved = localStorage.getItem(UI_SCALE_KEY);
    if (UI_SCALES.some(s => s.id === saved)) return saved;
  } catch { /* storage blocked: use the device's default */ }
  return defaultId();
};

export const getUiScale = () => UI_SCALES.find(s => s.id === getUiScaleSetting())?.value ?? 1;

const apply = () => {
  const root = document.documentElement;
  root.style.setProperty('--wf-ui', String(getUiScale()));
  root.dataset.uiScale = getUiScaleSetting();
};

export const setUiScaleSetting = (id) => {
  try { localStorage.setItem(UI_SCALE_KEY, id); } catch { /* not remembered, still applies now */ }
  apply();
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

// Re-reads the saved size and applies it if it changed (another tab, or anything that saved it).
export const refreshUiScale = () => {
  const before = document.documentElement.dataset.uiScale;
  apply();
  if (document.documentElement.dataset.uiScale !== before) window.dispatchEvent(new Event(CHANGE_EVENT));
};

export function installUiScale() {
  apply();
  // Changed in another tab of the game → this tab follows straight away
  window.addEventListener('storage', (e) => { if (e.key === null || e.key === UI_SCALE_KEY) refreshUiScale(); });
  // Coming back to the tab / page restored from the back-forward cache → check again
  window.addEventListener('pageshow', refreshUiScale);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUiScale(); });
}

// React: the current scale number, re-rendering when the player changes it in Settings.
export function useUiScale() {
  const [scale, setScale] = useState(getUiScale);
  useEffect(() => {
    const update = () => setScale(getUiScale());
    window.addEventListener(CHANGE_EVENT, update);
    return () => window.removeEventListener(CHANGE_EVENT, update);
  }, []);
  return scale;
}
