import React, { useState, useEffect, useRef } from 'react';
import './IslandInterior.css';

const SQUARE  = 380;
const P_RAD   = 18;
const E_RAD   = 22;
const SPEED   = 3;
const REACH   = P_RAD + E_RAD + 12;

const walkableSrc = (name) => {
  switch (name) {
    case 'Similar':    return '/SimilarWalkableArea.png';
    case 'Dissimilar': return '/DissimilarWalkableArea.png';
    case 'Hybrid':     return '/HybridWalkableArea.png';
    default:           return null;
  }
};

const makeEnemies = () => {
  const margin = E_RAD + 16;
  const range  = SQUARE - margin * 2;
  const positions = [];
  for (let level = 1; level <= 6; level++) {
    let pos, tries = 0;
    do {
      pos = { x: margin + Math.random() * range, y: margin + Math.random() * range };
      tries++;
    } while (
      tries < 200 &&
      positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < E_RAD * 3.2)
    );
    positions.push({ level, ...pos });
  }
  return positions;
};

const IslandInterior = ({ island, maxStage = 0, onSelectLevel, onBack }) => {
  const isCompleted = (level) => maxStage >= level;
  const isLocked    = (level) => level > maxStage + 1;

  const [playerPos,  setPlayerPos]  = useState({ x: SQUARE / 2, y: SQUARE / 2 });
  const [nearEnemy,  setNearEnemy]  = useState(null);
  const [enemies]                   = useState(makeEnemies);

  const posRef   = useRef({ x: SQUARE / 2, y: SQUARE / 2 });
  const keysRef  = useRef({});
  const frameRef = useRef(null);

  // ── movement loop ──
  useEffect(() => {
    const tick = () => {
      const k = keysRef.current;
      let { x, y } = posRef.current;

      if (k['ArrowUp']    || k['w'] || k['W']) y -= SPEED;
      if (k['ArrowDown']  || k['s'] || k['S']) y += SPEED;
      if (k['ArrowLeft']  || k['a'] || k['A']) x -= SPEED;
      if (k['ArrowRight'] || k['d'] || k['D']) x += SPEED;

      x = Math.max(P_RAD, Math.min(SQUARE - P_RAD, x));
      y = Math.max(P_RAD, Math.min(SQUARE - P_RAD, y));

      posRef.current = { x, y };
      setPlayerPos({ x, y });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── nearby enemy detection ──
  useEffect(() => {
    const { x, y } = playerPos;
    const closest = enemies.reduce((best, e) => {
      if (isLocked(e.level)) return best;
      const d = Math.hypot(e.x - x, e.y - y);
      return d < REACH && (best === null || d < best.d) ? { e, d } : best;
    }, null);
    setNearEnemy(closest?.e ?? null);
  }, [playerPos, enemies]);

  // ── keyboard events ──
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === 'Enter' && nearEnemy) onSelectLevel(nearEnemy.level);
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, [nearEnemy, onSelectLevel]);

  const enemyColor = (level, done, locked) => {
    if (locked)      return '#4b5563';
    if (done)        return '#10b981';
    if (level === 6) return '#7c3aed';
    return '#3b82f6';
  };

  const overlay = walkableSrc(island.name);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundImage: 'url(/WalkableAreaBackground.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>


      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          padding: '10px 20px',
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          border: '2px solid rgba(255,255,255,0.5)', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ← Back
      </button>

      {/* Island title */}
      <div style={{
        position: 'absolute', top: 16, left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        color: '#fff', fontSize: 22, fontWeight: 800,
        textShadow: '2px 2px 6px #000', pointerEvents: 'none',
      }}>
        {island.title}
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        color: 'rgba(255,255,255,0.75)', fontSize: 13,
        textShadow: '1px 1px 3px #000', pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        WASD / Arrow keys to move · Walk to an enemy and press Enter to fight
      </div>

      {/* Walkable square */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: SQUARE, height: SQUARE,
        zIndex: 2,
      }}>

        {/* WalkableArea island PNG — larger than the square so edges aren't clipped */}
        {overlay && (
          <img
            src={overlay}
            alt="island"
            style={{
              position: 'absolute',
              top: '-100%', left: '-100%',
              width: '300%', height: '300%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Enemies */}
        {enemies.map(enemy => {
          const done   = isCompleted(enemy.level);
          const locked = isLocked(enemy.level);
          const boss   = enemy.level === 6;
          const near   = nearEnemy?.level === enemy.level;
          const color  = enemyColor(enemy.level, done, locked);

          return (
            <div
              key={enemy.level}
              style={{
                position: 'absolute',
                left: enemy.x - E_RAD,
                top:  enemy.y - E_RAD,
                width: E_RAD * 2, height: E_RAD * 2,
                borderRadius: '50%',
                background: color,
                border: `3px solid ${near ? '#fff' : 'rgba(255,255,255,0.35)'}`,
                boxShadow: near ? `0 0 16px ${color}, 0 0 32px ${color}` : '0 2px 8px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: locked ? 16 : 13, fontWeight: 800, color: '#fff',
                cursor: 'default',
                opacity: locked ? 0.55 : 1,
                transition: 'box-shadow 0.15s, border-color 0.15s',
                userSelect: 'none',
              }}
            >
              {!locked && boss && (
                <span style={{
                  position: 'absolute', top: -24,
                  fontSize: 20,
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))',
                }}>
                  👑
                </span>
              )}
              {locked ? '🔒' : done ? '✓' : boss ? '!' : enemy.level}
            </div>
          );
        })}

        {/* Player */}
        <div style={{
          position: 'absolute',
          left: playerPos.x - P_RAD,
          top:  playerPos.y - P_RAD,
          width: P_RAD * 2, height: P_RAD * 2,
          borderRadius: '50%',
          background: '#f59e0b',
          border: '3px solid #fff',
          boxShadow: '0 0 14px rgba(245,158,11,0.9)',
          zIndex: 3,
          pointerEvents: 'none',
        }} />

        {/* Interact prompt above nearby enemy */}
        {nearEnemy && (
          <div style={{
            position: 'absolute',
            left: nearEnemy.x - 64,
            top:  nearEnemy.y - E_RAD - 48,
            width: 128,
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            fontSize: 11, fontWeight: 700,
            textAlign: 'center',
            borderRadius: 6, padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 4,
          }}>
            {nearEnemy.level === 6 ? '👑 Boss Fight' : `Level ${nearEnemy.level}`}
            <br />
            {isCompleted(nearEnemy.level)
              ? <span style={{ color: '#10b981' }}>Defeated</span>
              : <span style={{ color: '#fbbf24' }}>Press Enter</span>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default IslandInterior;
