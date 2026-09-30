"use client";

/* Servicios de la V7 · tres conceptos para que el dueño elija (30-09-2026, tras «baja creatividad»):
   · vitrina   — los más solicitados en un escenario: foco de luz, pedestal de papel y laureles.
   · coleccion — bandas de revista: la escultura se sale del marco y un sello gira como un lacre.
   · hilo      — el hilo verde envuelve cada tarjeta como un regalo; el resto cuelga de una guirnalda.
   En los tres, el resto de servicios va directo, sin categorías. Solo transform y opacidad en lo que
   se mueve; los bucles llevan data-loop y se pausan fuera de pantalla (ContygoLanding). */
import Image from "next/image";
import { useId, useRef } from "react";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { getRebuildServiceFilm } from "@/lib/contygo-rebuild-media";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import ThreadRail from "./ThreadRail";
import s from "./ServiceShowcase.module.css";

export type ShowcaseConcept = "vitrina" | "coleccion" | "hilo";
export const SHOWCASE_CONCEPTS: ShowcaseConcept[] = ["vitrina", "coleccion", "hilo"];
export type Star = { id: string; name: string; label: string; copy: string };
type Props = { concept: ShowcaseConcept; stars: Star[]; others: ContygoService[]; open: (item: ContygoService, element: HTMLElement) => void };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const lowest = (service: ContygoService) => Math.min(service.price, ...service.plans.map(plan => plan.price));
const art = (id: string) => `/contygo/v8/servicio-${id}.webp`;
const find = (id: string) => CONTYGO_SERVICES.find(item => item.id === id)!;
const minutes = (id: string) => formatVideoDuration(getRebuildServiceFilm(id).duration);

const StarIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9l-5.38 2.9 1.03-6L3.3 9.6l6-.9Z" fill="currentColor" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Play = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor" /></svg>;
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

/** A seal that turns like a wax stamp: the words run around the edge. */
function Seal() {
  const id = useId().replace(/:/g, "");
  return <span className={s.seal} aria-hidden="true">
    <svg viewBox="0 0 120 120" data-loop><defs><path id={`${id}c`} d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" /></defs>
      <text><textPath href={`#${id}c`} textLength="276" lengthAdjust="spacing">MÁS SOLICITADO · CONTYGO ·</textPath></text></svg>
    <i><StarIcon /></i>
  </span>;
}

/** The green thread tied into a bow on the corner of a card. */
const Bow = () => <svg className={s.bow} viewBox="0 0 120 96" aria-hidden="true">
  <path d="M60 42C44 12 10 12 14 38c3 20 30 18 46 4Z" fill="#25d366" /><path d="M60 42c16-30 50-30 46-4-3 20-30 18-46 4Z" fill="#25d366" />
  <path d="M58 41C47 22 26 21 26 36c0 11 17 11 32 5Z" fill="#1aa352" /><path d="M62 41c11-19 32-20 32-5 0 11-17 11-32 5Z" fill="#1aa352" />
  <path d="M55 46 38 90l10-4 7 9 9-50Z" fill="#1fb85a" /><path d="M65 46l19 43-10-3-7 9-9-50Z" fill="#1aa352" />
  <rect x="51" y="33" width="18" height="17" rx="7" fill="#25d366" /><rect x="54" y="36" width="12" height="11" rx="5" fill="#5fe08f" opacity=".55" />
</svg>;

