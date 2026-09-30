"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import styles from "./AppSection.module.css";

/** Runs the presentation while visible, respecting the device's motion preference. */
export default function AppShowcase({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let visible = false;
    let frame = 0;

    const resetPointer = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      root.style.setProperty("--pointer-x", "0deg");
      root.style.setProperty("--pointer-y", "0deg");
    };
    const sync = () => {
      const enabled = !reduced.matches;
      const running = enabled && visible && !document.hidden;
      root.dataset.motionEnabled = String(enabled);
      root.dataset.motionRunning = String(running);
      if (!running) resetPointer();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(root);

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || root.dataset.motionRunning !== "true") return;
      const bounds = root.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--pointer-x", `${(-y * 2).toFixed(2)}deg`);
        root.style.setProperty("--pointer-y", `${(x * 3).toFixed(2)}deg`);
        frame = 0;
      });
    };
    sync();
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", resetPointer);
    root.addEventListener("pointercancel", resetPointer);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    finePointer.addEventListener("change", resetPointer);
    window.addEventListener("blur", resetPointer);
    return () => {
      observer.disconnect();
      resetPointer();
      root.dataset.motionRunning = "false";
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", resetPointer);
      root.removeEventListener("pointercancel", resetPointer);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      finePointer.removeEventListener("change", resetPointer);
      window.removeEventListener("blur", resetPointer);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.visual} data-motion-enabled="false" data-motion-running="false">
      <div className={styles.presentationStage} aria-hidden="true">
        <Image src="/contygo/studio-cinematic-v1.png" alt="" fill sizes="(max-width: 760px) 100vw, (max-width: 1440px) 50vw, 640px" className={styles.stageImage} quality={85} />
        <span className={styles.stageReflection} />
        <span className={styles.stageSweep} />
      </div>
      <span className={styles.floorShadow} aria-hidden="true" />
      {children}
    </div>
  );
}
