import React, { useState, useLayoutEffect, useRef } from 'react';
import DissimilarCircleDiagram from './DissimilarCircleDiagram';

const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';
const PAD   = 10;

// diagramStep maps to DissimilarCircleDiagram's own step scale (0-6) — see
// that file for what each number draws. null hides the diagram entirely.
const slides = [
  {
    targetId: null,
    diagramStep: null,
    title: 'BUTTERFLY METHOD',
    body: 'When two fractions have different denominators, we use the Butterfly Method: cross-multiply diagonally, multiply the denominators, then combine the results.',
  },
  {
    targetId: 'problem-box',
    diagramStep: null,
    title: 'READ THE PROBLEM',
    body: "Look at YOUR problem here — two fractions with different denominators. We'll use 1/2 + 1/3 as a demo alongside.",
  },
  {
    targetId: 'interactable',
    diagramStep: 1,
    title: 'DRAW ∞ TO START',
    body: 'Draw an infinity (∞) symbol inside this box. Your two numerators and two denominators will appear as draggable pieces around the circle.',
  },
  {
    targetId: 'interactable',
    diagramStep: 2,
    title: 'STEP 1 — CROSS-MULTIPLY (LEFT)',
    body: 'Drag the RIGHT denominator onto the LEFT numerator. A box lights up — type their product, then press Confirm.\n\nDemo: 1 × 3 = 3',
  },
  {
    targetId: 'interactable',
    diagramStep: 3,
    title: 'STEP 2 — CROSS-MULTIPLY (RIGHT)',
    body: 'Drag the LEFT denominator onto the RIGHT numerator. Type their product, then press Confirm.\n\nDemo: 1 × 2 = 2',
  },
  {
    targetId: 'interactable',
    diagramStep: 4,
    title: 'STEP 3 — COMBINE THE DENOMINATORS',
    body: 'Drag one denominator on top of the other to combine them. Type their product into the box that appears, then press Confirm.\n\nDemo: 2 × 3 = 6',
  },
  {
    targetId: 'interactable',
    diagramStep: 5,
    title: 'STEP 4 — COMBINE THE CROSS PRODUCTS',
    body: 'Once all three boxes are correct, the center opens up. Add or subtract your two cross products, using the operator, then press Confirm.\n\nDemo: 3 + 2 = 5',
  },
  {
    targetId: 'interactable',
    diagramStep: 6,
    title: 'STEP 5 — FINAL ANSWER',
    body: 'Type your final answer: the combined total over the denominator product, simplified. If it simplifies to a whole number, use the single box — otherwise use the numerator/denominator boxes.\n\nDemo: 5/6',
  },
  {
    targetId: null,
    diagramStep: null,
    title: '⚠ ABOUT THE HINT',
    body: 'A Hint button appears after you draw the symbol.\n\nIf you use it, the formula will be shown — but your answer will NOT be fully recorded and your score for that problem will be reduced.\n\nTry to solve it on your own first!',
    isWarning: true,
    isLast: true,
  },
];

