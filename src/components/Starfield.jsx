import { useEffect, useRef } from "react";

const Starfield = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return undefined;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let stars = [];
    let width = 0;
    let height = 0;
    let depth = 0;
    let animationFrame = null;
    let resizeFrame = null;
    let lastTime = performance.now();
    let cameraX = 0;
    let cameraY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const createStar = (randomDepth = true) => ({
      x: (Math.random() - 0.5) * width * 2.1,
      y: (Math.random() - 0.5) * height * 2.1,
      z: randomDepth ? Math.random() * depth + 1 : depth,
      size: 0.42 + Math.random() * 1.2,
      warmth: Math.random(),
    });

    const createStars = () => {
      const area = width * height;
      const count = reducedMotionQuery.matches
        ? Math.min(130, Math.max(70, Math.round(area / 7200)))
        : Math.min(430, Math.max(95, Math.round(area / 3300)));
      stars = Array.from({ length: count }, () => createStar(true));
    };

    const resize = () => {
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      depth = Math.max(width, height) * 1.15;
      const mobile = width <= 768;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createStars();
    };

    const paintBackground = () => {
      context.fillStyle = "#020203";
      context.fillRect(0, 0, width, height);

      const atmosphere = context.createRadialGradient(
        width * 0.54,
        height * 0.48,
        0,
        width * 0.54,
        height * 0.48,
        Math.max(width, height) * 0.62,
      );
      atmosphere.addColorStop(0, "rgba(26, 31, 46, 0.24)");
      atmosphere.addColorStop(0.38, "rgba(9, 15, 27, 0.12)");
      atmosphere.addColorStop(1, "rgba(2, 2, 3, 0)");
      context.fillStyle = atmosphere;
      context.fillRect(0, 0, width, height);
    };

    const draw = (time = performance.now()) => {
      const delta = Math.min((time - lastTime) / 16.667, 2.2);
      lastTime = time;
      const animate = !reducedMotionQuery.matches;

      cameraX += (targetCameraX - cameraX) * 0.035;
      cameraY += (targetCameraY - cameraY) * 0.035;
      paintBackground();

      const centerX = width / 2 + cameraX;
      const centerY = height / 2 + cameraY;
      const focalLength = Math.min(width, height) * 0.72;

      for (const star of stars) {
        if (animate) star.z -= (width <= 768 ? 1.05 : 1.45) * delta;
        if (star.z <= 1) Object.assign(star, createStar(false));

        const scale = focalLength / star.z;
        const screenX = star.x * scale + centerX;
        const screenY = star.y * scale + centerY;

        if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) {
          Object.assign(star, createStar(false));
          continue;
        }

        const proximity = 1 - star.z / depth;
        const radius = Math.max(0.22, proximity * star.size * 2.15);
        const alpha = Math.min(0.96, 0.25 + proximity * 0.82);
        const blue = Math.round(244 + star.warmth * 11);

        if (animate && proximity > 0.76) {
          const previousScale = focalLength / (star.z + 7.5);
          context.beginPath();
          context.moveTo(star.x * previousScale + centerX, star.y * previousScale + centerY);
          context.lineTo(screenX, screenY);
          context.strokeStyle = `rgba(210, 224, 255, ${alpha * 0.18})`;
          context.lineWidth = Math.max(0.35, radius * 0.42);
          context.stroke();
        }

        context.beginPath();
        context.arc(screenX, screenY, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${blue}, ${blue}, 255, ${alpha})`;
        context.fill();
      }
    };

    const animateFrame = (time) => {
      draw(time);
      animationFrame = requestAnimationFrame(animateFrame);
    };

    const start = () => {
      if (animationFrame || document.hidden) return;
      lastTime = performance.now();
      if (reducedMotionQuery.matches) {
        draw(lastTime);
      } else {
        animationFrame = requestAnimationFrame(animateFrame);
      }
    };

    const stop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const handleResize = () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resize();
        if (reducedMotionQuery.matches) draw();
      });
    };

    const handlePointerMove = (event) => {
      if (!finePointerQuery.matches || reducedMotionQuery.matches) return;
      targetCameraX = ((event.clientX / width) - 0.5) * 18;
      targetCameraY = ((event.clientY / height) - 0.5) * 12;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const handleMotionChange = () => {
      stop();
      createStars();
      start();
    };

    resize();
    start();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    return () => {
      stop();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield-canvas" aria-hidden="true" />;
};

export default Starfield;
