import React, { useState, useEffect, useRef } from 'react';
import './game.css';
import DrawingCanvas from '../components/DrawingCanvas';
import FractionPattern from '../components/FractionPattern';
import '../components/components.css';

const SimilarIslandGame = ({ studentId, gameSession, onGameEnd, onExitToLobby }) => {
  const [currentProblem, setCurrentProblem] = useState('2/3 + 1/3 = ?');
  const [mechanicType, setMechanicType] = useState(gameSession.mechanicType);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [lives, setLives] = useState(gameSession.lives);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [enemyHealth, setEnemyHealth] = useState(gameSession.enemyHealth);
  const [score, setScore] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [feedbackType, setFeedbackType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [circleDetected, setCircleDetected] = useState(false);
  const [bossPosition, setBossPosition] = useState({ x: 0, y: 0 });
  const enemySectionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 1 });
  const speedRef = useRef(2);

  const handleCircleDetected = () => {
    setCircleDetected(true);
  };

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const handleAnswerSubmit = async (submittedAnswer) => {
    setAnswer(submittedAnswer);
    setIsSubmitting(true);

    const match = currentProblem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
    let isCorrect = false;
    let correctAnswerStr = '0/0';
    
    if (match) {
      const num1 = parseInt(match[1]);
      const den1 = parseInt(match[2]);
      const op = match[3];
      const num2 = parseInt(match[4]);
      
      const resNum = op === '+' ? num1 + num2 : num1 - num2;
      const resDen = den1;
      const divisor = gcd(Math.abs(resNum), resDen);
      const simplifiedNum = resNum / divisor;
      const simplifiedDen = resDen / divisor;
      
      const nonSimplifiedAnswer = `${resNum}/${resDen}`;
      const simplifiedAnswer = `${simplifiedNum}/${simplifiedDen}`;
      
      correctAnswerStr = simplifiedAnswer;
      isCorrect = submittedAnswer === nonSimplifiedAnswer || submittedAnswer === simplifiedAnswer || 
                   (submittedAnswer === `${simplifiedNum}` && simplifiedDen === 1);
    }
    
    const healthDeduction = isCorrect ? 10 : 5;
    const newEnemyHealth = Math.max(0, enemyHealth - healthDeduction);
    const newStreak = isCorrect ? streak + 1 : 0;
    const newMultiplier = Math.min(2.0, 1.0 + newStreak * 0.2);
    const pointsEarned = isCorrect ? Math.floor(10 * newMultiplier) : 0;
    const newScore = score + pointsEarned;
    const newLives = isCorrect ? lives : lives - 1;

    const attempt = {
      gameSessionId: gameSession.sessionId,
      mechanicType: mechanicType,
      problemStatement: currentProblem,
      answerSubmitted: submittedAnswer,
      correctAnswer: correctAnswerStr,
      isCorrect: isCorrect,
      errorType: isCorrect ? null : 'INCORRECT_ANSWER',
      remainingLives: newLives,
      streakCount: newStreak,
      multiplierValue: newMultiplier,
      enemyHealthBefore: enemyHealth,
      enemyHealthAfter: newEnemyHealth,
      pointsEarned: pointsEarned,
    };

    await saveSpellAttempt(attempt);

    setEnemyHealth(newEnemyHealth);
    setStreak(newStreak);
    setMultiplier(newMultiplier);
    setScore(newScore);
    setLives(newLives);
    setProblemCount(problemCount + 1);
    setFeedbackType(isCorrect ? 'correct' : 'incorrect');
    setFeedback(
      isCorrect
        ? `✓ Correct! +${pointsEarned} points`
        : `✗ Incorrect. The answer is ${correctAnswerStr}`
    );

    if (!isCorrect) {
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 1000);
    }

    if (newLives <= 0) {
      handleGameEnd('FAILED', false);
      return;
    }

    if (newEnemyHealth <= 0) {
      handleGameEnd('COMPLETED', true);
      return;
    }

    setTimeout(() => {
      setFeedback('');
      setFeedbackType('');
      setCircleDetected(false);
      generateNextProblem();
    }, 3000);

    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!enemySectionRef.current) return;

    const animate = () => {
      const container = enemySectionRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const bossWidth = 100;
      const bossHeight = 100;
      const maxX = containerRect.width - bossWidth;
      const maxY = containerRect.height - bossHeight;

      setBossPosition(prev => {
        let newX = prev.x + directionRef.current.x * speedRef.current;
        let newY = prev.y + directionRef.current.y * speedRef.current;

        if (newX <= 0 || newX >= maxX) {
          directionRef.current.x *= -1;
          newX = Math.max(0, Math.min(maxX, newX));
        }

        if (newY <= 0 || newY >= maxY) {
          directionRef.current.y *= -1;
          newY = Math.max(0, Math.min(maxY, newY));
        }

        return { x: newX, y: newY };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const saveSpellAttempt = async (attempt) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/game-progress/spell-attempt/${gameSession.sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attempt),
        }
      );

      if (!response.ok) {
        console.error('Failed to save spell attempt');
      }
    } catch (err) {
      console.error('Error saving spell attempt:', err);
    }
  };

  const generateNextProblem = () => {
    const denominator = Math.floor(Math.random() * 8) + 2;
    const numerator1 = Math.floor(Math.random() * (denominator - 1)) + 1;
    const numerator2 = Math.floor(Math.random() * (denominator - 1)) + 1;
    const operator = Math.random() > 0.5 ? '+' : '-';
    setCurrentProblem(`${numerator1}/${denominator} ${operator} ${numerator2}/${denominator} = ?`);
  };

  const handleGameEnd = async (status, isWon) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: status,
            isWon: isWon,
          }),
        }
      );

      if (response.ok) {
        onGameEnd({ status, isWon, score });
      }
    } catch (err) {
      console.error('Error ending game session:', err);
      onGameEnd({ status, isWon, score });
    }
  };

  const handleExitGame = async () => {
    if (window.confirm('Are you sure you want to exit? Progress will be saved.')) {
      await handleGameEnd('PAUSED', false);
      onExitToLobby();
    }
  };

  const renderHearts = (count, max) => {
    const hearts = [];
    for (let i = 0; i < max; i++) {
      hearts.push(
        <span key={i} style={{ fontSize: '24px', color: i < count ? '#ff6b6b' : '#ddd' }}>
          {i < count ? '❤️' : '🤍'}
        </span>
      );
    }
    return hearts;
  };



  return (
    <div
      className="wireframe-game-container"
      style={{
        background: '#d4c5c9',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div
        className="wireframe-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          background: '#ddd',
          padding: '10px',
          border: '2px solid #888',
        }}
      >
        <button style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888' }}>
          Game logo
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>[Player Nickname]</span>
          <span>HP: {renderHearts(lives, 3)}</span>
          <span>Streak: x{multiplier.toFixed(1)}</span>
          <span>Score: {score}</span>
          <span>Level: {gameSession.level}/7</span>
        </div>
        <button 
          style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888' }}
          onClick={handleExitGame}
        >
          Menu
        </button>
      </div>

      <div
        className="wireframe-problem-header"
        style={{
          background: '#ddd',
          padding: '8px',
          textAlign: 'center',
          border: '2px solid #888',
        }}
      >
        <span style={{ fontSize: '14px' }}>Hint: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...</span>
      </div>

      <div
        className="wireframe-battle-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          className="wireframe-top-hearts"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: '5px' }}>{renderHearts(lives, 3)}</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Problem</div>
          <div style={{ display: 'flex', gap: '5px' }}>{renderHearts(Math.ceil(enemyHealth / 33), 3)}</div>
        </div>

        <div
          className="wireframe-main-battle"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <div
            className="wireframe-player"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '150px',
                border: '2px solid #888',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #888 10px, #888 12px)',
              }}></div>
              <span style={{ position: 'relative', zIndex: 1, fontSize: '48px' }}>🧙</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>Player</h3>
          </div>

          <div
            className="wireframe-problem"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div
              className="wireframe-fraction-display"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                  type="text"
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #888',
                    background: '#fff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#000',
                  }}
                  value="2"
                  readOnly
                />
                <div style={{ width: '80px', height: '4px', background: '#888' }}></div>
                <input
                  type="text"
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #888',
                    background: '#fff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#000',
                  }}
                  value="3"
                  readOnly
                />
              </div>
              <input
                type="text"
                style={{
                  width: '40px',
                  height: '40px',
                  border: '2px solid #888',
                  background: '#fff',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  color: '#000',
                }}
                value="+"
                readOnly
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                  type="text"
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #888',
                    background: '#fff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#000',
                  }}
                  value="1"
                  readOnly
                />
                <div style={{ width: '80px', height: '4px', background: '#888' }}></div>
                <input
                  type="text"
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #888',
                    background: '#fff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#000',
                  }}
                  value="3"
                  readOnly
                />
              </div>
            </div>

            <div
              style={{
                width: '400px',
                height: '300px',
                background: '#e0d5d9',
                border: '4px dashed #fff',
                borderRadius: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {!circleDetected ? (
                <DrawingCanvas onCircleDetected={handleCircleDetected} />
              ) : (
                <FractionPattern 
                  problem={currentProblem.replace(' = ?', '')} 
                  onAnswerSubmit={handleAnswerSubmit}
                />
              )}
            </div>
          </div>

          <div
            className="wireframe-enemy"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '150px',
                border: '2px solid #888',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #888 10px, #888 12px)',
              }}></div>
              <img 
                src="/enemy1.png" 
                alt="Enemy" 
                style={{ 
                  position: 'relative', 
                  zIndex: 1, 
                  width: '120px', 
                  height: '120px', 
                  objectFit: 'contain' 
                }} 
              />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>Enemy</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>

        <button
          className="wireframe-cast-btn"
          style={{
            padding: '10px 40px',
            background: '#ddd',
            border: '2px solid #888',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          Cast Spell
        </button>
      </div>

      {feedback && (
        <div 
          className="feedback"
          style={{
            textAlign: 'center',
            padding: '20px',
            marginTop: '10px',
            border: '2px solid #888',
            background: feedbackType === 'correct' ? '#d4edda' : '#f8d7da',
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
};

export default SimilarIslandGame;
