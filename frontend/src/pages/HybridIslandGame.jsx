import React, { useState, useRef, useEffect } from 'react';
import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
import ButterflyStepPanel from '../components/ButterflyStepPanel';
import MixedButterflyTutorial from '../components/MixedButterflyTutorial';
import './game.css';

// ─────────────────────────────────────────────────────────────────────────────
// MixedForgePanel — inlined local component
// Handles the drag-to-convert mechanic for both mixed fractions before the
// butterfly solving phase begins.
//
// Props:
//   problem         – full problem object
//   onForgeComplete – ({ imp1: {n,d}, imp2: {n,d} }) called when both done
// ─────────────────────────────────────────────────────────────────────────────
const MixedForgePanel = ({ problem, onForgeComplete, onWrongAnswer }) => {
  const [fracIndex, setFracIndex] = useState(0);
  const initFrac = () => ({ step: 'drag_den', product: null, improper_n: null });
  const [fracs, setFracs] = useState([initFrac(), initFrac()]);
  const [inputVal, setInputVal] = useState('');
  const [inputError, setInputError] = useState(false);
  const [hintMsg, setHintMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [dragTarget, setDragTarget] = useState(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  const wholeRef = useRef(null);
  const numRef   = useRef(null);

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
    setHintMsg('');
  }, [frac.step, fracIndex]);

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
      setHintMsg(`${d} × ${w} is not ${val}. Think again!`);
      setInputVal('');
      onWrongAnswer?.(`${d} × ${w} = ${correct}, not ${val}.`, String(val), 'WRONG_PRODUCT');
      setTimeout(() => { setInputError(false); setHintMsg(''); }, 1800);
    }
  };

  const checkSum = () => {
    const correct = frac.product + n;
    const val = parseInt(inputVal);
    if (val === correct) {
      updateFrac({ improper_n: correct, step: 'done' });
    } else {
      setInputError(true);
      setHintMsg(`${frac.product} + ${n} is not ${val}. Think again!`);
      setInputVal('');
      onWrongAnswer?.(`${frac.product} + ${n} = ${correct}, not ${val}.`, String(val), 'WRONG_SUM');
      setTimeout(() => { setInputError(false); setHintMsg(''); }, 1800);
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

  // ── token styles ──
  const token = (extra = {}) => ({
    width: 52, height: 52, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 800, border: '2px solid',
    userSelect: 'none', transition: 'all 0.2s', ...extra,
  });

  const wholeStyle = () => {
    const base = token({ background: '#0f2a50', borderColor: '#3a7abb', color: '#a0cfff' });
    if (frac.step === 'ask_sum' || frac.step === 'ask_sum_input')
      return { ...base, background: '#1a3a1a', borderColor: '#4caf50', color: '#80ff80', cursor: 'grab' };
    if (dropHighlight && dragTarget === 'den')
      return { ...base, borderColor: '#e94560', transform: 'scale(1.1)', boxShadow: '0 0 0 3px rgba(233,69,96,0.35)' };
    return base;
  };

  const numStyle = () => {
    const base = token({ background: '#0f2a20', borderColor: '#3a8a3a', color: '#a0f0a0' });
    if (dropHighlight && dragTarget === 'product')
      return { ...base, borderColor: '#e94560', transform: 'scale(1.1)', boxShadow: '0 0 0 3px rgba(233,69,96,0.35)' };
    if (frac.step === 'done')
      return { ...base, background: '#1a3a1a', borderColor: '#4caf50', color: '#80ff80' };
    return base;
  };

  const denStyle = () => {
    const draggable = frac.step === 'drag_den';
    return token({
      background: '#1a1a00', borderColor: draggable ? '#f5a623' : '#555',
      color: draggable ? '#f5a623' : '#888',
      cursor: draggable ? 'grab' : 'default',
      opacity: isDragging && dragTarget === 'den' ? 0.35 : 1,
      animation: draggable ? 'forgePulseDen 1.5s ease-in-out infinite' : 'none',
    });
  };

  const hintText =
    hintMsg ? hintMsg :
    frac.step === 'drag_den'      ? `Drag the denominator (${d}) onto the whole number (${w})` :
    frac.step === 'ask_product'   ? `What is ${d} × ${w}?` :
    frac.step === 'ask_sum'       ? `Now drag ${frac.product} up to the numerator (${n})` :
    frac.step === 'ask_sum_input' ? `What is ${frac.product} + ${n}?` :
    `✓ ${frac.improper_n}/${d} — forged!`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <style>{`
        @keyframes forgePulseDen {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(245,166,35,0); }
        }
      `}</style>

      {/* Step label */}
      <div style={{ fontSize: 12, color: '#f5a623', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
        ⚒ {frac.step !== 'done' ? `Converting fraction ${fracIndex + 1} of 2` : `Fraction ${fracIndex + 1} forged!`}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < fracIndex ? '#4caf50' : i === fracIndex ? '#f5a623' : '#2a2a5a',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* Fraction visual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Whole number token */}
        <div
          ref={wholeRef}
          style={wholeStyle()}
          onMouseDown={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
          onTouchStart={frac.step === 'ask_sum' ? (e) => startDrag(e, 'product') : undefined}
        >
          {(frac.step === 'ask_sum' || frac.step === 'ask_sum_input') ? frac.product : w}
        </div>

        {/* Numerator / bar / denominator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div ref={numRef} style={numStyle()}>
            {frac.step === 'done' ? frac.improper_n : n}
          </div>
          <div style={{ width: 52, height: 3, background: '#eaeaea', borderRadius: 2 }} />
          <div
            style={denStyle()}
            onMouseDown={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
            onTouchStart={frac.step === 'drag_den' ? (e) => startDrag(e, 'den') : undefined}
          >
            {d}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={{
        fontSize: 13, color: hintMsg ? '#e94560' : '#8892b0',
        background: '#1a1a2e', borderRadius: 8, padding: '6px 14px',
        border: `1px solid ${hintMsg ? '#e94560' : '#2a2a5a'}`,
        minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s', textAlign: 'center',
      }}>
        {hintText}
      </div>

      {/* Input row */}
      {(frac.step === 'ask_product' || frac.step === 'ask_sum_input') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#eaeaea', fontWeight: 700, fontSize: 15 }}>
            {frac.step === 'ask_product' ? `${d} × ${w} =` : `${frac.product} + ${n} =`}
          </span>
          <input
            autoFocus
            type="number"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: 68, height: 44, textAlign: 'center',
              fontSize: 20, fontWeight: 800,
              background: '#0a1628',
              border: `2px solid ${inputError ? '#e94560' : '#3a5a8a'}`,
              borderRadius: 10, color: '#eaeaea', outline: 'none',
            }}
          />
          <button
            onClick={frac.step === 'ask_product' ? checkProduct : checkSum}
            style={{
              padding: '8px 16px', background: '#f5a623', color: '#1a1000',
              border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer',
            }}
          >
            ⚒ Forge
          </button>
        </div>
      )}

      {/* Done — continue */}
      {frac.step === 'done' && (
        <button
          onClick={advanceFraction}
          style={{
            padding: '10px 28px', background: '#4caf50', color: '#001a00',
            border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}
        >
          {fracIndex === 0 ? 'Next Fraction →' : 'Start Solving →'}
        </button>
      )}

      {/* Floating drag token */}
      {isDragging && (
        <div style={{
          position: 'fixed', left: floatPos.x, top: floatPos.y,
          width: 52, height: 52, borderRadius: 10,
          background: '#0f3460', border: '2px solid #f5a623',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#f5a623',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {dragTarget === 'den' ? d : frac.product}
        </div>
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
  const [hasSeenMixedTutorial, setHasSeenMixedTutorial] = useState(false);

  const [problem,          setProblem]          = useState(() => generateProblem());
  const [forgePhase,       setForgePhase]       = useState(() => problem.isMixed ? 'forge' : 'butterfly');
  const [butterflyProblem, setButterflyProblem] = useState(problem);

  const butterflyPanelRef = useRef(null);

  const showMixedTutorial = problem.isMixed && !hasSeenMixedTutorial;

  // ── helpers ──
  function generateProblem() {
    const isMixed  = true;
    const operator = Math.random() > 0.5 ? '+' : '-';
    const d1       = Math.floor(Math.random() * 6) + 2;
    let   d2       = Math.floor(Math.random() * 6) + 2;
    while (d2 === d1) d2 = Math.floor(Math.random() * 6) + 2;
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
      <span key={i} style={{ fontSize: 22 }}>{i < count ? '❤️' : '🤍'}</span>
    ));

  // ── API ──
  const saveSpellAttempt = async (attempt) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/game-progress/spell-attempt/${gameSession.sessionId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt) }
      );
      if (!res.ok) console.error('Failed to save spell attempt');
    } catch (err) { console.error('Error saving spell attempt:', err); }
  };

  const saveGameEnd = async (isWon) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: isWon ? 'COMPLETED' : 'FAILED', isWon }) }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error('saveGameEnd failed:', res.status, body);
      }
    } catch (err) { console.error('Error saving game end:', err); }
  };

  // ── forge complete ──
  const handleForgeComplete = ({ imp1, imp2 }) => {
    const patched = {
      whole1: 0, numerator1: imp1.n, denominator1: imp1.d,
      whole2: 0, numerator2: imp2.n, denominator2: imp2.d,
      operator: problem.operator, isMixed: false,
    };
    setButterflyProblem(patched);
    setForgePhase('butterfly');
    setCurrentStep(1);
    setCurrentHint('');
  };

  // ── butterfly callbacks ──
  const handleAnswerSubmit = async ({ numerator, denominator }) => {
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
      await saveGameEnd(true);
      setTimeout(() => onGameEnd({ isWon: true, score: newScore }), 1500);
      return;
    }

    setTimeout(() => {
      const next = generateProblem();
      setProblem(next);
      setButterflyProblem(next);
      setForgePhase(next.isMixed ? 'forge' : 'butterfly');
      setFeedback('');
      setFeedbackType('');
      setCurrentStep(1);
    }, 1500);
  };

  const handleWrongAnswer = (hint, submittedValue, errorType) => {
    const newLives = playerHealth - 1;
    setPlayerHealth(newLives);
    setStreak(0);
    setMultiplier(1.0);
    setEnemyAttacking(true);
    if (hint) setCurrentHint(hint);
    setFeedback(`✗ Wrong! ${hint || 'Try again.'}`);
    setFeedbackType('incorrect');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId, mechanicType: gameSession.mechanicType || 'HYBRID',
      problemStatement: getProblemStatement(), answerSubmitted: String(submittedValue ?? ''),
      correctAnswer: getCorrectAnswerStr(), isCorrect: false,
      errorType: errorType || 'INCORRECT_ANSWER', remainingLives: newLives,
      streakCount: 0, multiplierValue: 1.0,
      enemyHealthBefore: enemyLives * 33, enemyHealthAfter: enemyLives * 33, pointsEarned: 0,
    });

    if (newLives <= 0) {
      saveGameEnd(false);
      setTimeout(() => setGameOver(true), 800);
    } else {
      setTimeout(() => { setEnemyAttacking(false); setFeedback(''); setFeedbackType(''); }, 4000);
    }
  };

  const problemDisplay = problem.isMixed
    ? `${problem.whole1} ${problem.numerator1}/${problem.denominator1} ${problem.operator} ${problem.whole2} ${problem.numerator2}/${problem.denominator2}`
    : `${problem.numerator1}/${problem.denominator1} ${problem.operator} ${problem.numerator2}/${problem.denominator2}`;

  const characterSrc = selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png';

  // ── render ──
  return (
    <div
      className="game-container dissimilar-island"
      style={{ minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '1200px', margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '6px',
        background: 'rgba(0,0,0,0.55)', padding: '10px 16px',
        borderRadius: '10px', border: '2px solid rgba(255,255,255,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888', borderRadius: '6px' }}>
            Game Logo
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#fff', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>{studentNickname || 'Player'}</span>
            <span>HP: {renderHearts(playerHealth, 3)}</span>
            <span>Streak: x{multiplier.toFixed(1)}</span>
            <span>Score: {score}</span>
            <span>Level: {gameSession.level || 1}/7</span>
          </div>
          <button
            style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888', borderRadius: '6px', cursor: 'pointer' }}
            onClick={onExitToLobby}
          >
            Menu
          </button>
        </div>
        <div style={{ fontSize: '13px', color: '#fef3c7', minHeight: '18px' }}>
          💡 {currentHint || (forgePhase === 'forge' ? 'Convert the mixed fractions first!' : 'Solve using the butterfly method!')}
        </div>
      </div>

      {/* Hearts + problem banner */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>{renderHearts(playerHealth, 3)}</div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 4px #000' }}>
          {problemDisplay}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>{renderHearts(enemyLives, 3)}</div>
      </div>

      {/* Battle area */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>

        {/* Player */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '150px', height: '150px', border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
          }}>
            <img src={characterSrc} alt="Player" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
          </div>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', textShadow: '1px 1px 3px #000' }}>Player</span>
        </div>

        {/* Center panel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '500px',
            background: 'rgba(255,255,255,0.92)',
            border: '4px dashed rgba(255,255,255,0.8)',
            borderRadius: '20px', padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          }}>
            {forgePhase === 'forge' ? (
              <div style={{
                width: '100%', background: '#1a1a2e', borderRadius: 14,
                padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <MixedForgePanel problem={problem} onForgeComplete={handleForgeComplete} onWrongAnswer={handleWrongAnswer} />
              </div>
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
        </div>

        {/* Enemy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '150px', height: '150px', border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
          }}>
            <img
              src="/enemy1.png" alt="Enemy"
              style={{
                width: '120px', height: '120px', objectFit: 'contain',
                filter: enemyAttacking ? 'hue-rotate(180deg) brightness(1.5)' : 'none',
                transition: 'filter 0.2s',
              }}
            />
          </div>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '18px', textShadow: '1px 1px 3px #000' }}>Enemy</span>
        </div>
      </div>

      {/* Cast Spell button — butterfly phase only */}
      {forgePhase === 'butterfly' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => butterflyPanelRef.current?.submitCurrentStep()}
            style={{
              padding: '10px 40px', fontSize: '18px', fontWeight: 'bold',
              background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer',
            }}
          >
            Cast Spell
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div style={{
          textAlign: 'center', padding: '16px', borderRadius: '8px', border: '2px solid #888',
          background: feedbackType === 'correct' ? '#d4edda' : '#f8d7da',
          color:      feedbackType === 'correct' ? '#155724' : '#721c24',
          fontWeight: 'bold',
        }}>
          {feedback}
        </div>
      )}


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
            position: 'relative', background: '#251e59',
            border: '4px solid #f6b825', borderRadius: '12px',
            boxShadow: '0 0 0 2px #18113c, 0 20px 40px rgba(0,0,0,0.6)',
            padding: '36px 56px 28px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, border: '1px solid #f6b825', borderRadius: '6px', pointerEvents: 'none' }} />
            <h1 style={{ fontSize: 'clamp(2.5em, 6vw, 5em)', fontWeight: 900, margin: 0, color: '#ef4444', textShadow: '0 0 20px rgba(0,0,0,0.6), 2px 2px 6px rgba(0,0,0,0.8)', letterSpacing: '6px', textTransform: 'uppercase' }}>DEFEAT!</h1>
            <p style={{ fontSize: 'clamp(1em, 2vw, 1.3em)', color: '#fff', margin: '36px 0 0', fontWeight: 500 }}>You ran out of hearts!</p>
            <p style={{ fontSize: 'clamp(1.1em, 2vw, 1.6em)', color: '#fff', margin: '12px 0 0', fontWeight: 700 }}>Score: {score}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button onClick={onExitToLobby} style={{ padding: '12px 28px', fontSize: '15px', fontWeight: 700, background: 'rgba(40,40,40,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              Return to Island Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HybridIslandGame;