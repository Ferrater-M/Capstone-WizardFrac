import { useEffect, useRef } from 'react';
import { skipAmbientFrame } from '../utils/stage';

// The animated galaxy behind the island selection screen (nebulae, drifting pixel clouds, twinkling stars,
// shooting stars), drawn on a full-screen canvas. Shared by the island selection screen, the login and the dashboard.
// pixelClouds: swap the few big clouds for lots of small blocky pixel clouds (the Title Page's style) in
// galaxy purple, drifting smoothly at different depths. Used by the login and the dashboard.
const PX = 6;   // one "pixel" of a pixel cloud, in screen px
const PIXEL_PUFFS = [
  { x: 0, y: 0, r: 7 }, { x: 7, y: -3, r: 5 }, { x: -7, y: -2, r: 5 },
  { x: 13, y: 1, r: 4 }, { x: -12, y: 1, r: 4 }, { x: 5, y: 3, r: 4 }, { x: -4, y: 3, r: 4 },
];
const PIXEL_TINT = { top: [96, 64, 160], body: [58, 32, 112], shadow: [18, 6, 46] };

const GalaxyBackground = ({ pixelClouds = false }) => {
  const canvasRef = useRef(null);
  const galaxyFrameRef = useRef(null);

  useEffect(() => {
    let animating = true;
    let resizeHandler = null;

    const tryStart = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        if (animating) galaxyFrameRef.current = requestAnimationFrame(tryStart);
        return;
      }

      const ctx = canvas.getContext('2d');

      resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resizeHandler();
      window.addEventListener('resize', resizeHandler);

      const stars = Array.from({ length: 180 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.008 + 0.003,
        twinkleDir: Math.random() < 0.5 ? 1 : -1,
        vx: (Math.random() - 0.5) * 0.00007,
        vy: (Math.random() - 0.5) * 0.00007,
        color: ['#ffffff', '#cce4ff', '#ffe8cc', '#e0ccff'][Math.floor(Math.random() * 4)],
      }));

      const dust = Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 3 + 2,
        alpha: Math.random() * 0.2 + 0.05,
        twinkleSpeed: Math.random() * 0.003 + 0.001,
        twinkleDir: Math.random() < 0.5 ? 1 : -1,
        color: ['rgba(180,140,255', 'rgba(140,180,255', 'rgba(255,180,220'][Math.floor(Math.random() * 3)],
      }));

      const NEBULAE = [
        { cx: 0.15, cy: 0.25, r: 0.22, c: [100, 60, 200] },
        { cx: 0.80, cy: 0.55, r: 0.18, c: [60, 100, 220] },
        { cx: 0.50, cy: 0.78, r: 0.15, c: [180, 60, 150] },
        { cx: 0.35, cy: 0.45, r: 0.12, c: [60, 160, 200] },
      ];

      const shootingStars = [];
      let nextShot = Date.now() + 800 + Math.random() * 1200;

      const CLOUD_PUFFS = [
        { x: 0,   y: 0,   r: 52 },
        { x: 48,  y: -18, r: 40 },
        { x: -46, y: -14, r: 36 },
        { x: 88,  y: 4,   r: 32 },
        { x: -80, y: 4,   r: 28 },
        { x: 38,  y: 14,  r: 26 },
        { x: -30, y: 14,  r: 24 },
      ];

      const drawCloud = (cx, cy, scale, alpha, color) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        CLOUD_PUFFS.forEach(p => {
          const size = p.r * scale * 2;
          ctx.rect(cx + p.x * scale - size / 2, cy + p.y * scale - size / 2, size, size);
        });
        ctx.fill();
        ctx.restore();
      };

      // Pixel clouds: far ones small, faint and slow; near ones bigger, brighter and faster
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const pixClouds = pixelClouds
        ? Array.from({ length: 44 }, () => {
            const depth = Math.random();
            return {
              x: Math.random() * 1.3 - 0.15,
              y: Math.random() * 0.95,
              scale: 0.5 + depth * 1.6,
              speed: (0.00011 + depth * 0.0004) * (reduceMotion ? 0 : 1),   // per 60 fps frame
              alpha: 0.3 + depth * 0.4,
              depth,
            };
          }).sort((a, b) => a.depth - b.depth)
        : [];
      const snap = (v) => Math.round(v / PX) * PX;
      const drawPixelCloud = (cx, cy, scale, alpha) => {
        // shadow underneath, body, then a lighter top edge: blocky shape, smooth glide
        [[PX, PIXEL_TINT.shadow, 1], [0, PIXEL_TINT.body, 1], [-PX, PIXEL_TINT.top, 0.55]].forEach(([dy, col, k]) => {
          ctx.fillStyle = `rgba(${col.join(',')}, ${alpha})`;
          PIXEL_PUFFS.forEach(pf => {
            const r = Math.max(1, Math.round(pf.r * scale * k)) * PX;
            ctx.fillRect(cx + snap(pf.x * scale * PX) - r, cy + snap(pf.y * scale * PX) - r + dy, r * 2, r * 2);
          });
        });
      };
      let lastT = 0;

      const clouds = pixelClouds ? [] : Array.from({ length: 6 }, (_, i) => ({
        x: Math.random(),
        y: 0.05 + Math.random() * 0.75,
        vx: (0.00006 + Math.random() * 0.00008) * (Math.random() < 0.65 ? 1 : -1),
        scale: 0.7 + Math.random() * 1.4,
        alpha: 0.18 + Math.random() * 0.18,
        color: i < 3 ? 'rgba(180,130,255,1)' : 'rgba(60,20,120,1)',
      }));

      const ambient = {};
      const draw = () => {
        // Phones: 30 frames a second (utils/stage.js); everything moves by elapsed time, so same speed
        if (skipAmbientFrame(ambient, performance.now())) {
          if (animating) galaxyFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const nowT = performance.now();
        const step = Math.min(3, (nowT - (lastT || nowT)) / (1000 / 60));   // same speed on any screen
        lastT = nowT;

        NEBULAE.forEach(n => {
          const gx = n.cx * w, gy = n.cy * h, gr = n.r * Math.max(w, h);
          const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
          grad.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.13)`);
          grad.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.fill();
        });

        pixClouds.forEach(c => {
          c.x += c.speed * step;
          if (c.x > 1.25) { c.x = -0.25; c.y = Math.random() * 0.95; }
          drawPixelCloud(c.x * w, c.y * h, c.scale, c.alpha);
        });

        clouds.forEach(cloud => {
          cloud.x += cloud.vx * step;
          if (cloud.x > 1.25) cloud.x = -0.25;
          if (cloud.x < -0.25) cloud.x = 1.25;
          drawCloud(cloud.x * w, cloud.y * h, cloud.scale, cloud.alpha, cloud.color);
        });

        dust.forEach(p => {
          p.alpha += p.twinkleSpeed * p.twinkleDir * step;
          if (p.alpha > 0.28) { p.alpha = 0.28; p.twinkleDir = -1; }
          if (p.alpha < 0.02) { p.alpha = 0.02; p.twinkleDir = 1; }
          const px = p.x * w, py = p.y * h;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3);
          grad.addColorStop(0, `${p.color},${p.alpha})`);
          grad.addColorStop(1, `${p.color},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        });

        stars.forEach(p => {
          p.alpha += p.twinkleSpeed * p.twinkleDir * step;
          if (p.alpha > 1)   { p.alpha = 1;   p.twinkleDir = -1; }
          if (p.alpha < 0.2) { p.alpha = 0.2; p.twinkleDir = 1; }
          p.x = (p.x + p.vx * step + 1) % 1;
          p.y = (p.y + p.vy * step + 1) % 1;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
          ctx.fill();
          if (p.r > 1.2) {
            ctx.globalAlpha = p.alpha * 0.35;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, p.r * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        const now = Date.now();
        if (now >= nextShot) {
          const count = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
          for (let s = 0; s < count; s++) {
            const angle = (25 + Math.random() * 35) * Math.PI / 180;
            const speed = 0.007 + Math.random() * 0.005;
            shootingStars.push({
              x: Math.random() * 0.65,
              y: Math.random() * 0.4,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              tail: [],
              tailLen: 28 + Math.floor(Math.random() * 18),
            });
          }
          nextShot = now + 800 + Math.random() * 1800;
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const s = shootingStars[i];
          s.tail.unshift({ x: s.x, y: s.y });
          while (s.tail.length > Math.max(2, Math.round(s.tailLen / step))) s.tail.pop();   // same tail length at 30 fps
          s.x += s.vx * step;
          s.y += s.vy * step;
          s.alpha -= 0.013 * step;
          if (s.x > 1.1 || s.y > 1.1 || s.alpha <= 0) {
            shootingStars.splice(i, 1);
            continue;
          }
          if (s.tail.length > 1) {
            const last = s.tail[s.tail.length - 1];
            const tg = ctx.createLinearGradient(s.x * w, s.y * h, last.x * w, last.y * h);
            tg.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
            tg.addColorStop(1, 'rgba(200,220,255,0)');
            ctx.save();
            ctx.strokeStyle = tg;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            s.tail.forEach(tp => ctx.lineTo(tp.x * w, tp.y * h));
            ctx.stroke();
            ctx.restore();
          }
          ctx.save();
          ctx.globalAlpha = s.alpha;
          const hg = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, 5);
          hg.addColorStop(0, 'rgba(255,255,255,1)');
          hg.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (animating) galaxyFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    tryStart();

    return () => {
      animating = false;
      cancelAnimationFrame(galaxyFrameRef.current);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    };
  }, [pixelClouds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
    />
  );
};

export default GalaxyBackground;
