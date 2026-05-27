import React, { useRef, useState, useEffect } from 'react';

const DrawingCanvas = ({ onCircleDetected }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    lastPointRef.current = { x, y };
    setPoints([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
    setPoints(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      checkForCircle();
    }
  };

  const checkForCircle = () => {
    if (points.length < 20) {
      clearCanvas();
      return;
    }

    // Calculate center
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Calculate distances from center
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    );
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Calculate variance to check circularity
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // Check if it's a closed shape (start and end points are close)
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const startEndDistance = Math.sqrt(
      Math.pow(firstPoint.x - lastPoint.x, 2) + Math.pow(firstPoint.y - lastPoint.y, 2)
    );

    const isCircular = stdDev < avgDistance * 0.3; // Allow 30% variance
    const isClosed = startEndDistance < avgDistance * 0.5;

    if (isCircular && isClosed) {
      onCircleDetected({
        centerX,
        centerY,
        radius: avgDistance,
      });
    }

    clearCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPoints([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', height: '100%', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={380}
        height={240}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{ background: 'transparent' }}
      />
      <p style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)', margin: '0' }}>Draw a circle to continue!</p>
    </div>
  );
};

export default DrawingCanvas;
