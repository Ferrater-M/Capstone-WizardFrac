import React, { useState, useEffect, useRef } from 'react';
import { playSfx, getSfxVolume } from '../utils/audio';
import './game-lobby.css';
import LoadingScreen from '../components/LoadingScreen';
import IslandInterior from './IslandInterior';
import GameMechanicsIntro from '../components/GameMechanicsIntro';

const MECHANICS_INTRO_KEY = 'wizardfrac_seen_mechanics_intro';

// ── Pet dialogue lines ──────────────────────────────────────────────────────
// To add more lines, just push to these arrays.
const PET_GREETINGS = [
  "You can do it! 💪",
  "How are you today?",
  "Ready to learn fractions?",
  "Let's conquer today!",
  "Good to see you! 😊",
  "You're doing amazing!",
  "Believe in yourself!",
  "Today's the day! ✨",
];

const PET_CHATS = [
  "Hi there! 👋",
  "What's up?",
  "Nice weather we're having!",
  "You've got this!",
  "Let's go! 🚀",
  "Fractions are fun! 🎉",
  "Keep it up!",
  "You're a star! ⭐",
  "Looking good, wizard!",
];
// ────────────────────────────────────────────────────────────────────────────

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Maps island name -> the section key used for it in enemyData.txt
const ISLAND_ENEMY_KEY = { Similar: 'similarIsland', Dissimilar: 'dissimilarIsland', Hybrid: 'hybridIsland' };

// Counts how many enemy blocks exist for each island section in enemyData.txt,
// so the lobby can show each island's real max stage count instead of a guess.
const countEnemiesPerIsland = (text) => {
  const sections = text.split('===').filter(s => s.trim());
  const counts = {};
  Object.entries(ISLAND_ENEMY_KEY).forEach(([islandName, key]) => {
    let count = 0;
    for (const section of sections) {
      const lines = section.trim().split('\n').map(l => l.trim()).filter(l => l);
      if (lines[0] !== key) continue;
      const blocks = section.split('---').slice(1);
      for (const rawBlock of blocks) {
        const content = rawBlock.split('+++')[0].trim();
        if (content) count++;
      }
    }
    counts[islandName] = count;
  });
  return counts;
};

