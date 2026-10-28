"use client";

/* Cómo empezar un servicio (24-10-2026): hay dos clientes. La llamada siempre es una entrevista y, después, las dudas.
   · «Es mi primera vez»: no conoce el servicio ni viene de ningún anuncio; hace la guía completa (vídeo del servicio,
     la llamada con todas sus preguntas y sus dudas, y el vídeo del proceso).
   · «Ya conozco mi caso»: sin el vídeo del servicio; la llamada hace solo las preguntas que evalúan su caso (25-10-2026),
     resuelve sus dudas y pasa al vídeo del proceso.
   Dos tarjetas que actúan al tocarlas, como «¿Cómo quieres crear tu contrato?». Los enlaces con ?ruta=rapida
   (anuncios que ya explican el servicio) saltan esta pantalla. Un servicio aún sin vídeo propio no lo promete (26-10-2026). */
import { useEffect, useId, useRef } from "react";
import s from "./ServiceStartChooser.module.css";

/** `art`: the service's drawing, the head of the screen (the touched card's drawing flies here, 28-10-2026). */
type Props = { serviceName: string; art?: string; family?: string; hasVideo?: boolean; onFull: () => void; onFast: () => void };

function Play() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="m10.2 9.2 4.6 2.8-4.6 2.8Z" fill="currentColor" /></svg>;
}
function Mic() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function Chat() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M10.2 9.6a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.3M12 14.6v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function ServiceStartChooser({ serviceName, art, family, hasVideo = true, onFull, onFast }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // The question takes the focus (read first by a screen reader) without preselecting a way; after the window opens,
  // which would otherwise give it to the close button.
  useEffect(() => { const timer = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 80); return () => window.clearTimeout(timer); }, []);

  return <section className={s.start} aria-labelledby={titleId}>
    <div className={s.body}>
      {art ? <span className={s.hero} data-flight-target data-family={family}>
        <img className={s.heroArt} src={art} alt="" draggable={false} />
        <img className={s.heroMark} src="/contygo/brand/symbol-dark.png" alt="" draggable={false} />
      </span> : <img className={s.mark} src="/contygo/brand/symbol-dark.png" alt="" draggable={false} />}
      <p className={s.service}>{serviceName}</p>
      <h2 id={titleId} ref={titleRef} tabIndex={-1} className={s.title}>¿Cómo quieres empezar?</h2>
      <div className={s.ways}>
        <button type="button" className={s.way} data-way="full" onClick={onFull}>
          <span className={s.icon}>{hasVideo ? <Play /> : <Mic />}</span>
          <span className={s.text}>
            <strong>Es mi primera vez</strong>
            {hasVideo ? <>
              <span>Te explicamos el servicio en un vídeo, te hacemos unas preguntas por voz, resolvemos tus dudas y ves cómo sería tu proceso.</span>
              <span className={s.steps} aria-label="Incluye: vídeo del servicio, preguntas, tus dudas y tu proceso"><i>Vídeo del servicio</i><i>Preguntas</i><i>Tus dudas</i><i>Tu proceso</i></span>
            </> : <>
              <span>Te hacemos todas las preguntas por voz para conocer tu caso, resolvemos tus dudas y ves cómo sería tu proceso.</span>
              <span className={s.steps} aria-label="Incluye: preguntas, tus dudas y tu proceso"><i>Preguntas</i><i>Tus dudas</i><i>Tu proceso</i></span>
            </>}
          </span>
          <i className={s.go} aria-hidden="true"><Arrow /></i>
        </button>
        <button type="button" className={s.way} data-way="fast" onClick={onFast}>
          <span className={s.icon}><Chat /></span>
          <span className={s.text}>
            <strong>Ya conozco mi caso</strong>
            <span>Unas preguntas rápidas para confirmar que calificas, tus dudas con el asistente y cómo sería tu proceso.</span>
            <span className={s.steps} aria-label="Incluye: preguntas rápidas, tus dudas y tu proceso"><i>Preguntas rápidas</i><i>Tus dudas</i><i>Tu proceso</i></span>
          </span>
          <i className={s.go} aria-hidden="true"><Arrow /></i>
        </button>
      </div>
    </div>
  </section>;
}
