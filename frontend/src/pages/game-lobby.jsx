import React, { useState, useEffect } from 'react';
import './game-lobby.css';
import IslandInterior from './IslandInterior';

const GameLobby = ({ studentId, selectedCharacter, onGameStart, onOpenDashboard }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [showInterior, setShowInterior] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [character, setCharacter] = useState(selectedCharacter);

  useEffect(() => {
    setCharacter(selectedCharacter);
  }, [selectedCharacter]);

  useEffect(() => {
    let isMounted = true;

    const loadGameProgress = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/game-progress/${studentId}`);
        if (!isMounted) return;

        if (res.status === 404) {
          setGameProgress({
            similarIslandMaxStage: 0,
            dissimilarIslandUnlocked: false,
            hybridIslandUnlocked: false,
          });
        } else {
          const data = await res.json();
          setGameProgress(data);
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
        setGameProgress({
          similarIslandMaxStage: 0,
          dissimilarIslandUnlocked: false,
          hybridIslandUnlocked: false,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadGameProgress();

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  useEffect(() => {
    if (selectedCharacter || !studentId) {
      return;
    }

    let isMounted = true;
    const loadSelectedCharacter = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/characters/student/${studentId}`);
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

  const handleEnterIsland = (island) => {
    if (island.unlocked) {
      setSelectedIsland(island);
      setShowInterior(true);
      setSelectedLevel(1);
    }
  };

  const handleBackToLobby = () => {
    setShowInterior(false);
    setSelectedIsland(null);
    setSelectedLevel(1);
  };

  const handleSelectLevel = async (level) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/game-lobby/start-stage/${studentId}`,
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
        onGameStart({ ...gameSession, level: level, isBoss: level === 6 });
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
      maxStage: gameProgress?.similarIslandMaxStage || 0,
      color: '#667eea',
      image: '/SimilarIsland.png',
    },
    {
      name: 'Dissimilar',
      title: 'Dissimilar Island',
      description: 'Conquer the Butterfly Method',
      mechanic: 'Butterfly Method',
      unlocked: true,
      maxStage: gameProgress?.dissimilarIslandMaxStage || 0,
      color: '#764ba2',
      image: '/DisimilarIsland.png',
    },
    {
      name: 'Hybrid',
      title: 'Hybrid Island',
      description: 'Master mixed number conversions',
      mechanic: 'Mixed Conversion',
      unlocked: true,
      maxStage: gameProgress?.hybridIslandMaxStage || 0,
      color: '#f093fb',
      image: '/HybridIsland.png',
    },
  ];

  if (showInterior && selectedIsland) {
    return (
      <IslandInterior
        island={selectedIsland}
        maxStage={selectedIsland.maxStage}
        onSelectLevel={handleSelectLevel}
        onBack={handleBackToLobby}
      />
    );
  }

  return (
    <div className="game-lobby">
      {character && (
        <div className="selected-character-banner">
          <strong>Character:</strong> {character.name}
        </div>
      )}
      <div className="lobby-container">
        <h1 className="lobby-title">WIZARD ISLANDS</h1>
        <p className="lobby-subtitle">Choose your adventure</p>

        {error && <div className="error-message">{error}</div>}

        <div className="lobby-actions">
          <button className="dashboard-btn" onClick={onOpenDashboard}>
            📊 Progress Dashboard
          </button>
        </div>

        <div className="islands-grid">
          {islands.map(island => (
            <div
              key={island.name}
              className={`island-card-wrapper ${!island.unlocked ? 'locked' : ''}`}
              onClick={() => handleEnterIsland(island)}
              style={{
                opacity: island.unlocked ? 1 : 0.6,
              }}
            >
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
              <div className="island-info">
                <h3>{island.title}</h3>
                <p className="description">{island.description}</p>
                <p className="mechanic">Mechanic: {island.mechanic}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default GameLobby;
