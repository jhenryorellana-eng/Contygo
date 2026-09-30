/* ============================================================
   Prime — cliente de Gemini y utilidades (SOLO servidor)
   La API key nunca sale del servidor. Sin GEMINI_API_KEY, las rutas
   devuelven 503 y el widget muestra el camino a WhatsApp.
   ============================================================ */
import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";

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
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (b.n >= max) return false;
  b.n += 1;
  return true;
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}
