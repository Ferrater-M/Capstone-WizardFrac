import { useState, useEffect, useRef } from 'react';
import './IslandInterior.css';
import LoadingScreen from '../components/LoadingScreen';
import { useMinimumShow } from '../utils/useMinimumShow';
import { playSfx } from '../utils/audio';
import { isTouchDevice } from '../utils/device';
import { skipAmbientFrame } from '../utils/stage';
import PixelIcon from '../components/PixelIcon';

const SQUARE  = 380;
const P_RAD   = 18;
const E_RAD   = 22;
const SPEED   = 2.2;   // px per frame
const REACH   = P_RAD + E_RAD + 12;
// Miniature sprite sizes, px (the sprite frames have lots of empty space). The same at every GUI Scaling.
const SPRITE_SCALE = 1.4;
const ENEMY_SIZE  = Math.round(120 * SPRITE_SCALE);
const PLAYER_SIZE = Math.round(124 * SPRITE_SCALE);

const walkableSrc = (name) => {
  switch (name) {
    case 'Similar':    return '/InteractableUI/SimilarWalkableArea.png';
    case 'Dissimilar': return '/InteractableUI/DissimilarWalkableArea.png';
    case 'Hybrid':     return '/InteractableUI/HybridWalkableArea.png';
    default:           return null;
  }
};

const ISLAND_KEY_MAP = {
  Similar:    'similarIsland',
  Dissimilar: 'dissimilarIsland',
  Hybrid:     'hybridIsland',
};

// Arrow keys light up the matching WASD keycap in the key guide.
const KEY_TO_CAP = {
  w: 'W', W: 'W', ArrowUp: 'W',
  a: 'A', A: 'A', ArrowLeft: 'A',
  s: 'S', S: 'S', ArrowDown: 'S',
  d: 'D', D: 'D', ArrowRight: 'D',
  Enter: 'ENTER',
};

// On a phone the guide itself is the controller: pressing a cap sends the same key a keyboard would.
const sendKey = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));

// Small pixel arrow for the touch caps (the pixel font has no arrow letters). Points up; rotated per cap.
const PixelArrow = ({ turn, size = 22 }) => (
  <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" style={{ transform: `rotate(${turn}deg)` }} aria-hidden="true">
    <path fill="currentColor" d="M3 0h1v1h1v1h1v1h1v1H5v3H2V4H0V3h1V2h1V1h1z" />
  </svg>
);
// Phone joystick: put a finger on it and slide. The knob follows (up to KNOB_TRAVEL from the middle) and
// the direction is sent as the arrow keys a keyboard would press (diagonals press two at once), so the
// walking code is the same as on a computer. Lifting the finger lets go of every key.
const KNOB_TRAVEL = 32;      // px the knob can move from the middle (a whole number of art pixels)
const ART_PX = 4;            // one pixel of the joystick art = 4 px, so the knob moves in 4 px steps

