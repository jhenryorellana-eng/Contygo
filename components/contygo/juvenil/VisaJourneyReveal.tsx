"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { JourneyGuidance } from "@/lib/agent/service-intake";
import { normalizePhone } from "@/lib/contygo-api/checkout";
import { outcomeMessage } from "@/lib/contygo-api/messages";
import PhoneField from "../guide/PhoneField";
import type { Guide } from "../guide/useGuide";
import s from "./VisaJourneyReveal.module.css";

type Props = {
  serviceName?: string;
  displayName?: string;
  onDisplayNameChange?: (name: string) => void;
  guidance?: JourneyGuidance;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  onContinue: (button: HTMLButtonElement) => void;
  onEdit: () => void;
  departing?: boolean;
  pending?: boolean;
  fromChat?: boolean;
  /** Guía por voz: dice en voz alta qué llenar aquí (solo audio: esta pantalla conserva su diseño). */
  guide?: Guide;
  /** Online contracting is not available for this person (eligibility answered 401/403, or the service is handled by a person): the WhatsApp way is shown up front. */
  unavailableOnline?: boolean;
  /** The single WhatsApp link (waLink with the WEB reference) for that notice. */
  helpHref?: string;
};

const LAUNCHES = [
  { x: "15%", y: "29dvh", delay: "0s", tilt: "-12deg" },
  { x: "84%", y: "22dvh", delay: ".85s", tilt: "11deg" },
  { x: "29%", y: "17dvh", delay: "2.05s", tilt: "-7deg" },
  { x: "77%", y: "42dvh", delay: "3.25s", tilt: "14deg" },
  { x: "10%", y: "48dvh", delay: "4.4s", tilt: "-9deg" },
];
const DROPS = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2;
  const radius = i % 3 === 0 ? 138 : i % 3 === 1 ? 100 : 72;
  return { x: `${Math.cos(angle) * radius}px`, y: `${Math.sin(angle) * radius}px`,
    turn: `${i / 26 * 360 + 90}deg`, length: `${i % 3 === 0 ? 16 : 9}px` };
});

export function Celebration({ placement = "scene" }: { placement?: "scene" | "brand" } = {}) {
  return <div className={s.celebration} data-celebration={placement} aria-hidden="true">
    {LAUNCHES.map((launch, index) => <div key={index} className={s.launch} style={{
      "--launch-x": placement === "brand" ? ["12%","88%","6%","94%","20%"][index] : launch.x,
      "--launch-y": placement === "brand" ? ["45%","45%","65%","65%","30%"][index] : launch.y,
      "--launch-delay": launch.delay, "--launch-tilt": launch.tilt,
    } as CSSProperties}>
      <i className={s.trail} />
      <i className={s.burstGlow} />
      <i className={s.burstRing} />
      {DROPS.map((drop, dropIndex) => <i key={dropIndex} className={s.drop} style={{
        "--drop-x": drop.x, "--drop-y": drop.y,
        "--drop-turn": drop.turn, "--drop-length": drop.length,
      } as CSSProperties} />)}
    </div>)}
  </div>;
}

