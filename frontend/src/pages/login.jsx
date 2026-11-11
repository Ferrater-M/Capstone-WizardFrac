import { useState } from 'react';
import './login.css';
import PixelC from '../components/PixelC';
import GalaxyBackground from '../components/GalaxyBackground';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

// Square border + thin inner line + pixel corner squares, as on the island selection screen.
const PixelCorners = ({ color = 'var(--gl-border)', edge = -6 }) => (
  <>
    <div className="pixel-inner-line" style={{ borderColor: color }} />
    {[[edge, edge], [null, edge], [edge, null], [null, null]].map(([t, l], i) => (
      <div
        key={i}
        className="pixel-corner"
        style={{ background: color, ...(t !== null ? { top: t } : { bottom: edge }), ...(l !== null ? { left: l } : { right: edge }) }}
      />
    ))}
  </>
);

const LandingPage = ({ onLoginSuccess, onBack }) => {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'form' | 'claim' (unclaimed nickname — offer to claim it) |
  // 'set-password' (claiming: choose a password) | 'password' (claimed nickname — log in) |
  // 'forgot' (password reset by email)
  const [step, setStep] = useState('form');
  // POST /login — password is only needed once the nickname is claimed; the
  // backend itself enforces that (see StudentController).
  const loginRequest = async (pw) => {
    const response = await fetch(`${API_BASE}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim(), ...(pw ? { password: pw } : {}) }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  };

  // Step 1: ask the backend whether this nickname is already claimed, and
  // branch to the matching prompt.
  const handleContinue = async (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) { setError('Please enter a nickname'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/check-nickname?nickname=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setStep(data.hasPassword ? 'password' : 'claim');
    } catch (err) {
      setError('Connection error. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => { setStep('form'); setPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); };
  const handleGoToSetPassword = () => { setNewPassword(''); setConfirmPassword(''); setError(''); setStep('set-password'); };
  const handleGoToForgot = () => { setResetSent(false); setError(''); setStep('forgot'); };

  // I FORGOT: the server emails a reset link to this nickname's VERIFIED email (set in Settings).
  // Its answer is the same whether or not the wizard has an email, so the screen can't say which.
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return; }
      setResetSent(true);
    } catch (err) {
      setError('Connection error. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Claim step 2: create the player and set the password in ONE request (POST /register) —
  // it used to take two trips to the server (/login, then /{id}/password).
  const handleClaim = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || 'Failed to create your account. Please try again.'); return; }
      onLoginSuccess(data);
    } catch (err) {
      setError('Connection error. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) { setError('Please enter your password.'); return; }
    setError('');
    setLoading(true);
    const { ok, data } = await loginRequest(password);
    if (ok) onLoginSuccess(data);
    else setError(data.error || 'Incorrect password.');
    setLoading(false);
  };

  return (
    <div className="login-container">
      <GalaxyBackground pixelClouds />

      {/* Top Left Logo */}
      <div className="logo-area">
        <h1 className="logo-text">WIZARDFRA<PixelC /></h1>
        <div className="logo-banner">
          <span>MASTER FRACTIONS. CAST SPELLS. SAVE THE ISLANDS!</span>
        </div>
      </div>

      {/* Wizard standee, bottom-left */}
      <img
        className="wizard-standee"
        src="/PlayerAssets/WizardBoyStandee.png"
        alt="Young wizard"
      />

      {/* Right Side Panel */}
      <div className="panel-container">
        <div className="panel">
          {/* Back to the Title Page */}
          {onBack && (
            <button type="button" className="panel-close" onClick={onBack} aria-label="Back to the title page">
              X
            </button>
          )}
          <PixelCorners />
          <div className="panel-gem"><span /></div>

          <div className="panel-content">
            {step === 'form' && (
              <>
                <h2 className="welcome-text">WELCOME BACK,</h2>
                <h3 className="wizard-text">YOUNG WIZARD!</h3>

                <div className="separator">
                  <span className="sep-line"></span>
                  <span className="sep-diamond"></span>
                  <span className="sep-line"></span>
                </div>

                <p className="panel-subtitle">Enter your nickname to begin your adventure!</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleContinue} className="login-form">
                  <div>
                    <label className="input-label" htmlFor="nickname-input">NICKNAME</label>
                    <div className="input-group">
                      <input
                        id="nickname-input"
                        type="text"
                        placeholder="Enter your nickname..."
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={loading}
                        required
                        maxLength={16}
                      />
                    </div>
                    <p className="input-hint">3–16 characters</p>
                  </div>

                  <div className="tip-box">
                    <span>Tip: Use a name that other wizards will remember!</span>
                  </div>

                  <div className="button-container">
                    <button type="submit" className="start-btn" disabled={loading}>
                      <span>{loading ? 'JOINING...' : 'JOIN'}</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'claim' && (
              <>
                <h2 className="welcome-text">WANT TO JOIN?</h2>
                <h3 className="wizard-text">CLAIM YOUR NAME</h3>

                <div className="separator">
                  <span className="sep-line"></span>
                  <span className="sep-diamond"></span>
                  <span className="sep-line"></span>
                </div>

                {error && <div className="error-message">{error}</div>}

                <p className="panel-subtitle prompt-message">
                  The nickname <strong>{nickname.trim()}</strong> hasn't been claimed yet. Set a
                  password to claim it as yours.
                </p>

                <div className="prompt-actions">
                  <button type="button" className="prompt-btn prompt-btn-back" onClick={handleBackToForm} disabled={loading}>BACK</button>
                  <button type="button" className="prompt-btn prompt-btn-primary" onClick={handleGoToSetPassword} disabled={loading}>
                    CLAIM IT
                  </button>
                </div>
              </>
            )}

            {step === 'set-password' && (
              <>
                <h2 className="welcome-text">CLAIM</h2>
                <h3 className="wizard-text">{nickname.trim()}</h3>

                <div className="separator">
                  <span className="sep-line"></span>
                  <span className="sep-diamond"></span>
                  <span className="sep-line"></span>
                </div>

                {error && <div className="error-message">{error}</div>}

                <p className="panel-subtitle prompt-message">
                  Choose a password so you can log back in as <strong>{nickname.trim()}</strong> later.
                </p>

                <form onSubmit={handleClaim} className="login-form">
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <p className="input-hint">At least 4 characters</p>

                  <div className="prompt-actions">
                    <button type="button" className="prompt-btn prompt-btn-back" onClick={() => setStep('claim')} disabled={loading}>BACK</button>
                    <button type="submit" className="prompt-btn prompt-btn-primary" disabled={loading}>
                      {loading ? '...' : 'CONFIRM'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'password' && (
              <>
                <h2 className="welcome-text">GOOD TO SEE YOU</h2>
                <h3 className="wizard-text">AGAIN, WIZARD!</h3>

                <div className="separator">
                  <span className="sep-line"></span>
                  <span className="sep-diamond"></span>
                  <span className="sep-line"></span>
                </div>

                {error && <div className="error-message">{error}</div>}

                <p className="panel-subtitle prompt-message">
                  The nickname <strong>{nickname.trim()}</strong> is already claimed. Enter your
                  password to log back in.
                </p>

                <form onSubmit={handleLogin} className="login-form">
                  <div className="input-group">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  <div className="prompt-actions">
                    <button type="button" className="prompt-btn prompt-btn-back" onClick={handleBackToForm} disabled={loading}>BACK</button>
                    <button type="button" className="prompt-btn prompt-btn-secondary" disabled={loading} onClick={handleGoToForgot}>
                      I FORGOT
                    </button>
                    <button type="submit" className="prompt-btn prompt-btn-primary" disabled={loading}>
                      {loading ? '...' : 'LOGIN'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'forgot' && (
              <>
                <h2 className="welcome-text">FORGOT YOUR</h2>
                <h3 className="wizard-text">PASSWORD?</h3>

                <div className="separator">
                  <span className="sep-line"></span>
                  <span className="sep-diamond"></span>
                  <span className="sep-line"></span>
                </div>

                {error && <div className="error-message">{error}</div>}

                {resetSent ? (
                  <>
                    <p className="panel-subtitle prompt-message">
                      If <strong>{nickname.trim()}</strong> has a verified email, we sent a reset link to it.
                      Open your email and click the link! It works for 1 hour.
                    </p>
                    <p className="panel-subtitle prompt-message">
                      No email? Ask your teacher or a grown-up for help.
                    </p>
                    <div className="prompt-actions">
                      <button type="button" className="prompt-btn prompt-btn-back" onClick={() => setStep('password')}>BACK</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="panel-subtitle prompt-message">
                      We can send a link to the email verified for <strong>{nickname.trim()}</strong>,
                      so you can choose a new password.
                    </p>
                    <form onSubmit={handleRequestReset} className="login-form">
                      <div className="prompt-actions">
                        <button type="button" className="prompt-btn prompt-btn-back" onClick={() => setStep('password')} disabled={loading}>BACK</button>
                        <button type="submit" className="prompt-btn prompt-btn-primary" disabled={loading} autoFocus>
                          {loading ? '...' : 'SEND LINK'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
