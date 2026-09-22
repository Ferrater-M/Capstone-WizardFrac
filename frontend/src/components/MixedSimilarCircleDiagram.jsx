import { DiagramNode, CircleGuide, ButtonMock } from './tutorialDiagramKit';

// Gameplay-accurate diagram of Hybrid Island's "same denominators" route —
// MixedSimilarCircleStage in HybridIslandGame.jsx. Skips Forge entirely:
// draw a circle, the shared denominator reveals itself automatically, then
// the player types the combined whole number AND numerator side by side
// (two separate fields, unlike plain Similar Island's single numerator) and
// presses Cast Spell. Node positions are scaled down from the real card's
// W/N/D coordinates (MIXED_W_LEFT/MIXED_W_TOP/MIXED_N_TOP/MIXED_D_TOP in
// HybridIslandGame.jsx) so the layout matches what the player actually sees.
//
// Demo problem: 1 1/5 + 1 2/5 (already same denominator, 5) → combined whole
// = 1+1 = 2, combined numerator = 1+2 = 3 → final answer 2 3/5. Chosen so the
// demo never needs the carry/reduce simplify steps, same way ForgeDiagram and
// SimilarCircleDiagram pick clean non-simplifying demo numbers.
//
// step:
//   1 — circle drawn, nothing revealed yet
//   2 — shared denominator revealed (auto, not typed), W/N fields active
//   3 — W/N filled in, Cast Spell button shown
const W = 300, H = 320;
const CIRCLE = { cx: 150, cy: 150, r: 95 };
const DEN  = { cx: 150, cy: 182, size: 34 };
const N_POS = { cx: 150, cy: 98,  size: 44 };
const W_POS = { cx: 66,  cy: 109, size: 44 };

const MixedSimilarCircleDiagram = ({ step = 1, width = 300 }) => {
  const showDen = step >= 2;
  const showFields = step >= 2;
  const filled = step >= 3;
  const showButton = step >= 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width / W) * H}>
      <CircleGuide {...CIRCLE} dim={step < 1} />

      {showDen && <DiagramNode {...DEN} value={5} dashed={false} fontSize={14} />}

      {showFields && !filled && <DiagramNode {...W_POS} value="?" placeholder />}
      {filled && <DiagramNode {...W_POS} value={2} />}

      {showFields && !filled && <DiagramNode {...N_POS} value="?" placeholder />}
      {filled && <DiagramNode {...N_POS} value={3} />}

      {showButton && <ButtonMock cx={150} cy={290} label="CAST SPELL" />}
    </svg>
  );
};

export default MixedSimilarCircleDiagram;
