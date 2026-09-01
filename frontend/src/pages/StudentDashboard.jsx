import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CompetencyMasteryCard from '../components/CompetencyMasteryCard';
import WizardRankBadge from '../components/WizardRankBadge';
import MisconceptionPanel from '../components/MisconceptionPanel';
import GameMenuModal from '../components/GameMenuModal';
import './StudentDashboard.css';
import LoadingScreen from '../components/LoadingScreen';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RANK_TIERS = [
  { rank: 'Apprentice', icon: '🪄', hint: 'Starting rank — every wizard begins here.' },
  { rank: 'Mage', icon: '🔮', hint: 'Reach 1,000 total score to become a Mage.' },
  { rank: 'Archmage', icon: '⚡', hint: 'Reach 3,000 total score to become an Archmage.' },
  { rank: 'Grand Wizard', icon: '👑', hint: 'Reach 6,000 total score to become a Grand Wizard.' },
];

const StudentDashboard = ({ studentId, studentNickname, selectedCharacter, onBack }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const claimedStorageKey = `wizardfrac_claimed_badges_${studentId}`;
  const [claimedBadges, setClaimedBadges] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(claimedStorageKey)) || [];
    } catch {
      return [];
    }
  });

  // Email-my-progress (PDF) state
  const pdfContentRef = useRef(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sendStatus, setSendStatus] = useState('idle'); // idle | generating | sending | success | error
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await fetch(`http://localhost:8082/api/game-progress/diagnostics/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch diagnostics');
        const data = await response.json();
        setDiagnostics(data);
      } catch (err) {
        const message = err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Make sure the backend is running on http://localhost:8082.'
          : err.message;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchDiagnostics();
  }, [studentId]);

  const handleClaimBadge = (badge) => {
    if (!badge) return;
    const updated = [...claimedBadges, badge.rank];
    setClaimedBadges(updated);
    localStorage.setItem(claimedStorageKey, JSON.stringify(updated));
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSendStatus('idle');
    setSendError('');
    setEmailInput('');
  };

  const generatePdfBlob = async () => {
    const node = pdfContentRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#1b0d40',
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    return pdf.output('blob');
  };

  const handleSendEmail = async () => {
    const trimmed = emailInput.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setSendStatus('error');
      setSendError('Please enter a valid email address.');
      return;
    }
    setSendError('');
    setSendStatus('generating');
    try {
      const pdfBlob = await generatePdfBlob();
      setSendStatus('sending');
      const formData = new FormData();
      formData.append('email', trimmed);
      formData.append('file', pdfBlob, 'wizardfrac-progress.pdf');
      const res = await fetch('http://localhost:8082/api/email/send-diagnostics', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send email.');
      setSendStatus('success');
    } catch (err) {
      setSendStatus('error');
      setSendError(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    }
  };

  if (loading) {
    return <LoadingScreen message="LOADING PROGRESS..." />;
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
        <button className="back-btn" onClick={onBack}>← Back to Lobby</button>
      </div>
    );
  }

  const characterFallbackAvatar = selectedCharacter?.name?.toLowerCase().includes('girl') ? '/Female.png' : '/Male.png';

  const { summary, competencies, gameHistory, dissimilarMisconceptions } = diagnostics;
  const hasData = summary.totalSessions > 0;
  const accuracy = summary.totalCorrect + summary.totalIncorrect > 0
    ? Math.round((summary.totalCorrect / (summary.totalCorrect + summary.totalIncorrect)) * 100)
    : 0;

  const currentRankIndex = Math.max(0, RANK_TIERS.findIndex(t => t.rank === summary?.wizardRank));
  const pendingBadge = RANK_TIERS
    .slice(0, currentRankIndex + 1)
    .find(t => !claimedBadges.includes(t.rank)) || null;

  const TOTAL_ISLAND_STAGES = 18; // 3 islands x 6 stages
  const completedStages = new Set(
    (gameHistory || [])
      .filter(entry => entry.status === 'COMPLETED')
      .map(entry => `${entry.island}-${entry.level}`)
  ).size;
  const proficientCount = (competencies || []).filter(c => c.masteryLevel === 'Proficient').length;

  const achievements = [
    {
      id: 'quest-champion',
      icon: '/PlayerAssets/Icons/map.png',
      heroImage: '/PlayerAssets/Icons/mapscroll.png',
      title: 'Quest Champion',
      description: 'Complete all the quests',
      progress: Math.min(completedStages, TOTAL_ISLAND_STAGES),
      goal: TOTAL_ISLAND_STAGES,
      hint: 'Finish every stage (1-6) on all 3 islands — Similar, Dissimilar, and Hybrid Fractions.',
    },
    {
      id: 'spell-master',
      icon: '/PlayerAssets/Icons/spell.png',
      heroImage: '/PlayerAssets/Icons/spellmaster.png',
      title: 'Spell Master',
      description: 'Cast 100 correct spells',
      progress: Math.min(summary.totalCorrect, 100),
      goal: 100,
      hint: 'Answer fraction spells correctly during gameplay. Every correct answer counts toward this.',
    },
    {
      id: 'mastery-mage',
      icon: '/PlayerAssets/Icons/wizardhat.png',
      heroImage: '/PlayerAssets/Icons/wizard1.png',
      title: 'Mastery Mage',
      description: 'Reach Proficient in every skill',
      progress: proficientCount,
      goal: competencies?.length || 3,
      hint: 'Reach 80%+ accuracy in Similar Fractions, Dissimilar Fractions, and Mixed Numbers to mark each as Proficient.',
    },
  ];

  return (
    <div className="dashboard-container">

      {pendingBadge && (
        <GameMenuModal
          icon={pendingBadge.icon}
          title="New Badge Unlocked!"
          message={`Congratulations! You've received the ${pendingBadge.rank} badge.`}
          onClose={() => handleClaimBadge(pendingBadge)}
        >
          <div className="wizard-menu-actions">
            <button className="wizard-menu-btn wizard-menu-btn-primary" onClick={() => handleClaimBadge(pendingBadge)}>
              Claim Badge
            </button>
          </div>
        </GameMenuModal>
      )}

      {/* Back */}
      <div className="dashboard-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <button className="email-progress-btn" onClick={() => setShowEmailModal(true)}>
          <span>📧</span> Email My Progress
        </button>
      </div>

      <div ref={pdfContentRef}>

      {/* Profile */}
      <div className="profile-bar">
        <img
          className="profile-avatar"
          src={studentId ? `http://localhost:8082/api/students/${studentId}/profile-picture` : characterFallbackAvatar}
          alt="Player avatar"
          onError={(e) => {
            if (e.currentTarget.src !== characterFallbackAvatar) {
              e.currentTarget.onerror = null;
              e.currentTarget.src = characterFallbackAvatar;
            }
          }}
        />
        <div className="profile-info">
          <p className="profile-name">{studentNickname || 'Wizard'}</p>
          <p className="profile-points">{(summary?.totalScore || 0).toLocaleString()} pts</p>
          <WizardRankBadge rank={summary?.wizardRank} />
        </div>
      </div>

      {/* Badges */}
      <div className="badges-section">
        <div className="badges-header">
          <h3 className="section-title">Badges</h3>
        </div>
        <div className="badges-row">
          {RANK_TIERS.map((tier, index) => (
            <div
              key={tier.rank}
              className={`badge-circle ${index <= currentRankIndex ? 'badge-unlocked' : 'badge-locked'} ${pendingBadge?.rank === tier.rank ? 'badge-pending' : ''}`}
              data-tooltip={`${tier.rank} — ${tier.hint}`}
            >
              <span className="badge-icon">{tier.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="achievements-section">
        <h3 className="section-title">Achievements</h3>
        <div className="achievements-list">
          {achievements.map(a => (
            <div key={a.id} className="achievement-row" data-tooltip={a.hint}>
              <div className="achievement-hero" style={{ backgroundImage: `url(${a.heroImage})` }} />
              <span className="achievement-icon"><img src={a.icon} alt="" /></span>
              <div className="achievement-body">
                <p className="achievement-title">{a.title}</p>
                <p className="achievement-desc">{a.description}</p>
                <div className="achievement-bar-track">
                  <div
                    className="achievement-bar-fill"
                    style={{ width: `${Math.min(100, (a.progress / a.goal) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="achievement-count">{a.progress}/{a.goal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="dashboard-title-row">
        <div className="dashboard-title-box">
          <h1 className="dashboard-title">Progress Dashboard</h1>
          <p className="dashboard-subtitle">Your wizard training journey</p>
        </div>
      </div>

      <div className="dashboard-divider dashboard-divider-stats">
        <span>Stats</span>
      </div>

      {!hasData ? (
        <div className="empty-state">
          <span className="empty-state-icon">🧙‍♂️</span>
          <h2>Your Adventure Awaits</h2>
          <p>Start playing to see your progress and mastery stats here.</p>
        </div>
      ) : (
        <div className="dashboard-content">

          {/* Stat cards */}
          <div className="stats-row">
            <div className="stat-card stat-correct">
              <span className="stat-card-icon">✅</span>
              <div className="stat-card-value">{summary.totalCorrect}</div>
              <div className="stat-card-label">Correct Answers</div>
            </div>
            <div className="stat-card stat-incorrect">
              <span className="stat-card-icon">💥</span>
              <div className="stat-card-value">{summary.totalIncorrect}</div>
              <div className="stat-card-label">Wrong Answers</div>
            </div>
            <div className="stat-card stat-sessions">
              <span className="stat-card-icon">🔮</span>
              <div className="stat-card-value">{summary.totalSessions}</div>
              <div className="stat-card-label">Sessions Played</div>
            </div>
            <div className="stat-card stat-multiplier">
              <span className="stat-card-icon">🏆</span>
              <div className="stat-card-value">{accuracy}%</div>
              <div className="stat-card-label">Overall Accuracy</div>
            </div>
          </div>

          {/* Competencies */}
          {competencies?.length > 0 && (
            <div className="competencies-section">
              <h3 className="section-title">Competency Mastery</h3>
              <div className="competencies-grid">
                {competencies.map(comp => (
                  <CompetencyMasteryCard key={comp.competencyId} competency={comp} />
                ))}
              </div>
            </div>
          )}

          {/* Misconceptions */}
          <MisconceptionPanel misconceptions={dissimilarMisconceptions} />

          {/* Gameplay history */}
          <div className="history-section">
            <h3 className="section-title">History Game</h3>            {gameHistory?.length > 0 ? (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Nickname</th>
                      <th>Island</th>
                      <th>Lvl</th>
                      <th>Hint</th>
                      <th>Points</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map((entry, index) => (
                      <tr key={`${entry.island}-${entry.level}-${index}`}>
                        <td>{entry.nickname || '—'}</td>
                        <td>{entry.island}</td>
                        <td>{entry.level}</td>
                        <td className={entry.hintsUsed > 0 ? 'hint-used' : 'hint-none'}>
                          {entry.hintLabel}
                        </td>
                        <td>{entry.points}</td>
                        <td className={entry.status === 'COMPLETED' ? 'status-completed' : 'status-not-completed'}>
                          {entry.status === 'COMPLETED' ? 'Completed' : 'Not Completed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="history-empty">No completed games yet. Finish a level to see your history here.</p>
            )}
          </div>

        </div>
      )}

      </div>

      {showEmailModal && (
        <GameMenuModal
          icon="📧"
          title={sendStatus === 'success' ? 'Sent!' : 'Email My Progress'}
          onClose={closeEmailModal}
        >
          {sendStatus === 'success' ? (
            <>
              <p className="wizard-menu-message">
                Your progress PDF is on its way to <strong>{emailInput.trim()}</strong>.
              </p>
              <div className="wizard-menu-actions">
                <button type="button" className="wizard-menu-btn wizard-menu-btn-primary" onClick={closeEmailModal}>
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="wizard-menu-message">
                We'll turn this dashboard into a PDF and send it straight to your inbox.
              </p>
              <input
                type="email"
                className="email-modal-input"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sendStatus !== 'generating' && sendStatus !== 'sending') {
                    handleSendEmail();
                  }
                }}
                disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                autoFocus
              />
              {sendStatus === 'error' && <p className="email-modal-error">{sendError}</p>}
              <div className="wizard-menu-actions">
                <button
                  type="button"
                  className="wizard-menu-btn wizard-menu-btn-secondary"
                  onClick={closeEmailModal}
                  disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="wizard-menu-btn wizard-menu-btn-primary"
                  onClick={handleSendEmail}
                  disabled={sendStatus === 'generating' || sendStatus === 'sending'}
                >
                  {sendStatus === 'generating' ? 'Preparing PDF…' : sendStatus === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </GameMenuModal>
      )}
    </div>
  );
};

export default StudentDashboard;
