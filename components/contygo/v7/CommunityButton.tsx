"use client";

/* El botón de ContyGo Club en el hero (31-10-2026): la comunidad es otro proyecto, y este botón es la puerta. Dos personas
   y un asiento libre con un «+» que late: el lugar de quien lo mira. Una luz recorre el borde para que se vea junto al
   botón verde sin competir con él: el verde sigue siendo elegir un trámite. Sin caras ni cifras de miembros: nada que
   sugiera una comunidad más grande de lo que es, y ni «gratis» ni resultados migratorios: el Club es de pago y Henry no
   es abogado. Al tocarlo, ese «+» vuela a su silla (ClubDoorway) y se llega al Club en la misma pestaña.
   Sigue siendo un enlace: abrir en otra pestaña, sin JavaScript o con «reducir movimiento» va directo. */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { COMMUNITY_URL } from "@/lib/config";
import ClubDoorway, { Person, type DoorwayOrigin } from "./ClubDoorway";
import s from "./CommunityButton.module.css";

/** Ask the browser to have a page ready, once. */
export function hint(rel: "preconnect" | "prefetch", href: string) {
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel; link.href = href;
  document.head.appendChild(link);
}

export default function CommunityButton() {
  const [origin, setOrigin] = useState<DoorwayOrigin | null>(null);
  const seat = useRef<HTMLElement>(null);

  // The Club opens sooner: the connection from the start, its page as the hand reaches for the button.
  useEffect(() => { if (COMMUNITY_URL) hint("preconnect", new URL(COMMUNITY_URL).origin); }, []);
  const warm = () => { if (COMMUNITY_URL) hint("prefetch", COMMUNITY_URL); };
  // Coming back with «Atrás» restores this page as it was left: the transition must not still be on screen.
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => { if (event.persisted) setOrigin(null); };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  function enter(event: MouseEvent<HTMLAnchorElement>) {
    // Another tab or window is the person's choice, and a calm screen goes straight there.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = seat.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    if (origin) return;
    setOrigin({ x: box.left + box.width / 2, y: box.top + box.height / 2, size: box.width });
  }

  // Without a link (hidden for now, lib/config.ts) there is no button.
  if (!COMMUNITY_URL) return null;
  return <>
    <a className={s.community} href={COMMUNITY_URL} onClick={enter} onPointerEnter={warm} onPointerDown={warm} onFocus={warm}>
      <span className={s.ring} data-loop aria-hidden="true" />
      <span className={s.seats} aria-hidden="true">
        <i><Person /></i>
        <i><Person /></i>
        <i ref={seat} className={s.yours} data-loop><b>+</b></i>
      </span>
      <span className={s.copy}>
        <strong>Únete a ContyGo Club</strong>
        <small>Sesiones en vivo con Henry</small>
      </span>
      <svg className={s.arrow} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <em className={s.tag} aria-hidden="true">Nuevo</em>
    </a>
    {origin && createPortal(<ClubDoorway href={COMMUNITY_URL} origin={origin} />, document.body)}
  </>;
}