// A round pixel-art disc as an SVG: n×n cells, coloured by colourAt(dx, dy, dist) (null = empty), where
// dx/dy/dist are the cell's offset from the middle, in cells. Same-coloured cells in a row are merged.
const PixelDisc = ({ n, colourAt }) => {
  const rects = [];
  for (let y = 0; y < n; y++) {
    let run = null;
    for (let x = 0; x <= n; x++) {
      const dx = x + 0.5 - n / 2, dy = y + 0.5 - n / 2;
      const c = x < n ? colourAt(dx, dy, Math.hypot(dx, dy)) : null;
      if (run && run.c === c) { run.w++; continue; }
      if (run && run.c) rects.push(<rect key={`${run.x}-${y}`} x={run.x} y={y} width={run.w} height="1" fill={run.c} />);
      run = { x, w: 1, c };
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width="100%" height="100%" shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block' }}>
      {rects}
    </svg>
  );
};

// The pad: purple rim (lighter while held), dark inner ring, slightly lighter middle
const padColour = (active) => (dx, dy, d) => {
  if (d > 14.5) return null;
  if (d > 13) return active ? '#A855F7' : '#6D28D9';
  if (d > 11.5) return '#1b0d40';
  if (d < 5) return '#3b1c6e';
  return '#2a1357';
};
// The knob: gold rim, purple body with a light top-left shine and a dark bottom-right
const knobColour = (dx, dy, d) => {
  if (d > 6.5) return null;
  if (d > 5.2) return '#FBBF24';
  if (dx + dy < -3 && d < 4.3) return '#a78bfa';
  if (dx + dy > 3.5) return '#5b21b6';
  return '#7C3AED';
};
const DEAD_ZONE = 0.3;       // a finger this close to the middle (share of KNOB_TRAVEL) doesn't walk
const AXIS = 0.38;           // how far a direction must lean to count (0.38 ≈ 8 even directions)
const Joystick = () => {
  const baseRef = useRef(null);
  const heldRef = useRef(new Set());
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  const setHeld = (want) => {
    const held = heldRef.current;
    held.forEach(k => { if (!want.has(k)) sendKey('keyup', k); });
    want.forEach(k => { if (!held.has(k)) sendKey('keydown', k); });
    heldRef.current = want;
  };
  const move = (e) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = r.width / (el.offsetWidth || r.width) || 1;   // the guide is drawn scaled: screen px → its own px
    let dx = (e.clientX - (r.left + r.width / 2)) / k;
    let dy = (e.clientY - (r.top + r.height / 2)) / k;
    const d = Math.hypot(dx, dy);
    const want = new Set();
    if (d > KNOB_TRAVEL * DEAD_ZONE) {
      const nx = dx / d, ny = dy / d;
      if (nx > AXIS) want.add('ArrowRight');
      if (nx < -AXIS) want.add('ArrowLeft');
      if (ny > AXIS) want.add('ArrowDown');
      if (ny < -AXIS) want.add('ArrowUp');
    }
    if (d > KNOB_TRAVEL) { dx *= KNOB_TRAVEL / d; dy *= KNOB_TRAVEL / d; }
    // Snap to the art's pixel grid so the knob moves like pixel art
    setKnob({ x: Math.round(dx / ART_PX) * ART_PX, y: Math.round(dy / ART_PX) * ART_PX, active: true });
    setHeld(want);
  };
  const release = () => { setHeld(new Set()); setKnob({ x: 0, y: 0, active: false }); };
  // Leaving the island never leaves a key held down
  useEffect(() => () => heldRef.current.forEach(k => sendKey('keyup', k)), []);

  return (
    <div
      ref={baseRef}
      className={`joystick${knob.active ? ' is-active' : ''}`}
      aria-label="Joystick: slide to move"
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (knob.active) move(e); }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <PixelDisc n={29} colourAt={padColour(knob.active)} />
      {[0, 90, 180, -90].map(t => (
        <span key={t} className="joystick-hint" style={{ transform: `rotate(${t}deg) translateY(-44px)` }}>
          <PixelArrow size={12} />
        </span>
      ))}
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>
        <PixelDisc n={13} colourAt={knobColour} />
      </span>
    </div>
  );
};

// Phone version: a joystick instead of WASD, a pressable Enter, and a pulsing
// "Control Your Character" call-out on its right.
const TouchKeyGuide = ({ pressed, canFight }) => {
  // Finger down = key down, finger up (or slid off / interrupted) = key up.
  const press = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); sendKey('keydown', key); },
    onPointerUp: () => sendKey('keyup', key),
    onPointerCancel: () => sendKey('keyup', key),
    onLostPointerCapture: () => sendKey('keyup', key),
    onContextMenu: (e) => e.preventDefault(),
  });
  return (
    <div className="key-guide is-touch" aria-label="Controls: joystick to move, Enter to fight">
      <PixelCorners />
      <div className="key-guide-group">
        <Joystick />
        <span className="key-guide-label">Move</span>
      </div>
      <div className="key-guide-group">
        <span className={`keycap keycap-enter is-pressable${pressed.ENTER ? ' is-down' : ''}${canFight ? ' can-fight' : ''}`} {...press('Enter')}>Enter</span>
        <span className={`key-guide-label${canFight ? ' is-ready' : ''}`}>Fight</span>
      </div>
      <span className="key-guide-callout"><PixelArrow turn={-90} />Control Your Character</span>
    </div>
  );
};

