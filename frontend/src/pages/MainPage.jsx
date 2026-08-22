import React, { useEffect, useRef, useState } from 'react';
import './MainPage.css';

const FEATURES = [
  { icon: '🛡️', label: 'PLAY', desc: 'Fun & Engaging' },
  { icon: '📖', label: 'LEARN', desc: 'Step by Step' },
  { icon: '🏆', label: 'MASTER', desc: 'Become a Champion' },
];

const ABOUT_SECTIONS = [
  {
    icon: '🧙',
    title: 'What is WizardFrac?',
    body: 'WizardFrac is an exciting educational adventure that helps Grade 4 students learn and master fractions through fun games, magical challenges, and rewarding quests!',
  },
  {
    icon: '📖',
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

const FRAC_BUBBLES = [
  { id: 1,  left: '4%',  delay: '0s',    dur: '13s', n1: '1', d1: '2', op: '+', n2: '1', d2: '4' },
  { id: 2,  left: '15%', delay: '4s',    dur: '10s', n1: '3', d1: '5', op: '−', n2: '1', d2: '5' },
  { id: 3,  left: '28%', delay: '7.5s',  dur: '15s', n1: '2', d1: '3', op: '+', n2: '1', d2: '6' },
  { id: 4,  left: '43%', delay: '2s',    dur: '11s', n1: '5', d1: '8', op: '−', n2: '3', d2: '8' },
  { id: 5,  left: '57%', delay: '9s',    dur: '12s', n1: '1', d1: '3', op: '+', n2: '1', d2: '2' },
  { id: 6,  left: '70%', delay: '5s',    dur: '14s', n1: '7', d1: '8', op: '−', n2: '1', d2: '4' },
  { id: 7,  left: '82%', delay: '1.5s',  dur: '16s', n1: '1', d1: '4', op: '+', n2: '1', d2: '4' },
  { id: 8,  left: '91%', delay: '11s',   dur: '10s', n1: '2', d1: '3', op: '−', n2: '1', d2: '6' },
  { id: 9,  left: '36%', delay: '14s',   dur: '13s', n1: '3', d1: '4', op: '+', n2: '1', d2: '8' },
  { id: 10, left: '63%', delay: '17s',   dur: '11s', n1: '4', d1: '5', op: '−', n2: '2', d2: '5' },
];

function makeBoltPoints(x1, y1, x2, y2, jag, segs) {
  const pts = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * jag,
      y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * jag * 0.2,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

function drawBolt(ctx, pts, width, alpha) {
  if (pts.length < 2 || alpha <= 0) return;
  // outer glow
  ctx.save();
  ctx.shadowColor = 'rgba(120, 180, 255, 0.9)';
  ctx.shadowBlur = 28;
  ctx.strokeStyle = `rgba(160, 210, 255, ${alpha * 0.45})`;
  ctx.lineWidth = width * 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.restore();
  // core bolt
  ctx.save();
  ctx.strokeStyle = `rgba(220, 235, 255, ${alpha})`;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.restore();
  // bright center
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
  ctx.lineWidth = width * 0.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.restore();
}

const MainPage = ({ onStart }) => {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const flashRef  = useRef(null);
  const [showAbout, setShowAbout] = useState(false);

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

    // Dim stars — storm clouds mostly cover them
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.1 + 0.2,
      alpha: Math.random() * 0.25 + 0.05,
      twinkleSpeed: Math.random() * 0.005 + 0.002,
      twinkleDir: Math.random() < 0.5 ? 1 : -1,
      vx: (Math.random() - 0.5) * 0.00005,
      vy: (Math.random() - 0.5) * 0.00005,
      color: ['#aac4ff', '#c4b0ff', '#ffffff'][Math.floor(Math.random() * 3)],
    }));

    // Rolling storm clouds
    const clouds = [
      { x: -0.05, y: 0.09, scale: 330, speed: 0.000022, alpha: 0.94 },
      { x:  0.32, y: 0.04, scale: 410, speed: 0.000016, alpha: 0.96 },
      { x:  0.68, y: 0.12, scale: 370, speed: 0.000028, alpha: 0.90 },
      { x:  1.05, y: 0.06, scale: 350, speed: 0.000020, alpha: 0.92 },
    ];

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
        g.addColorStop(0,   'rgba(14, 6, 35, 0.97)');
        g.addColorStop(0.6, 'rgba(10, 4, 26, 0.86)');
        g.addColorStop(1,   'rgba(4, 2, 12, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Rain drops
    const rain = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(),
      speed: 0.011 + Math.random() * 0.009,
      len:   0.018 + Math.random() * 0.020,
      alpha: 0.10 + Math.random() * 0.22,
    }));

    // Lightning state
    const lt = {
      queue: [],
      nextAt: Date.now() + 1800 + Math.random() * 3500,
      glowX: 0, glowY: 0, glowA: 0,
    };

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Dark stormy background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0,   '#06041a');
      bg.addColorStop(0.45,'#0b0720');
      bg.addColorStop(1,   '#10082a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Storm glow from last lightning origin
      if (lt.glowA > 0) {
        const gg = ctx.createRadialGradient(lt.glowX, lt.glowY, 0, lt.glowX, lt.glowY, w * 0.55);
        gg.addColorStop(0, `rgba(100, 150, 255, ${lt.glowA * 0.22})`);
        gg.addColorStop(1, 'rgba(50, 80, 200, 0)');
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, w, h);
        lt.glowA = Math.max(0, lt.glowA - 0.007);
      }

      // Stars (only below cloud layer)
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

      // Rain (diagonal, top-right → bottom-left slant)
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

      // Storm clouds
      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > 1.35) c.x = -0.55;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        drawCloud(c.x * w, c.y * h, c.scale);
        ctx.restore();
      });

      // Spawn lightning
      const now = Date.now();
      if (now >= lt.nextAt) {
        const sx = (0.15 + Math.random() * 0.70) * w;
        const sy = (0.06 + Math.random() * 0.12) * h;
        const ex = sx + (Math.random() - 0.5) * w * 0.28;
        const ey = (0.42 + Math.random() * 0.38) * h;

        const main   = makeBoltPoints(sx, sy, ex, ey, 75, 14);
        const mid    = main[Math.floor(main.length / 2)];
        const branch = Math.random() < 0.70
          ? makeBoltPoints(mid.x, mid.y, mid.x + (Math.random() - 0.5) * w * 0.22, mid.y + Math.random() * h * 0.22, 45, 8)
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
        drawBolt(ctx, b.main, 2.5, alpha);
        if (b.branch) drawBolt(ctx, b.branch, 1.4, alpha * 0.65);
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="main-page">
      <canvas ref={canvasRef} className="main-canvas" />
      <div ref={flashRef} className="lightning-overlay" />

      <button className="main-about-btn" onClick={() => setShowAbout(true)}>
        <span className="main-about-icon">ⓘ</span> About
      </button>

      <div className="frac-bubbles-layer" aria-hidden="true">
        {FRAC_BUBBLES.map(b => (
          <div
            key={b.id}
            className="frac-bubble"
            style={{ left: b.left, animationDelay: b.delay, animationDuration: b.dur }}
          >
            <span className="fb-frac">
              <span className="fb-n">{b.n1}</span>
              <span className="fb-bar" />
              <span className="fb-d">{b.d1}</span>
            </span>
            <span className="fb-op">{b.op}</span>
            <span className="fb-frac">
              <span className="fb-n">{b.n2}</span>
              <span className="fb-bar" />
              <span className="fb-d">{b.d2}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="main-content">
        <div className="main-title-group">
          <h1 className="main-title">WIZARDFRAC</h1>
          <h2 className="main-solve">SOLVE IT!</h2>
          <p className="main-tagline">Master your fractions skills</p>
        </div>

        <button className="main-start-btn" onClick={onStart}>
          Start your Journey
        </button>

        <div className="main-features">
          {FEATURES.map(f => (
            <div className="main-feature" key={f.label}>
              <span className="main-feature-icon">{f.icon}</span>
              <span className="main-feature-label">{f.label}</span>
              <span className="main-feature-desc">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="about-close" onClick={() => setShowAbout(false)} aria-label="Close">✕</button>

            <div className="about-banner">
              <span className="about-banner-star">★</span>
              <span className="about-banner-about">ABOUT</span>{' '}
              <span className="about-banner-name">WIZARDFRAC</span>
              <span className="about-banner-star">★</span>
            </div>

            <p className="about-subtitle">A magical journey to master fractions!</p>

            <div className="about-sections">
              {ABOUT_SECTIONS.map(sec => (
                <div className="about-section" key={sec.title}>
                  <div className="about-icon-circle">{sec.icon}</div>
                  <div>
                    <h3 className="about-section-title">{sec.title}</h3>
                    <p className="about-section-text">{sec.body}</p>
                  </div>
                </div>
              ))}

              <div className="about-section">
                <div className="about-icon-circle">🏆</div>
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
      )}
    </div>
  );
};

export default MainPage;
