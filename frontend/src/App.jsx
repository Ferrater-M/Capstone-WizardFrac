import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import GameEndPopup from './components/GameEndPopup';
import SparkleTrails from './components/SparkleTrails';
import TouchKeypad from './components/TouchKeypad';
import { isTouchDevice } from './utils/device';
import { countEnemiesPerIsland } from './utils/islandStages';
import { flushSync } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import MainPage from './pages/MainPage';
import LandingPage from './pages/login';
import CharacterSelection from './pages/character-selection';
import GameLobby from './pages/game-lobby';
// The battles and the dashboard are the heaviest screens (the dashboard carries the PDF
// and chart code), so their code downloads on its own instead of with the Title Page.
// Their stylesheets still load up front, in the same order as before: other screens
// share some of these rules (e.g. the lobby's sparkleSpin lives in game.css).
import './components/IntroPhase.css';
import './pages/game.css';
import './pages/StudentDashboard.css';
import { getMasterVolume } from './utils/audio';
import { API_BASE_URL } from './config';
import { getStageEl } from './utils/stage';
import { getAuthToken, setAuthToken, setAuthExpiredHandler } from './utils/authFetch';

const loadSimilarIsland    = () => import('./pages/SimilarIslandGame');
const loadDissimilarIsland = () => import('./pages/DissimilarIslandGame');
const loadHybridIsland     = () => import('./pages/HybridIslandGame');
const loadDashboard        = () => import('./pages/StudentDashboard');
const SimilarIslandGame    = lazy(loadSimilarIsland);
const DissimilarIslandGame = lazy(loadDissimilarIsland);
const HybridIslandGame     = lazy(loadHybridIsland);
const StudentDashboard     = lazy(loadDashboard);

// Shown only if a lazy screen is opened before its code has arrived (rare: they preload).
const ScreenFallback = () => <div style={{ position: 'fixed', inset: 0, background: '#000' }} />;

