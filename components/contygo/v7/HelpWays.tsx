"use client";

/* «¿Cómo te ayudamos hoy?» (14-11-2026, del brief del dueño «Landing ContyGo: categorías y servicios», 13-11-2026):
   las tres formas de acompañar, justo bajo la portada. Servicios (el trámite en la app), la comunidad (ContyGo Club) y
   la sesión 1 a 1 con Henry. Cada tarjeta lleva la pieza de marca de su producto, no un icono genérico: la plaza de
   papel con los caminos, la mesa del Club con su asiento libre y el calendario cuyo reloj marca el check de ContyGo.
   Al tocar el Club o la sesión, esa misma pieza hace la transición de siempre (ClubDoorway, HenryDoorway).
   Sin cifras inventadas: los lugares que quedan en el Club y el precio de la sesión solo salen cuando el dueño los da
   (OWNER_PENDING). El Club es de pago y Henry no es abogado: ni «gratis» ni resultados migratorios. */
import Image from "next/image";
import type { CSSProperties } from "react";
import { OWNER_PENDING } from "@/lib/contygo-route";
import { useClubDoor } from "./CommunityButton";
import { useHenryDoor } from "./AppointmentButton";
import { Person } from "./ClubDoorway";
import { Dial } from "./HenryDoorway";
import page from "./ContygoLanding.module.css";
import w from "./HelpWays.module.css";

const SEATS = 8, FREE_SEAT = 1;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;

export default function HelpWays() {
  const club = useClubDoor("ayuda"), henry = useHenryDoor("ayuda");
  const { clubSeatsLeft, sessionTerms } = OWNER_PENDING;
  return <section className={w.ways} id="ayuda" aria-labelledby="ayuda-titulo" data-anim>
    <div className={w.head} data-reveal data-react="title">
      <span className={page.eyebrow}><i />Tres formas de acompañarte</span>
      <h2 id="ayuda-titulo">¿Cómo te ayudamos <em>hoy?</em></h2>
    </div>
    <div className={w.cards}>
      <article className={w.card} data-way="servicios" data-reveal data-react="card">
        <span className={w.art} aria-hidden="true"><Image src="/contygo/v8/categoria-todos.webp" alt="" width={512} height={512} sizes="170px" /></span>
        <div className={w.copy}>
          <span className={w.kind}>Servicios</span>
          <h3>Haz tu trámite en la app</h3>
          <p>Prepara y sigue tu proceso desde tu teléfono, paso a paso, con nuestro equipo detrás.</p>
          <span className={w.meta}>Trámites migratorios y licencia de conducir</span>
        </div>
        <a className={w.go} href="#servicios">Ver servicios <i><Arrow /></i></a>
      </article>

      {club.href && <article className={w.card} data-way="club" data-reveal data-react="card">
        <span className={w.art} aria-hidden="true">
          <span className={w.table}>
            <svg className={w.ring} viewBox="0 0 100 100"><circle cx="50" cy="50" r="43.5" /></svg>
            <i className={w.top}><Image src="/contygo/brand/symbol-light.png" alt="" width={1024} height={1024} sizes="40px" /></i>
            {Array.from({ length: SEATS }, (_, i) => <span key={i} className={w.chair} style={{ "--a": `${i * 360 / SEATS}deg` } as CSSProperties}>
              {i === FREE_SEAT ? <i ref={club.seat} className={w.yours} data-loop><b>+</b></i> : <i data-tint={i % 2 ? "mint" : "ivory"}><Person /></i>}
            </span>)}
          </span>
        </span>
        <div className={w.copy}>
          <span className={w.kind}>Comunidad</span>
          <h3>ContyGo Club</h3>
          <p>Aprende cada paso en vivo, de lunes a jueves: migración, inglés para el trabajo y profesionales invitados.</p>
          <span className={w.meta}>Fundadores: $25 al mes{clubSeatsLeft !== null && ` · Quedan ${clubSeatsLeft} de 100`}</span>
        </div>
        <a className={w.go} href={club.href} {...club.link}>Unirme al Club <i><Arrow /></i></a>
        {club.door}
      </article>}

      {henry.href && <article className={w.card} data-way="henry" data-reveal data-react="card">
        <span className={w.art} aria-hidden="true">
          <span ref={henry.calendar} className={w.calendar}>
            <span className={w.band}><i /><i /></span>
            <Dial className={w.dial} />
          </span>
        </span>
        <div className={w.copy}>
          <span className={w.kind}>Sesión con Henry</span>
          <h3>Una conversación para ti</h3>
          <p>Para tu pregunta específica, uno a uno con Henry. Orientación, no asesoría legal.</p>
          <span className={w.meta}>{sessionTerms ?? "Elige tu horario en su agenda"}</span>
        </div>
        <a className={w.go} href={henry.href} {...henry.link}>Agendar sesión <i><Arrow /></i></a>
        {henry.door}
      </article>}
    </div>
  </section>;
}
