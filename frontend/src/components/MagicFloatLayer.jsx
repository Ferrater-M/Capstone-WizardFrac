import { useEffect, useRef } from 'react';

// Background layer from the title page (MainPage.jsx): the four island magic circles spin in place at the
// screen sides while random pixel fractions float upward, with white lightning chaining between them.
// Drawn dimmer here (opacity) because it sits behind the dashboard's cards and text.
const PINNED_CIRCLES = [
  { src: '/InteractableUI/MixedMagicCircle.png',        x: 0.07, y: 0.30, spin:  0.45 },
  { src: '/InteractableUI/DissimilarMagicCircle.png',   x: 0.07, y: 0.78, spin: -0.35 },
  { src: '/InteractableUI/SimilarMagicCircleMixed.png', x: 0.93, y: 0.30, spin: -0.40 },
  { src: '/InteractableUI/SimilarMagicCircle.png',      x: 0.93, y: 0.78, spin:  0.50 },
];

const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// Mostly proper fractions, with the occasional improper one
const randomFraction = () => {
  const d = randInt(2, 12);
  const n = Math.random() < 0.8 ? randInt(1, d - 1) : randInt(d + 1, d * 2);
  return { n: String(n), d: String(d) };
};

// Midpoint displacement, so the lightning is jagged at every scale
const jaggedPath = (x1, y1, x2, y2, roughness) => {
  let pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  let offset = Math.hypot(x2 - x1, y2 - y1) * roughness;
  for (let pass = 0; pass < 5; pass++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = (Math.random() - 0.5) * 2 * offset;
      next.push({ x: (a.x + b.x) / 2 - (dy / len) * k, y: (a.y + b.y) / 2 + (dx / len) * k }, b);
    }
    pts = next;
    offset *= 0.5;
  }
  return pts;
};

const strokePath = (ctx, pts) => {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
};

const drawWhiteArc = (ctx, pts, width, alpha) => {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
  ctx.lineWidth = width * 4;
  strokePath(ctx, pts);
  ctx.shadowBlur = 10;
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = width;
  strokePath(ctx, pts);
  ctx.restore();
};

