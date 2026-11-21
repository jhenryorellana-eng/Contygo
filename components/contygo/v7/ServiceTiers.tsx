"use client";

/* Los tramos del paso 1 (20-11-2026): los servicios migratorios, segmentados por tipo como pidió el dueño
   (lib/contygo-tiers.ts), «siguiendo el concepto de la ruta»: cinco tramos, del que se resuelve solo al más largo, y
   el color baja con ellos, del papel claro a la tinta. Cada tramo tiene su escena de arcilla (escena-*.webp): personas
   con los mismos objetos que llevan sus servicios, para que se entienda qué ofrece (21-11-2026: «mejora mucho más las
   imágenes… más creativo y mucho más claro en lo que estamos proponiendo como servicios»).
   De cuatro composiciones eligió las paradas («me gusta el 3») y pidió «control de scroll, que cuando [se haga]
   scroll se vaya abriendo cada servicio», con «coherencia y sincronía para que el usuario se sienta cómodo y no
   confundido», y «efectos de transiciones para que se sienta más marcada la clasificación», cuatro para elegir.
   Funciona como los productos (HelpWays): la sección se queda quieta mientras se baja; la barra de paradas marca por
   cuál se va y el tramo siguiente llega al ritmo del dedo, y al llegar se abren sus servicios, uno tras otro. Si un
   tramo tiene más servicios de los que caben, su lista sube bajo la portada, a la misma velocidad del dedo.
   De cuatro efectos para el cambio de tramo eligió el barrido («me gusta la 2»): el color del tramo que llega cruza la
   hoja en diagonal, con un filo de luz delante. Los otros tres (hoja, vía, portada) quedaron en un stash («Tramos con
   scroll · los cuatro efectos…»).
   Si la pantalla es muy baja (un celular acostado) no se fija nada: es la lista de los cinco tramos, abiertos.
   Las otras tres composiciones quedaron en un stash («Tramos · las cuatro composiciones…»).
   Una fila de servicio abre su guía, como las tarjetas de siempre (el vuelo usa data-flight-art). Los servicios que el
   dueño nombró y aún no están en el catálogo no tienen precio ni guía: su fila escribe al equipo. */
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { waLink } from "@/lib/config";
import type { ContygoService } from "@/lib/contygo-catalog";
import { ASK_BLURB, TIER_BLURBS, TIERS, tierServices } from "@/lib/contygo-tiers";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import { BlackFridayTag } from "./BlackFriday";
import t from "./ServiceTiers.module.css";

/* 21-11-2026: with the scenes on the covers the owner felt the services «no resaltan tanto, más resaltan las imágenes».
   Of four designs of the rows he liked two («me gusta el 2 y el 4») and asked for them larger, using the height of the
   screen, and that the person «sepa al menos de qué trata un poco». So each service is a ticket of the route (the 2):
   its price goes on a stub of the tier's colour, past a tear line; under its name, one line says what it is about
   (TIER_BLURBS); and it waits under a slab of the tier's colour, which sweeps off as it opens (the 4), the way the tier
   itself arrives. The other designs are in a stash («Tramos · las cuatro propuestas de filas…»). */
type Props = { open: (item: ContygoService, element: HTMLElement) => void; warm: (item: ContygoService) => void };

/* The run, in screens: the scroll a tier takes to arrive (ARRIVE), how long it then rests so its rows can be tapped
   (REST), the rest after the last one (TAIL), and how far before its place the first tier starts to open (LEAD). */
const ARRIVE = .5, REST = .16, TAIL = .1, LEAD = .42;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = (v: number) => v * v * (3 - 2 * v);
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Chat = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 19.5 6 15.6A7.5 7.5 0 1 1 9 18.4Z" /></svg>;
const img = (name: string) => `/contygo/v8/${name}.webp`;
/** A name never breaks inside «(I-765)»: a word with a hyphen stays whole. */
const keepWhole = (name: string) => name.split(/(\s+)/).map((part, index) => part.includes("-") ? <span key={index} className={t.whole}>{part}</span> : part);
/** The rows open one after another; from the sixth on they come with the fifth (they wait below the fold anyway). */
const order = (n: number) => ({ "--n": Math.min(n, 5) }) as CSSProperties;

