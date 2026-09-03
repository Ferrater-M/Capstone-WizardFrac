import { D_WHITE, DiagramNode, CircleGuide, WholeField, FractionField, ButtonMock } from './tutorialDiagramKit';

// Gameplay-accurate diagram of Similar Island's magic circle. Nothing here is
// draggable in the real UI — drawing the circle auto-reveals the shared
// denominator, then the player types the combined numerator and presses
// Cast Spell — so this diagram never needs arrows, only the dashed
// "draw here" guide and the same dashed/solid node styling the real fields
// use. The circle is sized to actually circumscribe the denominator/
// numerator fields, the way it visually does in the real interactable UI.
//
// Demo problem: 2/5 + 1/5  →  combined numerator = 2+1 = 3  →  final answer 3/5.
//
// step:
//   1 — circle drawn, nothing revealed yet
//   2 — shared denominator revealed (auto, not typed), numerator field active
//   3 — numerator filled in, Cast Spell button shown
//
// finalMode ('whole' | 'fraction') overrides `step` to preview the two
// possible shapes of the Final Answer field instead.
const W = 300, H = 320;
const CIRCLE = { cx: 150, cy: 162, r: 75 };
const DEN  = { cx: 150, cy: 235, size: 36 };
const NUM  = { cx: 150, cy: 92,  size: 44 };

const SimilarCircleDiagram = ({ step = 1, finalMode, width = 300 }) => {
  if (finalMode) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width / W) * H}>
        <CircleGuide {...CIRCLE} />
        <DiagramNode {...DEN} value={5} dashed={false} fontSize={16} />
        <text x={150} y={40} textAnchor="middle" fontFamily="'Press Start 2P', monospace"
          fontSize={9} fill={D_WHITE} opacity={0.85}>FINAL ANSWER</text>
        {finalMode === 'whole'
          ? <WholeField cx={150} cy={92} value={4} fontSize={20} />
          : <FractionField cx={150} cy={92} numValue={3} denValue={5} fontSize={15} />}
      </svg>
    );
  }

  const showDen = step >= 2;
  const showNum = step >= 2;
  const numFilled = step >= 3;
  const showButton = step >= 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width / W) * H}>
      <CircleGuide {...CIRCLE} dim={step < 1} />

      {showDen && <DiagramNode {...DEN} value={5} dashed={false} fontSize={16} />}
      {showNum && !numFilled && <DiagramNode {...NUM} value="?" placeholder fontSize={20} />}
      {numFilled && <DiagramNode {...NUM} value={3} fontSize={20} />}

      {showButton && <ButtonMock cx={150} cy={296} label="CAST SPELL" />}
    </svg>
  );
};

export default SimilarCircleDiagram;
