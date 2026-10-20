"use client";

/* Cómo crear el contrato (20-10-2026): al tocar «Revisar mi contrato» tras los vídeos, dos caminos.
   · «Crea tu contrato por ti mismo»: la ficha guiada de siempre (datos, código y firma en ContyGo).
   · «Crea tu contrato con un asesor»: el WhatsApp del CRM, con el servicio, el nombre y la referencia ya escritos.
   Dos tarjetas grandes que actúan al tocarlas, sin «elige y luego continúa»: un toque, un camino.
   La misma hoja de papel que el selector de Básico o Premium (ServiceVariantPicker). */
import { useEffect, useId, useRef, type MouseEvent } from "react";
import s from "./ContractModeChooser.module.css";

type Props = {
  serviceName: string;
  /** The CRM chat with the message already written. */
  advisorHref: string;
  onSelf: () => void;
  /** After the CRM chat opens: the sheet closes and the closing stays where it was. */
  onAdvisor: () => void;
  onClose: () => void;
};

function Close() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Pen() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.5h7l4.5 4.5v12.5H7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M13.5 3.5V8.5H18.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m10 16.5 1.6 1.4 3.4-3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function WhatsApp() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.6-.4Z" /></svg>;
}

export default function ContractModeChooser({ serviceName, advisorHref, onSelf, onAdvisor, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    // The title takes the focus (read first by a screen reader) without preselecting a way.
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function clickOutside(event: MouseEvent<HTMLDialogElement>) {
    event.stopPropagation();
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }

  return <dialog ref={dialogRef} className={s.sheet} aria-labelledby={titleId} onClick={clickOutside} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <div className={s.body}>
      <header className={s.header}>
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>¿Cómo quieres crear tu contrato?</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Cerrar y volver"><Close /></button>
      </header>
      <p className={s.lead}>{serviceName}. Elige el camino que te resulte más cómodo.</p>

      <div className={s.ways}>
        <button type="button" className={s.way} data-way="self" onClick={onSelf}>
          <span className={s.icon}><Pen /></span>
          <span className={s.text}>
            <strong>Crea tu contrato por ti mismo</strong>
            <span>Llenas tus datos aquí, recibes un código en tu correo y firmas en línea. Toma unos minutos.</span>
          </span>
          <i className={s.go} aria-hidden="true"><Arrow /></i>
        </button>
        <a className={s.way} data-way="advisor" href={advisorHref} target="_blank" rel="noopener noreferrer" onClick={onAdvisor}>
          <span className={s.icon}><WhatsApp /></span>
          <span className={s.text}>
            <strong>Crea tu contrato con un asesor</strong>
            <span>Un asesor te atiende por WhatsApp y prepara el contrato contigo.</span>
          </span>
          <i className={s.go} aria-hidden="true"><Arrow /></i>
        </a>
      </div>
    </div>
  </dialog>;
}
