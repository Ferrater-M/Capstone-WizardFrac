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

  const getGenderIcon = (name) => {
    if (name.toLowerCase().includes('girl')) {
      return '/Female.png';
    }
    if (name.toLowerCase().includes('boy')) {
      return '/Male.png';
    }
    return null;
  };

  const getCharacterCardImage = (character) => {
    if (character.name.toLowerCase().includes('girl')) {
      return '/Female.png';
    }
    if (character.name.toLowerCase().includes('boy')) {
      return '/Male.png';
    }
    return character.imageUrl || '/Female.png';
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
          {characters
            .filter(c => c.rarity !== 'Common')
            .filter(c => c.name !== 'Ember Sage' && c.name !== 'Frost Warden')
            .map(character => {
              const displayName = character.name;
              return (
              <div
                key={character.id}
                className={`character-card ${selectedCharacterId === character.id ? 'selected' : ''}`}
                onClick={() => handleSelectCharacter(character.id)}
              >
                <div className="character-image">
                  {/* Using a magical CSS gradient placeholder if image fails to load, or show the image */}
                  {getCharacterCardImage(character) ? (
                    <img src={getCharacterCardImage(character)} alt={displayName} />
                  ) : (
                    <div className="image-placeholder"></div>
                  )}
                  {getGenderIcon(character.name) && (
                    <div className="gender-badge">
                      <img className="gender-icon" src={getGenderIcon(character.name)} alt="gender icon" />
                    </div>
                  )}
                  <div className="character-name-badge">{displayName}</div>
                  {selectedCharacterId === character.id && (
                    <div className="selected-overlay">
                      <span className="check-icon">✓</span>
                    </div>
                  )}
                </div>
                <div className="character-info">
                  <p className="description">{character.description}</p>
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
