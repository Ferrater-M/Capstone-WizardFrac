// Shared building blocks for the gameplay-accurate tutorial diagrams
// (SimilarCircleDiagram, DissimilarCircleDiagram, ForgeDiagram). Every piece here
// is styled to match the ACTUAL interactable UI, not a generic illustration:
// dashed cream border + dark grey fill + white "Press Start 2P" text for any
// typed/dragged field (mirrors the real node/input styling), a broken-line
// outline for the shape you draw, and arrows for anything you drag.

export const D_CREAM = '#e8d5b4';
export const D_GREY  = '#333333';
export const D_WHITE = '#ffffff';
export const D_DIM   = '#8a8a8a';

// A pixel-styled node/field box — same look as the real magic-circle numbers
// and input fields (dashed cream border, dark grey fill, white text, square
// corners). `dashed=false` renders a solid border for values that are shown
// automatically rather than typed/dragged.
export const DiagramNode = ({ cx, cy, size = 40, value, dashed = true, active = true, fontSize, placeholder = false }) => (
  <g opacity={active ? 1 : 0.4}>
    <rect
      x={cx - size / 2} y={cy - size / 2} width={size} height={size}
      fill={D_GREY} stroke={D_CREAM} strokeWidth={2.5}
      strokeDasharray={dashed ? '5 4' : 'none'}
    />
    {value !== undefined && (
      <text
        x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Press Start 2P', monospace" fontWeight="700"
        fontSize={fontSize || size * 0.4}
        fill={placeholder ? D_DIM : D_WHITE}
      >
        {value}
      </text>
    )}
  </g>
);

// Arrowhead marker — declare once per <svg> via <ArrowDefs/>, reference by id.
export const ArrowDefs = ({ id = 'diagArrow', color = D_WHITE }) => (
  <defs>
    <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  </defs>
);

// A curved, dashed "drag this here" arrow between two node centers. Amber by
// default so it reads clearly against both the white guide shape and the
// cream node borders; pulls back from each end so the arrowhead lands beside
// the target box rather than covering its text.
export const D_ARROW = '#fbbf24';
export const DragArrow = ({ x1, y1, x2, y2, color = D_ARROW, markerId = 'diagArrow', bow = 0, pullBack = 26 }) => {
  const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const sx = x1 + ux * pullBack * 0.6, sy = y1 + uy * pullBack * 0.6;
  const ex = x2 - ux * pullBack, ey = y2 - uy * pullBack;
  const mx = (sx + ex) / 2 + bow, my = (sy + ey) / 2 - Math.abs(bow) * 0.4 - 18;
  return (
    <path
      d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
      fill="none" stroke={color} strokeWidth={3} strokeDasharray="7 5"
      markerEnd={`url(#${markerId})`}
    />
  );
};

// Dashed "draw a circle here" guide.
export const CircleGuide = ({ cx, cy, r, color = D_WHITE, dim = false }) => (
  <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3}
    strokeDasharray="9 7" opacity={dim ? 0.35 : 0.85} />
);

// Dashed "draw a triangle here" guide (apex left, flat right edge — matches
// the ◁ shape DrawingCanvas' triangle-detector expects).
export const TriangleGuide = ({ cx, cy, w, h, color = D_WHITE, dim = false }) => {
  const pts = `${cx - w / 2},${cy} ${cx + w / 2},${cy - h / 2} ${cx + w / 2},${cy + h / 2}`;
  return (
    <polygon points={pts} fill="none" stroke={color} strokeWidth={3}
      strokeDasharray="9 7" opacity={dim ? 0.35 : 0.85} />
  );
};

// Dashed "draw an infinity symbol here" guide — a proper figure-eight, not
// two separate circles, so it actually reads as ∞.
export const InfinityGuide = ({ cx, cy, w, h, color = D_WHITE, dim = false }) => {
  const lw = w / 2, lh = h / 2;
  const d = `M ${cx - w} ${cy}
             C ${cx - w} ${cy - lh}, ${cx - lw} ${cy - lh}, ${cx} ${cy}
             C ${cx + lw} ${cy + lh}, ${cx + w} ${cy + lh}, ${cx + w} ${cy}
             C ${cx + w} ${cy - lh}, ${cx + lw} ${cy - lh}, ${cx} ${cy}
             C ${cx - lw} ${cy + lh}, ${cx - w} ${cy + lh}, ${cx - w} ${cy} Z`;
  return <path d={d} fill="none" stroke={color} strokeWidth={3} strokeDasharray="9 7" opacity={dim ? 0.35 : 0.85} />;
};

// A dashed (non-arrow) connector for a "combine these two values" step that
// isn't a drag — e.g. adding two already-solved numbers into a third box.
export const CombineLink = ({ x1, y1, x2, y2, color = D_WHITE }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} strokeDasharray="4 4" opacity={0.85} />
);

// A single "final answer" field for a whole number — same node styling as
// everything else.
export const WholeField = ({ cx, cy, size = 46, value, placeholder = false, fontSize }) => (
  <DiagramNode cx={cx} cy={cy} size={size} value={value} placeholder={placeholder} fontSize={fontSize} />
);

// A stacked "final answer" field for a fraction — numerator box, a divider
// line, denominator box below — matching the real numerator-input /
// line / denominator-input layout used for every island's fraction answer,
// instead of bundling num/den into one box.
export const FractionField = ({ cx, cy, boxSize = 36, gap = 12, numValue, denValue, placeholder = false, fontSize }) => {
  const half = boxSize / 2;
  const numCy = cy - half - gap / 2;
  const denCy = cy + half + gap / 2;
  return (
    <g>
      <DiagramNode cx={cx} cy={numCy} size={boxSize} value={numValue} placeholder={placeholder} fontSize={fontSize} />
      <line x1={cx - boxSize / 2 + 3} y1={cy} x2={cx + boxSize / 2 - 3} y2={cy} stroke={D_WHITE} strokeWidth={2} />
      <DiagramNode cx={cx} cy={denCy} size={boxSize} value={denValue} placeholder={placeholder} fontSize={fontSize} />
    </g>
  );
};

// A mockup of the real pixel-art "Cast Spell"/"Confirm"/"Forge" button — cream
// plate behind it (the interactable UI's own background colour) so the brown
// button reads clearly against the diagram's dark backdrop.
export const ButtonMock = ({ cx, cy, w = 116, h = 28, label = 'CAST SPELL', fontSize = 8 }) => (
  <g>
    <rect x={cx - w / 2 - 8} y={cy - h / 2 - 7} width={w + 16} height={h + 14} fill={D_CREAM} />
    <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="#703737" stroke="#703737" strokeWidth={2} />
    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
      fontFamily="'Press Start 2P', monospace" fontWeight="700" fontSize={fontSize} fill={D_CREAM}>
      {label}
    </text>
  </g>
);
