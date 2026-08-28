import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playSfx } from '../utils/audio';
import DrawingCanvas from '../components/DrawingCanvas';
import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
import ButterflyStepPanel from '../components/ButterflyStepPanel';
import MixedButterflyTutorial from '../components/MixedButterflyTutorial';
import GameMenuModal from '../components/GameMenuModal';
import './game.css';

// Rising background particles inside the interactive card — identical set/timing to
// the one used inside circleContainerRef on Similar/Dissimilar Island.
const RISE_PARTICLES = [
  { left: '3%',  size: 8,  dur: '2.2s', delay: '0s'    },
  { left: '10%', size: 5,  dur: '1.7s', delay: '-0.5s' },
  { left: '17%', size: 10, dur: '2.5s', delay: '-1.2s' },
  { left: '24%', size: 6,  dur: '1.9s', delay: '-0.8s' },
  { left: '31%', size: 9,  dur: '2.3s', delay: '-1.6s' },
  { left: '38%', size: 5,  dur: '2.0s', delay: '-0.3s' },
  { left: '45%', size: 11, dur: '2.6s', delay: '-2.0s' },
  { left: '52%', size: 6,  dur: '1.8s', delay: '-0.9s' },
  { left: '59%', size: 8,  dur: '2.4s', delay: '-1.5s' },
  { left: '66%', size: 4,  dur: '1.6s', delay: '-2.3s' },
  { left: '73%', size: 7,  dur: '2.1s', delay: '-0.6s' },
  { left: '80%', size: 5,  dur: '1.9s', delay: '-1.8s' },
  { left: '87%', size: 9,  dur: '2.3s', delay: '-1.1s' },
  { left: '93%', size: 6,  dur: '2.0s', delay: '-2.5s' },
  { left: '8%',  size: 4,  dur: '1.8s', delay: '-3.0s' },
  { left: '28%', size: 7,  dur: '2.2s', delay: '-0.4s' },
  { left: '42%', size: 5,  dur: '1.7s', delay: '-1.9s' },
  { left: '62%', size: 10, dur: '2.4s', delay: '-0.7s' },
  { left: '77%', size: 6,  dur: '2.1s', delay: '-2.8s' },
  { left: '91%', size: 8,  dur: '1.9s', delay: '-1.3s' },
];

// ─────────────────────────────────────────────────────────────────────────────
// GestureGate — inlined local component
// The book + "Draw a ___ to continue!" prompt + DrawingCanvas, gating entry into
// a solving phase. Identical chrome/timing to the circleContainerRef intro on
// Similar/Dissimilar Island; only the gesture `mode` (and therefore the magic
// circle it summons) changes.
// ─────────────────────────────────────────────────────────────────────────────
const GestureGate = ({ mode, hintText, onDetected }) => {
  const [showHint, setShowHint] = useState(true);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Rising particles */}
      {RISE_PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: 4, left: p.left,
          width: p.size, height: p.size,
          background: '#703737',
          pointerEvents: 'none', zIndex: 1,
          animation: `particleRise ${p.dur} ease-out ${p.delay} infinite`,
        }} />
      ))}

      {/* Solid background + inner border, matching the card chrome */}
      <div style={{ position: 'absolute', inset: 0, background: '#e8d5b4', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 8, border: '1px solid #703737', zIndex: 0, pointerEvents: 'none' }} />
      {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
        <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:'#703737', ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
      ))}
      {[[4,4],[null,4],[4,null],[null,null]].map(([t,l],i) => (
        <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:6, height:6, background:'#703737', ...(t!==null?{top:t}:{bottom:4}), ...(l!==null?{left:l}:{right:4}) }}/>
      ))}

      {/* Book */}
      <style>{`
        @keyframes bookFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-7px); }
        }
      `}</style>
      <img
        src="/InteractableUI/BookUI.png"
        alt="book"
        style={{
          position: 'absolute', bottom: 14, left: '50%',
          width: '140%', objectFit: 'contain',
          pointerEvents: 'none', zIndex: 1,
          animation: 'bookFloat 6s ease-in-out infinite',
        }}
      />

      {showHint && (
        <p style={{
          position: 'absolute', bottom: 16, left: '50%',
          transform: 'translateX(-50%)', margin: 0,
          color: '#ffffff', fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 3px 3px 0px rgba(0,0,0,1)',
          zIndex: 3, pointerEvents: 'none',
        }}>{hintText}</p>
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }} onPointerDown={() => { if (showHint) setShowHint(false); }}>
        <DrawingCanvas mode={mode} onCircleDetected={onDetected} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NumeratorCombinePanel — inlined local component
