import React, { useEffect, useRef } from 'react';
import './components.css';

const ButterflyDiagramCanvas = ({ problem, currentStep }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !problem) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const fractionWidth = 100;
    const fractionHeight = 80;
    const gap = 120;

    const leftX = centerX - fractionWidth - gap / 2;
    const rightX = centerX + gap / 2;

    const drawFraction = (x, y, numerator, denominator, color = '#000') => {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.roundRect(x, y - fractionHeight / 2 - 10, fractionWidth, fractionHeight / 2, 10);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(numerator, x + fractionWidth / 2, y - fractionHeight / 4 - 10);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + fractionWidth, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(x, y + 10, fractionWidth, fractionHeight / 2, 10);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.fillText(denominator, x + fractionWidth / 2, y + fractionHeight / 4 + 10);
    };

    drawFraction(leftX, centerY, problem.numerator1, problem.denominator1, '#333');
    drawFraction(rightX, centerY, problem.numerator2, problem.denominator2, '#333');

    ctx.fillStyle = '#333';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(problem.operator, centerX, centerY);

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (currentStep >= 1) {
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(leftX + fractionWidth / 2, centerY - fractionHeight / 2 - 10);
      ctx.lineTo(rightX + fractionWidth / 2, centerY + fractionHeight / 2 + 10);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rightX + fractionWidth / 2, centerY + fractionHeight / 2 + 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (currentStep >= 2) {
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(rightX + fractionWidth / 2, centerY - fractionHeight / 2 - 10);
      ctx.lineTo(leftX + fractionWidth / 2, centerY + fractionHeight / 2 + 10);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(leftX + fractionWidth / 2, centerY + fractionHeight / 2 + 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (currentStep >= 3) {
      ctx.strokeStyle = '#667eea';
      ctx.beginPath();
      ctx.moveTo(leftX + fractionWidth, centerY + fractionHeight / 2 + 10);
      ctx.lineTo(rightX, centerY + fractionHeight / 2 + 10);
      ctx.stroke();

      ctx.fillStyle = '#667eea';
      ctx.beginPath();
      ctx.arc(centerX, centerY + fractionHeight / 2 + 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [problem, currentStep]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={300}
      className="butterfly-canvas"
    />
  );
};

export default ButterflyDiagramCanvas;
