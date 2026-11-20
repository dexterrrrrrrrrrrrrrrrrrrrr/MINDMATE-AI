import React, { useEffect, useRef } from "react";
import "../styles/VoicePulseLine.css";

const DOT_SIZE = 1.15;
const DOT_STEP = 4;

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
    let timeDomainData;
    let resizeObserver;
    let disposed = false;
    let smoothedLevel = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasPixelRatio = 0;
    const barLevels = [];

    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        width === canvasWidth
        && height === canvasHeight
        && pixelRatio === canvasPixelRatio
      ) return;

      canvasWidth = Math.max(1, width);
      canvasHeight = Math.max(1, height);
      canvasPixelRatio = pixelRatio;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      const width = canvasWidth;
      const height = canvasHeight;
      const now = performance.now();
      context.clearRect(0, 0, width, height);

      let liveLevel = 0;
      if (isListening && analyser && frequencyData && timeDomainData) {
        analyser.getByteTimeDomainData(timeDomainData);
        analyser.getByteFrequencyData(frequencyData);
        let energy = 0;

        for (let index = 0; index < timeDomainData.length; index += 1) {
          const sample = (timeDomainData[index] - 128) / 128;
          energy += sample * sample;
        }

        const rms = Math.sqrt(energy / timeDomainData.length);
        const gatedLevel = Math.max(0, rms - 0.018);
        // A gentle noise gate preserves the idle dot line. The curved boost
        // makes normal speech rise decisively without clipping louder voices.
        liveLevel = Math.min(1, Math.pow(gatedLevel * 12, 0.72));
      }

      const smoothing = liveLevel > smoothedLevel ? 0.56 : 0.12;
      smoothedLevel += (liveLevel - smoothedLevel) * smoothing;
      if (smoothedLevel < 0.018) smoothedLevel = 0;

      const dotSize = DOT_SIZE;
      const barCount = Math.max(12, Math.floor((width - dotSize) / DOT_STEP) + 1);
      while (barLevels.length < barCount) barLevels.push(0);
      if (barLevels.length > barCount) barLevels.length = barCount;
      const step = (width - dotSize) / (barCount - 1);
      const maxBarHeight = Math.max(dotSize, height - 4);
      const middle = (barCount - 1) / 2;
      const activeLevel = smoothedLevel > 0.045
        ? Math.min(1, (smoothedLevel - 0.035) / 0.965)
        : 0;

      for (let index = 0; index < barCount; index += 1) {
        const mirroredDistance = Math.abs(index - middle) / middle;
        const centerShape = 0.58 + (1 - mirroredDistance) * 0.42;
        const spectrumIndex = analyser && frequencyData
          ? Math.min(frequencyData.length - 1, 2 + Math.floor((index / (barCount - 1)) * 46))
          : 0;
        const spectrum = frequencyData ? frequencyData[spectrumIndex] / 255 : 0;
        const organicPeak = 0.82 + 0.18 * Math.sin(index * 1.73 + now * 0.006);
        const boostedLevel = Math.pow(activeLevel, 0.68);
        const target = isListening && activeLevel > 0
          ? Math.min(1, boostedLevel * centerShape * organicPeak * (0.9 + spectrum * 0.52))
          : 0;
        const barSmoothing = target > barLevels[index] ? 0.58 : 0.14;
        barLevels[index] += (target - barLevels[index]) * barSmoothing;
        if (target === 0 && barLevels[index] < 0.012) barLevels[index] = 0;

        const barHeight = dotSize + barLevels[index] * (maxBarHeight - dotSize);
        const centerX = dotSize / 2 + index * step;
        const x = centerX - dotSize / 2;
        const y = (height - barHeight) / 2;
        const radius = dotSize / 2;

        context.beginPath();
        context.fillStyle = `rgba(255, 255, 255, ${0.31 + barLevels[index] * 0.69})`;
        if (barLevels[index] === 0) {
          context.arc(centerX, height / 2, radius, 0, Math.PI * 2);
          context.fill();
        } else if (typeof context.roundRect === "function") {
          context.roundRect(x, y, dotSize, barHeight, radius);
          context.fill();
        } else {
          context.fillRect(x, y, dotSize, barHeight);
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
        timeDomainData = new Uint8Array(analyser.fftSize);
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
