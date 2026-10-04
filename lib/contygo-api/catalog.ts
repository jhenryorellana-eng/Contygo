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
import { normalizeCatalog } from "./payment-options";
import type { CatalogQuestion, CatalogService, I18nText } from "./types";

export { partyRolesToAsk, questionKind, text, type QuestionKind } from "./checkout";

/** contygo lo sirve con max-age=60; aquí vive unos minutos por instancia. */
const FRESH_MS = 5 * 60_000;
/** Si contygo no responde, se sigue usando una copia de hasta una hora. */
const STALE_MS = 60 * 60_000;

/** Un fallo del catálogo se recuerda tanto tiempo: sin esto cada visita insistiría ante un contygo caído (o con 429). */
const FAILURE_MS = 45_000;

let cache: { at: number; services: CatalogService[] } | null = null;
let failure: { at: number; code: string; status: number } | null = null;
let inflight: Promise<CatalogService[]> | null = null;

export class CatalogUnavailableError extends Error {
  constructor(readonly code: string, readonly status = 0) { super(`catálogo no disponible: ${code}`); this.name = "CatalogUnavailableError"; }
  /** 401/403: la clave o el canal están mal configurados; no es «revisa tu conexión». */
  get isConfig() { return isConfigFailure(this.status, this.code); }
}

export function resetCatalogCache() { cache = null; inflight = null; failure = null; }

/** Tras un 422 PLAN_NOT_CONTRACTABLE hay que volver a pedir el catálogo (guía §5). */
export function invalidateCatalog() { if (cache) cache = { ...cache, at: 0 }; }

export async function loadCatalog(budget: CallBudget = {}): Promise<CatalogService[]> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.services;
  // Fallo reciente: no se vuelve a llamar a contygo; se sirve la copia vieja si la hay.
  if (failure && Date.now() - failure.at < FAILURE_MS) {
    if (cache && Date.now() - cache.at < STALE_MS) return cache.services;
    throw new CatalogUnavailableError(failure.code, failure.status);
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await contygoApi.catalog(budget);
      const services = response.data?.services;
      if (response.status !== 200 || !Array.isArray(services)) {
        const code = response.error?.code ?? `HTTP_${response.status}`;
        // Un plazo agotado es cosa de esa petición, no del catálogo: no se recuerda.
        if (code !== "DEADLINE") failure = { at: Date.now(), code, status: response.status };
        if (cache && Date.now() - cache.at < STALE_MS) return cache.services;
        throw new CatalogUnavailableError(code, response.status);
      }
      failure = null;
      // Se valida ANTES de cachear: listas por defecto [], opciones inválidas fuera (un paquete sin arrays ya no tumba /servicio).
      const valid = normalizeCatalog(services);
      cache = { at: Date.now(), services: valid };
      return valid;
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

/** Texto de una opción (us_state): `name` {es, en} de contygo (o `label`, respaldo), y el código si no trae ninguno. */
function optionLabel(option: { code: string; name?: unknown; label?: unknown }): string {
  for (const value of [option.name, option.label]) {
    if (typeof value === "string" && value) return value;
    if (value && typeof value === "object") {
      const text = (value as I18nText).es || (value as I18nText).en;
      if (text) return text;
    }
  }
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
      // Aditivo: el desglose lo calcula contygo; la landing solo lo muestra. [] = API antigua o paquete sin plan publicado.
      paymentOptions: (plan.paymentOptions ?? []).map(option => ({ ...option, ...(option.byExtraParties ? { byExtraParties: option.byExtraParties.map(row => ({ ...row })) } : {}) })),
    })),
    questions: service.eligibilityQuestions.map(publicQuestion),
    partyRoles: partyRolesToAsk(service.partyRoles).map(role => ({ ...role })),
  };
}
export type PublicServiceView = ReturnType<typeof publicServiceView>;
