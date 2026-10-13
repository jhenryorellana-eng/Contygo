"use client";

/* Celular · los favoritos avanzan solos y tienen flechas (12-10-2026). Muchas personas mayores no saben
   deslizar de lado: sin tocar nada ven pasar los cinco, y las flechas grandes con «2 de 5» dicen que hay más
   y dejan elegir. El avance espera 5 s en cada tarjeta, solo corre con la fila a la vista, se detiene mientras
   el dedo está encima y para del todo cuando la persona desliza, usa las flechas o abre un servicio: nunca
   mueve una tarjeta que alguien está por tocar. Con «reducir movimiento» no avanza solo.
   En escritorio no existe: las filas caben enteras. */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import s from "./StarCarousel.module.css";

const STEP_MS = 5000;
const MOBILE = "(max-width:760px)";

const Chevron = ({ back }: { back?: boolean }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={back ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} /></svg>;

/** Where each card starts inside the row, measured as the row's own scroll position. */
function cardLeft(row: HTMLElement, card: HTMLElement) {
  const inset = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
  return row.scrollLeft + card.getBoundingClientRect().left - row.getBoundingClientRect().left - inset;
}

export default function StarCarousel({ track, count }: { track: RefObject<HTMLElement>; count: number }) {
  const [index, setIndex] = useState(0);
  const stopped = useRef(false);

  const go = useCallback((target: number) => {
    const row = track.current, card = row?.children[target] as HTMLElement | undefined;
    if (!row || !card) return;
    row.scrollTo({ left: cardLeft(row, card), behavior: "smooth" });
  }, [track]);

  // The counter follows the card in front, whoever moved it.
  useEffect(() => {
    const row = track.current;
    if (!row) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = Array.from(row.children) as HTMLElement[];
      let nearest = 0;
      cards.forEach((card, i) => { if (Math.abs(cardLeft(row, card) - row.scrollLeft) < Math.abs(cardLeft(row, cards[nearest]) - row.scrollLeft)) nearest = i; });
      setIndex(nearest);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => { row.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [track]);

  // Moving on its own, only while someone is looking and not touching it.
  useEffect(() => {
    const row = track.current;
    if (!row || count < 2) return;
    const mobile = window.matchMedia(MOBILE), calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, touching = false, touchLeft = 0, timer = 0;
    const current = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      return cards.reduce((best, card, i) => Math.abs(cardLeft(row, card) - row.scrollLeft) < Math.abs(cardLeft(row, cards[best]) - row.scrollLeft) ? i : best, 0);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (stopped.current || !visible || touching || document.hidden || !mobile.matches || calm.matches) return;
      timer = window.setTimeout(() => { go((current() + 1) % count); schedule(); }, STEP_MS);
    };
    const stop = () => { stopped.current = true; window.clearTimeout(timer); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: .6 });
    observer.observe(row);
    // A finger on the row pauses it (it may be scrolling the page); a sideways swipe means they know how: stop.
    const onTouchStart = () => { touching = true; touchLeft = row.scrollLeft; schedule(); };
    const onTouchEnd = () => { touching = false; if (Math.abs(row.scrollLeft - touchLeft) > 8) stop(); else schedule(); };
    const onWheel = (event: WheelEvent) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stop(); };
    row.addEventListener("touchstart", onTouchStart, { passive: true });
    row.addEventListener("touchend", onTouchEnd, { passive: true });
    row.addEventListener("touchcancel", onTouchEnd, { passive: true });
    row.addEventListener("wheel", onWheel, { passive: true });
    row.addEventListener("click", stop);
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
      row.removeEventListener("click", stop);
      document.removeEventListener("visibilitychange", schedule);
      mobile.removeEventListener("change", schedule);
      calm.removeEventListener("change", schedule);
    };
  }, [track, count, go]);

  const step = (delta: number) => { stopped.current = true; go(Math.min(count - 1, Math.max(0, index + delta))); };

  return <div className={s.controls}>
    <button type="button" className={s.arrow} onClick={() => step(-1)} disabled={index === 0} aria-label="Ver el servicio anterior"><Chevron back /></button>
    <span className={s.count}>{index + 1} de {count}</span>
    <button type="button" className={s.arrow} onClick={() => step(1)} disabled={index === count - 1} aria-label="Ver el siguiente servicio"><Chevron /></button>
  </div>;
}
