"use client";

/* «Tu expediente, conectado», como un recorrido (21-11-2026). El dueño pidió rediseñarla: «mucho más creativo y
   profesional y claro». El teléfono muestra una cosa a la vez, y la frase que se lee es la de esa cosa: tus documentos
   (uno termina de subir), el recorrido de tu trámite (avanza) y Soporte (te escribe). La parte de la app que se mira
   lleva un aro verde y el resto se aparta (AppPhone, `focus`).

   En el celular (22-11-2026): «que el celular tenga mejores efectos para la versión mobile, debe de verse mucho mejor
   y funcional». Antes era una ventana recortada sobre el teléfono, que cambiaba sola. Ahora el teléfono se ve entero
   y la sección se queda quieta mientras el dedo la recorre (como los tramos y los productos, que el dueño eligió
   así): lo que pasa en pantalla sigue al scroll, sin saltos. Es una cámara: el teléfono, entero y ladeado; al bajar,
   la cámara se acerca a cada parte de la app y pasa de una a otra, y el teléfono se endereza. De tres efectos en la
   página local (cámara, una lupa de cristal que lo recorría y tres ventanas que se pasaban de lado), el dueño eligió
   este: «la cámara me gustó mucho».
   Arriba, tres botones dicen por dónde va y llevan a cada parte; debajo, la frase de esa parte.
   En pantalla ancha no cambia nada: el teléfono a un lado y las tres frases al otro, todas a la vista.
   Las frases son las que la sección ya tenía. La app es una ilustración con datos de ejemplo, y lo dice.
   El hilo verde sigue pasando por detrás del teléfono: data-thread="platform" y "phone" son suyos (GreenThread); en
   el celular su ancla es .anchor, que no se queda quieta con la sección. */
import { useEffect, useRef, useState } from "react";
import AppPhone from "./AppPhone";
import page from "./ContygoLanding.module.css";
import p from "./PlatformTour.module.css";

/* `y`: where that part sits in the phone, as a share of the phone's height (measured; the tallest part is .306 of it). */
const MOMENTS = [
  { focus: "docs", short: "Documentos", title: "Tu información, en un lugar.", text: "Aporta los datos y documentos que tu servicio necesita.", y: .689 },
  { focus: "steps", short: "Recorrido", title: "Sabes qué viene después.", text: "Consulta el recorrido y las indicaciones de tu preparación.", y: .39 },
  { focus: "support", short: "Soporte", title: "Hay alguien del otro lado.", text: "Comunícate con el equipo desde Soporte en tu cuenta.", y: .1 },
] as const;
/* How long each moment stays when it runs by itself (ms): the document needs about two and a half seconds to finish uploading. */
const HOLD = 4800;
/* The phone's height over its width; the share of the scroll spent on the whole phone before the first part; and the
   share of each part's stretch spent travelling to it (the rest, it stays). */
const RATIO = 640 / 300, INTRO = .15, MOVE = .42;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;

