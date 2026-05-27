import { useState } from 'react';
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
    setCurrentScreen('game-lobby');
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
            gameSession={gameSession}
            onGameEnd={handleGameEnd}
            onExitToLobby={handleExitToLobby}
          />
        );
      case 'Dissimilar':
        return (
          <DissimilarIslandGame
            studentId={studentId}
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
          studentId={studentId}
          selectedCharacter={selectedCharacter}
          onGameStart={handleGameStart}
          onOpenDashboard={handleOpenDashboard}
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
        <div className="game-end-screen">
          <div className="game-end-container">
            {gameResult.isWon ? (
              <>
                <div className="end-emoji">🎉</div>
                <h1>VICTORY!</h1>
                <p>You defeated the enemy!</p>
                
                {gameSession?.isBoss && (
                  <div className="rewards-section">
                    <h2>🎁 Boss Rewards!</h2>
                    <div className="rewards-list">
                      <div className="reward-item">
                        <span className="reward-icon">⭐</span>
                        <span className="reward-text">+500 Bonus Points</span>
                      </div>
                      <div className="reward-item">
                        <span className="reward-icon">🏆</span>
                        <span className="reward-text">Boss Slayer Badge</span>
                      </div>
                      <div className="reward-item">
                        <span className="reward-icon">🔓</span>
                        <span className="reward-text">Next Island Unlocked!</span>
                      </div>
                    </div>
                  </div>
                )}
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
                <h2>{gameResult.score}{gameSession?.isBoss ? ' + 500' : ''}</h2>
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
