import React, { useState, useEffect, useRef } from 'react';
import './game.css';
import DrawingCanvas from '../components/DrawingCanvas';
import FractionPattern from '../components/FractionPattern';
import SimilarFractionTutorial from '../components/SimilarFractionTutorial';
import GameMenuModal from '../components/GameMenuModal';
import '../components/components.css';

const SimilarIslandGame = ({ studentId, studentNickname, selectedCharacter, gameSession, onGameEnd, onExitToLobby }) => {
  const [currentProblem, setCurrentProblem] = useState('2/3 + 1/3 = ?');
  const [mechanicType, setMechanicType] = useState(gameSession.mechanicType);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [lives, setLives] = useState(gameSession.lives);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [enemyLives, setEnemyLives] = useState(null); // set dynamically from enemyData
  const [score, setScore] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [feedbackType, setFeedbackType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [currentHint, setCurrentHint] = useState('');
  const [circleDetected, setCircleDetected] = useState(false);
  const [magicN, setMagicN] = useState('');
  const [checkPhase, setCheckPhase] = useState(false);
  const [simplifiedInput, setSimplifiedInput] = useState('');
  const [simplifiedDenInput, setSimplifiedDenInput] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [phase2HintUsed, setPhase2HintUsed] = useState(false);
  const [interactableVisible, setInteractableVisible] = useState(true);
  const [formulaVisible, setFormulaVisible] = useState(false);
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [denAnimating, setDenAnimating] = useState(false);
  const [denVisible, setDenVisible] = useState(false);
  const [nVisible, setNVisible] = useState(false);
  const [showDenSparkle, setShowDenSparkle] = useState(false);
  const [appearSparkles, setAppearSparkles] = useState([]);
  const [bubbles, setBubbles] = useState(null);
  const bubble1Ref = useRef(null);
  const rectWrapperRef = useRef(null);
  const rectScaleRef  = useRef(1);
  const [rectScale, setRectScale] = useState(1);

  useEffect(() => {
    if (!rectWrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const s = Math.min(1, width / 400, height / 440);
      rectScaleRef.current = s;
      setRectScale(s);
    });
    obs.observe(rectWrapperRef.current);
    return () => obs.disconnect();
  }, []);
  const playerRef    = useRef(null);
  const enemyRef     = useRef(null);
  const playerBoxRef = useRef(null);
  const enemyBoxRef  = useRef(null);
  const fireballRef = useRef(null);
  const fireballAnimRef = useRef(null);
  const [fireball, setFireball] = useState(null);
  const [dBubble, setDBubble] = useState(null);
  const dBubbleRef     = useRef(null);
  const dBubbleAnimRef = useRef(null);
  const [finalAnswerVisible, setFinalAnswerVisible] = useState(false);
  const [checkButtonReady, setCheckButtonReady] = useState(false);
  const [showNSparkle, setShowNSparkle] = useState(false);
  const [enemyFlashing, setEnemyFlashing] = useState(false);
  const [enemyName, setEnemyName] = useState('Enemy');
  const [totalLevels, setTotalLevels] = useState(null);
  const [particleDigits] = useState(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)));
  const [enemyData, setEnemyData] = useState(null); // { type, level, name, hp }
  const [playerFlashing, setPlayerFlashing] = useState(false);
  const bubble2Ref = useRef(null);
  const arcAnimRef  = useRef(null);
  const actionLocked = useRef(false);
  const [bossPosition, setBossPosition] = useState({ x: 0, y: 0 });
  const enemySectionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 1 });
  const speedRef = useRef(2);
  const fractionPatternRef = useRef(null);
  const den1Ref = useRef(null);
  const den2Ref = useRef(null);
  const circleContainerRef = useRef(null);
  const ostRef = useRef(null);

  useEffect(() => {
    const track = Math.floor(Math.random() * 3) + 1;
    const audio = new Audio(`/OSTFiles/similarcombatOST${track}.mp3`);
    audio.loop = true;
    audio.volume = 0.8;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    ostRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Parse enemyData.txt and apply matching enemy for this level
  const loadEnemyData = () => {
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => {
        const sections = text.split('===').filter(s => s.trim());
        let levelCount = 0;
        for (const section of sections) {
          const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
          if (lines[0] !== 'similarIsland') continue;
          const blocks = section.split('---').slice(1);
          for (const rawBlock of blocks) {
            const blockContent = rawBlock.split('+++')[0];
            const content = blockContent.trim();
            if (!content) continue;
            levelCount++;
            const enemy = {};
            content.split('\n').forEach(line => {
              const idx = line.indexOf(':');
              if (idx !== -1) enemy[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
            });
            if (parseInt(enemy.level) === gameSession.level) {
              const parsed = {
                type:  ['normal', 'miniboss', 'boss'].includes(enemy.type) ? enemy.type : 'normal',
                level: parseInt(enemy.level),
                name:  enemy.name || 'Enemy',
                hp:    parseInt(enemy.hp) || 3,
              };
              setEnemyData(parsed);
              setEnemyLives(parsed.hp);
              setEnemyName(parsed.name);
            }
          }
        }
        if (levelCount > 0) setTotalLevels(levelCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadEnemyData();
  }, []);

  const handleCircleDetected = () => {
    new Audio('/SoundEffects/circleAppear.wav').play().catch(() => {});
    const SIZE = 48;
    if (den1Ref.current && den2Ref.current && circleContainerRef.current) {
      const r1    = den1Ref.current.getBoundingClientRect();
      const r2    = den2Ref.current.getBoundingClientRect();
      const cRect = circleContainerRef.current.getBoundingClientRect();

      const s1 = { left: r1.left + r1.width / 2 - SIZE / 2, top: r1.top + r1.height / 2 - SIZE / 2 };
      const s2 = { left: r2.left + r2.width / 2 - SIZE / 2, top: r2.top + r2.height / 2 - SIZE / 2 };
      const dLeft = cRect.left + cRect.width * 0.5 - SIZE / 2;
      const dTop  = cRect.top  + 255 * rectScaleRef.current - SIZE / 2;

      const rndCtrl = (sx, sy) => ({
        x: (sx + dLeft) / 2 + (Math.random() - 0.5) * 400,
        y: (sy + dTop)  / 2 - 80 - Math.random() * 200,
      });
      const ctrl1 = rndCtrl(s1.left, s1.top);
      const ctrl2 = rndCtrl(s2.left, s2.top);

      // Show invisible bubbles at start positions
      setBubbles({ b1: { ...s1, opacity: 0 }, b2: { ...s2, opacity: 0 } });

      // Appear at 0.5 s
      setTimeout(() => {
        setBubbles({ b1: { ...s1, opacity: 1 }, b2: { ...s2, opacity: 1 } });
        new Audio('/SoundEffects/sparkleSound.wav').play().catch(() => {});
      }, 500);

      // Arc animation begins after 2 s
      setTimeout(() => {
        new Audio('/SoundEffects/numberMove.wav').play().catch(() => {});
        const duration = 900;
        const start = performance.now();
        const bezier = (t, p0, cp, p1) => (1-t)**2 * p0 + 2*(1-t)*t * cp + t**2 * p1;
        const easeInOut = t => t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2;

        const frame = (now) => {
          const raw = Math.min((now - start) / duration, 1);
          const t   = easeInOut(raw);

          if (bubble1Ref.current) {
            bubble1Ref.current.style.left = bezier(t, s1.left, ctrl1.x, dLeft) + 'px';
            bubble1Ref.current.style.top  = bezier(t, s1.top,  ctrl1.y, dTop)  + 'px';
          }
          if (bubble2Ref.current) {
            bubble2Ref.current.style.left = bezier(t, s2.left, ctrl2.x, dLeft) + 'px';
            bubble2Ref.current.style.top  = bezier(t, s2.top,  ctrl2.y, dTop)  + 'px';
          }

          if (raw < 1) {
            arcAnimRef.current = requestAnimationFrame(frame);
          } else {
            // Arc done — bubbles vanish, sparkle explodes, then N appears when sound ends
            setBubbles(null);
            setDenAnimating(false);
            setDenVisible(true);
            setShowDenSparkle(true);
            setTimeout(() => setShowDenSparkle(false), 800);
            const explodeSound = new Audio('/SoundEffects/sparkleExplode.wav');
            explodeSound.play().catch(() => {});
            explodeSound.addEventListener('ended', () => {
              setTimeout(() => {
                setNVisible(true);
                new Audio('/SoundEffects/circleAppear.wav').play().catch(() => {});
              }, 200);
            });
          }
        };
        arcAnimRef.current = requestAnimationFrame(frame);
      }, 2000);
    }
    setCircleDetected(true);
    setDenAnimating(true);
  };

  const handleWrongAnswer = async (hint, submittedValue) => {
    const newLives = lives - 1;
    setLives(newLives);
    setEnemyAttacking(true);
    setFeedback(hint ? `Wrong! ${hint}` : 'Wrong answer! You lost a heart.');
    setFeedbackType('incorrect');
    if (hint) setCurrentHint(hint);

    const match = currentProblem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
    let correctAnswerStr = '?';
    if (match) {
      const resNum = match[3] === '+' ? parseInt(match[1]) + parseInt(match[4]) : parseInt(match[1]) - parseInt(match[4]);
      const resDen = parseInt(match[2]);
      const divisor = gcd(Math.abs(resNum), resDen);
      const sn = resNum / divisor, sd = resDen / divisor;
      correctAnswerStr = sd === 1 ? `${sn}` : `${sn}/${sd}`;
    }

    const attempt = {
      gameSessionId: gameSession.sessionId,
      mechanicType: mechanicType,
      problemStatement: currentProblem,
      answerSubmitted: String(submittedValue ?? ''),
      correctAnswer: correctAnswerStr,
      isCorrect: false,
      errorType: 'INCORRECT_ANSWER',
      remainingLives: newLives,
      streakCount: 0,
      multiplierValue: 1.0,
      enemyHealthBefore: enemyHealth,
      enemyHealthAfter: enemyHealth,
      pointsEarned: 0,
    };
    saveSpellAttempt(attempt);

    if (newLives <= 0) {
      await saveGameEnd('FAILED', false);
      setTimeout(() => setGameOver(true), 800);
    }
  };

  const handleRequestNewProblem = () => {
    setEnemyAttacking(false);
    setFeedback('');
    setFeedbackType('');
    setCircleDetected(false);
    setCurrentHint('');
    setMagicN('');
    setDenVisible(false);
    setNVisible(false);
    setHintUsed(false);
    setPhase2HintUsed(false);
    setFormulaVisible(false);
    setCheckPhase(false);
    setSimplifiedInput('');
    setSimplifiedDenInput('');
    setFinalAnswerVisible(false);
    setCheckButtonReady(false);
    setShowNSparkle(false);
    setDBubble(null);
    generateNextProblem();
  };

  const saveGameEnd = async (status, isWon) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, isWon }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error('saveGameEnd failed:', res.status, body);
      }
    } catch (err) {
      console.error('Error saving game end:', err);
    }
  };

  const recordHintUsed = async () => {
    sessionHintsUsed.current += 1;
    try {
      await fetch(
        `http://localhost:8080/api/game-progress/hint-used/${gameSession.sessionId}`,
        { method: 'POST' }
      );
    } catch (err) {
      console.error('Error recording hint:', err);
    }
  };

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const launchFireball = (onHit) => {
    const pBox = playerBoxRef.current || playerRef.current;
    const eBox = enemyBoxRef.current  || enemyRef.current;
    if (!pBox || !eBox) return;
    const pr = pBox.getBoundingClientRect();
    const er = eBox.getBoundingClientRect();
    const SIZE = 120;
    const sx = pr.right - SIZE / 2;          // right edge of player box
    const sy = pr.top + pr.height / 2 - SIZE / 2; // vertical center of player box
    const ex = er.left + er.width  / 2 - SIZE / 2;
    const ey = er.top  + er.height / 2 - SIZE / 2;
    const cpx = (sx + ex) / 2;
    const cpy = Math.min(sy, ey) - 80;

    // Phase 1 — appear at player, play spellCast
    setFireball({ x: sx, y: sy });
    new Audio('/SoundEffects/spellCast.wav').play().catch(() => {});

    // Phase 2 — after hold, start flying and play spellThrow
    setTimeout(() => {
      new Audio('/SoundEffects/spellThrow.wav').play().catch(() => {});
      const duration = 600;
      const start = performance.now();
      const bezier = (t, p0, cp, p1) => (1-t)**2*p0 + 2*(1-t)*t*cp + t**2*p1;
      const ease = t => t < 0.5 ? 2*t*t : 1-((-2*t+2)**2)/2;
      const frame = (now) => {
        const raw = Math.min((now - start) / duration, 1);
        const t = ease(raw);
        if (fireballRef.current) {
          fireballRef.current.style.left = bezier(t, sx, cpx, ex) + 'px';
          fireballRef.current.style.top  = bezier(t, sy, cpy, ey) + 'px';
        }
        if (raw < 1) {
          fireballAnimRef.current = requestAnimationFrame(frame);
        } else {
          // Phase 3 — immediately on landing
          new Audio('/SoundEffects/spellHit.wav').play().catch(() => {});
          setFireball(null);
          setEnemyFlashing(true);
          onHit?.();
          setTimeout(() => setEnemyFlashing(false), 500);
        }
      };
      fireballAnimRef.current = requestAnimationFrame(frame);
    }, 800);
  };

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

      correctAnswerStr = simplifiedDen === 1 ? `${simplifiedNum}` : simplifiedAnswer;
      isCorrect = submittedAnswer === nonSimplifiedAnswer || submittedAnswer === simplifiedAnswer || 
                   (submittedAnswer === `${simplifiedNum}` && simplifiedDen === 1);
    }
    
    const totalHp = enemyData?.hp || enemyLives || 1;
    const hpPerHit = Math.floor(100 / totalHp);
    const newEnemyLives = isCorrect ? Math.max(0, enemyLives - 1) : enemyLives;
    const newEnemyHealth = Math.max(0, enemyHealth - (isCorrect ? hpPerHit : 0));
    const newStreak = isCorrect ? streak + 1 : 0;
    const newMultiplier = Math.min(2.0, 1.0 + newStreak * 0.2);
    const rawPoints = isCorrect ? Math.floor(10 * newMultiplier) : 0;
    const pointsEarned = (hintUsed && phase2HintUsed) ? 0
      : (hintUsed || phase2HintUsed) ? Math.floor(rawPoints / 2)
      : rawPoints;
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
    setEnemyLives(newEnemyLives);
    setStreak(newStreak);
    setMultiplier(newMultiplier);
    setScore(newScore);
    setLives(newLives);
    setProblemCount(problemCount + 1);
    setFeedbackType(isCorrect ? 'correct' : 'incorrect');
    setFeedback(
      isCorrect
        ? `Correct! +${pointsEarned} points`
        : `Incorrect. The answer is ${correctAnswerStr}`
    );
    if (!isCorrect) {
      new Audio('/VoiceLines/castFailure.wav').play().catch(() => {});
    }

    if (!isCorrect) {
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 1000);
      setPlayerFlashing(true);
      setTimeout(() => setPlayerFlashing(false), 500);
    }

    if (newLives <= 0) {
      handleGameEnd('FAILED', false);
      return;
    }

    if (newEnemyLives <= 0) {
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
    setDenVisible(false);
    setNVisible(false);
    setHintUsed(false);
    setPhase2HintUsed(false);
    setFormulaVisible(false);
    setCheckPhase(false);
    setSimplifiedInput('');
    setSimplifiedDenInput('');
    setDBubble(null);
    setFinalAnswerVisible(false);
    setCheckButtonReady(false);
    setShowNSparkle(false);
    if (dBubbleAnimRef.current) cancelAnimationFrame(dBubbleAnimRef.current);
    setInteractableVisible(true);
    setMagicN('');
    actionLocked.current = false;
    setDenAnimating(false);
    setShowDenSparkle(false);
    setAppearSparkles([]);
    setBubbles(null);
    if (arcAnimRef.current) { cancelAnimationFrame(arcAnimRef.current); arcAnimRef.current = null; }
    const denominator = Math.floor(Math.random() * 8) + 2;
    const numerator1 = Math.floor(Math.random() * (denominator - 1)) + 1;
    const numerator2 = Math.floor(Math.random() * (denominator - 1)) + 1;
    const operator = Math.random() > 0.5 ? '+' : '-';
    setCurrentProblem(`${numerator1}/${denominator} ${operator} ${numerator2}/${denominator} = ?`);
  };

  const handleGameEnd = async (status, isWon) => {
    await saveGameEnd(status, isWon);
    onGameEnd({ status, isWon, score });
  };

  const handleExitGame = () => setShowExitModal(true);

  const confirmExit = async () => {
    setShowExitModal(false);
    await saveGameEnd('PAUSED', false);
    onExitToLobby();
  };

  const problemMatch = currentProblem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
  const displayNum1 = problemMatch ? problemMatch[1] : '?';
  const displayDen1 = problemMatch ? problemMatch[2] : '?';
  const displayOp   = problemMatch ? problemMatch[3] : '+';
  const displayNum2 = problemMatch ? problemMatch[4] : '?';
  const displayDen2 = problemMatch ? problemMatch[5] : '?';

  // Determine if the simplified result is a whole number (for Phase 2 input UI)
  const simplifiedResultIsWhole = (() => {
    if (!problemMatch) return false;
    const n1 = parseInt(displayNum1), op = displayOp, n2 = parseInt(displayNum2);
    const rn = op === '+' ? n1 + n2 : n1 - n2;
    const d  = parseInt(displayDen1);
    let a = Math.abs(rn), b = d;
    while (b) { const t = b; b = a % b; a = t; }
    return d / a === 1;
  })();

  const renderHearts = (count, max) => {
    const hearts = [];
    for (let i = 0; i < max; i++) {
      hearts.push(
        <img
          key={i}
          src="/InteractableUI/HeartSprite.png"
          alt="heart"
          style={{
            width: 28, height: 28,
            objectFit: 'contain',
            opacity: i < count ? 1 : 0.25,
            filter: i < count ? 'none' : 'grayscale(1)',
          }}
        />
      );
    }
    return hearts;
  };



  return (
    <div
      className="wireframe-game-container"
      style={{
        backgroundImage: 'url(/InMatchUIElements/SimilarIsland/ForrestCombatBackground.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        height: '100svh',
        overflow: 'hidden',
        padding: '20px 20px 0',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="wireframe-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: '#ddd',
          padding: '10px',
          border: '2px solid #888',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <button style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888' }}>
            Game logo
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold' }}>{studentNickname || 'Player'}</span>
            <span>HP: {renderHearts(lives, 3)}</span>
            <span>Streak: x{multiplier.toFixed(1)}</span>
            <span>Score: {score}</span>
            <span>Level: {gameSession.level}/{totalLevels ?? '...'}</span>
          </div>
          <button
            style={{ padding: '8px 20px', background: '#bbb', border: '2px solid #888' }}
            onClick={handleExitGame}
          >
            Menu
          </button>
        </div>
      </div>


      <div
        className="wireframe-battle-area"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
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
            paddingTop: '32px',
          }}
        >
        </div>

        <div
          className="wireframe-main-battle"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            flex: 1,
            minHeight: 0,
            padding: '20px 0 0',
            gap: '0',
            overflow: 'hidden',
          }}
        >
          <div
            ref={playerRef}
            className="wireframe-player"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              marginRight: circleDetected && interactableVisible ? '160px' : '36px',
              transition: 'margin 0.5s ease',
              zIndex: 2,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <div
              ref={playerBoxRef}
              style={{
                width: '320px',
                height: '320px',
                border: 'none',
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
                background: 'transparent',
              }}></div>
              <img
                src={selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png'}
                alt="Player"
                style={{ position: 'relative', zIndex: 1, width: '170px', height: '170px', objectFit: 'contain',
                  animation: playerFlashing ? 'enemyFlash 0.5s ease-out' : 'none' }}
              />

              {/* Sparkle particles at bottom of character box */}
              {circleDetected && interactableVisible && (
                <>
                  <style>{`
                    @keyframes riseAndFade {
                      0%   { transform: translateY(0)     scale(1);    opacity: 0.9; }
                      40%  { transform: translateY(-20px)  scale(0.85); opacity: 0.85; }
                      100% { transform: translateY(-140px) scale(0.15); opacity: 0; }
                    }
                  `}</style>
                  {[
                    { left: '5%',  delay: '0s',    dur: '2.6s', size: 28 },
                    { left: '18%', delay: '-0.6s', dur: '3.0s', size: 24 },
                    { left: '30%', delay: '-1.1s', dur: '2.4s', size: 32 },
                    { left: '42%', delay: '-0.3s', dur: '2.8s', size: 26 },
                    { left: '55%', delay: '-1.5s', dur: '2.7s', size: 22 },
                    { left: '67%', delay: '-0.9s', dur: '3.1s', size: 20 },
                    { left: '78%', delay: '-1.8s', dur: '2.5s', size: 30 },
                    { left: '90%', delay: '-0.4s', dur: '2.9s', size: 25 },
                    { left: '12%', delay: '-2.1s', dur: '2.6s', size: 21 },
                    { left: '48%', delay: '-1.3s', dur: '3.2s', size: 27 },
                    { left: '72%', delay: '-0.7s', dur: '2.3s', size: 23 },
                    { left: '35%', delay: '-2.4s', dur: '2.8s', size: 29 },
                  ].map((p, i) => (
                    <span key={i} style={{
                      position: 'absolute', bottom: 0, left: p.left,
                      fontSize: p.size,
                      fontFamily: '"Press Start 2P", monospace',
                      fontWeight: 900,
                      color: 'rgba(255,255,255,0.88)',
                      lineHeight: 1,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.45)',
                      pointerEvents: 'none', zIndex: 3,
                      animation: `riseAndFade ${p.dur} ease-out ${p.delay} infinite`,
                      userSelect: 'none',
                    }}>
                      {particleDigits[i] ?? 0}
                    </span>
                  ))}
                </>
              )}
              {/* Platform at bottom of character box, above Player label */}
              <img
                src="/InMatchUIElements/SimilarIsland/SimilarIslandPlatform.png"
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
              {/* Name label */}
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 18px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                {studentNickname || 'Player'}
              </div>
              {/* Hearts with same border style */}
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                {renderHearts(lives, 3)}
              </div>
            </div>
          </div>

          <div
            className="wireframe-problem"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              paddingTop: '32px',
              minHeight: 0,
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {/* Fraction display — outer controls visibility, inner animates in */}
            <div style={{ opacity: interactableVisible ? 1 : 0, transition: 'opacity 0.4s ease', animation: 'magicFloat 3s ease-in-out infinite', position: 'relative' }}>
            <div
              key={currentProblem}
              className="problem-fade-in"
              style={{
                position: 'relative',
                background: '#e8d5b4',
                border: '4px solid #703737',
                borderRadius: 0,
                boxShadow: 'none',
                padding: '22px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Inner thin border — square */}
              <div style={{ position: 'absolute', inset: 5, border: '1px solid #703737', borderRadius: 0, pointerEvents: 'none' }} />
              {/* Outer corner squares */}
              {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
                <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:'#703737',
                  ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
              ))}
              {/* Inner corner squares */}
              {[[4,4],[null,4],[4,null],[null,null]].map(([t,l],i) => (
                <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:6, height:6, background:'#703737',
                  ...(t!==null?{top:t}:{bottom:4}), ...(l!==null?{left:l}:{right:4}) }}/>
              ))}

              {/* Fraction 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{displayNum1}</span>
                <div style={{ width: 50, height: 3, background: '#222', borderRadius: 2, margin: '3px 0' }} />
                <span ref={den1Ref} style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{displayDen1}</span>
              </div>

              {/* Operator */}
              <span style={{ fontSize: 32, fontWeight: 800, color: '#222' }}>{displayOp}</span>

              {/* Fraction 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{displayNum2}</span>
                <div style={{ width: 50, height: 3, background: '#222', borderRadius: 2, margin: '3px 0' }} />
                <span ref={den2Ref} style={{ fontSize: 28, fontWeight: 800, color: '#222', minWidth: 40, textAlign: 'center' }}>{displayDen2}</span>
              </div>

              {/* = ? */}
              <span style={{ fontSize: 28, fontWeight: 800, color: '#555' }}>= ?</span>
            </div>

            {/* Square particles emitting from the bottom */}
            {[
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
            ].map((p, i) => (
              <div key={i} style={{
                position: 'absolute',
                bottom: -4,
                left: p.left,
                width: p.size, height: p.size,
                background: '#703737',
                pointerEvents: 'none',
                animation: `particleFall ${p.dur} ease-out ${p.delay} infinite`,
              }} />
            ))}
            </div>{/* outer visibility wrapper */}

            <div
              ref={rectWrapperRef}
              style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%' }}
            >
            <div
              ref={circleContainerRef}
              style={{
                width: '400px',
                height: '440px',
                flexShrink: 0,
                transform: `scale(${rectScale})`,
                transformOrigin: 'bottom center',
                background: 'none',
                border: '4px solid #703737',
                borderRadius: 0,
                boxShadow: 'none',
                display: 'flex',
                justifyContent: 'center',
                opacity: interactableVisible ? 1 : 0,
                pointerEvents: interactableVisible ? 'auto' : 'none',
                transition: 'opacity 0.4s ease',
                alignItems: 'center',
                position: 'relative',
                marginBottom: '50px',
              }}
            >
              {/* Rising particles inside the interactable rectangle */}
              {[
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
              ].map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', bottom: 4, left: p.left,
                  width: p.size, height: p.size,
                  background: '#703737',
                  pointerEvents: 'none', zIndex: 1,
                  animation: `particleRise ${p.dur} ease-out ${p.delay} infinite`,
                }} />
              ))}

              {/* Solid background — no gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: '#e8d5b4',
                zIndex: 0,
                pointerEvents: 'none',
              }} />
              {/* Inner thin border — square corners */}
              <div style={{
                position: 'absolute', inset: 8,
                border: '1px solid #703737',
                borderRadius: 0,
                zIndex: 0,
                pointerEvents: 'none',
              }} />
              {/* Outer corner squares (big) */}
              {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
                <div key={i} style={{
                  position:'absolute', zIndex:10, pointerEvents:'none',
                  width:12, height:12, background:'#703737',
                  ...(t!==null?{top:t}:{bottom:-6}),
                  ...(l!==null?{left:l}:{right:-6}),
                }}/>
              ))}
              {/* Inner corner squares (small) */}
              {[[4,4],[null,4],[4,null],[null,null]].map(([t,l],i) => (
                <div key={i} style={{
                  position:'absolute', zIndex:10, pointerEvents:'none',
                  width:6, height:6, background:'#703737',
                  ...(t!==null?{top:t}:{bottom:4}),
                  ...(l!==null?{left:l}:{right:4}),
                }}/>
              ))}

              {/* Book — above gradient, below magic circle */}
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
                  position: 'absolute',
                  bottom: 14,
                  left: '50%',
                  width: '140%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  zIndex: 1,
                  animation: 'bookFloat 6s ease-in-out infinite',
                }}
              />

              {/* Bottom-centre row: Hint + Cast Spell */}
              {nVisible && (
                <div style={{
                  position: 'absolute',
                  bottom: 12, left: '50%',
                  display: 'flex', gap: 10,
                  zIndex: 4,
                  animation: 'nAreaFadeIn 0.5s ease-out forwards',
                }}>
                  {!checkPhase ? (
                  /* Phase 1 — Cast Spell */
                  <button
                    style={{
                      padding: '4px 56px',
                      background: '#703737',
                      border: '4px solid #703737',
                      borderRadius: 0,
                      boxShadow: 'none',
                      position: 'relative',
                      fontSize: 11, fontWeight: 700,
                      fontFamily: '"Press Start 2P", monospace',
                      whiteSpace: 'nowrap',
                      cursor: circleDetected && magicN ? 'pointer' : 'not-allowed',
                      color: '#e8d5b4',
                      opacity: circleDetected && magicN ? 1 : 0.45,
                      backdropFilter: 'blur(6px)',
                    }}
                    disabled={!circleDetected || !magicN || enemyLives === null}
                    onClick={() => {
                      if (actionLocked.current) return;
                      actionLocked.current = true;
                      const m = currentProblem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
                      if (m) {
                        const n1 = parseInt(m[1]), op = m[3], n2 = parseInt(m[4]);
                        if (parseInt(magicN) === (op === '+' ? n1 + n2 : n1 - n2)) {
                          setCheckPhase(true);
                          // Animate D bubble up to N position
                          if (circleContainerRef.current) {
                            const cRect = circleContainerRef.current.getBoundingClientRect();
                            const SZ = 44;
                            const scale = rectScaleRef.current;
                            const sx = cRect.left + cRect.width * 0.5 - SZ / 2;
                            const sy = cRect.top + 252 * scale - SZ / 2;
                            const ex = sx;
                            const ey = cRect.top + (32 + 129) * scale - SZ / 2;
                            setDBubble({ x: sx, y: sy });
                            const dur = 800, t0 = performance.now();
                            const ease = t => t < 0.5 ? 2*t*t : 1-((-2*t+2)**2)/2;
                            const anim = (now) => {
                              const raw = Math.min((now - t0) / dur, 1);
                              const t = ease(raw);
                              if (dBubbleRef.current) {
                                dBubbleRef.current.style.left = ex + 'px';
                                dBubbleRef.current.style.top  = (sy + (ey - sy) * t) + 'px';
                              }
                              if (raw < 1) { dBubbleAnimRef.current = requestAnimationFrame(anim); }
                              else {
                                setShowNSparkle(true);
                                setTimeout(() => setShowNSparkle(false), 800);
                                const explode = new Audio('/SoundEffects/sparkleExplode.wav');
                                explode.play().catch(() => {});
                                explode.addEventListener('ended', () => {
                                  setDBubble(null);
                                  setFinalAnswerVisible(true);
                                  setFormulaVisible(false);
                                  setTimeout(() => { setCheckButtonReady(true); actionLocked.current = false; }, 600);
                                  new Audio('/SoundEffects/circleAppear.wav').play().catch(() => {});
                                });
                              }
                            };
                            dBubbleAnimRef.current = requestAnimationFrame(anim);
                          }
                          return;
                        }
                      }
                      // Wrong numerator — fail immediately, no Phase 2
                      new Audio('/VoiceLines/castFailure.wav').play().catch(() => {});
                      const wrongAnswer = `${magicN}/${displayDen1}`;
                      setMagicN('');
                      setInteractableVisible(false);
                      setTimeout(() => handleAnswerSubmit(wrongAnswer), 500);
                    }}
                  >
                    <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    Cast Spell
                  </button>
                  ) : finalAnswerVisible ? (
                  /* Phase 2 — Check (validates simplified fraction) */
                  <button
                    style={{
                      padding: '4px 56px',
                      background: '#703737',
                      border: '4px solid #703737',
                      borderRadius: 0,
                      boxShadow: 'none',
                      position: 'relative',
                      fontSize: 11, fontWeight: 700,
                      fontFamily: '"Press Start 2P", monospace',
                      cursor: checkButtonReady && (simplifiedResultIsWhole ? simplifiedInput : simplifiedInput && simplifiedDenInput) ? 'pointer' : 'not-allowed',
                      color: '#e8d5b4',
                      opacity: checkButtonReady ? ((simplifiedResultIsWhole ? simplifiedInput : simplifiedInput && simplifiedDenInput) ? 1 : 0.45) : undefined,
                      pointerEvents: checkButtonReady ? 'auto' : 'none',
                      backdropFilter: 'blur(6px)',
                      animation: checkButtonReady ? 'none' : 'dimFadeIn 0.6s ease-out forwards',
                      transition: checkButtonReady ? 'opacity 0.2s ease' : 'none',
                    }}
                    disabled={!checkButtonReady || (simplifiedResultIsWhole ? !simplifiedInput : (!simplifiedInput || !simplifiedDenInput))}
                    onClick={() => {
                      if (actionLocked.current) return;
                      actionLocked.current = true;
                      const answer = simplifiedResultIsWhole
                        ? simplifiedInput.trim()
                        : `${simplifiedInput.trim()}/${simplifiedDenInput.trim()}`;
                      setSimplifiedInput('');
                      setSimplifiedDenInput('');
                      setCheckPhase(false);
                      setInteractableVisible(false);
                      const m = currentProblem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
                      let correct = false;
                      if (m) {
                        const n1 = parseInt(m[1]), d = parseInt(m[2]), op = m[3], n2 = parseInt(m[4]);
                        const rn = op === '+' ? n1 + n2 : n1 - n2;
                        const div = gcd(Math.abs(rn), d);
                        const sn = rn / div, sd = d / div;
                        correct = answer === `${sn}/${sd}` || (answer === `${sn}` && sd === 1);
                      }
                      if (correct) {
                        new Audio('/VoiceLines/castSuccess.wav').play().catch(() => {});
                        setTimeout(() => launchFireball(() => {
                          handleAnswerSubmit(answer);
                        }), 500);
                      } else {
                        setTimeout(() => handleAnswerSubmit(answer), 500);
                      }
                    }}
                  >
                    <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                    Check
                  </button>
                  ) : null}
                  {((!hintUsed && !checkPhase) || (!phase2HintUsed && finalAnswerVisible)) && (
                    <button
                      onClick={() => finalAnswerVisible
                        ? (recordHintUsed(), setPhase2HintUsed(true), setFormulaVisible(true))
                        : setShowHintConfirm(true)
                      }
                      style={{
                        padding: '4px 16px',
                        fontSize: 10, fontWeight: 700,
                        fontFamily: '"Press Start 2P", monospace',
                        background: '#703737',
                        border: '4px solid #703737',
                        borderRadius: 0,
                        boxShadow: 'none',
                        position: 'relative',
                        color: '#e8d5b4',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                        animation: 'problemFadeIn 0.4s ease-out',
                      }}
                    >
                      <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                      <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                      Hint
                    </button>
                  )}
                </div>
              )}

              {!circleDetected && (
                <p style={{
                  position: 'absolute',
                  top: 16, left: '50%',
                  transform: 'translateX(-50%)',
                  margin: 0,
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 10px rgba(0,0,0,0.9), 2px 2px 6px rgba(0,0,0,0.8)',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}>Draw a circle to continue!</p>
              )}

              {!circleDetected ? (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
                  <DrawingCanvas onCircleDetected={handleCircleDetected} />
                </div>
              ) : (
                <>
                  <style>{`
                    @keyframes dimFadeIn {
                      from { opacity: 0; transform: translateY(-10px); }
                      to   { opacity: 0.3; transform: translateY(0); }
                    }
                    @keyframes sparkBurst {
                      0%   { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                      100% { transform: translate(-50%, -50%) scale(3);   opacity: 0; }
                    }
                    @keyframes nAreaFadeIn {
                      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    @keyframes magicFloat {
                      0%, 100% { transform: translateY(0px); }
                      50%       { transform: translateY(-22px); }
                    }
                  `}</style>

                  {/* Floating wrapper — circle image + inputs all hover together */}
                  <div style={{
                    position: 'absolute', top: 32, left: 0, right: 0,
                    height: '300px',
                    animation: 'magicFloat 4s ease-in-out infinite',
                    zIndex: 2,
                  }}>
                    <img
                      src="/InteractableUI/SimilarMagicCircle.png"
                      alt="magic circle"
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        width: '100%', height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        animation: 'problemFadeIn 0.5s ease-out',
                      }}
                    />
                    {/* Numerator / Simplified fraction area — fades in, fades out when D moves */}
                    {nVisible && <div style={{
                      position: 'absolute',
                      left: '50%', top: finalAnswerVisible ? (simplifiedResultIsWhole ? '62px' : '36px') : '78px',
                      zIndex: 2,
                      opacity: dBubble ? 0 : 1,
                      transition: 'opacity 0.3s ease',
                      pointerEvents: dBubble ? 'none' : 'auto',
                    }}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      animation: 'nAreaFadeIn 0.5s ease-out forwards',
                    }}>
                      <span style={{
                        fontSize: 18, fontWeight: 800, color: '#222',
                        whiteSpace: 'nowrap',
                        visibility: formulaVisible ? 'visible' : 'hidden',
                      }}>
                        {finalAnswerVisible
                          ? `Simplify: ${parseInt(displayNum1) + (displayOp === '+' ? parseInt(displayNum2) : -parseInt(displayNum2))}/${displayDen1}`
                          : `${displayNum1} ${displayOp} ${displayNum2} =`}
                      </span>
                      {!finalAnswerVisible ? (
                        /* Phase 1 — numerator input */
                        <input
                          type="text"
                          inputMode="numeric"
                          value={magicN}
                          onChange={e => setMagicN(e.target.value.replace(/[^0-9-]/g, ''))}
                          placeholder="?"
                          style={{
                            width: 90, height: 64,
                            fontSize: 32, fontWeight: 800, textAlign: 'center',
                            border: '3px dashed #222', borderRadius: 0,
                            background: 'transparent', color: '#222',
                            outline: 'none', appearance: 'none',
                            fontFamily: '"Press Start 2P", monospace',
                            WebkitAppearance: 'none', MozAppearance: 'none',
                          }}
                        />
                      ) : (
                        /* Phase 2 — simplified fraction input */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'problemFadeIn 0.4s ease-out' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: '"Press Start 2P", monospace', textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>Final Answer:</span>
                          {simplifiedResultIsWhole ? (
                            /* Whole number — single field */
                            <input
                              type="text"
                              inputMode="numeric"
                              value={simplifiedInput}
                              onChange={e => setSimplifiedInput(e.target.value.replace(/[^0-9-]/g, ''))}
                              autoFocus
                              style={{
                                width: 90, height: 64,
                                fontSize: 28, fontWeight: 800, textAlign: 'center',
                                border: '3px dashed #222', borderRadius: 0,
                                background: 'transparent', color: '#222',
                                outline: 'none', appearance: 'none',
                            fontFamily: '"Press Start 2P", monospace',
                                WebkitAppearance: 'none', MozAppearance: 'none',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                                textShadow: '0 0 8px rgba(0,0,0,0.9)',
                              }}
                            />
                          ) : (
                            /* Fraction — numerator / bar / denominator */
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={simplifiedInput}
                                onChange={e => setSimplifiedInput(e.target.value.replace(/[^0-9-]/g, ''))}
                                autoFocus
                                style={{
                                  width: 90, height: 54,
                                  fontSize: 28, fontWeight: 800, textAlign: 'center',
                                  border: '3px dashed #222', borderRadius: 0,
                                  background: 'transparent', color: '#222',
                                  outline: 'none', appearance: 'none',
                            fontFamily: '"Press Start 2P", monospace',
                                  WebkitAppearance: 'none', MozAppearance: 'none',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                                  textShadow: '0 0 8px rgba(0,0,0,0.9)',
                                }}
                              />
                              <div style={{ width: 90, height: 3, background: '#222', borderRadius: 2 }} />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={simplifiedDenInput}
                                onChange={e => setSimplifiedDenInput(e.target.value.replace(/[^0-9]/g, ''))}
                                style={{
                                  width: 90, height: 54,
                                  fontSize: 28, fontWeight: 800, textAlign: 'center',
                                  border: '3px dashed #222', borderRadius: 0,
                                  background: 'transparent', color: '#222',
                                  outline: 'none', appearance: 'none',
                            fontFamily: '"Press Start 2P", monospace',
                                  WebkitAppearance: 'none', MozAppearance: 'none',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
                                  textShadow: '0 0 8px rgba(0,0,0,0.9)',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div></div>}
                    {/* Burst sparkle when D value appears */}
                    {showDenSparkle && (
                      <img src="/OtherEffects/BlueSparkle.png" alt="" style={{
                        position: 'absolute', left: '50%', top: '249px',
                        width: 72, height: 72, pointerEvents: 'none',
                        zIndex: 3, animation: 'sparkBurst 0.8s ease-out forwards',
                      }} />
                    )}
                    {showNSparkle && (
                      <img src="/OtherEffects/BlueSparkle.png" alt="" style={{
                        position: 'absolute', left: '50%', top: '129px',
                        width: 72, height: 72, pointerEvents: 'none',
                        zIndex: 3, animation: 'sparkBurst 0.8s ease-out forwards',
                      }} />
                    )}

                    {/* Denominator — appears only after animation completes */}
                    <div style={{
                      position: 'absolute',
                      left: '50%', top: '235px',
                      transform: 'translateX(-50%)',
                      width: 40, height: 36,
                      fontSize: 14, fontWeight: 900, textAlign: 'center',
                      background: 'transparent', color: '#ffffff',
                      zIndex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: denVisible && !checkPhase && !dBubble ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }}>
                      {denVisible ? displayDen1 : ''}
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>{/* rectWrapperRef */}
          </div>

          <div
            ref={enemyRef}
            className="wireframe-enemy"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              marginLeft: circleDetected && interactableVisible ? '160px' : '36px',
              transition: 'margin 0.5s ease',
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            <div
              ref={enemyBoxRef}
              style={{
                width: '320px',
                height: '320px',
                border: 'none',
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
                background: 'transparent',
              }}></div>
              <style>{`
                @keyframes enemyFlash {
                  0%, 100% { filter: brightness(1); }
                  25%       { filter: brightness(3) saturate(0); }
                  50%       { filter: brightness(1); }
                  75%       { filter: brightness(3) saturate(0); }
                }
              `}</style>
              <img
                src="/enemy1.png"
                alt="Enemy"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '88%',
                  height: '88%',
                  objectFit: 'contain',
                  animation: enemyFlashing ? 'enemyFlash 0.5s ease-out' : 'none',
                }}
              />
              {/* Platform at bottom of enemy box, above Enemy label */}
              <img
                src="/InMatchUIElements/SimilarIsland/SimilarIslandPlatform.png"
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
              {/* Name label */}
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 18px', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                {enemyName}
              </div>
              {/* Hearts with same border style */}
              <div style={{ position: 'relative', border: '4px solid #fff', background: '#000', padding: '6px 10px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
                <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
                <img src="/InteractableUI/HeartSprite.png" alt="hp" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>x{enemyLives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {feedback && (
        <div style={{
          position: 'fixed',
          left: '50%',
          zIndex: 5000,
          textAlign: 'center',
          padding: '10px 24px',
          border: '4px solid #fff',
          background: '#000',
          color: feedbackType === 'correct' ? '#4ade80' : '#f87171',
          fontSize: '11px', fontWeight: 700,
          whiteSpace: 'nowrap',
          animation: 'feedbackSlideToCenter 0.6s ease-out forwards',
        }}>
          {/* Inner thin border */}
          <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
          {/* Corner squares */}
          <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
          <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
          <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
          <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
          <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
          <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
          <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
          {feedback}
        </div>
      )}

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
            boxShadow: 'none, 0 20px 40px rgba(0,0,0,0.6)',
            padding: '36px 56px 28px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, border: '1px solid #703737', borderRadius: '6px', pointerEvents: 'none' }} />
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

      {showTutorial && (
        <SimilarFractionTutorial onComplete={() => setShowTutorial(false)} />
      )}

      {dBubble && (
        <>
          <style>{`
            @keyframes sparkleSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        <div ref={dBubbleRef} style={{
          position: 'fixed', left: dBubble.x, top: dBubble.y,
          width: 48, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          <img src="/OtherEffects/BlueSparkle.png" alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            animation: 'sparkleSpin 1.2s linear infinite',
          }} />
          <span style={{ position: 'relative', zIndex: 1, fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
            {displayDen1}
          </span>
        </div>
        </>
      )}

      {fireball && (
        <>
          <style>{`
            @keyframes fireballFadeIn {
              from { opacity: 0; transform: scale(0.5); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <img
            ref={fireballRef}
            src="/CombatGraphics/fireballAnimation.gif"
            alt="fireball"
            style={{
              position: 'fixed',
              left: fireball.x,
              top: fireball.y,
              width: 120, height: 120,
              pointerEvents: 'none',
              zIndex: 9999,
              animation: 'fireballFadeIn 0.3s ease-out',
            }}
          />
        </>
      )}

      {showHintConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '36px 44px', textAlign: 'center', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Are you sure you want a hint?</p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>Using a hint removes points for this problem.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { recordHintUsed(); setHintUsed(true); setFormulaVisible(true); setShowHintConfirm(false); }}
                style={{ padding: '10px 24px', fontWeight: 700, background: '#f59e0b', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
                Yes, show hint
              </button>
              <button onClick={() => setShowHintConfirm(false)}
                style={{ padding: '10px 24px', fontWeight: 700, background: '#e5e7eb', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

{bubbles && (
        <>
          <style>{`
            @keyframes sparkleSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
          {[['b1', bubble1Ref, displayDen1], ['b2', bubble2Ref, displayDen2]].map(([key, ref, val]) => (
            <div key={key} ref={ref} style={{
              position: 'fixed',
              left: bubbles[key].left,
              top: bubbles[key].top,
              width: 48, height: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 9999, pointerEvents: 'none',
              opacity: bubbles[key].opacity,
              transition: 'opacity 0.3s ease',
            }}>
              {/* Spinning sparkle behind */}
              <img
                src="/OtherEffects/BlueSparkle.png"
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  animation: 'sparkleSpin 1.2s linear infinite',
                  pointerEvents: 'none',
                }}
              />
              {/* Number on top */}
              <span style={{
                position: 'relative', zIndex: 1,
                fontSize: 18, fontWeight: 900, color: '#fff',
                textShadow: '0 0 6px rgba(0,0,0,0.9)',
              }}>{val}</span>
            </div>
          ))}
        </>
      )}

      {showExitModal && (
        <GameMenuModal
          title="Exit Game?"
          message="Your progress will be saved."
          icon="⚠️"
          onClose={() => setShowExitModal(false)}
        >
          <div className="wizard-menu-actions">
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-primary"
              onClick={confirmExit}
            >
              Yes, Exit
            </button>
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-secondary"
              onClick={() => setShowExitModal(false)}
            >
              Cancel
            </button>
          </div>
        </GameMenuModal>
      )}
    </div>
  );
};

export default SimilarIslandGame;
