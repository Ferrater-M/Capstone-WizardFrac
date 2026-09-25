import React, { useState, useRef, useEffect, useMemo } from 'react';
import { playSfx } from '../utils/audio';

const FONT = '"Press Start 2P", monospace';
const BROWN = '#703737';
const CREAM = '#e8d5b4';

// Interactable UI inner size (400x440 box minus its 4px border). The stage can be given MORE ROOM (stageW / stageH)
// without anything growing: the division, the jars and the shards keep their sizes and just get more area.
// Everything that sits in the middle is centred in the bigger stage; the jar row and the shard zone use the full room.
const BASE_W = 392;
const BASE_H = 432;
const makeGeo = (W, H) => {
  const ox = (W - BASE_W) / 2, oy = (H - BASE_H) / 2;
  const ROW_Y = 172 + oy;
  return {
    STAGE_W: W, STAGE_H: H, ROW_Y,
    N_SHINE: { x: 196 + ox, y: 172 + oy },
    D_SHINE: { x: 196 + ox, y: 285 + oy },
    N_PAIR: { x: 154 + ox, y: ROW_Y },
    D_PAIR: { x: 238 + ox, y: ROW_Y },
    N_ROW: { x: 92 + ox, y: ROW_Y },
    DIV_POS: { x: 138 + ox, y: ROW_Y },
    D_ROW: { x: 184 + ox, y: ROW_Y },
    EQ_POS: { x: 230 + ox, y: ROW_Y },
    INPUT_POS: { x: 290 + ox, y: ROW_Y },
    GEM_CENTER: { x: 196 + ox, y: 172 + oy },
    JAR_MID_Y: 226 + oy,
    ZONE_TOP: 64,
    ZONE_BOTTOM: H - 44,
  };
};
const IMG_ASPECT = 2 / 3;
const JAR_STAGGER = 300;
const GUIDE_IDLE_MS = 3000;  // no shard movement for this long -> guide a shard to a jar
const GUIDE_LOOP_MS = 2600;  // length of one guide demonstration
// Up to this many shards the player drags them into the jars one by one. Above it, the player sweeps the pointer
// over the shards and every shard it touches flies into the first jar with room.
export const MANUAL_MAX_SHARDS = 31;
const SWEEP_R = 30;
const BROOM_W = 88;                          // gemSweep.png is drawn this wide; its bristles' centre is at (49%, 78%) and it swings from the top of the handle (49%, 7%)
const SWEEP_TEXT_DELAY = 500;                // "Sweep!" shows this long after the gem shatters
const SWEEP_TEXT_SHOW = 3000;                // ...and stays this long (or until the player starts sweeping)
const SETTLE_STAGGER = 0.12;
const SETTLE_MOVE = 0.6;

// shine -> pair -> divide (player types the quotient) -> throw (jars thrown, D splits and
// lands on them) -> charge (N powers up) -> gem -> shake -> shatter -> play
const PHASES = ['shine', 'pair', 'divide', 'throw', 'charge', 'gem', 'shake', 'shatter', 'play'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const rectCorners = (cx, cy, w, h, deg) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([px, py]) => [cx + px * c - py * s, cy + px * s + py * c]);
};

// Separating-axis test for two convex polygons.
const polysSeparated = (A, B) => {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y1 - y2, ny = x2 - x1;
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const [x, y] of A) { const p = x * nx + y * ny; aMin = Math.min(aMin, p); aMax = Math.max(aMax, p); }
      for (const [x, y] of B) { const p = x * nx + y * ny; bMin = Math.min(bMin, p); bMax = Math.max(bMax, p); }
      if (aMax < bMin || bMax < aMin) return true;
    }
  }
  return false;
};

const bigNumber = {
  fontWeight: 900, color: '#fff', textShadow: '3px 3px 0 #000, 0 0 6px #000, 0 0 12px #000',
};

const SparkleSpin = ({ size, fade }) => (
  <div
    style={{
      position: 'absolute', left: '50%', top: '50%', width: size, height: size,
      marginLeft: -size / 2, marginTop: -size / 2, zIndex: -1, pointerEvents: 'none',
      transform: fade ? 'scale(0)' : 'scale(1)', opacity: fade ? 0 : 1,
      transition: 'transform 0.6s ease-in, opacity 0.6s ease-in',
    }}
  >
    <img
      src="/OtherEffects/BlueSparkle.png"
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', display: 'block', animation: 'gemSpin 1.2s linear infinite' }}
    />
  </div>
);

