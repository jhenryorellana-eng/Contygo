"use client";

/* ============================================================
   Prime — "Orbe de voz": anillo de líneas finas luminosas que fluyen
   y reaccionan al audio (micrófono del usuario y voz de Prime).
   Canvas 2D, 60 fps, composición aditiva para el brillo. Respeta
   prefers-reduced-motion (anillo estático, sin oscilación).
   ============================================================ */
import { useEffect, useRef } from "react";

export type OrbMode = "idle" | "listening" | "speaking" | "off";

export interface OrbLevels {
  /** Nivel del micrófono 0..1 */
  input: number;
  /** Nivel de la voz de Prime 0..1 */
  output: number;
}

interface VoiceOrbProps {
  mode: OrbMode;
  getLevels: () => OrbLevels;
}

const LINES = 34;
const POINTS = 170;
const GOLD = [239, 196, 77] as const;
const WHITE_GOLD = [255, 246, 220] as const;

export default function VoiceOrb({ mode, getLevels }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<OrbMode>(mode);
  const levelsRef = useRef(getLevels);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    levelsRef.current = getLevels;
  }, [getLevels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let smoothIn = 0;
    let smoothOut = 0;
    let energySm = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { input, output } = levelsRef.current();
      smoothIn += (input - smoothIn) * 0.2;
      smoothOut += (output - smoothOut) * 0.25;
      const m = modeRef.current;

      // Energía objetivo según el estado; suavizada para que "respire".
      const target =
        m === "speaking"
          ? 0.3 + Math.min(1, smoothOut * 1.6) * 0.7
          : m === "listening"
            ? 0.14 + Math.min(1, smoothIn * 1.5) * 0.6
            : m === "idle"
              ? 0.12
              : 0.05;
      energySm += (target - energySm) * 0.12;
      const energy = energySm;

      if (!reduced) t += 0.006 + energy * 0.022;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.4;

      // Halo de fondo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, R * 1.55);
      halo.addColorStop(0, `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${0.08 + energy * 0.22})`);
      halo.addColorStop(1, "rgba(239,196,77,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Líneas (composición aditiva → brillo donde se cruzan)
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      const speaking = m === "speaking";
      const [cr, cg, cb] = speaking ? WHITE_GOLD : GOLD;
      const twist = 0.55 + energy * 0.9;

      for (let i = 0; i < LINES; i++) {
        const f = i / (LINES - 1);
        const phase = f * Math.PI * 2;
        // Capas agrupadas en "bandas" (no equiespaciadas): cuerdas que se juntan y separan
        const band = 0.76 + f * 0.46 + Math.sin(f * Math.PI * 3) * 0.035;
        const amp = R * (0.06 + energy * 0.44) * (0.45 + 0.55 * Math.sin(t * 0.8 + phase * 2.3));
        const alpha = (0.09 + 0.26 * (1 - Math.abs(f - 0.5) * 1.5)) * (0.75 + energy * 0.6);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${Math.min(0.6, alpha)})`;
        if (i % 3 === 0) {
          ctx.shadowBlur = 8 + energy * 10;
          ctx.shadowColor = `rgba(${cr},${cg},${cb},0.45)`;
        } else {
          ctx.shadowBlur = 0;
        }

        // Elipse suavemente rotada por línea: da la sensación de "torsión"
        const rot = phase * 0.18 + t * 0.35;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const ex = 1 + 0.08 * Math.sin(t * 0.6 + phase);
        const ey = 1 - 0.08 * Math.sin(t * 0.6 + phase);

        ctx.beginPath();
        for (let p = 0; p <= POINTS; p++) {
          const a = (p / POINTS) * Math.PI * 2;
          const wob =
            Math.sin(a * 3 + t * 1.4 + phase) * 0.5 +
            Math.sin(a * 5 - t * 1.1 + phase * 2) * 0.3 +
            Math.sin(a * 9 + t * 2.3 - phase * twist) * 0.2;
          const r = R * band + wob * amp;
          const x0 = Math.cos(a) * r * ex;
          const y0 = Math.sin(a) * r * ey;
          const x = cx + x0 * cosR - y0 * sinR;
          const y = cy + x0 * sinR + y0 * cosR;
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pa-orb" aria-hidden="true" />;
}
