import React, { useEffect, useRef, useState } from 'react';
import { playSfx } from '../utils/audio';
import './IntroPhase.css';

// ── Intro Phase ──────────────────────────────────────────────────────────────
// Plays before a battle starts, on every island. In the battle UI's own black-and-white style (only the
// sprites keep their colours). The game behind is darkened while:
//   1. the player (huge sprite left, name right) slides in from the right  — confirmDrawing.wav
//   2. the player slides out to the left
//   3. "VERSUS" pops in
//   4. the enemy (name left, huge sprite right) slides in from the left     — enemyAppear.wav
//   5. a flashing "FIGHT!" (the "Perfect!" pop-up's flash)                 — perfectEffect.wav
//   6. everything fades back to normal brightness → onDone (the game's own start: music, tutorial, …)
// Click or press Enter/Space to skip straight to the game.
const STAGES = [
  ['player-in', 0],
  ['player-out', 1500],
  ['versus', 1900],
  ['enemy-in', 2700],
  ['fight', 4000],
  ['fade', 5500],
  ['done', 6000],
];

// The idle animation of a sprite sheet (one row of square frames), drawn big and pixel-sharp.
const BigSprite = ({ src, size }) => {
  const [frames, setFrames] = useState(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setFrames(Math.max(1, Math.round(img.naturalWidth / img.naturalHeight))); };
    img.onerror = () => { if (alive) setFrames(0); };
    if (src) img.src = src;
    return () => { alive = false; };
  }, [src]);
  if (!frames) return <div style={{ width: size, height: size, flex: '0 0 auto' }} />;
  const kf = `introSprite_${frames}_${size}`;
  return (
    <>
      <style>{`@keyframes ${kf} { to { background-position-x: -${frames * size}px; } }`}</style>
      <div
        className="ip-sprite"
        style={{
          width: size, height: size,
          backgroundImage: `url(${src})`,
          backgroundSize: `${frames * size}px ${size}px`,
          animation: `${kf} ${(frames / 9).toFixed(2)}s steps(${frames}) infinite`,
        }}
      />
    </>
  );
};

// Really big: the band is shorter, so the sprites float out past its edges. Sprite frames have empty space
// above the character, so the frame may run off the top of the screen while the character itself stays in view.
const spriteSize = () => Math.round(Math.min(window.innerHeight * 1.2, window.innerWidth * 0.52, 980));

const IntroPhase = ({ playerName, playerSprite, enemyName, enemySprite, onDone }) => {
  const [stage, setStage] = useState('player-in');
  const [size] = useState(spriteSize);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current?.();
  };

  useEffect(() => {
    playSfx('/SoundEffects/confirmDrawing.wav');
    const timers = STAGES.slice(1).map(([name, at]) => setTimeout(() => {
      if (name === 'enemy-in') playSfx('/SoundEffects/enemyAppear.wav');
      if (name === 'fight') playSfx('/SoundEffects/perfectEffect.wav');
      if (name === 'done') finish();
      else setStage(name);
    }, at));
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showPlayer = stage === 'player-in' || stage === 'player-out';
  const showVersus = stage === 'versus' || stage === 'enemy-in';
  const showEnemy = stage === 'enemy-in';
  const showFight = stage === 'fight' || stage === 'fade';
  const rowStyle = { top: `calc(50% - ${size * 0.62}px)` };   // a bit above centre

  return (
    <div className={`ip-overlay${stage === 'fade' ? ' is-fading' : ''}`} onClick={finish} role="presentation">
      <div className="ip-band" />

      {showPlayer && (
        <div className={`ip-row ip-player ${stage === 'player-out' ? 'is-leaving' : 'is-entering'}`} style={rowStyle}>
          <BigSprite src={playerSprite} size={size} />
          <div className="ip-name-box">
            <span className="ip-role">Wizard</span>
            <span className="ip-name">{playerName || 'Player'}</span>
          </div>
        </div>
      )}

      {showVersus && (
        <div className={`ip-versus-slot${showEnemy ? ' is-small' : ''}`}>
          <span className="ip-versus">VERSUS</span>
        </div>
      )}

      {showEnemy && (
        <div className="ip-row ip-enemy is-entering" style={rowStyle}>
          <div className="ip-name-box">
            <span className="ip-role">Enemy</span>
            <span className="ip-name">{enemyName || 'Enemy'}</span>
          </div>
          <BigSprite src={enemySprite} size={size} />
        </div>
      )}

      {showFight && (
        <div className="ip-fight">
          FIGHT!
        </div>
      )}

      <span className="ip-skip">Click to skip</span>
    </div>
  );
};

export default IntroPhase;
