import { D_WHITE, D_ARROW, DiagramNode, ArrowDefs, DragArrow, InfinityGuide, CombineLink, WholeField, FractionField } from './tutorialDiagramKit';

// Gameplay-accurate diagram of Dissimilar Island's magic circle — same node
// layout/coordinates as circleContainerRef in DissimilarIslandGame.jsx (and
// the identical butterfly stage in HybridIslandGame.jsx), so what the player
// sees here is what they'll actually see in the interactable UI. The ∞ guide
// is sized so its two loops actually reach the N/D boxes, the way the drawn
// symbol visually cradles the numbers in the real UI.
//
// Demo problem: 1/2 + 1/3  →  cross1 (N1) = 1×3 = 3, cross2 (N2) = 1×2 = 2,
// SD = 2×3 = 6, combined = 3+2 = 5  →  final answer 5/6.
//
// step:
//   1 — ∞ guide drawn, nothing revealed yet
//   2 — N1/D1/N2/D2 revealed; cross-multiply left: drag D2 → N1
//   3 — cross-multiply right: drag D1 → N2
//   4 — combine denominators: drag D1 & D2 → SD
//   5 — combine cross products at CENTER
//   6 — final answer — circle fades (as it does in the real game once you
//       reach this phase), replaced by the Final Answer field
const W = 400, H = 300;
const N1 = { cx: 126, cy: 100, size: 40 };
const D1 = { cx: 126, cy: 186, size: 32 };
const N2 = { cx: 268, cy: 100, size: 40 };
const D2 = { cx: 266, cy: 186, size: 32 };
const SD = { cx: 197, cy: 230, size: 40 };
const CENTER = { cx: 197, cy: 148, size: 40 };
const INFINITY_GUIDE = { cx: 197, cy: 143, w: 74, h: 92 };

const phase = (step, teachStep) => (step < teachStep ? 'hidden' : step === teachStep ? 'active' : 'solved');

const DissimilarCircleDiagram = ({ step = 1, width = 400 }) => {
  if (step >= 6) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width / W) * H}>
        <text x={200} y={90} textAnchor="middle" fontFamily="'Press Start 2P', monospace"
          fontSize={10} fill={D_WHITE} opacity={0.85}>FINAL ANSWER</text>
        <WholeField cx={140} cy={165} value={4} fontSize={20} />
        <text x={200} y={171} textAnchor="middle" fontFamily="'Press Start 2P', monospace"
          fontSize={11} fill={D_WHITE} opacity={0.85}>or</text>
        <FractionField cx={260} cy={165} numValue={5} denValue={6} fontSize={15} />
      </svg>
    );
  }

  const showBase = step >= 2;
  const cross1 = phase(step, 2); // N1 box
  const cross2 = phase(step, 3); // N2 box
  const sd     = phase(step, 4);
  const center = phase(step, 5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={(width / W) * H}>
      <ArrowDefs id="dissArrow" color={D_ARROW} />
      <InfinityGuide {...INFINITY_GUIDE} dim={!showBase} />

      {showBase && (
        <>
          <DiagramNode {...D1} value={2} />
          <DiagramNode {...D2} value={3} />

          {/* N1 — plain numerator, or the cross-product box once its step arrives */}
          {cross1 === 'hidden' && <DiagramNode {...N1} value={1} />}
          {cross1 === 'active' && <DiagramNode {...N1} value="?" placeholder />}
          {cross1 === 'solved' && <DiagramNode {...N1} value={3} dashed={false} />}

          {/* N2 */}
          {cross2 === 'hidden' && <DiagramNode {...N2} value={1} />}
          {cross2 === 'active' && <DiagramNode {...N2} value="?" placeholder />}
          {cross2 === 'solved' && <DiagramNode {...N2} value={2} dashed={false} />}

          {cross1 === 'active' && <DragArrow x1={D2.cx} y1={D2.cy} x2={N1.cx} y2={N1.cy} markerId="dissArrow" bow={-20} />}
          {cross2 === 'active' && <DragArrow x1={D1.cx} y1={D1.cy} x2={N2.cx} y2={N2.cy} markerId="dissArrow" bow={20} />}

          {sd === 'active' && (
            <>
              <DragArrow x1={D1.cx} y1={D1.cy} x2={SD.cx} y2={SD.cy} markerId="dissArrow" bow={-10} />
              <DragArrow x1={D2.cx} y1={D2.cy} x2={SD.cx} y2={SD.cy} markerId="dissArrow" bow={10} />
            </>
          )}
          {sd === 'active' && <DiagramNode {...SD} value="?" placeholder />}
          {sd === 'solved' && <DiagramNode {...SD} value={6} dashed={false} />}

          {center === 'active' && (
            <>
              <CombineLink x1={N1.cx} y1={N1.cy} x2={CENTER.cx} y2={CENTER.cy} />
              <CombineLink x1={N2.cx} y1={N2.cy} x2={CENTER.cx} y2={CENTER.cy} />
              <DiagramNode {...CENTER} value="?" placeholder />
            </>
          )}
          {center === 'solved' && <DiagramNode {...CENTER} value={5} dashed={false} />}
        </>
      )}
    </svg>
  );
};

export default DissimilarCircleDiagram;
