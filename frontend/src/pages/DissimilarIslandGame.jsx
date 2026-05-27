import React, { useState, useEffect, useRef } from 'react';
import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
import ButterflyStepPanel from '../components/ButterflyStepPanel';
import './game.css';

const DissimilarIslandGame = ({ studentId, gameSession, onGameEnd, onExitToLobby }) => {

  const [playerHealth, setPlayerHealth] = useState(gameSession.lives);
  const [enemyHealth, setEnemyHealth] = useState(gameSession.enemyHealth);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [enemyAttacking, setEnemyAttacking] = useState(false);

  const handleStepChange = (step) => {
    setCurrentStep(step);
  };

  const handleGameEndInternal = async (isWon) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: isWon ? 'COMPLETED' : 'FAILED',
            isWon: isWon,
          }),
        }
      );
      if (response.ok) {
        onGameEnd({ isWon, score });
      }
    } catch (err) {
      console.error('Error ending game:', err);
      onGameEnd({ isWon, score });
    }
  };

  const enemyAnimationRef = useRef(null);
  const enemyPositionRef = useRef({ x: 0, y: 0 });
  const enemyVelocityRef = useRef({ x: 2, y: 1.5 });

  const generateProblem = () => {
    const operator = Math.random() > 0.5 ? '+' : '-';
    const denominator1 = Math.floor(Math.random() * 8) + 2;
    const denominator2 = Math.floor(Math.random() * 8) + 2;
    const numerator1 = Math.floor(Math.random() * (denominator1 - 1)) + 1;
    const numerator2 = Math.floor(Math.random() * (denominator2 - 1)) + 1;
    return { numerator1, denominator1, numerator2, denominator2, operator };
  };

  const [problem, setProblem] = useState(generateProblem());

  useEffect(() => {
    const enemySection = document.querySelector('.enemy-section');
    if (!enemySection) return;

    const animateEnemy = () => {
      const rect = enemySection.getBoundingClientRect();
      const maxX = rect.width - 150;
      const maxY = 100;

      enemyPositionRef.current.x += enemyVelocityRef.current.x;
      enemyPositionRef.current.y += enemyVelocityRef.current.y;

      if (enemyPositionRef.current.x <= 0 || enemyPositionRef.current.x >= maxX) {
        enemyVelocityRef.current.x *= -1;
      }
      if (enemyPositionRef.current.y <= 0 || enemyPositionRef.current.y >= maxY) {
        enemyVelocityRef.current.y *= -1;
      }

      const enemy = document.querySelector('.enemy');
      if (enemy) {
        enemy.style.transform = `translate(${enemyPositionRef.current.x}px, ${enemyPositionRef.current.y}px)`;
      }

      enemyAnimationRef.current = requestAnimationFrame(animateEnemy);
    };

    enemyAnimationRef.current = requestAnimationFrame(animateEnemy);

    return () => {
      if (enemyAnimationRef.current) {
        cancelAnimationFrame(enemyAnimationRef.current);
      }
    };
  }, []);

  const handleAnswerSubmit = (answer) => {
    const commonDenom = problem.denominator1 * problem.denominator2;
    const sumDiff = problem.operator === '+' 
      ? (problem.numerator1 * problem.denominator2) + (problem.numerator2 * problem.denominator1)
      : (problem.numerator1 * problem.denominator2) - (problem.numerator2 * problem.denominator1);
    
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.abs(sumDiff), commonDenom);
    const correctAnswer = {
      numerator: sumDiff / divisor,
      denominator: commonDenom / divisor
    };

    const isCorrect = answer.numerator === correctAnswer.numerator && answer.denominator === correctAnswer.denominator;

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 100 * (1 + Math.floor(streak / 3)));
      setStreak(s => s + 1);
      setEnemyHealth(h => {
        const newHealth = h - 1;
        if (newHealth <= 0) {
          setTimeout(() => handleGameEndInternal(true), 1500);
        }
        return newHealth;
      });
      setTimeout(() => {
        setProblem(generateProblem());
        setFeedback(null);
        setCurrentStep(0);
      }, 1500);
    } else {
      setFeedback('wrong');
      setStreak(0);
      setPlayerHealth(h => {
        const newHealth = h - 1;
        if (newHealth <= 0) {
          setTimeout(() => handleGameEndInternal(false), 1500);
        }
        return newHealth;
      });
      setEnemyAttacking(true);
      setTimeout(() => {
        setEnemyAttacking(false);
        setProblem(generateProblem());
        setFeedback(null);
        setCurrentStep(0);
      }, 2000);
    }
  };

  const handleExit = () => {
    onExitToLobby();
  };

  return (
    <div className="game-container dissimilar-island">
      <div className="game-header">
        <div className="header-stat">
          <span className="stat-label">HP:</span>
          <div className="hearts">
            {[...Array(playerHealth)].map((_, i) => (
              <span key={i} className="heart">❤️</span>
            ))}
          </div>
        </div>
        <div className="header-stat">
          <span className="stat-label">Streak:</span>
          <span className="stat-value">x{1 + Math.floor(streak / 3)}</span>
        </div>
        <div className="header-stat">
          <span className="stat-label">Score:</span>
          <span className="stat-value">{score}</span>
        </div>
        <div className="header-stat">
          <span className="stat-label">Level:</span>
          <span className="stat-value">{gameSession.level}/6</span>
        </div>
        <button className="exit-btn" onClick={handleExit}>Menu</button>
      </div>

      <div className="game-main">
        <div className="player-section">
          <h3>Player</h3>
          <div className="character-box">
            <span className="character-icon">
              🧙
            </span>
          </div>
          <div className="player-hearts">
            {[...Array(playerHealth)].map((_, i) => (
              <span key={i}>❤️</span>
            ))}
          </div>
        </div>

        <div className="problem-area">
          <h3>Solve the Fraction!</h3>
          <div className="problem-statement-large">
            {problem.numerator1}/{problem.denominator1} {problem.operator} {problem.numerator2}/{problem.denominator2}
          </div>
          <div className="problem-section">
            <ButterflyDiagramCanvas 
              problem={problem} 
              currentStep={currentStep} 
            />
            <ButterflyStepPanel 
              problem={problem}
              onAnswerSubmit={handleAnswerSubmit}
              feedback={feedback}
              onStepChange={handleStepChange}
            />
            {feedback && (
              <div className={`feedback-message ${feedback}`}>
                {feedback === 'correct' ? '✨ Correct! Great job!' : '❌ Try again!'}
              </div>
            )}
          </div>
        </div>

        <div className="enemy-section">
          <h3>Enemy</h3>
          <div className={`enemy ${enemyAttacking ? 'attacking' : ''}`}>
            <img 
              src="/enemy1.png" 
              alt="Enemy" 
              className="enemy-icon"
            />
          </div>
          <div className="enemy-hearts">
            {[...Array(enemyHealth)].map((_, i) => (
              <span key={i}>❤️</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DissimilarIslandGame;
