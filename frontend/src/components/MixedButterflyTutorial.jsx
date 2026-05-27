import React, { useState } from 'react';
import ButterflyDiagramCanvas from './ButterflyDiagramCanvas';

// Example: 1 1/2 + 1 1/3
// impNum1 = 1×2+1 = 3  →  3/2
// impNum2 = 1×3+1 = 4  →  4/3
// cross1 = 3×3 = 9  |  cross2 = 4×2 = 8  |  commonDen = 6  |  sum = 17
// Answer: 17/6

const WHOLE1 = 1, NUM1 = 1, DEN1 = 2;
const WHOLE2 = 1, NUM2 = 1, DEN2 = 3;
const IMP1 = WHOLE1 * DEN1 + NUM1; // 3
const IMP2 = WHOLE2 * DEN2 + NUM2; // 4

// Problem used for the butterfly diagram slides (already converted)
const CONV_PROBLEM = {
  whole1: 0, numerator1: IMP1, denominator1: DEN1,
  whole2: 0, numerator2: IMP2, denominator2: DEN2,
  operator: '+', isMixed: false,
};

// ── Mixed number visual used in conversion slides ──
const MixedDisplay = ({ leftConverted, rightConverted }) => {
  const boxStyle = (converted, color) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: `3px solid ${converted ? color : '#ccc'}`,
    borderRadius: 10, padding: '4px 10px',
    background: converted ? `${color}15` : '#fff',
    transition: 'all 0.3s',
  });
  const numStyle = (color) => ({ fontSize: 22, fontWeight: 'bold', color });
  const lineStyle = { width: 40, height: 3, background: '#555', margin: '2px 0' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0' }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!leftConverted && (
          <span style={{ fontSize: 28, fontWeight: 'bold', color: '#222' }}>{WHOLE1}</span>
        )}
        <div style={boxStyle(leftConverted, '#ef4444')}>
          <span style={numStyle(leftConverted ? '#ef4444' : '#222')}>
            {leftConverted ? IMP1 : NUM1}
          </span>
          <div style={lineStyle} />
          <span style={numStyle('#222')}>{DEN1}</span>
        </div>
      </div>

      <span style={{ fontSize: 30, fontWeight: 'bold', color: '#444' }}>+</span>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {!rightConverted && (
          <span style={{ fontSize: 28, fontWeight: 'bold', color: '#222' }}>{WHOLE2}</span>
        )}
        <div style={boxStyle(rightConverted, '#10b981')}>
          <span style={numStyle(rightConverted ? '#10b981' : '#222')}>
            {rightConverted ? IMP2 : NUM2}
          </span>
          <div style={lineStyle} />
          <span style={numStyle('#222')}>{DEN2}</span>
        </div>
      </div>
    </div>
  );
};

