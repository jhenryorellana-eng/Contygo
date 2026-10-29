"use client";

/* La ruta del servicio (29-10-2026): la primera pantalla de la ventana inmersiva. Ya no se elige entre «primera vez» y
   «ya conozco mi caso»: una sola tarjeta, corta, explica las etapas que la persona va a recorrer (orientación,
   evaluación, propuesta y contrato), unidas por un camino, con una palabra y una línea cada una y el tiempo total, y un
   solo botón la empieza. Quien ya conoce el servicio salta el vídeo con «Ya lo entendí, seguir»; los enlaces con
   ?ruta=rapida (anuncios que ya lo explican) siguen saltando esta pantalla.
   La transición: la línea de la ruta se carga de verde, las etapas suben y se convierten en la línea de avance de arriba
   (JourneyMap), y la tarjeta se pliega en el reproductor del primer vídeo, que empieza en ese mismo marino. El dibujo
   del servicio (que llegó volando desde el catálogo) se funde en el centro, donde el vídeo escribe «contygo». */
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import s from "./ServiceRoute.module.css";

type Props = {
  serviceName: string;
  /** The service's drawing, the head of the card (the touched card's drawing flies here from the catalog). */
  art?: string;
  family?: string;
  /** The first film's length in seconds (0: the service has no film yet) and whether it shows its own captions. */
  filmSeconds: number;
  filmCaptions?: boolean;
  /** The second film plus its invitation, in seconds. */
  processSeconds: number;
  lottery?: boolean;
  onStart: () => void;
};
type Stage = { key: string; title: string; text: string; seconds: number; icon: "film" | "check" | "plan" | "sign" | "route" };

/** Where the first film appears (VisaJuvenilExperience.module.css: --film-width, --film-center). */
function filmRect(captions: boolean) {
  const w = window.innerWidth, h = window.innerHeight, portrait = w <= 700 && h > w;
  const width = portrait ? w : Math.min(w, (h - (captions ? 215 : 60)) * 16 / 9);
  const center = portrait ? h * (captions ? .4 : .5) : captions ? (h - 145) / 2 : h / 2;
  return { left: (w - width) / 2, top: center - width * 9 / 32, width, height: width * 9 / 16 };
}
/** The segments of the journey's line at the top (JourneyMap.module.css). */
function segmentRects(count: number) {
  const probe = document.createElement("i");
  probe.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)";
  document.body.appendChild(probe);
  const safe = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  const vw = window.innerWidth, desk = vw >= 761, width = desk ? Math.min(520, vw) : vw;
  const left = (vw - width) / 2 + 14, segment = (width - 28 - 5 * (count - 1)) / count, top = desk ? 12 : Math.max(7, safe + 4);
  return Array.from({ length: count }, (_, i) => ({ left: left + i * (segment + 5), top, width: segment, height: 4 }));
}
const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

