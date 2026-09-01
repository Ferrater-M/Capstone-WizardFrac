import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playSfx, getSfxVolume, getMasterVolume } from '../utils/audio';
import DrawingCanvas from '../components/DrawingCanvas';
import MixedButterflyTutorial from '../components/MixedButterflyTutorial';
import HybridFractionTutorial from '../components/HybridFractionTutorial';
import GameMenuModal from '../components/GameMenuModal';
import HybridConversionTutorial from '../components/HybridConversionTutorial';
import SettingsPage from './SettingsPage';
import './game.css';

// Pixel-corner bracket decoration — identical to Similar/Dissimilar Island's `corners()`.
// Module-level (not nested in HybridIslandGame) so every stage component below can use
// it too, on panels/cards as well as on buttons.
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

// Same bracket decoration but without the inset hairline border — matches the Cast
// Spell/Confirm/Hint button chrome on Similar/Dissimilar Island exactly (just the 8
// corner squares, no inner outline, since the button already has its own solid border).
const buttonCorners = (color) => (
  <>
    {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
      <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:10, height:10, background:color, ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
    ))}
    {[[3,3],[null,3],[3,null],[null,null]].map(([t,l],i) => (
      <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:5, height:5, background:color, ...(t!==null?{top:t}:{bottom:3}), ...(l!==null?{left:l}:{right:3}) }}/>
    ))}
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// SolveButtonRow — the bottom-centre Confirm/Cast-Spell + Hint pair, styled and
// positioned exactly like Similar/Dissimilar Island's own row (bottom:12,
// left:50%, same padding/border/corner-bracket chrome). `onHint` is optional —
// pass it to show the Hint button beside the confirm button; the hint text only
// ever appears when that button is actually clicked, never automatically.
// ─────────────────────────────────────────────────────────────────────────────
const SolveButtonRow = ({ label, onConfirm, confirmEnabled, onHint }) => (
  <div style={{ position: 'absolute', bottom: 12, left: '50%', display: 'flex', gap: 10, zIndex: 4, animation: 'nAreaFadeIn 0.5s ease-out forwards' }}>
    <button
      onClick={onConfirm}
      disabled={!confirmEnabled}
      style={{
        padding: '4px 56px', background: '#703737', border: '4px solid #703737', borderRadius: 0,
        boxShadow: 'none', position: 'relative', fontSize: 11, fontWeight: 700,
        fontFamily: '"Press Start 2P", monospace', whiteSpace: 'nowrap',
        cursor: confirmEnabled ? 'pointer' : 'not-allowed', color: '#e8d5b4',
        opacity: confirmEnabled ? 1 : 0.45, backdropFilter: 'blur(6px)',
      }}
    >
      {buttonCorners('#703737')}
      {label}
    </button>
    {onHint && (
      <button
        onClick={onHint}
        style={{
          padding: '4px 16px', fontSize: 13, fontWeight: 700, fontFamily: '"Press Start 2P", monospace',
          background: '#703737', border: '4px solid #703737', borderRadius: 0, boxShadow: 'none',
          position: 'relative', color: '#e8d5b4', cursor: 'pointer', backdropFilter: 'blur(6px)',
        }}
      >
        {buttonCorners('#703737')}
        Hint
      </button>
    )}
  </div>
);

// Rising square particles along the bottom of the interactable card — identical
// set/timing to the one Similar/Dissimilar Island render inside circleContainerRef.
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
const riseParticles = () => RISE_PARTICLES.map((p, i) => (
  <div key={i} style={{
    position: 'absolute', bottom: 4, left: p.left,
    width: p.size, height: p.size,
    background: '#703737',
    pointerEvents: 'none', zIndex: 1,
    animation: `particleRise ${p.dur} ease-out ${p.delay} infinite`,
  }} />
));

// Falling square particles along the bottom of the problem-statement banner —
// identical set/timing to Similar/Dissimilar Island's own problem box.
const FALL_PARTICLES = [
  { left: '5%',  size: 8,  dur: '2.2s', delay: '0s'    },
  { left: '12%', size: 5,  dur: '1.6s', delay: '-0.4s' },
  { left: '20%', size: 10, dur: '2.6s', delay: '-1.2s' },
  { left: '28%', size: 6,  dur: '1.8s', delay: '-0.7s' },
  { left: '36%', size: 9,  dur: '2.4s', delay: '-1.8s' },
  { left: '44%', size: 4,  dur: '1.5s', delay: '-0.3s' },
  { left: '52%', size: 11, dur: '2.8s', delay: '-2.1s' },
  { left: '60%', size: 5,  dur: '1.7s', delay: '-0.9s' },
  { left: '68%', size: 8,  dur: '2.3s', delay: '-1.5s' },
  { left: '76%', size: 6,  dur: '1.9s', delay: '-0.6s' },
  { left: '84%', size: 10, dur: '2.5s', delay: '-2.4s' },
  { left: '92%', size: 4,  dur: '1.6s', delay: '-0.2s' },
  { left: '16%', size: 7,  dur: '2.1s', delay: '-1.1s' },
  { left: '48%', size: 5,  dur: '1.8s', delay: '-0.8s' },
  { left: '72%', size: 9,  dur: '2.7s', delay: '-1.6s' },
  { left: '88%', size: 6,  dur: '2.0s', delay: '-2.0s' },
];
const fallParticles = () => FALL_PARTICLES.map((p, i) => (
  <div key={i} style={{
    position: 'absolute', bottom: -4, left: p.left,
    width: p.size, height: p.size,
    background: '#703737',
    pointerEvents: 'none',
    animation: `particleFall ${p.dur} ease-out ${p.delay} infinite`,
  }} />
));

// Raw pixel offsets inside the floating wrapper (top:32 within the 400×440 circle
// box) — identical to Similar Island's own layout. Fly-in destinations and the
// D-bubble travel use fractions of the container instead, since those are
// position:fixed and computed from the container's real rendered rect.
const SIMILAR_DEN_DEST_FY = 255 / 440;
const SIMILAR_DBUBBLE_START_FY = 252 / 440;
const SIMILAR_DBUBBLE_END_FY = (32 + 129) / 440;

