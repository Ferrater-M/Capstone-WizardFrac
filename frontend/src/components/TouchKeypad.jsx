import { useEffect, useRef, useState } from 'react';

// ── Battle keypad for phones ──
// Mounted by App.jsx during battles on touch devices only (utils/device.js).
//
// Where: a pop-up floating just right of the interactable card, centred on it. It sits on top of
// the battle and never moves or resizes anything in it. Styled like the player/enemy name tags
// (black, white pixel frame). It fades/slides in and out.
// When: only while at least one answer box is on screen.
// Keys: 0–9 type into the selected answer box · X (red) deletes the last digit ·
//       ✓ (green) presses Enter, exactly like a keyboard, so every island's own Enter handling runs.
//
// The phone's own keyboard NEVER opens for a battle answer box, two layers deep:
//   1. every answer box gets inputmode="none" the moment it appears (and again if anything resets it);
//   2. answer boxes never keep the focus at all: a tap is caught before the browser focuses the box
//      and just selects it for the keypad, and any focus the island gives a box (to guide the
//      player to the next box) is turned into "selected" and dropped at once.
// The selected box glows gold (data-wf-selected, index.css) since there's no blinking cursor.
// Text boxes in the Settings / Menu pop-ups are left alone (the nickname needs a real keyboard).

const GAP = 20;            // card → keypad
const EDGE = 12;           // never closer than this to the screen edge
const PAD = 14;            // keypad frame → keys
const KEY_GAP = 10;        // between keys
const KEY_W = 85;          // key size next to a full-size card: a rectangle that is almost a square
const KEY_H = 74;
const CARD_H = 440;        // full-size card height (keys shrink with a shrunk card, never grow past full size)
const FADE_MS = 300;       // fade/slide in and out
const BLOCKERS = '.ip-overlay, .gep-backdrop, .settings-overlay, .wizard-menu-overlay';
const FIELDS = 'input:not([type]), input[type="text"], input[type="number"], input[type="tel"]';

const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

const isBattleField = (el) => !!el?.matches?.(FIELDS) && !el.closest(BLOCKERS);

const isShown = (el) => {
  if (el.disabled || el.readOnly || !el.getClientRects().length) return false;
  if (el.closest(BLOCKERS)) return false;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
  for (let p = el; p; p = p.parentElement) {
    const ps = p === el ? style : getComputedStyle(p);
    if (parseFloat(ps.opacity) < 0.05) return false;   // faded out / hidden panel
  }
  return true;
};

const findFields = () => [...document.querySelectorAll(FIELDS)].filter(isShown);

// White pixel frame, as on the battle name tags
const Frame = () => (
  <>
    <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
    {[{ top: -6, left: -6 }, { top: -6, right: -6 }, { bottom: -6, left: -6 }, { bottom: -6, right: -6 }].map((p, i) => (
      <div key={`c${i}`} style={{ position: 'absolute', width: 10, height: 10, background: '#fff', pointerEvents: 'none', ...p }} />
    ))}
    {[{ top: 3, left: 3 }, { top: 3, right: 3 }, { bottom: 3, left: 3 }, { bottom: 3, right: 3 }].map((p, i) => (
      <div key={`d${i}`} style={{ position: 'absolute', width: 5, height: 5, background: '#fff', pointerEvents: 'none', ...p }} />
    ))}
  </>
);

const PixelX = ({ size }) => (
  <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
    <path fill="currentColor" d="M0 0h2v1h1v1h1V1h1V0h2v2H6v1H5v1h1v1h1v2H5V6H4V5H3v1H2v1H0V5h1V4h1V3H1V2H0z" />
  </svg>
);
const PixelCheck = ({ size }) => (
  <svg viewBox="0 0 8 7" width={Math.round(size * 8 / 7)} height={size} shapeRendering="crispEdges" aria-hidden="true">
    <path fill="currentColor" d="M6 0h2v2H7v1H6v1H5v1H4v1H3v1H2V6H1V5H0V3h2v1h1V3h1V2h1V1h1z" />
  </svg>
);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

const keyColors = (k, down) => {
  if (k === 'del') return { bg: down ? '#f87171' : '#dc2626', fg: '#fff' };   // red
  if (k === 'ok')  return { bg: down ? '#4ade80' : '#16a34a', fg: '#fff' };   // green
  return down ? { bg: '#fff', fg: '#000' } : { bg: '#000', fg: '#fff' };
};

