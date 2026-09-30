"use client";

/* ============================================================
   STEP 5 — RESULTADO
   tones: success | urgent (califican) · contact (revisión) · denied (no califica)
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { Answers, ResultData, Service } from "@/lib/types";
import { newEventId, trackBrowser, trackLeadDeduped } from "@/lib/meta/pixel-client";
import Confetti from "./Confetti";
import SocialProof from "./SocialProof";
import ScheduleModal from "./ScheduleModal";
import { Ico, SvgIcon } from "./icons";
import { getSelfServiceUrl } from "@/lib/contygo";
import SelfServiceCard from "./SelfServiceCard";
import selfServiceStyles from "./SelfServiceCard.module.css";

interface ResultSlideProps {
  service: Service;
  result: ResultData;
  /** true cuando el resultado es el paso visible. */
  isActive: boolean;
  onRestart: () => void;
  /** vuelve a la lista de servicios (usado tras un "no califica"). */
  onTryOthers: () => void;
  /** Respuestas del cuestionario: viajan a la ficha del CRM si la persona deja sus datos. */
  answers?: Answers;
}

/** Tiempo antes de llevar automáticamente al usuario a otros servicios. */
const DENIED_REDIRECT_MS = 8000;

export default function ResultSlide({ service, result, isActive, onRestart, onTryOthers, answers }: ResultSlideProps) {
  const tone = result.tone;
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Captura de nombre y WhatsApp → ficha en el CRM (opcional para la persona).
  const [capName, setCapName] = useState("");
  const [capPhone, setCapPhone] = useState("");
  const [capBusy, setCapBusy] = useState(false);
  const [capDone, setCapDone] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const hpRef = useRef<HTMLInputElement>(null);

  async function saveAndContinue(e: React.FormEvent) {
    e.preventDefault();
    const name = capName.trim();
    const phone = capPhone.replace(/\D/g, "");
    if (name.length < 2) return setCapError("Escribe tu nombre.");
    if (!/^[0-9]{8,15}$/.test(phone)) return setCapError("Escribe tu WhatsApp con código de área, por ejemplo +1 (763) 342-2258.");
    setCapError(null);
    setCapBusy(true);
    try {
      const res = await fetch("/api/contacts/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, serviceId: service.id, tone, answers: answers ?? null, website: hpRef.current?.value ?? "" }),
        keepalive: true,
      });
      const saved = await res.json();
      if (!res.ok || !saved.ok || typeof saved.id !== "string") throw new Error("capture_failed");
      setCapDone(true);
      setScheduleOpen(true);
    } catch {
      setCapError("No pudimos guardar tus datos. Inténtalo de nuevo o elige escribir sin dejarlos.");
    } finally {
      setCapBusy(false);
    }
  }

  // "No califica": redirección automática a otros servicios (solo cuando es visible).
  useEffect(() => {
    if (tone !== "denied" || !isActive) return;
    const id = setTimeout(onTryOthers, DENIED_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [tone, isActive, onTryOthers]);

  // Id de evento estable por vista de resultado (deduplicación Pixel ↔ CAPI).
  const eventIdRef = useRef<string>("");
  if (!eventIdRef.current) eventIdRef.current = newEventId();
  const leadFiredRef = useRef(false);

  // Señal de embudo: el usuario llegó a un resultado que califica.
  const evalFiredRef = useRef(false);
  useEffect(() => {
    if (!isActive || evalFiredRef.current) return;
    const win = tone === "success" || tone === "urgent";
    if (!win) return;
    evalFiredRef.current = true;
    trackBrowser("EvaluationCompleted", {
      content_name: service.name,
      status: tone,
    });
  }, [isActive, tone, service]);

  // Conversión clave: clic al CTA de WhatsApp → Lead (Pixel + CAPI deduplicado).
  // El <a target="_blank"> deja viva la pestaña, así que NO hace falta
  // preventDefault ni delay; el guard evita doble disparo por doble-clic.
  function onWhatsAppClick() {
    if (leadFiredRef.current) return;
    leadFiredRef.current = true;
    trackLeadDeduped(eventIdRef.current, {
      content_name: service.name,
      content_ids: [service.id],
    });
  }

  // ---- Caso especial: NO CALIFICA ----
  if (tone === "denied") {
    return (
      <div className="result result--denied slide-anim">
        <div className="result__badge">{Ico.heart}</div>
        <h2>Gracias por tu confianza</h2>
        <p className="result__sub">{result.message}</p>
        <div className="result__svc">
          <SvgIcon name={service.icon} /> {service.name}
        </div>
        <p className="result__msg">
          ¡No te desanimes! Tenemos muchos otros servicios que podrían ser justo lo que necesitas.
        </p>
        <button type="button" className="btn btn--primary" onClick={onTryOthers}>
          {Ico.compass} Ver otros servicios
        </button>
        <div className="result__countdown" aria-hidden="true">
          <span />
        </div>
        <p className="result__redirect">Te llevamos a otros servicios en unos segundos…</p>
      </div>
    );
  }

  // ---- Califican / revisión ----
  const isWin = tone === "success" || tone === "urgent";
  const selfServiceUrl = getSelfServiceUrl(service.id, tone);

  const headline = tone === "success" ? "¡Felicidades!" : tone === "urgent" ? "Tu caso es urgente" : "Conversemos";
  const subhead =
    tone === "success"
      ? "Elige cómo quieres continuar con tu trámite"
      : tone === "urgent"
        ? "Estás en el momento crítico — actúa ahora"
        : "Cuéntanos tu caso y te ayudamos sin costo";

  const badgeIcon = tone === "contact" ? Ico.alert : tone === "urgent" ? Ico.clock : Ico.check;

  return (
    <div className={"result slide-anim result--" + tone}>
      <Confetti go={isWin} />
      <div className="result__badge">{badgeIcon}</div>
      {tone === "success" && <span className="slide-tag result__win">Calificaste</span>}
      <h2>{headline}</h2>
      <p className="result__sub">{subhead}</p>
      <div className="result__svc">
        <SvgIcon name={service.icon} /> {service.name}
      </div>
      <p className="result__msg">{result.message}</p>
      {selfServiceUrl && (
        <>
          <SelfServiceCard href={selfServiceUrl} serviceName={service.name} />
          <p className={selfServiceStyles.alternative}>¿Prefieres hablar con el equipo?</p>
        </>
      )}
      {capDone ? (
        <button type="button" className="btn btn--wa" onClick={() => setScheduleOpen(true)}>
          {Ico.whatsapp} {isWin ? "Agendar por WhatsApp" : "Escribirnos por WhatsApp"}
        </button>
      ) : (
        <form className="capture" onSubmit={saveAndContinue}>
          <span className="capture__t">¿A quién atendemos?</span>
          <span className="capture__s">Con tu nombre y WhatsApp, la asesora te reconoce al instante y ya tiene tus respuestas a la mano.</span>
          <div className="capture__row">
            <input className="rate__input" placeholder="Tu nombre" value={capName} onChange={(e) => setCapName(e.target.value)} autoComplete="name" aria-label="Nombre" />
            <input className="rate__input" placeholder="Tu WhatsApp" inputMode="tel" value={capPhone} onChange={(e) => setCapPhone(e.target.value)} autoComplete="tel" aria-label="WhatsApp" />
          </div>
          <input ref={hpRef} className="rate__hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {capError && <span className="rate__error">{capError}</span>}
          <button type="submit" className="btn btn--wa" disabled={capBusy}>
            {Ico.whatsapp} {capBusy ? "Guardando…" : isWin ? "Agendar por WhatsApp" : "Escribirnos por WhatsApp"}
          </button>
          <button type="button" className="capture__skip" onClick={() => setScheduleOpen(true)}>
            Prefiero escribir sin dejar mis datos
          </button>
        </form>
      )}
      {isWin && <SocialProof />}
      <button type="button" className="btn btn--ghost" onClick={onRestart}>
        Empezar de nuevo
      </button>
      {scheduleOpen && (
        <ScheduleModal
          service={service}
          onContact={onWhatsAppClick}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}
