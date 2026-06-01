import React, { useState, useEffect, useRef } from 'react';
import './game.css';
import DrawingCanvas from '../components/DrawingCanvas';
import FractionPattern from '../components/FractionPattern';
import SimilarFractionTutorial from '../components/SimilarFractionTutorial';
import GameMenuModal from '../components/GameMenuModal';
import '../components/components.css';

// ── Similar Island: same denominator ──────────────────────────────────────
const buildProblem = (level = 1) => {
  const minDen   = Math.min(2 + Math.floor((level - 1) / 2), 6);
  const maxDen   = Math.min(2 + level * 2, 16);
  const subChance = Math.min(0.1 + (level - 1) * 0.1, 0.6);

  let den, n1, n2, op, resNum, attempts = 0;
  do {
    den = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
    n1  = Math.floor(Math.random() * (den - 1)) + 1;
    n2  = Math.floor(Math.random() * (den - 1)) + 1;
    op  = Math.random() < subChance ? '-' : '+';
    if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
    resNum = op === '+' ? n1 + n2 : n1 - n2;
    attempts++;
  } while (resNum % den === 0 && attempts < 20);
  // Loop rejects whole-number results; accepts after 20 tries to avoid infinite loop

  return `${n1}/${den} ${op} ${n2}/${den} = ?`;
};

// ── Dissimilar Island: different denominators (butterfly method) ───────────
// eslint-disable-next-line no-unused-vars
const buildProblemDissimilar = (level = 1) => {
  const minDen = Math.min(2 + Math.floor((level - 1) / 2), 4);
  const maxDen = Math.min(3 + level * 2, 14);
  let d1 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  let d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  while (d2 === d1) d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
  const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
  const subChance = Math.min(0.1 + (level - 1) * 0.1, 0.6);
  const op = Math.random() < subChance ? '-' : '+';
  // Ensure subtraction result is positive: compare n1/d1 vs n2/d2
  if (op === '-' && n1 * d2 < n2 * d1) return `${n2}/${d2} ${op} ${n1}/${d1} = ?`;
  return `${n1}/${d1} ${op} ${n2}/${d2} = ?`;
};

