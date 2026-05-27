import React from 'react';

const W = 460, H = 210;
const leftCX = 110, rightCX = 350;
const FRAC_TOP = 54;
const BOX_H = 50;
const GAP = 11;
const numCY = FRAC_TOP + BOX_H / 2;
const denCY = FRAC_TOP + BOX_H + GAP + BOX_H / 2;
const TOP_BADGE_Y = 6;
const TOP_BADGE_H = 28;
const BOT_Y = denCY + BOX_H / 2 + 10;

// Space reserved for the whole-number on each side (text + gap)
const WHOLE_RESERVE = 38;

const getBorderColor = (which, step, isMixed) => {
  if (isMixed && step === 1 && (which === 'num1' || which === 'den1')) return '#f59e0b';
  if (isMixed && step === 2 && (which === 'num2' || which === 'den2')) return '#f59e0b';
  const bs = isMixed ? Math.max(0, step - 2) : step;
  if (bs === 1 && (which === 'num1' || which === 'den2')) return '#ef4444';
  if (bs === 2 && (which === 'num2' || which === 'den1')) return '#10b981';
  if (bs === 3 && (which === 'den1' || which === 'den2')) return '#8b5cf6';
  return '#ccc';
};

const FractionBox = ({ value, which, step, isMixed }) => {
  const color = getBorderColor(which, step, isMixed);
  const active = color !== '#ccc';
  return (
    <div style={{
      width: 90, height: BOX_H,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, fontWeight: 'bold', color: '#222',
      border: `3px solid ${color}`,
      borderRadius: 10,
      background: active ? `${color}18` : '#fff',
      transition: 'border-color 0.3s, background 0.3s',
    }}>
      {value}
    </div>
  );
};