// Improper -> mixed conversion. The player first types the quotient (numerator ÷
// denominator), which throws that many jars. The denominator splits into one copy per
// jar while the numerator crystallises into a gem that shatters into `numerator`
// shards (each worth 1/denominator). Every jar is filled with `denominator` shards;
// the jars are the whole number and the shards left outside are the new numerator.
const ImproperToMixedGame = ({ numerator, denominator, onComplete, onWrong, onUiChange, actionRef, finalPhase, onFinalSettled, startPos, dismiss, startBox = true, stageW = BASE_W, stageH = BASE_H, hideCounts = false }) => {
  const {
    STAGE_W, STAGE_H, ROW_Y, N_SHINE, D_SHINE, N_PAIR, D_PAIR, N_ROW, DIV_POS, D_ROW, EQ_POS, INPUT_POS,
    GEM_CENTER, JAR_MID_Y, ZONE_TOP, ZONE_BOTTOM,
  } = makeGeo(stageW, stageH);
  const layout = useMemo(() => {
    const wholes = Math.floor(numerator / denominator);
    const shardH = clamp(Math.round(190 / Math.sqrt(numerator)), 32, 62);
    const shardW = Math.round(shardH * IMG_ASPECT);
    const GAP = 14;
    const jarHByN = clamp(Math.round(190 - numerator * 1.5), 120, 165);
    // Jar size is worked out for the normal-size stage, so a bigger stage gives the jars room without making them bigger.
    const maxJarW = (BASE_W - 24 - GAP * (wholes - 1)) / wholes;
    const jarH = Math.min(jarHByN, Math.floor(maxJarW / IMG_ASPECT));
    const jarW = Math.round(jarH * IMG_ASPECT);
    const totalW = wholes * jarW + (wholes - 1) * GAP;
    const rowLeft = (STAGE_W - totalW) / 2;
    const jarLefts = Array.from({ length: wholes }, (_, j) => rowLeft + j * (jarW + GAP));
    const midTop = JAR_MID_Y - jarH / 2;
    const bottomTop = STAGE_H - 8 - jarH;

    // Random spot + rotation for every shard each jar can hold, padded so none touch
    // (or bump into each other while bobbing). If a layout won't fit, shrink and retry.
    const PAD = 3;
    const ix = jarW * 0.16, iw = jarW * 0.68, iy = jarH * 0.24, ih = jarH * 0.64;
    const packJar = (jarLeft, slotH) => {
      const bx = jarLeft + ix, by = midTop + iy;
      const cand = [];
      for (let i = 0; i < denominator; i++) {
        let placed = false;
        for (let t = 0; t < 150 && !placed; t++) {
          const rot = Math.round((Math.random() - 0.5) * 180);
          const cx = bx + Math.random() * iw;
          const cy = by + Math.random() * ih;
          const poly = rectCorners(cx, cy, slotH * IMG_ASPECT + PAD * 2, slotH + PAD * 2, rot);
          if (!poly.every(([x, y]) => x >= bx && x <= bx + iw && y >= by && y <= by + ih)) continue;
          if (cand.some(c => !polysSeparated(poly, c.poly))) continue;
          cand.push({ cx, cy, rot, poly });
          placed = true;
        }
        if (!placed) return null;
      }
      return cand;
    };
    let slotH = Math.min(shardH, Math.sqrt((0.4 * iw * ih) / (IMG_ASPECT * denominator)));
    let packed = null;
    for (let round = 0; round < 40 && !packed; round++) {
      const all = jarLefts.map(l => packJar(l, slotH));
      if (all.every(Boolean)) packed = all;
      else slotH *= 0.92;
    }
    const slotW = slotH * IMG_ASPECT;
    const slots = packed.map(jar => jar.map(p => ({ x: p.cx - slotW / 2, y: p.cy - slotH / 2, rot: p.rot })));

    // Best-candidate sampling: random, but each shard picks the spot farthest from the
    // ones already placed, and never lands on the row of jars (so it fills the room
    // above and below them).
    const avoid = { l: rowLeft - 8, t: midTop - 8, r: rowLeft + totalW + 8, b: midTop + jarH + 8 };
    const placedPts = [];
    const targets = [];
    for (let i = 0; i < numerator; i++) {
      let pick = { x: 4, y: ZONE_TOP }, bestScore = -1;
      for (let t = 0; t < 80; t++) {
        const x = 4 + Math.random() * (STAGE_W - shardW - 8);
        const y = ZONE_TOP + Math.random() * (ZONE_BOTTOM - ZONE_TOP - shardH);
        if (x < avoid.r && x + shardW > avoid.l && y < avoid.b && y + shardH > avoid.t) continue;
        let minD = Infinity;
        for (const p of placedPts) minD = Math.min(minD, Math.hypot(p.x - x, p.y - y));
        if (minD > bestScore) { bestScore = minD; pick = { x, y }; }
      }
      placedPts.push(pick);
      targets.push({ ...pick, rot: Math.round((Math.random() - 0.5) * 80) });
    }

    return {
      wholes, shardW, shardH, gemW: jarW, gemH: jarH, jarW, jarH, jarLefts, midTop, bottomTop,
      slotW, slotH, slots, targets,
    };
  }, [numerator, denominator, stageW, stageH]);

  const { wholes, shardW, shardH, gemW, gemH, jarW, jarH, jarLefts, midTop, bottomTop, slotW, slotH, slots, targets } = layout;
  // The timers started when the quotient is answered run long after that render; they must read the CURRENT layout
  // (the stage may have been given more room in between), not the one they were created with.
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const left = numerator - wholes * denominator;
  const sweepMode = numerator > MANUAL_MAX_SHARDS;

  const nShine = startPos?.n || N_SHINE;
  const dShine = startPos?.d || D_SHINE;
  const [boxOn, setBoxOn] = useState(startBox);
  const [phase, setPhase] = useState('shine');
  const [jarStage, setJarStage] = useState('hidden');
  const [dSplit, setDSplit] = useState(false);
  const [dLanded, setDLanded] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [qInput, setQInput] = useState('');
  const [finalStage, setFinalStage] = useState('idle');
  const [gemScale, setGemScale] = useState(1);
  const [gemsGone, setGemsGone] = useState(false);
  const [jarTargets, setJarTargets] = useState(null);
  const [tick, setTick] = useState(0);
  const [finalSettled, setFinalSettled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dismissGone, setDismissGone] = useState(false);
  const [particles, setParticles] = useState([]);
  const [shards, setShards] = useState(() =>
    Array.from({ length: numerator }, (_, id) => ({
      id, x: GEM_CENTER.x - shardW / 2, y: GEM_CENTER.y - shardH / 2, rot: 0, jar: -1, slot: -1,
    }))
  );
  const [draggingId, setDraggingId] = useState(null);
  const [bolts, setBolts] = useState([]);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const inputRef = useRef(null);
  const lockedRef = useRef(false);
  const shakeAudioRef = useRef(null);
  const afterTimers = useRef([]);
  const prevInJar = useRef(0);
  const prevFull = useRef(0);
  const [locks, setLocks] = useState({}); // jar index -> { from: starting angle in degrees } once its lock has popped up
  const lockScheduled = useRef(new Set());
  const [locksGone, setLocksGone] = useState(false); // locks are removed once the jars move to their final spots
  const [sweepPos, setSweepPos] = useState(null);   // pointer position (stage units) while sweeping
  const sweepingRef = useRef(false);
  const lastSweepRef = useRef({ x: null, dir: 1, tMove: 0 });   // previous pointer x, last movement direction + when it moved
  const sweepPosRef = useRef(null);                              // latest pointer position while sweeping
  const broomStartRef = useRef(0);                               // when the broom started rocking (to follow its swing)
  const sweepPartId = useRef(0);
  const [sweepParts, setSweepParts] = useState([]);    // particles the broom throws out the way it is moving
  const [showSweepText, setShowSweepText] = useState(false);
  const sweepStartedRef = useRef(false);
  const sweepGuideRef = useRef(null);
  const [guide, setGuide] = useState(null); // { key, shard, jar } while a demonstration is playing
  const shardsRef = useRef(shards);
  shardsRef.current = shards;

  const idx = PHASES.indexOf(phase);
  const reached = (p) => idx >= PHASES.indexOf(p);
  const counts = Array.from({ length: wholes }, (_, j) => shards.filter(s => s.jar === j).length);
  const jarFull = counts.map(c => c >= denominator);
  const fullKey = jarFull.map(f => (f ? 1 : 0)).join('');
  const totalIn = counts.reduce((a, b) => a + b, 0);
  const done = jarFull.every(Boolean);

  useEffect(() => {
    ['FractionGem', 'FractionGemShard', 'GemJar'].forEach(n => { new Image().src = `/InteractableUI/${n}.png`; });
    playSfx('/SoundEffects/sparkleSound.wav');
    const ts = [];
    ts.push(setTimeout(() => setBoxOn(false), 60));
    ts.push(setTimeout(() => setPhase('pair'), 1800));
    ts.push(setTimeout(() => { setPhase('divide'); playSfx('/SoundEffects/circleAppear.wav'); }, 2700));
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => () => {
    afterTimers.current.forEach(clearTimeout);
    shakeAudioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (phase !== 'divide') return;
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, [phase]);

  const later = (ms, fn) => afterTimers.current.push(setTimeout(fn, ms));

  const submitQuotient = () => {
    if (phase !== 'divide' || !qInput || lockedRef.current) return;
    lockedRef.current = true;
    if (parseInt(qInput) !== wholes) {
      onWrong?.(qInput);
      return;
    }
    setPhase('throw');
    setJarStage('bottom');
    for (let j = 0; j < wholes; j++) later(j * JAR_STAGGER, () => playSfx('/SoundEffects/spellThrow.wav'));
    const base = (wholes - 1) * JAR_STAGGER;
    later(900 + base, () => { setDSplit(true); playSfx('/SoundEffects/sparkleSound.wav'); });
    later(1800 + base, () => setDLanded(true));
    later(1900 + base, () => setPhase('charge'));
    later(3100 + base, () => { setPhase('gem'); setBurstKey(1); playSfx('/SoundEffects/sparkleExplode.wav'); });
    later(4100 + base, () => {
      setPhase('shake');
      const a = playSfx('/SoundEffects/shake.wav');
      a.loop = true;
      shakeAudioRef.current = a;
    });
    later(5100 + base, () => {
      setPhase('shatter');
      setBurstKey(2);
      shakeAudioRef.current?.pause();
      shakeAudioRef.current = null;
      playSfx('/SoundEffects/gemBreak.wav');
      if (sweepMode) {
        later(SWEEP_TEXT_DELAY, () => {
          if (sweepStartedRef.current) return;
          setShowSweepText(true);
          later(SWEEP_TEXT_SHOW, () => setShowSweepText(false));
        });
      }
      setShards(prev => prev.map((s, i) => {
        const t = layoutRef.current.targets[i];
        return { ...s, x: t.x, y: t.y, rot: t.rot };
      }));
    });
    later(5500 + base, () => { setJarStage('mid'); playSfx('/SoundEffects/numberMove.wav'); });
    later(6500 + base, () => setPhase('play'));
  };

  // Final answer phase: leftover shards go white and line up beside the numerator input;
  // the jars shrink and stack beside the whole input (their shards just vanish), and both pulse white in turn.
  const measureTargets = () => {
    const stage = stageRef.current;
    const sr = stage.getBoundingClientRect();
    const sc = sr.width / stage.offsetWidth;
    const rectOf = (key, fallback) => {
      const el = document.querySelector(`[data-final="${key}"]`);
      if (!el) return fallback;
      const r = el.getBoundingClientRect();
      return { l: (r.left - sr.left) / sc, t: (r.top - sr.top) / sc, w: r.width / sc, h: r.height / sc };
    };
    const whole = rectOf('whole', { l: 121, t: 135, w: 70, h: 54 });
    const num = rectOf('num', { l: 201, t: 135, w: 70, h: 54 });

    // Jars shrink and stack like a deck of cards, left of the whole-number input.
    const jarScale = clamp((whole.h * 1.2) / jarH, 0.25, 0.6);
    const jw = jarW * jarScale;
    const step = jw * 0.4;
    const jars = Array.from({ length: wholes }, (_, j) => ({
      cx: whole.l - 14 - jw / 2 - (wholes - 1 - j) * step,
      cy: whole.t + whole.h / 2,
      scale: jarScale,
    }));

    // Leftover shards sit in a tight row right of the numerator input, clear of it and of the border.
    const startX = num.l + num.w + 16;
    const avail = STAGE_W - 14 - startX;
    const scale = left ? Math.min(1, avail / (left * shardW), (num.h * 1.1) / shardH) : 1;
    const gems = Array.from({ length: left }, (_, k) => ({
      x: startX + k * shardW * scale,
      y: num.t + num.h / 2 - (shardH * scale) / 2,
    }));
    return { jars, gems, scale };
  };

  useEffect(() => {
    if (!finalPhase) return undefined;
    const ts = [];
    setFinalStage('glow');
    ts.push(setTimeout(() => {
      const t = measureTargets();
      setGemScale(t.scale);
      setJarTargets(t.jars);
      setShards(prev => {
        let k = 0;
        return prev.map(s => (s.jar < 0 ? { ...s, x: t.gems[k].x, y: t.gems[k++].y, rot: 0 } : s));
      });
      setFinalStage('move');
      for (let j = 0; j < wholes; j++) ts.push(setTimeout(() => playSfx('/SoundEffects/numberMove.wav'), j * SETTLE_STAGGER * 1000));
      for (let k = 0; k < left; k++) ts.push(setTimeout(() => playSfx('/SoundEffects/numberMove.wav'), k * SETTLE_STAGGER * 1000));
      // Jars and shards travel on their own schedules; the final inputs appear once both are in place.
      const gemTime = left ? (left - 1) * SETTLE_STAGGER + SETTLE_MOVE : 0;
      const jarTime = (wholes - 1) * SETTLE_STAGGER + SETTLE_MOVE;
      ts.push(setTimeout(() => setGemsGone(true), 700));
      ts.push(setTimeout(() => { setFinalSettled(true); onFinalSettled?.(); }, Math.max(gemTime, jarTime) * 1000 + 300));
    }, 1300));
    return () => ts.forEach(clearTimeout);
  }, [finalPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalMoved = finalStage === 'move';
  const freeIds = shards.filter(s => s.jar < 0).map(s => s.id);

  // Answer needs simplifying: jars and leftover shards fade away in a burst of particles.
  useEffect(() => {
    if (!dismiss || dismissed) return undefined;
    const centers = [];
    (jarTargets || []).forEach(t => centers.push({ x: t.cx, y: t.cy }));
    shards.filter(s => s.jar < 0).forEach(s => centers.push({ x: s.x + (shardW * gemScale) / 2, y: s.y + (shardH * gemScale) / 2 }));
    setParticles(centers.flatMap((c, ci) => Array.from({ length: 9 }, (_, i) => {
      const a = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 30;
      return {
        id: `${ci}-${i}`, x: c.x, y: c.y, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist,
        size: 3 + Math.floor(Math.random() * 4), color: '#fff',
      };
    })));
    setDismissed(true);
    playSfx('/SoundEffects/sparkleExplode.wav');
    const t = setTimeout(() => { setDismissGone(true); setParticles([]); }, 1000);
    return () => clearTimeout(t);
  }, [dismiss]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once everything has settled, the leftover shards and the jars pulse white one by one, in order.
  useEffect(() => {
    if (!finalSettled || dismissed) return undefined;
    const id = setInterval(() => setTick(t => t + 1), 320);
    return () => clearInterval(id);
  }, [finalSettled, dismissed]);


  // Sweep demonstration: the hand + ring travel through the guide's points once per loop.
  useEffect(() => {
    const el = sweepGuideRef.current;
    if (!guide?.sweep || !el || !el.animate) return undefined;
    const pts = guide.sweep;
    const frames = pts.map((pt, i) => ({
      transform: `translate(${pt.x}px, ${pt.y}px)`,
      opacity: i === 0 ? 0 : i === 1 || i === pts.length - 1 ? 1 : 1,
      offset: pts.length === 1 ? 0 : i / (pts.length - 1),
    }));
    if (frames.length > 1) frames[frames.length - 1].opacity = 0;
    const anim = el.animate(frames, { duration: GUIDE_LOOP_MS, easing: 'ease-in-out', fill: 'forwards' });
    return () => anim.cancel();
  }, [guide]);

  // Idle guide for the play phase: after GUIDE_IDLE_MS without a shard being moved, a ghost shard (no sparkle)
  // and the guide cursor show a random loose shard being dragged into an open jar; then wait GUIDE_IDLE_MS
  // again before showing another. Any drag or placement restarts the wait.
  useEffect(() => {
    if (phase !== 'play' || done || finalPhase || dismissed || draggingId !== null) { setGuide(null); return undefined; }
    let timer = null, lastShard = null, n = 0;
    const cycle = () => {
      const all = shardsRef.current;
      const free = all.filter(sh => sh.jar < 0);
      const open = Array.from({ length: wholes }, (_, j) => j).filter(j => all.filter(sh => sh.jar === j).length < denominator);
      if (!free.length || !open.length) { timer = setTimeout(cycle, GUIDE_IDLE_MS); return; }
      const pool = free.length > 1 ? free.filter(sh => sh.id !== lastShard) : free;
      const shard = pool[Math.floor(Math.random() * pool.length)];
      lastShard = shard.id;
      if (sweepMode) {
        // A sweep: from a loose shard through its nearest neighbours, like the pointer being dragged over them.
        const center = (sh) => ({ x: sh.x + shardW / 2, y: sh.y + shardH / 2 });
        const path = [center(shard)];
        let rest = free.filter(sh => sh.id !== shard.id);
        while (path.length < 5 && rest.length) {
          const last = path[path.length - 1];
          rest.sort((a, b) => Math.hypot(center(a).x - last.x, center(a).y - last.y) - Math.hypot(center(b).x - last.x, center(b).y - last.y));
          path.push(center(rest[0]));
          rest = rest.slice(1);
        }
        setGuide({ key: ++n, sweep: path });
      } else {
        setGuide({ key: ++n, shard, jar: open[Math.floor(Math.random() * open.length)] });
      }
      timer = setTimeout(() => { setGuide(null); timer = setTimeout(cycle, GUIDE_IDLE_MS); }, GUIDE_LOOP_MS);
    };
    timer = setTimeout(cycle, GUIDE_IDLE_MS);
    return () => { clearTimeout(timer); setGuide(null); };
  }, [phase, done, finalPhase, dismissed, draggingId, totalIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the jars move to their final spots the locks fade out and are removed.
  useEffect(() => {
    if (!finalMoved) return undefined;
    const t = setTimeout(() => setLocksGone(true), 400);
    return () => clearTimeout(t);
  }, [finalMoved]);

  // Shards that haven't been scattered yet sit at the gem's centre; keep them there if the stage changes size.
  useEffect(() => {
    if (reached('shatter')) return;
    setShards(prev => prev.map(s => (s.jar < 0 ? { ...s, x: GEM_CENTER.x - shardW / 2, y: GEM_CENTER.y - shardH / 2 } : s)));
  }, [stageW, stageH]); // eslint-disable-line react-hooks/exhaustive-deps

  const uiStage = ['shine', 'pair', 'divide'].includes(phase) ? 'check' : 'confirm';
  const uiCanSubmit = uiStage === 'check' ? phase === 'divide' && !!qInput : done;
  actionRef.current = () => {
    if (uiStage === 'check') submitQuotient();
    else if (done) onComplete();
  };
  const prompt = phase === 'divide'
    ? `${numerator} divided by ${denominator} has a remainder`
    : phase === 'play' && !done
      ? (sweepMode
        ? `Drag over the shards to fill ${wholes > 1 ? 'every jar' : 'the jar'} with ${denominator}!`
        : `Fill ${wholes > 1 ? 'every jar' : 'the jar'} with ${denominator} shards!`)
      : '';
  useEffect(() => {
    onUiChange?.({ stage: uiStage, canSubmit: uiCanSubmit, prompt });
  }, [uiStage, uiCanSubmit, prompt]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (totalIn > prevInJar.current) {
      const fullCount = jarFull.filter(Boolean).length;
      const newlyFull = fullCount > prevFull.current;
      playSfx(newlyFull ? '/SoundEffects/confirmDrawing.wav' : '/SoundEffects/sparkleSound.wav');
      if (newlyFull) {
        // Half a second after that sound, a lock pops onto each newly full jar with its own sound.
        jarFull.forEach((full, j) => {
          if (!full || lockScheduled.current.has(j)) return;
          lockScheduled.current.add(j);
          later(500, () => {
            playSfx('/SoundEffects/gemLock.wav');
            const dir = Math.random() < 0.5 ? -1 : 1; // spins back to upright to the left or to the right
            setLocks(prev => ({ ...prev, [j]: { from: dir * (140 + Math.floor(Math.random() * 180)) } }));
          });
        });
      }
      prevFull.current = fullCount;
    }
    prevInJar.current = totalIn;
  }, [totalIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every full jar: lightning keeps arcing between random pairs of its shards.
  useEffect(() => {
    const groups = jarFull
      .map((f, j) => (f ? slots[j].map(p => ({ x: p.x + slotW / 2, y: p.y + slotH / 2 })) : null))
      .filter(Boolean);
    if (!groups.length || finalMoved) { setBolts([]); return undefined; }
    const makeBolt = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, n = 6;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 10;
        pts.push(`${a.x + dx * t + nx * j},${a.y + dy * t + ny * j}`);
      }
      return pts.join(' ');
    };
    const tick = () => {
      const out = [];
      groups.forEach(centers => {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let c = 0; c < count; c++) {
          const i = Math.floor(Math.random() * centers.length);
          let k = Math.floor(Math.random() * (centers.length - 1));
          if (k >= i) k++;
          out.push(makeBolt(centers[i], centers[k]));
        }
      });
      setBolts(out);
    };
    tick();
    const id = setInterval(tick, 120);
    return () => clearInterval(id);
  }, [fullKey, slots, slotW, slotH, finalMoved]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client coordinates -> the stage's own (unscaled) coordinates.
  const toLocal = (cx, cy) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const sc = r.width / el.offsetWidth;
    return { x: (cx - r.left) / sc, y: (cy - r.top) / sc };
  };
  // Puts a loose shard into a jar (the given one, or the first with room). A shard already in a jar stays put.
  const placeInJar = (id, wantedJar) => {
    setShards(prev => {
      const cur = prev.find(s => s.id === id);
      if (!cur || cur.jar >= 0) return prev;
      const inCount = (j) => prev.filter(s => s.jar === j).length;
      let jar = wantedJar;
      if (jar < 0 || inCount(jar) >= denominator) {
        jar = Array.from({ length: wholes }, (_, j) => j).find(j => inCount(j) < denominator);
        if (jar === undefined || wantedJar >= 0) return prev;
      }
      const used = new Set(prev.filter(s => s.jar === jar).map(s => s.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      return prev.map(s => (s.id === id ? { ...s, jar, slot } : s));
    });
  };
  // Particles keep coming for as long as the button is held, even without moving. While the pointer is moving they
  // shoot out the way it moves (left -> left, right -> right); while it is still they follow the broom's own swing.
  const sweeping = sweepPos !== null;
  useEffect(() => {
    if (!sweeping) return undefined;
    const iv = setInterval(() => {
      const p = sweepPosRef.current;
      if (!p) return;
      const now = performance.now();
      const last = lastSweepRef.current;
      // broomRock is 0.34 s: the first half swings the bristles to the left, the second half to the right.
      const rockDir = (((now - broomStartRef.current) % 340) / 340) < 0.5 ? -1 : 1;
      const dir = now - last.tMove < 150 ? last.dir : rockDir;
      const fresh = Array.from({ length: 3 }, () => ({
        id: ++sweepPartId.current, x: p.x, y: p.y + (Math.random() - 0.5) * 16,
        px: dir * (30 + Math.random() * 50), py: (Math.random() - 0.5) * 34, size: 4 + Math.floor(Math.random() * 5),
      }));
      setSweepParts(prev => [...prev.slice(-45), ...fresh]);
      const ids = fresh.map(f => f.id);
      later(650, () => setSweepParts(prev => prev.filter(q => !ids.includes(q.id))));
    }, 45);
    return () => clearInterval(iv);
  }, [sweeping]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sweep mode: every loose shard under the pointer flies into the first jar with room.
  const sweepAt = (cx, cy) => {
    const p = toLocal(cx, cy);
    setSweepPos(p);
    // Remember which way the pointer last moved; the particle emitter (below) uses it while the broom is moving.
    const last = lastSweepRef.current;
    if (last.x !== null && Math.abs(p.x - last.x) >= 3) {
      last.dir = p.x > last.x ? 1 : -1;
      last.tMove = performance.now();
    }
    sweepPosRef.current = p;
    last.x = p.x;
    shardsRef.current
      .filter(sh => sh.jar < 0 && Math.hypot(sh.x + shardW / 2 - p.x, sh.y + shardH / 2 - p.y) <= SWEEP_R + shardH / 4)
      .forEach(sh => placeInJar(sh.id, -1));
  };

  useEffect(() => {
    const onMove = (e) => {
      const dr = dragRef.current;
      if (!dr) return;
      if (Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) > 6) dr.moved = true;
      if (!dr.moved) return;
      const p = toLocal(e.clientX, e.clientY);
      const x = clamp(p.x - dr.ox, 0, STAGE_W - shardW);
      const y = clamp(p.y - dr.oy, 0, STAGE_H - shardH);
      dr.x = x; dr.y = y;
      setShards(prev => prev.map(s => (s.id === dr.id ? { ...s, x, y } : s)));
    };
    const onUp = () => {
      const dr = dragRef.current;
      if (!dr) return;
      dragRef.current = null;
      setDraggingId(null);
      if (!dr.moved) { placeInJar(dr.id, -1); return; }
      const cx = dr.x + shardW / 2, cy = dr.y + shardH / 2;
      const hit = jarLefts.findIndex(l => cx > l && cx < l + jarW && cy > midTop && cy < midTop + jarH);
      if (hit >= 0) placeInJar(dr.id, hit);
    };
    const onCancel = () => { dragRef.current = null; setDraggingId(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [denominator, wholes, shardW, shardH, jarLefts, jarW, jarH, midTop, stageW, stageH]);

  const startDrag = (e, s) => {
    if (phase !== 'play' || s.jar >= 0 || finalPhase) return;
    e.preventDefault();
    const el = stageRef.current;
    const r = el.getBoundingClientRect();
    const sc = r.width / el.offsetWidth;
    dragRef.current = {
      id: s.id, sx: e.clientX, sy: e.clientY, moved: false, x: s.x, y: s.y,
      ox: (e.clientX - r.left) / sc - s.x, oy: (e.clientY - r.top) / sc - s.y,
    };
    setDraggingId(s.id);
  };

  const nPos = phase === 'shine' ? nShine : phase === 'pair' ? N_PAIR : (phase === 'divide' || phase === 'throw') ? N_ROW : N_SHINE;
  const dBase = phase === 'shine' ? dShine : phase === 'pair' ? D_PAIR : D_ROW;
  const labelSize = clamp(Math.round(jarH * 0.11), 14, 22);
  const jarCenterX = (j) => jarLefts[j] + jarW / 2;
  const tagScale = (jarH / 150) * 0.8;

  const dLook = (j) => {
    const tag = phase === 'play' && counts[j] > 0;
    let pos = dBase;
    if (dSplit) pos = { x: jarCenterX(j), y: jarStage === 'mid' ? JAR_MID_Y : bottomTop + jarH / 2 };
    if (tag) pos = { x: jarLefts[j] + jarW + 4, y: midTop + jarH + 2 };
    let size = phase === 'shine' ? 14 : 30;
    if (dSplit) size = labelSize;
    if (tag) size = Math.max(8, Math.round(14 * tagScale));
    return { tag, pos, size };
  };

  const positioned = (pos, extra) => ({
    position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', ...extra,
  });

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none',
        fontFamily: FONT, userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <style>{`
        @keyframes gemSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gemPulse { 0%, 100% { transform: scale(0.7); opacity: 0.55; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes gemWhiteShine {
          0%, 100% { filter: drop-shadow(0 0 3px #fff) brightness(1.3); }
          50% { filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #fff) brightness(2); }
        }
        @keyframes gemCharge {
          0% { transform: scale(1); filter: brightness(1); }
          100% { transform: scale(1.6); filter: drop-shadow(0 0 22px #fff) brightness(1.7); }
        }
        @keyframes gemAppear {
          0% { transform: scale(0.2); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes gemShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-6px, 3px) rotate(-8deg); }
          40% { transform: translate(6px, -4px) rotate(7deg); }
          60% { transform: translate(-5px, -3px) rotate(-6deg); }
          80% { transform: translate(5px, 4px) rotate(8deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes gemBurst {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes gemFloat { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(4px); } }
        @keyframes gemFloatJar { 0%, 100% { transform: translateY(-9px); } 50% { transform: translateY(9px); } }
        @keyframes gemParticle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
        @keyframes gemBob { 0%, 100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
        @keyframes jarLockSpin {
          0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--lr)) scale(0.4); }
          55% { opacity: 1; }
          100% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) scale(1); }
        }
        @keyframes broomRock {
          0%, 100% { transform: rotate(-24deg); }
          50% { transform: rotate(24deg); }
        }
        @keyframes sweepPart {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.3); }
        }
        @keyframes sweepFlash {
          0%, 100% { color: #000; text-shadow: 2px 2px 0 #fff, 0 0 8px #fff; }
          50% { color: #fff; text-shadow: 2px 2px 0 #000, 0 0 8px #000; }
        }
        @keyframes gemSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Numerator */}
      {idx <= PHASES.indexOf('charge') && (
        <div style={positioned(nPos, { zIndex: 13, transition: 'left 0.8s ease-in-out, top 0.8s ease-in-out' })}>
          <div style={{ position: 'relative', animation: phase === 'charge' ? 'gemCharge 1.1s ease-in forwards' : 'none' }}>
            <SparkleSpin size={96} fade={boxOn} />
            <div style={{
              ...bigNumber, fontSize: 30, width: 90, height: 64, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `3px dashed ${boxOn ? '#e8d5b4' : 'transparent'}`,
              background: boxOn ? '#333333' : 'transparent',
              transition: 'border-color 0.6s ease, background-color 0.6s ease',
            }}>{numerator}</div>
          </div>
        </div>
      )}

      {/* ÷  and  =  around the denominator while the quotient is typed */}
      {['÷', '='].map((sym, i) => (
        <div
          key={sym}
          style={positioned(i === 0 ? DIV_POS : EQ_POS, {
            ...bigNumber, fontSize: 24, zIndex: 14, pointerEvents: 'none',
            opacity: phase === 'divide' ? 1 : 0,
            transition: `opacity 0.5s ease ${sym === '÷' && phase === 'divide' ? '0.8s' : '0s'}`,
          })}
        >{sym}</div>
      ))}

      {/* Quotient input */}
      <div
        style={positioned(INPUT_POS, {
          zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: phase === 'divide' ? 1 : 0, pointerEvents: phase === 'divide' ? 'auto' : 'none',
          transition: 'opacity 0.5s ease',
        })}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={qInput}
          onChange={e => setQInput(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') submitQuotient(); }}
          placeholder="?"
          style={{
            width: 80, height: 56, fontSize: 26, fontWeight: 800, textAlign: 'center',
            border: '3px dashed #e8d5b4', borderRadius: 0, background: '#333333', color: '#ffffff',
            outline: 'none', fontFamily: FONT, boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
          }}
        />
      </div>


      {burstKey > 0 && (
        <img
          key={`burst-${burstKey}`}
          src="/OtherEffects/BlueSparkle.png"
          alt=""
          style={{
            position: 'absolute', left: GEM_CENTER.x, top: GEM_CENTER.y, width: 96, height: 96,
            pointerEvents: 'none', zIndex: 40, animation: 'gemBurst 0.8s ease-out forwards',
          }}
        />
      )}

      {/* Gem */}
      {(phase === 'gem' || phase === 'shake') && (
        <div style={positioned(GEM_CENTER, { zIndex: 12 })}>
          <img
            src="/InteractableUI/FractionGem.png"
            alt="fraction gem"
            draggable={false}
            style={{
              width: gemW, height: gemH, display: 'block',
              animation: phase === 'shake' ? 'gemShake 0.12s linear infinite' : 'gemAppear 0.6s ease-out forwards',
            }}
          />
        </div>
      )}

      {/* Shard sparkles — one layer under every shard, gone once a shard is in a jar */}
      {shards.map(s => {
        const dragging = draggingId === s.id;
        const shine = reached('shatter') && s.jar < 0 && !finalPhase;
        return (
          <div
            key={`sp-${s.id}`}
            style={{
              position: 'absolute', left: s.x + shardW / 2, top: s.y + shardH / 2,
              width: shardH * 1.4, height: shardH * 1.4, marginLeft: -shardH * 0.7, marginTop: -shardH * 0.7,
              opacity: shine ? 1 : 0, zIndex: 24, pointerEvents: 'none',
              transition: dragging ? 'none' : 'left 1s cubic-bezier(.15,.85,.3,1), top 1s cubic-bezier(.15,.85,.3,1), opacity 0.3s',
            }}
          >
            <div style={{ width: '100%', height: '100%', animation: `gemPulse 1.1s ease-in-out ${(s.id % 4) * -0.28}s infinite` }}>
              <img
                src="/OtherEffects/BlueSparkle.png"
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block', animation: 'gemSpin 1.2s linear infinite' }}
              />
            </div>
          </div>
        );
      })}

      {/* Shards — in front of the jars */}
      {shards.map(s => {
        const inJar = s.jar >= 0;
        const slot = inJar ? slots[s.jar][s.slot] : null;
        const w = inJar ? slotW : shardW * gemScale;
        const h = inJar ? slotH : shardH * gemScale;
        const x = inJar ? slot.x : s.x;
        const y = inJar ? slot.y : s.y;
        const rot = inJar ? slot.rot : s.rot;
        const shown = reached('shatter');
        const dragging = draggingId === s.id;
        if (inJar && gemsGone) return null;
        if (!inJar && dismissGone) return null;
        const freeIdx = inJar ? -1 : freeIds.indexOf(s.id);
        const gemPulse = finalSettled && !inJar && left > 0 && tick % left === freeIdx;
        return (
          <div
            key={s.id}
            onPointerDown={e => startDrag(e, s)}
            style={{
              position: 'absolute', left: x, top: y, width: w, height: h,
              opacity: shown && !(inJar && finalMoved) && !(dismissed && !inJar) ? 1 : 0,
              transform: `rotate(${rot}deg) scale(${shown ? 1 : 0.3})`,
              transition: dragging ? 'none'
                : finalMoved && !inJar
                  ? `left ${SETTLE_MOVE}s cubic-bezier(.2,.8,.3,1), top ${SETTLE_MOVE}s cubic-bezier(.2,.8,.3,1), width ${SETTLE_MOVE}s ease, height ${SETTLE_MOVE}s ease, transform ${SETTLE_MOVE}s ease, opacity 0.6s, filter 0.2s ease`
                  : 'left 1s cubic-bezier(.15,.85,.3,1), top 1s cubic-bezier(.15,.85,.3,1), width 1s ease, height 1s ease, transform 1s cubic-bezier(.15,.85,.3,1), opacity 0.6s, filter 0.2s ease',
              // The stagger only delays the move (left, top, width, height, transform, opacity), not the pulse
              // glow (filter): a delayed glow on the later shards would end before it ever started.
              transitionDelay: finalMoved && !inJar ? `${Array(6).fill(`${freeIdx * SETTLE_STAGGER}s`).join(', ')}, 0s` : '0s',
              zIndex: dragging ? 26 : 25,
              cursor: phase === 'play' && !inJar ? 'grab' : 'default',
              pointerEvents: phase === 'play' && !inJar && !finalPhase ? 'auto' : 'none',
              touchAction: 'none',
              animation: (inJar && jarFull[s.jar]) || (!inJar && finalPhase && !finalMoved) ? 'gemWhiteShine 0.8s ease-in-out infinite' : 'none',
              filter: gemPulse ? 'drop-shadow(0 0 6px #fff) drop-shadow(0 0 14px #fff) brightness(2)' : 'none',
            }}
          >
            <img
              src="/InteractableUI/FractionGemShard.png"
              alt=""
              draggable={false}
              style={{
                width: '100%', height: '100%', display: 'block', pointerEvents: 'none',
                animation: inJar ? `gemBob 2.6s ease-in-out ${(s.id % 5) * -0.5}s infinite`
                  : finalSettled ? `gemFloat ${(1.4 + ((freeIdx * 37) % 7) * 0.15).toFixed(2)}s ease-in-out ${(-freeIdx * 0.37).toFixed(2)}s infinite` : 'none',
              }}
            />
          </div>
        );
      })}

      {/* Jars — thrown out of the answer box, land at the bottom, then rise into the middle row */}
      {jarLefts.map((left0, j) => {
        if (dismissGone) return null;
        const hidden = jarStage === 'hidden';
        const jt = finalMoved && jarTargets ? jarTargets[j] : null;
        const top = jt ? jt.cy - jarH / 2 : jarStage === 'mid' ? midTop : jarStage === 'bottom' ? bottomTop : ROW_Y - jarH / 2;
        const leftPx = jt ? jt.cx - jarW / 2 : hidden ? INPUT_POS.x - jarW / 2 : left0;
        const jarPulse = finalSettled && tick % wholes === j;
        const ease = 'cubic-bezier(.2,.8,.3,1)';
        const jarBox = {
          position: 'absolute', left: leftPx, top, width: jarW, height: jarH,
          opacity: hidden || dismissed ? 0 : 1,
          transform: hidden ? 'scale(0.25) rotate(-40deg)' : jt ? `scale(${jt.scale}) rotate(0deg)` : 'scale(1) rotate(0deg)',
          transition: finalMoved
            ? `left ${SETTLE_MOVE}s ${ease}, top ${SETTLE_MOVE}s ${ease}, opacity 0.4s ease, transform ${SETTLE_MOVE}s ${ease}`
            : `left 0.9s ${ease}, top 0.9s ${ease}, opacity 0.4s ease, transform 0.9s ${ease}`,
          transitionDelay: finalMoved ? `${j * SETTLE_STAGGER}s` : jarStage === 'bottom' ? `${(j * JAR_STAGGER) / 1000}s` : '0s',
          pointerEvents: 'none',
        };
        return (
          <React.Fragment key={j}>
          <div style={{ ...jarBox, zIndex: 20 }}>
            <img
              src="/InteractableUI/GemJar.png"
              alt="gem jar"
              draggable={false}
              style={{
                width: '100%', height: '100%', display: 'block',
                filter: jarPulse ? 'drop-shadow(0 0 6px #fff) drop-shadow(0 0 18px #fff) brightness(1.9)' : 'drop-shadow(0 0 12px rgba(255,255,255,0.95))',
                transition: 'filter 0.2s ease',
                animation: finalSettled ? `gemFloatJar ${(1.6 + ((j * 53) % 7) * 0.17).toFixed(2)}s ease-in-out ${(-j * 0.61).toFixed(2)}s infinite` : 'none',
              }}
            />
          </div>
          {/* Lock in the middle of a full jar, above the shards. It fades out and is removed once the jars move
              to their final spots. */}
          {locks[j] && !locksGone && (
            <div style={{ ...jarBox, zIndex: 27 }}>
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                opacity: finalMoved ? 0 : 1, transition: 'opacity 0.3s ease',
              }}>
                <img
                  src="/InteractableUI/jarLock.png"
                  alt="jar lock"
                  draggable={false}
                  style={{
                    position: 'absolute', left: '50%', top: '50%', width: Math.round(jarW * 0.36), height: Math.round(jarW * 0.36),
                    '--lr': `${locks[j].from}deg`, imageRendering: 'auto', pointerEvents: 'none',
                    animation: 'jarLockSpin 0.55s cubic-bezier(.16,.9,.3,1) both',
                  }}
                />
              </div>
            </div>
          )}
          </React.Fragment>
        );
      })}

      {particles.map(pt => (
        <div
          key={pt.id}
          style={{
            position: 'absolute', left: pt.x, top: pt.y, width: pt.size, height: pt.size, background: pt.color,
            '--dx': `${pt.dx}px`, '--dy': `${pt.dy}px`, zIndex: 45, pointerEvents: 'none',
            animation: 'gemParticle 0.9s ease-out forwards',
          }}
        />
      ))}

      {bolts.length > 0 && (
        <svg
          width={STAGE_W}
          height={STAGE_H}
          style={{ position: 'absolute', left: 0, top: 0, zIndex: 27, pointerEvents: 'none' }}
        >
          {bolts.map((pts, i) => (
            <g key={i} strokeLinejoin="round" strokeLinecap="round" fill="none">
              <polyline points={pts} stroke="rgba(200,225,255,0.55)" strokeWidth="5" />
              <polyline points={pts} stroke="#fff" strokeWidth="1.8" style={{ filter: 'drop-shadow(0 0 3px #fff)' }} />
            </g>
          ))}
        </svg>
      )}

      {/* Denominator — one copy, which splits into one per jar. Centred on its jar until the
          first shard goes in, then a name-style count/denominator tag at the jar's bottom right. */}
      {Array.from({ length: wholes }, (_, j) => {
        const { tag, pos, size } = dLook(j);
        return (
          <div
            key={`d-${j}`}
            style={{
              position: 'absolute', left: pos.x, top: pos.y,
              transform: tag ? 'translate(-100%, -100%)' : 'translate(-50%, -50%)',
              transition: tag ? 'opacity 0.5s ease' : 'left 0.9s cubic-bezier(.2,.8,.3,1), top 0.9s cubic-bezier(.2,.8,.3,1), font-size 0.9s ease, transform 0.9s cubic-bezier(.2,.8,.3,1)',
              fontSize: size, fontWeight: tag ? 700 : 900, color: '#fff', zIndex: 30, pointerEvents: 'none',
              // hideCounts: the caller asks for the fraction counts to fade out early (Hybrid, while the enlarged panel shrinks).
              opacity: (j === 0 || dSplit) && !finalMoved && !hideCounts ? 1 : 0,
              ...(tag
                ? { border: `${Math.max(2, Math.round(4 * tagScale))}px solid #fff`, background: '#000', padding: `${Math.round(4 * tagScale)}px ${Math.round(12 * tagScale)}px` }
                : { textShadow: '3px 3px 0 #000, 0 0 6px #000, 0 0 12px #000' }),
            }}
          >
            {tag && (
              <>
                <div style={{ position: 'absolute', inset: 3 * tagScale, border: '1px solid #fff', pointerEvents: 'none' }} />
                {[[-6, -6], [-6, null], [null, -6], [null, null]].map(([t, l], i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 10 * tagScale, height: 10 * tagScale, background: '#fff',
                    ...(t !== null ? { top: t * tagScale } : { bottom: -6 * tagScale }),
                    ...(l !== null ? { left: l * tagScale } : { right: -6 * tagScale }),
                  }} />
                ))}
                {[[3, 3], [3, null], [null, 3], [null, null]].map(([t, l], i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 5 * tagScale, height: 5 * tagScale, background: '#fff',
                    ...(t !== null ? { top: t * tagScale } : { bottom: 3 * tagScale }),
                    ...(l !== null ? { left: l * tagScale } : { right: 3 * tagScale }),
                  }} />
                ))}
              </>
            )}
            <SparkleSpin size={phase === 'shine' ? 48 : 72} fade={dLanded} />
            {tag ? `${counts[j]}/${denominator}` : denominator}
          </div>
        );
      })}

      {/* Sweep guide (sweep mode): the ring and hand travel over a few loose shards */}
      {guide?.sweep && (
        <div key={`sweep-${guide.key}`} ref={sweepGuideRef} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', zIndex: 28 }}>
          <div style={{ position: 'absolute', left: -SWEEP_R, top: -SWEEP_R, width: SWEEP_R * 2, height: SWEEP_R * 2, borderRadius: '50%', border: '3px dashed rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.18)', boxShadow: '0 0 10px rgba(255,255,255,0.8)' }} />
          <img src="/InteractableUI/GuideCursor.png" alt="" draggable={false} style={{ position: 'absolute', left: -8, top: -4, width: 48, height: 48, imageRendering: 'pixelated' }} />
        </div>
      )}

      {/* Sweep mode: drag anywhere over the shards and each one touched flies into a jar. While the button is held the
          cursor turns into the broom (gemSweep.png), rocking right and left and throwing particles the way it moves.
          Leaves the bottom strip free so the page's Check / Confirm / Hint buttons stay clickable. */}
      {sweepMode && phase === 'play' && !finalPhase && !done && (
        <div
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            sweepingRef.current = true;
            sweepStartedRef.current = true;
            setShowSweepText(false);
            lastSweepRef.current = { x: null, dir: 1, tMove: 0 };
            broomStartRef.current = performance.now();
            sweepAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => { if (sweepingRef.current) sweepAt(e.clientX, e.clientY); }}
          onPointerUp={() => { sweepingRef.current = false; lastSweepRef.current.x = null; sweepPosRef.current = null; setSweepPos(null); }}
          onPointerCancel={() => { sweepingRef.current = false; lastSweepRef.current.x = null; sweepPosRef.current = null; setSweepPos(null); }}
          style={{ position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H - 56, zIndex: 29, pointerEvents: 'auto', touchAction: 'none', cursor: sweepPos ? 'none' : 'grab' }}
        >
          {sweepParts.map(q => (
            <div key={q.id} style={{ position: 'absolute', left: q.x, top: q.y, width: q.size, height: q.size, background: '#4a4a4a', pointerEvents: 'none', '--px': q.px + 'px', '--py': q.py + 'px', animation: 'sweepPart 0.55s ease-out forwards' }} />
          ))}
          {sweepPos && (
            <img
              src="/InteractableUI/gemSweep.png"
              alt=""
              draggable={false}
              style={{
                position: 'absolute', left: sweepPos.x - BROOM_W * 0.49, top: sweepPos.y - BROOM_W * 0.78, width: BROOM_W, height: BROOM_W,
                pointerEvents: 'none', transformOrigin: '49% 7%', animation: 'broomRock 0.34s ease-in-out infinite',
                filter: 'drop-shadow(4px 6px 3px rgba(0,0,0,0.55))',
              }}
            />
          )}
        </div>
      )}

      {/* "Sweep!" — flashes black and white in the middle a few seconds after the gem shatters, until the player starts sweeping */}
      {sweepMode && showSweepText && (phase === 'shatter' || phase === 'play') && !finalPhase && !done && (
        <div style={{
          position: 'absolute', left: STAGE_W / 2, top: STAGE_H / 2, transform: 'translate(-50%, -50%)', zIndex: 31,
          pointerEvents: 'none', fontSize: 30, fontWeight: 900, whiteSpace: 'nowrap', fontFamily: FONT,
          animation: 'sweepFlash 0.25s ease-in-out infinite',
        }}>Sweep!</div>
      )}

      {/* Idle guide: transparent shard (no sparkle behind it) dragged to a jar by the guide cursor */}
      {guide && !guide.sweep && (() => {
        const sh = guide.shard;
        const gx = jarLefts[guide.jar] + jarW / 2 - (sh.x + shardW / 2);
        const gy = midTop + jarH / 2 - (sh.y + shardH / 2);
        const anim = `guideMove ${GUIDE_LOOP_MS}ms ease-in-out forwards`;
        return (
          <div key={`guide-${guide.key}`} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none', zIndex: 28, '--gx': gx + 'px', '--gy': gy + 'px' }}>
            <div style={{ position: 'absolute', left: sh.x, top: sh.y, width: shardW, height: shardH, opacity: 0.55 }}>
              <div style={{ width: '100%', height: '100%', animation: anim }}>
                <img src="/InteractableUI/FractionGemShard.png" alt="" draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', transform: `rotate(${sh.rot}deg)` }} />
              </div>
            </div>
            <img src="/InteractableUI/GuideCursor.png" alt="" draggable={false} style={{
              position: 'absolute', left: sh.x + shardW - 8, top: sh.y + shardH - 4, width: 48, height: 48,
              imageRendering: 'pixelated', animation: anim,
            }} />
          </div>
        );
      })()}

    </div>
  );
};

export default ImproperToMixedGame;
