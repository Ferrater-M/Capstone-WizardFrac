import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import './components.css';

const FractionPattern = forwardRef(({ problem, onAnswerSubmit, onWrongAnswer, onStepCorrect }, ref) => {
  const [denominator, setDenominator] = useState('');
  const [resultNumerator, setResultNumerator] = useState('');
  const [resultDenominator, setResultDenominator] = useState('');
  const [mixedWhole, setMixedWhole] = useState('');
  const [mixedNumerator, setMixedNumerator] = useState('');
  const [step, setStep] = useState(1);
  const [stepStatus, setStepStatus] = useState([null, null, null, null]);
  const [correctNum1, setCorrectNum1] = useState(0);
  const [correctNum2, setCorrectNum2] = useState(0);
  const [correctDen, setCorrectDen] = useState(0);
  const [operator, setOperator] = useState('+');
  const [step4Whole, setStep4Whole] = useState(0);
  const [step4Remainder, setStep4Remainder] = useState(0);

  const form1Ref = useRef();
  const form2Ref = useRef();
  const form3Ref = useRef();
  const form4Ref = useRef();

  useImperativeHandle(ref, () => ({
    submitCurrentStep: () => {
      if (step === 1) form1Ref.current?.requestSubmit();
      else if (step === 2) form2Ref.current?.requestSubmit();
      else if (step === 3) form3Ref.current?.requestSubmit();
      else if (step === 4) form4Ref.current?.requestSubmit();
    }
  }));

  useEffect(() => {
    const match = problem.match(/(\d+)\/(\d+)\s*([+-])\s*(\d+)\/(\d+)/);
    if (match) {
      setCorrectNum1(parseInt(match[1]));
      setCorrectDen(parseInt(match[2]));
      setOperator(match[3]);
      setCorrectNum2(parseInt(match[4]));
    }
  }, [problem]);

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  const calculateCorrectAnswers = () => {
    const sumDiff = operator === '+' ? correctNum1 + correctNum2 : correctNum1 - correctNum2;
    const divisor = gcd(Math.abs(sumDiff), correctDen);
    return {
      sumDiff,
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
      onStepCorrect?.();
      setStep(2);
    } else {
      onWrongAnswer?.('For similar fractions, the denominator stays the same. Look at the denominators in the problem!', denominator);
      setDenominator('');
    }
  };

  const handleResultNumeratorSubmit = (e) => {
    e.preventDefault();
    const { sumDiff } = calculateCorrectAnswers();
    const isCorrect = parseInt(resultNumerator) === sumDiff;
    const newStatus = [...stepStatus];
    newStatus[1] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);
    if (isCorrect) {
      onStepCorrect?.();
      setResultNumerator('');
      setResultDenominator('');
      setStep(3);
    } else {
      onWrongAnswer?.('Only add or subtract the top numbers. The denominator does not change in this step!', resultNumerator);
      setResultNumerator('');
    }
  };

  const handleFinalAnswerSubmit = (e) => {
    e.preventDefault();
    const { sumDiff, nonSimplified, simplified } = calculateCorrectAnswers();
    const userNum = parseInt(resultNumerator);
    const userDen = parseInt(resultDenominator);
    const isWholeAnswer = simplified.denominator === 1;

    let isCorrect;
    if (isWholeAnswer) {
      isCorrect = userNum === simplified.numerator;
    } else {
      isCorrect =
        (userNum === nonSimplified.numerator && userDen === nonSimplified.denominator) ||
        (userNum === simplified.numerator && userDen === simplified.denominator);
    }

    const newStatus = [...stepStatus];
    newStatus[2] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);

    if (!isCorrect) {
      if (isWholeAnswer) {
        onWrongAnswer?.(`The fraction simplifies to a whole number. ${sumDiff} ÷ ${correctDen} = ${simplified.numerator}`, resultNumerator);
      } else {
        onWrongAnswer?.('Use the numerator from Step 2 and the common denominator from Step 1 as your answer!', `${resultNumerator}/${resultDenominator}`);
      }
      setResultNumerator('');
      setResultDenominator('');
      return;
    }

    onStepCorrect?.();

    if (isWholeAnswer) {
      onAnswerSubmit(`${simplified.numerator}`);
      return;
    }

    const isImproper = Math.abs(sumDiff) > correctDen;
    if (isImproper) {
      const whole = Math.floor(Math.abs(sumDiff) / correctDen);
      const remainder = Math.abs(sumDiff) % correctDen;
      setStep4Whole(whole);
      setStep4Remainder(remainder);
      setStep(4);
    } else {
      onAnswerSubmit(`${simplified.numerator}/${simplified.denominator}`);
    }
  };

  const handleMixedNumberSubmit = (e) => {
    e.preventDefault();
    const userWhole = parseInt(mixedWhole);
    const userRemainder = step4Remainder > 0 ? parseInt(mixedNumerator) : 0;
    const isCorrect = userWhole === step4Whole && userRemainder === step4Remainder;
    const newStatus = [...stepStatus];
    newStatus[3] = isCorrect ? 'correct' : 'wrong';
    setStepStatus(newStatus);

    if (!isCorrect) {
      onWrongAnswer?.('Divide the numerator by the denominator. The quotient is the whole number, and the remainder is the new numerator!', step4Remainder > 0 ? `${mixedWhole} ${mixedNumerator}/${correctDen}` : mixedWhole);
      setMixedWhole('');
      setMixedNumerator('');
      return;
    }

    onStepCorrect?.();
    const { simplified } = calculateCorrectAnswers();
    onAnswerSubmit(`${simplified.numerator}/${simplified.denominator}`);
  };

  const { simplified: _simplified } = correctDen > 0 ? calculateCorrectAnswers() : { simplified: { denominator: 0 } };
  const isWholeAnswer = _simplified.denominator === 1;

  const inputStyle = {
    width: '80px',
    height: '50px',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: '10px',
    border: '3px solid #888',
    background: '#fff',
    color: '#000'
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
        <form ref={form1Ref} onSubmit={handleDenominatorSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>Step 1: Enter the common denominator</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
              placeholder="Denominator"
              autoFocus
              style={inputStyle}
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
        <form ref={form2Ref} onSubmit={handleResultNumeratorSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
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
              style={inputStyle}
            />
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[1] && (
              <span style={{ fontSize: '32px', color: stepStatus[1] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[1] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      ) : step === 3 ? (
        <form ref={form3Ref} onSubmit={handleFinalAnswerSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>
            {isWholeAnswer ? 'Step 3: Enter the whole number answer' : 'Step 3: Enter the final answer'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isWholeAnswer ? (
              <input
                type="number"
                value={resultNumerator}
                onChange={(e) => setResultNumerator(e.target.value)}
                placeholder="Whole #"
                autoFocus
                style={inputStyle}
              />
            ) : (
              <>
                <input
                  type="number"
                  value={resultNumerator}
                  onChange={(e) => setResultNumerator(e.target.value)}
                  placeholder="Numerator"
                  autoFocus
                  style={inputStyle}
                />
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>/</span>
                <input
                  type="number"
                  value={resultDenominator}
                  onChange={(e) => setResultDenominator(e.target.value)}
                  placeholder="Denominator"
                  style={inputStyle}
                />
              </>
            )}
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[2] && (
              <span style={{ fontSize: '32px', color: stepStatus[2] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[2] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      ) : (
        <form ref={form4Ref} onSubmit={handleMixedNumberSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: '#333', fontSize: '20px', fontWeight: 'bold' }}>Step 4: Convert to a mixed number</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              value={mixedWhole}
              onChange={(e) => setMixedWhole(e.target.value)}
              placeholder="Whole"
              autoFocus
              style={inputStyle}
            />
            {step4Remainder > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                  type="number"
                  value={mixedNumerator}
                  onChange={(e) => setMixedNumerator(e.target.value)}
                  placeholder="Num"
                  style={{ ...inputStyle, width: '60px' }}
                />
                <div style={{ width: '60px', height: '3px', background: '#888', margin: '2px 0' }} />
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{correctDen}</div>
              </div>
            )}
            <button type="submit" style={{ display: 'none' }} />
            {stepStatus[3] && (
              <span style={{ fontSize: '32px', color: stepStatus[3] === 'correct' ? '#10b981' : '#ef4444' }}>
                {stepStatus[3] === 'correct' ? '✓' : '✗'}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
});

FractionPattern.displayName = 'FractionPattern';

export default FractionPattern;
