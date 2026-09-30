/* ============================================================
   UsaLatinoPrime — Enlace de WhatsApp con reparto de leads
   Todos los botones de WhatsApp apuntan a /ir/whatsapp: ahí el
   servidor decide (por turno) a qué asesora va la persona, la deja
   fija 30 días y redirige a wa.me con el mensaje ya redactado.
   Este archivo es isomórfico (lo usan cliente y servidor).
   ============================================================ */

export type LeadKind = "whatsapp" | "prime_chat" | "prime_call" | "cita" | "urgente";

export const LEAD_KINDS: readonly LeadKind[] = ["whatsapp", "prime_chat", "prime_call", "cita", "urgente"];

export const LEAD_KIND_LABEL: Record<LeadKind, string> = {
  whatsapp: "Botón WhatsApp",
  prime_chat: "Prime · chat",
  prime_call: "Prime · llamada",
  cita: "Agendar cita",
  urgente: "Llamada urgente",
};

export const DEFAULT_WA_MESSAGE = "Hola, quiero información sobre sus servicios migratorios.";

/** Construye la URL interna que reparte y redirige a WhatsApp. */
export function waRoute(opts: { message?: string; kind?: LeadKind; serviceId?: string | null } = {}): string {
  const p = new URLSearchParams();
  p.set("kind", opts.kind ?? "whatsapp");
  p.set("msg", (opts.message ?? DEFAULT_WA_MESSAGE).slice(0, 500));
  if (opts.serviceId) p.set("svc", opts.serviceId);
  return `/ir/whatsapp?${p.toString()}`;
}

/** "17633422258" → "+1 (763) 342-2258"; otros formatos → "+<dígitos>". */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return `+${d}`;
}
