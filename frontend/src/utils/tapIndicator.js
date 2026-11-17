// ── Phones: a pixel-art tap marker ──
// Every tap shows a white pixel circle with a black outline that grows smoothly out of the finger and
// fades. Cheap: one tiny SVG per tap, animated with transform + opacity only, removed when its animation
// ends, and at most a few at once.

import { getStageEl } from './stage';
import { isTouchDevice } from './device';

const MAX_LIVE = 6;
// A pixel circle: a white ring, 1–2 pixels thick, with a 1-pixel black outline inside and out, on a
// 17×17 grid (drawn as crisp squares, so it stays pixel art however big it grows).
const N = 17;
const isWhite = (x, y) => {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2);
  return d >= 5.2 && d <= 6.6;
};
const svgMarkup = (() => {
  const rects = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (isWhite(x, y)) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#ffffff"/>`);
    else if (isWhite(x - 1, y) || isWhite(x + 1, y) || isWhite(x, y - 1) || isWhite(x, y + 1)) {
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#000000"/>`);
    }
  }
  return `<svg viewBox="0 0 ${N} ${N}" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
})();

export function installTapIndicator() {
  if (!isTouchDevice()) return;
  let live = 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || live >= MAX_LIVE) return;
    if (e.target?.closest?.('#wf-text-prompt')) return;   // the typing bar sits outside the game screen
    const el = document.createElement('div');
    el.className = 'wf-tap';
    el.innerHTML = svgMarkup;
    el.style.left = `${e.clientX}px`;   // stage px (utils/stage.js maps pointer positions)
    el.style.top = `${e.clientY}px`;
    live++;
    el.addEventListener('animationend', () => { el.remove(); live--; }, { once: true });
    getStageEl().appendChild(el);
  }, { capture: true, passive: true });
}
