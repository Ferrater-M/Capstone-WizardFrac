import React, { useEffect, useRef, useState } from 'react';

const IDLE_MS = 2000;   // no interaction with an input for this long -> the cursor appears
const DWELL_MS = 2000;  // how long it stays pulsing at an input
const FADE_MS = 400;    // fade in / out
const GAP_MS = 2000;    // with several empty inputs: hidden for this long before it appears at another one
const POLL_MS = 250;

// An element counts as available when it and all its ancestors are rendered and not faded out.
const isShown = (el) => {
  if (getComputedStyle(el).pointerEvents === 'none') return false;
  for (let n = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
  }
  return true;
};

// True once the element and its ancestors have no finite animation or transition still running
// (an input that is still fading or sliding in isn't ready to be pointed at). Endless loops such as a
// floating wrapper are ignored.
const hasSettled = (el) => {
  for (let n = el; n; n = n.parentElement) {
    const anims = n.getAnimations ? n.getAnimations() : [];
    if (anims.some(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity)) return false;
  }
  return true;
};

// Guide cursor for typing steps. Render it inside the (position: relative) interactable container.
// After IDLE_MS without the player touching an input, a pulsing cursor fades in at the bottom right of an
// empty input. With one empty input it stays there. With several, after DWELL_MS it fades away, stays hidden
// for GAP_MS, then fades in at another empty input picked at random, and so on.
// With waitForAppear, an input only counts once its appearance animation has finished, so the IDLE_MS wait
// starts after that rather than while the input is still fading in.
const InputGuideCursor = ({ containerRef, enabled, waitForAppear = false }) => {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const cont = containerRef.current;
    if (!enabled || !cont) { setVisible(false); return undefined; }

    let idleTimer = null, stepTimer = null, poll = null, raf = 0;
    let active = false, phase = 'idle', current = null, last = null;

    const candidates = () => Array.from(cont.querySelectorAll('input')).filter(el =>
      el.type === 'text' && !el.readOnly && !el.disabled && el.value === '' && isShown(el)
      && (!waitForAppear || hasSettled(el)));
    const pick = () => {
      const all = candidates();
      const pool = all.length > 1 ? all.filter(el => el !== last) : all;
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };

    // Bottom right of the current input, in the container's own (unscaled) coordinates.
    const positionNow = () => {
      const w = wrapRef.current;
      if (!w || !current || !cont.contains(current)) return;
      const cr = cont.getBoundingClientRect();
      const sc = cr.width / cont.offsetWidth || 1;
      const r = current.getBoundingClientRect();
      w.style.left = ((r.right - cr.left) / sc - cont.clientLeft - 8) + 'px';
      w.style.top = ((r.bottom - cr.top) / sc - cont.clientTop - 4) + 'px';
    };

    const stop = () => {
      clearTimeout(stepTimer);
      active = false; phase = 'idle'; current = null;
      setVisible(false);
    };
    const armIdle = () => {
      clearTimeout(idleTimer);
      if (active) stop();
      // Count the idle wait from the moment an input is ready (when waiting for appearance animations).
      const begin = () => {
        if (!waitForAppear || candidates().length) idleTimer = setTimeout(start, IDLE_MS);
        else idleTimer = setTimeout(begin, 100);
      };
      begin();
    };

    // Fade in at `el`, then either keep pulsing (only one empty input) or fade out, wait, and move on.
    const showAt = (el) => {
      clearTimeout(stepTimer);
      current = el;
      phase = 'showing';
      positionNow();
      setVisible(true);
      stepTimer = setTimeout(afterDwell, DWELL_MS);
    };
    const afterDwell = () => {
      const all = candidates();
      if (!all.length) { stop(); armIdle(); return; }
      if (all.length === 1) { current = all[0]; stepTimer = setTimeout(afterDwell, DWELL_MS); return; }
      phase = 'fading';
      setVisible(false);
      stepTimer = setTimeout(() => {
        phase = 'gap';
        stepTimer = setTimeout(() => {
          last = current;
          const next = pick();
          if (!next) { stop(); armIdle(); return; }
          showAt(next);
        }, GAP_MS);
      }, FADE_MS);
    };
    function start() {
      const el = pick();
      if (!el) { idleTimer = setTimeout(start, 400); return; } // nothing to point at yet
      active = true;
      showAt(el);
    }

    // Only touching an input counts as interaction.
    const onInteract = (e) => { if (e.target?.tagName === 'INPUT') armIdle(); };
    const evs = ['pointerdown', 'keydown', 'input'];
    evs.forEach(ev => cont.addEventListener(ev, onInteract, true));
    armIdle();

    // Keep the cursor on its input (inputs can float or move).
    const follow = () => {
      if (active && phase === 'showing') positionNow();
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    // While it is showing: if its input is filled in, disabled, hidden or replaced, move to another empty one.
    poll = setInterval(() => {
      if (active && phase === 'showing' && !(current && cont.contains(current) && candidates().includes(current))) {
        last = current;
        const next = pick();
        if (!next) { stop(); armIdle(); } else showAt(next);
      }
    }, POLL_MS);

    return () => {
      clearTimeout(idleTimer); clearTimeout(stepTimer); clearInterval(poll); cancelAnimationFrame(raf);
      evs.forEach(ev => cont.removeEventListener(ev, onInteract, true));
      setVisible(false);
    };
  }, [enabled, containerRef, waitForAppear]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute', width: 48, height: 48, pointerEvents: 'none', zIndex: 60,
        opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <img
        src="/InteractableUI/GuideCursor.png"
        alt=""
        draggable={false}
        style={{
          width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated',
          transformOrigin: '8px 4px', animation: 'guidePulse 0.9s ease-in-out infinite',
        }}
      />
    </div>
  );
};

export default InputGuideCursor;
