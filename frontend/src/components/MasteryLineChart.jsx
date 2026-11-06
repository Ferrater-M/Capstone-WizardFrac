import React, { useState } from 'react';

// Accuracy over a competency's recent games, 0–100% on one fixed scale so the three charts compare fairly.
// compact: a bare line for the carousel card. Full: gridlines, axis labels, latest value, and a hover
// crosshair + tooltip (the chart's table view is the per-game list the tooltip reads from).
const SURFACE = '#170a34';
const INK = '#F8F7FF';
const INK_MUTED = '#C4B5FD';
const GRID = 'rgba(196, 181, 253, 0.16)';

const MasteryLineChart = ({ points = [], color, compact = false, label = 'Accuracy' }) => {
  const [hover, setHover] = useState(null);

  const W = compact ? 200 : 880;
  const H = compact ? 48 : 170;
  const pad = compact ? { l: 6, r: 6, t: 6, b: 6 } : { l: 56, r: 60, t: 14, b: 32 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;

  if (!points.length) {
    return (
      <div className={`mastery-chart-empty${compact ? ' is-compact' : ''}`}>No games yet</div>
    );
  }

  const path = points.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = points.length - 1;

  if (compact) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mastery-chart is-compact" aria-hidden="true">
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke={GRID} strokeWidth={1} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(points[last])} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />
      </svg>
    );
  }

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  };

  const summary = `${label}: ${points.length} games, latest ${Math.round(points[last])}%`;

  return (
    <div className="mastery-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="mastery-chart" role="img" aria-label={summary}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={10} fill={INK_MUTED}>{v}%</text>
          </g>
        ))}
        <text x={pad.l} y={H - 8} fontSize={10} fill={INK_MUTED}>Oldest</text>
        <text x={W - pad.r} y={H - 8} textAnchor="end" fontSize={10} fill={INK_MUTED}>Latest</text>

        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 4} fill={color} stroke={SURFACE} strokeWidth={2} />
        ))}
        {/* Latest value, labelled directly at the end of the line */}
        <text x={x(last) + 10} y={y(points[last]) + 4} fontSize={11} fill={INK}>{Math.round(points[last])}%</text>

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={INK_MUTED} strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />
        )}
        {/* Hit area bigger than the marks */}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div
          className="mastery-chart-tip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover]) / H) * 100}%` }}
        >
          <span className="mastery-chart-tip-key" style={{ background: color }} />
          Game {hover + 1} of {points.length}: <strong>{Math.round(points[hover])}%</strong>
        </div>
      )}
    </div>
  );
};

export default MasteryLineChart;
