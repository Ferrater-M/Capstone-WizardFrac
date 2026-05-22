import React, { useState, useEffect } from 'react';
import './game-lobby.css';

const GameLobby = ({ studentId, onGameStart }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedStage, setSelectedStage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch game progress
    fetch(`http://localhost:8080/api/game-progress/${studentId}`)
      .then(res => {
        if (res.status === 404) {
          // Create new game progress
          setGameProgress({
            similarIslandMaxStage: 0,
            dissimilarIslandUnlocked: false,
            hybridIslandUnlocked: false,
          });
        } else {
          return res.json().then(data => setGameProgress(data));
        }
        setLoading(false);
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            islandType: selectedIsland,
            stageNumber: selectedStage,
          }),
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

  if (loading) {
    return <div className="game-lobby"><p>Loading...</p></div>;
  }

  const islands = [
    {
      name: 'Similar',
      title: 'Similar Island',
      description: 'Master fractions with same denominators',
      mechanic: 'Same Container',
      unlocked: true,
      color: '#667eea',
      image: '🏝️',
    },
    {
      name: 'Dissimilar',
      title: 'Dissimilar Island',
      description: 'Conquer the Butterfly Method',
      mechanic: 'Butterfly Method',
      unlocked: gameProgress?.dissimilarIslandUnlocked || false,
      color: '#764ba2',
      image: '🏰',
    },
    {
      name: 'Hybrid',
      title: 'Hybrid Island',
      description: 'Master mixed number conversions',
      mechanic: 'Mixed Conversion',
      unlocked: gameProgress?.hybridIslandUnlocked || false,
      color: '#f093fb',
      image: '⚔️',
    },
  ];

  return (
    <div className="game-lobby">
      <div className="lobby-container">
        <h1 className="lobby-title">WIZARD ISLANDS</h1>
        <p className="lobby-subtitle">Choose your adventure</p>

        {error && <div className="error-message">{error}</div>}

        <div className="islands-grid">
          {islands.map(island => (
            <div
              key={island.name}
              className={`island-card ${
                selectedIsland === island.name ? 'selected' : ''
              } ${!island.unlocked ? 'locked' : ''}`}
              onClick={() => {
                if (island.unlocked) {
                  setSelectedIsland(island.name);
                  setSelectedStage(1);
                }
              }}
              style={{
                borderColor: island.color,
                opacity: island.unlocked ? 1 : 0.6,
              }}
            >
              <div className="island-emoji">{island.image}</div>
              <h3>{island.title}</h3>
              <p className="description">{island.description}</p>
              <p className="mechanic">Mechanic: {island.mechanic}</p>
              {!island.unlocked && (
                <div className="lock-overlay">
                  <span className="lock-icon">🔒</span>
                  <p>Unlock by completing previous island</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedIsland && (
          <div className="stage-selector">
            <h3>Select Stage</h3>
            <div className="stage-buttons">
              {[1, 2, 3, 4, 5].map(stage => (
                <button
                  key={stage}
                  className={`stage-btn ${selectedStage === stage ? 'active' : ''}`}
                  onClick={() => setSelectedStage(stage)}
                >
                  Stage {stage}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="lobby-actions">
          <button
            className="start-btn"
            onClick={handleStartStage}
            disabled={!selectedIsland}
          >
            START GAME
          </button>
        </div>

        {gameProgress && (
          <div className="progress-stats">
            <div className="stat">
              <h4>Total Games Won</h4>
              <p>{gameProgress.totalGamesWon || 0}</p>
            </div>
            <div className="stat">
              <h4>Total Score</h4>
              <p>{gameProgress.totalScore || 0}</p>
            </div>
            <div className="stat">
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
