import React, { useState, useLayoutEffect, useRef } from 'react';
import ButterflyDiagramCanvas from './ButterflyDiagramCanvas';

const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';
const PAD   = 10;
const EXAMPLE = { numerator1: 1, denominator1: 2, numerator2: 1, denominator2: 3, operator: '+' };

const slides = [
  {
    targetId: null,
    diagramStep: 0,
    title: 'BUTTERFLY METHOD',
    body: 'When two fractions have different denominators, we use the Butterfly Method. Cross-multiply both ways, multiply the denominators, then combine!',
  },
  {
    targetId: 'problem-box',
    diagramStep: 0,
    title: 'READ THE PROBLEM',
    body: "Look at YOUR problem here. Note the two fractions — the denominators are different, so we can't add directly. We'll use 1/2 + 1/3 as a demo.",
  },
  {
    targetId: 'problem-box',
    diagramStep: 1,
    title: 'STEP 1 — LEFT CROSS',
    body: 'Look at your problem. Multiply the LEFT numerator × RIGHT denominator.\n\nDemo: 1 × 3 = 3\n\nFind those numbers in YOUR problem above!',
  },
  {
    targetId: 'problem-box',
    diagramStep: 2,
    title: 'STEP 2 — RIGHT CROSS',
    body: 'Still looking at your problem. Multiply the RIGHT numerator × LEFT denominator.\n\nDemo: 1 × 2 = 2\n\nFind those numbers in YOUR problem above!',
  },
  {
    targetId: 'problem-box',
    diagramStep: 3,
    title: 'STEP 3 — DENOMINATORS',
    body: 'Multiply BOTH bottom numbers together. This is the denominator of your final answer.\n\nDemo: 2 × 3 = 6\n\nFind the two bottom numbers in YOUR problem!',
  },
  {
    targetId: 'interactable',
    diagramStep: 4,
    title: 'STEP 4 — COMBINE HERE',
    body: 'After drawing the ∞ symbol, combine the two cross products here using the operator.\n\nDemo: 3 + 2 = 5\n\nEnter your result in this box!',
  },
  {
    targetId: 'interactable',
    diagramStep: 5,
    title: 'STEP 5 — FINAL ANSWER',
    body: 'Enter your final fraction here: combined numerator over denominator product. Simplify if possible.\n\nDemo: 5/6\n\nType YOUR answer in this box!',
  },
  {
    targetId: 'interactable',
    diagramStep: null,
    title: 'DRAW ∞ TO START',
    body: 'Draw an infinity (∞) symbol inside this box to activate all the input fields.\n\nThen fill in each step using the numbers from your problem.',
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

  const next = () => index < total - 1 ? setIndex(i => i + 1) : onComplete();
  const prev = () => index > 0 && setIndex(i => i - 1);

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

      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          left: targetRect ? tooltipPos.left : '50%',
          top:  targetRect ? tooltipPos.top  : '50%',
          transform: targetRect ? 'none' : 'translate(-50%,-50%)',
          zIndex: 2001,
          width: slide.diagramStep !== null ? 560 : 400,
          zIndex: 20001,
          width: slide.diagramStep !== null ? 520 : 360,
          maxWidth: '96vw',
          background: CREAM,
          border: `4px solid ${BROWN}`,
          fontFamily: '"Press Start 2P", monospace',
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

        {/* Butterfly diagram */}
        {slide.diagramStep !== null && (
          <div style={{ background: DARK, borderBottom:`3px solid ${BROWN}`, display:'flex', justifyContent:'center', alignItems:'center', padding:'12px 8px', overflowX:'auto' }}>
            <ButterflyDiagramCanvas problem={EXAMPLE} currentStep={slide.diagramStep} />
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
    </>
  );
};

export default ButterflyTutorial;
