import React from 'react';
import './GameMenuModal.css';

const GameMenuModal = ({ title, message, icon, onClose, children, panelClassName }) => (
  <div className="wizard-menu-overlay" onClick={onClose}>
    <div
      className={`wizard-menu-panel${panelClassName ? ` ${panelClassName}` : ''}`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      {icon && <div className="wizard-menu-icon">{icon}</div>}
      {title && <h2 className="wizard-menu-title">{title}</h2>}
      {message && <p className="wizard-menu-message">{message}</p>}
      {children}
    </div>
  </div>
);

export default GameMenuModal;
