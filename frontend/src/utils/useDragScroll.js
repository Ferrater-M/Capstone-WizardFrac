import { useCallback, useRef } from 'react';

// Lets a scrollable element be scrolled by dragging it with the mouse, and (wheelToX) turns the mouse wheel
// into sideways scrolling — for carousels. Touch keeps the browser's own swipe scrolling.
// A drag never counts as a click, so dragging across a card doesn't open it.
// Returns a callback ref: <div ref={useDragScroll({ axis: 'x', wheelToX: true })} />
export const useDragScroll = ({ axis = 'both', wheelToX = false } = {}) => {
  const cleanup = useRef(null);

  return useCallback((el) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;

    let down = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onDown = (e) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX; startY = e.clientY;
      startLeft = el.scrollLeft; startTop = el.scrollTop;
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 6) {
        moved = true;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('is-dragging');
      }
      if (!moved) return;
      if (axis !== 'y') el.scrollLeft = startLeft - dx;
      if (axis !== 'x') el.scrollTop = startTop - dy;
    };
    const onUp = () => {
      down = false;
      el.classList.remove('is-dragging');
    };
    // Runs before the card's own onClick (capture phase) and swallows the click that ends a drag.
    const onClickCapture = (e) => {
      if (!moved) return;
      moved = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const onWheel = (e) => {
      if (!wheelToX || el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? delta * 16 : delta;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('wheel', onWheel, { passive: false });
    cleanup.current = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
    };
  }, [axis, wheelToX]);
};
