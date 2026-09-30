"use client";

/* Servicios de la V7 · «Vitrina» (elegida por el dueño el 30-09-2026 entre tres conceptos).
   Los tres más solicitados suben a un escenario oscuro: foco de luz, la escultura flotando sobre un
   pedestal de papel y laureles de «favorito». Debajo, todo el catálogo directo, sin categorías: el
   color del fondo de cada dibujo agrupa los trámites sin obligar a elegir.
   Lo que se mueve solo usa transform; los bucles llevan data-loop y se pausan fuera de pantalla. */
import Image from "next/image";
import { useRef } from "react";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { getRebuildServiceFilm } from "@/lib/contygo-rebuild-media";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import ThreadRail from "./ThreadRail";
import s from "./ServiceShowcase.module.css";

export type Star = { id: string; name: string; label: string; copy: string };
type Props = { stars: Star[]; others: ContygoService[]; open: (item: ContygoService, element: HTMLElement) => void };

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

export default function ServiceShowcase({ stars, others, open }: Props) {
  const row = useRef<HTMLDivElement>(null);
  const label = (item: ContygoService, star = false) => `Conocer ${item.name}${star ? ", uno de los más solicitados" : ""}, desde ${money.format(lowest(item))}`;

  return <div className={s.showcase}>
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
}
