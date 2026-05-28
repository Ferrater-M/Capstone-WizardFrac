import { useState, useEffect, useRef } from 'react';
import './App.css';
import LandingPage from './pages/login';
import CharacterSelection from './pages/character-selection';
import GameLobby from './pages/game-lobby';
import SimilarIslandGame from './pages/SimilarIslandGame';
import DissimilarIslandGame from './pages/DissimilarIslandGame';
import HybridIslandGame from './pages/HybridIslandGame';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // login, character-selection, game-lobby, game, game-end, dashboard
  const [studentId, setStudentId] = useState(null);
  const [studentNickname, setStudentNickname] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [lobbyKey, setLobbyKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Create the audio instance once
  useEffect(() => {
    const audio = new Audio('/TitleTheme.wav');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Play on login/lobby screens, pause otherwise
  useEffect(() => {
    if (!audioRef.current) return;
    const lobbyScreens = ['login', 'character-selection', 'game-lobby'];
    if (lobbyScreens.includes(currentScreen)) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [currentScreen]);

  const pauseMusic  = () => audioRef.current?.pause();
  const resumeMusic = () => { if (!isMuted) audioRef.current?.play().catch(() => {}); };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = 0.5;
    } else {
      audioRef.current.volume = 0;
    }
    setIsMuted(m => !m);
  };

  // Handle login completion
  const handleLogin = (student) => {
    setStudentId(student.studentId);
    setStudentNickname(student.nickname);
    setSelectedCharacter(
      student.selectedCharacterId
        ? {
            id: student.selectedCharacterId,
            name: student.selectedCharacterName,
          }
        : null
    );

    if (student.selectedCharacterId) {
      // Character already selected, go directly to lobby
      setCurrentScreen('game-lobby');
    } else {
      // Need to select character first
      setCurrentScreen('character-selection');
    }
  };

  // Handle character selection
  const handleCharacterSelected = (character) => {
    setSelectedCharacter(character);
    setCurrentScreen('game-lobby');
  };

  // Handle game start
  const handleGameStart = (session) => {
    setGameSession(session);
    setCurrentScreen('game');
  };

  // Handle game end
  const handleGameEnd = (result) => {
    setGameResult(result);
    setCurrentScreen('game-end');
  };

  // Handle exit to lobby
  const handleExitToLobby = () => {
    setGameSession(null);
    setLobbyKey(k => k + 1);
    setCurrentScreen('game-lobby');
  };

  // Handle return to lobby
  const handleReturnToLobby = () => {
    setGameSession(null);
    setGameResult(null);
    setLobbyKey(k => k + 1);
    setCurrentScreen('game-lobby');
  };

  // Handle next level after victory
  const handleNextLevel = async () => {
    const nextLevel = (gameSession.level || 1) + 1;
    try {
      const res = await fetch(`http://localhost:8080/api/game-lobby/start-stage/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ islandType: gameSession.islandType, stageNumber: nextLevel }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setGameSession({ ...newSession, level: nextLevel, isBoss: nextLevel === 6 });
        setGameResult(null);
        setCurrentScreen('game');
      }
    } catch (err) {
      console.error('Error starting next level:', err);
    }
  };

  // Handle return to login
  const handleReturnToLogin = () => {
    setStudentId(null);
    setStudentNickname(null);
    setSelectedCharacter(null);
    setGameSession(null);
    setGameResult(null);
    setCurrentScreen('login');
  };

  // Handle open dashboard
  const handleOpenDashboard = () => {
    setCurrentScreen('dashboard');
  };

  // Handle back to lobby from dashboard
  const handleBackToLobbyFromDashboard = () => {
    setCurrentScreen('game-lobby');
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
      {currentScreen === 'login' && (
        <LandingPage onLoginSuccess={handleLogin} />
      )}
      
      {currentScreen === 'character-selection' && (
        <CharacterSelection
          studentId={studentId}
          onCharacterSelected={handleCharacterSelected}
        />
      )}
      
      {currentScreen === 'game-lobby' && (
        <GameLobby
          key={lobbyKey}
          studentId={studentId}
          studentNickname={studentNickname}
          selectedCharacter={selectedCharacter}
          onGameStart={handleGameStart}
          onOpenDashboard={handleOpenDashboard}
          onEnterIslandInterior={pauseMusic}
          onLeaveIslandInterior={resumeMusic}
          onLogout={handleReturnToLogin}
        />
      )}
      
      {currentScreen === 'dashboard' && (
        <StudentDashboard
          studentId={studentId}
          onBack={handleBackToLobbyFromDashboard}
        />
      )}
      
      {currentScreen === 'game' && gameSession && renderGame()}
      
      {currentScreen === 'game-end' && gameResult && (
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
          {/* Title + Description + Score box */}
          <div style={{
            position: 'relative',
            background: '#251e59',
            border: '4px solid #f6b825',
            borderRadius: '12px',
            boxShadow: '0 0 0 2px #18113c, 0 20px 40px rgba(0,0,0,0.6)',
            padding: '36px 56px 28px',
            textAlign: 'center',
          }}>
            {/* Inner thin border */}
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

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '16px' }}>
            {gameResult.isWon && gameSession?.level < 6 && (
              <button onClick={handleNextLevel} style={{
                padding: '12px 28px', fontSize: '15px', fontWeight: 700,
                background: 'rgba(40,40,40,0.8)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
                cursor: 'pointer', backdropFilter: 'blur(10px)',
              }}>
                ▶ Next Level
              </button>
            )}
            <button onClick={handleReturnToLobby} style={{
              padding: '12px 28px', fontSize: '15px', fontWeight: 700,
              background: 'rgba(40,40,40,0.8)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
              cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
              Back to Lobby
            </button>
            <button onClick={handleReturnToLogin} style={{
              padding: '12px 28px', fontSize: '15px', fontWeight: 700,
              background: 'rgba(40,40,40,0.8)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
              cursor: 'pointer', backdropFilter: 'blur(10px)',
            }}>
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Floating mute button */}
      <button
        onClick={toggleMute}
        title={isMuted ? 'Unmute music' : 'Mute music'}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          border: '2px solid rgba(255,255,255,0.3)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}

export default App;
