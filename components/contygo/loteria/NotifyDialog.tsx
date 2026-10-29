"use client";

/* «Avísame cuando abra» (28-10-2026): nombre y WhatsApp (el correo, opcional) para avisar a la persona cuando abra la
   inscripción. Se registra como cualquier otro contacto de ContyGo (POST /api/contratar/lead, servicio de la Lotería),
   así el equipo lo ve en el CRM con los demás. En producción lleva el Turnstile invisible de los leads. */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import PhoneField from "@/components/contygo/guide/PhoneField";
import { useLeadCaptcha } from "@/components/contygo/juvenil/useLeadCaptcha";
import { newExternalRef, pageAttribution } from "@/lib/contygo-api/browser";
import { normalizeEmail, normalizePhone } from "@/lib/contygo-api/checkout";
import { LOTTERY_SERVICE } from "@/lib/agent/lottery-intake";
import s from "./LotteryGuide.module.css";

type Props = { open: boolean; opened: boolean; onClose: () => void; onDone: (name: string) => void };

export default function NotifyDialog({ open, opened, onClose, onDone }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [email, setEmail] = useState("");
  const [state, setState] = useState<"form" | "sending" | "done">("form");
  const [error, setError] = useState<{ name?: string; phone?: string; email?: string; general?: string }>({});
  const captcha = useLeadCaptcha(open && state !== "done");
  const titleId = useId(), phoneHelp = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof error = {};
    if (!name.trim()) next.name = "Escribe tu nombre.";
    if (!normalizePhone(phone)) next.phone = "Escribe tu WhatsApp, con el código de tu país.";
    if (email.trim() && !normalizeEmail(email)) next.email = "Revisa tu correo.";
    setError(next);
    if (Object.keys(next).length) return;
    setState("sending");
    try {
      const captchaToken = await captcha.take();
      const response = await fetch("/api/contratar/lead", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: LOTTERY_SERVICE, externalRef: newExternalRef(), displayName: name.trim(), phone, ...(email.trim() ? { email: email.trim() } : {}), answers: {}, attribution: pageAttribution(), ...(captchaToken ? { captchaToken } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError({ name: data.errors?.displayName, phone: data.errors?.phone, general: data.errors ? undefined : "No pudimos guardar tus datos. Inténtalo otra vez en un momento." });
        setState("form");
        return;
      }
      setState("done"); onDone(name.trim().split(/\s+/)[0]);
    } catch {
      setError({ general: "No hay conexión. Revisa tu internet e inténtalo otra vez." }); setState("form");
    }
  }

  return <dialog ref={dialog} className={s.sheet} aria-labelledby={titleId} onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className={s.sheetBody}>
      <button type="button" className={s.sheetClose} onClick={onClose} aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
      {state === "done" ? <div className={s.sheetDone} role="status">
        <span className={s.sheetSeal} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5.5 12.5 4 4 9-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <h2 id={titleId}>¡Listo, {name.trim().split(/\s+/)[0]}!</h2>
        <p>{opened ? "Te escribimos por WhatsApp para ayudarte con tu inscripción." : "Te escribimos por WhatsApp cuando abra la inscripción, el 1 de noviembre."} Mientras tanto, deja tu foto lista: es lo que más descalifica.</p>
        <button type="button" className={s.primary} onClick={onClose}>Seguir con mi guía</button>
      </div> : <form onSubmit={submit} noValidate>
        <span className={s.sheetKicker}>{opened ? "Te ayudamos" : "Recordatorio gratis"}</span>
        <h2 id={titleId}>{opened ? "Te escribimos por WhatsApp" : "Te avisamos cuando abra"}</h2>
        <p className={s.sheetLead}>{opened ? "Déjanos tu WhatsApp y te ayudamos a terminar tu inscripción." : "La inscripción abre el 1 de noviembre y dura 30 días. Te mandamos un WhatsApp ese día para que no se te pase."}</p>
        <label className={s.field}>Tu nombre<input autoComplete="given-name" maxLength={60} value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(error.name)} placeholder="Escribe tu nombre" />{error.name && <span className={s.fieldError}>{error.name}</span>}</label>
        <div className={s.field}><span>Tu WhatsApp</span><PhoneField value={phone} onChange={setPhone} invalid={Boolean(error.phone)} describedBy={phoneHelp} />{error.phone && <span id={phoneHelp} className={s.fieldError}>{error.phone}</span>}</div>
        <label className={s.field}>Tu correo <small>opcional</small><input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={160} value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(error.email)} placeholder="tucorreo@gmail.com" />{error.email && <span className={s.fieldError}>{error.email}</span>}</label>
        {error.general && <p className={s.fieldError} role="alert">{error.general}</p>}
        <button type="submit" className={s.primary} disabled={state === "sending"}>{state === "sending" ? "Guardando…" : opened ? "Quiero ayuda" : "Avísame por WhatsApp"}</button>
        <p className={s.consent}>Al dejar tu teléfono aceptas que ContyGo te escriba por WhatsApp sobre la Lotería de Visas. <a href="/privacidad" target="_blank" rel="noopener noreferrer">Ver privacidad</a>.</p>
        <div ref={captcha.container} className={s.captcha} />
      </form>}
    </div>
  </dialog>;
}
