import React, { useState } from 'react';
import ButterflyDiagramCanvas from './ButterflyDiagramCanvas';

const EXAMPLE = { numerator1: 1, denominator1: 2, numerator2: 1, denominator2: 3, operator: '+' };

const slides = [
  {
    diagramStep: 0,
    title: 'The Butterfly Method',
    body: 'When two fractions have different bottom numbers (denominators), we cannot add or subtract them directly. We use the Butterfly Method to solve this!',
    computation: null,
    color: null,
  },
  {
    diagramStep: 0,
    title: 'Our Example',
    body: "Let's walk through solving  1/2 + 1/3  together. The denominators are 2 and 3 — they're different, so we'll use the Butterfly Method.",
    computation: '1/2  +  1/3  = ?',
    color: '#555',
  },
  {
    diagramStep: 1,
    title: 'Step 1 — Left Cross Product',
    body: 'Draw a diagonal line from the left numerator to the right denominator (the first butterfly wing). Multiply those two numbers together.',
    computation: '1 × 3 = 3',
    color: '#ef4444',
  },
  {
    diagramStep: 2,
    title: 'Step 2 — Right Cross Product',
    body: 'Draw a diagonal line from the right numerator to the left denominator (the second wing). Multiply those two numbers.',
    computation: '1 × 2 = 2',
    color: '#10b981',
  },
  {
    diagramStep: 3,
    title: 'Step 3 — Multiply the Denominators',
    body: "Multiply both bottom numbers (denominators) together. The result becomes the denominator of your final answer.",
    computation: '2 × 3 = 6',
    color: '#8b5cf6',
  },
  {
    diagramStep: 4,
    title: 'Step 4 — Combine the Cross Products',
    body: 'Since we are adding, we ADD the results from Step 1 and Step 2. (If we were subtracting, we would subtract them.) This gives us the top number of the answer.',
    computation: '3 + 2 = 5',
    color: '#f59e0b',
  },
  {
    diagramStep: 5,
    title: 'Step 5 — Write & Simplify',
    body: 'Put the combined cross products over the common denominator. Then check if the fraction can be simplified. Since 5 and 6 share no common factors, the final answer is:',
    computation: '5 / 6',
    color: '#333',
  },
  {
    diagramStep: 5,
    title: "You've Got This!",
    body: "Now you know the Butterfly Method! Cross multiply both ways, multiply the denominators, then combine. Good luck, Wizard — it's your turn!",
    computation: null,
    color: null,
    isLast: true,
  },
];

const ButterflyTutorial = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const total = slides.length;

  const next = () => {
    if (index < total - 1) setIndex(i => i + 1);
    else onComplete();
  };
  const prev = () => { if (index > 0) setIndex(i => i - 1); };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.80)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: 520,
        maxWidth: '95vw',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px',
          background: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            BUTTERFLY METHOD TUTORIAL
          </span>
          <button
            onClick={onComplete}
            style={{
              fontSize: 12, color: '#9ca3af', background: 'none',
              border: '1px solid #d1d5db', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer',
            }}
          >
            Skip Tutorial
          </button>
        </div>

        {/* Diagram */}
        <div style={{
          background: '#f9fafb',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px 0 10px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <ButterflyDiagramCanvas problem={EXAMPLE} currentStep={slide.diagramStep} />
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#111827', fontWeight: 700 }}>
            {slide.title}
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
            {slide.body}
          </p>

          {slide.computation && (
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '12px 24px',
              background: `${slide.color}15`,
              border: `2px solid ${slide.color}`,
              borderRadius: 12,
            }}>
              <span style={{
                fontSize: 26, fontWeight: 800,
                color: slide.color,
                letterSpacing: 2,
              }}>
                {slide.computation}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f9fafb',
        }}>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: i === index ? 18 : 8,
                height: 8,
                borderRadius: 4,
                background: i === index ? '#8b5cf6' : '#d1d5db',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={prev}
              disabled={index === 0}
              style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600,
                border: '2px solid #d1d5db', borderRadius: 8, cursor: index === 0 ? 'not-allowed' : 'pointer',
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
                background: slide.isLast ? '#10b981' : '#8b5cf6',
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

export default ButterflyTutorial;
