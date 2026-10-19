import React from 'react';
import { formatStopwatch } from '../utils/stopwatch';

const C = '#703737';

// Same pixel frame as the in-match stats box / Help / Menu buttons.
const Frame = ({ children, dim }) => (
  <div style={{
    position: 'relative', border: `4px solid ${C}`, background: '#e8d5b4',
    boxSizing: 'border-box',
    padding: '8px 10px', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center',
    fontFamily: '"Press Start 2P", monospace', fontSize: 13, color: '#222', whiteSpace: 'nowrap',
  }}>
    <div style={{ position: 'absolute', inset: 5, border: `1px solid ${C}`, pointerEvents: 'none' }} />
    {[[-6, -6, 10], [-6, null, 10], [null, -6, 10], [null, null, 10]].map(([t, l, s], i) => (
      <div key={`o${i}`} style={{ position: 'absolute', width: s, height: s, background: C, ...(t !== null ? { top: t } : { bottom: -6 }), ...(l !== null ? { left: l } : { right: -6 }) }} />
    ))}
    {[[3, 3], [3, null], [null, 3], [null, null]].map(([t, l], i) => (
      <div key={`i${i}`} style={{ position: 'absolute', width: 5, height: 5, background: C, ...(t !== null ? { top: t } : { bottom: 3 }), ...(l !== null ? { left: l } : { right: 3 }) }} />
    ))}
    <span style={{ opacity: dim ? 0.55 : 1, transition: 'opacity 0.2s ease', display: 'flex', gap: 8 }}>{children}</span>
  </div>
);

// Session time + Solve Time (time spent on the current problem), stacked (Solve under Session).
// Fills its parent's width, each clock as wide as it.
// `sessionRunning` / `solveRunning` only dim the clock while it is paused or stopped.
const GameStopwatches = ({ sessionMs, solveMs, sessionRunning, solveRunning }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
    <Frame dim={!sessionRunning}>
      <span>Session</span>
      <span>{formatStopwatch(sessionMs)}</span>
    </Frame>
    <Frame dim={!solveRunning}>
      <span>Solve</span>
      <span>{formatStopwatch(solveMs)}</span>
    </Frame>
  </div>
);

export default GameStopwatches;
