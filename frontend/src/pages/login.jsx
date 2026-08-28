import React, { useState, useEffect, useRef } from 'react';
import './login.css';

const LandingPage = ({ onLoginSuccess }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);

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

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.6 + 0.4,
      twinkleSpeed: Math.random() * 0.008 + 0.003,
      twinkleDir: Math.random() < 0.5 ? 1 : -1,
      vx: (Math.random() - 0.5) * 0.00007,
      vy: (Math.random() - 0.5) * 0.00007,
      color: ['#ffffff','#cce4ff','#ffe8cc','#e0ccff'][Math.floor(Math.random() * 4)],
    }));

    const dust = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 3 + 2,
      alpha: Math.random() * 0.2 + 0.05,
      twinkleSpeed: Math.random() * 0.003 + 0.001,
      twinkleDir: Math.random() < 0.5 ? 1 : -1,
      color: ['rgba(180,140,255','rgba(140,180,255','rgba(255,180,220'][Math.floor(Math.random() * 3)],
    }));

    const NEBULAE = [
      { cx: 0.15, cy: 0.25, r: 0.22, c: [100, 60, 200] },
      { cx: 0.80, cy: 0.55, r: 0.18, c: [60, 100, 220] },
      { cx: 0.50, cy: 0.78, r: 0.15, c: [180, 60, 150] },
      { cx: 0.35, cy: 0.45, r: 0.12, c: [60, 160, 200] },
    ];

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
        ctx.moveTo(cx + p.x * scale + p.r * scale, cy + p.y * scale);
        ctx.arc(cx + p.x * scale, cy + p.y * scale, p.r * scale, 0, Math.PI * 2);
      });
      ctx.fill();
      ctx.restore();
    };

    const clouds = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random(),
      y: 0.05 + Math.random() * 0.75,
      vx: (0.00006 + Math.random() * 0.00008) * (Math.random() < 0.65 ? 1 : -1),
      scale: 0.7 + Math.random() * 1.4,
      alpha: 0.18 + Math.random() * 0.18,
      color: i < 3 ? 'rgba(255,255,255,1)' : 'rgba(120,60,200,1)',
    }));

    const shootingStars = [];
    let nextShot = Date.now() + 2000 + Math.random() * 3000;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

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

      clouds.forEach(cloud => {
        cloud.x += cloud.vx;
        if (cloud.x > 1.25) cloud.x = -0.25;
        if (cloud.x < -0.25) cloud.x = 1.25;
        drawCloud(cloud.x * w, cloud.y * h, cloud.scale, cloud.alpha, cloud.color);
      });

      dust.forEach(p => {
        p.alpha += p.twinkleSpeed * p.twinkleDir;
        if (p.alpha > 0.28) { p.alpha = 0.28; p.twinkleDir = -1; }
        if (p.alpha < 0.02) { p.alpha = 0.02; p.twinkleDir =  1; }
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
        p.alpha += p.twinkleSpeed * p.twinkleDir;
        if (p.alpha > 1)   { p.alpha = 1;   p.twinkleDir = -1; }
        if (p.alpha < 0.2) { p.alpha = 0.2; p.twinkleDir =  1; }
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
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
        const angle = (25 + Math.random() * 35) * Math.PI / 180;
        const speed = 0.007 + Math.random() * 0.005;
        shootingStars.push({
          x: Math.random() * 0.65, y: Math.random() * 0.4,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          alpha: 1, tail: [], tailLen: 28 + Math.floor(Math.random() * 18),
        });
        nextShot = now + 2500 + Math.random() * 4000;
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.tail.unshift({ x: s.x, y: s.y });
        if (s.tail.length > s.tailLen) s.tail.pop();
        s.x += s.vx; s.y += s.vy; s.alpha -= 0.013;
        if (s.x > 1.1 || s.y > 1.1 || s.alpha <= 0) { shootingStars.splice(i, 1); continue; }
        if (s.tail.length > 1) {
          const last = s.tail[s.tail.length - 1];
          const tg = ctx.createLinearGradient(s.x * w, s.y * h, last.x * w, last.y * h);
          tg.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
          tg.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.save();
          ctx.strokeStyle = tg; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.x * w, s.y * h);
          s.tail.forEach(tp => ctx.lineTo(tp.x * w, tp.y * h));
          ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.globalAlpha = s.alpha;
        const hg = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, 5);
        hg.addColorStop(0, 'rgba(255,255,255,1)');
        hg.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = hg; ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleStartGame = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) { setError('Please enter a nickname'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8082/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      if (response.ok) {
        onLoginSuccess(await response.json());
      } else {
        setError('Failed to login. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <canvas ref={canvasRef} className="login-canvas" />

      {/* Top Left Logo */}
      <div className="logo-area">
        <h1 className="logo-text">WIZARDFRAC</h1>
        <div className="logo-banner">
          <span>MASTER FRACTIONS. CAST SPELLS. SAVE THE ISLANDS!</span>
        </div>
      </div>

      {/* Wizard standee, bottom-left */}
      <img
        className="wizard-standee"
        src="/PlayerAssets/WizardBoyStandee.png"
        alt="Young wizard"
      />

      {/* Right Side Panel */}
      <div className="panel-container">
        <div className="panel">
          <div className="panel-inner-border">
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>
          </div>

          <div className="panel-gem">
            <div className="gem-inner"></div>
          </div>

          <div className="panel-content">
            <h2 className="welcome-text">WELCOME BACK,</h2>
            <h3 className="wizard-text">YOUNG WIZARD!</h3>

            <div className="separator">
              <span className="sep-line"></span>
              <span className="sep-diamond"></span>
              <span className="sep-line"></span>
            </div>

            <p className="panel-subtitle">Enter your nickname to begin your adventure!</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleStartGame} className="login-form">
              <div>
                <label className="input-label" htmlFor="nickname-input">NICKNAME</label>
                <div className="input-group">
                  <div className="input-icon" aria-hidden="true">🧙</div>
                  <input
                    id="nickname-input"
                    type="text"
                    placeholder="Enter your nickname..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={loading}
                    required
                    maxLength={16}
                  />
                  <span className="input-sparkle" aria-hidden="true"></span>
                </div>
                <p className="input-hint">3–16 characters</p>
              </div>

              <div className="tip-box">
                <span className="tip-star" aria-hidden="true"></span>
                <span>Tip: Use a name that other wizards will remember!</span>
              </div>

              <div className="button-container">
                <button type="submit" className="start-btn" disabled={loading}>
                  <span className="start-btn-icon" aria-hidden="true"></span>
                  <span>{loading ? 'LOGGING IN...' : 'START GAME'}</span>
                  <span className="start-btn-icon" aria-hidden="true"></span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
