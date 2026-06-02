import React, { useState, useEffect, useRef } from 'react';
import DrawingCanvas from '../components/DrawingCanvas';
// ButterflyDiagramCanvas and ButterflyStepPanel disabled — new solving method coming
// import ButterflyDiagramCanvas from '../components/ButterflyDiagramCanvas';
// import ButterflyStepPanel from '../components/ButterflyStepPanel';
import ButterflyTutorial from '../components/ButterflyTutorial';
import MixedButterflyTutorial from '../components/MixedButterflyTutorial';
import GameMenuModal from '../components/GameMenuModal';
import './game.css';
import '../components/components.css';

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

  // ── Problem generation ─────────────────────────────────────────────────────
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
    if (operator === '-') {
      if (w1 + n1 / d1 < w2 + n2 / d2)
        return { whole1: w2, numerator1: n2, denominator1: d2, whole2: w1, numerator2: n1, denominator2: d1, operator, isMixed };
    }
    return { whole1: w1, numerator1: n1, denominator1: d1, whole2: w2, numerator2: n2, denominator2: d2, operator, isMixed };
  };

  const [problem, setProblem] = useState(generateProblem);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);
  const [hasSeenMixedTutorial, setHasSeenMixedTutorial] = useState(false);
  const butterflyPanelRef = useRef(null);
  const showMixedTutorial = !showTutorial && problem.isMixed && !hasSeenMixedTutorial;

  // ── Game state ─────────────────────────────────────────────────────────────
  const [lives, setLives] = useState(gameSession.lives ?? 3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [enemyHealth, setEnemyHealth] = useState(100);
  const [enemyLives, setEnemyLives] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [enemyFlashing, setEnemyFlashing] = useState(false);
  const [playerFlashing, setPlayerFlashing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
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
    const ALLOWED_TARGETS = { d1:['n2','d2'], d2:['n1','d1'] };
    const newMagnet = { n1:false, n2:false, d1:false, d2:false };
    const newPulse = { n1:false, n2:false, d1:false, d2:false };
    const dists = ['n1', 'n2', otherKey].map(tk => {
      const t = BASE_POS[tk];
      const dist = Math.hypot(myCx - (t.left + t.size/2), myCy - (t.top + t.size/2));
      if (dist < MAGNET_THRESHOLD) {
        newMagnet[d.key] = true;
        if (RESTRICTED[d.key] !== tk) newMagnet[tk] = true;
        if (ALLOWED_TARGETS[d.key].includes(tk)) { newPulse[d.key] = true; newPulse[tk] = true; }
      }
      return dist;
    });
    setInMagnetZone(newMagnet);
    setPulsatingWhite(newPulse);
    if (magnetSoundRef.current) {
      const minDist = Math.min(...dists);
      magnetSoundRef.current.playbackRate = 0.1 + Math.max(0, 1 - minDist / 200) * 0.6;
    }
  };
  const handleNumPointerUp = () => {
    const d = dragRef.current;
    if (d) {
      setDragOffsets(prev => ({ ...prev, [d.key]: { dx:0, dy:0 } }));
      setInMagnetZone({ n1:false, n2:false, d1:false, d2:false });
      setPulsatingWhite({ n1:false, n2:false, d1:false, d2:false });
    }
    if (magnetSoundRef.current) { magnetSoundRef.current.pause(); magnetSoundRef.current = null; }
    setDragScreenPos(null);
    dragRef.current = null;
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
  const envPidRef = useRef(0);

  // ── OST ───────────────────────────────────────────────────────────────────
  const ostRef      = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const pulseRafRef = useRef(null);

  const playOST = (src) => {
    if (ostRef.current) { ostRef.current.pause(); ostRef.current.src = ''; }
    const audio = new Audio(src);
    audio.loop = true; audio.volume = 0.8; audio.crossOrigin = 'anonymous'; audio.currentTime = 0;
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
    new Audio('/SoundEffects/circleAppear.wav').play().catch(() => {});
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
        new Audio('/SoundEffects/sparkleSound.wav').play().catch(() => {});
      }, 500 + idx * 150);
    });

    // Fly one-by-one with 300 ms stagger
    let arrived = 0;

    setTimeout(() => {
      order.forEach((key, idx) => {
        setTimeout(() => {
          new Audio('/SoundEffects/numberMove.wav').play().catch(() => {});
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
              new Audio('/SoundEffects/sparkleExplode.wav').play().catch(() => {});
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

  // ── Defeat trigger ────────────────────────────────────────────────────────
  const triggerDefeat = (target, onComplete) => {
    setDefeatTarget(target);
    const audio = new Audio('/SoundEffects/beforeDefeat.wav');
    audio.loop = true; audio.play().catch(() => {});
    beforeDefeatRef.current = audio;
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 80;
      if (beforeDefeatRef.current) beforeDefeatRef.current.playbackRate = Math.min(1.0 + (elapsed / 5000) * 3.5, 4.5);
      if (elapsed >= 5000) {
        clearInterval(iv);
        if (beforeDefeatRef.current) { beforeDefeatRef.current.pause(); beforeDefeatRef.current.src = ''; }
        setDefeatFading(true);
        new Audio('/SoundEffects/defeat.wav').play().catch(() => {});
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
    setFireball({ sx, sy, ex, ey, flying: false });
    setTimeout(() => setFireball({ sx, sy, ex, ey, flying: true }), 800);
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
      const res = await fetch(`http://localhost:8080/api/game-progress/spell-attempt/${gameSession.sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt),
      });
      if (!res.ok) console.error('Failed to save spell attempt');
    } catch (err) { console.error(err); }
  };

  const saveGameEnd = async (status, isWon) => {
    try {
      const res = await fetch(`http://localhost:8080/api/game-progress/end-session/${gameSession.sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, isWon }),
      });
      if (!res.ok) console.error('saveGameEnd failed:', res.status);
    } catch (err) { console.error(err); }
  };

  const handleGameEnd = async (status, isWon) => {
    await saveGameEnd(status, isWon);
    onGameEnd({ status, isWon, score });
  };

  const handleExitGame = () => setShowExitModal(true);
  const confirmExit = async () => { setShowExitModal(false); await saveGameEnd('PAUSED', false); onExitToLobby(); };

  // ── Answer handlers ───────────────────────────────────────────────────────
  const handleAnswerSubmit = async ({ numerator, denominator }) => {
    const totalHp   = enemyData?.hp || enemyLives || 1;
    const hpPerHit  = Math.floor(100 / totalHp);
    const newELives = Math.max(0, (enemyLives ?? 1) - 1);
    const newEHp    = Math.max(0, enemyHealth - hpPerHit);
    const newStreak = streak + 1;
    const newMult   = Math.min(2.0, 1.0 + newStreak * 0.2);
    const pts       = Math.floor(10 * newMult);
    const newScore  = score + pts;

    setEnemyHealth(newEHp); setEnemyLives(newELives);
    setStreak(newStreak); setMultiplier(newMult); setScore(newScore);
    setFeedback(`Correct! +${pts} points`); setFeedbackType('correct');

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

    playWizardAnim(Math.random() < 0.5 ? 'attack1' : 'attack2');
    setBgShift('right'); lastBgShiftRef.current = 'right';

    setTimeout(() => {
      launchFireball(() => {
        if (newELives <= 0) {
          triggerDefeat('enemy', () => handleGameEnd('COMPLETED', true));
        } else {
          setTimeout(() => {
            setFeedback(''); setFeedbackType('');
            setProblem(generateProblem()); setCurrentStep(1);
            setCircleDetected(false); setInteractableVisible(true);
            setN1Visible(false); setD1Visible(false);
            setN2Visible(false); setD2Visible(false);
            setFlyBubbles(null);
            if (flyArcRef.current) cancelAnimationFrame(flyArcRef.current);
            setBgShift('return-right'); lastBgShiftRef.current = null;
            setTimeout(() => setBgShift(null), 700);
          }, 1500);
        }
      });
    }, 500);
  };

  const handleWrongAnswer = async (hint, submittedValue, errorType) => {
    const newLives = lives - 1;
    setLives(newLives); setStreak(0); setMultiplier(1.0);
    setEnemyAttacking(true); setTimeout(() => setEnemyAttacking(false), 1000);
    setPlayerFlashing(true); setTimeout(() => setPlayerFlashing(false), 500);
    setFeedback(hint ? `Wrong! ${hint}` : 'Wrong answer!'); setFeedbackType('incorrect');
    setBgShift('left'); lastBgShiftRef.current = 'left';
    setTimeout(() => { setBgShift('return-left'); lastBgShiftRef.current = null; setTimeout(() => setBgShift(null), 700); }, 700);

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
      setTimeout(() => { setFeedback(''); setFeedbackType(''); }, 4000);
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
        fontSize: '11px', display: 'flex', flexDirection: 'column',
        gap: '10px', boxSizing: 'border-box',
      }}
    >
      {/* Bobbing background */}
      <div style={{ position: 'absolute', inset: '-20px', animation: 'bgBob 12s ease-in-out infinite', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/InMatchUIElements/DissimilarIsland/AutumnCombatBackground.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
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
          <span style={{ color: '#222', fontSize: '10px' }}>Streak: x{multiplier.toFixed(1)}</span>
          <span style={{ color: '#222', fontSize: '10px' }}>Score: {score}</span>
          <span style={{ color: '#222', fontSize: '10px' }}>Level: {gameSession.level}/{totalLevels ?? '...'}</span>
        </div>
        <button
          onClick={handleExitGame}
          style={{
            padding: '8px 16px', fontSize: 10, fontWeight: 700,
            fontFamily: '"Press Start 2P", monospace',
            background: '#e8d5b4', border: '4px solid #703737',
            borderRadius: 0, color: '#222', cursor: 'pointer', position: 'relative',
          }}
        >
          {corners('#703737')}
          Menu
        </button>
      </div>

      {/* Battle area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'stretch',
          flex: 1, minHeight: 0, padding: '10px 0 0', overflow: 'hidden',
        }}>

          {/* ── Player ── */}
          <div ref={playerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginRight: circleDetected && interactableVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex: 2, flexShrink: 0, position: 'relative' }}>
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
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', paddingTop:'32px', minHeight:0, overflow:'hidden', zIndex:1 }}>

            {/* Problem display */}
            <div style={{
              animation:'magicFloat 3s ease-in-out infinite', position:'relative',
              filter: pulse>0.15 ? `drop-shadow(0 0 ${(pulse*32).toFixed(1)}px rgba(112,55,55,${Math.min(pulse*1.2,1).toFixed(2)}))` : 'none',
              transform:`scale(${(1+pulse*0.07).toFixed(4)})`,
            }}>
              <div key={getProblemStatement()} className="problem-fade-in" style={{
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
              <div ref={circleContainerRef} style={{
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
                      @keyframes nAreaFadeIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
                    `}</style>
                    <div ref={floatingDivRef} style={{ position:'absolute', top:32, left:0, right:0, height:'300px', animation:'magicFloat 4s ease-in-out infinite', zIndex:2 }}>
                      <img src="/InteractableUI/DissimilarMagicCircle.png" alt="magic circle" style={{
                        position:'absolute', top:0, left:0, right:0, width:'100%', height:'100%',
                        objectFit:'contain', pointerEvents:'none',
                        animation:'problemFadeIn 0.5s ease-out',
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
                        { key:'n1', oRef:n1OverlayRef, visible:n1Visible, val:problem.numerator1,   left:106, top:80,  fontSize:21, size:40, bg:'#333' },
                        { key:'d1', oRef:d1OverlayRef, visible:d1Visible, val:problem.denominator1, left:110, top:170, fontSize:13, size:32, bg:'#333' },
                        { key:'n2', oRef:n2OverlayRef, visible:n2Visible, val:problem.numerator2,   left:248, top:80,  fontSize:21, size:40, bg:'#333' },
                        { key:'d2', oRef:d2OverlayRef, visible:d2Visible, val:problem.denominator2, left:250, top:170, fontSize:13, size:32, bg:'#333' },
                      ].map(({ key, oRef, visible, val, left, top, fontSize, size, bg }) => {
                        const draggable = key === 'd1' || key === 'd2';
                        const offset = draggable ? dragOffsets[key] : { dx:0, dy:0 };
                        const vibrating = inMagnetZone[key];
                        return (
                          <div key={key} ref={oRef}
                            onPointerDown={visible && draggable ? (e) => handleNumPointerDown(e, key) : undefined}
                            onPointerMove={visible && draggable ? handleNumPointerMove : undefined}
                            onPointerUp={visible && draggable ? handleNumPointerUp : undefined}
                            style={{
                              position:'absolute', left: left + offset.dx, top: top + offset.dy,
                              animation: 'numFadeIn 0.5s ease-out both',
                              animationPlayState: visible ? 'running' : 'paused',
                              pointerEvents: visible ? 'auto' : 'none',
                              cursor: visible && draggable ? 'grab' : 'default',
                              userSelect: 'none', touchAction: 'none',
                              zIndex: dragRef.current?.key === key ? 10 : 3,
                              opacity: dragScreenPos?.key === key ? 0 : undefined,
                            }}>
                            <div style={{
                              width:size, height:size,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize, fontWeight:900, color:'#e8d5b4',
                              border: '3px dashed #e8d5b4', borderRadius: 0, background: bg,
                              fontFamily:'"Press Start 2P", monospace',
                              animation: [
                                vibrating ? 'magnetVibrate 0.15s ease-in-out infinite' : null,
                                pulsatingWhite[key] ? 'pulsateWhite 0.5s ease-in-out infinite' : null,
                              ].filter(Boolean).join(', ') || 'none',
                            }}>{val}</div>
                          </div>
                        );
                      })}
                      {/* Center node, appears with the buttons */}
                      {n1Visible && d1Visible && n2Visible && d2Visible && (
                        <div style={{
                          position:'absolute', left:177, top:128,
                          width:40, height:40,
                          border:'3px dashed #ffffff', borderRadius:0,
                          background:'transparent',
                          boxShadow:'0 0 8px 3px rgba(0,0,0,0.7)',
                          animation:'numFadeIn 0.5s ease-out both',
                          pointerEvents:'none', zIndex:3,
                        }} />
                      )}
                      {/* SD — bottom node, appears with the buttons */}
                      {n1Visible && d1Visible && n2Visible && d2Visible && (
                        <div style={{
                          position:'absolute', left:177, top:210,
                          width:40, height:40,
                          border:'3px dashed #ffffff', borderRadius:0,
                          background:'transparent',
                          boxShadow:'0 0 8px 3px rgba(0,0,0,0.7)',
                          animation:'numFadeIn 0.5s ease-out both',
                          pointerEvents:'none', zIndex:3,
                        }} />
                      )}
                      {/* ── Answer inputs will be placed here when the new solving method is implemented ── */}
                    </div>

                    {/* ── Bottom buttons — appear once all 4 numbers have landed ── */}
                    {n1Visible && d1Visible && n2Visible && d2Visible && (
                      <div style={{ position:'absolute', bottom:12, left:'50%', display:'flex', gap:10, zIndex:4, animation:'nAreaFadeIn 0.5s ease-out forwards' }}>
                        {/* ??? — functionality TBD */}
                        <button style={{ padding:'4px 56px', fontSize:10, fontWeight:700, fontFamily:'"Press Start 2P", monospace', background:'#703737', border:'4px solid #703737', borderRadius:0, boxShadow:'none', position:'relative', color:'#e8d5b4', cursor:'pointer', backdropFilter:'blur(6px)' }}>
                          <div style={{position:'absolute',top:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:-6,left:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:-6,right:-6,width:10,height:10,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',top:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:3,left:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          <div style={{position:'absolute',bottom:3,right:3,width:5,height:5,background:'#703737',pointerEvents:'none'}}/>
                          ???
                        </button>
                        {/* Hint */}
                        <button style={{ padding:'4px 16px', fontSize:10, fontWeight:700, fontFamily:'"Press Start 2P", monospace', background:'#703737', border:'4px solid #703737', borderRadius:0, boxShadow:'none', position:'relative', color:'#e8d5b4', cursor:'pointer', backdropFilter:'blur(6px)' }}>
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
                      </div>
                    )}
                  </>
                )}

                {/* Fixed overlay for dragged number — outside floating div so magicFloat doesn't affect it */}
                {dragScreenPos && (() => {
                  const info = [
                    { key:'d1', size:32, bg:'#333', fontSize:13, val:problem.denominator1 },
                    { key:'d2', size:32, bg:'#333', fontSize:13, val:problem.denominator2 },
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
                      fontSize: info.fontSize, fontWeight:900, color:'#e8d5b4',
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
          <div ref={enemyRef} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', marginLeft: circleDetected && interactableVisible ? '160px' : '36px', transition: 'margin 0.5s ease', zIndex:2, flexShrink:0 }}>
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
                  : enemyFlashing ? `${sprAnim}, enemyFlash 0.5s ease-out` : sprAnim;
                if (info.missing) return (
                  <div style={{ position:'absolute', bottom:0, left:`calc(50% - ${BOX/2}px)`, zIndex:1, width:BOX, height:BOX, border:'3px dashed #f87171', background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:'"Press Start 2P", monospace', color:'#f87171', transform:'scaleX(-1)' }}>
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
                <span style={{ color:'#fff', fontWeight:700, fontSize:'13px' }}>x{enemyLives}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          position:'fixed', left:'50%', zIndex:5000,
          textAlign:'center', padding:'10px 24px',
          border:'4px solid #fff', background:'#000',
          color: feedbackType==='correct' ? '#4ade80' : '#f87171',
          fontSize:'11px', fontWeight:700, whiteSpace:'nowrap',
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
          <style>{`@keyframes sparkleSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
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
      {showMixedTutorial && <MixedButterflyTutorial onComplete={() => setHasSeenMixedTutorial(true)} />}

      {/* Exit modal */}
      {showExitModal && (
        <GameMenuModal title="Exit Game?" message="Your progress will be saved." icon="⚠️" onClose={() => setShowExitModal(false)}>
          <div className="wizard-menu-actions">
            <button type="button" className="wizard-menu-btn wizard-menu-btn-primary" onClick={confirmExit}>Yes, Exit</button>
            <button type="button" className="wizard-menu-btn wizard-menu-btn-secondary" onClick={() => setShowExitModal(false)}>Cancel</button>
          </div>
        </GameMenuModal>
      )}
    </div>
  );
};

export default DissimilarIslandGame;
