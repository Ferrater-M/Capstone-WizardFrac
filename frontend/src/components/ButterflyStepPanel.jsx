import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const ButterflyStepPanel = forwardRef(({ problem, onAnswerSubmit, onWrongAnswer, onStepCorrect, onStepChange }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [inputNum, setInputNum] = useState('');
  const [inputDen, setInputDen] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [lastResult, setLastResult] = useState(null);

  const isMixed = problem?.isMixed || false;
  const totalSteps = isMixed ? 7 : 5;

  useImperativeHandle(ref, () => ({
    submitCurrentStep: () => handleStepComplete()
  }));

  useEffect(() => {
    setInputValue('');
    setInputNum('');
    setInputDen('');
    setCurrentStep(1);
    setLastResult(null);
    onStepChange?.(1);
  }, [problem]);

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  // Pre-compute all values from the problem
  const impNum1 = problem.whole1 * problem.denominator1 + problem.numerator1;
  const impNum2 = problem.whole2 * problem.denominator2 + problem.numerator2;
  const cross1 = impNum1 * problem.denominator2;
  const cross2 = impNum2 * problem.denominator1;
  const commonDenom = problem.denominator1 * problem.denominator2;
  const sumDiff = problem.operator === '+' ? cross1 + cross2 : cross1 - cross2;
  const divisor = gcd(Math.abs(sumDiff), commonDenom);

  const getHint = (step) => {
    if (isMixed) {
      switch (step) {
        case 1: return `Multiply the whole number by the denominator, then add the numerator: (${problem.whole1} × ${problem.denominator1}) + ${problem.numerator1} = ?`;
        case 2: return `Multiply the whole number by the denominator, then add the numerator: (${problem.whole2} × ${problem.denominator2}) + ${problem.numerator2} = ?`;
        case 3: return `Multiply the left numerator by the right denominator: ${impNum1} × ${problem.denominator2} = ?`;
        case 4: return `Multiply the right numerator by the left denominator: ${impNum2} × ${problem.denominator1} = ?`;
        case 5: return `Multiply both denominators together: ${problem.denominator1} × ${problem.denominator2} = ?`;
        case 6: return `${problem.operator === '+' ? 'Add' : 'Subtract'} the two cross products you found in Steps 3 and 4.`;
        case 7: return `Write your answer as a simplified fraction. Can you reduce it further?`;
        default: return '';
      }
    } else {
      switch (step) {
        case 1: return `Multiply the left numerator by the right denominator: ${problem.numerator1} × ${problem.denominator2} = ?`;
        case 2: return `Multiply the right numerator by the left denominator: ${problem.numerator2} × ${problem.denominator1} = ?`;
        case 3: return `Multiply both denominators together: ${problem.denominator1} × ${problem.denominator2} = ?`;
        case 4: return `${problem.operator === '+' ? 'Add' : 'Subtract'} the two cross products you found in Steps 1 and 2.`;
        case 5: return `Write your answer as a simplified fraction. Can you reduce it further?`;
        default: return '';
      }
    }
  };

  const checkStep = (step) => {
    if (isMixed) {
      switch (step) {
        case 1: return parseInt(inputValue) === impNum1;
        case 2: return parseInt(inputValue) === impNum2;
        case 3: return parseInt(inputValue) === cross1;
        case 4: return parseInt(inputValue) === cross2;
        case 5: return parseInt(inputValue) === commonDenom;
        case 6: return parseInt(inputValue) === sumDiff;
        case 7: return parseInt(inputNum) === sumDiff / divisor && parseInt(inputDen) === commonDenom / divisor;
        default: return false;
      }
    } else {
      switch (step) {
        case 1: return parseInt(inputValue) === cross1;
        case 2: return parseInt(inputValue) === cross2;
        case 3: return parseInt(inputValue) === commonDenom;
        case 4: return parseInt(inputValue) === sumDiff;
        case 5: return parseInt(inputNum) === sumDiff / divisor && parseInt(inputDen) === commonDenom / divisor;
        default: return false;
      }
    }
  };

  const getErrorType = (num, den) => {
    const numOk = parseInt(num) === sumDiff / divisor;
    const denOk = parseInt(den) === commonDenom / divisor;
    if (!numOk && denOk) return 'WRONG_NUMERATOR';
    if (numOk && !denOk) return 'WRONG_DENOMINATOR';
    return 'WRONG_BOTH';
  };

  const isFractionInput = currentStep === totalSteps;

  const handleStepComplete = () => {
    const isCorrect = checkStep(currentStep);
    setLastResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      onStepCorrect?.();
      if (currentStep < totalSteps) {
        setTimeout(() => {
          setCurrentStep(s => {
            const next = s + 1;
            onStepChange?.(next);
            return next;
          });
          setInputValue('');
          setInputNum('');
          setInputDen('');
          setLastResult(null);
        }, 600);
      } else {
        onAnswerSubmit({ numerator: sumDiff / divisor, denominator: commonDenom / divisor });
      }
    } else {
      const submitted = isFractionInput ? `${inputNum}/${inputDen}` : inputValue;
      const errorType = isFractionInput ? getErrorType(inputNum, inputDen) : 'INCORRECT_STEP';
      onWrongAnswer?.(getHint(currentStep), submitted, errorType);
      setTimeout(() => {
        setInputValue('');
        setInputNum('');
        setInputDen('');
        setLastResult(null);
      }, 600);
    }
  };

  const stepLabels = isMixed ? [
    'Step 1: Convert Left Mixed Number',
    'Step 2: Convert Right Mixed Number',
    'Step 3: Left Cross Product',
    'Step 4: Right Cross Product',
    'Step 5: Multiply the Denominators',
    'Step 6: Combine the Cross Products',
    'Step 7: Final Answer',
  ] : [
    'Step 1: Left Cross Product',
    'Step 2: Right Cross Product',
    'Step 3: Multiply the Denominators',
    'Step 4: Combine the Cross Products',
    'Step 5: Final Answer',
  ];

  const inputStyle = {
    width: '80px',
    height: '50px',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: '10px',
    border: `3px solid ${lastResult === 'correct' ? '#10b981' : lastResult === 'wrong' ? '#ef4444' : '#888'}`,
    background: '#fff',
    color: '#000',
  };

  // Formula reminder shown during conversion steps
  const renderConversionHint = () => {
    const isLeft = currentStep === 1;
    const w = isLeft ? problem.whole1 : problem.whole2;
    const n = isLeft ? problem.numerator1 : problem.numerator2;
    const d = isLeft ? problem.denominator1 : problem.denominator2;
    return (
      <div style={{ fontSize: 14, color: '#555', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 12px' }}>
        ({w} × {d}) + {n} = ?
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
        {stepLabels[currentStep - 1]}
      </div>

      {isMixed && currentStep <= 2 && renderConversionHint()}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isFractionInput ? (
          <>
            <input
              type="number"
              placeholder="Num"
              value={inputNum}
              onChange={(e) => { setInputNum(e.target.value); setLastResult(null); }}
              style={inputStyle}
              autoFocus
            />
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>/</span>
            <input
              type="number"
              placeholder="Den"
              value={inputDen}
              onChange={(e) => { setInputDen(e.target.value); setLastResult(null); }}
              style={inputStyle}
            />
          </>
        ) : (
          <input
            type="number"
            placeholder="Answer"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setLastResult(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleStepComplete()}
            style={inputStyle}
            autoFocus
          />
        )}

        {lastResult && (
          <span style={{ fontSize: '32px', color: lastResult === 'correct' ? '#10b981' : '#ef4444' }}>
            {lastResult === 'correct' ? '✓' : '✗'}
          </span>
        )}
      </div>

      <div style={{ fontSize: '13px', color: '#666' }}>
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
});

ButterflyStepPanel.displayName = 'ButterflyStepPanel';

export default ButterflyStepPanel;
