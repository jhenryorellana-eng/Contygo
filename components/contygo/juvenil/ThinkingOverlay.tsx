"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./ThinkingOverlay.module.css";

type MotionState = "running" | "paused" | "reduced";
type Phase = "entering" | "idle" | "exiting" | "hidden";

export type LiquidGlowProps = {
  className?: string;
  /** Real voice RMS, normalized to 0–1. */
  level?: number;
  /** Light gain, clamped to 0–2. */
  intensity?: number;
};

export type ThinkingOverlayProps = {
  active: boolean;
  label?: string;
  variant?: "full" | "input-only";
  onExitComplete?: () => void;
};

const ENTER_MS = 320;
const EXIT_MS = 400;

function useSurfaceMotion(): MotionState {
  const [motion, setMotion] = useState<MotionState>("paused");
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(document.hidden ? "paused" : preference.matches ? "reduced" : "running");
    update();
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
    };
  }, []);
  return motion;
}

function GlowLayer({ className = "", level = 0, intensity = 1, motion }: LiquidGlowProps & { motion: MotionState }) {
  const rms = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  const gain = Number.isFinite(intensity) ? Math.max(0, Math.min(2, intensity)) : 1;
  const response = motion === "running" ? Math.sqrt(rms) : 0;
  const style = {
    "--glow-gain": gain,
    "--voice-scale": 1 + response * 0.16,
    "--voice-light": 0.86 + response * 0.14,
  } as CSSProperties;

  return <div className={`${s.liquidGlow} ${className}`} style={style} data-motion={motion} aria-hidden="true">
    <div className={s.glowEnvelope}>
      <i className={s.navyCloud} />
      <i className={s.forestCloud} />
      <i className={s.ivoryCloud} />
      <i className={s.greenCloud} />
    </div>
  </div>;
}

/** Decorative, CSS-only light. The containing element supplies its position. */
export function LiquidGlow(props: LiquidGlowProps) {
  const motion = useSurfaceMotion();
  return <GlowLayer {...props} motion={motion} />;
}

export default function ThinkingOverlay({ active, label = "Estoy pensando…", variant = "full", onExitComplete }: ThinkingOverlayProps) {
  const [phase, setPhase] = useState<Phase>(active ? "entering" : "hidden");
  const phaseRef = useRef(phase);
  const activeRef = useRef(active);
  const callbackRef = useRef(onExitComplete);
  const sequence = useRef(0);
  activeRef.current = active;
  callbackRef.current = onExitComplete;
  const motion = useSurfaceMotion();

  useEffect(() => {
    const ticket = ++sequence.current;
    let timer: number | undefined;
    const enter = (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
    };

    if (active) {
      enter("entering");
      timer = window.setTimeout(() => {
        if (ticket === sequence.current && activeRef.current) enter("idle");
      }, ENTER_MS);
    } else if (phaseRef.current !== "hidden") {
      enter("exiting");
      timer = window.setTimeout(() => {
        if (ticket !== sequence.current || activeRef.current || phaseRef.current !== "exiting") return;
        enter("hidden");
        callbackRef.current?.();
      }, EXIT_MS);
    }

    return () => {
      ++sequence.current;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [active]);

  if (phase === "hidden") return null;

  return <div className={s.overlay} data-phase={phase} data-variant={variant} data-motion={motion} aria-busy={active}>
    {variant === "full" && <div className={s.scrim} aria-hidden="true" />}
    <GlowLayer motion={motion} />
    <div className={variant === "full" ? s.status : s.srOnly} role="status" aria-live="polite" aria-atomic="true">
      <svg className={s.spinner} viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeDasharray="29 12" />
      </svg>
      <span>{label}</span>
    </div>
  </div>;
}
