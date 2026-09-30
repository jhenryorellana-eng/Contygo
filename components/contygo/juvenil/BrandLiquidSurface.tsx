"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import s from "./BrandLiquidSurface.module.css";

export type VisaVisualTheme = "lagoon" | "prism" | "ribbon";
export type VisaVisualPlacement = "field" | "basin" | "halo";

type Props = {
  theme?: VisaVisualTheme;
  progress?: number;
  active?: boolean;
  placement?: VisaVisualPlacement;
  level?: number;
  className?: string;
};

type SurfaceConfig = { theme: VisaVisualTheme; progress: number; active: boolean; placement: VisaVisualPlacement; level: number };
type SurfaceController = { update: (config: SurfaceConfig) => void };

const THEMES: Record<VisaVisualTheme, number> = { lagoon: 0, prism: 1, ribbon: 2 };
const PLACEMENTS: Record<VisaVisualPlacement, number> = { field: 0, basin: 1, halo: 2 };
const DURATION = 3600;
const FRAME_INTERVAL = 1000 / 30;

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// One quad with large domain-warped liquid masses. Only the four brand colors
// are mixed; a quiet ivory lens edge gives depth without metallic light bands.
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform float uTheme;
uniform float uPlacement;
uniform float uLevel;

const vec3 NAVY = vec3(0.0235, 0.1059, 0.2392);
const vec3 GREEN = vec3(0.1451, 0.8275, 0.4000);
const vec3 FOREST = vec3(0.0314, 0.4980, 0.2745);
const vec3 IVORY = vec3(0.9647, 0.9725, 0.9686);

vec2 warp(vec2 p) {
  float t = uTime;
  p += vec2(
    0.38 * sin(p.y * 1.15 + t * 0.42) + 0.18 * cos(p.x * 1.05 + p.y * 0.6 - t * 0.3),
    0.32 * sin(p.x * 1.2 - t * 0.35) + 0.17 * cos(p.y * 1.5 + t * 0.28)
  );
  return p;
}

float heightAt(vec2 p) {
  vec2 q = warp(p);
  float t = uTime;
  if (uTheme > 1.5) {
    return 0.72 * sin(q.y * 2.1 + q.x * 0.48
        + 0.9 * sin(q.x * 1.15 + t * 0.36) - t * 0.43)
      + 0.26 * cos(q.x * 0.95 - q.y * 0.6 + t * 0.3);
  }
  return 0.68 * sin(q.x * 1.35 + q.y * 0.7 + t * 0.36)
    + 0.46 * cos(q.y * 1.55 - q.x * 0.65 - t * 0.31)
    + 0.16 * sin(q.x * 2.1 - q.y * 1.3 + uProgress * 0.7);
}

vec2 rotateCloud(vec2 p, float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
}

vec3 focalCloud(vec2 uv, vec2 anchor, vec2 size, float contain) {
  // Three overlapping Gaussian petals share a fixed centre. Voice expands
  // their light by at most 18%; only their internal shape rotates and breathes.
  // The square-root response makes ordinary, quiet RMS values perceptible.
  float voice = sqrt(uLevel);
  vec2 p = (uv - anchor) / (size * (1.0 + voice * 0.18));
  float angle = uTime * 0.085 + uProgress * 0.17;
  vec2 q = rotateCloud(p, angle);
  q += 0.075 * vec2(
    sin(q.y * 2.4 + uTime * 0.21) - sin(uTime * 0.21),
    sin(q.x * 2.1 - uTime * 0.19) + sin(uTime * 0.19)
  );
  vec2 a = q / vec2(0.98, 0.52);
  vec2 b = rotateCloud(q, 1.05) / vec2(0.94, 0.55);
  vec2 c = rotateCloud(q, -1.02) / vec2(0.9, 0.58);
  float density = 0.42 * exp(-dot(a, a) * 1.65)
    + 0.34 * exp(-dot(b, b) * 1.65)
    + 0.3 * exp(-dot(c, c) * 1.65);
  // A static, low-contrast grain softens the light without temporal sparkle.
  float grain = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
  density = min(1.0, density * (0.975 + grain * 0.05)) * contain;
  float greenShare = 0.8 + 0.2 * sin(uProgress * 0.65 + 0.5);
  vec3 color = mix(NAVY, FOREST, density * greenShare * (0.035 + voice * 0.02));
  color = mix(color, GREEN, density * greenShare * (0.004 + voice * 0.007));
  color = mix(color, IVORY, pow(density, 1.35) * (0.185 + voice * 0.115));
  return color;
}

