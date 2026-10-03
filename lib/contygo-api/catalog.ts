/* ============================================================
   ContyGo · catálogo contratable (SOLO servidor)
   Precios, paquetes, opciones de pago, preguntas de elegibilidad y
   personas adicionales salen de GET /catalog, no de listas locales.
   lib/contygo-catalog.ts solo aporta lo visual (vídeos, imágenes,
   textos de la landing) y se une con este por `slug`.
   ============================================================ */
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { contygoApi, type CallBudget } from "./client";
import { isConfigFailure, partyRolesToAsk, questionKind } from "./checkout";
import type { CatalogQuestion, CatalogService, I18nText } from "./types";

export { partyRolesToAsk, questionKind, text, type QuestionKind } from "./checkout";

/** contygo lo sirve con max-age=60; aquí vive unos minutos por instancia. */
const FRESH_MS = 5 * 60_000;
/** Si contygo no responde, se sigue usando una copia de hasta una hora. */
const STALE_MS = 60 * 60_000;

let cache: { at: number; services: CatalogService[] } | null = null;
let inflight: Promise<CatalogService[]> | null = null;

export class CatalogUnavailableError extends Error {
  constructor(readonly code: string, readonly status = 0) { super(`catálogo no disponible: ${code}`); this.name = "CatalogUnavailableError"; }
  /** 401/403: la clave o el canal están mal configurados; no es «revisa tu conexión». */
  get isConfig() { return isConfigFailure(this.status, this.code); }
}

export function resetCatalogCache() { cache = null; inflight = null; }

/** Tras un 422 PLAN_NOT_CONTRACTABLE hay que volver a pedir el catálogo (guía §5). */
export function invalidateCatalog() { if (cache) cache = { ...cache, at: 0 }; }

export async function loadCatalog(budget: CallBudget = {}): Promise<CatalogService[]> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.services;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await contygoApi.catalog(budget);
      const services = response.data?.services;
      if (response.status !== 200 || !Array.isArray(services)) {
        if (cache && Date.now() - cache.at < STALE_MS) return cache.services;
        throw new CatalogUnavailableError(response.error?.code ?? `HTTP_${response.status}`, response.status);
      }
      cache = { at: Date.now(), services };
      return services;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** El servicio de contygo que corresponde a un servicio de la landing. */
export async function remoteServiceFor(localId: string, budget: CallBudget = {}): Promise<CatalogService | null> {
  const local = CONTYGO_SERVICES.find(service => service.id === localId);
  if (!local) return null;
  const services = await loadCatalog(budget);
  return services.find(service => service.slug === local.slug) ?? null;
}

/** El nombre del servicio de la landing que corresponde a un serviceId de contygo (para el resumen del lead). */
export async function localServiceNameFor(remoteId: string, budget: CallBudget = {}): Promise<string | null> {
  const services = await loadCatalog(budget);
  const slug = services.find(service => service.id === remoteId)?.slug;
  return CONTYGO_SERVICES.find(service => service.slug === slug)?.name ?? null;
}

/** Texto en español de una opción (us_state): su rótulo, o el código si no trae. */
function optionLabel(option: { code: string; label?: unknown }): string {
  const label = option.label;
  if (typeof label === "string" && label) return label;
  if (label && typeof label === "object") return (label as I18nText).es || (label as I18nText).en || option.code;
  return option.code;
}

/** La pregunta tal como la ve el navegador: kind ya normalizado, y dateMode, minNotice y options solo si existen. */
export function publicQuestion(question: CatalogQuestion) {
  const kind = questionKind(question);
  return {
    id: question.id,
    prompt: question.prompt,
    kind,
    ...(question.dateMode ? { dateMode: question.dateMode } : {}),
    ...(question.minNotice ? { minNotice: question.minNotice } : {}),
    ...(kind === "state" && Array.isArray(question.options) ? { options: question.options.map(option => ({ code: option.code, label: optionLabel(option) })) } : {}),
  };
}

/** Precio «desde» por servicio de la landing, de GET /catalog vivo (nunca de listas locales). Sin ids internos. */
export function priceSummary(services: CatalogService[]) {
  const prices: Record<string, { fromCents: number; plans: { name: I18nText; priceCents: number }[] }> = {};
  for (const local of CONTYGO_SERVICES) {
    const remote = services.find(service => service.slug === local.slug);
    const plans = (remote?.plans ?? []).filter(plan => Number.isFinite(plan.priceCents) && plan.priceCents > 0);
    if (!plans.length) continue;
    prices[local.slug] = {
      fromCents: Math.min(...plans.map(plan => plan.priceCents)),
      plans: plans.map(plan => ({ name: plan.name, priceCents: plan.priceCents })),
    };
  }
  return prices;
}

/** Lo que el navegador necesita para la ficha. Sin nada interno de contygo. */
export function publicServiceView(service: CatalogService) {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    plans: service.plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      priceCents: plan.priceCents,
      extraPartyPriceCents: plan.extraPartyPriceCents,
      installmentOptions: plan.installmentOptions.map(option => ({ ...option })),
    })),
    questions: service.eligibilityQuestions.map(publicQuestion),
    partyRoles: partyRolesToAsk(service.partyRoles).map(role => ({ ...role })),
  };
}
export type PublicServiceView = ReturnType<typeof publicServiceView>;
