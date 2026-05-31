import React, { useRef, useState, useEffect } from 'react';

const DrawingCanvas = ({ onCircleDetected }) => {
  const canvasRef        = useRef(null);
  const particleCanvasRef = useRef(null);
  const particlesRef     = useRef([]);
  const rafRef           = useRef(null);
  const [isDrawing, setIsDrawing]     = useState(false);
  const [points, setPoints]           = useState([]);
  const [magicCircle, setMagicCircle] = useState(null);
  const lastPointRef = useRef(null);

  // ── stroke canvas setup ──
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 6;
    ctx.lineCap   = 'square';
    ctx.lineJoin  = 'miter';
  }, []);

  // ── particle animation loop (always running) ──
  useEffect(() => {
    const tick = () => {
      const canvas = particleCanvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const alive = [];
      for (const p of particlesRef.current) {
        p.life--;
        if (p.life <= 0) continue;
        alive.push(p);
        const t     = p.life / p.maxLife;       // 1 → 0
        const px    = p.x + p.vx * (1 - t) * p.maxLife;
        const py    = p.y + p.vy * (1 - t) * p.maxLife;
        const sz    = p.size * t;
        ctx.fillStyle = `rgba(68,68,68,${(t * 0.8).toFixed(2)})`;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
      particlesRef.current = alive;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── spawn particles at cursor ──
  const spawnParticles = (x, y) => {
    // Outward burst particles
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.2;
      particlesRef.current.push({
        x, y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        size:    Math.random() * 5 + 2,
        life:    22 + Math.floor(Math.random() * 12),
        maxLife: 34,
      });
    }
    // Scattered trail particles — stick in place, just fade
    for (let i = 0; i < 6; i++) {
      const ox = (Math.random() - 0.5) * 14;
      const oy = (Math.random() - 0.5) * 14;
      particlesRef.current.push({
        x: x + ox,
        y: y + oy,
        vx:      0,
        vy:      0,
        size:    Math.random() * 6 + 4,
        life:    24 + Math.floor(Math.random() * 12),
        maxLife: 36,
      });
    }
  };

  // ── drawing handlers ──
  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    lastPointRef.current = { x, y };
    setPoints([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const rect   = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'square';
    ctx.lineJoin    = 'miter';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    spawnParticles(x, y);

    lastPointRef.current = { x, y };
    setPoints(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (isDrawing) { setIsDrawing(false); checkForCircle(); }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isDrawing) { setIsDrawing(false); clearCanvas(); }
  };

  // ── draw sound ──
  useEffect(() => {
    if (!isDrawing) return;
    const interval = setInterval(() => {
      new Audio('/SoundEffects/drawSound.wav').play().catch(() => {});
    }, 500);
    return () => clearInterval(interval);
  }, [isDrawing]);

  // ── circle detection ──
  const checkForCircle = () => {
    if (points.length < 20) { clearCanvas(); return; }
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const ds = points.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avg = ds.reduce((s, d) => s + d, 0) / ds.length;
    const std = Math.sqrt(ds.reduce((s, d) => s + (d - avg) ** 2, 0) / ds.length);
    const se  = Math.hypot(points[0].x - points[points.length-1].x, points[0].y - points[points.length-1].y);

    if (std < avg * 0.3 && se < avg * 0.5) {
      clearCanvas();
      new Audio('/SoundEffects/confirmDrawing.wav').play().catch(() => {});
      setMagicCircle({ x: cx, y: cy, r: avg });
      setTimeout(() => {
        setMagicCircle(null);
        onCircleDetected({ centerX: cx, centerY: cy, radius: avg });
      }, 900);
      return;
    }
    clearCanvas();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPoints([]);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      <style>{`
        @keyframes magicCircleFade {
          0%   { opacity: 0; transform: scale(0.7); }
          30%  { opacity: 1; transform: scale(1.05); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        @keyframes sparkleSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: 'relative' }}>
        {/* Stroke canvas */}
        <canvas
          ref={canvasRef}
          width={380} height={240}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onContextMenu={handleContextMenu}
          style={{ background: 'transparent', display: 'block' }}
        />

        {/* Particle canvas — sits on top, pointer-events off */}
        <canvas
          ref={particleCanvasRef}
          width={380} height={240}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />

        {magicCircle && (
          <img
            src="/InteractableUI/SimilarMagicCircle.png"
            alt="magic circle"
            style={{
              position: 'absolute',
              left: magicCircle.x - magicCircle.r,
              top:  magicCircle.y - magicCircle.r,
              width:  magicCircle.r * 2,
              height: magicCircle.r * 2,
              pointerEvents: 'none',
              animation: 'magicCircleFade 0.9s ease-out forwards',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DrawingCanvas;
