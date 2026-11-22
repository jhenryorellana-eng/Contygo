"use client";

/* «Tu expediente, conectado», como un recorrido (21-11-2026). El dueño pidió rediseñarla: «mucho más creativo y
   profesional y claro». Antes era un teléfono quieto junto a una lista de tres frases, sin nada que las uniera.
   Ahora el teléfono muestra una cosa a la vez, y la frase que se lee es la de esa cosa: tus documentos (uno termina de
   subir), el recorrido de tu trámite (avanza) y Soporte (te escribe). La parte de la app que se mira lleva un aro
   verde y el resto se aparta (AppPhone, `focus`). Pasa solo, despacio, mientras la sección está en pantalla; al tocar
   un momento, se queda en él.
   - En un celular: el teléfono entero no cabe junto a su explicación, así que se ve por una ventana (.lens): la app
     ampliada, que se desplaza hasta la parte que toca. Debajo, tres botones con su número y la frase del que está
     encendido: ventana y frase se ven juntas.
   - En pantalla ancha: las tres frases a un lado, todas a la vista; la encendida, en su hoja.
   Las frases son las que la sección ya tenía. La app es una ilustración con datos de ejemplo, y lo dice.
   El hilo verde sigue pasando por detrás del teléfono: data-thread="platform" y "phone" son suyos (GreenThread). */
import { useEffect, useRef, useState } from "react";
import AppPhone from "./AppPhone";
import page from "./ContygoLanding.module.css";
import p from "./PlatformTour.module.css";

const MOMENTS = [
  { focus: "docs", short: "Documentos", title: "Tu información, en un lugar.", text: "Aporta los datos y documentos que tu servicio necesita." },
  { focus: "steps", short: "Recorrido", title: "Sabes qué viene después.", text: "Consulta el recorrido y las indicaciones de tu preparación." },
  { focus: "support", short: "Soporte", title: "Hay alguien del otro lado.", text: "Comunícate con el equipo desde Soporte en tu cuenta." },
] as const;
/* How long each moment stays (ms): the document needs about two and a half seconds to finish uploading. */
const HOLD = 4800;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;

export default function PlatformTour() {
  const [at, setAt] = useState(0), [auto, setAuto] = useState(true), [seen, setSeen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
    const watch = new IntersectionObserver(entries => setSeen(entries[0].isIntersecting), { threshold: .35 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  // One moment after another while the section is on screen, until the person picks one.
  useEffect(() => {
    if (!auto || !seen) return;
    const timer = window.setTimeout(() => { if (!document.hidden) setAt(now => (now + 1) % MOMENTS.length); }, HOLD);
    return () => clearTimeout(timer);
  }, [at, auto, seen]);
  const pick = (index: number) => { setAt(index); setAuto(false); };
  const running = auto && seen ? "" : undefined;

  return <section className={p.tour} id="plataforma" data-thread="platform" aria-labelledby="plataforma-titulo">
    <div className={p.copy}>
      <span className={page.eyebrow}>Tu expediente, conectado</span>
      <h2 id="plataforma-titulo">La app organiza.<br /><em>El equipo te acompaña.</em></h2>
      <p>La tecnología pone orden. Las personas te ayudan a avanzar. Tu preparación tiene un lugar, desde el primer documento hasta el siguiente paso.</p>
    </div>

    <div ref={stage} className={p.stage}>
      <span className={p.aura} aria-hidden="true" />
      {/* The lens: on a phone, a window on the app, enlarged, which travels to the part being shown. */}
      <div className={p.lens} data-thread="phone" data-focus={MOMENTS[at].focus}><div className={p.phone}><AppPhone focus={MOMENTS[at].focus} /></div></div>
      <span className={p.note}>Ilustración de tu expediente en ContyGo</span>
    </div>

    {/* A phone: the three moments as buttons, and the words of the one that is on. */}
    <div className={p.chips} role="group" aria-label="Lo que ves en la app">{MOMENTS.map((moment, i) => <button key={moment.focus} type="button" className={p.chip} aria-pressed={at === i} data-run={at === i ? running : undefined} onClick={() => pick(i)}>
      <b aria-hidden="true">{i + 1}</b>{moment.short}<i aria-hidden="true" />
    </button>)}</div>
    <p key={at} className={p.caption} aria-live="polite"><strong>{MOMENTS[at].title}</strong><span>{MOMENTS[at].text}</span></p>

    {/* A wide screen: the three, all in view. */}
    <div className={p.rows} role="group" aria-label="Lo que ves en la app">{MOMENTS.map((moment, i) => <button key={moment.focus} type="button" className={p.row} aria-pressed={at === i} data-run={at === i ? running : undefined} onClick={() => pick(i)}>
      <b aria-hidden="true">{i + 1}</b><span><strong>{moment.title}</strong><span>{moment.text}</span></span><i aria-hidden="true" />
    </button>)}</div>

    <a className={`${page.inlineLink} ${p.link}`} href="#servicios">Conocer mi servicio <Arrow /></a>
  </section>;
}
