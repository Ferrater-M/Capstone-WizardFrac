import React, { useState, useLayoutEffect, useRef } from 'react';

const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';
const PAD   = 10; // spotlight padding around target

const slides = [
  {
    targetId: null,
    title: 'HYBRID ISLAND',
    body: 'Hybrid problems mix whole numbers into your fractions. Convert each one into an improper fraction first, then solve it the Similar or Butterfly way — whichever the denominators call for.',
  },
  {
    targetId: 'problem-box',
    title: 'READ YOUR PROBLEM',
    body: 'Look at YOUR problem here. Each side is a mixed number — a whole number plus a fraction, like 1 1/2.',
  },
  {
    targetId: 'interactable',
    title: 'STEP 1 — FORGE THE FRACTION',
    body: 'Draw a triangle inside this box to begin.\n\nConvert each mixed number into an improper fraction:\nwhole × denominator + numerator, kept over the same denominator.',
  },
  {
    targetId: 'interactable',
    title: 'STEP 2 — SOLVE',
    body: 'Once both fractions are improper, the island picks the method:\n\n• Same denominators → draw a circle and combine the top numbers.\n• Different denominators → draw the ∞ symbol and cross-multiply like a butterfly.',
  },
  {
    targetId: 'interactable',
    title: 'STEP 3 — CAST THE SPELL!',
    body: 'Enter your final fraction here (numerator on top, denominator below).\n\nSimplify if possible, then press Cast Spell to deal damage!',
  },
  {
    targetId: null,
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

  const next = () => index < total - 1 ? setIndex(i => i + 1) : onComplete();
  const prev = () => index > 0 && setIndex(i => i - 1);

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

      {/* Tooltip callout */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          left: targetRect ? tooltipPos.left : '50%',
          top:  targetRect ? tooltipPos.top  : '50%',
          transform: targetRect ? 'none' : 'translate(-50%,-50%)',
          zIndex: 2001,
          width: 400,
          background: CREAM,
          border: `4px solid ${BROWN}`,
          fontFamily: '"Press Start 2P", monospace',
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
    </>
  );
};

export default HybridFractionTutorial;