// The "similar" route — used once the two forged fractions share a denominator.
// Combine the numerators, then simplify. Mirrors Similar Island's own
// combine-then-simplify mechanic, styled with Hybrid's token/hint UI.
//
// Props:
//   problem         – { numerator1, numerator2, denominator1, operator }
//   onAnswerSubmit  – ({ numerator, denominator }) called once solved
// ─────────────────────────────────────────────────────────────────────────────
const NumeratorCombinePanel = ({ problem, onAnswerSubmit, onWrongAnswer }) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const { numerator1: n1, numerator2: n2, denominator1: d, operator } = problem;
  const rawResult = operator === '+' ? n1 + n2 : n1 - n2;
  const divisor = gcd(Math.abs(rawResult), d) || 1;
  const simplifiedNum = rawResult / divisor;
  const simplifiedDen = d / divisor;
  const isWhole = simplifiedDen === 1;

  const [phase, setPhase] = useState('combine'); // 'combine' | 'simplify' | 'done'
  const [inputVal, setInputVal] = useState('');
  const [simpNum, setSimpNum] = useState('');
  const [simpDen, setSimpDen] = useState('');
  const [inputError, setInputError] = useState(false);
  const [hintMsg, setHintMsg] = useState('');

  useEffect(() => {
    setInputVal(''); setSimpNum(''); setSimpDen('');
    setInputError(false); setHintMsg('');
  }, [phase]);

  const checkCombine = () => {
    const val = parseInt(inputVal);
    if (val === rawResult) {
      setPhase('simplify');
    } else {
      setInputError(true);
      setHintMsg(`${n1} ${operator} ${n2} is not ${val}. Think again!`);
      setInputVal('');
      onWrongAnswer?.(`${n1} ${operator} ${n2} = ${rawResult}, not ${val}.`, String(val), 'WRONG_COMBINE');
      setTimeout(() => { setInputError(false); setHintMsg(''); }, 1800);
    }
  };

  const checkSimplify = () => {
    const numOk = parseInt(simpNum) === simplifiedNum;
    const denOk = isWhole || parseInt(simpDen) === simplifiedDen;
    if (numOk && denOk) {
      setPhase('done');
      onAnswerSubmit({ numerator: simplifiedNum, denominator: simplifiedDen });
    } else {
      setInputError(true);
      const target = isWhole ? `${simplifiedNum}` : `${simplifiedNum}/${simplifiedDen}`;
      setHintMsg(`Not fully simplified. ${rawResult}/${d} reduces to ${target}.`);
      onWrongAnswer?.(`Simplify ${rawResult}/${d} to ${target}.`, isWhole ? simpNum : `${simpNum}/${simpDen}`, 'WRONG_SIMPLIFY');
      setTimeout(() => { setInputError(false); setHintMsg(''); }, 1800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (phase === 'combine') checkCombine();
    else if (phase === 'simplify') checkSimplify();
  };

  const token = (extra = {}) => ({
    width: 52, height: 52, borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 800, border: '3px solid #703737', fontFamily: '"Press Start 2P", monospace',
    background: '#e8d5b4', color: '#222', userSelect: 'none', ...extra,
  });

  const hintText =
    hintMsg ? hintMsg :
    phase === 'combine'  ? `Combine the numerators: ${n1} ${operator} ${n2}` :
    phase === 'simplify' ? `Simplify ${rawResult}/${d} fully` :
    `✓ ${isWhole ? simplifiedNum : `${simplifiedNum}/${simplifiedDen}`} — solved!`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ fontSize: 15, color: '#703737', fontFamily: '"Press Start 2P", monospace', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
        ✧ {phase === 'combine' ? 'Combine Numerators' : phase === 'simplify' ? 'Simplify the Result' : 'Spell Ready!'}
      </div>

      {/* Fraction visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={token()}>{n1}</div>
          <div style={{ width: 52, height: 3, background: '#eaeaea', borderRadius: 2 }} />
          <div style={token({ borderColor: '#cbb796', color: '#a89578' })}>{d}</div>
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#222' }}>{operator}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={token()}>{n2}</div>
          <div style={{ width: 52, height: 3, background: '#eaeaea', borderRadius: 2 }} />
          <div style={token({ borderColor: '#cbb796', color: '#a89578' })}>{d}</div>
        </div>
      </div>

      {/* Hint */}
      <div style={{
        fontSize: 13, fontFamily: '"Press Start 2P", monospace', color: hintMsg ? '#b91c1c' : '#222',
        background: '#e8d5b4', borderRadius: 0, padding: '8px 14px',
        border: `2px solid ${hintMsg ? '#b91c1c' : '#703737'}`,
        minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        {hintText}
      </div>

      {/* Input row */}
      {phase === 'combine' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#222', fontWeight: 700, fontSize: 15, fontFamily: '"Press Start 2P", monospace' }}>
            {n1} {operator} {n2} =
          </span>
          <input
            autoFocus type="number" value={inputVal}
            onChange={e => setInputVal(e.target.value)} onKeyDown={handleKeyDown}
            style={{
              width: 68, height: 44, textAlign: 'center', fontSize: 20, fontWeight: 800,
              fontFamily: '"Press Start 2P", monospace', background: 'transparent',
              border: `3px dashed ${inputError ? '#b91c1c' : '#222'}`, borderRadius: 0, color: '#222', outline: 'none',
            }}
          />
          <button onClick={checkCombine} style={{
            padding: '8px 16px', background: '#703737', color: '#e8d5b4', fontFamily: '"Press Start 2P", monospace',
            border: '4px solid #703737', borderRadius: 0, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>✧ Combine</button>
        </div>
      )}

      {phase === 'simplify' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isWhole ? (
            <input
              autoFocus type="number" value={simpNum} onChange={e => setSimpNum(e.target.value)} onKeyDown={handleKeyDown}
              style={{
                width: 68, height: 44, textAlign: 'center', fontSize: 20, fontWeight: 800,
                fontFamily: '"Press Start 2P", monospace', background: 'transparent',
                border: `3px dashed ${inputError ? '#b91c1c' : '#222'}`, borderRadius: 0, color: '#222', outline: 'none',
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <input
                autoFocus type="number" value={simpNum} onChange={e => setSimpNum(e.target.value)} onKeyDown={handleKeyDown}
                style={{
                  width: 60, height: 40, textAlign: 'center', fontSize: 18, fontWeight: 800,
                  fontFamily: '"Press Start 2P", monospace', background: 'transparent',
                  border: `3px dashed ${inputError ? '#b91c1c' : '#222'}`, borderRadius: 0, color: '#222', outline: 'none',
                }}
              />
              <div style={{ width: 60, height: 3, background: '#222', borderRadius: 2 }} />
              <input
                type="number" value={simpDen} onChange={e => setSimpDen(e.target.value)} onKeyDown={handleKeyDown}
                style={{
                  width: 60, height: 40, textAlign: 'center', fontSize: 18, fontWeight: 800,
                  fontFamily: '"Press Start 2P", monospace', background: 'transparent',
                  border: `3px dashed ${inputError ? '#b91c1c' : '#222'}`, borderRadius: 0, color: '#222', outline: 'none',
                }}
              />
            </div>
          )}
          <button onClick={checkSimplify} style={{
            padding: '8px 16px', background: '#703737', color: '#e8d5b4', fontFamily: '"Press Start 2P", monospace',
            border: '4px solid #703737', borderRadius: 0, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>✧ Cast Spell</button>
        </div>
      )}
    </div>
  );
};

// Detects frame count from a horizontal sprite sheet.
// Square frames (most common): width is an exact multiple of height → frame count = width / height.
// Non-square: find the smallest divisor whose frame aspect ratio is reasonable (0.5–2).
const detectFrameCount = (width, height) => {
  if (width % height === 0) return width / height;
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16]) {
    if (width % n === 0) {
      const ratio = (width / n) / height;
      if (ratio >= 0.5 && ratio <= 2) return n;
    }
  }
  return Math.max(1, Math.round(width / height));
};

const FractionBox = ({ whole, num, den }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    {whole > 0 && (
      <span style={{ fontSize: 28, fontWeight: 800, color: '#222' }}>{whole}</span>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{num}</span>
      <div style={{ width: 50, height: 3, background: '#222', borderRadius: 2, margin: '3px 0' }} />
      <span style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{den}</span>
    </div>
  </div>
);

// Where N / W / D sit on MixedMagicCircle.png, as a fraction of its rendered box —
// read off the labeled reference circle.
const CIRCLE_SIZE = 340;
const NODE_POS = {
  n: { x: 0.66, y: 0.16 },
  w: { x: 0.34, y: 0.50 },
  d: { x: 0.66, y: 0.84 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ForgeCircleStage — inlined local component
// Draw the triangle → MixedMagicCircle appears → the current fraction's whole,
// numerator, and denominator fly onto the circle's W / N / D slots — same
// bezier-arc/rAF motion, spinning-sparkle bubble, and landing burst as the
// numerator fly-in on Similar Island — then drag the denominator onto the whole
// number, then the product onto the numerator, same as before, just staged
// inside the circle instead of a separate GUI box. The book stays visible
// underneath throughout, matching Similar/Dissimilar Island.
//
// Props:
//   problem         – full problem object
//   onForgeComplete – ({ imp1: {n,d}, imp2: {n,d} }) called when both fractions are done
// ─────────────────────────────────────────────────────────────────────────────
const ForgeCircleStage = ({ problem, onForgeComplete, onWrongAnswer }) => {
  const [showHint, setShowHint] = useState(true);
  const [gestureDone, setGestureDone] = useState(false);
  const [fracIndex, setFracIndex] = useState(0);
  const initFrac = () => ({ step: 'drag_den', product: null, improper_n: null });
  const [fracs, setFracs] = useState([initFrac(), initFrac()]);
  const [bubbles, setBubbles] = useState(null); // { w:{left,top,opacity}, n:{...}, d:{...} }
  const [revealed, setRevealed] = useState({ w: false, n: false, d: false });
  const [bursts, setBursts] = useState([]); // [{id,left,top}]
  const [inputVal, setInputVal] = useState('');
  const [inputError, setInputError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  const wholeRef  = useRef(null);
  const numRef    = useRef(null);
  const circleRef = useRef(null);
  const bubbleWRef = useRef(null);
  const bubbleNRef = useRef(null);
  const bubbleDRef = useRef(null);
  const flyAnimRefs = useRef([]);
  const burstPidRef = useRef(0);

  const allLanded = revealed.w && revealed.n && revealed.d;

  const p      = problem;
  const isFirst = fracIndex === 0;
  const w      = isFirst ? p.whole1      : p.whole2;
  const n      = isFirst ? p.numerator1  : p.numerator2;
  const d      = isFirst ? p.denominator1 : p.denominator2;
  const frac   = fracs[fracIndex];

  const updateFrac = (updates) =>
    setFracs(prev => {
      const next = [...prev];
      next[fracIndex] = { ...next[fracIndex], ...updates };
      return next;
    });

  useEffect(() => {
    setInputVal('');
    setInputError(false);
  }, [frac.step, fracIndex]);

  // Fly the numbers in whenever a fraction becomes current — mirrors handleCircleDetected
  // on Similar Island: bubbles fade in at a shared source point, pause, then arc out
  // along a randomized quadratic-bezier path via requestAnimationFrame (smooth, not
  // stepped), landing with a sparkle burst before the real interactive token appears.
  useEffect(() => {
    if (!gestureDone || !circleRef.current) return;

    flyAnimRefs.current.forEach(id => cancelAnimationFrame(id));
    flyAnimRefs.current = [];
    setRevealed({ w: false, n: false, d: false });

    const SIZE = 48;
    const cRect = circleRef.current.getBoundingClientRect();
    const dest = (key) => ({
      x: cRect.left + NODE_POS[key].x * cRect.width - SIZE / 2,
      y: cRect.top  + NODE_POS[key].y * cRect.height - SIZE / 2,
    });
    const src = { x: cRect.left + cRect.width / 2 - SIZE / 2, y: cRect.top - 70 };

    const items = [
      { key: 'w', ref: bubbleWRef, to: dest('w'), delay: 0 },
      { key: 'n', ref: bubbleNRef, to: dest('n'), delay: 150 },
      { key: 'd', ref: bubbleDRef, to: dest('d'), delay: 300 },
    ];

    setBubbles({
      w: { left: src.x, top: src.y, opacity: 0 },
      n: { left: src.x, top: src.y, opacity: 0 },
      d: { left: src.x, top: src.y, opacity: 0 },
    });

    const timers = [];
    items.forEach(({ key, ref, to, delay }) => {
      const ctrl = {
        x: (src.x + to.x) / 2 + (Math.random() - 0.5) * 160,
        y: Math.min(src.y, to.y) - 70 - Math.random() * 90,
      };

      timers.push(setTimeout(() => {
        setBubbles(prev => prev && ({ ...prev, [key]: { ...prev[key], opacity: 1 } }));
        playSfx('/SoundEffects/sparkleSound.wav');

        timers.push(setTimeout(() => {
          playSfx('/SoundEffects/numberMove.wav');
          const duration = 900;
          const start = performance.now();
          const bezier = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
          const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

          const frame = (now) => {
            const raw = Math.min((now - start) / duration, 1);
            const t = easeInOut(raw);
            if (ref.current) {
              ref.current.style.left = bezier(t, src.x, ctrl.x, to.x) + 'px';
              ref.current.style.top  = bezier(t, src.y, ctrl.y, to.y) + 'px';
            }
            if (raw < 1) {
              flyAnimRefs.current.push(requestAnimationFrame(frame));
            } else {
              if (ref.current) ref.current.style.opacity = '0';
              playSfx('/SoundEffects/sparkleExplode.wav');
              const bid = burstPidRef.current++;
              setBursts(prev => [...prev, { id: bid, left: to.x + SIZE / 2, top: to.y + SIZE / 2 }]);
              setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bid)), 800);
              timers.push(setTimeout(() => {
                setRevealed(prev => ({ ...prev, [key]: true }));
                playSfx('/SoundEffects/circleAppear.wav');
              }, 300));
            }
          };
          flyAnimRefs.current.push(requestAnimationFrame(frame));
        }, 500));
      }, delay + 200));
    });

    return () => timers.forEach(clearTimeout);
  }, [gestureDone, fracIndex]);

  // ── drag ──
  const getTargetRef = () => dragTarget === 'den' ? wholeRef : numRef;

  const moveFlt = (x, y) => setFloatPos({ x: x - 28, y: y - 28 });

  const isOverTarget = (x, y) => {
    const ref = getTargetRef();
    if (!ref.current) return false;
    const r = ref.current.getBoundingClientRect();
    return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  };

  const startDrag = (e, type) => {
    e.preventDefault();
    setDragTarget(type);
    setIsDragging(true);
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    moveFlt(cx, cy);
  };

  const onMove = (e) => {
    if (!isDragging) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    moveFlt(cx, cy);
    setDropHighlight(isOverTarget(cx, cy));
  };

  const onUp = (e) => {
    if (!isDragging) return;
    const cx = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const cy = e.clientY ?? e.changedTouches?.[0]?.clientY;
    setIsDragging(false);
    setDropHighlight(false);
    if (isOverTarget(cx, cy)) {
      if (dragTarget === 'den') updateFrac({ step: 'ask_product' });
      else if (frac.step === 'ask_sum') updateFrac({ step: 'ask_sum_input' });
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  });

  // ── input checks ──
  const checkProduct = () => {
    const correct = w * d;
    const val = parseInt(inputVal);
    if (val === correct) {
      updateFrac({ product: correct, step: 'ask_sum' });
    } else {
      setInputError(true);
      setInputVal('');
      onWrongAnswer?.(`${d} × ${w} = ${correct}, not ${val}.`, String(val), 'WRONG_PRODUCT');
      setTimeout(() => setInputError(false), 1800);
    }
  };

  const checkSum = () => {
    const correct = frac.product + n;
    const val = parseInt(inputVal);
    if (val === correct) {
      updateFrac({ improper_n: correct, step: 'done' });
    } else {
      setInputError(true);
      setInputVal('');
      onWrongAnswer?.(`${frac.product} + ${n} = ${correct}, not ${val}.`, String(val), 'WRONG_SUM');
      setTimeout(() => setInputError(false), 1800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (frac.step === 'ask_product') checkProduct();
      else if (frac.step === 'ask_sum_input') checkSum();
    }
  };

  const advanceFraction = () => {
    if (fracIndex === 0) {
      setFracIndex(1);
    } else {
      onForgeComplete({
        imp1: { n: fracs[0].improper_n, d: p.denominator1 },
        imp2: { n: fracs[1].improper_n, d: p.denominator2 },
      });
    }
  };

  const handleGestureDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setGestureDone(true);
  };

  // ── token styles ──
  const token = (extra = {}) => ({
    position: 'absolute', width: 52, height: 52, borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 800, border: '3px solid', fontFamily: '"Press Start 2P", monospace',
    userSelect: 'none', transition: 'border-color 0.2s, background 0.2s, color 0.2s, box-shadow 0.2s',
    zIndex: 3, ...extra,
  });

  const landedPos = (key) => ({ left: NODE_POS[key].x * CIRCLE_SIZE - 26, top: NODE_POS[key].y * CIRCLE_SIZE - 26 });

  const wholeStyle = () => {
    const base = token({ background: '#e8d5b4', borderColor: '#703737', color: '#222', ...landedPos('w') });
    if (frac.step === 'ask_sum' || frac.step === 'ask_sum_input')
      return { ...base, background: '#dff0d8', borderColor: '#4caf50', color: '#1a3a1a', cursor: 'grab' };
    if (dropHighlight && dragTarget === 'den')
      return { ...base, borderColor: '#b91c1c', transform: 'scale(1.1)', boxShadow: '0 0 0 3px rgba(185,28,28,0.35)' };
    return base;
  };

  const numStyle = () => {
    const base = token({ background: '#e8d5b4', borderColor: '#703737', color: '#222', ...landedPos('n') });
    if (dropHighlight && dragTarget === 'product')
      return { ...base, borderColor: '#b91c1c', transform: 'scale(1.1)', boxShadow: '0 0 0 3px rgba(185,28,28,0.35)' };
    if (frac.step === 'done')
      return { ...base, background: '#dff0d8', borderColor: '#4caf50', color: '#1a3a1a' };
    return base;
  };

  const denStyle = () => {
    const draggable = frac.step === 'drag_den';
    return token({
      background: '#e8d5b4', borderColor: draggable ? '#703737' : '#cbb796',
      color: draggable ? '#703737' : '#a89578',
      cursor: draggable ? 'grab' : 'default',
      opacity: isDragging && dragTarget === 'den' ? 0.35 : 1,
      animation: draggable ? 'forgePulseDen 1.5s ease-in-out infinite' : 'none',
      ...landedPos('d'),
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Book — always visible underneath, identical to the pre-draw state */}
      <style>{`
        @keyframes bookFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-7px); }
        }
        @keyframes forgePulseDen {
          0%,100% { box-shadow: 0 0 0 0 rgba(112,55,55,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(112,55,55,0); }
        }
      `}</style>
      <img
        src="/InteractableUI/BookUI.png"
        alt="book"
        style={{
          position: 'absolute', bottom: 14, left: '50%',
          width: '140%', objectFit: 'contain',
          pointerEvents: 'none', zIndex: 1,
          animation: 'bookFloat 6s ease-in-out infinite',
        }}
      />

      {!gestureDone ? (
        <>
          {showHint && (
            <p style={{
              position: 'absolute', bottom: 16, left: '50%',
              transform: 'translateX(-50%)', margin: 0,
              color: '#ffffff', fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap',
              textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 3px 3px 0px rgba(0,0,0,1)',
              zIndex: 3, pointerEvents: 'none',
            }}>Draw a triangle to continue!</p>
          )}
          <div style={{ position: 'absolute', inset: 0, zIndex: 3 }} onPointerDown={() => { if (showHint) setShowHint(false); }}>
            <DrawingCanvas mode="triangle" onCircleDetected={handleGestureDetected} />
          </div>
        </>
      ) : (
        <div
          ref={circleRef}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: CIRCLE_SIZE, height: CIRCLE_SIZE, zIndex: 2,
          }}
        >
          <img
            src="/InteractableUI/MixedMagicCircle.png"
            alt="magic circle"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', animation: 'magicFloat 4s ease-in-out infinite', zIndex: 1 }}
          />

          {/* Whole number token — only once its bubble has landed */}
          {revealed.w && (
            <div
              ref={wholeRef}
              style={wholeStyle()}
              onMouseDown={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
              onTouchStart={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
            >
              {(frac.step === 'ask_sum' || frac.step === 'ask_sum_input') ? frac.product : w}
            </div>
          )}

          {/* Numerator token */}
          {revealed.n && (
            <div ref={numRef} style={numStyle()}>
              {frac.step === 'done' ? frac.improper_n : n}
            </div>
          )}

          {/* Denominator token */}
          {revealed.d && (
            <div
              style={denStyle()}
              onMouseDown={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
              onTouchStart={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
            >
              {d}
            </div>
          )}

          {/* Input row — floating in the open space below the circle's nodes */}
          {allLanded && (frac.step === 'ask_product' || frac.step === 'ask_sum_input') && (
            <div style={{
              position: 'absolute', top: CIRCLE_SIZE * 0.60, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap', zIndex: 4,
            }}>
              <input
                autoFocus type="number" value={inputVal}
                onChange={e => setInputVal(e.target.value)} onKeyDown={handleKeyDown}
                style={{
                  width: 60, height: 40, textAlign: 'center', fontSize: 18, fontWeight: 800,
                  fontFamily: '"Press Start 2P", monospace', background: 'rgba(232,213,180,0.9)',
                  border: `3px dashed ${inputError ? '#b91c1c' : '#703737'}`, borderRadius: 0, color: '#222', outline: 'none',
                }}
              />
              <button
                onClick={frac.step === 'ask_product' ? checkProduct : checkSum}
                style={{
                  padding: '6px 12px', background: '#703737', color: '#e8d5b4', fontFamily: '"Press Start 2P", monospace',
                  border: '3px solid #703737', borderRadius: 0, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                }}
              >⚒</button>
            </div>
          )}

          {/* Done — continue */}
          {allLanded && frac.step === 'done' && (
            <button
              onClick={advanceFraction}
              style={{
                position: 'absolute', top: CIRCLE_SIZE * 0.60, left: '50%', transform: 'translateX(-50%)',
                padding: '8px 20px', background: '#703737', color: '#e8d5b4', fontFamily: '"Press Start 2P", monospace',
                border: '3px solid #703737', borderRadius: 0, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                whiteSpace: 'nowrap', zIndex: 4,
              }}
            >
              {fracIndex === 0 ? 'Next Fraction →' : 'Start Solving →'}
            </button>
          )}
        </div>
      )}

      {/* Fixed-position overlays (flying bubbles, landing bursts, drag preview) are
          portaled straight to document.body. They're positioned in true viewport
          coordinates (getBoundingClientRect / clientX/clientY), but this component
          sits inside an ancestor with `transform: scale(...)` (the panel's
          viewport-fit wrapper) — even at scale 1, a non-`none` transform makes that
          ancestor the containing block for `position: fixed` descendants, which
          would otherwise silently mis-place everything here. */}
      {createPortal(
        <>
          {/* Flying number bubbles — spinning sparkle behind a plain number, no
              border, matching the numerator fly-in on Similar/Dissimilar Island */}
          {bubbles && (['w', 'n', 'd']).map(key => (
            <div
              key={key}
              ref={key === 'w' ? bubbleWRef : key === 'n' ? bubbleNRef : bubbleDRef}
              style={{
                position: 'fixed',
                left: bubbles[key].left, top: bubbles[key].top,
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, pointerEvents: 'none',
                opacity: bubbles[key].opacity,
                transition: 'opacity 0.3s ease',
              }}
            >
              <img
                src="/OtherEffects/BlueSparkle.png"
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'sparkleSpin 1.2s linear infinite', pointerEvents: 'none' }}
              />
              <span style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
                {key === 'w' ? w : key === 'n' ? n : d}
              </span>
            </div>
          ))}

          {/* Landing bursts */}
          {bursts.map(b => (
            <img
              key={b.id} src="/OtherEffects/BlueSparkle.png" alt=""
              style={{
                position: 'fixed', left: b.left, top: b.top,
                width: 72, height: 72, pointerEvents: 'none', zIndex: 9998,
                animation: 'sparkBurst 0.8s ease-out forwards',
              }}
            />
          ))}

          {/* Floating drag token */}
          {isDragging && (
            <div style={{
              position: 'fixed', left: floatPos.x, top: floatPos.y,
              width: 52, height: 52, borderRadius: 0,
              background: '#e8d5b4', border: '3px solid #703737',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: '#703737', fontFamily: '"Press Start 2P", monospace',
              pointerEvents: 'none', zIndex: 9999,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {dragTarget === 'den' ? d : frac.product}
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HybridIslandGame
// ─────────────────────────────────────────────────────────────────────────────
const HybridIslandGame = ({
  studentId,
  studentNickname,
  selectedCharacter,
  gameSession,
  onGameEnd,
  onExitToLobby,
}) => {
  // ── game state ──
  const [playerHealth,   setPlayerHealth]   = useState(gameSession.lives);
  const [enemyLives,     setEnemyLives]     = useState(3);
  const [score,          setScore]          = useState(0);
  const [streak,         setStreak]         = useState(0);
  const [multiplier,     setMultiplier]     = useState(1.0);
  const [currentStep,    setCurrentStep]    = useState(1);
  const [feedback,       setFeedback]       = useState('');
  const [feedbackType,   setFeedbackType]   = useState('');
  const [currentHint,    setCurrentHint]    = useState('');
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [gameOver,       setGameOver]       = useState(false);
  const [showExitModal,  setShowExitModal]  = useState(false);
  const [hasSeenMixedTutorial, setHasSeenMixedTutorial] = useState(false);

  const [problem,          setProblem]          = useState(() => generateProblem());
  // stage: 'forge' -> 'route-gesture' -> 'similar' | 'butterfly'
  // ('forge' itself gates on the triangle-draw gesture internally, see ForgeCircleStage)
  const [stage,            setStage]            = useState(() => problem.isMixed ? 'forge' : 'route-gesture');
  const [butterflyProblem, setButterflyProblem] = useState(problem);
  const [bgShift] = useState(null);
  const [envParticles,     setEnvParticles]     = useState([]);

  // Bottom-anchored, scale-to-fit interactive panel (mirrors Similar/Dissimilar Island)
  // The card itself is a fixed 400x440 — identical to the circleContainerRef box on
  // Similar/Dissimilar Island. PANEL_W/H describe the whole unit (card + Cast Spell
  // button) for the outer viewport-fit scale.
  const CARD_W = 400, CARD_H = 440, CARD_PAD = 16, CARD_BORDER = 4;
  const CARD_INNER_W = CARD_W - 2 * (CARD_PAD + CARD_BORDER);
  const CARD_INNER_H = CARD_H - 2 * (CARD_PAD + CARD_BORDER);
  const PANEL_W = CARD_W, PANEL_H = 500;

  const rectWrapperRef = useRef(null);
  const rectScaleRef = useRef(1);
  const [rectScale, setRectScale] = useState(1);

  useEffect(() => {
    if (!rectWrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const s = Math.max(0.1, Math.min(1, width / PANEL_W, (height - 50) / PANEL_H));
      rectScaleRef.current = s;
      setRectScale(s);
    });
    obs.observe(rectWrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // Fits Hybrid's own content (forge tokens / butterfly diagram, which are sized
  // differently than Similar/Dissimilar's circle) into the standardized 400x440 card
  // without changing the card's own dimensions.
  const cardContentRef = useRef(null);
  const [contentScale, setContentScale] = useState(1);

  useEffect(() => {
    const el = cardContentRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.scrollWidth, h = el.scrollHeight;
      if (!w || !h) return;
      setContentScale(Math.min(1, CARD_INNER_W / w, CARD_INNER_H / h));
    };
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    measure();
    return () => obs.disconnect();
  }, [stage]);

  // ── sprite / combat visuals (mirrors Similar/Dissimilar Island) ──
  const [wizardAnim,      setWizardAnim]      = useState('idle');
  const [enemyAnim,       setEnemyAnim]        = useState('idle');
  const [enemyData,       setEnemyData]        = useState(null); // { type, level, name, hp }
  const [enemyName,       setEnemyName]        = useState('Enemy');
  const [playerFlashing,  setPlayerFlashing]   = useState(false);
  const [enemyFlashing,   setEnemyFlashing]    = useState(false);
  const [fireball,        setFireball]         = useState(null);
  const [enemySpriteInfo, setEnemySpriteInfo]  = useState({
    idle:   { frames: 4, frameW: 280, frameH: 280, missing: false },
    attack: { frames: 4, frameW: 280, frameH: 280, missing: false },
    hit:    { frames: 4, frameW: 280, frameH: 280, missing: false },
  });
  const enemySpriteInfoRef = useRef(enemySpriteInfo);
  const wizardAnimTimerRef = useRef(null);
  const enemyAnimTimerRef  = useRef(null);
  const playerBoxRef = useRef(null);
  const enemyBoxRef  = useRef(null);
  const onHitRef     = useRef(null);

  const butterflyPanelRef = useRef(null);
  const envPidRef = useRef(0);

  const showMixedTutorial = problem.isMixed && !hasSeenMixedTutorial;

  // Parse enemyData.txt and apply matching enemy for this level
  useEffect(() => {
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => {
        const sections = text.split('===').filter(s => s.trim());
        for (const section of sections) {
          const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
          if (lines[0] !== 'hybridIsland') continue;
          const blocks = section.split('---').slice(1);
          for (const rawBlock of blocks) {
            const content = rawBlock.split('+++')[0].trim();
            if (!content) continue;
            const enemy = {};
            content.split('\n').forEach(line => {
              const idx = line.indexOf(':');
              if (idx !== -1) enemy[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            });
            if (parseInt(enemy.level) === (gameSession.level || 1)) {
              const parsed = {
                type:  ['normal', 'miniboss', 'boss'].includes(enemy.type) ? enemy.type : 'normal',
                level: parseInt(enemy.level),
                name:  enemy.name || 'Enemy',
                hp:    parseInt(enemy.hp) || 3,
              };
              setEnemyData(parsed);
              setEnemyName(parsed.name);
            }
          }
        }
      })
      .catch(() => {});
  }, [gameSession.level]);

  // Load each PNG sprite sheet, auto-detect frame count, and compute proportional display size
  useEffect(() => {
    if (!enemyData) return;
    const MAX = 280;
    const reset = { idle: { frames: 4, frameW: MAX, frameH: MAX, missing: false }, attack: { frames: 4, frameW: MAX, frameH: MAX, missing: false }, hit: { frames: 4, frameW: MAX, frameH: MAX, missing: false } };
    enemySpriteInfoRef.current = reset;
    setEnemySpriteInfo(reset);

    ['idle', 'attack', 'hit'].forEach(anim => {
      const img = new Image();
      img.onload = () => {
        const frames    = detectFrameCount(img.naturalWidth, img.naturalHeight);
        const natFrameW = img.naturalWidth / frames;
        const natFrameH = img.naturalHeight;
        const scale  = Math.min(MAX / natFrameW, MAX / natFrameH);
        const frameW = Math.round(natFrameW * scale);
        const frameH = Math.round(natFrameH * scale);
        const info = { frames, frameW, frameH, missing: false };
        enemySpriteInfoRef.current = { ...enemySpriteInfoRef.current, [anim]: info };
        setEnemySpriteInfo(prev => ({ ...prev, [anim]: info }));
      };
      img.onerror = () => {
        const info = { frames: 4, frameW: MAX, frameH: MAX, missing: true };
        enemySpriteInfoRef.current = { ...enemySpriteInfoRef.current, [anim]: info };
        setEnemySpriteInfo(prev => ({ ...prev, [anim]: info }));
      };
      img.src = `/enemyAssets/hybridIsland/${enemyData.name}/${anim}.png`;
    });
  }, [enemyData?.name]);

  useEffect(() => { if (enemyAttacking) playEnemyAnim('attack'); }, [enemyAttacking]);
  useEffect(() => { if (enemyFlashing)  playEnemyAnim('hit');    }, [enemyFlashing]);
  useEffect(() => { if (playerFlashing) playWizardAnim('hurt');  }, [playerFlashing]);

  // Crystal & mysticflower environmental particles — rain from top-right to bottom-left
  useEffect(() => {
    const spawn = () => {
      const type = Math.random() < 0.5 ? 'crystal' : 'mysticflower';
      const size = 20 + Math.random() * 24;
      const dur  = 5 + Math.random() * 5;
      const id   = envPidRef.current++;
      const p = {
        id, type, size, dur,
        startX: 30 + Math.random() * 70,   // % from left (wide top-right zone)
        startY: -(size + Math.random() * 10),
        dx: `${-(50 + Math.random() * 30)}vw`,
        dy: `${85 + Math.random() * 20}vh`,
        r1: `${(Math.random() - 0.5) * 40}deg`,
        r2: `${(Math.random() - 0.5) * 80}deg`,
        jx1: `${(Math.random() - 0.5) * 6}vw`,  jy1: `${(Math.random() - 0.5) * 4}vh`,
        jx2: `${(Math.random() - 0.5) * 8}vw`,  jy2: `${(Math.random() - 0.5) * 6}vh`,
      };
      setEnvParticles(prev => [...prev, p]);
      setTimeout(() => setEnvParticles(prev => prev.filter(x => x.id !== id)), dur * 1000 + 500);
    };
    // Spawn 3 at startup for immediate density
    spawn(); spawn(); spawn();
    const iv = setInterval(() => {
      spawn();
      if (Math.random() < 0.5) spawn(); // 50% chance of a second particle per tick
    }, 400 + Math.random() * 400);
    return () => clearInterval(iv);
  }, []);

  // ── helpers ──
  function generateProblem() {
    const isMixed  = true;
    const operator = Math.random() > 0.5 ? '+' : '-';
    // Whether the two forged fractions end up sharing a denominator ("similar", routed
    // to the numerator-combine mechanic) or not ("dissimilar", routed to the butterfly
    // cross-multiply mechanic) is decided here, since forging an improper fraction never
    // changes its denominator.
    const sameDenominator = Math.random() < 0.5;
    const d1 = Math.floor(Math.random() * 6) + 2;
    let   d2;
    if (sameDenominator) {
      d2 = d1;
    } else {
      d2 = Math.floor(Math.random() * 6) + 2;
      while (d2 === d1) d2 = Math.floor(Math.random() * 6) + 2;
    }
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
    const w1 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;
    const w2 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;
    if (operator === '-') {
      if (w1 + n1 / d1 < w2 + n2 / d2)
        return { whole1: w2, numerator1: n2, denominator1: d2, whole2: w1, numerator2: n1, denominator2: d1, operator, isMixed };
    }
    return { whole1: w1, numerator1: n1, denominator1: d1, whole2: w2, numerator2: n2, denominator2: d2, operator, isMixed };
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const getCorrectAnswerStr = (p = butterflyProblem) => {
    const imp1 = p.whole1 * p.denominator1 + p.numerator1;
    const imp2 = p.whole2 * p.denominator2 + p.numerator2;
    if (p.denominator1 === p.denominator2) {
      const result = p.operator === '+' ? imp1 + imp2 : imp1 - imp2;
      const divisor = gcd(Math.abs(result), p.denominator1) || 1;
      const sn = result / divisor, sd = p.denominator1 / divisor;
      return sd === 1 ? `${sn}` : `${sn}/${sd}`;
    }
    const cross1 = imp1 * p.denominator2;
    const cross2 = imp2 * p.denominator1;
    const commonDenom = p.denominator1 * p.denominator2;
    const sumDiff = p.operator === '+' ? cross1 + cross2 : cross1 - cross2;
    const divisor = gcd(Math.abs(sumDiff), commonDenom);
    return `${sumDiff / divisor}/${commonDenom / divisor}`;
  };

  const getProblemStatement = (p = problem) =>
    p.isMixed
      ? `${p.whole1} ${p.numerator1}/${p.denominator1} ${p.operator} ${p.whole2} ${p.numerator2}/${p.denominator2}`
      : `${p.numerator1}/${p.denominator1} ${p.operator} ${p.numerator2}/${p.denominator2}`;

  const renderHearts = (count, max) =>
    Array.from({ length: max }, (_, i) => (
      <img
        key={i}
        src="/InteractableUI/HeartSprite.png"
        alt="heart"
        style={{
          width: 24, height: 24, objectFit: 'contain',
          opacity: i < count ? 1 : 0.25,
          filter: i < count ? 'none' : 'grayscale(1)',
        }}
      />
    ));

  const corners = (color) => (
    <>
      <div style={{ position: 'absolute', inset: 5, border: `1px solid ${color}`, pointerEvents: 'none' }} />
      {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
        <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:10, height:10, background:color, ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
      ))}
      {[[3,3],[null,3],[3,null],[null,null]].map(([t,l],i) => (
        <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:5, height:5, background:color, ...(t!==null?{top:t}:{bottom:3}), ...(l!==null?{left:l}:{right:3}) }}/>
      ))}
    </>
  );

  // ── API ──
  const saveSpellAttempt = async (attempt) => {
    try {
      const res = await fetch(
        `http://localhost:8082/api/game-progress/spell-attempt/${gameSession.sessionId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt) }
      );
      if (!res.ok) console.error('Failed to save spell attempt');
    } catch (err) { console.error('Error saving spell attempt:', err); }
  };

  const saveGameEnd = async (status, isWon) => {
    try {
      const res = await fetch(
        `http://localhost:8082/api/game-progress/end-session/${gameSession.sessionId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, isWon, hintsUsed: 0 }) }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error('saveGameEnd failed:', res.status, body);
      }
    } catch (err) { console.error('Error saving game end:', err); }
  };

  const handleExitGame = () => setShowExitModal(true);

  const confirmExit = async () => {
    setShowExitModal(false);
    await saveGameEnd('PAUSED', false);
    onExitToLobby();
  };

  // ── sprite animation triggers (mirrors Similar/Dissimilar Island) ──
  const isWitch = selectedCharacter?.name?.toLowerCase().includes('girl');

  const playWizardAnim = (anim) => {
    const frameCount = isWitch
      ? { attack1: 10, attack2: 4, hurt: 3 }
      : { attack1: 7,  attack2: 9, hurt: 4 };
    if (wizardAnimTimerRef.current) clearTimeout(wizardAnimTimerRef.current);
    setWizardAnim(anim);
    wizardAnimTimerRef.current = setTimeout(() => setWizardAnim('idle'), (frameCount[anim] / 10) * 1000);
  };

  const playEnemyAnim = (anim) => {
    if (enemyAnimTimerRef.current) clearTimeout(enemyAnimTimerRef.current);
    setEnemyAnim(anim);
    const frames = enemySpriteInfoRef.current[anim]?.frames || 4;
    enemyAnimTimerRef.current = setTimeout(() => setEnemyAnim('idle'), (frames / 10) * 1000);
  };

  const launchFireball = (onHit) => {
    const pBox = playerBoxRef.current;
    const eBox = enemyBoxRef.current;
    const SIZE = 120;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pr = pBox ? pBox.getBoundingClientRect()
      : { left: vw * 0.1, right: vw * 0.28, top: vh * 0.35, height: vh * 0.3, width: vw * 0.18 };
    const er = eBox ? eBox.getBoundingClientRect()
      : { left: vw * 0.72, right: vw * 0.9, top: vh * 0.35, height: vh * 0.3, width: vw * 0.18 };
    const sx = pr.right - SIZE / 2;
    const sy = pr.top   + pr.height / 2 - SIZE / 2;
    const ex = er.left  + er.width  / 2 - SIZE / 2;
    const ey = er.top   + er.height / 2 - SIZE / 2;

    onHitRef.current = onHit;
    playSfx('/SoundEffects/spellCast.wav');
    setFireball({ sx, sy, ex, ey, flying: false });

    setTimeout(() => {
      playSfx('/SoundEffects/spellThrow.wav');
      setFireball({ sx, sy, ex, ey, flying: true });
    }, 800);
  };

  // ── gesture gates ──
  const handleRouteGestureDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setStage(butterflyProblem.denominator1 === butterflyProblem.denominator2 ? 'similar' : 'butterfly');
  };

  // ── forge complete ──
  const handleForgeComplete = ({ imp1, imp2 }) => {
    const patched = {
      whole1: 0, numerator1: imp1.n, denominator1: imp1.d,
      whole2: 0, numerator2: imp2.n, denominator2: imp2.d,
      operator: problem.operator, isMixed: false,
    };
    setButterflyProblem(patched);
    setStage('route-gesture');
    setCurrentStep(1);
    setCurrentHint('');
  };

  // ── butterfly callbacks ──
  const resolveCorrectAnswer = async ({ numerator, denominator }) => {
    const newStreak     = streak + 1;
    const newMultiplier = Math.min(2.0, 1.0 + Math.max(0, newStreak - 3) * 0.2);
    const pointsEarned  = Math.floor(100 * newMultiplier);
    const newScore      = score + pointsEarned;
    const newEnemyLives = Math.max(0, enemyLives - 1);

    setStreak(newStreak);
    setMultiplier(newMultiplier);
    setScore(newScore);
    setEnemyLives(newEnemyLives);
    setCurrentHint('');
    setFeedback(`✓ Correct! +${pointsEarned} points`);
    setFeedbackType('correct');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId, mechanicType: gameSession.mechanicType || 'HYBRID',
      problemStatement: getProblemStatement(), answerSubmitted: `${numerator}/${denominator}`,
      correctAnswer: getCorrectAnswerStr(), isCorrect: true, errorType: null,
      remainingLives: playerHealth, streakCount: newStreak, multiplierValue: newMultiplier,
      enemyHealthBefore: enemyLives * 33, enemyHealthAfter: newEnemyLives * 33, pointsEarned,
    });

    if (newEnemyLives <= 0) {
      await saveGameEnd('COMPLETED', true);
      setTimeout(() => onGameEnd({ isWon: true, score: newScore }), 1500);
      return;
    }

    setTimeout(() => {
      const next = generateProblem();
      setProblem(next);
      setButterflyProblem(next);
      setStage(next.isMixed ? 'forge' : 'route-gesture');
      setFeedback('');
      setFeedbackType('');
      setCurrentStep(1);
    }, 1500);
  };

  const handleAnswerSubmit = (payload) => {
    playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
    setTimeout(() => launchFireball(() => resolveCorrectAnswer(payload)), 500);
  };

  const handleWrongAnswer = async (hint, submittedValue, errorType) => {
    const newLives = playerHealth - 1;
    setPlayerHealth(newLives);
    setStreak(0);
    setMultiplier(1.0);
    setEnemyAttacking(true);
    setPlayerFlashing(true);
    setTimeout(() => setPlayerFlashing(false), 500);
    if (hint) setCurrentHint(hint);
    setFeedback(`✗ Wrong! ${hint || 'Try again.'}`);
    setFeedbackType('incorrect');
    playSfx('/VoiceLines/castFailure.wav');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId, mechanicType: gameSession.mechanicType || 'HYBRID',
      problemStatement: getProblemStatement(), answerSubmitted: String(submittedValue ?? ''),
      correctAnswer: getCorrectAnswerStr(), isCorrect: false,
      errorType: errorType || 'INCORRECT_ANSWER', remainingLives: newLives,
      streakCount: 0, multiplierValue: 1.0,
      enemyHealthBefore: enemyLives * 33, enemyHealthAfter: enemyLives * 33, pointsEarned: 0,
    });

    if (newLives <= 0) {
      await saveGameEnd('FAILED', false);
      setTimeout(() => setGameOver(true), 800);
    } else {
      setTimeout(() => { setEnemyAttacking(false); setFeedback(''); setFeedbackType(''); }, 4000);
    }
  };

  const isSimilarCase = butterflyProblem.denominator1 === butterflyProblem.denominator2;

  // ── render ──
  return (
    <div
      className="wireframe-game-container"
      style={{
        position: 'relative',
        height: '100svh', overflow: 'hidden',
        padding: '20px 20px 0', fontFamily: '"Press Start 2P", monospace', fontSize: '13px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        boxSizing: 'border-box',
      }}
    >
      {/* Bobbing background layer — outer div bobs (transform), inner div shifts position on answer */}
      <div style={{ position: 'absolute', inset: '-20px', animation: 'bgBob 12s ease-in-out infinite', zIndex: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/InMatchUIElements/HybridIsland/MysticCombatBackground.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            animation: bgShift === 'right'        ? 'bgShiftRight  0.6s ease-out forwards'
                     : bgShift === 'left'         ? 'bgShiftLeft   0.6s ease-out forwards'
                     : bgShift === 'return-right' ? 'bgReturnRight 0.7s ease-in-out forwards'
                     : bgShift === 'return-left'  ? 'bgReturnLeft  0.7s ease-in-out forwards'
                     : 'none',
          }}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', padding: '8px 0', gap: '10px', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', border: '4px solid #703737', background: '#e8d5b4', padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          {corners('#703737')}
          <span style={{ color: '#222', fontSize: '13px' }}>Streak: x{multiplier.toFixed(1)}</span>
          <span style={{ color: '#222', fontSize: '13px' }}>Score: {score}</span>
          <span style={{ color: '#222', fontSize: '13px' }}>Level: {gameSession.level || 1}/7</span>
        </div>

        {currentHint && (
          <div
            key={currentHint}
            style={{
              position: 'relative', border: '4px solid #fff', background: '#000', color: '#fff',
              fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 12px', margin: '0 88px', flex: 1, whiteSpace: 'nowrap',
              animation: 'hintReveal 0.8s ease-out forwards',
            }}
          >
            {corners('#fff')}
            💡 {currentHint}
          </div>
        )}

        <button
          onClick={handleExitGame}
          style={{
            position: 'relative', padding: '8px 16px', fontSize: 13, fontWeight: 700,
            fontFamily: '"Press Start 2P", monospace', background: '#e8d5b4', border: '4px solid #703737',
            borderRadius: 0, color: '#222', cursor: 'pointer',
          }}
        >
          {corners('#703737')}
          Menu
        </button>
      </div>

      {/* Battle area */}
      <div
        className="wireframe-battle-area"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}
      >
        <div
          className="wireframe-main-battle"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', flex: 1, minHeight: 0, padding: '10px 0 0', gap: 0, overflow: 'hidden' }}
        >

          {/* Player */}
          <div className="wireframe-player" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginRight: '36px', flexShrink: 0, position: 'relative' }}>
            <div ref={playerBoxRef} style={{ width: '320px', height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              {(() => {
                const FRAMES = isWitch
                  ? { idle: 7, attack1: 10, attack2: 4, hurt: 3 }
                  : { idle: 8, attack1: 7,  attack2: 9, hurt: 4 };
                const charKey = isWitch ? 'witch' : 'wizard';
                const n = FRAMES[wizardAnim];
                const DISP = 420;
                const kf = `${charKey}_${wizardAnim}`;
                const sprAnim = `${kf} ${(n / 10).toFixed(2)}s steps(${n}) ${wizardAnim === 'idle' ? 'infinite' : '1 forwards'}`;
                const combined = playerFlashing
                  ? `${sprAnim}, enemyFlash 0.5s ease-out, damageShake 0.5s ease-out`
                  : sprAnim;
                const capAnim = wizardAnim[0].toUpperCase() + wizardAnim.slice(1);
                return (
                  <>
                    <style>{`@keyframes ${kf} { to { background-position-x: -${n * DISP}px; } }`}</style>
                    <div style={{
                      position: 'absolute',
                      bottom: 40,
                      left: `calc(50% - ${DISP / 2}px + ${isWitch ? 30 : 0}px)`,
                      zIndex: 1,
                      width: DISP, height: DISP,
                      backgroundImage: `url(/PlayerAssets/${charKey}/${charKey}${capAnim}.png)`,
                      backgroundSize: `${n * DISP}px ${DISP}px`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: '0px 0px',
                      animation: combined,
                      imageRendering: 'pixelated',
                    }} />
                  </>
                );
              })()}
              {/* Platform at bottom of character box, above Player label */}
              <img
                src="/InMatchUIElements/HybridIsland/HybridIslandPlatform.png"
                alt="platform"
                style={{
                  position: 'absolute', bottom: '-50px', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '120%', objectFit: 'contain',
                  pointerEvents: 'none', zIndex: 0,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '40px' }}>
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 18px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                {corners('#fff')}{studentNickname || 'Player'}
              </div>
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {corners('#fff')}{renderHearts(playerHealth, 3)}
              </div>
            </div>
          </div>

          {/* Center — problem display + interactive solving panel */}
          <div className="wireframe-problem" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '32px', minHeight: 0, overflow: 'hidden', zIndex: 1 }}>
            <div style={{ animation: 'magicFloat 3s ease-in-out infinite', position: 'relative' }}>
              <div
                key={`${problem.whole1}-${problem.numerator1}-${problem.denominator1}-${problem.whole2}-${problem.numerator2}-${problem.denominator2}`}
                className="problem-fade-in"
                style={{
                  position: 'relative', background: '#e8d5b4', border: '4px solid #703737', borderRadius: 0,
                  padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                {corners('#703737')}
                <FractionBox whole={problem.whole1} num={problem.numerator1} den={problem.denominator1} />
                <span style={{ fontSize: 32, fontWeight: 800, color: '#222' }}>{problem.operator}</span>
                <FractionBox whole={problem.whole2} num={problem.numerator2} den={problem.denominator2} />
                <span style={{ fontSize: 28, fontWeight: 800, color: '#555' }}>= ?</span>
              </div>
            </div>

            {/* Bottom-anchored, scale-to-fit wrapper — matches Similar/Dissimilar Island */}
            <div
              ref={rectWrapperRef}
              style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%' }}
            >
              <div style={{
                width: PANEL_W,
                flexShrink: 0,
                transform: `scale(${rectScale})`,
                transformOrigin: 'bottom center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                marginBottom: '50px',
              }}>
                <div style={{
                  position: 'relative',
                  width: CARD_W,
                  height: CARD_H,
                  boxSizing: 'border-box',
                  background: '#e8d5b4',
                  border: `${CARD_BORDER}px solid #703737`,
                  borderRadius: 0, padding: CARD_PAD,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {corners('#703737')}
                  {stage === 'forge' ? (
                    <ForgeCircleStage problem={problem} onForgeComplete={handleForgeComplete} onWrongAnswer={handleWrongAnswer} />
                  ) : stage === 'route-gesture' ? (
                    <GestureGate
                      mode={isSimilarCase ? 'circle' : 'infinity'}
                      hintText={isSimilarCase ? 'Draw a circle to continue!' : 'Draw an infinity to continue!'}
                      onDetected={handleRouteGestureDetected}
                    />
                  ) : (
                    <div
                      ref={cardContentRef}
                      style={{
                        transform: `scale(${contentScale})`,
                        transformOrigin: 'center center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                      }}
                    >
                      {stage === 'similar' ? (
                        <NumeratorCombinePanel problem={butterflyProblem} onAnswerSubmit={handleAnswerSubmit} onWrongAnswer={handleWrongAnswer} />
                      ) : (
                        <>
                          <ButterflyDiagramCanvas problem={butterflyProblem} currentStep={currentStep} />
                          <ButterflyStepPanel
                            ref={butterflyPanelRef}
                            problem={butterflyProblem}
                            onAnswerSubmit={handleAnswerSubmit}
                            onWrongAnswer={handleWrongAnswer}
                            onStepCorrect={() => setCurrentHint('')}
                            onStepChange={(step) => setCurrentStep(step)}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Cast Spell button — butterfly phase only (Forge and Similar have their own inline submit buttons) */}
                {stage === 'butterfly' && (
                  <button
                    onClick={() => butterflyPanelRef.current?.submitCurrentStep()}
                    style={{
                      position: 'relative', padding: '10px 40px', fontSize: '13px', fontWeight: 700,
                      fontFamily: '"Press Start 2P", monospace',
                      background: '#703737', color: '#e8d5b4', border: '4px solid #703737', borderRadius: 0, cursor: 'pointer',
                    }}
                  >
                    {corners('#703737')}
                    Cast Spell
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Enemy */}
          <div className="wireframe-enemy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginLeft: '36px', flexShrink: 0 }}>
            <div ref={enemyBoxRef} style={{ width: '320px', height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              {(() => {
                const info = enemySpriteInfo[enemyAnim] || enemySpriteInfo.idle;
                const { frames, frameW, frameH } = info;
                const BOX = 280;
                const safeName = (enemyData?.name || 'unknown').replace(/\s+/g, '_');
                const kf = `enemy_${safeName}_${enemyAnim}`;
                const sprAnim = `${kf} ${(frames / 10).toFixed(2)}s steps(${frames}) ${enemyAnim === 'idle' ? 'infinite' : '1 forwards'}`;
                const combined = enemyFlashing
                  ? `${sprAnim}, enemyFlash 0.5s ease-out, damageShake 0.5s ease-out`
                  : sprAnim;
                if (info.missing) return (
                  <div style={{
                    position: 'absolute', bottom: 0, left: `calc(50% - ${BOX / 2}px)`, zIndex: 1,
                    width: BOX, height: BOX, border: '3px dashed #f87171', background: 'rgba(0,0,0,0.75)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontFamily: '"Press Start 2P", monospace', color: '#f87171',
                  }}>
                    <span style={{ fontSize: 36 }}>???</span>
                    <span style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>Missing<br/>Sprite</span>
                  </div>
                );
                return (
                  <>
                    <style>{`@keyframes ${kf} { to { background-position-x: -${frames * frameW}px; } }`}</style>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: `calc(50% - ${frameW / 2}px)`,
                      zIndex: 1,
                      width: frameW,
                      height: frameH,
                      transform: 'scaleX(-1)',
                      backgroundImage: `url(/enemyAssets/hybridIsland/${enemyData?.name}/${enemyAnim}.png)`,
                      backgroundSize: `${frames * frameW}px ${frameH}px`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: '0px 0px',
                      animation: combined,
                      imageRendering: 'pixelated',
                    }} />
                  </>
                );
              })()}
              {/* Platform at bottom of enemy box, above Enemy label */}
              <img
                src="/InMatchUIElements/HybridIsland/HybridIslandPlatform.png"
                alt="platform"
                style={{
                  position: 'absolute', bottom: '-50px', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '120%', objectFit: 'contain',
                  pointerEvents: 'none', zIndex: 0,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '40px' }}>
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 18px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                {corners('#fff')}{enemyName}
              </div>
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {corners('#fff')}{renderHearts(enemyLives, 3)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fireball */}
      {fireball && (
        <img
          key={fireball.flying ? 'flying' : 'idle'}
          src="/CombatGraphics/fireballAnimation.gif"
          alt="fireball"
          style={{
            position: 'fixed',
            left: fireball.flying ? 0 : fireball.sx,
            top:  fireball.flying ? 0 : fireball.sy,
            width: 120, height: 120,
            pointerEvents: 'none',
            zIndex: 9999,
            '--sx': `${fireball.sx}px`, '--sy': `${fireball.sy}px`,
            '--ex': `${fireball.ex}px`, '--ey': `${fireball.ey}px`,
            animation: fireball.flying ? 'fireballArc 0.65s ease-in-out forwards' : 'none',
          }}
          onAnimationEnd={() => {
            playSfx('/SoundEffects/spellHit.wav');
            setFireball(null);
            setEnemyFlashing(true);
            setTimeout(() => setEnemyFlashing(false), 500);
            onHitRef.current?.();
          }}
        />
      )}

      {/* Feedback */}
      {feedback && (
        <div style={{
          position: 'fixed', left: '50%', zIndex: 5000, textAlign: 'center', padding: '10px 24px',
          border: '4px solid #fff', background: '#000',
          color: feedbackType === 'correct' ? '#4ade80' : '#f87171',
          fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap',
          animation: 'feedbackSlideToCenter 0.6s ease-out forwards',
        }}>
          {corners('#fff')}
          {feedback}
        </div>
      )}

      {/* Environmental particles — crystal & mysticflower raining top-right to bottom-left */}
      {envParticles.map(p => (
        <img
          key={p.id}
          src={`/InMatchUIElements/HybridIsland/${p.type}.png`}
          alt=""
          style={{
            position: 'fixed',
            left: `${p.startX}%`,
            top: p.startY,
            width: p.size, height: p.size,
            objectFit: 'contain',
            pointerEvents: 'none',
            zIndex: 9998,
            '--dx': p.dx, '--dy': p.dy,
            '--r1': p.r1, '--r2': p.r2,
            '--jx1': p.jx1, '--jy1': p.jy1,
            '--jx2': p.jx2, '--jy2': p.jy2,
            animation: p.type === 'crystal'
              ? `leafDrift ${p.dur}s ease-in forwards`
              : `flowerDrift ${p.dur}s ease-in forwards`,
          }}
        />
      ))}

      {showMixedTutorial && <MixedButterflyTutorial onComplete={() => setHasSeenMixedTutorial(true)} />}

      {/* Game Over */}
      {gameOver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundImage: 'url(/PostMatchBackground.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '12px',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}>
          <div style={{
            position: 'relative', background: '#e8d5b4',
            border: '4px solid #703737', borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            padding: '36px 56px 28px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, border: '1px solid #703737', borderRadius: '6px', pointerEvents: 'none' }} />
            <h1 style={{ fontSize: 'clamp(2.5em, 6vw, 5em)', fontWeight: 900, margin: 0, color: '#ef4444', textShadow: '0 0 20px rgba(0,0,0,0.6), 2px 2px 6px rgba(0,0,0,0.8)', letterSpacing: '6px', textTransform: 'uppercase' }}>DEFEAT!</h1>
            <p style={{ fontSize: 'clamp(1em, 2vw, 1.3em)', color: '#333', margin: '36px 0 0', fontWeight: 500 }}>You ran out of hearts!</p>
            <p style={{ fontSize: 'clamp(1.1em, 2vw, 1.6em)', color: '#333', margin: '12px 0 0', fontWeight: 700 }}>Score: {score}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button onClick={onExitToLobby} style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 700, background: 'rgba(40,40,40,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              Return to Island Selection
            </button>
          </div>
        </div>
      )}

      {showExitModal && (
        <GameMenuModal
          title="Exit Game?"
          message="Your progress will be saved."
          icon="⚠️"
          onClose={() => setShowExitModal(false)}
        >
          <div className="wizard-menu-actions">
            <button type="button" className="wizard-menu-btn wizard-menu-btn-primary" onClick={confirmExit}>
              Yes, Exit
            </button>
            <button type="button" className="wizard-menu-btn wizard-menu-btn-secondary" onClick={() => setShowExitModal(false)}>
              Cancel
            </button>
          </div>
        </GameMenuModal>
      )}
    </div>
  );
};

export default HybridIslandGame;