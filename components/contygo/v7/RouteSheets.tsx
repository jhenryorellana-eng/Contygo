"use client";

/* La ruta, con el lenguaje de los tramos (21-11-2026). El dueño: la sección «Tu ruta, paso a paso» «no encaja con las
   nuevas estructuras y no se nota lo que tratamos de transmitir… queremos que el usuario entienda lo que es para
   nosotros y luego darle paso a los servicios», y «el resto de servicios como finanzas, certificado, también debe
   tener su diseño como el de migratorio para tener coherencia visual».
   De cuatro presentaciones le gustaron dos cosas: «lo de la ruta del primero, ese detalle» (la línea punteada que va de
   un paso a otro, a un lado y al otro) y la clasificación de los pasos en hojas, y pidió mezclarlas, con más efectos:
   - RouteIntro: un cartel en el azul de la marca con el título, la frase y el mapa de la ruta: las cinco paradas sobre
     la línea punteada, cada una con su escena (el encabezado solo, con pastillas, le pareció «muy simple»).
   - RouteStation: cada paso es una parada de la ruta. El hilo verde dibuja su recuadro al pasar, como siempre (sin él,
     en escritorio «la línea no sigue el camino de los servicios, solo aparece en el costado izquierdo»), y su número
     va sobre ese borde. La línea punteada llega desde el paso anterior cruzando al otro lado: los pasos impares paran
     a la izquierda y los pares a la derecha, y su hoja se compone hacia ese lado.
   - StarterSheet y StepSheet: cada paso es una hoja como las de los tramos: portada de su color con su escena de
     arcilla (ruta-*.webp) y, debajo, sus servicios como boletos (los mismos de ServiceTiers, de cuyo CSS salen la
     portada y las filas). Lo que está por llegar va en boletos en contorno, sin precio ni promesa.
     La hoja del paso 1 llevaba dos boletos, «lo que viene con tu estatus»: el permiso de trabajo (era un banner) y la
     licencia de conducir, de un aliado (era una carpeta). Desde el 23-11-2026, sin la licencia: el permiso y los tres
     servicios más pedidos, los mismos que el asistente ofrece primero. Sueltos al pie del paso, «están separando y estorban»
     (dueño, 21-11-2026); debajo de la hoja siguen los cinco tramos.
   Los efectos son los de Migratorio y van al ritmo del dedo (RouteStation los mide al hacer scroll): --d dibuja la
   línea hasta la parada, --x barre la hoja en diagonal con su filo de luz y asienta la escena, y --o abre los boletos.
   Cada paso toma el color de su lugar en la ruta, los mismos cinco de los tramos: papel claro, verde, azul, azul noche
   y tinta. Los textos son los de lib/contygo-route.ts: aquí no se añade ninguno sobre lo que ContyGo ofrece.
   Las cuatro presentaciones quedaron en un stash («Ruta · las cuatro presentaciones…»). */
import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { COMMUNITY_URL, via, waLink } from "@/lib/config";
import { VISIBLE_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { OWNER_PENDING, ROUTE_STEPS, stepOpen, stepServices, type RouteStep } from "@/lib/contygo-route";
import { LANDING_NEEDS } from "@/lib/agent/landing-chat-ui";
import { TIER_BLURBS } from "@/lib/contygo-tiers";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import { BlackFridayTag } from "./BlackFriday";
import page from "./ContygoLanding.module.css";
import t from "./ServiceTiers.module.css";
import s from "./RouteSheets.module.css";

/** Each step takes the colour of its place on the route: the five colours of the tiers, in their order. */
const TONE: Record<string, string> = { servicios: "autoservicio", finanzas: "medio", certificaciones: "masivos", negocios: "premium", patrimonio: "alto" };
const scene = (id: string) => `/contygo/v8/ruta-${id}.webp`;
const status = (step: RouteStep) => stepOpen(step) ? "Disponible" : "Próximamente";
const clubLink = COMMUNITY_URL ? via(COMMUNITY_URL, "ruta") : null;
const LEAD = "ContyGo nace para ser la primera aplicación del inmigrante. Hoy empieza por tu proceso migratorio, y cada nueva versión suma un paso.";

/* The stops of the map are buttons (they take to their step, below), and nothing said so. The owner, 25-11-2026: «que los
   usuarios sepan que deben presionarlo… hazlo creativo y que se note». So a hand travels the route and taps each stop in
   turn —the stop dips, a ring opens from it, its «Ver» lights up—, and every stop carries that «Ver ↓» at rest. */
const Hand = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 12.6V4.6a1.6 1.6 0 0 1 3.2 0v5.1a1.55 1.55 0 0 1 3.05.3 1.5 1.5 0 0 1 2.9.55 1.5 1.5 0 0 1 2.65 1v4.95a6 6 0 0 1-6 6h-1.7a6 6 0 0 1-4.6-2.15l-4.1-4.9a1.55 1.55 0 0 1 2.3-2.05z" /></svg>;
const Down = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Bell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21h4" /></svg>;
const Hourglass = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" /></svg>;
/** A name never breaks inside «(I-765)»: a word with a hyphen stays whole. */
const keepWhole = (name: string) => name.split(/(\s+)/).map((part, index) => part.includes("-") ? <span key={index} className={t.whole}>{part}</span> : part);

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);

