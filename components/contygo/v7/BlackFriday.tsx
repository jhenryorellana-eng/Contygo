"use client";

/* El anuncio de Black Friday (19-11-2026). El dueño mandó de referencia una etiqueta de neón rojo «BLACK FRIDAY» y pidió
   «nuestro propio cartel». Eligió el letrero de neón de verdad, en el verde del hilo (una foto hecha para esto), frente
   a una etiqueta con la cinta de raso, un cartel con sello y unas cintas de precinto; antes había descartado una etiqueta
   plana en cuatro colores («sé mucho más creativo… pensado más en mobile, más detallista»).
   Cuatro piezas: la franja de arriba, la placa que cuelga en la foto del hero (lo primero que se ve), el cartel grande
   con su cuenta atrás y la etiqueta de cada tarjeta. Fechas y reglas, en lib/black-friday.ts. Pasado el viernes no se
   pinta nada. */
import Image from "next/image";
import { useEffect, useState } from "react";
import { COMMUNITY_URL, via } from "@/lib/config";
import { BLACK_FRIDAY, blackFridayPhase, blackFridayWait, type BlackFridayPhase } from "@/lib/black-friday";
import b from "./BlackFriday.module.css";

const SIGN = { src: "/contygo/v8/black-friday-neon.webp", width: 1200, height: 800 };

/** The server and the first paint always say «antes» (the page may be built days earlier); the real day comes on mount. */
export function useBlackFriday(): BlackFridayPhase {
  const [phase, setPhase] = useState<BlackFridayPhase>("antes");
  useEffect(() => {
    const read = () => setPhase(blackFridayPhase(new Date()));
    read();
    const timer = setInterval(read, 30_000);
    return () => clearInterval(timer);
  }, []);
  return phase;
}

const DAY = 86_400_000;
/** Milliseconds to the start of the Friday (before it) or to its end (on the day); null until the page is in a browser. */
function useCountdown(phase: BlackFridayPhase) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (phase === "fuera") return;
    const target = Date.parse(phase === "hoy" ? BLACK_FRIDAY.endsAt : BLACK_FRIDAY.startsAt);
    const read = () => setLeft(Math.max(0, target - Date.now()));
    read();
    const timer = setInterval(read, 1000);
    return () => clearInterval(timer);
  }, [phase]);
  return left;
}
/** «Faltan 8 días», «Es mañana», «Solo hoy». */
function useWait(phase: BlackFridayPhase) {
  const [text, setText] = useState("");
  useEffect(() => { setText(blackFridayWait(new Date())); }, [phase]);
  return text || `Solo el ${BLACK_FRIDAY.short}`;
}

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;

/** The countdown: days, hours, minutes and seconds to the Friday; on the day, what is left of it. */
function Clock({ phase }: { phase: BlackFridayPhase }) {
  const left = useCountdown(phase);
  const two = (n: number) => String(n).padStart(2, "0");
  const parts = left === null ? null : { días: Math.floor(left / DAY), horas: Math.floor(left / 3_600_000) % 24, min: Math.floor(left / 60_000) % 60, seg: Math.floor(left / 1000) % 60 };
  const cells = (["días", "horas", "min", "seg"] as const).filter(unit => unit !== "días" || phase !== "hoy");
  const label = phase === "hoy" ? "Termina en" : "Empieza en";
  const spoken = parts ? `${label} ${parts.días ? `${parts.días} días, ` : ""}${parts.horas} horas y ${parts.min} minutos` : undefined;
  return <div className={b.clock} role="timer" aria-label={spoken}>
    <span className={b.clockLabel}>{label}</span>
    <span className={b.cells} aria-hidden="true">{cells.map(unit => <span key={unit}><b>{parts ? two(parts[unit]) : "--"}</b><small>{unit}</small></span>)}</span>
  </div>;
}

/** The strip above the header: one line, it leads to the big sign. */
export function BlackFridayStrip() {
  const phase = useBlackFriday();
  if (phase === "fuera") return null;
  const when = phase === "hoy" ? "solo hoy" : `solo el ${BLACK_FRIDAY.short}`;
  return <a className={b.strip} href="#black-friday" aria-label={`Black Friday: ${BLACK_FRIDAY.percent}% en nuestros honorarios, ${when}. Ver la oferta`}>
    <span className={b.stripLine} aria-hidden="true"><b>Black Friday</b><span><strong>{BLACK_FRIDAY.percent}%</strong> {when}</span><Arrow /></span>
  </a>;
}

/** The plaque on the hero's picture: the first thing seen. It hangs from two wires in the picture's top corner and
 *  leads to the sign. */
export function BlackFridayHero({ className }: { /** The hero's story makes it smaller on a phone, so it stays off her face. */ className?: string }) {
  const phase = useBlackFriday(), wait = useWait(phase);
  if (phase === "fuera") return null;
  return <a className={className ? `${b.hero} ${className}` : b.hero} href="#black-friday" aria-label={`Black Friday: ${BLACK_FRIDAY.percent}% de descuento. ${wait}. Ver la oferta`}>
    <span className={b.heroPiece}>
      <span className={b.heroPhoto}><Image src={SIGN.src} alt="" width={SIGN.width} height={SIGN.height} sizes="(max-width:760px) 52vw, 300px" priority /></span>
      <span className={b.heroWait} aria-hidden="true">{wait}</span>
    </span>
  </a>;
}

/** The big sign, under the figures of the hero. */
export function BlackFridayBanner() {
  const phase = useBlackFriday();
  if (phase === "fuera") return null;
  return <section className={b.banner} id="black-friday" aria-labelledby="black-friday-titulo">
    <div className={b.board} data-reveal>
      <div className={b.art}><Image className={b.photo} src={SIGN.src} alt={`Letrero de neón verde: Black Friday, ${BLACK_FRIDAY.percent}%.`} width={SIGN.width} height={SIGN.height} sizes="(max-width:900px) 100vw, 46vw" /></div>
      <div className={b.copy}>
        <p className={b.when}>{phase === "hoy" ? `Solo hoy, ${BLACK_FRIDAY.label}` : `Solo el ${BLACK_FRIDAY.label}`}</p>
        <h2 id="black-friday-titulo">Todos nuestros servicios{COMMUNITY_URL ? " y ContyGo Club" : ""}, a mitad de precio.</h2>
        <Clock phase={phase} />
        <div className={b.actions}>
          <a className={b.go} href="#servicios">Ver servicios <i><Arrow /></i></a>
          {COMMUNITY_URL && <a className={b.link} href={via(COMMUNITY_URL, "blackfriday")}>Ver ContyGo Club</a>}
        </div>
        <p className={b.fine}>El {BLACK_FRIDAY.percent}% es sobre los honorarios de ContyGo. Las tasas del gobierno van aparte.</p>
      </div>
    </div>
  </section>;
}

/** The small tag on each service card and on the Club's. */
export function BlackFridayTag({ className }: { className?: string }) {
  const phase = useBlackFriday();
  if (phase === "fuera") return null;
  // Two layers: the outer one carries the place, the tilt and the glow; the inner one is cut to the tag's shape.
  return <span className={`${b.tag} ${className ?? ""}`}><span><b>−{BLACK_FRIDAY.percent}%</b><i>{phase === "hoy" ? "hoy" : "el viernes"}</i></span></span>;
}
