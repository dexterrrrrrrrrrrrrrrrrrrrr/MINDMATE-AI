import React, { useEffect, useRef } from "react";
import "../styles/VoicePulseLine.css";

const BAR_COUNT = 28;
const MIN_BAR_HEIGHT = 2.5;

const VoicePulseLine = ({ isListening, stream }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let animationFrame = 0;
    let audioContext;
    let analyser;
    let microphoneSource;
    let frequencyData;
    let resizeObserver;
    let disposed = false;
    let smoothedLevel = 0;
    const barLevels = Array.from({ length: BAR_COUNT }, () => 0);

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);

      let liveLevel = 0;
      if (isListening && analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        const voiceBins = Math.min(frequencyData.length, 48);
        let energy = 0;

        for (let index = 2; index < voiceBins; index += 1) {
          const normalized = frequencyData[index] / 255;
          energy += normalized * normalized;
        }

        const rms = Math.sqrt(energy / Math.max(1, voiceBins - 2));
        // Lift normal speaking into a clearly visible range while keeping room
        // for loud speech to produce taller peaks.
        liveLevel = Math.min(1, Math.max(0, (rms - 0.025) * 3.4));
      }

      const smoothing = liveLevel > smoothedLevel ? 0.42 : 0.14;
      smoothedLevel += (liveLevel - smoothedLevel) * smoothing;

      const gap = Math.max(2.5, Math.min(4, width / 94));
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      const maxBarHeight = Math.max(MIN_BAR_HEIGHT, height - 5);
      const middle = (BAR_COUNT - 1) / 2;

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const mirroredDistance = Math.abs(index - middle) / middle;
        const centerShape = 0.48 + (1 - mirroredDistance) * 0.52;
        const spectrumIndex = analyser && frequencyData
          ? Math.min(frequencyData.length - 1, 2 + Math.floor(index * 1.35))
          : 0;
        const spectrum = frequencyData ? frequencyData[spectrumIndex] / 255 : 0;
        const organicPeak = 0.74 + 0.26 * Math.sin(index * 1.9 + performance.now() * 0.004);
        const target = isListening
          ? Math.min(1, smoothedLevel * centerShape * organicPeak + spectrum * 0.42)
          : 0;
        const barSmoothing = target > barLevels[index] ? 0.5 : 0.16;
        barLevels[index] += (target - barLevels[index]) * barSmoothing;

        const barHeight = MIN_BAR_HEIGHT + barLevels[index] * (maxBarHeight - MIN_BAR_HEIGHT);
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        const radius = Math.min(barWidth / 2, barHeight / 2);

        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${0.5 + barLevels[index] * 0.5})`;
        if (typeof context.roundRect === "function") {
          context.roundRect(x, y, barWidth, barHeight, radius);
          context.fill();
        } else {
          context.fillRect(x, y, barWidth, barHeight);
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", resizeCanvas);
    }

    const connectMicrophone = async () => {
      if (!isListening || !stream) return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.minDecibels = -82;
        analyser.maxDecibels = -18;
        analyser.smoothingTimeConstant = 0.72;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        microphoneSource = audioContext.createMediaStreamSource(stream);
        microphoneSource.connect(analyser);

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        if (disposed) {
          microphoneSource.disconnect();
          await audioContext.close();
        }
      } catch (error) {
        // Speech recognition owns the user-facing permission flow. If Web Audio
        // analysis is unavailable, the meter stays as a calm flat line.
        console.warn("Live microphone level is unavailable:", error);
      }
    };

    draw();
    connectMicrophone();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resizeCanvas);
      microphoneSource?.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [isListening, stream]);

  return (
    <div
      className="voice-level-meter"
      role="img"
      aria-label={isListening ? "Live microphone level" : "Microphone level idle"}
    >
      <canvas ref={canvasRef} className="voice-line-canvas" aria-hidden="true" />
    </div>
  );
};

export default VoicePulseLine;
