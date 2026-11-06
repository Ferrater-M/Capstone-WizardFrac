import React from 'react';
import './GameEndPopup.css';

// After a battle: a pop-up in the same style as the Correct/Incorrect pop-ups (black box, thick white
// border, square white corners; green for victory, red for defeat). "Next Level" only shows when there
// is a next enemy on this island.
const Frame = () => (
  <>
    <span className="gep-line" />
    {['tl', 'tr', 'bl', 'br'].map(c => <span key={c} className={`gep-corner ${c}`} />)}
    {['tl', 'tr', 'bl', 'br'].map(c => <span key={`i${c}`} className={`gep-dot ${c}`} />)}
  </>
);

const GameEndPopup = ({ isWon, score, bonus, hasNextLevel, error, onNextLevel, onLobby, onLogin }) => (
  <div className="gep-backdrop">
    <div className={`gep-box ${isWon ? 'is-won' : 'is-lost'}`} role="dialog" aria-modal="true" aria-label={isWon ? 'Victory' : 'Defeat'}>
      <Frame />
      <h1 className="gep-title">{isWon ? 'VICTORY!' : 'DEFEAT!'}</h1>
      <p className="gep-text">{isWon ? 'You defeated the enemy!' : 'You ran out of lives.'}</p>
      <p className="gep-score">Score: {score}{bonus ? ` + ${bonus}` : ''}</p>
      {error && <p className="gep-error">{error}</p>}
      <div className="gep-actions">
        {hasNextLevel && (
          <button type="button" className="gep-btn is-primary" onClick={onNextLevel}>
            <Frame />▶ Next Level
          </button>
        )}
        <button type="button" className="gep-btn" onClick={onLobby}><Frame />Back to Lobby</button>
        <button type="button" className="gep-btn" onClick={onLogin}><Frame />Back to Login</button>
      </div>
    </div>
  </div>
);

export default GameEndPopup;
