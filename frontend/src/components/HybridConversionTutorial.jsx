import { useState } from 'react';
import ButterflyDiagramCanvas from './ButterflyDiagramCanvas';

// Same pixel-art chrome as ButterflyTutorial.jsx (Dissimilar Island's own tutorial) —
// this is a Hybrid-specific fork of MixedButterflyTutorial's slide content, reskinned
// to match, rather than editing the shared component (which Dissimilar Island also
// uses for its own mixed-number sub-tutorial).
const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';

// Example: 1 1/2 + 1 1/3
const WHOLE1 = 1, NUM1 = 1, DEN1 = 2;
const WHOLE2 = 1, NUM2 = 1, DEN2 = 3;
const IMP1 = WHOLE1 * DEN1 + NUM1; // 3
const IMP2 = WHOLE2 * DEN2 + NUM2; // 4

const CONV_PROBLEM = {
  whole1: 0, numerator1: IMP1, denominator1: DEN1,
  whole2: 0, numerator2: IMP2, denominator2: DEN2,
  operator: '+', isMixed: false,
};

const PixelBtn = ({ onClick, disabled, primary, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    position: 'relative',
    padding: '10px 20px',
    background: disabled ? '#4a2a2a' : primary ? BROWN : CREAM,
    border: `3px solid ${BROWN}`,
    color: disabled ? '#6b4040' : primary ? CREAM : BROWN,
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 9, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 0, whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

// ── Mixed number visual used in conversion slides — square/pixel-art, not rounded ──
const MixedDisplay = ({ leftConverted, rightConverted }) => {
  const boxStyle = (converted, color) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: `3px solid ${converted ? color : '#a89578'}`,
    borderRadius: 0, padding: '4px 10px',
    background: converted ? CREAM : '#fff',
    transition: 'all 0.3s',
  });
  const numStyle = (color) => ({ fontSize: 20, fontWeight: 800, color, fontFamily: '"Press Start 2P", monospace' });
  const lineStyle = { width: 40, height: 3, background: DARK, margin: '4px 0' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!leftConverted && (
          <span style={{ fontSize: 24, fontWeight: 800, color: DARK, fontFamily: '"Press Start 2P", monospace' }}>{WHOLE1}</span>
        )}
        <div style={boxStyle(leftConverted, '#b91c1c')}>
          <span style={numStyle(leftConverted ? '#b91c1c' : DARK)}>{leftConverted ? IMP1 : NUM1}</span>
          <div style={lineStyle} />
          <span style={numStyle(DARK)}>{DEN1}</span>
        </div>
      </div>

      <span style={{ fontSize: 26, fontWeight: 800, color: DARK, fontFamily: '"Press Start 2P", monospace' }}>+</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!rightConverted && (
          <span style={{ fontSize: 24, fontWeight: 800, color: DARK, fontFamily: '"Press Start 2P", monospace' }}>{WHOLE2}</span>
        )}
        <div style={boxStyle(rightConverted, '#15803d')}>
          <span style={numStyle(rightConverted ? '#15803d' : DARK)}>{rightConverted ? IMP2 : NUM2}</span>
          <div style={lineStyle} />
          <span style={numStyle(DARK)}>{DEN2}</span>
        </div>
      </div>
    </div>
  );
};

