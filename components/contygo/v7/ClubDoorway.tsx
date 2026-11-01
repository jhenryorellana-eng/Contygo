"use client";

/* El paso a ContyGo Club (31-10-2026): tu lugar en la mesa. Al tocar el botón, desde su asiento libre se abre una ola verde
   y detrás la noche; aparece una mesa redonda, las personas llegan a sus sillas y el hilo verde las une. El «+» del botón
   vuela a la silla que queda libre y se vuelve un visto. Entonces amanece en el marfil del Club (su fondo) y el navegador ya
   está yendo allí, así el cambio de sitio no se nota. Si tarda, en ese marfil aparece la espera de la marca.
   Las personas son siluetas decorativas, no miembros: no sugiere cuánta gente hay. */
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import BrandLoader from "../rebuild/BrandLoader";
import s from "./ClubDoorway.module.css";

export type DoorwayOrigin = { x: number; y: number; size: number };
const SEATS = 8, FREE_SEAT = 4;
const SEATED_MS = 1000, LEAVE_MS = 1450;

export const Person = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4.2" fill="currentColor" /><path d="M4.5 22c.7-5 3.7-7.6 7.5-7.6s6.8 2.6 7.5 7.6Z" fill="currentColor" /></svg>;

export default function ClubDoorway({ href, origin }: { href: string; origin: DoorwayOrigin }) {
  const root = useRef<HTMLDivElement>(null), slot = useRef<HTMLSpanElement>(null), flyer = useRef<HTMLSpanElement>(null), table = useRef<HTMLDivElement>(null);

  // The «+» leaves the button and lands on the free seat, measured where it really is on this screen.
  useLayoutEffect(() => {
    const box = slot.current?.getBoundingClientRect(), size = slot.current?.offsetWidth, seat = flyer.current, center = table.current?.getBoundingClientRect(), stage = root.current;
    if (!box || !size || !seat || !center || !stage) return;
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    Object.assign(seat.style, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px` });
    const dx = origin.x - x, dy = origin.y - y, start = origin.size / size;
    seat.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${start})`, offset: 0 },
      { transform: `translate(${dx * .45 + Math.min(70, window.innerWidth * .14)}px, ${dy * .45 - 30}px) scale(${(start + 1.25) / 2})`, offset: .55 },
      { transform: "none", offset: 1 },
    ], { duration: 780, delay: 110, easing: "cubic-bezier(.5,0,.15,1)", fill: "both" });
    // The dawn opens from the table; both waves need to reach the farthest corner.
    const far = (px: number, py: number) => Math.hypot(Math.max(px, window.innerWidth - px), Math.max(py, window.innerHeight - py)) + 2;
    stage.style.setProperty("--dawn-x", `${center.left + center.width / 2}px`);
    stage.style.setProperty("--dawn-y", `${center.top + center.height / 2}px`);
    stage.style.setProperty("--dawn-far", `${far(center.left + center.width / 2, center.top + center.height / 2)}px`);
    stage.style.setProperty("--far", `${far(origin.x, origin.y)}px`);
  }, [origin]);

  useEffect(() => {
    const seated = window.setTimeout(() => { try { navigator.vibrate?.(10); } catch { /* Not available. */ } }, SEATED_MS);
    const leave = window.setTimeout(() => window.location.assign(href), LEAVE_MS);
    return () => { window.clearTimeout(seated); window.clearTimeout(leave); };
  }, [href]);

  return <div ref={root} className={s.doorway} role="status" aria-live="polite" style={{ "--x": `${origin.x}px`, "--y": `${origin.y}px` } as CSSProperties}>
    <i className={s.wave} aria-hidden="true" />
    <i className={s.night} aria-hidden="true" />
    <div className={s.stage}>
      <div ref={table} className={s.table} aria-hidden="true">
        <i className={s.top}><img src="/contygo/brand/symbol-light.png" alt="" /></i>
        <svg className={s.thread} viewBox="0 0 100 100"><circle cx="50" cy="50" r="41.5" pathLength={1} /></svg>
        {Array.from({ length: SEATS }, (_, i) => <span key={i} className={s.seat} style={{ "--a": `${i * 360 / SEATS}deg`, "--i": i } as CSSProperties}>
          {i === FREE_SEAT ? <span ref={slot} className={s.free} /> : <i className={s.person} data-tint={i % 2 ? "mint" : "ivory"}><Person /></i>}
        </span>)}
      </div>
      <p className={s.words}><strong>Hay un lugar para ti</strong><span>Entrando a ContyGo Club…</span></p>
    </div>
    <span ref={flyer} className={s.flyer} aria-hidden="true">
      <b className={s.plus}>+</b>
      <svg className={s.check} viewBox="0 0 24 24" fill="none"><path d="m6 12.5 4 4 8-9" pathLength={1} stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <i className={s.ripple} />
    </span>
    <div className={s.dawn} aria-hidden="true"><span className={s.arrival}><BrandLoader label="Abriendo ContyGo Club" /></span></div>
  </div>;
}