// Bottom-left key guide: WASD = Move, Enter = Fight. While idle the WASD caps light up in turn;
// a held key presses its cap down; Enter pulses gold while an enemy is close enough to fight.
const KeyGuide = ({ pressed, canFight }) => {
  if (isTouchDevice()) return <TouchKeyGuide pressed={pressed} canFight={canFight} />;
  const anyMove = pressed.W || pressed.A || pressed.S || pressed.D;
  const cap = (k, idx) => (
    <span
      key={k}
      className={`keycap${pressed[k] ? ' is-down' : ''}${!anyMove ? ' is-idle' : ''}`}
      style={{ animationDelay: `${idx * 0.45}s` }}
    >
      {k}
    </span>
  );
  return (
    <div className="key-guide" aria-label="Controls: W A S D to move, Enter to fight">
      <PixelCorners />
      <div className="key-guide-group">
        <div className="key-guide-row">{cap('W', 0)}</div>
        <div className="key-guide-row">{cap('A', 1)}{cap('S', 2)}{cap('D', 3)}</div>
        <span className="key-guide-label">Move</span>
      </div>
      <div className="key-guide-group">
        <span className={`keycap keycap-enter${pressed.ENTER ? ' is-down' : ''}${canFight ? ' can-fight' : ''}`}>Enter</span>
        <span className={`key-guide-label${canFight ? ' is-ready' : ''}`}>Fight</span>
      </div>
    </div>
  );
};

// Thin inner line + pixel corner squares, as on the island selection's square buttons.
const PixelCorners = ({ outside = false, small = false }) => {
  const mod = `${outside ? ' is-outside' : ''}${small ? ' is-small' : ''}`;
  return (
    <>
      <span className={`ii-inner-line${mod}`} />
      {['tl', 'tr', 'bl', 'br'].map(c => <span key={c} className={`ii-corner ${c}${mod}`} />)}
    </>
  );
};

