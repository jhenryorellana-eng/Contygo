/* ============================================================
   ContyGo · utilidades de las rutas de contratación (SOLO servidor)
   Proxy SIN estado (guía §2 bis): ni base de datos, ni sesión, ni
   cookies. Lo que hay que recordar entre un paso y el siguiente lo
   guarda el navegador; aquí se valida, se firma y se reenvía.
   Lectura acotada del cuerpo, mismo origen, límites propios y CAPTCHA.
   ============================================================ */
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOriginIntakeRequest } from "@/lib/agent/visa-intake";
import { CatalogUnavailableError } from "./catalog";
import { ContygoNotConfiguredError } from "./client";
import { LandingSecretMissingError } from "./tokens";
import type { ContractStatus } from "./types";

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });

export const fail = (error: string, status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  json({ ok: false, error, ...extra }, status, headers);

/** Falta de configuración o de un servicio externo → 503 con un código, nunca con detalles. */
export async function guarded(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    const code = error instanceof ContygoNotConfiguredError ? "contygo_not_configured"
      : error instanceof CatalogUnavailableError ? "catalog_unavailable"
      : error instanceof LandingSecretMissingError ? "landing_token_secret_missing" : "internal";
    console.warn(`[contygo] ${code}`);
    return fail(code, 503);
  }
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return (req.headers.get("x-real-ip") ?? "local").slice(0, 64);
}

// ---------------- Peticiones del navegador ----------------

const MAX_BODY_BYTES = 32 * 1024;

/** Mismo origen, JSON y tamaño acotado. Devuelve el cuerpo o una respuesta de error. */
export async function readBrowserJson(req: NextRequest): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  if (!isSameOriginIntakeRequest(req)) return { response: fail("forbidden_origin", 403) };
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return { response: fail("json_required", 415) };
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return { response: fail("too_large", 413) };
  const reader = req.body?.getReader();
  if (!reader) return { response: fail("bad_json", 400) };
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return { response: fail("too_large", 413) }; }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) return { response: fail("bad_json", 400) };
    return { body: body as Record<string, unknown> };
  } catch {
    return { response: fail("bad_json", 400) };
  } finally {
    reader.releaseLock();
  }
}

// ---------------- Memoria de la instancia (sin base de datos) ----------------
// Los límites propios y la caché del estado viven en la memoria de cada instancia. En Vercel
// cada una tiene la suya: son un freno de buena fe, no un contador exacto. El freno duro va
// delante (CAPTCHA en cada envío de código) y detrás (los límites de contygo, guía §8).
// En desarrollo Next compila cada ruta por separado: se anclan a globalThis.

type Memory = { hits: Map<string, { start: number; count: number }>; status: Map<string, { at: number; value: ContractStatus }> };
const holder = globalThis as typeof globalThis & { __contygoProxyMemory?: Memory };
const memory = (): Memory => (holder.__contygoProxyMemory ??= { hits: new Map(), status: new Map() });

/** Solo tests. */
export function resetProxyMemory() { holder.__contygoProxyMemory = undefined; }

/** Nuestros propios techos, por debajo de los de contygo. Todos deben pasar. Ventana fija. */
export function checkLimits(rules: { key: string; windowSeconds: number; max: number }[]): NextResponse | null {
  const { hits } = memory();
  const now = Date.now();
  if (hits.size > 5000) hits.forEach((entry, key) => { if (now - entry.start > 86_400_000) hits.delete(key); });
  for (const rule of rules) {
    const windowMs = rule.windowSeconds * 1000;
    const entry = hits.get(rule.key);
    if (!entry || now - entry.start >= windowMs) { hits.set(rule.key, { start: now, count: 1 }); continue; }
    if (entry.count >= rule.max) {
      const retryAfter = Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000));
      return fail("rate_limited", 429, { retryAfter }, { "Retry-After": String(retryAfter) });
    }
    entry.count += 1;
  }
  return null;
}

/** contygo pide no consultar un contrato más de una vez por minuto (guía §6). */
export const STATUS_FRESH_MS = 60_000;
export function cachedStatus(contractId: string) {
  const entry = memory().status.get(contractId);
  return entry && Date.now() - entry.at < STATUS_FRESH_MS ? entry : null;
}
export function rememberStatus(contractId: string, value: ContractStatus) {
  const { status } = memory();
  if (status.size > 2000) status.clear();
  const entry = { at: Date.now(), value };
  status.set(contractId, entry);
  return entry;
}

// ---------------- CAPTCHA (Cloudflare Turnstile) ----------------
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// Cada token vale una vez y caduca a los 5 minutos.

export const CAPTCHA_ACTION = "contratar";

export async function verifyCaptcha(token: unknown, ip: string): Promise<{ ok: boolean; code: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Sin clave en producción no se contrata: el CAPTCHA es obligatorio delante del código.
    return process.env.NODE_ENV === "production" ? { ok: false, code: "captcha_not_configured" } : { ok: true, code: "captcha_skipped_dev" };
  }
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, code: "captcha_missing" };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ secret, response: token, ...(ip !== "local" ? { remoteip: ip } : {}), idempotency_key: randomUUID() }),
    });
    const data = await response.json() as { success?: boolean; action?: string };
    if (data.success !== true) return { ok: false, code: "captcha_failed" };
    if (data.action && data.action !== CAPTCHA_ACTION) return { ok: false, code: "captcha_failed" };
    return { ok: true, code: "captcha_ok" };
  } catch {
    return { ok: false, code: "captcha_unavailable" };
  }
}