// Screens with the title music. The Title Page itself ('/') is silent; the music starts at the login.
const LOBBY_PATHS = ['/login', '/character-selection', '/game-lobby'];
// Menu music plays a little under the Master Volume setting.
const MUSIC_VOLUME = 0.7;

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // No login pass = not logged in (e.g. a tab left open from before login passes existed).
  const [studentId, setStudentId] = useState(() => (getAuthToken() ? sessionStorage.getItem('studentId') : null));
  const [studentNickname, setStudentNickname] = useState(() => sessionStorage.getItem('studentNickname'));
  const [selectedCharacter, setSelectedCharacter] = useState(() => {
    const c = sessionStorage.getItem('selectedCharacter');
    return c ? JSON.parse(c) : null;
  });
  // After a refresh (or opening a link straight to a page): the login goes back to the Title Page; any
  // other screen goes to the Island Selection (or the character selection if no wizard was picked yet).
  // Runs once, on the first load only.
  const firstLoadHandledRef = useRef(false);
  useEffect(() => {
    if (firstLoadHandledRef.current) return;
    firstLoadHandledRef.current = true;
    const path = location.pathname;
    if (path === '/') return;
    if (path === '/login' || !studentId) navigate('/', { replace: true });
    else navigate(selectedCharacter ? '/game-lobby' : '/character-selection', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Every refresh (or closing the tab) asks first. Browsers show their own wording for this box,
  // e.g. "Reload site? Changes you made may not be saved."
  useEffect(() => {
    const warn = (e) => {
      if (window.__allowLeave) return undefined;   // e.g. the Title Page's Privacy link
      e.preventDefault(); e.returnValue = ''; return '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const [gameSession, setGameSession] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [lobbyKey, setLobbyKey] = useState(0);
  const [isMuted] = useState(false);
  const audioRef = useRef(null);
  const endActionLocked = useRef(false);
  const [endError, setEndError] = useState('');
  // Levels per island, from enemyData.txt — decides whether "Next Level" exists and which level is the boss
  const [stageCounts, setStageCounts] = useState({});
  useEffect(() => {
    fetch(`/enemyData.txt?t=${Date.now()}`)
      .then(r => r.text())
      .then(text => setStageCounts(countEnemiesPerIsland(text)))
      .catch(() => {});
  }, []);

  // ── Content protection ──────────────────────────────────────────────────
  // Makes the game behave like a normal app: no dragging images out of the
  // page, no right-click "Save image as…", no Ctrl/Cmd+S to save the page.
  // Purely event-level — nothing here touches pointer-events, so every
  // element (including animated sprites) stays fully clickable, and nothing
  // here touches how any animation is triggered or timed.
  useEffect(() => {
    const onDragStart = (e) => {
      if (e.target.tagName === 'IMG') e.preventDefault();
    };
    const onContextMenu = (e) => e.preventDefault();
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    };
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Cursor sparkle trail
  useEffect(() => {
    let last = 0;
    const onMove = (e) => {
      const now = Date.now();
      if (now - last < 35) return;
      last = now;
      const el = document.createElement('div');
      el.className = 'cursor-sparkle';
      const size = Math.random() * 7 + 4;
      const ox = (Math.random() - 0.5) * 18;
      const oy = (Math.random() - 0.5) * 18;
      el.style.cssText = `left:${e.clientX + ox}px;top:${e.clientY + oy}px;width:${size}px;height:${size}px;`;
      getStageEl().appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Create the audio instances once: the title music, and the level selection's own theme
  const islandAudioRef = useRef(null);
  const inIslandRef = useRef(false);   // inside an island's level selection (its theme replaces the title music)
  useEffect(() => {
    const audio = new Audio('/OSTFiles/mainTheme.mp3');
    audio.loop = true;
    audio.volume = getMasterVolume() * MUSIC_VOLUME;
    audioRef.current = audio;
    const island = new Audio('/OSTFiles/IslandSelectionTheme.mp3');
    island.loop = true;
    island.volume = getMasterVolume() * MUSIC_VOLUME;
    islandAudioRef.current = island;
    return () => {
      audio.pause(); audio.src = '';
      island.pause(); island.src = '';
    };
  }, []);

  // The title music never plays under other music, and whenever it comes back after being stopped it
  // starts from the beginning instead of where it left off. (Moving between menu screens while it is
  // already playing doesn't restart it.)
  const playMainTheme = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  // Title music on login/lobby screens (unless a level selection is open), nothing elsewhere
  useEffect(() => {
    if (!audioRef.current) return;
    if (location.pathname === '/login') {
      // Every visit to the login starts the song from the beginning. Logging out from inside an island:
      // its level selection theme stops first.
      islandAudioRef.current?.pause();
      inIslandRef.current = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (LOBBY_PATHS.includes(location.pathname)) {
      if (!inIslandRef.current) playMainTheme();
    } else {
      audioRef.current.pause();
      islandAudioRef.current?.pause();   // e.g. a fight started from the level selection
      inIslandRef.current = false;
    }
  }, [location.pathname]);

  // Entering an island: the title music stops; the level selection's theme starts once it has loaded.
  const pauseMusic = () => { inIslandRef.current = true; audioRef.current?.pause(); };
  const playIslandTheme = () => {
    const island = islandAudioRef.current;
    if (!island) return;
    island.currentTime = 0;               // always from the beginning
    if (!isMuted) island.play().catch(() => {});
  };
  // Leaving the island: its theme stops and the title music comes back.
  const resumeMusic = () => {
    inIslandRef.current = false;
    islandAudioRef.current?.pause();
    if (!isMuted) playMainTheme();
  };


  // Live-update the currently playing background music when the Master
  // Volume slider on the Settings page moves, without waiting for a reload.
  const handleMasterVolumeChanged = (volume01) => {
    if (!isMuted) {
      if (audioRef.current) audioRef.current.volume = volume01 * MUSIC_VOLUME;
      if (islandAudioRef.current) islandAudioRef.current.volume = volume01 * MUSIC_VOLUME;
    }
  };

  const handleLogin = (student) => {
    const id = student.studentId;
    const nickname = student.nickname;
    const char = student.selectedCharacterId
      ? { id: student.selectedCharacterId, name: student.selectedCharacterName }
      : null;

    setStudentId(id);
    setStudentNickname(nickname);
    setSelectedCharacter(char);

    sessionStorage.setItem('studentId', id);
    sessionStorage.setItem('studentNickname', nickname);
    setAuthToken(student.token);
    if (char) sessionStorage.setItem('selectedCharacter', JSON.stringify(char));

    if (student.selectedCharacterId) {
      navigate('/game-lobby');
    } else {
      navigate('/character-selection');
    }
  };

  const handleCharacterSelected = (character) => {
    setSelectedCharacter(character);
    sessionStorage.setItem('selectedCharacter', JSON.stringify(character));
    navigate('/game-lobby');
  };

  const handleGameStart = (session) => {
    flushSync(() => setGameSession(session));
    navigate('/game');
  };

  // End of a battle: the result pop-up opens on top of the battle (see the /game route).
  const handleGameEnd = (result) => {
    endActionLocked.current = false;
    setEndError('');
    setGameResult(result);
  };

  const handleExitToLobby = () => {
    setGameSession(null);
    setLobbyKey(k => k + 1);
    navigate('/game-lobby');
  };

  const handleReturnToLobby = () => {
    endActionLocked.current = false;
    setGameSession(null);
    setGameResult(null);
    setLobbyKey(k => k + 1);
    navigate('/game-lobby');
  };

  const handleNextLevel = async () => {
    const nextLevel = (gameSession.level || 1) + 1;
    const total = stageCounts[gameSession.islandType];
    try {
      const res = await fetch(`${API_BASE_URL}/api/game-lobby/start-stage/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ islandType: gameSession.islandType, stageNumber: nextLevel }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newSession = await res.json();
      // Already on /game: the new session swaps in the next battle (fresh instance, Intro Phase again)
      setGameSession({ ...newSession, level: nextLevel, isBoss: nextLevel === total });
      setGameResult(null);
    } catch (err) {
      console.error('Error starting next level:', err);
      setEndError('Could not start the next level. Please try again.');
    } finally {
      endActionLocked.current = false;
    }
  };

  // expired === true: the server already rejected the login pass, so there's nothing to log out of.
  const handleReturnToLogin = (expired) => {
    if (expired !== true && getAuthToken()) {
      // Tell the server this login pass is finished (fire-and-forget; the token is attached right now).
      fetch(`${API_BASE_URL}/api/students/logout`, { method: 'POST' }).catch(() => {});
    }
    setStudentId(null);
    setStudentNickname(null);
    setSelectedCharacter(null);
    setGameSession(null);
    setGameResult(null);
    sessionStorage.clear();
    navigate('/login');
  };

  // Login pass expired / replaced → back to the login screen.
  useEffect(() => {
    setAuthExpiredHandler(() => handleReturnToLogin(true));
  });

  const handleOpenDashboard = () => navigate('/dashboard');
  const handleBackToLobbyFromDashboard = () => navigate('/game-lobby');
  const handleNicknameChanged = (newNickname) => {
    setStudentNickname(newNickname);
    sessionStorage.setItem('studentNickname', newNickname);
  };

  const renderGame = () => {
    if (!gameSession) return null;

    switch (gameSession.islandType) {
      case 'Similar':
        return (
          <SimilarIslandGame
            key={gameSession.sessionId}
            studentId={studentId}
            studentNickname={studentNickname}
            selectedCharacter={selectedCharacter}
            gameSession={gameSession}
            onGameEnd={handleGameEnd}
            onExitToLobby={handleExitToLobby}
          />
        );
      case 'Dissimilar':
        return (
          <DissimilarIslandGame
            key={gameSession.sessionId}
            studentId={studentId}
            studentNickname={studentNickname}
            selectedCharacter={selectedCharacter}
            gameSession={gameSession}
            onGameEnd={handleGameEnd}
            onExitToLobby={handleExitToLobby}
          />
        );
      case 'Hybrid':
        return (
          <HybridIslandGame
            key={gameSession.sessionId}
            studentId={studentId}
            studentNickname={studentNickname}
            selectedCharacter={selectedCharacter}
            gameSession={gameSession}
            onGameEnd={handleGameEnd}
            onExitToLobby={handleExitToLobby}
          />
        );
      default:
        return null;
    }
  };

  // Once the player is past the Title Page, fetch the battle and dashboard code in the
  // background, so entering an island or the dashboard never waits on a download.
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current || location.pathname === '/') return;
    preloadedRef.current = true;
    const preload = () => {
      [loadSimilarIsland, loadDissimilarIsland, loadHybridIsland, loadDashboard].forEach(load => load().catch(() => {}));
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 3000 });
    else setTimeout(preload, 1000);
  }, [location.pathname]);

  return (
    <div className="app">
      {/* Trails behind every moving blue sparkle, on every screen */}
      <SparkleTrails />
      {/* Phones: number keypad beside the battle card while an answer box is showing */}
      {isTouchDevice() && location.pathname === '/game' && <TouchKeypad />}
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<MainPage onStart={() => navigate('/login')} onMasterVolumeChanged={handleMasterVolumeChanged} />} />

          <Route path="/login" element={<LandingPage onLoginSuccess={handleLogin} onBack={() => navigate('/')} />} />

          <Route path="/character-selection" element={
            studentId
              ? <CharacterSelection studentId={studentId} onCharacterSelected={handleCharacterSelected} onBack={handleReturnToLogin} onMasterVolumeChanged={handleMasterVolumeChanged} />
              : <Navigate to="/login" replace />
          } />

          <Route path="/game-lobby" element={
            studentId
              ? <GameLobby
                  key={lobbyKey}
                  studentId={studentId}
                  studentNickname={studentNickname}
                  selectedCharacter={selectedCharacter}
                  onGameStart={handleGameStart}
                  onOpenDashboard={handleOpenDashboard}
                  onEnterIslandInterior={pauseMusic}
                  onLeaveIslandInterior={resumeMusic}
                  onIslandInteriorLoaded={playIslandTheme}
                  onLogout={handleReturnToLogin}
                  onNicknameChanged={handleNicknameChanged}
                  onMasterVolumeChanged={handleMasterVolumeChanged}
                />
              : <Navigate to="/login" replace />
          } />

          <Route path="/dashboard" element={
            studentId
              ? <StudentDashboard
                  studentId={studentId}
                  studentNickname={studentNickname}
                  selectedCharacter={selectedCharacter}
                  onBack={handleBackToLobbyFromDashboard}
                />
              : <Navigate to="/login" replace />
          } />

          <Route path="/game" element={
            studentId && gameSession
              ? (
                <>
                  {renderGame()}
                  {/* Result pop-up, inside the battle (the battle stays behind it, darkened) */}
                  {gameResult && (
                    <GameEndPopup
                      isWon={gameResult.isWon}
                      score={gameResult.score}
                      bonus={gameSession.isBoss ? 500 : 0}
                      hasNextLevel={!!(gameResult.isWon && stageCounts[gameSession.islandType] > (gameSession.level || 1))}
                      error={endError}
                      onNextLevel={() => { if (endActionLocked.current) return; endActionLocked.current = true; handleNextLevel(); }}
                      onLobby={() => { if (endActionLocked.current) return; endActionLocked.current = true; handleReturnToLobby(); }}
                      onLogin={() => { if (endActionLocked.current) return; handleReturnToLogin(); }}
                    />
                  )}
                </>
              )
              : <Navigate to={studentId ? '/game-lobby' : '/login'} replace />
          } />

          {/* Old separate results page — the pop-up now lives inside the battle */}
          <Route path="/game-end" element={<Navigate to={studentId && gameSession ? '/game' : '/game-lobby'} replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

    </div>
  );
}

export default App;
