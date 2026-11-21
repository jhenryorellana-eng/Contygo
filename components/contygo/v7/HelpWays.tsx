"use client";

/* «¿Cómo te ayudamos hoy?»: las tres formas de acompañar, justo bajo la portada (brief del dueño, 13-11-2026).
   Servicios (el trámite en la app), la comunidad (ContyGo Club) y la sesión 1 a 1 con Henry.
   20-11-2026: el dueño pidió que un producto se distinga del otro («actualmente no se nota la diferencia») y menos
   texto. Cada producto tiene su color, su ilustración (hecha para esto, en la arcilla de los servicios) y cuatro
   datos: nombre, una frase, un dato y su botón. Verde, los servicios; azul noche, el Club; papel claro, la sesión
   (fue ámbar unas horas: el dueño lo quitó, «no va en el diseño de la marca»).
   De cuatro composiciones eligió las pestañas («me gusta la 4») y pidió que «mientras se hace scroll vaya cambiando
   de producto, o sea, vaya revelándose»: la sección se queda quieta mientras se baja y la hoja del siguiente producto
   sube sobre la anterior, al ritmo del dedo. Las pestañas marcan cuál se ve y, al tocarlas, llevan a ese producto.
   Si la pantalla es muy baja (un celular acostado) no se fija nada: las pestañas cambian el producto al tocarlas.
   Las otras tres composiciones quedaron en un stash («Productos · las cuatro composiciones…»).
   21-11-2026: en una pantalla alta la hoja dejaba un hueco en blanco debajo («podrían llenarlo para que no se vea así
   todo mal creado… sé creativo»). Donde hay alto de sobra, cada hoja asoma lo que hay dentro (.peek), solo con datos
   que ya da la página: los trámites más pedidos con su precio, el programa de la semana del Club (el de su propia
   página) y los tres pasos de la sesión.
   Sin cifras inventadas: los lugares del Club y el precio de la sesión solo salen cuando el dueño los da
   (OWNER_PENDING). El Club es de pago y Henry no es abogado: ni «gratis» ni resultados migratorios. */
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { VISIBLE_SERVICES } from "@/lib/contygo-catalog";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import { OWNER_PENDING } from "@/lib/contygo-route";
import { BlackFridayTag } from "./BlackFriday";
import { useClubDoor } from "./CommunityButton";
import { useHenryDoor } from "./AppointmentButton";
import type { Star } from "./ServiceShowcase";
import page from "./ContygoLanding.module.css";
import w from "./HelpWays.module.css";

type WayId = "servicios" | "club" | "henry";
/* The run: each product takes one step of scroll; the sheet rises during the middle of it and rests at both ends, so
   the button can be tapped. TAIL is the rest after the last one, before the page moves on. */
const REST = .14, TAIL = .3;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const art = (id: WayId) => `/contygo/v8/producto-${id}.webp`;

type Way = {
  id: WayId; name: string; tab: string; claim: string; fact: string; live?: boolean; foot: string;
  href: string; cta: string; link?: object; knob: ReactNode; knobRef?: Ref<HTMLSpanElement>; extra?: ReactNode;
  /** What is inside, for a screen with height to spare. */
  peek: ReactNode;
};
/** The Club's week, as its own page gives it (club.contygo.app, read on 21-11-2026). Henry is there on Mondays and
 *  Thursdays, not every day: the first version lit four days under «Sesiones en vivo con Henry» and the owner had it
 *  taken out («no es todos los días… quita eso para no confundir»). If the Club changes its programme, change it here. */
const CLUB_WEEK = [["Lunes y jueves", "Paso a Paso con Henry"], ["Martes", "Inglés que Abre Puertas"], ["Miércoles", "La Ruta del Inmigrante"]] as const;
const SESSION_STEPS = ["Elige tu hora en su agenda", "Conversa con Henry, uno a uno", "Recibe orientación para tu caso"];

