import React, { useEffect, useRef, useState } from 'react';
import GameMenuModal from '../components/GameMenuModal';
import Toast from '../components/Toast';
import { MASTER_VOLUME_KEY, SFX_VOLUME_KEY } from '../utils/audio';
import './SettingsPage.css';

const API_BASE = 'http://localhost:8082';
const MAX_PICTURE_BYTES = 5 * 1024 * 1024; // 5MB

const readStoredVolume = (key, fallback) => {
  const raw = localStorage.getItem(key);
  const n = raw !== null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

// Pixel-bracket corner decoration — matches the in-game tutorial popups' frame.
// Purely cosmetic, absolutely positioned children of a `position: relative` panel.
// `edgeOffset` lets straddling squares (-6, the tutorial's look) be pulled fully
// inside (0) for panels that clip overflow, so they don't get cut off.
const pixelCorners = (color, edgeOffset = -6) => (
  <>
    <div style={{ position: 'absolute', inset: 5, border: `1px solid ${color}`, pointerEvents: 'none' }} />
    {[[edgeOffset, edgeOffset], [null, edgeOffset], [edgeOffset, null], [null, null]].map(([t, l], i) => (
      <div
        key={i}
        style={{
          position: 'absolute', zIndex: 10, pointerEvents: 'none', width: 12, height: 12, background: color,
          ...(t !== null ? { top: t } : { bottom: edgeOffset }),
          ...(l !== null ? { left: l } : { right: edgeOffset }),
        }}
      />
    ))}
  </>
);

const SettingsPage = ({
  studentId, studentNickname, selectedCharacter,
  onBack, onLogout, onNicknameChanged, onMasterVolumeChanged,
  volumeOnly = false, exitLabel = 'Logout', onExit,
}) => {
  const handleExit = onExit || onLogout;
  const fileInputRef = useRef(null);
  const profileSectionRef = useRef(null);
  const passwordSectionRef = useRef(null);
  const volumeSectionRef = useRef(null);
  const logoutSectionRef = useRef(null);

  const [pictureVersion, setPictureVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);

  const [nicknameInput, setNicknameInput] = useState(studentNickname || '');
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSaved, setNicknameSaved] = useState(false);

  const [hasPassword, setHasPassword] = useState(null); // null until fetched
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API_BASE}/api/students/${studentId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setHasPassword(!!data.hasPassword); })
      .catch(() => {});
  }, [studentId]);

  const [masterVolume, setMasterVolume] = useState(() => readStoredVolume(MASTER_VOLUME_KEY, 80));
  const [sfxVolume, setSfxVolume] = useState(() => readStoredVolume(SFX_VOLUME_KEY, 70));

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastKey, setToastKey] = useState(0);

  const showToast = (message) => {
    setToastMessage(message);
    setToastKey(k => k + 1);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const characterFallbackAvatar = selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png';
  const pictureUrl = studentId
    ? `${API_BASE}/api/students/${studentId}/profile-picture?v=${pictureVersion}`
    : characterFallbackAvatar;

  const handleAvatarError = (e) => {
    if (!e.currentTarget.src.endsWith(characterFallbackAvatar)) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = characterFallbackAvatar;
    }
  };

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handlePictureChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_PICTURE_BYTES) {
      setUploadError('Image is too large (max 5MB).');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(file);
      setPendingPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelPicture = () => {
    setPendingFile(null);
    setPendingPreview(null);
  };

  const handleConfirmPicture = async () => {
    if (!pendingFile) return;
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      const res = await fetch(`${API_BASE}/api/students/${studentId}/profile-picture`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload image.');
      setPictureVersion(v => v + 1);
      setPendingFile(null);
      setPendingPreview(null);
      showToast('Profile changed successfully!');
    } catch (err) {
      setUploadError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (volumeOnly) {
      handleExit();
      return;
    }
    showToast('Logged out successfully!');
    setTimeout(() => onLogout(), 900);
  };

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameError('Nickname cannot be empty.');
      return;
    }
    if (trimmed === studentNickname) return;

    setNicknameError('');
    setNicknameSaved(false);
    setSavingNickname(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/${studentId}/nickname`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update nickname.');
      onNicknameChanged?.(trimmed);
      setNicknameSaved(true);
      setTimeout(() => setNicknameSaved(false), 2500);
    } catch (err) {
      setNicknameError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    } finally {
      setSavingNickname(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSaved(false);

    if (hasPassword && !currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/${studentId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');
      setHasPassword(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSaved(true);
      showToast('Password updated!');
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="settings-overlay" onClick={onBack}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {pixelCorners('var(--st-border)', 0)}
        <Toast key={toastKey} message={toastMessage} />
        <button className="settings-close-btn" onClick={onBack} aria-label="Close settings">✕</button>

        <div className="settings-layout">
        <aside className="settings-sidebar">
          {pixelCorners('var(--st-border)')}
          <h2 className="settings-sidebar-title"><span className="settings-sparkle">✦</span> SETTINGS <span className="settings-sparkle">✦</span></h2>

          <nav className="settings-nav">
            {!volumeOnly && (
              <button className="settings-nav-item active" onClick={() => scrollTo(profileSectionRef)}>
                <span>👤</span> Profile
              </button>
            )}
            <button className={`settings-nav-item${volumeOnly ? ' active' : ''}`} onClick={() => scrollTo(volumeSectionRef)}>
              <span>🔊</span> Volume
            </button>
            {!volumeOnly && (
              <button className="settings-nav-item" onClick={() => scrollTo(passwordSectionRef)}>
                <span>🔒</span> Reset Password
              </button>
            )}
            <button className="settings-nav-item danger" onClick={() => setShowLogoutConfirm(true)}>
              <span>⏻</span> {exitLabel}
            </button>
          </nav>

          {!volumeOnly && (
            <img
              className="settings-sidebar-avatar"
              src={pictureUrl}
              alt=""
              onError={handleAvatarError}
            />
          )}
        </aside>

        <div className="settings-scroll">
        <main className="settings-content" ref={profileSectionRef}>
          <h1 className="settings-content-title">{volumeOnly ? 'Volume Settings' : 'Profile Settings'}</h1>
          <p className="settings-content-subtitle">
            {volumeOnly ? 'Adjust the game audio' : 'Manage your profile and account settings'}
          </p>

          {!volumeOnly && (
          <>
          <section className="settings-card">
            {pixelCorners('var(--st-border)')}
            <h3 className="settings-card-title">Profile Picture</h3>
            <div className="settings-picture-row">
              <div className="settings-picture-wrap">
                <img
                  className="settings-picture"
                  src={pictureUrl}
                  alt="Profile"
                  onError={handleAvatarError}
                />
                <button
                  type="button"
                  className="settings-picture-edit"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change picture"
                >
                  ✏️
                </button>
              </div>
              <p className="settings-picture-hint">
                {uploading ? 'Uploading…' : 'Change your profile picture'}
              </p>
              <button
                type="button"
                className="settings-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Change Picture'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePictureChange}
              />
            </div>
            {uploadError && <p className="settings-error">{uploadError}</p>}
          </section>

          <section className="settings-card">
            {pixelCorners('var(--st-border)')}
            <h3 className="settings-card-title">Nickname</h3>
            <div className="settings-nickname-row">
              <input
                className="settings-input"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                maxLength={30}
                disabled={savingNickname}
              />
              <button
                type="button"
                className="settings-btn"
                onClick={handleSaveNickname}
                disabled={savingNickname || !nicknameInput.trim() || nicknameInput.trim() === studentNickname}
              >
              {savingNickname ? 'Saving…' : 'Edit Nickname'}
              </button>
            </div>
            {nicknameError && <p className="settings-error">{nicknameError}</p>}
            {nicknameSaved && <p className="settings-success">Nickname updated!</p>}
          </section>
          </>
          )}

          <section className="settings-card" ref={volumeSectionRef}>
            {pixelCorners('var(--st-border)')}
            <h3 className="settings-card-title">Volume Settings</h3>
            <div className="settings-slider-row">
              <span className="settings-slider-label"><span>🔊</span> Master Volume</span>
              <input
                type="range" min="0" max="100"
                className="settings-slider"
                style={{ '--_pct': `${masterVolume}%` }}
                value={masterVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMasterVolume(v);
                  localStorage.setItem(MASTER_VOLUME_KEY, String(v));
                  onMasterVolumeChanged?.(v / 100);
                }}
              />
              <span className="settings-slider-value">{masterVolume}%</span>
            </div>
            <div className="settings-slider-row">
              <span className="settings-slider-label"><span>🎵</span> SFX Volume</span>
              <input
                type="range" min="0" max="100"
                className="settings-slider"
                style={{ '--_pct': `${sfxVolume}%` }}
                value={sfxVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSfxVolume(v);
                  localStorage.setItem(SFX_VOLUME_KEY, String(v));
                }}
              />
              <span className="settings-slider-value">{sfxVolume}%</span>
            </div>
          </section>

          {!volumeOnly && (
          <section className="settings-card" ref={passwordSectionRef}>
            {pixelCorners('var(--st-border)')}
            <h3 className="settings-card-title">Reset Password</h3>
            <p className="settings-card-subtitle">
              {hasPassword
                ? 'Change the password you use to log back in as this nickname.'
                : 'Set a password so you can log back in as this nickname later — it isn\'t claimed yet.'}
            </p>
            <div className="settings-password-fields">
              {hasPassword && (
                <input
                  className="settings-input"
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                />
              )}
              <input
                className="settings-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={savingPassword}
              />
              <input
                className="settings-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                disabled={savingPassword}
              />
              <button
                type="button"
                className="settings-btn"
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmNewPassword || (hasPassword && !currentPassword)}
              >
                {savingPassword ? 'Saving…' : hasPassword ? 'Update Password' : 'Set Password'}
              </button>
            </div>
            {passwordError && <p className="settings-error">{passwordError}</p>}
            {passwordSaved && <p className="settings-success">Password updated!</p>}
          </section>
          )}

          <section className="settings-card settings-logout-card" ref={logoutSectionRef}>
            {pixelCorners('var(--st-danger)')}
            <div>
              <h3 className="settings-card-title danger">{exitLabel}</h3>
              <p className="settings-card-subtitle">
                {volumeOnly ? 'Exit this game session' : 'Log out from your account'}
              </p>
            </div>
            <button type="button" className="settings-btn settings-btn-danger" onClick={() => setShowLogoutConfirm(true)}>
              ⏻ {exitLabel}
            </button>
          </section>
        </main>
      </div>
      </div>
      </div>

      {pendingPreview && (
        <GameMenuModal
          title="Save New Profile Picture?"
          onClose={uploading ? undefined : handleCancelPicture}
        >
          <img
            src={pendingPreview}
            alt="Selected preview"
            className="settings-preview-image"
          />
          <p className="wizard-menu-message">
            Do you want to save this as your profile picture?
          </p>
          {uploadError && <p className="settings-error">{uploadError}</p>}
          <div className="wizard-menu-actions">
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-secondary"
              onClick={handleCancelPicture}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-primary"
              onClick={handleConfirmPicture}
              disabled={uploading}
            >
              {uploading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </GameMenuModal>
      )}

      {showLogoutConfirm && (
        <GameMenuModal
          icon={volumeOnly ? undefined : '⏻'}
          title={volumeOnly ? 'Quit Game?' : 'Log Out?'}
          onClose={() => setShowLogoutConfirm(false)}
          panelClassName={volumeOnly ? 'wizard-menu-panel-pixel' : undefined}
        >
          {volumeOnly && pixelCorners('var(--wm-glow)')}
          <p className="wizard-menu-message">
            {volumeOnly ? 'Are you sure you want to quit this game?' : 'Are you sure you want to logout?'}
          </p>
          <div className="wizard-menu-actions">
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-secondary"
              onClick={() => setShowLogoutConfirm(false)}
            >
              No
            </button>
            <button
              type="button"
              className="wizard-menu-btn wizard-menu-btn-primary"
              onClick={handleConfirmLogout}
            >
              {volumeOnly ? 'Yes, Quit' : 'Yes, Log Out'}
            </button>
          </div>
        </GameMenuModal>
      )}
    </div>
  );
};

export default SettingsPage;
