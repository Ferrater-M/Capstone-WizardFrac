import React, { useState, useEffect, useRef } from 'react';
import './game.css';

const Game = ({ studentId, gameSession, onGameEnd }) => {
  const [currentProblem, setCurrentProblem] = useState(gameSession.firstProblem);
  const [mechanicType, setMechanicType] = useState(gameSession.mechanicType);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [lives, setLives] = useState(gameSession.lives);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [enemyHealth, setEnemyHealth] = useState(gameSession.enemyHealth);
  const [score, setScore] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [feedbackType, setFeedbackType] = useState(''); // 'correct', 'incorrect', ''
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bossPosition, setBossPosition] = useState({ x: 0, y: 0 });
  const enemySectionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 1 });
  const speedRef = useRef(gameSession.isBoss ? 2 : 0);

  // Boss movement animation
  useEffect(() => {
    if (!gameSession.isBoss || !enemySectionRef.current) return;

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
  }, [gameSession.isBoss]);

  // Auto-save spell attempt to backend
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

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSubmitting(true);

    // For demo purposes, check if answer matches the correct format
    // In real implementation, this would validate against actual math
    const isCorrect = answer.toLowerCase().includes('5/4') || answer === '5/4';
    const healthDeduction = isCorrect ? 10 : 5;
    const newEnemyHealth = Math.max(0, enemyHealth - healthDeduction);
    const newStreak = isCorrect ? streak + 1 : 0;
    const newMultiplier = Math.min(2.0, 1.0 + newStreak * 0.2);
    const pointsEarned = isCorrect ? Math.floor(10 * newMultiplier) : 0;
    const newScore = score + pointsEarned;
    const newLives = isCorrect ? lives : lives - 1;

    // Create spell attempt record
    const attempt = {
      gameSessionId: gameSession.sessionId,
      mechanicType: mechanicType,
      problemStatement: currentProblem,
      answerSubmitted: answer,
      correctAnswer: '5/4',
      isCorrect: isCorrect,
      errorType: isCorrect ? null : 'INCORRECT_ANSWER',
      remainingLives: newLives,
      streakCount: newStreak,
      multiplierValue: newMultiplier,
      enemyHealthBefore: enemyHealth,
      enemyHealthAfter: newEnemyHealth,
      pointsEarned: pointsEarned,
    };

    // Save attempt to database
    await saveSpellAttempt(attempt);

    // Update game state
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
        : `✗ Incorrect. The answer is 5/4`
    );
    setAnswer('');

    // Check game over conditions
    if (newLives <= 0) {
      handleGameEnd('FAILED', false);
      return;
    }

    if (newEnemyHealth <= 0) {
      handleGameEnd('COMPLETED', true);
      return;
    }

    // Reset feedback after delay and generate next problem
    setTimeout(() => {
      setFeedback('');
      setFeedbackType('');
      generateNextProblem();
    }, 2000);

    setIsSubmitting(false);
  };

  const generateNextProblem = () => {
    // Placeholder for next problem generation
    setCurrentProblem('3/4 + 1/4 = ?');
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
            hintsUsed: 0,
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
    }
  };

  const getIslandClassName = () => {
    switch (gameSession.islandType) {
      case 'Similar':
        return 'game-container similar-island';
      case 'Dissimilar':
        return 'game-container dissimilar-island';
      case 'Hybrid':
        return 'game-container hybrid-island';
      default:
        return 'game-container';
    }
  };

  return (
    <div className={getIslandClassName()}>
      <div className="game-header">
        <div className="game-info">
          <span className="island-info">
            {gameSession.islandType} Island - Stage {gameSession.stageNumber}
          </span>
        </div>
        <button className="exit-btn" onClick={handleExitGame}>
          EXIT
        </button>
      </div>

      <div className="game-main">
        <div className="game-stats">
          <div className="stat-box lives">
            <div className="stat-label">Lives</div>
            <div className="stat-value">{lives}</div>
          </div>
          <div className="stat-box streak">
            <div className="stat-label">Streak</div>
            <div className="stat-value">{streak}</div>
          </div>
          <div className="stat-box multiplier">
            <div className="stat-label">Multiplier</div>
            <div className="stat-value">{multiplier.toFixed(1)}x</div>
          </div>
          <div className="stat-box score">
            <div className="stat-label">Score</div>
            <div className="stat-value">{score}</div>
          </div>
        </div>

        <div className="enemy-section" ref={enemySectionRef}>
          <div 
            className={`enemy ${gameSession.isBoss ? 'boss' : ''}`}
            style={{
              transform: `translate(${bossPosition.x}px, ${bossPosition.y}px)`
            }}
          >
            <div className="enemy-icon">{gameSession.isBoss ? '👹' : '👿'}</div>
            <div className="health-bar">
              <div
                className="health-fill"
                style={{ width: `${(enemyHealth / gameSession.enemyHealth) * 100}%` }}
              />
            </div>
            <div className="health-text">
              {enemyHealth} / {gameSession.enemyHealth}
            </div>
          </div>
        </div>

        <div className="problem-section">
          <div className="mechanic-label">{mechanicType}</div>
          <div className="problem-statement">{currentProblem}</div>
        </div>

        <form onSubmit={handleSubmitAnswer} className="answer-form">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer (e.g., 5/4)"
            className="answer-input"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || !answer.trim()}
          >
            CAST SPELL
          </button>
        </form>

        {feedback && (
          <div className={`feedback ${feedbackType}`}>
            {feedback}
          </div>
        )}

        <div className="problem-counter">
          Problems Solved: {problemCount}
        </div>
      </div>
    </div>
  );
};

export default Game;
