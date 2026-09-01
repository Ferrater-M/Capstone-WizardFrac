import React, { useState, useEffect } from 'react';
import ButterflyDiagramCanvas from './ButterflyDiagramCanvas';

const BROWN = '#7C3AED';  // now the accent/border purple
const CREAM = '#211044';  // now the panel background
const DARK  = '#F8F7FF';  // now the readable body text
const GOLD  = '#FBBF24';
const PANEL2 = '#32175E';
const TEXT2  = '#C4B5FD';

const BUTTERFLY_EXAMPLE = { numerator1: 1, denominator1: 2, numerator2: 1, denominator2: 3, operator: '+' };
const BUTTERFLY_SLIDE_INDEX = 2;

const Heart = ({ filled }) => (
  <span style={{ fontSize: 18, color: filled ? '#e0245e' : '#4a3a6e', filter: filled ? 'drop-shadow(0 0 3px #e0245e)' : 'none' }}>
    {filled ? '❤' : '♡'}
  </span>
);

const slides = [
  {
    title: 'WELCOME, WIZARD',
    icon: '🧙',
    body: 'You are a young wizard between the Fraction Islands. Each islands guards monsters that can only be defeated with correctly cast fraction spells.\n\nThis quick guide explains how battles work before you set the game',
  },
  {
    title: 'THE SAME CONTAINER',
    icon: '🪄',
    body: 'On the Similiar Island, When two fractions share the same denominator, they are stored in the "Same Container" — picture both fractions poured into one jar split into equal slices.\n\nBecause the slices already match, you skip cross-multiplying and just add or subtract the top numbers (numerators) directly.',
    visual: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0' }}>
        {['2', '1'].map((n, i) => (
          <React.Fragment key={i}>
            {i === 1 && <span style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>+</span>}
            <div style={{
              width: 54, height: 64, border: `2px solid ${BROWN}`, borderRadius: 6,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              background: 'rgba(124,58,237,0.14)', overflow: 'hidden',
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: DARK }}>{n}</div>
              <div style={{ height: 2, background: BROWN }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: DARK }}>5</div>
            </div>
          </React.Fragment>
        ))}
        <span style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>=</span>
        <div style={{
          width: 54, height: 64, border: `2px solid ${GOLD}`, borderRadius: 6,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: 'rgba(246,184,37,0.12)',
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: DARK }}>3</div>
          <div style={{ height: 2, background: GOLD }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: DARK }}>5</div>
        </div>
      </div>
    ),
  },
  {
    title: 'THE BUTTERFLY METHOD',
    icon: '🦋',
    body: 'On Dissimilar Island, the denominators do not match — so the Same Container trick will not work. Instead, cross-multiply like a butterfly\'s wings:\n\n1. LEFT numerator × RIGHT denominator\n2. RIGHT numerator × LEFT denominator\n3. Multiply BOTH denominators together for the new bottom number\n4. Combine the two cross products with the operator for the new top number\n\nDraw the ∞ symbol to open the fields, then fill in each step.',
    isButterfly: true,
  },
  {
    title: 'HYBRID ISLAND',
    icon: '🌀',
    body: 'Hybrid Island throws mixed numbers at you — a whole number plus a fraction (e.g. 1 1/2).\n\nBefore casting, convert each mixed number into an improper fraction:\n\nwhole × denominator + numerator, kept over the same denominator.\n\nOnce both fractions are improper, finish the spell with the Butterfly Method.',
    visual: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '10px 0', fontSize: 13, fontWeight: 900, color: DARK }}>
        <span>1</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>1</span><div style={{ width: 22, height: 2, background: BROWN, margin: '3px 0' }} /><span>2</span>
        </div>
        <span style={{ fontSize: 18, color: GOLD }}>→</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>3</span><div style={{ width: 22, height: 2, background: GOLD, margin: '3px 0' }} /><span>2</span>
        </div>
      </div>
    ),
  },
  {
    title: 'CASTING A SPELL',
    icon: '✨',
    body: 'Casting works in pieces, just like assembling a spell from components:\n\n1. Draw a circle to channel your magic and reveal the input fields.\n2. Select the pieces — fill in the denominator and the numerator expression (e.g. 2+1).\n3. Combine them into your final fraction, simplified if possible.\n4. Press Cast Spell to unleash it on the enemy!',
  },
  {
    title: 'YOUR LIVES',
    icon: '💗',
    body: 'You begin every battle with 3 lives.\n\nEvery time you cast an incorrect spell, you lose a life and the enemy strikes back. Lose all 3 lives and the battle ends in defeat — so think before you cast!',
    visual: (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '12px 0' }}>
        <Heart filled /><Heart filled /><Heart filled />
      </div>
    ),
  },
  {
    title: 'STREAKS & MULTIPLIERS',
    icon: '🔥',
    body: 'Cast correct spells back-to-back to build a streak. Each streak point raises your score multiplier by 0.2x, up to a maximum of 2.0x.\n\nA single wrong answer — or using a hint — resets your streak to zero. Stay sharp and chain your correct casts for maximum points!',
  },
  {
    title: 'ENEMY & BOSS HEALTH',
    icon: '👾',
    body: 'Every enemy has a 3 hearts across a number of hit points. Each correct spell chips away part of their health, regardless of whether the problem is addition or subtraction — the same casting rules apply both ways.\n\nStage 6 of every island holds a Boss with much more health than a regular enemy — defeat it to conquer the island!',
    isLast: true,
  },
];

