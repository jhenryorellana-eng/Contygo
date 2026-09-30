"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import s from "./CertificateShowcase.module.css";

export const CERTIFICATE = "/contygo/registro/certificado-utah-detalle.png";
export const ORIGINAL_PDF = "/contygo/registro/registro-utah-original.pdf";
export const PUBLIC_REGISTER = "https://services.commerce.utah.gov/dcp-registrations/";
export const NOTICE = "El consultor no es abogado y no presta servicios legales. El registro no constituye un aval del Estado de Utah ni autorización para ejercer como abogado.";

function ExpandIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M4 4l5 5m11-5-5 5M4 20l5-5m11 5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ExternalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 16 19 5M10 5h9v9M5 5H4v15h15v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CertificateDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const noteId = useId();
  const [originalSize, setOriginalSize] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const original = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, paddingRight: body.style.paddingRight };
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const paddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    Object.assign(body.style, { overflow: "hidden", position: "fixed", top: `-${scrollY}px`, left: `-${scrollX}px`, width: "100%" });
    if (scrollbar > 0) body.style.paddingRight = `${paddingRight + scrollbar}px`;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      Object.assign(body.style, original);
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => { viewer.current?.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [originalSize]);

  return <dialog
    ref={dialog}
    className={s.dialog}
    aria-labelledby={headingId}
    aria-describedby={noteId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}
  >
    <header className={s.dialogHeader}>
      <div><span className={s.dialogEyebrow}>Documento de registro</span><h2 id={headingId}>Jimy Henry Orellana</h2></div>
      <button ref={closeButton} className={s.close} type="button" onClick={onClose} aria-label="Cerrar certificado y volver a la página"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
    </header>
    <div className={s.viewerToolbar}>
      <span>Certificado íntegro · 14304807-IC00</span>
      {!failed && <button type="button" className={s.zoomControl} onClick={() => setOriginalSize(value => !value)} aria-pressed={originalSize}><ExpandIcon />{originalSize ? "Ajustar al ancho" : "Ver tamaño original"}</button>}
    </div>
    <div ref={viewer} className={s.viewer} data-original-size={originalSize} tabIndex={0} aria-label={originalSize ? "Certificado ampliado. Desplázate para recorrer el documento." : "Certificado completo"}>
      {failed ? <p className={s.viewerError} role="status">La imagen no pudo cargar. Puedes abrir el PDF original con el enlace inferior.</p> : <Image
        src={CERTIFICATE}
        alt="Certificado de registro de Utah de Jimy Henry Orellana como Immigration Consultant, número 14304807-IC00, con fechas del 21 de agosto de 2026 al 21 de agosto de 2027 y el aviso completo del documento."
        width={1764}
        height={1296}
        className={s.documentImage}
        loading="eager"
        unoptimized
        onError={() => setFailed(true)}
      />}
    </div>
    <footer className={s.dialogFooter}><p id={noteId}>{NOTICE}</p><a href={ORIGINAL_PDF} target="_blank" rel="noopener noreferrer">Ver PDF original <span>2 páginas</span><ExternalIcon /></a></footer>
  </dialog>;
}

export default function CertificateShowcase() {
  const section = useRef<HTMLElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setEntered(true);
    }, { threshold: .12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <>
    <section id="registro" ref={section} className={s.showcase} aria-labelledby={headingId} data-entered={entered} data-visible={visible}>
      <div className={s.inner}>
        <div className={s.copy}>
          <span className={s.eyebrow}><i aria-hidden="true" /> Personas detrás del proceso</span>
          <h2 id={headingId}>Conoce quién<br />te acompaña.</h2>
          <p className={s.introduction}>Registro como consultor de inmigración en Utah</p>
        </div>

        <figure className={s.document}>
          <div className={s.displayCase}>
            <div className={s.ambientLight} aria-hidden="true" />
            <span className={s.caseLabel}>UTAH · DIVISION OF CONSUMER PROTECTION</span>
            <div className={s.documentPlane}>
              <button className={s.frameButton} type="button" onClick={() => setOpen(true)} aria-label="Ampliar certificado de registro de Jimy Henry Orellana" aria-haspopup="dialog">
                <span className={s.metalFrame}>
                  <span className={s.edgeLight} aria-hidden="true" />
                  <span className={s.mat}>
                    <span className={s.imageArea}>
                      {failed ? <span className={s.imageError}>Vista previa no disponible.<br />Abre el visor para consultar el PDF original.</span> : <Image
                        src={CERTIFICATE}
                        alt="Certificado completo de registro como consultor de inmigración en Utah, a nombre de Jimy Henry Orellana."
                        width={1764}
                        height={1296}
                        sizes="(max-width: 760px) calc(100vw - 80px), (max-width: 1400px) 50vw, 660px"
                        className={s.certificate}
                        onError={() => setFailed(true)}
                      />}
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <span className={s.shelf} aria-hidden="true" />
          </div>
          <figcaption className={s.documentCaption}><span>Certificado de registro · Vista íntegra</span><button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">Ampliar documento <ExpandIcon /></button></figcaption>
          <a className={s.pdfLink} href={ORIGINAL_PDF} target="_blank" rel="noopener noreferrer">Consultar el PDF original <span>2 páginas</span><ExternalIcon /></a>
        </figure>
        <div className={s.facts}>
          <dl className={s.details}>
            <div><dt>Titular</dt><dd>Jimy Henry Orellana</dd></div>
            <div><dt>Clasificación</dt><dd>Immigration Consultant</dd></div>
            <div><dt>Número de registro</dt><dd className={s.registrationNumber}>14304807-IC00</dd></div>
            <div><dt>Fechas del documento</dt><dd className={s.dates}><time dateTime="2026-08-21">21 ago 2026</time><span aria-hidden="true">—</span><time dateTime="2027-08-21">21 ago 2027</time></dd></div>
          </dl>
          <div className={s.publicRecord}><p>Registro activo en la consulta pública del <time dateTime="2026-09-14">14 de septiembre de 2026</time>.</p><a href={PUBLIC_REGISTER} target="_blank" rel="noopener noreferrer">Consultar registro público <ExternalIcon /></a></div>
          <p className={s.notice}>{NOTICE}</p>
        </div>
      </div>
    </section>
    {open && <CertificateDialog onClose={() => setOpen(false)} />}
  </>;
}
