import React, { useState, useEffect } from 'react';
import './character-selection.css';

const CharacterSelection = ({ studentId, onCharacterSelected }) => {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available characters from backend
    fetch('http://localhost:8080/api/characters')
      .then(res => res.json())
      .then(data => {
        setCharacters(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load characters');
        setLoading(false);
        console.error(err);
      });
  }, []);

  const handleSelectCharacter = (characterId) => {
    setSelectedCharacterId(characterId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedCharacterId) {
      setError('Please select a character');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/characters/select/${studentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            characterId: selectedCharacterId,
            characterName: characters.find(c => c.id === selectedCharacterId)?.name,
          }),
        }
      );

      if (response.ok) {
        const character = characters.find(c => c.id === selectedCharacterId);
        onCharacterSelected(character);
      } else {
        setError('Failed to select character');
      }
    } catch (err) {
      setError('Error saving character selection');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="character-selection"><p>Loading characters...</p></div>;
  }

  return (
    <div className="character-selection">
      {/* Top Navigation Bar as requested in wireframe */}
      <div className="nav-bar">
        <div className="nav-logo">
          <span>WIZARDFRAC</span>
        </div>
        <div className="nav-menu">
          <button className="menu-btn">MENU</button>
        </div>
      </div>

      <div className="character-selection-container">
        {error && <div className="error-message">{error}</div>}

        <div className="characters-grid">
          {characters.filter(c => c.rarity !== 'Common').map(character => {
            const displayName = character.name.includes('Boy') ? 'Boy' : character.name.includes('Girl') ? 'Girl' : character.name;
            return (
              <div
                key={character.id}
                className={`character-card ${selectedCharacterId === character.id ? 'selected' : ''}`}
                onClick={() => handleSelectCharacter(character.id)}
              >
                <div className="character-image">
                  {/* Using a magical CSS gradient placeholder if image fails to load, or show the image */}
                  {character.imageUrl ? (
                    <img src={character.imageUrl} alt={displayName} />
                  ) : (
                    <div className="image-placeholder"></div>
                  )}
                  {selectedCharacterId === character.id && (
                    <div className="selected-overlay">
                      <span className="check-icon">✓</span>
                    </div>
                  )}
                </div>
                <div className="character-label">
                  {displayName}
                </div>
                <div className="character-info">
                  <span className={`rarity badge-${character.rarity.toLowerCase()}`}>{character.rarity}</span>
                  <p className="description">{character.description}</p>
                  <div className="stats">
                    <span className="stat-pill">♥ {character.initialHealth} HP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="selection-actions">
          <button
            className="confirm-btn"
            onClick={handleConfirmSelection}
            disabled={!selectedCharacterId}
          >
            SELECT
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
