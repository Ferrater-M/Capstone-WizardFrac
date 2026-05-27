import React, { useState, useEffect } from 'react';
import './components.css';

const FractionPattern = ({ problem, onAnswerSubmit }) => {
  const [denominator, setDenominator] = useState('');
  const [resultNumerator, setResultNumerator] = useState('');
  const [resultDenominator, setResultDenominator] = useState('');
  const [step, setStep] = useState(1);
  const [stepStatus, setStepStatus] = useState([null, null, null]);
  const [correctNum1, setCorrectNum1] = useState(0);
  const [correctNum2, setCorrectNum2] = useState(0);
  const [correctDen, setCorrectDen] = useState(0);
  const [operator, setOperator] = useState('+');

  useEffect(() => {
    const parseProblem = () => {
      const match = problem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
      if (match) {
        setCorrectNum1(parseInt(match[1]));
        setCorrectDen(parseInt(match[2]));
        setOperator(match[3]);
        setCorrectNum2(parseInt(match[4]));
      }
    };
    parseProblem();
  }, [problem]);

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const calculateCorrectAnswers = () => {
    const sumDiff = operator === '+' ? correctNum1 + correctNum2 : correctNum1 - correctNum2;
    const divisor = gcd(Math.abs(sumDiff), correctDen);
    return {
      nonSimplified: { numerator: sumDiff, denominator: correctDen },
      simplified: { numerator: sumDiff / divisor, denominator: correctDen / divisor }
    };
  };

  const handleDenominatorSubmit = (e) => {
    e.preventDefault();
    const isCorrect = parseInt(denominator) === correctDen;
    const newStatus = [...stepStatus];
    newStatus[0] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);
    if (isCorrect) {
      setStep(2);
    }
  };

  const handleResultNumeratorSubmit = (e) => {
    e.preventDefault();
    const sumDiff = operator === '+' ? correctNum1 + correctNum2 : correctNum1 - correctNum2;
    const isCorrect = parseInt(resultNumerator) === sumDiff;
    const newStatus = [...stepStatus];
    newStatus[1] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);
    if (isCorrect) {
      setStep(3);
    }
  };

  const handleFinalAnswerSubmit = (e) => {
    e.preventDefault();
    const { nonSimplified, simplified } = calculateCorrectAnswers();
    const userNum = parseInt(resultNumerator);
    const userDen = parseInt(resultDenominator);
    const isCorrect = 
      (userNum === nonSimplified.numerator && userDen === nonSimplified.denominator) ||
      (userNum === simplified.numerator && userDen === simplified.denominator) ||
      (userNum === simplified.numerator && simplified.denominator === 1 && userDen === 1);
    const newStatus = [...stepStatus];
    newStatus[2] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);
    if (isCorrect) {
      const finalAnswer = `${simplified.numerator}/${simplified.denominator}`;
      onAnswerSubmit(finalAnswer);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px',
      padding: '20px'
    }}>
      {step === 1 ? (
        <form onSubmit={handleDenominatorSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>Step 1: Enter the common denominator</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
              placeholder="Denominator"
              autoFocus
              style={{
                width: '80px',
                height: '50px',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '10px',
                border: '3px solid #888',
                background: '#fff'
              }}
            />
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[0] && (
              <span style={{ fontSize: '32px', color: stepStatus[0] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[0] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      ) : step === 2 ? (
        <form onSubmit={handleResultNumeratorSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>Step 2: Add/Subtract the numerators</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              {correctNum1} {operator} {correctNum2} =
            </span>
            <input
              type="number"
              value={resultNumerator}
              onChange={(e) => setResultNumerator(e.target.value)}
              placeholder="Result"
              autoFocus
              style={{
                width: '80px',
                height: '50px',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '10px',
                border: '3px solid #888',
                background: '#fff'
              }}
            />
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[1] && (
              <span style={{ fontSize: '32px', color: stepStatus[1] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[1] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleFinalAnswerSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>Step 3: Enter the final answer</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              value={resultNumerator}
              onChange={(e) => setResultNumerator(e.target.value)}
              placeholder="Numerator"
              autoFocus
              style={{
                width: '80px',
                height: '50px',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '10px',
                border: '3px solid #888',
                background: '#fff'
              }}
            />
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>/</span>
            <input
              type="number"
              value={resultDenominator}
              onChange={(e) => setResultDenominator(e.target.value)}
              placeholder="Denominator"
              style={{
                width: '80px',
                height: '50px',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '10px',
                border: '3px solid #888',
                background: '#fff'
              }}
            />
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[2] && (
              <span style={{ fontSize: '32px', color: stepStatus[2] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[2] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default FractionPattern;