const MagicFloatLayer = ({ opacity = 0.55 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const motion = reduceMotion ? 0.3 : 1;

    const circles = PINNED_CIRCLES.map(c => {
      const img = new Image();
      img.src = c.src;
      return { kind: 'circle', img, spot: c, x: 0, y: 0, size: 0, angle: rand(0, Math.PI * 2), phase: rand(0, Math.PI * 2), pulseSpeed: rand(1.4, 2.6), flash: 0, alpha: 1 };
    });
    // Canvas text can't trigger a webfont download itself
    document.fonts?.load('16px "Press Start 2P"');

    let w = 0, h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = Math.min(170, Math.max(80, Math.min(w, h) * 0.22));
      circles.forEach(c => { c.x = c.spot.x * w; c.y = c.spot.y * h; c.size = size; });
    };
    resize();
    window.addEventListener('resize', resize);

    // Re-rolls a floating fraction, so each trip up the screen shows a new one
    const reroll = f => {
      f.frac = randomFraction();
      f.size = rand(15, 24);
      f.vy = -rand(14, 34) * motion;
      f.driftAmp = rand(8, 26);
      f.driftFreq = rand(0.15, 0.4);
    };

    const count = Math.round(Math.min(14, Math.max(8, (w * h) / 90000)));
    const floaters = Array.from({ length: count }, () => {
      const f = { kind: 'fraction', x: rand(0.04, 0.96) * w, y: rand(0, 1) * h, angle: rand(-0.7, 0.7), targetAngle: 0, nextSpinAt: 0, phase: rand(0, Math.PI * 2), pulseSpeed: rand(1.4, 2.6), flash: 0, alpha: 0, t0: rand(0, 100) };
      reroll(f);
      return f;
    });

    let links = [];
    let nextChainAt = performance.now() + 900;

    // One strike hops to the nearest circle or fraction it hasn't hit yet; most start at a magic circle.
    const startChain = now => {
      const live = [...circles, ...floaters].filter(f => f.alpha > 0.4);
      if (live.length < 2) return;
      const liveCircles = live.filter(f => f.kind === 'circle');
      let cur = liveCircles.length && Math.random() < 0.7 ? liveCircles[randInt(0, liveCircles.length - 1)] : live[randInt(0, live.length - 1)];
      const visited = new Set([cur]);
      const maxDist = Math.max(260, Math.min(w, h) * 0.5);
      const hops = randInt(2, 5);
      for (let i = 0; i < hops; i++) {
        let best = null, bestD = Infinity;
        live.forEach(f => {
          if (visited.has(f)) return;
          const d = Math.hypot(f.x - cur.x, f.y - cur.y);
          if (d < bestD) { bestD = d; best = f; }
        });
        if (!best || bestD > maxDist) break;
        const start = now + i * 90;
        links.push({ a: cur, b: best, start, end: start + rand(300, 440), pts: null, forks: [], nextJitter: 0, struck: false });
        visited.add(best);
        cur = best;
      }
    };

    const drawFloater = (f, now) => {
      if (f.alpha <= 0.01) return;
      const pulse = 0.5 + 0.5 * Math.sin(now / 1000 * f.pulseSpeed + f.phase);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.globalAlpha = f.alpha;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 6 + pulse * 16 + f.flash * 40;
      if (f.kind === 'circle') {
        const img = f.img;
        if (img.complete && img.naturalWidth) {
          const s = f.size / Math.max(img.naturalWidth, img.naturalHeight);
          const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          if (f.flash > 0.02) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = f.alpha * f.flash * 0.85;
            ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          }
        }
      } else {
        const fs = f.size;
        ctx.font = `${fs}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const barW = Math.max(ctx.measureText(f.frac.n).width, ctx.measureText(f.frac.d).width) + fs * 0.5;
        const barH = Math.max(2, Math.round(fs / 5));
        ctx.lineJoin = 'miter';
        ctx.lineWidth = Math.max(3, fs / 4);
        ctx.strokeStyle = 'rgba(24, 14, 56, 0.85)';
        ctx.strokeText(f.frac.n, 0, -fs * 0.95);
        ctx.strokeText(f.frac.d, 0, fs * 0.95);
        ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f.frac.n, 0, -fs * 0.95);
        ctx.fillText(f.frac.d, 0, fs * 0.95);
        ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
      }
      ctx.restore();
    };

    let last = performance.now();
    let frame = 0;
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      floaters.forEach(f => {
        f.y += f.vy * dt;
        f.x += Math.cos((now / 1000 + f.t0) * f.driftFreq) * f.driftAmp * dt;
        const pad = f.size * 3;
        if (f.y < -pad) { f.y = h + pad; f.x = rand(0.04, 0.96) * w; reroll(f); }
        // Only tilt to a new lean — upside down 6/8 would read as 8/9
        if (now >= f.nextSpinAt) { f.targetAngle = rand(-0.7, 0.7); f.nextSpinAt = now + rand(1500, 4000); }
        f.angle += (f.targetAngle - f.angle) * Math.min(1, dt * 1.2 * motion);
        f.flash = Math.max(0, f.flash - dt * 2.2);
        // Fade in at the bottom and out at the top
        f.alpha = 0.95 * Math.max(0, Math.min(1, Math.min(f.y + pad, h + pad - f.y) / 140));
      });
      circles.forEach(c => {
        c.angle += c.spot.spin * motion * dt;
        c.flash = Math.max(0, c.flash - dt * 2.2);
      });

      floaters.forEach(f => drawFloater(f, now));
      circles.forEach(c => drawFloater(c, now));

      if (!reduceMotion) {
        if (now >= nextChainAt) { startChain(now); nextChainAt = now + rand(1100, 2600); }
        links = links.filter(l => now < l.end);
        links.forEach(l => {
          if (now < l.start) return;
          if (!l.struck) { l.struck = true; l.a.flash = 1; l.b.flash = 1; }
          if (now >= l.nextJitter) {
            l.pts = jaggedPath(l.a.x, l.a.y, l.b.x, l.b.y, 0.22);
            l.forks = [];
            const len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);
            for (let i = 0, n = randInt(1, 3); i < n; i++) {
              const p = l.pts[randInt(4, l.pts.length - 5)];
              const ang = Math.atan2(l.b.y - l.a.y, l.b.x - l.a.x) + rand(-1.1, 1.1);
              const fl = len * rand(0.15, 0.35);
              l.forks.push(jaggedPath(p.x, p.y, p.x + Math.cos(ang) * fl, p.y + Math.sin(ang) * fl, 0.3));
            }
            l.nextJitter = now + rand(35, 70);
          }
          const life = (now - l.start) / (l.end - l.start);
          const alpha = (1 - life) * (Math.random() < 0.18 ? 0.35 : 1);
          drawWhiteArc(ctx, l.pts, 2.6, alpha);
          l.forks.forEach(fk => drawWhiteArc(ctx, fk, 1.3, alpha * 0.75));
        });
      }

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
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', opacity }}
    />
  );
};

export default MagicFloatLayer;