export default function ServiceTiers({ open, warm }: Props) {
  const prices = useServicePrices();
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null), pin = useRef<HTMLDivElement>(null), rail = useRef<HTMLElement>(null), stage = useRef<HTMLOListElement>(null), run = useRef<HTMLDivElement>(null), probe = useRef<HTMLElement>(null);
  const goTo = useRef<(index: number, smooth?: boolean, row?: HTMLElement | null) => void>(() => {});

  useEffect(() => {
    const trackEl = track.current, pinEl = pin.current, railEl = rail.current, stageEl = stage.current, runEl = run.current, probeEl = probe.current;
    if (!trackEl || !pinEl || !railEl || !stageEl || !runEl || !probeEl) return;
    const header = document.querySelector<HTMLElement>("header");
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const tiers = Array.from(stageEl.children) as HTMLElement[];
    // Each tier's window (what is seen of its list) and the list itself, which may be taller.
    const panes = tiers.map(el => { const win = el.children[1] as HTMLElement; return { win, rows: win.firstElementChild as HTMLElement }; });
    const vars = ["--x", "--c", "--o", "--u", "--more"];
    let marks: { start: number; arrive: number; over: number }[] = [], pinTop = 0, screen = 0, rest = 0, fixed = false, frame = 0, last = -1;

    // Where the section stops and how long its run is. On a wide screen, if the title, the stops and the sheet fit
    // under the header, the whole of it stays, centred. On a phone the title leaves and the stops stay right under
    // the header. A tier with more rows than fit gets as much extra run as its list has to travel.
    const measure = () => {
      fixed = getComputedStyle(pinEl).position === "sticky";
      if (!fixed) { tiers.forEach(el => vars.forEach(name => el.style.removeProperty(name))); runEl.style.removeProperty("height"); railEl.style.removeProperty("--p"); return; }
      screen = probeEl.offsetHeight;
      const top = header ? header.offsetHeight : 0, room = screen - top, all = pinEl.offsetHeight;
      pinTop = Math.round(innerWidth >= 1000 && all + 50 <= room ? top + (room - 30 - all) / 2 : top + 10 - railEl.offsetTop);
      pinEl.style.setProperty("--pin-top", `${pinTop}px`);
      rest = REST * screen;
      let at = 0;
      marks = panes.map(({ win, rows }, k) => {
        const over = Math.max(0, rows.offsetHeight - win.clientHeight), arrive = k ? ARRIVE * screen : 0, start = at;
        at += arrive + rest + (over ? over + rest * .5 : 0);
        return { start, arrive, over };
      });
      runEl.style.height = `${Math.round(at + TAIL * screen)}px`;
    };
    const paint = () => {
      frame = 0;
      if (!fixed || !marks.length) return;
      const s = pinTop - trackEl.getBoundingClientRect().top;
      // x: how far the tier has arrived; o: how far its rows have opened (the first one opens as the section comes up).
      const state = marks.map((m, k) => {
        const p = k ? clamp((s - m.start) / m.arrive) : clamp(1 + s / (screen * LEAD));
        if (calm.matches) return { x: !k || p >= .5 ? 1 : 0, o: 1 };
        return { x: k ? ease(clamp((p - .04) / .58)) : 1, o: ease(clamp((p - .5) / .46)) };
      });
      tiers.forEach((el, k) => {
        const m = marks[k], u = clamp(s - m.start - m.arrive - rest, 0, m.over), set = (name: string, value: string) => el.style.setProperty(name, value);
        set("--x", state[k].x.toFixed(4)); set("--c", (state[k + 1]?.x ?? 0).toFixed(4)); set("--o", state[k].o.toFixed(4));
        set("--u", `${u.toFixed(1)}px`); set("--more", clamp((m.over - u) / 30).toFixed(3));
      });
      railEl.style.setProperty("--p", (state.slice(1).reduce((sum, v) => sum + v.x, 0) / Math.max(1, tiers.length - 1)).toFixed(4));
      const now = state.reduce((top, v, k) => v.x >= .5 ? k : top, 0);
      if (now !== last) { last = now; setActive(now); }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const layout = () => { measure(); paint(); };
    // A tap on a stop goes to its tier; the keyboard's focus on a row goes to where that row is seen.
    goTo.current = (index, smooth = true, row) => {
      const el = tiers[index], behavior = smooth && !calm.matches ? "smooth" as const : "auto" as const;
      if (!el) return;
      if (!fixed) { if (!row) scrollTo({ top: el.getBoundingClientRect().top + scrollY - (header ? header.offsetHeight : 0) - 14, behavior }); return; }
      const m = marks[index], base = trackEl.getBoundingClientRect().top + scrollY - pinTop + m.start + m.arrive;
      let extra = index ? 1 : 0;
      if (row) {
        const need = Math.min(m.over, Math.max(0, row.offsetTop + row.offsetHeight + 10 - panes[index].win.clientHeight));
        const u = clamp(scrollY - base - rest, 0, m.over);
        if (last === index && u >= need && u <= row.offsetTop) return;
        if (need) extra = rest + need;
      }
      scrollTo({ top: base + extra, behavior });
    };
    layout();
    const watch = new ResizeObserver(layout); watch.observe(pinEl); watch.observe(probeEl); if (header) watch.observe(header); panes.forEach(pane => watch.observe(pane.rows));
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", layout);
    return () => { watch.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", layout); cancelAnimationFrame(frame); };
  }, []);

  return <div className={t.tiers}>
    <i ref={probe} className={t.probe} aria-hidden="true" />
    <div ref={track} className={t.track}>
      <div ref={pin} className={t.pin}>
        <div className={t.head}>
          <h4>Elige tu tramo <em>de la ruta.</em></h4>
          <p>Cinco tipos de servicio, del que resuelves tú al más largo.</p>
        </div>

        <nav ref={rail} className={t.rail} aria-label="Los cinco tramos">
          <ol>{TIERS.map((tier, i) => <li key={tier.id}><button type="button" data-tier={tier.id} data-on={active === i ? "" : undefined} data-past={i < active ? "" : undefined} aria-current={active === i ? "true" : undefined} aria-label={`Tramo ${i + 1}: ${tier.name}`} onClick={() => goTo.current(i)}>
            <b aria-hidden="true">{i + 1}</b><span aria-hidden="true">{tier.short}</span>
          </button></li>)}</ol>
          <i className={t.gauge} aria-hidden="true" />
        </nav>

        <ol ref={stage} className={t.stage} data-tier={TIERS[active].id}>{TIERS.map((tier, i) => {
          const services = tierServices(tier), total = services.length + tier.ask.length;
          return <li key={tier.id} id={`tramo-${tier.id}`} className={t.tier} data-tier={tier.id} data-on={active === i ? "" : undefined}
            onFocus={event => { if (event.target.matches(":focus-visible")) goTo.current(i, false, (event.target as HTMLElement).closest<HTMLElement>("[data-row]")); }}>
            <div className={t.cover}>
              <span className={t.titles}><small>Tramo {i + 1} de {TIERS.length}</small><h5 className={t.name}>{tier.name}</h5><span>{tier.line}</span></span>
              <span className={t.emblem} aria-hidden="true"><Image src={img(`escena-${tier.id}`)} alt="" width={640} height={640} sizes="(max-width:760px) 52vw, 290px" /></span>
            </div>
            <div className={t.window} style={{ "--count": total, "--lines2": Math.ceil(total / 2) } as CSSProperties}>
              <div id={`tramo-${tier.id}-servicios`} className={t.rows} style={{ "--span": (Math.min(total, 6) - 1) * .55 + 1 } as CSSProperties}>
                {services.map((item, n) => { const from = fromPriceLabel(prices, item.slug); return <button key={item.id} type="button" className={t.row} data-row style={order(n)} onClick={event => open(item, event.currentTarget)} onPointerEnter={() => warm(item)} onPointerDown={() => warm(item)} onFocus={() => warm(item)} aria-label={`Conocer ${item.name}${item.free ? ", gratis" : from ? `, desde ${from}` : ""}`}>
                  <span className={t.rowArt} data-flight-art><Image src={img(`servicio-${item.id}`)} alt="" fill sizes="64px" /></span>
                  <strong className={t.rowName}>{keepWhole(item.name)}</strong>
                  {TIER_BLURBS[item.id] && <span className={t.blurb}>{TIER_BLURBS[item.id]}</span>}
                  {item.free ? <span className={t.price}>Gratis</span> : from && <span className={t.price}><small>desde</small> {from}</span>}
                  <i className={t.rowGo}><Arrow /></i>
                  {!item.free && <BlackFridayTag className={t.offer} />}
                </button>; })}
                {tier.ask.map((item, n) => <a key={item.name} className={t.row} data-row data-ask style={order(services.length + n)} href={waLink(item.message)} aria-label={`Preguntar por ${item.name}`}>
                  <span className={t.rowArt}><Image src={img(item.art)} alt="" fill sizes="64px" /></span>
                  <strong className={t.rowName}>{item.name}</strong>
                  <span className={t.blurb}>{ASK_BLURB}</span>
                  <span className={t.price}><small>Escríbenos</small></span>
                  <i className={t.rowGo}><Chat /></i>
                </a>)}
              </div>
            </div>
            {/* The edge of light that leads the tier's colour across the sheet. */}
            <i className={t.edge} aria-hidden="true" />
          </li>;
        })}</ol>
      </div>
      {/* The run: the scroll the five tiers take while the section stays still (its height is set on measuring). */}
      <div ref={run} className={t.run} aria-hidden="true" />
    </div>

    <p className={t.foot}>Con USALatino Prime · Consultor de inmigración registrado en Utah. Precios de honorarios publicados; las tasas del gobierno van aparte. Henry Orellana no es abogado y no puede dar asesoría legal.</p>
  </div>;
}
