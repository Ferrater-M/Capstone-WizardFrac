import { DiagramNode, ArrowDefs, DragArrow, TriangleGuide, D_ARROW } from './tutorialDiagramKit';

// Gameplay-accurate diagram of Hybrid Island's Forge stage — same node
// layout as NODE_POS/CIRCLE_SIZE in HybridIslandGame.jsx: W (whole number)
// left-middle, N (numerator) top-right, D (denominator) bottom-right. The
// triangle guide is sized so its apex/flat edge actually reach the tokens,
// the way the drawn shape visually cradles them in the real UI.
//
// Demo mixed number: 1 1/2  →  drag D onto W to multiply (1×2=2), then drag
// the product onto N to add (2+1=3) — giving the improper numerator 3 (3/2).
//
// step:
//   1 — triangle guide drawn, nothing revealed yet
//   2 — W/N/D revealed, drag D → W (multiply)
//   3 — drag W → N (add)
//   4 — solved (N shows the improper numerator)
const SIZE = 260;
const W_POS = { cx: 88, cy: 130, size: 44 };
const N_POS = { cx: 172, cy: 42, size: 44 };
const D_POS = { cx: 172, cy: 218, size: 44 };
const TRIANGLE_GUIDE = { cx: 136, cy: 130, w: 152, h: 226 };

const ForgeDiagram = ({ step = 1, width = 260 }) => {
  const shown = step >= 2;
  const multiplyActive = step === 2;
  const addActive = step === 3;
  const solved = step >= 4;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={width} height={width}>
      <ArrowDefs id="forgeArrow" color={D_ARROW} />
      <TriangleGuide {...TRIANGLE_GUIDE} dim={!shown} />

      {shown && (
        <>
          <DiagramNode {...D_POS} value={2} />

          {!multiplyActive && !addActive && !solved && <DiagramNode {...W_POS} value={1} />}
          {multiplyActive && <DiagramNode {...W_POS} value="?" placeholder />}
          {(addActive || solved) && <DiagramNode {...W_POS} value={2} dashed={false} active={addActive} />}

          {!addActive && !solved && <DiagramNode {...N_POS} value={1} />}
          {addActive && <DiagramNode {...N_POS} value="?" placeholder />}
          {solved && <DiagramNode {...N_POS} value={3} dashed={false} />}

          {multiplyActive && <DragArrow x1={D_POS.cx} y1={D_POS.cy} x2={W_POS.cx} y2={W_POS.cy} markerId="forgeArrow" bow={-15} />}
          {addActive && <DragArrow x1={W_POS.cx} y1={W_POS.cy} x2={N_POS.cx} y2={N_POS.cy} markerId="forgeArrow" bow={15} />}
        </>
      )}
    </svg>
  );
};

export default ForgeDiagram;
