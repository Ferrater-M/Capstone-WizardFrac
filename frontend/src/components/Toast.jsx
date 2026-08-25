import React from 'react';
import './Toast.css';

const Toast = ({ message, icon = '✅' }) => {
  if (!message) return null;

  return (
    <div className="wf-toast" role="status">
      <span className="wf-toast-icon">{icon}</span>
      <span className="wf-toast-message">{message}</span>
    </div>
  );
};

export default Toast;
