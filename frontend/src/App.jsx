import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import LandingPage from './pages/login';
import CharacterSelection from './pages/character-selection';
import GameLobby from './pages/game-lobby';
import Game from './pages/game';

function AppContent() {
  const [studentId, setStudentId] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const navigate = useNavigate();

  // Handle login completion
  const handleLogin = (student) => {
    setStudentId(student.studentId);
    if (student.selectedCharacterId) {
      navigate('/lobby');
    } else {
      navigate('/character-selection');
    }
  };

  // Handle character selection
  const handleCharacterSelected = (character) => {
    navigate('/lobby');
  };

  // Handle game start
  const handleGameStart = (session) => {
    setGameSession(session);
    navigate('/game');
  };

  // Handle game end
  const handleGameEnd = (result) => {
    setGameResult(result);
    navigate('/game-end');
  };

  // Handle return to lobby
  const handleReturnToLobby = () => {
    setGameSession(null);
    setGameResult(null);
    navigate('/lobby');
  };

  // Handle return to login
  const handleReturnToLogin = () => {
    setStudentId(null);
    setGameSession(null);
    setGameResult(null);
    navigate('/');
  };

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage onLoginSuccess={handleLogin} />} />
        
        <Route path="/character-selection" element={
          studentId ? (
            <CharacterSelection
              studentId={studentId}
              onCharacterSelected={handleCharacterSelected}
              onLogout={handleReturnToLogin}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        <Route path="/lobby" element={
          studentId ? (
            <GameLobby
              studentId={studentId}
              onGameStart={handleGameStart}
              onLogout={handleReturnToLogin}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        <Route path="/game" element={
          studentId && gameSession ? (
            <Game
              studentId={studentId}
              gameSession={gameSession}
              onGameEnd={handleGameEnd}
            />
          ) : (
            <Navigate to="/lobby" replace />
          )
        } />
        
        <Route path="/game-end" element={
          gameResult ? (
            <div className="game-end-screen">
              <div className="game-end-container">
                {gameResult.isWon ? (
                  <>
                    <div className="end-emoji">🎉</div>
                    <h1>VICTORY!</h1>
                    <p>You defeated the enemy!</p>
                  </>
                ) : (
                  <>
                    <div className="end-emoji">💀</div>
                    <h1>GAME OVER</h1>
                    <p>You ran out of lives.</p>
                  </>
                )}
                <div className="end-stats">
                  <div className="end-stat">
                    <span>Final Score</span>
                    <h2>{gameResult.score}</h2>
                  </div>
                </div>
                <div className="end-actions">
                  <button className="action-btn" onClick={handleReturnToLobby}>
                    BACK TO LOBBY
                  </button>
                  <button className="action-btn secondary" onClick={handleReturnToLogin}>
                    BACK TO LOGIN
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Navigate to="/lobby" replace />
          )
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
