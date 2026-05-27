import React, { useState } from 'react';
import './IslandInterior.css';

const IslandInterior = ({ island, onSelectLevel, onBack }) => {
  const [selectedLevel, setSelectedLevel] = useState(1);

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
                  className={`level-btn ${selectedLevel === level ? 'active' : ''}`}
                  onClick={() => setSelectedLevel(level)}
                >
                  {level === 6 ? 'Boss' : `Level ${level}`}
                </button>
              ))}
            </div>
          </div>

          <button className="start-level-btn" onClick={() => onSelectLevel(selectedLevel)}>
            Start Level {selectedLevel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IslandInterior;
