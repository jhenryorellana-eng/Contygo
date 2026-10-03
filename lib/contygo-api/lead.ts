/* ============================================================
   ContyGo · lead (SOLO servidor)
   En cuanto hay nombre y teléfono: PUT /leads/{externalRef}, con el
   externalRef que la UI generó al empezar la conversación (guía
   §2 bis), source "web" y la atribución (URL y UTM). Idempotente:
   repetirlo con la misma referencia actualiza el mismo lead.
   aiSummary nunca lleva datos sensibles ni las respuestas.
   ============================================================ */
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { contygoApi, type CallBudget } from "./client";
import type { Attribution, UpsertLeadBody } from "./types";

/** Solo URL http(s) sin query ni fragmento, y claves utm_* acotadas (máx. 20). */
export function sanitizeAttribution(input: unknown): Attribution | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const raw = input as { sourceUrl?: unknown; utm?: unknown };
  const result: Attribution = {};
  if (typeof raw.sourceUrl === "string" && raw.sourceUrl.length <= 2000) {
    try {
      const url = new URL(raw.sourceUrl);
      if (url.protocol === "https:" || url.protocol === "http:") result.sourceUrl = `${url.origin}${url.pathname}`.slice(0, 500);
    } catch { /* Se ignora: la atribución es opcional. */ }
  }
  if (raw.utm && typeof raw.utm === "object" && !Array.isArray(raw.utm)) {
    const utm: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw.utm as Record<string, unknown>)) {
      if (Object.keys(utm).length >= 20) break;
      if (/^utm_[a-z0-9_]{1,40}$/.test(key) && typeof value === "string" && value.trim()) utm[key] = value.trim().slice(0, 200);
    }
    if (Object.keys(utm).length) result.utm = utm;
  }
  return Object.keys(result).length ? result : undefined;
}

/** Para ventas: el servicio y el veredicto de contygo, nunca las respuestas. */
export function leadSummary(localServiceId: string, eligible: boolean | null) {
  const service = CONTYGO_SERVICES.find(item => item.id === localServiceId)?.name ?? localServiceId;
  const verdict = eligible === null ? "Aún sin respuestas de elegibilidad."
    : eligible ? "Respondió las preguntas del servicio: califica." : "Respondió las preguntas del servicio: requiere revisión de un asesor.";
  return `Web · ${service}. ${verdict}`;
}

export function buildLeadBody(
  person: { fullName: string; phoneE164: string; email?: string },
  context: { localServiceId: string; eligible: boolean | null; attribution?: Attribution },
): UpsertLeadBody {
  return {
    fullName: person.fullName.slice(0, 120),
    phoneE164: person.phoneE164,
    source: "web",
    ...(person.email ? { email: person.email } : {}),
    ...(context.attribution ? { attribution: { ...context.attribution } } : {}),
    aiSummary: leadSummary(context.localServiceId, context.eligible),
  };
}

/**
 * Resumen cuando la persona intentó contratar en línea y no pudo: ventas lo ve en la tarjeta.
 * Solo el servicio y un código fijo; nada de la persona. Máx. 2000 caracteres (límite de aiSummary).
 */
export function attemptSummary(serviceName: string, code: string) {
  const safe = code.replace(/[^A-Za-z0-9_]/g, "").slice(0, 60).toUpperCase() || "UNKNOWN";
  return `Web · ${serviceName.slice(0, 200)}. Intentó contratar en línea y necesita ayuda (${safe}).`;
}

/** Repetir el PUT con la misma referencia solo actualiza fuente, atribución y resumen (nunca nombre ni teléfono). */
export function buildAttemptBody(person: { fullName: string; phoneE164: string }, serviceName: string, code: string): UpsertLeadBody {
  return { fullName: person.fullName.slice(0, 120), phoneE164: person.phoneE164, source: "web", aiSummary: attemptSummary(serviceName, code) };
}

/** Devuelve el leadId o el código de error (solo el código: sin datos de la persona). */
export async function syncLead(externalRef: string, body: UpsertLeadBody, budget: CallBudget = {}) {
  const response = await contygoApi.upsertLead(externalRef, body, budget);
  if ((response.status === 200 || response.status === 201) && response.data?.leadId) return { ok: true as const, leadId: response.data.leadId };
  const code = response.error?.code ?? `HTTP_${response.status}`;
  console.warn(`[contygo] lead no registrado: ${code}`);
  return { ok: false as const, code, retryAfter: response.retryAfter };
}
