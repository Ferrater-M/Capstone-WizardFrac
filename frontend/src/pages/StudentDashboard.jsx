import React, { useState, useEffect } from 'react';
import CompetencyMasteryCard from '../components/CompetencyMasteryCard';
import './StudentDashboard.css';

const StudentDashboard = ({ studentId, onBack }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/game-progress/diagnostics/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch diagnostics');
        const data = await response.json();
        setDiagnostics(data);
      } catch (err) {
        const message = err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Make sure the backend is running on http://localhost:8080.'
          : err.message;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchDiagnostics();
  }, [studentId]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">⚗️ Loading your progress…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
        <button className="back-btn" onClick={onBack}>← Back to Lobby</button>
      </div>
    );
  }

  const { summary, competencies, gameHistory } = diagnostics;
  const hasData = summary.totalSessions > 0;
  const accuracy = summary.totalCorrect + summary.totalIncorrect > 0
    ? Math.round((summary.totalCorrect / (summary.totalCorrect + summary.totalIncorrect)) * 100)
    : 0;

  return (
    <div className="dashboard-container">

      {/* Header */}
      <div className="dashboard-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="dashboard-title-block">
          <h1 className="dashboard-title">Progress Dashboard</h1>
          <p className="dashboard-subtitle">Your Wizard Training Journey</p>
        </div>
        {/* spacer to balance the back button */}
        <div style={{ width: '90px', flexShrink: 0 }} />
      </div>

      <div className="dashboard-divider">
        <span>✦ Stats ✦</span>
      </div>

      {!hasData ? (
        <div className="empty-state">
          <span className="empty-state-icon">🧙‍♂️</span>
          <h2>Your Adventure Awaits!</h2>
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
              <span className="stat-card-icon">❌</span>
              <div className="stat-card-value">{summary.totalIncorrect}</div>
              <div className="stat-card-label">Wrong Answers</div>
            </div>
            <div className="stat-card stat-sessions">
              <span className="stat-card-icon">🎮</span>
              <div className="stat-card-value">{summary.totalSessions}</div>
              <div className="stat-card-label">Sessions Played</div>
            </div>
            <div className="stat-card stat-multiplier">
              <span className="stat-card-icon">⚡</span>
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

          {/* Gameplay history */}
          <div className="history-section">
            <h3 className="section-title">History Game Played</h3>
            {gameHistory?.length > 0 ? (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Nickname</th>
                      <th>Island</th>
                      <th>Lvl</th>
                      <th>Hint</th>
                      <th>Points</th>
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
  );
};

export default StudentDashboard;
