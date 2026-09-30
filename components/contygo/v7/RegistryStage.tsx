"use client";

/* «Conoce quién te acompaña», V7: una credencial con los datos del registro y el certificado original.
   Cuando llega el hilo verde (la lámina lleva data-react="sheet"), una lupa entra desde el lado del
   hilo y recorre en el certificado el nombre, la vigencia y el número, mientras la credencial ilumina
   el mismo dato: se ve que coinciden. Pasar o tocar una fila de la credencial lleva la lupa a ese dato.
   Mismos datos y mismo aviso legal que CertificateShowcase; nunca sellos ni lenguaje de aprobación. */
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CERTIFICATE, CertificateDialog, NOTICE, ORIGINAL_PDF, PUBLIC_REGISTER } from "../rebuild/CertificateShowcase";
import r from "./RegistryStage.module.css";

type Stop = 0 | 1 | 2 | 3;
const TOUR: Stop[] = [1, 2, 3];

function External() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 16 19 5M10 5h9v9M5 5H4v15h15v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Expand() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function RegistryStage() {
  const headingId = useId();
  const section = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [stop, setStop] = useState<Stop>(0);
  const userDriven = useRef(false);

  // The tour starts once, when the thread reaches the sheet (GreenThread sets data-lit on it).
  useEffect(() => {
    const sheet = section.current?.closest<HTMLElement>("[data-react]");
    if (!sheet) return;
    const timers: number[] = [];
    let started = false;
    const start = () => {
      if (started || sheet.dataset.lit !== "true") return;
      started = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStop(3); return; }
      TOUR.forEach((next, index) => timers.push(window.setTimeout(() => { if (!userDriven.current) setStop(next); }, 450 + index * 1500)));
    };
    start();
    const observer = new MutationObserver(start);
    observer.observe(sheet, { attributes: true, attributeFilter: ["data-lit"] });
    return () => { observer.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  const focus = (next: Stop) => ({
    onMouseEnter: () => { userDriven.current = true; setStop(next); },
    onFocus: () => { userDriven.current = true; setStop(next); },
    onClick: () => { userDriven.current = true; setStop(next); },
  });

  return <>
    <section ref={section} id="registro" className={r.stage} aria-labelledby={headingId} data-stop={stop}>
      <div className={r.atmosphere} aria-hidden="true" />
      <header className={r.head} data-react="title">
        <span className={r.eyebrow}><i aria-hidden="true" />Personas detrás del proceso</span>
        <h2 id={headingId}>Conoce quién<br /><em>te acompaña.</em></h2>
        <p>Detrás de la tecnología hay una persona registrada como consultor de inmigración ante la División de Protección al Consumidor de Utah. No tienes que creernos: compara los datos con el certificado y con el registro público.</p>
      </header>

      <div className={r.grid}>
        <article className={r.credential} aria-label="Credencial de registro">
          <div className={r.cardTop}>
            <span className={r.mark}><Image src="/contygo/v7/simbolo-oscuro.png" alt="" width={568} height={640} sizes="24px" /></span>
            <span className={r.cardKind}>Credencial de registro</span>
            <span className={r.status}><i aria-hidden="true" />Activo</span>
          </div>
          <div className={r.row} data-row="1" tabIndex={0} {...focus(1)}>
            <p className={r.name}>Jimy Henry Orellana</p>
            <p className={r.role}>Immigration Consultant · Utah</p>
          </div>
          <dl className={r.data}>
            <div className={`${r.row} ${r.number}`} data-row="3" tabIndex={0} {...focus(3)}><dt>Número de registro</dt><dd>14304807-IC00</dd></div>
            <div className={r.row} data-row="2" tabIndex={0} {...focus(2)}><dt>Vigencia del documento</dt><dd className={r.dates}><time dateTime="2026-08-21">21 ago 2026</time><span aria-hidden="true" /><time dateTime="2027-08-21">21 ago 2027</time></dd></div>
            <div><dt>Consulta pública</dt><dd>Registro activo el <time dateTime="2026-09-14">14 sep 2026</time></dd></div>
          </dl>
          <div className={r.actions}>
            <a className={r.primary} href={PUBLIC_REGISTER} target="_blank" rel="noopener noreferrer">Consultar registro público <External /></a>
            <button type="button" className={r.secondary} onClick={() => setOpen(true)} aria-haspopup="dialog">Ver certificado <Expand /></button>
          </div>
        </article>

        <figure className={r.document}>
          <button type="button" className={r.viewer} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ampliar el certificado de registro de Jimy Henry Orellana">
            <span className={r.paper}>
              <Image src={CERTIFICATE} alt="Certificado de registro de Utah de Jimy Henry Orellana como Immigration Consultant, número 14304807-IC00." width={1764} height={1296} sizes="(max-width:760px) 92vw, 640px" />
              {/* The loupe shows the same certificate, enlarged, centred on the field being compared. */}
              <span className={r.lens} aria-hidden="true"><Image className={r.lensImage} src={CERTIFICATE} alt="" width={1764} height={1296} sizes="900px" /></span>
            </span>
            <span className={r.zoom} aria-hidden="true"><Expand />Ampliar</span>
          </button>
          <figcaption>
            <span className={r.lensLabel} aria-live="polite">{stop === 1 ? "Mismo nombre en el certificado" : stop === 2 ? "Mismas fechas de vigencia" : stop === 3 ? "Mismo número de registro" : "Certificado íntegro · Utah Division of Consumer Protection"}</span>
            <a href={ORIGINAL_PDF} target="_blank" rel="noopener noreferrer">PDF original, 2 páginas <External /></a>
          </figcaption>
        </figure>
      </div>

      <p className={r.notice}>{NOTICE}</p>
    </section>
    {open && <CertificateDialog onClose={() => setOpen(false)} />}
  </>;
}
