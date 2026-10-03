"use client";

/* El cierre (V7, 28-09-2026). El hilo verde entra en un escenario marino y se convierte en el
   trazo largo del check de ContyGo; al llegar hay un destello, se abre la luz y se reparten las
   tres guías en vídeo. Cada guía abre directamente su flujo (vídeo → conversación → contrato):
   la página siempre termina en el flujo de un servicio, nunca en un botón que solo sube.
   Fotogramas sacados de las propias guías (public/contygo/films, ffmpeg). */
import Image from "next/image";
import { CONTYGO_SERVICES, type ContygoService } from "@/lib/contygo-catalog";
import { fromPriceLabel, useServicePrices } from "@/lib/contygo-api/prices-client";
import { getRebuildServiceFilm } from "@/lib/contygo-rebuild-media";
import { formatVideoDuration } from "@/lib/contygo-presentation";
import f from "./Finale.module.css";

const GUIDES = [
  { id: "visa-juvenil", name: "Visa Juvenil", label: "El siguiente paso de tu familia" },
  { id: "apelacion", name: "Apelación", label: "Entiende tus siguientes pasos" },
  { id: "reforzar-asilo", name: "Reforzamiento de Asilo", label: "Tu historia, bien organizada" },
];

function Play() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export default function Finale({ onOpen }: { onOpen: (service: ContygoService, element: HTMLElement) => void }) {
  const prices = useServicePrices();
  return <section className={f.finale} id="empezar" aria-labelledby="cierre-titulo" data-anim>
    <div className={f.stage}>
      <span className={f.rays} aria-hidden="true" />
      <span className={f.flash} aria-hidden="true" />
      <div className={f.mark} data-thread="finale"><Image src="/contygo/brand/symbol-dark.png" width={1024} height={1024} alt="" /></div>
      <p className={f.caption}>La curva es tu historia. <b>El check, tu siguiente paso.</b></p>
      <h2 id="cierre-titulo" className={f.title}><span>Que tu siguiente paso</span> <em>se sienta acompañado.</em></h2>
      <p className={f.lead}>Elige tu servicio y mira su guía en vídeo. Con el precio y tu contrato a la vista, decides cuándo empezar.</p>
      <ul className={f.guides}>{GUIDES.map(guide => {
        const service = CONTYGO_SERVICES.find(item => item.id === guide.id);
        if (!service) return null;
        const film = getRebuildServiceFilm(guide.id);
        const from = fromPriceLabel(prices, service.slug);
        return <li key={guide.id}>
          <button type="button" className={f.guide} onClick={event => onOpen(service, event.currentTarget)} aria-label={`Ver la guía en vídeo de ${guide.name}${from ? `, desde ${from}` : ""}`}>
            <Image className={f.poster} src={`/contygo/v7/cierre-${guide.id}.webp`} alt="" fill sizes="(max-width:760px) 92vw, 30vw" />
            <span className={f.shade} aria-hidden="true" />
            <span className={f.tag}><Play /><span className={f.tagLong}>Guía en vídeo · </span>{formatVideoDuration(film.duration)}</span>
            <span className={f.text}><small>{guide.label}</small><strong>{guide.name}</strong>{from && <span>Desde {from}</span>}</span>
            <span className={f.play} data-loop aria-hidden="true"><Play /></span>
          </button>
        </li>;
      })}</ul>
      <a className={f.all} href="#servicios">Ver los {CONTYGO_SERVICES.length} servicios con precio publicado <Arrow /></a>
    </div>
  </section>;
}
