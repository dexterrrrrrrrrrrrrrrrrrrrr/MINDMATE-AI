import React, { useEffect, useRef } from "react";
import "../styles/VoicePulseLine.css";

const VoicePulseLine = ({ volume }) => {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    const width = canvas.width;
    const height = canvas.height;
    let animationFrame;

    const animate = () => {
      context.clearRect(0, 0, width, height);
      context.beginPath();
      context.moveTo(0, height / 2);

      for (let x = 0; x < width; x += 1) {
        const pulse =
          Math.sin((x + phaseRef.current) * 0.05) *
          volumeRef.current * 40;
        context.lineTo(x, height / 2 + pulse);
      }

      context.strokeStyle = volumeRef.current > 0.05 ? "#fff" : "#000";
      context.lineWidth = 2;
      context.stroke();
      phaseRef.current += 2;
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas ref={canvasRef} className="voice-line-canvas" width={300} height={40} />;
};

export default VoicePulseLine;
