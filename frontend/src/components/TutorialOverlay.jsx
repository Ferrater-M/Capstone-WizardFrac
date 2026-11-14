import { useState, useLayoutEffect, useRef } from 'react';

// Shared battle-tutorial shell used by every island (SimilarFractionTutorial, ButterflyTutorial,
// HybridFractionTutorial). Each island only supplies its slides:
//   { title, body, targetId?, video?, isWarning?, isLast? }
// - targetId: a [data-tutorial="..."] element to spotlight. Used for slides that only point at
//   where to look (no gesture), so they need no video.
// - video: a screen recording of the gesture/action (served from /public/TutorialVideos/...).
//   Plays muted on a loop. A missing file shows a "not added yet" placeholder in dev and is
//   simply left out in production builds.

const BROWN = '#703737';
const CREAM = '#e8d5b4';
const DARK  = '#1a0f0f';
const PAD   = 10; // spotlight padding around target

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

// Silent no matter what: muted + volume 0, re-applied if anything tries to change it. The clip has
// no controls, so the player can't unmute it either.
const forceSilent = (el) => { if (el) { el.muted = true; el.volume = 0; } };

// The video is drawn at its own aspect ratio (width 100%, height auto) and the card's width is
// capped by the screen height instead (see TutorialOverlay), so it never gets black bars.
const TutorialVideo = ({ src, onAspect }) => {
  const [missing, setMissing] = useState(false);
  if (missing && import.meta.env.PROD) return null;
  return (
    <div style={{ background: DARK, borderBottom: `3px solid ${BROWN}`, lineHeight: 0 }}>
      {missing ? (
        <div style={{
          width: '100%', aspectRatio: '16 / 9', lineHeight: 1.4,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          border: `2px dashed ${CREAM}`, color: CREAM, fontSize: 9, textAlign: 'center', padding: 12, boxSizing: 'border-box',
        }}>
          <span>VIDEO NOT ADDED YET</span>
          <span style={{ fontSize: 8, opacity: 0.75, wordBreak: 'break-all' }}>public{src}</span>
        </div>
      ) : (
        <video
          ref={forceSilent}
          src={src}
          autoPlay loop muted playsInline
          disablePictureInPicture disableRemotePlayback
          onLoadedMetadata={(e) => {
            forceSilent(e.currentTarget);
            const { videoWidth: w, videoHeight: h } = e.currentTarget;
            if (w && h) onAspect?.(w / h);
          }}
          onVolumeChange={(e) => { if (!e.currentTarget.muted || e.currentTarget.volume > 0) forceSilent(e.currentTarget); }}
          onError={() => setMissing(true)}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      )}
    </div>
  );
};

const TutorialOverlay = ({ slides, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [arrowSide, setArrowSide] = useState('top'); // which side the arrow is on
  // 'in' = first appearance (same pop-in as the Menu popup), 'next'/'prev' = which
  // way the card slides when paging between steps.
  const [direction, setDirection] = useState('in');
  // Width ÷ height of each slide's video once it has loaded (16:9 until then).
  const [aspects, setAspects] = useState({});

  const slide = slides[index];
  const total = slides.length;

  // Measure target element position
  useLayoutEffect(() => {
    if (!slide.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${slide.targetId}"]`);
    setTargetRect(el ? el.getBoundingClientRect() : null);
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
      top  = targetRect.bottom + PAD + 16;
      side = 'top';
    } else if (spaceAbove >= tt.height + 20) {
      top  = targetRect.top - PAD - tt.height - 16;
      side = 'bottom';
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

  // Arrow pointing toward the target
  const arrowStyle = (side) => {
    const base = { position: 'absolute', width: 0, height: 0, border: '10px solid transparent' };
    switch (side) {
      case 'top':    return { ...base, top: -20, left: '50%', transform: 'translateX(-50%)', borderBottomColor: BROWN };
      case 'bottom': return { ...base, bottom: -20, left: '50%', transform: 'translateX(-50%)', borderTopColor: BROWN };
      case 'left':   return { ...base, left: -20, top: '50%', transform: 'translateY(-50%)', borderRightColor: BROWN };
      case 'right':  return { ...base, right: -20, top: '50%', transform: 'translateY(-50%)', borderLeftColor: BROWN };
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
          <div style={{ position:'fixed', top:0, left:0, right:0, height: Math.max(0, targetRect.top - PAD), background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.bottom + PAD, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.top - PAD, left:0, width: Math.max(0, targetRect.left - PAD), height: targetRect.height + PAD*2, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          <div style={{ position:'fixed', top: targetRect.top - PAD, left: targetRect.right + PAD, right:0, height: targetRect.height + PAD*2, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
          {/* Highlight border around target */}
          <div style={{ position:'fixed', top: targetRect.top - PAD, left: targetRect.left - PAD, width: targetRect.width + PAD*2, height: targetRect.height + PAD*2, border:`3px solid #fbbf24`, boxShadow:'0 0 0 2px #fbbf2488, 0 0 20px 4px #fbbf2466', zIndex:20000, pointerEvents:'none' }} />
        </>
      ) : (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:19999, pointerEvents:'none' }} />
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
          // A video card is as wide as its video can be while staying under 48% of the screen height,
          // so the video keeps its own shape and fills the card edge to edge.
          width: slide.video ? `min(760px, calc(518.4px * ${aspects[slide.video] ?? 16 / 9}))` : 620,
          maxWidth: '1804.8px',
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

        {/* Screen recording of the gesture for this step */}
        {slide.video && (
          <TutorialVideo
            src={slide.video}
            onAspect={(a) => setAspects(prev => (prev[slide.video] === a ? prev : { ...prev, [slide.video]: a }))}
          />
        )}

        {/* Body */}
        <div style={{ padding:'16px 16px 12px', fontSize:13, color: DARK, lineHeight:1.7, whiteSpace:'pre-line' }}>
          {slide.isWarning ? (
            slide.body.split('\n\n').map((para, i) => (
              <p key={i} style={{ margin: '0 0 10px', color: i === 1 ? '#b91c1c' : DARK, fontWeight: i === 1 ? 700 : 400 }}>
                {para}
              </p>
            ))
          ) : slide.body}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 14px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`2px solid ${BROWN}` }}>
          {/* Dot indicators */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
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

export default TutorialOverlay;
