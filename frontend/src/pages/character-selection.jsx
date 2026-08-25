import React, { useState, useEffect } from 'react';
import './character-selection.css';
import LoadingScreen from '../components/LoadingScreen';

const CHARACTER_TRAITS = {
  boy: [
    { icon: '✦', label: 'Balanced' },
    { icon: '📖', label: 'Support' },
    { icon: '🌀', label: 'Magic' },
  ],
  girl: [
    { icon: '✦', label: 'High Magic' },
    { icon: '🏹', label: 'Ranged' },
    { icon: '💎', label: 'Agile' },
  ],
};

const getGenderKey = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('girl')) return 'girl';
  if (n.includes('boy')) return 'boy';
  return null;
};

const CharacterSelection = ({ studentId, onCharacterSelected, onBack }) => {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available characters from backend
    fetch('http://localhost:8082/api/characters')
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
        `http://localhost:8082/api/characters/select/${studentId}`,
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
    return <LoadingScreen message="LOADING CHARACTERS..." />;
  }

  return (
    <div className="character-selection">
      <div className="nav-bar">
        <div className="nav-logo">
          <span>WIZARDFRAC</span>
        </div>
        <button type="button" className="menu-btn" onClick={onBack}>← Back to Main</button>
      </div>

      <div className="character-selection-container">
        <div className="cs-title-row">
          <span className="cs-title-deco">✦───✦</span>
          <h1 className="cs-title">Choose Your Wizard</h1>
          <span className="cs-title-deco">✦───✦</span>
        </div>
        <p className="cs-subtitle">Select a character to begin your magical journey.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="characters-grid">
          {characters
            .filter(c => c.rarity !== 'Common')
            .filter(c => c.name !== 'Ember Sage' && c.name !== 'Frost Warden')
            .map(character => {
              const displayName = character.name;
              const genderKey = getGenderKey(character.name);
              const traits = CHARACTER_TRAITS[genderKey] || [];
              return (
                <div
                  key={character.id}
                  className={`character-card ${selectedCharacterId === character.id ? 'selected' : ''}`}
                  onClick={() => handleSelectCharacter(character.id)}
                >
                  <div className="character-ribbon">
                    <span className="character-ribbon-icon">✦</span>
                    {displayName.toUpperCase()}
                  </div>
                  {genderKey && (
                    <div className="character-gender-badge">
                      {genderKey === 'girl' ? '♀' : '♂'}
                    </div>
                  )}

                  <div className="character-image">
                    {getCharacterCardImage(character) ? (
                      <img src={getCharacterCardImage(character)} alt={displayName} />
                    ) : (
                      <div className="image-placeholder"></div>
                    )}
                    {selectedCharacterId === character.id && (
                      <div className="selected-overlay">
                        <span className="check-icon">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="character-divider"><span>✦</span></div>

                  <div className="character-info">
                    <p className="description">{character.description}</p>
                    {traits.length > 0 && (
                      <div className="character-traits">
                        {traits.map(trait => (
                          <span key={trait.label} className="trait-pill">
                            <span className="trait-icon">{trait.icon}</span>
                            {trait.label}
                          </span>
                        ))}
                      </div>
                    )}
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
            <span className="confirm-btn-deco">✦</span> SELECT <span className="confirm-btn-deco">✦</span>
          </button>
        </div>

        <div className="cs-hint">
          <span className="cs-hint-icon">💡</span> You can change your character later in the settings.
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
