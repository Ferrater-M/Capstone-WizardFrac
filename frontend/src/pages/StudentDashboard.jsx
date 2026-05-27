import React, { useState, useEffect } from 'react';
import CompetencyMasteryCard from '../components/CompetencyMasteryCard';
import AttemptSummaryPanel from '../components/AttemptSummaryPanel';
import './StudentDashboard.css';

const StudentDashboard = ({ studentId, onBack }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/game-progress/diagnostics/${studentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch diagnostics');
        }
        const data = await response.json();
        setDiagnostics(data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchDiagnostics();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
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

  const hasData = diagnostics.summary.totalSessions > 0;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <button className="back-btn" onClick={onBack}>← Back to Lobby</button>
        <h1>📈 Student Progress Dashboard</h1>
      </div>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧙‍♂️</div>
          <h2>Your Adventure Awaits!</h2>
          <p>Start playing to see your progress and mastery stats here!</p>
        </div>
      ) : (
        <div className="dashboard-content">
          <AttemptSummaryPanel summary={diagnostics.summary} />
          
          <div className="competencies-section">
            <h3>🎯 Competency Mastery</h3>
            <div className="competencies-grid">
              {diagnostics.competencies.map((comp) => (
                <CompetencyMasteryCard key={comp.competencyId} competency={comp} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