function Icon({ name }: { name: Stage["icon"] }) {
  const paths = {
    film: <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m10.4 9.4 4.2 2.6-4.2 2.6Z" fill="currentColor" stroke="none" /></>,
    check: <><path d="M12 3.5 5 6.4v5.1c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6.4Z" /><path d="m8.8 12.2 2.2 2.2 4.4-4.6" /></>,
    plan: <><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></>,
    sign: <><path d="M4 19.5h16" /><path d="m14.5 5 3.5 3.5L9.5 17H6v-3.5Z" /></>,
    route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function ServiceRoute({ serviceName, art, family, filmSeconds, filmCaptions = false, processSeconds, lottery = false, onStart }: Props) {
  const [leaving, setLeaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLSpanElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const titleId = useId();
  // The title takes the focus (read first by a screen reader) after the window opens, which would give it to the close button.
  useEffect(() => { const timer = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 80); return () => window.clearTimeout(timer); }, []);
  useEffect(() => () => timers.current.forEach(timer => window.clearTimeout(timer)), []);

  // Short on purpose (owner, 29-10-2026): a word for each stage and a few more under it; the whole card fits a phone.
  const stages: Stage[] = [
    ...(filmSeconds ? [{ key: "film", title: "Orientación", text: `Vídeo de ${minutes(filmSeconds)}`, seconds: filmSeconds, icon: "film" as const }] : []),
    { key: "case", title: lottery ? "Elegibilidad" : "Evaluación", text: lottery ? "País, estudios y familia" : "Tu caso, por voz o texto", seconds: 120, icon: "check" },
    lottery
      ? { key: "process", title: "Inscripción", text: "El formulario oficial", seconds: processSeconds, icon: "plan" }
      : { key: "process", title: "Propuesta", text: "Plan, honorarios y pagos", seconds: processSeconds, icon: "plan" },
    lottery
      ? { key: "contract", title: "Tu camino", text: "Gratis o con ContyGo", seconds: 60, icon: "route" }
      : { key: "contract", title: "Contrato", text: "Firma electrónica", seconds: 180, icon: "sign" },
  ];
  const total = Math.round(stages.reduce((sum, stage) => sum + stage.seconds, 0) / 60);
  // The road between the stages: one gentle wave per stretch, from the centre of each stage to the next.
  const road = stages.map((_, i) => (i + .5) * 400 / stages.length).reduce((path, x, i, xs) => i ? `${path} Q ${(xs[i - 1] + x) / 2} ${i % 2 ? 4 : 44} ${x} 24` : `M ${x} 24`, "");

  function start() {
    if (leaving) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sheet = card.current, host = card.current?.closest("dialog") ?? document.body;
    if (reduced || !sheet || typeof sheet.animate !== "function") { onStart(); return; }
    navigator.vibrate?.(8);
    setLeaving(true);
    // 1 · The route charges (CSS, data-leaving): the road fills with green, the stages light up, the words step back.
    // 2 · Within the tap's second the film mounts and starts (iPhone only plays a film with sound that close to a tap),
    //     under a layer that outlives this card: the card folds into the film's frame and the stages rise to become
    //     the journey's line at the top. The layer leaves once the film is in place.
    timers.current.push(window.setTimeout(() => {
      const from = sheet.getBoundingClientRect(), film = filmSeconds ? filmRect(filmCaptions) : null, segments = segmentRects(stages.length);
      const light = sheet.closest("[data-contygo-theme]")?.getAttribute("data-contygo-theme") !== "dark";
      const overlay = document.createElement("div");
      overlay.className = s.layer;
      overlay.setAttribute("aria-hidden", "true");
      host.appendChild(overlay);
      const fold = document.createElement("div");
      fold.className = s.fold;
      Object.assign(fold.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, background: light ? "#ffffff" : "#0d2a55" });
      overlay.appendChild(fold);
      const to = film ?? { left: from.left + from.width * .1, top: from.top + from.height * .1, width: from.width * .8, height: from.height * .8 };
      fold.animate([
        { transform: "none", borderRadius: "32px", background: light ? "#ffffff" : "#0d2a55" },
        { background: "#25D366", offset: .42 },
        { background: "#081A39", offset: .86 },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`, borderRadius: `${light ? 8 : 5}px`, background: "#081A39" },
      ], { duration: 760, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" });
      fold.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 820, easing: "ease-out", fill: "forwards" });
      nodes.current.forEach((node, index) => {
        if (!node) return;
        const box = node.getBoundingClientRect(), target = segments[index];
        const dot = document.createElement("i");
        dot.className = s.flyingNode;
        Object.assign(dot.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
        overlay.appendChild(dot);
        dot.animate([
          { transform: "none", borderRadius: "50%", background: "#25D366" },
          { transform: "translate(0px, -22px) scale(1.06)", offset: .22 },
          { transform: `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(${target.width / box.width}, ${target.height / box.height})`, borderRadius: "40px", background: index === 0 ? "#7be9a6" : light ? "rgba(6,27,61,.14)" : "rgba(246,248,247,.2)" },
        ], { duration: 720, delay: 40 + index * 55, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" });
        dot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 860 + index * 55, fill: "forwards" });
      });
      const artBox = hero.current?.getBoundingClientRect();
      if (artBox && art) {
        const flyer = document.createElement("img");
        flyer.src = art; flyer.alt = ""; flyer.className = s.flyingArt;
        Object.assign(flyer.style, { left: `${artBox.left}px`, top: `${artBox.top}px`, width: `${artBox.width}px`, height: `${artBox.height}px`, padding: `${artBox.width * .1}px` });
        overlay.appendChild(flyer);
        const cx = to.left + to.width / 2 - artBox.width / 2, cy = to.top + to.height / 2 - artBox.height / 2;
        flyer.animate([
          { transform: "none", opacity: 1 },
          { transform: `translate(${cx - artBox.left}px, ${cy - artBox.top}px) scale(.6)`, opacity: .95, offset: .65 },
          { transform: `translate(${cx - artBox.left}px, ${cy - artBox.top}px) scale(.28)`, opacity: 0 },
        ], { duration: 820, easing: "cubic-bezier(.6,0,.25,1)", fill: "forwards" });
      }
      window.setTimeout(() => overlay.remove(), 1300);
      // 3 · The film begins under the fold, in the very frame the card becomes (flushSync: its play() runs in this tap).
      flushSync(onStart);
    }, 340));
  }

  return <section className={s.route} aria-labelledby={titleId} data-leaving={leaving || undefined}>
    <div ref={card} className={s.card}>
      {art ? <span ref={hero} className={s.hero} data-flight-target data-family={family}>
        <img className={s.heroArt} src={art} alt="" draggable={false} />
        <img className={s.heroMark} src="/contygo/brand/symbol-dark.png" alt="" draggable={false} />
      </span> : <img className={s.mark} src="/contygo/brand/symbol-dark.png" alt="" draggable={false} />}
      <p className={s.service}>{serviceName}</p>
      <h2 id={titleId} ref={titleRef} tabIndex={-1} className={s.title}>Tu proceso en {stages.length} pasos</h2>
      <p className={s.lead}>Unos {total} minutos. {lottery ? "Gratis y sin compromiso." : "Firmas solo si estás de acuerdo."}</p>

      <div className={s.trip} style={{ "--count": stages.length } as CSSProperties}>
        <svg className={s.road} viewBox="0 0 400 48" preserveAspectRatio="none" aria-hidden="true">
          <path className={s.roadBase} d={road} vectorEffect="non-scaling-stroke" />
          <path className={s.roadFill} d={road} vectorEffect="non-scaling-stroke" />
        </svg>
        <ol className={s.stages} aria-label={`Tu proceso: ${stages.map(stage => stage.title).join(", ")}`}>
          {stages.map((stage, index) => <li key={stage.key} className={s.stage} style={{ "--i": index } as CSSProperties}>
            <span ref={element => { nodes.current[index] = element; }} className={s.node} data-first={index === 0 || undefined}><Icon name={stage.icon} /></span>
            <strong>{stage.title}</strong>
            <span>{stage.text}</span>
          </li>)}
        </ol>
      </div>

      <button type="button" className={s.cta} data-start-cta onClick={start} disabled={leaving}>
        <span>{leaving ? "Preparando tu proceso…" : lottery ? "Comenzar" : "Comenzar mi evaluación"}</span>
        <i aria-hidden="true"><Arrow /></i>
      </button>
      {filmSeconds > 0 && <p className={s.foot}>¿Ya conoces el servicio? Podrás saltar el vídeo.</p>}
    </div>
  </section>;
}