export default function HelpWays({ stars }: { stars: Star[] }) {
  const club = useClubDoor("ayuda"), henry = useHenryDoor("ayuda");
  const { clubSeatsLeft, sessionTerms } = OWNER_PENDING;
  const [active, setActive] = useState(0);
  const prices = useServicePrices();
  // The three most requested services that are on the site, with their live price.
  const top = stars.map(star => ({ star, item: VISIBLE_SERVICES.find(item => item.id === star.id) })).filter(entry => entry.item).slice(0, 3);
  const track = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), probe = useRef<HTMLElement>(null);
  const goTo = useRef<(index: number, smooth?: boolean) => void>(() => {});

  const ways: Way[] = [
    { id: "servicios", name: "Servicios", tab: "Servicios", claim: "Haz tu trámite en la app", fact: `${VISIBLE_SERVICES.length} trámites`, foot: "Paso a paso, desde tu celular",
      href: "#servicios", cta: "Ver servicios", knob: <Arrow />,
      peek: <div className={w.peek} data-peek="servicios"><small>Los más pedidos</small><ul>{top.map(({ star, item }) => { const from = item && fromPriceLabel(prices, item.slug); return <li key={star.id}>
        <span className={w.peekArt} aria-hidden="true"><Image src={`/contygo/v8/servicio-${star.id}.webp`} alt="" width={96} height={96} sizes="56px" /></span>
        <strong>{star.short}</strong>{from && <span>desde <b>{from}</b></span>}
      </li>; })}</ul></div> },
    ...(club.href ? [{ id: "club" as const, name: "ContyGo Club", tab: "Club", claim: "Aprende cada paso en vivo", fact: "Lunes a jueves", live: true,
      foot: `Fundadores: $25 al mes${clubSeatsLeft !== null ? `. Quedan ${clubSeatsLeft} de 100` : ""}`,
      href: club.href, cta: "Unirme al Club", link: club.link, knob: <Plus />, knobRef: club.seat as Ref<HTMLSpanElement>,
      extra: <><BlackFridayTag className={w.offer} />{club.door}</>,
      peek: <div className={w.peek} data-peek="club"><small>La semana en el Club</small>
        <ul>{CLUB_WEEK.map(([days, name]) => <li key={days}><b>{days}</b><span>{name}</span></li>)}</ul>
      </div> }] : []),
    ...(henry.href ? [{ id: "henry" as const, name: "Sesión con Henry", tab: "Sesión", claim: "Una conversación para ti", fact: "Uno a uno",
      foot: `${sessionTerms ? `${sessionTerms}. ` : ""}Orientación, no asesoría legal`,
      href: henry.href, cta: "Agendar sesión", link: henry.link, knob: <Arrow />, knobRef: henry.calendar, extra: henry.door,
      peek: <div className={w.peek} data-peek="henry"><small>Así funciona</small><ol>{SESSION_STEPS.map((step, n) => <li key={step}><b aria-hidden="true">{n + 1}</b><span>{step}</span></li>)}</ol></div> }] : []),
  ];
  const count = ways.length, shown = Math.min(active, count - 1);

  useEffect(() => {
    const trackEl = track.current, pinEl = pin.current, stageEl = stage.current, probeEl = probe.current;
    if (!trackEl || !pinEl || !stageEl || !probeEl || count < 2) return;
    const header = document.querySelector<HTMLElement>("header");
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const cards = Array.from(stageEl.children) as HTMLElement[];
    let pinTop = 0, step = 0, fixed = false, frame = 0, last = -1;

    // Where the section stops. On a wide screen, if the title, the tabs and the sheet fit under the header, the whole
    // of it stays, centred (a little high: the assistant's button sits at the bottom). On a phone the title leaves
    // and the tabs stop right under the header, so the sheet's button ends above the assistant's button.
    const measure = () => {
      fixed = getComputedStyle(pinEl).position === "sticky";
      if (!fixed) { cards.forEach(card => { card.style.removeProperty("--r"); card.style.removeProperty("--c"); }); return; }
      const top = header ? header.offsetHeight : 0, room = probeEl.offsetHeight - top, all = pinEl.offsetHeight;
      const tabs = pinEl.children[1] as HTMLElement | undefined;
      pinTop = Math.round(innerWidth >= 761 && all + 60 <= room ? top + (room - 40 - all) / 2 : top + 10 - (tabs ? tabs.offsetTop : 0));
      pinEl.style.setProperty("--pin-top", `${pinTop}px`);
      step = (trackEl.offsetHeight - all) / (count - 1 + TAIL);
    };
    const paint = () => {
      frame = 0;
      if (!fixed || step <= 0) return;
      if (stageEl.scrollTop) stageEl.scrollTop = 0;
      const p = clamp((pinTop - trackEl.getBoundingClientRect().top) / step, 0, count - 1);
      const risen = cards.map((_, k) => { if (!k) return 1; const t = clamp(p - (k - 1)); if (calm.matches) return t >= .5 ? 1 : 0; const x = clamp((t - REST) / (1 - 2 * REST)); return x * x * (3 - 2 * x); });
      cards.forEach((card, k) => { card.style.setProperty("--r", risen[k].toFixed(4)); card.style.setProperty("--c", (risen[k + 1] ?? 0).toFixed(4)); });
      const now = risen.reduce((top, r, k) => r >= .5 ? k : top, 0);
      if (now !== last) { last = now; setActive(now); }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const layout = () => { measure(); paint(); };
    goTo.current = (index, smooth = true) => {
      if (!fixed) { setActive(index); return; }
      const top = trackEl.getBoundingClientRect().top + scrollY - pinTop + index * step + (index ? 1 : 0);
      scrollTo({ top, behavior: smooth && !calm.matches ? "smooth" : "auto" });
    };
    layout();
    const watch = new ResizeObserver(layout); watch.observe(pinEl); watch.observe(probeEl); if (header) watch.observe(header);
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", layout);
    return () => { watch.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", layout); cancelAnimationFrame(frame); };
  }, [count]);

  return <section className={w.ways} id="ayuda" aria-labelledby="ayuda-titulo" data-anim style={{ "--steps": count - 1 } as CSSProperties}>
    <i ref={probe} className={w.probe} aria-hidden="true" />
    <div ref={track} className={w.track}>
      <div ref={pin} className={w.pin}>
        <div className={w.head} data-reveal data-react="title">
          <span className={page.eyebrow}><i />Tres formas de acompañarte</span>
          <h2 id="ayuda-titulo">¿Cómo te ayudamos <em>hoy?</em></h2>
        </div>

        <div className={w.tabs} role="group" aria-label="Formas de acompañarte">
          {ways.map((way, i) => <button key={way.id} type="button" id={`ayuda-tab-${way.id}`} aria-current={shown === i ? "true" : undefined} aria-controls={`ayuda-${way.id}`} className={w.tab} data-way={way.id} onClick={() => goTo.current(i)}>
            <span className={w.tabArt} aria-hidden="true"><Image src={art(way.id)} alt="" width={640} height={640} sizes="64px" /></span>
            <span className={w.tabLong}>{way.name}</span><span className={w.tabShort}>{way.tab}</span>
          </button>)}
        </div>

        <div ref={stage} className={w.cards} data-way={ways[shown].id}>
          {ways.map((way, i) => <article key={way.id} id={`ayuda-${way.id}`} className={w.card} data-way={way.id} data-on={shown === i ? "" : undefined}
            onFocus={event => { if (shown !== i && event.target.matches(":focus-visible")) goTo.current(i, false); }}>
            <div className={w.cover}>
              <span className={w.pill}>{way.live && <i aria-hidden="true" />}{way.fact}</span>
              <span className={w.art} aria-hidden="true"><Image src={art(way.id)} alt="" width={640} height={640} sizes="(max-width:760px) 62vw, 320px" /></span>
              <h3 className={w.name}>{way.name}</h3>
            </div>
            <div className={w.body}>
              <p className={w.claim}>{way.claim}</p>
              <span className={w.foot}>{way.foot}</span>
              {way.peek}
              <a className={w.go} href={way.href} {...way.link}>
                {way.cta}
                <span ref={way.knobRef} className={w.knob}>{way.knob}</span>
              </a>
            </div>
            {way.extra}
          </article>)}
        </div>
      </div>
      {/* The run: the scroll the three products take while the section stays still. */}
      {count > 1 && <div className={w.run} aria-hidden="true" />}
    </div>
  </section>;
}
