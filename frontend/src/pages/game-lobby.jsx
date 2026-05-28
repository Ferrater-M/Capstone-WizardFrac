import React, { useState, useEffect } from 'react';
import './game-lobby.css';
import IslandInterior from './IslandInterior';

const GameLobby = ({ studentId, studentNickname, selectedCharacter, onGameStart, onOpenDashboard, onEnterIslandInterior, onLeaveIslandInterior, onLogout }) => {
  const [gameProgress, setGameProgress] = useState(null);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [showInterior, setShowInterior] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [character, setCharacter] = useState(selectedCharacter);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setCharacter(selectedCharacter);
  }, [selectedCharacter]);

  const loadGameProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/game-progress/${studentId}`);
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

  useEffect(() => {
    loadGameProgress();
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
      onEnterIslandInterior?.();
      setSelectedIsland(island);
      setShowInterior(true);
      setSelectedLevel(1);
    }
  };

  const handleBackToLobby = () => {
    setShowInterior(false);
    setSelectedIsland(null);
    setSelectedLevel(1);
    loadGameProgress();
    onLeaveIslandInterior?.();
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
    const liveMaxStage = (() => {
      switch (selectedIsland.name) {
        case 'Similar':    return gameProgress?.similarIslandMaxStage    || 0;
        case 'Dissimilar': return gameProgress?.dissimilarIslandMaxStage || 0;
        case 'Hybrid':     return gameProgress?.hybridIslandMaxStage     || 0;
        default:           return 0;
      }
    })();
    return (
      <IslandInterior
        island={selectedIsland}
        maxStage={liveMaxStage}
        onSelectLevel={handleSelectLevel}
        onBack={handleBackToLobby}
      />
    );
  }

  return (
    <div className="game-lobby">
      <div className="lobby-top-right">
        <button className="dashboard-btn" onClick={onOpenDashboard}>Dashboard</button>
        <button className="logout-btn" onClick={() => setShowMenu(true)}>Menu</button>
      </div>
      <div className="lobby-container">
        <div className="lobby-title-box">
          <h1 className="lobby-title">WIZARD ISLANDS</h1>
          <p className="lobby-subtitle">Choose your adventure</p>
        </div>

        {error && <div className="error-message">{error}</div>}

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
                <div className="island-info">
                  <h3>{island.title}</h3>
                  <p className="description">{island.description}</p>
                  <p className="mechanic">Mechanic: {island.mechanic}</p>
                </div>
                {!island.unlocked && (
                  <div className="lock-overlay">
                    <span className="lock-icon">🔒</span>
                    <p>Unlock by completing previous island</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {showMenu && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000,
        }}
          onClick={() => setShowMenu(false)}
        >
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '48px 56px',
            textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, fontSize: '28px', color: '#1f2937' }}>Menu</h2>
            {studentNickname && (
              <p style={{ margin: 0, fontSize: '16px', color: '#555' }}>
                <strong>Username:</strong> {studentNickname}
              </p>
            )}
            {character && (
              <p style={{ margin: 0, fontSize: '16px', color: '#555' }}>
                <strong>Character:</strong> {character.name}
              </p>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <button style={{
                padding: '12px 32px', fontSize: '16px', fontWeight: 'bold',
                background: '#e5e7eb', color: '#374151',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
              }}>
                Settings
              </button>
              <button style={{
                padding: '12px 32px', fontSize: '16px', fontWeight: 'bold',
                background: '#8b5cf6', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
              }}
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobby;
