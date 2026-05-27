import React, { useState, useRef } from 'react';
import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
import ButterflyStepPanel from '../components/ButterflyStepPanel';
import ButterflyTutorial from '../components/ButterflyTutorial';
import MixedButterflyTutorial from '../components/MixedButterflyTutorial';
import './game.css';

const DissimilarIslandGame = ({ studentId, studentNickname, selectedCharacter, gameSession, onGameEnd, onExitToLobby }) => {
  const [playerHealth, setPlayerHealth] = useState(gameSession.lives);
  const [enemyLives, setEnemyLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [currentStep, setCurrentStep] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [hasSeenMixedTutorial, setHasSeenMixedTutorial] = useState(false);

  const butterflyPanelRef = useRef(null);

  const generateProblem = () => {
    const isMixed = gameSession.isBoss ? Math.random() > 0.4 : false;
    const operator = Math.random() > 0.5 ? '+' : '-';
    const d1 = Math.floor(Math.random() * 6) + 2;
    let d2 = Math.floor(Math.random() * 6) + 2;
    while (d2 === d1) d2 = Math.floor(Math.random() * 6) + 2;
    const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
    const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
    const w1 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;
    const w2 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;

    // For subtraction ensure left side is larger to keep result positive
    if (operator === '-') {
      const leftVal = w1 + n1 / d1;
      const rightVal = w2 + n2 / d2;
      if (leftVal < rightVal) {
        return { whole1: w2, numerator1: n2, denominator1: d2, whole2: w1, numerator2: n1, denominator2: d1, operator, isMixed };
      }
    }
    return { whole1: w1, numerator1: n1, denominator1: d1, whole2: w2, numerator2: n2, denominator2: d2, operator, isMixed };
  };

  const [problem, setProblem] = useState(generateProblem);

  // Derived — must be after problem is declared
  const showMixedTutorial = !showTutorial && problem.isMixed && !hasSeenMixedTutorial;

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const getCorrectAnswerStr = (p = problem) => {
    const imp1 = p.whole1 * p.denominator1 + p.numerator1;
    const imp2 = p.whole2 * p.denominator2 + p.numerator2;
    const cross1 = imp1 * p.denominator2;
    const cross2 = imp2 * p.denominator1;
    const commonDenom = p.denominator1 * p.denominator2;
    const sumDiff = p.operator === '+' ? cross1 + cross2 : cross1 - cross2;
    const divisor = gcd(Math.abs(sumDiff), commonDenom);
    return `${sumDiff / divisor}/${commonDenom / divisor}`;
  };

  const getProblemStatement = (p = problem) => {
    if (p.isMixed) {
      return `${p.whole1} ${p.numerator1}/${p.denominator1} ${p.operator} ${p.whole2} ${p.numerator2}/${p.denominator2}`;
    }
    return `${p.numerator1}/${p.denominator1} ${p.operator} ${p.numerator2}/${p.denominator2}`;
  };

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
      await fetch(
        `http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: isWon ? 'COMPLETED' : 'FAILED', isWon }) }
      );
    } catch (err) { console.error('Error saving game end:', err); }
  };

  const handleAnswerSubmit = ({ numerator, denominator }) => {
    const newStreak = streak + 1;
    const newMultiplier = Math.min(2.0, 1.0 + Math.max(0, newStreak - 3) * 0.2);
    const pointsEarned = Math.floor(100 * newMultiplier);
    const newScore = score + pointsEarned;
    const newEnemyLives = Math.max(0, enemyLives - 1);

    setStreak(newStreak);
    setMultiplier(newMultiplier);
    setScore(newScore);
    setEnemyLives(newEnemyLives);
    setCurrentHint('');
    setFeedback(`✓ Correct! +${pointsEarned} points`);
    setFeedbackType('correct');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId,
      mechanicType: gameSession.mechanicType || 'DISSIMILAR',
      problemStatement: getProblemStatement(),
      answerSubmitted: `${numerator}/${denominator}`,
      correctAnswer: getCorrectAnswerStr(),
      isCorrect: true,
      errorType: null,
      remainingLives: playerHealth,
      streakCount: newStreak,
      multiplierValue: newMultiplier,
      enemyHealthBefore: enemyLives * 33,
      enemyHealthAfter: newEnemyLives * 33,
      pointsEarned,
    });

    if (newEnemyLives <= 0) {
      saveGameEnd(true);
      setTimeout(() => onGameEnd({ isWon: true, score: newScore }), 1500);
      return;
    }

    setTimeout(() => {
      const next = generateProblem();
      setProblem(next);
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
      gameSessionId: gameSession.sessionId,
      mechanicType: gameSession.mechanicType || 'DISSIMILAR',
      problemStatement: getProblemStatement(),
      answerSubmitted: String(submittedValue ?? ''),
      correctAnswer: getCorrectAnswerStr(),
      isCorrect: false,
      errorType: errorType || 'INCORRECT_ANSWER',
      remainingLives: newLives,
      streakCount: 0,
      multiplierValue: 1.0,
      enemyHealthBefore: enemyLives * 33,
      enemyHealthAfter: enemyLives * 33,
      pointsEarned: 0,
    });

    if (newLives <= 0) {
      saveGameEnd(false);
      setTimeout(() => setGameOver(true), 800);
    } else {
      setTimeout(() => {
        setEnemyAttacking(false);
        setFeedback('');
        setFeedbackType('');
      }, 4000);
    }
  };

  const renderHearts = (count, max) => {
    const hearts = [];
    for (let i = 0; i < max; i++) {
      hearts.push(<span key={i} style={{ fontSize: '22px' }}>{i < count ? '❤️' : '🤍'}</span>);
    }
    return hearts;
  };

  const characterSrc = selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png';

  const problemDisplay = problem.isMixed
    ? `${problem.whole1} ${problem.numerator1}/${problem.denominator1} ${problem.operator} ${problem.whole2} ${problem.numerator2}/${problem.denominator2}`
    : `${problem.numerator1}/${problem.denominator1} ${problem.operator} ${problem.numerator2}/${problem.denominator2}`;

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
          💡 {currentHint || 'Solve using the butterfly method!'}
        </div>
      </div>

      {/* Hearts + problem row */}
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
            borderRadius: '20px',
            padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
          }}>
            <ButterflyDiagramCanvas problem={problem} currentStep={currentStep} />
            <ButterflyStepPanel
              ref={butterflyPanelRef}
              problem={problem}
              onAnswerSubmit={handleAnswerSubmit}
              onWrongAnswer={handleWrongAnswer}
              onStepCorrect={() => setCurrentHint('')}
              onStepChange={(step) => setCurrentStep(step)}
            />
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
              src="/enemy1.png"
              alt="Enemy"
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

      {/* Cast Spell button */}
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

      {/* Feedback */}
      {feedback && (
        <div style={{
          textAlign: 'center', padding: '16px', borderRadius: '8px',
          border: '2px solid #888',
          background: feedbackType === 'correct' ? '#d4edda' : '#f8d7da',
          color: feedbackType === 'correct' ? '#155724' : '#721c24',
          fontWeight: 'bold',
        }}>
          {feedback}
        </div>
      )}

      {/* Tutorial overlays — sequenced: butterfly → mixed → game starts */}
      {showTutorial && (
        <ButterflyTutorial onComplete={() => setShowTutorial(false)} />
      )}
      {showMixedTutorial && (
        <MixedButterflyTutorial onComplete={() => setHasSeenMixedTutorial(true)} />
      )}

      {/* Game Over popup */}
      {gameOver && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '48px 56px',
            textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ fontSize: '64px' }}>💀</div>
            <h1 style={{ margin: 0, fontSize: '36px', color: '#dc2626' }}>GAME OVER</h1>
            <p style={{ margin: 0, fontSize: '18px', color: '#555' }}>You ran out of hearts!</p>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Final Score: {score}</div>
            <button
              style={{
                marginTop: '12px', padding: '12px 36px', fontSize: '18px',
                fontWeight: 'bold', background: '#8b5cf6', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
              }}
              onClick={onExitToLobby}
            >
              Return to Island Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DissimilarIslandGame;