// ── Hybrid Island: mixed numbers with different denominators ───────────────
// eslint-disable-next-line no-unused-vars
const buildProblemHybrid = (level = 1) => {
  const minDen = Math.min(2 + Math.floor((level - 1) / 2), 4);
  const maxDen = Math.min(3 + level * 2, 12);
  const maxWhole = Math.min(1 + Math.floor(level / 2), 5);
  let d1 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  let d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  while (d2 === d1) d2 = Math.floor(Math.random() * (maxDen - minDen + 1)) + minDen;
  const w1 = Math.floor(Math.random() * maxWhole) + 1;
  const w2 = Math.floor(Math.random() * maxWhole) + 1;
  const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
  const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
  const subChance = Math.min(0.1 + (level - 1) * 0.1, 0.55);
  const op = Math.random() < subChance ? '-' : '+';
  // Ensure left side >= right side for subtraction
  if (op === '-' && w1 + n1 / d1 < w2 + n2 / d2)
    return `${w2} ${n2}/${d2} ${op} ${w1} ${n1}/${d1} = ?`;
  return `${w1} ${n1}/${d1} ${op} ${w2} ${n2}/${d2} = ?`;
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

const SimilarIslandGame = ({ studentId, studentNickname, selectedCharacter, gameSession, onGameEnd, onExitToLobby }) => {
  const [currentProblem, setCurrentProblem] = useState(() => buildProblem(gameSession.level));
  const [mechanicType, setMechanicType] = useState(gameSession.mechanicType);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [bgShift, setBgShift] = useState(null);
  const lastBgShiftRef = useRef(null);
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
      const s = Math.max(0.1, Math.min(1, width / 400, (height - 50) / 440));
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
  const onHitRef = useRef(null);
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
  const [envParticles, setEnvParticles] = useState([]);
  const envPidRef = useRef(0);
  const [enemyData, setEnemyData] = useState(null); // { type, level, name, hp }
  const [playerFlashing, setPlayerFlashing] = useState(false);
  const [defeatTarget, setDefeatTarget] = useState(null);
  const [defeatFading, setDefeatFading] = useState(false);
  const [defeatParticles, setDefeatParticles] = useState([]);
  const beforeDefeatRef = useRef(null);
  const defeatPidRef = useRef(0);
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
  const ostRef       = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const pulseRafRef  = useRef(null);
  const [pulse, setPulse] = useState(0); // 0-1 bass intensity
  const [wizardAnim, setWizardAnim] = useState('idle');
  const wizardAnimTimerRef = useRef(null);
  const [enemyAnim, setEnemyAnim] = useState('idle');
  const enemyAnimTimerRef = useRef(null);
  const [enemySpriteInfo, setEnemySpriteInfo] = useState({
    idle:   { frames: 4, frameW: 280, frameH: 280, missing: false },
    attack: { frames: 4, frameW: 280, frameH: 280, missing: false },
    hit:    { frames: 4, frameW: 280, frameH: 280, missing: false },
  });
  const enemySpriteInfoRef = useRef({
    idle:   { frames: 4, frameW: 280, frameH: 280, missing: false },
    attack: { frames: 4, frameW: 280, frameH: 280, missing: false },
    hit:    { frames: 4, frameW: 280, frameH: 280, missing: false },
  });

  const playOST = (src) => {
    if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; }
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.8;
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
    } catch (_) {}

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

  // Start combat OST on mount
  useEffect(() => {
    const track = Math.floor(Math.random() * 3) + 1;
    playOST(`/OSTFiles/similarcombatOST${track}.mp3`);
    return () => { if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; } };
  }, [gameSession.level]);

  // Switch to boss OST if enemy type is "boss"
  useEffect(() => {
    if (enemyData?.type === 'boss') {
      const track = Math.floor(Math.random() * 2) + 1;
      playOST(`/OSTFiles/bossOST${track}.mp3`);
    }
  }, [enemyData?.type]);

  // Leaf & flower environmental particles — rain from top-right to bottom-left
  useEffect(() => {
    const spawn = () => {
      const type = Math.random() < 0.5 ? 'leaf' : 'flower';
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
  }, [gameSession.level]);

  // Load each PNG sprite sheet, auto-detect frame count, and compute proportional display size
  useEffect(() => {
    if (!enemyData) return;
    const MAX = 280;
    const reset = { idle: { frames: 4, displayW: MAX, displayH: MAX, missing: false }, attack: { frames: 4, displayW: MAX, displayH: MAX, missing: false }, hit: { frames: 4, displayW: MAX, displayH: MAX, missing: false } };
    enemySpriteInfoRef.current = reset;
    setEnemySpriteInfo(reset);

    ['idle', 'attack', 'hit'].forEach(anim => {
      const img = new Image();
      img.onload = () => {
        const frames    = detectFrameCount(img.naturalWidth, img.naturalHeight);
        const natFrameW = img.naturalWidth / frames;
        const natFrameH = img.naturalHeight;
        // Contain: scale uniformly so the frame fits inside MAX×MAX without distortion
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
      img.src = `/enemyAssets/similarIsland/${enemyData.name}/${anim}.png`;
    });
  }, [enemyData?.name]);

  useEffect(() => {
    if (enemyAttacking) playEnemyAnim('attack');
  }, [enemyAttacking]);

  useEffect(() => {
    if (enemyFlashing) playEnemyAnim('hit');
  }, [enemyFlashing]);

  const triggerDefeat = (target, onComplete) => {
    setDefeatTarget(target);

    // beforeDefeat.wav with escalating playback rate over 5 seconds
    const audio = new Audio('/SoundEffects/beforeDefeat.wav');
    audio.loop = true;
    audio.play().catch(() => {});
    beforeDefeatRef.current = audio;

    let elapsed = 0;
    const rampInterval = setInterval(() => {
      elapsed += 80;
      if (beforeDefeatRef.current) {
        beforeDefeatRef.current.playbackRate = Math.min(1.0 + (elapsed / 5000) * 3.5, 4.5);
      }
      if (elapsed >= 5000) {
        clearInterval(rampInterval);
        if (beforeDefeatRef.current) { beforeDefeatRef.current.pause(); beforeDefeatRef.current.src = ''; }

        // Phase 2: fade + defeat sound + white particle burst
        setDefeatFading(true);
        new Audio('/SoundEffects/defeat.wav').play().catch(() => {});

        const boxRef = target === 'enemy' ? enemyBoxRef.current : playerBoxRef.current;
        const el     = boxRef || (target === 'enemy' ? enemyRef.current : playerRef.current);
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top  + rect.height / 2;
          const particles = Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const dist  = 60 + Math.random() * 80;
            return {
              id:   defeatPidRef.current++,
              x: cx, y: cy,
              px: `${Math.cos(angle) * dist}px`,
              py: `${Math.sin(angle) * dist}px`,
              size: 4 + Math.random() * 8,
            };
          });
          setDefeatParticles(particles);
          setTimeout(() => setDefeatParticles([]), 1400);
        }

        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    }, 80);
  };

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

  const playWizardAnim = (anim) => {
    const isWitch = selectedCharacter?.name?.toLowerCase().includes('girl');
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
    const pBox = playerBoxRef.current || playerRef.current;
    const eBox = enemyBoxRef.current  || enemyRef.current;
    const SIZE = 120;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pr = pBox ? pBox.getBoundingClientRect()
      : { left: vw*0.1, right: vw*0.28, top: vh*0.35, height: vh*0.3, width: vw*0.18 };
    const er = eBox ? eBox.getBoundingClientRect()
      : { left: vw*0.72, right: vw*0.9, top: vh*0.35, height: vh*0.3, width: vw*0.18 };
    const sx  = pr.right - SIZE / 2;
    const sy  = pr.top   + pr.height / 2 - SIZE / 2;
    const ex  = er.left  + er.width  / 2 - SIZE / 2;
    const ey  = er.top   + er.height / 2 - SIZE / 2;

    onHitRef.current = onHit;
    new Audio('/SoundEffects/spellCast.wav').play().catch(() => {});

    // Hold at player for 800ms, then fly via CSS animation
    setFireball({ sx, sy, ex, ey, flying: false });

    setTimeout(() => {
      new Audio('/SoundEffects/spellThrow.wav').play().catch(() => {});
      setFireball({ sx, sy, ex, ey, flying: true });
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
    const hintWasUsed = hintUsed || phase2HintUsed;
    const newStreak = isCorrect && !hintWasUsed ? streak + 1 : 0;
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
        ? `Correct! +${pointsEarned} points${hintWasUsed ? ' | Hint used!' : ''}`
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
      playWizardAnim('hurt');
    }

    if (newLives <= 0) {
      triggerDefeat('player', () => handleGameEnd('FAILED', false));
      return;
    }

    if (newEnemyLives <= 0) {
      triggerDefeat('enemy', () => handleGameEnd('COMPLETED', true));
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
    if (lastBgShiftRef.current) {
      setBgShift(`return-${lastBgShiftRef.current}`);
      lastBgShiftRef.current = null;
      setTimeout(() => setBgShift(null), 700);
    }
    setMagicN('');
    actionLocked.current = false;
    setDenAnimating(false);
    setShowDenSparkle(false);
    setAppearSparkles([]);
    setBubbles(null);
    if (arcAnimRef.current) { cancelAnimationFrame(arcAnimRef.current); arcAnimRef.current = null; }
    setCurrentProblem(buildProblem(gameSession.level));
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
        position: 'relative',
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
      {/* Bobbing background layer — outer div bobs (transform), inner div shifts position on answer */}
      <div style={{ position: 'absolute', inset: '-20px', animation: 'bgBob 12s ease-in-out infinite', zIndex: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/InMatchUIElements/SimilarIsland/ForrestCombatBackground.png)',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', padding: '8px 0', gap: '10px', position: 'relative', zIndex: 1 }}>

        {/* Stats — top left, same border as problem display */}
        <div style={{ position: 'relative', border: '4px solid #703737', background: '#e8d5b4', padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 5, border: '1px solid #703737', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#703737' }} />
          <span style={{ color: '#222', fontSize: '10px' }}>Streak: x{multiplier.toFixed(1)}</span>
          <span style={{ color: '#222', fontSize: '10px' }}>Score: {score}</span>
          <span style={{ color: '#222', fontSize: '10px' }}>Level: {gameSession.level}/{totalLevels ?? '...'}</span>
        </div>

        {/* Hint display in header — glows white then settles to white-border + black */}
        {formulaVisible && (
          <div
            key={`hint-${hintUsed}-${phase2HintUsed}`}
            style={{
              position: 'relative',
              border: '4px solid #fff',
              background: '#000',
              color: '#fff',
              fontSize: '10px', fontWeight: 700,
              fontFamily: '"Press Start 2P", monospace',
              display: 'flex', alignItems: 'center', padding: '0 12px', margin: '0 88px',
              animation: 'hintReveal 0.8s ease-out forwards',
              whiteSpace: 'nowrap',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'absolute', inset: 5, border: '1px solid #fff', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
            <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#fff' }} />
            <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
            <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#fff' }} />
            <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#fff' }} />
            {finalAnswerVisible
              ? `Simplify: ${parseInt(displayNum1) + (displayOp === '+' ? parseInt(displayNum2) : -parseInt(displayNum2))}/${displayDen1}`
              : `${displayNum1} ${displayOp} ${displayNum2} =`}
          </div>
        )}

        {/* Menu button — same style as Hint button */}
        <button
          onClick={handleExitGame}
          style={{
            padding: '8px 16px',
            fontSize: 10, fontWeight: 700,
            fontFamily: '"Press Start 2P", monospace',
            background: '#e8d5b4',
            border: '4px solid #703737',
            borderRadius: 0,
            boxShadow: 'none',
            color: '#222',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: 5, border: '1px solid #703737', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -6, left: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', top: -6, right: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: -6, left: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: -6, right: -6, width: 10, height: 10, background: '#703737' }} />
          <div style={{ position: 'absolute', top: 3, left: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: 3, left: 3, width: 5, height: 5, background: '#703737' }} />
          <div style={{ position: 'absolute', bottom: 3, right: 3, width: 5, height: 5, background: '#703737' }} />
          Menu
        </button>
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
          className="wireframe-main-battle"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            flex: 1,
            minHeight: 0,
            padding: '10px 0 0',
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
              {(() => {
                const isWitch = selectedCharacter?.name?.toLowerCase().includes('girl');
                const charKey = isWitch ? 'witch' : 'wizard';
                const FRAMES = isWitch
                  ? { idle: 7, attack1: 10, attack2: 4, hurt: 3 }
                  : { idle: 8, attack1: 7,  attack2: 9, hurt: 4 };
                const n = FRAMES[wizardAnim];
                const DISP = 420;
                const kf = `${charKey}_${wizardAnim}`;
                const sprAnim = `${kf} ${(n / 10).toFixed(2)}s steps(${n}) ${wizardAnim === 'idle' ? 'infinite' : '1 forwards'}`;
                const combined = defeatTarget === 'player' && !defeatFading
                  ? `${sprAnim}, defeatFlash 0.25s ease-in-out infinite`
                  : playerFlashing
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
                      opacity: defeatTarget === 'player' && defeatFading ? 0 : 1,
                      transition: defeatTarget === 'player' && defeatFading ? 'opacity 1.1s ease-out' : 'none',
                    }} />
                  </>
                );
              })()
              }

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
            <div style={{
              opacity: interactableVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
              animation: 'magicFloat 3s ease-in-out infinite',
              position: 'relative',
              filter: pulse > 0.15 ? `drop-shadow(0 0 ${(pulse * 32).toFixed(1)}px rgba(112,55,55,${Math.min(pulse * 1.2, 1).toFixed(2)}))` : 'none',
              transform: `scale(${(1 + pulse * 0.07).toFixed(4)})`,
            }}>
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
                      setBgShift('left'); lastBgShiftRef.current = 'left';
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
                      const dir = correct ? 'right' : 'left';
                      setBgShift(dir); lastBgShiftRef.current = dir;
                      if (correct) {
                        new Audio('/VoiceLines/castSuccess.wav').play().catch(() => {});
                        playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
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
                        visibility: 'hidden', /* hint now shown in header */
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
              {(() => {
                const info = enemySpriteInfo[enemyAnim];
                const { frames, frameW, frameH } = info;
                const BOX = 280;
                const safeName = (enemyData?.name || 'unknown').replace(/\s+/g, '_');
                const kf = `enemy_${safeName}_${enemyAnim}`;
                const sprAnim = `${kf} ${(frames / 10).toFixed(2)}s steps(${frames}) ${enemyAnim === 'idle' ? 'infinite' : '1 forwards'}`;
                const combined = defeatTarget === 'enemy' && !defeatFading
                  ? `${sprAnim}, defeatFlash 0.25s ease-in-out infinite`
                  : enemyFlashing
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
                    <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.6 }}>Missing<br/>Sprite</span>
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
                      backgroundImage: `url(/enemyAssets/similarIsland/${enemyData?.name}/${enemyAnim}.png)`,
                      backgroundSize: `${frames * frameW}px ${frameH}px`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: '0px 0px',
                      animation: combined,
                      imageRendering: 'pixelated',
                      opacity: defeatTarget === 'enemy' && defeatFading ? 0 : 1,
                      transition: defeatTarget === 'enemy' && defeatFading ? 'opacity 1.1s ease-out' : 'none',
                    }} />
                  </>
                );
              })()}
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

      {/* Defeat burst particles */}
      {defeatParticles.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: p.x - p.size/2, top: p.y - p.size/2,
          width: p.size, height: p.size,
          background: '#fff',
          pointerEvents: 'none', zIndex: 10000,
          '--px': p.px, '--py': p.py,
          animation: 'defeatParticleBurst 1.4s ease-out forwards',
        }} />
      ))}

      {/* Environmental particles — leaf & flower raining top-right to bottom-left */}
      {envParticles.map(p => (
        <img
          key={p.id}
          src={`/InMatchUIElements/SimilarIsland/${p.type}.png`}
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
            animation: p.type === 'leaf'
              ? `leafDrift ${p.dur}s ease-in forwards`
              : `flowerDrift ${p.dur}s ease-in forwards`,
          }}
        />
      ))}

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
            animation: fireball.flying
              ? 'fireballArc 0.65s ease-in-out forwards'
              : 'none',
            opacity: fireball.flying ? undefined : 1,
          }}
          onAnimationEnd={() => {
            new Audio('/SoundEffects/spellHit.wav').play().catch(() => {});
            setFireball(null);
            setEnemyFlashing(true);
            setTimeout(() => setEnemyFlashing(false), 500);
            onHitRef.current?.();
          }}
        />
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