const PixelBtn = ({ onClick, disabled, primary, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    position: 'relative',
    padding: '10px 20px',
    background: disabled ? '#4a2a2a' : primary ? BROWN : CREAM,
    border: `3px solid ${BROWN}`,
    color: disabled ? '#6b4040' : primary ? CREAM : BROWN,
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 11, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 0, whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

const ButterflyTutorial = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [arrowSide, setArrowSide] = useState('top');
  // 'in' = first appearance (same pop-in as the Menu popup), 'next'/'prev' = which
  // way the card slides when paging between steps.
  const [direction, setDirection] = useState('in');

  const slide = slides[index];
  const total = slides.length;

  useLayoutEffect(() => {
    if (!slide.targetId) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tutorial="${slide.targetId}"]`);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, [index, slide.targetId]);

  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const spaceBelow = vh - (targetRect.bottom + PAD);
    const spaceAbove = targetRect.top - PAD;
    const spaceRight = vw - (targetRect.right + PAD);

    let left = targetRect.left + targetRect.width / 2 - tt.width / 2;
    let top, side;

    if (spaceBelow >= tt.height + 20) {
      top = targetRect.bottom + PAD + 16; side = 'top';
    } else if (spaceAbove >= tt.height + 20) {
      top = targetRect.top - PAD - tt.height - 16; side = 'bottom';
    } else if (spaceRight >= tt.width + 20) {
      left = targetRect.right + PAD + 16;
      top  = targetRect.top + targetRect.height / 2 - tt.height / 2;
      side = 'left';
    } else {
      left = targetRect.left - PAD - tt.width - 16;
      top  = targetRect.top + targetRect.height / 2 - tt.height / 2;
      side = 'right';
    }

    left = Math.max(8, Math.min(vw - tt.width - 8, left));
    top  = Math.max(8, Math.min(vh - tt.height - 8, top));
    setTooltipPos({ left, top });
    setArrowSide(side);
  }, [targetRect]);

  const next = () => { if (index < total - 1) { setDirection('next'); setIndex(i => i + 1); } else onComplete(); };
  const prev = () => { if (index > 0) { setDirection('prev'); setIndex(i => i - 1); } };

  const arrowStyle = (side) => {
    const base = { position:'absolute', width:0, height:0, border:'10px solid transparent' };
    switch (side) {
      case 'top':    return { ...base, top:-20,    left:'50%', transform:'translateX(-50%)',  borderBottomColor: BROWN };
      case 'bottom': return { ...base, bottom:-20, left:'50%', transform:'translateX(-50%)',  borderTopColor: BROWN };
      case 'left':   return { ...base, left:-20,   top:'50%',  transform:'translateY(-50%)',  borderRightColor: BROWN };
      case 'right':  return { ...base, right:-20,  top:'50%',  transform:'translateY(-50%)',  borderLeftColor: BROWN };
      default: return base;
    }
  };

  return (
    <>
      {/* Same ease-in pop the in-game Menu popup uses (settingsModalIn), plus a
          left/right slide when paging with Next/Back. */}
      <style>{`
        @keyframes tutModalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tutSlideInNext {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes tutSlideInPrev {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {targetRect ? (
        <>
          <div style={{ position:'fixed', top:0, left:0, right:0, height:Math.max(0,targetRect.top-PAD), background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top:targetRect.bottom+PAD, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top:targetRect.top-PAD, left:0, width:Math.max(0,targetRect.left-PAD), height:targetRect.height+PAD*2, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top:targetRect.top-PAD, left:targetRect.right+PAD, right:0, height:targetRect.height+PAD*2, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top:targetRect.top-PAD, left:targetRect.left-PAD, width:targetRect.width+PAD*2, height:targetRect.height+PAD*2, border:'3px solid #fbbf24', boxShadow:'0 0 0 2px #fbbf2488, 0 0 20px 4px #fbbf2466', zIndex:20000, pointerEvents:'none' }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
      )}

      {/* Outer div handles fixed positioning/centering only, so the pop-in/slide
          animation's own `transform` (on the inner card) never clobbers the
          `translate(-50%,-50%)` centering transform. */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          left: targetRect ? tooltipPos.left : '50%',
          top:  targetRect ? tooltipPos.top  : '50%',
          transform: targetRect ? 'none' : 'translate(-50%,-50%)',
          zIndex: 20001,
        }}
      >
      <div
        key={index}
        style={{
          position: 'relative',
          width: 720,
          maxWidth: '94vw',
          background: CREAM,
          border: `4px solid ${BROWN}`,
          fontFamily: '"Press Start 2P", monospace',
          animation: `${direction === 'next' ? 'tutSlideInNext' : direction === 'prev' ? 'tutSlideInPrev' : 'tutModalIn'} 0.25s ease both`,
        }}
      >
        {targetRect && <div style={arrowStyle(arrowSide)} />}
        <div style={{ position:'absolute', inset:5, border:`1px solid ${BROWN}`, pointerEvents:'none' }} />
        {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i)=>(
          <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:BROWN,
            ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
        ))}

        {/* Header */}
        <div style={{ background: slide.isWarning ? '#7f1d1d' : BROWN, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:CREAM, letterSpacing:1 }}>{slide.title}</span>
          <button onClick={onComplete} style={{ fontSize:10, color:CREAM, background:'transparent', border:`1px solid ${CREAM}`, padding:'4px 9px', fontFamily:'"Press Start 2P", monospace', cursor:'pointer' }}>SKIP</button>
        </div>

        {/* Gameplay-accurate magic-circle diagram */}
        {slide.diagramStep !== null && (
          <div style={{ background: DARK, borderBottom:`3px solid ${BROWN}`, display:'flex', justifyContent:'center', alignItems:'center', padding:'12px 8px', overflowX:'auto' }}>
            <DissimilarCircleDiagram step={slide.diagramStep} width={360} />
          </div>
        )}

        {/* Body */}
        <div style={{ padding:'14px 16px 10px', fontSize:13, color:DARK, lineHeight:1.7, whiteSpace:'pre-line' }}>
          {slide.isWarning
            ? slide.body.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin:'0 0 10px', color: i===1?'#b91c1c':DARK, fontWeight: i===1?700:400 }}>{para}</p>
              ))
            : slide.body
          }
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 14px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`2px solid ${BROWN}` }}>
          <div style={{ display:'flex', gap:5 }}>
            {slides.map((_,i)=>(
              <div key={i} style={{ width:i===index?14:7, height:7, background:i===index?BROWN:'#b09090', transition:'all 0.2s' }} />
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <PixelBtn onClick={prev} disabled={index===0}>← BACK</PixelBtn>
            <PixelBtn onClick={next} primary>{slide.isLast ? 'PLAY! →' : 'NEXT →'}</PixelBtn>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ButterflyTutorial;
