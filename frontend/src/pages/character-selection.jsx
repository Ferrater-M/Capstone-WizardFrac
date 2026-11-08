import React, { useState, useEffect } from 'react';
import './character-selection.css';
import LoadingScreen from '../components/LoadingScreen';
import GalaxyBackground from '../components/GalaxyBackground';
import MagicFloatLayer from '../components/MagicFloatLayer';
import SettingsPage from './SettingsPage';
import { API_BASE_URL } from '../config';

// The same idle sprite sheets the player uses in battle and in the level selection (square frames in a row)
const IDLE_SPRITES = {
  boy: '/PlayerAssets/wizard/wizardIdle.png',
  girl: '/PlayerAssets/witch/witchIdle.png',
};

// Plays a sprite sheet's frames on a loop, filling the height it's given (square frames, pixel-sharp)
const IdleSprite = ({ src, label, className = '' }) => {
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setFrames(Math.max(1, Math.round(img.naturalWidth / img.naturalHeight))); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  if (!frames) return null;
  return (
    <div className={`cs-sprite-wrap ${className}`}>
    <div className="cs-sprite-shadow" />
    <div
      className="cs-sprite"
      role="img"
      aria-label={label}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${frames * 100}% 100%`,
        animation: frames > 1 ? `csSpriteFrames ${(frames / 8).toFixed(2)}s steps(${frames}, jump-none) infinite` : 'none',
        '--cs-frames': frames,
      }}
    />
    </div>
  );
};

// Square border + thin inner line + pixel corner squares, as on the dashboard and island selection.
const PixelCorners = ({ color = 'var(--cs-border)', edge = 0 }) => (
  <>
    <div className="cs-inner-line" style={{ borderColor: color }} />
    {[[edge, edge], [null, edge], [edge, null], [null, null]].map(([t, l], i) => (
      <div
        key={i}
        className="cs-corner"
        style={{
          background: color,
          ...(t !== null ? { top: t } : { bottom: edge }),
          ...(l !== null ? { left: l } : { right: edge }),
        }}
      />
    ))}
  </>
);

const getGenderKey = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('girl')) return 'girl';
  if (n.includes('boy')) return 'boy';
  return null;
};

const CharacterSelection = ({ studentId, onCharacterSelected, onBack, onMasterVolumeChanged }) => {
  const [showVolume, setShowVolume] = useState(false);   // the Title Page's volume pop-up
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch available characters from backend
    fetch(`${API_BASE_URL}/api/characters`)
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

  const getCharacterSprite = (character) => IDLE_SPRITES[getGenderKey(character.name)] || IDLE_SPRITES.boy;

  const handleConfirmSelection = async () => {
    if (!selectedCharacterId) {
      setError('Please select a character');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/characters/select/${studentId}`,
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
      <GalaxyBackground pixelClouds />
      <MagicFloatLayer />
      <div className="nav-bar">
        {/* The Title Page / login logo */}
        <h2 className="cs-logo">WIZARDFRAC</h2>
        <div className="nav-buttons">
          <button type="button" className="menu-btn" onClick={onBack}>
            <PixelCorners />
            Back
          </button>
          <button type="button" className="menu-btn" onClick={() => setShowVolume(true)}>
            <PixelCorners />
            Volume
          </button>
        </div>
      </div>

      {/* Same volume pop-up as the Title Page's Volume button */}
      {showVolume && (
        <SettingsPage
          volumeOnly
          hideExit
          onBack={() => setShowVolume(false)}
          onMasterVolumeChanged={onMasterVolumeChanged}
        />
      )}

      <div className="character-selection-container">
        <div className="cs-title-box">
          <PixelCorners edge={-6} />
          <div className="cs-title-gem"><span /></div>
          <div className="cs-title-row">
            <h1 className="cs-title">Choose Your Wizard</h1>
          </div>
          <p className="cs-subtitle"><span className="cs-star">★</span> Select a character to begin your magical journey. <span className="cs-star">★</span></p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="characters-grid">
          {characters
            .filter(c => c.rarity !== 'Common')
            .filter(c => c.name !== 'Ember Sage' && c.name !== 'Frost Warden')
            .map(character => {
              const displayName = character.name;
              const genderKey = getGenderKey(character.name);
              return (
                <div
                  key={character.id}
                  className={`character-card ${selectedCharacterId === character.id ? 'selected' : ''}`}
                  onClick={() => handleSelectCharacter(character.id)}
                >
                  <PixelCorners color={selectedCharacterId === character.id ? 'var(--cs-gold)' : 'var(--cs-border)'} />
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
                    <IdleSprite src={getCharacterSprite(character)} label={displayName} className={`cs-sprite-${genderKey || 'boy'}`} />
                    {selectedCharacterId === character.id && (
                      <div className="selected-overlay">
                        <span className="check-icon">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="character-divider"><span>✦</span></div>

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
            <PixelCorners color="var(--cs-gold)" />
            <span className="confirm-btn-deco">✦</span> SELECT <span className="confirm-btn-deco">✦</span>
          </button>
        </div>

        <div className="cs-hint">
          You can change your character later in the settings.
        </div>
      </div>
    </div>
  );
};

export default CharacterSelection;