export default function ServiceShowcase({ concept, stars, others, open }: Props) {
  const row = useRef<HTMLDivElement>(null);
  const label = (item: ContygoService, star = false) => `Conocer ${item.name}${star ? ", uno de los más solicitados" : ""}, desde ${money.format(lowest(item))}`;

  if (concept === "vitrina") return <div className={s.showcase} data-concept="vitrina">
    <div className={s.stage} data-anim>
      <div className={s.stageHead} data-reveal data-react="title">
        <span className={s.stageEyebrow}><Laurel /> Los más solicitados <Laurel flip /></span>
        <h2>Los favoritos<br /><em>de nuestras familias.</em></h2>
        <p>Los tres servicios que más nos piden. Cada uno con su guía en vídeo y su precio a la vista.</p>
      </div>
      <div ref={row} className={s.stageRow}>{stars.map(star => {
        const item = find(star.id);
        return <button key={star.id} type="button" className={s.pedestalCard} data-service={star.id} data-react="card" onClick={e => open(item, e.currentTarget)} aria-label={label(item, true)}>
          <span className={s.spot} aria-hidden="true" />
          <span className={s.float}><span data-loop><Image src={art(star.id)} alt="" fill sizes="(max-width:760px) 70vw, 26vw" /></span></span>
          <span className={s.pedestal} aria-hidden="true" />
          <span className={s.stageCopy}>
            <span className={s.rosette}><StarIcon />Más solicitado</span>
            <strong>{star.name}</strong>
            <span className={s.stageLabel}>{star.label}</span>
            <span className={s.stageFoot}><span className={s.stagePrice}><small>Desde</small>{money.format(lowest(item))}</span><span className={s.stagePlay}><Play />Ver la guía · {minutes(star.id)}</span></span>
          </span>
        </button>;
      })}</div>
      <ThreadRail track={row} labels={stars.map(star => star.name)} />
    </div>
    <div className={s.listHead} data-reveal><h3>Todo nuestro <em>catálogo.</em></h3><span>Precios de honorarios publicados. Las tasas del gobierno van aparte.</span></div>
    <div className={s.shelf}>{others.map(item => <button key={item.id} type="button" className={s.shelfItem} data-family={item.category} data-react="tile" onClick={e => open(item, e.currentTarget)} aria-label={label(item)}>
      <span className={s.shelfArt}><Image src={art(item.id)} alt="" fill sizes="(max-width:760px) 34vw, 12vw" /></span>
      <span className={s.shelfCopy}><strong>{item.name}</strong><span className={s.shelfPrice}><small>desde</small> {money.format(lowest(item))}</span></span>
      <i className={s.go}><Arrow /></i>
    </button>)}</div>
  </div>;

  if (concept === "coleccion") return <div className={s.showcase} data-concept="coleccion">
    <div className={s.collectionHead} data-reveal data-react="title">
      <span className={s.eyebrow}><StarIcon /> La colección más solicitada</span>
      <h2>Los imprescindibles<br /><em>de ContyGo.</em></h2>
      <p>Los servicios que más nos piden, preparados con el cuidado de siempre y con su guía en vídeo.</p>
    </div>
    <div className={s.bands}>{stars.map((star, i) => {
      const item = find(star.id);
      return <button key={star.id} type="button" className={s.band} data-service={star.id} data-tone={star.id} data-react="card" onClick={e => open(item, e.currentTarget)} aria-label={label(item, true)}>
        <span className={s.bandNum} aria-hidden="true">0{i + 1}</span>
        <span className={s.bandArt}><Image src={art(star.id)} alt="" fill sizes="(max-width:760px) 80vw, 40vw" /><Seal /></span>
        <span className={s.bandCopy}>
          <small>{star.label}</small>
          <strong>{star.name}</strong>
          <span className={s.bandText}>{star.copy}</span>
          <span className={s.bandFoot}><span className={s.bandPrice}><small>Desde</small>{money.format(lowest(item))}</span><span className={s.bandGo}><Play />Ver la guía · {minutes(star.id)}</span></span>
        </span>
      </button>;
    })}</div>
    <div className={s.listHead} data-reveal><h3>El resto de <em>la colección.</em></h3><span>Precios de honorarios publicados. Las tasas del gobierno van aparte.</span></div>
    <div className={s.bento}>{others.map(item => <button key={item.id} type="button" className={s.bentoTile} data-family={item.category} data-react="tile" onClick={e => open(item, e.currentTarget)} aria-label={label(item)}>
      <span className={s.bentoArt}><Image src={art(item.id)} alt="" fill sizes="(max-width:760px) 40vw, 22vw" /></span>
      <span className={s.bentoCopy}><strong>{item.name}</strong><span className={s.bentoText}>{item.description}</span><span className={s.bentoPrice}>Desde {money.format(lowest(item))} <Arrow /></span></span>
    </button>)}</div>
  </div>;

  return <div className={s.showcase} data-concept="hilo">
    <div className={s.threadHead} data-reveal data-react="title">
      <span className={s.eyebrow}><StarIcon /> Los más solicitados</span>
      <h2>Los más pedidos,<br /><em>listos para ti.</em></h2>
      <p>Los tres servicios que más familias eligen, envueltos con el mismo hilo que te acompaña en todo el camino.</p>
    </div>
    <div ref={row} className={s.giftRow}>{stars.map(star => {
      const item = find(star.id);
      return <button key={star.id} type="button" className={s.giftCard} data-service={star.id} data-react="card" onClick={e => open(item, e.currentTarget)} aria-label={label(item, true)}>
        {/* The illustration panel is the present: the thread wraps it and ties a bow; the tag hangs from the knot. */}
        <span className={s.giftArt}><Image src={art(star.id)} alt="" fill sizes="(max-width:760px) 80vw, 28vw" />
          <span className={s.ribbon} aria-hidden="true"><i /><i /></span>
          <span className={s.bowWrap} aria-hidden="true"><Bow /><span className={s.giftTag} data-loop><StarIcon />Más solicitado</span></span>
        </span>
        <span className={s.giftCopy}>
          <small>{star.label}</small>
          <strong>{star.name}</strong>
          <span className={s.giftText}>{star.copy}</span>
          <span className={s.giftFoot}><span className={s.giftPrice}><small>Desde</small>{money.format(lowest(item))}</span><span className={s.giftGo}><Play />Ver la guía · {minutes(star.id)}</span></span>
        </span>
      </button>;
    })}</div>
    <ThreadRail track={row} labels={stars.map(star => star.name)} />
    <div className={s.listHead} data-reveal><h3>Más servicios, <em>al alcance de tu mano.</em></h3><span>Precios de honorarios publicados. Las tasas del gobierno van aparte.</span></div>
    <div className={s.garland}>{others.map(item => <button key={item.id} type="button" className={s.hang} data-family={item.category} data-react="tile" onClick={e => open(item, e.currentTarget)} aria-label={label(item)}>
      <span className={s.tag}>
        <span className={s.tagArt}><Image src={art(item.id)} alt="" fill sizes="(max-width:760px) 40vw, 24vw" /></span>
        <strong>{item.name}</strong>
        <span className={s.tagPrice}>Desde {money.format(lowest(item))}</span>
      </span>
    </button>)}</div>
  </div>;
}
