"use client";

/* Celular · los favoritos como un escenario que responde a la mano (30-10-2026; antes, flechas y «2 de 5»).
   · Arriba, los cinco por su nombre: se ve qué hay sin deslizar y se elige con un toque (muchas personas mayores no
     saben deslizar de lado).
   · La tarjeta de delante sigue al dedo: crece y se enciende mientras las otras se apagan (--focus, de 0 a 1, solo mueve
     transform y opacidad). Tocar una de atrás la trae delante en lugar de abrirla, para no abrir un servicio sin querer.
   · Sin tocar nada avanzan solas: el nombre se llena de verde durante los 5 s que le quedan. Solo corre con la fila a la
     vista, se detiene mientras el dedo está encima y para del todo cuando la persona desliza, elige o abre un servicio.
     Con «reducir movimiento» no avanza solo.
   · La tarjeta que llega delante empieza a cargar su ventana, para que abra al instante.
   En escritorio no existe: las filas caben enteras. */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import s from "./StarCarousel.module.css";

const STEP_MS = 5000;
const MOBILE = "(max-width:760px)";

/** Where the row must scroll to show a card in front. From the layout, so the card's own scale does not move it. */
function cardLeft(row: HTMLElement, card: HTMLElement) {
  const inset = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
  return Math.min(Math.max(0, card.offsetLeft - inset), row.scrollWidth - row.clientWidth);
}
const nearestCard = (row: HTMLElement) => {
  const cards = Array.from(row.children) as HTMLElement[];
  return cards.reduce((best, card, i) => Math.abs(cardLeft(row, card) - row.scrollLeft) < Math.abs(cardLeft(row, cards[best]) - row.scrollLeft) ? i : best, 0);
};

export default function StarCarousel({ track, labels, onFront }: { track: RefObject<HTMLElement>; labels: string[]; onFront?: (index: number) => void }) {
  const count = labels.length;
  const [index, setIndex] = useState(0);
  // `run` restarts the green fill together with the timer behind it.
  const [auto, setAuto] = useState({ on: false, run: 0 });
  const stopped = useRef(false), touching = useRef(false), front = useRef(0);
  const reported = useRef(onFront); reported.current = onFront;

  const go = useCallback((target: number) => {
    const row = track.current, card = row?.children[target] as HTMLElement | undefined;
    if (!row || !card) return;
    row.scrollTo({ left: cardLeft(row, card), behavior: "smooth" });
  }, [track]);

  // The card in front follows the row, whoever moved it.
  useEffect(() => {
    const row = track.current;
    if (!row) return;
    const mobile = window.matchMedia(MOBILE);
    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = Array.from(row.children) as HTMLElement[];
      if (!mobile.matches) { cards.forEach(card => { card.style.removeProperty("--focus"); delete card.dataset.front; }); return; }
      const nearest = nearestCard(row);
      cards.forEach((card, i) => {
        const away = Math.min(1, Math.abs(cardLeft(row, card) - row.scrollLeft) / (card.offsetWidth || 1));
        card.style.setProperty("--focus", (1 - away).toFixed(3));
        card.dataset.front = String(i === nearest);
      });
      if (nearest !== front.current) {
        front.current = nearest;
        setIndex(nearest);
        reported.current?.(nearest);
        // A light tick under the finger as a card lands in front (Android; iPhone ignores it).
        if (touching.current) try { navigator.vibrate?.(6); } catch { /* Not available. */ }
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    row.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(row);
    return () => { row.removeEventListener("scroll", onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [track]);

  // Moving on its own, only while someone is looking and not touching it.
  useEffect(() => {
    const row = track.current;
    if (!row || count < 2) return;
    const mobile = window.matchMedia(MOBILE), calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, touchLeft = 0, timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      if (stopped.current || !visible || touching.current || document.hidden || !mobile.matches || calm.matches) { setAuto(current => current.on ? { ...current, on: false } : current); return; }
      setAuto(current => ({ on: true, run: current.run + 1 }));
      timer = window.setTimeout(() => { go((nearestCard(row) + 1) % count); schedule(); }, STEP_MS);
    };
    const stop = () => { stopped.current = true; schedule(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: .6 });
    observer.observe(row);
    // A finger on the row pauses it (it may be scrolling the page); a sideways swipe means they know how: stop.
    const onTouchStart = () => { touching.current = true; touchLeft = row.scrollLeft; schedule(); };
    const onTouchEnd = () => { touching.current = false; if (Math.abs(row.scrollLeft - touchLeft) > 8) stop(); else schedule(); };
    const onWheel = (event: WheelEvent) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stop(); };
    // A card at the back comes to the front; only the one in front opens (capture: before the card's own click).
    const onClick = (event: MouseEvent) => {
      stop();
      const card = (event.target as Element).closest<HTMLElement>("[data-front]");
      if (!card || card.dataset.front === "true") return;
      event.preventDefault(); event.stopPropagation();
      go(Array.from(row.children).indexOf(card));
    };
    row.addEventListener("touchstart", onTouchStart, { passive: true });
    row.addEventListener("touchend", onTouchEnd, { passive: true });
    row.addEventListener("touchcancel", onTouchEnd, { passive: true });
    row.addEventListener("wheel", onWheel, { passive: true });
    row.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", schedule);
    mobile.addEventListener("change", schedule);
    calm.addEventListener("change", schedule);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      row.removeEventListener("touchstart", onTouchStart);
      row.removeEventListener("touchend", onTouchEnd);
      row.removeEventListener("touchcancel", onTouchEnd);
      row.removeEventListener("wheel", onWheel);
      row.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", schedule);
      mobile.removeEventListener("change", schedule);
      calm.removeEventListener("change", schedule);
    };
  }, [track, count, go]);

  const choose = (target: number) => { stopped.current = true; setAuto(current => ({ ...current, on: false })); go(target); };

  return <div className={s.chips} role="group" aria-label="Elige un servicio">
    {labels.map((label, i) => <button key={label} type="button" className={s.chip} data-current={i === index} data-auto={i === index && auto.on} aria-pressed={i === index} onClick={() => choose(i)}>
      {i === index && auto.on && <i key={auto.run} aria-hidden="true" style={{ animationDuration: `${STEP_MS}ms` }} />}
      <span>{label}</span>
    </button>)}
  </div>;
}
