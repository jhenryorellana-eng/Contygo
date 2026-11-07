"use client";

/* El paso a la agenda de Henry (07-11-2026): tu hora. Al tocar el botón, desde su calendario se abre una ola verde y
   detrás la noche; el calendario del botón vuela al centro y crece. En su reloj las agujas giran buscando tu hora y se
   detienen a las diez y diez, que es el check de ContyGo. Entonces amanece en blanco y el navegador ya está yendo a la
   agenda, así el cambio de sitio no se nota. Si tarda, en ese blanco aparece la espera de la marca. */
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import BrandLoader from "../rebuild/BrandLoader";
import s from "./HenryDoorway.module.css";

export type DoorwayFrom = { x: number; y: number; width: number; height: number };
const SET_MS = 1250, LEAVE_MS = 1650;

/** A clock whose hands rest at ten past ten: the short one up-left, the long one up-right, ContyGo's check. */
export const Dial = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
  <circle data-part="ring" cx="20" cy="20" r="16.5" pathLength={1} />
  <circle data-part="tick" cx="20" cy="7" r="1.4" /><circle data-part="tick" cx="33" cy="20" r="1.4" />
  <circle data-part="tick" cx="20" cy="33" r="1.4" /><circle data-part="tick" cx="7" cy="20" r="1.4" />
  <path data-hand="hour" d="M20 20V12.5" />
  <path data-hand="minute" d="M20 20V6.5" />
  <circle data-part="pin" cx="20" cy="20" r="2.4" />
</svg>;

export default function HenryDoorway({ href, from }: { href: string; from: DoorwayFrom }) {
  const root = useRef<HTMLDivElement>(null), card = useRef<HTMLDivElement>(null);

  // The button's calendar leaves the button and grows into the card, measured where both really are on this screen.
  useLayoutEffect(() => {
    const box = card.current?.getBoundingClientRect(), stage = root.current;
    if (!box || !stage || !card.current) return;
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const dx = from.x + from.width / 2 - x, dy = from.y + from.height / 2 - y, start = from.width / box.width;
    card.current.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${start})`, offset: 0 },
      { transform: `translate(${dx * .4}px, ${dy * .4 - 24}px) scale(${(start + 1.1) / 2})`, offset: .55 },
      { transform: "none", offset: 1 },
    ], { duration: 760, delay: 90, easing: "cubic-bezier(.5,0,.15,1)", fill: "both" });
    // Both waves need to reach the farthest corner: the night from the button, the dawn from the card.
    const far = (px: number, py: number) => Math.hypot(Math.max(px, window.innerWidth - px), Math.max(py, window.innerHeight - py)) + 2;
    stage.style.setProperty("--far", `${far(from.x + from.width / 2, from.y + from.height / 2)}px`);
    stage.style.setProperty("--dawn-x", `${x}px`);
    stage.style.setProperty("--dawn-y", `${y}px`);
    stage.style.setProperty("--dawn-far", `${far(x, y)}px`);
  }, [from]);

  useEffect(() => {
    const set = window.setTimeout(() => { try { navigator.vibrate?.(10); } catch { /* Not available. */ } }, SET_MS);
    const leave = window.setTimeout(() => window.location.assign(href), LEAVE_MS);
    return () => { window.clearTimeout(set); window.clearTimeout(leave); };
  }, [href]);

  return <div ref={root} className={s.doorway} role="status" aria-live="polite" style={{ "--x": `${from.x + from.width / 2}px`, "--y": `${from.y + from.height / 2}px` } as CSSProperties}>
    <i className={s.wave} aria-hidden="true" />
    <i className={s.night} aria-hidden="true" />
    <div className={s.stage}>
      <div ref={card} className={s.card} aria-hidden="true">
        <span className={s.band}><i /><i /></span>
        <span className={s.face}><Dial className={s.dial} /><i className={s.ripple} /></span>
      </div>
      <p className={s.words}><strong>Tu hora con Henry</strong><span>Abriendo su agenda…</span></p>
    </div>
    <div className={s.dawn} aria-hidden="true"><span className={s.arrival}><BrandLoader label="Abriendo la agenda de Henry" /></span></div>
  </div>;
}