// ── Slide definitions — same content as MixedButterflyTutorial ──
const slides = [
  {
    type: 'mixed-display',
    leftConverted: false, rightConverted: false,
    title: 'MIXED NUMBER FRACTIONS',
    body: 'Sometimes you will see fractions with a whole number in front — like 1 1/2 or 1 1/3. These are called mixed numbers. To solve them, we first need to convert them into improper fractions.',
    computation: null, color: null,
  },
  {
    type: 'mixed-display',
    leftConverted: false, rightConverted: false,
    title: 'OUR EXAMPLE',
    body: "Let's solve 1 1/2 + 1 1/3 together. Both fractions have whole number parts, so we convert them first.",
    computation: null, color: null,
  },
  {
    type: 'mixed-display',
    leftConverted: true, rightConverted: false,
    title: 'STEP 1 — CONVERT THE LEFT NUMBER',
    body: 'Multiply the whole number by the denominator, then add the numerator. This gives you the new numerator. The denominator stays the same.',
    computation: '(1 × 2) + 1 = 3  →  3/2',
    color: '#b91c1c',
  },
  {
    type: 'mixed-display',
    leftConverted: true, rightConverted: true,
    title: 'STEP 2 — CONVERT THE RIGHT NUMBER',
    body: 'Do the same for the right mixed number. Multiply whole × denominator, then add the numerator.',
    computation: '(1 × 3) + 1 = 4  →  4/3',
    color: '#15803d',
  },
  {
    type: 'butterfly',
    diagramStep: 0,
    title: 'NOW SOLVE LIKE NORMAL!',
    body: 'Both mixed numbers are now improper fractions: 3/2 + 4/3. If the denominators match, combine the numerators directly. If not, use the Butterfly (cross-multiply) Method — same as you already know!',
    computation: '3/2  +  4/3',
    color: DARK,
  },
  {
    type: 'butterfly',
    diagramStep: 1,
    title: 'STEP 3 — LEFT CROSS PRODUCT',
    body: 'If the denominators are different: multiply the left numerator by the right denominator.',
    computation: '3 × 3 = 9',
    color: '#b91c1c',
  },
  {
    type: 'butterfly',
    diagramStep: 2,
    title: 'STEP 4 — RIGHT CROSS PRODUCT',
    body: 'Multiply the right numerator by the left denominator.',
    computation: '4 × 2 = 8',
    color: '#15803d',
  },
  {
    type: 'butterfly',
    diagramStep: 3,
    title: 'STEP 5 — MULTIPLY THE DENOMINATORS',
    body: 'Multiply both denominators together. This is the denominator of your final answer.',
    computation: '2 × 3 = 6',
    color: '#7c3aed',
  },
  {
    type: 'butterfly',
    diagramStep: 4,
    title: 'STEP 6 — COMBINE',
    body: 'Since we are adding, add the two cross products (9 and 8) to get the numerator.',
    computation: '9 + 8 = 17',
    color: '#b45309',
  },
  {
    type: 'butterfly',
    diagramStep: 5,
    title: 'STEP 7 — FINAL ANSWER',
    body: 'Put the numerator over the denominator, then simplify if you can.',
    computation: '17 / 6',
    color: DARK,
  },
  {
    type: 'done',
    title: "YOU'RE READY!",
    body: 'Remember: draw the triangle to convert each mixed number first, then solve just like before. You\'ve got this, Wizard!',
    computation: null, color: null,
    isLast: true,
  },
];

const HybridConversionTutorial = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const total = slides.length;

  const next = () => { if (index < total - 1) setIndex(i => i + 1); else onComplete(); };
  const prev = () => { if (index > 0) setIndex(i => i - 1); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 20100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'relative', width: 520, maxWidth: '96vw',
        background: CREAM, border: `4px solid ${BROWN}`,
        fontFamily: '"Press Start 2P", monospace',
      }}>
        <div style={{ position: 'absolute', inset: 5, border: `1px solid ${BROWN}`, pointerEvents: 'none' }} />
        {[[-6,-6],[null,-6],[-6,null],[null,null]].map(([t,l],i) => (
          <div key={i} style={{ position:'absolute', zIndex:10, pointerEvents:'none', width:12, height:12, background:BROWN,
            ...(t!==null?{top:t}:{bottom:-6}), ...(l!==null?{left:l}:{right:-6}) }}/>
        ))}

        {/* Header */}
        <div style={{ background: BROWN, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: CREAM, letterSpacing: 1 }}>{slide.title}</span>
          <button onClick={onComplete} style={{ fontSize: 8, color: CREAM, background: 'transparent', border: `1px solid ${CREAM}`, padding: '3px 8px', fontFamily: '"Press Start 2P", monospace', cursor: 'pointer' }}>SKIP</button>
        </div>

        {/* Visual area */}
        <div style={{ background: DARK, borderBottom: `3px solid ${BROWN}`, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 8px', minHeight: 130, overflowX: 'auto' }}>
          {slide.type === 'mixed-display' && (
            <MixedDisplay leftConverted={slide.leftConverted} rightConverted={slide.rightConverted} />
          )}
          {(slide.type === 'butterfly' || slide.type === 'done') && (
            <ButterflyDiagramCanvas problem={CONV_PROBLEM} currentStep={slide.diagramStep ?? 5} />
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 9, color: DARK, lineHeight: 1.9, fontFamily: '"Press Start 2P", monospace' }}>
            {slide.body}
          </p>
          {slide.computation && (
            <div style={{
              display: 'flex', justifyContent: 'center', padding: '10px 16px',
              background: CREAM, border: `2px solid ${slide.color}`, borderRadius: 0,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: slide.color, letterSpacing: 1, fontFamily: '"Press Start 2P", monospace' }}>
                {slide.computation}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `2px solid ${BROWN}` }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === index ? 14 : 7, height: 7, background: i === index ? BROWN : '#b09090', transition: 'all 0.2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PixelBtn onClick={prev} disabled={index === 0}>← BACK</PixelBtn>
            <PixelBtn onClick={next} primary>{slide.isLast ? 'PLAY! →' : 'NEXT →'}</PixelBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HybridConversionTutorial;
