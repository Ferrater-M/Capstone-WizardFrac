import React, { useState, useEffect } from 'react';
import './game-lobby.css';

const GameLobby = ({ studentId, onGameStart, onLogout }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedStage, setSelectedStage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8080/api/game-progress/${studentId}`)
      .then(res => {
        if (res.status === 404) {
          setGameProgress({
            similarIslandMaxStage: 0,
            dissimilarIslandUnlocked: false,
            hybridIslandUnlocked: false,
          });
          setLoading(false);
        } else {
          res.json().then(data => {
            setGameProgress(data);
            setLoading(false);
          });
        }
      })
      .catch(err => {
        console.error('Error fetching progress:', err);
        setGameProgress({
          similarIslandMaxStage: 0,
          dissimilarIslandUnlocked: false,
          hybridIslandUnlocked: false,
        });
        setLoading(false);
      });
  }, [studentId]);

  const handleStartStage = async () => {
    if (!selectedIsland || !selectedStage) {
      setError('Please select an island and stage');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/game-lobby/start-stage/${studentId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ islandType: selectedIsland, stageNumber: selectedStage }),
        }
      );

      if (response.ok) {
        const gameSession = await response.json();
        onGameStart(gameSession);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start game');
      }
    } catch (err) {
      setError('Error starting game');
      console.error(err);
    }
  };

  const handleExitGame = () => {
    if (onLogout) {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="game-lobby">
        <div className="lobby-loading">Loading your adventure...</div>
      </div>
    );
  }

  const islandsRow1 = [
    {
      name: 'Similar',
      title: 'Similar Island',
      description: 'Master fractions with same denominators',
      mechanic: 'Same Container',
      unlocked: true,
      themeClass: 'island-similar',
    },
    {
      name: 'Hybrid',
      title: 'Hybrid Island',
      description: 'Master mixed number conversions',
      mechanic: 'Mixed Conversion',
      unlocked: gameProgress?.hybridIslandUnlocked || false,
      themeClass: 'island-hybrid',
    },
  ];

  const islandRow2 = {
    name: 'Dissimilar',
    title: 'Dissimilar Island',
    description: 'Conquer the Butterfly Method',
    mechanic: 'Butterfly Method',
    unlocked: gameProgress?.dissimilarIslandUnlocked || false,
    themeClass: 'island-dissimilar',
  };

  const renderIslandCard = (island) => (
    <div
      key={island.name}
      className={`island-card ${island.themeClass} ${selectedIsland === island.name ? 'selected' : ''} ${!island.unlocked ? 'locked' : ''}`}
      onClick={() => {
        if (island.unlocked) {
          setSelectedIsland(island.name);
          setSelectedStage(1);
          setError('');
        }
      }}
    >
      <div className="island-image">
        <div className="island-placeholder"></div>
        {!island.unlocked && (
          <div className="lock-overlay">
            <span className="lock-icon">🔒</span>
            <p>Complete previous island to unlock</p>
          </div>
        )}
        {selectedIsland === island.name && (
          <div className="island-selected-glow"></div>
        )}
      </div>
      <div className="island-label">{island.title}</div>
    </div>
  );

  return (
    <div className="game-lobby">
      {/* Nav Bar */}
      <div className="lobby-nav">
        <div className="lobby-logo">WIZARDFRAC</div>
        <div className="lobby-menu">
          <button className="lobby-menu-btn" onClick={() => setIsMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {/* Main Menu Modal */}
      {isMenuOpen && (
        <div className="menu-overlay">
          <div className="menu-modal">
            {!showExitConfirm ? (
              <>
                <h2>GAME MENU</h2>
                <button className="menu-action-btn" onClick={() => setIsMenuOpen(false)}>RESUME</button>
                <button className="menu-action-btn" onClick={() => alert("Settings coming soon!")}>SETTINGS</button>
                <button className="menu-action-btn exit" onClick={() => setShowExitConfirm(true)}>EXIT</button>
              </>
            ) : (
              <>
                <h2>EXIT GAME?</h2>
                <p>Are you sure you want to return to the main login screen?</p>
                <div className="confirm-actions">
                  <button className="menu-action-btn confirm-yes" onClick={handleExitGame}>YES</button>
                  <button className="menu-action-btn confirm-no" onClick={() => setShowExitConfirm(false)}>NO</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="lobby-container">
        {error && <div className="error-message">{error}</div>}

        {/* Islands layout: 2 on top row, 1 centered below */}
        <div className="islands-layout">
          <div className="islands-row-top">
            {islandsRow1.map(renderIslandCard)}
          </div>
          <div className="islands-row-bottom">
            {renderIslandCard(islandRow2)}
          </div>
        </div>

        {/* Stage selector MODAL appears when an island is clicked */}
        {selectedIsland && (
          <div className="stage-modal-overlay" onClick={() => setSelectedIsland(null)}>
            <div className="stage-modal" onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setSelectedIsland(null)}>×</button>
              
              <h3>Select Level — <span>{selectedIsland} Island</span></h3>
              
              <div className="stage-buttons">
                {[1, 2, 3, 4, 5, 6].map(stage => {
                  // Basic logic to determine if a stage should be unlocked based on progress
                  // For now, let's unlock stage 1 by default, and others based on maxStage
                  let maxStage = 0;
                  if (gameProgress) {
                    if (selectedIsland === 'Similar') maxStage = gameProgress.similarIslandMaxStage || 0;
                    if (selectedIsland === 'Dissimilar') maxStage = gameProgress.dissimilarIslandMaxStage || 0;
                    if (selectedIsland === 'Hybrid') maxStage = gameProgress.hybridIslandMaxStage || 0;
                  }
                  const isUnlocked = stage <= maxStage + 1;

                  const isBoss = stage === 6;

                  return (
                    <button
                      key={stage}
                      className={`stage-btn ${selectedStage === stage ? 'active' : ''} ${!isUnlocked ? 'locked-stage' : ''} ${isBoss ? 'boss-stage' : ''}`}
                      onClick={() => {
                        if (isUnlocked) setSelectedStage(stage);
                      }}
                      disabled={!isUnlocked}
                    >
                      <span className="stage-number">{isBoss ? '💀' : stage}</span>
                      {isBoss && <span className="boss-label">BOSS</span>}
                      {!isUnlocked && <span className="stage-lock">🔒</span>}
                    </button>
                  );
                })}
              </div>
              
              <button
                className="start-game-btn"
                onClick={handleStartStage}
              >
                ENTER LEVEL
              </button>
            </div>
          </div>
        )}

        {/* Progress Stats */}

        {gameProgress && (
          <div className="progress-stats">
            <div className="stat">
              <span>🏆</span>
              <h4>Games Won</h4>
              <p>{gameProgress.totalGamesWon || 0}</p>
            </div>
            <div className="stat">
              <span>⭐</span>
              <h4>Total Score</h4>
              <p>{gameProgress.totalScore || 0}</p>
            </div>
            <div className="stat">
              <span>🎮</span>
              <h4>Games Played</h4>
              <p>{gameProgress.totalGamesPlayed || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLobby;
