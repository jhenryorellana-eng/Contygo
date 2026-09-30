"use client";

/* ============================================================
   MODAL DE AGENDAMIENTO
   Se abre desde el CTA de WhatsApp del resultado.
   Dos caminos:
     · urgente → llamada lo antes posible (mensaje de urgencia)
     · cita    → el usuario elige día + franja horaria
   Ambos terminan en un mensaje predeterminado a WhatsApp.
   ============================================================ */
import { useEffect, useState } from "react";
import type { Service } from "@/lib/types";
import { waRoute } from "@/lib/wa-route";
import { Ico } from "./icons";

interface ScheduleModalProps {
  service: Service;
  /** Se dispara cuando el usuario abre WhatsApp (llamada urgente o cita) — señal de Lead. */
  onContact?: () => void;
  onClose: () => void;
}

/** Franjas horarias ofrecidas para agendar la cita. */
const SLOTS = [
  { id: "manana", label: "Mañana", hint: "9:00 – 12:00" },
  { id: "tarde", label: "Tarde", hint: "12:00 – 17:00" },
  { id: "noche", label: "Noche", hint: "17:00 – 20:00" },
] as const;

type SlotId = (typeof SLOTS)[number]["id"];

/** Fecha de hoy en formato YYYY-MM-DD (hora local, sin desfase UTC). */
function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** "2026-07-10" → "viernes 10 de julio". */
function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export default function ScheduleModal({ service, onContact, onClose }: ScheduleModalProps) {
  const [view, setView] = useState<"choose" | "date">("choose");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<SlotId | null>(null);

  // Cerrar con Escape + bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const urgentMsg =
    `Hola UsaLatinoPrime 🚨 Es URGENTE. Necesito una llamada lo antes posible sobre mi caso: ${service.name}. ` +
    "¿A qué hora me pueden llamar hoy?";

  const ready = Boolean(date && slot);

  // Sólo se construye con fecha y franja válidas: prettyDate() sobre una
  // fecha vacía daría un "Invalid Date" y romper Intl.DateTimeFormat.
  const appointmentLink = ready
    ? waRoute({
        kind: "cita",
        serviceId: service.id,
        message:
          `Hola UsaLatinoPrime 👋 Quiero AGENDAR UNA CITA para el servicio: ${service.name}. ` +
          `Me acomoda el ${prettyDate(date)} en la ${SLOTS.find((s) => s.id === slot)!.label.toLowerCase()} ` +
          `(${SLOTS.find((s) => s.id === slot)!.hint}). ¿Me confirman disponibilidad?`,
      })
    : undefined;

  return (
    <div className="sched" role="dialog" aria-modal="true" aria-label="Agendar contacto" onClick={onClose}>
      <div className="sched__card slide-up" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sched__x" onClick={onClose} aria-label="Cerrar">
          {Ico.close}
        </button>

        {view === "choose" ? (
          <>
            <h3 className="sched__title">¿Cómo prefieres avanzar?</h3>
            <p className="sched__sub">Elige la opción que mejor te acomode y te atendemos por WhatsApp.</p>

            <a
              className="sched-opt sched-opt--urgent"
              href={waRoute({ kind: "urgente", serviceId: service.id, message: urgentMsg })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onContact}
            >
              <span className="sched-opt__ico">{Ico.phone}</span>
              <span className="sched-opt__body">
                <span className="sched-opt__name">Agendar una llamada urgente</span>
                <span className="sched-opt__desc">Te llamamos lo antes posible — sin esperas.</span>
              </span>
              <span className="sched-opt__go">{Ico.arrow}</span>
            </a>

            <button type="button" className="sched-opt sched-opt--book" onClick={() => setView("date")}>
              <span className="sched-opt__ico">{Ico.calendar}</span>
              <span className="sched-opt__body">
                <span className="sched-opt__name">Agendar una cita</span>
                <span className="sched-opt__desc">Elige el día y la hora que prefieras.</span>
              </span>
              <span className="sched-opt__go">{Ico.arrow}</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="sched__back" onClick={() => setView("choose")}>
              {Ico.arrowL} Volver
            </button>
            <h3 className="sched__title">Elige día y hora</h3>
            <p className="sched__sub">Tu asesora recibirá tu preferencia y confirmará tu cita.</p>

            <label className="sched__field">
              <span className="sched__label">Día</span>
              <input
                type="date"
                className="sched__date"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <div className="sched__field">
              <span className="sched__label">Franja horaria</span>
              <div className="sched__slots">
                {SLOTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={"sched-slot" + (slot === s.id ? " sched-slot--on" : "")}
                    onClick={() => setSlot(s.id)}
                  >
                    <span className="sched-slot__label">{s.label}</span>
                    <span className="sched-slot__hint">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <a
              className={"btn btn--wa sched__send" + (ready ? "" : " sched__send--off")}
              href={appointmentLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
              onClick={(e) => {
                if (!ready) {
                  e.preventDefault();
                  return;
                }
                onContact?.();
              }}
            >
              {Ico.whatsapp} Enviar a WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}
