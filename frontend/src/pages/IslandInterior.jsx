import React, { useState, useEffect, useRef } from 'react';
import './IslandInterior.css';
import LoadingScreen from '../components/LoadingScreen';
import { playSfx } from '../utils/audio';

const SQUARE  = 380;
const P_RAD   = 18;
const E_RAD   = 22;
const SPEED   = 2.2;   // px per frame
const REACH   = P_RAD + E_RAD + 12;
const ENEMY_SIZE  = 120;  // miniature sprite sizes, px (the sprite frames have lots of empty space)
const PLAYER_SIZE = 124;

const walkableSrc = (name) => {
  switch (name) {
    case 'Similar':    return '/SimilarWalkableArea.png';
    case 'Dissimilar': return '/DissimilarWalkableArea.png';
    case 'Hybrid':     return '/HybridWalkableArea.png';
    default:           return null;
  }
};

const ISLAND_KEY_MAP = {
  Similar:    'similarIsland',
  Dissimilar: 'dissimilarIsland',
  Hybrid:     'hybridIsland',
};

const MIN_LOADING_MS = 2000;

// Arrow keys light up the matching WASD keycap in the key guide.
const KEY_TO_CAP = {
  w: 'W', W: 'W', ArrowUp: 'W',
  a: 'A', A: 'A', ArrowLeft: 'A',
  s: 'S', S: 'S', ArrowDown: 'S',
  d: 'D', D: 'D', ArrowRight: 'D',
  Enter: 'ENTER',
};

// Bottom-right key guide: WASD = Move, Enter = Fight. While idle the WASD caps light up in turn;
// a held key presses its cap down; Enter pulses gold while an enemy is close enough to fight.
const KeyGuide = ({ pressed, canFight }) => {
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
    const draw = (now) => {
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
      clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > 1.15) { c.x = -0.15; c.y = Math.random(); }
        const cx = Math.round(c.x * lw), cy = Math.round(c.y * lh);
        // Shadow underneath, then the body: hard-edged blocks, no smoothing
        [[1, 'rgba(70, 84, 130, '], [0, c.light ? 'rgba(250, 246, 236, ' : 'rgba(190, 200, 225, ']].forEach(([dy, col]) => {
          lctx.fillStyle = `${col}${c.alpha})`;
          CLOUD_PUFFS.forEach(p => {
            const r = Math.max(1, Math.round(p.r * c.scale));
            lctx.fillRect(cx + Math.round(p.x * c.scale) - r, cy + Math.round(p.y * c.scale) - r + dy, r * 2, r * 2);
          });
        });
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, lw * PIXEL, lh * PIXEL);
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
  const [levelsLoading, setLevelsLoading] = useState(true);
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

  // Load actual level values from enemyData.txt — the loading screen stays up
  // for at least MIN_LOADING_MS even if the fetch resolves instantly, so it
  // doesn't just flash on screen.
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    const startTime = Date.now();

    const finishLoading = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      timeoutId = setTimeout(() => {
        if (!cancelled) setLevelsLoading(false);
      }, remaining);
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

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#5a6aa0',
    }}>


      {/* Back (top left) and Menu (top right) — the island selection's square pixel buttons */}
      <button className="ii-pill ii-pill-back" onClick={onBack}>
        <PixelCorners />
        ← Back
      </button>
      {onOpenMenu && (
        <button className="ii-pill ii-pill-menu" onClick={onOpenMenu}>
          <PixelCorners />
          Menu
        </button>
      )}

      {/* Island title — the island selection's title box, centred at the top */}
      <div className="ii-title-box">
        <PixelCorners outside />
        <div className="ii-title-gem"><span /></div>
        <h1 className="ii-title">{island.title}</h1>
      </div>

      <PixelSky src="/WalkableAreaBackground.jpg" />
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
                {!locked && boss && <span className="level-crown">👑</span>}
                {done && (
                  <div className="level-stars">
                    <StarRow stars={stars[enemy.level] || 0} />
                  </div>
                )}
                {enemy.name && <MiniSprite src={`/enemyAssets/${key}/${enemy.name}/idle.png`} size={ENEMY_SIZE} className="level-sprite" />}
                {done && introDone && <PixelX />}
                {locked && <span className="level-lock">🔒</span>}
                <span className="level-tag"><PixelCorners small />{boss ? 'BOSS' : `Lv ${enemy.level}`}</span>
              </div>
            );
          })}

          {/* Interact prompt above nearby enemy */}
          {nearEnemy && (
            <div className="level-prompt" style={{ left: nearEnemy.x - 70, top: nearEnemy.y - (isCompleted(nearEnemy.level) ? 104 : 92) }}>
              <PixelCorners small />
              {nearEnemy.type === 'boss' ? 'Boss Fight' : `Level ${nearEnemy.level}`}
              {nearEnemy.name && <span className="level-prompt-name">{nearEnemy.name}</span>}
              {isCompleted(nearEnemy.level) && <span style={{ color: '#10b981' }}>Defeated</span>}
              <span className="level-prompt-action">Enter to Fight</span>
            </div>
          )}
        </div>

        {/* Player — the miniature wizard/witch, facing the way they last walked */}
        <div
          className="player-mini"
          style={{ left: playerPos.x - PLAYER_SIZE / 2, top: playerPos.y - PLAYER_SIZE / 2 - 10 }}
        >
          <MiniSprite src={`/PlayerAssets/${charKey}/${charKey}Idle.png`} size={PLAYER_SIZE} flip={facing === 'left'} />
        </div>
      </div>
    </div>
  );
};

export default IslandInterior;
