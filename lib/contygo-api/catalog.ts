/* ============================================================
   ContyGo · catálogo contratable (SOLO servidor)
   Precios, paquetes, opciones de pago, preguntas de elegibilidad y
   personas adicionales salen de GET /catalog, no de listas locales.
   lib/contygo-catalog.ts solo aporta lo visual (vídeos, imágenes,
   textos de la landing) y se une con este por `slug`.
   ============================================================ */
import { CONTYGO_SERVICES } from "@/lib/contygo-catalog";
import { contygoApi } from "./client";
import { partyRolesToAsk, questionKind } from "./checkout";
import type { CatalogService } from "./types";

export { partyRolesToAsk, questionKind, text, type QuestionKind } from "./checkout";

/** contygo lo sirve con max-age=60; aquí vive unos minutos por instancia. */
const FRESH_MS = 5 * 60_000;
/** Si contygo no responde, se sigue usando una copia de hasta una hora. */
const STALE_MS = 60 * 60_000;

let cache: { at: number; services: CatalogService[] } | null = null;
let inflight: Promise<CatalogService[]> | null = null;

export class CatalogUnavailableError extends Error {
  constructor(readonly code: string) { super(`catálogo no disponible: ${code}`); this.name = "CatalogUnavailableError"; }
}

export function resetCatalogCache() { cache = null; inflight = null; }

/** Tras un 422 PLAN_NOT_CONTRACTABLE hay que volver a pedir el catálogo (guía §5). */
export function invalidateCatalog() { if (cache) cache = { ...cache, at: 0 }; }

export async function loadCatalog(): Promise<CatalogService[]> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.services;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await contygoApi.catalog();
      const services = response.data?.services;
      if (response.status !== 200 || !Array.isArray(services)) {
        if (cache && Date.now() - cache.at < STALE_MS) return cache.services;
        throw new CatalogUnavailableError(response.error?.code ?? `HTTP_${response.status}`);
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
export async function remoteServiceFor(localId: string): Promise<CatalogService | null> {
  const local = CONTYGO_SERVICES.find(service => service.id === localId);
  if (!local) return null;
  const services = await loadCatalog();
  return services.find(service => service.slug === local.slug) ?? null;
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
    questions: service.eligibilityQuestions.map(question => ({ id: question.id, prompt: question.prompt, kind: questionKind(question) })),
    partyRoles: partyRolesToAsk(service.partyRoles).map(role => ({ ...role })),
  };
}
export type PublicServiceView = ReturnType<typeof publicServiceView>;