export default function VisaJourneyReveal({ guidance, onContinue, onEdit, departing = false, pending = false, fromChat = false, serviceName = "Visa Juvenil", displayName = "", onDisplayNameChange, phone = "", onPhoneChange, guide, unavailableOnline = false, helpHref }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  // Con nombre y teléfono, un asesor puede ayudarte si lo necesitas (lead en contygo). Ambos son opcionales aquí.
  const phoneInvalid = phoneTouched && phone.trim().length > 0 && !normalizePhone(phone);
  const phoneHelp = useId();
  // Once the scene has settled, the guide says out loud what to fill here. Audio only (owner, 29 Sep).
  const guided = useRef(false);
  const guideRef = useRef(guide); guideRef.current = guide;
  useEffect(() => {
    if (pending || departing || guided.current || !guideRef.current || !(onDisplayNameChange || onPhoneChange)) return;
    const timer = window.setTimeout(() => { guided.current = true; guideRef.current?.play("revealContact"); }, 900);
    return () => window.clearTimeout(timer);
  }, [pending, departing, onDisplayNameChange, onPhoneChange]);
  useEffect(() => () => { if (guided.current) guideRef.current?.stop(); }, []);

  useEffect(() => {
    if (pending) return;
    const frame = window.requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [pending]);

  return <section className={s.scene} data-journey-reveal data-from-chat={fromChat} data-pending={pending} data-details-open={detailsOpen} data-departing={departing} aria-hidden={pending || undefined} aria-labelledby={headingId} aria-busy={departing || undefined}>
    <div className={s.ambient} aria-hidden="true" />
    <Celebration />

    <header className={s.header}>
      <img className={s.wordmark} src="/contygo/brand/logo-dark.png" width="3000" height="849" alt="ContyGo" draggable={false} />
      <span>{serviceName.toUpperCase()}</span>
    </header>

    <div className={s.content}>
      <div className={s.mark} aria-hidden="true">
        <i />
        <img src="/contygo/brand/symbol-dark.png" width="1024" height="1024" alt="" draggable={false} />
      </div>

      <p className={s.kicker}>PRIMER PASO COMPLETADO</p>
      <h2 ref={heading} id={headingId} tabIndex={-1} className={s.title}>
        <span>Ya diste</span><span>el primer paso.</span>
      </h2>
      <p className={s.subtitle}>Ahora descubre cómo ContyGo<br className={s.mobileBreak} /> te acompaña.</p>

      <div className={s.nextStep}>
        <span>02</span><i aria-hidden="true" /><span>CONOCE LA SOLUCIÓN</span>
      </div>
      {unavailableOnline&&helpHref&&<div className={s.unavailable} role="status"><strong>{outcomeMessage({ step: "UNAVAILABLE_ONLINE" }).title}</strong><span>{outcomeMessage({ step: "UNAVAILABLE_ONLINE" }).detail}</span><a href={helpHref} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a></div>}
      {onDisplayNameChange&&<label className={s.namePrompt}>¿Cómo te gustaría que te llamemos?<span>Tu nombre · opcional</span><input autoComplete="given-name" maxLength={32} value={displayName} disabled={pending||departing} placeholder="Escribe tu nombre" onChange={event=>onDisplayNameChange(event.target.value.replace(new RegExp("[^\\p{L}\\p{M} '-]", "gu"),""))}/></label>}
      {onPhoneChange&&<div className={s.namePrompt} data-invalid={phoneInvalid||undefined}><span className={s.promptLabel}>¿A qué teléfono te podemos escribir?</span><span id={phoneHelp}>{phoneInvalid?"Revisa el número y el país":"WhatsApp o celular · opcional"}</span><PhoneField value={phone} onChange={onPhoneChange} onBlur={()=>setPhoneTouched(true)} disabled={pending||departing} invalid={phoneInvalid} describedBy={phoneHelp}/><small className={s.contactNotice}>Al dejar tu teléfono aceptas que ContyGo te escriba por WhatsApp sobre este trámite. <a href="/privacidad" target="_blank" rel="noopener noreferrer">Ver privacidad</a>.</small></div>}
      <button className={s.primary} data-journey-continue type="button" disabled={departing || pending} onClick={event => { guide?.stop(); onContinue(event.currentTarget); }}>
        <span className={s.play} aria-hidden="true"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.8 4.7a.7.7 0 0 1 1.1-.6l8 5.3a.7.7 0 0 1 0 1.2l-8 5.3a.7.7 0 0 1-1.1-.6Z" /></svg></span>
        <span className={s.buttonLabel}>Conocer la propuesta</span>
        <svg className={s.arrow} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      <button className={s.edit} type="button" disabled={departing} onClick={onEdit}>Corregir mis respuestas</button>

      {guidance && <details className={s.guidance} onToggle={event => setDetailsOpen(event.currentTarget.open)}>
        <summary>Ver mi orientación inicial<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
        <div className={s.guidanceBody}>
          <h3>{guidance.title}</h3>
          <p>{guidance.detail}</p>
          {!!guidance.sources?.length && <div className={s.sources}>
            <span>Fuentes de esta orientación</span>
            {guidance.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true">↗</span></a>)}
          </div>}
        </div>
      </details>}
    </div>
  </section>;
}