// A small animated copy of a sprite sheet (one row of square frames, like the battle sprites).
const MiniSprite = ({ src, size, flip = false, className = '', style }) => {
  const [frames, setFrames] = useState(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setFrames(Math.max(1, Math.round(img.naturalWidth / img.naturalHeight))); };
    img.onerror = () => { if (alive) setFrames(0); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  if (!frames) return null;
  const kf = `mini_${frames}_${size}`;
  return (
    <>
      <style>{`@keyframes ${kf} { to { background-position-x: -${frames * size}px; } }`}</style>
      <div
        className={`mini-sprite ${className}`}
        style={{
          width: size, height: size,
          backgroundImage: `url(${src})`,
          backgroundSize: `${frames * size}px ${size}px`,
          animation: `${kf} ${(frames / 8).toFixed(2)}s steps(${frames}) infinite`,
          transform: flip ? 'scaleX(-1)' : undefined,
          ...style,
        }}
      />
    </>
  );
};

// Pixel-art X for a beaten level: 7×7 blocks that pop in one by one along the two diagonals.
const X_CELLS = [];
for (let i = 0; i < 7; i++) { X_CELLS.push([i, i]); if (i !== 6 - i) X_CELLS.push([i, 6 - i]); }
const PixelX = () => (
  <svg className="pixel-x" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-label="Completed">
    {X_CELLS.map(([cx, cy], k) => (
      <rect key={k} x={cx} y={cy} width="1" height="1" className="pixel-x-cell" style={{ animationDelay: `${Math.min(cx, 6 - cx) * 70 + (cx === cy ? 0 : 35)}ms` }} />
    ))}
  </svg>
);

// Background: the cloud picture redrawn at low resolution (so it looks pixelated), with lots of blocky
// pixel clouds drifting across it at different speeds. Everything is drawn on a small canvas and scaled up.
const PIXEL = 5;
const CLOUD_PUFFS = [
  { x: 0, y: 0, r: 7 }, { x: 7, y: -3, r: 5 }, { x: -7, y: -2, r: 5 },
  { x: 13, y: 1, r: 4 }, { x: -12, y: 1, r: 4 }, { x: 5, y: 3, r: 4 }, { x: -4, y: 3, r: 4 },
];
const PixelSky = ({ src }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const lctx = low.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const img = new Image();
    img.src = src;

    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
      low.width = Math.ceil(w / PIXEL); low.height = Math.ceil(h / PIXEL);
    };
    resize();
    window.addEventListener('resize', resize);

    // Near clouds are bigger, brighter and faster than far ones (parallax).
    const clouds = Array.from({ length: 48 }, () => {
      const depth = Math.random();
      return {
        x: Math.random(), y: Math.random(),
        scale: 0.6 + depth * 1.6,
        speed: (0.000018 + depth * 0.00007) * (reduceMotion ? 0 : 1),
        light: depth > 0.45,
        alpha: 0.35 + depth * 0.5,
      };
    });

    let frame = 0, last = performance.now();
    const ambient = {};
    const draw = (now) => {
      if (skipAmbientFrame(ambient, now)) { frame = requestAnimationFrame(draw); return; }   // phones: 30 fps
      const dt = Math.min(50, now - last); last = now;
      const lw = low.width, lh = low.height;
      lctx.imageSmoothingEnabled = true;
      if (img.complete && img.naturalWidth) {
        const sc = Math.max(lw / img.naturalWidth, lh / img.naturalHeight);   // cover
        const iw = img.naturalWidth * sc, ih = img.naturalHeight * sc;
        lctx.drawImage(img, (lw - iw) / 2, (lh - ih) / 2, iw, ih);
      } else {
        lctx.fillStyle = '#5a6aa0'; lctx.fillRect(0, 0, lw, lh);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, lw * PIXEL, lh * PIXEL);
      // Clouds go on the full-size canvas: the shape stays made of PIXEL-sized blocks, but the whole cloud
      // glides smoothly instead of hopping one big pixel at a time.
      clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > 1.15) { c.x = -0.15; c.y = Math.random(); }
        const cx = c.x * lw * PIXEL, cy = c.y * lh * PIXEL;
        // Shadow underneath, then the body: hard-edged blocks, no smoothing
        [[1, 'rgba(70, 84, 130, '], [0, c.light ? 'rgba(250, 246, 236, ' : 'rgba(190, 200, 225, ']].forEach(([dy, col]) => {
          ctx.fillStyle = `${col}${c.alpha})`;
          CLOUD_PUFFS.forEach(p => {
            const r = Math.max(1, Math.round(p.r * c.scale)) * PIXEL;
            ctx.fillRect(cx + Math.round(p.x * c.scale) * PIXEL - r, cy + (Math.round(p.y * c.scale) + dy) * PIXEL - r, r * 2, r * 2);
          });
        });
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [src]);
  return <canvas ref={canvasRef} className="pixel-sky" aria-hidden="true" />;
};

