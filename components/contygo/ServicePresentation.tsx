"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ContygoService } from "@/lib/contygo-catalog";
import { getContygoServiceUrl } from "@/lib/contygo";
import { waLink } from "@/lib/config";
import { getServicePresentation } from "@/lib/contygo-presentation";
import s from "./ServicePresentation.module.css";

function Arrow() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Play() { return <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m12 7 14 9-14 9V7Z" fill="currentColor" /></svg>; }
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ServicePresentation({ service }: { service: ContygoService }) {
  const presentation = getServicePresentation(service.id);
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  async function play() {
    try { await video.current?.play(); } catch { setStarted(true); }
  }
  return <div className={s.page}>
    <header className={s.header}><Link href="/" className={s.brand} aria-label="ContyGo, inicio"><svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M47 58C44 70 40 77 30 77M31 41 47 60 74 23" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" /></svg>ContyGo</Link><Link href="/#servicios" className={s.backLink}>Cambiar de servicio <Arrow /></Link></header>
    <main>
      <ol className={s.journey} aria-label="Tu recorrido de contratación"><li className={s.completeStep}><span>01</span> Elige tu servicio</li><li className={s.currentStep} aria-current="step"><span>02</span> Conoce el servicio</li><li><span>03</span> Crea tu contrato</li></ol>
      <div className={s.introduction}><span className={s.eyebrow}>TU SERVICIO, PASO A PASO</span><h1>{service.name}</h1><p>{service.description}</p></div>
      <div className={s.layout}>
        <section className={s.videoColumn} aria-label="Presentación del servicio">
          <div className={s.player}>
            {presentation && !failed ? <>
              <video ref={video} className={s.video} src={presentation.src} poster={presentation.poster} controls={started} playsInline preload="none" aria-label={`Video de presentación: ${service.name}`} onPlay={() => { setStarted(true); setFinished(false); }} onEnded={() => setFinished(true)} onError={() => setFailed(true)} />
              {!started && <div className={s.videoCover}><span>CONTYGO TE ACOMPAÑA</span><button type="button" className={s.playButton} onClick={play}><Play /><span>Ver la presentación</span></button><p>Conoce el servicio antes de dar el siguiente paso.</p></div>}
            </> : <div className={s.fallback}><span className={s.eyebrow}>CONOCE TU SERVICIO</span><h2>Tu siguiente paso,<br />con claridad.</h2><p>{presentation ? "No pudimos cargar el video. Puedes revisar aquí el alcance del servicio y continuar con tu contrato." : "La presentación en video de este servicio todavía no está disponible. Aquí puedes revisar qué incluye y continuar con tu contrato."}</p>{presentation && <button type="button" onClick={() => { setFailed(false); setStarted(false); setFinished(false); }}>Volver a intentar</button>}</div>}
          </div>
          {presentation && <p className={s.videoCaption}>{presentation.caption}</p>}
          <p className={s.videoStatus} role="status">{finished ? "Ya viste la presentación. El siguiente paso es crear tu contrato en ContyGo." : "Después de conocer el servicio, continúa a ContyGo para crear tu cuenta y revisar tu contrato."}</p>
        </section>
        <section className={s.summary} aria-labelledby="service-next-heading"><span className={s.summaryLabel}>TU SIGUIENTE PASO</span><h2 id="service-next-heading">Empieza tu contratación.</h2><div className={s.priceList}>{service.plans.map(plan => <div key={plan.name}><span>{plan.name}</span><strong>{money.format(plan.price)} <small>USD</small></strong></div>)}</div>
          <a className={s.contractButton} href={getContygoServiceUrl(service.id) ?? "https://contygo.app/servicios"}>Crear mi contrato en ContyGo <Arrow /></a><p className={s.contractNote}>Crea tu cuenta, confirma tu correo y revisa tu paquete antes de firmar. Precio vigente y opciones de pago en ContyGo. Tasas gubernamentales aparte.</p>
          <details className={s.scopeDetails}><summary>Qué incluye el servicio</summary><ul className={s.inclusions}>{service.includes.map(item => <li key={item}>{item}</li>)}</ul></details>
          <details className={s.scopeDetails}><summary>Qué debes tener en cuenta</summary><div className={s.exclusions}>{service.exclusions.map(item => <p key={item}>{item}</p>)}</div></details>
          <a className={s.assistance} href={waLink(`Hola, estoy revisando ${service.name} en ContyGo y tengo una duda antes de contratar.`)}>Necesito ayuda con este servicio <Arrow /></a>
        </section>
      </div>
    </main>
    <footer className={s.footer}><span>ContyGo · USA LatinoPrime</span><p>Apoyo administrativo y tecnológico para la preparación de trámites. Sin representación legal ni garantía de decisiones de las autoridades.</p><Link href="/#servicios">Volver a todos los servicios</Link></footer>
  </div>;
}
