"use client";

/* ============================================================
   LP — Motor de interacción de la home
   · Reveal on scroll: añade .lp-in a todo [data-reveal]
   · Contadores: anima el número de [data-count-to]
   Respeta prefers-reduced-motion (todo aparece sin animar).
   ============================================================ */
import { useEffect } from "react";

function animateCount(el: HTMLElement, target: number, suffix: string) {
  const dur = 1300;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function HomeFX() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const countEls = Array.from(document.querySelectorAll<HTMLElement>("[data-count-to]"));

    if (reduced) {
      revealEls.forEach((el) => el.classList.add("lp-in"));
      return;
    }

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || seen.has(e.target)) continue;
          seen.add(e.target);
          const el = e.target as HTMLElement;
          el.classList.add("lp-in");
          if (el.dataset.countTo) {
            animateCount(el, Number(el.dataset.countTo), el.dataset.countSuffix ?? "");
          }
          io.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );

    revealEls.forEach((el) => io.observe(el));
    countEls.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