/** The route before its steps: a poster with what it is, in one sentence, and its map: the five stops on the dotted
 *  line, each with its scene, which appear one after another as the poster comes up the screen (--m). */
export function RouteIntro() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current, map = el?.querySelector("ol");
    if (!el || !map) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const paint = () => { frame = 0; el.style.setProperty("--m", (calm.matches ? 1 : clamp((innerHeight * .98 - map.getBoundingClientRect().top) / (innerHeight * .62))).toFixed(4)); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  return <div ref={ref} className={s.poster} data-react="title">
    <div className={s.posterHead}>
      <span className={page.eyebrow}><i />Tu ruta, paso a paso</span>
      <h2 id="ruta-titulo">Cinco pasos para crecer<br /><em>en Estados Unidos.</em></h2>
      <p>{LEAD}</p>
    </div>
    <nav aria-label="Los cinco pasos"><ol className={s.map}>{ROUTE_STEPS.map((step, i) => <li key={step.id} data-tone={TONE[step.id]} style={{ "--n": i } as CSSProperties}><a href={`#${step.id}`}>
      <span className={s.mapArt} aria-hidden="true" data-loop><Image src={scene(step.id)} alt="" width={320} height={320} sizes="120px" /><b>{i + 1}</b><i className={s.mapHand} data-loop><Hand /></i></span>
      <span className={s.mapCopy}><strong>{step.name}</strong><span>{step.line}</span><i className={s.mapFoot}><small data-live={stepOpen(step)}>{status(step)}</small><em className={s.mapGo} data-live={stepOpen(step)} data-loop>Ver <Down /></em></i></span>
    </a></li>)}</ol></nav>
  </div>;
}

/** One stop of the route: its number on the dotted line, which arrives from the stop before across the page, and its
 *  content. It measures, while scrolling, how far the line has been drawn (--d), how far its sheet has arrived (--x)
 *  and how far its tickets have opened (--o). */
