import { useState, useEffect, useRef, useMemo } from 'react';
import { playSfx, getSfxVolume } from '../utils/audio';
import { triggerScreenShake } from '../utils/screenShake';
import './game-lobby.css';
import LoadingScreen from '../components/LoadingScreen';
import GalaxyBackground from '../components/GalaxyBackground';
import IslandInterior from './IslandInterior';
import GameMechanicsIntro from '../components/GameMechanicsIntro';
import SettingsPage from './SettingsPage';
import { API_BASE_URL } from '../config';
import { countEnemiesPerIsland } from '../utils/islandStages';

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

// Pixel-bracket corner decoration — matches the settings popup's frame style.
// Purely cosmetic, absolutely positioned children of a `position: relative`
// (or fixed) panel. `edgeOffset` lets straddling squares (-6, the tutorial's
// look) be pulled fully inside (0) for panels that clip overflow.
const pixelCorners = (color, edgeOffset = -6) => (
  <>
    <div style={{ position: 'absolute', inset: 5, border: `1px solid ${color}`, pointerEvents: 'none' }} />
    {[[edgeOffset, edgeOffset], [null, edgeOffset], [edgeOffset, null], [null, null]].map(([t, l], i) => (
      <div
        key={i}
        style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none', width: 12, height: 12, background: color,
          ...(t !== null ? { top: t } : { bottom: edgeOffset }),
          ...(l !== null ? { left: l } : { right: edgeOffset }),
        }}
      />
    ))}
  </>
);

