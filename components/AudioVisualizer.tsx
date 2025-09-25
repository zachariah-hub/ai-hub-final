import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;
    const barCount = 30;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / barCount / 2;
      for (let i = 0; i < barCount; i++) {
        const sineWave = Math.sin((frame + i * 5) * 0.05);
        const barHeight = (sineWave + 1) * 25 + 5; // Ranges from 5 to 55
        const opacity = Math.max(0.3, (barHeight / 60)); // Opacity based on height
        
        ctx.fillStyle = `rgba(220, 38, 38, ${opacity})`; // red-600 with variable opacity
        ctx.fillRect(i * (barWidth * 2.5), canvas.height - barHeight, barWidth, barHeight);
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    const drawIdle = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = canvas.width / barCount / 2;
         for (let i = 0; i < barCount; i++) {
            const barHeight = 2;
            ctx.fillStyle = `rgba(209, 213, 219, 0.5)`; // gray-300
            ctx.fillRect(i * (barWidth * 2.5), canvas.height - barHeight, barWidth, barHeight);
        }
    }


    if (isActive) {
      draw();
    } else {
      drawIdle();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return <canvas ref={canvasRef} width="300" height="75" className="rounded-lg" />;
};

export default AudioVisualizer;