export function RouteStation({ step, index, children }: { step: RouteStep; index: number; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    // How far an element has come up the screen: 0 when its top is at `from` (a share of the screen), 1 after `span` more.
    const up = (node: Element | null, from: number, span: number) => node ? clamp((innerHeight * from - node.getBoundingClientRect().top) / (innerHeight * span)) : 1;
    const paint = () => {
      frame = 0;
      const still = calm.matches, set = (name: string, value: number) => el.style.setProperty(name, value.toFixed(4));
      set("--d", still ? 1 : up(el, 1.08, .3));
      set("--x", still ? 1 : ease(up(el.querySelector("[data-sheet]"), .97, .52)));
      set("--o", still ? 1 : ease(up(el.querySelector("[data-unfold]"), .9, .42)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  // data-thread="frame": the green thread draws the step's box as it passes (GreenThread), so the line follows the steps.
  return <li ref={ref} id={step.id} className={s.station} data-thread="frame" data-side={index % 2 ? "right" : "left"} data-tone={TONE[step.id]}>
    {index > 0 && <i className={s.link} aria-hidden="true" />}
    <div className={s.stop}><b aria-hidden="true">{index + 1}</b><span data-live={stepOpen(step)}><span className={s.sr}>Paso {index + 1}: </span>{status(step)}</span></div>
    {children}
  </li>;
}

/** The cover of a step: its place on the route, its name, its line and its scene, on its colour. */
export function StepCover({ step, index }: { step: RouteStep; index: number }) {
  return <div className={`${t.cover} ${s.cover}`}>
    <span className={t.titles}><small>Paso {index + 1} de {ROUTE_STEPS.length}</small><h3 className={t.name}>{step.name}</h3><span>{step.line}</span></span>
    <span className={t.emblem} aria-hidden="true"><Image src={scene(step.id)} alt="" width={640} height={640} sizes="(max-width:760px) 52vw, 320px" /></span>
  </div>;
}

/** The services people ask for most: the assistant's first three, each with its service in the catalog. */
const TOPS = LANDING_NEEDS.filter(need => need.top).flatMap(need => { const item = VISIBLE_SERVICES.find(service => service.id === need.ids[0]); return item ? [{ need, item }] : []; });

const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9l-5.38 2.9 1.03-6L3.3 9.6l6-.9Z" /></svg>;
const StarTag = () => <em className={s.star}><Star />Servicio estrella</em>;

/** Step 1: its cover and the two things that come with the status, as tickets; its tiers follow under the sheet.
 *  - The work permit, where the route starts (the owner's brief: «Empieza gratis» only once he says what the free
 *    part includes; until then it is the paid service, with its live price).
 *  - The three services people ask for most (23-11-2026: the owner took the driver's licence off the page and asked
 *    for «los 3 servicios más vendidos, los mismos que están en el bot» in its place). */
export function StarterSheet({ step, index, permit, itin, open, warm }: { step: RouteStep; index: number; permit?: ContygoService; itin?: ContygoService; open: (item: ContygoService, element: HTMLElement) => void; warm: (item: ContygoService) => void }) {
  const prices = useServicePrices();
  const free = OWNER_PENDING.freeWorkPermit, from = permit ? fromPriceLabel(prices, permit.slug) : null;
  return <div className={t.tiers}>
    <article className={s.sheet} data-sheet data-tier={TONE[step.id]}>
      <StepCover step={step} index={index} />
      <div className={s.body}>
        {/* What opens the list: the owner asked for «los más vendidos, o algo así que llame la atención». */}
        <h3 className={s.best}><i aria-hidden="true"><Star /></i><span><b>Los más vendidos</b><small>Nuestros cuatro servicios estrella</small></span><em>Top 4</em></h3>
        {/* The star services, in the owner's order (24-11-2026): Visa Juvenil, Apelación ante la BIA, Reforzamiento de asilo
            and the work permit. They wear their own ticket — night blue, the price on a green stub, a star — so they
            stand out from every other ticket of the route. The first three are the assistant's too (LANDING_NEEDS). */}
        <div data-unfold data-stars className={`${t.rows} ${s.rows}`} style={{ "--span": TOPS.length * .55 + 1, "--u": "0px" } as CSSProperties}>
          {TOPS.map(({ need, item }, n) => { const price = fromPriceLabel(prices, item.slug); return <button key={item.id} type="button" className={t.row} data-row data-star={n + 1} style={{ "--n": n } as CSSProperties} onClick={event => open(item, event.currentTarget)} onPointerEnter={() => warm(item)} onPointerDown={() => warm(item)} onFocus={() => warm(item)}>
            <span className={`${t.rowArt} ${s.sArt}`} data-flight-art><Image src={`/contygo/v8/${need.art}.webp`} alt="" fill sizes="88px" /></span>
            <strong className={`${t.rowName} ${s.sName}`}><StarTag />{need.label}</strong>
            <span className={`${t.blurb} ${s.sBlurb}`}><b className={s.most}>Más pedido</b> · {need.hint}</span>
            {price && <span className={`${t.price} ${s.sPrice}`}><small>desde</small> {price}</span>}
            <i className={`${t.rowGo} ${s.sGo}`}><Arrow /></i>
            <BlackFridayTag className={t.offer} />
          </button>; })}
          {permit && <button type="button" className={t.row} data-row data-star={TOPS.length + 1} style={{ "--n": TOPS.length } as CSSProperties} onClick={event => open(permit, event.currentTarget)} onPointerEnter={() => warm(permit)} onPointerDown={() => warm(permit)} onFocus={() => warm(permit)}>
            <span className={`${t.rowArt} ${s.sArt}`} data-flight-art><Image src="/contygo/v8/servicio-permiso-de-trabajo.webp" alt="" fill sizes="88px" /></span>
            <strong className={`${t.rowName} ${s.sName}`}><StarTag />{free ? "Permiso de trabajo: empieza gratis" : "Permiso de trabajo"}</strong>
            <span className={`${t.blurb} ${s.sBlurb}`}>{free ?? "Si tu asilo lleva 150 días o más en trámite, prepara tu I-765 desde la app."}</span>
            {free ? <span className={`${t.price} ${s.sPrice}`}>Gratis</span> : from && <span className={`${t.price} ${s.sPrice}`}><small>desde</small> {from}</span>}
            <i className={`${t.rowGo} ${s.sGo}`}><Arrow /></i>
            {!free && <BlackFridayTag className={t.offer} />}
          </button>}
        </div>
        {itin && <p className={s.fine}><button type="button" onClick={event => open(itin, event.currentTarget)} onPointerEnter={() => warm(itin)} onFocus={() => warm(itin)}>¿Aún no tienes ITIN? <b>Empieza aquí</b></button></p>}
      </div>
      <i className={s.edge} aria-hidden="true" />
    </article>
  </div>;
}

/** Steps 2 to 5: the cover and, under it, what can be started today (tickets, as in the tiers) and what is coming. */
export function StepSheet({ step, index, open, warm }: { step: RouteStep; index: number; open: (item: ContygoService, element: HTMLElement) => void; warm: (item: ContygoService) => void }) {
  const prices = useServicePrices();
  const services = stepServices(step), ready = services.length > 0;
  const waiting = [...(step.licences ?? []), ...step.soon.map(name => ({ name, first: undefined }))];
  const ask = waLink(ready ? `Hola, avísame cuando llegue lo nuevo de ${step.name} a ContyGo.` : `Hola, avísame cuando llegue ${step.name} a ContyGo.`);

  return <div className={t.tiers}>
    <article className={s.sheet} data-sheet data-tier={TONE[step.id]}>
      <StepCover step={step} index={index} />
      <div className={s.body}>
        {ready && <div data-unfold className={`${t.rows} ${s.rows}`} style={{ "--span": (services.length - 1) * .55 + 1, "--u": "0px" } as CSSProperties}>
          {services.map((item, n) => { const from = fromPriceLabel(prices, item.slug); return <button key={item.id} type="button" className={t.row} data-row style={{ "--n": n } as CSSProperties} onClick={event => open(item, event.currentTarget)} onPointerEnter={() => warm(item)} onPointerDown={() => warm(item)} onFocus={() => warm(item)} aria-label={`Conocer ${item.name}${item.free ? ", gratis" : from ? `, desde ${from}` : ""}`}>
            <span className={t.rowArt} data-flight-art><Image src={`/contygo/v8/servicio-${item.id}.webp`} alt="" fill sizes="64px" /></span>
            <strong className={t.rowName}>{keepWhole(item.name)}</strong>
            {TIER_BLURBS[item.id] && <span className={t.blurb}>{TIER_BLURBS[item.id]}</span>}
            {item.free ? <span className={t.price}>Gratis</span> : from && <span className={t.price}><small>desde</small> {from}</span>}
            <i className={t.rowGo}><Arrow /></i>
            {!item.free && <BlackFridayTag className={t.offer} />}
          </button>; })}
        </div>}
        {waiting.length > 0 && <ul className={s.waiting} data-unfold={ready ? undefined : ""} style={{ "--span": (waiting.length + (ready ? 1 : 0)) * .4 + 1 } as CSSProperties} aria-label={step.licences ? "Licencias" : ready ? "Próximamente" : "Lo que viene"}>{waiting.map((item, n) => <li key={item.name} data-first={item.first} style={{ "--n": n + (ready ? 1.5 : 0) } as CSSProperties}>
          <i aria-hidden="true"><Hourglass /></i><strong>{item.name}</strong><span>{item.first ? "Primero en llegar" : "Próximamente"}</span>
        </li>)}</ul>}
        {step.flow && <div className={s.flow}><small>Así funcionará</small><ol>{step.flow.map((move, i) => <li key={move} style={{ "--n": i } as CSSProperties}><b aria-hidden="true">{i + 1}</b><span>{move}</span></li>)}</ol></div>}
        {step.freedom && <p className={s.freedom}>{step.freedom}</p>}
        <div className={s.actions}>
          <a className={s.notify} href={ask}>Avísame cuando llegue <i><Bell /></i></a>
          {clubLink && <a className={s.learn} href={clubLink}>Apréndelo en ContyGo Club <Arrow /></a>}
        </div>
      </div>
      {/* The edge of light that leads the step's colour across the sheet, as in the tiers. */}
      <i className={s.edge} aria-hidden="true" />
    </article>
  </div>;
}
