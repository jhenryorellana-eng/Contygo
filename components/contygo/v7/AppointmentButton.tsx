"use client";

/* «Citas con Henry» en el hero (07-11-2026): la cita 1 a 1 con Henry es otro producto, ni el Club ni un trámite. Un
   calendario pequeño con un reloj que marca las diez y diez, que es también el check de ContyGo. Más claro que los otros
   dos botones: el verde sigue siendo elegir un trámite, y nada se mueve solo (sus agujas giran solo al acercarse).
   Al tocarlo, ese calendario crece hasta el centro y sus agujas buscan tu hora (HenryDoorway); se llega a la agenda en la
   misma pestaña. Sigue siendo un enlace: otra pestaña, sin JavaScript o con «reducir movimiento» va directo. */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { APPOINTMENT_URL } from "@/lib/config";
import { hint } from "./CommunityButton";
import HenryDoorway, { Dial, type DoorwayFrom } from "./HenryDoorway";
import s from "./AppointmentButton.module.css";

export default function AppointmentButton() {
  const [from, setFrom] = useState<DoorwayFrom | null>(null);
  const calendar = useRef<HTMLSpanElement>(null);

  // The agenda opens sooner: the connection from the start, its page as the hand reaches for the button.
  useEffect(() => { if (APPOINTMENT_URL) hint("preconnect", new URL(APPOINTMENT_URL).origin); }, []);
  const warm = () => { if (APPOINTMENT_URL) hint("prefetch", APPOINTMENT_URL); };
  // Coming back with «Atrás» restores this page as it was left: the transition must not still be on screen.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => { if (event.persisted) setFrom(null); };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  function enter(event: MouseEvent<HTMLAnchorElement>) {
    // Another tab or window is the person's choice, and a calm screen goes straight there.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = calendar.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    if (from) return;
    setFrom({ x: box.left, y: box.top, width: box.width, height: box.height });
  }

  // Without a link (lib/config.ts) there is no button.
  if (!APPOINTMENT_URL) return null;
  return <>
    <a className={s.appointment} href={APPOINTMENT_URL} onClick={enter} onPointerEnter={warm} onPointerDown={warm} onFocus={warm}>
      <span ref={calendar} className={s.calendar} aria-hidden="true">
        <span className={s.band}><i /><i /></span>
        <Dial className={s.dial} />
      </span>
      <span className={s.copy}>
        <strong>Citas con Henry</strong>
        <small>Reserva tu espacio 1 a 1</small>
      </span>
      <svg className={s.arrow} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </a>
    {from && createPortal(<HenryDoorway href={APPOINTMENT_URL} from={from} />, document.body)}
  </>;
}
