import './LoadingScreen.css';

// Shows only while its screen is still loading — no minimum time of its own.
// progress (0..1): the real download, as a filling bar with a percentage.
// Without it (waiting on the server, size unknown): a block slides along the bar instead of a fake fill.
const LoadingScreen = ({ message = 'LOADING...', progress }) => {
  const real = typeof progress === 'number';
  return (
    <div className="loading-screen">
      <div className="loading-content" data-ui>
        <h1 className="loading-title">WIZARDFRAC</h1>
        <p className="loading-message">
          {message}{real && ` ${Math.floor(progress * 100)}%`}
        </p>
        <div className="loading-bar-track">
          <div
            className={`loading-bar-fill ${real ? 'loading-bar-fill--real' : 'loading-bar-fill--waiting'}`}
            style={real ? { width: `${progress * 100}%` } : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
