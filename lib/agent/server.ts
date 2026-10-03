/* ============================================================
   Prime — cliente de Gemini y utilidades (SOLO servidor)
   La API key nunca sale del servidor. Sin GEMINI_API_KEY, las rutas
   devuelven 503 y el widget muestra el camino a WhatsApp.
   ============================================================ */
import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { limitKeyForIp } from "@/lib/contygo-api/ip";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
/** Chat escrito: último Flash estable (nivel gratuito). */
export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.7-flash";
/** Voz en tiempo real: Live API con audio nativo (preview). */
// gemini-3.1-flash-live-preview is a legacy preview; gemini-3.8-live is the stable default (ai.google.dev/gemini-api/docs/models, checked 28-09-2026).
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
/** Voz prefabricada de la Live API. */
export const LIVE_VOICE = process.env.GEMINI_VOICE || "Kore";

export const agentEnabled = Boolean(GEMINI_API_KEY);

const clients = new Map<string, GoogleGenAI>();

/** Cliente memoizado por versión de API ("v1beta" por defecto). */
export function getGenAI(apiVersion?: string): GoogleGenAI {
  const key = apiVersion ?? "default";
  let c = clients.get(key);
  if (!c) {
    c = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      ...(apiVersion ? { httpOptions: { apiVersion } } : {}),
    });
    clients.set(key, c);
  }
  return c;
}

// ---- Límite de uso por IP (mejor esfuerzo, por instancia) ----
// Los cubos vencidos se purgan y el mapa tiene techo: un barrido de IPs no puede llenar la memoria.
const buckets = new Map<string, { n: number; reset: number }>();
const MAX_BUCKETS = 10_000;
const SWEEP_EVERY_MS = 30_000;
let lastSweep = 0;

/** Solo tests: cuántos cubos hay vivos. */
export function bucketsSize() { return buckets.size; }

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep >= SWEEP_EVERY_MS) {
    lastSweep = now;
    buckets.forEach((entry, k) => { if (entry.reset <= now) buckets.delete(k); });
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    // Ventana nueva: se reinserta al final; el primero del mapa es siempre el más antiguo.
    buckets.delete(key);
    buckets.set(key, { n: 1, reset: now + windowMs });
    while (buckets.size > MAX_BUCKETS) { const oldest = buckets.keys().next(); if (oldest.done) break; buckets.delete(oldest.value); }
    return true;
  }
  if (b.n >= max) return false;
  b.n += 1;
  return true;
}

/** IPv4 tal cual; IPv6 agrupada por /64 (un cliente tiene un bloque entero de direcciones). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return limitKeyForIp(fwd.split(",")[0]!);
  return limitKeyForIp(req.headers.get("x-real-ip") ?? "local");
}