// Intro when the level selection opens: the screen starts covered in the island selection's purple pixel
// clouds, they rush toward you (flying through them) while fading to this screen's white/blue clouds, then
// thin out and fly off past the edges to reveal the island. onDone fires when the screen is clear.
const INTRO_MS = 1700;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c1, c2, k) => c1.map((v, i) => Math.round(lerp(v, c2[i], k)));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const INTRO_COLORS = {
  // [from: island selection, to: level selection]
  sky:    [[18, 8, 47],    [90, 106, 160]],
  light:  [[180, 130, 255], [250, 246, 236]],
  dark:   [[60, 20, 120],   [190, 200, 225]],
  shadow: [[30, 10, 70],    [70, 84, 130]],
};
const CloudIntro = ({ onDone }) => {
  const canvasRef = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { doneRef.current(); return undefined; }
    const ctx = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const lctx = low.getContext('2d');
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    low.width = Math.ceil(w / PIXEL); low.height = Math.ceil(h / PIXEL);
    const lw = low.width, lh = low.height, cx = lw / 2, cy = lh / 2;
    const spread = Math.hypot(lw, lh) * 0.55;

    // Each cloud sits at a direction + distance from the centre and a depth z; as z shrinks it comes
    // closer — drawn further out and bigger — which reads as flying forward through them.
    const spawn = (c, far) => {
      c.ang = Math.random() * Math.PI * 2;
      c.dist = (0.12 + Math.random() * 0.9) * spread;
      c.z = far ? 1.4 + Math.random() * 0.6 : 0.25 + Math.random() * 1.6;
      c.size = 1.0 + Math.random() * 1.1;
      c.dark = Math.random() < 0.45;
    };
    // Packed tight, so there's almost no gap between them
    const clouds = Array.from({ length: 520 }, () => { const c = {}; spawn(c, false); return c; });
    playSfx('/SoundEffects/initialDissimilarFail.wav');

    const start = performance.now();
    let last = start, frame = 0, finished = false;
    const draw = (now) => {
      const t = (now - start) / INTRO_MS;
      const dt = Math.min(50, now - last) / 1000; last = now;
      const colourK = smooth(0.12, 0.7, t);       // purple → white/blue
      const clearK = smooth(0.55, 0.95, t);       // sky fades out, revealing the island

      lctx.clearRect(0, 0, lw, lh);
      const sky = mix(INTRO_COLORS.sky[0], INTRO_COLORS.sky[1], colourK);
      lctx.fillStyle = `rgba(${sky.join(',')}, ${1 - clearK})`;
      lctx.fillRect(0, 0, lw, lh);

      const light = mix(INTRO_COLORS.light[0], INTRO_COLORS.light[1], colourK);
      const dark = mix(INTRO_COLORS.dark[0], INTRO_COLORS.dark[1], colourK);
      const shadow = mix(INTRO_COLORS.shadow[0], INTRO_COLORS.shadow[1], colourK);
      const speed = lerp(1.1, 3.2, smooth(0.0, 0.7, t));    // speeds up as you push through

      // Far ones first so near ones cover them
      clouds.sort((a, b) => b.z - a.z);
      clouds.forEach(c => {
        c.z -= speed * dt;
        if (c.z <= 0.12) {
          if (t < 0.55) spawn(c, true);  // keep the cover going until it's time to clear
          else return;                   // then let them fly off and don't replace them
        }
        if (c.z <= 0.12) return;
        const px = cx + Math.cos(c.ang) * c.dist / c.z;
        const py = cy + Math.sin(c.ang) * c.dist / c.z * 0.7;
        // Grows as it comes closer, but capped so close clouds stay cloud-shaped instead of filling the screen
        const scale = Math.min(4.2, (c.size / c.z) * 0.36);
        // Far-away clouds fade in so none pop in; whatever is left at the very end fades out
        const fadeIn = Math.min(1, (2 - c.z) * 1.5) * (1 - smooth(0.78, 1, t));
        [[Math.max(1, Math.round(scale * 0.6)), shadow], [0, c.dark ? dark : light]].forEach(([dy, col]) => {
          lctx.fillStyle = `rgba(${col.join(',')}, ${fadeIn})`;
          CLOUD_PUFFS.forEach(pf => {
            const r = Math.max(1, Math.round(pf.r * scale));
            lctx.fillRect(Math.round(px + pf.x * scale) - r, Math.round(py + pf.y * scale) - r + dy, r * 2, r * 2);
          });
        });
      });

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, lw * PIXEL, lh * PIXEL);

      if (t >= 1 && !finished) { finished = true; doneRef.current(); return; }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="cloud-intro" aria-hidden="true" />;
};