export default function PlatformTour() {
  /* `at`: the part being shown; -1 while the phone is still whole (only when the finger drives). */
  const [at, setAt] = useState(0), [auto, setAuto] = useState(true), [seen, setSeen] = useState(false);
  const run = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const driven = useRef(false), now = useRef(0), jump = useRef<(index: number) => void>(() => {}), repaint = useRef(() => {});
  now.current = at;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
    const watch = new IntersectionObserver(entries => setSeen(entries[0].isIntersecting), { threshold: .35 });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  // One moment after another while the section is on screen, until the person picks one (not while the finger drives).
  useEffect(() => {
    if (!auto || !seen || driven.current) return;
    const timer = window.setTimeout(() => { if (!document.hidden && !driven.current) setAt(value => (Math.max(value, 0) + 1) % MOMENTS.length); }, HOLD);
    return () => clearTimeout(timer);
  }, [at, auto, seen]);

  /* The finger drives (a phone): the section stays while the scroll goes through the phone whole and then its three
     parts. One frame per scroll writes where the camera is (--zoom, --fy); the styles do the rest. */
  useEffect(() => {
    const runEl = run.current, pinEl = pin.current, stageEl = stage.current;
    if (!runEl || !pinEl || !stageEl) return;
    const header = document.querySelector<HTMLElement>("header");
    let fixed = false, pinTop = 70, range = 0, width = 0, frame = 0, last = -2;
    const put = (name: string, value: number) => stageEl.style.setProperty(name, value.toFixed(3));

    const paint = () => {
      frame = 0;
      if (!width) return;
      let zoom = 1, fy: number, here = Math.max(now.current, 0);
      if (fixed && range > 0) {
        const done = clamp((pinTop - runEl.getBoundingClientRect().top) / range);
        const along = Math.max(0, (done - INTRO) / (1 - INTRO)) * MOMENTS.length, k = Math.min(MOMENTS.length - 1, Math.floor(along)), moved = ease(clamp((along - k) / MOVE));
        const to = MOMENTS[k], from = k ? MOMENTS[k - 1] : to;
        zoom = done < INTRO ? 0 : k ? 1 : moved;
        fy = mix(from.y, to.y, moved);
        here = done < INTRO || (!k && moved < .3) ? -1 : k && moved < .5 ? k - 1 : k;
        if (here !== last) { last = here; setAt(here); }
      } else fy = MOMENTS[here].y;
      put("--zoom", zoom); put("--fy", fy);
    };
    const measure = () => {
      fixed = getComputedStyle(pinEl).position === "sticky";
      driven.current = fixed;
      pinTop = (header ? header.offsetHeight : 64) + 6;
      pinEl.style.setProperty("--pin-top", `${pinTop}px`);
      range = runEl.offsetHeight - pinEl.offsetHeight;
      // (While it stays still, the foot of the scene is under the assistant's button: nothing that matters goes there.)
      width = stageEl.clientWidth;
      const height = stageEl.clientHeight - (fixed ? 58 : 0);
      // The phone enlarged (what the camera ends on; its tallest part must fit a short scene) and the phone whole (it fits the stage).
      const big = Math.min(width * .92, 420, height * .9 / (.306 * RATIO)), small = Math.min(height * .93 / RATIO, width * .6);
      put("--H", height); put("--big", big); put("--hb", big * RATIO); put("--s0", small / big);
      stageEl.toggleAttribute("data-driven", fixed);
      if (!fixed && now.current < 0) setAt(0);
      last = -2; paint();
    };
    const onScroll = () => { if (fixed && !frame) frame = requestAnimationFrame(paint); };
    repaint.current = paint;
    // A button: with the finger driving, it takes the page to where that part rests.
    jump.current = index => {
      if (!fixed || range <= 0) { setAt(index); setAuto(false); return; }
      const rest = INTRO + (index + MOVE + (1 - MOVE) * .45) / MOMENTS.length * (1 - INTRO);
      window.scrollTo({ top: runEl.getBoundingClientRect().top + window.scrollY - pinTop + rest * range, behavior: "smooth" });
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(stageEl); sizes.observe(runEl);
    addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => { sizes.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); driven.current = false; };
  }, []);
  // Without the finger driving, the part changes by itself or with a button: the camera follows it.
  useEffect(() => { if (!driven.current) repaint.current(); }, [at]);

  const moment = at >= 0 ? MOMENTS[at] : null;
  const running = auto && seen && !driven.current ? "" : undefined;

  return <section className={p.tour} id="plataforma" data-thread="platform" aria-labelledby="plataforma-titulo">
    <div className={p.copy}>
      <span className={page.eyebrow}>Tu expediente, conectado</span>
      <h2 id="plataforma-titulo">La app organiza.<br /><em>El equipo te acompaña.</em></h2>
      <p>La tecnología pone orden. Las personas te ayudan a avanzar. Tu preparación tiene un lugar, desde el primer documento hasta el siguiente paso.</p>
    </div>

    <div ref={run} className={p.run}>
      {/* Where the green thread passes on a phone: it does not stay still with the section. */}
      <span className={p.anchor} data-thread="phone" aria-hidden="true" />
      <div ref={pin} className={p.pin}>
        {/* A phone: the three parts as buttons. They say where it is and take you to each one. */}
        <div className={p.chips} role="group" aria-label="Lo que ves en la app">{MOMENTS.map((item, i) => <button key={item.focus} type="button" className={p.chip} aria-pressed={at === i} data-run={at === i ? running : undefined} onClick={() => jump.current(i)}>
          <b aria-hidden="true">{i + 1}</b>{item.short}<i aria-hidden="true" />
        </button>)}</div>

        {/* The words of the part being shown, right under its button. */}
        <p key={at} className={p.caption} aria-live="polite">{moment
          ? <><strong>{moment.title}</strong><span>{moment.text}</span></>
          : <><strong>Así se ve por dentro.</strong><span>Sigue bajando: la app te lo enseña parte por parte.</span></>}</p>

        <div ref={stage} className={p.stage}>
          <span className={p.aura} aria-hidden="true" />
          <span className={p.floor} aria-hidden="true" />
          <div className={p.holder} data-thread="phone"><div className={p.phone}><AppPhone focus={moment?.focus} /></div></div>
          {/* One glint each time a part arrives. */}
          {at >= 0 && <span key={at} className={p.glint} aria-hidden="true" />}
          <span className={p.note}>Ilustración de tu expediente en ContyGo</span>
        </div>
      </div>
    </div>

    {/* A wide screen: the three, all in view. */}
    <div className={p.rows} role="group" aria-label="Lo que ves en la app">{MOMENTS.map((item, i) => <button key={item.focus} type="button" className={p.row} aria-pressed={at === i} data-run={at === i ? running : undefined} onClick={() => jump.current(i)}>
      <b aria-hidden="true">{i + 1}</b><span><strong>{item.title}</strong><span>{item.text}</span></span><i aria-hidden="true" />
    </button>)}</div>

    <a className={`${page.inlineLink} ${p.link}`} href="#servicios">Conocer mi servicio <Arrow /></a>
  </section>;
}
