import React, { useState, useEffect, useRef } from 'react';
import { playSfx, getSfxVolume, getMasterVolume } from '../utils/audio';
import DrawingCanvas from '../components/DrawingCanvas';
// ButterflyDiagramCanvas and ButterflyStepPanel disabled — new solving method coming
// import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
// import ButterflyStepPanel from '../components/ButterflyStepPanel';
import ButterflyTutorial from '../components/ButterflyTutorial';
import SettingsPage from './SettingsPage';
import './game.css';
import '../components/components.css';
import { getDifficultyParams, buildProblemDissimilar, TIMING } from '../utils/gameUtils';

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

const DissimilarIslandGame = ({
  studentId, studentNickname, selectedCharacter, gameSession, onGameEnd, onExitToLobby,
}) => {

  const problemKey = (p) => `${p.numerator1}-${p.denominator1}-${p.operator}-${p.numerator2}-${p.denominator2}`;
  const lastFailedProblemKey = useRef(null);

  // ── Problem generation ─────────────────────────────────────────────────────
  const generateProblem = () => {
    const level = gameSession.level ?? 1;
    const { minDen, maxDen, subChance } = getDifficultyParams(level);
    const capDen = Math.min(maxDen, 12);
    let candidate, attempts = 0;
    do {
      const isMixed = gameSession.isBoss ? Math.random() > 0.4 : false;
      const operator = Math.random() < subChance ? '-' : '+';
      const d1 = Math.floor(Math.random() * (capDen - minDen + 1)) + minDen;
      let d2 = Math.floor(Math.random() * (capDen - minDen + 1)) + minDen;
      while (d2 === d1) d2 = Math.floor(Math.random() * (capDen - minDen + 1)) + minDen;
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      const w1 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;
      const w2 = isMixed ? Math.floor(Math.random() * 3) + 1 : 0;
      candidate = operator === '-' && w1 + n1 / d1 < w2 + n2 / d2
        ? { whole1: w2, numerator1: n2, denominator1: d2, whole2: w1, numerator2: n1, denominator2: d1, operator, isMixed }
        : { whole1: w1, numerator1: n1, denominator1: d1, whole2: w2, numerator2: n2, denominator2: d2, operator, isMixed };
      attempts++;
    } while (
      lastFailedProblemKey.current &&
      problemKey(candidate) === lastFailedProblemKey.current &&
      attempts < 20
    );
    lastFailedProblemKey.current = null; // clear after generating a new problem
    return candidate;
  };

  const [problem, setProblem] = useState(generateProblem);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);
  const butterflyPanelRef = useRef(null);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [lives, setLives] = useState(gameSession.lives ?? 3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [enemyLives, setEnemyLives] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [currentHint, setCurrentHint] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [enemyFlashing, setEnemyFlashing] = useState(false);
  const [playerFlashing, setPlayerFlashing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bgShift, setBgShift] = useState(null);
  const lastBgShiftRef = useRef(null);
  const [pulse, setPulse] = useState(0);

  // ── Interactable panel (infinity drawing) ──────────────────────────────────
  const [showDrawHint, setShowDrawHint] = useState(true);
  const [circleDetected, setCircleDetected] = useState(false);
  const [interactableVisible, setInteractableVisible] = useState(true);
  const [rectScale, setRectScale] = useState(1);
  const rectWrapperRef     = useRef(null);
  const rectScaleRef       = useRef(1);
  const circleContainerRef = useRef(null);

  // ── Number fly-in animation ────────────────────────────────────────────────
  const [n1Visible, setN1Visible] = useState(false);
  const [d1Visible, setD1Visible] = useState(false);
  const [n2Visible, setN2Visible] = useState(false);
  const [d2Visible, setD2Visible] = useState(false);
  const [dragOffsets, setDragOffsets] = useState({ d1:{dx:0,dy:0}, d2:{dx:0,dy:0} });
  const [inMagnetZone, setInMagnetZone] = useState({ n1:false, n2:false, d1:false, d2:false });
  const [pulsatingWhite, setPulsatingWhite] = useState({ n1:false, n2:false, d1:false, d2:false });
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
  const [finalNumInput, setFinalNumInput]       = useState('');
  const [finalDenInput, setFinalDenInput]       = useState('');
  const finalNumRef = useRef(null);
  const [circleFailCount, setCircleFailCount] = useState(0);
  const [circleMistakes, setCircleMistakes] = useState([]);
  const [circleFailSequence, setCircleFailSequence] = useState(null);
  const [circleShaking, setCircleShaking] = useState(false);
  const numFontSize = (val, boxSize) => {
    const len = String(Math.abs(val ?? 0)).length;
    if (boxSize >= 40) return len <= 1 ? 21 : len === 2 ? 15 : 10;
    return len <= 1 ? 13 : len === 2 ? 10 : 8;
  };
  const dragRef = useRef(null);
  const floatingDivRef = useRef(null);
  const n1OverlayRef = useRef(null); const d1OverlayRef = useRef(null);
  const n2OverlayRef = useRef(null); const d2OverlayRef = useRef(null);
  const [flyBubbles, setFlyBubbles] = useState(null);
  const [explodeSparkles, setExplodeSparkles] = useState([]);
  const sparklePidRef = useRef(0);
  const num1Ref = useRef(null); const den1Ref = useRef(null);
  const num2Ref = useRef(null); const den2Ref = useRef(null);
  const bRef1 = useRef(null); const bRef2 = useRef(null);
  const bRef3 = useRef(null); const bRef4 = useRef(null);
  const flyArcRef = useRef(null);
  const actionLocked = useRef(false);
  const pendingBgShiftRef = useRef(null);

  const MAGNET_THRESHOLD = 60;
  const BASE_POS = { n1:{left:106,top:80,size:40}, n2:{left:248,top:80,size:40}, d1:{left:110,top:170,size:32}, d2:{left:250,top:170,size:32} };
  const magnetSoundRef = useRef(null);

  const handleNumPointerDown = (e, key) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const scale = rectScaleRef.current || 1;
    const elRect = e.currentTarget.getBoundingClientRect();
    const toCenterDx = (e.clientX - (elRect.left + elRect.width  / 2)) / scale;
    const toCenterDy = (e.clientY - (elRect.top  + elRect.height / 2)) / scale;
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
    const scale = rectScaleRef.current || 1;
    const floatTop = floatingDivRef.current?.getBoundingClientRect().top ?? d.startFloatTop;
    const floatDrift = (floatTop - d.startFloatTop) / scale;
    const newDx = d.startDx + (e.clientX - d.startX) / scale;
    const newDy = d.startDy + (e.clientY - d.startY) / scale - floatDrift;
    setDragOffsets(prev => ({ ...prev, [d.key]: { dx: newDx, dy: newDy } }));
    setDragScreenPos(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
    const b = BASE_POS[d.key];
    const myCx = b.left + b.size / 2 + newDx;
    const myCy = b.top  + b.size / 2 + newDy;
    const otherKey = d.key === 'd1' ? 'd2' : 'd1';
    const RESTRICTED = { d1:'n1', d2:'n2' };
    const ALLOWED_TARGETS = {
      d1: [...(!n2CrossPhase ? ['n2'] : []), ...(!denominatorPhase && !sdBlinking ? ['d2'] : [])],
      d2: [...(!n1CrossPhase ? ['n1'] : []), ...(!denominatorPhase && !sdBlinking ? ['d1'] : [])],
    };
    const newMagnet = { n1:false, n2:false, d1:false, d2:false };
    const newPulse = { n1:false, n2:false, d1:false, d2:false };
    const dists = ['n1', 'n2', otherKey].map(tk => {
      const t = BASE_POS[tk];
      const dist = Math.hypot(myCx - (t.left + t.size/2), myCy - (t.top + t.size/2));
      if (dist < MAGNET_THRESHOLD && !(confirmPressed && tk === otherKey)) {
        newMagnet[d.key] = true;
        if (RESTRICTED[d.key] !== tk) newMagnet[tk] = true;
        if (ALLOWED_TARGETS[d.key].includes(tk)) { newPulse[d.key] = true; newPulse[tk] = true; }
      }
      return dist;
    });
    setInMagnetZone(newMagnet);
    setPulsatingWhite(newPulse);
    if (dragRef.current) {
      dragRef.current.nearOtherDen = dists[2] < MAGNET_THRESHOLD;
      dragRef.current.nearCrossTarget = (d.key === 'd1' && dists[1] < MAGNET_THRESHOLD) || (d.key === 'd2' && dists[0] < MAGNET_THRESHOLD);
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
    setCurrentHint('');
    const curDx = d?.currentDx ?? 0;
    const curDy = d?.currentDy ?? 0;
    const dragKey = d?.key;
    setInMagnetZone({ n1:false, n2:false, d1:false, d2:false });
    setPulsatingWhite({ n1:false, n2:false, d1:false, d2:false });
    if (magnetSoundRef.current) { magnetSoundRef.current.pause(); magnetSoundRef.current = null; }
    setDragScreenPos(null);
    dragRef.current = null;
    const canCross = nearCross && (dragKey === 'd1' ? !n2CrossPhase : !n1CrossPhase);
    const canCombine = nearOther && !denominatorPhase && !sdBlinking;
    if (canCross) {
      triggerCrossProduct(dragKey, curDx, curDy);
    } else {
      if (d) setDragOffsets(prev => ({ ...prev, [dragKey]: { dx:0, dy:0 } }));
      if (canCombine) triggerDenominatorCombine();
    }
  };

  const triggerDenominatorCombine = () => {
    if (denominatorPhase || sdBlinking) return;
    setDenominatorPhase('glowing');
    // Start moving to SD
    setTimeout(() => {
      setDenominatorPhase('to-sd');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setDragOffsets({ d1:{ dx:71, dy:44 }, d2:{ dx:-69, dy:44 } });
      }));
    }, 400);
    // Square explosion + SD blink + immediate arc return
    setTimeout(() => {
      setDenExplosion(true);
      setSdBlinking(true);
      playSfx('/SoundEffects/sparkleExplode.wav');
      setTimeout(() => setDenExplosion(false), 900);
      setDenominatorPhase('arc-returning');
      // Arc: D1 from SD (181,214) back to base (110,170); D2 from (181,214) to (250,170)
      const bezier = (t, p0, cp, p1) => (1-t)**2*p0 + 2*(1-t)*t*cp + t**2*p1;
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
          setDragOffsets({ d1:{ dx:0, dy:0 }, d2:{ dx:0, dy:0 } });
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
    }, 1220);
  };

  const triggerCrossProduct = (dragKey, startDx, startDy) => {
    const explodeKey = dragKey === 'd1' ? 'n2' : 'n1';
    if (explodeKey === 'n2' && n2CrossPhase) return;
    if (explodeKey === 'n1' && n1CrossPhase) return;
    const base = BASE_POS[dragKey];
    // Explosion + sound
    setCrossExplosion(explodeKey);
    playSfx('/SoundEffects/sparkleExplode.wav');
    setTimeout(() => setCrossExplosion(null), 900);
    // Arc dragged denominator back to base
    const el = dragKey === 'd1' ? d1OverlayRef.current : d2OverlayRef.current;
    const sx = base.left + startDx, sy = base.top + startDy;
    const ex = base.left,          ey = base.top;
    const cpX = (sx + ex) / 2 + (dragKey === 'd1' ? -50 : 50);
    const cpY = Math.min(sy, ey) - 70;
    const bez = (t, p0, cp, p1) => (1-t)**2*p0 + 2*(1-t)*t*cp + t**2*p1;
    const ease = t => 1 - Math.pow(1-t, 3);
    const dur = 600, t0 = performance.now();
    const frame = now => {
      const raw = Math.min((now-t0)/dur, 1), t = ease(raw);
      if (el) { el.style.left = bez(t,sx,cpX,ex)+'px'; el.style.top = bez(t,sy,cpY,ey)+'px'; }
      if (raw < 1) requestAnimationFrame(frame);
      else setDragOffsets(prev => ({ ...prev, [dragKey]:{ dx:0, dy:0 } }));
    };
    requestAnimationFrame(frame);
    // Start blinking input on the exploded numerator box
    if (explodeKey === 'n1') {
      setN1CrossPhase('blinking'); setN1CrossVal(''); setN1CrossCorrect(false); setN1CrossConfirmed(false);
      setTimeout(() => n1CrossInputRef.current?.focus(), 50);
    } else {
      setN2CrossPhase('blinking'); setN2CrossVal(''); setN2CrossCorrect(false); setN2CrossConfirmed(false);
      setTimeout(() => n2CrossInputRef.current?.focus(), 50);
    }
  };

  const triggerCircleFailSequence = (mistakes) => {
    const willPlayerDie = lives <= 1;
    // Step 1: flash the magic circle
    setCircleFailSequence('flashing');
    playSfx('/SoundEffects/initialDissimilarFail.wav');

    // Step 2 (2s): start fade + hide interactable UI + bg shift simultaneously → player/enemy collapse
    setTimeout(() => {
      setCircleFailSequence('fading');
      pendingBgShiftRef.current = 'left';
      setInteractableVisible(false);
    }, 2000);

    // Step 3 (2.9s): popup + enemy attack + player hurt + bg shift
    setTimeout(() => {
      setCircleFailSequence(null);
      const last = mistakes[mistakes.length - 1];
      const formula = last.label === 'SD'     ? `${problem.denominator1} × ${problem.denominator2}`
                    : last.label === 'N1'     ? `${problem.denominator2} × ${problem.numerator1}`
                    : last.label === 'N2'     ? `${problem.denominator1} × ${problem.numerator2}`
                    : /* CENTER */ `${problem.denominator2 * problem.numerator1} ${problem.operator} ${problem.denominator1 * problem.numerator2}`;
      const hint = `${formula} = ${last.correct}`;
      const misconceptionType =
        last.label === 'SD'     ? 'WRONG_DENOMINATOR_PRODUCT'
        : last.label === 'N1'   ? 'WRONG_CROSS_MULTIPLY_LEFT'
        : last.label === 'N2'   ? 'WRONG_CROSS_MULTIPLY_RIGHT'
        : /* CENTER */            'WRONG_CROSS_PRODUCT_COMBINATION';
      handleWrongAnswer(hint, last.entered, misconceptionType);
    }, 2900);

    // Step 4 (2.9s + 4.5s = 7.4s): popup gone → reset only if player survived
    setTimeout(() => {
      if (willPlayerDie) return;
      setCircleDetected(false);
      setInteractableVisible(true);
      setN1Visible(false); setD1Visible(false); setN2Visible(false); setD2Visible(false);
      setDragOffsets({ d1:{dx:0,dy:0}, d2:{dx:0,dy:0} });
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
      setCircleFailCount(0); setCircleMistakes([]); setCircleShaking(false);
      setFlyBubbles(null);
      setInMagnetZone({ n1:false, n2:false, d1:false, d2:false });
      setPulsatingWhite({ n1:false, n2:false, d1:false, d2:false });
    }, 7400);
  };

  // ── Enemy data ─────────────────────────────────────────────────────────────
  const [enemyData, setEnemyData] = useState(null);
  const [enemyName, setEnemyName] = useState('Enemy');
  const [totalLevels, setTotalLevels] = useState(null);

  // ── Defeat animation ───────────────────────────────────────────────────────
  const [defeatTarget, setDefeatTarget] = useState(null);
  const [defeatFading, setDefeatFading] = useState(false);
  const [defeatParticles, setDefeatParticles] = useState([]);
  const defeatPidRef = useRef(0);
  const beforeDefeatRef = useRef(null);

  // ── Fireball ───────────────────────────────────────────────────────────────
  const [fireball, setFireball] = useState(null);
  const onHitRef = useRef(null);

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const playerRef   = useRef(null);
  const playerBoxRef = useRef(null);
  const enemyRef    = useRef(null);
  const enemyBoxRef = useRef(null);

  // ── Player sprite ──────────────────────────────────────────────────────────
  const [wizardAnim, setWizardAnim] = useState('idle');
  const wizardAnimTimerRef = useRef(null);

  // ── Enemy sprite ───────────────────────────────────────────────────────────
  const [enemyAnim, setEnemyAnim] = useState('idle');
  const enemyAnimTimerRef = useRef(null);
  const [enemySpriteInfo, setEnemySpriteInfo] = useState({
    idle:   { frames: 4, frameW: 420, frameH: 420, missing: false },
    attack: { frames: 4, frameW: 420, frameH: 420, missing: false },
    hit:    { frames: 4, frameW: 420, frameH: 420, missing: false },
  });
  const enemySpriteInfoRef = useRef({
    idle:   { frames: 4, frameW: 420, frameH: 420, missing: false },
    attack: { frames: 4, frameW: 420, frameH: 420, missing: false },
    hit:    { frames: 4, frameW: 420, frameH: 420, missing: false },
  });

  // ── Environmental particles ────────────────────────────────────────────────
  const [envParticles, setEnvParticles] = useState([]);
  const [particleDigits] = useState(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)));
  const envPidRef = useRef(0);

  // ── OST ───────────────────────────────────────────────────────────────────
  const ostRef      = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const pulseRafRef = useRef(null);

  const playOST = (src) => {
    if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; }
    const audio = new Audio(src);
    audio.loop = true; audio.volume = getMasterVolume(); audio.crossOrigin = 'anonymous'; audio.currentTime = 0;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.85;
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      audioCtxRef.current.createMediaElementSource(audio).connect(analyserRef.current);
    } catch (_) {}
    audio.play().then(() => audioCtxRef.current?.resume()).catch(() => {});
    ostRef.current = audio;
  };

  useEffect(() => {
    const tick = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setPulse(data.slice(0, 8).reduce((a, b) => a + b, 0) / 8 / 255);
      }
      pulseRafRef.current = requestAnimationFrame(tick);
    };
    pulseRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pulseRafRef.current);
  }, []);

  useEffect(() => {
    const track = Math.floor(Math.random() * 3) + 1;
    playOST(`/OSTFiles/dissimilarcombatOST${track}.mp3`);
    return () => { if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; } };
  }, [gameSession.level]);

  useEffect(() => {
    if (enemyData?.type === 'boss') {
      const track = Math.floor(Math.random() * 2) + 1;
      playOST(`/OSTFiles/bossOST${track}.mp3`);
    }
  }, [enemyData?.type]);

  // ── Environmental particle spawner ────────────────────────────────────────
  useEffect(() => {
    const spawn = () => {
      const type = Math.random() < 0.5 ? 'autumnleaf' : 'dust';
      const size = 20 + Math.random() * 24;
      const dur  = 5 + Math.random() * 5;
      const id   = envPidRef.current++;
      setEnvParticles(prev => [...prev, {
        id, type, size, dur,
        startX: 30 + Math.random() * 70,
        startY: -(size + Math.random() * 10),
        dx: `${-(50 + Math.random() * 30)}vw`,
        dy: `${85 + Math.random() * 20}vh`,
        r1: `${(Math.random() - 0.5) * 40}deg`,
        r2: `${(Math.random() - 0.5) * 80}deg`,
        jx1: `${(Math.random() - 0.5) * 6}vw`, jy1: `${(Math.random() - 0.5) * 4}vh`,
        jx2: `${(Math.random() - 0.5) * 8}vw`, jy2: `${(Math.random() - 0.5) * 6}vh`,
      }]);
      setTimeout(() => setEnvParticles(prev => prev.filter(x => x.id !== id)), dur * 1000 + 500);
    };
    spawn(); spawn(); spawn();
    const iv = setInterval(() => { spawn(); if (Math.random() < 0.5) spawn(); }, 400 + Math.random() * 400);
    return () => clearInterval(iv);
  }, []);

  // ── Enemy data loading ────────────────────────────────────────────────────
  const loadEnemyData = () => {
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => {
        const sections = text.split('===').filter(s => s.trim());
        let levelCount = 0;
        for (const section of sections) {
          const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
          if (lines[0] !== 'dissimilarIsland') continue;
          const blocks = section.split('---').slice(1);
          for (const rawBlock of blocks) {
            const content = rawBlock.split('+++')[0].trim();
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

  useEffect(() => { loadEnemyData(); }, [gameSession.level]);

  // ── Enemy sprite loading ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enemyData) return;
    const MAX = 420;
    const reset = {
      idle:   { frames: 4, frameW: MAX, frameH: MAX, missing: false },
      attack: { frames: 4, frameW: MAX, frameH: MAX, missing: false },
      hit:    { frames: 4, frameW: MAX, frameH: MAX, missing: false },
    };
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
      img.src = `/enemyAssets/dissimilarIsland/${enemyData.name}/${anim}.png`;
    });
  }, [enemyData?.name]);

  // ── Sprite animation helpers ──────────────────────────────────────────────
  const playWizardAnim = (anim) => {
    const isWitch = selectedCharacter?.name?.toLowerCase().includes('girl');
    const fc = isWitch ? { attack1: 10, attack2: 4, hurt: 3 } : { attack1: 7, attack2: 9, hurt: 4 };
    if (wizardAnimTimerRef.current) clearTimeout(wizardAnimTimerRef.current);
    setWizardAnim(anim);
    wizardAnimTimerRef.current = setTimeout(() => setWizardAnim('idle'), (fc[anim] / 10) * 1000);
  };

  const playEnemyAnim = (anim) => {
    if (enemyAnimTimerRef.current) clearTimeout(enemyAnimTimerRef.current);
    setEnemyAnim(anim);
    const frames = enemySpriteInfoRef.current[anim]?.frames || 4;
    enemyAnimTimerRef.current = setTimeout(() => setEnemyAnim('idle'), (frames / 10) * 1000);
  };

  useEffect(() => { if (enemyAttacking) playEnemyAnim('attack'); }, [enemyAttacking]);
  useEffect(() => { if (enemyFlashing)  playEnemyAnim('hit');    }, [enemyFlashing]);
  useEffect(() => { if (playerFlashing) playWizardAnim('hurt');  }, [playerFlashing]);

  // ── Interactable box resize observer (same scale logic as Similar Island) ──
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

  const handleInfinityDetected = () => {
    playSfx('/SoundEffects/circleAppear.wav');
    setCircleDetected(true);
  };

  // Label positions within the floating div (top:32 inside circleContainerRef)
  // These must match the left/top values in the overlay array exactly.
  const LABEL_OVERLAY = {
    n1: { left: 106, top: 80  },
    d1: { left: 110, top: 170 },
    n2: { left: 248, top: 80  },
    d2: { left: 250, top: 170 },
  };

  // Flying-bubble destinations: centre of each label in circleContainerRef fractions.
  // Centre = (left+20, 32+top+20) — adds floating-div top:32 offset and half of 40px div.
  const LABEL_POS = {
    n1: { fx: (106+20) / 400, fy: (32+80 +20) / 440 },
    d1: { fx: (110+20) / 400, fy: (32+170+20) / 440 },
    n2: { fx: (248+20) / 400, fy: (32+80 +20) / 440 },
    d2: { fx: (250+20) / 400, fy: (32+170+20) / 440 },
  };

  const triggerNumberFlyIn = () => {
    if (!circleContainerRef.current) return;
    const cRect = circleContainerRef.current.getBoundingClientRect();
    const SIZE  = 44;

    const getSrc = (ref) => {
      if (!ref.current) return { left: cRect.left, top: cRect.top };
      const r = ref.current.getBoundingClientRect();
      return { left: r.left + r.width / 2 - SIZE / 2, top: r.top + r.height / 2 - SIZE / 2 };
    };
    const sources = {
      n1: getSrc(num1Ref), d1: getSrc(den1Ref),
      n2: getSrc(num2Ref), d2: getSrc(den2Ref),
    };

    // Destination centres (proportional into the visual bounding rect)
    const dst = Object.fromEntries(
      Object.entries(LABEL_POS).map(([k, { fx, fy }]) => [k, {
        x: cRect.left + fx * cRect.width  - SIZE / 2,
        y: cRect.top  + fy * cRect.height - SIZE / 2,
      }])
    );

    // Pre-compute control points ONCE before any RAF fires — eliminates jitter
    const ctrl = {};
    ['n1','d1','n2','d2'].forEach(k => {
      const s = sources[k], d = dst[k];
      ctrl[k] = {
        x: (s.left + d.x) / 2 + (Math.random() - 0.5) * 300,
        y: Math.min(s.top, d.y) - 80 - Math.random() * 120,
      };
    });

    const bezier    = (t, p0, cp, p1) => (1-t)**2 * p0 + 2*(1-t)*t * cp + t**2 * p1;
    const easeInOut = t => t < 0.5 ? 2*t*t : 1-((-2*t+2)**2)/2;

    // Spawn bubbles one by one, 300 ms apart, each with a sparkle sound
    const order   = ['n1', 'd1', 'n2', 'd2'];
    const bRefs   = { n1: bRef1, d1: bRef2, n2: bRef3, d2: bRef4 };
    const setters = { n1: setN1Visible, d1: setD1Visible, n2: setN2Visible, d2: setD2Visible };
    const values  = {
      n1: problem.numerator1,  d1: problem.denominator1,
      n2: problem.numerator2,  d2: problem.denominator2,
    };

    setFlyBubbles({});   // initialise empty so the container renders
    order.forEach((key, idx) => {
      setTimeout(() => {
        setFlyBubbles(prev => prev !== null
          ? { ...prev, [key]: { ...sources[key], opacity: 1, value: values[key] } }
          : prev
        );
        playSfx('/SoundEffects/sparkleSound.wav');
      }, 500 + idx * 150);
    });

    // Fly one-by-one with 300 ms stagger
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
              // Hide imperatively — avoids React re-render overwriting position
              if (ref.current) ref.current.style.opacity = '0';
              playSfx('/SoundEffects/sparkleExplode.wav');
              setters[key](true);
              // Spawn sparkle inside the floating div at the label's centre
              const pos = LABEL_OVERLAY[key];
              const sid = sparklePidRef.current++;
              setExplodeSparkles(prev => [...prev, { id: sid, left: pos.left + 20, top: pos.top + 20 }]);
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

  useEffect(() => {
    if (!circleDetected) return;
    const t = setTimeout(triggerNumberFlyIn, 1200);
    return () => clearTimeout(t);
  }, [circleDetected]);

  useEffect(() => {
    if (interactableVisible && lastBgShiftRef.current) {
      const dir = lastBgShiftRef.current;
      setBgShift(`return-${dir}`);
      lastBgShiftRef.current = null;
      setTimeout(() => setBgShift(null), 700);
    }
    if (!interactableVisible && pendingBgShiftRef.current) {
      const dir = pendingBgShiftRef.current;
      setBgShift(dir);
      lastBgShiftRef.current = dir;
      pendingBgShiftRef.current = null;
    }
  }, [interactableVisible]);

  useEffect(() => {
    if (sdCorrect && n1CrossCorrect && n2CrossCorrect && !centerPhase) {
      setCenterPhase('blinking');
      setCenterVal('');
      setCenterCorrect(false);
      setCenterConfirmed(false);
      setTimeout(() => centerInputRef.current?.focus(), 100);
    }
  }, [sdCorrect, n1CrossCorrect, n2CrossCorrect]);

  useEffect(() => {
    if (centerCorrect && !finalAnswerPhase) {
      setTimeout(() => {
        setFinalAnswerPhase(true);
        setFinalNumInput(''); setFinalDenInput('');
        setTimeout(() => finalNumRef.current?.focus(), 100);
      }, 1200);
    }
  }, [centerCorrect]);

  // ── Defeat trigger ────────────────────────────────────────────────────────
  const triggerDefeat = (target, onComplete) => {
    setDefeatTarget(target);
    const audio = new Audio('/SoundEffects/beforeDefeat.wav');
    audio.loop = true; audio.volume = getSfxVolume(); audio.play().catch(() => {});
    beforeDefeatRef.current = audio;
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 80;
      if (beforeDefeatRef.current) beforeDefeatRef.current.playbackRate = Math.min(1.0 + (elapsed / 5000) * 3.5, 4.5);
      if (elapsed >= 5000) {
        clearInterval(iv);
        if (beforeDefeatRef.current) { beforeDefeatRef.current.pause(); beforeDefeatRef.current.src = ''; }
        setDefeatFading(true);
        playSfx('/SoundEffects/defeat.wav');
        const boxRef = target === 'enemy' ? enemyBoxRef.current : playerBoxRef.current;
        const el = boxRef || (target === 'enemy' ? enemyRef.current : playerRef.current);
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
          setDefeatParticles(Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2, dist = 60 + Math.random() * 80;
            return { id: defeatPidRef.current++, x: cx, y: cy, px: `${Math.cos(angle)*dist}px`, py: `${Math.sin(angle)*dist}px`, size: 4 + Math.random() * 8 };
          }));
          setTimeout(() => setDefeatParticles([]), 1400);
        }
        setTimeout(onComplete, 1200);
      }
    }, 80);
  };

  // ── Fireball ──────────────────────────────────────────────────────────────
  const launchFireball = (onHit) => {
    const pBox = playerBoxRef.current || playerRef.current;
    const eBox = enemyBoxRef.current  || enemyRef.current;
    const SIZE = 120, vw = window.innerWidth, vh = window.innerHeight;
    const pr = pBox ? pBox.getBoundingClientRect() : { left: vw*0.1, right: vw*0.28, top: vh*0.35, height: vh*0.3, width: vw*0.18 };
    const er = eBox ? eBox.getBoundingClientRect() : { left: vw*0.72, right: vw*0.9, top: vh*0.35, height: vh*0.3, width: vw*0.18 };
    const sx = pr.right - SIZE / 2, sy = pr.top + pr.height / 2 - SIZE / 2;
    const ex = er.left + er.width / 2 - SIZE / 2, ey = er.top + er.height / 2 - SIZE / 2;
    onHitRef.current = onHit;
    playSfx('/SoundEffects/spellCast.wav');
    setFireball({ sx, sy, ex, ey, flying: false });
    setTimeout(() => {
      playSfx('/SoundEffects/spellThrow.wav');
      setFireball({ sx, sy, ex, ey, flying: true });
    }, 800);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const getCorrectAnswerStr = (p = problem) => {
    const imp1 = p.whole1 * p.denominator1 + p.numerator1;
    const imp2 = p.whole2 * p.denominator2 + p.numerator2;
    const cd = p.denominator1 * p.denominator2;
    const sd = p.operator === '+' ? imp1 * p.denominator2 + imp2 * p.denominator1 : imp1 * p.denominator2 - imp2 * p.denominator1;
    const div = gcd(Math.abs(sd), cd);
    return `${sd / div}/${cd / div}`;
  };

  const getProblemStatement = (p = problem) => p.isMixed
    ? `${p.whole1} ${p.numerator1}/${p.denominator1} ${p.operator} ${p.whole2} ${p.numerator2}/${p.denominator2}`
    : `${p.numerator1}/${p.denominator1} ${p.operator} ${p.numerator2}/${p.denominator2}`;

  // ── API ───────────────────────────────────────────────────────────────────
  const saveSpellAttempt = async (attempt) => {
    try {
      const res = await fetch(`http://localhost:8082/api/game-progress/spell-attempt/${gameSession.sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt),
      });
      if (!res.ok) console.error('Failed to save spell attempt');
    } catch (err) { console.error(err); }
  };

  const saveGameEnd = async (status, isWon) => {
    try {
      const res = await fetch(`http://localhost:8082/api/game-progress/end-session/${gameSession.sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, isWon }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('saveGameEnd failed:', res.status, body);
      }
    } catch (err) { console.error('saveGameEnd error:', err); }
  };

  const handleGameEnd = async (status, isWon) => {
    await saveGameEnd(status, isWon);
    onGameEnd({ status, isWon, score });
  };

  const confirmExit = async () => { await saveGameEnd('PAUSED', false); onExitToLobby(); };
  const handleMasterVolumeChanged = (volume01) => { if (ostRef.current) ostRef.current.volume = volume01; };

  // ── Answer handlers ───────────────────────────────────────────────────────
  const handleAnswerSubmit = async ({ numerator, denominator, skipAnim = false }) => {
    const totalHp   = enemyData?.hp || enemyLives || 1;
    const hpPerHit  = Math.floor(100 / totalHp);
    const newELives = Math.max(0, (enemyLives ?? 1) - 1);
    const newEHp    = Math.max(0, enemyHealth - hpPerHit);
    const newStreak = streak + 1;
    const newMult   = Math.min(2.0, 1.0 + newStreak * 0.2);
    const rawPts    = Math.floor(10 * newMult);
    const pts       = hintUsed ? Math.round(rawPts * 0.4) : rawPts;
    const newScore  = score + pts;

    setEnemyHealth(newEHp); setEnemyLives(newELives);
    setStreak(newStreak); setMultiplier(newMult); setScore(newScore);
    setFeedback(`Correct! +${pts} points${hintUsed ? ' | Hint used!' : ''}`); setFeedbackType('correct');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId,
      mechanicType: 'ButterflyMethod',
      problemStatement: getProblemStatement(),
      answerSubmitted: `${numerator}/${denominator}`,
      correctAnswer: getCorrectAnswerStr(),
      isCorrect: true, errorType: null,
      remainingLives: lives, streakCount: newStreak, multiplierValue: newMult,
      enemyHealthBefore: enemyHealth, enemyHealthAfter: newEHp, pointsEarned: pts,
    });

    const doReset = () => {
      if (newELives <= 0) {
        triggerDefeat('enemy', () => handleGameEnd('COMPLETED', true));
      } else {
        setTimeout(() => {
          setFeedback(''); setFeedbackType('');
          setProblem(generateProblem()); setCurrentStep(1);
          setCircleDetected(false); setInteractableVisible(true);
          setN1Visible(false); setD1Visible(false); setN2Visible(false); setD2Visible(false);
          setDragOffsets({ d1:{dx:0,dy:0}, d2:{dx:0,dy:0} });
          setDenominatorPhase(null); setDenExplosion(false); setSdBlinking(false);
          setSdInputVal(''); setSdCorrect(false); setConfirmPressed(false);
          setSdParticles([]); if (sdParticleIvRef.current) { clearInterval(sdParticleIvRef.current); sdParticleIvRef.current = null; }
          setN1CrossPhase(null); setN2CrossPhase(null); setN1CrossVal(''); setN2CrossVal('');
          setN1CrossCorrect(false); setN2CrossCorrect(false); setN1CrossConfirmed(false); setN2CrossConfirmed(false);
          setCrossExplosion(null); setN1CrossParticles([]); setN2CrossParticles([]);
          if (n1CrossParticleIvRef.current) { clearInterval(n1CrossParticleIvRef.current); n1CrossParticleIvRef.current = null; }
          if (n2CrossParticleIvRef.current) { clearInterval(n2CrossParticleIvRef.current); n2CrossParticleIvRef.current = null; }
          setCenterPhase(null); setCenterVal(''); setCenterCorrect(false); setCenterConfirmed(false); setCenterParticles([]);
          if (centerParticleIvRef.current) { clearInterval(centerParticleIvRef.current); centerParticleIvRef.current = null; }
          setCircleFailCount(0); setCircleMistakes([]); setCircleFailSequence(null); setCircleShaking(false);
          setFinalAnswerPhase(false); setFinalNumInput(''); setFinalDenInput(''); setHintUsed(false); setCurrentHint(''); setShowHintConfirm(false);
          setFlyBubbles(null); if (flyArcRef.current) cancelAnimationFrame(flyArcRef.current);
        }, 10000);
      }
    };

    if (skipAnim) {
      doReset();
    } else {
      playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
      setTimeout(() => launchFireball(doReset), 500);
    }
  };

  const handleWrongAnswer = async (hint, submittedValue, errorType) => {
    lastFailedProblemKey.current = problemKey(problem);
    const newLives = lives - 1;
    setLives(newLives); setStreak(0); setMultiplier(1.0);
    setEnemyAttacking(true); setTimeout(() => setEnemyAttacking(false), 1000);
    setPlayerFlashing(true); setTimeout(() => setPlayerFlashing(false), 500);
    setFeedback(hint ? `Wrong! ${hint}` : 'Wrong answer!'); setFeedbackType('incorrect');
    playSfx('/VoiceLines/castFailure.wav');

    saveSpellAttempt({
      gameSessionId: gameSession.sessionId,
      mechanicType: 'ButterflyMethod',
      problemStatement: getProblemStatement(),
      answerSubmitted: String(submittedValue ?? ''),
      correctAnswer: getCorrectAnswerStr(),
      isCorrect: false, errorType: errorType || 'INCORRECT_ANSWER',
      remainingLives: newLives, streakCount: 0, multiplierValue: 1.0,
      enemyHealthBefore: enemyHealth, enemyHealthAfter: enemyHealth, pointsEarned: 0,
    });

    if (newLives <= 0) {
      triggerDefeat('player', () => handleGameEnd('FAILED', false));
    } else {
      setTimeout(() => { setFeedback(''); setFeedbackType(''); }, 10000);
    }
  };

  // ── Heart renderer ────────────────────────────────────────────────────────
  const renderHearts = (count, max) => Array.from({ length: max }, (_, i) => (
    <img key={i} src="/InteractableUI/HeartSprite.png" alt="heart" style={{
      width: 28, height: 28, objectFit: 'contain',
      opacity: i < count ? 1 : 0.25, filter: i < count ? 'none' : 'grayscale(1)',
    }} />
  ));

  // ── Corner decoration helper ──────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="wireframe-game-container"
      style={{
        position: 'relative', height: '100svh', overflow: 'hidden',
        padding: '20px 20px 0', fontFamily: '"Press Start 2P", monospace',
        fontSize: '13px', display: 'flex', flexDirection: 'column',
        gap: '10px', boxSizing: 'border-box',
      }}
    >
      {/* Bobbing background */}
      <div style={{ position: 'absolute', inset: '-20px', animation: 'bgBob 12s ease-in-out infinite', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/InMatchUIElements/DissimilarIsland/AutumnCombatBackground.png)',
          backgroundSize: 'contain', backgroundPosition: 'center',
          animation: bgShift === 'right'        ? 'bgShiftRight  0.6s ease-out forwards'
                   : bgShift === 'left'         ? 'bgShiftLeft   0.6s ease-out forwards'
                   : bgShift === 'return-right' ? 'bgReturnRight 0.7s ease-in-out forwards'
                   : bgShift === 'return-left'  ? 'bgReturnLeft  0.7s ease-in-out forwards'
                   : 'none',
        }} />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', padding: '8px 0', gap: '10px', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', border: '4px solid #703737', background: '#e8d5b4', padding: '8px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          {corners('#703737')}
          <span style={{ color: '#222', fontSize: '13px' }}>Streak: x{multiplier.toFixed(1)}</span>
          <span style={{ color: '#222', fontSize: '13px' }}>Score: {score}</span>
          <span style={{ color: '#222', fontSize: '13px' }}>Level: {gameSession.level}/{totalLevels ?? '...'}</span>
        </div>
        {currentHint && (
          <div key={currentHint} style={{
            position:'relative', border:'4px solid #fff', background:'#000', color:'#fff',
            fontSize:'13px', fontWeight:700, fontFamily:'"Press Start 2P", monospace',
            display:'flex', alignItems:'center', padding:'0 8px', margin:'0 100px',
            animation:'hintReveal 0.8s ease-out forwards', whiteSpace:'nowrap',
            flex:1, justifyContent:'center',
          }}>
            <div style={{ position:'absolute', inset:5, border:'1px solid #fff', pointerEvents:'none' }} />
            <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#fff'}}/>
            <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#fff'}}/>
            <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#fff'}}/>
            <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#fff'}}/>
            <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#fff'}}/>
            <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#fff'}}/>
            <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#fff'}}/>
            <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#fff'}}/>
            {currentHint}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowTutorial(true)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 700,
              fontFamily: '"Press Start 2P", monospace',
              background: '#e8d5b4', border: '4px solid #703737',
              borderRadius: 0, color: '#222', cursor: 'pointer', position: 'relative',
            }}
          >
            {corners('#703737')}
            Help
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 700,
              fontFamily: '"Press Start 2P", monospace',
              background: '#e8d5b4', border: '4px solid #703737',
              borderRadius: 0, color: '#222', cursor: 'pointer', position: 'relative',
            }}
          >
            {corners('#703737')}
            Menu
          </button>
        </div>
      </div>

      {/* Battle area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'stretch',
          flex: 1, minHeight: 0, padding: '10px 0 0', overflow: 'hidden',
        }}>

          {/* ── Player ── */}
          <div ref={playerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginRight: circleDetected && interactableVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex: 2, flexShrink: 0, position: 'relative', willChange: 'margin-right' }}>
            <div ref={playerBoxRef} style={{ width: 320, height: 320, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              {(() => {
                const isWitch = selectedCharacter?.name?.toLowerCase().includes('girl');
                const charKey = isWitch ? 'witch' : 'wizard';
                const FRAMES  = isWitch ? { idle: 7, attack1: 10, attack2: 4, hurt: 3 } : { idle: 8, attack1: 7, attack2: 9, hurt: 4 };
                const n = FRAMES[wizardAnim], DISP = 420;
                const kf = `${charKey}_${wizardAnim}`;
                const sprAnim = `${kf} ${(n/10).toFixed(2)}s steps(${n}) ${wizardAnim==='idle'?'infinite':'1 forwards'}`;
                const combined = defeatTarget==='player'&&!defeatFading
                  ? `${sprAnim}, defeatFlash 0.25s ease-in-out infinite`
                  : playerFlashing ? `${sprAnim}, enemyFlash 0.5s ease-out, damageShake 0.5s ease-out` : sprAnim;
                const capAnim = wizardAnim[0].toUpperCase() + wizardAnim.slice(1);
                return (
                  <>
                    <style>{`@keyframes ${kf}{to{background-position-x:-${n*DISP}px}}`}</style>
                    <div style={{
                      position:'absolute', bottom:40,
                      left:`calc(50% - ${DISP/2}px + ${isWitch?30:0}px)`,
                      zIndex:1, width:DISP, height:DISP,
                      backgroundImage:`url(/PlayerAssets/${charKey}/${charKey}${capAnim}.png)`,
                      backgroundSize:`${n*DISP}px ${DISP}px`,
                      backgroundRepeat:'no-repeat', backgroundPosition:'0px 0px',
                      animation:combined, imageRendering:'pixelated',
                      opacity: defeatTarget==='player'&&defeatFading ? 0 : 1,
                      transition: defeatTarget==='player'&&defeatFading ? 'opacity 1.1s ease-out' : 'none',
                    }} />
                  </>
                );
              })()}
              {/* Rising digit particles — visible when magic circle is active */}
              {circleDetected && interactableVisible && (
                <>
                  {[
                    {left:'5%',delay:'0s',dur:'2.6s',size:28},{left:'18%',delay:'-0.6s',dur:'3.0s',size:24},
                    {left:'30%',delay:'-1.1s',dur:'2.4s',size:32},{left:'42%',delay:'-0.3s',dur:'2.8s',size:26},
                    {left:'55%',delay:'-1.5s',dur:'2.7s',size:22},{left:'67%',delay:'-0.9s',dur:'3.1s',size:20},
                    {left:'78%',delay:'-1.8s',dur:'2.5s',size:30},{left:'90%',delay:'-0.4s',dur:'2.9s',size:25},
                    {left:'12%',delay:'-2.1s',dur:'2.6s',size:21},{left:'48%',delay:'-1.3s',dur:'3.2s',size:27},
                    {left:'72%',delay:'-0.7s',dur:'2.3s',size:23},{left:'35%',delay:'-2.4s',dur:'2.8s',size:29},
                  ].map((p,i) => (
                    <span key={i} style={{position:'absolute',bottom:0,left:p.left,fontSize:p.size,fontFamily:'"Press Start 2P", monospace',fontWeight:900,color:'rgba(255,255,255,0.88)',lineHeight:1,textShadow:'2px 2px 4px rgba(0,0,0,0.45)',pointerEvents:'none',zIndex:3,animation:`riseAndFade ${p.dur} ease-out ${p.delay} infinite`,userSelect:'none'}}>{particleDigits[i]??0}</span>
                  ))}
                </>
              )}
              <img src="/InMatchUIElements/DissimilarIsland/DissimilarIslandPlatform.png" alt="platform"
                style={{ position:'absolute', bottom:'-50px', left:'50%', transform:'translateX(-50%)', width:'120%', objectFit:'contain', pointerEvents:'none', zIndex:0 }} />
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'40px' }}>
              <div style={{ position:'relative', border:'4px solid #fff', background:'#000', padding:'6px 18px', color:'#fff', fontSize:'14px', fontWeight:700 }}>
                {corners('#fff')}{studentNickname || 'Player'}
              </div>
              <div style={{ position:'relative', border:'4px solid #fff', background:'#000', padding:'6px 10px', display:'flex', gap:'4px', alignItems:'center' }}>
                {corners('#fff')}{renderHearts(lives, 3)}
              </div>
            </div>
          </div>

          {/* ── Center: Problem + Butterfly panel ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', paddingTop:'32px', minHeight:0, overflow:'hidden', zIndex:1, opacity: interactableVisible ? 1 : 0, transition:'opacity 0.4s ease' }}>

            {/* Problem display */}
            <div style={{
              animation:'magicFloat 3s ease-in-out infinite', position:'relative',
              filter: pulse>0.15 ? `drop-shadow(0 0 ${(pulse*32).toFixed(1)}px rgba(112,55,55,${Math.min(pulse*1.2,1).toFixed(2)}))` : 'none',
              transform:`scale(${(1+pulse*0.07).toFixed(4)})`,
            }}>
              <div key={getProblemStatement()} data-tutorial="problem-box" className="problem-fade-in" style={{
                position:'relative', background:'#e8d5b4', border:'4px solid #703737',
                borderRadius:0, padding:'22px 28px', display:'flex', alignItems:'center', gap:'16px',
              }}>
                {corners('#703737')}
                {problem.whole1 > 0 && <span style={{ fontSize:28, fontWeight:800, color:'#222' }}>{problem.whole1}</span>}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <span ref={num1Ref} style={{ fontSize:28, fontWeight:800, color:'#222', minWidth:40, textAlign:'center' }}>{problem.numerator1}</span>
                  <div style={{ width:50, height:3, background:'#222', borderRadius:2, margin:'3px 0' }} />
                  <span ref={den1Ref} style={{ fontSize:28, fontWeight:800, color:'#222', minWidth:40, textAlign:'center' }}>{problem.denominator1}</span>
                </div>
                <span style={{ fontSize:32, fontWeight:800, color:'#222' }}>{problem.operator}</span>
                {problem.whole2 > 0 && <span style={{ fontSize:28, fontWeight:800, color:'#222' }}>{problem.whole2}</span>}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <span ref={num2Ref} style={{ fontSize:28, fontWeight:800, color:'#222', minWidth:40, textAlign:'center' }}>{problem.numerator2}</span>
                  <div style={{ width:50, height:3, background:'#222', borderRadius:2, margin:'3px 0' }} />
                  <span ref={den2Ref} style={{ fontSize:28, fontWeight:800, color:'#222', minWidth:40, textAlign:'center' }}>{problem.denominator2}</span>
                </div>
                <span style={{ fontSize:28, fontWeight:800, color:'#555' }}>= ?</span>
              </div>

              {/* Square particles emitting from the bottom — same as Similar Island */}
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
                  position: 'absolute', bottom: -4, left: p.left,
                  width: p.size, height: p.size,
                  background: '#703737', pointerEvents: 'none',
                  animation: `particleFall ${p.dur} ease-out ${p.delay} infinite`,
                }} />
              ))}
            </div>

            {/* Interactable drawing panel — same structure as Similar Island */}
            <div ref={rectWrapperRef} style={{ flex:1, minHeight:0, overflow:'hidden', display:'flex', alignItems:'flex-end', justifyContent:'center', width:'100%' }}>
              <div ref={circleContainerRef} data-tutorial="interactable" style={{
                width:'400px', height:'440px', flexShrink:0,
                transform:`scale(${rectScale})`, transformOrigin:'bottom center',
                background:'none', border:'4px solid #703737', borderRadius:0, boxShadow:'none',
                display:'flex', justifyContent:'center',
                opacity: interactableVisible ? 1 : 0,
                pointerEvents: interactableVisible ? 'auto' : 'none',
                transition:'opacity 0.4s ease', alignItems:'center',
                position:'relative', marginBottom:'50px',
              }}>
                {/* Rising particles */}
                {[
                  { left:'3%', size:8, dur:'2.2s', delay:'0s'    }, { left:'10%', size:5, dur:'1.7s', delay:'-0.5s' },
                  { left:'17%', size:10, dur:'2.5s', delay:'-1.2s' }, { left:'24%', size:6, dur:'1.9s', delay:'-0.8s' },
                  { left:'31%', size:9, dur:'2.3s', delay:'-1.6s' }, { left:'38%', size:5, dur:'2.0s', delay:'-0.3s' },
                  { left:'45%', size:11, dur:'2.6s', delay:'-2.0s' }, { left:'52%', size:6, dur:'1.8s', delay:'-0.9s' },
                  { left:'59%', size:8, dur:'2.4s', delay:'-1.5s' }, { left:'66%', size:4, dur:'1.6s', delay:'-2.3s' },
                  { left:'73%', size:7, dur:'2.1s', delay:'-0.6s' }, { left:'80%', size:5, dur:'1.9s', delay:'-1.8s' },
                  { left:'87%', size:9, dur:'2.3s', delay:'-1.1s' }, { left:'93%', size:6, dur:'2.0s', delay:'-2.5s' },
                ].map((p,i) => (
                  <div key={i} style={{ position:'absolute', bottom:4, left:p.left, width:p.size, height:p.size, background:'#703737', pointerEvents:'none', zIndex:1, animation:`particleRise ${p.dur} ease-out ${p.delay} infinite` }} />
                ))}

                {/* Solid background */}
                <div style={{ position:'absolute', inset:0, background:'#e8d5b4', zIndex:0, pointerEvents:'none' }} />
                {/* Inner thin border */}
                <div style={{ position:'absolute', inset:8, border:'1px solid #703737', borderRadius:0, zIndex:0, pointerEvents:'none' }} />
                {/* Corner squares */}
                {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
                  <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:'#703737', ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
                ))}
                {[[4,4],[null,4],[4,null],[null,null]].map(([t,l],i) => (
                  <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:6, height:6, background:'#703737', ...(t!==null?{top:t}:{bottom:4}), ...(l!==null?{left:l}:{right:4}) }}/>
                ))}

                {/* Book */}
                <img src="/InteractableUI/BookUI.png" alt="book" style={{
                  position:'absolute', bottom:14, left:'50%', width:'140%',
                  objectFit:'contain', pointerEvents:'none', zIndex:1,
                  animation:'bookFloat 6s ease-in-out infinite',
                }} />

                {/* Draw ∞ prompt */}
                {!circleDetected && showDrawHint && (
                  <p style={{
                    position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
                    margin:0, color:'#ffffff', fontSize:'13px', fontWeight:900, whiteSpace:'nowrap',
                    textShadow:'0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,1), 3px 3px 0px rgba(0,0,0,1)',
                    zIndex:3, pointerEvents:'none',
                  }}>Draw <span style={{ fontSize: '38px', verticalAlign: 'top', lineHeight: 0.6, position: 'relative', top: '-9px' }}>∞</span> to continue!</p>
                )}

                {/* Drawing canvas or magic circle */}
                {!circleDetected ? (
                  <div style={{ position:'absolute', inset:0, zIndex:3 }} onPointerDown={() => { if (showDrawHint) setShowDrawHint(false); }}>
                    <DrawingCanvas mode="infinity" onCircleDetected={handleInfinityDetected} />
                  </div>
                ) : (
                  <>
                    <style>{`
                      @keyframes dimFadeIn { from{opacity:0;transform:translateY(-10px)} to{opacity:0.3;transform:translateY(0)} }
                    `}</style>
                    <div style={{ position:'absolute', inset:0, zIndex:2, animation: circleShaking ? 'circleShake 0.5s ease-in-out 2' : 'none' }}>
                    <div ref={floatingDivRef} style={{
                      position:'absolute', top:32, left:0, right:0, height:'300px',
                      animation: 'magicFloat 4s ease-in-out infinite',
                      opacity: circleFailSequence === 'fading' || finalAnswerPhase ? 0 : 1,
                      transition: (circleFailSequence === 'fading' || finalAnswerPhase) ? 'opacity 0.6s ease-out' : undefined,
                    }}>
                      <img src="/InteractableUI/DissimilarMagicCircle.png" alt="magic circle" style={{
                        position:'absolute', top:0, left:0, right:0, width:'100%', height:'100%',
                        objectFit:'contain', pointerEvents:'none',
                        animation: circleFailSequence === 'flashing' ? 'circleFlash 0.12s ease-in-out infinite'
                          : circleFailCount === 2 ? 'circlePulse2 0.4s ease-in-out infinite'
                          : circleFailCount === 1 ? 'circlePulse1 0.75s ease-in-out infinite'
                          : 'problemFadeIn 0.5s ease-out',
                      }} />
                      {/* Sparkle bursts — inside floating div so they move with the magic circle */}
                      {explodeSparkles.map(s => (
                        <img key={s.id} src="/OtherEffects/BlueSparkle.png" alt="" style={{
                          position: 'absolute', left: s.left, top: s.top,
                          width: 72, height: 72,
                          pointerEvents: 'none', zIndex: 4,
                          animation: 'sparkBurst 0.8s ease-out forwards',
                        }} />
                      ))}
                      {/* Number overlays at N1/D1/N2/D2 positions */}
                      {[
                        { key:'n1', oRef:n1OverlayRef, visible:n1Visible, val:problem.numerator1,   left:106, top:80,  fontSize:numFontSize(problem.numerator1,40),   size:40, bg:'#333' },
                        { key:'d1', oRef:d1OverlayRef, visible:d1Visible, val:problem.denominator1, left:110, top:170, fontSize:numFontSize(problem.denominator1,32), size:32, bg:'#333' },
                        { key:'n2', oRef:n2OverlayRef, visible:n2Visible, val:problem.numerator2,   left:248, top:80,  fontSize:numFontSize(problem.numerator2,40),   size:40, bg:'#333' },
                        { key:'d2', oRef:d2OverlayRef, visible:d2Visible, val:problem.denominator2, left:250, top:170, fontSize:numFontSize(problem.denominator2,32), size:32, bg:'#333' },
                      ].map(({ key, oRef, visible, val, left, top, fontSize, size, bg }) => {
                        const draggable = key === 'd1' || key === 'd2';
                        const offset = draggable ? dragOffsets[key] : { dx:0, dy:0 };
                        const vibrating = inMagnetZone[key];
                        return (
                          <div key={key} ref={oRef}
                            onPointerDown={visible && draggable && (!denominatorPhase || confirmPressed) && !(sdCorrect && n1CrossCorrect && n2CrossCorrect) && !((n1CrossPhase === 'blinking' && !n1CrossConfirmed) || (n2CrossPhase === 'blinking' && !n2CrossConfirmed)) ? (e) => handleNumPointerDown(e, key) : undefined}
                            onPointerMove={visible && draggable ? handleNumPointerMove : undefined}
                            onPointerUp={visible && draggable ? handleNumPointerUp : undefined}
                            style={{
                              position:'absolute', left: left + offset.dx, top: top + offset.dy,
                              animation: 'numFadeIn 0.5s ease-out both',
                              animationPlayState: visible ? 'running' : 'paused',
                              pointerEvents: visible && (!denominatorPhase || confirmPressed) && !(sdCorrect && n1CrossCorrect && n2CrossCorrect) && !((n1CrossPhase === 'blinking' && !n1CrossConfirmed) || (n2CrossPhase === 'blinking' && !n2CrossConfirmed)) ? 'auto' : 'none',
                              cursor: visible && draggable && (!denominatorPhase || confirmPressed) && !(sdCorrect && n1CrossCorrect && n2CrossCorrect) && !((n1CrossPhase === 'blinking' && !n1CrossConfirmed) || (n2CrossPhase === 'blinking' && !n2CrossConfirmed)) ? 'grab' : 'default',
                              userSelect: 'none', touchAction: 'none',
                              zIndex: dragRef.current?.key === key ? 10 : 3,
                              opacity: dragScreenPos?.key === key ? 0 : undefined,
                              transition: denominatorPhase === 'to-sd' && draggable
                                ? 'left 0.8s ease-in-out, top 0.8s ease-in-out' : undefined,
                            }}>
                            {(() => {
                              const crossPhase = key === 'n1' ? n1CrossPhase : key === 'n2' ? n2CrossPhase : null;
                              const crossCorrect = key === 'n1' ? n1CrossCorrect : n2CrossCorrect;
                              const crossInputRef = key === 'n1' ? n1CrossInputRef : n2CrossInputRef;
                              const crossVal = key === 'n1' ? n1CrossVal : n2CrossVal;
                              const setCrossVal = key === 'n1' ? setN1CrossVal : setN2CrossVal;
                              const crossAnswer = key === 'n1' ? problem.denominator2 * problem.numerator1 : problem.denominator1 * problem.numerator2;
                              if (crossPhase) return (
                                <div style={{
                                  width:size, height:size,
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  border:'3px dashed #e8d5b4', borderRadius:0,
                                  background:'#333333',
                                  fontFamily:'"Press Start 2P", monospace',
                                  animation:`sdBlink ${crossCorrect?'2s':'0.6s'} ease-in-out infinite`,
                                  pointerEvents:'auto',
                                }}>
                                  {crossCorrect
                                    ? <span style={{ fontSize:numFontSize(crossAnswer,size), fontWeight:900, color:'#ffffff', fontFamily:'"Press Start 2P", monospace' }}>{crossAnswer}</span>
                                    : <input ref={crossInputRef} type="text" inputMode="numeric" pattern="[0-9]*"
                                        value={crossVal} onChange={e => setCrossVal(e.target.value.replace(/\D/g,''))}
                                        style={{ width:'100%', height:'100%', textAlign:'center', fontSize:numFontSize(crossVal||0,size), fontWeight:900, color:'#ffffff', background:'transparent', border:'none', outline:'none', fontFamily:'"Press Start 2P", monospace', padding:0 }} />
                                  }
                                </div>
                              );
                              return (
                                <div style={{
                                  width:size, height:size,
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize, fontWeight:900, color:'#ffffff',
                                  border: '3px dashed #e8d5b4', borderRadius: 0, background: bg,
                                  fontFamily:'"Press Start 2P", monospace',
                                  animation: (denominatorPhase === 'glowing' || denominatorPhase === 'to-sd') && draggable
                                    ? 'denGlow 0.4s ease-in-out infinite'
                                    : [
                                        vibrating ? 'magnetVibrate 0.15s ease-in-out infinite' : null,
                                        pulsatingWhite[key] ? 'pulsateWhite 0.5s ease-in-out infinite' : null,
                                      ].filter(Boolean).join(', ') || 'none',
                                }}>{val}</div>
                              );
                            })()}
                          </div>
                        );
                      })}
                      {/* Center node — input when all three solved */}
                      {n1Visible && d1Visible && n2Visible && d2Visible && (
                        centerPhase ? (
                          <div style={{
                            position:'absolute', left:177, top:128,
                            width:40, height:40,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            border:'3px dashed #e8d5b4', borderRadius:0, background:'#333333',
                            pointerEvents:'auto', zIndex:5, overflow:'visible',
                          }}>
                            <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position:'absolute', width:80, height:80, left:-20, top:-20, animation:'sparkleSpinPulse 2.4s ease-in-out infinite', pointerEvents:'none' }} />
                            {centerCorrect
                              ? <span style={{ position:'relative', zIndex:1, fontSize:numFontSize((() => { const n1s=problem.denominator2*problem.numerator1; const n2s=problem.denominator1*problem.numerator2; return problem.operator==='+'?n1s+n2s:n1s-n2s; })(),40), fontWeight:900, color:'#fff', fontFamily:'"Press Start 2P", monospace', textShadow:'0 0 6px rgba(0,0,0,0.9)' }}>
                                  {(() => { const n1s=problem.denominator2*problem.numerator1; const n2s=problem.denominator1*problem.numerator2; return problem.operator==='+'?n1s+n2s:n1s-n2s; })()}
                                </span>
                              : <input ref={centerInputRef} type="text" inputMode="numeric" pattern="[0-9]*"
                                  value={centerVal} onChange={e => setCenterVal(e.target.value.replace(/\D/g,''))}
                                  style={{ position:'relative', zIndex:1, width:'100%', height:'100%', textAlign:'center', fontSize:numFontSize(centerVal||0,40), fontWeight:900, color:'#fff', background:'transparent', border:'none', outline:'none', fontFamily:'"Press Start 2P", monospace', padding:0, textShadow:'0 0 6px rgba(0,0,0,0.9)' }}
                                />
                            }
                          </div>
                        ) : (
                          <div style={{
                            position:'absolute', left:177, top:128,
                            width:40, height:40,
                            border:'3px dashed #ffffff', borderRadius:0,
                            background:'transparent',
                            boxShadow:'0 0 8px 3px rgba(0,0,0,0.7)',
                            animation:'numFadeIn 0.5s ease-out both',
                            pointerEvents:'none', zIndex:3,
                          }} />
                        )
                      )}
                      {/* Center particles on correct answer */}
                      {centerParticles.map(p => (
                        <div key={p.id} style={{ position:'absolute', left:p.sl, top:p.st, width:p.size, height:p.size, background:'#ffffff', pointerEvents:'none', zIndex:6, '--tx':p.tx+'px', '--ty':p.ty+'px', animation:`sdToTarget 0.75s ${p.delay}s ease-out forwards` }} />
                      ))}
                      {/* D1/D2 → SD particles on correct answer */}
                      {sdParticles.map(p => (
                        <div key={p.id} style={{
                          position:'absolute', left:p.sl, top:p.st,
                          width:p.size, height:p.size, background:'#ffffff',
                          pointerEvents:'none', zIndex:6,
                          '--tx': p.tx+'px', '--ty': p.ty+'px',
                          animation:`sdToTarget 0.75s ${p.delay}s ease-out forwards`,
                        }} />
                      ))}
                      {/* Cross product explosion at N1 or N2 */}
                      {crossExplosion && (() => {
                        const cx = crossExplosion === 'n1' ? 126 : 268, cy = 100;
                        return [
                          {dx:'-70px',dy:'-70px',s:9},{dx:'0px',dy:'-85px',s:7},{dx:'70px',dy:'-70px',s:9},
                          {dx:'85px',dy:'0px',s:7},{dx:'70px',dy:'70px',s:9},{dx:'0px',dy:'85px',s:7},
                          {dx:'-70px',dy:'70px',s:9},{dx:'-85px',dy:'0px',s:7},
                          {dx:'-45px',dy:'-95px',s:6},{dx:'45px',dy:'-95px',s:6},{dx:'95px',dy:'45px',s:6},{dx:'-95px',dy:'45px',s:6},
                        ].map((d,i) => (
                          <div key={i} style={{ position:'absolute', left:cx, top:cy, width:d.s, height:d.s, background:'#ffffff', pointerEvents:'none', zIndex:6, '--dx':d.dx, '--dy':d.dy, animation:`squareBurst ${0.7+(i%3)*0.1}s ease-out forwards` }} />
                        ));
                      })()}
                      {/* N1/N2 cross particles on correct answer */}
                      {[...n1CrossParticles, ...n2CrossParticles].map(p => (
                        <div key={p.id} style={{ position:'absolute', left:p.sl, top:p.st, width:p.size, height:p.size, background:'#ffffff', pointerEvents:'none', zIndex:6, '--tx':p.tx+'px', '--ty':p.ty+'px', animation:`sdToTarget 0.75s ${p.delay}s ease-out forwards` }} />
                      ))}
                      {/* Square explosion at SD on denominator combine */}
                      {denExplosion && [
                        {dx:'-80px',dy:'-80px',s:10},{dx:'-20px',dy:'-95px',s:7},{dx:'20px',dy:'-95px',s:9},{dx:'80px',dy:'-80px',s:8},
                        {dx:'95px',dy:'-20px',s:7},{dx:'95px',dy:'20px',s:10},{dx:'80px',dy:'80px',s:8},{dx:'20px',dy:'95px',s:7},
                        {dx:'-20px',dy:'95px',s:9},{dx:'-80px',dy:'80px',s:7},{dx:'-95px',dy:'20px',s:10},{dx:'-95px',dy:'-20px',s:8},
                        {dx:'-50px',dy:'-110px',s:6},{dx:'50px',dy:'-110px',s:6},{dx:'110px',dy:'50px',s:6},{dx:'-110px',dy:'50px',s:6},
                      ].map((dir, i) => (
                        <div key={i} style={{
                          position:'absolute', left:197, top:230,
                          width:dir.s, height:dir.s, background:'#ffffff',
                          pointerEvents:'none', zIndex:6,
                          '--dx': dir.dx, '--dy': dir.dy,
                          animation:`squareBurst ${0.7 + (i % 3) * 0.1}s ease-out forwards`,
                        }} />
                      ))}
                      {/* SD — bottom node, appears with the buttons */}
                      {n1Visible && d1Visible && n2Visible && d2Visible && (
                        denominatorPhase === 'sd-input' || sdBlinking ? (
                          <div style={{
                            position:'absolute', left:177, top:210,
                            width:40, height:40,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            border:'3px dashed #e8d5b4', borderRadius:0, background:'#333333',
                            animation: `sdBlink ${sdCorrect ? '2s' : '0.6s'} ease-in-out infinite`,
                            zIndex:5,
                          }}>
                            {sdCorrect ? (
                              <span style={{ fontSize:numFontSize(problem.denominator1*problem.denominator2,40), fontWeight:900, color:'#ffffff', fontFamily:'"Press Start 2P", monospace' }}>
                                {problem.denominator1 * problem.denominator2}
                              </span>
                            ) : denominatorPhase === 'sd-input' && (
                              <input
                                ref={sdInputRef}
                                type="text" inputMode="numeric" pattern="[0-9]*"
                                value={sdInputVal}
                                onChange={e => setSdInputVal(e.target.value.replace(/\D/g,''))}
                                style={{
                                  width:'100%', height:'100%', textAlign:'center',
                                  fontSize:numFontSize(sdInputVal||0,40), fontWeight:900, color:'#ffffff',
                                  background:'transparent', border:'none', outline:'none',
                                  fontFamily:'"Press Start 2P", monospace',
                                  padding:0,
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div style={{
                            position:'absolute', left:177, top:210,
                            width:40, height:40,
                            border:'3px dashed #ffffff', borderRadius:0,
                            background:'transparent',
                            boxShadow:'0 0 8px 3px rgba(0,0,0,0.7)',
                            animation:'numFadeIn 0.5s ease-out both',
                            pointerEvents:'none', zIndex:3,
                          }} />
                        )
                      )}
                      {/* ── Final answer input — centered, appears after magic circle fades ── */}
                      {/* ── Answer inputs will be placed here when the new solving method is implemented ── */}
                    </div>
                    </div>{/* end shake wrapper */}

                    {/* ── Final answer input — centered over the container ── */}
                    {finalAnswerPhase && (() => {
                      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                      const n1s = problem.denominator2 * problem.numerator1;
                      const n2s = problem.denominator1 * problem.numerator2;
                      const rawNum = problem.operator === '+' ? n1s + n2s : n1s - n2s;
                      const rawDen = problem.denominator1 * problem.denominator2;
                      const g = gcd(Math.abs(rawNum), rawDen);
                      const sNum = rawNum / g, sDen = rawDen / g;
                      const isWhole = sDen === 1;
                      const fieldStyle = { width:90, height:64, fontSize:28, fontWeight:800, textAlign:'center', border:'3px dashed #e8d5b4', borderRadius:0, background:'#333333', color:'#ffffff', outline:'none', appearance:'none', fontFamily:'"Press Start 2P", monospace', WebkitAppearance:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.7)', textShadow:'0 0 8px rgba(0,0,0,0.9)' };
                      return (
                        <div style={{ position:'absolute', top:'32px', left:0, right:0, height:'300px', display:'flex', alignItems:'center', justifyContent:'center', animation:'magicFloat 4s ease-in-out infinite', zIndex:10 }}>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, animation:'numFadeIn 0.5s ease-out both' }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:'"Press Start 2P", monospace', textShadow:'1px 1px 4px rgba(0,0,0,0.7)', whiteSpace:'nowrap', padding:'6px 14px', border:'3px dashed #e8d5b4', borderRadius:0, background:'#333333' }}>Final Answer:</span>
                            {isWhole ? (
                              <input ref={finalNumRef} type="text" inputMode="numeric" value={finalNumInput}
                                onChange={e => setFinalNumInput(e.target.value.replace(/[^0-9-]/g,''))}
                                style={fieldStyle} />
                            ) : (
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                                <input ref={finalNumRef} type="text" inputMode="numeric" value={finalNumInput}
                                  onChange={e => setFinalNumInput(e.target.value.replace(/[^0-9-]/g,''))}
                                  style={fieldStyle} />
                                <div style={{ width:110, height:4, background:'#333333', borderRadius:2 }} />
                                <input type="text" inputMode="numeric" value={finalDenInput}
                                  onChange={e => setFinalDenInput(e.target.value.replace(/[^0-9-]/g,''))}
                                  style={fieldStyle} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Bottom buttons — appear once all 4 numbers have landed ── */}
                    {n1Visible && d1Visible && n2Visible && d2Visible && (
                      <div style={{ position:'absolute', bottom:12, left:'50%', display:'flex', gap:10, zIndex:4, animation:'nAreaFadeIn 0.5s ease-out forwards' }}>
                        {/* Confirm button */}
                        {(() => {
                          const gcd2 = (a, b) => b === 0 ? a : gcd2(b, a % b);
                          const fn1s = problem.denominator2 * problem.numerator1;
                          const fn2s = problem.denominator1 * problem.numerator2;
                          const fRawNum = problem.operator === '+' ? fn1s + fn2s : fn1s - fn2s;
                          const fRawDen = problem.denominator1 * problem.denominator2;
                          const fG = gcd2(Math.abs(fRawNum), fRawDen);
                          const fSNum = fRawNum / fG, fSDen = fRawDen / fG;
                          const fIsWhole = fSDen === 1;
                          const sdActive     = denominatorPhase === 'sd-input' && !confirmPressed && !!sdInputVal && !circleFailSequence;
                          const n1Active     = n1CrossPhase === 'blinking' && !n1CrossConfirmed && !!n1CrossVal && !circleFailSequence;
                          const n2Active     = n2CrossPhase === 'blinking' && !n2CrossConfirmed && !!n2CrossVal && !circleFailSequence;
                          const centerActive = centerPhase === 'blinking' && !centerConfirmed && !!centerVal && !circleFailSequence;
                          const finalActive  = finalAnswerPhase && (fIsWhole ? !!finalNumInput : !!finalNumInput && !!finalDenInput);
                          const allSolved    = sdCorrect && n1CrossCorrect && n2CrossCorrect;
                          const active = sdActive || n1Active || n2Active || centerActive || finalActive;
                          const spawnCrossParticles = (setFn, ivRef, slBase, stBase, txBase, tyBase) => {
                            const spawn = () => {
                              const spread=18, pid=Date.now(), ps=[];
                              for(let i=0;i<8;i++){
                                ps.push({id:pid+i, sl:slBase+(Math.random()-.5)*spread, st:stBase+(Math.random()-.5)*spread, tx:txBase+(Math.random()-.5)*spread, ty:tyBase+(Math.random()-.5)*spread, delay:Math.random()*.15, size:Math.floor(Math.random()*5+4)});
                              }
                              setFn(ps);
                            };
                            spawn();
                            if (ivRef.current) clearInterval(ivRef.current);
                            ivRef.current = setInterval(spawn, 600);
                          };
                          return (
                        <button
                          disabled={!active}
                          onClick={() => {
                            setCurrentHint('');
                            const recordFail = (label, entered, correct, prevMistakes) => {
                              const updated = [...prevMistakes, { label, entered: String(entered), correct: String(correct) }];
                              setCircleMistakes(updated);
                              const newCount = circleFailCount + 1;
                              setCircleFailCount(newCount);
                              playSfx('/SoundEffects/dissimilarWrong.wav');
                              setCircleShaking(true);
                              setTimeout(() => setCircleShaking(false), 1000);
                              if (newCount >= 3) {
                                triggerCircleFailSequence(updated);
                              } else {
                                // Strikes 1-2 don't cost a life, but still log the misconception
                                // immediately — otherwise these attempts vanish and never reach the DB.
                                const misconceptionType =
                                  label === 'SD' ? 'WRONG_DENOMINATOR_PRODUCT'
                                  : label === 'N1' ? 'WRONG_CROSS_MULTIPLY_LEFT'
                                  : label === 'N2' ? 'WRONG_CROSS_MULTIPLY_RIGHT'
                                  : 'WRONG_CROSS_PRODUCT_COMBINATION';
                                saveSpellAttempt({
                                  gameSessionId: gameSession.sessionId,
                                  mechanicType: 'ButterflyMethod',
                                  problemStatement: getProblemStatement(),
                                  answerSubmitted: String(entered),
                                  correctAnswer: String(correct),
                                  isCorrect: false, errorType: misconceptionType,
                                  remainingLives: lives, streakCount: streak, multiplierValue: multiplier,
                                  enemyHealthBefore: enemyHealth, enemyHealthAfter: enemyHealth, pointsEarned: 0,
                                });
                              }
                              return updated;
                            };
                            if (sdActive) {
                              const sdAns = problem.denominator1 * problem.denominator2;
                              if (parseInt(sdInputVal) === sdAns) {
                                setConfirmPressed(true);
                                setSdCorrect(true);
                                setHintUsed(false); setCurrentHint('');
                                playSfx('/SoundEffects/circleAppear.wav');
                                const spawnBatch = () => { const spread=18,pid=Date.now(),ps=[]; for(let i=0;i<7;i++){ps.push({id:pid+i,sl:126+(Math.random()-.5)*spread,st:186+(Math.random()-.5)*spread,tx:71+(Math.random()-.5)*spread,ty:44+(Math.random()-.5)*spread,delay:Math.random()*.18,size:Math.floor(Math.random()*5+4)});ps.push({id:pid+i+20,sl:266+(Math.random()-.5)*spread,st:186+(Math.random()-.5)*spread,tx:-69+(Math.random()-.5)*spread,ty:44+(Math.random()-.5)*spread,delay:Math.random()*.18,size:Math.floor(Math.random()*5+4)});} setSdParticles(ps); };
                                spawnBatch(); if (sdParticleIvRef.current) clearInterval(sdParticleIvRef.current); sdParticleIvRef.current = setInterval(spawnBatch, 600);
                              } else { recordFail('SD', sdInputVal, sdAns, circleMistakes); }
                            } else if (n1Active) {
                              const n1Ans = problem.denominator2 * problem.numerator1;
                              if (parseInt(n1CrossVal) === n1Ans) {
                                setN1CrossConfirmed(true);
                                setN1CrossCorrect(true);
                                setHintUsed(false); setCurrentHint('');
                                playSfx('/SoundEffects/circleAppear.wav');
                                spawnCrossParticles(setN1CrossParticles, n1CrossParticleIvRef, 266, 186, -140, -86);
                              } else { recordFail('N1', n1CrossVal, n1Ans, circleMistakes); }
                            } else if (n2Active) {
                              const n2Ans = problem.denominator1 * problem.numerator2;
                              if (parseInt(n2CrossVal) === n2Ans) {
                                setN2CrossConfirmed(true);
                                setN2CrossCorrect(true);
                                setHintUsed(false); setCurrentHint('');
                                playSfx('/SoundEffects/circleAppear.wav');
                                spawnCrossParticles(setN2CrossParticles, n2CrossParticleIvRef, 126, 186, 142, -86);
                              } else { recordFail('N2', n2CrossVal, n2Ans, circleMistakes); }
                            } else if (centerActive) {
                              setCenterConfirmed(true);
                              const n1s = problem.denominator2 * problem.numerator1;
                              const n2s = problem.denominator1 * problem.numerator2;
                              const ans = problem.operator === '+' ? n1s + n2s : n1s - n2s;
                              if (parseInt(centerVal) === ans) {
                                setCenterCorrect(true);
                                setHintUsed(false); setCurrentHint('');
                                playSfx('/SoundEffects/circleAppear.wav');
                                const spawn = () => {
                                  const pid = Date.now(), ps = [];
                                  for (let i = 0; i < 10; i++) {
                                    const a = i / 10 * Math.PI * 2, r = 60 + Math.random() * 30, scatter = (Math.random()-.5)*18;
                                    ps.push({ id: pid+i, sl: 197 + Math.cos(a)*r, st: 148 + Math.sin(a)*r, tx: -Math.cos(a)*r + scatter, ty: -Math.sin(a)*r + scatter, delay: Math.random()*.15, size: Math.floor(Math.random()*5+4) });
                                  }
                                  setCenterParticles(ps);
                                };
                                spawn();
                                if (centerParticleIvRef.current) clearInterval(centerParticleIvRef.current); centerParticleIvRef.current = setInterval(spawn, 600);
                              } else {
                                // Immediate fail on wrong center answer
                                triggerCircleFailSequence([{ label: 'CENTER', entered: centerVal, correct: String(ans) }]);
                              }
                            } else if (finalActive) {
                              if (actionLocked.current) return;
                              actionLocked.current = true;
                              const correct = fIsWhole
                                ? parseInt(finalNumInput) === fSNum
                                : parseInt(finalNumInput) === fSNum && parseInt(finalDenInput) === fSDen;
                              setFinalAnswerPhase(false);
                              pendingBgShiftRef.current = correct ? 'right' : 'left';
                              setInteractableVisible(false);
                              if (correct) {
                                playSfx('/VoiceLines/castSuccess.wav');
                                playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
                                setTimeout(() => launchFireball(() => { actionLocked.current = false; handleAnswerSubmit({ numerator: String(fSNum), denominator: String(fSDen), skipAnim: true }); }), 500);
                              } else {
                                const willDie = lives <= 1;
                                const enteredRawMatch = fIsWhole
                                  ? parseInt(finalNumInput) === fRawNum && fRawDen === 1
                                  : parseInt(finalNumInput) === fRawNum && parseInt(finalDenInput) === fRawDen;
                                const finalMisconceptionType = (fG > 1 && enteredRawMatch) ? 'FAILED_TO_SIMPLIFY' : 'INCORRECT_ANSWER';
                                setTimeout(() => {
                                  actionLocked.current = false;
                                  handleWrongAnswer(`${fSNum}${fIsWhole ? '' : '/' + fSDen}`, `${finalNumInput}${finalDenInput ? '/' + finalDenInput : ''}`, finalMisconceptionType);
                                  if (!willDie) {
                                    setTimeout(() => {
                                      setCircleDetected(false); setInteractableVisible(true);
                                      setN1Visible(false); setD1Visible(false); setN2Visible(false); setD2Visible(false);
                                      setDragOffsets({ d1:{dx:0,dy:0}, d2:{dx:0,dy:0} });
                                      setDenominatorPhase(null); setDenExplosion(false); setSdBlinking(false);
                                      setSdInputVal(''); setSdCorrect(false); setConfirmPressed(false);
                                      setSdParticles([]); if (sdParticleIvRef.current) { clearInterval(sdParticleIvRef.current); sdParticleIvRef.current = null; }
                                      setN1CrossPhase(null); setN2CrossPhase(null); setN1CrossVal(''); setN2CrossVal('');
                                      setN1CrossCorrect(false); setN2CrossCorrect(false); setN1CrossConfirmed(false); setN2CrossConfirmed(false);
                                      setCrossExplosion(null); setN1CrossParticles([]); setN2CrossParticles([]);
                                      if (n1CrossParticleIvRef.current) { clearInterval(n1CrossParticleIvRef.current); n1CrossParticleIvRef.current = null; }
                                      if (n2CrossParticleIvRef.current) { clearInterval(n2CrossParticleIvRef.current); n2CrossParticleIvRef.current = null; }
                                      setCenterPhase(null); setCenterVal(''); setCenterCorrect(false); setCenterConfirmed(false); setCenterParticles([]);
                                      if (centerParticleIvRef.current) { clearInterval(centerParticleIvRef.current); centerParticleIvRef.current = null; }
                                      setCircleFailCount(0); setCircleMistakes([]); setCircleShaking(false);
                                      setFinalAnswerPhase(false); setFinalNumInput(''); setFinalDenInput(''); setHintUsed(false); setCurrentHint(''); setShowHintConfirm(false);
                                      setFlyBubbles(null);
                                    }, 4500);
                                  }
                                }, 500);
                              }
                            }
                          }}
                          style={{ padding:'4px 56px', fontSize:13, fontWeight:700, fontFamily:'"Press Start 2P", monospace', background:'#703737', border:'4px solid #703737', borderRadius:0, boxShadow:'none', position:'relative', color:'#e8d5b4', cursor: active ? 'pointer' : 'default', opacity: active ? 1 : 0.4, backdropFilter:'blur(6px)', whiteSpace:'nowrap' }}>
                          <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          {allSolved ? 'Cast Spell' : 'Confirm'}
                        </button>
                        ); })()}
                        {/* Hint — hidden once used */}
                        {!hintUsed && <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <button
                          onClick={() => setShowHintConfirm(true)}
                          style={{ padding:'4px 16px', fontSize:13, fontWeight:700, fontFamily:'"Press Start 2P", monospace', background:'#703737', border:'4px solid #703737', borderRadius:0, boxShadow:'none', position:'relative', color:'#e8d5b4', cursor:'pointer', backdropFilter:'blur(6px)' }}>
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
                        </div>}
                      </div>
                    )}
                  </>
                )}

                {/* Fixed overlay for dragged number — outside floating div so magicFloat doesn't affect it */}
                {dragScreenPos && (() => {
                  const info = [
                    { key:'d1', size:32, bg:'#333', fontSize:numFontSize(problem.denominator1,32), val:problem.denominator1 },
                    { key:'d2', size:32, bg:'#333', fontSize:numFontSize(problem.denominator2,32), val:problem.denominator2 },
                  ].find(i => i.key === dragScreenPos.key);
                  if (!info) return null;
                  const vibrating = inMagnetZone[info.key];
                  return (
                    <div style={{
                      position:'fixed',
                      left: dragScreenPos.x - info.size / 2,
                      top:  dragScreenPos.y - info.size / 2,
                      width: info.size, height: info.size,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: info.fontSize, fontWeight:900, color:'#ffffff',
                      border:'3px dashed #e8d5b4', borderRadius:0, background: info.bg,
                      fontFamily:'"Press Start 2P", monospace',
                      pointerEvents:'none', zIndex:9999,
                      animation: [
                        vibrating ? 'magnetVibrate 0.15s ease-in-out infinite' : null,
                        pulsatingWhite[info.key] ? 'pulsateWhite 0.5s ease-in-out infinite' : null,
                      ].filter(Boolean).join(', ') || 'none',
                      cursor:'grabbing',
                    }}>{info.val}</div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ── Enemy ── */}
          <div ref={enemyRef} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', marginLeft: circleDetected && interactableVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex:2, flexShrink:0, willChange:'margin-left' }}>
            <div ref={enemyBoxRef} style={{ width:320, height:320, display:'flex', justifyContent:'center', alignItems:'center', position:'relative' }}>
              {(() => {
                const info = enemySpriteInfo[enemyAnim];
                const { frames, frameW, frameH } = info;
                const BOX = 420;
                const safeName = (enemyData?.name||'unknown').replace(/\s+/g,'_');
                const kf = `enemy_${safeName}_${enemyAnim}`;
                const sprAnim = `${kf} ${(frames/10).toFixed(2)}s steps(${frames}) ${enemyAnim==='idle'?'infinite':'1 forwards'}`;
                const combined = defeatTarget==='enemy'&&!defeatFading
                  ? `${sprAnim}, defeatFlash 0.25s ease-in-out infinite`
                  : enemyFlashing ? `${sprAnim}, enemyFlash 0.5s ease-out, damageShake 0.5s ease-out` : sprAnim;
                if (info.missing) return (
                  <div style={{ position:'absolute', bottom:0, left:`calc(50% - ${BOX/2}px)`, zIndex:1, width:BOX, height:BOX, border:'3px dashed #f87171', background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:'"Press Start 2P", monospace', color:'#f87171', overflow:'hidden' }}>
                    <span style={{ fontSize:36 }}>???</span>
                    <span style={{ fontSize:9, textAlign:'center', lineHeight:1.6 }}>Missing<br/>Sprite</span>
                  </div>
                );
                return (
                  <>
                    <style>{`@keyframes ${kf}{to{background-position-x:-${frames*frameW}px}}`}</style>
                    <div style={{
                      position:'absolute', bottom:40, left:`calc(50% - ${frameW/2}px)`,
                      zIndex:1, width:frameW, height:frameH, transform:'scaleX(-1)',
                      backgroundImage:`url(/enemyAssets/dissimilarIsland/${enemyData?.name}/${enemyAnim}.png)`,
                      backgroundSize:`${frames*frameW}px ${frameH}px`,
                      backgroundRepeat:'no-repeat', backgroundPosition:'0px 0px',
                      animation:combined, imageRendering:'pixelated',
                      opacity: defeatTarget==='enemy'&&defeatFading ? 0 : 1,
                      transition: defeatTarget==='enemy'&&defeatFading ? 'opacity 1.1s ease-out' : 'none',
                    }} />
                  </>
                );
              })()}
              <img src="/InMatchUIElements/DissimilarIsland/DissimilarIslandPlatform.png" alt="platform"
                style={{ position:'absolute', bottom:'-50px', left:'50%', transform:'translateX(-50%)', width:'120%', objectFit:'contain', pointerEvents:'none', zIndex:0 }} />
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'40px' }}>
              <div style={{ position:'relative', border:'4px solid #fff', background:'#000', padding:'6px 18px', color:'#fff', fontSize:'14px', fontWeight:700 }}>
                {corners('#fff')}{enemyName}
              </div>
              <div style={{ position:'relative', border:'4px solid #fff', background:'#000', padding:'6px 10px', display:'flex', gap:'4px', alignItems:'center' }}>
                {corners('#fff')}
                <img src="/InteractableUI/HeartSprite.png" alt="hp" style={{ width:24, height:24, objectFit:'contain' }} />
                <span style={{ color:'#fff', fontWeight:700, fontSize:'15px' }}>x{enemyLives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          position:'fixed', left:'50%', zIndex:5000,
          textAlign:'center', padding:'14px 32px',
          border:'6px solid #fff', background:'#000',
          color: feedbackType==='correct' ? '#4ade80' : '#f87171',
          fontSize:'22px', fontWeight:700, whiteSpace:'nowrap',
          animation:'feedbackSlideToCenter 0.6s ease-out forwards',
        }}>
          {corners('#fff')}{feedback}
        </div>
      )}

      {/* Game over */}
      {gameOver && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, backgroundImage:'url(/PostMatchBackground.jpg)', backgroundSize:'cover', backgroundPosition:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
          <div style={{ position:'relative', background:'#e8d5b4', border:'4px solid #703737', borderRadius:'12px', padding:'36px 56px 28px', textAlign:'center' }}>
            <div style={{ position:'absolute', top:8, right:8, bottom:8, left:8, border:'1px solid #703737', borderRadius:'6px', pointerEvents:'none' }} />
            <h1 style={{ fontSize:'clamp(2.5em,6vw,5em)', fontWeight:900, margin:0, color:'#ef4444', letterSpacing:'6px', textTransform:'uppercase' }}>DEFEAT!</h1>
            <p style={{ color:'#333', margin:'36px 0 0', fontWeight:500 }}>You ran out of hearts!</p>
            <p style={{ color:'#333', margin:'12px 0 0', fontWeight:700 }}>Score: {score}</p>
          </div>
          <button onClick={onExitToLobby} style={{ padding:'12px 28px', fontSize:'15px', fontWeight:700, background:'rgba(40,40,40,0.8)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'10px', cursor:'pointer' }}>
            Return to Island Selection
          </button>
        </div>
      )}

      {/* Defeat particles */}
      {defeatParticles.map(p => (
        <div key={p.id} style={{ position:'fixed', left:p.x-p.size/2, top:p.y-p.size/2, width:p.size, height:p.size, background:'#fff', pointerEvents:'none', zIndex:10000, '--px':p.px, '--py':p.py, animation:'defeatParticleBurst 1.4s ease-out forwards' }} />
      ))}

      {/* Environmental particles */}
      {envParticles.map(p => (
        <img key={p.id} src={`/InMatchUIElements/DissimilarIsland/${p.type}.png`} alt=""
          style={{ position:'fixed', left:`${p.startX}%`, top:p.startY, width:p.size, height:p.size, objectFit:'contain', pointerEvents:'none', zIndex:9998, '--dx':p.dx,'--dy':p.dy,'--r1':p.r1,'--r2':p.r2,'--jx1':p.jx1,'--jy1':p.jy1,'--jx2':p.jx2,'--jy2':p.jy2, animation: p.type==='leaf' ? `leafDrift ${p.dur}s ease-in forwards` : `flowerDrift ${p.dur}s ease-in forwards` }}
        />
      ))}

      {/* Fireball */}
      {fireball && (
        <img
          key={fireball.flying ? 'flying' : 'idle'}
          src="/CombatGraphics/fireballAnimation.gif" alt="fireball"
          style={{
            position:'fixed',
            left: fireball.flying ? 0 : fireball.sx,
            top:  fireball.flying ? 0 : fireball.sy,
            width:120, height:120, pointerEvents:'none', zIndex:9999,
            '--sx':`${fireball.sx}px`,'--sy':`${fireball.sy}px`,
            '--ex':`${fireball.ex}px`,'--ey':`${fireball.ey}px`,
            animation: fireball.flying ? 'fireballArc 0.65s ease-in-out forwards' : 'none',
            opacity: fireball.flying ? undefined : 1,
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

      {/* Tutorials */}
      {showTutorial && <ButterflyTutorial onComplete={() => setShowTutorial(false)} />}

      {/* Flying number bubbles — same style as Similar Island's denomination bubbles */}
      {flyBubbles && (
        <>

          {[
            { key:'n1', ref:bRef1 }, { key:'d1', ref:bRef2 },
            { key:'n2', ref:bRef3 }, { key:'d2', ref:bRef4 },
          ].map(({ key, ref }) => {
            const b = flyBubbles[key];
            return b ? (
              <div key={key} ref={ref} style={{
                position:'fixed', left:b.left, top:b.top,
                width:44, height:44,
                display:'flex', alignItems:'center', justifyContent:'center',
                zIndex:9999, pointerEvents:'none',
                opacity:b.opacity, transition:'opacity 0.3s ease',
              }}>
                <img src="/OtherEffects/BlueSparkle.png" alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', animation:'sparkleSpin 1.2s linear infinite', pointerEvents:'none' }} />
                <span style={{ position:'relative', zIndex:1, fontSize:18, fontWeight:900, color:'#fff', textShadow:'0 0 6px rgba(0,0,0,0.9)', fontFamily:'"Press Start 2P", monospace' }}>{b.value}</span>
              </div>
            ) : null;
          })}
        </>
      )}

      {/* Hint confirmation */}
      {showHintConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000 }}>
          <div style={{ position:'relative', background:'#e8d5b4', border:'4px solid #703737', padding:'32px 36px', textAlign:'center', width:360, fontFamily:'"Press Start 2P", monospace' }}>
            <div style={{ position:'absolute', inset:6, border:'1px solid #703737', pointerEvents:'none' }} />
            {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i)=>(
              <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:'#703737', ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
            ))}
            <p style={{ fontSize:14, fontWeight:700, color:'#703737', margin:'0 0 16px', lineHeight:1.8 }}>USE A HINT?</p>
            <p style={{ fontSize:11, color:'#2a1a1a', margin:'0 0 8px', lineHeight:1.9 }}>Using a hint will <span style={{color:'#b91c1c',fontWeight:900}}>reduce your score</span> for this problem.</p>
            <p style={{ fontSize:11, color:'#2a1a1a', margin:'0 0 24px', lineHeight:1.9 }}>Your answer will <span style={{color:'#b91c1c',fontWeight:900}}>not be fully recorded</span> in your progress.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button onClick={() => {
                setShowHintConfirm(false);
                setHintUsed(true);
                const sdStarted  = sdBlinking || sdCorrect;
                const n1Started  = n1CrossPhase !== null;
                const n2Started  = n2CrossPhase !== null;
                const anyStarted = sdStarted || n1Started || n2Started;
                if (!anyStarted) { setCurrentHint('Cross-Multiply!'); return; }
                const remaining = [];
                if (!sdStarted) remaining.push(['Drag the two denominators together.','Multiply the denominators.','Try dragging D1 to D2.']);
                if (!n1Started) remaining.push(['Drag the right denominator to the left numerator.','Try dragging D2 toward N1.','Cross-multiply D2 and N1.']);
                if (!n2Started) remaining.push(['Drag the left denominator to the right numerator.','Try dragging D1 toward N2.','Cross-multiply D1 and N2.']);
                if (remaining.length === 0 && sdCorrect && n1CrossCorrect && n2CrossCorrect) { setCurrentHint('Simplify the result!'); return; }
                if (remaining.length === 0) { setCurrentHint('Answer the remaining inputs first.'); return; }
                const pool = remaining[Math.floor(Math.random() * remaining.length)];
                setCurrentHint(pool[Math.floor(Math.random() * pool.length)]);
              }} style={{ position:'relative', padding:'10px 20px', fontWeight:700, fontFamily:'"Press Start 2P", monospace', fontSize:12, background:'#703737', border:'4px solid #703737', color:'#e8d5b4', cursor:'pointer', borderRadius:0 }}>
                YES, SHOW HINT
              </button>
              <button onClick={() => setShowHintConfirm(false)}
                style={{ position:'relative', padding:'10px 20px', fontWeight:700, fontFamily:'"Press Start 2P", monospace', fontSize:12, background:'#e8d5b4', border:'4px solid #703737', color:'#703737', cursor:'pointer', borderRadius:0 }}>
                CANCEL
              </button>
            </div>
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

export default DissimilarIslandGame;
