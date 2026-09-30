/* ============================================================
   Meta Pixel — helpers de NAVEGADOR (client-side)
   Disparo de eventos del Pixel + envío al endpoint CAPI same-origin.
   No lleva 'use client' (es un módulo de funciones); lo importan los
   Client Components que sí lo llevan.
   ============================================================ */
import {
  CONTENT_CATEGORY,
  REQUIRE_CONSENT,
  isStandardEvent,
  type MetaEventName,
} from "./events";

type CustomData = Record<string, unknown>;

/** Lee una cookie del navegador (o undefined si no existe / SSR). */
function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const row = document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${name}=`));
  if (!row) return undefined;
  return row.slice(name.length + 1) || undefined;
}

/** Genera un id de evento único (para deduplicar Pixel ↔ CAPI). */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback para contextos sin crypto.randomUUID (http no-localhost, etc.).
  return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Cookie `_fbp` que escribe el propio Pixel (no se hashea). */
export function getFbp(): string | undefined {
  return readCookie("_fbp");
}

/**
 * `_fbc`: cookie del Pixel; si aún no existe pero la URL trae `fbclid`
 * (clic de anuncio), se construye el formato esperado por Meta. Como esta
 * landing es una SPA de una URL, el `fbclid` persiste toda la sesión.
 */
export function getFbc(): string | undefined {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;
  if (typeof window === "undefined") return undefined;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}

const VISITOR_COOKIE = "ulp_vid";

/**
 * Id de visitante de primera parte (no PII). Es la única identidad estable
 * sin email/teléfono; mejora el matching y la dedup entre eventos del mismo
 * usuario. Se persiste en cookie legible por el servidor (same-origin).
 */
export function getOrCreateExternalId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const id = newEventId();
  document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=15552000; SameSite=Lax`;
  return id;
}

/** ¿Está concedido el seguimiento? En Variante A siempre; en B exige opt-in. */
export function shouldTrack(): boolean {
  if (!REQUIRE_CONSENT) return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("meta_consent") === "granted";
}

/**
 * Dispara un evento del Pixel (navegador). Si se pasa `eventId`, lo adjunta
 * como `eventID` para deduplicar con el evento server-side del CAPI.
 */
export function trackBrowser(
  name: MetaEventName,
  customData?: CustomData,
  eventId?: string,
): void {
  if (!shouldTrack()) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  // Eventos estándar → 'track'; custom (VideoCompleted, etc.) → 'trackCustom'.
  const method = isStandardEvent(name) ? "track" : "trackCustom";
  if (eventId) {
    window.fbq(method, name, customData ?? {}, { eventID: eventId });
  } else {
    window.fbq(method, name, customData ?? {});
  }
}

interface CapiPayload {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl?: string;
  customData?: CustomData;
}

/**
 * Envía el evento al endpoint CAPI same-origin de forma resiliente a un
 * eventual `unload`: `navigator.sendBeacon` con fallback a `fetch keepalive`.
 * Nunca un `fetch` normal (se cancelaría al descargarse la página).
 * Las cookies (_fbp, _fbc, ulp_vid) viajan solas por ser same-origin; se
 * incluyen además en el body como fallback (sobre todo el `fbc` derivado).
 */
export function sendToCapi(payload: CapiPayload): void {
  if (!shouldTrack()) return;
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    ...payload,
    fbp: getFbp() ?? null,
    fbc: getFbc() ?? null,
    externalId: getOrCreateExternalId() ?? null,
  });
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/meta", blob)) return;
    }
    void fetch("/api/meta", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    // best-effort: nunca romper la navegación del usuario.
  }
}

/**
 * Conversión clave: dispara `Lead` por Pixel + CAPI con el MISMO `eventId`
 * (deduplicación). Usar un único eventId estable por vista de resultado.
 */
export function trackLeadDeduped(eventId: string, customData?: CustomData): void {
  const cd: CustomData = { ...customData, content_category: CONTENT_CATEGORY };
  trackBrowser("Lead", cd, eventId);
  sendToCapi({
    eventName: "Lead",
    eventId,
    eventSourceUrl:
      typeof window !== "undefined" ? window.location.href : undefined,
    customData: cd,
  });
}
