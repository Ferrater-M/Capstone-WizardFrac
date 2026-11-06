import React, { useEffect, useRef } from 'react';

// Every blue sparkle (OtherEffects/BlueSparkle.png) that travels across the screen — the island
// selection's star, the numbers flying to their places in battle, the gem game's shards — leaves a
// trail in the sparkle's own blues. Mounted once (App): it watches the sparkle images wherever they are,
// so no animation needs to know about it. Sparkles that only spin in place leave no trail.
const CORE = [196, 224, 252];   // the sparkle's pale sky blue
const EDGE = [104, 136, 216];   // its deeper blue edge
const LIFE_MS = 480;            // how long a trail piece lasts
const STEP_PX = 5;              // spacing between trail pieces along the path
const MIN_MOVE = 1.5;           // px per frame before it counts as moving (spinning wobble stays below this)

const isShown = (el) => {
  if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  return el.getClientRects().length > 0;
};

const SparkleTrails = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = canvas.getContext('2d');
    const last = new WeakMap();   // sparkle element → its centre last frame
    let pieces = [];
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (now) => {
      // 1. Follow every visible sparkle and drop trail pieces along the way it moved
      document.querySelectorAll('img[src*="BlueSparkle"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !isShown(el)) { last.delete(el); return; }
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        // A spinning square's box grows and shrinks; use the smaller side as its real size
        const size = Math.min(r.width, r.height);
        const prev = last.get(el);
        last.set(el, { x: cx, y: cy });
        if (!prev) return;
        const dist = Math.hypot(cx - prev.x, cy - prev.y);
        if (dist < MIN_MOVE || dist > 400) return;   // standing still, or a jump (not a motion)
        const n = Math.max(1, Math.round(dist / STEP_PX));
        const pieceSize = Math.max(4, Math.min(16, size * 0.28));
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          pieces.push({
            x: prev.x + (cx - prev.x) * t + (Math.random() - 0.5) * pieceSize * 0.5,
            y: prev.y + (cy - prev.y) * t + (Math.random() - 0.5) * pieceSize * 0.5,
            size: pieceSize * (0.7 + Math.random() * 0.5),
            born: now - (1 - t) * 16,          // older at the tail end of this frame's segment
          });
        }
      });

      // 2. Draw: each piece is a pixel square that shrinks and fades from pale blue to deep blue
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces = pieces.filter(p => now - p.born < LIFE_MS);
      for (const p of pieces) {
        const k = (now - p.born) / LIFE_MS;          // 0 new → 1 gone
        const c = CORE.map((v, i) => Math.round(v + (EDGE[i] - v) * k));
        const s = Math.max(1, Math.round(p.size * (1 - k * 0.7)));
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.fillStyle = `rgb(${c.join(',')})`;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 9990,                 // just under the flying sparkles themselves (up to 9999)
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 4px rgba(150, 190, 255, 0.8))',
      }}
    />
  );
};

export default SparkleTrails;