// ─────────────────────────────────────────────────────────────────────────────
// SimilarCircleStage — inlined local component
// The "similar" route — used once the two forged fractions share a denominator.
// Draw a circle → SimilarMagicCircle appears → the (shared) denominator flies in
// from both fractions and lands once → combine the numerators (Cast Spell) →
// the landed denominator bubble travels up to the numerator slot → simplify the
// result (Check). Ported faithfully from SimilarIslandGame.jsx: same positions,
// timings, bubble/sparkle visuals, and — notably — no soft-strike system here,
// since Similar Island costs a life immediately on any wrong answer, matching
// Hybrid's own onWrongAnswer already.
//
// Props:
//   problem        – the forged pair of improper fractions, equal denominators:
//                     {numerator1, numerator2, denominator1, operator}
//   onAnswerSubmit – ({numerator, denominator}) called once the simplified answer is correct
//   onWrongAnswer  – (hint, submittedValue, errorType) called on any wrong answer
// ─────────────────────────────────────────────────────────────────────────────
const SimilarCircleStage = ({ problem, onAnswerSubmit, onWrongAnswer, onRequestHint, onGestureStart }) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const { numerator1: n1, numerator2: n2, denominator1: d, operator } = problem;
  const rawResult = operator === '+' ? n1 + n2 : n1 - n2;
  const divisor = gcd(Math.abs(rawResult), d) || 1;
  const simplifiedNum = rawResult / divisor;
  const simplifiedDen = d / divisor;
  const isWhole = simplifiedDen === 1;

  const [showHint, setShowHint] = useState(true);
  const [circleDetected, setCircleDetected] = useState(false);

  const [bubbles, setBubbles] = useState(null);
  const [denVisible, setDenVisible] = useState(false);
  const [nVisible, setNVisible] = useState(false);
  const [showDenSparkle, setShowDenSparkle] = useState(false);
  const [showNSparkle, setShowNSparkle] = useState(false);
  const [dBubble, setDBubble] = useState(null);

  const [magicN, setMagicN] = useState('');
  const [finalAnswerVisible, setFinalAnswerVisible] = useState(false);
  const [checkButtonReady, setCheckButtonReady] = useState(false);
  const [simplifiedInput, setSimplifiedInput] = useState('');
  const [simplifiedDenInput, setSimplifiedDenInput] = useState('');

  const circleRef = useRef(null);
  const bubble1Ref = useRef(null);
  const bubble2Ref = useRef(null);
  const dBubbleRef = useRef(null);
  const actionLocked = useRef(false);

  const handleCircleDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setCircleDetected(true);
    onGestureStart?.();
  };

  // circleRef only mounts once circleDetected flips and the magic circle renders —
  // an effect (unlike the click handler itself) runs after that commit, so the
  // ref is guaranteed real by the time this fires. Mirrors ButterflyCircleStage's
  // own triggerNumberFlyIn/useEffect pairing exactly.
  const triggerDenominatorFlyIn = () => {
    if (!circleRef.current) return;
    const SIZE = 48;
    const cRect = circleRef.current.getBoundingClientRect();
    const getSrc = (tag) => {
      const el = document.querySelector(`[data-fly="${tag}"]`);
      if (!el) return { left: cRect.left, top: cRect.top };
      const r = el.getBoundingClientRect();
      return { left: r.left + r.width / 2 - SIZE / 2, top: r.top + r.height / 2 - SIZE / 2 };
    };
    const s1 = getSrc('conv0-d');
    const s2 = getSrc('conv1-d');
    const dLeft = cRect.left + cRect.width * 0.5 - SIZE / 2;
    const dTop  = cRect.top + SIMILAR_DEN_DEST_FY * cRect.height - SIZE / 2;

    const rndCtrl = (sx, sy) => ({
      x: (sx + dLeft) / 2 + (Math.random() - 0.5) * 400,
      y: (sy + dTop) / 2 - 80 - Math.random() * 200,
    });
    const ctrl1 = rndCtrl(s1.left, s1.top);
    const ctrl2 = rndCtrl(s2.left, s2.top);

    setBubbles({ b1: { ...s1, opacity: 0 }, b2: { ...s2, opacity: 0 } });

    setTimeout(() => {
      setBubbles(prev => prev && ({ b1: { ...s1, opacity: 1 }, b2: { ...s2, opacity: 1 } }));
      playSfx('/SoundEffects/sparkleSound.wav');
    }, 500);

    setTimeout(() => {
      playSfx('/SoundEffects/numberMove.wav');
      const duration = 900, start = performance.now();
      const bezier = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
      const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

      const frame = (now) => {
        const raw = Math.min((now - start) / duration, 1);
        const t = easeInOut(raw);
        if (bubble1Ref.current) { bubble1Ref.current.style.left = bezier(t, s1.left, ctrl1.x, dLeft) + 'px'; bubble1Ref.current.style.top = bezier(t, s1.top, ctrl1.y, dTop) + 'px'; }
        if (bubble2Ref.current) { bubble2Ref.current.style.left = bezier(t, s2.left, ctrl2.x, dLeft) + 'px'; bubble2Ref.current.style.top = bezier(t, s2.top, ctrl2.y, dTop) + 'px'; }
        if (raw < 1) {
          requestAnimationFrame(frame);
        } else {
          setBubbles(null);
          setDenVisible(true);
          setShowDenSparkle(true);
          setTimeout(() => setShowDenSparkle(false), 800);
          const explodeSound = new Audio('/SoundEffects/sparkleExplode.wav');
          explodeSound.volume = getSfxVolume();
          explodeSound.play().catch(() => {});
          explodeSound.addEventListener('ended', () => {
            setTimeout(() => {
              setNVisible(true);
              playSfx('/SoundEffects/circleAppear.wav');
            }, 200);
          });
        }
      };
      requestAnimationFrame(frame);
    }, 2000);
  };

  useEffect(() => {
    if (!circleDetected) return;
    const t = setTimeout(triggerDenominatorFlyIn, 1200);
    return () => clearTimeout(t);
  }, [circleDetected]);

  const checkCombine = () => {
    if (actionLocked.current || !magicN) return;
    actionLocked.current = true;
    const val = parseInt(magicN);
    if (val === rawResult) {
      // Travel the landed denominator bubble up to the numerator slot
      if (circleRef.current) {
        const cRect = circleRef.current.getBoundingClientRect();
        const SZ = 44;
        const sx = cRect.left + cRect.width * 0.5 - SZ / 2;
        const sy = cRect.top + SIMILAR_DBUBBLE_START_FY * cRect.height - SZ / 2;
        const ex = sx;
        const ey = cRect.top + SIMILAR_DBUBBLE_END_FY * cRect.height - SZ / 2;
        // Shine first (fade in + sparkle sound), then a short pause before it
        // actually starts traveling — matching the fly-in bubbles elsewhere,
        // instead of snapping straight into motion the instant it appears.
        setDBubble({ x: sx, y: sy, opacity: 0 });
        setTimeout(() => {
          setDBubble(prev => prev && ({ ...prev, opacity: 1 }));
          playSfx('/SoundEffects/sparkleSound.wav');
        }, 50);

        setTimeout(() => {
          playSfx('/SoundEffects/numberMove.wav');
          const dur = 800, t0 = performance.now();
          const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          const anim = (now) => {
            const raw = Math.min((now - t0) / dur, 1);
            const t = ease(raw);
            if (dBubbleRef.current) { dBubbleRef.current.style.left = ex + 'px'; dBubbleRef.current.style.top = (sy + (ey - sy) * t) + 'px'; }
            if (raw < 1) {
              requestAnimationFrame(anim);
            } else {
              setShowNSparkle(true);
              setTimeout(() => setShowNSparkle(false), 800);
              const explode = new Audio('/SoundEffects/sparkleExplode.wav');
              explode.volume = getSfxVolume();
              explode.play().catch(() => {});
              explode.addEventListener('ended', () => {
                setDBubble(null);
                setFinalAnswerVisible(true);
                setTimeout(() => { setCheckButtonReady(true); actionLocked.current = false; }, 600);
                playSfx('/SoundEffects/circleAppear.wav');
              });
            }
          };
          requestAnimationFrame(anim);
        }, 550);
      } else {
        actionLocked.current = false;1
      }
    } else {
      setMagicN('');
      onWrongAnswer?.(`${n1} ${operator} ${n2} = ${rawResult}, not ${val}.`, String(val), 'WRONG_COMBINE');
      actionLocked.current = false;
    }
  };

  const checkSimplify = () => {
    if (actionLocked.current || !checkButtonReady) return;
    if (isWhole ? !simplifiedInput : !(simplifiedInput && simplifiedDenInput)) return;
    actionLocked.current = true;
    const numOk = parseInt(simplifiedInput) === simplifiedNum;
    const denOk = isWhole || parseInt(simplifiedDenInput) === simplifiedDen;
    const submitted = isWhole ? simplifiedInput : `${simplifiedInput}/${simplifiedDenInput}`;
    setSimplifiedInput(''); setSimplifiedDenInput('');
    if (numOk && denOk) {
      onAnswerSubmit({ numerator: simplifiedNum, denominator: simplifiedDen });
    } else {
      const target = isWhole ? `${simplifiedNum}` : `${simplifiedNum}/${simplifiedDen}`;
      onWrongAnswer?.(`Simplify ${rawResult}/${d} to ${target}.`, submitted, 'WRONG_SIMPLIFY');
    }
    actionLocked.current = false;
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (!finalAnswerVisible) checkCombine();
    else checkSimplify();
  };

  // Matches Similar Island's own magicN/simplified-answer inputs exactly — dark
  // dashed border on a transparent field, not the grey/white-dashed treatment
  // used for the token boxes elsewhere in Hybrid.
  const magicNFieldStyle = {
    width: 90, height: 64, fontSize: 32, fontWeight: 800, textAlign: 'center',
    border: '3px dashed #fdf6e3', borderRadius: 0, background: 'transparent', color: '#fdf6e3',
    textShadow: '0 0 8px rgba(0,0,0,0.9)',
    outline: 'none', appearance: 'none', fontFamily: '"Press Start 2P", monospace',
    WebkitAppearance: 'none', MozAppearance: 'none',
  };
  const wholeFieldStyle = {
    width: 90, height: 64, fontSize: 28, fontWeight: 800, textAlign: 'center',
    border: '3px dashed #fdf6e3', borderRadius: 0, background: 'transparent', color: '#fdf6e3',
    outline: 'none', appearance: 'none', fontFamily: '"Press Start 2P", monospace',
    WebkitAppearance: 'none', MozAppearance: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.7)', textShadow: '0 0 8px rgba(0,0,0,0.9)',
  };
  const fracFieldStyle = { ...wholeFieldStyle, height: 54 };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {riseParticles()}
      {/* nAreaFadeIn (shared/global) bakes in its own translateX(-50%), meant for an
          element that isn't already explicitly centered — using it here on top of
          this component's own centering transform double-shifts the input left.
          This local variant keeps the same fade/slide without that extra shift. */}
      <style>{`
        @keyframes similarNFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
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

      {!circleDetected ? (
        <>
          {showHint && (
            <p style={{
              position: 'absolute', bottom: 16, left: '50%',
              transform: 'translateX(-50%)', margin: 0,
              color: '#ffffff', fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap',
              textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 3px 3px 0px rgba(0,0,0,1)',
              zIndex: 3, pointerEvents: 'none',
            }}>Draw a circle to continue!</p>
          )}
          <div style={{ position: 'absolute', inset: 0, zIndex: 3 }} onPointerDown={() => { if (showHint) setShowHint(false); }}>
            <DrawingCanvas mode="circle" onCircleDetected={handleCircleDetected} />
          </div>
        </>
      ) : (
        <div ref={circleRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          <div style={{
            position: 'absolute', top: 32, left: 0, right: 0, height: '300px',
            animation: 'magicFloat 4s ease-in-out infinite', zIndex: 2,
          }}>
            <img
              src="/InteractableUI/SimilarMagicCircle.png"
              alt="magic circle"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', animation: 'problemFadeIn 0.5s ease-out' }}
            />

            {/* Landed denominator */}
            <div style={{
              position: 'absolute', left: '50%', top: '235px', transform: 'translateX(-50%)',
              width: 40, height: 36, fontSize: 14, fontWeight: 900, textAlign: 'center',
              background: 'transparent', color: '#ffffff', zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: denVisible && !finalAnswerVisible && !dBubble ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}>
              {denVisible ? d : ''}
            </div>

            {showDenSparkle && <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', left: '50%', top: '249px', width: 72, height: 72, pointerEvents: 'none', zIndex: 3, animation: 'sparkBurst 0.8s ease-out forwards' }} />}
            {showNSparkle && <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', left: '50%', top: '129px', width: 72, height: 72, pointerEvents: 'none', zIndex: 3, animation: 'sparkBurst 0.8s ease-out forwards' }} />}

            {nVisible && (
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                top: !finalAnswerVisible ? '98px' : (isWhole ? '82px' : '56px'),
                zIndex: 2, opacity: dBubble ? 0 : 1, transition: 'opacity 0.3s ease',
                pointerEvents: dBubble ? 'none' : 'auto',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'similarNFadeIn 0.5s ease-out forwards' }}>
                  {!finalAnswerVisible ? (
                    <input
                      autoFocus type="text" inputMode="numeric" value={magicN}
                      onChange={e => setMagicN(e.target.value.replace(/[^0-9-]/g, ''))} onKeyDown={handleKeyDown}
                      placeholder="?" style={magicNFieldStyle}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'problemFadeIn 0.4s ease-out' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"Press Start 2P", monospace', textShadow: '1px 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'nowrap' }}>Final Answer:</span>
                      {isWhole ? (
                        <input autoFocus type="text" inputMode="numeric" value={simplifiedInput} onChange={e => setSimplifiedInput(e.target.value.replace(/[^0-9-]/g, ''))} onKeyDown={handleKeyDown} style={wholeFieldStyle} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <input autoFocus type="text" inputMode="numeric" value={simplifiedInput} onChange={e => setSimplifiedInput(e.target.value.replace(/[^0-9-]/g, ''))} onKeyDown={handleKeyDown} style={fracFieldStyle} />
                          <div style={{ width: 90, height: 3, background: '#222', borderRadius: 2 }} />
                          <input type="text" inputMode="numeric" value={simplifiedDenInput} onChange={e => setSimplifiedDenInput(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleKeyDown} style={fracFieldStyle} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {createPortal(
        <>
          {bubbles && (['b1', 'b2']).map(key => {
            const b = bubbles[key];
            if (!b) return null;
            return (
              <div key={key} ref={key === 'b1' ? bubble1Ref : bubble2Ref} style={{
                position: 'fixed', left: b.left, top: b.top, width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, pointerEvents: 'none', opacity: b.opacity, transition: 'opacity 0.3s ease',
              }}>
                <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'sparkleSpin 1.2s linear infinite', pointerEvents: 'none' }} />
                <span style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)', fontFamily: '"Press Start 2P", monospace' }}>{d}</span>
              </div>
            );
          })}
          {dBubble && (
            <div ref={dBubbleRef} style={{ position: 'fixed', left: dBubble.x, top: dBubble.y, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none', opacity: dBubble.opacity, transition: 'opacity 0.3s ease' }}>
              <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'sparkleSpin 1.2s linear infinite' }} />
              <span style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)', fontFamily: '"Press Start 2P", monospace' }}>{d}</span>
            </div>
          )}
        </>,
        document.body
      )}

      {circleDetected && nVisible && (
        <SolveButtonRow
          label={!finalAnswerVisible ? 'Cast Spell' : 'Check'}
          onConfirm={!finalAnswerVisible ? checkCombine : checkSimplify}
          confirmEnabled={!finalAnswerVisible ? !!magicN : (checkButtonReady && (isWhole ? !!simplifiedInput : !!(simplifiedInput && simplifiedDenInput)))}
          onHint={onRequestHint ? () => onRequestHint(
            !finalAnswerVisible ? `${n1} ${operator} ${n2} = ?` : `Simplify ${rawResult}/${d}.`
          ) : undefined}
        />
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

// `tag` (e.g. "frac0"/"frac1") marks each digit with a data-fly attribute so the
// forge circle's fly-in animation can find the exact on-screen spot each number
// should launch from, instead of a generic point.
const FractionBox = ({ whole, num, den, tag }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    {whole > 0 && (
      <span data-fly={tag ? `${tag}-w` : undefined} style={{ fontSize: 28, fontWeight: 800, color: '#222' }}>{whole}</span>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span data-fly={tag ? `${tag}-n` : undefined} style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{num}</span>
      <div style={{ width: 50, height: 3, background: '#222', borderRadius: 2, margin: '3px 0' }} />
      <span data-fly={tag ? `${tag}-d` : undefined} style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{den}</span>
    </div>
  </div>
);

// Where N / W / D sit on MixedMagicCircle.png, as a fraction of its rendered box —
// read off the labeled reference circle. CIRCLE_SIZE/TOKEN_SIZE/FLY_SIZE shrunk
// down from their original 340/52/48 per user request.
const CIRCLE_SIZE = 260;
const TOKEN_SIZE = 42;
const FLY_SIZE = 40;
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
const ForgeCircleStage = ({ problem, playerHealth, onForgeComplete, onWrongAnswer, onRequestHint, onGestureStart }) => {
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
  // 'den' while dragging D onto W; 'product' while dragging W (now showing the
  // product) onto N — mirrors Dissimilar Island's magnet-zone drag exactly.
  const [dragKey, setDragKey] = useState(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  // Live drag→target distance in px — drives the proximity pulse rate below
  // instead of a binary red/green flip (Infinity = not dragging / far away).
  const [magnetDist, setMagnetDist] = useState(Infinity);
  // Shatter-and-fade on the improper numerator when "Next Fraction →" is pressed,
  // before the next mixed fraction starts converting.
  const [shattering, setShattering] = useState(false);
  const [shatterPieces, setShatterPieces] = useState([]);
  const shatterPidRef = useRef(0);

  // 3-strike soft-fail — same as ButterflyCircleStage/Dissimilar Island: the first
  // two wrong answers just shake+pulse the circle and let the player retry; only
  // the third actually costs a life (via onWrongAnswer), after which the circle
  // fades out and the whole forge restarts from the triangle draw.
  const [forgeFailCount, setForgeFailCount] = useState(0);
  const [forgeMistakes, setForgeMistakes] = useState([]);
  const [forgeFailSequence, setForgeFailSequence] = useState(null); // null | 'flashing' | 'fading'
  const [forgeShaking, setForgeShaking] = useState(false);
  // True while the circle fades out after the SECOND fraction converts —
  // gives the whole magic circle a graceful exit instead of just vanishing
  // the instant the stage swaps to Similar/Butterfly underneath it.
  const [forgeCompleting, setForgeCompleting] = useState(false);

  const wholeRef  = useRef(null);
  const numRef    = useRef(null);
  const denRef    = useRef(null);
  const circleRef = useRef(null);
  const bubbleWRef = useRef(null);
  const bubbleNRef = useRef(null);
  const bubbleDRef = useRef(null);
  const flyAnimRefs = useRef([]);
  const burstPidRef = useRef(0);
  const dragRef = useRef(null);
  const magnetSoundRef = useRef(null);

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
  // on Similar Island: each bubble launches from the exact spot its digit is shown in
  // the problem banner above (via the FractionBox data-fly tags), fades in, pauses,
  // then arcs out along a randomized quadratic-bezier path via requestAnimationFrame
  // (smooth, not stepped), landing with a sparkle burst before the real interactive
  // token appears.
  useEffect(() => {
    if (!gestureDone || !circleRef.current) return;

    const timers = [];

    const runFlyIn = () => {
      if (!circleRef.current) return;

      flyAnimRefs.current.forEach(id => cancelAnimationFrame(id));
      flyAnimRefs.current = [];
      setRevealed({ w: false, n: false, d: false });

      const SIZE = FLY_SIZE;
      const cRect = circleRef.current.getBoundingClientRect();
      const dest = (key) => ({
        x: cRect.left + NODE_POS[key].x * cRect.width - SIZE / 2,
        y: cRect.top  + NODE_POS[key].y * cRect.height - SIZE / 2,
      });
      const fallbackSrc = { x: cRect.left + cRect.width / 2 - SIZE / 2, y: cRect.top - 70 };
      const srcFor = (key) => {
        const el = document.querySelector(`[data-fly="frac${fracIndex}-${key}"]`);
        if (!el) return fallbackSrc;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - SIZE / 2, y: r.top + r.height / 2 - SIZE / 2 };
      };

      const items = [
        { key: 'w', ref: bubbleWRef, to: dest('w'), delay: 0 },
        { key: 'n', ref: bubbleNRef, to: dest('n'), delay: 150 },
        { key: 'd', ref: bubbleDRef, to: dest('d'), delay: 300 },
      ];

      setBubbles({
        w: { left: srcFor('w').x, top: srcFor('w').y, opacity: 0 },
        n: { left: srcFor('n').x, top: srcFor('n').y, opacity: 0 },
        d: { left: srcFor('d').x, top: srcFor('d').y, opacity: 0 },
      });

      items.forEach(({ key, ref, to, delay }) => {
        const src = srcFor(key);
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
          }, 1500));
        }, delay + 200));
      });
    };

    // A small pause after the triangle is actually drawn before anything starts
    // moving — but NOT when merely advancing to the next fraction (fracIndex
    // flipping 0→1 via "Next Fraction →"), since that isn't a fresh gesture draw.
    timers.push(setTimeout(runFlyIn, fracIndex === 0 ? 500 : 0));

    return () => timers.forEach(clearTimeout);
  }, [gestureDone, fracIndex]);

  // ── drag — magnet-zone snap, vibration, and particle burst, ported from
  // Dissimilar Island's D1/D2 drag mechanic (same threshold, same magnet.wav
  // pitch-bend, same sparkle burst on a successful merge). ──
  const MAGNET_THRESHOLD = 60;

  const startDrag = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    dragRef.current = { key, startX: cx, startY: cy, near: false };
    setDragKey(key);
    setDragOffset({ dx: 0, dy: 0 });
    const audio = new Audio('/SoundEffects/magnet.wav');
    audio.loop = true;
    audio.playbackRate = 0.5;
    audio.volume = getSfxVolume();
    audio.play().catch(() => {});
    magnetSoundRef.current = audio;
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    const newDx = cx - d.startX, newDy = cy - d.startY;
    setDragOffset({ dx: newDx, dy: newDy });
    const targetRef = d.key === 'den' ? wholeRef : numRef;
    let dist = Infinity;
    if (targetRef.current) {
      const r = targetRef.current.getBoundingClientRect();
      dist = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
    }
    const near = dist < MAGNET_THRESHOLD;
    d.near = near;
    setMagnetDist(dist);
    if (magnetSoundRef.current) {
      magnetSoundRef.current.playbackRate = 0.1 + Math.max(0, 1 - dist / 200) * 0.6;
    }
  };

  const onUp = () => {
    const d = dragRef.current;
    if (!d) return;
    const { key, near } = d;
    dragRef.current = null;
    setDragKey(null);
    setMagnetDist(Infinity);
    setDragOffset({ dx: 0, dy: 0 });
    if (magnetSoundRef.current) { magnetSoundRef.current.pause(); magnetSoundRef.current = null; }
    if (!near) return;
    const targetRef = key === 'den' ? wholeRef : numRef;
    if (targetRef.current) {
      const r = targetRef.current.getBoundingClientRect();
      playSfx('/SoundEffects/sparkleExplode.wav');
      const bid = burstPidRef.current++;
      setBursts(prev => [...prev, { id: bid, left: r.left + r.width / 2, top: r.top + r.height / 2 }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== bid)), 800);
    }
    if (key === 'den') updateFrac({ step: 'ask_product' });
    else if (frac.step === 'ask_sum') updateFrac({ step: 'ask_sum_input' });
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

  // ── 3-strike soft-fail (mirrors ButterflyCircleStage/Dissimilar Island exactly:
  // shake+pulse escalation on strikes 1-2, flash+fade+life-loss+full-restart on
  // strike 3) ──
  const resetForgeState = () => {
    setGestureDone(false);
    setShowHint(true);
    setFracIndex(0);
    setFracs([initFrac(), initFrac()]);
    setRevealed({ w: false, n: false, d: false });
    setBubbles(null);
    setBursts([]);
    setInputVal(''); setInputError(false);
    setDragKey(null); setDragOffset({ dx: 0, dy: 0 }); setMagnetDist(Infinity);
    setShattering(false); setShatterPieces([]);
    setForgeFailCount(0); setForgeMistakes([]); setForgeShaking(false);
  };

  const triggerForgeFailSequence = (mistakes) => {
    const willPlayerDie = playerHealth <= 1;
    setForgeFailSequence('flashing');
    playSfx('/SoundEffects/initialDissimilarFail.wav');

    setTimeout(() => { setForgeFailSequence('fading'); }, 2000);

    setTimeout(() => {
      setForgeFailSequence(null);
      const last = mistakes[mistakes.length - 1];
      onWrongAnswer?.(`${last.formula} = ${last.correct}, not ${last.entered}.`, last.entered, last.errorType);
    }, 2900);

    setTimeout(() => {
      if (willPlayerDie) return;
      resetForgeState();
    }, 7400);
  };

  const recordForgeFail = (formula, entered, correct, errorType) => {
    const updated = [...forgeMistakes, { formula, entered: String(entered), correct: String(correct), errorType }];
    setForgeMistakes(updated);
    const newCount = forgeFailCount + 1;
    setForgeFailCount(newCount);
    playSfx('/SoundEffects/dissimilarWrong.wav');
    setForgeShaking(true);
    setTimeout(() => setForgeShaking(false), 1000);
    if (newCount >= 3) triggerForgeFailSequence(updated);
  };

  // ── input checks ──
  const checkProduct = () => {
    const correct = w * d;
    const val = parseInt(inputVal);
    if (val === correct) {
      playSfx('/SoundEffects/circleAppear.wav');
      updateFrac({ product: correct, step: 'ask_sum' });
    } else {
      setInputError(true);
      setInputVal('');
      recordForgeFail(`${d} × ${w}`, val, correct, 'WRONG_PRODUCT');
      setTimeout(() => setInputError(false), 1800);
    }
  };

  const checkSum = () => {
    const correct = frac.product + n;
    const val = parseInt(inputVal);
    if (val === correct) {
      playSfx('/SoundEffects/circleAppear.wav');
      updateFrac({ improper_n: correct, step: 'done' });
    } else {
      setInputError(true);
      setInputVal('');
      recordForgeFail(`${frac.product} + ${n}`, val, correct, 'WRONG_SUM');
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
    if (shattering) return;
    setShattering(true);

    // Shatter the improper numerator into a burst of fading fragments before the
    // next mixed fraction starts converting — reuses the same fixed-position
    // squareBurst particle technique as ButterflyCircleStage's own explosions.
    if (numRef.current) {
      const r = numRef.current.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pid = shatterPidRef.current++;
      const pieces = Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 50 + Math.random() * 45;
        return {
          id: pid * 100 + i,
          left: cx, top: cy,
          dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist,
          size: Math.floor(Math.random() * 6 + 5),
        };
      });
      setShatterPieces(pieces);
      playSfx('/SoundEffects/sparkleExplode.wav');
    }

    setTimeout(() => {
      setShatterPieces([]);
      setShattering(false);
      if (fracIndex === 0) {
        setFracIndex(1);
      } else {
        // Fade the whole circle out gracefully before handing off to the next
        // stage, instead of it just vanishing the instant onForgeComplete
        // swaps the parent's stage state underneath it.
        setForgeCompleting(true);
        setTimeout(() => {
          onForgeComplete({
            imp1: { n: fracs[0].improper_n, d: p.denominator1 },
            imp2: { n: fracs[1].improper_n, d: p.denominator2 },
          });
        }, 550);
      }
    }, 650);
  };

  const handleGestureDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setGestureDone(true);
    onGestureStart?.();
  };

  // ── token styles — grey background, broken (dashed) white border, white numbers ──
  const token = (extra = {}) => ({
    position: 'absolute', width: TOKEN_SIZE, height: TOKEN_SIZE, borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 800, border: '3px dashed', fontFamily: '"Press Start 2P", monospace',
    userSelect: 'none', transition: 'border-color 0.2s, background 0.2s, color 0.2s, box-shadow 0.2s, opacity 0.35s ease-out',
    zIndex: 3, ...extra,
  });

  const landedPos = (key) => ({ left: NODE_POS[key].x * CIRCLE_SIZE - TOKEN_SIZE / 2, top: NODE_POS[key].y * CIRCLE_SIZE - TOKEN_SIZE / 2 });

  // A fast fade so a token doesn't just abruptly pop into existence the instant
  // it lands inside the circle — quick enough it never gets in the way of the
  // interaction states below, which override it outright when they apply.
  const FAST_FADE = 'numFadeIn 0.2s ease-out both';

  // Continuous proximity → pulse speed, in the same spirit as the magnet sound's
  // own pitch-ramp (starts subtle from ~200px out, fastest right as the two
  // boxes meet). Rounded to 0.1s so it doesn't restart the CSS animation on
  // every single mousemove tick. Replaces the old binary red-flash/green-lock
  // feedback with a rate the player can read as "warmer/colder" while dragging.
  const magnetPulseDuration = (dist) => {
    const t = Math.max(0, Math.min(1, 1 - dist / 200));
    return (Math.round((1.4 - t * 1.1) * 10) / 10).toFixed(1);
  };
  // Rapid shake (transform) layered with the proximity pulse (box-shadow) —
  // two separate keyframes touching different properties so they can run
  // together, same trick ButterflyCircleStage uses for its own magnet zones.
  const magnetPulse = () => `magnetVibrate 0.15s ease-in-out infinite, forgeMagnetPulse ${magnetPulseDuration(magnetDist)}s ease-in-out infinite`;

  const wholeStyle = () => {
    const base = token({ background: '#333333', borderColor: '#e8d5b4', color: '#e8d5b4', animation: FAST_FADE, ...landedPos('w') });
    if (dragKey === 'product') {
      // W itself (now showing the product) is the thing being dragged onto N —
      // pulses in sync with N (the target, see numStyle) at the same live rate.
      // Border stays the interactable-ui cream throughout — only the fill and
      // text animate white, via the keyframes themselves (see magnetPulse()).
      return { ...base, cursor: 'grabbing', zIndex: 6, opacity: 0.9, animation: magnetPulse(),
        left: base.left + dragOffset.dx, top: base.top + dragOffset.dy };
    }
    if (frac.step === 'ask_sum' || frac.step === 'ask_sum_input')
      return { ...base, animation: 'forgeSteadyPulse 1.1s ease-in-out infinite', cursor: 'grab' };
    if (dragKey === 'den')
      return { ...base, animation: magnetPulse() };
    return base;
  };

  const numStyle = () => {
    const base = token({ background: '#333333', borderColor: '#e8d5b4', color: '#e8d5b4', animation: FAST_FADE, ...landedPos('n') });
    if (dragKey === 'product')
      return { ...base, animation: magnetPulse() };
    if (frac.step === 'done') {
      if (shattering) return { ...base, opacity: 0, animation: 'none' };
      return { ...base, animation: 'forgeSteadyPulse 1.1s ease-in-out infinite' };
    }
    return base;
  };

  const denStyle = () => {
    const draggable = frac.step === 'drag_den';
    if (dragKey === 'den') {
      // The dragged D token itself — pulses in sync with W (the target, see
      // wholeStyle) at the same live rate.
      const base = token({ background: '#333333', borderColor: '#e8d5b4', color: '#e8d5b4', ...landedPos('d') });
      return { ...base, cursor: 'grabbing', zIndex: 6, opacity: 0.9, animation: magnetPulse(),
        left: base.left + dragOffset.dx, top: base.top + dragOffset.dy };
    }
    return token({
      background: '#333333', borderColor: draggable ? '#e8d5b4' : '#8a8a8a',
      color: draggable ? '#e8d5b4' : '#aaaaaa',
      cursor: draggable ? 'grab' : 'default',
      // forgePulseDen only touches box-shadow, so it layers cleanly alongside the
      // one-shot opacity/transform fade-in without either one clobbering the other.
      animation: draggable ? `${FAST_FADE}, forgePulseDen 1.5s ease-in-out infinite` : FAST_FADE,
      ...landedPos('d'),
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {riseParticles()}
      {/* Book — always visible underneath, identical to the pre-draw state */}
      <style>{`
        @keyframes bookFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-7px); }
        }
        @keyframes forgePulseDen {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }
        @keyframes magicCircleFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Proximity glow while dragging D onto W (or the product onto N) —
           both the dragged token and its target share this same pulse, with
           the duration set live from how close they are (see magnetPulse()).
           Fill and text pulse white along with the glow; the border is NOT
           touched here (stays the interactable-ui cream, set once on the
           element itself) — and this only touches transform-free properties
           so it layers cleanly alongside the shared magnetVibrate shake
           (which only touches transform) without either clobbering the other. */
        @keyframes forgeMagnetPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); background: #333333; color: #e8d5b4; }
          50%       { box-shadow: 0 0 14px 6px rgba(255,255,255,0.85); background: #ffffff; color: #ffffff; }
        }
        /* Fixed-rate white glow for a successfully-dropped token — fill and
           text pulse white with it, border stays cream. */
        @keyframes forgeSteadyPulse {
          0%, 100% { box-shadow: 0 0 4px 1px rgba(255,255,255,0.5); background: #333333; color: #e8d5b4; }
          50%       { box-shadow: 0 0 16px 7px rgba(255,255,255,0.95); background: #ffffff; color: #ffffff; }
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
            transform: 'translate(-50%, calc(-50% - 38px))',
            width: CIRCLE_SIZE, height: CIRCLE_SIZE, zIndex: 2,
          }}
        >
          {/* Floating wrapper — carries magicFloat so the circle image AND its number
              tokens bob together as one unit, instead of the numbers sitting static
              while only the image underneath floats. Also carries the shake (strikes
              1-2) and fade-out (strike 3) from the 3-strike soft-fail below. */}
          <div style={{
            position: 'absolute', inset: 0,
            animation: forgeShaking
              ? 'circleShake 0.5s ease-in-out 2, magicFloat 4s ease-in-out infinite'
              : 'magicFloat 4s ease-in-out infinite',
            opacity: forgeFailSequence === 'fading' || forgeCompleting ? 0 : 1,
            transition: forgeFailSequence === 'fading' ? 'opacity 0.6s ease-out'
              : forgeCompleting ? 'opacity 0.5s ease-out' : undefined,
          }}>
            <img
              src="/InteractableUI/MixedMagicCircle.png"
              alt="magic circle"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1,
                animation: forgeFailSequence === 'flashing' ? 'circleFlash 0.12s ease-in-out infinite'
                  : forgeFailCount === 2 ? 'circlePulse2 0.4s ease-in-out infinite'
                  : forgeFailCount === 1 ? 'circlePulse1 0.75s ease-in-out infinite'
                  : 'magicCircleFadeIn 0.6s ease-out forwards',
              }}
            />

            {/* Whole number token — only once its bubble has landed. Once D has been
                dragged onto it, the box itself becomes the product input (in place,
                not a separate field elsewhere); once the product is confirmed, it
                shows the product and becomes the thing you drag onto N next — then
                hides once it's been dragged into (consumed by) N. */}
            {revealed.w && frac.step !== 'ask_sum_input' && frac.step !== 'done' && (
              <div
                ref={wholeRef}
                style={wholeStyle()}
                onMouseDown={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
                onTouchStart={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
              >
                {frac.step === 'ask_product' ? (
                  <input
                    autoFocus type="text" inputMode="numeric" value={inputVal}
                    onChange={e => setInputVal(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleKeyDown}
                    style={{
                      width: '100%', height: '100%', textAlign: 'center', fontSize: 20, fontWeight: 800,
                      fontFamily: '"Press Start 2P", monospace', background: 'transparent',
                      border: 'none', outline: 'none', color: inputError ? '#ff8a8a' : 'inherit', padding: 0,
                    }}
                  />
                ) : frac.step === 'ask_sum' ? frac.product : w}
              </div>
            )}

            {/* Numerator token — becomes the sum input once W (the product) lands on it */}
            {revealed.n && (
              <div ref={numRef} style={numStyle()}>
                {frac.step === 'ask_sum_input' ? (
                  <input
                    autoFocus type="text" inputMode="numeric" value={inputVal}
                    onChange={e => setInputVal(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleKeyDown}
                    style={{
                      width: '100%', height: '100%', textAlign: 'center', fontSize: 20, fontWeight: 800,
                      fontFamily: '"Press Start 2P", monospace', background: 'transparent',
                      border: 'none', outline: 'none', color: inputError ? '#ff8a8a' : 'inherit', padding: 0,
                    }}
                  />
                ) : frac.step === 'done' ? frac.improper_n : n}
              </div>
            )}

            {/* Denominator token — hidden once it's been dragged into (consumed by) W */}
            {revealed.d && (frac.step === 'drag_den' || dragKey === 'den') && (
              <div
                ref={denRef}
                style={denStyle()}
                onMouseDown={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
                onTouchStart={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
              >
                {d}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom-centre row — same anchor + chrome as Cast Spell/Confirm on Similar/Dissimilar Island.
          Visible as soon as the circle is up (even mid fly-in), just disabled until there's
          actually something to confirm — instead of popping in only once landed. */}
      {gestureDone && frac.step !== 'done' && (
        <SolveButtonRow
          label="Forge"
          onConfirm={frac.step === 'ask_product' ? checkProduct : frac.step === 'ask_sum_input' ? checkSum : () => {}}
          confirmEnabled={allLanded && (frac.step === 'ask_product' || frac.step === 'ask_sum_input') && !!inputVal}
          onHint={onRequestHint ? () => onRequestHint(
            frac.step === 'ask_sum_input' ? `${frac.product} + ${n} = ?` : `${d} × ${w} = ?`
          ) : undefined}
        />
      )}

      {gestureDone && allLanded && frac.step === 'done' && (
        <button
          onClick={advanceFraction}
          disabled={shattering}
          style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            padding: '4px 24px', background: '#703737', color: '#e8d5b4', fontFamily: '"Press Start 2P", monospace',
            border: '4px solid #703737', borderRadius: 0, boxShadow: 'none', fontWeight: 700, fontSize: 11,
            cursor: shattering ? 'not-allowed' : 'pointer', opacity: shattering ? 0.45 : 1,
            whiteSpace: 'nowrap', zIndex: 4,
          }}
        >
          {buttonCorners('#703737')}
          {fracIndex === 0 ? 'Next Fraction →' : 'Start Solving →'}
        </button>
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
                width: FLY_SIZE, height: FLY_SIZE,
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
              <span style={{ position: 'relative', zIndex: 1, fontSize: 15, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)', fontFamily: '"Press Start 2P", monospace' }}>
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
                width: 58, height: 58, pointerEvents: 'none', zIndex: 9998,
                animation: 'sparkBurst 0.8s ease-out forwards',
              }}
            />
          ))}

          {/* Numerator shatter — plays right when "Next Fraction →" is pressed */}
          {shatterPieces.map(piece => (
            <div key={piece.id} style={{
              position: 'fixed', left: piece.left, top: piece.top,
              width: piece.size, height: piece.size, background: '#ffffff',
              pointerEvents: 'none', zIndex: 9998,
              '--dx': piece.dx + 'px', '--dy': piece.dy + 'px',
              animation: 'squareBurst 0.6s ease-out forwards',
            }} />
          ))}
        </>,
        document.body
      )}
    </div>
  );
};

