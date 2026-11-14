"use client";

/* Servicios de la V7 · «Vitrina» (elegida por el dueño el 30-09-2026 entre tres conceptos).
   Los más solicitados suben a un escenario oscuro: foco de luz, la escultura flotando sobre un
   pedestal de papel y laureles de «favorito». Encima, los de temporada (28-10-2026) en su propia tarjeta cálida,
   con sus fechas; debajo, carpetas con pestaña (12-11-2026), cada una de su color. Desde el 14-11-2026 es el paso 1
   de la ruta (RouteSteps): Trámites migratorios, azul, y Licencia de conducir, arena, que no guarda servicios del
   catálogo sino su propio contenido. En pantalla ancha van lado a lado; en el celular, una bajo la otra, y la pestaña
   de la otra carpeta asoma al lado para saltar a ella. Las tarjetas de servicio (ServiceTile) también las usan los
   demás pasos de la ruta.
   Lo que se mueve solo usa transform; los bucles llevan data-loop y se pausan fuera de pantalla.
   En el celular los favoritos se eligen por su nombre y la tarjeta de delante sigue al dedo (StarCarousel); en
   escritorio, la que tiene el puntero se enciende, su escultura lo mira y las demás se apagan un poco (30-10-2026). */
import Image from "next/image";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { fromPriceLabel, useServicePrices, type PriceMap } from "@/lib/contygo-api/prices-client";
import { getRebuildServiceFilm } from "@/lib/contygo-rebuild-media";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import ThreadRail from "./ThreadRail";
import StarCarousel from "./StarCarousel";
import s from "./ServiceShowcase.module.css";

export type Star = { id: string; name: string; short: string; label: string; copy: string };
/** A group of the catalog, drawn as a folder: its name on the tab (`short` on the other folder's tab, on a phone), a
    line, the folder's colour and the sculptures that head it (file names in public/contygo/v8). */
export type CatalogGroup = {
  id: string; title: string; short: string; note: string; tone: "azul" | "arena"; art: string[]; items: ContygoService[];
  /** A word on the tab instead of the count of services («Nuevo»). */
  badge?: string;
  /** A line under the cards (a legal note). */
  foot?: string;
  /** Its own content instead of service cards: a partner's service, with no guide or contract here. */
  body?: ReactNode;
};
type Open = (item: ContygoService, element: HTMLElement) => void;
/** `warm`: the person reaches for a card (touch, hover, focus) and its window starts loading before the tap ends. */
type Warm = (item: ContygoService) => void;
type Props = { seasonal: ContygoService[]; stars: Star[]; groups: CatalogGroup[]; open: Open; warm: Warm };

const art = (id: string) => `/contygo/v8/servicio-${id}.webp`;
const find = (id: string) => CONTYGO_SERVICES.find(item => item.id === id)!;
const minutes = (id: string) => formatVideoDuration(getRebuildServiceFilm(id).duration);
/** A star without its film yet opens straight on the conversation. */
const hasFilm = (id: string) => Boolean(getRebuildServiceFilm(id).src && getRebuildServiceFilm(id).duration);
const COUNT = ["", "El servicio", "Los dos servicios", "Los tres servicios", "Los cuatro servicios", "Los cinco servicios", "Los seis servicios"];

const StarIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9l-5.38 2.9 1.03-6L3.3 9.6l6-.9Z" fill="currentColor" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Play = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor" /></svg>;
/** A name never breaks inside «DV-2027» or «(I-765)»: a word with a hyphen stays whole. */
const keepWhole = (name: string) => name.split(/(\s+)/).map((part, index) => part.includes("-") ? <span key={index} className={s.whole}>{part}</span> : part);
const Hourglass = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" /></svg>;
const Chevron = ({ up }: { up?: boolean }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>;
const Calendar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>;
/** A laurel branch: the classic mark of «the favourite» (flip it for the other side). */
const Laurel = ({ flip }: { flip?: boolean }) => <svg className={s.laurel} data-flip={flip || undefined} viewBox="0 0 24 44" aria-hidden="true">
  <path d="M17 42C7 34 4 20 11 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  <g fill="currentColor">
    <ellipse cx="8.6" cy="33" rx="2.3" ry="4.8" transform="rotate(-48 8.6 33)" /><ellipse cx="14.6" cy="31" rx="2" ry="4.2" transform="rotate(38 14.6 31)" />
    <ellipse cx="6.4" cy="24" rx="2.2" ry="4.6" transform="rotate(-30 6.4 24)" /><ellipse cx="12.2" cy="21.6" rx="1.9" ry="4" transform="rotate(46 12.2 21.6)" />
    <ellipse cx="6.8" cy="14.6" rx="2" ry="4.2" transform="rotate(-14 6.8 14.6)" /><ellipse cx="12.4" cy="12" rx="1.7" ry="3.6" transform="rotate(52 12.4 12)" />
    <ellipse cx="10" cy="6" rx="1.7" ry="3.4" transform="rotate(8 10 6)" />
  </g>
</svg>;

const reaching = (item: ContygoService, warm: Warm) => ({ onPointerEnter: () => warm(item), onPointerDown: () => warm(item), onFocus: () => warm(item) });
const describe = (item: ContygoService, prices: PriceMap | null, star = false) => { const from = fromPriceLabel(prices, item.slug); return `Conocer ${item.name}${star ? ", uno de los más solicitados" : ""}${item.free ? ", gratis" : from ? `, desde ${from}` : ""}`; };

/** One service as a card: its sculpture, its name and its live price; a tap opens its guide. It lives inside a folder
    or a TileShelf, which carry the styles around it. */
export function ServiceTile({ item, prices, open, warm }: { item: ContygoService; prices: PriceMap | null; open: Open; warm: Warm }) {
  return <button type="button" className={s.shelfItem} data-family={item.category} data-react="tile" onClick={e => open(item, e.currentTarget)} {...reaching(item, warm)} aria-label={describe(item, prices)}>
    <span className={s.shelfArt} data-flight-art><Image src={art(item.id)} alt="" fill sizes="(max-width:760px) 34vw, 12vw" /></span>
    <span className={s.shelfCopy}><strong>{keepWhole(item.name)}</strong>{item.free ? <span className={s.shelfPrice}>Gratis</span> : fromPriceLabel(prices, item.slug) && <span className={s.shelfPrice}><small>desde</small> {fromPriceLabel(prices, item.slug)}</span>}</span>
    <i className={s.go}><Arrow /></i>
  </button>;
}

/** A few service cards on their own, outside a folder (the steps of the route that already have services). */
export function TileShelf({ items, open, warm }: { items: ContygoService[]; open: Open; warm: Warm }) {
  const prices = useServicePrices();
  return <div className={`${s.showcase} ${s.shelf} ${s.loose}`} data-react-root>{items.map(item => <ServiceTile key={item.id} item={item} prices={prices} open={open} warm={warm} />)}</div>;
}

export default function ServiceShowcase({ seasonal, stars, groups, open, warm }: Props) {
  const row = useRef<HTMLDivElement>(null);
  const prices = useServicePrices();
  const reach = (item: ContygoService) => reaching(item, warm);
  const label = (item: ContygoService, star = false) => describe(item, prices, star);

  // The mouse only: the sculpture turns a little toward the pointer (--tilt-x and --tilt-y, from -1 to 1).
  const lean = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--tilt-x", (((event.clientX - box.left) / box.width) * 2 - 1).toFixed(3));
    event.currentTarget.style.setProperty("--tilt-y", (((event.clientY - box.top) / box.height) * 2 - 1).toFixed(3));
  };
  const rest = (event: PointerEvent<HTMLElement>) => { event.currentTarget.style.removeProperty("--tilt-x"); event.currentTarget.style.removeProperty("--tilt-y"); };

  // On a wide screen two folders stand side by side when the first holds more (or the second has its own content):
  // two columns of cards beside one. `even`: both end on the same line. Anything else stacks them.
  const pair = groups.length === 2 && (Boolean(groups[1].body) || groups[0].items.length > groups[1].items.length);
  const even = pair && (Boolean(groups[1].body) || Math.ceil(groups[0].items.length / 2) === groups[1].items.length);
  const count = (n: number) => `${n} ${n === 1 ? "servicio" : "servicios"}`;
  // The page scrolls smoothly on its own (and at once with «reduce motion»); the address does not change.
  const jump = (id: string) => document.getElementById(`catalogo-${id}`)?.scrollIntoView({ block: "start" });

  return <div className={s.showcase}>
    <div className={s.stage} data-anim>
      {seasonal.length > 0 && <div className={s.season} data-reveal>{seasonal.map(item => <button key={item.id} type="button" className={s.seasonCard} data-service={item.id} data-react="card" onClick={e => open(item, e.currentTarget)} {...reach(item)} aria-label={`${label(item)}. De temporada: ${item.season?.dates ?? ""}`}>
        <span className={s.seasonArt} data-flight-art><span data-loop><Image src={art(item.id)} alt="" fill sizes="(max-width:760px) 30vw, 200px" /></span></span>
        <span className={s.seasonCopy}>
          <span className={s.seasonEyebrow}><Hourglass />De temporada</span>
          <strong>{keepWhole(item.name)}</strong>
          {item.season && <span className={s.seasonText}>{item.season.headline}</span>}
          {item.season && <span className={s.seasonDates}><Calendar />{item.season.dates}</span>}
        </span>
        <span className={s.seasonAction}>
          {item.free ? <span className={s.seasonPrice}>Gratis</span> : fromPriceLabel(prices, item.slug) ? <span className={s.seasonPrice}><small>Desde</small> {fromPriceLabel(prices, item.slug)}</span> : <span />}
          <span className={s.seasonGo}>Empezar <Arrow /></span>
        </span>
      </button>)}</div>}
      <div className={s.stageHead} data-reveal data-react="title">
        <span className={s.stageEyebrow}><Laurel /> Los más solicitados <Laurel flip /></span>
        <h4>Los favoritos<br /><em>de nuestras familias.</em></h4>
        <p>{COUNT[stars.length] ?? "Los servicios"} que más nos piden. Cada uno con su guía y su precio a la vista.</p>
      </div>
      <StarCarousel track={row} labels={stars.map(star => star.short)} onFront={index => warm(find(stars[index].id))} />
      <div ref={row} className={s.stageRow} data-count={stars.length}>{stars.map(star => {
        const item = find(star.id);
        return <button key={star.id} type="button" className={s.pedestalCard} data-service={star.id} data-react="card" onClick={e => open(item, e.currentTarget)} onPointerMove={lean} onPointerLeave={rest} {...reach(item)} aria-label={label(item, true)}>
          <span className={s.spot} aria-hidden="true" />
          <span className={s.float} data-flight-art><span data-loop><Image src={art(star.id)} alt="" fill sizes="(max-width:760px) 70vw, 26vw" /></span></span>
          <span className={s.pedestal} aria-hidden="true" />
          <span className={s.stageCopy}>
            <span className={s.rosette}><StarIcon />Más solicitado</span>
            <strong>{star.name}</strong>
            <span className={s.stageLabel}>{star.label}</span>
            <span className={s.stageFoot}>{fromPriceLabel(prices, item.slug) ? <span className={s.stagePrice}><small>Desde</small>{fromPriceLabel(prices, item.slug)}</span> : <span />}<span className={s.stagePlay}><Play />{hasFilm(star.id) ? `Ver la guía · ${minutes(star.id)}` : "Empezar la guía"}</span></span>
          </span>
        </button>;
      })}</div>
      <ThreadRail track={row} labels={stars.map(star => star.name)} />
    </div>
    <div className={s.listHead} data-reveal><h4>Más trámites, <em>y tu licencia.</em></h4><span>Precios de honorarios publicados. Las tasas del gobierno van aparte.</span></div>
    <div className={s.folders} data-react-root data-pair={pair || undefined} data-even={even || undefined}>{groups.map((group, index) => <section key={group.id} id={`catalogo-${group.id}`} className={s.folder} data-tone={group.tone} data-badged={group.badge ? true : undefined} aria-label={group.title}>
      {/* Every folder shows all the tabs in the same order: its own in front, the others peeking behind (a tap goes there). */}
      <div className={s.tabs}>{groups.map((other, position) => other === group
        ? <div key={other.id} className={s.tab}><h5>{other.title}</h5>{other.badge ? <span className={s.tabBadge}>{other.badge}</span> : <span className={s.tabCount} aria-label={count(other.items.length)}>{other.items.length}</span>}</div>
        : <button key={other.id} type="button" className={s.peek} data-tone={other.tone} onClick={() => jump(other.id)} aria-label={`Ir a ${other.title}${other.body ? "" : `, ${count(other.items.length)}`}`}><span className={s.peekShort}>{other.short}</span><span className={s.peekFull}>{other.title}</span><Chevron up={position < index} /></button>)}</div>
      <div className={s.folderBody}>
        <div className={s.folderHead}>
          <span className={s.groupArt} aria-hidden="true">{group.art.map(name => <span key={name}><Image src={`/contygo/v8/${name}.webp`} alt="" fill sizes="60px" /></span>)}</span>
          <span className={s.folderNote}>{group.note}</span>
        </div>
        {group.body ?? <div className={s.shelf}>{group.items.map(item => <ServiceTile key={item.id} item={item} prices={prices} open={open} warm={warm} />)}</div>}
        {group.foot && <p className={s.folderFoot}>{group.foot}</p>}
      </div>
    </section>)}</div>
  </div>;
}
