"use client";

/* Celular · el hilo verde se abre en un riel bajo una fila deslizable (servicios destacados y
   categorías). La cuenta del riel es el indicador de posición: avanza mientras deslizas y cada
   nudo lleva a su tarjeta. Cuando llega el hilo (data-react="rail", GreenThread), el riel crece
   desde el margen y la cuenta se adelanta y vuelve: «hay más por aquí». En escritorio no existe:
   las filas caben enteras.
   Rendimiento: el deslizamiento solo mueve la cuenta y escala el tramo verde (transform). */
import { useEffect, useRef, type RefObject } from "react";
import r from "./ThreadRail.module.css";

export default function ThreadRail({ track, labels }: { track: RefObject<HTMLElement>; labels?: string[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const bead = useRef<HTMLSpanElement>(null);
  const knots = useRef<(HTMLButtonElement | null)[]>([]);
  const count = labels?.length ?? 0;

  useEffect(() => {
    const row = track.current, el = rail.current;
    if (!row || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const width = el.clientWidth, start = 22, run = Math.max(0, width - start - 12);
      const max = row.scrollWidth - row.clientWidth;
      const p = max > 4 ? Math.min(1, Math.max(0, row.scrollLeft / max)) : 0;
      const x = start + p * run;
      if (bead.current) bead.current.style.transform = `translateX(${x.toFixed(1)}px)`;
      if (fill.current) fill.current.style.transform = `scaleX(${width ? (x / width).toFixed(4) : 0})`;
      knots.current.forEach((knot, i) => {
        if (!knot) return;
        knot.style.left = `${start + (count > 1 ? i / (count - 1) : 0) * run}px`;
        knot.dataset.on = String(p >= (count > 1 ? i / (count - 1) : 0) - .02);
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    row.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(row); observer.observe(el);
    return () => { row.removeEventListener("scroll", onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [track, count]);

  function go(index: number) {
    const row = track.current, item = row?.children[index] as HTMLElement | undefined;
    if (!row || !item) return;
    const inset = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0;
    row.scrollTo({ left: item.offsetLeft - row.offsetLeft - inset, behavior: "smooth" });
  }

  return <div ref={rail} className={r.rail} data-react="rail" aria-hidden="true">
    <span className={r.line}><span className={r.track} /><span ref={fill} className={r.fill} /></span>
    {labels?.map((label, i) => <button key={label} ref={node => { knots.current[i] = node; }} type="button" tabIndex={-1} className={r.knot} onClick={() => go(i)} title={label} />)}
    <span ref={bead} className={r.bead}><span data-bead className={r.beadDot} /></span>
  </div>;
}
