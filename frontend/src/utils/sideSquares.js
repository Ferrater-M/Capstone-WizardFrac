// ── Side bars: little squares that fade in, slowly turn, and fade out in the black bars ──
//
// The game is a 16:9 stage (utils/stage.js); when the window isn't 16:9 the leftover space is black bars.
// This fills those bars with a few randomly placed, slowly rotating pixel squares.
//
// Built to be cheap, even on low-end phones:
//   • a FIXED pool of squares (4 per bar on phones, 8 on computers), created once and reused:
//     when a square finishes its fade cycle it just jumps to a new random spot (animationiteration),
//     so nothing is created or removed while playing
//   • only transform + opacity are animated (the graphics chip does that, not the game's code);
//     no blur, glow or shadows
//   • no bars (16:9 window) or bars too thin to notice → the layer is hidden and nothing animates
//   • paused while the tab is hidden; off entirely for "reduce motion"
//   • sits behind the stage, outside it: never covers the game, not affected by GUI Scaling

import { isTouchDevice } from './device';

const MIN_BAR = 24;                         // px: thinner bars get no squares
const PER_BAR = isTouchDevice() ? 4 : 8;
const WHITE = '#ffffff';

let layer = null;
let bars = [];                              // [{ x, y, w, h }] in screen px
const squares = [];                         // { el, bar }

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// Size, colour, speed and place of one square, inside its bar
function place(sq) {
  const b = bars[sq.bar];
  if (!b) return;
  const size = Math.round(rand(6, Math.min(26, b.w * 0.45, b.h * 0.45)));
  const s = sq.el.style;
  s.width = s.height = `${size}px`;
  s.left = `${Math.round(b.x + rand(0, Math.max(0, b.w - size)))}px`;
  s.top = `${Math.round(b.y + rand(0, Math.max(0, b.h - size)))}px`;
  // White only: some solid, some just an outline
  const filled = Math.random() < 0.4;
  s.background = filled ? WHITE : 'transparent';
  s.border = filled ? 'none' : `2px solid ${WHITE}`;
  s.animationDuration = `${rand(4, 8).toFixed(2)}s`;
  s.animationName = Math.random() < 0.5 ? 'wfSideSquare' : 'wfSideSquareBack';
}

// Where the bars are right now (left/right of the stage, or above/below it)
function measure(stage) {
  const r = stage.getBoundingClientRect();   // the stage itself reports real screen px
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  const out = [];
  if (r.left >= MIN_BAR) out.push({ x: 0, y: 0, w: r.left, h: H }, { x: r.right, y: 0, w: W - r.right, h: H });
  else if (r.top >= MIN_BAR) out.push({ x: 0, y: 0, w: W, h: r.top }, { x: 0, y: r.bottom, w: W, h: H - r.bottom });
  return out;
}

function refresh(stage) {
  bars = measure(stage);
  const want = bars.length * PER_BAR;
  layer.style.display = want ? '' : 'none';
  // Grow the pool only as far as needed (it never shrinks; extra squares just hide)
  while (squares.length < want) {
    const el = document.createElement('span');
    el.className = 'wf-side-square';
    // Each square waits a random moment before its first cycle, so they don't all blink together
    el.style.animationDelay = `${rand(0, 6).toFixed(2)}s`;
    const sq = { el, bar: 0 };
    el.addEventListener('animationiteration', () => place(sq));
    layer.appendChild(el);
    squares.push(sq);
  }
  squares.forEach((sq, i) => {
    sq.el.style.display = i < want ? '' : 'none';
    if (i < want) { sq.bar = Math.floor(i / PER_BAR); place(sq); }
  });
}

export function installSideSquares(stage) {
  if (layer || !stage) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  layer = document.createElement('div');
  layer.id = 'wf-side-squares';
  layer.setAttribute('aria-hidden', 'true');
  stage.parentNode.insertBefore(layer, stage);   // before the stage = painted behind it

  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => refresh(stage));   // after stage.js has re-fitted the stage
  };
  refresh(stage);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => layer.classList.toggle('is-paused', document.hidden));
}
