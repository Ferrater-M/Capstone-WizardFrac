import React, { useState } from 'react';
import './IslandInterior.css';

const IslandInterior = ({ island, maxStage = 0, onSelectLevel, onBack }) => {
  // Start on the first uncompleted level (or boss if all done)
  const defaultLevel = Math.min(maxStage + 1, 6);
  const [selectedLevel, setSelectedLevel] = useState(defaultLevel);

  // Level N is unlocked if the previous level has been completed
  const isUnlocked = (level) => true;
  const isCompleted = (level) => maxStage >= level;

  const getIslandBackground = () => {
    switch (island.name) {
      case 'Similar':
        return { backgroundImage: 'url(/SimilarWalkableArea.png)' };
      case 'Dissimilar':
        return { backgroundImage: 'url(/DisilimarBackground.jpg)' };
      case 'Hybrid':
        return { backgroundImage: 'url(/HybridBackground.jpg)' };
      default:
        return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
    }
  };

  const getLevelLabel = (level) => {
    if (level === 6) return 'Boss';
    return `Level ${level}`;
  };

  const getLevelStyle = (level) => {
    const base = {
      position: 'relative',
      padding: '12px 20px',
      fontSize: '15px',
      fontWeight: 'bold',
      borderRadius: '10px',
      cursor: isUnlocked(level) ? 'pointer' : 'not-allowed',
      border: '2px solid transparent',
      transition: 'all 0.2s',
      minWidth: '110px',
    };

    if (!isUnlocked(level)) {
      return { ...base, background: '#374151', color: '#6b7280', border: '2px solid #4b5563' };
    }
    if (selectedLevel === level) {
      return { ...base, background: level === 6 ? '#7c3aed' : '#3b82f6', color: '#fff', border: '2px solid #fff', boxShadow: '0 0 12px rgba(255,255,255,0.4)' };
    }
    if (isCompleted(level)) {
      return { ...base, background: '#065f46', color: '#6ee7b7', border: '2px solid #10b981' };
    }
    return { ...base, background: '#1e3a5f', color: '#93c5fd', border: '2px solid #3b82f6' };
  };

  return (
    <div className="island-interior" style={getIslandBackground()}>
      <div className="interior-overlay">
        <div className="interior-header">
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h1>{island.title}</h1>
        </div>

        <div className="interior-content">
          <div className="island-description">
            <h3>Welcome to {island.title}!</h3>
            <p>{island.description}</p>
            <p><strong>Mechanic:</strong> {island.mechanic}</p>
          </div>

          <div className="level-selector">
            <h3>Select Level</h3>
            <div className="level-buttons">
              {[1, 2, 3, 4, 5, 6].map(level => (
                <button
                  key={level}
                  style={getLevelStyle(level)}
                  disabled={!isUnlocked(level)}
                  onClick={() => isUnlocked(level) && setSelectedLevel(level)}
                >
                  {/* Status icon */}
                  {!isUnlocked(level) && <span style={{ marginRight: 6 }}>🔒</span>}
                  {isCompleted(level) && <span style={{ marginRight: 6 }}>✓</span>}
                  {level === 6 && isUnlocked(level) && !isCompleted(level) && <span style={{ marginRight: 6 }}>👑</span>}

                  {getLevelLabel(level)}
                </button>
              ))}
            </div>

            {/* Progress info */}
            <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '10px' }}>
              {maxStage === 0
                ? 'Complete Level 1 to unlock the next level.'
                : maxStage >= 6
                ? 'All levels completed!'
                : `${maxStage} / 6 levels completed — Level ${maxStage + 1} is next.`}
            </p>
          </div>

          <button
            className="start-level-btn"
            disabled={!isUnlocked(selectedLevel)}
            onClick={() => onSelectLevel(selectedLevel)}
            style={{ opacity: isUnlocked(selectedLevel) ? 1 : 0.5, cursor: isUnlocked(selectedLevel) ? 'pointer' : 'not-allowed' }}
          >
            {selectedLevel === 6 ? '⚔️ Fight the Boss' : `▶ Start Level ${selectedLevel}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IslandInterior;
