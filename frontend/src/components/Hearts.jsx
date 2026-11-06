import React from 'react';

// The battle's heart row, with half hearts: each heart shows its filled share (full, half or empty) by
// laying the coloured heart, cut to that share from the left, over a faded grey one.
const HEART_SRC = '/InteractableUI/HeartSprite.png';

const Hearts = ({ count, max, size = 28 }) => (
  <>
    {Array.from({ length: max }, (_, i) => {
      const fill = Math.max(0, Math.min(1, count - i));   // 0, 0.5 or 1
      const layer = {
        position: 'absolute', inset: 0,
        backgroundImage: `url(${HEART_SRC})`,
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        imageRendering: 'pixelated',
      };
      return (
        <div
          key={i}
          role="img"
          aria-label={fill === 1 ? 'full heart' : fill > 0 ? 'half heart' : 'empty heart'}
          style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}
        >
          <div style={{ ...layer, opacity: 0.25, filter: 'grayscale(1)' }} />
          {fill > 0 && (
            <div style={{ ...layer, clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`, transition: 'clip-path 0.3s ease' }} />
          )}
        </div>
      );
    })}
  </>
);

export default Hearts;