const numFontSize = (val, boxSize) => {
  const len = String(Math.abs(val ?? 0)).length;
  if (boxSize >= 40) return len <= 1 ? 21 : len === 2 ? 15 : 10;
  return len <= 1 ? 13 : len === 2 ? 10 : 8;
};

// Node rest positions/sizes inside the 400×440 card — identical coordinate space
// and values to circleContainerRef on Dissimilar Island.
const BUTTERFLY_BASE_POS = {
  n1: { left: 106, top: 80,  size: 40 },
  n2: { left: 248, top: 80,  size: 40 },
  d1: { left: 110, top: 170, size: 32 },
  d2: { left: 250, top: 170, size: 32 },
};
const BUTTERFLY_MAGNET_THRESHOLD = 60;
// Fly-in destinations as fractions of the card, matching Dissimilar's LABEL_POS
// (adds the floating layer's top:32 offset and half the 40px landing box).
const BUTTERFLY_LABEL_POS = {
  n1: { fx: (106 + 20) / 400, fy: (32 + 80  + 20) / 440 },
  d1: { fx: (110 + 20) / 400, fy: (32 + 170 + 20) / 440 },
  n2: { fx: (248 + 20) / 400, fy: (32 + 80  + 20) / 440 },
  d2: { fx: (250 + 20) / 400, fy: (32 + 170 + 20) / 440 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ButterflyCircleStage — inlined local component
// The "dissimilar" route: draw ∞ → DissimilarMagicCircle appears → N1/N2/D1/D2
// fly onto the circle → drag D1/D2 to combine into SD (denominator product) →
// drag D1/D2 into the opposite numerator's zone to unlock its cross-product
// input → once SD + both cross-products are correct, the CENTER node unlocks
// for the combined numerator → then the simplified final answer, floating over
// the fading circle. Ported faithfully from DissimilarIslandGame.jsx so this
// mechanic is the exact same experience on both islands — same positions,
// timings, animations, sounds, and the 3-strike/soft-fail system.
//
// Props:
//   problem        – the forged pair of improper fractions: {numerator1, denominator1, numerator2, denominator2, operator}
//   playerHealth   – current lives, used to decide whether a hard fail resets or lets defeat take over
//   onAnswerSubmit – ({numerator, denominator}) called once the final answer is confirmed correct
//   onWrongAnswer  – (hint, submittedValue, errorType) called on a hard fail / wrong final answer
// ─────────────────────────────────────────────────────────────────────────────
const ButterflyCircleStage = ({ problem, playerHealth, onAnswerSubmit, onWrongAnswer, onRequestHint, onGestureStart }) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const [showHint, setShowHint] = useState(true);
  const [circleDetected, setCircleDetected] = useState(false);
  const [interactableVisible, setInteractableVisible] = useState(true);

  const [n1Visible, setN1Visible] = useState(false);
  const [d1Visible, setD1Visible] = useState(false);
  const [n2Visible, setN2Visible] = useState(false);
  const [d2Visible, setD2Visible] = useState(false);
  const [dragOffsets, setDragOffsets] = useState({ d1: { dx: 0, dy: 0 }, d2: { dx: 0, dy: 0 } });
  const [inMagnetZone, setInMagnetZone] = useState({ n1: false, n2: false, d1: false, d2: false });
  const [pulsatingWhite, setPulsatingWhite] = useState({ n1: false, n2: false, d1: false, d2: false });
  const [dragScreenPos, setDragScreenPos] = useState(null);
  const [denominatorPhase, setDenominatorPhase] = useState(null);
  const [denExplosion, setDenExplosion] = useState(false);
  const [sdBlinking, setSdBlinking] = useState(false);
  const [sdInputVal, setSdInputVal] = useState('');
  const [sdCorrect, setSdCorrect] = useState(false);
  const [confirmPressed, setConfirmPressed] = useState(false);
  const [sdParticles, setSdParticles] = useState([]);
  const sdInputRef = useRef(null);
  const sdParticleIvRef = useRef(null);

  const [n1CrossPhase, setN1CrossPhase] = useState(null);
  const [n2CrossPhase, setN2CrossPhase] = useState(null);
  const [n1CrossVal, setN1CrossVal] = useState('');
  const [n2CrossVal, setN2CrossVal] = useState('');
  const [n1CrossCorrect, setN1CrossCorrect] = useState(false);
  const [n2CrossCorrect, setN2CrossCorrect] = useState(false);
  const [n1CrossConfirmed, setN1CrossConfirmed] = useState(false);
  const [n2CrossConfirmed, setN2CrossConfirmed] = useState(false);
  const [crossExplosion, setCrossExplosion] = useState(null);
  const [n1CrossParticles, setN1CrossParticles] = useState([]);
  const [n2CrossParticles, setN2CrossParticles] = useState([]);
  const n1CrossInputRef = useRef(null);
  const n2CrossInputRef = useRef(null);
  const n1CrossParticleIvRef = useRef(null);
  const n2CrossParticleIvRef = useRef(null);

  const [centerPhase, setCenterPhase] = useState(null);
  const [centerVal, setCenterVal] = useState('');
  const [centerCorrect, setCenterCorrect] = useState(false);
  const [centerConfirmed, setCenterConfirmed] = useState(false);
  const [centerParticles, setCenterParticles] = useState([]);
  const centerInputRef = useRef(null);
  const centerParticleIvRef = useRef(null);

  const [finalAnswerPhase, setFinalAnswerPhase] = useState(false);
  const [finalNumInput, setFinalNumInput] = useState('');
  const [finalDenInput, setFinalDenInput] = useState('');
  const finalNumRef = useRef(null);

  const [circleFailCount, setCircleFailCount] = useState(0);
  const [circleMistakes, setCircleMistakes] = useState([]);
  const [circleFailSequence, setCircleFailSequence] = useState(null);
  const [circleShaking, setCircleShaking] = useState(false);

  const circleRef = useRef(null);
  const floatingDivRef = useRef(null);
  const dragRef = useRef(null);
  const actionLocked = useRef(false);
  const n1OverlayRef = useRef(null); const d1OverlayRef = useRef(null);
  const n2OverlayRef = useRef(null); const d2OverlayRef = useRef(null);
  const [flyBubbles, setFlyBubbles] = useState(null);
  const [explodeSparkles, setExplodeSparkles] = useState([]);
  const sparklePidRef = useRef(0);
  const bRef1 = useRef(null); const bRef2 = useRef(null);
  const bRef3 = useRef(null); const bRef4 = useRef(null);
  const magnetSoundRef = useRef(null);

  const d1 = problem.denominator1, d2 = problem.denominator2;
  const n1 = problem.numerator1,   n2 = problem.numerator2;

  // ── fly-in ──
  const triggerNumberFlyIn = () => {
    if (!circleRef.current) return;
    const cRect = circleRef.current.getBoundingClientRect();
    const SIZE = 44;

    const getSrc = (tag) => {
      const el = document.querySelector(`[data-fly="${tag}"]`);
      if (!el) return { left: cRect.left, top: cRect.top };
      const r = el.getBoundingClientRect();
      return { left: r.left + r.width / 2 - SIZE / 2, top: r.top + r.height / 2 - SIZE / 2 };
    };
    const sources = { n1: getSrc('conv0-n'), d1: getSrc('conv0-d'), n2: getSrc('conv1-n'), d2: getSrc('conv1-d') };

    const dst = Object.fromEntries(
      Object.entries(BUTTERFLY_LABEL_POS).map(([k, { fx, fy }]) => [k, {
        x: cRect.left + fx * cRect.width  - SIZE / 2,
        y: cRect.top  + fy * cRect.height - SIZE / 2,
      }])
    );

    const ctrl = {};
    ['n1', 'd1', 'n2', 'd2'].forEach(k => {
      const s = sources[k], d = dst[k];
      ctrl[k] = {
        x: (s.left + d.x) / 2 + (Math.random() - 0.5) * 300,
        y: Math.min(s.top, d.y) - 80 - Math.random() * 120,
      };
    });

    const bezier    = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
    const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

    const order   = ['n1', 'd1', 'n2', 'd2'];
    const bRefs   = { n1: bRef1, d1: bRef2, n2: bRef3, d2: bRef4 };
    const setters = { n1: setN1Visible, d1: setD1Visible, n2: setN2Visible, d2: setD2Visible };
    const values  = { n1, d1, n2, d2 };

    setFlyBubbles({});
    order.forEach((key, idx) => {
      setTimeout(() => {
        setFlyBubbles(prev => prev !== null ? { ...prev, [key]: { ...sources[key], opacity: 1, value: values[key] } } : prev);
        playSfx('/SoundEffects/sparkleSound.wav');
      }, 500 + idx * 150);
    });

    let arrived = 0;
    setTimeout(() => {
      order.forEach((key, idx) => {
        setTimeout(() => {
          playSfx('/SoundEffects/numberMove.wav');
          const s = sources[key], d = dst[key], c = ctrl[key];
          const ref = bRefs[key];
          const duration = 900, t0 = performance.now();

          const frame = (now) => {
            const raw = Math.min((now - t0) / duration, 1);
            const t   = easeInOut(raw);
            if (ref.current) {
              ref.current.style.left = bezier(t, s.left, c.x, d.x) + 'px';
              ref.current.style.top  = bezier(t, s.top,  c.y, d.y) + 'px';
            }
            if (raw < 1) {
              requestAnimationFrame(frame);
            } else {
              if (ref.current) ref.current.style.opacity = '0';
              playSfx('/SoundEffects/sparkleExplode.wav');
              setters[key](true);
              // Center on the token's own true midpoint — d1/d2 tokens are 32px
              // (not 40px like n1/n2), so a flat +20 landed off-center on them.
              const pos = BUTTERFLY_BASE_POS[key];
              const sid = sparklePidRef.current++;
              setExplodeSparkles(prev => [...prev, { id: sid, left: pos.left + pos.size / 2, top: pos.top + pos.size / 2 }]);
              setTimeout(() => setExplodeSparkles(prev => prev.filter(s => s.id !== sid)), 800);
              arrived++;
              if (arrived === order.length) setFlyBubbles(null);
            }
          };
          requestAnimationFrame(frame);
        }, idx * 150);
      });
    }, 2000);
  };

  const handleInfinityDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setCircleDetected(true);
    onGestureStart?.();
  };

  useEffect(() => {
    if (!circleDetected) return;
    const t = setTimeout(triggerNumberFlyIn, 1200);
    return () => clearTimeout(t);
  }, [circleDetected]);

  // ── drag ──
  const handleNumPointerDown = (e, key) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const elRect = e.currentTarget.getBoundingClientRect();
    const toCenterDx = e.clientX - (elRect.left + elRect.width / 2);
    const toCenterDy = e.clientY - (elRect.top + elRect.height / 2);
    const floatTop = floatingDivRef.current?.getBoundingClientRect().top ?? 0;
    dragRef.current = { key, startX: e.clientX, startY: e.clientY, startDx: dragOffsets[key].dx + toCenterDx, startDy: dragOffsets[key].dy + toCenterDy, startFloatTop: floatTop };
    setDragScreenPos({ x: e.clientX, y: e.clientY, key });
    const audio = new Audio('/SoundEffects/magnet.wav');
    audio.loop = true;
    audio.playbackRate = 0.5;
    audio.volume = getSfxVolume();
    audio.play().catch(() => {});
    magnetSoundRef.current = audio;
  };

  const handleNumPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const floatTop = floatingDivRef.current?.getBoundingClientRect().top ?? d.startFloatTop;
    const floatDrift = floatTop - d.startFloatTop;
    const newDx = d.startDx + (e.clientX - d.startX);
    const newDy = d.startDy + (e.clientY - d.startY) - floatDrift;
    setDragOffsets(prev => ({ ...prev, [d.key]: { dx: newDx, dy: newDy } }));
    setDragScreenPos(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
    const b = BUTTERFLY_BASE_POS[d.key];
    const myCx = b.left + b.size / 2 + newDx;
    const myCy = b.top  + b.size / 2 + newDy;
    const otherKey = d.key === 'd1' ? 'd2' : 'd1';
    const RESTRICTED = { d1: 'n1', d2: 'n2' };
    const ALLOWED_TARGETS = {
      d1: [...(!n2CrossPhase ? ['n2'] : []), ...(!denominatorPhase && !sdBlinking ? ['d2'] : [])],
      d2: [...(!n1CrossPhase ? ['n1'] : []), ...(!denominatorPhase && !sdBlinking ? ['d1'] : [])],
    };
    const newMagnet = { n1: false, n2: false, d1: false, d2: false };
    const newPulse  = { n1: false, n2: false, d1: false, d2: false };
    const dists = ['n1', 'n2', otherKey].map(tk => {
      const t = BUTTERFLY_BASE_POS[tk];
      const dist = Math.hypot(myCx - (t.left + t.size / 2), myCy - (t.top + t.size / 2));
      if (dist < BUTTERFLY_MAGNET_THRESHOLD && !(confirmPressed && tk === otherKey)) {
        newMagnet[d.key] = true;
        if (RESTRICTED[d.key] !== tk) newMagnet[tk] = true;
        if (ALLOWED_TARGETS[d.key].includes(tk)) { newPulse[d.key] = true; newPulse[tk] = true; }
      }
      return dist;
    });
    setInMagnetZone(newMagnet);
    setPulsatingWhite(newPulse);
    if (dragRef.current) {
      dragRef.current.nearOtherDen = dists[2] < BUTTERFLY_MAGNET_THRESHOLD;
      dragRef.current.nearCrossTarget = (d.key === 'd1' && dists[1] < BUTTERFLY_MAGNET_THRESHOLD) || (d.key === 'd2' && dists[0] < BUTTERFLY_MAGNET_THRESHOLD);
      dragRef.current.currentDx = newDx;
      dragRef.current.currentDy = newDy;
    }
    if (magnetSoundRef.current) {
      const minDist = Math.min(...dists);
      magnetSoundRef.current.playbackRate = 0.1 + Math.max(0, 1 - minDist / 200) * 0.6;
    }
  };

  const handleNumPointerUp = () => {
    const d = dragRef.current;
    const nearOther = d?.nearOtherDen ?? false;
    const nearCross = d?.nearCrossTarget ?? false;
    const curDx = d?.currentDx ?? 0;
    const curDy = d?.currentDy ?? 0;
    const dragKey = d?.key;
    setInMagnetZone({ n1: false, n2: false, d1: false, d2: false });
    setPulsatingWhite({ n1: false, n2: false, d1: false, d2: false });
    if (magnetSoundRef.current) { magnetSoundRef.current.pause(); magnetSoundRef.current = null; }
    setDragScreenPos(null);
    dragRef.current = null;
    const canCross = nearCross && (dragKey === 'd1' ? !n2CrossPhase : !n1CrossPhase);
    const canCombine = nearOther && !denominatorPhase && !sdBlinking;
    if (canCross) {
      triggerCrossProduct(dragKey, curDx, curDy);
    } else {
      if (d) setDragOffsets(prev => ({ ...prev, [dragKey]: { dx: 0, dy: 0 } }));
      if (canCombine) triggerDenominatorCombine();
    }
  };

  // ── SD (denominator product) ──
  const triggerDenominatorCombine = () => {
    if (denominatorPhase || sdBlinking) return;
    setDenominatorPhase('glowing');
    setTimeout(() => {
      setDenominatorPhase('to-sd');
      // Smooth bezier glide toward the center SD slot — mirrors the arc-returning
      // animation below exactly (same easing/technique, opposite direction), instead
      // of snapping the offset straight to its end value in one frame.
      const bezierIn = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
      const easeIn = t => 1 - Math.pow(1 - t, 3);
      const d1El = d1OverlayRef.current, d2El = d2OverlayRef.current;
      const dur = 500, t0 = performance.now();
      const frame = (now) => {
        const raw = Math.min((now - t0) / dur, 1);
        const t = easeIn(raw);
        if (d1El) { d1El.style.left = bezierIn(t, 110, 150, 181) + 'px'; d1El.style.top = bezierIn(t, 170, 130, 214) + 'px'; }
        if (d2El) { d2El.style.left = bezierIn(t, 250, 210, 181) + 'px'; d2El.style.top = bezierIn(t, 170, 130, 214) + 'px'; }
        if (raw < 1) { requestAnimationFrame(frame); }
        else { setDragOffsets({ d1: { dx: 71, dy: 44 }, d2: { dx: -69, dy: 44 } }); }
      };
      requestAnimationFrame(frame);
    }, 400);
    setTimeout(() => {
      setDenExplosion(true);
      setSdBlinking(true);
      playSfx('/SoundEffects/sparkleExplode.wav');
      setTimeout(() => setDenExplosion(false), 900);
      setDenominatorPhase('arc-returning');
      const bezier = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
      const ease   = t => 1 - Math.pow(1 - t, 3);
      const d1El = d1OverlayRef.current, d2El = d2OverlayRef.current;
      const dur = 650, t0 = performance.now();
      const frame = (now) => {
        const raw = Math.min((now - t0) / dur, 1);
        const t   = ease(raw);
        if (d1El) { d1El.style.left = bezier(t, 181, 100, 110) + 'px'; d1El.style.top = bezier(t, 214, 100, 170) + 'px'; }
        if (d2El) { d2El.style.left = bezier(t, 181, 260, 250) + 'px'; d2El.style.top = bezier(t, 214, 100, 170) + 'px'; }
        if (raw < 1) { requestAnimationFrame(frame); }
        else {
          setDragOffsets({ d1: { dx: 0, dy: 0 }, d2: { dx: 0, dy: 0 } });
          setDenominatorPhase('sd-input');
          setSdInputVal('');
          setSdCorrect(false);
          setConfirmPressed(false);
          setSdParticles([]);
          if (sdParticleIvRef.current) { clearInterval(sdParticleIvRef.current); sdParticleIvRef.current = null; }
          setTimeout(() => sdInputRef.current?.focus(), 50);
        }
      };
      requestAnimationFrame(frame);
    }, 1720);
  };

  // ── cross products ──
  const triggerCrossProduct = (dragKey, startDx, startDy) => {
    const explodeKey = dragKey === 'd1' ? 'n2' : 'n1';
    if (explodeKey === 'n2' && n2CrossPhase) return;
    if (explodeKey === 'n1' && n1CrossPhase) return;
    const base = BUTTERFLY_BASE_POS[dragKey];
    setCrossExplosion(explodeKey);
    playSfx('/SoundEffects/sparkleExplode.wav');
    setTimeout(() => setCrossExplosion(null), 900);
    const el = dragKey === 'd1' ? d1OverlayRef.current : d2OverlayRef.current;
    const sx = base.left + startDx, sy = base.top + startDy;
    const ex = base.left,          ey = base.top;
    const cpX = (sx + ex) / 2 + (dragKey === 'd1' ? -50 : 50);
    const cpY = Math.min(sy, ey) - 70;
    const bez = (t, p0, cp, p1) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * cp + t ** 2 * p1;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const dur = 600, t0 = performance.now();
    const frame = now => {
      const raw = Math.min((now - t0) / dur, 1), t = ease(raw);
      if (el) { el.style.left = bez(t, sx, cpX, ex) + 'px'; el.style.top = bez(t, sy, cpY, ey) + 'px'; }
      if (raw < 1) requestAnimationFrame(frame);
      else setDragOffsets(prev => ({ ...prev, [dragKey]: { dx: 0, dy: 0 } }));
    };
    requestAnimationFrame(frame);
    if (explodeKey === 'n1') {
      setN1CrossPhase('blinking'); setN1CrossVal(''); setN1CrossCorrect(false); setN1CrossConfirmed(false);
      setTimeout(() => n1CrossInputRef.current?.focus(), 50);
    } else {
      setN2CrossPhase('blinking'); setN2CrossVal(''); setN2CrossCorrect(false); setN2CrossConfirmed(false);
      setTimeout(() => n2CrossInputRef.current?.focus(), 50);
    }
  };

  const spawnCrossParticles = (setFn, ivRef, slBase, stBase, txBase, tyBase) => {
    const spawn = () => {
      const spread = 18, pid = Date.now(), ps = [];
      for (let i = 0; i < 8; i++) {
        ps.push({ id: pid + i, sl: slBase + (Math.random() - 0.5) * spread, st: stBase + (Math.random() - 0.5) * spread, tx: txBase + (Math.random() - 0.5) * spread, ty: tyBase + (Math.random() - 0.5) * spread, delay: Math.random() * 0.15, size: Math.floor(Math.random() * 5 + 4) });
      }
      setFn(ps);
    };
    spawn();
    if (ivRef.current) clearInterval(ivRef.current);
    ivRef.current = setInterval(spawn, 600);
  };

  // ── CENTER unlock ──
  useEffect(() => {
    if (sdCorrect && n1CrossCorrect && n2CrossCorrect && !centerPhase) {
      setCenterPhase('blinking');
      setCenterVal('');
      setCenterCorrect(false);
      setCenterConfirmed(false);
      setTimeout(() => centerInputRef.current?.focus(), 100);
    }
  }, [sdCorrect, n1CrossCorrect, n2CrossCorrect]);

  // ── final answer ──
  useEffect(() => {
    if (centerCorrect && !finalAnswerPhase) {
      setTimeout(() => {
        setFinalAnswerPhase(true);
        setFinalNumInput(''); setFinalDenInput('');
        setTimeout(() => finalNumRef.current?.focus(), 100);
      }, 1200);
    }
  }, [centerCorrect]);

  const crossSum = () => {
    const n1s = d2 * n1, n2s = d1 * n2;
    return problem.operator === '+' ? n1s + n2s : n1s - n2s;
  };
  const rawNum = crossSum();
  const rawDen = d1 * d2;
  const fG = gcd(Math.abs(rawNum), rawDen) || 1;
  const fSNum = rawNum / fG, fSDen = rawDen / fG;
  const fIsWhole = fSDen === 1;

  // ── fail system ──
  const resetCircleState = () => {
    setCircleDetected(false);
    setInteractableVisible(true);
    setN1Visible(false); setD1Visible(false); setN2Visible(false); setD2Visible(false);
    setDragOffsets({ d1: { dx: 0, dy: 0 }, d2: { dx: 0, dy: 0 } });
    setDenominatorPhase(null); setDenExplosion(false); setSdBlinking(false);
    setSdInputVal(''); setSdCorrect(false); setConfirmPressed(false);
    setSdParticles([]); if (sdParticleIvRef.current) { clearInterval(sdParticleIvRef.current); sdParticleIvRef.current = null; }
    setN1CrossPhase(null); setN2CrossPhase(null);
    setN1CrossVal(''); setN2CrossVal('');
    setN1CrossCorrect(false); setN2CrossCorrect(false);
    setN1CrossConfirmed(false); setN2CrossConfirmed(false);
    setCrossExplosion(null);
    setN1CrossParticles([]); setN2CrossParticles([]);
    if (n1CrossParticleIvRef.current) { clearInterval(n1CrossParticleIvRef.current); n1CrossParticleIvRef.current = null; }
    if (n2CrossParticleIvRef.current) { clearInterval(n2CrossParticleIvRef.current); n2CrossParticleIvRef.current = null; }
    setCenterPhase(null); setCenterVal(''); setCenterCorrect(false); setCenterConfirmed(false);
    setCenterParticles([]); if (centerParticleIvRef.current) { clearInterval(centerParticleIvRef.current); centerParticleIvRef.current = null; }
    setFinalAnswerPhase(false);
    setCircleFailCount(0); setCircleMistakes([]); setCircleShaking(false);
    setFlyBubbles(null);
    setInMagnetZone({ n1: false, n2: false, d1: false, d2: false });
    setPulsatingWhite({ n1: false, n2: false, d1: false, d2: false });
  };

  const triggerCircleFailSequence = (mistakes) => {
    const willPlayerDie = playerHealth <= 1;
    setCircleFailSequence('flashing');
    playSfx('/SoundEffects/initialDissimilarFail.wav');

    setTimeout(() => {
      setCircleFailSequence('fading');
      setInteractableVisible(false);
    }, 2000);

    setTimeout(() => {
      setCircleFailSequence(null);
      const last = mistakes[mistakes.length - 1];
      const formula = last.label === 'SD' ? `${d1} × ${d2}`
        : last.label === 'N1' ? `${d2} × ${n1}`
        : last.label === 'N2' ? `${d1} × ${n2}`
        : `${d2 * n1} ${problem.operator} ${d1 * n2}`;
      const hint = `${formula} = ${last.correct}`;
      const misconceptionType = last.label === 'SD' ? 'WRONG_DENOMINATOR_PRODUCT'
        : last.label === 'N1' ? 'WRONG_CROSS_MULTIPLY_LEFT'
        : last.label === 'N2' ? 'WRONG_CROSS_MULTIPLY_RIGHT'
        : 'WRONG_CROSS_PRODUCT_COMBINATION';
      onWrongAnswer?.(hint, last.entered, misconceptionType);
    }, 2900);

    setTimeout(() => {
      if (willPlayerDie) return;
      resetCircleState();
    }, 7400);
  };

  const recordFail = (label, entered, correct, prevMistakes) => {
    const updated = [...prevMistakes, { label, entered: String(entered), correct: String(correct) }];
    setCircleMistakes(updated);
    const newCount = circleFailCount + 1;
    setCircleFailCount(newCount);
    playSfx('/SoundEffects/dissimilarWrong.wav');
    setCircleShaking(true);
    setTimeout(() => setCircleShaking(false), 1000);
    if (newCount >= 3) triggerCircleFailSequence(updated);
    return updated;
  };

  // ── Confirm button ──
  const sdActive     = denominatorPhase === 'sd-input' && !confirmPressed && !!sdInputVal && !circleFailSequence;
  const n1Active      = n1CrossPhase === 'blinking' && !n1CrossConfirmed && !!n1CrossVal && !circleFailSequence;
  const n2Active      = n2CrossPhase === 'blinking' && !n2CrossConfirmed && !!n2CrossVal && !circleFailSequence;
  const centerActive  = centerPhase === 'blinking' && !centerConfirmed && !!centerVal && !circleFailSequence;
  const finalActive   = finalAnswerPhase && (fIsWhole ? !!finalNumInput : !!finalNumInput && !!finalDenInput);
  const confirmEnabled = sdActive || n1Active || n2Active || centerActive || finalActive;

  const handleConfirm = () => {
    if (sdActive) {
      const sdAns = d1 * d2;
      if (parseInt(sdInputVal) === sdAns) {
        setConfirmPressed(true);
        setSdCorrect(true);
        playSfx('/SoundEffects/circleAppear.wav');
        const spawnBatch = () => {
          const spread = 18, pid = Date.now(), ps = [];
          for (let i = 0; i < 7; i++) {
            ps.push({ id: pid + i,      sl: 126 + (Math.random() - .5) * spread, st: 186 + (Math.random() - .5) * spread, tx: 71  + (Math.random() - .5) * spread, ty: 44 + (Math.random() - .5) * spread, delay: Math.random() * .18, size: Math.floor(Math.random() * 5 + 4) });
            ps.push({ id: pid + i + 20, sl: 266 + (Math.random() - .5) * spread, st: 186 + (Math.random() - .5) * spread, tx: -69 + (Math.random() - .5) * spread, ty: 44 + (Math.random() - .5) * spread, delay: Math.random() * .18, size: Math.floor(Math.random() * 5 + 4) });
          }
          setSdParticles(ps);
        };
        spawnBatch();
        if (sdParticleIvRef.current) clearInterval(sdParticleIvRef.current);
        sdParticleIvRef.current = setInterval(spawnBatch, 600);
      } else {
        recordFail('SD', sdInputVal, sdAns, circleMistakes);
      }
    } else if (n1Active) {
      const n1Ans = d2 * n1;
      if (parseInt(n1CrossVal) === n1Ans) {
        setN1CrossConfirmed(true);
        setN1CrossCorrect(true);
        playSfx('/SoundEffects/circleAppear.wav');
        spawnCrossParticles(setN1CrossParticles, n1CrossParticleIvRef, 266, 186, -140, -86);
      } else {
        recordFail('N1', n1CrossVal, n1Ans, circleMistakes);
      }
    } else if (n2Active) {
      const n2Ans = d1 * n2;
      if (parseInt(n2CrossVal) === n2Ans) {
        setN2CrossConfirmed(true);
        setN2CrossCorrect(true);
        playSfx('/SoundEffects/circleAppear.wav');
        spawnCrossParticles(setN2CrossParticles, n2CrossParticleIvRef, 126, 186, 142, -86);
      } else {
        recordFail('N2', n2CrossVal, n2Ans, circleMistakes);
      }
    } else if (centerActive) {
      setCenterConfirmed(true);
      const ans = crossSum();
      if (parseInt(centerVal) === ans) {
        setCenterCorrect(true);
        playSfx('/SoundEffects/circleAppear.wav');
        const spawn = () => {
          const pid = Date.now(), ps = [];
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2, r = 60 + Math.random() * 30, scatter = (Math.random() - .5) * 18;
            ps.push({ id: pid + i, sl: 197 + Math.cos(a) * r, st: 148 + Math.sin(a) * r, tx: -Math.cos(a) * r + scatter, ty: -Math.sin(a) * r + scatter, delay: Math.random() * .15, size: Math.floor(Math.random() * 5 + 4) });
          }
          setCenterParticles(ps);
        };
        spawn();
        if (centerParticleIvRef.current) clearInterval(centerParticleIvRef.current);
        centerParticleIvRef.current = setInterval(spawn, 600);
      } else {
        triggerCircleFailSequence([...circleMistakes, { label: 'CENTER', entered: centerVal, correct: String(ans) }]);
      }
    } else if (finalActive) {
      if (actionLocked.current) return;
      actionLocked.current = true;
      const correct = fIsWhole
        ? parseInt(finalNumInput) === fSNum
        : parseInt(finalNumInput) === fSNum && parseInt(finalDenInput) === fSDen;
      setFinalAnswerPhase(false);
      setInteractableVisible(false);
      if (correct) {
        setTimeout(() => {
          actionLocked.current = false;
          onAnswerSubmit({ numerator: fSNum, denominator: fSDen });
        }, 500);
      } else {
        const enteredRawMatch = fIsWhole
          ? parseInt(finalNumInput) === rawNum && rawDen === 1
          : parseInt(finalNumInput) === rawNum && parseInt(finalDenInput) === rawDen;
        const finalMisconceptionType = (fG > 1 && enteredRawMatch) ? 'FAILED_TO_SIMPLIFY' : 'INCORRECT_ANSWER';
        setTimeout(() => {
          actionLocked.current = false;
          onWrongAnswer?.(`${fSNum}${fIsWhole ? '' : '/' + fSDen}`, `${finalNumInput}${finalDenInput ? '/' + finalDenInput : ''}`, finalMisconceptionType);
          if (playerHealth > 1) setTimeout(resetCircleState, 4500);
        }, 500);
      }
    }
  };

  // ── node overlay renderer (N1/N2/D1/D2, or their cross/SD-consuming replacement) ──
  const renderNode = (key) => {
    const visible = { n1: n1Visible, n2: n2Visible, d1: d1Visible, d2: d2Visible }[key];
    if (!visible) return null;
    const base = BUTTERFLY_BASE_POS[key];
    const draggable = key === 'd1' || key === 'd2';
    const offset = draggable ? dragOffsets[key] : { dx: 0, dy: 0 };
    const vibrating = inMagnetZone[key];
    const overlayRef = { n1: n1OverlayRef, d1: d1OverlayRef, n2: n2OverlayRef, d2: d2OverlayRef }[key];
    const value = { n1, n2, d1, d2 }[key];

    // Cross-product input takes over N1/N2's box once triggered
    if (key === 'n1' || key === 'n2') {
      const crossPhase   = key === 'n1' ? n1CrossPhase : n2CrossPhase;
      const crossCorrect = key === 'n1' ? n1CrossCorrect : n2CrossCorrect;
      const crossInputRef = key === 'n1' ? n1CrossInputRef : n2CrossInputRef;
      const crossVal     = key === 'n1' ? n1CrossVal : n2CrossVal;
      const setCrossVal  = key === 'n1' ? setN1CrossVal : setN2CrossVal;
      const crossAnswer  = key === 'n1' ? d2 * n1 : d1 * n2;
      if (crossPhase) {
        return (
          <div key={key} style={{
            position: 'absolute', left: base.left, top: base.top, width: base.size, height: base.size,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px dashed #e8d5b4', borderRadius: 0, fontFamily: '"Press Start 2P", monospace',
            animation: `sdBlink ${crossCorrect ? '2s' : '0.6s'} ease-in-out infinite`,
            pointerEvents: 'auto', zIndex: 4,
          }}>
            {crossCorrect
              ? <span style={{ fontSize: numFontSize(crossAnswer, base.size), fontWeight: 900, color: '#ffffff', fontFamily: '"Press Start 2P", monospace' }}>{crossAnswer}</span>
              : <input
                  ref={crossInputRef} type="text" inputMode="numeric" pattern="[0-9]*"
                  value={crossVal} onChange={e => setCrossVal(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', height: '100%', textAlign: 'center', fontSize: numFontSize(crossVal || 0, base.size), fontWeight: 900, color: '#ffffff', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"Press Start 2P", monospace', padding: 0 }}
                />
            }
          </div>
        );
      }
    }

    const dragEnabled = draggable && (!denominatorPhase || confirmPressed)
      && !(sdCorrect && n1CrossCorrect && n2CrossCorrect)
      && !((n1CrossPhase === 'blinking' && !n1CrossConfirmed) || (n2CrossPhase === 'blinking' && !n2CrossConfirmed));

    return (
      <div
        key={key}
        ref={overlayRef}
        onPointerDown={dragEnabled ? (e) => handleNumPointerDown(e, key) : undefined}
        onPointerMove={draggable ? handleNumPointerMove : undefined}
        onPointerUp={draggable ? handleNumPointerUp : undefined}
        style={{
          position: 'absolute',
          left: base.left + offset.dx, top: base.top + offset.dy,
          width: base.size, height: base.size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: numFontSize(value, base.size), fontWeight: 900, color: '#e8d5b4',
          background: '#333333', border: '3px dashed #e8d5b4', borderRadius: 0,
          fontFamily: '"Press Start 2P", monospace',
          cursor: draggable ? 'grab' : 'default',
          opacity: draggable && dragScreenPos?.key === key ? 0.25 : 1,
          zIndex: 4, touchAction: 'none',
          animation: (denominatorPhase === 'glowing' || denominatorPhase === 'to-sd') && draggable
            ? 'denGlow 0.4s ease-in-out infinite'
            : [
                vibrating ? 'magnetVibrate 0.15s ease-in-out infinite' : null,
                pulsatingWhite[key] ? 'pulsateWhite 0.5s ease-in-out infinite' : null,
              ].filter(Boolean).join(', ') || 'none',
        }}
      >{value}</div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        /* Landing-sparkle burst, local to this stage — the shared global
           sparkBurst keeps opacity and scale on the same ease-out curve, so
           by the time it's grown large enough to read as "exploding" it has
           already faded to near-invisible, sitting right on top of a token
           that's now got its own dark background. This keeps it bright while
           it grows, then drops off fast only right at the very end, so the
           pop is actually visible. */
        @keyframes hybridLandBurst {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          15%  { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
          60%  { transform: translate(-50%, -50%) scale(2.4); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(3.4); opacity: 0; }
        }
      `}</style>
      {riseParticles()}
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

      {!circleDetected ? (
        <>
          {showHint && (
            <p style={{
              position: 'absolute', bottom: 16, left: '50%',
              transform: 'translateX(-50%)', margin: 0,
              color: '#ffffff', fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap',
              textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 3px 3px 0px rgba(0,0,0,1)',
              zIndex: 3, pointerEvents: 'none',
            }}>Draw an infinity to continue!</p>
          )}
          <div style={{ position: 'absolute', inset: 0, zIndex: 3 }} onPointerDown={() => { if (showHint) setShowHint(false); }}>
            <DrawingCanvas mode="infinity" onCircleDetected={handleInfinityDetected} />
          </div>
        </>
      ) : (
        <div
          ref={circleRef}
          style={{
            position: 'absolute', inset: 0, zIndex: 2,
            opacity: interactableVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            animation: circleShaking ? 'circleShake 0.5s ease-in-out 2' : 'none',
          }}
        >
          <div
            ref={floatingDivRef}
            style={{
              position: 'absolute', top: 32, left: 0, right: 0, height: '300px',
              animation: 'magicFloat 4s ease-in-out infinite',
              opacity: circleFailSequence === 'fading' || finalAnswerPhase ? 0 : 1,
              transition: (circleFailSequence === 'fading' || finalAnswerPhase) ? 'opacity 0.6s ease-out' : undefined,
            }}
          >
            <img
              src="/InteractableUI/DissimilarMagicCircle.png"
              alt="magic circle"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, width: '100%', height: '100%',
                objectFit: 'contain', pointerEvents: 'none',
                animation: circleFailSequence === 'flashing' ? 'circleFlash 0.12s ease-in-out infinite'
                  : circleFailCount === 2 ? 'circlePulse2 0.4s ease-in-out infinite'
                  : circleFailCount === 1 ? 'circlePulse1 0.75s ease-in-out infinite'
                  : 'problemFadeIn 0.5s ease-out',
              }}
            />

            {['n1', 'n2', 'd1', 'd2'].map(renderNode)}

            {/* Landing sparkle at each label the instant its fly-in arrives —
                hybridLandBurst's own keyframe already bakes in
                translate(-50%,-50%) to self-center on left/top, so
                s.left/s.top (already the token's true center) must be used
                directly here, not pre-offset — doing both double-shifted the
                sparkle up-left. */}
            {explodeSparkles.map(s => (
              <img key={s.id} src="/OtherEffects/BlueSparkle.png" alt="" style={{
                position: 'absolute', left: s.left, top: s.top,
                width: 40, height: 40, pointerEvents: 'none', zIndex: 6,
                animation: 'hybridLandBurst 0.8s ease-out forwards',
              }} />
            ))}

            {/* Denominator-explosion particle ring */}
            {denExplosion && [
              { dx: '-80px', dy: '-80px', s: 10 }, { dx: '-20px', dy: '-95px', s: 7 }, { dx: '20px', dy: '-95px', s: 9 }, { dx: '80px', dy: '-80px', s: 8 },
              { dx: '95px', dy: '-20px', s: 7 }, { dx: '95px', dy: '20px', s: 10 }, { dx: '80px', dy: '80px', s: 8 }, { dx: '20px', dy: '95px', s: 7 },
              { dx: '-20px', dy: '95px', s: 9 }, { dx: '-80px', dy: '80px', s: 7 }, { dx: '-95px', dy: '20px', s: 10 }, { dx: '-95px', dy: '-20px', s: 8 },
              { dx: '-50px', dy: '-110px', s: 6 }, { dx: '50px', dy: '-110px', s: 6 }, { dx: '110px', dy: '50px', s: 6 }, { dx: '-110px', dy: '50px', s: 6 },
            ].map((dir, i) => (
              <div key={i} style={{ position: 'absolute', left: 197, top: 230, width: dir.s, height: dir.s, background: '#ffffff', pointerEvents: 'none', zIndex: 6, '--dx': dir.dx, '--dy': dir.dy, animation: `squareBurst ${0.7 + (i % 3) * 0.1}s ease-out forwards` }} />
            ))}

            {/* Cross-explosion particle burst */}
            {crossExplosion && (() => {
              const cx = crossExplosion === 'n1' ? 126 : 268, cy = 100;
              return [
                { dx: '-70px', dy: '-70px', s: 9 }, { dx: '0px', dy: '-85px', s: 7 }, { dx: '70px', dy: '-70px', s: 9 },
                { dx: '85px', dy: '0px', s: 7 }, { dx: '70px', dy: '70px', s: 9 }, { dx: '0px', dy: '85px', s: 7 },
                { dx: '-70px', dy: '70px', s: 9 }, { dx: '-85px', dy: '0px', s: 7 },
                { dx: '-45px', dy: '-95px', s: 6 }, { dx: '45px', dy: '-95px', s: 6 }, { dx: '95px', dy: '45px', s: 6 }, { dx: '-95px', dy: '45px', s: 6 },
              ].map((d, i) => (
                <div key={i} style={{ position: 'absolute', left: cx, top: cy, width: d.s, height: d.s, background: '#ffffff', pointerEvents: 'none', zIndex: 6, '--dx': d.dx, '--dy': d.dy, animation: `squareBurst ${0.7 + (i % 3) * 0.1}s ease-out forwards` }} />
              ));
            })()}

            {/* SD slot */}
            {n1Visible && d1Visible && n2Visible && d2Visible && (
              denominatorPhase === 'sd-input' || sdBlinking ? (
                <div style={{
                  position: 'absolute', left: 177, top: 210, width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px dashed #ffffff', borderRadius: 0,
                  animation: `sdBlink ${sdCorrect ? '2s' : '0.6s'} ease-in-out infinite`,
                  zIndex: 5,
                }}>
                  {sdCorrect
                    ? <span style={{ fontSize: numFontSize(d1 * d2, 40), fontWeight: 900, color: '#ffffff', fontFamily: '"Press Start 2P", monospace' }}>{d1 * d2}</span>
                    : denominatorPhase === 'sd-input' && (
                      <input
                        ref={sdInputRef} type="text" inputMode="numeric" pattern="[0-9]*"
                        value={sdInputVal} onChange={e => setSdInputVal(e.target.value.replace(/\D/g, ''))}
                        style={{ width: '100%', height: '100%', textAlign: 'center', fontSize: numFontSize(sdInputVal || 0, 40), fontWeight: 900, color: '#ffffff', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"Press Start 2P", monospace', padding: 0 }}
                      />
                    )}
                </div>
              ) : (
                <div style={{ position: 'absolute', left: 177, top: 210, width: 40, height: 40, border: '3px dashed #ffffff', borderRadius: 0, background: 'transparent', boxShadow: '0 0 8px 3px rgba(0,0,0,0.7)', animation: 'numFadeIn 0.5s ease-out both', pointerEvents: 'none', zIndex: 3 }} />
              )
            )}

            {/* SD success particles */}
            {sdParticles.map(p => (
              <div key={p.id} style={{ position: 'absolute', left: p.sl, top: p.st, width: p.size, height: p.size, background: '#ffffff', pointerEvents: 'none', zIndex: 6, '--tx': p.tx + 'px', '--ty': p.ty + 'px', animation: `sdToTarget 0.75s ${p.delay}s ease-out forwards` }} />
            ))}
            {/* Cross success particles */}
            {[...n1CrossParticles, ...n2CrossParticles].map(p => (
              <div key={p.id} style={{ position: 'absolute', left: p.sl, top: p.st, width: p.size, height: p.size, background: '#ffffff', pointerEvents: 'none', zIndex: 6, '--tx': p.tx + 'px', '--ty': p.ty + 'px', animation: `sdToTarget 0.75s ${p.delay}s ease-out forwards` }} />
            ))}
            {/* CENTER success particles */}
            {centerParticles.map(p => (
              <div key={p.id} style={{ position: 'absolute', left: p.sl, top: p.st, width: p.size, height: p.size, background: '#ffffff', pointerEvents: 'none', zIndex: 6, '--tx': p.tx + 'px', '--ty': p.ty + 'px', animation: `sdToTarget 0.75s ${p.delay}s ease-out forwards` }} />
            ))}

            {/* CENTER slot */}
            {n1Visible && d1Visible && n2Visible && d2Visible && (
              centerPhase ? (
                <div style={{ position: 'absolute', left: 177, top: 128, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', zIndex: 5, overflow: 'visible' }}>
                  <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', width: 80, height: 80, left: -20, top: -20, animation: 'sparkleSpinPulse 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
                  {centerCorrect
                    ? <span style={{ position: 'relative', zIndex: 1, fontSize: numFontSize(crossSum(), 40), fontWeight: 900, color: '#fff', fontFamily: '"Press Start 2P", monospace', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>{crossSum()}</span>
                    : <input
                        ref={centerInputRef} type="text" inputMode="numeric" pattern="[0-9]*"
                        value={centerVal} onChange={e => setCenterVal(e.target.value.replace(/\D/g, ''))}
                        style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', textAlign: 'center', fontSize: numFontSize(centerVal || 0, 40), fontWeight: 900, color: '#fff', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"Press Start 2P", monospace', padding: 0, textShadow: '0 0 6px rgba(0,0,0,0.9)' }}
                      />
                  }
                </div>
              ) : (
                <div style={{ position: 'absolute', left: 177, top: 128, width: 40, height: 40, border: '3px dashed #ffffff', borderRadius: 0, background: 'transparent', boxShadow: '0 0 8px 3px rgba(0,0,0,0.7)', animation: 'numFadeIn 0.5s ease-out both', pointerEvents: 'none', zIndex: 3 }} />
              )
            )}
          </div>
        </div>
      )}

      {/* Final answer — floats over the fading circle, its own magicFloat copy */}
      {finalAnswerPhase && (() => {
        const fieldStyle = { width: 60, height: 44, fontSize: 20, fontWeight: 800, textAlign: 'center', border: '3px dashed #ffffff', borderRadius: 0, background: '#555555', color: '#ffffff', outline: 'none', appearance: 'none', fontFamily: '"Press Start 2P", monospace', WebkitAppearance: 'none' };
        return (
          <div style={{ position: 'absolute', top: '32px', left: 0, right: 0, height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'magicFloat 4s ease-in-out infinite', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'numFadeIn 0.5s ease-out both' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: '"Press Start 2P", monospace', textShadow: '1px 1px 4px rgba(0,0,0,0.7)', whiteSpace: 'nowrap' }}>Final Answer:</span>
              {fIsWhole ? (
                <input ref={finalNumRef} type="text" inputMode="numeric" value={finalNumInput} onChange={e => setFinalNumInput(e.target.value.replace(/[^0-9-]/g, ''))} style={fieldStyle} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <input ref={finalNumRef} type="text" inputMode="numeric" value={finalNumInput} onChange={e => setFinalNumInput(e.target.value.replace(/[^0-9-]/g, ''))} style={fieldStyle} />
                  <div style={{ width: 60, height: 3, background: '#ffffff', borderRadius: 2 }} />
                  <input type="text" inputMode="numeric" value={finalDenInput} onChange={e => setFinalDenInput(e.target.value.replace(/[^0-9-]/g, ''))} style={fieldStyle} />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Drag ghost + Confirm button + fly-in bubbles/sparkles, portaled to escape the panel's transform */}
      {createPortal(
        <>
          {dragScreenPos && (() => {
            const info = { d1: { size: 32, val: d1 }, d2: { size: 32, val: d2 } }[dragScreenPos.key];
            if (!info) return null;
            const vibrating = inMagnetZone[dragScreenPos.key];
            return (
              <div style={{
                position: 'fixed', left: dragScreenPos.x - info.size / 2, top: dragScreenPos.y - info.size / 2,
                width: info.size, height: info.size, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: numFontSize(info.val, info.size), fontWeight: 900, color: '#e8d5b4',
                border: '3px dashed #e8d5b4', borderRadius: 0, background: '#333',
                fontFamily: '"Press Start 2P", monospace', pointerEvents: 'none', zIndex: 9999,
                animation: [
                  vibrating ? 'magnetVibrate 0.15s ease-in-out infinite' : null,
                  pulsatingWhite[dragScreenPos.key] ? 'pulsateWhite 0.5s ease-in-out infinite' : null,
                ].filter(Boolean).join(', ') || 'none',
              }}>{info.val}</div>
            );
          })()}

          {flyBubbles && ([
            { key: 'n1', ref: bRef1 }, { key: 'd1', ref: bRef2 },
            { key: 'n2', ref: bRef3 }, { key: 'd2', ref: bRef4 },
          ]).map(({ key, ref }) => {
            const b = flyBubbles[key];
            return b ? (
              <div key={key} ref={ref} style={{
                position: 'fixed', left: b.left, top: b.top, width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, pointerEvents: 'none', opacity: b.opacity, transition: 'opacity 0.3s ease',
              }}>
                <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'sparkleSpin 1.2s linear infinite', pointerEvents: 'none' }} />
                <span style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)', fontFamily: '"Press Start 2P", monospace' }}>{b.value}</span>
              </div>
            ) : null;
          })}
        </>,
        document.body
      )}

      {/* Confirm button — shows as soon as all 4 numbers have landed (matches
          Dissimilar Island's own gate), disabled via confirmEnabled until
          there's actually something to confirm, instead of popping in only
          once the current step is already answerable. */}
      {circleDetected && n1Visible && d1Visible && n2Visible && d2Visible && (
        <SolveButtonRow
          label={finalActive ? 'Cast Spell' : 'Confirm'}
          onConfirm={handleConfirm}
          confirmEnabled={confirmEnabled}
          onHint={onRequestHint ? () => onRequestHint(
            sdActive     ? `${d1} × ${d2} = ?`
          : n1Active     ? `${d2} × ${n1} = ?`
          : n2Active     ? `${d1} × ${n2} = ?`
          : centerActive ? `${d2 * n1} ${problem.operator} ${d1 * n2} = ?`
          :                `Simplify ${rawNum}/${rawDen}.`
          ) : undefined}
        />
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
  const [feedback,       setFeedback]       = useState('');
  const [feedbackType,   setFeedbackType]   = useState('');
  const [currentHint,    setCurrentHint]    = useState('');
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [gameOver,       setGameOver]       = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasSeenMixedTutorial, setHasSeenMixedTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const [problem,          setProblem]          = useState(() => generateProblem());
  // stage: 'forge' -> 'similar' | 'butterfly'
  // ('forge' gates on the triangle-draw gesture internally, see ForgeCircleStage;
  // 'similar'/'butterfly' each gate their own circle/infinity-draw gesture too)
  const [stage,            setStage]            = useState(() => problem.isMixed ? 'forge' : 'similar');
  const [butterflyProblem, setButterflyProblem] = useState(problem);
  // uiVisible: hides the interactable card (and pulls player/enemy in close) the instant
  // any answer is submitted — mirrors Similar/Dissimilar Island's interactableVisible.
  const [uiVisible,        setUiVisible]        = useState(true);
  // gestureActive: true only once the CURRENT stage's own draw gesture (triangle/
  // circle/infinity) has actually succeeded — mirrors Similar/Dissimilar Island's
  // `circleDetected`, so the player/enemy push-apart is tied to the gesture itself,
  // not just to the card being generically visible from page load.
  const [gestureActive,    setGestureActive]     = useState(false);
  const [particleDigits] = useState(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)));
  const [bgShift,          setBgShift]          = useState(null);
  const lastBgShiftRef = useRef(null);
  const [envParticles,     setEnvParticles]     = useState([]);

  // Bottom-anchored, scale-to-fit interactive panel (mirrors Similar/Dissimilar Island)
  // The card itself is a fixed 400x440 — identical to the circleContainerRef box on
  // Similar/Dissimilar Island, zero padding so the inner stages (calibrated for a
  // clean 400x440 canvas, same as circleContainerRef) get the exact space they expect.
  // Cast Spell/Confirm/Check now live INSIDE that 400x440 box (bottom:12, matching
  // Similar/Dissimilar), so the scale-fit no longer needs extra reserved height.
  const CARD_W = 400, CARD_H = 440, CARD_BORDER = 4;
  const PANEL_W = CARD_W, PANEL_H = CARD_H;

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

  const envPidRef = useRef(0);

  // ── combat OST — mirrors Similar/Dissimilar Island: a random one of the three
  // island-specific tracks on level start, switching to a random shared boss
  // track once the enemy turns out to be a boss. Also feeds a bass-intensity
  // analyser into `pulse`, driving the same glow-behind-the-problem effect. ──
  const ostRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const pulseRafRef = useRef(null);
  const [pulse, setPulse] = useState(0); // 0-1 bass intensity

  const playOST = (src) => {
    if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; }
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = getMasterVolume();
    audio.crossOrigin = 'anonymous';
    audio.currentTime = 0;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.85;
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      const src_ = audioCtxRef.current.createMediaElementSource(audio);
      src_.connect(analyserRef.current);
    } catch { /* ignore — pulse glow just stays off */ }

    audio.play().then(() => audioCtxRef.current?.resume()).catch(() => {});
    ostRef.current = audio;
  };

  // Bass-pulse RAF loop
  useEffect(() => {
    const tick = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bassAvg = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
        setPulse(bassAvg / 255);
      }
      pulseRafRef.current = requestAnimationFrame(tick);
    };
    pulseRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pulseRafRef.current);
  }, []);

  useEffect(() => {
    const track = Math.floor(Math.random() * 3) + 1;
    playOST(`/OSTFiles/hybridcombatOST${track}.mp3`);
    return () => { if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; } };
  }, [gameSession.level]);

  useEffect(() => {
    if (enemyData?.type === 'boss') {
      const track = Math.floor(Math.random() * 2) + 1;
      playOST(`/OSTFiles/bossOST${track}.mp3`);
    }
  }, [enemyData?.type]);

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

  // The converted improper fraction shown under the problem once Forge is done —
  // glowing white, no background/border, just the number and a thin glowing rule.
  // Tagged data-fly="conv{idx}-n/d" so Similar/Butterfly's own fly-in launches
  // from these (the numbers actually being used), not the original mixed digits.
  const convertedFrac = (idx, num, den) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'convertedFracPulse 1.6s ease-in-out infinite' }}>
      <span data-fly={`conv${idx}-n`} style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', minWidth: 40, textAlign: 'center', textShadow: '0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.6)' }}>{num}</span>
      <div style={{ width: 40, height: 2, background: '#ffffff', margin: '3px 0', boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
      <span data-fly={`conv${idx}-d`} style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', minWidth: 40, textAlign: 'center', textShadow: '0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.6)' }}>{den}</span>
    </div>
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

  const handleMasterVolumeChanged = (volume01) => {
    if (ostRef.current) ostRef.current.volume = volume01;
  };

  const confirmExit = async () => {
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

  // ── forge complete ──
  const handleForgeComplete = ({ imp1, imp2 }) => {
    const patched = {
      whole1: 0, numerator1: imp1.n, denominator1: imp1.d,
      whole2: 0, numerator2: imp2.n, denominator2: imp2.d,
      operator: problem.operator, isMixed: false,
    };
    setButterflyProblem(patched);
    // Equal denominators route into SimilarCircleStage, different denominators
    // into ButterflyCircleStage — both gate their own draw gesture internally
    // (circle vs. infinity) rather than through a separate generic gesture screen.
    setStage(imp1.d === imp2.d ? 'similar' : 'butterfly');
    setCurrentHint('');
    // The new stage gates its own fresh draw gesture — don't carry over Forge's.
    setGestureActive(false);
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
      setStage(next.isMixed ? 'forge' : 'similar');
      setFeedback('');
      setFeedbackType('');
      // New problem/stage — its gesture hasn't been drawn yet.
      setGestureActive(false);
      // Reveal the card again + bounce the background back to center — mirrors
      // Similar/Dissimilar Island's generateNextProblem.
      setUiVisible(true);
      if (lastBgShiftRef.current) {
        setBgShift(`return-${lastBgShiftRef.current}`);
        lastBgShiftRef.current = null;
        setTimeout(() => setBgShift(null), 700);
      }
    }, 10000);
  };

  const handleAnswerSubmit = (payload) => {
    // Hide the interactable card + shift the background/pull player&enemy close —
    // matches Similar/Dissimilar Island's click-time behavior on every answer.
    setUiVisible(false);
    setBgShift('right');
    lastBgShiftRef.current = 'right';
    playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
    setTimeout(() => launchFireball(() => resolveCorrectAnswer(payload)), 500);
  };

  const handleWrongAnswer = async (hint, submittedValue, errorType) => {
    // Hide the interactable card + shift the background/pull player&enemy close,
    // immediately — before the enemy-attack/player-hurt sequence plays, matching
    // Similar/Dissimilar Island. The hint bubble is intentionally never populated
    // here: it should only ever appear once a Hint button is wired up to request one.
    setUiVisible(false);
    setBgShift('left');
    lastBgShiftRef.current = 'left';

    const newLives = playerHealth - 1;
    setPlayerHealth(newLives);
    setStreak(0);
    setMultiplier(1.0);
    setEnemyAttacking(true);
    setPlayerFlashing(true);
    setTimeout(() => setPlayerFlashing(false), 500);
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
      setTimeout(() => {
        setEnemyAttacking(false);
        setFeedback('');
        setFeedbackType('');
        setUiVisible(true);
        if (lastBgShiftRef.current) {
          setBgShift(`return-${lastBgShiftRef.current}`);
          lastBgShiftRef.current = null;
          setTimeout(() => setBgShift(null), 100);
        }
      }, 10000);
    }
  };

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

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setShowTutorial(true); setHasSeenMixedTutorial(false); }}
            style={{
              position: 'relative', padding: '8px 16px', fontSize: 13, fontWeight: 700,
              fontFamily: '"Press Start 2P", monospace', background: '#e8d5b4', border: '4px solid #703737',
              borderRadius: 0, color: '#222', cursor: 'pointer',
            }}
          >
            {corners('#703737')}
            Help
          </button>
          <button
            onClick={() => setShowSettings(true)}
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
          <div className="wireframe-player" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginRight: gestureActive && uiVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex: 2, flexShrink: 0, position: 'relative', willChange: 'margin-right' }}>
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
              {/* Rising digit particles — visible while actively solving, same as Similar/Dissimilar Island */}
              {gestureActive && uiVisible && (
                <>
                  {[
                    { left: '5%',  delay: '0s',    dur: '2.6s', size: 28 }, { left: '18%', delay: '-0.6s', dur: '3.0s', size: 24 },
                    { left: '30%', delay: '-1.1s', dur: '2.4s', size: 32 }, { left: '42%', delay: '-0.3s', dur: '2.8s', size: 26 },
                    { left: '55%', delay: '-1.5s', dur: '2.7s', size: 22 }, { left: '67%', delay: '-0.9s', dur: '3.1s', size: 20 },
                    { left: '78%', delay: '-1.8s', dur: '2.5s', size: 30 }, { left: '90%', delay: '-0.4s', dur: '2.9s', size: 25 },
                    { left: '12%', delay: '-2.1s', dur: '2.6s', size: 21 }, { left: '48%', delay: '-1.3s', dur: '3.2s', size: 27 },
                    { left: '72%', delay: '-0.7s', dur: '2.3s', size: 23 }, { left: '35%', delay: '-2.4s', dur: '2.8s', size: 29 },
                  ].map((p, i) => (
                    <span key={i} style={{
                      position: 'absolute', bottom: 0, left: p.left,
                      fontSize: p.size, fontFamily: '"Press Start 2P", monospace', fontWeight: 900,
                      color: 'rgba(255,255,255,0.88)', lineHeight: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.45)',
                      pointerEvents: 'none', zIndex: 3, userSelect: 'none',
                      animation: `riseAndFade ${p.dur} ease-out ${p.delay} infinite`,
                    }}>{particleDigits[i] ?? 0}</span>
                  ))}
                </>
              )}
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
            <div style={{
              opacity: uiVisible ? 1 : 0, transition: 'opacity 0.4s ease',
              animation: 'magicFloat 3s ease-in-out infinite', position: 'relative',
              filter: pulse > 0.15 ? `drop-shadow(0 0 ${(pulse * 32).toFixed(1)}px rgba(112,55,55,${Math.min(pulse * 1.2, 1).toFixed(2)}))` : 'none',
              transform: `scale(${(1 + pulse * 0.07).toFixed(4)})`,
            }}>
              <div
                key={`${problem.whole1}-${problem.numerator1}-${problem.denominator1}-${problem.whole2}-${problem.numerator2}-${problem.denominator2}`}
                data-tutorial="problem-box"
                className="problem-fade-in"
                style={{
                  position: 'relative', background: '#e8d5b4', border: '4px solid #703737', borderRadius: 0,
                  padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                {corners('#703737')}
                <FractionBox whole={problem.whole1} num={problem.numerator1} den={problem.denominator1} tag="frac0" />
                <span style={{ fontSize: 32, fontWeight: 800, color: '#222' }}>{problem.operator}</span>
                <FractionBox whole={problem.whole2} num={problem.numerator2} den={problem.denominator2} tag="frac1" />
                <span style={{ fontSize: 28, fontWeight: 800, color: '#555' }}>= ?</span>
              </div>
              {fallParticles()}

              {/* Converted improper fractions — appear once the forge conversion is
                  done, outside the problem box entirely, glowing white with no
                  background/border, each aligned under its own original fraction
                  via the identical padding/gap layout above. Their numerator/
                  denominator spans double as the fly-in source for Similar/
                  Butterfly's own number animation (data-fly="conv{0|1}-{n|d}"). */}
              {problem.isMixed && stage !== 'forge' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 28px 0', border: '4px solid transparent', boxSizing: 'border-box', animation: 'problemFadeIn 0.4s ease-out' }}>
                  {/* Each original fraction's num/den column sits shifted right by its
                      own whole-number span + gap (FractionBox always shows one, since
                      isMixed is always true) — mirror that exact spacer here so the
                      converted fraction lands under the num/den column, not the whole.
                      The transparent 4px border mirrors the problem box's own visible
                      border above so both rows' content insets match exactly — without
                      it, this row sits 4px further left than the row it's meant to align
                      under, since the problem box's real border eats into its own inset. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, opacity: 0, pointerEvents: 'none' }}>{problem.whole1}</span>
                    {convertedFrac(0, butterflyProblem.numerator1, butterflyProblem.denominator1)}
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 800, opacity: 0, pointerEvents: 'none' }}>{problem.operator}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, opacity: 0, pointerEvents: 'none' }}>{problem.whole2}</span>
                    {convertedFrac(1, butterflyProblem.numerator2, butterflyProblem.denominator2)}
                  </div>
                  <span style={{ fontSize: 28, fontWeight: 800, opacity: 0, pointerEvents: 'none' }}>= ?</span>
                </div>
              )}
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
                <div data-tutorial="interactable" style={{
                  position: 'relative',
                  width: CARD_W,
                  height: CARD_H,
                  background: '#e8d5b4',
                  border: `${CARD_BORDER}px solid #703737`,
                  borderRadius: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  opacity: uiVisible ? 1 : 0,
                  pointerEvents: uiVisible ? 'auto' : 'none',
                  transition: 'opacity 0.4s ease',
                }}>
                  {corners('#703737')}
                  {stage === 'forge' ? (
                    <ForgeCircleStage problem={problem} playerHealth={playerHealth} onForgeComplete={handleForgeComplete} onWrongAnswer={handleWrongAnswer} onRequestHint={setCurrentHint} onGestureStart={() => setGestureActive(true)} />
                  ) : stage === 'butterfly' ? (
                    <ButterflyCircleStage
                      problem={butterflyProblem}
                      playerHealth={playerHealth}
                      onAnswerSubmit={handleAnswerSubmit}
                      onWrongAnswer={handleWrongAnswer}
                      onRequestHint={setCurrentHint}
                      onGestureStart={() => setGestureActive(true)}
                    />
                  ) : (
                    <SimilarCircleStage problem={butterflyProblem} onAnswerSubmit={handleAnswerSubmit} onWrongAnswer={handleWrongAnswer} onRequestHint={setCurrentHint} onGestureStart={() => setGestureActive(true)} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enemy */}
          <div className="wireframe-enemy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginLeft: gestureActive && uiVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex: 2, flexShrink: 0, willChange: 'margin-left' }}>
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
          position: 'fixed', left: '50%', zIndex: 5000, textAlign: 'center', padding: '14px 32px',
          border: '6px solid #fff', background: '#000',
          color: feedbackType === 'correct' ? '#4ade80' : '#f87171',
          fontSize: '22px', fontWeight: 700, whiteSpace: 'nowrap',
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

      {showTutorial && <HybridFractionTutorial onComplete={() => setShowTutorial(false)} />}
      {!showTutorial && showMixedTutorial && <MixedButterflyTutorial onComplete={() => setHasSeenMixedTutorial(true)} />}
      {showMixedTutorial && <HybridConversionTutorial onComplete={() => setHasSeenMixedTutorial(true)} />}

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

      {showSettings && (
        <SettingsPage
          volumeOnly
          exitLabel="Exit Session"
          onBack={() => setShowSettings(false)}
          onExit={confirmExit}
          onMasterVolumeChanged={handleMasterVolumeChanged}
        />
      )}
    </div>
  );
};

export default HybridIslandGame;