// A picture drawn at low resolution and scaled back up, for a pixel look. `pixel` is the block size in
// screen px — the island uses a smaller block than the sky, so it stays soft and readable.
const PixelImage = ({ src, size, pixel, className, label }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const img = new Image();
    let alive = true;
    img.onload = () => {
      if (!alive) return;
      const n = Math.round(size / pixel);
      canvas.width = n; canvas.height = n;
      const ctx = canvas.getContext('2d');
      const sc = Math.min(n / img.naturalWidth, n / img.naturalHeight);   // contain, centred
      const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
      ctx.clearRect(0, 0, n, n);
      ctx.drawImage(img, (n - w) / 2, (n - h) / 2, w, h);
    };
    img.src = src;
    return () => { alive = false; };
  }, [src, size, pixel]);
  return <canvas ref={canvasRef} className={`pixel-image ${className}`} role="img" aria-label={label} />;
};

// levels: list of { level, name, type } to generate nodes for
const makeEnemies = (levels = []) => {
  const margin = E_RAD + 16;
  const range  = SQUARE - margin * 2;
  const positions = [];
  for (const info of levels) {
    let pos, tries = 0;
    do {
      pos = { x: margin + Math.random() * range, y: margin + Math.random() * range };
      tries++;
    } while (
      tries < 200 &&
      positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < E_RAD * 3.2)
    );
    positions.push({ ...info, ...pos });
  }
  return positions;
};

const StarRow = ({ stars = 0 }) => (
  <div style={{ display: 'flex', gap: 1 }}>
    {[1, 2, 3].map(n => (
      <span
        key={n}
        style={{
          fontSize: 11,
          color: n <= stars ? '#fbbf24' : 'rgba(255,255,255,0.35)',
          textShadow: n <= stars ? '0 0 4px rgba(251,191,36,0.8)' : 'none',
        }}
      >
        ★
      </span>
    ))}
  </div>
);