const TouchKeypad = () => {
  const [box, setBox] = useState(null);          // { left, top, width, height, keyW, keyH } in stage px
  const [shown, setShown] = useState(false);     // false = faded out
  const [entered, setEntered] = useState(false); // one frame after showing, so the fade-in animates
  const [downKey, setDownKey] = useState(null);
  const fieldsRef = useRef([]);
  const selectedRef = useRef(null);

  // ── No phone keyboard, ever (see top) ──
  useEffect(() => {
    const noKeyboard = (f) => { if (f.getAttribute('inputmode') !== 'none') f.setAttribute('inputmode', 'none'); };
    const markAll = () => document.querySelectorAll(FIELDS).forEach(f => { if (!f.closest(BLOCKERS)) noKeyboard(f); });
    const select = (el) => {
      if (el.readOnly || el.disabled) return;
      if (selectedRef.current && selectedRef.current !== el) selectedRef.current.removeAttribute('data-wf-selected');
      selectedRef.current = el;
      el.setAttribute('data-wf-selected', '');
    };
    // A tap on an answer box: stop the browser focusing it (no focus = no keyboard), select it instead
    const onTap = (e) => {
      const el = e.target.closest?.('input');
      if (!isBattleField(el)) return;
      e.preventDefault();
      noKeyboard(el);
      select(el);
    };
    // The island focused a box (guiding the player to it): select it, then drop the focus
    const onFocus = (e) => {
      const el = e.target;
      if (!isBattleField(el)) return;
      noKeyboard(el);
      select(el);
      el.blur();
    };
    markAll();
    const mo = new MutationObserver(markAll);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['inputmode'] });
    document.addEventListener('touchstart', onTap, { capture: true, passive: false });
    document.addEventListener('mousedown', onTap, true);
    document.addEventListener('focusin', onFocus, true);
    return () => {
      mo.disconnect();
      document.removeEventListener('touchstart', onTap, { capture: true });
      document.removeEventListener('mousedown', onTap, true);
      document.removeEventListener('focusin', onFocus, true);
      selectedRef.current?.removeAttribute('data-wf-selected');
    };
  }, []);

  // ── Every frame: are answer boxes showing, and where is the card? (follows its fades and moves) ──
  useEffect(() => {
    let frame;
    let last = '';
    let nextLook = 0;
    const tick = (now = performance.now()) => {
      frame = requestAnimationFrame(tick);
      // While hidden, look for answer boxes ~8 times a second instead of every frame (lighter on phones)
      if (!last) {
        if (now < nextLook) return;
        nextLook = now + 120;
      }
      const fields = document.querySelector(BLOCKERS) ? [] : findFields();
      fieldsRef.current = fields;
      const card = document.querySelector('[data-tutorial="interactable"]');
      let next = null;
      if (fields.length && card) {
        const r = card.getBoundingClientRect();
        // Fixed key size (scaled with the card, e.g. when the card itself is shrunk to fit)
        const k = Math.min(1, r.height / CARD_H);
        const keyW = KEY_W * k, keyH = KEY_H * k;
        const width = 3 * keyW + 2 * KEY_GAP + 2 * PAD;
        const height = 4 * keyH + 3 * KEY_GAP + 2 * PAD;
        // Floats just right of the card, centred on it; nudged back inside the screen if needed
        const left = Math.min(r.right + GAP, window.innerWidth - EDGE - width);
        const top = Math.max(EDGE, Math.min(r.top + (r.height - height) / 2, window.innerHeight - EDGE - height));
        next = {
          left: Math.round(left), top: Math.round(top),
          width: Math.round(width), height: Math.round(height), keyW: Math.round(keyW), keyH: Math.round(keyH),
        };
      }
      const key = next ? Object.values(next).join(',') : '';
      if (key !== last) {
        last = key;
        if (next) setBox(next);          // while hidden, keep the last place so it fades out where it was
        setShown(!!next);
        if (!next) setEntered(false);
      }
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!shown) return undefined;
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(f);
  }, [shown]);

  const target = () => {
    const fields = fieldsRef.current;
    if (fields.includes(selectedRef.current)) return selectedRef.current;
    return fields.find(f => !f.value) || fields[0] || null;
  };

  const type = (el, value) => {
    valueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));   // React's onChange runs, as for real typing
  };

  const press = (k) => {
    const el = target();
    if (!el) return;
    if (k === 'del') { type(el, el.value.slice(0, -1)); return; }
    if (k === 'ok') {
      const opts = { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
      return;
    }
    if (el.maxLength > 0 && el.value.length >= el.maxLength) return;
    type(el, el.value + k);
  };

  if (!box) return null;
  const visible = shown && entered;
  const fontSize = Math.max(12, Math.min(28, Math.round(box.keyH * 0.28)));
  const iconSize = Math.max(16, Math.round(box.keyH * 0.3));

  return (
    <div
      aria-label="Number keypad"
      aria-hidden={!shown}
      style={{
        position: 'fixed', left: box.left, top: box.top, width: box.width, height: box.height,
        zIndex: 40, boxSizing: 'border-box',
        border: '4px solid #fff', background: '#000', padding: PAD - 4,
        display: 'grid', justifyContent: 'center', alignContent: 'center', gap: KEY_GAP,
        gridTemplateColumns: `repeat(3, ${box.keyW}px)`, gridTemplateRows: `repeat(4, ${box.keyH}px)`,
        fontFamily: '"Press Start 2P", monospace', color: '#fff',
        touchAction: 'none', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateX(-18px) scale(0.96)',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms cubic-bezier(.2,.8,.3,1)`,
        pointerEvents: shown ? 'auto' : 'none',
      }}
    >
      <Frame />
      {KEYS.map(k => {
        const c = keyColors(k, downKey === k);
        return (
          <button
            key={k}
            type="button"
            tabIndex={-1}
            aria-label={k === 'del' ? 'Delete' : k === 'ok' ? 'Confirm' : k}
            onPointerDown={(e) => { e.preventDefault(); setDownKey(k); press(k); }}
            onPointerUp={() => setDownKey(null)}
            onPointerLeave={() => setDownKey(null)}
            onPointerCancel={() => setDownKey(null)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: 'relative', zIndex: 1, width: box.keyW, height: box.keyH, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.bg, color: c.fg,
              border: '3px solid #fff', borderRadius: 0,
              fontFamily: 'inherit', fontSize, lineHeight: 1, cursor: 'pointer',
              transform: downKey === k ? 'translateY(2px)' : 'none',
              transition: 'background 0.06s, color 0.06s',
            }}
          >
            {k === 'del' ? <PixelX size={iconSize} /> : k === 'ok' ? <PixelCheck size={iconSize} /> : k}
          </button>
        );
      })}
    </div>
  );
};

export default TouchKeypad;
