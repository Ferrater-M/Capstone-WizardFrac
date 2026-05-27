import React from 'react';
import './components.css';

const AttemptSummaryPanel = ({ summary }) => {
  return (
    <div className="summary-panel">
      <h3>📊 Your Stats</h3>
      <div className="stats-grid">
        <div className="stat-tile">
          <span className="stat-icon">✅</span>
          <div className="stat-value">{summary.totalCorrect}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">❌</span>
          <div className="stat-value">{summary.totalIncorrect}</div>
          <div className="stat-label">Incorrect</div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">🎮</span>
          <div className="stat-value">{summary.totalSessions}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-tile">
          <span className="stat-icon">✨</span>
          <div className="stat-value">{summary.averageMultiplier.toFixed(1)}x</div>
          <div className="stat-label">Avg Multiplier</div>
        </div>
      </div>
    </div>
  );
};

export default AttemptSummaryPanel;
