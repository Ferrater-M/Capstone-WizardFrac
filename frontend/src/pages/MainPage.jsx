import React, { useEffect, useRef, useState } from 'react';
import './MainPage.css';

const ABOUT_SECTIONS = [
  {
    icon: '/PlayerAssets/hat.png',
    title: 'What is WizardFrac?',
    body: 'WizardFrac is an exciting educational adventure that helps Grade 4 students learn and master fractions through fun games, magical challenges, and rewarding quests!',
  },
  {
    icon: '/PlayerAssets/Book.png',
    title: 'Our Mission',
    body: 'We make learning fractions engaging and enjoyable by combining education with adventure, helping students build confidence and achieve mastery step by step.',
  },
];

const WHY_WIZARDFRAC = [
  'Aligned with the MATATAG Curriculum',
  'Game-based learning that keeps students motivated',
  'Tracks progress and celebrates achievements',
  'Safe, fun, and student-friendly environment',
];

// The four island magic circles stay fixed at the screen sides (x/y are
// fractions of the screen), spinning steadily in place while randomly
// generated pixel fractions float up past them
const PINNED_CIRCLES = [
  { src: '/InteractableUI/MixedMagicCircle.png',        x: 0.10, y: 0.30, spin:  0.45 }, // triangle, left
  { src: '/InteractableUI/DissimilarMagicCircle.png',   x: 0.10, y: 0.73, spin: -0.35 }, // butterfly, left
  { src: '/InteractableUI/SimilarMagicCircleMixed.png', x: 0.90, y: 0.28, spin: -0.40 }, // two rings, right
  { src: '/InteractableUI/SimilarMagicCircle.png',      x: 0.90, y: 0.73, spin:  0.50 }, // plain ring, right
];

const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// Mostly proper fractions, with the occasional improper one
function randomFraction() {
  const d = randInt(2, 12);
  const n = Math.random() < 0.8 ? randInt(1, d - 1) : randInt(d + 1, d * 2);
  return { n: String(n), d: String(d) };
}

// Midpoint displacement: every pass splits each segment and kicks the new
// point sideways, so the arc is jagged at every scale instead of a neat zigzag
function jaggedPath(x1, y1, x2, y2, roughness) {
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
}

function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

// Pure white arc: wide soft halo, then a hard bright core
function drawWhiteArc(ctx, pts, width, alpha) {
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
}

function getTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12)  return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

const GREETINGS = {
  morning:   'Good Morning, Wizard!',
  afternoon: 'Good Afternoon, Wizard!',
  evening:   'Good Evening, Wizard!',
};

