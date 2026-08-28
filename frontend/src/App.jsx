import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import MainPage from './pages/MainPage';
import LandingPage from './pages/login';
import CharacterSelection from './pages/character-selection';
import GameLobby from './pages/game-lobby';
import SimilarIslandGame from './pages/SimilarIslandGame';
import DissimilarIslandGame from './pages/DissimilarIslandGame';
import HybridIslandGame from './pages/HybridIslandGame';
import StudentDashboard from './pages/StudentDashboard';
import { getMasterVolume } from './utils/audio';

const LOBBY_PATHS = ['/', '/login', '/character-selection', '/game-lobby'];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [studentId, setStudentId] = useState(() => sessionStorage.getItem('studentId'));
  const [studentNickname, setStudentNickname] = useState(() => sessionStorage.getItem('studentNickname'));
  const [selectedCharacter, setSelectedCharacter] = useState(() => {
    const c = sessionStorage.getItem('selectedCharacter');
    return c ? JSON.parse(c) : null;
  });
  const [gameSession, setGameSession] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [lobbyKey, setLobbyKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const endActionLocked = useRef(false);

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
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Create the audio instance once
  useEffect(() => {
    const audio = new Audio('/TitleTheme.wav');
    audio.loop = true;
    audio.volume = getMasterVolume();
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Play on login/lobby screens, pause otherwise
  useEffect(() => {
    if (!audioRef.current) return;
    if (LOBBY_PATHS.includes(location.pathname)) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [location.pathname]);

  const pauseMusic  = () => audioRef.current?.pause();
  const resumeMusic = () => { if (!isMuted) audioRef.current?.play().catch(() => {}); };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = getMasterVolume();
    } else {
      audioRef.current.volume = 0;
    }
    setIsMuted(m => !m);
  };

  // Live-update the currently playing background music when the Master
  // Volume slider on the Settings page moves, without waiting for a reload.
  const handleMasterVolumeChanged = (volume01) => {
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = volume01;
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

  const handleGameEnd = (result) => {
    flushSync(() => setGameResult(result));
    navigate('/game-end');
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
    try {
      const res = await fetch(`http://localhost:8082/api/game-lobby/start-stage/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ islandType: gameSession.islandType, stageNumber: nextLevel }),
      });
      if (res.ok) {
        const newSession = await res.json();
        flushSync(() => {
          setGameSession({ ...newSession, level: nextLevel, isBoss: nextLevel === 6 });
          setGameResult(null);
        });
        navigate('/game');
      }
    } catch (err) {
      console.error('Error starting next level:', err);
    }
  };

  const handleReturnToLogin = () => {
    setStudentId(null);
    setStudentNickname(null);
    setSelectedCharacter(null);
    setGameSession(null);
    setGameResult(null);
    sessionStorage.clear();
    navigate('/login');
  };

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
            studentId={studentId}
            gameSession={gameSession}
            onGameEnd={handleGameEnd}
            onExitToLobby={handleExitToLobby}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<MainPage onStart={() => navigate('/login')} />} />

        <Route path="/login" element={<LandingPage onLoginSuccess={handleLogin} />} />

        <Route path="/character-selection" element={
          studentId
            ? <CharacterSelection studentId={studentId} onCharacterSelected={handleCharacterSelected} onBack={handleReturnToLogin} />
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
            ? renderGame()
            : <Navigate to={studentId ? '/game-lobby' : '/login'} replace />
        } />

        <Route path="/game-end" element={
          studentId && gameResult
            ? (
              <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: 'url(/PostMatchBackground.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              }}>
                <div style={{
                  position: 'relative',
                  background: '#251e59',
                  border: '4px solid #f6b825',
                  borderRadius: '12px',
                  boxShadow: '0 0 0 2px #18113c, 0 20px 40px rgba(0,0,0,0.6)',
                  padding: '36px 56px 28px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 8, right: 8, bottom: 8, left: 8,
                    border: '1px solid #f6b825',
                    borderRadius: '6px',
                    pointerEvents: 'none',
                  }} />

                  <h1 style={{
                    fontSize: 'clamp(2.5em, 6vw, 5em)',
                    fontWeight: 900,
                    margin: 0,
                    color: gameResult.isWon ? '#f6b825' : '#ef4444',
                    textShadow: '0 0 20px rgba(0,0,0,0.6), 2px 2px 6px rgba(0,0,0,0.8)',
                    letterSpacing: '6px',
                    textTransform: 'uppercase',
                  }}>
                    {gameResult.isWon ? 'VICTORY!' : 'DEFEAT!'}
                  </h1>

                  <p style={{
                    fontSize: 'clamp(1em, 2vw, 1.3em)',
                    color: '#fff',
                    margin: '36px 0 0',
                    fontWeight: 500,
                  }}>
                    {gameResult.isWon ? 'You defeated the enemy!' : 'You ran out of lives.'}
                  </p>

                  <p style={{
                    fontSize: 'clamp(1.1em, 2vw, 1.6em)',
                    color: '#fff',
                    margin: '12px 0 0',
                    fontWeight: 700,
                  }}>
                    Score: {gameResult.score}{gameSession?.isBoss ? ' + 500' : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '16px' }}>
                  {gameResult.isWon && gameSession?.level < 6 && (
                    <button
                      onClick={() => { if (endActionLocked.current) return; endActionLocked.current = true; handleNextLevel(); }}
                      style={{
                        padding: '12px 28px', fontSize: '15px', fontWeight: 700,
                        background: 'rgba(40,40,40,0.8)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
                        cursor: 'pointer', backdropFilter: 'blur(10px)',
                      }}
                    >
                      ▶ Next Level
                    </button>
                  )}
                  <button
                    onClick={() => { if (endActionLocked.current) return; endActionLocked.current = true; handleReturnToLobby(); }}
                    style={{
                      padding: '12px 28px', fontSize: '15px', fontWeight: 700,
                      background: 'rgba(40,40,40,0.8)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
                      cursor: 'pointer', backdropFilter: 'blur(10px)',
                    }}
                  >
                    Back to Lobby
                  </button>
                  <button
                    onClick={() => { if (endActionLocked.current) return; endActionLocked.current = true; handleReturnToLogin(); }}
                    style={{
                      padding: '12px 28px', fontSize: '15px', fontWeight: 700,
                      background: 'rgba(40,40,40,0.8)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
                      cursor: 'pointer', backdropFilter: 'blur(10px)',
                    }}
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            )
            : <Navigate to={studentId ? '/game-lobby' : '/login'} replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </div>
  );
}

export default App;
