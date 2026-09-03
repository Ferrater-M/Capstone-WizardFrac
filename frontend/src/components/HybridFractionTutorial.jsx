import React, { useState, useLayoutEffect, useRef } from 'react';
import ForgeDiagram from './ForgeDiagram';
import SimilarCircleDiagram from './SimilarCircleDiagram';
import DissimilarCircleDiagram from './DissimilarCircleDiagram';

const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';
const PAD   = 10; // spotlight padding around target

// `diagram` is either null (no visual), { type: 'forge', step } for the Forge
// stage (see ForgeDiagram for its 0-4 step scale), or { type: 'dual' } to
// preview both possible solving paths side by side.
const slides = [
  {
    targetId: null,
    diagram: null,
    title: 'HYBRID ISLAND',
    body: 'Hybrid problems mix whole numbers into your fractions. Convert each one into an improper fraction first, then solve it the Similar or Butterfly way — whichever the denominators call for.',
  },
  {
    targetId: 'problem-box',
    diagram: null,
    title: 'READ YOUR PROBLEM',
    body: 'Look at YOUR problem here. Each side is a mixed number — a whole number plus a fraction, like 1 1/2.',
  },
  {
    targetId: 'interactable',
    diagram: { type: 'forge', step: 1 },
    title: 'STEP 1 — DRAW THE TRIANGLE',
    body: 'Draw a triangle inside this box to begin. Your whole number, numerator, and denominator appear as draggable pieces.',
  },
  {
    targetId: 'interactable',
    diagram: { type: 'forge', step: 2 },
    title: 'STEP 2 — MULTIPLY',
    body: 'Drag the denominator onto the whole number to multiply them. Type the product, then press Forge.\n\nDemo: 1 × 2 = 2',
  },
  {
    targetId: 'interactable',
    diagram: { type: 'forge', step: 3 },
    title: 'STEP 3 — ADD',
    body: "Drag that product onto the numerator to add them. Type the sum, then press Forge again — that's your improper fraction!\n\nDemo: 2 + 1 = 3",
  },
  {
    targetId: 'interactable',
    diagram: { type: 'dual' },
    title: 'STEP 4 — SOLVE',
    body: 'Once both fractions are improper, the island picks the method:\n\n• Same denominators → draw a circle and combine the top numbers, just like Similar Island.\n• Different denominators → draw the ∞ symbol and drag pieces to cross-multiply, just like Dissimilar Island.',
  },
  {
    targetId: 'interactable',
    diagram: null,
    title: 'STEP 5 — CAST THE SPELL!',
    body: 'Enter your final fraction here (numerator on top, denominator below).\n\nSimplify if possible, then press Cast Spell to deal damage!',
  },
  {
    targetId: null,
    diagram: null,
    title: '⚠ ABOUT THE HINT',
    body: 'A Hint button appears after you draw the shape.\n\nIf you use it, the formula will be shown — but your answer will NOT be fully recorded and your score for that problem will be reduced.\n\nTry to solve it on your own first!',
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
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 0,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

const HybridFractionTutorial = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [arrowSide, setArrowSide] = useState('top'); // which side the arrow is on
  // 'in' = first appearance (same pop-in as the Menu popup), 'next'/'prev' = which
  // way the card slides when paging between steps.
  const [direction, setDirection] = useState('in');

  const slide = slides[index];
  const total = slides.length;

  // Measure target element position
  useLayoutEffect(() => {
    if (!slide.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${slide.targetId}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [index, slide.targetId]);

  // Position tooltip near the target
  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tt = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - (targetRect.bottom + PAD);
    const spaceAbove = targetRect.top - PAD;
    const spaceRight = vw - (targetRect.right + PAD);

    let left = targetRect.left + targetRect.width / 2 - tt.width / 2;
    let top;
    let side;

    if (spaceBelow >= tt.height + 20) {
      // place below target
      top  = targetRect.bottom + PAD + 16;
      side = 'top';
    } else if (spaceAbove >= tt.height + 20) {
      // place above target
      top  = targetRect.top - PAD - tt.height - 16;
      side = 'bottom';
    } else if (spaceRight >= tt.width + 20) {
      // place right of target
      left = targetRect.right + PAD + 16;
      top  = targetRect.top + targetRect.height / 2 - tt.height / 2;
      side = 'left';
    } else {
      // place left of target
      left = targetRect.left - PAD - tt.width - 16;
      top  = targetRect.top + targetRect.height / 2 - tt.height / 2;
      side = 'right';
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(vw - tt.width - 8, left));
    top  = Math.max(8, Math.min(vh - tt.height - 8, top));

    setTooltipPos({ left, top });
    setArrowSide(side);
  }, [targetRect]);

  const next = () => { if (index < total - 1) { setDirection('next'); setIndex(i => i + 1); } else onComplete(); };
  const prev = () => { if (index > 0) { setDirection('prev'); setIndex(i => i - 1); } };

  // Arrow pointing toward the target
  const arrowStyle = (side) => {
    const base = {
      position: 'absolute',
      width: 0, height: 0,
      border: '10px solid transparent',
    };
    const color = BROWN;
    switch (side) {
      case 'top':    return { ...base, top: -20, left: '50%', transform: 'translateX(-50%)', borderBottomColor: color };
      case 'bottom': return { ...base, bottom: -20, left: '50%', transform: 'translateX(-50%)', borderTopColor: color };
      case 'left':   return { ...base, left: -20, top: '50%', transform: 'translateY(-50%)', borderRightColor: color };
      case 'right':  return { ...base, right: -20, top: '50%', transform: 'translateY(-50%)', borderLeftColor: color };
      default:       return base;
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

      {/* Spotlight overlays */}
      {targetRect ? (
        <>
          <div style={{ position:'fixed', top:0, left:0, right:0, height: Math.max(0, targetRect.top - PAD), background:'rgba(0,0,0,0.78)', zIndex:1999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.bottom + PAD, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.78)', zIndex:1999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.top - PAD, left:0, width: Math.max(0, targetRect.left - PAD), height: targetRect.height + PAD*2, background:'rgba(0,0,0,0.78)', zIndex:1999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.top - PAD, left: targetRect.right + PAD, right:0, height: targetRect.height + PAD*2, background:'rgba(0,0,0,0.78)', zIndex:1999, pointerEvents:'none' }} />
          {/* Highlight border around target */}
          <div style={{ position:'fixed', top: targetRect.top - PAD, left: targetRect.left - PAD, width: targetRect.width + PAD*2, height: targetRect.height + PAD*2, border:`3px solid #fbbf24`, boxShadow:'0 0 0 2px #fbbf2488, 0 0 20px 4px #fbbf2466', zIndex:2000, pointerEvents:'none' }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:1999, pointerEvents:'none' }} />
      )}

      {/* Tooltip callout — outer div handles fixed positioning/centering only,
          so the pop-in/slide animation's own `transform` (on the inner card)
          never clobbers the `translate(-50%,-50%)` centering transform. */}
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
        {/* Arrow pointing toward target */}
        {targetRect && <div style={arrowStyle(arrowSide)} />}

        {/* Inner border decoration */}
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

        {/* Gameplay-accurate diagram(s) */}
        {slide.diagram?.type === 'forge' && (
          <div style={{ background: DARK, borderBottom:`3px solid ${BROWN}`, display:'flex', justifyContent:'center', alignItems:'center', padding:'12px 8px', overflowX:'auto' }}>
            <ForgeDiagram step={slide.diagram.step} width={220} />
          </div>
        )}
        {slide.diagram?.type === 'dual' && (
          <div style={{ background: DARK, borderBottom:`3px solid ${BROWN}`, display:'flex', justifyContent:'center', alignItems:'flex-start', gap:36, padding:'14px 8px 10px', overflowX:'auto' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:8, color:CREAM, fontFamily:'"Press Start 2P", monospace', letterSpacing:0.5 }}>SAME DENOMINATORS</span>
              <SimilarCircleDiagram step={2} width={220} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:8, color:CREAM, fontFamily:'"Press Start 2P", monospace', letterSpacing:0.5 }}>DIFFERENT DENOMINATORS</span>
              <DissimilarCircleDiagram step={2} width={260} />
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ padding:'16px 16px 12px', fontSize:13, color: DARK, lineHeight:1.7, whiteSpace:'pre-line' }}>
          {slide.isWarning ? (
            <>
              {slide.body.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: i === 0 ? '0 0 10px' : '0 0 10px', color: i === 1 ? '#b91c1c' : DARK, fontWeight: i === 1 ? 700 : 400 }}>
                  {para}
                </p>
              ))}
            </>
          ) : slide.body}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 14px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`2px solid ${BROWN}` }}>
          {/* Dot indicators */}
          <div style={{ display:'flex', gap:5 }}>
            {slides.map((_,i)=>(
              <div key={i} style={{ width: i===index?14:7, height:7, background: i===index?BROWN:'#b09090', transition:'all 0.2s' }} />
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

export default HybridFractionTutorial;
