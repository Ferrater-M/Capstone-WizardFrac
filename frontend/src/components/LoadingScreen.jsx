import './LoadingScreen.css';

const LoadingScreen = ({ message = 'LOADING...' }) => (
  <div className="loading-screen">
    <div className="loading-content">
      <h1 className="loading-title">WIZARDFRAC</h1>
      <p className="loading-message">{message}</p>
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
    </div>
  </div>
);

export default LoadingScreen;
