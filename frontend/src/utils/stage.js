// ── The Stage: one fixed 1920×1080 game screen, scaled evenly to fit any window ──
//
// Every screen is laid out once, at 1920×1080 (the #wf-stage element in index.html).
// installStage() scales that stage evenly (the same amount across and down, so nothing is
// ever stretched) until it fits the window, and centres it. The arrangement is exactly the
// same on a PC, a laptop or a phone held sideways: a smaller window shows the same picture,
// just smaller. When the window isn't 16:9 (e.g. a browser's address bar and tabs take some
// height), the leftover space shows as black bars (the page background).
//
// The game code measures things in many places (where the pointer is, where an element
// sits, how big the window is) to drag gems, draw circles and fly sparkles. So all of
// that keeps working, installStage() makes those measurements report STAGE pixels
// instead of screen pixels:
//   • pointer/touch clientX/clientY (and x/y, pageX/pageY)
//   • element.getBoundingClientRect() for anything inside the stage
//   • window.innerWidth / innerHeight  (always 1920 / 1080)
// Layout sizes (offsetWidth, clientWidth, ResizeObserver, CSS px) are already in stage
// pixels, so everything lines up. Overlays that need to sit "above everything" portal
// into getStageEl() instead of document.body, so they scale with the stage too.

import { isTouchDevice } from './device';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
// A window this close to a square (or taller than it is wide) is too far from 16:9 to
// play on: everything goes black except "Unsupported aspect ratio" (#wf-unsupported).
export const MIN_ASPECT = 1.25;   // width ÷ height; 1 = a square, 16:9 ≈ 1.78

let stageEl = null;
let scale = 1;   // stage px → screen px
let offX = 0;    // where the stage's top-left corner sits on the screen (the black bars' size)
let offY = 0;

export const getStageEl = () => stageEl || document.body;

// The real window size, read with the browser's own getters (the patched ones say 1920×1080).
const realSize = { w: () => document.documentElement.clientWidth, h: () => document.documentElement.clientHeight };

function fit() {
  const w = realSize.w() || STAGE_W;
  const h = realSize.h() || STAGE_H;
  scale = Math.min(w / STAGE_W, h / STAGE_H);
  offX = (w - STAGE_W * scale) / 2;
  offY = (h - STAGE_H * scale) / 2;
  stageEl.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
  // Too square to play: a phone held upright gets the "Rotate your phone landscape" pop-up
  // (#wf-rotate); anything else gets the plain "Unsupported aspect ratio" screen.
  const unsupported = w / h <= MIN_ASPECT;
  const rotatePhone = unsupported && isTouchDevice() && h > w;
  document.documentElement.classList.toggle('wf-unsupported', unsupported && !rotatePhone);
  document.documentElement.classList.toggle('wf-rotate', rotatePhone);
}

// Replace a getter on a prototype with one that maps the screen value into stage pixels.
function remapGetter(proto, prop, map) {
  if (!proto) return;
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc || !desc.get) return;
  const orig = desc.get;
  Object.defineProperty(proto, prop, { ...desc, get() { return map(orig.call(this)); } });
}

export function installStage(el) {
  if (stageEl) return;
  stageEl = el;

  // Window size → the stage size. Keep the browser's real getters for fit().
  const winW = Object.getOwnPropertyDescriptor(window, 'innerWidth') || Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth');
  const winH = Object.getOwnPropertyDescriptor(window, 'innerHeight') || Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight');
  if (winW?.get && winH?.get) {
    realSize.w = () => winW.get.call(window);
    realSize.h = () => winH.get.call(window);
  }
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => STAGE_W });
  Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => STAGE_H });

  // Pointer, mouse and touch positions → stage pixels.
  const toX = (v) => (v - offX) / scale;
  const toY = (v) => (v - offY) / scale;
  for (const proto of [window.MouseEvent?.prototype, window.Touch?.prototype]) {
    remapGetter(proto, 'clientX', toX);
    remapGetter(proto, 'clientY', toY);
    remapGetter(proto, 'pageX', toX);
    remapGetter(proto, 'pageY', toY);
  }
  remapGetter(window.MouseEvent?.prototype, 'x', toX);
  remapGetter(window.MouseEvent?.prototype, 'y', toY);

  // Element positions → stage pixels, for elements inside the stage.
  const origRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const r = origRect.call(this);
    if (this === stageEl || !stageEl.contains(this)) return r;
    return new DOMRect(toX(r.left), toY(r.top), r.width / scale, r.height / scale);
  };

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);
}
