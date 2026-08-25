import React, { useRef, useState } from 'react';
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

const SettingsPage = ({ studentId, studentNickname, selectedCharacter, onBack, onLogout, onNicknameChanged, onMasterVolumeChanged }) => {
  const fileInputRef = useRef(null);
  const profileSectionRef = useRef(null);
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

  return (
    <div className="settings-page">
      <Toast key={toastKey} message={toastMessage} />
      <button className="settings-back-btn" onClick={onBack}>← Back to Menu</button>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <h2 className="settings-sidebar-title"><span className="settings-sparkle">✦</span> SETTINGS <span className="settings-sparkle">✦</span></h2>

          <nav className="settings-nav">
            <button className="settings-nav-item active" onClick={() => scrollTo(profileSectionRef)}>
              <span>👤</span> Profile
            </button>
            <button className="settings-nav-item" onClick={() => scrollTo(volumeSectionRef)}>
              <span>🔊</span> Volume
            </button>
            <button className="settings-nav-item danger" onClick={() => setShowLogoutConfirm(true)}>
              <span>⏻</span> Logout
            </button>
          </nav>

          <img
            className="settings-sidebar-avatar"
            src={pictureUrl}
            alt=""
            onError={handleAvatarError}
          />
        </aside>

        <main className="settings-content" ref={profileSectionRef}>
          <h1 className="settings-content-title">Profile Settings</h1>
          <p className="settings-content-subtitle">Manage your profile and account settings</p>

          <section className="settings-card">
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

          <section className="settings-card" ref={volumeSectionRef}>
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

          <section className="settings-card settings-logout-card" ref={logoutSectionRef}>
            <div>
              <h3 className="settings-card-title danger">Logout</h3>
              <p className="settings-card-subtitle">Log out from your account</p>
            </div>
            <button type="button" className="settings-btn settings-btn-danger" onClick={() => setShowLogoutConfirm(true)}>
              ⏻ Logout
            </button>
          </section>
        </main>
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
          icon="⏻"
          title="Log Out?"
          onClose={() => setShowLogoutConfirm(false)}
        >
          <p className="wizard-menu-message">
            Are you sure you want to logout?
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
              Yes, Log Out
            </button>
          </div>
        </GameMenuModal>
      )}
    </div>
  );
};

export default SettingsPage;