const IslandInterior = ({ island, maxStage = 0, stars = {}, character, paused = false, onSelectLevel, onBack, onOpenMenu, onLoaded }) => {
  const charKey = character?.name?.toLowerCase().includes('girl') ? 'witch' : 'wizard';
  const isCompleted = (level) => maxStage >= level;
  const isLocked    = (level) => level > maxStage + 1;

  const [playerPos,  setPlayerPos]  = useState({ x: SQUARE / 2, y: SQUARE / 2 });
  const [nearEnemy,  setNearEnemy]  = useState(null);
  const [pressedCaps, setPressedCaps] = useState({}); // keycaps held down, for the key guide
  const [facing, setFacing] = useState('right');      // which way the wizard sprite looks
  const [introDone, setIntroDone] = useState(false);  // cloud fly-through finished → controls on, X marks drawn
  const [enemies, setEnemies] = useState([]); // populated from enemyData.txt
  const [levelsFetching, setLevelsLoading] = useState(true);
  const levelsLoading = useMinimumShow(levelsFetching);   // loading screen: until the levels are read, at least 1 s
  // One sound for all the X marks together (not one per X, so it never stacks up loud), and only
  // when at least one level is beaten.
  // Tell the app once the island has finished loading, so its theme music can start (from the top)
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  useEffect(() => { if (!levelsLoading) onLoadedRef.current?.(); }, [levelsLoading]);
  const crossSoundPlayed = useRef(false);
  useEffect(() => {
    if (!introDone || crossSoundPlayed.current) return;
    if (enemies.some(e => maxStage >= e.level)) {
      crossSoundPlayed.current = true;
      playSfx('/SoundEffects/numberMove.wav');
    }
  }, [introDone, enemies, maxStage]);

  // Load actual level values from enemyData.txt — the loading screen shows only until it's read
  // (no minimum time).
  useEffect(() => {
    let cancelled = false;

    const finishLoading = () => {
      if (!cancelled) setLevelsLoading(false);
    };

    const key = ISLAND_KEY_MAP[island.name];
    if (!key) { finishLoading(); return; }
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => {
        const sections = text.split('===').filter(s => s.trim());
        const levels = [];
        for (const section of sections) {
          const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
          if (lines[0] !== key) continue;
          const blocks = section.split('---').slice(1);
          for (const rawBlock of blocks) {
            const content = rawBlock.split('+++')[0].trim();
            if (!content) continue;
            const enemy = {};
            content.split('\n').forEach(line => {
              const idx = line.indexOf(':');
              if (idx !== -1) enemy[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            });
            if (enemy.level) levels.push({ level: parseInt(enemy.level), name: enemy.name, type: enemy.type });
          }
        }
        if (!cancelled) setEnemies(levels.length > 0 ? makeEnemies(levels) : []);
      })
      .catch(() => { if (!cancelled) setEnemies([]); })
      .finally(finishLoading);

    return () => { cancelled = true; };
  }, [island.name]);

  const posRef   = useRef({ x: SQUARE / 2, y: SQUARE / 2 });
  const keysRef  = useRef({});
  const frameRef = useRef(null);

  // ── movement loop ──
  useEffect(() => {
    const tick = () => {
      const k = keysRef.current;
      let { x, y } = posRef.current;

      if (k['ArrowUp']    || k['w'] || k['W']) y -= SPEED;
      if (k['ArrowDown']  || k['s'] || k['S']) y += SPEED;
      const left  = k['ArrowLeft']  || k['a'] || k['A'];
      const right = k['ArrowRight'] || k['d'] || k['D'];
      if (left)  x -= SPEED;
      if (right) x += SPEED;
      // Face the way you last walked sideways; up/down keeps the current direction
      if (right && !left) setFacing('right');
      else if (left && !right) setFacing('left');

      x = Math.max(P_RAD, Math.min(SQUARE - P_RAD, x));
      y = Math.max(P_RAD, Math.min(SQUARE - P_RAD, y));

      posRef.current = { x, y };
      setPlayerPos({ x, y });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── nearby enemy detection ──
  useEffect(() => {
    const { x, y } = playerPos;
    const closest = enemies.reduce((best, e) => {
      if (isLocked(e.level)) return best;
      const d = Math.hypot(e.x - x, e.y - y);
      return d < REACH && (best === null || d < best.d) ? { e, d } : best;
    }, null);
    setNearEnemy(closest?.e ?? null);
  }, [playerPos, enemies]);

  // ── keyboard events ──
  useEffect(() => {
    const down = (e) => {
      if (paused || !introDone) return;
      keysRef.current[e.key] = true;
      const capDown = KEY_TO_CAP[e.key];
      if (capDown) setPressedCaps(p => (p[capDown] ? p : { ...p, [capDown]: true }));
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === 'Enter' && nearEnemy) onSelectLevel(nearEnemy.level);
    };
    const up = (e) => {
      keysRef.current[e.key] = false;
      const capUp = KEY_TO_CAP[e.key];
      if (capUp) setPressedCaps(p => ({ ...p, [capUp]: false }));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, [nearEnemy, onSelectLevel, paused, introDone]);

  // Opening the Menu lets go of every held key, so the wizard doesn't keep walking behind it
  useEffect(() => { if (paused) { keysRef.current = {}; setPressedCaps({}); } }, [paused]);

  const overlay = walkableSrc(island.name);

  if (levelsLoading) {
    return <LoadingScreen message={`LOADING ${island.title?.toUpperCase() || 'ISLAND'}...`} />;
  }

  return (
    <div style={{
      position: 'relative',
      width: '1920px',
      height: '1080px',
      overflow: 'hidden',
      background: '#5a6aa0',
    }}>


      {/* Back (top left) and Menu (top right) — the island selection's square pixel buttons */}
      <button className="ii-pill ii-pill-back" data-ui onClick={onBack}>
        <PixelCorners />
        ← Back
      </button>
      {onOpenMenu && (
        <button className="ii-pill ii-pill-menu" data-ui onClick={onOpenMenu}>
          <PixelCorners />
          Menu
        </button>
      )}

      {/* Island title — the island selection's title box, centred at the top */}
      <div className="ii-title-box" data-ui>
        <PixelCorners outside />
        <div className="ii-title-gem"><span /></div>
        <h1 className="ii-title">{island.title}</h1>
      </div>

      <PixelSky src="/InteractableUI/WalkableAreaBackground.jpg" />
      {!introDone && <CloudIntro onDone={() => setIntroDone(true)} />}

      <KeyGuide pressed={pressedCaps} canFight={!!nearEnemy} />

      {/* Walkable square */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: SQUARE, height: SQUARE,
        zIndex: 2,
      }}>

        {/* Island + level markers float together */}
        <div className="island-float-wrapper">
          {/* WalkableArea island PNG — larger than the square so edges aren't clipped */}
          {overlay && (
            <PixelImage src={overlay} size={SQUARE * 3} pixel={3} className="walkable-area-float" label="island" />
          )}

          {/* Enemies — a miniature of each level's own enemy sprite */}
          {enemies.map(enemy => {
            const done   = isCompleted(enemy.level);
            const locked = isLocked(enemy.level);
            const boss   = enemy.type === 'boss';
            const near   = nearEnemy?.level === enemy.level;
            const key    = ISLAND_KEY_MAP[island.name];

            return (
              <div
                key={enemy.level}
                className={`level-node${near ? ' is-near' : ''}${locked ? ' is-locked' : ''}${done ? ' is-done' : ''}`}
                style={{ left: enemy.x - ENEMY_SIZE / 2, top: enemy.y - ENEMY_SIZE / 2, width: ENEMY_SIZE, height: ENEMY_SIZE }}
              >
                {!locked && boss && <span className="level-crown" data-ui><PixelIcon name="crown" size={14} color="#FBBF24" label="Boss" /></span>}
                {done && (
                  <div className="level-stars" data-ui>
                    <StarRow stars={stars[enemy.level] || 0} />
                  </div>
                )}
                {enemy.name && <MiniSprite src={`/enemyAssets/${key}/${enemy.name}/idle.png`} size={ENEMY_SIZE} className="level-sprite" />}
                {done && introDone && <PixelX />}
                {locked && <span className="level-lock" data-ui><PixelIcon name="lock" size={18} color="#e8e4f8" label="Locked" /></span>}
                <span className="level-tag" data-ui><PixelCorners small />{boss ? 'BOSS' : `Lv ${enemy.level}`}</span>
              </div>
            );
          })}

          {/* Interact prompt above nearby enemy */}
          {/* The anchor is a point just above the enemy; the prompt grows upward from it, so a bigger
              GUI Scaling (data-ui) never covers the enemy */}
          {nearEnemy && (
            <div className="level-prompt-anchor" style={{ left: nearEnemy.x, top: nearEnemy.y - (isCompleted(nearEnemy.level) ? 17.2 : 20.4) * SPRITE_SCALE }}>
              <div className="level-prompt" data-ui>
                <PixelCorners small />
                {nearEnemy.type === 'boss' ? 'Boss Fight' : `Level ${nearEnemy.level}`}
                {nearEnemy.name && <span className="level-prompt-name">{nearEnemy.name}</span>}
                {isCompleted(nearEnemy.level) && <span style={{ color: '#10b981' }}>Defeated</span>}
                <span className="level-prompt-action">Enter to Fight</span>
              </div>
            </div>
          )}
        </div>

        {/* Player — the miniature wizard/witch, facing the way they last walked */}
        <div
          className="player-mini"
          style={{ left: playerPos.x - PLAYER_SIZE / 2, top: playerPos.y - PLAYER_SIZE / 2 - 10 * SPRITE_SCALE }}
        >
          <MiniSprite src={`/PlayerAssets/${charKey}/${charKey}Idle.png`} size={PLAYER_SIZE} flip={facing === 'left'} />
        </div>
      </div>
    </div>
  );
};

export default IslandInterior;
