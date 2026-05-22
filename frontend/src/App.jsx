import { useState } from 'react';
import './App.css';
import LandingPage from './pages/login';
import CharacterSelection from './pages/character-selection';
import GameLobby from './pages/game-lobby';
import Game from './pages/game';

function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // login, character-selection, game-lobby, game, game-end
  const [studentId, setStudentId] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  // Handle login completion
  const handleLogin = (student) => {
    setStudentId(student.studentId);
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

  // Handle return to lobby
  const handleReturnToLobby = () => {
    setGameSession(null);
    setGameResult(null);
    setCurrentScreen('game-lobby');
  };

  // Handle return to login
  const handleReturnToLogin = () => {
    setStudentId(null);
    setGameSession(null);
    setGameResult(null);
    setCurrentScreen('login');
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
          studentId={studentId}
          onGameStart={handleGameStart}
        />
      )}
      
      {currentScreen === 'game' && gameSession && (
        <Game
          studentId={studentId}
          gameSession={gameSession}
          onGameEnd={handleGameEnd}
        />
      )}
      
      {currentScreen === 'game-end' && gameResult && (
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
      )}
    </div>
  );
}

export default App;
