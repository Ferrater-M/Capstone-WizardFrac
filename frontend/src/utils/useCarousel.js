import { useCallback, useRef } from 'react';

// A curved ("cover flow") carousel: each child slot turns and sinks back the further it is from the middle,
// as if the cards sat on the inside of a cylinder. Scrolling is eased:
//   - the mouse wheel glides sideways instead of jumping,
//   - a mouse drag keeps sliding after release (momentum) and slows down,
//   - when it comes to rest it settles on the nearest card, so one card is always centred.
// Touch keeps the browser's own swipe and still settles. A drag never counts as a click on a card.
// Returns a callback ref for the scroll container; its direct children are the slots that get transformed.
export const useCarousel = ({ maxAngle = 30, depth = 140 } = {}) => {
  const cleanup = useRef(null);

  return useCallback((el) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const angle = reduceMotion ? 0 : maxAngle;
    const sink = reduceMotion ? 0 : depth;

    let pos = el.scrollLeft;     // float position we animate (scrollLeft itself may round)
    let target = pos;
    let mode = null;             // null | 'ease' | 'inertia'
    let velocity = 0;            // px per frame, while coasting
    let raf = 0, paintRaf = 0, snapTimer = 0;
    let down = false, dragging = false, moved = false;
    let startX = 0, startLeft = 0, lastX = 0, lastT = 0;

    const maxScroll = () => el.scrollWidth - el.clientWidth;
    const clamp = (v) => Math.max(0, Math.min(maxScroll(), v));
    const slotCenter = (slot) => slot.offsetLeft + slot.offsetWidth / 2;   // el is the offsetParent

    // Layout positions (offsetLeft) are used, not getBoundingClientRect, so the 3D transforms never feed back.
    const paint = () => {
      paintRaf = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      const half = el.clientWidth / 2 || 1;
      for (const slot of el.children) {
        const off = Math.max(-1.6, Math.min(1.6, (slotCenter(slot) - mid) / half));
        const a = Math.abs(off);
        slot.style.transform = `translateZ(${(-a * sink).toFixed(1)}px) rotateY(${(-off * angle).toFixed(2)}deg)`;
        // Darken rather than fade: cards stay solid, so the background never shows through them
        slot.style.filter = `brightness(${(1 - Math.min(0.45, a * 0.3)).toFixed(3)})`;
        slot.style.zIndex = String(100 - Math.round(a * 50));
      }
    };
    const schedulePaint = () => { if (!paintRaf) paintRaf = requestAnimationFrame(paint); };

    const nearestTarget = (from) => {
      let best = from, bestDist = Infinity;
      for (const slot of el.children) {
        const t = clamp(slotCenter(slot) - el.clientWidth / 2);
        const d = Math.abs(t - from);
        if (d < bestDist) { bestDist = d; best = t; }
      }
      return best;
    };

    const tick = () => {
      raf = 0;
      if (mode === 'ease') {
        const d = target - pos;
        if (Math.abs(d) < 0.5) { pos = target; mode = null; }
        else pos += d * 0.14;
        el.scrollLeft = pos;
      } else if (mode === 'inertia') {
        velocity *= 0.93;
        const next = clamp(pos + velocity);
        const stuck = next === pos;
        pos = next;
        el.scrollLeft = pos;
        if (Math.abs(velocity) < 0.6 || stuck) {
          mode = 'ease';
          target = nearestTarget(pos);
        }
      }
      paint();
      if (mode) raf = requestAnimationFrame(tick);
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const settleSoon = (delay) => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (down || mode === 'inertia') return;
        pos = el.scrollLeft;
        target = nearestTarget(mode === 'ease' ? target : pos);
        mode = 'ease';
        run();
      }, delay);
    };

    const onWheel = (e) => {
      if (maxScroll() <= 0) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      e.preventDefault();
      if (mode !== 'ease') { pos = el.scrollLeft; target = pos; }
      target = clamp(target + (e.deltaMode === 1 ? delta * 16 : delta) * 1.1);
      mode = 'ease';
      run();
      settleSoon(220);
    };

    const onDown = (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      down = true; dragging = false; moved = false;
      mode = null; velocity = 0;
      clearTimeout(snapTimer);
      pos = el.scrollLeft;
      startX = lastX = e.clientX; startLeft = pos; lastT = performance.now();
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = moved = true;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('is-dragging');
      }
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      // Smoothed velocity in px per 16ms frame, for the coast after release.
      velocity = velocity * 0.6 + (-(e.clientX - lastX) / dt) * 16 * 0.4;
      lastX = e.clientX; lastT = now;
      pos = clamp(startLeft - dx);
      el.scrollLeft = pos;
      schedulePaint();
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.classList.remove('is-dragging');
      if (!dragging) return;
      dragging = false;
      mode = 'inertia';
      run();
    };
    // Capture phase: runs before a card's onClick and swallows the click that ends a drag.
    const onClickCapture = (e) => {
      if (!moved) return;
      moved = false;
      e.stopPropagation();
      e.preventDefault();
    };
    // Native scrolling (touch swipe, scrollbar, keyboard) still curves the cards and settles at the end.
    const onScroll = () => {
      schedulePaint();
      if (!mode && !down) settleSoon(160);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedulePaint);
    paint();

    cleanup.current = () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(paintRaf);
      clearTimeout(snapTimer);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedulePaint);
    };
  }, [maxAngle, depth]);
};