const GameLobby = ({ studentId, studentNickname, selectedCharacter, onGameStart, onOpenDashboard, onEnterIslandInterior, onLeaveIslandInterior, onIslandInteriorLoaded, onLogout, onNicknameChanged, onMasterVolumeChanged }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
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

  const titleBoxRef = useRef(null);
  const playerCardRef = useRef(null);
  const topRightRef = useRef(null);      // star count, Help, Settings
  const islandCardRefs = useRef({});
  const sparkleRef = useRef(null);
  const [animPhase, setAnimPhase] = useState(null);
  const [animIsland, setAnimIsland] = useState(null);
  const [sparkleStart, setSparkleStart] = useState({ x: 0, y: 0 });
  const [sparkleEnd, setSparkleEnd] = useState({ x: 0, y: 0 });
  const [cardBurstRect, setCardBurstRect] = useState(null);
  const [topBurstRect, setTopBurstRect] = useState(null);

  // Random burst directions for the player card's particle-dissolve effect,
  // regenerated once per island-entry attempt (not on every re-render).
  const cardParticles = useMemo(() => {
    if (!animIsland) return [];
    return Array.from({ length: 18 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 160;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        delay: Math.random() * 150,
      };
    });
  }, [animIsland]);


  useEffect(() => {
    setCharacter(selectedCharacter);
  }, [selectedCharacter]);

  const loadGameProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/game-progress/${studentId}`);
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
      const res = await fetch(`${API_BASE_URL}/api/game-progress/stars/${studentId}`);
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
        const res = await fetch(`${API_BASE_URL}/api/characters/student/${studentId}`);
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
    const cardRect = playerCardRef.current?.getBoundingClientRect();
    if (cardRect) {
      setCardBurstRect({ top: cardRect.top, left: cardRect.left, width: cardRect.width, height: cardRect.height });
    }
    const topRect = topRightRef.current?.getBoundingClientRect();
    if (topRect) {
      setTopBurstRect({ top: topRect.top, left: topRect.left, width: topRect.width, height: topRect.height });
    }
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
        triggerScreenShake({ sound: false });   // the star slams into the island
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
        `${API_BASE_URL}/api/game-lobby/start-stage/${studentId}`,
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
  const getIslandStageCount = (islandName) => islandStageCounts[islandName] || null;


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
      image: '/InteractableUI/SimilarIsland.png',
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
      image: '/InteractableUI/DisimilarIsland.png',
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
      image: '/InteractableUI/HybridIsland.png',
    },
  ];

  const getAvatarImage = () => {
    const name = (character?.name || '').toLowerCase();
    if (name.includes('girl')) return '/Female.png';
    if (name.includes('boy')) return '/Male.png';
    return character?.imageUrl || '/Male.png';
  };

  const profilePictureUrl = studentId ? `${API_BASE_URL}/api/students/${studentId}/profile-picture` : null;

  // Overall progress = stages cleared across all three islands, same measure as each island card's bar
  const totalStagesAll = islands.reduce((sum, isl) => sum + (isl.totalStages || 0), 0);
  const clearedStages = (isl) => Math.min(isl.maxStage, isl.totalStages || 0);
  const clearedStagesAll = islands.reduce((sum, isl) => sum + clearedStages(isl), 0);
  const overallPercent = Math.round((clearedStagesAll / totalStagesAll) * 100) || 0;

  const level = gameProgress?.level || 1;
  const xpIntoLevel = gameProgress?.xpIntoLevel || 0;
  const xpForNextLevel = gameProgress?.xpForNextLevel || 200;
  const xpPercent = Math.round((xpIntoLevel / xpForNextLevel) * 100);
  const wizardRank = gameProgress?.wizardRank || 'Apprentice';
  const starCurrency = gameProgress?.starCurrency ?? 0;

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
      <>
        <IslandInterior
          island={selectedIsland}
          maxStage={liveMaxStage}
          stars={islandStars}
          character={character}
          paused={showSettings}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToLobby}
          onOpenMenu={() => setShowSettings(true)}
          onLoaded={onIslandInteriorLoaded}
        />
        {/* Menu: the same Settings pop-up as the island selection's ⚙️ button and the in-game Menu */}
        {showSettings && (
          <SettingsPage
            studentId={studentId}
            studentNickname={studentNickname}
            selectedCharacter={character}
            onBack={() => setShowSettings(false)}
            onLogout={onLogout}
            onNicknameChanged={onNicknameChanged}
            onMasterVolumeChanged={onMasterVolumeChanged}
          />
        )}
      </>
    );
  }

  return (
    <div className="game-lobby">
      <GalaxyBackground pixelClouds />
      {loading && <LoadingScreen />}

      <div
        ref={topRightRef}
        className={`lobby-top-right${animPhase === 'flash' ? ' anim-flash' : ''}${animPhase && animPhase !== 'flash' ? ' anim-hidden' : ''}`}
      >
        <div className="currency-badge">
          {pixelCorners('var(--gl-border)', 0)}
          <span className="currency-star">⭐</span> {starCurrency}
        </div>
        <button className="icon-pill" onClick={() => setShowMechanicsIntro(true)}>
          {pixelCorners('var(--gl-border)', 0)}
          Help
        </button>
        <button className="icon-pill icon-pill-round" onClick={() => setShowSettings(true)} aria-label="Settings">
          {pixelCorners('var(--gl-border)', 0)}
          ⚙️
        </button>
      </div>

      <div
        ref={playerCardRef}
        className={`player-card-fixed${animPhase === 'flash' ? ' anim-flash' : ''}${animPhase && animPhase !== 'flash' ? ' anim-hidden' : ''}`}
      >
        {pixelCorners('var(--gl-border)', 0)}
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

      {animPhase && topBurstRect && (
        <div
          className="card-particle-burst"
          style={{ top: topBurstRect.top, left: topBurstRect.left, width: topBurstRect.width, height: topBurstRect.height }}
        >
          {cardParticles.map((p, i) => (
            <span
              key={i}
              className="card-particle"
              style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}ms` }}
            />
          ))}
        </div>
      )}

      {animPhase && cardBurstRect && (
        <div
          className="card-particle-burst"
          style={{ top: cardBurstRect.top, left: cardBurstRect.left, width: cardBurstRect.width, height: cardBurstRect.height }}
        >
          {cardParticles.map((p, i) => (
            <span
              key={i}
              className="card-particle"
              style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}ms` }}
            />
          ))}
        </div>
      )}

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
            {pixelCorners('var(--gl-border)')}
            <button className="sidebar-item active" onClick={onOpenDashboard}><span>🏠</span>Dashboard</button>
            <button className="sidebar-item" onClick={() => setShowSettings(true)}><span>⚙️</span>Settings</button>
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
            {pixelCorners('var(--gl-border)')}
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
          <span className="bottom-progress-label">
            Overall Progress: {overallPercent}% <small>({clearedStagesAll} / {totalStagesAll} stages)</small>
          </span>
        </div>
        <div className="bottom-progress-track">
          {islands.map(isl => (
            <div
              key={isl.name}
              className="bottom-progress-fill"
              title={`${isl.title}: ${clearedStages(isl)} / ${isl.totalStages || 0}`}
              style={{
                width: totalStagesAll ? `${(clearedStages(isl) / totalStagesAll) * 100}%` : 0,
                background: isl.color,
              }}
            />
          ))}
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

      {showSettings && (
        <SettingsPage
          showAccount
          studentId={studentId}
          studentNickname={studentNickname}
          selectedCharacter={character}
          onBack={() => setShowSettings(false)}
          onLogout={onLogout}
          onNicknameChanged={onNicknameChanged}
          onMasterVolumeChanged={onMasterVolumeChanged}
        />
      )}
    </div>
  );
};

export default GameLobby;