const Badge = ({ cx, y, h, value, textColor, fillColor, borderColor }) => {
  const w = 56;
  return (
    <g>
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={7}
        fill={fillColor} stroke={borderColor} strokeWidth={2} />
      <text x={cx} y={y + h / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={textColor} fontSize={14} fontWeight="bold">
        {value}
      </text>
    </g>
  );
};

const ButterflyDiagramCanvas = ({ problem, currentStep }) => {
  if (!problem) return null;

  const isMixed = problem.isMixed || false;
  const impNum1 = (problem.whole1 || 0) * problem.denominator1 + problem.numerator1;
  const impNum2 = (problem.whole2 || 0) * problem.denominator2 + problem.numerator2;
  const cross1 = impNum1 * problem.denominator2;
  const cross2 = impNum2 * problem.denominator1;
  const commonDen = problem.denominator1 * problem.denominator2;
  const sumDiff = problem.operator === '+' ? cross1 + cross2 : cross1 - cross2;

  // Numerator box values — update to improper after each conversion step
  const dispNum1 = isMixed && currentStep < 2 ? problem.numerator1 : impNum1;
  const dispNum2 = isMixed && currentStep < 3 ? problem.numerator2 : impNum2;

  const bStep = isMixed ? Math.max(0, currentStep - 2) : currentStep;

  // Whole number visibility
  const showWhole1 = isMixed && currentStep <= 1;
  const showWhole2 = isMixed && currentStep <= 2;

  // Horizontal position of each fraction group's left edge.
  // In mixed mode, always reserve WHOLE_RESERVE space so the fraction box
  // doesn't jump when the whole number disappears after conversion.
  const leftGroupLeft = isMixed ? leftCX - 45 - WHOLE_RESERVE : leftCX - 45;
  const rightGroupLeft = isMixed ? rightCX - 45 - WHOLE_RESERVE : rightCX - 45;

  // Vertical center of the fraction (for whole-number alignment)
  const fracMidY = FRAC_TOP + (BOX_H + GAP + BOX_H) / 2;

  return (
    <div style={{ position: 'relative', width: W, height: H, userSelect: 'none' }}>

      {/* ── SVG: lines + top/bottom badges ── */}
      <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>

        {bStep >= 1 && (
          <g>
            <line x1={leftCX} y1={numCY} x2={rightCX} y2={denCY}
              stroke="#ef4444" strokeWidth={3} strokeLinecap="round" />
            <circle cx={rightCX} cy={denCY} r={6} fill="#ef4444" />
          </g>
        )}
        {bStep >= 2 && (
          <g>
            <line x1={rightCX} y1={numCY} x2={leftCX} y2={denCY}
              stroke="#10b981" strokeWidth={3} strokeLinecap="round" />
            <circle cx={leftCX} cy={denCY} r={6} fill="#10b981" />
          </g>
        )}
        {bStep >= 3 && (
          <line x1={leftCX} y1={denCY} x2={rightCX} y2={denCY}
            stroke="#8b5cf6" strokeWidth={3} strokeLinecap="round" />
        )}

        {/* Cross product result badges above numerators */}
        {bStep >= 2 && (
          <Badge cx={leftCX} y={TOP_BADGE_Y} h={TOP_BADGE_H}
            value={cross1} textColor="#ef4444" fillColor="#fef2f2" borderColor="#ef4444" />
        )}
        {bStep >= 3 && (
          <Badge cx={rightCX} y={TOP_BADGE_Y} h={TOP_BADGE_H}
            value={cross2} textColor="#10b981" fillColor="#f0fdf4" borderColor="#10b981" />
        )}

        {/* Common denominator below */}
        {bStep >= 4 && (
          <Badge cx={W / 2} y={BOT_Y} h={TOP_BADGE_H}
            value={`÷ ${commonDen}`} textColor="#8b5cf6" fillColor="#faf5ff" borderColor="#8b5cf6" />
        )}

        {/* Combined numerator after step 4 */}
        {bStep >= 5 && (
          <>
            <Badge cx={leftCX} y={BOT_Y} h={TOP_BADGE_H}
              value={sumDiff} textColor="#f59e0b" fillColor="#fffbeb" borderColor="#f59e0b" />
            <line
              x1={leftCX + 32} y1={BOT_Y + TOP_BADGE_H / 2}
              x2={W / 2 - 36} y2={BOT_Y + TOP_BADGE_H / 2}
              stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 2" />
          </>
        )}
      </svg>

      {/* ── Left fraction group ── */}
      <div style={{
        position: 'absolute',
        left: leftGroupLeft,
        top: FRAC_TOP,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Whole number — always reserve space in mixed mode so the box doesn't shift */}
        {isMixed && (
          <span style={{
            fontSize: 26,
            fontWeight: 'bold',
            color: '#222',
            minWidth: 30,
            textAlign: 'center',
            visibility: showWhole1 ? 'visible' : 'hidden',
            alignSelf: 'center',
            marginTop: (BOX_H + GAP) / 2, // vertically align with fraction midpoint
          }}>
            {problem.whole1}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FractionBox value={dispNum1} which="num1" step={currentStep} isMixed={isMixed} />
          <div style={{ width: 90, height: 3, background: '#555', margin: '4px 0' }} />
          <FractionBox value={problem.denominator1} which="den1" step={currentStep} isMixed={isMixed} />
        </div>
      </div>

      {/* ── Operator ── */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: (numCY + denCY) / 2,
        transform: 'translate(-50%, -50%)',
        fontSize: 34,
        fontWeight: 'bold',
        color: '#444',
        zIndex: 1,
      }}>
        {problem.operator}
      </div>

      {/* ── Right fraction group ── */}
      <div style={{
        position: 'absolute',
        left: rightGroupLeft,
        top: FRAC_TOP,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        {isMixed && (
          <span style={{
            fontSize: 26,
            fontWeight: 'bold',
            color: '#222',
            minWidth: 30,
            textAlign: 'center',
            visibility: showWhole2 ? 'visible' : 'hidden',
            alignSelf: 'center',
            marginTop: (BOX_H + GAP) / 2,
          }}>
            {problem.whole2}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FractionBox value={dispNum2} which="num2" step={currentStep} isMixed={isMixed} />
          <div style={{ width: 90, height: 3, background: '#555', margin: '4px 0' }} />
          <FractionBox value={problem.denominator2} which="den2" step={currentStep} isMixed={isMixed} />
        </div>
      </div>

    </div>
  );
};

export default ButterflyDiagramCanvas;
