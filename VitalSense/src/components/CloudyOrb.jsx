import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uLevel;
  uniform float uListening;
  uniform float uThinking;
  uniform float uSpeaking;
  uniform float uOpacity;
  uniform float uSteps;
  uniform float uReducedMotion;

  varying vec2 vUv;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float valueNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 local = fract(p);
    local = local * local * (3.0 - 2.0 * local);

    float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, local.x);
    float nx10 = mix(n010, n110, local.x);
    float nx01 = mix(n001, n101, local.x);
    float nx11 = mix(n011, n111, local.x);
    return mix(mix(nx00, nx10, local.y), mix(nx01, nx11, local.y), local.z);
  }

  float fbm(vec3 p) {
    float result = 0.0;
    float amplitude = 0.56;
    mat3 turn = mat3(
      0.00, 0.80, 0.60,
      -0.80, 0.36, -0.48,
      -0.60, -0.48, 0.64
    );

    for (int octave = 0; octave < 3; octave++) {
      result += valueNoise(p) * amplitude;
      p = turn * p * 2.03 + vec3(0.17, 0.31, 0.13);
      amplitude *= 0.49;
    }
    return result;
  }

  void main() {
    vec2 point = (vUv - 0.5) * 2.0;
    float radiusSquared = dot(point, point);
    if (radiusSquared > 1.0) discard;

    float radius = sqrt(radiusSquared);
    float edge = 1.0 - smoothstep(0.955, 1.0, radius);
    float halfDepth = sqrt(max(1.0 - radiusSquared, 0.0));

    float activity = clamp(
      0.12 + uListening * 0.20 + uThinking * 0.42 + uSpeaking * 0.58 + uLevel * 0.35,
      0.0,
      1.0
    );
    float motion = mix(0.0, uTime, 1.0 - uReducedMotion);
    float speed = 0.055 + uListening * 0.045 + uThinking * 0.105 + uSpeaking * 0.085;
    float flowTime = motion * speed;

    vec4 accumulated = vec4(0.0);
    const int STEPS = 12;
    float turnY = flowTime * 0.34;
    float turnX = flowTime * 0.19;
    mat2 rotateY = mat2(cos(turnY), -sin(turnY), sin(turnY), cos(turnY));
    mat2 rotateX = mat2(cos(turnX), -sin(turnX), sin(turnX), cos(turnX));

    for (int index = 0; index < STEPS; index++) {
      if (float(index) >= uSteps) break;
      float stepPosition = (float(index) + 0.5) / uSteps;
      float z = mix(halfDepth, -halfDepth, stepPosition);
      vec3 samplePoint = vec3(point.x, point.y, z);

      samplePoint.xz = rotateY * samplePoint.xz;
      samplePoint.yz = rotateX * samplePoint.yz;

      samplePoint += vec3(
        flowTime * 0.48,
        -flowTime * 0.34,
        flowTime * 0.27
      );

      float broadFlow = fbm(samplePoint * 1.34 + vec3(0.0, flowTime * 0.34, 1.7));
      vec3 warpedPoint = samplePoint + vec3(
        broadFlow - 0.5,
        valueNoise(samplePoint * 1.48 + vec3(2.8, 0.2, flowTime)) - 0.5,
        valueNoise(samplePoint * 1.36 + vec3(-1.7, flowTime * 0.7, 0.4)) - 0.5
      ) * (0.44 + activity * 0.12);

      float cloud = fbm(warpedPoint * (2.05 + activity * 0.16));
      float fineCloud = valueNoise(warpedPoint * 5.2 - vec3(flowTime * 0.7));
      float plume = smoothstep(0.43, 0.78, cloud * 0.84 + fineCloud * 0.16);
      float centreMist = 1.0 - smoothstep(0.1, 0.95, length(samplePoint * vec3(0.88, 0.96, 0.82)));
      float density = (0.105 + plume * 0.31 + centreMist * 0.075) * (1.0 + uLevel * 0.13);
      density *= halfDepth * 0.58 + 0.54;

      float vertical = clamp(samplePoint.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 deepBlue = vec3(0.018, 0.30, 0.91);
      vec3 clearBlue = vec3(0.12, 0.60, 1.0);
      vec3 paleCyan = vec3(0.69, 0.93, 0.98);
      vec3 cloudWhite = vec3(0.92, 0.985, 1.0);

      vec3 sampleColor = mix(deepBlue, clearBlue, smoothstep(0.04, 0.58, vertical));
      sampleColor = mix(sampleColor, paleCyan, smoothstep(0.46, 0.92, vertical));
      sampleColor = mix(sampleColor, cloudWhite, plume * (0.30 + vertical * 0.42));
      sampleColor += vec3(0.03, 0.075, 0.12) * uSpeaking * uLevel;

      float stepLength = max((halfDepth * 2.0) / uSteps, 0.001);
      float absorption = 1.0 - exp(-density * stepLength * 4.7);
      float sampleAlpha = absorption * (1.0 - accumulated.a);
      accumulated.rgb += sampleColor * sampleAlpha;
      accumulated.a += sampleAlpha;
    }

    float softCore = (1.0 - smoothstep(0.18, 1.0, radius)) * 0.035;
    accumulated.rgb += vec3(0.25, 0.72, 1.0) * softCore;
    accumulated.a = min(accumulated.a + softCore, 1.0);

    vec3 finalColor = accumulated.rgb / max(accumulated.a, 0.001);
    gl_FragColor = vec4(finalColor, accumulated.a * edge * uOpacity);
  }
`;

function VolumetricOrb({ volume, assistantVolumeRef, mode, closing, reducedMotion, qualitySteps }) {
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  const animationRef = useRef({
    open: 0,
    level: 0,
    listening: 0,
    thinking: 0,
    speaking: 0,
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uListening: { value: 0 },
    uThinking: { value: 0 },
    uSpeaking: { value: 0 },
    uOpacity: { value: 0 },
    uSteps: { value: qualitySteps },
    uReducedMotion: { value: reducedMotion ? 1 : 0 },
  }), [qualitySteps, reducedMotion]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !materialRef.current) return;

    const animation = animationRef.current;
    const assistantLevel = assistantVolumeRef?.current || 0;
    const rawLevel = mode === "speaking" ? assistantLevel : mode === "listening" ? volume : 0;
    const targetLevel = Math.min(Math.max(rawLevel, 0), 1);

    if (reducedMotion) {
      animation.open = closing ? 0 : 1;
      animation.level = 0;
      animation.listening = mode === "listening" && !closing ? 1 : 0;
      animation.thinking = mode === "thinking" && !closing ? 1 : 0;
      animation.speaking = mode === "speaking" && !closing ? 1 : 0;
    } else {
      animation.open = THREE.MathUtils.damp(animation.open, closing ? 0 : 1, closing ? 6 : 6.5, delta);
      animation.level = THREE.MathUtils.damp(animation.level, closing ? 0 : targetLevel, mode === "speaking" ? 10 : 7, delta);
      animation.listening = THREE.MathUtils.damp(animation.listening, mode === "listening" && !closing ? 1 : 0, 5.5, delta);
      animation.thinking = THREE.MathUtils.damp(animation.thinking, mode === "thinking" && !closing ? 1 : 0, 5.5, delta);
      animation.speaking = THREE.MathUtils.damp(animation.speaking, mode === "speaking" && !closing ? 1 : 0, 7, delta);
    }

    const restingScale = 0.06 + animation.open * 0.94;
    const voiceScale = reducedMotion ? 0 : animation.speaking * animation.level * 0.012;
    groupRef.current.scale.setScalar(restingScale + voiceScale);

    const shader = materialRef.current.uniforms;
    shader.uTime.value = clock.getElapsedTime();
    shader.uLevel.value = animation.level;
    shader.uListening.value = animation.listening;
    shader.uThinking.value = animation.thinking;
    shader.uSpeaking.value = animation.speaking;
    shader.uOpacity.value = Math.min(animation.open * 1.35, 1);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function CloudyOrb({
  volume = 0,
  assistantVolumeRef,
  mode = "idle",
  closing = false,
}) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const lowPowerDevice = typeof window !== "undefined" && (
    window.innerWidth <= 768 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  );
  const supportsWebGL = useMemo(() => {
    if (typeof document === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);

  if (!supportsWebGL) {
    return <div className={`chat-voice-orb-canvas orb-mode-${mode} orb-css-fallback`} aria-hidden="true" />;
  }

  return (
    <div className={`chat-voice-orb-canvas orb-mode-${mode}`} aria-hidden="true">
      <Canvas
        dpr={[1, lowPowerDevice ? 1.2 : 1.35]}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ position: [0, 0, 2.4], fov: 50 }}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      >
        <VolumetricOrb
          volume={volume}
          assistantVolumeRef={assistantVolumeRef}
          mode={mode}
          closing={closing}
          reducedMotion={reducedMotion}
          qualitySteps={lowPowerDevice ? 8 : 12}
        />
      </Canvas>
    </div>
  );
}
