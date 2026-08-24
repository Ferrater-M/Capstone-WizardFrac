import React, { useEffect, useState } from 'react';
import './Leaderboard.css';
import LoadingScreen from '../components/LoadingScreen';

const TABS = [
  { key: 'all-time', label: 'All Time', enabled: true },
  { key: 'week', label: 'This Week', enabled: false },
  { key: 'similar', label: 'Similar', enabled: false },
  { key: 'dissimilar', label: 'Dissimilar', enabled: false },
  { key: 'mixed', label: 'Mixed', enabled: false },
];

const initials = (name) => {
  if (!name) return '??';
  const trimmed = name.trim();
  return trimmed.length <= 2 ? trimmed.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
};

const Leaderboard = ({ studentId, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:8082/api/game-progress/leaderboard');
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        const message = err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Make sure the backend is running on http://localhost:8082.'
          : err.message;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <LoadingScreen message="LOADING LEADERBOARD..." />;
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <button className="lb-back-btn" onClick={onBack}>← Back</button>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const podium = entries.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]];
  const restBase = entries.slice(3);
  const rest = ascending ? [...restBase].reverse() : restBase;

  return (
    <div className="leaderboard-container">
      <button className="lb-back-btn" onClick={onBack}>← Back</button>
      <button className="lb-sort-btn" onClick={() => setAscending(a => !a)}>
        ⚙ Sort {ascending ? '▲' : '▼'}
      </button>

      <h1 className="lb-title">Leaderboard</h1>
      <p className="lb-subtitle">Top wizards this season</p>

      <div className="lb-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`lb-tab${tab.key === 'all-time' ? ' active' : ''}`}
            disabled={!tab.enabled}
            title={tab.enabled ? undefined : 'Coming soon'}
          >
            {tab.label}
            {!tab.enabled && <span className="lb-tab-soon">Soon</span>}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="lb-empty">No wizards have started their journey yet.</p>
      ) : (
        <>
          <div className="lb-podium">
            {podiumOrder.map((entry, i) => entry ? (
              <div
                key={entry.studentId}
                className={`lb-podium-card rank-${entry.rank}${entry.studentId === studentId ? ' is-you' : ''}`}
              >
                <div className={`lb-podium-badge badge-${entry.rank}`}>{entry.rank}</div>
                <p className="lb-podium-name">{entry.nickname}{entry.studentId === studentId ? ' (You)' : ''}</p>
                <p className="lb-podium-score">{entry.totalScore.toLocaleString()} pts</p>
                <p className="lb-podium-rank">{entry.wizardRank}</p>
              </div>
            ) : <div key={`empty-${i}`} className="lb-podium-card lb-podium-empty" />)}
          </div>

          <div className="lb-list">
            {rest.map(entry => (
              <div
                key={entry.studentId}
                className={`lb-row${entry.studentId === studentId ? ' is-you' : ''}`}
              >
                <span className="lb-row-rank">{entry.rank}</span>
                <span className="lb-row-avatar">{initials(entry.nickname)}</span>
                <span className="lb-row-info">
                  <span className="lb-row-name">{entry.nickname}{entry.studentId === studentId ? ' (You)' : ''}</span>
                  <span className="lb-row-sub">{entry.topIsland}, Lv {entry.level}</span>
                </span>
                <span className="lb-row-score">{entry.totalScore.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
