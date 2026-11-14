"use client";

/* «Tu ruta, paso a paso» (14-11-2026): la página ya no es solo un catálogo, es la ruta del inmigrante en cinco pasos
   (brief del dueño «Landing ContyGo: categorías y servicios», 13-11-2026; los datos, en lib/contygo-route.ts).
   El hilo verde es la ruta y cada paso es una estación suya: un medallón con su número que el hilo enciende al llegar.
   Verde relleno si el paso ya se puede empezar; punteado, como la ruta que falta, si está por llegar.
   - Paso 1, Migratorio: la vitrina de los favoritos y dos carpetas, Trámites migratorios y Licencia de conducir
     (de un aliado: sin guía ni contrato aquí, «Empezar» escribe al equipo).
   - Pasos 2 a 5: una hoja con lo que ya se puede empezar (tarjetas del catálogo) y lo que viene (etiquetas punteadas).
     Certificaciones es la cara de «Simulador ContyGo» en la landing: lo anuncia sin precio ni promesas, porque nadie
     paga antes de ver los requisitos de su estado.
   Arriba, un itinerario lleva a cada paso: el primero es largo y los demás quedarían lejos.
   «Avísame cuando llegue» escribe por WhatsApp: no guarda nada en ningún sitio. */
import Image from "next/image";
import type { ReactNode } from "react";
import { COMMUNITY_URL, via, waLink } from "@/lib/config";
import { VISIBLE_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { DRIVERS_LICENCE, OWNER_PENDING, ROUTE_SERVICE_IDS, ROUTE_STEPS, stepOpen, stepServices, type RouteStep } from "@/lib/contygo-route";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import ServiceShowcase, { TileShelf, type CatalogGroup, type Star } from "./ServiceShowcase";
import page from "./ContygoLanding.module.css";
import r from "./RouteSteps.module.css";

type Props = { seasonal: ContygoService[]; stars: Star[]; open: (item: ContygoService, element: HTMLElement) => void; warm: (item: ContygoService) => void; children?: ReactNode };

/** The migratory services under the stars, in the owner's order (28-10-2026). One not listed here joins at the end,
 *  so a new one never goes missing. */
const MIGRATORY_ORDER = ["asilo", "cambio-corte", "permiso-de-trabajo", "i-360", "reapertura", "evaluacion-asilo"];
const find = (id: string) => VISIBLE_SERVICES.find(item => item.id === id);
const clubLink = COMMUNITY_URL ? via(COMMUNITY_URL, "ruta") : null;

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6.5 12.5 3.6 3.6 7.4-8.2" /></svg>;
const Bell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21h4" /></svg>;
const Hourglass = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" /></svg>;

const Status = ({ open }: { open: boolean }) => <span className={r.status} data-live={open}>{open ? <i aria-hidden="true" /> : <Hourglass />}{open ? "Disponible" : "Próximamente"}</span>;

/** One step of the route: its medallion (the thread lights it), whether it can be started, its name and its content. */
function Station({ step, index, wide, children }: { step: RouteStep; index: number; wide?: boolean; children: ReactNode }) {
  const open = stepOpen(step);
  return <li id={step.id} className={r.station} data-status={open ? "open" : "soon"} data-wide={wide || undefined}>
    {/* Outside the header: the header unfolds (its own layer) and the medallion has to stay above the thread. */}
    <span className={r.node} data-react="station" aria-hidden="true"><b>{index + 1}</b></span>
    <header className={r.stationHead} data-reveal>
      <div className={r.stationMeta}><Status open={open} /></div>
      <h3><span className={r.sr}>Paso {index + 1}: </span>{step.name}</h3>
      <p>{step.line}</p>
      <span className={r.stationArt} aria-hidden="true"><Image src={`/contygo/v8/${step.art}.webp`} alt="" width={512} height={512} sizes="140px" /></span>
    </header>
    <div className={r.stationBody}>{children}</div>
  </li>;
}

/** Steps 2 to 5: what can be started today (cards from the catalog) and what is coming (dotted tags). */
function Panel({ step, open, warm }: { step: RouteStep; open: Props["open"]; warm: Props["warm"] }) {
  const services = stepServices(step), ready = services.length > 0;
  const ask = waLink(ready ? `Hola, avísame cuando llegue lo nuevo de ${step.name} a ContyGo.` : `Hola, avísame cuando llegue ${step.name} a ContyGo.`);
  return <div className={r.panel} data-reveal>
    {ready && <TileShelf items={services} open={open} warm={warm} />}
    {step.licences && <ul className={r.licences} aria-label="Licencias">{step.licences.map(licence => <li key={licence.name} data-first={licence.first}>{licence.name}{licence.first && <em>Primero en llegar</em>}</li>)}</ul>}
    {step.flow && <ol className={r.flow} aria-label="Cómo funcionará">{step.flow.map((move, i) => <li key={move}><b aria-hidden="true">{i + 1}</b><span>{move}</span></li>)}</ol>}
    {step.freedom && <p className={r.freedom}>{step.freedom}</p>}
    {step.soon.length > 0 && <div className={r.soon}>
      {ready && <span className={r.soonLabel}><Hourglass />Próximamente</span>}
      <ul className={r.chips} aria-label={ready ? "Próximamente" : "Lo que viene"}>{step.soon.map(topic => <li key={topic}>{topic}</li>)}</ul>
    </div>}
    <div className={r.actions}>
      <a className={r.notify} href={ask}>Avísame cuando llegue <i><Bell /></i></a>
      {clubLink && <a className={r.learn} href={clubLink}>Apréndelo en ContyGo Club <Arrow /></a>}
    </div>
  </div>;
}

export default function RouteSteps({ seasonal, stars, open, warm, children }: Props) {
  const prices = useServicePrices();
  const rank = (id: string) => { const at = MIGRATORY_ORDER.indexOf(id); return at < 0 ? MIGRATORY_ORDER.length : at; };
  const migratory = VISIBLE_SERVICES.filter(item => !item.season && !stars.some(star => star.id === item.id) && !ROUTE_SERVICE_IDS.includes(item.id)).sort((a, b) => rank(a.id) - rank(b.id));
  const itin = find("itin"), permit = find("permiso-de-trabajo");
  const permitFrom = permit ? fromPriceLabel(prices, permit.slug) : null;
  const free = OWNER_PENDING.freeWorkPermit;

  const licence = <div className={r.licence}>
    <div className={r.licenceTop}>
      <ul className={r.checks}>{DRIVERS_LICENCE.includes.map(item => <li key={item}><i aria-hidden="true"><Check /></i>{item}</li>)}</ul>
      <span className={r.licenceArt} aria-hidden="true"><Image src="/contygo/v8/servicio-licencia-conducir.webp" alt="" width={512} height={512} sizes="130px" /></span>
    </div>
    <p className={r.fine}>{DRIVERS_LICENCE.note}</p>
    {itin && <button type="button" className={r.itin} onClick={event => open(itin, event.currentTarget)} onPointerEnter={() => warm(itin)} onFocus={() => warm(itin)}>¿Aún no tienes ITIN? <b>Empieza aquí</b></button>}
    <a className={r.start} href={waLink(DRIVERS_LICENCE.message)}>Empezar <i><Arrow /></i></a>
  </div>;

  const groups: CatalogGroup[] = [
    { id: "tramites-migratorios", title: "Trámites migratorios", short: "Trámites", note: "Con USALatino Prime · Consultor de inmigración registrado en Utah", tone: "azul",
      art: ["categoria-asilo", "categoria-corte", "categoria-familia"], items: migratory, foot: "Henry Orellana no es abogado y no puede dar asesoría legal." },
    { id: "licencia-de-conducir", title: DRIVERS_LICENCE.name, short: "Licencia", note: `Con ${DRIVERS_LICENCE.partner}`, tone: "arena",
      art: ["servicio-licencia-conducir"], items: [], badge: "Nuevo", body: licence },
  ];

  return <section className={r.route} id="ruta" aria-labelledby="ruta-titulo" data-thread="services" data-anim>
    <div className={page.sectionHeading} data-reveal data-react="title">
      <div><span className={page.eyebrow}><i />Tu ruta, paso a paso</span><h2 id="ruta-titulo">Cinco pasos para crecer<br /><em>en Estados Unidos.</em></h2></div>
      <p>ContyGo nace para ser la primera aplicación del inmigrante. Hoy empieza por tu proceso migratorio, y cada nueva versión suma un paso.</p>
    </div>

    <nav className={r.map} aria-label="Los cinco pasos" data-reveal>
      <ol>{ROUTE_STEPS.map((step, i) => <li key={step.id}><a href={`#${step.id}`} data-live={stepOpen(step)}>
        <b aria-hidden="true">{i + 1}</b>
        <span><strong>{step.name}</strong><small>{stepOpen(step) ? "Disponible" : "Próximamente"}</small></span>
      </a></li>)}</ol>
    </nav>

    <ol className={r.stations}>{ROUTE_STEPS.map((step, i) => step.id === "servicios"
      ? <Station key={step.id} step={step} index={i} wide>
        <ServiceShowcase seasonal={seasonal} stars={stars} groups={groups} open={open} warm={warm} />
        {/* The owner's banner (brief): «Empieza gratis» only once he says what the free part includes; until then it
            is the paid service, with its live price. */}
        {permit && <button type="button" className={r.banner} data-react="card" onClick={event => open(permit, event.currentTarget)} onPointerEnter={() => warm(permit)} onPointerDown={() => warm(permit)} onFocus={() => warm(permit)}>
          <span className={r.bannerArt} data-flight-art><Image src="/contygo/v8/servicio-permiso-de-trabajo.webp" alt="" fill sizes="100px" /></span>
          <span className={r.bannerCopy}>
            <strong>{free ? "Empieza gratis: tu permiso de trabajo" : "Empieza por tu permiso de trabajo"}</strong>
            <span>{free ?? "Si tu asilo lleva 150 días o más en trámite, prepara tu I-765 desde la app."}</span>
          </span>
          <span className={r.bannerGo}>{free ? "Empezar gratis" : permitFrom ? <>Empezar <small>desde {permitFrom}</small></> : "Empezar"} <i><Arrow /></i></span>
        </button>}
      </Station>
      : <Station key={step.id} step={step} index={i}><Panel step={step} open={open} warm={warm} /></Station>)}</ol>

    <p className={r.note}>En los pasos 2 a 5 te informamos, educamos y preparamos. No vendemos seguros, inversiones, préstamos ni propiedades.</p>
    {children}
  </section>;
}