const GameLobby = ({ studentId, studentNickname, selectedCharacter, onGameStart, onOpenDashboard, onOpenLeaderboard, onOpenSettings, onEnterIslandInterior, onLeaveIslandInterior }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [stageStars, setStageStars] = useState({});
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [showInterior, setShowInterior] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [character, setCharacter] = useState(selectedCharacter);
  const [islandStageCounts, setIslandStageCounts] = useState({});
  const actionLocked = useRef(false);

  // ── Island stage counts — derived from how many enemies exist per island in enemyData.txt ──
  useEffect(() => {
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => setIslandStageCounts(countEnemiesPerIsland(text)))
      .catch(() => {});
  }, []);

  // ── Pet state ──────────────────────────────────────────────────────────────
  // phase: 'hidden' | 'rising' | 'up' | 'talking' | 'squish' | 'descending'
  const [petPhase, setPetPhaseState] = useState('hidden');
  const [petDialogue, setPetDialogue] = useState(null);
  const [petTwitching, setPetTwitching] = useState(false); // ears twitch briefly on talk
  const [petDisplayedText, setPetDisplayedText] = useState(''); // typewriter reveal
  const petPhaseRef  = useRef('hidden');
  const petTimerRef  = useRef(null);
  const petHoverRef  = useRef(false);
  const petTypingRef = useRef(null);   // interval for typewriter
  const petSpeakRef  = useRef(null);   // pre-loaded speak audio (zero-latency replay)

  const setPetPhase = (phase) => { petPhaseRef.current = phase; setPetPhaseState(phase); };
  const clearPetTimer = () => {
    if (petTimerRef.current) { clearTimeout(petTimerRef.current); petTimerRef.current = null; }
  };

  const petDescend = (afterDelay = 0) => {
    clearPetTimer();
    setPetTwitching(false); // stop twitch immediately; revert to normal bob while we wait
    petTimerRef.current = setTimeout(() => {
      if (!petHoverRef.current) {
        setPetDialogue(null);
        setPetPhase('descending');
        petTimerRef.current = setTimeout(() => setPetPhase('hidden'), 600);
      }
    }, afterDelay);
  };

  const petShowDialogue = (line, afterRise = false) => {
    const showLine = () => {
      setPetDialogue(line);
      setPetPhase('talking');
      setPetTwitching(true);                  // ears twitch while speaking
      petTimerRef.current = setTimeout(() => {
        setPetTwitching(false);               // revert to normal head bob after 2 s
        petTimerRef.current = setTimeout(() => {
          setPetDialogue(null);
          setPetPhase('up');
          petDescend(1800);
        }, 1800);                             // dialogue stays visible ~1.8 s more
      }, 2000);
    };
    if (afterRise) {
      setPetPhase('rising');
      petTimerRef.current = setTimeout(showLine, 700);
    } else {
      showLine();
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const [showMechanicsIntro, setShowMechanicsIntro] = useState(
    () => !localStorage.getItem(MECHANICS_INTRO_KEY)
  );

  const closeMechanicsIntro = () => {
    localStorage.setItem(MECHANICS_INTRO_KEY, '1');
    setShowMechanicsIntro(false);
  };

  // ── Pre-load speak sound once so replay is instant (no per-letter network hit)
  useEffect(() => {
    const audio = new Audio('/petAssets/pet1/petSpeak.wav');
    audio.load();
    petSpeakRef.current = audio;
    return () => { petSpeakRef.current = null; };
  }, []);

  // ── Typewriter effect — runs whenever petDialogue changes ─────────────────
  useEffect(() => {
    if (petTypingRef.current) { clearInterval(petTypingRef.current); petTypingRef.current = null; }
    if (!petDialogue) { setPetDisplayedText(''); return; }
    setPetDisplayedText('');
    let i = 0;
    petTypingRef.current = setInterval(() => {
      i++;
      const char = petDialogue[i - 1];
      setPetDisplayedText(petDialogue.slice(0, i));
      // play speak sound instantly — reset + replay the pre-loaded element
      if (char && char.trim() !== '' && petSpeakRef.current) {
        petSpeakRef.current.volume = getSfxVolume();
        petSpeakRef.current.currentTime = 0;
        petSpeakRef.current.play().catch(() => {});
      }
      if (i >= petDialogue.length) {
        clearInterval(petTypingRef.current);
        petTypingRef.current = null;
      }
    }, 38);
    return () => { if (petTypingRef.current) { clearInterval(petTypingRef.current); petTypingRef.current = null; } };
  }, [petDialogue]);

  // ── Pet greeting — fires once after loading completes ─────────────────────
  const petGreetedRef = useRef(false);
  useEffect(() => {
    if (loading) return;                    // wait for data to finish loading
    if (petGreetedRef.current) return;      // only greet once per mount
    petGreetedRef.current = true;
    petTimerRef.current = setTimeout(() => {
      petShowDialogue(pickRandom(PET_GREETINGS), true);
    }, 800);
    return () => clearPetTimer();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pet interaction handlers ───────────────────────────────────────────────
  const handlePetEnter = () => {
    petHoverRef.current = true;
    clearPetTimer();
    const s = petPhaseRef.current;
    if (s === 'hidden' || s === 'descending') {
      setPetPhase('rising');
      petTimerRef.current = setTimeout(() => {
        setPetPhase('up');
        // if mouse already left during the rise, start the descent countdown
        if (!petHoverRef.current) petDescend(3000);
      }, 700);
    }
    // already rising/up/talking/squish — cancelling any pending descent is enough
  };

  const handlePetLeave = () => {
    petHoverRef.current = false;
    const s = petPhaseRef.current;
    if (s === 'up' || s === 'talking' || s === 'squish') {
      petDescend(3000);
    }
    // if still rising: the timer above will fire petDescend after rise completes
  };

  const handlePetClick = (e) => {
    e.stopPropagation();
    const s = petPhaseRef.current;
    if (s === 'hidden' || s === 'rising' || s === 'descending') return;
    playSfx('/petAssets/pet1/squeak.mp3');
    clearPetTimer();
    setPetTwitching(false);
    setPetDialogue(null);
    setPetPhase('squish');
    petTimerRef.current = setTimeout(() => {
      petShowDialogue(pickRandom(PET_CHATS));
    }, 350);
  };
  // ──────────────────────────────────────────────────────────────────────────

  const canvasRef = useRef(null);
  const galaxyFrameRef = useRef(null);
  const titleBoxRef = useRef(null);
  const islandCardRefs = useRef({});
  const sparkleRef = useRef(null);
  const [animPhase, setAnimPhase] = useState(null);
  const [animIsland, setAnimIsland] = useState(null);
  const [sparkleStart, setSparkleStart] = useState({ x: 0, y: 0 });
  const [sparkleEnd, setSparkleEnd] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (showInterior) return;
    let animating = true;
    let resizeHandler = null;

    const tryStart = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        if (animating) galaxyFrameRef.current = requestAnimationFrame(tryStart);
        return;
      }

      const ctx = canvas.getContext('2d');

      resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resizeHandler();
      window.addEventListener('resize', resizeHandler);

      const stars = Array.from({ length: 180 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.008 + 0.003,
        twinkleDir: Math.random() < 0.5 ? 1 : -1,
        vx: (Math.random() - 0.5) * 0.00007,
        vy: (Math.random() - 0.5) * 0.00007,
        color: ['#ffffff', '#cce4ff', '#ffe8cc', '#e0ccff'][Math.floor(Math.random() * 4)],
      }));

      const dust = Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 3 + 2,
        alpha: Math.random() * 0.2 + 0.05,
        twinkleSpeed: Math.random() * 0.003 + 0.001,
        twinkleDir: Math.random() < 0.5 ? 1 : -1,
        color: ['rgba(180,140,255', 'rgba(140,180,255', 'rgba(255,180,220'][Math.floor(Math.random() * 3)],
      }));

      const NEBULAE = [
        { cx: 0.15, cy: 0.25, r: 0.22, c: [100, 60, 200] },
        { cx: 0.80, cy: 0.55, r: 0.18, c: [60, 100, 220] },
        { cx: 0.50, cy: 0.78, r: 0.15, c: [180, 60, 150] },
        { cx: 0.35, cy: 0.45, r: 0.12, c: [60, 160, 200] },
      ];

      const shootingStars = [];
      let nextShot = Date.now() + 800 + Math.random() * 1200;

      const CLOUD_PUFFS = [
        { x: 0,   y: 0,   r: 52 },
        { x: 48,  y: -18, r: 40 },
        { x: -46, y: -14, r: 36 },
        { x: 88,  y: 4,   r: 32 },
        { x: -80, y: 4,   r: 28 },
        { x: 38,  y: 14,  r: 26 },
        { x: -30, y: 14,  r: 24 },
      ];

      const drawCloud = (cx, cy, scale, alpha, color) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        CLOUD_PUFFS.forEach(p => {
          const size = p.r * scale * 2;
          ctx.rect(cx + p.x * scale - size / 2, cy + p.y * scale - size / 2, size, size);
        });
        ctx.fill();
        ctx.restore();
      };

      const clouds = Array.from({ length: 6 }, (_, i) => ({
        x: Math.random(),
        y: 0.05 + Math.random() * 0.75,
        vx: (0.00006 + Math.random() * 0.00008) * (Math.random() < 0.65 ? 1 : -1),
        scale: 0.7 + Math.random() * 1.4,
        alpha: 0.18 + Math.random() * 0.18,
        color: i < 3 ? 'rgba(180,130,255,1)' : 'rgba(60,20,120,1)',
      }));

      const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        NEBULAE.forEach(n => {
          const gx = n.cx * w, gy = n.cy * h, gr = n.r * Math.max(w, h);
          const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
          grad.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.13)`);
          grad.addColorStop(1, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.fill();
        });

        clouds.forEach(cloud => {
          cloud.x += cloud.vx;
          if (cloud.x > 1.25) cloud.x = -0.25;
          if (cloud.x < -0.25) cloud.x = 1.25;
          drawCloud(cloud.x * w, cloud.y * h, cloud.scale, cloud.alpha, cloud.color);
        });

        dust.forEach(p => {
          p.alpha += p.twinkleSpeed * p.twinkleDir;
          if (p.alpha > 0.28) { p.alpha = 0.28; p.twinkleDir = -1; }
          if (p.alpha < 0.02) { p.alpha = 0.02; p.twinkleDir = 1; }
          const px = p.x * w, py = p.y * h;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3);
          grad.addColorStop(0, `${p.color},${p.alpha})`);
          grad.addColorStop(1, `${p.color},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, p.r * 3, 0, Math.PI * 2);
          ctx.fill();
        });

        stars.forEach(p => {
          p.alpha += p.twinkleSpeed * p.twinkleDir;
          if (p.alpha > 1)   { p.alpha = 1;   p.twinkleDir = -1; }
          if (p.alpha < 0.2) { p.alpha = 0.2; p.twinkleDir = 1; }
          p.x = (p.x + p.vx + 1) % 1;
          p.y = (p.y + p.vy + 1) % 1;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
          ctx.fill();
          if (p.r > 1.2) {
            ctx.globalAlpha = p.alpha * 0.35;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, p.r * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });

        const now = Date.now();
        if (now >= nextShot) {
          const count = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
          for (let s = 0; s < count; s++) {
            const angle = (25 + Math.random() * 35) * Math.PI / 180;
            const speed = 0.007 + Math.random() * 0.005;
            shootingStars.push({
              x: Math.random() * 0.65,
              y: Math.random() * 0.4,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              tail: [],
              tailLen: 28 + Math.floor(Math.random() * 18),
            });
          }
          nextShot = now + 800 + Math.random() * 1800;
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const s = shootingStars[i];
          s.tail.unshift({ x: s.x, y: s.y });
          if (s.tail.length > s.tailLen) s.tail.pop();
          s.x += s.vx;
          s.y += s.vy;
          s.alpha -= 0.013;
          if (s.x > 1.1 || s.y > 1.1 || s.alpha <= 0) {
            shootingStars.splice(i, 1);
            continue;
          }
          if (s.tail.length > 1) {
            const last = s.tail[s.tail.length - 1];
            const tg = ctx.createLinearGradient(s.x * w, s.y * h, last.x * w, last.y * h);
            tg.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
            tg.addColorStop(1, 'rgba(200,220,255,0)');
            ctx.save();
            ctx.strokeStyle = tg;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            s.tail.forEach(tp => ctx.lineTo(tp.x * w, tp.y * h));
            ctx.stroke();
            ctx.restore();
          }
          ctx.save();
          ctx.globalAlpha = s.alpha;
          const hg = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, 5);
          hg.addColorStop(0, 'rgba(255,255,255,1)');
          hg.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (animating) galaxyFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    tryStart();

    return () => {
      animating = false;
      cancelAnimationFrame(galaxyFrameRef.current);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    };
  }, [showInterior]);

  useEffect(() => {
    setCharacter(selectedCharacter);
  }, [selectedCharacter]);

  const loadGameProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8082/api/game-progress/${studentId}`);
      if (res.status === 404) {
        setGameProgress({ similarIslandMaxStage: 0, dissimilarIslandUnlocked: false, hybridIslandUnlocked: false });
      } else {
        const data = await res.json();
        setGameProgress(data);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
      setGameProgress({ similarIslandMaxStage: 0, dissimilarIslandUnlocked: false, hybridIslandUnlocked: false });
    } finally {
      setLoading(false);
    }
  };

  const loadStageStars = async () => {
    try {
      const res = await fetch(`http://localhost:8082/api/game-progress/stars/${studentId}`);
      if (!res.ok) return;
      const data = await res.json();
      const map = {};
      data.forEach(({ islandType, stageNumber, stars }) => {
        map[`${islandType}_${stageNumber}`] = stars;
      });
      setStageStars(map);
    } catch (err) {
      console.error('Error fetching stage stars:', err);
    }
  };

  useEffect(() => {
    loadGameProgress();
    loadStageStars();
  }, [studentId]);

  useEffect(() => {
    if (selectedCharacter || !studentId) {
      return;
    }

    let isMounted = true;
    const loadSelectedCharacter = async () => {
      try {
        const res = await fetch(`http://localhost:8082/api/characters/student/${studentId}`);
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setCharacter(data);
        }
      } catch (err) {
        console.error('Error loading selected character:', err);
      }
    };

    loadSelectedCharacter();
    return () => {
      isMounted = false;
    };
  }, [studentId, selectedCharacter]);

  const doEnterIsland = (island) => {
    onEnterIslandInterior?.();
    setSelectedIsland(island);
    setShowInterior(true);
    setSelectedLevel(1);
  };

  const handleEnterIsland = (island) => {
    if (!island.unlocked || actionLocked.current) return;
    actionLocked.current = true;
    playSfx('/SoundEffects/islandSelect.wav');
    setAnimIsland(island);
    setAnimPhase('flash');
  };

  useEffect(() => {
    if (!animPhase || !animIsland) return;
    let t;
    if (animPhase === 'flash') {
      t = setTimeout(() => {
        const titleRect = titleBoxRef.current?.getBoundingClientRect();
        const islandEl = islandCardRefs.current[animIsland.name];
        const islandRect = islandEl?.getBoundingClientRect();
        if (titleRect) setSparkleStart({ x: titleRect.left + titleRect.width / 2, y: titleRect.top + titleRect.height / 2 });
        if (islandRect) setSparkleEnd({ x: islandRect.left + islandRect.width / 2, y: islandRect.top + islandRect.height / 2 });
        playSfx('/SoundEffects/starAppear.wav');
        setAnimPhase('sparkle');
      }, 500);
    } else if (animPhase === 'sparkle') {
      t = setTimeout(() => {
        playSfx('/SoundEffects/starMove.wav');
        setAnimPhase('travel');
      }, 1200);
    } else if (animPhase === 'explode') {
      t = setTimeout(() => {
        const island = animIsland;
        setAnimPhase(null);
        setAnimIsland(null);
        actionLocked.current = false;
        doEnterIsland(island);
      }, 900);
    }
    return () => clearTimeout(t);
  }, [animPhase, animIsland]);

  useEffect(() => {
    if (animPhase !== 'travel' || !sparkleRef.current) return;
    const el = sparkleRef.current;
    const startX = sparkleStart.x;
    const startY = sparkleStart.y;
    const endX = sparkleEnd.x;
    const endY = sparkleEnd.y;
    const arcHeight = Math.max(140, Math.abs(endX - startX) * 0.5);
    const duration = 900;
    const startTime = performance.now();
    let rafId;
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t + arcHeight * Math.sin(Math.PI * t);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (t < 1) rafId = requestAnimationFrame(animate);
      else {
        playSfx('/SoundEffects/starHit.wav');
        setAnimPhase('explode');
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [animPhase, sparkleStart, sparkleEnd]);

  const handleBackToLobby = () => {
    actionLocked.current = false;
    setShowInterior(false);
    setSelectedIsland(null);
    setSelectedLevel(1);
    loadGameProgress();
    loadStageStars();
    onLeaveIslandInterior?.();
  };

  const handleSelectLevel = async (level) => {
    try {
      const response = await fetch(
        `http://localhost:8082/api/game-lobby/start-stage/${studentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            islandType: selectedIsland.name,
            stageNumber: level,
          }),
        }
      );

      if (response.ok) {
        const gameSession = await response.json();
        onGameStart({ ...gameSession, level: level, isBoss: level === getIslandStageCount(selectedIsland.name) });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start game');
      }
    } catch (err) {
      setError('Error starting game');
      console.error(err);
    }
  };

  // Each island's stage count comes from how many enemies are defined for it
  // in enemyData.txt (see islandStageCounts above). If an island has no
  // entries there, there's genuinely no known stage count — return null
  // instead of guessing a number, so the UI can show "null" for it.
  const STARS_PER_STAGE = 3;
  const getIslandStageCount = (islandName) => islandStageCounts[islandName] || null;

  const islandStarTotal = (islandName) => {
    const stageCount = getIslandStageCount(islandName);
    if (!stageCount) return 0;
    let total = 0;
    for (let stage = 1; stage <= stageCount; stage++) {
      total += stageStars[`${islandName}_${stage}`] || 0;
    }
    return total;
  };

  const islands = [
    {
      name: 'Similar',
      title: 'Similar Island',
      description: 'Master fractions with same denominators',
      mechanic: 'Same Container',
      unlocked: true,
      maxStage: gameProgress?.similarIslandMaxStage || 0,
      totalStages: getIslandStageCount('Similar'),
      color: '#22C55E',
      icon: '🌿',
      image: '/SimilarIsland.png',
    },
    {
      name: 'Dissimilar',
      title: 'Dissimilar Island',
      description: 'Conquer the Butterfly Method',
      mechanic: 'Butterfly Method',
      unlocked: true,
      maxStage: gameProgress?.dissimilarIslandMaxStage || 0,
      totalStages: getIslandStageCount('Dissimilar'),
      color: '#F59E0B',
      icon: '🦋',
      image: '/DisimilarIsland.png',
    },
    {
      name: 'Hybrid',
      title: 'Hybrid Island',
      description: 'Master mixed number conversions',
      mechanic: 'Mixed Conversion',
      unlocked: true,
      maxStage: gameProgress?.hybridIslandMaxStage || 0,
      totalStages: getIslandStageCount('Hybrid'),
      color: '#7C3AED',
      icon: '🌀',
      image: '/HybridIsland.png',
    },
  ];

  const getAvatarImage = () => {
    const name = (character?.name || '').toLowerCase();
    if (name.includes('girl')) return '/Female.png';
    if (name.includes('boy')) return '/Male.png';
    return character?.imageUrl || '/Male.png';
  };

  const profilePictureUrl = studentId ? `http://localhost:8082/api/students/${studentId}/profile-picture` : null;

  const totalStarsAll = islands.reduce((sum, isl) => sum + islandStarTotal(isl.name), 0);
  const totalStarsPossible = islands.reduce((sum, isl) => sum + (isl.totalStages || 0) * STARS_PER_STAGE, 0);
  const overallPercent = Math.round((totalStarsAll / totalStarsPossible) * 100) || 0;

  const level = gameProgress?.level || 1;
  const xpIntoLevel = gameProgress?.xpIntoLevel || 0;
  const xpForNextLevel = gameProgress?.xpForNextLevel || 200;
  const xpPercent = Math.round((xpIntoLevel / xpForNextLevel) * 100);
  const wizardRank = gameProgress?.wizardRank || 'Apprentice';
  const starCurrency = gameProgress?.starCurrency ?? 0;
  const currentStreak = gameProgress?.currentStreak ?? 0;
  const dailyQuestProgress = gameProgress?.dailyQuestProgress ?? 0;
  const dailyQuestTarget = gameProgress?.dailyQuestTarget || 5;
  const dailyQuestClaimed = gameProgress?.dailyQuestClaimed || false;
  const dailyQuestPercent = Math.round((dailyQuestProgress / dailyQuestTarget) * 100);

  if (showInterior && selectedIsland) {
    const liveMaxStage = (() => {
      switch (selectedIsland.name) {
        case 'Similar':    return gameProgress?.similarIslandMaxStage    || 0;
        case 'Dissimilar': return gameProgress?.dissimilarIslandMaxStage || 0;
        case 'Hybrid':     return gameProgress?.hybridIslandMaxStage     || 0;
        default:           return 0;
      }
    })();
    const islandStars = {};
    Object.entries(stageStars).forEach(([key, stars]) => {
      const [islandType, stageNumber] = key.split('_');
      if (islandType === selectedIsland.name) islandStars[stageNumber] = stars;
    });
    return (
      <IslandInterior
        island={selectedIsland}
        maxStage={liveMaxStage}
        stars={islandStars}
        onSelectLevel={handleSelectLevel}
        onBack={handleBackToLobby}
      />
    );
  }

  return (
    <div className="game-lobby">
      <canvas ref={canvasRef} className="galaxy-canvas" />
      {loading && <LoadingScreen />}

      <div className="lobby-top-right">
        <div className="currency-badge"><span className="currency-star">⭐</span> {starCurrency}</div>
        <button className="icon-pill" onClick={() => setShowMechanicsIntro(true)}>Help</button>
        <button className="icon-pill icon-pill-round" onClick={onOpenSettings} aria-label="Settings">⚙️</button>
      </div>

      <div className="player-card-fixed">
        <img
          className="player-avatar"
          src={profilePictureUrl || getAvatarImage()}
          alt="Player avatar"
          onError={(e) => {
            if (e.currentTarget.src !== getAvatarImage()) {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getAvatarImage();
            }
          }}
        />
        <div className="player-card-info">
          <p className="player-name">{studentNickname || 'Young Wizard'}</p>
          <p className="player-level">Level {level} <span className="player-rank-inline">· Rank: {wizardRank}</span></p>
          <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${xpPercent}%` }} /></div>
          <p className="xp-text">{xpIntoLevel} / {xpForNextLevel} XP</p>
        </div>
      </div>

      <div
        className="lobby-pet-fixed"
        onMouseEnter={handlePetEnter}
        onMouseLeave={handlePetLeave}
        onClick={handlePetClick}
        style={{ cursor: (petPhase === 'up' || petPhase === 'talking') ? 'pointer' : 'default' }}
      >
        {petDialogue && (
          <div className="pet-dialogue" key={petDialogue}>
            {/* invisible sizer locks the bubble to the full-text width so it
                doesn't resize as characters type in */}
            <span className="pet-dialogue-sizer">{petDialogue}</span>
            <span className="pet-dialogue-text">{petDisplayedText}</span>
          </div>
        )}
        <div className={`pet-sprite pet-sprite--${petPhase}`}>
          <img
            className={`pet-ear pet-ear-left${petTwitching ? ' pet-talking' : ''}`}
            src="/petAssets/pet1/petEar.png" alt=""
          />
          <img
            className={`pet-ear pet-ear-right${petTwitching ? ' pet-talking' : ''}`}
            src="/petAssets/pet1/petEar.png" alt=""
          />
          <div className="pet-head-wrapper">
            <img
              className={`pet-head${petTwitching ? ' pet-talking' : ''}`}
              src="/petAssets/pet1/petHead.png" alt=""
            />
          </div>
          <img className="pet-body" src="/petAssets/pet1/petBody.png" alt="" />
        </div>
      </div>

      <div className="left-panel-slider">
        <div className="left-panel-content">
          <nav className="lobby-sidebar">
            <button className="sidebar-item active" onClick={onOpenDashboard}><span>🏠</span>Dashboard</button>
            <button className="sidebar-item" onClick={onOpenDashboard}><span>📊</span>Progress</button>
            <button className="sidebar-item" onClick={onOpenLeaderboard}><span>👑</span>Leaderboard</button>
            <button className="sidebar-item soon" disabled><span>📖</span>Spellbook<span className="soon-tag">Soon</span></button>
            <button className="sidebar-item soon" disabled><span>🏆</span>Achievements<span className="soon-tag">Soon</span></button>
            <button className="sidebar-item soon" disabled><span>🎒</span>Collection<span className="soon-tag">Soon</span></button>
            <button className="sidebar-item" onClick={onOpenSettings}><span>⚙️</span>Settings</button>
          </nav>
        </div>
        <div className="left-panel-tab">
          <span className="left-panel-arrow">▶</span>
        </div>
      </div>

      <div className="lobby-dashboard">
        <div className="lobby-title-area">
          <div
            ref={titleBoxRef}
            className={`lobby-title-box${animPhase === 'flash' ? ' anim-flash' : ''}${animPhase && animPhase !== 'flash' ? ' anim-hidden' : ''}`}
          >
            <div className="lobby-title-gem"><span className="lobby-title-gem-inner"></span></div>
            <h1 className="lobby-title">WIZARD ISLANDS</h1>
            <p className="lobby-subtitle">
              <span className="lobby-subtitle-star">★</span> Choose your adventure <span className="lobby-subtitle-star">★</span>
            </p>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="lobby-islands-area">
          <div className="islands-grid" style={{ pointerEvents: animPhase ? 'none' : 'auto' }}>
            {islands.map(island => {
              const stars = islandStarTotal(island.name);
              return (
                <div
                  key={island.name}
                  ref={el => islandCardRefs.current[island.name] = el}
                  className={`island-card-wrapper ${!island.unlocked ? 'locked' : ''}`}
                  onClick={() => handleEnterIsland(island)}
                  style={{
                    opacity: animPhase && animIsland && island.name !== animIsland.name
                      ? 0
                      : island.unlocked ? 1 : 0.6,
                    transition: animPhase ? 'opacity 0.5s ease, filter 0.5s ease' : 'opacity 0.3s ease',
                    filter: animPhase === 'explode' && animIsland?.name === island.name
                      ? 'brightness(4)'
                      : 'brightness(1)',
                  }}
                >
                  <div className="island-card">
                    <div className="floating-island-wrapper">
                      <img
                        className="floating-island"
                        src={island.image}
                        alt={island.title}
                      />
                      {!island.unlocked && (
                        <div className="lock-overlay">
                          <span className="lock-icon">🔒</span>
                          <p>Unlock by completing previous island</p>
                        </div>
                      )}
                    </div>
                    <div className="island-stats">
                      <span className="island-stars">
                        <span className="island-stars-icon">⭐</span> {island.maxStage} / {island.totalStages ?? 'null'}
                      </span>
                    </div>
                    <div className="island-progress-track">
                      <div
                        className="island-progress-fill"
                        style={{ width: `${island.totalStages ? (island.maxStage / island.totalStages) * 100 : 0}%`, background: island.color }}
                      />
                    </div>
                    <div className="island-ribbon">
                      <span className="island-ribbon-icon">{island.icon}</span>
                      <span>{island.title.toUpperCase()}</span>
                    </div>
                    <p className="island-card-desc">{island.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="lobby-bottom-bar">
        <div className="bottom-bar-info">
          <span className="bottom-progress-label">Overall Progress: {overallPercent}%</span>
          <span className="bottom-achievement-label">
            Recent Achievement: <strong>Fraction Finder</strong>
            <span className="bottom-achievement-badge">⭐</span>
          </span>
        </div>
        <div className="bottom-progress-track">
          <div className="bottom-progress-fill" style={{ width: `${overallPercent}%` }} />
        </div>
      </div>

      <div className="side-cards-slider">
        <div className="side-cards-tab">
          <span className="side-cards-arrow">◀</span>
        </div>
        <div className="side-cards-panel">
          <div className="side-card quest-card">
            <p className="side-card-title"><span>📜</span> DAILY QUEST</p>
            <p className="quest-desc">Solve {dailyQuestTarget} fraction problems</p>
            <p className="quest-count">{dailyQuestProgress} / {dailyQuestTarget}</p>
            <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${dailyQuestPercent}%` }} /></div>
            <div className="quest-reward">
              <span className="quest-reward-label">{dailyQuestClaimed ? 'CLAIMED ✓' : 'REWARD'}</span>
              <span>⭐ 50</span>
              <span>🔮 20</span>
            </div>
          </div>
          <div className="side-card streak-card">
            <p className="side-card-title"><span>🔥</span> WIZARD STREAK</p>
            <div className="streak-flame">🔥</div>
            <p className="streak-days">{currentStreak} <small>days</small></p>
            <p className="streak-note">Keep it up!</p>
          </div>
        </div>
      </div>

      {animPhase && animPhase !== 'flash' && (
        <div
          ref={sparkleRef}
          style={{
            position: 'fixed',
            left: sparkleStart.x,
            top: sparkleStart.y,
            transform: 'translate(-50%, -50%)',
            width: animPhase === 'explode' ? 180 : 80,
            height: animPhase === 'explode' ? 180 : 80,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <img
            src="/OtherEffects/BlueSparkle.png"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              animation: animPhase === 'explode'
                ? 'sparkleSpin 0.15s linear infinite, sparkleExplode 0.9s ease-out forwards'
                : 'sparkleSpin 0.35s linear infinite',
            }}
          />
        </div>
      )}

      {showMechanicsIntro && (
        <GameMechanicsIntro onComplete={closeMechanicsIntro} />
      )}
    </div>
  );
};

export default GameLobby;