const PixelBtn = ({ onClick, disabled, primary, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    position: 'relative',
    padding: '10px 20px',
    background: disabled ? PANEL2 : primary ? BROWN : PANEL2,
    border: `1px solid ${disabled ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.5)'}`,
    color: disabled ? TEXT2 : primary ? DARK : TEXT2,
    opacity: disabled ? 0.5 : 1,
    fontFamily: '"Press Start 2P", monospace',
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 8,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
);

const GameMechanicsIntro = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [butterflyStep, setButterflyStep] = useState(0);
  const slide = slides[index];
  const total = slides.length;

  const next = () => index < total - 1 ? setIndex(i => i + 1) : onComplete();
  const prev = () => index > 0 && setIndex(i => i - 1);

  useEffect(() => {
    if (index !== BUTTERFLY_SLIDE_INDEX) {
      setButterflyStep(0);
      return;
    }
    const id = setInterval(() => {
      setButterflyStep(s => (s + 1) % 6);
    }, 1100);
    return () => clearInterval(id);
  }, [index]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,4,20,0.78)', backdropFilter: 'blur(4px)' }}>
      <div style={{
        position: 'relative',
        width: 460,
        maxWidth: '90vw',
        background: `linear-gradient(165deg, ${CREAM} 0%, #150a38 100%)`,
        border: '1px solid rgba(168,85,247,0.4)',
        borderRadius: 18,
        boxShadow: '0 0 40px rgba(124,58,237,0.35), 0 20px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        fontFamily: '"Press Start 2P", monospace',
      }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${BROWN} 0%, #4F46E5 100%)`, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: DARK, letterSpacing: 1 }}>{slide.icon} {slide.title}</span>
          <button onClick={onComplete} style={{ fontSize: 10, color: DARK, background: 'transparent', border: `1px solid ${DARK}`, borderRadius: 6, padding: '4px 9px', fontFamily: '"Press Start 2P", monospace', cursor: 'pointer' }}>SKIP</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 18px 8px' }}>
          {slide.isButterfly ? (
            <div style={{ width: 368, height: 168, margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                <ButterflyDiagramCanvas problem={BUTTERFLY_EXAMPLE} currentStep={butterflyStep} />
              </div>
            </div>
          ) : slide.visual}
          <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {slide.body}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(168,85,247,0.3)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === index ? 14 : 7, height: 7, borderRadius: 4, background: i === index ? GOLD : PANEL2, transition: 'all 0.2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PixelBtn onClick={prev} disabled={index === 0}>← BACK</PixelBtn>
            <PixelBtn onClick={next} primary>{slide.isLast ? 'SET! →' : 'NEXT →'}</PixelBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMechanicsIntro;
