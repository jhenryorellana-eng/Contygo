/* ============================================================
   Meta Pixel + CAPI — constantes compartidas (cliente y servidor)
   Única fuente de verdad de los nombres de evento: si un nombre difiere
   entre el Pixel (navegador) y el CAPI (servidor), la deduplicación se rompe.
   ============================================================ */

/**
 * Pixel ID. Fallback hardcodeado para que funcione aunque falte la env var
 * (el Pixel ID no es secreto). Imita el patrón del número de WhatsApp en
 * lib/config.ts. Las vars NEXT_PUBLIC_* las inyecta Next en build.
 */
export const PIXEL_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "1489091455876816";

/** Variante B (banner opt-in GDPR) activa cuando vale exactamente "1". */
export const REQUIRE_CONSENT =
  process.env.NEXT_PUBLIC_META_REQUIRE_CONSENT === "1";

/** Eventos estándar de Meta + customs del embudo de esta landing. */
export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "VideoCompleted"
  | "EvaluationCompleted"
  | "AgentChat"
  | "AgentCall";

/** Eventos estándar de Meta (van por `track`). Los demás son custom (`trackCustom`). */
const STANDARD_EVENTS: ReadonlySet<MetaEventName> = new Set<MetaEventName>([
  "PageView",
  "ViewContent",
  "Lead",
  "Contact",
]);

/** true si es un evento estándar de Meta; false si es custom. */
export function isStandardEvent(name: MetaEventName): boolean {
  return STANDARD_EVENTS.has(name);
}

/** Categoría de contenido común para los servicios migratorios. */
export const CONTENT_CATEGORY = "immigration_service";