// ── Slide definitions ──
const slides = [
  {
    type: 'mixed-display',
    leftConverted: false, rightConverted: false,
    title: 'Mixed Number Fractions',
    body: `Sometimes you will see fractions with a whole number in front — like 1 1/2 or 1 1/3. These are called mixed numbers. To use the Butterfly Method on them, we first need to convert them into improper fractions.`,
    computation: null, color: null,
  },
  {
    type: 'mixed-display',
    leftConverted: false, rightConverted: false,
    title: 'Our Example',
    body: `Let's solve  1 1/2 + 1 1/3  together. Both fractions have whole number parts, so we convert them first before using the Butterfly Method.`,
    computation: null, color: null,
  },
  {
    type: 'mixed-display',
    leftConverted: true, rightConverted: false,
    title: 'Step 1 — Convert the Left Mixed Number',
    body: `Multiply the whole number by the denominator, then add the numerator. This gives you the new numerator. The denominator stays the same.`,
    computation: `(1 × 2) + 1 = 3  →  3/2`,
    color: '#ef4444',
  },
  {
    type: 'mixed-display',
    leftConverted: true, rightConverted: true,
    title: 'Step 2 — Convert the Right Mixed Number',
    body: `Do the same for the right mixed number. Multiply whole × denominator, then add the numerator.`,
    computation: `(1 × 3) + 1 = 4  →  4/3`,
    color: '#10b981',
  },
  {
    type: 'butterfly',
    diagramStep: 0,
    title: 'Now Apply the Butterfly Method!',
    body: `Both mixed numbers are now improper fractions: 3/2 + 4/3. From here, apply the exact same Butterfly Method steps you already learned!`,
    computation: '3/2  +  4/3',
    color: '#555',
  },
  {
    type: 'butterfly',
    diagramStep: 1,
    title: 'Step 3 — Left Cross Product',
    body: `Draw the first butterfly wing. Multiply the left numerator by the right denominator.`,
    computation: '3 × 3 = 9',
    color: '#ef4444',
  },
  {
    type: 'butterfly',
    diagramStep: 2,
    title: 'Step 4 — Right Cross Product',
    body: `Draw the second butterfly wing. Multiply the right numerator by the left denominator.`,
    computation: '4 × 2 = 8',
    color: '#10b981',
  },
  {
    type: 'butterfly',
    diagramStep: 3,
    title: 'Step 5 — Multiply the Denominators',
    body: `Multiply both denominators together. This is the denominator of your final answer.`,
    computation: '2 × 3 = 6',
    color: '#8b5cf6',
  },
  {
    type: 'butterfly',
    diagramStep: 4,
    title: 'Step 6 — Combine the Cross Products',
    body: `Since we are adding, add the two cross products (9 and 8) to get the numerator.`,
    computation: '9 + 8 = 17',
    color: '#f59e0b',
  },
  {
    type: 'butterfly',
    diagramStep: 5,
    title: 'Step 7 — Final Answer',
    body: `Put the numerator over the denominator. Check if it simplifies — 17 and 6 share no common factors, so the answer is:`,
    computation: '17 / 6',
    color: '#333',
  },
  {
    type: 'done',
    title: "You're Ready for Mixed Numbers!",
    body: `Remember: first convert each mixed number to an improper fraction, then use the Butterfly Method just like before. You've got this, Wizard!`,
    computation: null, color: null,
    isLast: true,
  },
];

const MixedButterflyTutorial = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const total = slides.length;

  const next = () => { if (index < total - 1) setIndex(i => i + 1); else onComplete(); };
  const prev = () => { if (index > 0) setIndex(i => i - 1); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2100,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: 540, maxWidth: '95vw',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: '#fef3c7', borderBottom: '1px solid #fde68a',
        }}>
          <span style={{ fontSize: 12, color: '#92400e', fontWeight: 700, letterSpacing: 1 }}>
            MIXED NUMBER TUTORIAL
          </span>
          <button
            onClick={onComplete}
            style={{
              fontSize: 12, color: '#9ca3af', background: 'none',
              border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Skip Tutorial
          </button>
        </div>

        {/* Visual area */}
        <div style={{
          background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px 0 8px', minHeight: 130,
        }}>
          {slide.type === 'mixed-display' && (
            <MixedDisplay leftConverted={slide.leftConverted} rightConverted={slide.rightConverted} />
          )}
          {(slide.type === 'butterfly' || slide.type === 'done') && (
            <ButterflyDiagramCanvas problem={CONV_PROBLEM} currentStep={slide.diagramStep ?? 5} />
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: '#111827', fontWeight: 700 }}>
            {slide.title}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
            {slide.body}
          </p>
          {slide.computation && (
            <div style={{
              display: 'flex', justifyContent: 'center', padding: '10px 24px',
              background: `${slide.color}15`, border: `2px solid ${slide.color}`,
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: slide.color, letterSpacing: 2 }}>
                {slide.computation}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px', borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f9fafb',
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === index ? 16 : 7, height: 7, borderRadius: 4,
                background: i === index ? '#f59e0b' : '#d1d5db',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={prev}
              disabled={index === 0}
              style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600,
                border: '2px solid #d1d5db', borderRadius: 8,
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                background: '#fff', color: index === 0 ? '#9ca3af' : '#374151',
              }}
            >
              ← Back
            </button>
            <button
              onClick={next}
              style={{
                padding: '8px 24px', fontSize: 14, fontWeight: 700,
                border: 'none', borderRadius: 8, cursor: 'pointer',
                background: slide.isLast ? '#10b981' : '#f59e0b',
                color: '#fff',
              }}
            >
              {slide.isLast ? 'Start Playing!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixedButterflyTutorial;