const MainPage = ({ onStart }) => {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const flashRef  = useRef(null);
  const fxCanvasRef = useRef(null);
  const contentRef  = useRef(null);
  const [showAbout, setShowAbout] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());

  // Re-check the clock every minute so morning/afternoon/evening — and the
  // greeting — flip on their own through the day without a page reload.
  useEffect(() => {
    const id = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const isEvening   = timeOfDay === 'evening';
    const isMorning   = timeOfDay === 'morning';
    const isAfternoon = timeOfDay === 'afternoon';

    // Stars only belong to the night sky
    const stars = isEvening
      ? Array.from({ length: 90 }, () => ({
          x: Math.random(), y: Math.random(),
          r: Math.random() * 1.1 + 0.2,
          alpha: Math.random() * 0.25 + 0.05,
          twinkleSpeed: Math.random() * 0.005 + 0.002,
          twinkleDir: Math.random() < 0.5 ? 1 : -1,
          vx: (Math.random() - 0.5) * 0.00005,
          vy: (Math.random() - 0.5) * 0.00005,
          color: ['#aac4ff', '#c4b0ff', '#ffffff'][Math.floor(Math.random() * 3)],
        }))
      : [];

    // Cloud tint: dark storm clouds at night, dull grey for a gloomy
    // morning, soft bright white for a sunny afternoon
    const cloudColors = isEvening
      ? ['rgba(14, 6, 35, 0.97)',     'rgba(10, 4, 26, 0.86)',    'rgba(4, 2, 12, 0)']
      : isMorning
      ? ['rgba(146, 156, 173, 0.88)', 'rgba(126, 137, 156, 0.66)','rgba(120, 130, 150, 0)']
      : ['rgba(255, 255, 255, 0.92)', 'rgba(255, 255, 255, 0.62)','rgba(255, 255, 255, 0)'];

    // A full gloomy layer covers the sky in the morning and the night
    // storm; the sunny afternoon only gets a couple of light drifters
    const cloudDefs = isAfternoon
      ? [
          { x: -0.05, y: 0.10, scale: 300, speed: 0.000018, alpha: 0.50 },
          { x:  0.55, y: 0.05, scale: 260, speed: 0.000014, alpha: 0.40 },
        ]
      : [
          { x: -0.05, y: 0.09, scale: 330, speed: 0.000022, alpha: isMorning ? 0.80 : 0.94 },
          { x:  0.32, y: 0.04, scale: 410, speed: 0.000016, alpha: isMorning ? 0.82 : 0.96 },
          { x:  0.68, y: 0.12, scale: 370, speed: 0.000028, alpha: isMorning ? 0.76 : 0.90 },
          { x:  1.05, y: 0.06, scale: 350, speed: 0.000020, alpha: isMorning ? 0.78 : 0.92 },
        ];
    const clouds = cloudDefs.map(c => ({ ...c }));

    function drawCloud(cx, cy, scale) {
      const puffs = [
        [0,              0,              1.0],
        [scale * 0.55,  -scale * 0.28,  0.82],
        [scale * 1.15,  -scale * 0.05,  0.92],
        [scale * 1.76,  -scale * 0.22,  0.78],
        [scale * 2.28,   scale * 0.03,  0.85],
        [-scale * 0.50,  scale * 0.04,  0.72],
        [scale * 0.90,   scale * 0.18,  1.05],
        [scale * 1.48,   scale * 0.13,  0.80],
      ];
      puffs.forEach(([dx, dy, sr]) => {
        const px = cx + dx, py = cy + dy, r = scale * sr * 0.62;
        const g = ctx.createRadialGradient(px, py - r * 0.15, 0, px, py, r);
        g.addColorStop(0,   cloudColors[0]);
        g.addColorStop(0.6, cloudColors[1]);
        g.addColorStop(1,   cloudColors[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Rain and lightning are night-storm-only — mornings and afternoons stay dry
    const rain = isEvening
      ? Array.from({ length: 220 }, () => ({
          x: Math.random(), y: Math.random(),
          speed: 0.011 + Math.random() * 0.009,
          len:   0.018 + Math.random() * 0.020,
          alpha: 0.10 + Math.random() * 0.22,
        }))
      : [];

    const lt = {
      queue: [],
      nextAt: Date.now() + 1800 + Math.random() * 3500,
      glowX: 0, glowY: 0, glowA: 0,
    };

    // A soft low sun for a gloomy morning, a bright high sun in the
    // afternoon; there is none once evening falls
    const sun = isMorning
      ? { x: 0.22, y: 0.24, r: 58 }
      : { x: 0.74, y: 0.16, r: 88 };

    function drawSun(w, h) {
      const sx = sun.x * w, sy = sun.y * h;
      const glowR = sun.r * (isMorning ? 3.0 : 4.4);
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      if (isMorning) {
        g.addColorStop(0,    'rgba(255, 244, 214, 0.85)');
        g.addColorStop(0.35, 'rgba(255, 224, 168, 0.40)');
        g.addColorStop(1,    'rgba(255, 224, 168, 0)');
      } else {
        g.addColorStop(0,    'rgba(255, 252, 224, 1)');
        g.addColorStop(0.35, 'rgba(255, 214, 120, 0.55)');
        g.addColorStop(1,    'rgba(255, 214, 120, 0)');
      }
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = isMorning ? 'rgba(255, 244, 214, 0.8)' : '#fff8dd';
      ctx.beginPath();
      ctx.arc(sx, sy, sun.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Sky: dark storm at night, pale grey-blue gloom in the morning,
      // bright blue in the afternoon
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      if (isEvening) {
        bg.addColorStop(0,    '#06041a');
        bg.addColorStop(0.45, '#0b0720');
        bg.addColorStop(1,    '#10082a');
      } else if (isMorning) {
        bg.addColorStop(0,    '#8fa5bf');
        bg.addColorStop(0.5,  '#c2d1de');
        bg.addColorStop(1,    '#e9edf1');
      } else {
        bg.addColorStop(0,    '#3f97e0');
        bg.addColorStop(0.55, '#7cc3ef');
        bg.addColorStop(1,    '#cdeaf9');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      if (!isEvening) drawSun(w, h);

      // Storm glow from last lightning origin
      if (isEvening && lt.glowA > 0) {
        const gg = ctx.createRadialGradient(lt.glowX, lt.glowY, 0, lt.glowX, lt.glowY, w * 0.55);
        gg.addColorStop(0, `rgba(100, 150, 255, ${lt.glowA * 0.22})`);
        gg.addColorStop(1, 'rgba(50, 80, 200, 0)');
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, w, h);
        lt.glowA = Math.max(0, lt.glowA - 0.007);
      }

      // Stars (evening only, below cloud layer)
      stars.forEach(p => {
        p.alpha += p.twinkleSpeed * p.twinkleDir;
        if (p.alpha > 0.35)  { p.alpha = 0.35; p.twinkleDir = -1; }
        if (p.alpha < 0.04)  { p.alpha = 0.04; p.twinkleDir =  1; }
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        if (p.y < 0.30) return;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Rain (diagonal, top-right → bottom-left slant) — evening storm only
      if (isEvening) {
        const SLANT = 0.30;
        rain.forEach(r => {
          r.y += r.speed;
          r.x += r.speed * SLANT;
          if (r.y > 1.05) { r.y = -r.len - 0.02; r.x = Math.random(); }
          if (r.x > 1.08) { r.x = Math.random() - 0.1; }
          ctx.save();
          ctx.globalAlpha = r.alpha;
          ctx.strokeStyle = '#8aaedd';
          ctx.lineWidth = 0.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(r.x * w, r.y * h);
          ctx.lineTo((r.x + r.len * SLANT) * w, (r.y + r.len) * h);
          ctx.stroke();
          ctx.restore();
        });
      }

      // Clouds
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > 1.35) c.x = -0.55;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        drawCloud(c.x * w, c.y * h, c.scale);
        ctx.restore();
      });

      // Lightning — evening storm only
      if (isEvening) {
        const now = Date.now();
        if (now >= lt.nextAt) {
          const sx = (0.15 + Math.random() * 0.70) * w;
          const sy = (0.06 + Math.random() * 0.12) * h;
          const ex = sx + (Math.random() - 0.5) * w * 0.28;
          const ey = (0.42 + Math.random() * 0.38) * h;

          const main   = jaggedPath(sx, sy, ex, ey, 0.2);
          const mid    = main[Math.floor(main.length / 2)];
          const branch = Math.random() < 0.70
            ? jaggedPath(mid.x, mid.y, mid.x + (Math.random() - 0.5) * w * 0.22, mid.y + Math.random() * h * 0.22, 0.25)
            : null;

          const dur = 110 + Math.random() * 100;
          lt.queue.push({ main, branch, startTime: now, endTime: now + dur });

          // Second flicker
          if (Math.random() < 0.55) {
            const d2 = dur + 90 + Math.random() * 60;
            lt.queue.push({ main, branch, startTime: now + d2, endTime: now + d2 + dur * 0.65 });
          }

          // Screen flash
          if (flashRef.current) {
            flashRef.current.classList.add('active');
            setTimeout(() => flashRef.current?.classList.remove('active'), 90);
          }

          lt.glowX = sx;
          lt.glowY = sy;
          lt.glowA = 1;
          lt.nextAt = now + 3800 + Math.random() * 7500;
        }

        // Draw active bolts
        lt.queue = lt.queue.filter(b => now < b.endTime);
        lt.queue.forEach(b => {
          if (now < b.startTime) return;
          const alpha = Math.max(0, 1 - (now - b.startTime) / (b.endTime - b.startTime));
          drawWhiteArc(ctx, b.main, 3, alpha);
          if (b.branch) drawWhiteArc(ctx, b.branch, 1.6, alpha * 0.7);
        });
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [timeOfDay]);

  // Fixed spinning magic circles + floating pixel fractions that shine and
  // chain white lightning between each other. Lives on its own canvas so it
  // keeps running untouched when the sky swaps at a time-of-day change.
  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const motion = reduceMotion ? 0.3 : 1;

    const circles = PINNED_CIRCLES.map(c => {
      const img = new Image();
      img.src = c.src;
      return {
        kind: 'circle',
        img,
        spot: c,
        x: 0, y: 0, size: 0,
        angle: rand(0, Math.PI * 2),
        phase: rand(0, Math.PI * 2),
        pulseSpeed: rand(1.4, 2.6),
        flash: 0,
        alpha: 0,
      };
    });
    // Canvas text can't trigger a webfont download itself
    document.fonts?.load('16px "Press Start 2P"');

    let w = 0, h = 0;
    // The title/tagline/button block. Floaters only dim while passing
    // behind it, so they show evenly across the rest of the screen.
    let textBox = null;
    let nextMeasureAt = 0;
    const measureText = () => {
      textBox = contentRef.current?.getBoundingClientRect() ?? null;
    };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureText();
      const size = Math.min(170, Math.max(80, Math.min(w, h) * 0.22));
      circles.forEach(c => {
        c.x = c.spot.x * w;
        c.y = c.spot.y * h;
        c.size = size;
      });
    };
    resize();
    window.addEventListener('resize', resize);

    // Re-rolls a floating fraction, so each trip up the screen shows
    // a brand-new one
    const reroll = f => {
      f.frac      = randomFraction();
      f.size      = rand(15, 24);
      f.vy        = -rand(14, 34) * motion;
      f.driftAmp  = rand(8, 26);
      f.driftFreq = rand(0.15, 0.4);
    };

    const count = Math.round(Math.min(14, Math.max(8, (w * h) / 90000)));
    const floaters = Array.from({ length: count }, () => {
      const f = {
        kind: 'fraction',
        x: rand(0.04, 0.96) * w,
        y: rand(0, 1) * h,
        angle: rand(-0.7, 0.7),
        targetAngle: 0,
        nextSpinAt: 0,
        phase: rand(0, Math.PI * 2),
        pulseSpeed: rand(1.4, 2.6),
        flash: 0,
        alpha: 0,
        t0: rand(0, 100),
      };
      reroll(f);
      return f;
    });

    let links = [];
    let nextChainAt = performance.now() + 900;

    // One strike hops to the nearest circle or fraction it hasn't hit yet,
    // again and again, each hop landing a beat after the last. Most strikes
    // fire out of a magic circle.
    const startChain = now => {
      const live = [...circles, ...floaters].filter(f => f.alpha > 0.4);
      if (live.length < 2) return;
      const liveCircles = live.filter(f => f.kind === 'circle');
      let cur = liveCircles.length && Math.random() < 0.7
        ? liveCircles[randInt(0, liveCircles.length - 1)]
        : live[randInt(0, live.length - 1)];
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
          // Struck circles flare white-hot, then cool back down
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
        // Dark blocky outline first so white digits still read on the
        // bright morning/afternoon sky
        ctx.lineJoin = 'miter';
        ctx.lineWidth = Math.max(3, fs / 4);
        ctx.strokeStyle = 'rgba(24, 14, 56, 0.85)';
        ctx.strokeText(f.frac.n, 0, -fs * 0.95);
        ctx.strokeText(f.frac.d, 0,  fs * 0.95);
        ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f.frac.n, 0, -fs * 0.95);
        ctx.fillText(f.frac.d, 0,  fs * 0.95);
        ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
      }
      ctx.restore();
    };

    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // Re-measure now and then, since webfonts landing can resize the title
      if (now >= nextMeasureAt) {
        measureText();
        nextMeasureAt = now + 1000;
      }

      // Dim a little while directly behind the title text so it keeps
      // reading cleanly
      const behindText = f => {
        if (!textBox) return 1;
        const SOFT = 40;
        const dx = Math.max(textBox.left - f.x, 0, f.x - textBox.right);
        const dy = Math.max(textBox.top - f.y, 0, f.y - textBox.bottom);
        return 1 - (1 - Math.min(1, Math.hypot(dx, dy) / SOFT)) * 0.4;
      };

      floaters.forEach(f => {
        f.y += f.vy * dt;
        f.x += Math.cos((now / 1000 + f.t0) * f.driftFreq) * f.driftAmp * dt;
        const pad = f.size * 3;
        if (f.y < -pad) {
          f.y = h + pad;
          f.x = rand(0.04, 0.96) * w;
          reroll(f);
        }

        // Fractions only tilt to a new random lean, since upside down
        // 6/8 would read as 8/9
        if (now >= f.nextSpinAt) {
          f.targetAngle = rand(-0.7, 0.7);
          f.nextSpinAt = now + rand(1500, 4000);
        }
        f.angle += (f.targetAngle - f.angle) * Math.min(1, dt * 1.2 * motion);

        f.flash = Math.max(0, f.flash - dt * 2.2);

        // Fade in at the bottom and out at the top
        const edge = Math.max(0, Math.min(1, Math.min(f.y + pad, h + pad - f.y) / 140));
        f.alpha = 0.95 * edge * behindText(f);
      });

      // Fixed circles never move, only spin at their own steady speed
      circles.forEach(c => {
        c.angle += c.spot.spin * motion * dt;
        c.flash = Math.max(0, c.flash - dt * 2.2);
        c.alpha = behindText(c);
      });

      floaters.forEach(f => drawFloater(f, now));
      circles.forEach(c => drawFloater(c, now));

      if (!reduceMotion) {
        if (now >= nextChainAt) {
          startChain(now);
          nextChainAt = now + rand(1100, 2600);
        }

        links = links.filter(l => now < l.end);
        links.forEach(l => {
          if (now < l.start) return;
          if (!l.struck) {
            l.struck = true;
            l.a.flash = 1;
            l.b.flash = 1;
          }
          // Re-roll the whole shape every few frames so it crackles
          // instead of sitting still
          if (now >= l.nextJitter) {
            l.pts = jaggedPath(l.a.x, l.a.y, l.b.x, l.b.y, 0.22);
            l.forks = [];
            const forkCount = randInt(1, 3);
            const len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);
            for (let i = 0; i < forkCount; i++) {
              const p = l.pts[randInt(4, l.pts.length - 5)];
              const ang = Math.atan2(l.b.y - l.a.y, l.b.x - l.a.x) + rand(-1.1, 1.1);
              const fl = len * rand(0.15, 0.35);
              l.forks.push(jaggedPath(p.x, p.y, p.x + Math.cos(ang) * fl, p.y + Math.sin(ang) * fl, 0.3));
            }
            l.nextJitter = now + rand(35, 70);
          }
          const life = (now - l.start) / (l.end - l.start);
          // Flicker: random brightness dips on top of the fade out
          const alpha = (1 - life) * (Math.random() < 0.18 ? 0.35 : 1);
          drawWhiteArc(ctx, l.pts, 2.6, alpha);
          l.forks.forEach(fk => drawWhiteArc(ctx, fk, 1.3, alpha * 0.75));
        });
      }

      fxFrame = requestAnimationFrame(tick);
    };
    let fxFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(fxFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={`main-page time-${timeOfDay}`}>
      <canvas ref={canvasRef} className="main-canvas" />
      <div className="main-scrim" aria-hidden="true" />
      <canvas ref={fxCanvasRef} className="main-fx-canvas" aria-hidden="true" />
      <div ref={flashRef} className="lightning-overlay" />

      <button className="main-about-btn" onClick={() => setShowAbout(true)}>
        <span className="main-about-icon">ⓘ</span> About
      </button>

      <div className="main-content" ref={contentRef}>
        <div className="main-title-group">
          <div className="main-title-wrap">
            <h1 className="main-title">WIZARDFRAC</h1>
            <div className="main-greeting">{GREETINGS[timeOfDay]}</div>
          </div>
          <p className="main-tagline">Master your fractions skills</p>
        </div>

        <button className="main-start-btn" onClick={onStart}>
          Start your Journey
        </button>
      </div>

      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <span className="about-corner top-left"></span>
            <span className="about-corner top-right"></span>
            <span className="about-corner bottom-left"></span>
            <span className="about-corner bottom-right"></span>

            <button className="about-close" onClick={() => setShowAbout(false)} aria-label="Close">✕</button>

            <div className="about-banner">
              <span className="about-banner-star">★</span>
              <span className="about-banner-about">ABOUT</span>{' '}
              <span className="about-banner-name">WIZARDFRAC</span>
              <span className="about-banner-star">★</span>
            </div>

            <p className="about-subtitle">A magical journey to master fractions!</p>

            <div className="about-separator">
              <span className="about-sep-line"></span>
              <span className="about-sep-diamond"></span>
              <span className="about-sep-line"></span>
            </div>

            <div className="about-body">
              <div className="about-scroll">
              <div className="about-text-col">
                <div className="about-sections">
                  {ABOUT_SECTIONS.map(sec => (
                    <div className="about-section" key={sec.title}>
                      <div className="about-icon-circle about-icon-circle--img">
                        <div className="about-icon-img" style={{ backgroundImage: `url(${sec.icon})` }} role="img" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="about-section-title">{sec.title}</h3>
                        <p className="about-section-text">{sec.body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="about-section">
                    <div className="about-icon-circle about-icon-circle--img">
                      <div className="about-icon-img" style={{ backgroundImage: 'url(/PlayerAssets/trophy.png)' }} role="img" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="about-section-title">Why WizardFrac?</h3>
                      <ul className="about-why-list">
                        {WHY_WIZARDFRAC.map(item => (
                          <li key={item}><span className="about-why-star">★</span>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="about-quote">
                  <span className="about-quote-mark">&ldquo;</span>
                  Every fraction you solve brings you closer to becoming a fraction master!
                  <span className="about-quote-star">★</span>
                </div>
              </div>
              </div>

              <div className="about-image-col">
                <img className="about-group-img" src="/Group.png" alt="Young wizard, dragon companion, and fellow adventurers" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
