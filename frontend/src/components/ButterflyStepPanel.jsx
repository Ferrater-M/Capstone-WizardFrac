import React, { useState, useEffect } from 'react';
import './components.css';

const ButterflyStepPanel = ({ problem, onAnswerSubmit, feedback, onStepChange }) => {
  const [step1, setStep1] = useState('');
  const [step2, setStep2] = useState('');
  const [step3, setStep3] = useState('');
  const [step4, setStep4] = useState('');
  const [step5Numerator, setStep5Numerator] = useState('');
  const [step5Denominator, setStep5Denominator] = useState('');
  const [stepStatus, setStepStatus] = useState([null, null, null, null, null]);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  useEffect(() => {
    setStep1('');
    setStep2('');
    setStep3('');
    setStep4('');
    setStep5Numerator('');
    setStep5Denominator('');
    setStepStatus([null, null, null, null, null]);
    setCurrentStep(1);
  }, [problem]);

  const checkStep = (step, value, value2) => {
    let expected;
    let expected2;
    switch (step) {
      case 1:
        expected = problem.numerator1 * problem.denominator2;
        return parseInt(value) === expected;
      case 2:
        expected = problem.numerator2 * problem.denominator1;
        return parseInt(value) === expected;
      case 3:
        expected = problem.denominator1 * problem.denominator2;
        return parseInt(value) === expected;
      case 4:
        const cross1 = problem.numerator1 * problem.denominator2;
        const cross2 = problem.numerator2 * problem.denominator1;
        expected = problem.operator === '+' ? cross1 + cross2 : cross1 - cross2;
        return parseInt(value) === expected;
      case 5:
        const commonDenom = problem.denominator1 * problem.denominator2;
        const sumDiff = problem.operator === '+' 
          ? (problem.numerator1 * problem.denominator2) + (problem.numerator2 * problem.denominator1)
          : (problem.numerator1 * problem.denominator2) - (problem.numerator2 * problem.denominator1);
        
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(Math.abs(sumDiff), commonDenom);
        expected = sumDiff / divisor;
        expected2 = commonDenom / divisor;
        return parseInt(value) === expected && parseInt(value2) === expected2;
      default:
        return false;
    }
  };

  const handleStepComplete = (step) => {
    let isCorrect;
    if (step === 5) {
      isCorrect = checkStep(step, step5Numerator, step5Denominator);
    } else {
      const value = [step1, step2, step3, step4][step - 1];
      isCorrect = checkStep(step, value, null);
    }
    
    const newStatus = [...stepStatus];
    newStatus[step - 1] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);

    if (isCorrect) {
      if (step < 5) {
        setCurrentStep(step + 1);
      } else {
        const commonDenom = problem.denominator1 * problem.denominator2;
        const sumDiff = problem.operator === '+' 
          ? (problem.numerator1 * problem.denominator2) + (problem.numerator2 * problem.denominator1)
          : (problem.numerator1 * problem.denominator2) - (problem.numerator2 * problem.denominator1);
        
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(Math.abs(sumDiff), commonDenom);
        const finalNumerator = sumDiff / divisor;
        const finalDenominator = commonDenom / divisor;
        
        onAnswerSubmit({ numerator: finalNumerator, denominator: finalDenominator });
      }
    }
  };

  const renderStep = (stepNum) => {
    const isActive = currentStep === stepNum;
    const isCompleted = stepStatus[stepNum - 1] !== null;
    const isCorrect = stepStatus[stepNum - 1] === 'correct';

    let label, value1, setValue1, value2, setValue2;
    switch (stepNum) {
      case 1:
        label = 'Left Cross Product';
        value1 = step1;
        setValue1 = setStep1;
        break;
      case 2:
        label = 'Right Cross Product';
        value1 = step2;
        setValue1 = setStep2;
        break;
      case 3:
        label = 'Common Denominator';
        value1 = step3;
        setValue1 = setStep3;
        break;
      case 4:
        label = 'Numerator Sum/Difference';
        value1 = step4;
        setValue1 = setStep4;
        break;
      case 5:
        value1 = step5Numerator;
        setValue1 = setStep5Numerator;
        value2 = step5Denominator;
        setValue2 = setStep5Denominator;
        break;
      default:
        label = '';
        value1 = '';
        setValue1 = () => {};
    }

    return (
      <div className={`butterfly-step ${isActive ? 'active' : ''} ${isCompleted ? (isCorrect ? 'completed' : 'error') : ''}`}>
        <div className="step-number">Step {stepNum}</div>
        <div className="step-content">
          {stepNum === 5 ? (
            <>
              <input
                type="number"
                placeholder="Numerator"
                value={value1}
                onChange={(e) => setValue1(e.target.value)}
                disabled={!isActive || isCompleted}
              />
              <span className="fraction-slash">/</span>
              <input
                type="number"
                placeholder="Denominator"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
                disabled={!isActive || isCompleted}
              />
            </>
          ) : (
            <input
              type="number"
              placeholder={label}
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              disabled={!isActive || isCompleted}
              onKeyDown={(e) => e.key === 'Enter' && isActive && handleStepComplete(stepNum)}
            />
          )}
          {isCompleted && (
            <div className={`step-indicator ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? '✓' : '✗'}
            </div>
          )}
          {isActive && !isCompleted && (
            <button onClick={() => handleStepComplete(stepNum)} className="check-step-btn">
              Check
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="butterfly-step-panel">
      <h3>Butterfly Method Steps</h3>
      {renderStep(1)}
      {renderStep(2)}
      {renderStep(3)}
      {renderStep(4)}
      {renderStep(5)}
    </div>
  );
};

export default ButterflyStepPanel;
