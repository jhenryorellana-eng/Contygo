"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ServicesSection.module.css";

export default function ServicesMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const slots = Array.from(root.querySelectorAll<HTMLElement>("[data-service-motion]"));
    const animations = new Map<HTMLElement, Animation>();

    // The server-rendered content stays visible, including when JavaScript is unavailable.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      let stagger = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const slot = entry.target as HTMLElement;
        observer?.unobserve(slot);
        if (slot.dataset.revealed || reduced.matches || !slot.animate) continue;
        slot.dataset.revealed = "true";
        const animation = slot.animate([
          { opacity: .72, transform: "translate3d(0, 16px, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ], {
          duration: hoverPointer.matches ? 680 : 520,
          delay: hoverPointer.matches ? Math.min(stagger++, 2) * 65 : 0,
          easing: "cubic-bezier(.22, 1, .36, 1)",
          fill: "backwards",
        });
        animations.set(slot, animation);
        animation.finished.then(() => animations.delete(slot), () => animations.delete(slot));
      }
    }, { threshold: .12, rootMargin: "0px 0px -20px 0px" });

    const pointerBindings = slots.map(slot => {
      const card = slot.querySelector<HTMLElement>("article")!;
      let frame = 0;
      let clientX = 0;
      let clientY = 0;

      const reset = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        delete card.dataset.pointerActive;
        for (const property of ["--tilt-x", "--tilt-y", "--light-x", "--light-y"]) {
          card.style.removeProperty(property);
        }
      };

      const move = (event: PointerEvent) => {
        if (reduced.matches || !hoverPointer.matches || event.pointerType !== "mouse") return;
        clientX = event.clientX;
        clientY = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
          card.dataset.pointerActive = "true";
          card.style.setProperty("--tilt-x", `${((.5 - y) * 1.6).toFixed(2)}deg`);
          card.style.setProperty("--tilt-y", `${((x - .5) * 2).toFixed(2)}deg`);
          card.style.setProperty("--light-x", `${(x * 100).toFixed(1)}%`);
          card.style.setProperty("--light-y", `${(y * 100).toFixed(1)}%`);
        });
      };

      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", reset);
      card.addEventListener("pointercancel", reset);
      return {
        reset,
        dispose: () => {
          reset();
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", reset);
          card.removeEventListener("pointercancel", reset);
        },
      };
    });

    const resetPointers = () => pointerBindings.forEach(binding => binding.reset());
    const syncPreference = () => {
      resetPointers();
      if (reduced.matches) {
        observer?.disconnect();
        animations.forEach(animation => animation.cancel());
        animations.clear();
      } else {
        slots.filter(slot => !slot.dataset.revealed).forEach(slot => observer?.observe(slot));
      }
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const slot = event.target.closest<HTMLElement>("[data-service-motion]");
      if (!slot) return;
      observer?.unobserve(slot);
      slot.dataset.revealed = "true";
      animations.get(slot)?.finish();
    };

    syncPreference();
    reduced.addEventListener("change", syncPreference);
    hoverPointer.addEventListener("change", resetPointers);
    window.addEventListener("blur", resetPointers);
    root.addEventListener("focusin", focus);
    return () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      pointerBindings.forEach(binding => binding.dispose());
      reduced.removeEventListener("change", syncPreference);
      hoverPointer.removeEventListener("change", resetPointers);
      window.removeEventListener("blur", resetPointers);
      root.removeEventListener("focusin", focus);
    };
  }, []);

  return <div ref={rootRef} className={styles.cards}>{children}</div>;
}
