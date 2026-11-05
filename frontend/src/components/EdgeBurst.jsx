import { useEffect, useRef, useState } from 'react';

// Phase-complete flourish: the background, characters and HUD dim (elements tagged data-edge-dim —
// the interactable UI is left as is), white cubes and copies of the phase's word shoot out of the
// left and right screen edges along their full height, then everything returns to normal.
// Any component can fire it with triggerEdgeBurst('Circle') — the <EdgeBurst /> mounted on the
// island page picks it up, so nested components (the gem/jar game) don't need a prop for it.

const EVENT = 'wf-edge-burst';
const SHOW_MS = 1800;        // every cube/word has faded out by then
const DIM_MS = 120;          // = the 0.12s darken in game.css; removing the class then starts the smooth 1.6s return right away
const CUBES_PER_SIDE = 75;
const WORDS_PER_SIDE = 14;

export const triggerEdgeBurst = (word) => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: word }));
};

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const EdgeBurst = () => {
  const [burst, setBurst] = useState(null);
  const pidRef = useRef(0);
  const timerRef = useRef(null);
  const dimTimerRef = useRef(null);

  useEffect(() => {
    const onBurst = (e) => {
      const sides = ['left', 'right'];
      // Spread evenly from top to bottom (with jitter) so neither edge has gaps.
      const spreadY = (i, n) => ((i + Math.random()) / n) * 100;
      const cubes = sides.flatMap(side => Array.from({ length: CUBES_PER_SIDE }, (_, i) => {
        const dir = side === 'left' ? 1 : -1;
        return {
          id: pidRef.current++, side,
          y: spreadY(i, CUBES_PER_SIDE),
          dx: dir * rand(220, 680),
          dy: rand(-140, 140),
          rot: rand(-540, 540),
          size: 5 + Math.floor(Math.random() * 9),
          dur: rand(0.9, 1.5),
          delay: 0.05 + Math.random() * 0.25,
        };
      }));
      const words = sides.flatMap(side => Array.from({ length: WORDS_PER_SIDE }, (_, i) => {
        const dir = side === 'left' ? 1 : -1;
        const r0 = rand(-35, 35);
        return {
          id: pidRef.current++, side,
          y: spreadY(i, WORDS_PER_SIDE),
          dx: dir * rand(160, 480),
          dy: rand(-90, 90),
          r0, r1: r0 + rand(-25, 25),
          size: 11 + Math.floor(Math.random() * 7),
          dur: rand(1.1, 1.5),
          delay: 0.05 + Math.random() * 0.25,
        };
      }));
      // A new phase replaces whatever is still showing instead of stacking on top of it.
      setBurst({ id: pidRef.current++, word: String(e.detail || '').toUpperCase(), cubes, words });
      clearTimeout(timerRef.current);
      clearTimeout(dimTimerRef.current);
      document.body.classList.add('wf-edge-dim');
      dimTimerRef.current = setTimeout(() => document.body.classList.remove('wf-edge-dim'), DIM_MS);
      timerRef.current = setTimeout(() => setBurst(null), SHOW_MS);
    };
    window.addEventListener(EVENT, onBurst);
    return () => {
      window.removeEventListener(EVENT, onBurst);
      clearTimeout(timerRef.current); clearTimeout(dimTimerRef.current);
      document.body.classList.remove('wf-edge-dim');
    };
  }, []);

  if (!burst) return null;

  return (
    <div key={burst.id} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9500, overflow: 'hidden' }}>
      {burst.cubes.map(c => (
        <div key={c.id} style={{
          position: 'absolute', top: `${c.y}%`, [c.side]: -c.size / 2,
          width: c.size, height: c.size, background: '#fff',
          boxShadow: '0 0 6px rgba(255,255,255,0.8)',
          '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--r': `${c.rot}deg`,
          opacity: 0,
          animation: `edgeCube ${c.dur}s ease-out ${c.delay}s forwards`,
        }} />
      ))}
      {burst.words.map(w => (
        <div key={w.id} style={{
          position: 'absolute', top: `${w.y}%`, [w.side]: 0,
          fontFamily: '"Press Start 2P", monospace', fontSize: w.size, lineHeight: 1,
          color: '#fff', whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(255,255,255,0.85), 2px 2px 0 rgba(0,0,0,0.6)',
          '--dx': `${w.dx}px`, '--dy': `${w.dy}px`, '--r0': `${w.r0}deg`, '--r1': `${w.r1}deg`,
          opacity: 0,
          animation: `edgeWordShoot ${w.dur}s cubic-bezier(.15,.8,.3,1) ${w.delay}s forwards`,
        }}>{burst.word}</div>
      ))}
    </div>
  );
};

export default EdgeBurst;