vec3 basinAt(vec2 uv) {
  if (uv.y >= 0.4) return NAVY;
  float contain = (1.0 - smoothstep(0.29, 0.4, uv.y)) * smoothstep(0.0, 0.035, uv.y);
  contain *= smoothstep(0.0, 0.08, uv.x) * (1.0 - smoothstep(0.92, 1.0, uv.x));
  return focalCloud(uv, vec2(0.5, 0.115), vec2(0.64, 0.17), contain);
}

vec3 haloAt(vec2 uv) {
  float contain = smoothstep(0.0, 0.12, uv.x) * (1.0 - smoothstep(0.88, 1.0, uv.x));
  contain *= smoothstep(0.0, 0.15, uv.y) * (1.0 - smoothstep(0.85, 1.0, uv.y));
  return focalCloud(uv, vec2(0.5), vec2(0.62, 0.5), contain);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  if (uPlacement > 1.5) {
    gl_FragColor = vec4(haloAt(uv), 1.0);
    return;
  }
  if (uPlacement > 0.5) {
    gl_FragColor = vec4(basinAt(uv), 1.0);
    return;
  }
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * 2.35;
  float angle = -0.28 + 0.22 * sin(uProgress * 0.8);
  p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
  p += vec2(sin(uProgress * 0.73) * 0.5, uProgress * 0.28);
  p *= 1.0 + 0.04 * sin(uProgress * 1.2);

  float h = heightAt(p);
  float e = 0.012;
  vec2 slope = vec2(heightAt(p + vec2(e, 0.0)) - h, heightAt(p + vec2(0.0, e)) - h) / e;
  vec3 normal = normalize(vec3(-slope * 0.75, 1.0));
  vec2 q = warp(p + normal.xy * 0.12);
  float light = pow(max(dot(normal, normalize(vec3(-0.4, 0.55, 1.0))), 0.0), 18.0);
  float contour = 1.0 - smoothstep(0.015, 0.1, abs(h - 0.3));
  float greenShare = 0.5 + 0.5 * sin(q.x * 0.7 - q.y * 0.55 + uProgress * 0.95);
  vec3 liquid = mix(FOREST, GREEN, greenShare * 0.82);
  vec3 color;

  if (uTheme < 0.5) {
    float mass = smoothstep(0.22, 0.68, h);
    color = mix(NAVY, liquid, mass * (0.65 + greenShare * 0.3));
    color = mix(color, IVORY, contour * 0.085 + light * mass * 0.045);
    // Keep the editorial edge navy while liquid still flows through the scene.
    // gl_FragCoord's Y grows upward: the top 23% is the portrait reading zone.
    float portrait = 1.0 - smoothstep(0.8, 1.05, uResolution.x / uResolution.y);
    float desktopFlow = smoothstep(0.04, 0.4, uv.x);
    float portraitFlow = 1.0 - smoothstep(0.53, 0.77, uv.y);
    color = mix(NAVY, color, mix(desktopFlow, portraitFlow, portrait));
  } else if (uTheme < 1.5) {
    // The editorial left stays ivory; stronger liquid masses live on the right.
    float editorial = smoothstep(0.43, 0.91, uv.x);
    float mass = smoothstep(0.08, 0.6, h);
    vec3 ink = mix(NAVY, liquid, smoothstep(0.35, 0.85, greenShare));
    color = mix(IVORY, ink, mass * (0.04 + editorial * 0.87));
    color = mix(color, NAVY, contour * 0.03 * editorial);
    color = mix(color, IVORY, light * 0.14 + contour * 0.16);
  } else {
    float belt = smoothstep(-0.32, 0.25, h);
    float overlap = smoothstep(0.28, 0.75, sin(q.x * 1.1 - q.y * 0.7 + uTime * 0.28));
    color = mix(NAVY, FOREST, overlap * 0.38);
    color = mix(color, liquid, belt * 0.95);
    color = mix(color, GREEN, contour * greenShare * 0.3);
    color = mix(color, IVORY, contour * 0.065 + light * belt * 0.045);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

type Resources = {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  resolution: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  progress: WebGLUniformLocation | null;
  theme: WebGLUniformLocation | null;
  placement: WebGLUniformLocation | null;
  level: WebGLUniformLocation | null;
};

function createResources(gl: WebGLRenderingContext): Resources | null {
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!vertex || !fragment || !program || !buffer) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  gl.shaderSource(vertex, VERTEX_SHADER);
  gl.shaderSource(fragment, FRAGMENT_SHADER);
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked && process.env.NODE_ENV !== "production") {
    console.warn("ContyGo liquid surface: using CSS fallback.", gl.getProgramInfoLog(program), gl.getShaderInfoLog(fragment));
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!linked) {
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  return {
    program,
    buffer,
    resolution: gl.getUniformLocation(program, "uResolution"),
    time: gl.getUniformLocation(program, "uTime"),
    progress: gl.getUniformLocation(program, "uProgress"),
    theme: gl.getUniformLocation(program, "uTheme"),
    placement: gl.getUniformLocation(program, "uPlacement"),
    level: gl.getUniformLocation(program, "uLevel"),
  };
}

export default function BrandLiquidSurface({ theme = "lagoon", progress = 0, active = true, placement = "field", level = 0, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SurfaceController | null>(null);
  const stage = Number.isFinite(progress) ? Math.max(0, Math.min(5, Math.round(progress))) : 0;
  const volume = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  const configRef = useRef<SurfaceConfig>({ theme, progress: stage, active, placement, level: volume });
  configRef.current = { theme, progress: stage, active, placement, level: volume };

  // This also controls the CSS-only fallback when WebGL is unavailable.
  useEffect(() => {
    const surface = hostRef.current?.parentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (surface) surface.dataset.motion = motion.matches ? "reduced" : active && !document.hidden ? "running" : "paused";
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const surface = host.parentElement;
    if (surface) surface.dataset.renderer = "css";
    // Own the element as well as its context, so Strict Mode's second mount
    // never reuses a canvas whose previous GPU context was deliberately lost.
    const canvas = document.createElement("canvas");
    canvas.className = s.canvas;
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", {
      alpha: true, antialias: false, depth: false, stencil: false,
      powerPreference: "low-power", preserveDrawingBuffer: false,
    });
    if (!gl) {
      canvas.remove();
      return;
    }

    let resources = createResources(gl);
    if (!resources) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      return;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let config = configRef.current;
    let reduced = motion.matches;
    let currentProgress = config.progress;
    let currentLevel = 0;
    let startProgress = currentProgress;
    let phase = 0;
    let elapsed = 0;
    let morphing = false;
    let needsDraw = true;
    let needsResize = true;
    let disposed = false;
    let lost = false;
    let frame: number | null = null;
    let lastTime = 0;
    let lastDraw = 0;
    let frameCount = 0;
    let lastReport = -1000;

    function cancelFrame() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastTime = 0;
    }

    function resize() {
      const rect = host!.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const mobile = width < 700;
      const pixelBudget = mobile ? 360_000 : 720_000;
      const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25,
        Math.sqrt(pixelBudget / (width * height)), 1600 / Math.max(width, height));
      const renderWidth = Math.max(1, Math.round(width * ratio));
      const renderHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
      }
      gl!.viewport(0, 0, renderWidth, renderHeight);
      needsResize = false;
    }

    function draw() {
      if (!resources || lost || disposed) return;
      if (needsResize) resize();
      gl!.useProgram(resources.program);
      gl!.uniform2f(resources.resolution, canvas.width, canvas.height);
      gl!.uniform1f(resources.time, phase);
      gl!.uniform1f(resources.progress, currentProgress);
      gl!.uniform1f(resources.theme, THEMES[config.theme]);
      gl!.uniform1f(resources.placement, PLACEMENTS[config.placement]);
      gl!.uniform1f(resources.level, currentLevel);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      if (canvas.dataset.ready !== "true") {
        canvas.dataset.ready = "true";
        if (surface) surface.dataset.renderer = "webgl";
      }
      needsDraw = false;
    }

    function queueFrame() {
      if (disposed || lost || document.hidden || frame !== null) return;
      if (needsDraw || (config.active && !reduced)) frame = window.requestAnimationFrame(tick);
    }

    function tick(now: number) {
      frame = null;
      if (disposed || lost || document.hidden) return;
      if (!needsDraw && now - lastDraw < FRAME_INTERVAL) {
        queueFrame();
        return;
      }
      if (config.active && !reduced) {
        const delta = lastTime ? Math.min(now - lastTime, 100) : 0;
        lastTime = now;
        phase += delta / 1000;
        currentLevel += (config.level - currentLevel) * (1 - Math.exp(-delta / 130));
        if (morphing) {
          elapsed += delta;
          const fraction = Math.min(1, elapsed / DURATION);
          const eased = fraction * fraction * (3 - 2 * fraction);
          currentProgress = startProgress + (config.progress - startProgress) * eased;
          if (fraction === 1) morphing = false;
        }
      }
      draw();
      frameCount += 1;
      if (surface && now - lastReport >= 1000) {
        surface.dataset.frame = String(frameCount);
        surface.dataset.time = phase.toFixed(2);
        surface.dataset.level = currentLevel.toFixed(2);
        lastReport = now;
      }
      lastDraw = now;
      queueFrame();
    }

    function settle() {
      currentProgress = config.progress;
      currentLevel = 0;
      morphing = false;
      needsDraw = true;
      lastTime = 0;
    }

    const controller: SurfaceController = {
      update(next) {
        const changed = next.progress !== config.progress || next.theme !== config.theme || next.placement !== config.placement;
        const wasActive = config.active;
        config = next;
        if (changed) {
          startProgress = currentProgress;
          elapsed = 0;
          lastTime = 0;
          morphing = true;
          needsDraw = true;
          if (reduced) settle();
        }
        if (!next.active || !wasActive) cancelFrame();
        queueFrame();
      },
    };
    controllerRef.current = controller;

    const onResize = () => { needsResize = true; needsDraw = true; queueFrame(); };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(host);
    if (!observer) window.addEventListener("resize", onResize, { passive: true });
    const onVisibility = () => {
      if (document.hidden) cancelFrame();
      else { needsDraw = true; queueFrame(); }
    };
    const onMotion = () => {
      reduced = motion.matches;
      if (reduced) { cancelFrame(); settle(); }
      queueFrame();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelFrame();
      canvas.dataset.ready = "false";
      if (surface) surface.dataset.renderer = "css";
      resources = null;
    };
    const onRestored = () => {
      if (disposed) return;
      resources = createResources(gl);
      lost = !resources;
      needsResize = true;
      needsDraw = true;
      queueFrame();
    };
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    if (reduced) settle();
    queueFrame();

    return () => {
      disposed = true;
      cancelFrame();
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (controllerRef.current === controller) controllerRef.current = null;
      if (resources) {
        gl.deleteBuffer(resources.buffer);
        gl.deleteProgram(resources.program);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      if (surface) surface.dataset.renderer = "css";
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update({ theme, progress: stage, active, placement, level: volume });
  }, [theme, stage, active, placement, volume]);

  return <div className={`${s.surface} ${className}`} data-theme={theme} data-placement={placement} data-renderer="css" data-motion="paused" data-frame="0" data-time="0" data-level="0" style={{ "--flow-step": stage, "--voice-level": active ? volume : 0 } as CSSProperties} aria-hidden="true">
    <div className={s.fallback} />
    <div className={s.canvasHost} ref={hostRef} />
    <div className={s.atmosphere} />
  </div>;
}
