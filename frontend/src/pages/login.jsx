import React, { useState } from 'react';
import './login.css';

const LandingPage = ({ onLoginSuccess }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartGame = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/students/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (response.ok) {
        const student = await response.json();
        onLoginSuccess(student);
      } else if (response.status === 409) {
        const data = await response.json();
        setError(data.error || 'Nickname is already exist. Please use another nickname.');
      } else {
        setError('Failed to start game. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Top Left Logo Area */}
      <div className="logo-area">
        <h1 className="logo-text">WIZARDFRAC</h1>
        <div className="logo-banner">
          <span>MASTER FRACTIONS. CAST SPELLS. SAVE THE ISLANDS!</span>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="panel-container">
        <div className="panel">
          {/* Decorative inner border */}
          <div className="panel-inner-border">
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>
          </div>

          <div className="panel-gem">
            <div className="gem-inner"></div>
          </div>

          <div className="panel-content">
            <h2 className="welcome-text">WELCOME BACK,</h2>
            <h3 className="wizard-text">YOUNG WIZARD!</h3>

            <div className="separator">
              <span className="sep-line"></span>
              <span className="sep-diamond"></span>
              <span className="sep-line"></span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleStartGame} className="login-form">
              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="button-container">
                <button type="submit" className="start-btn" disabled={loading}>
                  <span>{loading ? 'LOGGING IN...' : 'START GAME'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
