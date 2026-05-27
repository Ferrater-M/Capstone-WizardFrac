import React from 'react';
import './components.css';

const CompetencyMasteryCard = ({ competency }) => {
  const getMasteryColor = (level) => {
    switch (level) {
      case 'Proficient':
        return '#10b981';
      case 'Developing':
        return '#f59e0b';
      case 'Beginner':
      default:
        return '#ef4444';
    }
  };

  return (
    <div className="competency-card">
      <div className="competency-header">
        <span 
          className="mastery-badge" 
          style={{ backgroundColor: getMasteryColor(competency.masteryLevel) }}
        >
          {competency.masteryLevel}
        </span>
        <h4>{competency.competencyName}</h4>
      </div>
      <div className="accuracy-display">
        <span className="accuracy-value">{Math.round(competency.accuracy)}%</span>
        <span className="accuracy-label">Accuracy</span>
      </div>
      <div className="trend-sparkline">
        {/* Simple placeholder sparkline for now */}
        <div className="sparkline-bar-container">
          {competency.trendData.map((value, index) => (
            <div 
              key={index} 
              className="sparkline-bar"
              style={{ 
                height: `${Math.max(20, value)}%`,
                backgroundColor: getMasteryColor(competency.masteryLevel)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompetencyMasteryCard;
